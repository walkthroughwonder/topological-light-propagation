# IDEA-TLP-41-CLAIM-TOOLS

**Verdict:** five unused claim-tool buttons are extractable numeric kernels on the **string** `MultiwaySystem` graph (`GRAPH=multiway-string`). None required `HypergraphRewriter`. None were UNEXTRACTABLE. Independent recomputation agrees on all 25 golden rows.

**Evidence:** BOUNDED COMPUTATION / EXPLORATORY.

## Cite (do not redo)

[TLP PR #2](https://github.com/walkthroughwonder/topological-light-propagation/pull/2) OPEN — `audit/idea-tlp-29-piskunov/`. Presets `gorard-fib`, `one-way`, `wolfram-1`, `hand-ci-not-conf`, `hand-conf-not-ci` and the sealed `MultiwaySystem` loader are reused/adapted. This PR does not re-audit `checkCausalInvariance`.

## Seal

| Item | Value |
|---|---|
| Audited commit | `c60aed3eb08ded734dde98d4365a39450acc4904` (`c60aed3eb08d`) |
| `worker.js` | `961def89f04c3688272e540414d172c70d196fa0` (`961def89`) |
| `index.html` | `36070e4f18a7e9c92e5e2f4b8bff6a5320577689` (handlers live here) |
| Caps | `maxStateLength=256`, `maxTotalStates=5000` |
| Observer | first node at step `floor((nSteps−1)/2)` |

`worker.js` and the UI were not edited. Run: `node audit/idea-tlp-41-claim-tools/run-golden.js`.

## UI noun match

| tool | UI copy | noun match | what the number is |
|---|---|---|---|
| `#toggle-zeno` | only branches containing the observed state survive | **NO** | `1 −` fraction of final-step nodes in the observer’s **forward cone**. State string is unused. Graph is not pruned. |
| `#btn-detect-tunneling` | branchial distance ≪ causal geodesic | **YES** | `dist_rewrite / dist_branchial > 1.5` on a 20-id prefix, cap 50. Path is undirected parent-child BFS, not the event DAG. UI `Math.random` shuffle determinized to insertion order. |
| `#btn-measure-holographic` | branch count vs area vs volume of causal regions | **NO** | Distinct strings vs BFS sphere vs BFS ball; log-log R² comparison. Region is undirected, not a causal cone. |
| `#btn-geodesic-deviation` | nearby geodesic bundles converge/diverge | **YES** | First-hop bundles of rewrite-graph shortest paths; `deviation=(sep_last−sep_first)/max(sep_first,0.01)` with prefix-mismatch `sep`. |
| `#btn-detect-tangles` | self-regenerating state cycles | **YES** | Exact state recurrence across steps, plus 2-gram persistence in a 3-hop out-neighborhood (top 20). Not a cycle finder. |

One-page stamps: `stamps/`. Rows: `results.jsonl` (`tool, formula_one_liner, graph, cap_hit, ui_noun_match, value, independent_value, agree`).

## Out of scope

No solvers, no SAT, no Ricci / dimension dump (Expt 9), Expt 10 not started, zarankiewicz/712 not touched. Not a click. Not WP5. No merge. Do not name any output as a physical observation effect, an area-law test, or a field equation.
