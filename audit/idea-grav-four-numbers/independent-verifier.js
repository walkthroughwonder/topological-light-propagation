'use strict';

/**
 * Independent replay / four-number check.
 * Must not require searcher.js, index.html, worker.js, or the extractor.
 * Same preregistered formulas, different control flow.
 */

const CONVERGING_THRESHOLD = -0.1;
const MAX_EDGES = 8000;

function tupleEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function removeOne(edges, target) {
  for (let i = 0; i < edges.length; i++) {
    if (tupleEq(edges[i], target)) {
      edges.splice(i, 1);
      return;
    }
  }
  throw new Error(`replay: destroyed edge ${target.join(',')} not present`);
}

function replayLastEdges(init, events) {
  const edges = init.map(e => e.slice());
  const byStep = new Map();
  for (const ev of events) {
    if (!byStep.has(ev.step)) byStep.set(ev.step, []);
    byStep.get(ev.step).push(ev);
  }
  const steps = [...byStep.keys()].sort((a, b) => a - b);
  for (const step of steps) {
    const evs = byStep.get(step).slice().sort((a, b) => a.id - b.id);
    for (const ev of evs) {
      for (const d of ev.destroyedEdges) removeOne(edges, d);
      for (const c of ev.createdEdges) edges.push(c.slice());
    }
  }
  return edges;
}

function multisetKeys(edges) {
  return edges.map(e => e.join(',')).sort();
}

function assertReplayMatches(snapshot) {
  const replayed = replayLastEdges(snapshot.init, snapshot.events);
  const a = multisetKeys(replayed);
  const b = multisetKeys(snapshot.edges);
  if (a.length !== b.length) {
    throw new Error(`replay edge count ${a.length} != snapshot ${b.length}`);
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) throw new Error(`replay edge mismatch at ${i}: ${a[i]} vs ${b[i]}`);
  }
  return replayed;
}

function occMap(edgeList) {
  const occ = Object.create(null);
  for (const e of edgeList) {
    for (let i = 0; i < e.length; i++) {
      const a = e[i];
      occ[a] = (occ[a] || 0) + 1;
    }
  }
  const atoms = Object.keys(occ).map(Number).sort((x, y) => x - y);
  return { occ, atoms };
}

function choose(n, k) {
  const out = [];
  const buf = [];
  function rec(start) {
    if (buf.length === k) {
      out.push(buf.slice());
      return;
    }
    for (let i = start; i < n; i++) {
      buf.push(i);
      rec(i + 1);
      buf.pop();
    }
  }
  rec(0);
  return out;
}

function permute(arr) {
  const out = [];
  const a = arr.slice();
  const n = a.length;
  const c = new Array(n).fill(0);
  out.push(a.slice());
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      if (i % 2 === 0) {
        const t = a[0]; a[0] = a[i]; a[i] = t;
      } else {
        const t = a[c[i]]; a[c[i]] = a[i]; a[i] = t;
      }
      out.push(a.slice());
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
  return out;
}

function countMaxByChoosePerm(domain, codomain, occDom, occCod) {
  if (domain.length === 0) return { count: 1, maxScore: 0 };
  const combos = choose(codomain.length, domain.length);
  let maxScore = -Infinity;
  let count = 0;
  for (const combo of combos) {
    const images = combo.map(i => codomain[i]);
    const perms = permute(images);
    for (const perm of perms) {
      let score = 0;
      for (let i = 0; i < domain.length; i++) {
        score += Math.min(occDom[domain[i]] || 0, occCod[perm[i]] || 0);
      }
      if (score > maxScore) {
        maxScore = score;
        count = 1;
      } else if (score === maxScore) count++;
    }
  }
  return { count, maxScore };
}

function verifyMatch(snapshot) {
  for (const ev of snapshot.events) {
    const inn = occMap(ev.destroyedEdges || []);
    const out = occMap(ev.createdEdges || []);
    const small = inn.atoms.length <= out.atoms.length ? inn : out;
    const large = inn.atoms.length <= out.atoms.length ? out : inn;
    const { count, maxScore } = countMaxByChoosePerm(
      small.atoms, large.atoms, small.occ, large.occ
    );
    if (count !== 1) {
      return {
        yes: false,
        reason: `tick ${ev.step} event ${ev.id}: ${count} max-overlap injections (score ${maxScore})`,
        first_fail: {
          event_id: ev.id,
          step: ev.step,
          max_maps: count,
          max_score: maxScore,
          n_in: inn.atoms.length,
          n_out: out.atoms.length,
        },
      };
    }
  }
  return { yes: true, reason: 'every event has exactly one max-overlap injection', first_fail: null };
}

function buildAdjLists(hyperedges) {
  const idx = new Map();
  const atoms = [];
  const add = (a) => {
    if (!idx.has(a)) {
      idx.set(a, atoms.length);
      atoms.push(a);
    }
  };
  for (const e of hyperedges) for (const a of e) add(a);
  const lists = atoms.map(() => []);
  const seen = atoms.map(() => new Set());
  for (const e of hyperedges) {
    for (let i = 0; i < e.length; i++) {
      for (let j = i + 1; j < e.length; j++) {
        const u = idx.get(e[i]);
        const v = idx.get(e[j]);
        if (!seen[u].has(v)) {
          seen[u].add(v);
          lists[u].push(v);
        }
        if (!seen[v].has(u)) {
          seen[v].add(u);
          lists[v].push(u);
        }
      }
    }
  }
  return { atoms, lists, idx };
}

function bfsDist(lists, start) {
  const dist = new Array(lists.length).fill(-1);
  dist[start] = 0;
  const q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const u = q[qi];
    const nbrs = lists[u];
    for (let k = 0; k < nbrs.length; k++) {
      const v = nbrs[k];
      if (dist[v] < 0) {
        dist[v] = dist[u] + 1;
        q.push(v);
      }
    }
  }
  return dist;
}

function verifyBall(snapshot) {
  const { atoms, lists } = buildAdjLists(snapshot.edges);
  if (atoms.length === 0) {
    return { V_r: [], hatd: [], r_window: [], diam: 0, n_atoms: 0 };
  }
  const seen = new Array(atoms.length).fill(false);
  const comps = [];
  for (let i = 0; i < atoms.length; i++) {
    if (seen[i]) continue;
    const q = [i];
    seen[i] = true;
    const comp = [];
    for (let qi = 0; qi < q.length; qi++) {
      const u = q[qi];
      comp.push(u);
      const nbrs = lists[u];
      for (let k = 0; k < nbrs.length; k++) {
        const v = nbrs[k];
        if (!seen[v]) {
          seen[v] = true;
          q.push(v);
        }
      }
    }
    comps.push(comp);
  }
  comps.sort((A, B) => {
    if (B.length !== A.length) return B.length - A.length;
    const aMin = Math.min(...A.map(i => atoms[i]));
    const bMin = Math.min(...B.map(i => atoms[i]));
    return aMin - bMin;
  });
  let diam = 0;
  const big = comps[0];
  for (let t = 0; t < big.length; t++) {
    const dist = bfsDist(lists, big[t]);
    for (let k = 0; k < dist.length; k++) {
      if (dist[k] > diam) diam = dist[k];
    }
  }
  const r_window = [];
  for (let r = 2; r < diam / 2; r++) r_window.push(r);
  const rMax = r_window.length ? r_window[r_window.length - 1] + 1 : 1;
  const acc = new Array(rMax + 1).fill(0);
  for (let s = 0; s < atoms.length; s++) {
    const dist = bfsDist(lists, s);
    const vols = new Array(rMax + 1).fill(0);
    for (let k = 0; k < dist.length; k++) {
      if (dist[k] < 0) continue;
      for (let r = dist[k]; r <= rMax; r++) vols[r]++;
    }
    if (vols[0] === 0) vols[0] = 1;
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
  return { V_r, hatd, r_window, diam, n_atoms: atoms.length, n_cc: comps.length };
}

function adjFromCausal(snapshot) {
  const n = snapshot.events.length;
  const idTo = new Map();
  snapshot.events.forEach((ev, i) => idTo.set(ev.id, i));
  const fwd = Array.from({ length: n }, () => []);
  const und = Array.from({ length: n }, () => []);
  const undSeen = Array.from({ length: n }, () => new Set());
  for (const e of snapshot.causalEdges) {
    const a = idTo.get(e.from);
    const b = idTo.get(e.to);
    if (a === undefined || b === undefined) continue;
    fwd[a].push(b);
    if (!undSeen[a].has(b)) {
      undSeen[a].add(b);
      und[a].push(b);
    }
    if (!undSeen[b].has(a)) {
      undSeen[b].add(a);
      und[b].push(a);
    }
  }
  for (let i = 0; i < n; i++) {
    fwd[i].sort((x, y) => x - y);
    und[i].sort((x, y) => x - y);
  }
  const ids = snapshot.events.map(e => e.id);
  return { n, idTo, ids, fwd, und };
}

function directedTree(fwd, src) {
  const n = fwd.length;
  const dist = new Array(n).fill(-1);
  const parent = new Array(n).fill(-1);
  dist[src] = 0;
  const q = [src];
  for (let qi = 0; qi < q.length; qi++) {
    const u = q[qi];
    const nbrs = fwd[u];
    for (let k = 0; k < nbrs.length; k++) {
      const v = nbrs[k];
      if (dist[v] < 0) {
        dist[v] = dist[u] + 1;
        parent[v] = u;
        q.push(v);
      }
    }
  }
  return { dist, parent };
}

function walkPath(parent, src, tgt) {
  if (tgt === src) return [src];
  const rev = [];
  let x = tgt;
  while (x !== src) {
    if (x < 0) return null;
    rev.push(x);
    x = parent[x];
  }
  rev.push(src);
  rev.reverse();
  return rev;
}

function undBfs(und, src) {
  const dist = new Array(und.length).fill(-1);
  dist[src] = 0;
  const q = [src];
  for (let qi = 0; qi < q.length; qi++) {
    const u = q[qi];
    const nbrs = und[u];
    for (let k = 0; k < nbrs.length; k++) {
      const v = nbrs[k];
      if (dist[v] < 0) {
        dist[v] = dist[u] + 1;
        q.push(v);
      }
    }
  }
  return dist;
}

function meanPairs(ixs, und, cache) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < ixs.length; i++) {
    const di = cache.has(ixs[i]) ? cache.get(ixs[i]) : undBfs(und, ixs[i]);
    cache.set(ixs[i], di);
    for (let j = i + 1; j < ixs.length; j++) {
      const d = di[ixs[j]];
      if (d < 0) continue;
      sum += d;
      n++;
    }
  }
  if (n === 0) return null;
  return sum / n;
}

function verifyBundles(snapshot) {
  if (!snapshot.events.length) return { source: null, bundles: [] };
  const { n, ids, fwd, und } = adjFromCausal(snapshot);
  const maxStep = snapshot.events.reduce((m, e) => (e.step > m ? e.step : m), 0);
  const targets = [];
  for (let i = 0; i < n; i++) if (snapshot.events[i].step === maxStep) targets.push(i);
  targets.sort((a, b) => ids[a] - ids[b]);
  const order = [...Array(n).keys()].sort((a, b) => ids[a] - ids[b]);

  for (let oi = 0; oi < order.length; oi++) {
    const src = order[oi];
    const { parent } = directedTree(fwd, src);
    const geos = [];
    for (let t = 0; t < targets.length; t++) {
      const path = walkPath(parent, src, targets[t]);
      if (path && path.length >= 3) geos.push(path);
    }
    const groups = new Map();
    for (const path of geos) {
      const hop = path[1];
      if (!groups.has(hop)) groups.set(hop, []);
      groups.get(hop).push(path);
    }
    const cache = new Map();
    const bundles = [];
    const hops = [...groups.keys()].sort((a, b) => ids[a] - ids[b]);
    for (const hop of hops) {
      const paths = groups.get(hop);
      if (paths.length < 2) continue;
      let maxLen = 0;
      for (const p of paths) if (p.length > maxLen) maxLen = p.length;
      const seps = [];
      for (let depth = 1; depth < maxLen; depth++) {
        const at = [];
        for (const p of paths) if (depth < p.length) at.push(p[depth]);
        if (at.length < 2) continue;
        const sep = meanPairs(at, und, cache);
        if (sep === null) continue;
        seps.push(sep);
      }
      if (seps.length < 2) continue;
      const firstSep = seps[0];
      const lastSep = seps[seps.length - 1];
      bundles.push({
        hop: ids[hop],
        paths: paths.map(p => p.map(i => ids[i])),
        deviation: (lastSep - firstSep) / Math.max(firstSep, 0.01),
        n_paths: paths.length,
      });
    }
    if (bundles.length) return { source: ids[src], bundles };
  }
  return { source: ids[order[0]], bundles: [] };
}

function lastAtoms(snapshot) {
  const s = new Set();
  for (const e of snapshot.edges) for (const a of e) s.add(a);
  return s;
}

function atomsOfEvent(ev) {
  const s = new Set();
  for (const e of ev.destroyedEdges || []) for (const a of e) s.add(a);
  for (const e of ev.createdEdges || []) for (const a of e) s.add(a);
  return s;
}

function verifyDevDens(snapshot) {
  const packed = verifyBundles(snapshot);
  if (!packed.bundles.length) {
    return {
      dev: null,
      dens: null,
      pairs: [],
      source: packed.source,
      n_bundles: 0,
    };
  }
  const last = lastAtoms(snapshot);
  const byId = new Map(snapshot.events.map(ev => [ev.id, ev]));
  const preds = new Map();
  for (const ev of snapshot.events) preds.set(ev.id, []);
  for (const e of snapshot.causalEdges) {
    if (!preds.has(e.to)) preds.set(e.to, []);
    preds.get(e.to).push(e.from);
  }
  const touch = new Map();
  for (const ev of snapshot.events) {
    for (const a of atomsOfEvent(ev)) {
      if (!touch.has(a)) touch.set(a, []);
      touch.get(a).push(ev.id);
    }
  }
  const pairs = [];
  for (const b of packed.bundles) {
    const evIds = [];
    const seenE = new Set();
    for (const p of b.paths) {
      for (const id of p) {
        if (!seenE.has(id)) {
          seenE.add(id);
          evIds.push(id);
        }
      }
    }
    const ball = new Set();
    for (const id of evIds) {
      const ev = byId.get(id);
      if (!ev) continue;
      for (const a of atomsOfEvent(ev)) if (last.has(a)) ball.add(a);
    }
    if (ball.size === 0) continue;
    const seeds = [];
    const seedSet = new Set();
    for (const a of ball) {
      const hits = touch.get(a) || [];
      for (const id of hits) {
        if (!seedSet.has(id)) {
          seedSet.add(id);
          seeds.push(id);
        }
      }
    }
    const past = new Set();
    const q = seeds.slice();
    for (let qi = 0; qi < q.length; qi++) {
      const id = q[qi];
      if (past.has(id)) continue;
      past.add(id);
      const pr = preds.get(id) || [];
      for (let k = 0; k < pr.length; k++) if (!past.has(pr[k])) q.push(pr[k]);
    }
    let incident = 0;
    for (const e of snapshot.causalEdges) {
      if (past.has(e.from) || past.has(e.to)) incident++;
    }
    pairs.push({
      hop: b.hop,
      dev: b.deviation,
      dens: incident / ball.size,
      ball: ball.size,
      incident,
      n_paths: b.n_paths,
    });
  }
  if (!pairs.length) {
    return { dev: null, dens: null, pairs: [], source: packed.source, n_bundles: packed.bundles.length };
  }
  let sDev = 0;
  let sDens = 0;
  for (const p of pairs) {
    sDev += p.dev;
    sDens += p.dens;
  }
  return {
    dev: sDev / pairs.length,
    dens: sDens / pairs.length,
    pairs,
    source: packed.source,
    n_bundles: pairs.length,
  };
}

function pearsonIndependent(pairs) {
  const n = pairs.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += pairs[i].dev;
    sy += pairs[i].dens;
  }
  const mx = sx / n;
  const my = sy / n;
  let c = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    const a = pairs[i].dev - mx;
    const b = pairs[i].dens - my;
    c += a * b;
    vx += a * a;
    vy += b * b;
  }
  if (vx === 0 || vy === 0) return null;
  return c / Math.sqrt(vx * vy);
}

function verifyFour(snapshot, opts) {
  const allowCorr = !!(opts && opts.allowCorr);
  assertReplayMatches(snapshot);
  const match = verifyMatch(snapshot);
  const ball = verifyBall(snapshot);
  const cap_hit = !!snapshot.truncated || snapshot.edges.length > MAX_EDGES;
  const row = {
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
  if (!match.yes) return row;
  const dd = verifyDevDens(snapshot);
  row.dev = dd.dev;
  row.dens = dd.dens;
  row.source = dd.source;
  row.n_bundles = dd.n_bundles;
  row.n_pairs = dd.pairs.length;
  row.gravity_undefined = dd.dev === null;
  if (dd.dev !== null) row.converging = dd.dev < CONVERGING_THRESHOLD;
  if (allowCorr && dd.pairs.length) row.corr = pearsonIndependent(dd.pairs);
  if (row.corr !== null) row.einstein_like = row.corr < 0;
  return row;
}

function replayClaim(snapshot, claimed) {
  const got = verifyFour(snapshot, { allowCorr: true });
  return { got, claimed };
}

module.exports = {
  CONVERGING_THRESHOLD,
  MAX_EDGES,
  verifyFour,
  replayClaim,
  assertReplayMatches,
  replayLastEdges,
};
