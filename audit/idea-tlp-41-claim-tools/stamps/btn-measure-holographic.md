# Stamp: `#btn-measure-holographic` / `measureHolographicBound` L10932

**IDEA pointer:** `index.html` blob `36070e4f` — `function measureHolographicBound` L10932–11034. Not `worker.js`.  
**Graph:** `multiway-string`. Extractable.  
**Evidence:** BOUNDED COMPUTATION / EXPLORATORY  
**Seal:** commit `c60aed3eb08d` / `worker.js` `961def89`

## Formula (from the function body)

Needs an observer. Undirected BFS on parent-child edges. For radius `r`:

`S(r) = #distinct state strings with dist ≤ r`

`volume` = ball size; `boundary` = sphere size. Log-log OLS. Code boolean:

`isHolographic = R²_boundary > R²_volume`

This audit emits that boolean as `r2_boundary_gt_r2_volume`. Handler UI gate: `radiusData.length ≥ 2` (else “Not enough data”).

Ricci / `computeRicciCurvature` not pulled. `measureBranchingAsymmetry` not pulled.

## UI noun match: **NO** (from return key + handler innerHTML, not `.tool-desc`)

L11032 names the boolean `isHolographic`. L11133 prints `AREA LAW (Holographic)` vs `VOLUME LAW`. The number is an R² bake-off of distinct strings vs an undirected BFS sphere/ball — not an area-law test.

## Golden (`agree` on all rows)

| preset | n_radii | bound. r² | vol. r² | r²b>r²v | ui_gate (≥2 radii) | cap_hit |
|---|---:|---:|---:|---|---|---|
| gorard-fib | 13 | 0.00404265 | 1 | false | true | false |
| one-way | 11 | 0.0093894 | 1 | false | true | false |
| wolfram-1 | 7 | 0.89805468 | 1 | false | true | false |
| hand-ci-not-conf | 1 | 0 | 0 | false | false | false |
| hand-conf-not-ci | 4 | 0.81145231 | 0.9306684 | false | true | false |

Independent: own BFS + own log-log OLS. Do not read the R² bake-off as an area-law test.
