'use strict';

/**
 * IDEA-TLP-41-CLAIM-TOOLS — independent numeric check.
 *
 * Reimplements the five extracted formulas on a plain graph snapshot.
 * Shares no require() of worker.js / index.html / extracted-tools.js.
 * Different names, adjacency layout, and control flow than index.html.
 *
 * No SAT. No solvers.
 */

function buildAdj(edges) {
  const forward = new Map();
  const backward = new Map();
  const undirected = new Map();
  function add(map, a, b) {
    if (!map.has(a)) map.set(a, []);
    map.get(a).push(b);
  }
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    add(forward, e.from, e.to);
    add(backward, e.to, e.from);
    add(undirected, e.from, e.to);
    add(undirected, e.to, e.from);
  }
  return { forward, backward, undirected };
}

function walkForward(start, forward) {
  const seen = new Set([start]);
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const kids = forward.get(q[i]) || [];
    for (let k = 0; k < kids.length; k++) {
      const id = kids[k];
      if (!seen.has(id)) {
        seen.add(id);
        q.push(id);
      }
    }
  }
  return seen;
}

function neighborsBothWays(id, adj) {
  // Same order as index.html findShortestPath: children, then parents.
  const kids = adj.forward.get(id) || [];
  const pars = adj.backward.get(id) || [];
  const out = [];
  for (let i = 0; i < kids.length; i++) out.push(kids[i]);
  for (let i = 0; i < pars.length; i++) out.push(pars[i]);
  return out;
}

function bfsDist(start, nbsOf) {
  const dist = new Map();
  dist.set(start, 0);
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    const d = dist.get(cur);
    const nbs = nbsOf(cur);
    for (let k = 0; k < nbs.length; k++) {
      const nb = nbs[k];
      if (!dist.has(nb)) {
        dist.set(nb, d + 1);
        q.push(nb);
      }
    }
  }
  return dist;
}

function bfsPath(start, goal, nbsOf) {
  if (start === goal) return [start];
  const prev = new Map();
  prev.set(start, null);
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    if (cur === goal) break;
    const nbs = nbsOf(cur);
    for (let k = 0; k < nbs.length; k++) {
      const nb = nbs[k];
      if (!prev.has(nb)) {
        prev.set(nb, cur);
        q.push(nb);
      }
    }
  }
  if (!prev.has(goal)) return null;
  const path = [];
  let cur = goal;
  while (cur !== null) {
    path.push(cur);
    cur = prev.get(cur);
  }
  path.reverse();
  return path;
}

function lastFilled(stepStates) {
  for (let s = stepStates.length - 1; s >= 0; s--) {
    if (stepStates[s] && stepStates[s].length) return s;
  }
  return 0;
}

function prefixMismatch(a, b) {
  if (a === b) return 0;
  const long = a.length > b.length ? a.length : b.length;
  if (long === 0) return 0;
  let d = a.length > b.length ? a.length - b.length : b.length - a.length;
  const n = a.length < b.length ? a.length : b.length;
  for (let i = 0; i < n; i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) d++;
  }
  return d;
}

function mostCommonBigram(word) {
  if (word.length < 2) return null;
  const tally = new Map();
  for (let i = 0; i < word.length - 1; i++) {
    const pair = word.charAt(i) + word.charAt(i + 1);
    tally.set(pair, (tally.get(pair) || 0) + 1);
  }
  let best = null;
  let bestN = 0;
  for (const [pair, n] of tally) {
    if (n > bestN) {
      bestN = n;
      best = pair;
    }
  }
  if (bestN >= 2) return best;
  return word.length >= 2 ? word.slice(0, 2) : null;
}

function logFit(xs, ys) {
  const n = xs.length;
  if (n < 2) return { slope: 0, r2: 0 };
  const lx = [];
  const ly = [];
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.log(xs[i] < 1 ? 1 : xs[i]);
    const y = Math.log(ys[i] < 1 ? 1 : ys[i]);
    lx.push(x);
    ly.push(y);
    mx += x;
    my += y;
  }
  mx /= n;
  my /= n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (lx[i] - mx) * (ly[i] - my);
    den += (lx[i] - mx) * (lx[i] - mx);
  }
  const slope = den > 0 ? num / den : 0;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = my + slope * (lx[i] - mx);
    const err = ly[i] - pred;
    ssRes += err * err;
    const tot = ly[i] - my;
    ssTot += tot * tot;
  }
  return { slope, r2: ssTot > 0 ? 1 - ssRes / ssTot : 0 };
}

function checkZeno(snap, adj) {
  const t = snap.currentStep;
  const ids = snap.stepStates[t] || [];
  const total = ids.length;
  const cone = walkForward(snap.observerId, adj.forward);
  let live = 0;
  for (let i = 0; i < ids.length; i++) {
    if (cone.has(ids[i])) live++;
  }
  return {
    step: t,
    totalBranches: total,
    survivingBranches: live,
    frozenRatio: total > 0 ? 1 - live / total : 0,
  };
}

function checkTunnel(snap, adj) {
  const t = lastFilled(snap.stepStates);
  const finals = (snap.stepStates[t] || []).slice();
  if (finals.length < 3) {
    return { n_pairs: 0, avg_ratio: 0, max_ratio: 0, n_final: finals.length };
  }
  const branch = new Map();
  for (let i = 0; i < snap.branchialEdges.length; i++) {
    const e = snap.branchialEdges[i];
    if (!branch.has(e.from)) branch.set(e.from, []);
    if (!branch.has(e.to)) branch.set(e.to, []);
    branch.get(e.from).push(e.to);
    branch.get(e.to).push(e.from);
  }
  const take = finals.length < 20 ? finals : finals.slice(0, 20);
  const found = [];
  const branchNbs = id => branch.get(id) || [];
  const evNbs = id => neighborsBothWays(id, adj);
  for (let i = 0; i < take.length && found.length < 50; i++) {
    const bd = bfsDist(take[i], branchNbs);
    for (let j = i + 1; j < take.length && found.length < 50; j++) {
      const b = bd.get(take[j]);
      if (b === undefined || b === 0) continue;
      const path = bfsPath(take[i], take[j], evNbs);
      if (!path || path.length <= 1) continue;
      const c = path.length - 1;
      if (!isFinite(c) || c === 0) continue;
      const ratio = c / b;
      if (ratio > 1.5) {
        found.push(ratio);
      }
    }
  }
  found.sort((a, b) => b - a);
  const avg = found.length ? found.reduce((s, r) => s + r, 0) / found.length : 0;
  return {
    n_pairs: found.length,
    avg_ratio: avg,
    max_ratio: found.length ? found[0] : 0,
    n_final: finals.length,
  };
}

function checkBallScales(snap, adj) {
  const byId = new Map();
  for (let i = 0; i < snap.nodes.length; i++) byId.set(snap.nodes[i].id, snap.nodes[i]);
  const dist = bfsDist(snap.observerId, id => neighborsBothWays(id, adj));
  let maxD = 0;
  for (const d of dist.values()) if (d > maxD) maxD = d;
  const rows = [];
  for (let r = 1; r <= maxD; r++) {
    let vol = 0;
    let shell = 0;
    const states = new Set();
    for (const [id, d] of dist) {
      if (d <= r) {
        vol++;
        const node = byId.get(id);
        if (node) states.add(node.state);
      }
      if (d === r) shell++;
    }
    rows.push({ r, vol, shell, distinct: states.size });
  }
  const usable = rows.filter(row => row.shell > 0 && row.distinct > 0);
  const bFit = logFit(usable.map(row => row.shell), usable.map(row => row.distinct));
  const vFit = logFit(usable.map(row => row.vol), usable.map(row => row.distinct));
  return {
    n_radii: rows.length,
    boundary_slope: bFit.slope,
    boundary_r2: bFit.r2,
    volume_slope: vFit.slope,
    volume_r2: vFit.r2,
    r2_boundary_gt_r2_volume: bFit.r2 > vFit.r2,
  };
}

function checkBundles(snap, adj) {
  const byId = new Map();
  for (let i = 0; i < snap.nodes.length; i++) byId.set(snap.nodes[i].id, snap.nodes[i]);
  const observer = snap.observerId;
  const observerStep = byId.get(observer).step;
  const maxStep = snap.stepStates.length - 1;
  const targets = [];
  const startS = observerStep + 2 > maxStep - 1 ? observerStep + 2 : maxStep - 1;
  for (let s = startS; s <= maxStep; s++) {
    const ids = snap.stepStates[s] || [];
    for (let i = 0; i < ids.length; i++) targets.push(ids[i]);
  }
  if (targets.length < 2) {
    return { n_bundles: 0, avg_deviation: 0, n_converging: 0, n_diverging: 0 };
  }
  const paths = [];
  for (let i = 0; i < targets.length; i++) {
    const p = bfsPath(observer, targets[i], id => neighborsBothWays(id, adj));
    if (p && p.length >= 3) paths.push(p);
  }
  if (paths.length < 2) {
    return { n_bundles: 0, avg_deviation: 0, n_converging: 0, n_diverging: 0 };
  }
  const groups = new Map();
  for (let i = 0; i < paths.length; i++) {
    const hop = paths[i][1];
    if (!groups.has(hop)) groups.set(hop, []);
    groups.get(hop).push(paths[i]);
  }
  const out = [];
  for (const bundle of groups.values()) {
    if (bundle.length < 2) continue;
    let longest = 0;
    for (let i = 0; i < bundle.length; i++) {
      if (bundle[i].length > longest) longest = bundle[i].length;
    }
    const profile = [];
    for (let depth = 1; depth < longest; depth++) {
      const at = [];
      for (let i = 0; i < bundle.length; i++) {
        if (depth < bundle[i].length) at.push(bundle[i][depth]);
      }
      if (at.length < 2) continue;
      let sum = 0;
      let nPairs = 0;
      for (let i = 0; i < at.length; i++) {
        for (let j = i + 1; j < at.length; j++) {
          const ni = byId.get(at[i]);
          const nj = byId.get(at[j]);
          if (!ni || !nj) continue;
          const stepGap = ni.step > nj.step ? ni.step - nj.step : nj.step - ni.step;
          const sd = ni.state === nj.state ? 0 : prefixMismatch(ni.state, nj.state);
          sum += stepGap + sd;
          nPairs++;
        }
      }
      if (nPairs > 0) profile.push(sum / nPairs);
    }
    if (profile.length < 2) continue;
    const first = profile[0];
    const last = profile[profile.length - 1];
    const denom = first > 0.01 ? first : 0.01;
    const deviation = (last - first) / denom;
    out.push({
      deviation,
      converging: deviation < -0.1,
      diverging: deviation > 0.1,
    });
  }
  const avg = out.length ? out.reduce((s, d) => s + d.deviation, 0) / out.length : 0;
  return {
    n_bundles: out.length,
    avg_deviation: avg,
    n_converging: out.filter(d => d.converging).length,
    n_diverging: out.filter(d => d.diverging).length,
  };
}

function checkRecurrence(snap, adj) {
  if (snap.nodes.length < 5) {
    return { n: 0, n_exact: 0, n_substr: 0, n_connected: 0, top_strength: 0 };
  }
  const byState = new Map();
  for (let i = 0; i < snap.nodes.length; i++) {
    const n = snap.nodes[i];
    if (!byState.has(n.state)) byState.set(n.state, []);
    byState.get(n.state).push(n.id);
  }
  const byId = new Map();
  for (let i = 0; i < snap.nodes.length; i++) byId.set(snap.nodes[i].id, snap.nodes[i]);

  const hits = [];
  const seenState = new Set();
  for (const [state, ids] of byState) {
    if (ids.length < 2 || seenState.has(state)) continue;
    seenState.add(state);
    const steps = [];
    const stepSet = new Set();
    for (let i = 0; i < ids.length; i++) {
      const st = byId.get(ids[i]).step;
      if (!stepSet.has(st)) {
        stepSet.add(st);
        steps.push(st);
      }
    }
    steps.sort((a, b) => a - b);
    if (steps.length < 2) continue;
    const span = steps[steps.length - 1] - steps[0];
    let earliest = null;
    let latest = null;
    for (let i = 0; i < ids.length; i++) {
      const st = byId.get(ids[i]).step;
      if (st === steps[0] && earliest === null) earliest = ids[i];
      if (st === steps[steps.length - 1]) latest = ids[i];
    }
    let linked = false;
    if (earliest !== null && latest !== null) {
      linked = walkForward(earliest, adj.forward).has(latest);
    }
    hits.push({
      kind: 'exact',
      key: state,
      linked,
      strength: linked ? span * ids.length : ids.length * 0.5,
    });
  }

  const limit = snap.nodes.length < 200 ? snap.nodes.length : 200;
  for (let i = 0; i < limit; i++) {
    const node = snap.nodes[i];
    if (node.state.length < 2) continue;
    const core = mostCommonBigram(node.state);
    if (!core || core.length < 2) continue;
    let regen = 0;
    const kept = [node.id];
    let frontier = (adj.forward.get(node.id) || []).slice();
    for (let depth = 0; depth < 3; depth++) {
      const nxt = [];
      const seenF = new Set();
      for (let f = 0; f < frontier.length; f++) {
        const cid = frontier[f];
        const child = byId.get(cid);
        if (child && child.state.indexOf(core) !== -1) {
          regen++;
          kept.push(cid);
        }
        const gcs = adj.forward.get(cid) || [];
        for (let g = 0; g < gcs.length; g++) {
          if (!seenF.has(gcs[g])) {
            seenF.add(gcs[g]);
            nxt.push(gcs[g]);
          }
        }
      }
      frontier = nxt;
    }
    if (regen >= 2) {
      hits.push({
        kind: 'substring',
        key: `${node.state}:${core}`,
        linked: true,
        strength: regen * 2,
      });
    }
  }

  hits.sort((a, b) => b.strength - a.strength);
  const uniq = [];
  const used = new Set();
  for (let i = 0; i < hits.length; i++) {
    if (used.has(hits[i].key)) continue;
    used.add(hits[i].key);
    uniq.push(hits[i]);
  }
  const top = uniq.slice(0, 20);
  return {
    n: top.length,
    n_exact: top.filter(t => t.kind === 'exact').length,
    n_substr: top.filter(t => t.kind === 'substring').length,
    n_connected: top.filter(t => t.linked).length,
    top_strength: top.length ? top[0].strength : 0,
  };
}

function verifyIndependent(snap) {
  const adj = buildAdj(snap.edges);
  return {
    'toggle-zeno': checkZeno(snap, adj),
    'btn-detect-tunneling': checkTunnel(snap, adj),
    'btn-measure-holographic': checkBallScales(snap, adj),
    'btn-geodesic-deviation': checkBundles(snap, adj),
    'btn-detect-tangles': checkRecurrence(snap, adj),
  };
}

module.exports = { verifyIndependent };
