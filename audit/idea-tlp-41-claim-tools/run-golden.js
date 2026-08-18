#!/usr/bin/env node
'use strict';

/**
 * IDEA-TLP-41-CLAIM-TOOLS golden suite.
 * Node only. Evolves sealed MultiwaySystem (worker.js), runs extracted
 * index.html kernels, checks against independent-check.js.
 *
 * Evidence class: BOUNDED COMPUTATION / EXPLORATORY.
 * Caps: maxStateLength=256, maxTotalStates=5000 (TLP defaults).
 * Cite: TLP PR #2 OPEN (audit/idea-tlp-29-piskunov/). Do not redo that audit.
 */

const fs = require('fs');
const path = require('path');
const {
  stampSources,
  assertSealed,
  loadSealedMultiway,
} = require('./load-sealed-multiway');
const { extractAll } = require('./extract-from-index');
const { runExtracted } = require('./extracted-tools');
const { verifyIndependent } = require('./independent-check');
const GOLDEN = require('./presets');

const OUT_JSONL = path.join(__dirname, 'results.jsonl');
const OUT_SEAL = path.join(__dirname, 'SEAL.json');

const UI_NOUN_MATCH = {
  'toggle-zeno': false,
  'btn-detect-tunneling': true,
  'btn-measure-holographic': false,
  'btn-geodesic-deviation': true,
  'btn-detect-tangles': true,
};

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
    if (!valuesAgree(a[k], b[k])) return false;
  }
  return true;
}

function assertNoSharedCode() {
  const src = fs.readFileSync(path.join(__dirname, 'independent-check.js'), 'utf8');
  if (/require\s*\([^)]*(?:worker\.js|load-sealed-multiway|extracted-tools|index\.html)/.test(src)) {
    throw new Error('independent-check.js must not load worker.js, index.html, or the extractor');
  }
}

function evolve(MultiwaySystem, spec) {
  const sys = new MultiwaySystem(spec.rules);
  sys.maxStateLength = 256;
  sys.maxTotalStates = 5000;
  sys.evolve(spec.initial, spec.steps);
  return sys;
}

function main() {
  assertNoSharedCode();
  const stamp = stampSources();
  assertSealed(stamp);
  const extractedMeta = extractAll();
  for (const t of extractedMeta.tools) {
    if (!t.extractable) {
      throw new Error(`UNEXTRACTABLE: ${t.tool} missing ${t.missing.join(',')}`);
    }
  }

  const MultiwaySystem = loadSealedMultiway();
  const rows = [];
  const extras = [];

  for (const spec of GOLDEN) {
    const sys = evolve(MultiwaySystem, spec);
    const extracted = runExtracted(sys);
    const independent = verifyIndependent(extracted.snapshot);
    extras.push({
      preset: spec.preset,
      nodes: sys.nodes.length,
      truncated: !!sys.truncated,
      observer_id: extracted.observerId,
    });
    for (const er of extracted.rows) {
      const iv = independent[er.tool];
      rows.push({
        tool: er.tool,
        preset: spec.preset,
        formula_one_liner: er.formula_one_liner,
        graph: er.graph,
        cap_hit: er.cap_hit,
        ui_noun_match: UI_NOUN_MATCH[er.tool],
        value: roundLeaf(er.value),
        independent_value: roundLeaf(iv),
        agree: valuesAgree(er.value, iv),
      });
    }
  }

  const disagreed = rows.filter(r => !r.agree);
  if (disagreed.length) {
    throw new Error('extracted vs independent disagree:\n' + JSON.stringify(disagreed, null, 2));
  }

  const seal = {
    idea: 'IDEA-TLP-41-CLAIM-TOOLS',
    instrument: 'GRK extract-and-golden',
    evidence: 'BOUNDED COMPUTATION / EXPLORATORY',
    cite: {
      tlp_pr2: 'https://github.com/walkthroughwonder/topological-light-propagation/pull/2',
      tlp_pr2_state: 'OPEN',
      tlp_pr2_path: 'audit/idea-tlp-29-piskunov/',
      note: 'Cited, not redone. Golden presets and MultiwaySystem loader reused/adapted.',
    },
    audited_commit: stamp.audited_commit,
    audited_commit_short: stamp.audited_commit_short,
    worker_blob: stamp.worker_blob,
    index_blob: stamp.index_blob,
    cited_commit: stamp.cited_commit,
    cited_blob: stamp.cited_blob,
    citation_matched: stamp.citation_blob_matched && stamp.citation_commit_matched,
    current_head_at_audit: stamp.current_head,
    current_worker_blob: stamp.current_worker_blob,
    current_index_blob: stamp.current_index_blob,
    extracted_from: stamp.extracted_from,
    tunnel_shuffle: 'UI Math.random replaced by insertion-order prefix (threshold 1.5 / n=20 / cap 50 unchanged)',
    caps: { maxStateLength: 256, maxTotalStates: 5000 },
    observer: 'first node at step floor((nSteps-1)/2)',
    date_utc: '2026-08-18',
    out_of_scope: [
      'no solvers',
      'no SAT',
      'no Ricci / dimension dump (Expt 9)',
      'Expt 10 not started',
      'zarankiewicz/712 not touched',
      'no merge',
    ],
    tools: extractedMeta.tools.map(t => ({
      tool: t.tool,
      title: t.title,
      extractable: t.extractable,
      functions: t.functions.map(f => ({ name: f.name, start_line: f.start_line, end_line: f.end_line })),
      helpers: t.helpers.map(f => ({ name: f.name, start_line: f.start_line, end_line: f.end_line })),
      inspect: t.inspect,
    })),
  };

  fs.writeFileSync(OUT_SEAL, JSON.stringify(seal, null, 2) + '\n');
  fs.writeFileSync(OUT_JSONL, rows.map(r => JSON.stringify(r)).join('\n') + '\n');

  process.stdout.write(JSON.stringify({
    seal: {
      audited_commit: seal.audited_commit,
      worker_blob: seal.worker_blob,
      index_blob: seal.index_blob,
      citation_matched: seal.citation_matched,
    },
    extras,
    rows,
  }, null, 2) + '\n');
}

main();
