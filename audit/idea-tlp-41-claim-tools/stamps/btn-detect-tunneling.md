# Stamp: `#btn-detect-tunneling` / `detectTunneling` L10381

**IDEA pointer:** `index.html` blob `36070e4f` — `function detectTunneling` L10381–10460 + `findShortestPath` L9192. Not `worker.js`.  
**Graph:** `multiway-string`. Extractable.  
**Evidence:** BOUNDED COMPUTATION / EXPLORATORY  
**Seal:** commit `c60aed3eb08d` / `worker.js` `961def89`

## Formula (from the function body)

Final occupied step. Need `n_final ≥ 3` else `[]`. Sample `min(n, 20)`; keep pairs with

`causalDist / branchialDist > 1.5`

`maxPairs = 50`. `causalDist` = undirected parent-child BFS (`findShortestPath`). `branchialDist` = BFS on sibling-share-parent edges. Not the event DAG.

UI shuffles the 20-sample with `Math.random()`. Golden replaces that shuffle with insertion-order prefix (threshold / 20 / 50 unchanged).

## UI noun match: **YES** (from handler fields, not `.tool-desc`)

L10616 prints `branchial=` `causal=` `ratio=` — the same three fields the kernel pushes. The pair test is exactly `ratio > 1.5`.

## Golden (`agree` on all rows)

| preset | n_pairs | avg_ratio | n_final | ui_gate (≥3) | cap_hit |
|---|---:|---:|---:|---|---|
| gorard-fib | 50 | 2 | 610 | true | true (n>20 and 50-pair cap) |
| one-way | 0 | 0 | 1 | false | false |
| wolfram-1 | 50 | 2 | 18 | true | true (50-pair cap) |
| hand-ci-not-conf | 0 | 0 | 2 | false | false |
| hand-conf-not-ci | 0 | 0 | 1 | false | false |

Independent: own BFS on snapshot adjacency + `branchialEdges`. Do not read `avg_ratio` as a tunneling amplitude.
