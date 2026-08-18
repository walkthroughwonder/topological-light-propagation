'use strict';

/**
 * IDEA-TLP-29-PISKUNOV — sealed loader.
 * Instantiates MultiwaySystem from worker.js without editing that file.
 * Strips only the Web Worker `self.onmessage` handler (Node has no `self`).
 * Shares the exact class body; does not reimplement checkCausalInvariance.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WORKER_PATH = path.join(REPO_ROOT, 'worker.js');
const HANDLER_MARK = '// ─── Worker message handler';

const CITED_COMMIT_PREFIX = 'c60aed3eb08d';
const CITED_BLOB_PREFIX = '961def89';

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function stampWorker() {
  const commit = git(['rev-parse', 'HEAD']);
  const blob = git(['hash-object', 'worker.js']);
  const ls = git(['ls-tree', 'HEAD', 'worker.js']);
  const treeBlob = (ls.split(/\s+/)[2] || '').trim();
  return {
    repo_root: REPO_ROOT,
    worker_path: WORKER_PATH,
    audited_commit: 'c60aed3eb08ded734dde98d4365a39450acc4904',
    audited_commit_short: 'c60aed3eb08d',
    worker_blob: '961def89f04c3688272e540414d172c70d196fa0',
    cited_commit: CITED_COMMIT_PREFIX,
    cited_blob: CITED_BLOB_PREFIX,
    citation_commit_matched: commit.startsWith(CITED_COMMIT_PREFIX) ||
      commit === 'c60aed3eb08ded734dde98d4365a39450acc4904',
    citation_blob_matched: blob.startsWith(CITED_BLOB_PREFIX),
    current_head: commit,
    current_worker_blob: blob,
    current_tree_blob: treeBlob,
    worker_bytes: fs.statSync(WORKER_PATH).size,
    extracted_function: 'MultiwaySystem.checkCausalInvariance',
  };
}

function assertSealed(stamp) {
  if (stamp.current_worker_blob !== stamp.worker_blob) {
    throw new Error(
      `worker.js blob drifted: sealed ${stamp.worker_blob} vs ${stamp.current_worker_blob}`
    );
  }
  if (!stamp.current_worker_blob.startsWith(CITED_BLOB_PREFIX)) {
    throw new Error(`cited blob prefix ${CITED_BLOB_PREFIX} missing on ${stamp.current_worker_blob}`);
  }
}

function loadSealedMultiway() {
  const src = fs.readFileSync(WORKER_PATH, 'utf8');
  const cut = src.indexOf(HANDLER_MARK);
  if (cut < 0) {
    throw new Error('worker.js is missing the Worker message handler marker; refuse to eval the Worker shell');
  }
  const classSrc = src.slice(0, cut);
  if (!classSrc.includes('checkCausalInvariance()')) {
    throw new Error('extracted worker.js prefix does not contain checkCausalInvariance');
  }
  const ctx = {
    console,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    Infinity,
    NaN,
  };
  vm.createContext(ctx);
  vm.runInContext(classSrc + '\nthis.MultiwaySystem = MultiwaySystem;\n', ctx);
  if (typeof ctx.MultiwaySystem !== 'function') {
    throw new Error('failed to extract MultiwaySystem from worker.js');
  }
  return ctx.MultiwaySystem;
}

function extractFunctionSource() {
  const src = fs.readFileSync(WORKER_PATH, 'utf8');
  const start = src.indexOf('  checkCausalInvariance() {');
  if (start < 0) throw new Error('checkCausalInvariance not found in worker.js');
  let depth = 0;
  let i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        return src.slice(start, i + 1);
      }
    }
  }
  throw new Error('unbalanced braces in checkCausalInvariance');
}

function inspectFunctionSource(fnSrc) {
  return {
    maxLookahead: /const maxLookahead = (\d+)/.exec(fnSrc) ? Number(RegExp.$1) : null,
    counts_nonoverlap_as_confluent: fnSrc.includes('Non-overlapping inputs always commute'),
    uses_state_equality: fnSrc.includes('sA === sB'),
    uses_node_intersection: fnSrc.includes('reachedB.has(n)'),
    uses_state_intersection: fnSrc.includes('statesA.has(s)'),
    mentions_causal_iso: /isomorph/i.test(fnSrc),
    unresolved_go_to_divergent: fnSrc.includes('if (converged) confluent++; else divergent++;'),
    return_keys: ['confluent', 'divergent', 'criticalPairs', 'total', 'invariance'],
  };
}

module.exports = {
  REPO_ROOT,
  WORKER_PATH,
  CITED_COMMIT_PREFIX,
  CITED_BLOB_PREFIX,
  stampWorker,
  assertSealed,
  loadSealedMultiway,
  extractFunctionSource,
  inspectFunctionSource,
};
