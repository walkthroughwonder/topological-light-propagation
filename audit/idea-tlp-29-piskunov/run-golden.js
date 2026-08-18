#!/usr/bin/env node
'use strict';

/**
 * IDEA-TLP-29-PISKUNOV golden suite.
 * Node only. Loads MultiwaySystem.checkCausalInvariance from sealed worker.js.
 * Independent verifier lives in independent-verifier.js (no worker imports).
 *
 * Evidence class: BOUNDED COMPUTATION / EXPLORATORY.
 * Caps: maxStateLength=256, maxTotalStates=5000 (TLP defaults).
 * TLP lookahead is hardcoded at 3; unresolved pairs increment divergent.
 */

const fs = require('fs');
const path = require('path');
const {
  REPO_ROOT,
  stampWorker,
  assertSealed,
  loadSealedMultiway,
  extractFunctionSource,
  inspectFunctionSource,
} = require('./load-sealed-multiway');
const { verifyIndependent } = require('./independent-verifier');

const LOOKAHEAD = 3;
const OUT_JSONL = path.join(__dirname, 'results.jsonl');
const OUT_SEAL = path.join(__dirname, 'SEAL.json');

const GOLDEN = [
  {
    preset: 'gorard-fib',
    rules: [{ from: 'A', to: 'AB' }, { from: 'B', to: 'A' }],
    initial: 'A',
    steps: 14,
    note: 'Gallery Gorard Picks / Fibonacci (pure). Orthogonal single-char TRS.',
  },
  {
    preset: 'one-way',
    rules: [{ from: 'Xo', to: 'oX' }],
    initial: 'oooooooooXoooXooooooooo',
    steps: 14,
    note: 'Gallery Asymmetric / One-way sort.',
  },
  {
    preset: 'wolfram-1',
    rules: [{ from: 'A', to: 'BBB' }, { from: 'BB', to: 'A' }],
    initial: 'A',
    steps: 14,
    note: 'Gallery Wolfram Canonical / A→BBB, BB→A.',
  },
  {
    preset: 'hand-ci-not-conf',
    rules: [{ from: 'AB', to: 'X' }, { from: 'BC', to: 'Y' }],
    initial: 'ABC',
    steps: 6,
    note: 'Hand-built string analogue of Piskunov CI ∧ ¬confluent: overlapping AB/BC, two FixedPoints XC vs AY, each a 1-vertex causal graph.',
  },
  {
    preset: 'hand-conf-not-ci',
    rules: [
      { from: 'X', to: 'Y' },
      { from: 'X', to: 'Z' },
      { from: 'Y', to: 'W' },
      { from: 'Z', to: 'V' },
      { from: 'V', to: 'W' },
    ],
    initial: 'X',
    steps: 6,
    note: 'Hand-built string analogue of Piskunov confluent ∧ ¬CI: unique NF W, causal path of 2 vs path of 3.',
  },
];

function runTlp(MultiwaySystem, spec) {
  const sys = new MultiwaySystem(spec.rules);
  sys.maxStateLength = 256;
  sys.maxTotalStates = 5000;
  sys.evolve(spec.initial, spec.steps);
  const raw = sys.checkCausalInvariance();
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${spec.preset}: checkCausalInvariance returned non-object`);
  }
  for (const key of ['confluent', 'divergent', 'criticalPairs', 'invariance']) {
    if (!(key in raw)) throw new Error(`${spec.preset}: missing return key ${key}`);
  }
  const cap_hit = !!(sys.truncated || sys.nodes.length >= 5000);
  return {
    raw,
    cap_hit,
    nodes: sys.nodes.length,
    events: sys.causalEvents.length,
    truncated: !!sys.truncated,
  };
}

function rowFor(spec, tlp, independent) {
  const cap_hit = !!(tlp.cap_hit || independent.cap_hit);
  return {
    preset: spec.preset,
    lookahead: LOOKAHEAD,
    confluent: tlp.raw.confluent,
    divergent: tlp.raw.divergent,
    invariance: tlp.raw.invariance,
    state_joinable: independent.state_joinable,
    causal_graph_iso: independent.causal_graph_iso,
    piskunov_cell: independent.piskunov_cell,
    cap_hit,
  };
}

function assertGoldenInvariants(rows, tlpByPreset, fnInfo) {
  if (fnInfo.maxLookahead !== LOOKAHEAD) {
    throw new Error(`sealed function maxLookahead is ${fnInfo.maxLookahead}, expected ${LOOKAHEAD}`);
  }
  if (!fnInfo.unresolved_go_to_divergent) {
    throw new Error('sealed function no longer counts unresolved lookahead-3 pairs as divergent');
  }
  if (fnInfo.mentions_causal_iso) {
    throw new Error('sealed function now mentions isomorphism — stamp drifted');
  }

  const ciNotConf = rows.find(r => r.preset === 'hand-ci-not-conf');
  const confNotCi = rows.find(r => r.preset === 'hand-conf-not-ci');
  if (!ciNotConf || !confNotCi) throw new Error('hand-built rows missing');

  if (ciNotConf.state_joinable !== false) {
    throw new Error('hand-ci-not-conf must be ¬confluent under the independent verifier');
  }
  if (ciNotConf.causal_graph_iso !== true) {
    throw new Error('hand-ci-not-conf must have isomorphic 1-vertex causal graphs');
  }
  if (!String(ciNotConf.piskunov_cell).includes('CI') || !String(ciNotConf.piskunov_cell).includes('¬confluent')) {
    throw new Error(`hand-ci-not-conf unexpected cell ${ciNotConf.piskunov_cell}`);
  }
  if (ciNotConf.divergent < 1) {
    throw new Error('TLP hid the unresolved/unjoined overlapping pair on hand-ci-not-conf');
  }

  if (confNotCi.state_joinable !== true) {
    throw new Error('hand-conf-not-ci must be joinable under the independent verifier');
  }
  if (confNotCi.causal_graph_iso !== false) {
    throw new Error('hand-conf-not-ci must have non-isomorphic causal DAGs');
  }
  if (!String(confNotCi.piskunov_cell).includes('confluent') || !String(confNotCi.piskunov_cell).includes('¬CI')) {
    throw new Error(`hand-conf-not-ci unexpected cell ${confNotCi.piskunov_cell}`);
  }
  if (confNotCi.divergent !== 0 || confNotCi.confluent < 1) {
    throw new Error('TLP should score hand-conf-not-ci as bounded-joinable (divergent=0)');
  }

  for (const r of rows) {
    if (Object.prototype.hasOwnProperty.call(r, 'percent_causal_invariance')) {
      throw new Error('do not emit percent_causal_invariance');
    }
    if (typeof r.invariance === 'string' && r.invariance.includes('%')) {
      throw new Error('do not format the TLP ratio as a percent CI label');
    }
  }
}

function main() {
  const stamp = stampWorker();
  assertSealed(stamp);
  const fnSrc = extractFunctionSource();
  const fnInfo = inspectFunctionSource(fnSrc);
  const MultiwaySystem = loadSealedMultiway();

  const rows = [];
  const extras = [];
  for (const spec of GOLDEN) {
    const tlp = runTlp(MultiwaySystem, spec);
    const independent = verifyIndependent(spec.rules, spec.initial, {
      maxDepth: spec.steps,
      maxEvents: spec.preset === 'one-way' ? 24 : 16,
      maxTraces: spec.preset.startsWith('hand-') ? 64 : 256,
    });
    const row = rowFor(spec, tlp, independent);
    rows.push(row);
    extras.push({
      preset: spec.preset,
      note: spec.note,
      tlp_nodes: tlp.nodes,
      tlp_events: tlp.events,
      tlp_truncated: tlp.truncated,
      tlp_total: tlp.raw.total,
      tlp_criticalPairs: tlp.raw.criticalPairs,
      independent,
    });
  }

  const tlpByPreset = Object.fromEntries(extras.map(e => [e.preset, e]));
  assertGoldenInvariants(rows, tlpByPreset, fnInfo);

  const seal = {
    idea: 'IDEA-TLP-29-PISKUNOV',
    instrument: 'GRK instrument-and-seal',
    evidence: 'BOUNDED COMPUTATION / EXPLORATORY',
    audited_commit: stamp.audited_commit,
    audited_commit_short: stamp.audited_commit_short,
    worker_blob: stamp.worker_blob,
    cited_commit: stamp.cited_commit,
    cited_blob: stamp.cited_blob,
    citation_matched: stamp.citation_blob_matched && stamp.audited_commit.startsWith(stamp.cited_commit),
    current_head_at_audit: stamp.current_head,
    current_worker_blob: stamp.current_worker_blob,
    extracted_function: stamp.extracted_function,
    source_file: 'worker.js (not index.html / Three.js)',
    lookahead: LOOKAHEAD,
    caps: { maxStateLength: 256, maxTotalStates: 5000 },
    function_inspect: fnInfo,
    date_utc: '2026-08-18',
    piskunov: {
      source: 'https://bulletins.wolframphysics.org/2020/11/confluence-and-causal-invariance/',
      setreplace: 'https://github.com/maxitg/SetReplace/blob/master/Research/ConfluenceAndCausalInvariance/ConfluenceAndCausalInvariance.md',
      published_pairs: 'Wolfram-model hypergraphs; not loadable in TLP string engine',
    },
  };

  fs.writeFileSync(OUT_SEAL, JSON.stringify(seal, null, 2) + '\n');
  fs.writeFileSync(OUT_JSONL, rows.map(r => JSON.stringify(r)).join('\n') + '\n');

  const summary = {
    seal: {
      audited_commit: seal.audited_commit,
      worker_blob: seal.worker_blob,
      citation_matched: seal.citation_matched,
    },
    function_inspect: fnInfo,
    rows,
    extras: extras.map(e => ({
      preset: e.preset,
      tlp_nodes: e.tlp_nodes,
      tlp_events: e.tlp_events,
      tlp_criticalPairs: e.tlp_criticalPairs,
      tlp_total: e.tlp_total,
      join_reason: e.independent.join.reason,
      causal_reason: e.independent.causal.reason,
      independent_cap: e.independent.cap_hit,
    })),
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
