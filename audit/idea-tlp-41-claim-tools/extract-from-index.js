'use strict';

/**
 * Pull claim-tool function sources from sealed index.html.
 * Brace-match only. Does not reimplement the formulas.
 */

const fs = require('fs');
const { INDEX_PATH } = require('./load-sealed-multiway');

const IDEA_POINTERS = {
  zenoObserve: 10182,
  detectTunneling: 10381,
  measureHolographicBound: 10932,
  measureGeodesicDeviation: 11820,
  detectTopologicalObstructions: 12074,
};

const FORBIDDEN = ['computeRicciCurvature', 'measureBranchingAsymmetry'];

const TOOLS = [
  {
    tool: 'toggle-zeno',
    idea_fn: 'zenoObserve',
    handler_id: 'toggle-zeno',
    functions: ['zenoObserve'],
    helpers: [],
  },
  {
    tool: 'btn-detect-tunneling',
    idea_fn: 'detectTunneling',
    handler_id: 'btn-detect-tunneling',
    functions: ['detectTunneling'],
    helpers: ['findShortestPath'],
  },
  {
    tool: 'btn-measure-holographic',
    idea_fn: 'measureHolographicBound',
    handler_id: 'btn-measure-holographic',
    functions: ['measureHolographicBound'],
    helpers: [],
  },
  {
    tool: 'btn-geodesic-deviation',
    idea_fn: 'measureGeodesicDeviation',
    handler_id: 'btn-geodesic-deviation',
    functions: ['measureGeodesicDeviation'],
    helpers: ['findShortestPath', 'levenshteinLike'],
  },
  {
    tool: 'btn-detect-tangles',
    idea_fn: 'detectTopologicalObstructions',
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
    const comment_claims_prune = joined.includes("Prune branches at the latest step that don't contain the observed state");
    const stores_unused_state = joined.includes('zenoObserverState = observerNode.state');
    const uses_desc = joined.includes('traceDescendants');
    const prunes = /nodes\.splice|edges\.splice|delete.*node/.test(joined);
    return {
      handler_line,
      code_noun: "function comment: \"Prune branches … that don't contain the observed state\"; result: \"branches survive\" / \"Frozen ratio\" / \"Zeno effect\"",
      ui_noun_match: !(comment_claims_prune && uses_desc && !prunes && stores_unused_state),
      noun_reason: 'comment claims prune + state-containment; body counts traceDescendants and does not prune; zenoObserverState stored, unused',
      uses_traceDescendants: uses_desc,
      uses_state_includes: /observerNode\.state/.test(joined) && /includes\(/.test(joined),
      uses_state_equality_filter: /node\.state\s*===/.test(joined) && /surviving/.test(joined),
      counts_descendants_at_step: joined.includes('observerDescendants.has(sid)'),
      frozen_ratio: joined.includes('1 - (survivingBranches / totalBranches)'),
      prunes_graph: prunes,
      comment_claims_prune,
      mentions_observed_state_string: stores_unused_state,
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
      min_finals: 3,
      code_noun: 'result fields branchial= / causal= / ratio= ; pair kept if causalDist/branchialDist > 1.5',
      ui_noun_match: /causalDist/.test(joined) && /branchialDist/.test(joined) && /ratio > 1\.5/.test(joined),
      noun_reason: 'handler prints the same three fields the kernel computes',
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
      min_radii: 2,
      code_noun: 'return isHolographic = boundaryFit.r2 > volumeFit.r2; handler prints AREA LAW (Holographic)',
      ui_noun_match: false,
      noun_reason: 'kernel boolean is an R² bake-off of distinct-string count vs sphere vs ball; handler labels it AREA LAW',
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
      min_paths_len3: 2,
      not_full_levenshtein: joined.includes('Simple edit distance proxy'),
      code_noun: 'return keys converging / diverging / deviation (deviation < −0.1)',
      ui_noun_match: joined.includes('converging: deviation < -0.1') && joined.includes('byFirstStep'),
      noun_reason: 'function return names converge/diverge of first-hop bundles; not pulled from .tool-desc',
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
      min_nodes: 5,
      code_noun: "return type 'exact' | 'substring'; handler prints Exact self-regeneration / Substring persistence",
      ui_noun_match: joined.includes("type: 'exact'") && joined.includes("type: 'substring'"),
      noun_reason: 'handler counts the same exact/substring objects the kernel returns',
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

function nounTable(tools) {
  const out = {};
  for (const t of tools) {
    out[t.tool] = !!(t.inspect && t.inspect.ui_noun_match);
  }
  return out;
}

function assertIdeaPointers(tools) {
  const listed = new Set(tools.flatMap(t => [...t.functions, ...t.helpers].map(f => f.name)));
  for (const name of FORBIDDEN) {
    if (listed.has(name)) {
      throw new Error(`refused to extract ${name} (Ricci / idea 45 out of scope)`);
    }
  }
  for (const t of tools) {
    const fn = t.functions.find(f => f.name === t.idea_fn);
    const expected = IDEA_POINTERS[t.idea_fn];
    if (!fn || !fn.found) throw new Error(`UNEXTRACTABLE: ${t.idea_fn}`);
    if (fn.start_line !== expected) {
      throw new Error(`${t.idea_fn} starts at L${fn.start_line}, IDEA pointer is L${expected}`);
    }
  }
}

function assertZenoMismatchAPriori(tools) {
  const zeno = tools.find(t => t.tool === 'toggle-zeno');
  if (!zeno) throw new Error('toggle-zeno missing');
  if (zeno.inspect.ui_noun_match !== false) {
    throw new Error('zenoObserve comment/body noun mismatch must be stamped before the suite runs');
  }
  if (zeno.inspect.prunes_graph) {
    throw new Error('zenoObserve now prunes — extract drifted');
  }
}

module.exports = {
  TOOLS,
  IDEA_POINTERS,
  FORBIDDEN,
  extractNamedFunction,
  extractAll,
  nounTable,
  assertIdeaPointers,
  assertZenoMismatchAPriori,
};
