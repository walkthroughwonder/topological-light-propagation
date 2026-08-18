# IDEA-TLP-29-PISKUNOV

**Verdict:** the TLP Causal Invariance Verifier (`#btn-verify-ci`) is **neither** Piskunov causal invariance nor unbounded confluence. `MultiwaySystem.checkCausalInvariance` is **bounded state-joinability** of overlapping sibling events at `maxLookahead=3`, with non-overlapping siblings counted as already joined. The returned `invariance` ratio is **not** percent causal invariance.

**Evidence:** BOUNDED COMPUTATION / EXPLORATORY.

## Seal

| Item | Value |
|---|---|
| Audited commit | `c60aed3eb08ded734dde98d4365a39450acc4904` (`c60aed3eb08d`) |
| `worker.js` blob | `961def89f04c3688272e540414d172c70d196fa0` (`961def89`) |
| Citation | matched on master; extract from `worker.js`, not `index.html` / Three.js |
| Caps | `maxStateLength=256`, `maxTotalStates=5000` |
| Lookahead | hardcoded `3` |

`worker.js` and the UI were not edited (GRK instrument-and-seal). Run: `node audit/idea-tlp-29-piskunov/run-golden.js`.

## What the sealed function does

1. Pair sibling events that share a parent. Overlapping input ranges → critical pair. Non-overlapping siblings increment `confluent` (“always commute”).
2. A critical pair counts as confluent if the children are the same node, the state strings are equal, or the descendant **node sets / state sets** meet within **3** hops of the already-built multiway graph.
3. Pairs still open at lookahead 3 increment `divergent`. They are **not hidden**.
4. Return `{confluent, divergent, criticalPairs, invariance: confluent/(confluent+divergent)}` (or `1` if empty).

No singleway event-order scan. No causal-DAG construction. No graph isomorphism.

## Piskunov 2020

Piskunov (*Confluence and Causal Invariance*, 2020-11): **confluence** = any two partial singleway evolutions can be continued to isomorphic final states; **CI** = causal graphs of singleway evolutions under every event ordering are isomorphic (stated for FixedPoint systems). Neither implies the other.

Published counterexamples are Wolfram-model hypergraphs (`{{1},{1,2}}→{{1,2},{2}}` and `{{1,2},{2,1}}→{{1}}`). TLP matches strings with `indexOf`. Those pairs cannot be loaded. Obstruction recorded; no invented Piskunov pair.

String analogues inside the caps (hand-built, not Piskunov’s graphs): `AB→X`, `BC→Y` on `ABC` is **CI ∧ ¬confluent**; `X→Y|Z` then `Y→W` vs `Z→V→W` is **confluent ∧ ¬CI**.

## Golden rows

`results.jsonl` — TLP columns from the sealed function; `state_joinable` / `causal_graph_iso` from `independent-verifier.js` (no shared code with `worker.js`).

| preset | L | confluent | divergent | invariance | state_joinable | causal_graph_iso | piskunov_cell | cap_hit |
|---|---:|---:|---:|---:|---|---|---|---|
| gorard-fib | 3 | 40213 | 0 | 1 | true | false | confluent ∧ ¬CI (bounded traces) | true |
| one-way | 3 | 63 | 0 | 1 | true | false | confluent ∧ ¬CI | false |
| wolfram-1 | 3 | 381 | 19 | 0.9525 | null | false | joinability undecided ∧ ¬CI (bounded traces) | true |
| hand-ci-not-conf | 3 | 0 | 1 | 0 | false | true | CI ∧ ¬confluent | false |
| hand-conf-not-ci | 3 | 1 | 0 | 1 | true | false | confluent ∧ ¬CI | false |

- **gorard-fib:** orthogonal single-char TRS ⇒ confluent. `criticalPairs=0`; all 40213 TLP counts are the non-overlap shortcut. Bounded 16-event singleway DAGs are not isomorphic. Growing: Piskunov CI is not defined at FixedPoint (`cap_hit` on the trace prefix).
- **one-way:** gallery preset; unique NF `o²¹XX` in 21 events. Leftmost vs rightmost causal DAGs are not isomorphic (cross-particle provenance). TLP still reports `invariance=1` because `Xo` matches never overlap.
- **wolfram-1:** 83 overlapping `BB` pairs; **19 stay divergent at lookahead 3** (not hidden). Non-terminating / length-fluctuating; confluence not decided inside the caps.
- Hand-built cells split TLP from Piskunov: TLP follows joinability (`divergent=1` vs `invariance=1`), not causal-graph iso.

## UI (not redesigned)

The button is titled “Causal Invariance Verifier” and prints “Invariance score: *p*%”. No golden test required a symbol rename. Do not read that percent as causal invariance. Do not treat `divergent=0` as CI.

## Out of scope

Expt 10 not started. Zarankiewicz not touched. Not a click. Not WP5. No solvers, no SAT, no merge.
