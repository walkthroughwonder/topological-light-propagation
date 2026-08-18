# Stamp: `#btn-measure-holographic`

**UI title:** Discrete Holographic Bound  
**Handler:** `index.html:11105` → `measureHolographicBound` `10932–11034`  
**Graph:** `multiway-string`. Extractable.  
**Evidence:** BOUNDED COMPUTATION / EXPLORATORY  
**Seal:** commit `c60aed3eb08d` / `worker.js` `961def89` / `index.html` `36070e4f`

## Formula (extracted, not invented)

Undirected BFS from the observer on parent-child edges. For radius `r = 1…maxDist`:

- `volume` = `|{v : dist(v) ≤ r}|`
- `boundary` = `|{v : dist(v) = r}|`
- `entropy` = `|{state(v) : dist(v) ≤ r}|`  (distinct strings)

Then log-log OLS (`log(max(x,1))`) of entropy vs boundary and vs volume. The UI boolean is `boundary.r2 > volume.r2`. This audit reports that boolean as `boundary_r2_gt_volume_r2` only.

Observer: first node at step `floor((nSteps−1)/2)`.

## UI noun match: **NO**

Copy: *branch count vs area vs volume of causal regions*.

- “Branch count” is distinct state strings, not branchial components. When states do not collide, `volume_slope=1` and `volume_r2=1` — the series is just ball size.
- “Area” is the BFS sphere, not a spatial cut.
- The region is an **undirected** rewrite-graph ball, not a causal cone (`traceCausalHistory` unused; `causalEvents` unused).

## Golden (`agree` on all rows)

| preset | n_radii | bound. r² | vol. r² | bound.r²>vol.r² | cap_hit |
|---|---:|---:|---:|---|---|
| gorard-fib | 13 | 0.00404265 | 1 | false | false |
| one-way | 11 | 0.0093894 | 1 | false | false |
| wolfram-1 | 7 | 0.89805468 | 1 | false | false |
| hand-ci-not-conf | 1 | 0 | 0 | false | false |
| hand-conf-not-ci | 4 | 0.81145231 | 0.9306684 | false | false |

Independent: own BFS + own log-log OLS on the snapshot. Do not read the R² bake-off as an area-law test.
