# Stamp: `#toggle-zeno`

**UI title:** Quantum Zeno Effect  
**Handler:** `index.html:10343` → `zenoObserve` `10182–10245`  
**Graph:** `multiway-string` (not hypergraph). Extractable.  
**Evidence:** BOUNDED COMPUTATION / EXPLORATORY  
**Seal:** commit `c60aed3eb08d` / `worker.js` `961def89` / `index.html` `36070e4f`

## Formula (extracted, not invented)

After a built multiway graph, at `t = _currentStep`:

`frozenRatio = 1 − |{v ∈ step[t] : v ∈ forward-cone(observer)}| / |step[t]|`

`forward-cone` is `traceDescendants` (includes the observer). The toggle does **not** delete nodes. It then moves the observer to the max-weight surviving descendant (numeric row uses the pre-move observer).

Audit observer: first node at step `floor((nSteps−1)/2)`.

## UI noun match: **NO**

Copy: *only branches containing the observed state survive*.

Code never tests `node.state` against the observed string. It counts **ancestry**. `zenoObserverState` is stored and displayed, not used as a filter. `hand-conf-not-ci` has `frozenRatio=1` with a final `W` that equals a state on another branch — dropped because it is not a descendant of observer node 1 (`Y`), not because the state failed a containment test.

## Golden (`agree` on all rows)

| preset | frozenRatio | surviving/total | cap_hit |
|---|---:|---|---|
| gorard-fib | 0.20491803 | 485/610 | false |
| one-way | 0 | 1/1 | false |
| wolfram-1 | 0 | 18/18 | false |
| hand-ci-not-conf | 0 | 2/2 | false |
| hand-conf-not-ci | 1 | 0/1 | false |

Independent: own forward BFS on the snapshot DAG. No `worker.js` / `index.html` import.

Do not read `frozenRatio` as a physical observation effect.
