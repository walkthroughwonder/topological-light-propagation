#!/usr/bin/env python3
"""
Build Branchial Evolution feature:
1. Replace "Overlay" tab (data-view="both") with "B-Evolution" (data-view="bevolution")
2. Add per-step branchial graph computation to MultiwaySS class
3. Add branchial evolution canvas renderer + step scrubber UI
4. Add branchial distance histogram to right panel
5. Clean up all 'both' view references
6. Update scenes dropdown
"""

INPUT = '/home/user/workspace/hypergraph-viz/index.html'

with open(INPUT, 'r') as f:
    content = f.read()

# ═══════════════════════════════════════════════════════════════
# 1. Replace Overlay tab with B-Evolution tab
# ═══════════════════════════════════════════════════════════════

content = content.replace(
    '<button class="view-tab" data-view="both">Overlay</button>',
    '<button class="view-tab" data-view="bevolution">B-Evolution</button>'
)

# ═══════════════════════════════════════════════════════════════
# 2. Remove 'both' from updateViewVisibility and fitCamera
# ═══════════════════════════════════════════════════════════════

# fitCamera: replace 'both' branch with bevolution
content = content.replace(
    """  } else if (currentView === 'both') {
    const midX = branchialGroup.position.x / 2;
    endTarget = new THREE.Vector3(midX, centerY, 1.5);
    endPos = new THREE.Vector3(midX, centerY + 5, 50);
  }""",
    """  }"""
)

# updateViewVisibility: remove 'both' from all three lines
content = content.replace(
    "multiwayGroup.visible = currentView === 'multiway' || currentView === 'both';",
    "multiwayGroup.visible = currentView === 'multiway';"
)
content = content.replace(
    "branchialGroup.visible = currentView === 'branchial' || currentView === 'both';",
    "branchialGroup.visible = currentView === 'branchial';"
)
content = content.replace(
    "causalGroup.visible = currentView === 'causal' || currentView === 'both';",
    "causalGroup.visible = currentView === 'causal';"
)

# ═══════════════════════════════════════════════════════════════
# 3. Add CSS for the branchial evolution view
# ═══════════════════════════════════════════════════════════════

bevolution_css = """
  /* ─── BRANCHIAL EVOLUTION VIEW ─── */
  #bevolution-container {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: none;
    background: var(--bg, #FFFFFF);
    z-index: 5;
  }
  #bevolution-container.active { display: flex; flex-direction: column; }
  
  #bevolution-canvas {
    flex: 1;
    width: 100%;
    cursor: grab;
  }
  #bevolution-canvas:active { cursor: grabbing; }
  
  .bevolution-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: var(--surface, #F6F6F4);
    border-top: 1px solid var(--border, #D9D9D4);
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: var(--text, #111111);
  }
  
  .bevolution-controls button {
    background: var(--elevated, #EEEEEC);
    border: 1px solid var(--border, #D9D9D4);
    border-radius: 4px;
    color: var(--text, #111111);
    font-size: 13px;
    cursor: pointer;
    padding: 4px 10px;
    transition: background 180ms ease;
  }
  .bevolution-controls button:hover {
    background: var(--accent, #E86C00);
    color: #fff;
    border-color: var(--accent, #E86C00);
  }
  .bevolution-controls button.active {
    background: var(--accent, #E86C00);
    color: #fff;
    border-color: var(--accent, #E86C00);
  }
  
  #bev-slider {
    flex: 1;
    height: 4px;
    accent-color: var(--accent, #E86C00);
    cursor: pointer;
  }
  
  #bev-step-label {
    font-variant-numeric: tabular-nums;
    min-width: 90px;
    text-align: center;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-size: 11px;
    color: var(--muted, #555555);
  }
  
  #bev-stats {
    font-size: 11px;
    color: var(--muted, #555555);
    font-variant-numeric: tabular-nums;
  }

  /* Distance histogram in right panel */
  #bev-distance-section {
    display: none;
  }
  #bev-distance-section.active { display: block; }
  
  #distance-canvas {
    width: 100%;
    height: 120px;
    border-radius: 6px;
    border: 1px solid var(--border, #D9D9D4);
  }

  /* Dark mode overrides */
  [data-theme="dark"] #bevolution-container {
    background: #111111;
  }
  [data-theme="dark"] .bevolution-controls {
    background: #1A1A1A;
    border-color: #333333;
    color: #E8E8E8;
  }
  [data-theme="dark"] .bevolution-controls button {
    background: #222222;
    border-color: #333333;
    color: #E8E8E8;
  }
  [data-theme="dark"] .bevolution-controls button:hover,
  [data-theme="dark"] .bevolution-controls button.active {
    background: #E86C00;
    color: #fff;
    border-color: #E86C00;
  }
  [data-theme="dark"] #bev-step-label,
  [data-theme="dark"] #bev-stats {
    color: #999999;
  }
  [data-theme="dark"] #distance-canvas {
    border-color: #333333;
  }
"""

# Insert before </style>
content = content.replace('</style>', bevolution_css + '\n</style>')

# ═══════════════════════════════════════════════════════════════
# 4. Add bevolution container HTML inside #center
# ═══════════════════════════════════════════════════════════════

bevolution_html = """
    <!-- Branchial Evolution View -->
    <div id="bevolution-container">
      <canvas id="bevolution-canvas"></canvas>
      <div class="bevolution-controls">
        <button id="bev-play" title="Play / Pause">▶</button>
        <button id="bev-prev" title="Previous step">◀</button>
        <span id="bev-step-label">Step 0 / 0</span>
        <input type="range" id="bev-slider" min="0" max="0" value="0">
        <button id="bev-next" title="Next step">▶</button>
        <span id="bev-stats"></span>
      </div>
    </div>
"""

# Insert after <div id="center"> — find the center div
center_marker = '<div id="center">'
idx = content.find(center_marker)
if idx >= 0:
    insert_pos = idx + len(center_marker)
    content = content[:insert_pos] + '\n' + bevolution_html + content[insert_pos:]

# ═══════════════════════════════════════════════════════════════
# 5. Add distance histogram HTML in right panel
# ═══════════════════════════════════════════════════════════════

distance_html = """
    <div id="bev-distance-section">
      <div class="section-title">Branchial Distance</div>
      <canvas id="distance-canvas"></canvas>
      <p class="desc" id="bev-distance-desc">Distribution of graph distances between all pairs of states in the branchial graph at the selected step. An expanding distribution suggests emergent spatial geometry.</p>
    </div>
"""

# Insert before the "PHYSICS TOOLS" section in the right panel
physics_tools_marker = '<div class="section-title" id="physics-tools-title"'
idx = content.find(physics_tools_marker)
if idx < 0:
    # Try alternate
    physics_tools_marker = 'PHYSICS TOOLS'
    idx = content.find(physics_tools_marker)
    if idx >= 0:
        # Go back to find the containing div
        idx = content.rfind('<div', 0, idx)

if idx >= 0:
    content = content[:idx] + distance_html + '\n    ' + content[idx:]

# ═══════════════════════════════════════════════════════════════
# 6. Add per-step branchial graph method to MultiwaySS class  
# ═══════════════════════════════════════════════════════════════

branchial_per_step_method = """
  // Build branchial graph for a specific step (not just the final step)
  buildBranchialForStep(targetStep) {
    const stepIds = this.stepStates[targetStep];
    if (!stepIds || stepIds.length === 0) return { nodes: [], edges: [], step: targetStep };

    // Build parent map: for each node at targetStep, find its parents (at step-1)
    const parentMap = new Map();
    for (const edge of this.edges) {
      const child = this.nodes[edge.to];
      if (child && child.step === targetStep) {
        if (!parentMap.has(edge.to)) parentMap.set(edge.to, new Set());
        parentMap.get(edge.to).add(edge.from);
      }
    }

    // Build branchial edges: connect states at targetStep that share a parent
    const edges = [];
    for (let i = 0; i < stepIds.length; i++) {
      for (let j = i + 1; j < stepIds.length; j++) {
        const pi = parentMap.get(stepIds[i]);
        const pj = parentMap.get(stepIds[j]);
        if (pi && pj) {
          for (const p of pi) {
            if (pj.has(p)) {
              edges.push({ from: stepIds[i], to: stepIds[j] });
              break;
            }
          }
        }
      }
    }

    // Return node data with weights
    const maxWeight = Math.max(1, ...stepIds.map(id => this.nodes[id].weight));
    const nodes = stepIds.map(id => ({
      id,
      state: this.nodes[id].state,
      weight: this.nodes[id].weight,
      normWeight: this.nodes[id].weight / maxWeight
    }));

    return { nodes, edges, step: targetStep };
  }

  // Build branchial graphs for ALL steps (cached)
  buildAllBranchialGraphs() {
    if (this._cachedBranchialSteps) return this._cachedBranchialSteps;
    const result = [];
    const totalSteps = this.getTotalSteps();
    for (let s = 0; s <= totalSteps; s++) {
      result.push(this.buildBranchialForStep(s));
    }
    this._cachedBranchialSteps = result;
    return result;
  }

  // Compute branchial distance distribution using BFS
  computeBranchialDistances(targetStep) {
    const data = this.buildBranchialForStep(targetStep);
    if (data.nodes.length < 2) return { histogram: [], maxDist: 0, meanDist: 0, diameter: 0 };

    // Build adjacency list
    const adj = new Map();
    for (const n of data.nodes) adj.set(n.id, []);
    for (const e of data.edges) {
      adj.get(e.from)?.push(e.to);
      adj.get(e.to)?.push(e.from);
    }

    // BFS from each node to get all pairwise distances
    const distances = [];
    const nodeIds = data.nodes.map(n => n.id);
    for (let i = 0; i < nodeIds.length; i++) {
      const dist = new Map();
      dist.set(nodeIds[i], 0);
      const queue = [nodeIds[i]];
      let qi = 0;
      while (qi < queue.length) {
        const curr = queue[qi++];
        const d = dist.get(curr);
        for (const neighbor of (adj.get(curr) || [])) {
          if (!dist.has(neighbor)) {
            dist.set(neighbor, d + 1);
            queue.push(neighbor);
          }
        }
      }
      // Only count pairs (i,j) where j > i to avoid duplicates
      for (let j = i + 1; j < nodeIds.length; j++) {
        const d = dist.get(nodeIds[j]);
        if (d !== undefined) distances.push(d);
      }
    }

    if (distances.length === 0) return { histogram: [], maxDist: 0, meanDist: 0, diameter: 0 };

    const maxDist = Math.max(...distances);
    const histogram = new Array(maxDist + 1).fill(0);
    for (const d of distances) histogram[d]++;
    const meanDist = distances.reduce((a, b) => a + b, 0) / distances.length;

    return { histogram, maxDist, meanDist, diameter: maxDist, totalPairs: distances.length };
  }
"""

# Insert after _buildBranchialGraph method (after its closing brace)
build_branchial_end = "  _buildBranchialGraph(maxSteps) {"
idx = content.find(build_branchial_end)
if idx >= 0:
    # Find the end of this method — look for the next method at same indent
    # The method ends with "  }\n\n  _computeLayout"
    end_marker = "  _computeLayout()"
    end_idx = content.find(end_marker, idx)
    if end_idx >= 0:
        content = content[:end_idx] + branchial_per_step_method + '\n\n  ' + content[end_idx:]

# ═══════════════════════════════════════════════════════════════
# 7. Invalidate branchial cache on rebuild
# ═══════════════════════════════════════════════════════════════

# In the reset/init methods, clear cache
content = content.replace(
    "this.branchialEdges = [];\n    this._currentStep = 0;",
    "this.branchialEdges = [];\n    this._cachedBranchialSteps = null;\n    this._currentStep = 0;",
    1  # Only first occurrence (constructor)
)
# Also in batch build
content = content.replace(
    "this.branchialEdges = [];\n    this.stepStates = [];",
    "this.branchialEdges = [];\n    this._cachedBranchialSteps = null;\n    this.stepStates = [];",
)

# ═══════════════════════════════════════════════════════════════
# 8. Add the B-Evolution rendering + interaction JavaScript
# ═══════════════════════════════════════════════════════════════

bevolution_js = """
// ═══════════════════════════════════════════════════════════════
// BRANCHIAL EVOLUTION VIEW
// ═══════════════════════════════════════════════════════════════

const bevContainer = document.getElementById('bevolution-container');
const bevCanvas = document.getElementById('bevolution-canvas');
const bevCtx = bevCanvas.getContext('2d');
const bevSlider = document.getElementById('bev-slider');
const bevStepLabel = document.getElementById('bev-step-label');
const bevStats = document.getElementById('bev-stats');
const bevPlayBtn = document.getElementById('bev-play');
const bevPrevBtn = document.getElementById('bev-prev');
const bevNextBtn = document.getElementById('bev-next');
const distCanvas = document.getElementById('distance-canvas');
const distCtx = distCanvas ? distCanvas.getContext('2d') : null;

let bevCurrentStep = 0;
let bevPlaying = false;
let bevPlayInterval = null;
let bevLayoutCache = new Map(); // step -> { positions: [{x,y}], settled: bool }

function bevGetThemeColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    bg: dark ? '#111111' : '#FFFFFF',
    surface: dark ? '#1A1A1A' : '#F6F6F4',
    text: dark ? '#E8E8E8' : '#111111',
    muted: dark ? '#666666' : '#AAAAAA',
    border: dark ? '#333333' : '#D9D9D4',
    accent: '#E86C00',
    node: dark ? '#4FC3F7' : '#0288D1',
    nodeGlow: dark ? 'rgba(79,195,247,0.3)' : 'rgba(2,136,209,0.15)',
    edge: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    weightHigh: dark ? '#FFD54F' : '#FF8F00',
  };
}

function bevForceLayout(data, iterations) {
  const n = data.nodes.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, y: 0 }];
  
  const positions = [];
  // Initialize on a circle
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = Math.min(200, 30 + n * 3);
    positions.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  
  if (data.edges.length === 0 && n <= 1) return positions;

  // Build ID → index map
  const idToIdx = new Map();
  for (let i = 0; i < n; i++) idToIdx.set(data.nodes[i].id, i);
  
  const idealDist = Math.max(30, 250 / Math.sqrt(n));
  
  for (let iter = 0; iter < iterations; iter++) {
    const temp = idealDist * 0.5 * (1 - iter / iterations);
    const fX = new Float32Array(n);
    const fY = new Float32Array(n);
    
    // Repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = positions[i].x - positions[j].x;
        let dy = positions[i].y - positions[j].y;
        let dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        let force = (idealDist * idealDist) / dist;
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
        fX[i] += fx; fY[i] += fy;
        fX[j] -= fx; fY[j] -= fy;
      }
    }
    
    // Attraction along edges
    for (const e of data.edges) {
      const i = idToIdx.get(e.from);
      const j = idToIdx.get(e.to);
      if (i === undefined || j === undefined) continue;
      let dx = positions[i].x - positions[j].x;
      let dy = positions[i].y - positions[j].y;
      let dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
      let force = (dist * dist) / idealDist;
      let fx = (dx / dist) * force * 0.5;
      let fy = (dy / dist) * force * 0.5;
      fX[i] -= fx; fY[i] -= fy;
      fX[j] += fx; fY[j] += fy;
    }
    
    // Apply with cooling
    for (let i = 0; i < n; i++) {
      let fLen = Math.sqrt(fX[i] * fX[i] + fY[i] * fY[i]) + 0.1;
      let capped = Math.min(fLen, temp);
      positions[i].x += (fX[i] / fLen) * capped;
      positions[i].y += (fY[i] / fLen) * capped;
    }
  }
  
  // Center
  let cx = 0, cy = 0;
  for (const p of positions) { cx += p.x; cy += p.y; }
  cx /= n; cy /= n;
  for (const p of positions) { p.x -= cx; p.y -= cy; }
  
  return positions;
}

function bevGetLayout(data) {
  const key = data.step;
  if (bevLayoutCache.has(key)) return bevLayoutCache.get(key);
  const iters = Math.min(80, Math.max(40, Math.floor(300 / Math.sqrt(Math.max(1, data.nodes.length)))));
  const positions = bevForceLayout(data, iters);
  bevLayoutCache.set(key, positions);
  return positions;
}

// Pan/zoom state
let bevPan = { x: 0, y: 0 };
let bevZoom = 1;
let bevDragging = false;
let bevDragStart = { x: 0, y: 0 };

function bevDrawGraph(data) {
  const dpr = window.devicePixelRatio || 1;
  const w = bevCanvas.clientWidth;
  const h = bevCanvas.clientHeight;
  bevCanvas.width = w * dpr;
  bevCanvas.height = h * dpr;
  bevCtx.scale(dpr, dpr);
  
  const colors = bevGetThemeColors();
  bevCtx.fillStyle = colors.bg;
  bevCtx.fillRect(0, 0, w, h);
  
  if (!data || data.nodes.length === 0) {
    bevCtx.fillStyle = colors.muted;
    bevCtx.font = '13px Inter, sans-serif';
    bevCtx.textAlign = 'center';
    bevCtx.fillText('No states at this step', w / 2, h / 2);
    return;
  }
  
  const positions = bevGetLayout(data);
  const idToIdx = new Map();
  for (let i = 0; i < data.nodes.length; i++) idToIdx.set(data.nodes[i].id, i);
  
  // Compute bounding box for auto-fit
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of positions) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const margin = 60;
  const scaleX = (w - margin * 2) / rangeX;
  const scaleY = (h - margin * 2) / rangeY;
  const autoScale = Math.min(scaleX, scaleY, 3);
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Transform: auto-fit + user pan/zoom
  const tx = (x) => (x - centerX) * autoScale * bevZoom + w / 2 + bevPan.x;
  const ty = (y) => (y - centerY) * autoScale * bevZoom + h / 2 + bevPan.y;
  
  // Draw edges
  bevCtx.strokeStyle = colors.edge;
  bevCtx.lineWidth = 1;
  bevCtx.beginPath();
  for (const e of data.edges) {
    const i = idToIdx.get(e.from);
    const j = idToIdx.get(e.to);
    if (i === undefined || j === undefined) continue;
    bevCtx.moveTo(tx(positions[i].x), ty(positions[i].y));
    bevCtx.lineTo(tx(positions[j].x), ty(positions[j].y));
  }
  bevCtx.stroke();
  
  // Draw nodes
  for (let i = 0; i < data.nodes.length; i++) {
    const node = data.nodes[i];
    const px = tx(positions[i].x);
    const py = ty(positions[i].y);
    const baseR = Math.max(3, 4 + node.normWeight * 8) * Math.min(bevZoom, 2);
    
    // Glow
    bevCtx.beginPath();
    bevCtx.arc(px, py, baseR + 3, 0, Math.PI * 2);
    bevCtx.fillStyle = colors.nodeGlow;
    bevCtx.fill();
    
    // Core — lerp from node color to weightHigh based on weight
    const wt = node.normWeight;
    bevCtx.beginPath();
    bevCtx.arc(px, py, baseR, 0, Math.PI * 2);
    bevCtx.fillStyle = wt > 0.6 ? colors.weightHigh : colors.node;
    bevCtx.fill();
  }
  
  // Step info overlay
  bevCtx.fillStyle = colors.muted;
  bevCtx.font = '11px Inter, sans-serif';
  bevCtx.textAlign = 'left';
  bevCtx.fillText(data.nodes.length + ' states, ' + data.edges.length + ' edges', 12, h - 10);
}

function bevSetStep(step) {
  if (!currentSystem) return;
  const sys = typeof window._currentSystem === 'function' ? window._currentSystem() : currentSystem;
  if (!sys) return;
  const totalSteps = sys.getTotalSteps();
  step = Math.max(0, Math.min(step, totalSteps));
  bevCurrentStep = step;
  bevSlider.value = step;
  bevStepLabel.textContent = 'Step ' + step + ' / ' + totalSteps;
  
  const data = sys.buildBranchialForStep(step);
  bevStats.textContent = data.nodes.length + ' states · ' + data.edges.length + ' branch pairs';
  bevDrawGraph(data);
  
  // Update distance histogram
  bevDrawDistanceHistogram(sys, step);
  
  // Show/hide distance section
  const distSection = document.getElementById('bev-distance-section');
  if (distSection) {
    distSection.classList.toggle('active', currentView === 'bevolution');
  }
}

function bevInit() {
  if (!currentSystem) return;
  const sys = typeof window._currentSystem === 'function' ? window._currentSystem() : currentSystem;
  if (!sys) return;
  
  bevLayoutCache.clear();
  const totalSteps = sys.getTotalSteps();
  bevSlider.max = totalSteps;
  bevSlider.value = Math.min(bevCurrentStep, totalSteps);
  bevCurrentStep = parseInt(bevSlider.value);
  bevPan = { x: 0, y: 0 };
  bevZoom = 1;
  bevSetStep(bevCurrentStep);
}

// Slider interaction
bevSlider.addEventListener('input', () => {
  bevSetStep(parseInt(bevSlider.value));
});

// Play/pause
function bevTogglePlay() {
  bevPlaying = !bevPlaying;
  bevPlayBtn.textContent = bevPlaying ? '⏸' : '▶';
  bevPlayBtn.classList.toggle('active', bevPlaying);
  
  if (bevPlaying) {
    bevPlayInterval = setInterval(() => {
      const sys = typeof window._currentSystem === 'function' ? window._currentSystem() : currentSystem;
      if (!sys) { bevTogglePlay(); return; }
      const totalSteps = sys.getTotalSteps();
      if (bevCurrentStep >= totalSteps) {
        bevSetStep(0); // Loop
      } else {
        bevSetStep(bevCurrentStep + 1);
      }
    }, 600);
  } else {
    clearInterval(bevPlayInterval);
    bevPlayInterval = null;
  }
}

bevPlayBtn.addEventListener('click', bevTogglePlay);
bevPrevBtn.addEventListener('click', () => bevSetStep(bevCurrentStep - 1));
bevNextBtn.addEventListener('click', () => bevSetStep(bevCurrentStep + 1));

// Pan/zoom on canvas
bevCanvas.addEventListener('mousedown', (e) => {
  bevDragging = true;
  bevDragStart = { x: e.clientX - bevPan.x, y: e.clientY - bevPan.y };
});
bevCanvas.addEventListener('mousemove', (e) => {
  if (!bevDragging) return;
  bevPan.x = e.clientX - bevDragStart.x;
  bevPan.y = e.clientY - bevDragStart.y;
  const sys = typeof window._currentSystem === 'function' ? window._currentSystem() : currentSystem;
  if (sys) bevDrawGraph(sys.buildBranchialForStep(bevCurrentStep));
});
bevCanvas.addEventListener('mouseup', () => { bevDragging = false; });
bevCanvas.addEventListener('mouseleave', () => { bevDragging = false; });
bevCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  bevZoom = Math.max(0.2, Math.min(10, bevZoom * delta));
  const sys = typeof window._currentSystem === 'function' ? window._currentSystem() : currentSystem;
  if (sys) bevDrawGraph(sys.buildBranchialForStep(bevCurrentStep));
}, { passive: false });

// Keyboard shortcuts in bevolution view
document.addEventListener('keydown', (e) => {
  if (currentView !== 'bevolution') return;
  if (e.key === 'ArrowLeft' || e.key === 'a') bevSetStep(bevCurrentStep - 1);
  if (e.key === 'ArrowRight' || e.key === 'd') bevSetStep(bevCurrentStep + 1);
  if (e.key === ' ') { e.preventDefault(); bevTogglePlay(); }
});

// ═══════════════════════════════════════════════════════════════
// BRANCHIAL DISTANCE HISTOGRAM
// ═══════════════════════════════════════════════════════════════

function bevDrawDistanceHistogram(sys, step) {
  if (!distCanvas || !distCtx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = distCanvas.clientWidth;
  const h = distCanvas.clientHeight;
  if (w === 0 || h === 0) return;
  distCanvas.width = w * dpr;
  distCanvas.height = h * dpr;
  distCtx.scale(dpr, dpr);
  
  const colors = bevGetThemeColors();
  distCtx.fillStyle = colors.bg;
  distCtx.fillRect(0, 0, w, h);
  
  const result = sys.computeBranchialDistances(step);
  
  if (result.histogram.length === 0) {
    distCtx.fillStyle = colors.muted;
    distCtx.font = '11px Inter, sans-serif';
    distCtx.textAlign = 'center';
    distCtx.fillText('Not enough states', w / 2, h / 2);
    return;
  }
  
  const hist = result.histogram;
  const maxCount = Math.max(...hist);
  const barCount = hist.length;
  
  const pad = { top: 14, bottom: 24, left: 30, right: 10 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const barW = Math.max(2, plotW / barCount - 2);
  
  // Draw bars
  for (let i = 0; i < barCount; i++) {
    const barH = maxCount > 0 ? (hist[i] / maxCount) * plotH : 0;
    const x = pad.left + (i / barCount) * plotW + 1;
    const y = pad.top + plotH - barH;
    
    distCtx.fillStyle = colors.accent;
    distCtx.globalAlpha = 0.5 + (hist[i] / maxCount) * 0.5;
    distCtx.fillRect(x, y, barW, barH);
    distCtx.globalAlpha = 1;
  }
  
  // X axis labels
  distCtx.fillStyle = colors.muted;
  distCtx.font = '9px Inter, sans-serif';
  distCtx.textAlign = 'center';
  for (let i = 0; i < barCount; i++) {
    if (barCount <= 12 || i % Math.ceil(barCount / 8) === 0) {
      const x = pad.left + (i / barCount) * plotW + barW / 2;
      distCtx.fillText(i.toString(), x, h - 6);
    }
  }
  
  // Y axis label
  distCtx.save();
  distCtx.translate(8, pad.top + plotH / 2);
  distCtx.rotate(-Math.PI / 2);
  distCtx.textAlign = 'center';
  distCtx.font = '9px Inter, sans-serif';
  distCtx.fillStyle = colors.muted;
  distCtx.fillText('pairs', 0, 0);
  distCtx.restore();
  
  // X axis title
  distCtx.textAlign = 'center';
  distCtx.fillText('graph distance', w / 2, h - 1);
  
  // Stats annotation
  distCtx.textAlign = 'right';
  distCtx.font = '9px Inter, sans-serif';
  distCtx.fillStyle = colors.text;
  distCtx.fillText('d\u0305=' + result.meanDist.toFixed(2) + '  \u00d8=' + result.diameter, w - pad.right, 10);
  
  // Update description
  const descEl = document.getElementById('bev-distance-desc');
  if (descEl) {
    descEl.textContent = result.totalPairs + ' pairs · mean distance ' + 
      result.meanDist.toFixed(2) + ' · diameter ' + result.diameter;
  }
}
"""

# Insert before the final </script> tag
final_script_close = content.rfind('</script>')
if final_script_close >= 0:
    content = content[:final_script_close] + '\n' + bevolution_js + '\n' + content[final_script_close:]

# ═══════════════════════════════════════════════════════════════
# 9. Hook into view switching to show/hide bevolution container
# ═══════════════════════════════════════════════════════════════

# Find the view tab click handler and add bevolution logic
old_view_handler = """    currentView = tab.dataset.view;
    updateViewVisibility();
    if (currentSystem) fitCamera(currentSystem);"""

new_view_handler = """    currentView = tab.dataset.view;
    updateViewVisibility();
    // Show/hide bevolution container
    if (bevContainer) {
      bevContainer.classList.toggle('active', currentView === 'bevolution');
      if (currentView === 'bevolution') {
        bevInit();
      }
    }
    // Show/hide distance histogram section
    const distSection = document.getElementById('bev-distance-section');
    if (distSection) distSection.classList.toggle('active', currentView === 'bevolution');
    if (currentView !== 'bevolution' && currentSystem) fitCamera(currentSystem);"""

content = content.replace(old_view_handler, new_view_handler)

# ═══════════════════════════════════════════════════════════════
# 10. Hook into scene rebuilds to clear bevolution cache
# ═══════════════════════════════════════════════════════════════

# After buildScene rebuilds, reinit bevolution if active
old_rebuild_hook = "if (typeof drawIntensityPlot === 'function'"
idx = content.find(old_rebuild_hook)
if idx >= 0:
    # Find the beginning of the line
    line_start = content.rfind('\n', 0, idx) + 1
    insert_text = "    // Reinit branchial evolution if active\n    bevLayoutCache.clear();\n    if (currentView === 'bevolution') bevInit();\n\n"
    content = content[:line_start] + insert_text + content[line_start:]

# ═══════════════════════════════════════════════════════════════
# 11. Handle resize for bevolution canvas
# ═══════════════════════════════════════════════════════════════

resize_hook = """
// Resize handler for bevolution canvas
window.addEventListener('resize', () => {
  if (currentView === 'bevolution') {
    const sys = typeof window._currentSystem === 'function' ? window._currentSystem() : currentSystem;
    if (sys) bevDrawGraph(sys.buildBranchialForStep(bevCurrentStep));
  }
});
"""

# Insert near the end, before the closing script tag
final_script_close = content.rfind('</script>')
if final_script_close >= 0:
    content = content[:final_script_close] + resize_hook + '\n' + content[final_script_close:]

# ═══════════════════════════════════════════════════════════════
# 12. Update any scenes referencing 'both' view
# ═══════════════════════════════════════════════════════════════

# Search for view: 'both' in scene definitions and update
content = content.replace("view: 'both'", "view: 'branchial'")

# ═══════════════════════════════════════════════════════════════
# 13. Update applyScene to handle bevolution view  
# ═══════════════════════════════════════════════════════════════

# Find applyScene and make sure it handles the new view
# The existing applyScene already handles arbitrary view values via the tab click simulation

# ═══════════════════════════════════════════════════════════════
# WRITE OUTPUT
# ═══════════════════════════════════════════════════════════════

with open(INPUT, 'w') as f:
    f.write(content)

lines = content.count('\n')
print(f"Branchial Evolution applied. File: {len(content)} chars, {lines} lines")
print("Changes:")
print("  - Overlay tab → B-Evolution tab")
print("  - Added per-step branchial graph computation")
print("  - Added branchial evolution canvas with force-directed layout")
print("  - Added step scrubber (slider + play/pause + keyboard)")
print("  - Added branchial distance histogram")
print("  - Removed all 'both' view logic")
print("  - Dark mode support included")
