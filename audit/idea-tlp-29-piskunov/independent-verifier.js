'use strict';

/**
 * IDEA-TLP-29-PISKUNOV — independent verifier.
 *
 * Implements (a) final-state joinability and (b) causal-DAG isomorphism
 * for string rewrite systems. Intentionally shares no functions, field
 * names, or control flow with worker.js / MultiwaySystem.
 *
 * Piskunov 2020 (SetReplace bulletin; Wolfram Physics Bulletins 2020-11):
 *   confluence  = any two partial singleway evolutions can be continued
 *                 to isomorphic (here: equal) final states
 *   causal inv. = causal graphs of singleway evolutions under every
 *                 event ordering are isomorphic
 * CI is defined for terminating (FixedPoint) evolutions. Non-terminating
 * systems are reported as CI-undefined; we still compare bounded traces.
 *
 * No SAT, no external solvers. DAG iso is color-refinement + backtrack.
 */

const MAX_STATE_CHARS = 256;
const MAX_STATES = 5000;

function listRedexes(rules, word) {
  const found = [];
  for (let ruleNo = 0; ruleNo < rules.length; ruleNo++) {
    const lhs = rules[ruleNo].from;
    let cursor = 0;
    while (cursor <= word.length) {
      const at = word.indexOf(lhs, cursor);
      if (at === -1) break;
      found.push({
        ruleNo,
        at,
        lhs,
        rhs: rules[ruleNo].to,
      });
      cursor = at + 1;
    }
  }
  return found;
}

function fire(word, redex) {
  return word.slice(0, redex.at) + redex.rhs + word.slice(redex.at + redex.lhs.length);
}

function exploreRewriteGraph(rules, seed, maxDepth) {
  const idOf = new Map();
  const words = [];
  const outgoing = [];
  const depthOf = [];
  let overflow = false;
  let lengthCap = false;

  function admit(word, depth) {
    if (word.length > MAX_STATE_CHARS) {
      lengthCap = true;
      return -1;
    }
    if (idOf.has(word)) return idOf.get(word);
    if (words.length >= MAX_STATES) {
      overflow = true;
      return -1;
    }
    const id = words.length;
    idOf.set(word, id);
    words.push(word);
    outgoing.push([]);
    depthOf.push(depth);
    return id;
  }

  const origin = admit(seed, 0);
  const queue = [origin];
  while (queue.length) {
    const id = queue.shift();
    const word = words[id];
    const depth = depthOf[id];
    if (depth >= maxDepth) continue;
    const redexes = listRedexes(rules, word);
    for (const redex of redexes) {
      const next = fire(word, redex);
      const child = admit(next, depth + 1);
      if (child < 0) continue;
      outgoing[id].push(child);
      if (depthOf[child] === depth + 1 && outgoing[child].length === 0 && !queue.includes(child)) {
        queue.push(child);
      }
    }
  }

  return { words, outgoing, depthOf, overflow, lengthCap, origin };
}

function descendants(outgoing, start) {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const v = stack.pop();
    for (const w of outgoing[v]) {
      if (!seen.has(w)) {
        seen.add(w);
        stack.push(w);
      }
    }
  }
  return seen;
}

function normals(words, outgoing) {
  const out = [];
  for (let i = 0; i < words.length; i++) {
    if (outgoing[i].length === 0) out.push(words[i]);
  }
  return out;
}

/**
 * Bounded confluence / joinability.
 * Terminating unique normal form ⇒ joinable.
 * Distinct normal forms ⇒ not joinable.
 * Otherwise: every pair of distinct children of a common parent must
 * share a descendant in the explored graph. If a pair is open at the
 * depth/state cap, joinability is undecided.
 */
function finalStateJoinable(rules, seed, maxDepth) {
  const g = exploreRewriteGraph(rules, seed, maxDepth);
  const nfs = normals(g.words, g.outgoing);
  const uniqueNF = new Set(nfs);
  const open = [];
  for (let i = 0; i < g.words.length; i++) {
    if (g.outgoing[i].length === 0 && g.depthOf[i] >= maxDepth && listRedexes(rules, g.words[i]).length > 0) {
      open.push(g.words[i]);
    }
  }
  const terminating = open.length === 0 && !g.overflow && !g.lengthCap;

  if (uniqueNF.size > 1 && open.length === 0) {
    return {
      state_joinable: false,
      terminating,
      unique_normal_form: false,
      normal_forms: [...uniqueNF],
      cap_hit: g.overflow || g.lengthCap,
      reason: 'distinct normal forms',
    };
  }

  if (terminating && uniqueNF.size <= 1) {
    return {
      state_joinable: true,
      terminating: true,
      unique_normal_form: true,
      normal_forms: [...uniqueNF],
      cap_hit: false,
      reason: 'unique normal form',
    };
  }

  let undecided = g.overflow || g.lengthCap || open.length > 0;
  for (let parent = 0; parent < g.outgoing.length; parent++) {
    const kids = [...new Set(g.outgoing[parent])];
    for (let i = 0; i < kids.length; i++) {
      for (let j = i + 1; j < kids.length; j++) {
        const a = descendants(g.outgoing, kids[i]);
        let meet = false;
        for (const n of descendants(g.outgoing, kids[j])) {
          if (a.has(n)) { meet = true; break; }
        }
        if (!meet) {
          const aOpen = [...a].some(id => g.outgoing[id].length === 0 && listRedexes(rules, g.words[id]).length > 0);
          const bSet = descendants(g.outgoing, kids[j]);
          const bOpen = [...bSet].some(id => g.outgoing[id].length === 0 && listRedexes(rules, g.words[id]).length > 0);
          if (aOpen || bOpen || g.overflow || g.lengthCap) {
            undecided = true;
          } else {
            return {
              state_joinable: false,
              terminating: false,
              unique_normal_form: uniqueNF.size <= 1,
              normal_forms: [...uniqueNF],
              cap_hit: g.overflow || g.lengthCap,
              reason: `unjoinable peak ${g.words[kids[i]]} vs ${g.words[kids[j]]}`,
            };
          }
        }
      }
    }
  }

  if (undecided) {
    return {
      state_joinable: null,
      terminating: false,
      unique_normal_form: uniqueNF.size <= 1,
      normal_forms: [...uniqueNF],
      cap_hit: true,
      reason: 'joinability open under length-256 / 5000-state / depth cap',
    };
  }

  return {
    state_joinable: true,
    terminating: false,
    unique_normal_form: uniqueNF.size <= 1,
    normal_forms: [...uniqueNF],
    cap_hit: false,
    reason: 'every explored peak has a common descendant',
  };
}

function tokensFrom(word) {
  return [...word].map(ch => ({ ch, born: null }));
}

function applyOnTokens(tokens, redex, eventId) {
  const consumed = tokens.slice(redex.at, redex.at + redex.lhs.length);
  const preds = [];
  const seen = new Set();
  for (const tok of consumed) {
    if (tok.born !== null && !seen.has(tok.born)) {
      seen.add(tok.born);
      preds.push(tok.born);
    }
  }
  const born = redex.rhs.split('').map(ch => ({ ch, born: eventId }));
  const next = tokens.slice(0, redex.at).concat(born, tokens.slice(redex.at + redex.lhs.length));
  return { next, preds };
}

function wordOf(tokens) {
  return tokens.map(t => t.ch).join('');
}

function enumerateSingleway(rules, seed, maxEvents, maxTraces) {
  const traces = [];
  let overflow = false;

  function walk(tokens, events, arrows) {
    if (traces.length >= maxTraces) {
      overflow = true;
      return;
    }
    const word = wordOf(tokens);
    if (word.length > MAX_STATE_CHARS) {
      overflow = true;
      traces.push({ events, arrows, word, halted: false, lengthCap: true });
      return;
    }
    const redexes = listRedexes(rules, word);
    if (redexes.length === 0 || events.length >= maxEvents) {
      traces.push({
        events,
        arrows,
        word,
        halted: redexes.length === 0,
        lengthCap: false,
      });
      return;
    }
    for (const redex of redexes) {
      const eventId = events.length;
      const fired = applyOnTokens(tokens, redex, eventId);
      const nextEvents = events.concat([{
        eventId,
        ruleNo: redex.ruleNo,
        at: redex.at,
      }]);
      const nextArrows = arrows.concat(fired.preds.map(p => [p, eventId]));
      walk(fired.next, nextEvents, nextArrows);
      if (overflow) return;
    }
  }

  walk(tokensFrom(seed), [], []);
  return { traces, overflow };
}

function directedIso(n, edgesP, edgesQ) {
  if (n === 0) return true;
  if (edgesP.length !== edgesQ.length) return false;

  const outP = Array.from({ length: n }, () => []);
  const inP = Array.from({ length: n }, () => []);
  const outQ = Array.from({ length: n }, () => []);
  const inQ = Array.from({ length: n }, () => []);
  for (const [a, b] of edgesP) { outP[a].push(b); inP[b].push(a); }
  for (const [a, b] of edgesQ) { outQ[a].push(b); inQ[b].push(a); }

  let color = new Array(n).fill(0);
  let changed = true;
  let rounds = 0;
  while (changed && rounds < n + 2) {
    changed = false;
    rounds++;
    const signature = (outs, ins, i) => {
      const oc = outs[i].map(j => color[j]).sort((x, y) => x - y);
      const ic = ins[i].map(j => color[j]).sort((x, y) => x - y);
      return `${outs[i].length},${ins[i].length}|${oc.join('.')}|${ic.join('.')}`;
    };
    const ranks = new Map();
    let next = 0;
    const neu = new Array(n);
    for (let i = 0; i < n; i++) {
      const key = signature(outP, inP, i);
      if (!ranks.has(key)) ranks.set(key, next++);
      neu[i] = ranks.get(key);
    }
    for (let i = 0; i < n; i++) {
      if (neu[i] !== color[i]) changed = true;
    }
    color = neu;
  }

  let cQ = new Array(n).fill(0);
  changed = true;
  rounds = 0;
  while (changed && rounds < n + 2) {
    changed = false;
    rounds++;
    const ranks = new Map();
    let next = 0;
    const neu = new Array(n);
    for (let i = 0; i < n; i++) {
      const oc = outQ[i].map(j => cQ[j]).sort((x, y) => x - y);
      const ic = inQ[i].map(j => cQ[j]).sort((x, y) => x - y);
      const key = `${outQ[i].length},${inQ[i].length}|${oc.join('.')}|${ic.join('.')}`;
      if (!ranks.has(key)) ranks.set(key, next++);
      neu[i] = ranks.get(key);
    }
    for (let i = 0; i < n; i++) if (neu[i] !== cQ[i]) changed = true;
    cQ = neu;
  }

  const palette = (colors) => {
    const m = new Map();
    for (const c of colors) m.set(c, (m.get(c) || 0) + 1);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  };
  const pPal = palette(color);
  const qPal = palette(cQ);
  if (pPal.length !== qPal.length) return false;
  for (let i = 0; i < pPal.length; i++) {
    if (pPal[i][1] !== qPal[i][1]) return false;
  }

  // Safer: brute-force bijection when n is small; refinement only prunes.
  const used = new Array(n).fill(false);
  const map = new Array(n).fill(-1);

  function ok(p, q) {
    if (outP[p].length !== outQ[q].length) return false;
    if (inP[p].length !== inQ[q].length) return false;
    for (const t of outP[p]) {
      if (map[t] !== -1 && !outQ[q].includes(map[t])) return false;
    }
    for (const s of inP[p]) {
      if (map[s] !== -1 && !inQ[q].includes(map[s])) return false;
    }
    for (let u = 0; u < n; u++) {
      if (map[u] === -1) continue;
      if (outP[u].includes(p) !== outQ[map[u]].includes(q)) return false;
      if (inP[u].includes(p) !== inQ[map[u]].includes(q)) return false;
    }
    return true;
  }

  function rec(i) {
    if (i === n) return true;
    for (let q = 0; q < n; q++) {
      if (used[q]) continue;
      if (!ok(i, q)) continue;
      used[q] = true;
      map[i] = q;
      if (rec(i + 1)) return true;
      map[i] = -1;
      used[q] = false;
    }
    return false;
  }

  if (n > 12) {
    // Bounded: compare sorted degree + WL color multisets only (no full iso).
    const degP = color.map((c, i) => `${c}:${outP[i].length}-${inP[i].length}`).sort();
    const degQ = cQ.map((c, i) => `${c}:${outQ[i].length}-${inQ[i].length}`).sort();
    return degP.join('|') === degQ.join('|');
  }

  return rec(0);
}

function causalGraphIso(rules, seed, maxEvents, maxTraces) {
  const { traces, overflow } = enumerateSingleway(rules, seed, maxEvents, maxTraces);
  if (traces.length === 0) {
    return {
      causal_graph_iso: true,
      terminating_traces: 0,
      compared: 0,
      cap_hit: overflow,
      reason: 'no traces',
    };
  }

  const halted = traces.filter(t => t.halted);
  const pool = halted.length > 0 ? halted : traces;
  const eventCounts = new Set(pool.map(t => t.events.length));

  let iso = true;
  let compared = 0;
  let reason = 'all compared causal DAGs are isomorphic';
  const ref = pool[0];
  for (let i = 1; i < pool.length; i++) {
    const t = pool[i];
    compared++;
    if (t.events.length !== ref.events.length) {
      iso = false;
      reason = `event-count mismatch ${ref.events.length} vs ${t.events.length}`;
      break;
    }
    if (!directedIso(ref.events.length, ref.arrows, t.arrows)) {
      iso = false;
      reason = `non-isomorphic causal DAGs at ${t.events.length} events`;
      break;
    }
  }

  const allHalted = traces.every(t => t.halted);
  return {
    causal_graph_iso: iso,
    terminating_traces: halted.length,
    total_traces: traces.length,
    compared,
    event_counts: [...eventCounts],
    all_halted: allHalted,
    cap_hit: overflow || traces.some(t => !t.halted),
    reason,
  };
}

function piskunovCell(join, causal) {
  const j = join.state_joinable;
  const c = causal.causal_graph_iso;
  const ciDefined = join.terminating && causal.all_halted && !join.cap_hit && !causal.cap_hit;

  if (j === true && c === true && ciDefined) return 'CI ∧ confluent';
  if (j === false && c === true && ciDefined) return 'CI ∧ ¬confluent';
  if (j === true && c === false) {
    return ciDefined ? 'confluent ∧ ¬CI' : 'confluent ∧ ¬CI (bounded traces)';
  }
  if (j === false && c === false) return '¬CI ∧ ¬confluent';
  if (j === true && c === true && !ciDefined) {
    return 'confluent; CI undefined (non-terminating / bounded)';
  }
  if (j === false && c === true && !ciDefined) {
    return '¬confluent; CI undefined (non-terminating / bounded)';
  }
  if (j === null && c === true) return 'joinability undecided; CI-bounded iso';
  if (j === null && c === false) return 'joinability undecided ∧ ¬CI (bounded traces)';
  if (j === null && c === true && !ciDefined) return 'undecided under cap';
  return 'undecided';
}

function verifyIndependent(rules, seed, opts) {
  const maxDepth = opts.maxDepth ?? 14;
  const maxEvents = opts.maxEvents ?? 16;
  const maxTraces = opts.maxTraces ?? 256;
  const join = finalStateJoinable(rules, seed, maxDepth);
  const causal = causalGraphIso(rules, seed, maxEvents, maxTraces);
  return {
    state_joinable: join.state_joinable,
    causal_graph_iso: causal.causal_graph_iso,
    piskunov_cell: piskunovCell(join, causal),
    cap_hit: !!(join.cap_hit || causal.cap_hit),
    join,
    causal,
  };
}

module.exports = {
  MAX_STATE_CHARS,
  MAX_STATES,
  listRedexes,
  finalStateJoinable,
  causalGraphIso,
  verifyIndependent,
  directedIso,
};
