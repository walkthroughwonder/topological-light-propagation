# IDEA-TLP-29-PISKUNOV

**Verdict:** the TLP Causal Invariance Verifier button is **neither** Piskunov causal invariance nor unbounded confluence. It is **bounded state-joinability** of overlapping sibling events (lookahead 3), with non-overlapping siblings counted as already joined. The returned `invariance` ratio is **not** percent causal invariance.

**Evidence class:** BOUNDED COMPUTATION / EXPLORATORY.

## Seal

| Item | Value |
|---|---|
| Audited commit | `c60aed3eb08ded734dde98d4365a39450acc4904` (`c60aed3eb08d`) |
| `worker.js` blob | `961def89f04c3688272e540414d172c70d196fa0` (`961def89`) |
| Citation | matched on current master; function extracted from `worker.js`, not `index.html` / Three.js |
| Caps | `maxStateLength=256`, `maxTotalStates=5000` |
| Lookahead | hardcoded `maxLookahead=3` |

## What `checkCausalInvariance` actually does

Verified against the sealed source (not the comment that says “Gorard-correct”):

1. Group events by parent node. Pair siblings.
2. Overlapping input ranges → critical pair. Non-overlapping siblings increment `confluent` immediately (“always commute”).
3. For each critical pair: same child, or equal state strings, or **node-set / state-set intersection** after at most **3** hops in the already-built multiway graph.
4. Pairs still open at lookahead 3 increment `divergent`. They are **not hidden**.
5. Return `{confluent, divergent, criticalPairs, invariance: confluent/(confluent+divergent)}` (or `1` if the denominator is 0).

No singleway event-order enumeration. No causal-DAG construction. No graph isomorphism. That is local joinability on a finite prefix, not Piskunov CI.

## Piskunov 2020 (cells)

Piskunov, *Confluence and Causal Invariance* (Wolfram Physics Bulletin, 2020-11; SetReplace note):

- **Confluence:** any two partial singleway evolutions can be continued to isomorphic final states.
- **Causal invariance:** causal graphs of singleway evolutions under every event ordering are isomorphic. Stated for terminating (FixedPoint) systems.

Neither property implies the other. Published counterexamples are **Wolfram-model hypergraphs** (`{{1},{1,2}}→{{1,2},{2}}` and `{{1,2},{2,1}}→{{1}}`). TLP’s engine is string `indexOf` rewriting. Those pairs cannot be loaded without inventing a hypergraph runtime. Obstruction recorded; no fake Piskunov pair.

String analogues inside the caps (hand-built, not claimed as Piskunov’s graphs):

- `hand-ci-not-conf`: `AB→X`, `BC→Y` on `ABC`. Two FixedPoints `XC` / `AY`. Causal graphs are both a single vertex. **CI ∧ ¬confluent**. TLP marks the pair `divergent` (joinability, not CI).
- `hand-conf-not-ci`: `X→Y|Z`, `Y→W`, `Z→V→W` on `X`. Unique normal form `W`. Causal path of length 2 vs length 3. **confluent ∧ ¬CI**. TLP marks the pair `confluent` at lookahead 3 and can return `invariance=1`.

## Golden rows

See `results.jsonl` (`preset`, `lookahead`, `confluent`, `divergent`, `invariance`, `state_joinable`, `causal_graph_iso`, `piskunov_cell`, `cap_hit`). Independent columns share **no code** with `worker.js`.

Gallery presets (`gorard-fib`, `one-way`, `wolfram-1`) are orthogonal or locally joinable on the explored prefix. TLP’s ratio is dominated by the non-overlap shortcut (`gorard-fib` is a single-character orthogonal TRS: every sibling pair is counted confluent without a join search). That is still not causal-graph iso. `wolfram-1` does not terminate; Piskunov CI is undefined there.

## UI (not redesigned)

`#btn-verify-ci` is titled “Causal Invariance Verifier” and prints “Invariance score: *p*%”. This audit does **not** rename the button (no golden test required a symbol rename). Do not read that percent as causal invariance. Do not treat `divergent=0` as CI.

## Out of scope

Expt 10 not started. Zarankiewicz not touched. Not a click. Not WP5. No solvers, no SAT, no merge.
