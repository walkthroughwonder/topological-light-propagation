# Stamp: `#toggle-zeno` / `zenoObserve` L10182

**IDEA pointer:** `index.html` blob `36070e4f` — `function zenoObserve` L10182–10245. Not `worker.js`.  
**Graph:** `multiway-string`. Extractable.  
**Evidence:** BOUNDED COMPUTATION / EXPLORATORY  
**Seal:** commit `c60aed3eb08d` / `worker.js` `961def89`

## Formula (from the function body)

Survival = current-step node ids that sit in `traceDescendants(observer)`.

`frozenRatio = 1 − surviving/total`

Does **not** prune (`nodes`/`edges` untouched). `zenoObserverState = observerNode.state` is stored and unused. Observer is then retargeted to the max-weight surviving descendant. Numeric row uses the pre-retarget observer (first node at step `floor((nSteps−1)/2)`).

## UI noun match: **NO** (a priori, before the suite)

Sourced from the **function comment + result innerHTML**, not `.tool-desc`.

- L10184 comment: *“Prune branches at the latest step that don't contain the observed state.”*
- L10332–10338 result: *“branches survive” / “Frozen ratio” / “Zeno effect — observation … suppresses branching.”*

The body never tests state containment and never deletes a node. The noun is a mismatch as soon as `zenoObserve` is read.

## Golden (`agree` on all rows)

| preset | frozenRatio | surviving/total | ui_gate | cap_hit |
|---|---:|---|---|---|
| gorard-fib | 0.20491803 | 485/610 | true | false |
| one-way | 0 | 1/1 | true | false |
| wolfram-1 | 0 | 18/18 | true | false |
| hand-ci-not-conf | 0 | 2/2 | true | false |
| hand-conf-not-ci | 1 | 0/1 | true | false |

`hand-conf-not-ci` drops the final `W` because it is not a descendant of observer `Y`, not because the state failed a containment test.

Independent: own forward BFS. Do not read `frozenRatio` as a physical observation effect.
