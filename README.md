# Topological Light Propagation

Interactive explorer for [Wolfram Physics](https://www.wolframphysics.org/) multiway systems. Visualizes string rewriting evolution as 3D graphs with causal structure, branchial geometry, and spacetime hypergraph foliation.

**[Live demo →](https://edwinrosero.com/viz/)**

![Multiway graph](https://img.shields.io/badge/views-5-blue) ![Presets](https://img.shields.io/badge/presets-21-orange) ![Analysis tools](https://img.shields.io/badge/analysis%20tools-13-green) ![Engine tests](https://img.shields.io/badge/engine%20tests-44-brightgreen)

## Features

### Five views of the same system
- **Multiway** — full evolution graph, nodes colored by path weight
- **Causal** — event graph with causal edges and light cone highlighting. The causal relation is computed by tracking which event last wrote each character, and matches Wolfram's `MultiwaySystem` edge for edge on the test cases
- **Branchial** — final-step states joined when they share a parent one step back. Matches Wolfram's `EvolutionBranchialGraph` edge for edge on the test cases
- **B-Evolution** — animated branchial graph step-by-step with distance histogram
- **Spacetime** — Wolfram-style hypergraph rewriting with spatial geometry and curvature

### Interaction
- Hover any node/event to see its causal cone (past + future) highlighted in real time
- Click to lock a cone, explore the observer's causal history
- Coarse-graining slider merges branches with matching futures, after Gorard's observer model. Reading that merge as wavefunction collapse is a conjecture, and the page says so
- Interactive stepping mode with playback bar and speed control

### Analysis tools
Graph distance heatmap · shortest path · layout order · token rewrite view · branchial 3D embedding · future overlap distance · branchial shortest path · confluent region · critical pair test · event density · random rule changes · Ollivier-Ricci curvature · observer reach

Every tool reports a quantity measured on the computed graph and names it for what it is. Spacetime view adds light cones, a dimension heat map and entanglement threads.

### 21 presets across 7 categories
Sorting (double-slit) · Asymmetric · Growth · Wolfram Canonical · Competing Rules · Gorard Picks · 17 spacetime scenes

### Technical
- **Web Worker** evolution — main thread stays at 60fps during computation
- **Incremental buffer updates** — cone highlighting writes directly to GPU color buffers, no scene rebuild
- **LOD node labels** — zoom in to see state strings rendered as billboarded sprites (powered by [Pretext](https://github.com/chenglou/pretext))
- **Composer skip** — light mode bypasses the bloom post-processing pass entirely
- Keyboard shortcuts (`?` for help), screenshot export (`S`), JSON graph export (`E`), FPS monitor (`F`)
- Dark/light mode, URL hash persistence, mobile responsive

## Usage

No build step. Just serve the files:

```bash
npx serve . -l 3000
```

Open `http://localhost:3000`. That's it.

### Dependencies (all from CDN)
- [Three.js](https://threejs.org/) 0.170.0
- [Pretext](https://github.com/chenglou/pretext) (optional, for node labels)

## Controls

| View | Drag | Shift+Drag | Scroll |
|------|------|------------|--------|
| Multiway / Causal / Branchial | Pan | Rotate | Zoom |
| Spacetime | Orbit | — | Zoom |

Ctrl+Drag = Pan in spacetime view.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `1`–`5` | Switch views |
| `Space` | Play/Pause (interactive mode) |
| `←` `→` | Step back/forward |
| `R` | Reset |
| `S` | Screenshot (PNG) |
| `E` | Export graph (JSON) |
| `F` | Toggle FPS monitor |
| `?` | Show all shortcuts |

## Architecture

```
index.html             — Single-file app (~14K lines): engine, renderer, UI, analysis tools
worker.js              — Web Worker containing MultiwaySystem for off-thread evolution
tests/engine.test.js   — Engine tests, no dependencies
tests/page.test.js     — Browser test of the page (needs Playwright)
```

The multiway string rewriting engine (`MultiwaySystem`) is pure computation with zero DOM dependencies. It runs in a Web Worker and posts serialized graph data back to the main thread. The class exists in both files (the page keeps a copy for stepping mode); a test fails if the two copies differ.

## What the model does and does not show

The engine counts paths. Every path has weight +1, so branches only add: there are no phases, nothing can cancel, and the sorting presets cannot produce an interference pattern. The final-step chart shows the measured distribution (for the sorting rules, where the X's end up) with no analytical overlay.

Causal invariance is reported as a measurement: the share of critical pairs that rejoin within 3 steps, with pairs too close to the last step counted as untested. A full score is evidence on the computed graph, not a proof.

The branchial graph keeps states separate per step, which is Wolfram's `EvolutionBranchialGraph`. Wolfram's default `BranchialGraph` is a different graph: it merges a state that recurs at several steps and keeps only the pairs not seen at an earlier step, so on the sorting rules (where states recur every two steps) it is nearly empty. The tests check both readings against Wolfram.

The causal graph is complete up to a work budget. When a run exceeds it, the Statistics panel says through which step the graph is complete.

## Tests

```bash
node tests/engine.test.js     # 44 engine tests, no install needed
node tests/page.test.js       # drives the page in headless Chromium; needs Playwright
```

The engine tests compare the evolution graph (five cases), the causal graph (ten cases) and the branchial graph at every step (ten cases) against results from Wolfram Language's `ResourceFunction["MultiwaySystem"]`. State counts, event counts, edge counts and an order-independent hash of each edge set are stored in the test file.

## Credits

Built on ideas from:
- [Stephen Wolfram](https://www.wolframphysics.org/) — the Wolfram model, multiway systems, hypergraph rewriting
- [Jonathan Gorard](https://www.wolframphysics.org/people/jonathan-gorard/) — causal invariance, observer theory, coarse-graining as wavefunction collapse
- [Cheng Lou](https://github.com/chenglou/pretext) — Pretext library for DOM-free text layout

## License

MIT
