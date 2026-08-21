# IDEA-GRAV-FOUR-NUMBERS — preregister

Written **before** any `corr(DEV, DENS)` is computed. Do not edit the
sign section after looking at a correlation. Evidence class:
**BOUNDED COMPUTATION / EXPLORATORY**.

NAME FREEZE: this idea is **IDEA-GRAV-FOUR-NUMBERS**. MathMan 3+1 stays
**HOLD**. Do not name any stamp Ricci, \(G_{\mu\nu}\), or 3+1.

## Surface

This repo is the instrumentation-seal surface (same class as TLP PR #2
and PR #3). Sealed object: `HypergraphRewriter` in `index.html` (causal
DAG = `events` / `causalEdges`; last spatial slice = active hyperedges
after `evolve`). `worker.js` / `checkCausalInvariance` are not used.
The IDEA-TLP-41 string-Hamming geodesic kernel is not this measurement.

Three `ST_PRESETS` only, listed steps:

| rule | lhs → rhs | init | steps | role |
|---|---|---|---:|---|
| dim27 | `{{x,y},{x,z}}→{{x,z},{x,w},{y,w},{z,w}}` | `{{1,2},{1,3}}` | 8 | 2.7 CONTROL, not a pass target |
| chain27 | `{{x,y},{y,z}}→{{w,y},{y,x},{x,w},{w,z}}` | 4-cycle | 10 | same preregister unless MATCH fails |
| flat2d | `{{x,y},{y,z}}→{{x,z},{z,w},{w,x},{w,y}}` | triangle | 8 | same preregister unless MATCH fails |

Cap: `maxEdges=8000`. If the rewriter sets `truncated`, stamp
`truncated=true` and `cap_hit=true`. Do not hide it.

## MATCH (worldlines)

Persistent worldlines need a **unique maximal atom-overlap** map from
tick \(t\) to \(t+1\) for **every** tick.

Definition (ID-free; engine atom IDs are not the matching key):

- Replay slices from `init` plus each step’s `destroyedEdges` /
  `createdEdges` (event order inside a step does not change the
  hyperedge multiset).
- For each event at the tick, let \(A_{\mathrm{in}}\) / \(A_{\mathrm{out}}\)
  be the atom sets of destroyed / created hyperedges, with occurrence
  counts \(\mathrm{occ}_{\mathrm{in}}\) / \(\mathrm{occ}_{\mathrm{out}}\).
- An identification is an injection from the smaller set into the
  larger. Score
  \(\sum_a \min(\mathrm{occ}_{\mathrm{small}}(a),\mathrm{occ}_{\mathrm{large}}(\varphi(a)))\).
  That sum is the atom-overlap.
- MATCH is unique at the event iff **exactly one** injection attains
  the maximum score.
- Idle hyperedges (not destroyed this step) persist as the same tuples
  and do not add a second matching problem.
- If any event at any tick is non-unique, MATCH = no for the rule.

**Stop rule:** MATCH = no ⇒ gravity is undefined on that rule. Do not
claim DEV / DENS / corr. Still stamp BALL on the last spatial slice
(slice geometry does not need worldlines). Honest fail.

### Predictions

- **dim27:** MATCH may fail (the rule creates a fresh atom \(w\) each
  event; \(y\) and \(z\) are role-symmetric on the LHS). If MATCH is
  yes, DEV is **not** converging (expansion control).
- **chain27 / flat2d:** same preregister unless MATCH fails.

## BALL (last spatial slice only)

Not “spacetime dimension.” Not a 2.7 pass target.

- Spatial graph: atoms adjacent when they co-appear in a hyperedge.
- \(V_r\): mean BFS ball size at graph radius \(r\), **every** atom a
  center (no `Math.random` sample; not `estimateDimension`).
- Diameter: maximum eccentricity on the largest connected component
  (tie → component containing the smallest atom id).
- Stamped window: integers \(r\) with \(1 < r < \mathrm{diam}/2\).
- \(\hat d(r)=(\log V_{r+1}-\log V_r)/(\log(r+1)-\log r)\).
- Empty window if the last slice is too small: stamp empty arrays.

## DEV (causal DAG, not the 41 string kernel)

First-hop geodesic bundles on `HypergraphRewriter.events` /
`causalEdges` only.

- Source: event `id=0`. Targets: events at the maximum `step` that
  have a directed causal path of length \(\ge 3\). If that source
  yields no bundle, try later sources in increasing `id` (first source
  that yields \(\ge 1\) bundle).
- Bundle: geodesics that share the same first hop.
- Separation at depth: mean pairwise **undirected** hop distance on
  the causal graph among events sitting at that depth on the bundle.
  Not string Hamming, not Levenshtein, not `levenshteinLike`.
- Per-bundle deviation: \((s_{\mathrm{last}}-s_{\mathrm{first}})/\max(s_{\mathrm{first}},0.01)\).
- `dev` = mean of per-bundle deviations. Need \(\ge 2\) paths in a
  bundle and \(\ge 2\) depths with a pair; otherwise `dev` is null
  (and MATCH-yes gravity is still undefined for lack of bundles).

**Adopted converging threshold:** `dev < -0.1` (the same cutoff number
IDEA-TLP-41 used on a **different** graph). State it; do not reuse that
kernel.

If MATCH is yes, the preregistered control is: DEV is **not**
converging.

## DENS

For each first-hop bundle that produced a deviation:

- Atoms of the bundle = atoms in destroyed/created hyperedges of every
  event on the bundle paths.
- Ball = those atoms that still exist on the last spatial slice
  (no extra radius; the bundle’s own atom set is the ball).
- Past = every event that touches the ball, closed under causal
  predecessors (`causalEdges` reversed).
- Incident causal edges = `causalEdges` with at least one end in that
  past.
- Per-bundle density = (incident count) / |ball|. Skip if |ball|=0.

`dens` = mean of per-bundle densities.

## corr(DEV, DENS) — sign (locked)

Paired series: the per-bundle \((\mathrm{dev}_i,\mathrm{dens}_i)\).
Pearson product-moment. Null if fewer than 2 pairs or either variance
is 0.

**Einstein-like sign would be \(\mathrm{corr}<0\)** (higher local
causal-edge density, more negative / converging deviation).

We do **not** require that sign on these three rules:

- dim27 is a 2.7 CONTROL, not a pass target; corr is not required to
  be Einstein-like.
- chain27 / flat2d: same preregister unless MATCH fails.

After corr is computed: if MATCH is yes and corr is not `< 0`, the
Einstein-like tracking claim is **false** on that rule. That is an
allowed outcome. If MATCH is no, the claim is not tested (gravity
undefined), which is also an allowed outcome.

If MATCH is yes and corr is `< 0`, that still does **not** upgrade the
control into Einstein / Ricci / \(G_{\mu\nu}\) / 3+1.

## Success / fail of this seal

Success: jsonl `{rule, steps, match, V_r[], hatd[], dev, dens, corr,
cap_hit, truncated}` plus independent replay of any claimed cell
(searcher ≠ verifier). This file exists in git before the corr values.

Fail: calling any number Ricci, \(G_{\mu\nu}\), or 3+1; using growers;
using the 41 string kernel on a hypergraph as the same measurement;
hiding `maxEdges=8000` truncation; editing this sign section after
seeing corr.
