# IDEA-GRAV-FOUR-NUMBERS

**Verdict:** pending golden run. Instrumentation only in this revision.
Four stamps (MATCH / BALL / DEV / DENS) on three `ST_PRESETS`.
Preregister is already in git (`557498a`) **before** any corr.

**Evidence:** BOUNDED COMPUTATION / EXPLORATORY.

NAME FREEZE: IDEA-GRAV-FOUR-NUMBERS. MathMan 3+1 stays HOLD.

## Seal

| Item | Value |
|---|---|
| Audited commit | `c60aed3eb08ded734dde98d4365a39450acc4904` (`c60aed3eb08d`) |
| `index.html` blob | `36070e4f18a7e9c92e5e2f4b8bff6a5320577689` (`36070e4f`) |
| Extract | `class HypergraphRewriter` L12430 — causal DAG + last spatial slice |
| Cap | `maxEdges=8000` (stamped; not hidden) |
| Preregister | `audit/idea-grav-four-numbers/PREREGISTER.md` first-add `557498a` |

`index.html` / `worker.js` / the UI are **not** edited.

Not used: `worker.js` `checkCausalInvariance`; IDEA-TLP-41 string-Hamming
kernel; `estimateDimension` (random sample, labeled “dimension”);
growers; solvers.

## How to run

```
node audit/idea-grav-four-numbers/run-golden.js
node audit/idea-grav-four-numbers/replay-cell.js --all
```

Searcher ≠ verifier. Verifier replays the last slice from
`init` + `destroyedEdges` / `createdEdges` and recomputes the four
stamps with its own code.

## Out of scope

Expt 9 Ricci dump. Expt 10. SAT. 712. IDEA-DJ-33. Growers. Einstein /
\(G_{\mu\nu}\) / 3+1 names. No merge. No fleet-mail.
