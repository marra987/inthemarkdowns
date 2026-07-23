---
title: "memory-router-spec.md"
source: "docs/memory-router-spec.md"
synced: "2026-07-23"
---

# Memory router — hook-routed per-prompt cluster injection (implementation spec)

**Status:** resolved design, 2026-07-22. This supersedes the original "slim MEMORY.md to the layer-0
router" design (design A), which was **rejected by live canary** the same day. The empirical record is
in §1; the memory node is `project_memory_router`. Codex-buildable; Opus-verified diff after.

**Name:** stop paying the ~9k always-loaded flat-index tax by re-sending all ~120 memory hooks every
turn. Instead: keep a tiny always-loaded layer-0 router as a *map*, and have a `UserPromptSubmit`
hook lexically route each incoming prompt to the relevant memory cluster(s) and inject *only that
cluster's* member hooks as `additionalContext`, once, when the topic actually comes up.

---

## 1. What the canaries settled (do not re-run — this is the record)

Two live canaries, 2026-07-22, rewiring the real memory-store MEMORY.md to the slim layer-0 router:

- **Loading mechanism: WON.** A fresh session (new conversation, *no app restart*) re-injects a
  rewritten MEMORY.md from disk. Slim router loaded cleanly, 18827→5251 bytes (~72% cut). No
  settings.json lever slims/redirects auto-memory (harness-baked). No separate content-based body
  auto-recall exists in this harness — recall is MEMORY.md-index + agent Read-by-slug.
- **Pure router (agent navigates): LOST, n=2.** Two fresh sessions were asked a gotcha question
  (`setx`/Bash env-var caching) whose answer lived only in a *reachable* memory (route verified
  intact end-to-end). Both **confabulated** the plausible-general answer that **contradicts** the
  documented fact (`env_bash_tool_env_var_caching`: "even a full OS reboot didn't fix it"), and
  neither walked the route. The slim router even carried a "route first" instruction at its top; one
  session read it and reasoned, verbatim, *"I should answer it directly rather than getting caught up
  in … mechanics."*

**Root cause (the invariant this spec obeys):** the flat index worked because it was **passive
enforcement** — the fact was simply *present*, no agent decision required. Any design that asks the
*agent* to decide to route is **recall**, and recall does not fire for a question the agent thinks it
already knows (`feedback_enforcement_over_recall`). The fix must put the relevant fact in front of the
agent via a **non-agent actor**. A hook is that actor.

## 2. The one principle

The relevant memory must arrive **without the agent choosing to fetch it**, and **scoped to the
prompt** so it costs a handful of hooks, not all 120. `UserPromptSubmit` is the injection point:
zero-AI lexical match of the prompt against the 26 layer-0 cluster tags → inject the top cluster's
member hooks. Enforcement (can't be rationalised away) + task-scoped (cheap).

## 3. The load-bearing assumption — verify FIRST, before building

**`UserPromptSubmit` `additionalContext` enters the conversation once (at that prompt turn) and is
NOT re-sent every subsequent assistant turn**, unlike CLAUDE.md/MEMORY.md which are re-sent every
turn. The entire efficiency case rests on this. If it turns out additionalContext IS re-sent every
turn, the win shrinks to "scoped instead of full" (still positive) but the framing changes.

- **Test:** wire a trivial `UserPromptSubmit` hook that injects a unique sentinel string; run a
  multi-turn session; inspect the transcript jsonl to confirm the sentinel appears once (at the
  prompt) and not on every later turn. Record the verdict. Do not build §5 until settled.

- **Verdict: CONFIRMED, 2026-07-22.** One-shot sentinel hook (flag-file guarded, fired once) wired
  live via `.claude/settings.json`, exercised over 3 turns in this session, then read back from the
  raw transcript jsonl (`d6b06b53-fc7b-4a57-9e93-333e04c29f19.jsonl`). Findings:
  - The injection lands as a single discrete transcript entry: `type: "attachment"`,
    `attachment.hookEvent: "UserPromptSubmit"`, tied to the one turn it fired on.
  - Across two later plain turns (hook silent, flag already set), **zero** further
    `hook_additional_context`/`UserPromptSubmit` attachment entries appear anywhere in the
    transcript — no re-firing, no re-embedding.
  - CLAUDE.md/MEMORY.md content, by contrast, does not even surface as a discrete per-turn
    transcript entry — it is reconstructed into the system-prompt field fresh on every API call,
    invisible at the message-log level. `additionalContext` instead becomes one ordinary message
    in history, inserted once, exactly like a tool result would be.
  - Confirms the assumption as written: injection is one-time-at-the-prompt, not
    resend-every-turn. Phase 1 (§5) is unblocked.

## 4. Data the hook consumes (already built by the brain tick)

- `brain/memory-layer1-clusters.md` — has a `## Layer 0 - Cluster Router` section (cluster id ·
  size · [RETIER] · **tags**) and a `## Layer 1 - Member Lines` section (per-cluster headings, each
  followed by `- <slug> - <type>; <hook text>` member lines). Both sections confirmed present.
- `brain/memory-layer1-clusters.tsv` — machine-readable sibling. Builder: prefer whichever parse is
  cleaner; the `.md` structure is confirmed and self-describing.

The hook needs two maps from this source: **cluster → tag tokens** (for matching) and **cluster →
member hook lines** (for injection). Both derive from the one file.

## 5. Build — phased so the safety net comes off only after the mechanism is proven

### Phase 1 — add the hook; leave the flat index in place (zero regression risk)

Build `scripts/hooks/memory-route.js`, wired as a `UserPromptSubmit` hook in the **project**
`.claude/settings.json` (sibling to the existing PreToolUse hooks; use `scripts/hooks/janus-gate.js`
et al. as the I/O pattern reference — read payload from stdin, emit result on stdout).

Behaviour:
1. Read the user prompt text from the hook payload.
2. Tokenise; lowercase; drop stopwords. (Open method — keep it dead simple: word-set overlap.)
3. Score each of the 26 clusters by overlap between prompt tokens and that cluster's tag tokens.
4. Take the **top-1** cluster if its score clears a floor; optionally top-2 if a clear second exists.
   **Cap total injected member lines** (e.g. ≤ ~12) to bound cost.
5. Emit those clusters' member hook lines as `additionalContext`, under a short header naming the
   cluster(s) (so the agent knows these are routed memory hooks, not task text).
6. **No match → inject nothing, silently.** Never block the prompt; never error loudly. Fail open.

In Phase 1 the flat MEMORY.md **stays** — the hook adds scoped priming on top of the existing safety
net. No token win yet, no risk. This phase exists to prove the hook fires, matches sanely, and
catches the confabulation.

### Phase 2 — slim the always-loaded surface (bank the win) — ONLY after Phase 1 verified

Now that per-prompt priming is proven, slim the memory-store MEMORY.md to the layer-0 router (the
26-line map, for the *recognisable-need* tier where the agent deliberately navigates). This requires
the brain tick to render the router into the memory-store MEMORY.md (design-A renderer: a compact
`renderLayer0Router` sibling to `renderLayeredMarkdown` in `scripts/brain/memory-layered-index.js`),
replacing the hand-appended pointer workflow with "write memory → tick recompiles router." Keep the
last flat index archived for rollback.

## 6. Verification (success criteria — sharp)

Run in fresh sessions (the only faithful test; memory snapshots at session start).

1. **Assumption (§3) recorded:** additionalContext re-send behaviour settled.
2. **The confabulation is caught (the whole point):** the `setx`/Bash-env-var prompt, asked cold and
   naturally (no "use memory" hint), is now answered **correctly** — i.e. the agent reflects the
   documented fact ("even a full reboot didn't fix it; verify in a user-opened terminal") rather than
   confabulating "restart the session." Pass = the injected hook changed the answer. This is the
   canary that n=2 failed under the pure router; it must pass here.
3. **Recognisable-need still works:** a "what did we decide about X" prompt routes and lands.
4. **Matcher sanity:** a prompt with no memory-relevant content injects nothing (no false priming,
   no noise tax).
5. **Phase 2 token delta:** measured always-loaded drop vs the ~9k flat baseline, plus the typical
   per-prompt injection size — confirm the net is a real reduction, not a shell game.

Not counted as success: the agent *reaching* the fact via repo-grep or a doc that names the slug
(canary-1's leak). The test fact must live only in the memory body. `env_bash_tool_env_var_caching`
qualifies (zero repo-doc leak, confirmed 2026-07-22).

## 7. Edge cases

- **Over-firing:** a chatty prompt matches many clusters. Mitigate with the score floor + top-1/2 cap
  + member-line cap.
- **Under-firing:** coarse lexical match misses (the whole known limitation of zero-AI routing). This
  is strictly better than the pure router (which injected nothing relevant) and no worse than a
  slimmed index. Semantic matching is out of scope (§9).
- **Mid-task pivots:** injection fires on the user prompt, not on later assistant turns — same
  (non-)issue the flat index had. Acceptable.
- **Hook failure:** must fail open (inject nothing, exit clean). A routing hook must never block or
  slow the user's turn.

## 8. Rollback

Phase 1: remove the `UserPromptSubmit` line from `.claude/settings.json`. Phase 2 additionally:
restore the flat MEMORY.md from archive. Memory files untouched throughout; the router is a derived
artifact; nothing at risk.

## 9. Deliberately out of scope

- **Semantic / embedding routing.** This is lexical over the existing zero-AI + labelled clusters.
- **Per-tool-action injection** (inject a gotcha when the agent *runs* `setx`). Heavier, brittle on
  detection, converges toward memories-as-skills. Prompt-time routing is the light expression; revisit
  action-time only if a specific high-value trigger justifies it.
- **Changing the clusters, labeller, or graph.** Those shipped and are verified; this adds a consumer.
- **A standing "hot strip" of always-loaded gotchas.** Superseded by dynamic per-prompt injection —
  keep it only as the fallback if §3 kills the efficiency case.

---

## 10. Canary result, 2026-07-22 — matcher fix (member-text scoring)

Running the §6.2 canary surfaced two things.

**§6.2 is not behaviourally testable in Phase 1, and cannot be tested via a subagent.** In Phase 1
the flat MEMORY.md is still loaded, and its index line for `env_bash_tool_env_var_caching` already
carries the correct answer — so *any* session answers correctly regardless of the hook. Worse, the
`probe` subagent spawned inside personal-assistant **inherits the project's flat MEMORY.md**: all
three probe legs (control / wrong-injection / right-injection) answered correctly and cited the exact
memory file path even with zero injection. The injection never did the work; the flat index did. The
hook's isolated behavioural contribution can therefore only be tested in **Phase 2** (flat index
removed) with a **fresh top-level session** — never a subagent. Until then the operative Phase-1 gate
is the deterministic routing check below, which is contamination-proof.

**The shipped tag-only matcher misrouted the canary; a member-text term fixes it.** For every natural
phrasing of the `setx` question the tag-only matcher scored the *wrong* cluster (Codex-overflow,
system-overview) and never surfaced `env_bash_tool_env_var_caching`. Root cause: that fact is a
minority co-member of `layer1_project_memory_router`, whose curated tags (`behaviour, caching, hot,
hybrid, lost`) describe the router saga, not the env-var symptom — the exact under-firing §7 named.

**Fix (shipped):** score prompts against **cluster tags weighted above member-line text**, not tags
alone. `SCORE_FLOOR=3`, `TAG_WEIGHT=3`, `MEMBER_WEIGHT=1` (member tokens exclude tag tokens). A single
tag hit still fires; a member-only match needs ≥3 hits to clear common-word noise. Verified on the
live hook: all four canary phrasings now inject `layer1_project_memory_router` (score 5–10, decisive),
the injected member line itself carries the corrective fact, and neutral prompts (`refactor this
loop`, capital-of-Australia, weather) stay silent. Unit suite 13/13. One residual — a single-tag
coincidental match (a haiku hitting one tag at score 3) — is pre-existing tag-only behaviour, not
introduced here; left as future noise-tuning if it recurs.

The §6.2 *behavioural* pass (does additionalContext enforce as strongly as the system-prompt-level
flat index, once the flat index is gone?) remains the real Phase-2 gate, run in a fresh top-level
session after MEMORY.md is slimmed.

---

## 11. Phase 2 build brief — hybrid-first slim (Sonnet build)

Written on Opus 2026-07-22 to hand to a Sonnet build session. Two design forks resolved here; the
build is mechanical from this point. Pipeline: this spec → Sonnet builds → Opus verifies diff → the
behavioural canary is run by Marek in a fresh session.

### Resolved design decisions (do not re-litigate)

1. **The brain tick stays read-only on the external memory store.** The live
   `~/.claude/projects/…/memory/MEMORY.md` is the single highest-blast-radius file in the system; a
   5-minute heartbeat silently overwriting the always-loaded recall surface is exactly the
   un-inspectable autonomous mutation ARIA's design resists. The slim render is produced by a
   **deliberate, rollback-guarded command**, never as a tick side-effect.
2. **Hybrid-first, not full-slim.** The slimmed index keeps a small always-loaded **hot strip** of
   confabulation-catchers (passive enforcement, where a wrong answer bites) *plus* the 26-line cluster
   router (routed on demand by the hook + agent navigation). This banks most of the ~9k token win
   while preserving the safety net, and is the working version — full-slim is a later-budget polish
   decided by the behavioural canary's result, not now.

### What to build (open method; these are the pieces, not the keystrokes)

- **`renderLayer0Router(clusterIndex)`** — pure function in `scripts/brain/memory-layered-index.js`,
  sibling to `renderLayeredMarkdown`. Emits the 26-cluster router as MEMORY.md lines:
  `- <cluster_id> (<size>) — <tags> — <label>`. No I/O, unit-tested against a fixture.
- **Hot-strip selection** — the always-loaded catcher lines, in full `- <slug> — <hook>` form.
  Working version: an explicit `HOT_STRIP` allowlist of slugs in the render script (curate the `env_*`
  gotchas + the hard-won `feedback_*` corrections, ~8–12). Polish-later: promote to a `hot: true`
  memory frontmatter flag so the list is data, not code — out of scope here.
- **`assembleSlimMemoryIndex(hotStrip, router)`** — composes the full slimmed file: the existing
  `# Memory Index` header + `_Format:_` line, a `## Always-loaded (confabulation catchers)` section
  (hot strip), then a `## Cluster router (routed on demand)` section. Pure, unit-tested.
- **The deliberate render command** — a skill or script that: (1) archives the current flat
  `MEMORY.md` to a timestamped rollback copy, (2) writes the assembled slim version to the live path,
  (3) prints a byte-size + line-count diff summary. Rollback = restore the archive. This is the only
  piece that touches the live external file; keep it explicit and loud.

### Success criteria (sharp)

- Slimmed `MEMORY.md` ≤ ~5.5k bytes (flat baseline 18.8k), measured and reported by the command.
- Hot strip contains every named catcher slug, in full hook form; router contains all 26 clusters.
- Rollback restores the prior flat index **byte-for-byte** (test it).
- `renderLayer0Router` + `assembleSlimMemoryIndex` covered by `node --test` unit tests.

### What does NOT count as success (and is out of scope)

- **Wiring the render into the brain tick.** Explicitly forbidden per decision 1.
- **The behavioural §6.2 pass.** That is a separate fresh-session test, run by Marek after this build,
  not something the build verifies.
- Changing the clusters, labeller, or the hook matcher (already shipped and verified).

### The behavioural canary this build sets up (Marek, fresh session, run AFTER the slim lands)

The test fact **must be router-only** — a genuine gotcha deliberately kept *out* of the hot strip, or
it passes via passive enforcement and tests nothing. `env_bash_tool_env_var_caching` is a catcher and
belongs *in* the strip, so it cannot be the test fact. Use a confab-prone router-only fact instead —
recommended: **`env_cloudflare_workers_build_secret_vs_text`** (the plausible-wrong answer, "set it as
a Secret," pulls hard against the documented "use Text for build-time vars"). As the first prompt of a
fresh top-level session, ask it cold ("my PUBLIC_ env var is undefined in the Cloudflare Workers build,
I set it as a Secret — why?"). **Pass** = the agent reflects the documented fact (Text, not Secret),
proving the hook's `additionalContext` enforces without any passive priming. **Fail** = it confabulates
"use a Secret" → injection routes but does not enforce → the hot-strip hybrid is the permanent floor
and full-slim is off the table.

---

## 12. Phase 2 build outcome, 2026-07-22 - shipped and live

Built on Sonnet per §11's brief, unmodified design decisions. `renderLayer0Router`, `HOT_STRIP` +
`buildHotStrip`, and `assembleSlimMemoryIndex` landed in `scripts/brain/memory-layered-index.js`
(pure, unit-tested). The one I/O-touching piece - archive, write, `--rollback` - is
`scripts/brain/render-slim-memory-index.js`; archive/write/rollback are pure-enough to unit test
against a tmpdir, never the live file. 13 new `node --test` cases; 365/365 green across
`scripts/brain/`. Not wired into the brain tick, per decision 1.

Two open-method choices resolved during the build, both driven by the byte budget:

- **Router tags capped at 2 per cluster** (`ROUTER_TAG_CAP`). The full tag set stays in
  `brain/memory-layer1-clusters.md`, which is what the hook actually matches against - the cap only
  thins the human/agent-glance surface in MEMORY.md, not routing accuracy.
- **Hot strip trimmed to 10 slugs** (spec allowed 8-12): dropped `env_avast_idp_helu_codex_powershell`
  and `env_codex_cli_headless_windows` as lower confab-risk (narrow-incident / reference-lookup
  material, not "plausible wrong answer" bait). Kept `env_bash_tool_env_var_caching` (required - the
  original n=2 canary fact) and every slug with 2026-07-19 RESTORED history.
  `env_cloudflare_workers_build_secret_vs_text` stayed out, reserved for the §11 behavioural canary.

**Run live 2026-07-22T05:25Z:** archived the prior flat index (19292 bytes, 128 lines) to
`MEMORY.archive-2026-07-22T05-25-01-376Z.md`, wrote the slim index - **5213 bytes, 49 lines, a 73.0%
cut** - under the ≤~5.5k target. Rollback command was printed but not exercised on the live file.

**Still open:** the §11 behavioural canary itself - first prompt of a fresh top-level session, asked
by Marek, not this session and not a subagent. That result is the actual finish line; this section
only records that the mechanism landed.

---

## 13. Behavioural canary result, 2026-07-22 - PASS

Run by Marek as the first prompt of a fresh top-level session, per §11's own recipe: "my PUBLIC_ env
var is undefined in the Cloudflare Workers build, I set it as a Secret — why?" No memory hint, no
"check your notes" framing.

**Verdict: PASS.** The agent answered correctly and confidently: "Fix: set that variable's type to
Text (or Plaintext) instead of Secret" - the documented fact, not the plausible-wrong "use a Secret"
confabulation the fact was chosen specifically to bait. The transcript's `UserPromptSubmit`
`additionalContext` shows exactly what fired: `Routed memory cluster: layer1_project_memory_router`,
carrying the `env_cloudflare_workers_build_secret_vs_text` line verbatim. That fact lives **only** in
the cluster router - it was deliberately excluded from `HOT_STRIP` (§12) to keep this test honest, so
passive priming cannot explain the correct answer. `additionalContext` enforcement is confirmed to
work on its own, closing the question §1's canaries opened: a *routed*, non-agent-chosen injection
catches confabulation the same way the flat index did; a *pure* router (agent must choose to navigate)
did not.

**What this unlocks, not yet decided:** §11 named full-slim (dropping the hot strip, router-only) as
"a later-budget polish decided by the behavioural canary's result, not now." That result is in and
it's a pass - full-slim is now empirically defensible, not just theoretically. Whether to actually
build it is a separate call, not something this result auto-triggers: the hot-strip hybrid still has
a real edge (zero-navigation-decision confabulation catching for the ~10 highest-stakes gotchas, at
~2.5k bytes of the ~5.2k total), so the case is a token-savings-vs-residual-safety-margin tradeoff,
not a correctness one.
