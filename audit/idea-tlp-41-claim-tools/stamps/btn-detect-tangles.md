# Stamp: `#btn-detect-tangles` / `detectTopologicalObstructions` L12074

**IDEA pointer:** `index.html` blob `36070e4f` — `function detectTopologicalObstructions` L12074–12189 + `extractCore` L12191. Not `worker.js`.  
**Graph:** `multiway-string`. Extractable.  
**Evidence:** BOUNDED COMPUTATION / EXPLORATORY  
**Seal:** commit `c60aed3eb08d` / `worker.js` `961def89`

## Formula (from the function body)

Need `nodes.length ≥ 5` else `null`.

1. **Exact:** same state string at ≥ 2 distinct steps. `connected` iff a latest occurrence is a descendant of an earliest one.
2. **Substring:** first 200 nodes; `extractCore` = most frequent 2-char block (else first two chars); 3-hop children; keep if ≥ 2 `includes(core)` hits.
3. Dedup; top 20 by `strength`.

No SCC / cycle finder.

## UI noun match: **YES** (from return `type` + handler counts, not `.tool-desc`)

L12232 prints *“Exact self-regeneration”* and *“Substring persistence”* — the two `type` values the kernel pushes. L12231 prints `N tangles`. Not a cycle count.

## Golden (`agree` on all rows)

| preset | n | n_exact | n_substr | n_connected | top_strength | ui_gate (≥5 nodes) | cap_hit |
|---|---:|---:|---:|---:|---:|---|---|
| gorard-fib | 20 | 0 | 20 | 20 | 512 | true | true (scan cap 200) |
| one-way | 20 | 0 | 20 | 20 | 18 | true | false |
| wolfram-1 | 20 | 0 | 20 | 20 | 70 | true | false |
| hand-ci-not-conf | 0 | 0 | 0 | 0 | 0 | false | false |
| hand-conf-not-ci | 1 | 1 | 0 | 0 | 1 | true | false |

Independent: own state-index + own 2-gram tally + own 3-hop walk. Do not read `n` as a particle count.
