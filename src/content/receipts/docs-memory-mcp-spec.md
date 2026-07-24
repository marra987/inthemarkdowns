---
title: "memory-mcp-spec.md"
source: "docs/memory-mcp-spec.md"
synced: "2026-07-24"
---

# Memory MCP server + `mcp_tool` recall hook — spec

Status: P1 shipped 2026-07-24 (server + hook wired, on the flat image substrate). Supersedes
the doubt-hook mechanism for retrieval — `memory-image-doubt.js` retired.
Provenance: `project_memory_image_index_doubt_load`, `project_memory_router_recall_defect`.

## 1. What this replaces and why

The retrieval path has failed three ways, each logged:

- **Lexical router** (`memory-route.js`) — retired for retrieval. Tag-authoring is an
  unwinnable prediction problem (every label must pre-contain some future prompt's
  vocabulary) plus O(hand-work) per memory. Repurposed to clustering/layout only.
- **Doubt-hook** (`memory-image-doubt.js`) — wins the *first* engagement, loses the
  *sustained* one. It nags the **session model** to attend a **one-shot image Read** that
  persists statically in context; after turn 1 the nag has nothing new to bite on, so the
  relevance filter reasserts and new sub-topics stop being cross-checked
  (`env_hook_additionalcontext_text_only`).
- **Always-loaded MEMORY.md index** — grows unbounded, rides every turn's context whether
  relevant or not.

**The mechanism that fixes all three:** stop asking the session model to attend the index.
A `UserPromptSubmit` `mcp_tool` hook calls a persistent **memory MCP server**, which matches
the prompt against the image index with a cheap subscription-billed model and returns *only
the relevant memory bodies* as `additionalContext`. Re-evaluated every turn as fresh text →
no habituation. Winners are injected; nothing else rides context.

## 2. Why `mcp_tool` and not `prompt` / `agent` / `command`

Verified against the current hooks reference (2026-07-24):

| Type | Reads the image? | Output | Billing | Per-turn cost floor |
|------|------------------|--------|---------|---------------------|
| `prompt` | **No** — text-only | yes/no decision, not a payload | subscription | n/a — wrong shape (binary gate, not retrieval) |
| `agent` | Yes (Read tool) | decision + `additionalContext` | subscription (harness-native) | **fresh spawn every turn, cannot cache** |
| `command`→`claude -p` | Yes | `additionalContext` | subscription (CC auth) | cold `claude -p` process spawn every turn |
| `mcp_tool` | Server's choice | tool text → `additionalContext` | **server's choice** (see §5) | **can drop below 1 via cache + pre-filter** |

- `type: prompt` is **eliminated**: it cannot see the image, and its output is a decision,
  not a payload. It is a safety-gate primitive, not a retrieval channel.
- `type: agent` is the **image-capable fallback**: harness-native (no process spawn we
  manage), but experimental and it **re-spawns every turn with no memory between calls** —
  it is the one design that can never amortize. Note both `claude -p` paths inherit Claude
  Code's own working TLS setup, so `env_windows_node_tls_interception` only bites if the
  server ever makes a *direct* Node HTTPS API call itself — which the default `claude -p`
  matcher does not.
- **`mcp_tool` wins on sustained cost.** Billing is not a property of the hook type — it is
  a property of *what the server calls* (§5), so `mcp_tool` is equally subscription-billed.
  The real budget is **subscription quota per turn**, and the persistent server is the only
  design that can push the per-turn model-call rate **below 1** by caching trivial turns and
  running a free pre-filter (§4).

## 3. Components

1. **Memory MCP server** — `scripts/mcp/memory-server.js`, one tool: `recall_memories`.
2. **`.mcp.json`** at repo root — registers the server (version-controlled, project-scoped).
3. **`UserPromptSubmit` hook** in `.claude/settings.json` — `type: mcp_tool`, calls the tool.
4. **Routing-recall eval** — the gate that must pass before the hook goes live (§7).

## 4. The tool: `recall_memories(prompt) → text`

Pipeline inside the server, in order:

1. **Pre-filter (free, deterministic).** Skip the model entirely when the prompt carries no
   new topic: pure acknowledgements / trivial continuations (length + stopword heuristic),
   or a prompt whose match is cached from an unchanged recent turn. This is the primary
   quota lever — the model must fire on a *fraction* of turns, not all.
2. **Match (subscription-billed, §5).** Shell to `claude -p --model <model>` with the image
   index + the prompt; instruct it to return **only existing slugs**, one per line, empty if
   none apply. Model is a config field (Haiku default; Sonnet is a one-line change, §7).
3. **Validate (hard requirement).** Resolve every returned slug against `MEM_DIR`. Drop any
   that do not map to a real file. A hallucinated slug is **never** injected — this is the
   mechanical guard behind the eval's zero-hallucination bar.
4. **Assemble.** Read the validated bodies, concatenate under a bounded total cap
   (`RECALL_CHAR_CAP`, default ~6k) so injection can't crowd out real context; if over cap,
   inject highest-ranked bodies first. Return as **plain text** (not decision-JSON) so the
   hook injects it verbatim as `additionalContext`.
5. **Cache.** Keep `(prompt-hash → slugs)` for the session so step 1 can short-circuit
   repeats and near-repeats.

The server also **owns the index substrate** (the user's "server regenerates the image and
feeds results itself" point): on tool call it checks `MEM_DIR` mtimes and regenerates
`brain/memory-index.png` when stale, via the existing `memory-index-image.py`. Later this
extends to clustered/sharded images behind the same tool interface (§8 phase 3) — the hook
never changes.

## 5. Billing & quota model

- **Dollars.** The match runs via `claude -p`, which uses Claude Code's own auth =
  **subscription-billed**, *provided no `ANTHROPIC_API_KEY` overrides it*. That key was
  removed from machine env 2026-07-24, so `claude -p` now reliably draws on subscription.
  A local-model matcher (Ollama) would be free; an API-key call would be separate dollars —
  we deliberately use neither for the default matcher.
- **Quota.** Subscription quota per turn is the real budget. Floor is set by §4 step 1: the
  fraction of turns on which the model actually fires. A naive "call every turn" design
  (including `type: agent`) has floor = 1; the pre-filter + cache is what beats it.

## 6. Wiring

`.mcp.json` (repo root):

```json
{
  "mcpServers": {
    "memory": { "command": "node", "args": ["scripts/mcp/memory-server.js"] }
  }
}
```

`.claude/settings.json` `UserPromptSubmit` (replaces the `memory-image-doubt.js` command hook):

```json
{
  "type": "mcp_tool",
  "server": "memory",
  "tool": "recall_memories",
  "input": { "prompt": "${prompt}" }
}
```

- Timeout: 30s (UserPromptSubmit default for `mcp_tool`). The hook **blocks the turn** until
  the tool returns, so the pre-filter must be fast and the match must respect the budget.
- **Fail-open.** Any tool error, timeout, or empty result injects nothing and does not block
  the prompt. A missing memory is a silent miss; a blocked prompt is a broken session.
- The server must be **already connected** — the hook never triggers a connection. This ties
  to the always-on-server question (§8 open decisions).

## 7. The eval gate (build first, off the hook)

Before any hook or server, validate the matcher logic as a standalone function against a
labeled corpus of realistic `(prompt → expected slugs)` pairs. Metrics:

- **hit@1 recall** — is the right memory in the returned set.
- **silent-miss rate** — relevant memory existed and was not returned (the failure we are
  most exposed to; fail-open makes misses invisible at runtime).
- **zero hallucinated slugs** — a returned slug that does not resolve is a hard fail.

Run Haiku and Sonnet; take the **cheapest model that clears the bar**. That result is the
Haiku→Sonnet graduation decision, measured not guessed. The corpus also probes the
legibility ceiling vs corpus size (when one flat page stops being legible → §8 phase 3).

### P0 result (2026-07-24) — neither model clears the bar; image substrate falsified

Built `scripts/local/memory-recall-eval.js` (matcher as pure functions: `buildMatchPrompt`,
`extractSlugs`, `validateSlugs`, `matchMemories`, unit-tested in
`memory-recall-eval.test.js`) + a 16-row hand-authored corpus
(`local/eval/memory-recall-corpus.json`: 12 positive prompts grounded in real memory
descriptions, 4 negative/no-match prompts), run against the live `brain/memory-index.png`
(129 entries) via `makeClaudeReachRunner`. Results (`local/eval/memory-recall-eval-results.json`):

| Model | hit@1 recall | silent-miss rate | hallucinated-slug count | negative-correct |
|---|---|---|---|---|
| `claude-haiku-4-5-20251001` | **0.000** | 1.000 | 24–27 (2 runs) | 1.000 |
| `claude-sonnet-5` | **0.333** | 0.667 | 12 | 1.000 |

Both fail decisively. This is not a marginal miss — a manual pre-build probe (asking the
model to name the top-left vs. bottom-right slug) already showed the same shape: it
partially read the first, most-salient entry, and **confabulated a plausible-but-nonexistent
slug** (`PROJECT_VERIFY-SIGNAL-SKILL : JANUS`) for the last one. The eval confirms this
generalizes: at 129 entries in one 2-column PNG, most model responses are refusal prose
("the image resolution makes it difficult... rather than guess, I'm outputting nothing")
rather than a slug — which the validator correctly logs as non-resolving, so the **silent-miss
rate**, not raw hallucination, is the dominant failure mode. Both models correctly rejected
100% of negative (no-match) prompts, so false-positive risk is low — the corpus just can't be
*read* reliably enough to produce true positives.

### P0 addendum (2026-07-24) — Codex `gpt-5.6-luna` (light effort) clears the bar on the SAME flat image

Marek's call: image is necessity, not preference (bounded per-turn token cost independent of
corpus size is the actual requirement, not a stylistic simplicity argument) — and Codex is a
separate, much less constrained quota than the tight Claude weekly limit, so re-run the identical
harness against `codex exec -m gpt-5.6-luna` before accelerating into P3 sharding. Extended
`scripts/lib/codex-reach.js` with optional native image attachment (`-i <FILE>`, additive —
existing dreaming/scout callers unaffected) and `memory-recall-eval.js`'s `CANDIDATES` with a
`provider` field so the same corpus/scoring runs against either backend. A precondition probe
first (ask it to reproduce the image's exact header text, including live entry count) confirmed
`-i` genuinely attaches and the model actually reads the image, not just pattern-completes.

Result at light (`model_reasoning_effort=low`) effort, same 129-entry flat PNG, same 16-row
corpus:

| Model | hit@1 recall | silent-miss rate | hallucinated-slug count | negative-correct |
|---|---|---|---|---|
| `claude-haiku-4-5-20251001` | 0.000 | 1.000 | 24–27 | 1.000 |
| `claude-sonnet-5` | 0.333 | 0.667 | 12 | 1.000 |
| `gpt-5.6-luna` (light) | **0.833** | 0.167 | **0** | 1.000 |

Luna clears the bar decisively on the exact substrate that failed both Claude candidates — same
image, same font, same density. One harness bug surfaced and was fixed along the way: Luna
renders slugs with hyphens (`env-windows-node-tls-interception`) where the corpus uses
underscores (`env_windows_node_tls_interception`) — a formatting variant, not a wrong answer (all
3 of its first-run "hallucinations" were exact content matches once normalized). `validateSlugs`
now normalizes hyphens to underscores before checking file existence (no real memory filename in
this corpus uses hyphens, so this is lossless); re-run confirmed 0 true hallucinations. Two of the
12 positive prompts still silent-missed even after the fix — real recall gaps, not a formatting
artifact.

**Implication for §8 below:** the aggressive P3 sharding plan (cluster-per-image + lexical
pre-filter to bound per-turn cost) was designed around Claude's tight weekly quota being the
binding constraint. If the production matcher runs on Codex/Luna instead, quota is not the same
kind of scarce resource ([[env_codex_cli_headless_windows]]'s batch datapoint: a 9-task build
batch left ~75% of the weekly Codex limit), so the case for sharding *for cost reasons* weakens —
though sharding may still help *recall* (a smaller, denser-legible image per shard could plausibly
push hit@1 past 0.833). This is a real open decision, not resolved by this addendum: whether to
still build P3 sharding (recall upside) now that the pure cost argument for it is off the table
given a working, comparatively cheap Codex-side matcher.

**This falsifies the working assumption behind `memory-index-image.py`'s design**, not the
choice of substrate itself: its docstring assumed ~124 entries render legibly at the
~1568px/~1600-token downscale Claude applies, and the eval shows that assumption does not
hold. Marek's correction (2026-07-24, post-eval): image is not a stylistic preference against
text — it is the only substrate whose **per-turn token cost is bounded independent of corpus
size** (a fixed downscale/token cap regardless of entry count), which text cannot offer at
portfolio scale (~1500 memories projected within 2 years, at current growth rate). Text was
never a live alternative for the production matcher; it was only ever useful as a cheap way to
separate "model can't do this task" from "model can't read this image," and the manual probe
already answered that (partial-but-truncated read of the most salient entry) before this eval
ran. **The fix is not switching substrate — it's shrinking what one image holds.** The flat
single-PNG design (all N entries, one image, one read) has zero headroom left *today* at 129
entries; §8 P3's clustered/sharded image substrate — deferred there as a future scaling
concern — is therefore not a phase-3 nice-to-have but the immediate next design step. See §8
below, revised in light of this result. **No further live-model eval runs are authorized this
session** (13% of weekly Claude budget remaining, 2026-07-24) — the redesign in §8 is reasoned
from this eval's evidence, not validated by new test cycles; the harness built here
(`scripts/local/memory-recall-eval.js` + the 16-row corpus) is kept as the one-shot regression
gate to run once, deliberately, when the sharded design is actually built.

## 8. Rollout & open decisions

**Phases (revised 2026-07-24 post-eval — P3 moved ahead of P1/P2; the flat-image design has no
headroom to build a server on top of yet):**

- **P0** — matcher as a standalone function + the §7 eval. **Done, both candidates failed on
  the flat-image substrate** — see §7 "P0 result". Kept as the reusable regression gate for P3.
- **P1 — shipped 2026-07-24, on the flat image, ahead of P3.** Marek's call: the P0 addendum's
  Luna result (0.833 hit@1, 0 hallucinated, on the exact same 129-entry flat PNG both Claude
  candidates failed) already clears the bar, and P3 sharding's cost argument was specific to
  Claude's tight weekly quota — moot once the production matcher runs on Codex/Luna instead. So
  P1 shipped directly on the flat substrate; P3 sharding is deferred to a recall-upside-only
  decision (see revised note below), not a blocker.
  - `scripts/mcp/recall-pipeline.js` — pure pre-filter (`isTrivialPrompt`), assemble
    (`assembleBodies`, char-capped), and staleness check (`isImageStale`), unit-tested in
    `recall-pipeline.test.js`.
  - `scripts/mcp/memory-server.js` — MCP stdio server wrapping the §7-graduated
    `matchMemories`/`IMAGE_PATH` (now exported from `memory-recall-eval.js` for this reuse) with
    the `gpt-5.6-luna` (low effort) runner, a session-lifetime exact-match cache, and a
    25s-internal-timeout guard ahead of the host's 30s `UserPromptSubmit` cutoff so our own
    fail-open path fires before the host's hard kill does.
  - `.mcp.json` registers the server; `.claude/settings.json`'s `UserPromptSubmit` hook now calls
    `mcp_tool` → `memory.recall_memories` with `input: { prompt: "${prompt}" }`, `timeout: 30`.
    Verified against a live raw MCP stdio JSON-RPC handshake (initialize/tools-list/tools-call),
    not just read off this doc — `UserPromptSubmit` does support `mcp_tool` (confirmed via
    external search after the hooks docs proved self-contradictory on this point), default
    timeout for it specifically is 30s, matching this doc's original claim.
  - `scripts/hooks/memory-image-doubt.js` retired (deleted) — the mechanism it worked around is
    now the thing that replaced it.
- **P3 — clustered/sharded image substrate (recall-upside decision, not a cost blocker).**
  Reuse the layered-index machinery already built on this branch instead of designing sharding
  from scratch:
  - **Partition**: `memory-clusters.js`'s `louvainPartition` + `distinctiveTerms` (already
    produces the Layer-1 clusters used by the memory router) defines the shard boundaries —
    one small PNG per cluster instead of one flat PNG for the whole corpus.
  - **Render fixes**, reasoned from this eval's evidence (no new live test needed to justify
    them — legibility-after-downscale was the measured failure, and these directly attack it):
    mixed/normal case instead of all-caps (word-shape recognition reads faster than dense
    caps blocks at the same pixel budget); larger font/row height, affordable now that a shard
    holds a handful of entries instead of 129; shorter hook text if a shard still feels dense.
    Target dimensions per the vision input cost model below, not an arbitrary pixel count.
  - **Pre-filter to pick which shard image(s) to send** — this was Open Decision 2 below;
    the eval result makes it load-bearing, not optional: sending all cluster images every turn
    multiplies per-image token floor cost and defeats the whole point of a bounded-cost
    substrate. Reuse the lexical cluster router (`memory-route.js`, already repurposed to
    "clustering/layout only" per §1) as the free, mechanical narrowing step; feed the matcher
    model only the 1–3 candidate shard images it selects (plus perhaps an always-on hot-strip
    image for the handful of always-loaded confabulation-catchers).
  - **Validate once, deliberately**: re-run the existing `memory-recall-eval.js` corpus against
    the sharded substrate when it's built — one confirming pass, not an exploratory battery.
- **P1** — wrap the (now-sharded) matcher in the MCP server, register `.mcp.json`, wire the
  `mcp_tool` hook behind confirmation. Retire `memory-image-doubt.js`; keep `memory-route.js`'s
  full-corpus-retrieval role off (its clustering role is now load-bearing, per P3 above).
- **P2** — add the cache (repeat/near-repeat turns skip the model call); measure real per-turn
  quota over a week.

### Vision input cost/tiling model — external reference (2026-07-24, not yet measured for our pipeline)

Two sources Marek supplied describe how OpenAI's vision-capable models actually bill and
process image input; absorbed here as design guidance for the render/shard work above — **not
verified against Codex CLI's actual `gpt-5.6-luna` billing**, since we have no API credit to
measure it directly. Flagged as a future test, not a foreclosed question.

- **Chat Completions vision models (gpt-4o/4o-mini era, tile-based)**: `detail: high` fits the
  image into a 2048×2048 box, rescales so the shorter side is 768px, then tiles in 512×512
  blocks at 170 tokens/tile + an 85-token base fee. `detail: low` bypasses tiling entirely — the
  model sees one synthesized 512×512 image for a flat 85 tokens, regardless of source
  resolution. (morfless.com blog, "Optimizing OpenAI Vision Costs")
- **gpt-image-2 (newer, patch-based)**: no `detail` parameter at all. Images are divided into
  32×32-pixel patches under a 1,536-patch budget; small images (≤512px longest side) get
  upscaled up to 2×; anything over budget is downscaled to fit. Cost is a direct function of
  effective patch count, not a chosen detail tier. (OpenAI community forum thread on gpt-image-2
  input pricing)

**The transferable lesson, independent of which pricing model actually governs Codex/Luna's
`-i` attachment:** the API/model does its own internal resize before tokenizing, invisibly from
our side unless we account for it. Sending an arbitrarily-sized PNG and hoping the model's
internal downscale preserves legibility is exactly the failure the P0 eval already caught with
Claude — an unplanned internal resize silently destroyed legibility. The fix is the same on
either pricing model: **render the image at (or just under) the model's actual processing
resolution ourselves**, so there is no invisible extra downscale eating the font-size margin we
designed for. Concretely:

1. **Target dimensions should land on a real boundary**, not an arbitrary size from the current
   per-column layout math — e.g. exactly 512×512 or 768×768 (tile-model boundaries), or a total
   patch count safely under 1,536 (patch-model budget: `ceil(w/32) × ceil(h/32) ≤ 1536`).
   Landing just over a threshold (e.g. 1537px vs 1536px) can silently trigger an extra
   downscale/pad step for no legibility gain — both sources call this out as a real, non-obvious
   trap, and it's the same shape of problem the P0 eval hit blind.
2. **Low-detail-equivalent modes are explicitly wrong for this task.** Both sources agree such
   modes suit coarse, large-text OCR but not "dense, small-font line items" — exactly what the
   current all-caps 129-entry render is. Reinforces the P3 render-fix direction above: shrinking
   entries-per-image via clustering is what makes each shard's text large enough to survive
   whatever the model's internal resize actually does, on any pricing model.
3. **This bears directly on cluster/shard sizing** (the "Partition" bullet above): shard
   boundaries shouldn't just follow Louvain community sizes — check the resulting image against
   the tile/patch math so a shard doesn't silently cross into an extra downscale tier. Worth
   computing once P3 is built: for a candidate shard size at the current font/row settings, what
   pixel dimensions result, and do they clear a boundary cleanly?

**Future test** (gated on API credit becoming available): instrument actual token usage per
`-i` call at a few different image dimensions to determine which pricing model (if either)
actually applies to Codex/Luna, and calibrate shard sizing exactly instead of by analogy.

**Open decisions (do not bake into this spec):**

1. **Memory location — global `~/.claude` vs the Aria repo.** The server reads a configurable
   `MEM_DIR` (same constant as `memory-index-image.py`), so it is **location-agnostic** and
   this decision does not block the build. But the extraction question is real and pulls
   against `project_global_indexer` (which treats the global store as desirable). It hinges
   on an **unverified premise**: whether Claude Code's native memory-consolidation actually
   mutates files under `~/.claude/projects/<hash>/memory/` autonomously (vs the invoked
   `anthropic-skills:consolidate-memory` skill, which is user-triggered). **Verify before
   migrating.** If CC does auto-edit our files, extraction is urgent (our trusted tools —
   `/audit`, `redundancy-candidates.tsv`, the delete-inbound-link guard — must be the only
   thing that touches the corpus, and a native merge could delete a memory with live inbound
   wikilinks, the exact `feedback_memory_delete_check_inbound_links` failure). If it doesn't,
   the global-store convenience argument still stands and extraction is optional.
2. **Pre-filter design — RESOLVED toward lexical cluster pre-narrow (2026-07-24).** Not a
   plain skip-heuristic — the P0 eval showed the flat-corpus read fails, so the pre-filter's
   job is now shard-selection, not just repeat-turn skipping. `memory-route.js`'s existing
   cluster-tag matching is the candidate mechanism; confirm it narrows well enough as part of
   building P3, not as a separate research spike.
3. **Server lifecycle** — must be always-connected. Relates to the Ollama-at-startup and
   always-on-hardware threads. Decide how it starts (per-session vs resident).
4. **Always-load set** — with the matcher live, retire the always-loaded MEMORY.md bulk. A
   tiny always-load set of critical confabulation-catchers may remain; decide which, if any.

## 9. Related

`project_memory_image_index_doubt_load`, `project_memory_router_recall_defect`,
`project_global_indexer`, `project_memory_methodology_spec`,
`feedback_memory_delete_check_inbound_links`, `env_windows_node_tls_interception`,
`env_avast_flags_dream_watcher_probe`, `env_hook_additionalcontext_text_only`.
