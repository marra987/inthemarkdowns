---
title: "dreaming-spec.md"
source: "docs/dreaming-spec.md"
synced: "2026-07-23"
---

# Generative dreaming, L0: idle-triggered unseeded juxtaposition (implementation spec)

**Status:** spec (Opus-written 2026-07-01, for a Sonnet implementation session)
**Name:** the dream floor — a zero-AI, zero-budget brain process that, while the laptop sits
idle, runs spreading activation *unseeded* over the authored memory graph and writes the
unlikely juxtapositions it finds to a morning dream-log.
**Scope:** **L0 only.** The idle trigger, the unseeded-activation mode, the dream-log artifact.
**Out of scope (do not build here):** L1 local-model triage, L2 Codex reach-out, L3 Janus
placement, the dream-seed queue, and abort-on-resume interruptibility. Each is a later slice;
this one must stand alone and be safe with none of them present.
**Origin:** the dreaming direction (memory `project_aria_dreaming_generative`), extended by Marek
2026-07-01 — daytime idle is enough to start, because the budget tiering (not the hardware) was
ever the gate. L0 spends nothing and acts on nothing, so it ships first to prove the loop:
trigger fires on idle → produces a morning artifact → costs ~zero.

---

## 0. The principles that must not be violated

1. **Never act, only surface.** L0 reads the graph and writes one file (the dream-log). It posts
   nothing, sends nothing, touches no governing file, no memory, no external service. This is the
   hard boundary from the direction memory, and at L0 it's trivially satisfied — keep it that way.
2. **Propose-only, dream-tagged.** The dream-log is a candidate surface, never the authored graph.
   Nothing it contains is a fact until a human (later, a cold Janus pass) promotes it. The file's
   own framing must carry that humility — these are *raw resonances*, not findings.
3. **Unseeded means unsteered.** L0 picks its starting nodes mechanically (random / low-degree),
   never from a query, a task, or anything the current session finds relevant. Steering the walk
   collapses it back to ordinary seeded retrieval (interpolation) and defeats the whole point.
4. **Die safe and cheap.** A poll that finds the machine busy does nothing. An idle stretch that
   finds no juxtaposition leaves no file and costs nothing. Any error logs and exits 0 — a dream
   process must never be able to wedge the machine or crash a startup chain.

---

## 1. The trigger — `scripts/brain/dream-watcher.js`

A long-lived Node daemon, same family as [`brain-watcher.js`](../scripts/brain/brain-watcher.js)
(daemon + Windows-startup VBS shim, see `memory-watcher.vbs`). Unlike brain-watcher this is a
**poll loop**, not `fs.watch` — idleness is a polled state, not a file event.

### 1.1 Loop
- Every `POLL_MS` (default 60_000), read the machine's idle time (§1.2).
- Fire one L0 episode (§2) when **all** hold:
  - idle seconds ≥ `IDLE_THRESHOLD_S` (default 900 = 15 min)
  - not within `COOLDOWN_MS` (default 30 min) of the last episode
  - today's episode count < `DAILY_CAP` (default 8)
- After firing, record the episode timestamp for the cooldown and daily-cap checks.

Tunables are top-of-file constants with a comment that they graduate to a `dreaming.md` config
when L1+ introduces real policy. **Do not build a config system for four numbers** (simplicity
first; brain-watcher hardcodes its debounce the same way).

### 1.2 Idle detection — the dangerous assumption, test it first
The whole trigger rests on reading idle time from Node on Windows. Use the Win32
`GetLastInputInfo` via a PowerShell probe invoked with `execFileSync` (dependency-free; no native
addon). Split the I/O from the parse so the parse is unit-testable:
- `idleSeconds()` — runs the PowerShell one-liner, returns a number (the impure boundary).
- `parseIdleSeconds(psOutput)` — pure, tested.

**Before building anything else, confirm the probe works in this environment** (the
`GetLastInputInfo` round-trip from a Node-spawned PowerShell). If it doesn't, the trigger needs a
different mechanism and the rest of the spec waits. This is step-1 of the build, not an
afterthought — it is THE most dangerous assumption.

AC-power gating is **deferred to L2.** L0 is a sub-second CPU blip on each fire; it won't drain a
battery meaningfully. The AC gate becomes mandatory only when L2 starts spending wall-clock and
tokens. Note this in the code, don't build it now.

### 1.3 Interruptibility — not needed at L0
An L0 episode is a single synchronous `retrieval.js` call plus a file append — sub-second, atomic.
There is nothing to abort if Marek returns mid-episode. The abort-on-resume machinery from the
direction memory is an L2 requirement (long Codex calls) — **explicitly out of scope here.**

---

## 2. The dreamer — unseeded mode in `retrieval.js`

Reuse [`spreadingActivation`](../scripts/brain/retrieval.js) exactly as-is. Add one pure exported
function; do not touch the existing neighbor-artifact path.

### 2.1 What a juxtaposition is
The interesting L0 output is a **second-order resonance**: a pair of memories that co-activate but
share *no direct edge* — the graph connects them only through intermediaries, so it's a link
nobody has drawn directly. Mechanically, per episode:
1. Pick a starting node mechanically — random, biased toward **low-degree** nodes (the
   "weakly-activated" ones the direction memory names; low-degree = fewest authored links = most
   room for an undrawn connection). Degree comes from the adjacency already built in `retrieval.js`.
2. Run `spreadingActivation` from it.
3. Among the top-ranked nodes, keep those that are **not** direct neighbors of the start. The
   highest such node is the juxtaposition partner; the intermediary chain is the *latent path*.
4. Emit `{ from, to, score, path }`.

```
export function dreamJuxtapositions(graph, { count = 3, rng = Math.random } = {})
```
Pure and deterministic under an injected `rng` (so it's testable and so a future seeded variant
just swaps the picker). Returns up to `count` juxtapositions. `rng` is injectable specifically so
the test can pin the picks; production passes the default.

### 2.2 Latent path
The direction memory's transparent-Ego constraint starts here, cheaply: every juxtaposition ships
its connecting path (the intermediary node ids between `from` and `to`), not just the pair. Even
with no LLM in the loop yet, the artifact records *why* two nodes resonated, not only *that* they
did. A simple BFS over the adjacency between `from` and `to` gives the shortest path; that's
enough for L0.

---

## 3. The artifact — the morning dream-log

Write to `dreams/YYYY-MM-DD.md` (new top-level dir, parallel to `agendas/`; append episodes
within a day, write-once per day like the agendas). Use `atomicWrite` from
[`atomic.js`](../scripts/brain/atomic.js), consistent with the other brain writers.

Per episode, append a block — manifest framing kept deliberately humble (raw resonances, your
call), latent path always shown:

```markdown
## 14:32 — idle dream

Started cold from `project_career_engine` (low-degree pick).
Resonances nobody has drawn directly:

- **project_career_engine ↔ project_living_brain** (0.041)
  path: career_engine → graph_mediated_intuition → living_brain
- **project_career_engine ↔ reference_sleep_time_compute** (0.029)
  path: career_engine → aria_dreaming_generative → sleep_time_compute

Raw — L0 surfaces, doesn't judge. (L1 triage not yet wired.)
```

The header line and the closing note are load-bearing: they mark the file as propose-only and
make clear no model has vetted these. Resolve ids to titles only if cheap (`titleFromId` exists in
`memory-graph.js`); otherwise raw ids are fine for L0.

---

## 4. TDD — write these first

`scripts/brain/dream.test.js` (mirror `size-watch.test.js`'s style):

1. **`parseIdleSeconds`** — given representative PowerShell output, returns the right number;
   malformed input returns a safe sentinel that the loop treats as "busy" (fail closed → never
   dream on a bad read).
2. **`dreamJuxtapositions` excludes direct neighbors** — fixture graph where node A links directly
   to B and only transitively to C; with `rng` pinned to start at A, the result contains the A–C
   pair and never the A–B pair.
3. **`dreamJuxtapositions` is deterministic under injected `rng`** — same `rng` → same picks.
4. **latent path is the actual connecting chain** — the emitted `path` for A–C passes through the
   real intermediary, not a fabricated one.
5. **dream-log formatting** — given a fixed juxtaposition list, the rendered block matches the
   expected markdown (header, bullets with scores, latent path, closing note).

The idle round-trip (§1.2) gets a **manual integration check**, not a unit test: run the probe,
leave the machine untouched, confirm idle seconds climb. Document the one-liner in the PR.

---

## 5. Done = verified

1. `parseIdleSeconds` confirmed against real probe output (the dangerous assumption, retired).
2. Unit tests above pass.
3. Daemon run live: set `IDLE_THRESHOLD_S` low (e.g. 20s) for the demo, leave the machine, confirm
   a `dreams/<today>.md` block appears with real juxtapositions and real latent paths; touch the
   keyboard, confirm cooldown/daily-cap prevent a fire-storm.
4. Register the VBS startup shim (mirror `memory-watcher.vbs`); confirm it survives a logout/login.
5. Reset `IDLE_THRESHOLD_S` to the real default before commit.

Commit shape: `feat(dream): add L0 idle-triggered unseeded juxtaposition floor`. One feature, one
branch (`feat/dream-l0`). L1 triage is the next slice and gets its own spec.

---

## 6. Why this slice, and what it proves

L0 is the part with no budget, no model, and no authority question — so it's the part that can
ship today and prove the surrounding loop is sound: the idle sensor fires, the morning artifact
lands, nothing costs anything, nothing acts. Everything genuinely hard (a model judging which
resonance is real, reaching outside the graph for an orphan, a cold gate before placement) sits on
top of a trigger + artifact spine this slice establishes. Build the spine first; it's also the
slice most likely to surface that `GetLastInputInfo`-from-Node assumption being wrong, which is
exactly the thing you want to learn before specifying the expensive layers.
