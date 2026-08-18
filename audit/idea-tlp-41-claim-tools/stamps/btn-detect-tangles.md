# Stamp: `#btn-detect-tangles`

**UI title:** Topological Obstruction Detector  
**Handler:** `index.html:12209` → `detectTopologicalObstructions` `12074–12189` + `extractCore` `12191–12207`  
**Graph:** `multiway-string`. Extractable.  
**Evidence:** BOUNDED COMPUTATION / EXPLORATORY  
**Seal:** commit `c60aed3eb08d` / `worker.js` `961def89` / `index.html` `36070e4f`

## Formula (extracted, not invented)

1. **Exact:** a state string appears at ≥ 2 distinct steps. `connected` iff some latest-step occurrence is a descendant of some earliest-step occurrence. `strength = connected ? span·occurrences : occurrences·0.5`.
2. **Substring:** for each of the first 200 nodes, `extractCore` = most frequent 2-gram (else the first two chars). Walk children 3 hops. Count kids whose state `includes(core)`. If that count ≥ 2, emit a hit with `strength = regenerations·2`.
3. Dedup by key; keep top 20 by strength.

No SCC / cycle finder. `nodes.length < 5` → empty.

## UI noun match: **YES** (self-regeneration; not graph cycles)

Copy: *self-regenerating state cycles*.

The count is recurring state strings and 2-gram persistence in a 3-hop out-neighborhood. That is self-regeneration of a pattern. It is not a cycle in the rewrite DAG (`hand-conf-not-ci` has an exact `W` at two steps that is **not** causally linked: `n_connected=0`).

## Golden (`agree` on all rows)

| preset | n | n_exact | n_substr | n_connected | top_strength | cap_hit |
|---|---:|---:|---:|---:|---:|---|
| gorard-fib | 20 | 0 | 20 | 20 | 512 | true (scan cap 200) |
| one-way | 20 | 0 | 20 | 20 | 18 | false |
| wolfram-1 | 20 | 0 | 20 | 20 | 70 | false |
| hand-ci-not-conf | 0 | 0 | 0 | 0 | 0 | false (`nodes<5`) |
| hand-conf-not-ci | 1 | 1 | 0 | 0 | 1 | false |

Independent: own state-index + own 2-gram tally + own 3-hop walk. Do not read `n` as a particle count.
