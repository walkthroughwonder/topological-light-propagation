#!/usr/bin/env node
'use strict';

/**
 * IDEA-GRAV-FOUR-NUMBERS golden suite.
 * Node only. Evolves sealed HypergraphRewriter from index.html.
 * Searcher and verifier share no measurement code.
 *
 * Evidence class: BOUNDED COMPUTATION / EXPLORATORY.
 * Cap: maxEdges=8000 (not hidden).
 * Do not compute corr until PREREGISTER.md is asserted present.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  INDEX_PATH,
  stampSources,
  assertSealed,
  assertPreregisterLocked,
  loadSealedRewriter,
} = require('./load-sealed-rewriter');
const { extractRewriter, CLASS_LINE } = require('./extract-rewriter');
const { evolveSnapshot, measureFour } = require('./searcher');
const { verifyFour } = require('./independent-verifier');
const PRESETS = require('./presets');

const OUT_JSONL = path.join(__dirname, 'results.jsonl');
const OUT_SEAL = path.join(__dirname, 'SEAL.json');

function assertNoSharedCode() {
  const src = fs.readFileSync(path.join(__dirname, 'independent-verifier.js'), 'utf8');
  if (/require\s*\([^)]*(?:searcher|extract-rewriter|load-sealed|index\.html|worker\.js)/.test(src)) {
    throw new Error('independent-verifier.js must not load searcher, extractor, index.html, or worker.js');
  }
  const searcher = fs.readFileSync(path.join(__dirname, 'searcher.js'), 'utf8');
  if (/\bcheckCausalInvariance\s*\(/.test(searcher) || /\blevenshteinLike\s*\(/.test(searcher)) {
    throw new Error('searcher.js must not invoke worker CI or the string-edit helper');
  }
  if (/\bmeasureGeodesicDeviation\s*\(/.test(searcher)) {
    throw new Error('searcher.js must not invoke the unused string-bundle kernel');
  }
}

function extractSTPresets(src) {
  const needle = 'const ST_PRESETS = {';
  const start = src.indexOf(needle);
  if (start < 0) throw new Error('ST_PRESETS missing from index.html');
  let depth = 0;
  let i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      i = nl < 0 ? src.length - 1 : nl;
      continue;
    }
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        const objSrc = src.slice(src.indexOf('{', start), i + 1);
        const ctx = { console };
        vm.createContext(ctx);
        vm.runInContext('this.ST_PRESETS = ' + objSrc + ';\n', ctx);
        return ctx.ST_PRESETS;
      }
    }
  }
  throw new Error('unbalanced ST_PRESETS');
}

function sameEdges(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return false;
    for (let j = 0; j < a[i].length; j++) if (a[i][j] !== b[i][j]) return false;
  }
  return true;
}

function assertPresetsSealed() {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');
  const live = extractSTPresets(src);
  for (const spec of PRESETS) {
    const p = live[spec.rule];
    if (!p) throw new Error(`ST_PRESETS missing ${spec.rule}`);
    if (!sameEdges(p.lhs, spec.lhs) || !sameEdges(p.rhs, spec.rhs) || !sameEdges(p.init, spec.init)) {
      throw new Error(`ST_PRESETS ${spec.rule} drifted from sealed copy`);
    }
    if (p.steps !== spec.steps) {
      throw new Error(`ST_PRESETS ${spec.rule} steps ${p.steps} !== ${spec.steps}`);
    }
  }
}

function roundLeaf(v) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return v;
    return Math.round(v * 1e8) / 1e8;
  }
  if (v && typeof v === 'object') {
    const o = Array.isArray(v) ? [] : {};
    for (const [k, val] of Object.entries(v)) o[k] = roundLeaf(val);
    return o;
  }
  return v;
}

function valuesAgree(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    if (!Number.isFinite(a) && !Number.isFinite(b)) return true;
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === 'reason') continue;
    if (!valuesAgree(a[k], b[k])) return false;
  }
  return true;
}

function main() {
  assertNoSharedCode();
  const preregisterText = assertPreregisterLocked();
  const stamp = stampSources();
  assertSealed(stamp);
  assertPresetsSealed();
  const { extracted, inspect } = extractRewriter();
  const HypergraphRewriter = loadSealedRewriter(extracted.source);

  const rows = [];
  const extras = [];

  for (const spec of PRESETS) {
    const snapshot = evolveSnapshot(HypergraphRewriter, spec);
    const searcherNoCorr = measureFour(snapshot, { allowCorr: false });
    if (searcherNoCorr.corr !== null) {
      throw new Error('searcher computed corr before allowCorr');
    }
    if (!preregisterText.includes('Einstein-like sign would be')) {
      throw new Error('refusing corr: preregister sign missing');
    }
    const searcher = measureFour(snapshot, { allowCorr: true });
    const independent = verifyFour(snapshot, { allowCorr: true });
    const compareKeys = [
      'rule', 'steps', 'match', 'V_r', 'hatd', 'dev', 'dens', 'corr',
      'cap_hit', 'truncated', 'gravity_undefined', 'converging', 'einstein_like',
      'diam', 'r_window', 'n_atoms', 'n_events', 'n_edges', 'n_causal',
    ];
    const a = {};
    const b = {};
    for (const k of compareKeys) {
      a[k] = searcher[k];
      b[k] = independent[k];
    }
    const agree = valuesAgree(a, b);
    if (!agree) {
      throw new Error('searcher vs verifier disagree:\n' + JSON.stringify({ a, b }, null, 2));
    }
    extras.push({
      rule: spec.rule,
      role: spec.role,
      n_atoms: snapshot.atomCount,
      n_events: snapshot.events.length,
      n_edges: snapshot.edges.length,
      n_causal: snapshot.causalEdges.length,
      truncated: snapshot.truncated,
      maxEdges: snapshot.maxEdges,
    });
    rows.push(roundLeaf({
      rule: searcher.rule,
      steps: searcher.steps,
      match: searcher.match,
      V_r: searcher.V_r,
      hatd: searcher.hatd,
      dev: searcher.dev,
      dens: searcher.dens,
      corr: searcher.corr,
      cap_hit: searcher.cap_hit,
      truncated: searcher.truncated,
      r_window: searcher.r_window,
      diam: searcher.diam,
      n_atoms: searcher.n_atoms,
      n_events: searcher.n_events,
      n_edges: searcher.n_edges,
      n_causal: searcher.n_causal,
      match_reason: searcher.match_reason,
      first_fail: searcher.first_fail,
      gravity_undefined: searcher.gravity_undefined,
      converging_threshold: searcher.converging_threshold,
      converging: searcher.converging,
      einstein_like: searcher.einstein_like,
      n_pairs: searcher.n_pairs,
      source: searcher.source,
      n_bundles: searcher.n_bundles,
      independent_agree: true,
      maxEdges: searcher.maxEdges,
    }));
  }

  const seal = {
    idea: 'IDEA-GRAV-FOUR-NUMBERS',
    instrument: 'GRK instrument-and-seal',
    evidence: 'BOUNDED COMPUTATION / EXPLORATORY',
    name_freeze: 'IDEA-GRAV-FOUR-NUMBERS',
    mathman_3plus1: 'HOLD',
    cite: {
      tlp_pr2: stamp.cite_pr2,
      tlp_pr3: stamp.cite_pr3,
      note: 'Same instrumentation-seal surface. Not a redo of Piskunov or the 41 claim tools.',
    },
    audited_commit: stamp.audited_commit,
    audited_commit_short: stamp.audited_commit_short,
    index_blob: stamp.index_blob,
    worker_blob: stamp.worker_blob,
    cited_commit: stamp.cited_commit,
    citation_matched: stamp.citation_commit_matched && stamp.citation_index_matched,
    current_head_at_audit: stamp.current_head,
    current_index_blob: stamp.current_index_blob,
    current_worker_blob: stamp.current_worker_blob,
    extracted_from: stamp.extracted_from,
    hypergraph_rewriter: {
      start_line: extracted.start_line,
      end_line: extracted.end_line,
      seal_pointer: CLASS_LINE,
      inspect,
    },
    preregister: {
      path: 'audit/idea-grav-four-numbers/PREREGISTER.md',
      first_add_commit: stamp.preregister_commit,
      blob: stamp.preregister_blob,
      einstein_like_sign: 'corr < 0',
      einstein_like_required_on_these_rules: false,
      converging_threshold: -0.1,
      dim27_role: '2.7 CONTROL, not a pass target',
    },
    caps: { maxEdges: 8000 },
    date_utc: '2026-08-21',
    out_of_scope: [
      'no solvers',
      'no SAT',
      'no worker.js checkCausalInvariance',
      'no IDEA-TLP-41 string-Hamming kernel as this measurement',
      'no Ricci / computeRicciCurvature / Expt 9',
      'no Expt 10',
      'no 712',
      'no IDEA-DJ-33',
      'no growers',
      'MathMan 3+1 HOLD',
      'no merge',
      'no fleet-mail',
    ],
  };

  fs.writeFileSync(OUT_SEAL, JSON.stringify(seal, null, 2) + '\n');
  fs.writeFileSync(OUT_JSONL, rows.map(r => JSON.stringify(r)).join('\n') + '\n');

  process.stdout.write(JSON.stringify({ seal: {
    audited_commit: seal.audited_commit,
    index_blob: seal.index_blob,
    citation_matched: seal.citation_matched,
    preregister_commit: seal.preregister.first_add_commit,
  }, extras, rows }, null, 2) + '\n');
}

main();
