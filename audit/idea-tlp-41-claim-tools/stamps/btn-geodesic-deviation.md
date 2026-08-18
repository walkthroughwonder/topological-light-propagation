# Stamp: `#btn-geodesic-deviation` / `measureGeodesicDeviation` L11820

**IDEA pointer:** `index.html` blob `36070e4f` — `function measureGeodesicDeviation` L11820–11936 + `levenshteinLike` L11939. Not `worker.js`.  
**Graph:** `multiway-string`. Extractable.  
**Evidence:** BOUNDED COMPUTATION / EXPLORATORY  
**Seal:** commit `c60aed3eb08d` / `worker.js` `961def89`

## Formula (from the function body)

Need ≥2 undirected shortest paths of length ≥3 (`geodesics.length < 2 → null`). Bundles share the first hop. Separation = mean pairwise

`|Δstep| + length-diff + Hamming on the shared prefix`

(`levenshteinLike` is that proxy, not full Levenshtein.)

`deviation = (sep_last − sep_first) / max(sep_first, 0.01)`

`converging` if `deviation < −0.1`. Handler displays if the returned array is non-empty (one bundle is enough to print).

`computeRicciCurvature` is not called. The handler’s `ricci-flat` CSS class is display-only.

## UI noun match: **YES** (from return keys, not `.tool-desc`)

The function returns `converging` / `diverging` / `deviation` with the −0.1 / +0.1 cuts. Those names are the kernel. Handler L12057–12059 also writes “(gravity)” / “(expansion)” next to the counts — gloss, not the formula.

## Golden (`agree` on all rows)

| preset | n_bundles | avg_deviation | n_conv | n_div | ui_gate | cap_hit |
|---|---:|---:|---:|---:|---|---|
| gorard-fib | 4 | 200 | 0 | 4 | true | false |
| one-way | 1 | 0 | 0 | 0 | true | false |
| wolfram-1 | 1 | 422.22222222 | 0 | 1 | true | false |
| hand-ci-not-conf | 0 | 0 | 0 | 0 | false | false |
| hand-conf-not-ci | 0 | 0 | 0 | 0 | false | false |

Independent: own children-then-parents BFS + own prefix-mismatch. Do not read `avg_deviation` as a field equation.
