# IDEA-TLP-41-CLAIM-TOOLS

**Verdict:** five unused claim-tool buttons are extractable kernels on the **string** `MultiwaySystem` graph (`GRAPH=multiway-string`). IDEA pointers are in `index.html` blob `36070e4f`, not `worker.js`. None were UNEXTRACTABLE. Independent recomputation agrees on all 25 golden rows (five PR #2 presets).

**Evidence:** BOUNDED COMPUTATION / EXPLORATORY.

UI-noun match is stamped from **function comments + handler result innerHTML**, not `.tool-desc`. `#toggle-zeno` is a mismatch **before** the suite runs (L10184 claims prune / state-containment; the body does neither).

## Cite (do not redo)

[TLP PR #2](https://github.com/walkthroughwonder/topological-light-propagation/pull/2) OPEN — `audit/idea-tlp-29-piskunov/`. Presets and the sealed `MultiwaySystem` loader reused/adapted. This PR does not re-audit `checkCausalInvariance`. Ricci (`computeRicciCurvature`, Expt 9) and branching asymmetry (`measureBranchingAsymmetry`, idea 45) were not extracted.

## Seal + IDEA pointers

| Item | Value |
|---|---|
| Audited commit | `c60aed3eb08d` / `c60aed3eb08ded734dde98d4365a39450acc4904` |
| `worker.js` | `961def89` (graph only) |
| `index.html` | `36070e4f18a7e9c92e5e2f4b8bff6a5320577689` |
| `zenoObserve` | L10182 |
| `detectTunneling` | L10381 |
| `measureHolographicBound` | L10932 |
| `measureGeodesicDeviation` | L11820 |
| `detectTopologicalObstructions` | L12074 |

`worker.js` and the UI were not edited. Run: `node audit/idea-tlp-41-claim-tools/run-golden.js`.

## UI noun match (from the code)

| tool | code noun (comment / result / return) | match | kernel |
|---|---|---|---|
| `#toggle-zeno` | L10184 *“Prune … contain the observed state”*; result *“Zeno effect”* | **NO** | `1 − \|step[t] ∩ traceDescendants(obs)\| / \|step[t]\|`. State unused. No prune. |
| `#btn-detect-tunneling` | result `branchial=` `causal=` `ratio=` | **YES** | `causalDist/branchialDist > 1.5`; sample `min(n,20)`; max 50; need ≥3 finals. |
| `#btn-measure-holographic` | return `isHolographic`; handler *AREA LAW (Holographic)* | **NO** | `S(r)` = distinct strings in undirected BFS ball; boolean is `R²_boundary > R²_volume`. Need observer, ≥2 radii. |
| `#btn-geodesic-deviation` | return `converging` / `deviation` (`< −0.1`) | **YES** | First-hop bundles; `sep` = mean `\|Δstep\|` + len-diff + prefix Hamming. Need ≥2 paths of length ≥3. |
| `#btn-detect-tangles` | return `exact` / `substring`; handler counts those | **YES** | Exact: same state at ≥2 steps. Substring: first 200 nodes, 2-char `extractCore`. Top 20. Need ≥5 nodes. |

Rows: `results.jsonl` (`tool, formula_one_liner, graph, cap_hit, ui_gate, ui_noun_match, value, independent_value, agree`). Stamps: `stamps/`.

## Out of scope

No solvers, no SAT, no Ricci / dimension dump (Expt 9), no idea-45 asymmetry, Expt 10 not started, zarankiewicz/712 not touched. Not a click. Not WP5. No merge. Do not name any output as a physical observation effect, an area-law test, or a field equation.
