# Stamp: `#btn-geodesic-deviation`

**UI title:** Geodesic Deviation  
**Handler:** `index.html:12031` → `measureGeodesicDeviation` `11820–11936` + `findShortestPath` + `levenshteinLike` `11939–11949`  
**Graph:** `multiway-string`. Extractable.  
**Evidence:** BOUNDED COMPUTATION / EXPLORATORY  
**Seal:** commit `c60aed3eb08d` / `worker.js` `961def89` / `index.html` `36070e4f`

## Formula (extracted, not invented)

From the observer, undirected shortest paths to nodes at steps `s ∈ [max(obsStep+2, maxStep−1), maxStep]`. Keep paths of length ≥ 3. Group by first hop. At each depth, pairwise

`sep = |Δstep| + prefix-mismatch(state_i, state_j)`

(`levenshteinLike` is length-gap plus Hamming on the shared prefix — not Levenshtein.)

`deviation = (sep_last − sep_first) / max(sep_first, 0.01)`

`converging` if `deviation < −0.1`; `diverging` if `deviation > 0.1`.

Observer: first node at step `floor((nSteps−1)/2)` (UI falls back to node 0 if none selected).

## UI noun match: **YES**

Copy: *nearby geodesic bundles converge/diverge*.

“Nearby” = share the first hop. “Geodesic” = rewrite-graph shortest path. The signed `deviation` is exactly converge/diverge of that bundle’s separation profile. UI prose that names focusing / expansion is not the number.

## Golden (`agree` on all rows)

| preset | n_bundles | avg_deviation | n_conv | n_div | cap_hit |
|---|---:|---:|---:|---:|---|
| gorard-fib | 4 | 200 | 0 | 4 | false |
| one-way | 1 | 0 | 0 | 0 | false |
| wolfram-1 | 1 | 422.22222222 | 0 | 1 | false |
| hand-ci-not-conf | 0 | 0 | 0 | 0 | false |
| hand-conf-not-ci | 0 | 0 | 0 | 0 | false |

Independent: own children-then-parents BFS (same neighbor order as `findShortestPath`) + own prefix-mismatch. Do not read `avg_deviation` as a curvature or field equation.
