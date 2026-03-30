# Topological Light Propagation

Interactive explorer for [Wolfram Physics](https://www.wolframphysics.org/) multiway systems. Visualizes string rewriting evolution as 3D graphs with causal structure, branchial geometry, and spacetime hypergraph foliation.

**[Live demo →](https://edwinrosero.com/viz/)**

![Multiway graph](https://img.shields.io/badge/views-5-blue) ![Presets](https://img.shields.io/badge/presets-21-orange) ![Physics tools](https://img.shields.io/badge/physics%20tools-12-green)

## Features

### Five views of the same system
- **Multiway** — full evolution graph, nodes colored by path weight
- **Causal** — event graph with causal edges, light cone highlighting
- **Branchial** — final-step states connected by shared ancestry (projective Hilbert space geometry)
- **B-Evolution** — animated branchial graph step-by-step with distance histogram
- **Spacetime** — Wolfram-style hypergraph rewriting with spatial geometry and curvature

### Interaction
- Hover any node/event to see its causal cone (past + future) highlighted in real time
- Click to lock a cone, explore the observer's causal history
- Coarse-graining slider implements Gorard's observer model (Knuth-Bendix completion ≈ wavefunction collapse)
- Interactive stepping mode with playback bar and speed control

### Physics tools
Branchial distance heatmap · geodesic path finder · 3D branchial space · energy density · causal invariance measurement · reference frame switching · dimension estimation · Ricci curvature · embedded observer · entanglement threads · tunneling detection · entanglement speed

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
index.html    — Single-file app (~15K lines): engine, renderer, UI, physics tools
worker.js     — Web Worker containing MultiwaySystem for off-thread evolution
```

The multiway string rewriting engine (`MultiwaySystem`) is pure computation with zero DOM dependencies. It runs in a Web Worker and posts serialized graph data back to the main thread.

## Credits

Built on ideas from:
- [Stephen Wolfram](https://www.wolframphysics.org/) — the Wolfram model, multiway systems, hypergraph rewriting
- [Jonathan Gorard](https://www.wolframphysics.org/people/jonathan-gorard/) — causal invariance, observer theory, coarse-graining as wavefunction collapse
- [Cheng Lou](https://github.com/chenglou/pretext) — Pretext library for DOM-free text layout

## License

MIT
