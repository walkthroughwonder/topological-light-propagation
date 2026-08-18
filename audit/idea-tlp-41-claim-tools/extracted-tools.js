'use strict';

/**
 * Run the claim-tool numeric kernels extracted from index.html
 * against a sealed MultiwaySystem instance. Node only — DOM/Three stubs.
 *
 * Tunneling only: the UI shuffles final-step ids with Math.random().
 * That shuffle is replaced by insertion-order prefix so the row is
 * reproducible. Threshold, sample cap (20), and maxPairs (50) are unchanged.
 */

const vm = require('vm');
const { extractAll } = require('./extract-from-index');

const TUNNEL_SHUFFLE = "finalIds.slice().sort(() => Math.random() - 0.5).slice(0, sampleSize)";
const TUNNEL_DETERMINISTIC = 'finalIds.slice(0, sampleSize)';

function pickObserver(sys) {
  const last = sys.stepStates.length - 1;
  const mid = Math.floor(Math.max(0, last) / 2);
  const ids = (sys.stepStates[mid] && sys.stepStates[mid].length)
    ? sys.stepStates[mid]
    : (sys.stepStates[0] || [0]);
  return ids[0];
}

function snapshotGraph(sys) {
  return {
    nodes: sys.nodes.map(n => ({ id: n.id, state: n.state, step: n.step, weight: n.weight })),
    edges: sys.edges.map(e => ({ from: e.from, to: e.to })),
    stepStates: sys.stepStates.map(ids => (ids ? ids.slice() : [])),
    branchialEdges: (sys.branchialEdges || []).map(e => ({ from: e.from, to: e.to })),
    currentStep: sys._currentStep,
    truncated: !!sys.truncated,
    observerId: pickObserver(sys),
  };
}

function buildSandbox(sys, observerId) {
  const extracted = extractAll();
  const need = [
    'findShortestPath',
    'levenshteinLike',
    'extractCore',
    'zenoObserve',
    'detectTunneling',
    'measureHolographicBound',
    'measureGeodesicDeviation',
    'detectTopologicalObstructions',
  ];
  let body = '';
  for (const name of need) {
    const fn = extracted.sources[name];
    if (!fn || !fn.found) throw new Error(`UNEXTRACTABLE: ${name}`);
    let src = fn.source;
    if (name === 'detectTunneling') {
      if (!src.includes(TUNNEL_SHUFFLE)) {
        throw new Error('detectTunneling shuffle line drifted; refuse silent rewrite');
      }
      src = src.replace(TUNNEL_SHUFFLE, TUNNEL_DETERMINISTIC);
    }
    body += src + '\n';
  }
  body += [
    'this.zenoObserve = zenoObserve;',
    'this.detectTunneling = detectTunneling;',
    'this.measureHolographicBound = measureHolographicBound;',
    'this.measureGeodesicDeviation = measureGeodesicDeviation;',
    'this.detectTopologicalObstructions = detectTopologicalObstructions;',
    'this.findShortestPath = findShortestPath;',
  ].join('\n');

  const ctx = {
    console,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    Infinity,
    NaN,
    currentSystem: sys,
    selectedObserverNodeId: observerId,
    zenoEnabled: true,
    zenoHistory: [],
    zenoObserverState: null,
    currentNodePoints: null,
    savedNodeColors: null,
    sceneNodeData: [],
    drawZenoChart() {},
    updateZenoResult() {},
  };
  vm.createContext(ctx);
  vm.runInContext(body, ctx);
  return ctx;
}

function runExtracted(sys) {
  const observerId = pickObserver(sys);
  const graph = 'multiway-string';
  const cap_graph = !!(sys.truncated || sys.nodes.length >= 5000);

  // Fresh sandbox per tool: zenoObserve rewrites selectedObserverNodeId
  // to a max-weight descendant. Later tools must not inherit that move.
  const zenoCtx = buildSandbox(sys, observerId);
  zenoCtx.zenoObserve(sys);
  const zenoLast = zenoCtx.zenoHistory[zenoCtx.zenoHistory.length - 1] || null;
  const zeno = {
    tool: 'toggle-zeno',
    formula_one_liner:
      'frozenRatio = 1 - |{v ∈ step[t] : v forward-reachable from observer node}| / |step[t]|',
    graph,
    cap_hit: cap_graph,
    observer_id: observerId,
    value: zenoLast ? {
      step: zenoLast.step,
      totalBranches: zenoLast.totalBranches,
      survivingBranches: zenoLast.survivingBranches,
      frozenRatio: zenoLast.frozenRatio,
    } : null,
  };

  const tunnelCtx = buildSandbox(sys, observerId);
  const pairs = tunnelCtx.detectTunneling();
  const avgRatio = pairs.length
    ? pairs.reduce((s, p) => s + p.ratio, 0) / pairs.length
    : 0;
  const finalStep = lastNonemptyStep(sys);
  const nFinal = (sys.stepStates[finalStep] || []).length;
  const tunnel = {
    tool: 'btn-detect-tunneling',
    formula_one_liner:
      'final-step pairs with undirected_parent-child_BFS(u,v) / branchial_BFS(u,v) > 1.5 (prefix 20, cap 50)',
    graph,
    cap_hit: cap_graph || nFinal > 20 || pairs.length >= 50,
    value: {
      n_pairs: pairs.length,
      avg_ratio: avgRatio,
      max_ratio: pairs.length ? pairs[0].ratio : 0,
      n_final: nFinal,
    },
  };

  const holoCtx = buildSandbox(sys, observerId);
  const holo = holoCtx.measureHolographicBound();
  const holoVal = !holo ? null : {
    n_radii: holo.radiusData.length,
    boundary_slope: holo.boundaryScaling.slope,
    boundary_r2: holo.boundaryScaling.r2,
    volume_slope: holo.volumeScaling.slope,
    volume_r2: holo.volumeScaling.r2,
    boundary_r2_gt_volume_r2: holo.boundaryScaling.r2 > holo.volumeScaling.r2,
  };
  const holoRow = {
    tool: 'btn-measure-holographic',
    formula_one_liner:
      'log-log OLS of |unique states in undirected BFS-ball(r)| vs |sphere(r)| and |ball(r)|; compare R²',
    graph,
    cap_hit: cap_graph,
    observer_id: observerId,
    value: holoVal,
  };

  const geoCtx = buildSandbox(sys, observerId);
  const geo = geoCtx.measureGeodesicDeviation();
  const geoList = geo || [];
  const avgDev = geoList.length
    ? geoList.reduce((s, d) => s + d.deviation, 0) / geoList.length
    : 0;
  const geoRow = {
    tool: 'btn-geodesic-deviation',
    formula_one_liner:
      'shortest-path bundles sharing first hop; deviation=(sep_last-sep_first)/max(sep_first,0.01); sep=|Δstep|+prefix-mismatch',
    graph,
    cap_hit: cap_graph,
    observer_id: observerId,
    value: {
      n_bundles: geoList.length,
      avg_deviation: avgDev,
      n_converging: geoList.filter(d => d.converging).length,
      n_diverging: geoList.filter(d => d.diverging).length,
    },
  };

  const tangleCtx = buildSandbox(sys, observerId);
  const tangles = tangleCtx.detectTopologicalObstructions() || [];
  const tangleRow = {
    tool: 'btn-detect-tangles',
    formula_one_liner:
      'exact: same state at ≥2 steps (+ descendant link); substring: most-common 2-gram in 3-hop children, ≥2 hits; top 20 by strength',
    graph,
    cap_hit: cap_graph || sys.nodes.length > 200,
    value: {
      n: tangles.length,
      n_exact: tangles.filter(t => t.type === 'exact').length,
      n_substr: tangles.filter(t => t.type === 'substring').length,
      n_connected: tangles.filter(t => t.connected).length,
      top_strength: tangles.length ? tangles[0].strength : 0,
    },
  };

  return {
    observerId,
    snapshot: snapshotGraph(sys),
    rows: [zeno, tunnel, holoRow, geoRow, tangleRow],
    tunnel_shuffle_determinized: true,
  };
}

function lastNonemptyStep(sys) {
  for (let s = sys.stepStates.length - 1; s >= 0; s--) {
    if (sys.stepStates[s] && sys.stepStates[s].length > 0) return s;
  }
  return 0;
}

module.exports = {
  pickObserver,
  snapshotGraph,
  runExtracted,
  TUNNEL_SHUFFLE,
  TUNNEL_DETERMINISTIC,
};
