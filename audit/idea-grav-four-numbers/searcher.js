'use strict';

/**
 * Searcher four-number stamps. Not imported by independent-verifier.js.
 * Causal DEV uses HypergraphRewriter.events / causalEdges only.
 * Does not call checkCausalInvariance, measureGeodesicDeviation, or
 * the 41 string-Hamming kernel.
 */

const CONVERGING_THRESHOLD = -0.1;
const MAX_EDGES = 8000;

function edgeKey(e) {
  return e.join(',');
}

function occAndAtoms(edgeList) {
  const occ = new Map();
  for (const e of edgeList) {
    for (const a of e) occ.set(a, (occ.get(a) || 0) + 1);
  }
  const atoms = [...occ.keys()].sort((x, y) => x - y);
  return { occ, atoms };
}

function countMaxInjections(domain, codomain, occDom, occCod) {
  const n = domain.length;
  const m = codomain.length;
  if (n === 0) return { count: 1, maxScore: 0 };
  let maxScore = -Infinity;
  let count = 0;
  const used = new Array(m).fill(false);
  function rec(i, score) {
    if (i === n) {
      if (score > maxScore) {
        maxScore = score;
        count = 1;
      } else if (score === maxScore) count++;
      return;
    }
    const oa = occDom.get(domain[i]) || 0;
    for (let j = 0; j < m; j++) {
      if (used[j]) continue;
      used[j] = true;
      rec(i + 1, score + Math.min(oa, occCod.get(codomain[j]) || 0));
      used[j] = false;
    }
  }
  rec(0, 0);
  return { count, maxScore };
}

function eventMatchUnique(ev) {
  const inn = occAndAtoms(ev.destroyedEdges || []);
  const out = occAndAtoms(ev.createdEdges || []);
  const small = inn.atoms.length <= out.atoms.length ? inn : out;
  const large = inn.atoms.length <= out.atoms.length ? out : inn;
  const { count, maxScore } = countMaxInjections(small.atoms, large.atoms, small.occ, large.occ);
  return { unique: count === 1, count, maxScore, n_in: inn.atoms.length, n_out: out.atoms.length };
}

function measureMatch(snapshot) {
  const fails = [];
  for (const ev of snapshot.events) {
    const r = eventMatchUnique(ev);
    if (!r.unique) {
      fails.push({
        event_id: ev.id,
        step: ev.step,
        max_maps: r.count,
        max_score: r.maxScore,
        n_in: r.n_in,
        n_out: r.n_out,
      });
      break;
    }
  }
  if (fails.length) {
    const f = fails[0];
    return {
      yes: false,
      reason: `tick ${f.step} event ${f.event_id}: ${f.max_maps} max-overlap injections (score ${f.max_score})`,
      first_fail: f,
    };
  }
  return { yes: true, reason: 'every event has exactly one max-overlap injection', first_fail: null };
}

function spatialFromEdges(hyperedges) {
  const adj = new Map();
  const add = (a) => {
    if (!adj.has(a)) adj.set(a, new Set());
  };
  for (const e of hyperedges) {
    for (const a of e) add(a);
    for (let i = 0; i < e.length; i++) {
      for (let j = i + 1; j < e.length; j++) {
        adj.get(e[i]).add(e[j]);
        adj.get(e[j]).add(e[i]);
      }
    }
  }
  const atoms = [...adj.keys()].sort((x, y) => x - y);
  return { atoms, adj };
}

function bfsVolumes(adj, start, rMax) {
  const visited = new Set([start]);
  let frontier = [start];
  const volumes = [1];
  for (let r = 1; r <= rMax; r++) {
    const next = [];
    for (const node of frontier) {
      const nbrs = adj.get(node);
      if (!nbrs) continue;
      for (const nb of nbrs) {
        if (!visited.has(nb)) {
          visited.add(nb);
          next.push(nb);
        }
      }
    }
    volumes.push(visited.size);
    frontier = next;
    if (frontier.length === 0) {
      while (volumes.length <= rMax) volumes.push(visited.size);
      break;
    }
  }
  return volumes;
}

function connectedComponents(adj, atoms) {
  const seen = new Set();
  const ccs = [];
  for (const a of atoms) {
    if (seen.has(a)) continue;
    const stack = [a];
    const cc = [];
    seen.add(a);
    while (stack.length) {
      const x = stack.pop();
      cc.push(x);
      const nbrs = adj.get(x);
      if (!nbrs) continue;
      for (const nb of nbrs) {
        if (!seen.has(nb)) {
          seen.add(nb);
          stack.push(nb);
        }
      }
    }
    cc.sort((x, y) => x - y);
    ccs.push(cc);
  }
  ccs.sort((A, B) => B.length - A.length || A[0] - B[0]);
  return ccs;
}

function diameterOf(adj, cc) {
  if (cc.length <= 1) return 0;
  let diam = 0;
  for (const start of cc) {
    const visited = new Set([start]);
    let frontier = [start];
    let dist = 0;
    while (frontier.length) {
      const next = [];
      for (const node of frontier) {
        const nbrs = adj.get(node);
        if (!nbrs) continue;
        for (const nb of nbrs) {
          if (!visited.has(nb)) {
            visited.add(nb);
            next.push(nb);
          }
        }
      }
      if (next.length === 0) break;
      dist++;
      frontier = next;
    }
    if (dist > diam) diam = dist;
  }
  return diam;
}

function measureBall(snapshot) {
  const { atoms, adj } = spatialFromEdges(snapshot.edges);
  if (atoms.length === 0) {
    return { V_r: [], hatd: [], r_window: [], diam: 0, n_atoms: 0 };
  }
  const ccs = connectedComponents(adj, atoms);
  const diam = diameterOf(adj, ccs[0]);
  const r_window = [];
  for (let r = 2; r < diam / 2; r++) r_window.push(r);
  const rMax = r_window.length ? r_window[r_window.length - 1] + 1 : 1;
  const acc = new Array(rMax + 1).fill(0);
  for (const start of atoms) {
    const vols = bfsVolumes(adj, start, rMax);
    for (let r = 0; r <= rMax; r++) acc[r] += vols[r];
  }
  const mean = acc.map(s => s / atoms.length);
  const V_r = r_window.map(r => mean[r]);
  const hatd = r_window.map(r => {
    const vr = mean[r];
    const vr1 = mean[r + 1];
    if (!(vr > 0) || !(vr1 > 0)) return null;
    return (Math.log(vr1) - Math.log(vr)) / (Math.log(r + 1) - Math.log(r));
  });
  return { V_r, hatd, r_window, diam, n_atoms: atoms.length, n_cc: ccs.length };
}

function buildCausal(snapshot) {
  const fwd = new Map();
  const und = new Map();
  const touch = (map, a, b) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a).add(b);
  };
  for (const ev of snapshot.events) {
    if (!fwd.has(ev.id)) fwd.set(ev.id, new Set());
    if (!und.has(ev.id)) und.set(ev.id, new Set());
  }
  for (const e of snapshot.causalEdges) {
    touch(fwd, e.from, e.to);
    touch(und, e.from, e.to);
    touch(und, e.to, e.from);
  }
  return { fwd, und };
}

function bfsTree(fwd, source) {
  const dist = new Map([[source, 0]]);
  const parent = new Map([[source, null]]);
  const q = [source];
  for (let qi = 0; qi < q.length; qi++) {
    const u = q[qi];
    const nbrs = [...(fwd.get(u) || [])].sort((a, b) => a - b);
    for (const v of nbrs) {
      if (!dist.has(v)) {
        dist.set(v, dist.get(u) + 1);
        parent.set(v, u);
        q.push(v);
      }
    }
  }
  return { dist, parent };
}

function reconstruct(parent, target) {
  const path = [];
  let x = target;
  while (x !== null && x !== undefined) {
    path.push(x);
    x = parent.get(x);
    if (x === undefined) return null;
  }
  path.reverse();
  return path;
}

function undirectedDist(und, a, b, cache) {
  const key = a < b ? `${a}-${b}` : `${b}-${a}`;
  if (cache.has(key)) return cache.get(key);
  if (a === b) {
    cache.set(key, 0);
    return 0;
  }
  const seen = new Set([a]);
  let frontier = [a];
  let d = 0;
  while (frontier.length) {
    const next = [];
    for (const u of frontier) {
      const nbrs = und.get(u);
      if (!nbrs) continue;
      for (const v of nbrs) {
        if (seen.has(v)) continue;
        if (v === b) {
          cache.set(key, d + 1);
          return d + 1;
        }
        seen.add(v);
        next.push(v);
      }
    }
    d++;
    frontier = next;
  }
  cache.set(key, null);
  return null;
}

function meanPairwiseUndirected(ids, und, cache) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const d = undirectedDist(und, ids[i], ids[j], cache);
      if (d === null) continue;
      sum += d;
      n++;
    }
  }
  if (n === 0) return null;
  return sum / n;
}

function collectBundles(snapshot) {
  if (!snapshot.events.length) return { source: null, bundles: [] };
  const { fwd, und } = buildCausal(snapshot);
  const maxStep = Math.max(...snapshot.events.map(e => e.step));
  const targets = snapshot.events.filter(e => e.step === maxStep).map(e => e.id).sort((a, b) => a - b);
  const ids = snapshot.events.map(e => e.id).sort((a, b) => a - b);

  for (const source of ids) {
    const { parent } = bfsTree(fwd, source);
    const geos = [];
    for (const t of targets) {
      const path = reconstruct(parent, t);
      if (path && path[0] === source && path.length >= 3) geos.push(path);
    }
    const byHop = new Map();
    for (const path of geos) {
      const hop = path[1];
      if (!byHop.has(hop)) byHop.set(hop, []);
      byHop.get(hop).push(path);
    }
    const cache = new Map();
    const bundles = [];
    for (const [hop, paths] of [...byHop.entries()].sort((a, b) => a[0] - b[0])) {
      if (paths.length < 2) continue;
      const maxLen = Math.max(...paths.map(p => p.length));
      const seps = [];
      for (let depth = 1; depth < maxLen; depth++) {
        const at = [];
        for (const p of paths) if (depth < p.length) at.push(p[depth]);
        if (at.length < 2) continue;
        const sep = meanPairwiseUndirected(at, und, cache);
        if (sep === null) continue;
        seps.push({ depth, sep });
      }
      if (seps.length < 2) continue;
      const firstSep = seps[0].sep;
      const lastSep = seps[seps.length - 1].sep;
      const deviation = (lastSep - firstSep) / Math.max(firstSep, 0.01);
      bundles.push({ hop, paths, deviation, firstSep, lastSep, n_paths: paths.length });
    }
    if (bundles.length) return { source, bundles, maxStep };
  }
  return { source: ids[0], bundles: [], maxStep };
}

function lastAtomSet(snapshot) {
  const s = new Set();
  for (const e of snapshot.edges) for (const a of e) s.add(a);
  return s;
}

function eventAtoms(ev) {
  const s = new Set();
  for (const e of ev.destroyedEdges || []) for (const a of e) s.add(a);
  for (const e of ev.createdEdges || []) for (const a of e) s.add(a);
  return s;
}

function eventsById(snapshot) {
  const m = new Map();
  for (const ev of snapshot.events) m.set(ev.id, ev);
  return m;
}

function reverseCausal(snapshot) {
  const rev = new Map();
  for (const ev of snapshot.events) rev.set(ev.id, new Set());
  for (const e of snapshot.causalEdges) {
    if (!rev.has(e.to)) rev.set(e.to, new Set());
    rev.get(e.to).add(e.from);
  }
  return rev;
}

function pastOf(seeds, rev) {
  const past = new Set();
  const stack = [...seeds];
  while (stack.length) {
    const id = stack.pop();
    if (past.has(id)) continue;
    past.add(id);
    const pred = rev.get(id);
    if (!pred) continue;
    for (const p of pred) if (!past.has(p)) stack.push(p);
  }
  return past;
}

function measureDevDens(snapshot) {
  const packed = collectBundles(snapshot);
  if (!packed.bundles.length) {
    return {
      dev: null,
      dens: null,
      pairs: [],
      source: packed.source,
      n_bundles: 0,
      reason: 'no first-hop bundle with two depths of pairwise causal-graph separation',
    };
  }
  const last = lastAtomSet(snapshot);
  const byId = eventsById(snapshot);
  const rev = reverseCausal(snapshot);
  const touchIndex = new Map();
  for (const ev of snapshot.events) {
    for (const a of eventAtoms(ev)) {
      if (!touchIndex.has(a)) touchIndex.set(a, []);
      touchIndex.get(a).push(ev.id);
    }
  }
  const pairs = [];
  for (const b of packed.bundles) {
    const evIds = new Set();
    for (const p of b.paths) for (const id of p) evIds.add(id);
    const atoms = new Set();
    for (const id of evIds) {
      const ev = byId.get(id);
      if (!ev) continue;
      for (const a of eventAtoms(ev)) if (last.has(a)) atoms.add(a);
    }
    const ballN = atoms.size;
    if (ballN === 0) continue;
    const seeds = new Set();
    for (const a of atoms) {
      const hits = touchIndex.get(a) || [];
      for (const id of hits) seeds.add(id);
    }
    const past = pastOf(seeds, rev);
    let incident = 0;
    for (const e of snapshot.causalEdges) {
      if (past.has(e.from) || past.has(e.to)) incident++;
    }
    pairs.push({
      hop: b.hop,
      dev: b.deviation,
      dens: incident / ballN,
      ball: ballN,
      incident,
      n_paths: b.n_paths,
    });
  }
  if (!pairs.length) {
    return {
      dev: null,
      dens: null,
      pairs: [],
      source: packed.source,
      n_bundles: packed.bundles.length,
      reason: 'bundles existed but every ball was empty on the last slice',
    };
  }
  const dev = pairs.reduce((s, p) => s + p.dev, 0) / pairs.length;
  const dens = pairs.reduce((s, p) => s + p.dens, 0) / pairs.length;
  return { dev, dens, pairs, source: packed.source, n_bundles: pairs.length, reason: null };
}

function pearson(pairs) {
  if (pairs.length < 2) return null;
  const xs = pairs.map(p => p.dev);
  const ys = pairs.map(p => p.dens);
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  let n = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    n += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return n / Math.sqrt(dx * dy);
}

function evolveSnapshot(HypergraphRewriter, spec) {
  const rw = new HypergraphRewriter();
  const result = rw.evolve(spec.lhs, spec.rhs, spec.init, spec.steps);
  if (rw.maxEdges !== MAX_EDGES) {
    throw new Error(`maxEdges drifted: ${rw.maxEdges} !== ${MAX_EDGES}`);
  }
  return {
    rule: spec.rule,
    steps: spec.steps,
    lhs: spec.lhs.map(e => [...e]),
    rhs: spec.rhs.map(e => [...e]),
    init: spec.init.map(e => [...e]),
    edges: result.edges.map(e => [...e]),
    events: result.events.map(ev => ({
      id: ev.id,
      step: ev.step,
      destroyedEdges: (ev.destroyedEdges || []).map(e => [...e]),
      createdEdges: (ev.createdEdges || []).map(e => [...e]),
    })),
    causalEdges: result.causalEdges.map(e => ({ from: e.from, to: e.to })),
    atomCount: result.atomCount,
    truncated: !!result.truncated,
    maxEdges: rw.maxEdges,
  };
}

function measureFour(snapshot, opts) {
  const allowCorr = !!(opts && opts.allowCorr);
  const match = measureMatch(snapshot);
  const ball = measureBall(snapshot);
  const cap_hit = !!snapshot.truncated || snapshot.edges.length > MAX_EDGES;
  const base = {
    rule: snapshot.rule,
    steps: snapshot.steps,
    match: match.yes,
    V_r: ball.V_r,
    hatd: ball.hatd,
    r_window: ball.r_window,
    diam: ball.diam,
    n_atoms: ball.n_atoms,
    dev: null,
    dens: null,
    corr: null,
    cap_hit,
    truncated: !!snapshot.truncated,
    maxEdges: snapshot.maxEdges,
    n_events: snapshot.events.length,
    n_edges: snapshot.edges.length,
    n_causal: snapshot.causalEdges.length,
    match_reason: match.reason,
    first_fail: match.first_fail,
    gravity_undefined: !match.yes,
    converging_threshold: CONVERGING_THRESHOLD,
    converging: null,
    einstein_like: null,
    n_pairs: 0,
    source: null,
    n_bundles: 0,
  };
  if (!match.yes) return base;
  const dd = measureDevDens(snapshot);
  base.dev = dd.dev;
  base.dens = dd.dens;
  base.source = dd.source;
  base.n_bundles = dd.n_bundles;
  base.n_pairs = dd.pairs.length;
  base.gravity_undefined = dd.dev === null;
  if (dd.dev !== null) base.converging = dd.dev < CONVERGING_THRESHOLD;
  if (allowCorr && dd.pairs.length) base.corr = pearson(dd.pairs);
  if (base.corr !== null) base.einstein_like = base.corr < 0;
  return base;
}

module.exports = {
  CONVERGING_THRESHOLD,
  MAX_EDGES,
  evolveSnapshot,
  measureFour,
  measureMatch,
  measureBall,
  measureDevDens,
  pearson,
};
