# IDEA-GRAV-FOUR-NUMBERS

**Verdict:** MATCH is **no** on all three listed `ST_PRESETS`. Gravity is
undefined on each rule. Honest fail. Last-slice BALL is still stamped.
`corr` was not computed (stop rule). `maxEdges=8000` was not hit
(`truncated=false`, `cap_hit=false` on every row — not hidden).

**Evidence:** BOUNDED COMPUTATION / EXPLORATORY.

NAME FREEZE: IDEA-GRAV-FOUR-NUMBERS. MathMan 3+1 stays HOLD. None of
these numbers is Ricci, \(G_{\mu\nu}\), or 3+1. `hatd` is a spatial-slice
log-volume slope, not spacetime dimension. dim27 is a 2.7 CONTROL, not
a pass target.

## Seal

| Item | Value |
|---|---|
| Audited commit | `c60aed3eb08ded734dde98d4365a39450acc4904` (`c60aed3eb08d`) |
| `index.html` blob | `36070e4f18a7e9c92e5e2f4b8bff6a5320577689` (`36070e4f`) |
| Extract | `class HypergraphRewriter` L12430–L12683 |
| Cap | `maxEdges=8000` |
| Preregister | first-add `557498a4698e30abfb59d3ac1ee84b19667f16e5` (before corr) |
| Citation | matched on master; extract from `index.html`, not `worker.js` |

`index.html` / `worker.js` / the UI were not edited.

Not used: `checkCausalInvariance`; IDEA-TLP-41 string-Hamming kernel;
`estimateDimension`; growers; solvers.

## Preregister (already in git)

Written in `PREREGISTER.md` before any correlation:

- MATCH may fail (fresh atom \(w\); role-symmetric leaves). No ⇒ stop.
- If MATCH yes: DEV is not converging (threshold `dev < -0.1`).
- Einstein-like sign would be `corr < 0`. **Not required** on these
  three rules. dim27 is a 2.7 CONTROL.

## MATCH

ID-free maximal atom-overlap: injections from the smaller event atom
set to the larger, score \(\sum \min(\mathrm{occ},\mathrm{occ})\). Unique
iff exactly one injection attains the max score.

Tick 0, event 0, every rule: **18** max-score injections (score 4) on
a 3→4 atom event. Not unique. Stop.

That is the creation/symmetry case the preregister named. Engine atom
IDs were not used as the matching key (they would have made MATCH
trivially yes).

## Golden rows (`results.jsonl`)

Searcher = verifier on every cell. Independent replay:
`node audit/idea-grav-four-numbers/replay-cell.js --all`.

| rule | steps | match | diam | \|V_r\| | dev | dens | corr | cap_hit | truncated |
|---|---:|---|---:|---:|---|---|---|---|---|
| dim27 | 8 | **no** | 12 | 4 | — | — | — | false | false |
| chain27 | 10 | **no** | 36 | 16 | — | — | — | false | false |
| flat2d | 8 | **no** | 17 | 7 | — | — | — | false | false |

Window: integers \(1 < r < \mathrm{diam}/2\). dim27 `hatd` in that
window is about 1.69…1.11 — **not** graded against 2.7.

| rule | events | spatial atoms | hyperedges | causal edges | nextAtom |
|---|---:|---:|---:|---:|---:|
| dim27 | 97 | 100 | 196 | 192 | 101 |
| chain27 | 2046 | 2050 | 4096 | 4088 | 2050 |
| flat2d | 171 | 174 | 345 | 339 | 174 |

## Claim status

| rule | gravity | Einstein-like tracking |
|---|---|---|
| dim27 | undefined (MATCH no) | not tested |
| chain27 | undefined (MATCH no) | not tested |
| flat2d | undefined (MATCH no) | not tested |

Allowed by the preregister. The tracking claim is not true on these
rules because it never becomes defined.

## How to run

```
node audit/idea-grav-four-numbers/run-golden.js
node audit/idea-grav-four-numbers/replay-cell.js --all
```

## Out of scope

Expt 9 Ricci dump. Expt 10. SAT. 712. IDEA-DJ-33. Growers. Einstein
field equation. No merge. No fleet-mail.
