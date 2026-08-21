#!/usr/bin/env node
'use strict';

/**
 * Independent replay of any claimed jsonl cell.
 * Re-evolves the sealed HypergraphRewriter and rechecks via verifier.
 *
 *   node replay-cell.js dim27
 *   node replay-cell.js --all
 */

const fs = require('fs');
const path = require('path');
const { stampSources, assertSealed, loadSealedRewriter } = require('./load-sealed-rewriter');
const { extractRewriter } = require('./extract-rewriter');
const { evolveSnapshot } = require('./searcher');
const { verifyFour } = require('./independent-verifier');
const PRESETS = require('./presets');

const JSONL = path.join(__dirname, 'results.jsonl');

function loadRows() {
  if (!fs.existsSync(JSONL)) throw new Error('results.jsonl missing; run run-golden.js first');
  return fs.readFileSync(JSONL, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function roundLeaf(v) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return v;
    return Math.round(v * 1e8) / 1e8;
  }
  if (Array.isArray(v)) return v.map(roundLeaf);
  return v;
}

function valuesAgree(a, b) {
  a = roundLeaf(a);
  b = roundLeaf(b);
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    if (!Number.isFinite(a) && !Number.isFinite(b)) return true;
    return Math.abs(a - b) <= 1e-8;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => valuesAgree(v, b[i]));
  }
  return false;
}

function replayOne(HypergraphRewriter, spec, claimed) {
  const snapshot = evolveSnapshot(HypergraphRewriter, spec);
  const got = verifyFour(snapshot, { allowCorr: true });
  const keys = ['rule', 'steps', 'match', 'V_r', 'hatd', 'dev', 'dens', 'corr', 'cap_hit', 'truncated'];
  const diffs = [];
  for (const k of keys) {
    if (!valuesAgree(got[k], claimed[k])) diffs.push({ key: k, got: got[k], claimed: claimed[k] });
  }
  return { rule: spec.rule, ok: diffs.length === 0, diffs, gravity_undefined: got.gravity_undefined };
}

function main() {
  const arg = process.argv[2] || '--all';
  const stamp = stampSources();
  assertSealed(stamp);
  const { extracted } = extractRewriter();
  const HypergraphRewriter = loadSealedRewriter(extracted.source);
  const rows = loadRows();
  const want = arg === '--all' ? PRESETS.map(p => p.rule) : [arg];
  const out = [];
  for (const rule of want) {
    const spec = PRESETS.find(p => p.rule === rule);
    const claimed = rows.find(r => r.rule === rule);
    if (!spec || !claimed) throw new Error(`no preset/row for ${rule}`);
    out.push(replayOne(HypergraphRewriter, spec, claimed));
  }
  const failed = out.filter(r => !r.ok);
  process.stdout.write(JSON.stringify({ replayed: out, failed: failed.length }, null, 2) + '\n');
  if (failed.length) process.exit(1);
}

main();
