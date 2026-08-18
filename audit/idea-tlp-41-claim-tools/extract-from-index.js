'use strict';

/**
 * Pull claim-tool function sources from sealed index.html.
 * Brace-match only. Does not reimplement the formulas.
 */

const fs = require('fs');
const { INDEX_PATH } = require('./load-sealed-multiway');

const TOOLS = [
  {
    tool: 'toggle-zeno',
    title: 'Quantum Zeno Effect',
    ui_copy: 'only branches containing the observed state survive',
    handler_id: 'toggle-zeno',
    functions: ['zenoObserve'],
    helpers: [],
  },
  {
    tool: 'btn-detect-tunneling',
    title: 'Tunneling Detector',
    ui_copy: 'branchial distance ≪ causal geodesic',
    handler_id: 'btn-detect-tunneling',
    functions: ['detectTunneling'],
    helpers: ['findShortestPath'],
  },
  {
    tool: 'btn-measure-holographic',
    title: 'Discrete Holographic Bound',
    ui_copy: 'branch count vs area vs volume of causal regions',
    handler_id: 'btn-measure-holographic',
    functions: ['measureHolographicBound'],
    helpers: [],
  },
  {
    tool: 'btn-geodesic-deviation',
    title: 'Geodesic Deviation',
    ui_copy: 'nearby geodesic bundles converge/diverge',
    handler_id: 'btn-geodesic-deviation',
    functions: ['measureGeodesicDeviation'],
    helpers: ['findShortestPath', 'levenshteinLike'],
  },
  {
    tool: 'btn-detect-tangles',
    title: 'Topological Obstruction / tangles',
    ui_copy: 'self-regenerating state cycles',
    handler_id: 'btn-detect-tangles',
    functions: ['detectTopologicalObstructions'],
    helpers: ['extractCore'],
  },
];

function extractNamedFunction(src, name) {
  const needle = `function ${name}(`;
  const start = src.indexOf(needle);
  if (start < 0) {
    return { name, found: false, source: null, start_line: null, end_line: null };
  }
  let depth = 0;
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error(`no body for ${name}`);
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const source = src.slice(start, i + 1);
        const start_line = src.slice(0, start).split('\n').length;
        const end_line = src.slice(0, i + 1).split('\n').length;
        return { name, found: true, source, start_line, end_line };
      }
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

function inspectTool(src, spec, extracted) {
  const joined = extracted.map(e => e.source || '').join('\n');
  const handlerNeedle = `getElementById('${spec.handler_id}')`;
  const handlerAt = src.indexOf(handlerNeedle);
  const handler_line = handlerAt >= 0 ? src.slice(0, handlerAt).split('\n').length : null;

  if (spec.tool === 'toggle-zeno') {
    return {
      handler_line,
      uses_traceDescendants: joined.includes('traceDescendants'),
      uses_state_includes: /observerNode\.state/.test(joined) && /includes\(/.test(joined),
      uses_state_equality_filter: /node\.state\s*===/.test(joined) && /surviving/.test(joined),
      counts_descendants_at_step: joined.includes('observerDescendants.has(sid)'),
      frozen_ratio: joined.includes('1 - (survivingBranches / totalBranches)'),
      prunes_graph: /nodes\.splice|edges\.splice|delete.*node/.test(joined),
      mentions_observed_state_string: joined.includes('zenoObserverState = observerNode.state'),
    };
  }
  if (spec.tool === 'btn-detect-tunneling') {
    return {
      handler_line,
      ratio_threshold: /ratio > 1\.5/.test(joined) ? 1.5 : null,
      uses_branchial_bfs: joined.includes('branchialBFS'),
      uses_findShortestPath: joined.includes('findShortestPath'),
      uses_math_random: joined.includes('Math.random()'),
      sample_size: /sampleSize = Math\.min\(finalIds\.length, (\d+)\)/.exec(joined)
        ? Number(RegExp.$1) : null,
      max_pairs: /maxPairs = (\d+)/.exec(joined) ? Number(RegExp.$1) : null,
      uses_causal_event_dag: joined.includes('causalEvents') || joined.includes('causalEdges'),
    };
  }
  if (spec.tool === 'btn-measure-holographic') {
    return {
      handler_line,
      entropy_is_distinct_states: joined.includes('statesInside.add(sys.nodes[nodeId].state)'),
      volume_is_bfs_ball: joined.includes('dist <= r'),
      boundary_is_sphere: joined.includes('dist === r'),
      bfs_undirected: joined.includes('_childToParents') && joined.includes('_parentToChildren'),
      uses_causal_cone: joined.includes('traceCausalHistory') || joined.includes('causalEvents'),
      compares_r2: joined.includes('boundaryFit.r2 > volumeFit.r2'),
    };
  }
  if (spec.tool === 'btn-geodesic-deviation') {
    return {
      handler_line,
      groups_by_first_hop: joined.includes('byFirstStep'),
      uses_findShortestPath: joined.includes('findShortestPath'),
      uses_prefix_mismatch: joined.includes('levenshteinLike'),
      deviation_formula: joined.includes('(lastSep - firstSep) / Math.max(firstSep, 0.01)'),
      converge_threshold: /deviation < -0\.1/.test(joined) ? -0.1 : null,
      diverge_threshold: /deviation > 0\.1/.test(joined) ? 0.1 : null,
    };
  }
  if (spec.tool === 'btn-detect-tangles') {
    return {
      handler_line,
      exact_recurrence: joined.includes("type: 'exact'"),
      substring_core: joined.includes("type: 'substring'"),
      extract_core_2gram: joined.includes('substring(i, i + 2)'),
      look_ahead: /depth < (\d+)/.exec(joined) ? Number(RegExp.$1) : null,
      node_scan_cap: /i < (\d+)/.exec(joined) ? Number(RegExp.$1) : null,
      top_k: /slice\(0, (\d+)\)/.exec(joined) ? Number(RegExp.$1) : null,
      uses_graph_cycle_detect: /tarjan|strongly.connected|cycle/i.test(joined),
    };
  }
  return { handler_line };
}

function extractAll() {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');
  const tools = [];
  const sources = {};
  for (const spec of TOOLS) {
    const extracted = [];
    for (const name of [...spec.functions, ...spec.helpers]) {
      if (sources[name]) {
        extracted.push(sources[name]);
        continue;
      }
      const fn = extractNamedFunction(src, name);
      sources[name] = fn;
      extracted.push(fn);
    }
    const missing = extracted.filter(e => !e.found).map(e => e.name);
    tools.push({
      ...spec,
      extractable: missing.length === 0,
      missing,
      functions: extracted.filter(e => spec.functions.includes(e.name)),
      helpers: extracted.filter(e => spec.helpers.includes(e.name)),
      inspect: inspectTool(src, spec, extracted),
    });
  }
  return { src, tools, sources };
}

module.exports = {
  TOOLS,
  extractNamedFunction,
  extractAll,
};
