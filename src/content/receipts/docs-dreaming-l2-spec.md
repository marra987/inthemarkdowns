---
title: "dreaming-l2-spec.md"
source: "docs/dreaming-l2-spec.md"
synced: "2026-07-14"
---

# Generative dreaming, L2a: human-triggered Codex+web reach-out (implementation spec)

**Status:** spec (Opus-written 2026-07-01, for a **Sonnet** implementation session)
**Name:** the dream reach — the first tier that *leaves the graph*. It takes a resonance the graph
can't resolve on its own (an L1 survivor, or an `external-novelty` seed L0 couldn't touch) and
hands it to Codex — read-only, with live web — as the out-of-graph interlocutor: *does testing this
against knowledge outside the graph close it **inward** (a nameable edge → interpolation, a proposed
wikilink) or **outward** (new territory linking to nothing → an orphan candidate)?* The orphan is
the independence proof; L2 is the only tier that can produce one, because you cannot author new
territory by recombining old nodes.
**Scope:** **L2a only — the reach mechanism + its budget, human-triggered.** The Codex-reach module,
the reach prompt, the request-metered budget circuit breaker, the `dreaming.md` config, the
three-layer morning artifact, and a manual trigger. **Out of scope — deferred to L2b:** the
*autonomous* watcher headless-fire, AC-power gating, and mid-call interruptibility. Those only matter
once the watcher fires the reach *unattended*; L2a keeps a human at the trigger while the genuinely
new capabilities (leaving the graph, live web, real spend) are first exercised. Each slice stands
alone, as L0 and L1 did.
**Reach depth — L2a is the *viability probe* (depth-1), one Codex turn returning one sourced
candidate.** The deeper "real research → a *structure* of orphans" reach is **depth-2, deferred** and
gated on a depth-1 probe that came back strong-ORPHAN (§9). Depth is a gated climb like every other
tier — a reach goes deep only because the cheap probe judged it worth it — so the common case stays
one turn and the budget numbers (§5.1) stay honest. The rationale is a hard constraint, not a
preference: **conscious ARIA can only interpolate** — anything she authors links back into her own
graph, so it is by definition not an orphan. The out-of-graph content must come from the Codex reach;
morning-ARIA's sanctioned role at the interpretation end is to *react, argue, and decide placement*,
never to *extend* the territory (that would collapse the orphan bar and the reach/interpreter wall).
**Origin:** the dreaming direction (memory `project_aria_dreaming_generative`) — the flour-mill stack
**L0** unseeded `retrieval.js` (shipped) → **L1** local Ollama triage (shipped) → **L2** Codex reach
(this spec) → **L3** Janus. L2 is the Ego reaching outside itself for reality-testing (Freud
mapping): a survived resonance tested against the world, at the first tier that costs real budget.
**Two decisions Marek fixed 2026-07-01:** (1) **live web reach is in v1**, not deferred — the earlier
"defer hard web reach" note is superseded by his confirmed verdict that sandboxed Codex web-reach is
"as safe as if I sent you to look" (memory §"Autonomous reach is endorsed"). (2) **Human-triggered
this slice** — the reach shares Marek's *interactive* Codex allowance (below), so autonomy is not
granted until the request-accounting has earned trust.
**Builds on:** `docs/dreaming-spec.md` (L0), `docs/dreaming-l1-spec.md` (L1), the `/codex` skill
(`.claude/skills/codex/SKILL.md` — the invocation shape and the one-time headless prerequisites),
`scripts/brain/dream.js` / `dream-watcher.js` / `seeds.js` (the L0/L1 pipeline this extends),
memory `env_codex_cli_headless_windows` (workspace-write fails closed, bypass flag harness-blocked,
Free tier is a *monthly budget*).

## Build Targets

Sonnet is the implementer, so the `/codex` governing-file firewall does not gate this build. The
target list stands for clarity — these are the only files L2a creates or edits:

- `scripts/brain/dream-codex.js` — **new** (the reach module, §3)
- `scripts/brain/dream-codex.test.js` — **new** (unit tests, §8)
- `scripts/brain/dream-budget.js` — **new** (the request-metered circuit breaker + `dreaming.md`
  parse, §5)
- `scripts/brain/dream-budget.test.js` — **new** (unit tests, §8)
- `scripts/brain/dream.js` — **edit** (add the L2 reach-layer render, §7)
- `local/prompts/dream-reach.md` — **new** (the reach prompt — ARIA's reach judgment as editable
  markdown, §4)
- `dreaming.md` — **new** (repo-root policy config, §5.1)
- `scripts/local/reach-eval.js` + a small labeled corpus — **new** (the §1.5 model benchmark,
  run as step-1 before the module is finalized; mirror `scripts/local/triage-eval.js`)
- `.gitignore` — **edit** (add the reach-ledger, §5.2 — local regenerable state, like the brain cache)

A manual trigger (`/dream` skill vs bare CLI entry) is specified in §6 as a CLI entry on
`dream-codex.js`; the skill wrapper is an optional ergonomic follow-on, not built here.

---

## 0. The principles that must not be violated

These extend L1's four; the new ones (5–6) are what the *paid, networked* tier adds.

1. **READ + CONSULT, never ACT — enforced by a read-only sandbox.** The reach runs Codex with
   `-s read-only` (§3.2): Codex physically cannot write the filesystem, install, or download. It
   reads its own knowledge + the web and returns text; **ARIA's module writes the one file (the
   dream-log).** This is a *stronger* wall than the `/codex` skill's `workspace-write` firewall —
   there is no writable target at all. The hard boundary from the direction memory ("a dream may
   READ the world and CONSULT models, but never ACT") is satisfied mechanically, not by trust.
2. **Transparent Ego — log the argument, not just the claim.** A frontier model at L2 emits a fluent
   candidate that buries its messy origin (the direction memory's named anti-pattern: manifest
   concealing latent). So the reach logs Codex's *reasoning and its cited sources*, not only the
   polished verdict. The morning artifact privileges the latent (path + argument + sources) over the
   conclusion (§7).
3. **Propose-only, dream-tagged.** An orphan candidate is *not* a fact and is *never* written to the
   authored graph here. Placement stays L3: `/janus brain` (a cold spawn that never saw the dream)
   plus Marek. L2a logs a candidate and its provenance; nothing more.
4. **Die safe and cheap.** Codex unreachable, auth-blocked, a blown budget cap, an unparseable
   verdict → log the reason and exit 0. A dream process must never wedge the machine or escalate.
5. **The budget is shared, and interactive use wins.** Codex on a ChatGPT plan meters by *requests
   within rolling windows* (a short ~5h window + a weekly one), **not** by tokens — and that pool is
   the *same one* Marek's interactive `/codex` delegation draws on
   (`project_provider_independence_codex_overflow`). Dreaming is therefore the **lowest-priority
   consumer**: it gets a small *sub-allocation* of the window and reserves headroom, so it can never
   starve interactive overflow work. The circuit breaker counts **requests**, not dollars or tokens
   (§5).
6. **An abort counts as spend.** The metered unit is the *request sent*, so a reach that is later
   aborted or errors still consumed budget. The ledger records a reach when it is **initiated**, not
   when it succeeds (§5.2) — the breaker must never under-count.

---

## 1. The dangerous assumption — test it first, before building anything else

The whole slice rests on one unverified capability: **that `codex exec` can run a read-only-sandbox
+ live-web reach headlessly on this machine, and that the plan meters it predictably.** This is L2's
`GetLastInputInfo` (the L0 spec §1.2 pattern): confirm it in this environment *before* writing the
module, or the rest of the spec waits on a different mechanism.

Step-1 manual probe (document the exact command + output in the PR):

1. Run a trivial read-only web reach and confirm it returns a cited answer without writing anything:
   ```powershell
   &"C:\Users\marek\AppData\Local\Programs\OpenAI\Codex\bin\codex.exe" exec `
     --skip-git-repo-check -s read-only --json `
     -o "<scratch>/reach-probe.md" `
     "Using web search, name one 2025 paper on offline memory consolidation in LLM agents and cite its URL." `
     > "<scratch>/reach-probe.jsonl"
   ```
2. **Pin the exact web-enable knob.** The `/codex` skill does not use web; this reach must. Confirm
   whether web search is on by default under `-s read-only`, or needs a config/flag (`~/.codex/config.toml`
   `tools`/`web_search`, or an exec flag). Record the exact knob — the direction memory's standing
   instruction is "pin the exact knobs (domain blocklist syntax, permission flags, the deny on
   npm/installs/downloads) in codex.md + the invocation config." If read-only + web is **not** a
   supported combination in the installed Codex version, stop and surface it; the reach may need
   `-s workspace-write` confined to a throwaway scratch dir instead (weaker wall — flag it, don't
   silently accept it).
3. **Measure the metering.** Note how the plan counts this: one `codex exec` = how many "requests"
   against the 5h/weekly window? Web-search turns may count separately from the model turn. This
   number calibrates the `dreaming.md` sub-allocation (§5.1) — record the observed cost per reach.

Retire this assumption in the PR before the module lands.

---

## 1.5 Model selection — benchmark before pinning (measure-first, with §1)

The reach model is **not** the ambient `~/.codex` default. The reach is a judgment-plus-web task, not
a `/codex` code build, so it gets its own pinned choice in `dreaming.md` (§5.1), decided by a small
benchmark run as step-1 alongside §1. Marek named the pair: **GPT-5.3-medium vs 5.5-medium** (same
reasoning effort, different generation).

**The completeness target that anchors the rubric (Marek's question, ARIA's call — overturnable):**
**lean, not rich.** The reach is not the final judge — L3 (`/janus brain`, cold) re-verifies against
the sources and morning-ARIA privileges the latent path over the verdict — so the reach need only
surface a *sourced, honest candidate*, not a conclusively-correct essay. Therefore optimize model
choice for **calibration + source-fidelity, not prose richness.** A fluent, confabulated ORPHAN with
fake sources is the *expensive* failure (it manufactures orphan-shaped noise that costs L3 + Marek
attention — the transparent-Ego anti-pattern). Prose completeness is secondary; not-fabricating is
primary.

**Eval set** (~8–12 hand-labeled reach requests, three buckets — reuse `triage-eval.js`'s
labeled-corpus / pure-impure harness shape; `scripts/local/reach-eval.js` + a small corpus file):
- **HOMES** — real internal resonances that are genuinely just interpolation (draw from actual L1
  survivors that are nameable edges, e.g. the 19:53 `morning_cost_profile ↔ brain_as_platform` keep).
- **ORPHAN** — real external-novelty claims verifiable as both true and outside the graph (a real
  paper/repo with a known-good source).
- **NEITHER** — actual ministral *culls* (noise pairs); they must stay dead at L2 too.

**Rubric, scored per item:**
1. **Verdict vs label** — weight false-ORPHAN heaviest (over-calling is the costly error).
2. **Source fidelity** — resolve the cited URLs: real + relevant = pass; fabricated/irrelevant = fail
   *even if the verdict is right.*
3. **Honesty** — for external items, does it test *against the source* rather than rubber-stamp the
   novelty claim?

**Cost, recorded per item:** metered requests-per-reach + wall-clock, **per model** — this feeds the
§5.1 `requests_per_reach` and the sub-allocation, and confirms whether 5.5 meters more heavily against
the shared window.

**Decision rule (test-before-disqualify):** default to the cheaper **5.3-medium**; escalate to
5.5-medium *only if* it materially cuts the false-ORPHAN rate or source-fabrication. Write the winner
+ effort into `dreaming.md`. Also confirm during this step that Codex exposes a per-invocation
**model + reasoning-effort** knob (flag or `config.toml`); pin the exact knob in the module.

---

## 2. Where L2a sits

L0/L1 run (idle, local, free) and leave the dream-log with survivors. L2a is a **separate,
human-triggered pass** over a single reach-worthy item:

```
[L0/L1, idle] → dream-log survivors + open external-novelty seeds
                              │  (human invokes the reach — §6)
                              ▼
   select ONE reach request → budget check (§5) → Codex read-only+web reach (§3)
                              → append L2 reach-layer to the day's log (§7)
```

Two kinds of reach request feed the same module (§3.3):

- **Internal survivor** — the top-scored L1 survivor of a fresh, deterministic L0→L1 run (temp=0 +
  stable graph ⇒ the run reproduces the logged survivors; §6.2). The reach asks: home inward or
  stand outward?
- **External-novelty seed** — an open `external-novelty` entry in `dreams/seeds.md`, which `seeds.js`
  already reserves for exactly this consumer ("L0 leaves it open for L2 to reach out and decide
  whether it has a home"). The material is *already* outside the graph (Marek shared it, front-door
  provenance), so the reach doesn't generate — it **tests whether it homes after all**, and verifies
  the novelty claim against the logged source. On a completed reach, flip the seed `open → dreamt`
  via `markSeedDreamt` (reuse `seeds.js`; a seed is never burned without a reach — mirror the L0
  order in `dream-watcher.js#fireEpisode`).

`dreamJuxtapositions`, `triageJuxtapositions`, and `seeds.js` are reused unchanged.

---

## 3. The reach module — `scripts/brain/dream-codex.js`

Mirror the pure/impure split the rest of the brain uses (`dream-triage.js`, `triage-eval.js`): pure
prompt-building + output-parsing (unit-tested), one impure orchestrator with an **injected** runner
(so tests never spawn Codex).

### 3.1 The reach request (normalized input)
Both input kinds normalize to one shape before the module sees them (§6 builds these):

```js
// internal survivor
{ kind: 'internal', from, to, score, path, l1Reason }
// external-novelty seed
{ kind: 'external', header, resonance, struck, source }   // source = the logged hard source
```

### 3.2 The invocation (impure boundary)
Reuse the `/codex` binary path and the `--json` + `-o` event/output capture. **Differences from the
`/codex` skill — this is a consult, not a build:**

- `-s read-only` (never `workspace-write`) — the §0.1 wall. Codex writes nothing.
- **Web enabled** via the §1 knob.
- `--skip-git-repo-check`, run with `-C <scratch>` — no repo, no branch, no diff. The `/codex`
  branch-first / firewall / diff-review machinery does **not** apply; L2a never touches a repo.
- **Model + effort from `dreaming.md` (§5.1), not the ambient `~/.codex` config** — the §1.5
  benchmark pins them; the reach is a different task than a `/codex` build, so it must not inherit the
  build default.
- Capture: parse `<scratch>/reach-events.jsonl` for the final message + any `error` event; read
  `<scratch>/reach-last.md` for Codex's answer.

Wrap it as an injected default: `runReach = async (prompt) => <spawn codex, return last.md text + events>`.
Tests pass a fake and never spawn Codex. Distinguish an *unreachable/auth-blocked* error (die-safe
passthrough, §0.4) from a *reachable-but-failed* run (record the reach as spent, verdict `unparsed`).

### 3.3 The pure functions
```js
export function buildReachPrompt(request, promptFile)   // → string (system preamble + rendered request)
export function parseReachOutput(text)                  // → { verdict, argument, sources, parsed }
```
- `buildReachPrompt`: load `local/prompts/dream-reach.md` (reuse the `## System` / `Placement:`
  reader convention from `dream-triage.js#loadTriagePrompt`). Render the request as evidence: for an
  internal request, the two node titles+descriptions and the latent path + L1's reason; for an
  external request, the resonance, the "struck" line, and **the hard source verbatim** (the model
  must argue against the source, not ARIA's excitement — §0.2 / direction memory's misread-risk
  rule). One assembled prompt string for `codex exec`.
- `parseReachOutput`: the reach's output contract (§4) is a first-line verdict token
  `ORPHAN` / `HOMES` / `NEITHER`, then the argument, then a `Sources:` block. Parse:
  `verdict ∈ {orphan, homes, neither}` (case-insensitive standalone token, `\bORPHAN\b` etc.),
  `argument` = the prose between verdict and sources, `sources` = the listed URLs/titles.
  Ambiguous/none → `{ verdict: 'unparsed', argument: <raw>, sources: [], parsed: false }`. **Fail
  direction: `unparsed` is logged as-is, never promoted** — an unparsed reach is a visible non-result,
  not an orphan (the transparent-Ego rule: never let a malformed reach masquerade as a finding).

### 3.4 The orchestrator
```js
export async function reach(request, { runReach, promptPath, budget, config, now } = {})
// → { request, verdict, argument, sources, parsed, spent: true|false, budgetReason? }
```
- **Budget gate first (§5):** call `budget.canReach(now)`; if refused, return `{ spent:false,
  budgetReason }` and reach nothing — the die-safe refusal, no Codex call.
- **Record the reach as initiated** (§0.6) *before* the Codex call: `budget.appendReach(now,
  request.kind)`. An abort/error after this point still counts.
- Build the prompt, call `runReach`, `parseReachOutput`. On an unreachable/auth error *before* the
  call would have been metered, do **not** record spend (nothing was sent) — return a die-safe
  passthrough marked unavailable.
- Return the structured result for §7 to render.

Determinism note: unlike L1, Codex is not pinned to temp=0 and web results drift — so the reach is
**not** reproducible run-to-run. That is fine (it's a one-shot consult, logged with its sources), but
it means the reach is *not* part of the brain's shape-only deterministic artifacts — it carries a
timestamp and lives only in the dated dream-log.

---

## 4. The reach prompt — `local/prompts/dream-reach.md`

ARIA's reach judgment as editable markdown (intelligence-lives-in-markdown — the criteria live here,
not in code). `## System` section + `Placement: system` header. Design points:

- **State the question once, concretely.** "You are given two ideas the graph connected only
  transitively, or one externally-sourced claim. Using your knowledge and web search, decide:
  **HOMES** — the connection is a real, nameable edge between things ARIA already holds (interpolation:
  it belongs *inside* the graph as a wikilink); **ORPHAN** — testing it opens genuinely new territory
  that links to nothing ARIA holds (extrapolation, only knowable by reaching outside); **NEITHER** —
  no real connection, or the claim doesn't survive contact with sources."
- **Demand grounded sources for any ORPHAN.** An orphan's only provenance is "I went out and found
  this" — so an ORPHAN verdict with no cited external source is invalid (the direction memory: "an
  orphan with no logged external provenance is indistinguishable from hallucination"). Instruct: cite
  what you read; if you cannot, downgrade to NEITHER.
- **For an external-novelty claim, argue against the SOURCE, not the framing.** The novelty claim is
  a hypothesis; test it against the cited material and say plainly if it's a retrieval miss or
  confabulation rather than real novelty (misread-risk rule).
- **Terse output contract:** first line `ORPHAN` / `HOMES` / `NEITHER`; then ≤4 lines of argument;
  then `Sources:` followed by URLs/titles. No preamble.

**Single-turn probe, not a research directive.** The prompt asks for one grounded verdict + a handful
of sources, not a developed structure — that is depth-1 (viability), all L2a builds. Do not instruct
Codex to expand an ORPHAN into a territory here; that is the deferred depth-2 reach (§9).

Treat v1 as a starting point; expect to iterate against real reaches (§8 manual check).

---

## 5. The budget — `dreaming.md` + `scripts/brain/dream-budget.js`

The heart of the slice: a **request-metered** circuit breaker over the *shared* Codex allowance
(§0.5). This is where the deferred `dreaming.md` config finally lands (L0 §1.1 / L1 §6 deferrals).

### 5.1 `dreaming.md` (repo-root, alongside `triggers.md`)
Governing policy, parsed mechanically. Keys (numbers are Marek's plan-specific tunables — seed them
conservatively from the §1.3 measurement, he adjusts):

```markdown
# dreaming.md — dream-work policy (intelligence-lives-in-markdown)

## Codex reach model (L2a) — pinned by the §1.5 benchmark, NOT the ambient ~/.codex default
- reach_model: <benchmark winner>   # 5.3-medium unless 5.5-medium earns it (§1.5 decision rule)
- reach_effort: medium              # reasoning effort held constant across the 5.3/5.5 benchmark

## Reach wall (L2a) — the never-ACT boundary, DECLARED here, ENFORCED by the sandbox flag
- sandbox: read-only     # -s read-only: Codex cannot write, install, or download — no writable target
- network: web-on        # live web via OpenAI's guarded sandbox (cached index + monitors)
- writer: aria-only      # the ONLY writer of any dream artifact is ARIA's module → the dream-log
- repo: none             # runs in scratch, --skip-git-repo-check; never opened against a project repo
# This is the human-inspectable statement of §0.1 / §3.2. The brake is the flag, not this text
# (enforcement-over-recall); the section exists so the boundary can be read and changed in markdown.

## Codex reach budget (L2a) — dreaming's sub-allocation of the SHARED Codex window
- reach_requests_per_5h: 2       # ceiling within any rolling 5h window
- reach_requests_per_week: 12    # ceiling within any rolling 7d window
- monthly_reach_ceiling: 100     # hard stop; blown → die safe, never escalate
- requests_per_reach: 1          # measured cost of one reach (§1.3); >1 if web turns meter separately
- reserve_note: dreaming is the lowest-priority Codex consumer. These caps are a fraction of the
  plan's window, deliberately leaving headroom so interactive /codex work is never starved.

## Idle & power (L2b — declared, NOT enforced here)
- idle_threshold_s: 900
- require_ac_power: true
```

A tiny parser (`parseDreamingConfig(md)` in `dream-budget.js`, mirror `triggers.js#parseTriggersConfig`)
returns the numbers. **Do not build a config framework** — it's a flat key list, like `triggers.md`.

### 5.2 The ledger + breaker (`dream-budget.js`)
Persist initiated reaches so a watcher/CLI restart doesn't reset the count. Ledger:
`dreams/.reach-ledger.tsv` (gitignored — local regenerable state, like the brain cache), append-only,
one row per **initiated** reach: `ISO-timestamp\tkind\tverdict-or-"initiated"`.

Pure, tested:
```js
export function parseLedger(tsv)                         // → [{ at:number, kind, verdict }]
export function countInWindow(rows, now, windowMs)       // → number of reaches in [now-window, now]
export function canReach(rows, config, now)              // → { ok:boolean, reason }
```
`canReach` refuses (`ok:false`, human-readable `reason`) if **any** holds, counting
`requests_per_reach` per row:
- 5h window count ≥ `reach_requests_per_5h`
- 7d window count ≥ `reach_requests_per_week`
- calendar-month count ≥ `monthly_reach_ceiling`

The impure side appends the row (`appendReach`, using `atomicWrite`) — called by the orchestrator
**before** the Codex call (§3.4), so an abort still counts (§0.6). After the reach resolves, the
row's verdict is updated in place (or a second resolution row appended — pick the simpler; the count
is by initiation, so resolution detail is provenance only).

---

## 6. The trigger (human-in-the-loop, this slice)

A bare CLI entry on `dream-codex.js` — invoked manually by Marek, or from a `/morning` step, always
with a human present and the run logged. (`/dream` skill wrapper: optional ergonomic follow-on, not
built here.)

### 6.1 `node scripts/brain/dream-codex.js --external`  (the clean path)
Consume the oldest open `external-novelty` seed from `dreams/seeds.md` (`parseSeeds`, filter
`kind==='external-novelty' && status==='open'`), normalize to a reach request (§3.1), reach, append
the L2 layer (§7), flip the seed `open → dreamt` (`markSeedDreamt`) **only after the reach landed**.
If no open external seed exists, exit 0 with a note (nothing to reach).

### 6.2 `node scripts/brain/dream-codex.js --internal [--start <node_id>]`
Deterministically re-run L0→L1 (`dreamJuxtapositions` from `--start` or the top open internal seed or
a random low-degree pick, then `triageJuxtapositions`), take the **top-scored survivor**, reach on it.
Because L1 is temp=0 and the graph is stable, this reproduces a logged survivor rather than inventing
one; note the determinism dependency in the code comment. (If graph drift ever makes this diverge
from the logged episode, the L2b follow-on adds a machine-readable episode sidecar — do **not** build
that here.)

Both entries: budget-check → reach → render. Print a one-line summary (kind, verdict, budget
remaining) like `dream-watcher.js` does.

---

## 7. The artifact — the three-layer reach block (`dream.js`)

Add `renderReachBlock(result, { now })` (pure) and append it to the day's log via the existing
`appendDreamLog` I/O path (extend it to accept a pre-rendered block, or add a sibling appender —
keep it small). A reach is a **standalone dated block** (it happens separately in time from the
L0/L1 episode it reaches on):

```markdown
## 14:32 — reach (Codex + web)

Reached on **project_x ↔ project_y** (survivor from the 19:53 idle dream).
Question: home inward, or new territory?

Verdict: ORPHAN candidate.
Codex argued: <≤4-line condensation of the argument — the LATENT layer, privileged over the verdict>
Sources:
- <url / title Codex cited>
- <url / title>
Budget: reach 4 this week / 12 · 1 in this 5h window / 2. (dreaming sub-allocation; interactive Codex untouched.)

Propose-only — dream-tagged, unvetted by any cold pass. Awaiting /janus brain + Marek (L3).
```

Rules:
- **Latent over manifest (§0.2):** the `Codex argued` + `Sources` lines are load-bearing; an ORPHAN
  with an empty `Sources` block is rendered but flagged `⚠ orphan claimed without cited source —
  treat as hallucination until sourced` (never silently presented as a finding).
- **External-seed reach** names the seed + its source instead of the survivor: `Reached on external
  seed (<source>) deposited <date>.`
- **`unparsed` / unavailable** → honest fallback marking: `Reach returned no parseable verdict —
  raw output preserved below.` / `Codex unreachable — no reach performed, no budget spent.`
- Closing line always marks propose-only + the pending L3 gate. Nothing here is a fact.

---

## 8. TDD — write these first

`dream-codex.test.js` (inject a fake `runReach` — never spawn Codex):
1. **`parseReachOutput`** — `ORPHAN\n…\nSources:\n- u` → orphan + argument + sources; `HOMES` /
   `NEITHER` likewise; ambiguous/none → `unparsed`, `parsed:false`, raw preserved.
2. **`buildReachPrompt`** — internal request renders both descriptions + path + L1 reason; external
   request renders the resonance + the **verbatim source**; system carries the prompt.
3. **orchestrator budget-refusal** — `budget.canReach` false → returns `spent:false` with the reason,
   `runReach` never called.
4. **orchestrator records-before-call** — a `runReach` that throws *after* being invoked still leaves
   an appended ledger row (abort-counts-as-spend); an *unreachable* error before metering does not.
5. **ORPHAN-without-source flag** — an orphan verdict with empty sources round-trips to the render's
   ⚠ marking.

`dream-budget.test.js`:
6. **`parseDreamingConfig`** — the flat key list parses to the right numbers.
7. **`countInWindow`** — rows inside/outside a rolling window counted correctly at a pinned `now`.
8. **`canReach`** — refuses at each ceiling (5h, week, month) independently; `requests_per_reach>1`
   multiplies the count; passes with headroom.
9. **`parseLedger`** round-trips appended rows.

`dream.js` render test:
10. **`renderReachBlock`** — internal/external/unparsed/unavailable each render the expected block,
    including the budget line and the ⚠ unsourced-orphan marking.

The live reach is a **manual integration check**, not a unit test (§1.3 precedent): document the real
command + one real reach + the read-only-wrote-nothing proof in the PR.

---

## 9. Done = verified

1. **The §1 dangerous assumption is retired** — read-only + web `codex exec` confirmed headless, the
   web knob pinned, and the per-reach request cost measured and written into `dreaming.md`.
2. Unit tests above pass; `node --test "scripts/brain/*.test.js"` stays fully green (L0 + seed +
   triage + reach + budget).
3. **Live reach** on one real request (deposit a test `external-novelty` seed, or `--internal` off a
   real survivor): the three-layer block lands with a verdict, condensed argument, cited sources, and
   the budget line. **Prove the wall:** confirm Codex wrote nothing outside `<scratch>` (read-only
   held) and touched no repo file.
4. **Breaker** — set `reach_requests_per_5h: 1`, run twice; the second is refused with a die-safe
   `reason`, no Codex call, nothing spent beyond the first.
5. **Abort-counts** — force `runReach` to fail after invocation; confirm a ledger row was still
   recorded (the breaker won't under-count).
6. External-seed path flips `open → dreamt` only after the reach landed (never burned without a reach).

**Deferred — depth-2 reach, its own later slice, do NOT build here:**
- **Structure-of-orphans deep research** — a second, deeper Codex pass that expands a depth-1
  ORPHAN into a small structure (several new nodes + internal edges + sources), *gated* on a depth-1
  probe that returned strong-ORPHAN with a solid source, and **separately budgeted** (a research
  session is many Codex turns, not one — it must not draw on the depth-1 per-reach numbers). This is
  the "read/argued sources with Codex → a real orphan" richer artifact from the direction memory,
  earned rather than default.

**Deferred to L2b — note-in-code, do NOT build here:**
- **Autonomous watcher fire** — wiring the reach into `dream-watcher.js#fireEpisode` so it runs
  unattended on idle. This is "the one genuinely new autonomous behavior" (direction memory) and is
  withheld until the request-accounting here has earned trust.
- **AC-power gate** — a `GetLastInputInfo`-family Win32 probe for mains power; only matters for
  unattended fire (a paid wall-clock action on battery). `dreaming.md` already declares the key,
  unenforced.
- **Mid-call interruptibility** — poll idle *during* the reach, kill the Codex child on input-resume,
  flush partial to the log, die safe. Only matters when the watcher fires a minutes-long call while
  Marek's away; a human-triggered reach is attended.
- **Live remaining-quota awareness** — reading how much of the interactive window is left and yielding
  dynamically. Until Codex exposes it cleanly, the static sub-allocation (§5.1) *is* the reservation —
  dreaming self-caps low and interactive always wins.

Commit shape: `feat(dream): add L2a human-triggered Codex+web reach with request budget`. One
feature, one branch (`feat/dream-l2a`). L2b (autonomous watcher fire + AC gate + interruptibility) is
the next slice and gets its own spec.

---

## 10. Why this slice, and what it proves

L2a is where a dream first *leaves the graph* — the only tier that can produce an orphan, and the
first that spends real (shared) budget and reaches the live web. Doing it **human-triggered** first
introduces all three risky-new things (out-of-graph reach, live web injection surface, metered spend)
with Marek at the trigger and every reach logged, and — the point his Codex-accounting catch forces —
proves the **request-metered, interactive-first budget throttle** before any autonomy is granted. It
also proves the flour-mill's cheap-gates-expensive design end to end: a resonance reaches paid Codex
*only because* free L0 generated it and free local L1 judged it worth climbing. Build the throttle and
the wall under a human's eye; L2b then does nothing but flip the trigger to the idle watcher.
