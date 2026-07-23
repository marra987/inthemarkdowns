---
title: "encoding-probe-2026-07-15.md"
source: "docs/experiments/encoding-probe-2026-07-15.md"
synced: "2026-07-23"
---

# Four-Encoding Memory-Index Experiment — COMPLETE (2026-07-15)

Part of the context-engineering focus (memory: `project_context_engineering_focus`).
Both legs done. **RESULT: clean sweep — all four encodings scored 11/11 routing and
3/3 comprehension on cold Sonnet probes (4 × ~18k subagent tokens, ~71k total).**

## Probe results (2026-07-15, `probe` agent, Sonnet, isolated per encoding)

| Encoding | Routing | Comprehension | Notes |
|---|---|---|---|
| A prose hooks | 11/11 | 3/3 | baseline |
| B telegraphic | 11/11 | 3/3 | exact payloads (C2 threshold verbatim) |
| C keyword fields | 11/11 | 3/3 | exact payloads |
| D header-row TSV | 11/11 | 3/3 | slug reconstruction from t-prefix legend flawless |

## Verdict (per pre-registered gate rule)

All survived at ceiling → encoding choice is free → **take B (telegraphic)**: C/D add
only 3–4pp size saving (<5% threshold) and B keeps plain-markdown toolchain compatibility.
Encoding is settled at ~25% savings. **The clustering probe is now the real gate** —
layer-0 cluster lines routing to the right cluster across all ~110 memories.

Caveats on the clean sweep: (1) ceiling effect — 10 distinctive entries is an easy
discrimination task; the 110-line index has near-neighbor memories and the clustering
probe must include confusable pairs; (2) same-author bias — scenarios and encodings
written by the same session; term overlap may exceed real usage. Neither weakens the
comprehension result (payload semantics survived maximal compression exactly).

## How to run the probe

Spawn 4 isolated `probe` agents (Sonnet, no tools), one per encoding file. Each prompt =
the preamble for that encoding (below) + its INDEX content from
`docs/experiments/enc_{A,B,C,D}.txt` + the shared TASK block. Do NOT show any agent more
than one encoding. Score against the key at the bottom; report per-encoding routing
accuracy (n/11) and comprehension (n/3). Then decide per the gate rule.

## Completed leg — size results

| Encoding | Chars | vs A | Est. tokens (inspection, NOT measured) |
|---|---|---|---|
| A prose hooks (current) | 1452 | — | ~430 |
| B telegraphic | 1083 | −25% | ~340 |
| C keyword fields | 1051 | −28% | ~335 |
| D header-row TSV | 1030 | −29% | ~330 |

Findings so far:
1. Compression plateaus after B — current hooks are already telegraphic; C/D add 1–4%.
2. Slugs are ~22% of every encoding and irreducible while file-per-memory naming stays.
3. Encoding is the minor axis (~25%); layer-0 clustering (load ~15 of 110 lines) is the
   major axis (~80%). Probe validates keyword survival for BOTH.
4. Real token counts still pending an API key (`count_tokens` is billing-free but needs auth).

## Gate rule

- Any encoding scoring <10/11 routing or <3/3 comprehension is REJECTED.
- Among survivors pick the cheapest; if B survives and C/D add <5% size saving, take B
  (plain-markdown compatibility beats exotic separators at equal recall).
- If ALL survive at 11/11: encoding choice is free → decide on toolchain fit (B),
  and proceed to the clustering probe as the real gate.

## Encoding preambles

- A/B: "Below is a memory INDEX — one line per memory file. Real assistant sessions see
  only this index and must recognize when a task requires opening a memory body."
- C: same + "format: slug :: trigger-keywords :: payload"
- D: same + "TSV table; full slug = t-prefix expanded per legend + name"

## Shared TASK block (verbatim, both tasks + format lines)

TASK 1 — routing. For each scenario, output the slug of the SINGLE index entry you would
open before acting, or NONE if no entry applies. Format: "S# -> slug" one per line.
S1: A Node.js script on this Windows machine fails HTTPS calls with "self-signed certificate in certificate chain".
S2: I need last month's decisions about the dashboard — planning to open the hub's DECISIONS.md and read it top to bottom.
S3: Marek wants to run three Claude Code sessions on the same repo folder at once to parallelize a build.
S4: Writing a report line about a suspicious-but-unverified finding; deciding how to phrase the confidence level.
S5: Considering buying a $600 GPU to speed up local builds.
S6: Need the port for the brain graph preview server.
S7: Yesterday's completed agenda item still appears in this morning's generated agenda — investigating whether that's a bug.
S8: About to create a spawn_task chip that should run in the career-engine repo, launched from the personal-assistant session.
S9: Deciding whether ARIA should publish a blog post every Sunday on a schedule.
S10: Marek asks whether the distill layer is merged yet and what remains to be done.
S11: Write a haiku about databases.

TASK 2 — comprehension from the index alone. Answer each in one short line; if the index
doesn't contain it, write NOT-IN-INDEX.
C1: What fix (env var) resolves the Node HTTPS failure?
C2: What is the rule for capital purchases?
C3: Which combination of concurrent sessions is safe on one repo folder?

Output only the S1–S11 lines and C1–C3 lines.

## Scoring key

Routing: S1 env_windows_node_tls_interception · S2 feedback_never_read_decisions_raw ·
S3 env_claude_codex_shared_head_no_concurrency · S4 feedback_risk_signal_mode ·
S5 feedback_bootstrap_roi_gate · S6 reference_port_registry ·
S7 project_morning_carryforward_ledger · S8 feedback_spawn_task_cwd ·
S9 project_blog_reach_out · S10 project_distill_layer_direction · S11 NONE

Comprehension: C1 NODE_EXTRA_CA_CERTS · C2 capex only when 1h cost ≤15–30% of 1h earned ·
C3 1 Claude + N Codex-ad2 (worktree) sessions. Caveat: C1 partially answerable from world
knowledge — weight C2/C3 higher.

---

# Clustering Probe — COMPLETE (2026-07-19)

The real gate. Encoding was the ~25% axis; clustering is the ~80% axis (memory:
`project_context_engineering_focus`). Question: can a cold model route a natural-language
query to the right cluster from **layer-0 cluster tags alone**, across all 116 memories,
including confusable near-neighbours? If it misfires, recall breaks at the first hop and
the layered index (memory: `project_memory_graph_layered_index`) needs L2 semantic edges
before any build.

Substrate: the 26 mechanical Louvain clusters shipped 2026-07-19 (commit 52ca2ab,
`brain/memory-layer1-clusters.md`). Two legs, same 11 routing scenarios (4 confusable,
starred) + 3 within-cluster comprehension items. `probe` agent, Sonnet, tags-only for
routing (member slugs withheld so it routes on keywords, not slug-matching). Confusable
comprehension clusters shown under neutral Set-A/B/C labels so their members don't leak
the routing answers. Ground truth: scratch record, reproduced here.

## Results

| # | Query | Truth | Leg 1: zero-AI tags | Leg 2: cheap-LLM labels |
|---|---|---|---|---|
| 1 | scale-by-layering not trimming | layer1_03 | 03 ✓ | 03 ✓ |
| 2★ | semantic edge layer connecting memories | layer1_01 | 25 ✗ | 03 ✗ |
| 3★ | memory defrag part 2 | layer1_03 | 14 ✗ | 03 ✓ |
| 4 | first T8 divergence a real catch | layer1_24 | 24 ✓ | 24 ✓ |
| 5★ | judgement→Opus, mechanical→Sonnet | layer1_24 | 23 ✗ | 24 ✓ |
| 6 | Avast flagged dream-watcher probe | layer1_09 | 09 ✓ | 09 ✓ |
| 7 | blog as reach-out | layer1_05 | 05 ✓ | 05 ✓ |
| 8 | Codex overflow cost = Claude wrapper | layer1_06 | 06 ✓ | 06 ✓ |
| 9 | never read DECISIONS.md raw | layer1_04 | 04 ✓ | 04 ✓ |
| 10 | morning = carry-forward ledger | layer1_17 | 17 ✓ | 17 ✓ |
| 11★ | no subagents for known small files | layer1_08 | 16 ✗ | 08 ✓ |
| | **Routing** | | **7/11** | **10/11** |
| | **Comprehension** | | (not run) | **3/3** |

Leg 1 comprehension not run separately; leg 2 comprehension (layer-0→layer-1 descent,
picking the exact memory once inside a cluster) scored 3/3, including discriminating the
two near-identical T8 memories.

## Verdict

- **Zero-AI top-distinctive-term tags: RED.** 7/11, all four confusables missed. The tags
  describe the cluster centroid, not individual members — invisible at layer-0 in
  heterogeneous clusters. Settles design refinement #1 **against** zero-AI tags.
- **One cheap-LLM label pass: GREEN.** 10/11 routing, 3/3 comprehension. Fixed 3 of 4
  confusables. ~26k subagent tokens to label all 26 clusters, generated **blind to the
  probe queries**. **The layered index is viable — build it with an LLM label step.**
- **The 1/11 residual (#2) is a clustering-membership problem, not a routing failure.**
  `project_memory_connectome_direction` is Louvain-assigned to the 19-node `layer1_01`
  hub, but semantically belongs with the memory-architecture group in `layer1_03` — where
  the probe correctly routed it. The one memory whose routing still fails is the one whose
  content *is* "L2 semantic edges are what remains." So L2 edges drop from **blocking gate**
  to **targeted refinement**: they fix mis-homed nodes at the margin, not a prerequisite.

## Re-tier / blur threshold (recorded)

Both failure modes live in the same place: the 19-node `layer1_01` cluster. Leg 1 —
label-blur (centroid tags can't surface a specific member). Leg 2 — mis-homing (a
semantically-03 memory lands in 01 by modularity). The mechanical blur flag was `layer1_04`
at 8 nodes, but the probe shows the operative threshold is larger heterogeneous clusters:
**split trigger at cluster size ≳15.** Cluster 01 is the first split target.

Total spend both legs + labeler ≈ 67k subagent tokens.
