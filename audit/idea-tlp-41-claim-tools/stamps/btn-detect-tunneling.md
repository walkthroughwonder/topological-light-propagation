# Stamp: `#btn-detect-tunneling`

**UI title:** Tunneling Detector  
**Handler:** `index.html:10601` → `detectTunneling` `10381–10460` + `findShortestPath` `9192–9221`  
**Graph:** `multiway-string`. Extractable.  
**Evidence:** BOUNDED COMPUTATION / EXPLORATORY  
**Seal:** commit `c60aed3eb08d` / `worker.js` `961def89` / `index.html` `36070e4f`

## Formula (extracted, not invented)

On the **final** occupied step, for pairs `(u,v)` among the first `min(n,20)` ids:

`ratio = dist_undirected_parent-child(u,v) / dist_branchial(u,v)`

Keep the pair if `ratio > 1.5`. Stop at 50 pairs. Sort by ratio descending.

`branchial` = BFS on sibling-share-parent edges (`_buildBranchialGraph`).  
`findShortestPath` = undirected BFS on rewrite edges. **Not** the causal-event DAG.

UI shuffles the 20-sample with `Math.random()`. Golden replaces that shuffle with insertion-order prefix (threshold / 20 / 50 unchanged). Documented in `SEAL.json`.

## UI noun match: **YES** (with a graph caveat)

Copy: *branchial distance ≪ causal geodesic*.

The number is exactly that comparison at threshold 1.5×. The path the UI labels “causal geodesic” is the undirected multiway shortest path, not an event-DAG geodesic. The inequality noun matches; the word “causal” does not name `causalEvents`.

## Golden (`agree` on all rows)

| preset | n_pairs | avg_ratio | n_final | cap_hit |
|---|---:|---:|---:|---|
| gorard-fib | 50 | 2 | 610 | true (n>20 and 50-pair cap) |
| one-way | 0 | 0 | 1 | false (`n_final<3` → empty) |
| wolfram-1 | 50 | 2 | 18 | true (50-pair cap) |
| hand-ci-not-conf | 0 | 0 | 2 | false |
| hand-conf-not-ci | 0 | 0 | 1 | false |

Independent: own BFS on snapshot adjacency + snapshot `branchialEdges`. Do not read `avg_ratio` as a tunneling amplitude.
