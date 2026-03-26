#!/usr/bin/env python3
"""
Gorard Physics Corrections — all 8 fixes in one script.

Phase 1: Quick wins
  1a. Dimension estimator: log-log linear regression
  1b. Light cone: restrict future atoms to created-only
  1c. Relabel Ricci curvature in UI

Phase 2: Physics corrections
  2a. Real Ollivier-Ricci via Sinkhorn W1
  2b. Fubini-Study: future causal cones
  2c. Coarse-graining threshold: log scale, remove 0.3 hack

Phase 3: Architecture
  3a. Bridge multiway + spacetime for branchial-spatial queries
  3b. Entanglement threads: branchially close + spatially distant
"""

import re

HTML_PATH = 'index.html'

with open(HTML_PATH, 'r') as f:
    html = f.read()

original = html

# ═══════════════════════════════════════════════════════════════
# PHASE 1a: Fix global dimension estimator — log-log linear regression
# ═══════════════════════════════════════════════════════════════

old_global_dim = '''  // Estimate dimension: d = Δlog(V) / Δlog(r)
  // Use the middle range (avoid r=0,1 and near-max r)
  const dimEstimates = [];
  for (let r = 2; r < avgVolume.length - 1; r++) {
    if (avgVolume[r] > avgVolume[r-1] && avgVolume[r-1] > 0) {
      const logVr = Math.log(avgVolume[r]);
      const logVr1 = Math.log(avgVolume[r-1]);
      const logR = Math.log(r);
      const logR1 = Math.log(r - 1);
      if (logR > logR1) {
        const d = (logVr - logVr1) / (logR - logR1);
        dimEstimates.push({ r, d });
      }
    }
  }

  // Average dimension in the "good" range (middle 60%)
  let dimension = null;
  if (dimEstimates.length > 0) {
    const start = Math.floor(dimEstimates.length * 0.2);
    const end = Math.ceil(dimEstimates.length * 0.8);
    const mid = dimEstimates.slice(start, end);
    if (mid.length > 0) {
      dimension = mid.reduce((s, d) => s + d.d, 0) / mid.length;
    } else {
      dimension = dimEstimates.reduce((s, d) => s + d.d, 0) / dimEstimates.length;
    }
  }'''

new_global_dim = '''  // Estimate dimension via log-log linear regression: V(r) ~ r^d
  // Fit log(V) = d * log(r) + c using least squares over the growth range
  // (Gorard-correct: avoids noisy point-to-point numerical derivatives)
  const dimEstimates = [];
  const logR_arr = [], logV_arr = [];
  for (let r = 2; r < avgVolume.length; r++) {
    if (avgVolume[r] > avgVolume[r-1] && avgVolume[r] > 1) {
      logR_arr.push(Math.log(r));
      logV_arr.push(Math.log(avgVolume[r]));
      // Also store per-point estimates for the chart
      if (r >= 2 && avgVolume[r-1] > 0) {
        const logVr = Math.log(avgVolume[r]);
        const logVr1 = Math.log(avgVolume[r-1]);
        const logR = Math.log(r);
        const logR1 = Math.log(r - 1);
        if (logR > logR1) {
          dimEstimates.push({ r, d: (logVr - logVr1) / (logR - logR1) });
        }
      }
    }
  }

  // Least-squares fit: d = (n*Σ(xy) - Σx*Σy) / (n*Σ(x²) - (Σx)²)
  let dimension = null;
  if (logR_arr.length >= 2) {
    const n = logR_arr.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += logR_arr[i];
      sumY += logV_arr[i];
      sumXY += logR_arr[i] * logV_arr[i];
      sumX2 += logR_arr[i] * logR_arr[i];
    }
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) > 1e-10) {
      dimension = (n * sumXY - sumX * sumY) / denom;
    }
  } else if (dimEstimates.length > 0) {
    // Fallback for very small graphs
    dimension = dimEstimates.reduce((s, d) => s + d.d, 0) / dimEstimates.length;
  }'''

assert old_global_dim in html, "Could not find global dimension estimator"
html = html.replace(old_global_dim, new_global_dim)
print("✓ Phase 1a: Fixed global dimension estimator (log-log regression)")

# ═══════════════════════════════════════════════════════════════
# PHASE 1a (continued): Fix local dimension estimator
# ═══════════════════════════════════════════════════════════════

old_local_dim = '''  // Estimate local dimension: average Δlog(V)/Δlog(r) for r >= 2
  const dims = [];
  for (let r = 2; r < volumes.length; r++) {
    if (volumes[r] > volumes[r-1] && volumes[r-1] > 0) {
      const d = (Math.log(volumes[r]) - Math.log(volumes[r-1])) / (Math.log(r) - Math.log(r-1));
      dims.push(d);
    }
  }
  if (dims.length === 0) return 2.0; // default
  return dims.reduce((s, d) => s + d, 0) / dims.length;'''

new_local_dim = '''  // Estimate local dimension via log-log linear regression: V(r) ~ r^d
  // Least-squares fit avoids noisy consecutive-point derivatives
  const logR = [], logV = [];
  for (let r = 2; r < volumes.length; r++) {
    if (volumes[r] > volumes[r-1] && volumes[r] > 1) {
      logR.push(Math.log(r));
      logV.push(Math.log(volumes[r]));
    }
  }
  if (logR.length < 2) return 2.0; // default for tiny neighborhoods
  const n = logR.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += logR[i]; sumY += logV[i];
    sumXY += logR[i] * logV[i]; sumX2 += logR[i] * logR[i];
  }
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return 2.0;
  return (n * sumXY - sumX * sumY) / denom;'''

assert old_local_dim in html, "Could not find local dimension estimator"
html = html.replace(old_local_dim, new_local_dim)
print("✓ Phase 1a: Fixed local dimension estimator (log-log regression)")


# ═══════════════════════════════════════════════════════════════
# PHASE 1b: Fix light cone — future atoms from created edges only
# ═══════════════════════════════════════════════════════════════

old_lightcone_future = '''  const futureAtoms = new Set();
  const pastAtoms = new Set();
  for (const evtId of futureCone) {
    const evt = stResult.events[evtId];
    for (const edge of evt.createdEdges) {
      for (const a of edge) futureAtoms.add(a);
    }
    for (const edge of evt.destroyedEdges) {
      for (const a of edge) futureAtoms.add(a);
    }
  }
  for (const evtId of pastCone) {
    const evt = stResult.events[evtId];
    for (const edge of evt.createdEdges) {
      for (const a of edge) pastAtoms.add(a);
    }
    for (const edge of evt.destroyedEdges) {
      for (const a of edge) pastAtoms.add(a);
    }
  }'''

new_lightcone_future = '''  // Future cone: only atoms CREATED by downstream events
  // (not consumed atoms, which may predate the causal influence)
  // Past cone: only atoms DESTROYED by upstream events
  // (these are the atoms that contributed causal input)
  const futureAtoms = new Set();
  const pastAtoms = new Set();
  for (const evtId of futureCone) {
    const evt = stResult.events[evtId];
    for (const edge of evt.createdEdges) {
      for (const a of edge) futureAtoms.add(a);
    }
  }
  for (const evtId of pastCone) {
    const evt = stResult.events[evtId];
    for (const edge of evt.destroyedEdges) {
      for (const a of edge) pastAtoms.add(a);
    }
  }'''

assert old_lightcone_future in html, "Could not find light cone atom mapping"
html = html.replace(old_lightcone_future, new_lightcone_future)
print("✓ Phase 1b: Fixed light cone atom mapping (future=created only, past=destroyed only)")


# ═══════════════════════════════════════════════════════════════
# PHASE 1c: Relabel Ricci curvature in UI
# ═══════════════════════════════════════════════════════════════

# Tool title
old_ricci_title = '''Discrete Ricci Curvature <button class="tool-toggle" id="toggle-ricci" title="Ollivier-Ricci curvature overlay on the evolution graph"></button>'''
new_ricci_title = '''Discrete Ricci Curvature <button class="tool-toggle" id="toggle-ricci" title="Ollivier-Ricci curvature (Sinkhorn W₁) on the evolution graph"></button>'''
assert old_ricci_title in html, "Could not find Ricci title"
html = html.replace(old_ricci_title, new_ricci_title)

# Tool description
old_ricci_desc = '''Ollivier-Ricci curvature on the multiway graph. Blue = negative (expanding space), red = positive (gravitational well). Computed by comparing BFS ball growth to expected flat-graph growth.'''
new_ricci_desc = '''Ollivier-Ricci curvature on the multiway graph via Sinkhorn-regularized W&#x2081; optimal transport between neighborhood measures. Blue &#x3BA; &lt; 0 = negative curvature (expanding space), red &#x3BA; &gt; 0 = positive (gravitational well).'''
assert old_ricci_desc in html, "Could not find Ricci description"
html = html.replace(old_ricci_desc, new_ricci_desc)
print("✓ Phase 1c: Relabeled Ricci curvature UI text")


# ═══════════════════════════════════════════════════════════════
# PHASE 2a: Real Ollivier-Ricci via Sinkhorn W1 distance
# ═══════════════════════════════════════════════════════════════

old_ricci_fn = '''function computeRicciCurvature() {
  const sys = currentSystem;
  if (!sys || sys.nodes.length < 3) return null;
  
  sys._ensureAdjacencyMaps();
  
  // Build undirected adjacency for the multiway graph
  const adj = new Map();
  for (const e of sys.edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    if (!adj.has(e.to)) adj.set(e.to, new Set());
    adj.get(e.from).add(e.to);
    adj.get(e.to).add(e.from);
  }
  // Also include branchial edges
  for (const be of sys.branchialEdges) {
    if (!adj.has(be.from)) adj.set(be.from, new Set());
    if (!adj.has(be.to)) adj.set(be.to, new Set());
    adj.get(be.from).add(be.to);
    adj.get(be.to).add(be.from);
  }
  
  const curvature = new Map();
  const maxRadius = 3; // BFS radius for ball computation
  
  for (let i = 0; i < sys.nodes.length; i++) {
    const nodeId = i;
    const neighbors = adj.get(nodeId);
    if (!neighbors || neighbors.size === 0) {
      curvature.set(nodeId, 0);
      continue;
    }
    
    // BFS balls at radius 1, 2, 3
    const ballSizes = [1]; // radius 0 = just the node
    const visited = new Set([nodeId]);
    let frontier = new Set([nodeId]);
    
    for (let r = 1; r <= maxRadius; r++) {
      const nextFrontier = new Set();
      for (const nid of frontier) {
        const nbrs = adj.get(nid);
        if (nbrs) {
          for (const nb of nbrs) {
            if (!visited.has(nb)) {
              visited.add(nb);
              nextFrontier.add(nb);
            }
          }
        }
      }
      ballSizes.push(visited.size);
      frontier = nextFrontier;
      if (frontier.size === 0) break;
    }
    
    // In a d-dimensional flat graph, ball volume ~ r^d
    // Growth ratio: |B(r)| / |B(r-1)|
    // Positive curvature: growth ratio decreasing (focusing)
    // Negative curvature: growth ratio increasing (defocusing)
    
    if (ballSizes.length < 3) {
      curvature.set(nodeId, 0);
      continue;
    }
    
    // Compute average degree for expected flat growth
    const degree = neighbors.size;
    
    // Compare actual growth to expected flat-space growth
    // Expected flat growth at radius r: ~ degree * (degree-1)^(r-1) for tree-like
    // Actual: ballSizes[r]
    // Ricci curvature ~ 1 - (actual_growth / expected_growth)
    
    let kappa = 0;
    if (ballSizes.length >= 3) {
      const actualGrowth2 = ballSizes[2] / Math.max(ballSizes[1], 1);
      const expectedGrowth = Math.max(degree, 1); // tree-like expectation
      
      // Ollivier-Ricci approximation: kappa ≈ 1 - W1(mu_x, mu_y) / d(x,y)
      // Simplified: curvature ≈ 1 - actualGrowth / expectedGrowth
      kappa = 1 - actualGrowth2 / expectedGrowth;
    }
    
    if (ballSizes.length >= 4) {
      // Refine with radius-3 data
      const growth3 = ballSizes[3] / Math.max(ballSizes[2], 1);
      const growth2 = ballSizes[2] / Math.max(ballSizes[1], 1);
      // Focusing = growth slowing down (positive curvature)
      // Defocusing = growth speeding up (negative curvature)
      const growthAccel = growth3 - growth2;
      kappa = -growthAccel / Math.max(Math.abs(growth2), 0.5);
    }
    
    // Clamp to [-1, 1]
    kappa = Math.max(-1, Math.min(1, kappa));
    curvature.set(nodeId, kappa);
  }
  
  return curvature;'''

new_ricci_fn = '''function computeRicciCurvature() {
  // Ollivier-Ricci curvature via Sinkhorn-regularized W₁ optimal transport.
  // For each edge (x,y), κ(x,y) = 1 - W₁(μ_x, μ_y) / d(x,y)
  // where μ_x is uniform on the closed 1-ball {x} ∪ N(x).
  // The W₁ distance uses BFS shortest-path as ground metric.
  
  const sys = currentSystem;
  if (!sys || sys.nodes.length < 3) return null;
  
  sys._ensureAdjacencyMaps();
  
  // Build undirected adjacency
  const adj = new Map();
  for (const e of sys.edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    if (!adj.has(e.to)) adj.set(e.to, new Set());
    adj.get(e.from).add(e.to);
    adj.get(e.to).add(e.from);
  }
  for (const be of sys.branchialEdges) {
    if (!adj.has(be.from)) adj.set(be.from, new Set());
    if (!adj.has(be.to)) adj.set(be.to, new Set());
    adj.get(be.from).add(be.to);
    adj.get(be.to).add(be.from);
  }
  
  // BFS shortest path between two nodes (with cutoff)
  function bfsDist(a, b, maxD = 6) {
    if (a === b) return 0;
    const visited = new Map([[a, 0]]);
    const q = [a];
    let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      const d = visited.get(cur);
      if (d >= maxD) continue;
      const nbrs = adj.get(cur);
      if (!nbrs) continue;
      for (const nb of nbrs) {
        if (!visited.has(nb)) {
          if (nb === b) return d + 1;
          visited.set(nb, d + 1);
          q.push(nb);
        }
      }
    }
    return maxD + 1; // unreachable
  }
  
  // Sinkhorn iteration for approximate W₁
  // Given cost matrix C (m×n), source weights a (m), target weights b (n)
  // Returns approximate W₁ = Σ_{ij} P_{ij} * C_{ij}
  function sinkhornW1(C, a, b, epsilon = 0.1, maxIter = 50) {
    const m = a.length, n = b.length;
    // K_{ij} = exp(-C_{ij} / epsilon)
    const K = new Float64Array(m * n);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        K[i * n + j] = Math.exp(-C[i * n + j] / epsilon);
      }
    }
    
    // Initialize dual variables
    const u = new Float64Array(m).fill(1.0 / m);
    const v = new Float64Array(n).fill(1.0 / n);
    
    for (let iter = 0; iter < maxIter; iter++) {
      // u_i = a_i / (Σ_j K_{ij} * v_j)
      for (let i = 0; i < m; i++) {
        let s = 0;
        for (let j = 0; j < n; j++) s += K[i * n + j] * v[j];
        u[i] = s > 1e-300 ? a[i] / s : a[i];
      }
      // v_j = b_j / (Σ_i K_{ij} * u_i)
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let i = 0; i < m; i++) s += K[i * n + j] * u[i];
        v[j] = s > 1e-300 ? b[j] / s : b[j];
      }
    }
    
    // Transport plan P_{ij} = u_i * K_{ij} * v_j
    // W₁ ≈ Σ_{ij} P_{ij} * C_{ij}
    let w1 = 0;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        const pij = u[i] * K[i * n + j] * v[j];
        w1 += pij * C[i * n + j];
      }
    }
    return w1;
  }
  
  // Compute per-node curvature: average κ over incident edges
  const curvature = new Map();
  const edgeCurvatures = new Map(); // edge key -> kappa
  
  // Collect all edges to compute curvature on
  const edgeSet = new Set();
  for (const e of sys.edges) {
    const key = Math.min(e.from, e.to) + ',' + Math.max(e.from, e.to);
    edgeSet.add(key);
  }
  for (const be of sys.branchialEdges) {
    const key = Math.min(be.from, be.to) + ',' + Math.max(be.from, be.to);
    edgeSet.add(key);
  }
  
  // Performance guard: sample edges for large graphs
  let edgeList = [...edgeSet].map(k => { const [a, b] = k.split(',').map(Number); return [a, b]; });
  if (edgeList.length > 600) {
    // Random sample
    edgeList.sort(() => Math.random() - 0.5);
    edgeList = edgeList.slice(0, 600);
  }
  
  for (const [x, y] of edgeList) {
    const nbrsX = adj.get(x);
    const nbrsY = adj.get(y);
    if (!nbrsX || !nbrsY) continue;
    
    // Closed 1-balls: {x} ∪ N(x) and {y} ∪ N(y)
    const ballX = [x, ...nbrsX];
    const ballY = [y, ...nbrsY];
    const mX = ballX.length, mY = ballY.length;
    
    // Uniform measures
    const muX = new Float64Array(mX).fill(1.0 / mX);
    const muY = new Float64Array(mY).fill(1.0 / mY);
    
    // Cost matrix: BFS distance between each pair
    const C = new Float64Array(mX * mY);
    for (let i = 0; i < mX; i++) {
      for (let j = 0; j < mY; j++) {
        C[i * mY + j] = bfsDist(ballX[i], ballY[j]);
      }
    }
    
    // Regularization epsilon scales with graph size
    const eps = Math.max(0.05, 0.5 / Math.max(mX, mY));
    const w1 = sinkhornW1(C, muX, muY, eps, 40);
    
    // d(x,y) = 1 for adjacent nodes
    const kappa = 1 - w1; // κ(x,y) = 1 - W₁(μ_x, μ_y) / d(x,y)
    
    const key = Math.min(x, y) + ',' + Math.max(x, y);
    edgeCurvatures.set(key, kappa);
  }
  
  // Aggregate: node curvature = average of incident edge curvatures
  for (let i = 0; i < sys.nodes.length; i++) {
    const nbrs = adj.get(i);
    if (!nbrs || nbrs.size === 0) {
      curvature.set(i, 0);
      continue;
    }
    let sum = 0, count = 0;
    for (const nb of nbrs) {
      const key = Math.min(i, nb) + ',' + Math.max(i, nb);
      if (edgeCurvatures.has(key)) {
        sum += edgeCurvatures.get(key);
        count++;
      }
    }
    const kappa = count > 0 ? sum / count : 0;
    curvature.set(i, Math.max(-1, Math.min(1, kappa)));
  }
  
  return curvature;'''

assert old_ricci_fn in html, "Could not find computeRicciCurvature function"
html = html.replace(old_ricci_fn, new_ricci_fn)
print("✓ Phase 2a: Replaced ball-growth heuristic with Sinkhorn W₁ Ollivier-Ricci")


# ═══════════════════════════════════════════════════════════════
# PHASE 2b: Fix Fubini-Study to use future causal cones
# ═══════════════════════════════════════════════════════════════

old_fubini = '''  // ─── FUBINI-STUDY METRIC ───
  // The proper metric on branchial space: computed from causal cone overlap.

  fubiniStudyDistance(idA, idB) {
    const ancestorsA = this.traceAncestry(idA);
    const ancestorsB = this.traceAncestry(idB);
    let overlap = 0;
    for (const a of ancestorsA) { if (ancestorsB.has(a)) overlap++; }
    const norm = Math.sqrt(ancestorsA.size * ancestorsB.size);
    const ip = norm > 0 ? overlap / norm : 0;
    return Math.acos(Math.min(1, Math.max(0, ip)));
  }'''

new_fubini = '''  // ─── FUBINI-STUDY METRIC ───
  // The proper metric on branchial space: computed from FUTURE causal cone overlap.
  // Two states are branchially close when their future causal cones overlap significantly.
  // Inner product = |C_future(a) ∩ C_future(b)| / sqrt(|C_future(a)| * |C_future(b)|)

  _futureCausalCone(nodeId) {
    // BFS forward through children to find all future-reachable nodes
    this._ensureAdjacencyMaps();
    const children = this._parentToChildren;
    const cone = new Set([nodeId]);
    const q = [nodeId];
    let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      const ch = children.get(cur) || [];
      for (const c of ch) {
        if (!cone.has(c)) {
          cone.add(c);
          q.push(c);
        }
      }
    }
    return cone;
  }

  fubiniStudyDistance(idA, idB) {
    const coneA = this._futureCausalCone(idA);
    const coneB = this._futureCausalCone(idB);
    let overlap = 0;
    for (const n of coneA) { if (coneB.has(n)) overlap++; }
    const norm = Math.sqrt(coneA.size * coneB.size);
    const ip = norm > 0 ? overlap / norm : 0;
    return Math.acos(Math.min(1, Math.max(0, ip)));
  }'''

assert old_fubini in html, "Could not find Fubini-Study implementation"
html = html.replace(old_fubini, new_fubini)
print("✓ Phase 2b: Fixed Fubini-Study to use future causal cones")


# ═══════════════════════════════════════════════════════════════
# PHASE 2c: Fix coarse-graining threshold and remove 0.3 hack
# ═══════════════════════════════════════════════════════════════

# Fix 1: Replace linear threshold with logarithmic
old_threshold = '''      // Build pairs using causal subgraph distance
      const causalThreshold = threshold * 0.25; // slider 1-8 → 0.25-2.0'''
new_threshold = '''      // Build pairs using causal subgraph distance
      // Logarithmic mapping: observer resolution scales sub-linearly
      const causalThreshold = Math.log2(1 + threshold) * 0.5; // slider 1-8 → 0.5-1.58'''
assert old_threshold in html, "Could not find causal threshold mapping"
html = html.replace(old_threshold, new_threshold)

# Fix 2: Remove ad-hoc 0.3 overlap penalty
old_overlap = '''      const setA = new Set(nextA), setB = new Set(nextB);
      let overlap = 0;
      for (const n of setA) { if (setB.has(n)) overlap++; }
      const unionSize = new Set([...nextA, ...nextB]).size;
      if (unionSize > 0) totalDist -= 0.3 * (overlap / unionSize);'''
new_overlap = '''      // Jaccard convergence bonus: reduce distance when causal futures overlap
      // (shared descendants = converging evolution = more similar causal structure)
      const setA = new Set(nextA), setB = new Set(nextB);
      let overlap = 0;
      for (const n of setA) { if (setB.has(n)) overlap++; }
      const unionSize = new Set([...nextA, ...nextB]).size;
      if (unionSize > 0) {
        // Jaccard similarity as convergence measure (theoretically grounded)
        const jaccard = overlap / unionSize;
        totalDist *= (1 - jaccard); // multiplicative reduction: full overlap → zero distance
      }'''
assert old_overlap in html, "Could not find overlap penalty"
html = html.replace(old_overlap, new_overlap)
print("✓ Phase 2c: Fixed coarse-graining (log threshold, Jaccard convergence)")


# ═══════════════════════════════════════════════════════════════
# PHASE 3a: Bridge multiway + spacetime for branchial-spatial queries
# ═══════════════════════════════════════════════════════════════
# Add a branchial distance function to the spacetime view that uses
# shared causal event structure to estimate branchial proximity.

# We'll add this right after the entanglement threads section.
# Find the insertion point.

bridge_marker = '''// ═══════════════════════════════════════════════════════════════
// SPACETIME RAYCASTING: Handle atom clicks for light cone
// ═══════════════════════════════════════════════════════════════'''

bridge_code = '''// ═══════════════════════════════════════════════════════════════
// BRIDGE: Branchial Distance in Spacetime View
// ═══════════════════════════════════════════════════════════════
// In the Wolfram model, two spatial atoms are "branchially close" when
// they share causal history — their creating events have overlapping
// causal pasts. This bridges the multiway branchial structure into
// the spacetime hypergraph view.

function computeSpacetimeBranchialDistance(atomA, atomB) {
  if (!stResult || !stResult.events) return Infinity;
  
  // Find events that created each atom
  const eventsA = new Set();
  const eventsB = new Set();
  for (let i = 0; i < stResult.events.length; i++) {
    const evt = stResult.events[i];
    for (const edge of evt.createdEdges) {
      if (edge.includes(atomA)) eventsA.add(i);
      if (edge.includes(atomB)) eventsB.add(i);
    }
  }
  
  if (eventsA.size === 0 || eventsB.size === 0) return Infinity;
  
  // Build causal backward adjacency
  const causalBackward = new Map();
  for (const ce of stResult.causalEdges) {
    if (!causalBackward.has(ce.to)) causalBackward.set(ce.to, []);
    causalBackward.get(ce.to).push(ce.from);
  }
  
  // Compute past causal cones for each atom's events
  function pastCone(eventSet) {
    const cone = new Set(eventSet);
    const q = [...eventSet];
    let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      const prev = causalBackward.get(cur) || [];
      for (const p of prev) {
        if (!cone.has(p)) { cone.add(p); q.push(p); }
      }
    }
    return cone;
  }
  
  const coneA = pastCone(eventsA);
  const coneB = pastCone(eventsB);
  
  // Branchial distance ~ 1 - Jaccard(pastConeA, pastConeB)
  // High overlap = branchially close (shared causal history)
  let overlap = 0;
  for (const e of coneA) { if (coneB.has(e)) overlap++; }
  const unionSize = coneA.size + coneB.size - overlap;
  
  if (unionSize === 0) return 0;
  const jaccard = overlap / unionSize;
  
  // Return a distance: 0 = identical causal history, 1 = no shared history
  return 1 - jaccard;
}

// Export for entanglement threads
window._computeSTBranchialDist = computeSpacetimeBranchialDistance;

''' + bridge_marker

assert bridge_marker in html, "Could not find spacetime click handler marker"
html = html.replace(bridge_marker, bridge_code)
print("✓ Phase 3a: Added branchial distance bridge for spacetime view")


# ═══════════════════════════════════════════════════════════════
# PHASE 3b: Fix entanglement threads — branchially close + spatially distant
# ═══════════════════════════════════════════════════════════════

old_entangle_fn = '''function showEntanglementThreads() {
  clearEntanglementThreads();
  if (!stSpatialGraph || !stPositions || !stResult) return;

  const { atoms, adjacency } = stSpatialGraph;
  const n = atoms.length;
  if (n < 10) return;

  // Find pairs that share a hyperedge but are far apart in the spatial BFS graph
  // Build atom→hyperedge membership
  const activeEdges = stResult.edges;
  const atomToEdges = new Map();
  for (let ei = 0; ei < activeEdges.length; ei++) {
    const edge = activeEdges[ei];
    for (const a of edge) {
      if (!atomToEdges.has(a)) atomToEdges.set(a, []);
      atomToEdges.get(a).push(ei);
    }
  }

  // For each pair sharing a hyperedge, compute BFS distance
  const threads = []; // { from: atom, to: atom, bfsDist }
  const checkedPairs = new Set();
  const MIN_BFS_DIST = Math.min(4, Math.max(2, Math.floor(Math.sqrt(n) / 3)));

  for (const edge of activeEdges) {
    for (let i = 0; i < edge.length; i++) {
      for (let j = i + 1; j < edge.length; j++) {
        const a = edge[i], b = edge[j];
        const key = Math.min(a, b) + ',' + Math.max(a, b);
        if (checkedPairs.has(key)) continue;
        checkedPairs.add(key);

        // BFS from a to b in spatial graph (with cutoff)
        const maxDist = MIN_BFS_DIST + 3;
        const visited = new Map([[a, 0]]);
        const q = [a];
        let found = false;
        let dist = maxDist + 1;
        let qi = 0;
        while (qi < q.length) {
          const cur = q[qi++];
          const curD = visited.get(cur);
          if (curD >= maxDist) continue;
          const nbrs = adjacency.get(cur);
          if (!nbrs) continue;
          for (const nb of nbrs) {
            if (!visited.has(nb)) {
              visited.set(nb, curD + 1);
              if (nb === b) { dist = curD + 1; found = true; break; }
              q.push(nb);
            }
          }
          if (found) break;
        }

        if (!found) dist = maxDist + 1; // unreachable within cutoff

        if (dist >= MIN_BFS_DIST) {
          threads.push({ from: a, to: b, bfsDist: dist });
        }
      }
    }
  }'''

new_entangle_fn = '''function showEntanglementThreads() {
  clearEntanglementThreads();
  if (!stSpatialGraph || !stPositions || !stResult) return;

  const { atoms, adjacency } = stSpatialGraph;
  const n = atoms.length;
  if (n < 10) return;

  // Gorard-correct entanglement: find atom pairs that are
  // BRANCHIALLY CLOSE (shared causal history) but SPATIALLY DISTANT
  // (far apart in the spatial hypergraph BFS metric).
  // This is the Wolfram model definition of quantum entanglement:
  // correlations that are "nearby" in branchial space but "far" in physical space.

  // BFS spatial distance helper
  function bfsSpatialDist(a, b, maxD) {
    if (a === b) return 0;
    const visited = new Map([[a, 0]]);
    const q = [a];
    let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      const d = visited.get(cur);
      if (d >= maxD) continue;
      const nbrs = adjacency.get(cur);
      if (!nbrs) continue;
      for (const nb of nbrs) {
        if (!visited.has(nb)) {
          if (nb === b) return d + 1;
          visited.set(nb, d + 1);
          q.push(nb);
        }
      }
    }
    return maxD + 1;
  }

  // Build per-atom causal history (past cone of creating events)
  const causalBackward = new Map();
  for (const ce of stResult.causalEdges) {
    if (!causalBackward.has(ce.to)) causalBackward.set(ce.to, []);
    causalBackward.get(ce.to).push(ce.from);
  }

  // Map each atom to the events that created it
  const atomCreationEvents = new Map();
  for (let i = 0; i < stResult.events.length; i++) {
    const evt = stResult.events[i];
    for (const edge of evt.createdEdges) {
      for (const a of edge) {
        if (!atomCreationEvents.has(a)) atomCreationEvents.set(a, new Set());
        atomCreationEvents.get(a).add(i);
      }
    }
  }

  // Compute past cone for a set of events
  function pastCone(eventSet) {
    const cone = new Set(eventSet);
    const q = [...eventSet];
    let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      const prev = causalBackward.get(cur) || [];
      for (const p of prev) {
        if (!cone.has(p)) { cone.add(p); q.push(p); }
      }
    }
    return cone;
  }

  // Cache past cones per atom (expensive, so sample)
  const sampleSize = Math.min(n, 150);
  const sampleAtoms = n <= sampleSize ? [...atoms] :
    [...atoms].sort(() => Math.random() - 0.5).slice(0, sampleSize);

  const atomCones = new Map();
  for (const atom of sampleAtoms) {
    const evts = atomCreationEvents.get(atom);
    if (evts && evts.size > 0) {
      atomCones.set(atom, pastCone(evts));
    }
  }

  // Find entangled pairs: branchially close (high Jaccard) + spatially distant
  const threads = [];
  const checkedPairs = new Set();
  const MIN_SPATIAL_DIST = Math.min(4, Math.max(2, Math.floor(Math.sqrt(n) / 3)));
  const MAX_BRANCHIAL_DIST = 0.5; // Jaccard distance < 0.5 = branchially close
  const maxSpatial = MIN_SPATIAL_DIST + 3;
  const sampledList = [...atomCones.keys()];

  for (let i = 0; i < sampledList.length; i++) {
    for (let j = i + 1; j < sampledList.length; j++) {
      const a = sampledList[i], b = sampledList[j];
      const key = Math.min(a, b) + ',' + Math.max(a, b);
      if (checkedPairs.has(key)) continue;
      checkedPairs.add(key);

      // Quick spatial distance check first (cheaper)
      const spatialDist = bfsSpatialDist(a, b, maxSpatial);
      if (spatialDist < MIN_SPATIAL_DIST) continue; // too close spatially

      // Branchial distance via causal cone Jaccard
      const coneA = atomCones.get(a);
      const coneB = atomCones.get(b);
      if (!coneA || !coneB || coneA.size === 0 || coneB.size === 0) continue;

      let overlap = 0;
      for (const e of coneA) { if (coneB.has(e)) overlap++; }
      const unionSize = coneA.size + coneB.size - overlap;
      const branchialDist = unionSize > 0 ? 1 - overlap / unionSize : 1;

      if (branchialDist < MAX_BRANCHIAL_DIST) {
        threads.push({
          from: a, to: b,
          bfsDist: spatialDist,
          branchialDist: branchialDist,
          entanglementStrength: (1 - branchialDist) * spatialDist // higher = more entangled
        });
      }
    }
    // Performance guard
    if (threads.length > 200) break;
  }'''

assert old_entangle_fn in html, "Could not find showEntanglementThreads function"
html = html.replace(old_entangle_fn, new_entangle_fn)
print("✓ Phase 3b: Fixed entanglement threads (branchially close + spatially distant)")

# Also fix the thread rendering to use entanglement strength for color
old_thread_color = '''      // Color: purple for short entanglement, magenta for long'''
new_thread_color = '''      // Color: brighter for stronger entanglement (high branchial overlap + high spatial distance)'''
assert old_thread_color in html, "Could not find thread color comment"
html = html.replace(old_thread_color, new_thread_color)

# Update the info display to show branchial distance
old_entangle_info = '''  infoEl.innerHTML = `<span>${displayThreads.length}</span> entanglement threads found (BFS distance ≥ ${MIN_BFS_DIST})`;'''
new_entangle_info = '''  infoEl.innerHTML = `<span>${displayThreads.length}</span> entanglement threads (branchially close, spatially ≥ ${MIN_SPATIAL_DIST} hops)`;'''
assert old_entangle_info in html, "Could not find entangle info display"
html = html.replace(old_entangle_info, new_entangle_info)
print("✓ Phase 3b: Updated entanglement info display")


# ═══════════════════════════════════════════════════════════════
# Also update the entanglement "no threads found" message
# ═══════════════════════════════════════════════════════════════

old_no_threads = '''    document.getElementById('st-entangle-info').innerHTML = 'No entanglement threads found (spatial graph too small or uniform).';'''
new_no_threads = '''    document.getElementById('st-entangle-info').innerHTML = 'No entanglement threads found (no branchially-close + spatially-distant pairs detected).';'''
assert old_no_threads in html, "Could not find no-threads message"
html = html.replace(old_no_threads, new_no_threads)

# Update the entanglement tool description in the UI
old_entangle_desc = '''Click to reveal atom pairs that share a hyperedge but are far apart in the spatial graph — evidence of non-local quantum correlations threading through branchial space.'''
new_entangle_desc_search = 'Click to reveal atom pairs that share a hyperedge but are far apart in the spatial graph'
# Let's find the exact text
if old_entangle_desc in html:
    new_entangle_desc = '''Click to reveal atom pairs that are branchially close (shared causal history) but spatially distant — the Wolfram model definition of quantum entanglement. Threads connect regions correlated through branchial space.'''
    html = html.replace(old_entangle_desc, new_entangle_desc)
    print("✓ Updated entanglement tool description")
else:
    # Try a broader search
    import re
    m = re.search(r'(Click to reveal atom pairs.*?branchial space\.)', html)
    if m:
        html = html.replace(m.group(1), 'Click to reveal atom pairs that are branchially close (shared causal history) but spatially distant — the Wolfram model definition of quantum entanglement. Threads connect regions correlated through branchial space.')
        print("✓ Updated entanglement tool description (regex)")
    else:
        print("⚠ Could not find entanglement tool description to update")


# ═══════════════════════════════════════════════════════════════
# Write the result
# ═══════════════════════════════════════════════════════════════

with open(HTML_PATH, 'w') as f:
    f.write(html)

changes = sum(1 for a, b in zip(original, html) if a != b)
print(f"\n═══ All Gorard fixes applied. {len(html)} chars total. ═══")
