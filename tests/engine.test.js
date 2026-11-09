// Engine tests. No dependencies: `node tests/engine.test.js`.
//
// Reference numbers marked "Wolfram" come from ResourceFunction["MultiwaySystem"]
// in Wolfram Language (EvolutionGraph, CausalGraph), recorded November 2026.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const workerSrc = fs.readFileSync(path.join(root, 'worker.js'), 'utf8');
const classSrc = workerSrc.slice(workerSrc.indexOf('class MultiwaySystem {'), workerSrc.indexOf('// ─── Worker message handler')).trimEnd();
const MultiwaySystem = new Function(classSrc + '; return MultiwaySystem;')();

const R = (pairs) => pairs.map(([from, to]) => ({ from, to }));
const run = (pairs, init, steps, cap = 1e6) => { const s = new MultiwaySystem(R(pairs)); s.maxTotalStates = cap; s.evolve(init, steps); return s; };

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + String(e.message).split('\n')[0]); }
}

// ───────────────────────────────────────────────────────── one engine, two files
test('index.html and worker.js contain the same MultiwaySystem class', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const a = html.indexOf('class MultiwaySystem {');
  const inHtml = html.slice(a, html.indexOf('// ═', a)).trimEnd();
  assert.strictEqual(inHtml, classSrc);
});

// ───────────────────────────────────────────────────────── evolution
// Written from the definition, not from the engine's code.
function reference(pairs, init, steps) {
  const layers = [new Map([[init, 1]])]; let edges = 0;
  for (let t = 0; t < steps; t++) {
    const next = new Map();
    for (const [s, w] of layers[t]) for (const [from, to] of pairs) {
      for (let i = s.indexOf(from); i !== -1; i = s.indexOf(from, i + 1)) {
        const c = s.slice(0, i) + to + s.slice(i + from.length);
        next.set(c, (next.get(c) || 0) + w); edges++;
      }
    }
    if (next.size === 0) break;
    layers.push(next);
  }
  return { layers, edges };
}

const evolutionCases = [
  // rules, initial state, steps, Wolfram EvolutionGraph vertices, edges
  [[['Xo', 'oX'], ['oX', 'Xo']], 'ooXoo', 4, 11, 14],
  [[['Xo', 'oX'], ['oX', 'Xo']], 'oXooXo', 4, 27, 56],
  [[['A', 'AB'], ['B', 'A']], 'A', 5, 20, 38],
  [[['AB', 'BA'], ['BA', 'AAB']], 'oooABooo', 4, 6, 5],
  [[['A', 'BBB'], ['BB', 'A']], 'A', 5, 10, 13],
];
for (const [pairs, init, steps, wV, wE] of evolutionCases) {
  test(`evolution ${init} x${steps}: states, edges and path counts`, () => {
    const s = run(pairs, init, steps), ref = reference(pairs, init, steps);
    assert.strictEqual(s.nodes.length, wV, 'state count vs Wolfram');
    assert.strictEqual(s.edges.length, wE, 'edge count vs Wolfram');
    assert.deepStrictEqual(s.stepStates.map((ids) => ids.length), ref.layers.map((m) => m.size));
    assert.strictEqual(s.edges.length, ref.edges);
    const last = s.stepStates.length - 1;
    const got = new Map(s.stepStates[last].map((id) => [s.nodes[id].state, s.nodes[id].weight]));
    assert.deepStrictEqual([...got].sort(), [...ref.layers[last]].sort());
  });
}

// ───────────────────────────────────────────────────────── causal graph
// Events are compared in Wolfram's form (rule, position, state it acts on), so the same
// rewrite at two different steps is one event. `hash` is an order-independent hash of the
// distinct edge set; it matched Wolfram's edge set exactly on every case.
const M = 4294967291n;
const strHash = (s) => { let x = 7n; for (const ch of s) x = (x * 31n + BigInt(ch.codePointAt(0))) % M; return x; };
const causalCases = [
  // rules, initial state, steps, Wolfram: events, distinct causal edges, edge-set hash
  [[['Xo', 'oX'], ['oX', 'Xo']], 'oXooXo', 4, 38, 110, 3308807542],
  [[['AB', 'BA'], ['A', 'AA']], 'ABA', 4, 59, 159, 1438712069],
  [[['BA', 'AAB'], ['A', 'B']], 'BABA', 4, 85, 135, 335968816],
  [[['A', 'AB'], ['B', 'A']], 'AABB', 5, 374, 1245, 1266800748],
  [[['Xo', 'oX'], ['oX', 'Xo']], 'ooXoooXoo', 6, 104, 602, 3536324617],
  [[['A', 'BBB'], ['BB', 'A']], 'A', 6, 19, 45, 2419384361],
  [[['ABA', 'B'], ['B', 'AB']], 'ABAB', 5, 59, 140, 455542167],
  [[['XY', 'YX'], ['XX', 'X']], 'oXYXXYo', 5, 24, 51, 3946202406],
  [[['A', 'AAB'], ['B', 'BA']], 'AB', 4, 178, 236, 2007652717],
  [[['AB', ''], ['A', 'AAB']], 'AAB', 4, 148, 220, 2879792335],
];
for (const [pairs, init, steps, wV, wE, wHash] of causalCases) {
  test(`causal graph ${init} x${steps} equals Wolfram's (${wE} edges)`, () => {
    const s = run(pairs, init, steps);
    s._buildCausalEdges(true); // the complete relation, not just the edges that get drawn
    const key = (ev) => `${pairs[ev.ruleIdx][0]}>${pairs[ev.ruleIdx][1]}@${ev.position}:${s.nodes[ev.parentNodeId].state}`;
    const V = new Set(s.causalEvents.map(key));
    const E = new Set(s.causalEdges.map((e) => key(s.causalEvents[e.from]) + ' => ' + key(s.causalEvents[e.to])));
    let sum = 0n; for (const e of E) sum = (sum + strHash(e)) % M;
    assert.strictEqual(V.size, wV, 'events');
    assert.strictEqual(E.size, wE, 'distinct causal edges');
    assert.strictEqual(Number(sum), wHash, 'edge set');
  });
}

const directPairs = (s) => { const out = []; for (let e = 0; e < s.causalEvents.length; e++) for (let k = s.causalCauseStart[e]; k < s.causalCauseStart[e + 1]; k++) out.push(s.causalCauseList[k] + '>' + e); return out; };

test('direct causes point forward in step order, with no duplicates', () => {
  const s = run([['Xo', 'oX'], ['oX', 'Xo']], 'ooooooXoooooooXoooooo', 10);
  const seen = new Set();
  for (const k of directPairs(s)) {
    const [from, to] = k.split('>').map(Number);
    assert.ok(s.causalEvents[from].step < s.causalEvents[to].step);
    assert.ok(!seen.has(k)); seen.add(k);
  }
  assert.strictEqual(seen.size, s.causalDirectCount);
});

test('drawn edges are a subset of the direct causes, at most 4 per event, and include long-range ones', () => {
  const s = run([['Xo', 'oX'], ['oX', 'Xo']], 'ooooooXoooooooXoooooo', 10);
  const all = new Set(directPairs(s)), perEvent = new Map();
  let longRange = 0;
  for (const e of s.causalEdges) {
    assert.ok(all.has(e.from + '>' + e.to));
    perEvent.set(e.to, (perEvent.get(e.to) || 0) + 1);
    if (s.causalEvents[e.to].step - s.causalEvents[e.from].step > 1) longRange++;
  }
  assert.ok(Math.max(...perEvent.values()) <= 4);
  assert.ok(longRange > 0);
  // every event that has a cause gets at least one drawn edge
  for (let e = 0; e < s.causalEvents.length; e++) {
    if (s.causalCauseStart[e + 1] > s.causalCauseStart[e]) assert.ok(perEvent.has(e));
  }
});

test('light cones follow the complete relation', () => {
  const s = run([['AB', 'BA'], ['A', 'AA']], 'ABA', 5);
  const pairs = directPairs(s).map((k) => k.split('>').map(Number));
  const closure = (start, dir) => { const seen = new Set([start]); const q = [start];
    while (q.length) { const c = q.pop(); for (const [f, t] of pairs) { const [a, b] = dir > 0 ? [f, t] : [t, f]; if (a === c && !seen.has(b)) { seen.add(b); q.push(b); } } }
    return seen; };
  for (const id of [0, 7, 20, 41, s.causalEvents.length - 1]) {
    const cone = s.traceCausalEventCone(id);
    assert.deepStrictEqual([...cone.pastCone].sort((a, b) => a - b), [...closure(id, -1)].sort((a, b) => a - b));
    assert.deepStrictEqual([...cone.futureCone].sort((a, b) => a - b), [...closure(id, 1)].sort((a, b) => a - b));
  }
});

test('stepping one step at a time gives the same causal relation as a batch run', () => {
  const pairs = [['AB', 'BA'], ['A', 'AA']];
  const batch = run(pairs, 'ABA', 5);
  const s = new MultiwaySystem(R(pairs)); s.maxTotalStates = 1e6; s.initInteractive('ABA');
  for (let i = 0; i < 6; i++) s.evolveOneStep();
  s.removeLastStep();
  assert.strictEqual(s.causalEvents.length, batch.causalEvents.length);
  assert.deepStrictEqual(directPairs(s).sort(), directPairs(batch).sort());
});

test('when the bookkeeping budget runs out, the cut-off step is reported', () => {
  const pairs = [['Xo', 'oX'], ['oX', 'Xo']], init = 'ooooooXoooooooXoooooo';
  const full = run(pairs, init, 12);
  assert.strictEqual(full.causalCompleteThroughStep, 12);
  const s = new MultiwaySystem(R(pairs)); s.causalBudget = 20000; s.evolve(init, 12);
  const cut = s.causalCompleteThroughStep;
  assert.ok(cut > 0 && cut < 12);
  // events out of states before the cut-off have exactly the complete causes
  const causes = (x, e) => Array.from(x.causalCauseList.slice(x.causalCauseStart[e], x.causalCauseStart[e + 1])).sort((a, b) => a - b);
  for (let e = 0; e < s.causalEvents.length; e++) {
    if (s.causalEvents[e].step < cut) assert.deepStrictEqual(causes(s, e), causes(full, e));
  }
  assert.ok(s.causalDirectCount < full.causalDirectCount);
});

// ───────────────────────────────────────────────────────── final-step distribution
test('position distribution: one bar per cell, nothing mirrored or dropped', () => {
  const init = 'ooooooXoooooooXoooooo';
  const s = run([['Xo', 'oX'], ['oX', 'Xo']], init, 14);
  const p = s.getIntensityPattern();
  assert.strictEqual(p.mode, 'occupancy');
  assert.strictEqual(p.weights.length, init.length);
  // two X's in every state, so the bars add up to exactly twice the number of paths
  assert.strictEqual(p.weights.reduce((a, b) => a + b, 0), 2 * p.totalWeight);
  // the initial state is mirror-symmetric, so the true distribution is too
  assert.deepStrictEqual(p.weights, [...p.weights].reverse());
  // two walkers give two bumps, not a fringe pattern
  let peaks = 0;
  for (let i = 1; i < p.weights.length - 1; i++) if (p.weights[i] > p.weights[i - 1] && p.weights[i] >= p.weights[i + 1]) peaks++;
  assert.strictEqual(peaks, 2);
});

test('position distribution is not forced symmetric for an off-centre start', () => {
  const p = run([['Xo', 'oX'], ['oX', 'Xo']], 'oXooooooo', 5).getIntensityPattern();
  assert.notDeepStrictEqual(p.weights, [...p.weights].reverse());
});

test('state distribution for other rules keeps every final state and every path', () => {
  const s = run([['A', 'AB'], ['B', 'A']], 'A', 6);
  const p = s.getIntensityPattern();
  assert.strictEqual(p.mode, 'states');
  assert.strictEqual(p.weights.length, p.totalStates);
  assert.strictEqual(p.weights.reduce((a, b) => a + b, 0), p.totalWeight);
});

test('final-step summary contains no interference language', () => {
  const text = run([['Xo', 'oX'], ['oX', 'Xo']], 'oooooooooXoooXooooooooo', 12).analyzeCompletion().map((l) => l.text).join('\n');
  assert.ok(!/DESTRUCTIVE|CONSTRUCTIVE|decohere|fringe/i.test(text));
  assert.ok(/nothing can cancel/.test(text));
});

// ───────────────────────────────────────────────────────── causal invariance
test('sorting rule: every tested critical pair converges; horizon pairs are untested, not failures', () => {
  const c = run([['Xo', 'oX'], ['oX', 'Xo']], 'ooooooXoooooooXoooooo', 14).checkCausalInvariance();
  assert.strictEqual(c.divergent, 0);
  assert.strictEqual(c.invariance, 1);
  assert.ok(c.untested > 0 && c.commuting > 0);
  assert.strictEqual(c.confluent + c.divergent + c.untested, c.criticalPairs);
});

test('a rule that really diverges is reported as diverging', () => {
  // AB can become X or Y; neither can be rewritten again, so the pair never rejoins.
  const pairs = [['AB', 'X'], ['AB', 'Y'], ['o', 'oo']];
  const c = run(pairs, 'oABo', 6).checkCausalInvariance();
  assert.ok(c.divergent > 0);
  assert.ok(c.invariance < 1);
});

test('invariance is null when critical pairs exist but none could be tested', () => {
  const c = run([['AB', 'X'], ['AB', 'Y']], 'AB', 1).checkCausalInvariance();
  assert.strictEqual(c.criticalPairs, 1);
  assert.strictEqual(c.invariance, null);
});

test('coarse-graining does not report an invariance it did not measure', () => {
  const s = run([['Xo', 'oX'], ['oX', 'Xo']], 'oooXoooXooo', 8);
  assert.strictEqual(s.coarseGrain(0).causalInvarianceAfter, null);
  assert.strictEqual(s.coarseGrain(3).causalInvarianceAfter, null);
});

// ───────────────────────────────────────────────────────── robustness
test('a rule with an empty left side is ignored instead of looping forever', () => {
  const s = run([['', 'A'], ['A', 'AB']], 'A', 4, 2000);
  assert.strictEqual(s.nodes.length, 5);
});

test('distance histogram works on a step with thousands of states', () => {
  const s = run([['A', 'AB'], ['B', 'BA']], 'AB', 14, 5000);
  const sizes = s.stepStates.map((x) => x.length), big = sizes.indexOf(Math.max(...sizes));
  assert.ok(sizes[big] > 1500);
  const r = s.computeBranchialDistances(big);
  assert.strictEqual(r.histogram.reduce((a, b) => a + b, 0), r.totalPairs);
  assert.ok(r.meanDist > 0 && r.maxDist === r.histogram.length - 1);
});

test('branchial dimension is repeatable, and null when there is too little graph', () => {
  const s = run([['A', 'AB'], ['B', 'BA']], 'AB', 9);
  const a = s._estimateBranchialDim();
  for (let i = 0; i < 5; i++) assert.strictEqual(s._estimateBranchialDim(), a);
  assert.strictEqual(run([['X', 'XoX']], 'oooXooo', 5)._estimateBranchialDim(), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
