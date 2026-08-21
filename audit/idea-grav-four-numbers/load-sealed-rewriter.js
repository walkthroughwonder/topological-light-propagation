'use strict';

/**
 * IDEA-GRAV-FOUR-NUMBERS — sealed HypergraphRewriter loader.
 * Instantiates the class from index.html without editing that file.
 * worker.js is stamped only (not loaded, not executed).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WORKER_PATH = path.join(REPO_ROOT, 'worker.js');
const INDEX_PATH = path.join(REPO_ROOT, 'index.html');

const CITED_COMMIT = 'c60aed3eb08ded734dde98d4365a39450acc4904';
const CITED_COMMIT_PREFIX = 'c60aed3eb08d';
const CITED_WORKER_BLOB = '961def89f04c3688272e540414d172c70d196fa0';
const CITED_WORKER_BLOB_PREFIX = '961def89';
const CITED_INDEX_BLOB = '36070e4f18a7e9c92e5e2f4b8bff6a5320577689';
const CITED_INDEX_BLOB_PREFIX = '36070e4f';

const PREREGISTER_COMMIT = '557498a4698e30abfb59d3ac1ee84b19667f16e5';
const PREREGISTER_PATH = path.join(__dirname, 'PREREGISTER.md');

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function stampSources() {
  const commit = git(['rev-parse', 'HEAD']);
  const mergeBase = git(['merge-base', 'HEAD', 'origin/master']);
  const workerBlob = git(['hash-object', 'worker.js']);
  const indexBlob = git(['hash-object', 'index.html']);
  const preregisterBlob = git(['hash-object', path.relative(REPO_ROOT, PREREGISTER_PATH)]);
  return {
    repo_root: REPO_ROOT,
    worker_path: WORKER_PATH,
    index_path: INDEX_PATH,
    audited_commit: CITED_COMMIT,
    audited_commit_short: CITED_COMMIT_PREFIX,
    worker_blob: CITED_WORKER_BLOB,
    index_blob: CITED_INDEX_BLOB,
    cited_commit: CITED_COMMIT_PREFIX,
    cited_worker_blob: CITED_WORKER_BLOB_PREFIX,
    cited_index_blob: CITED_INDEX_BLOB_PREFIX,
    citation_commit_matched: mergeBase.startsWith(CITED_COMMIT_PREFIX) ||
      mergeBase === CITED_COMMIT,
    citation_index_matched: indexBlob.startsWith(CITED_INDEX_BLOB_PREFIX),
    citation_worker_matched: workerBlob.startsWith(CITED_WORKER_BLOB_PREFIX),
    current_head: commit,
    current_worker_blob: workerBlob,
    current_index_blob: indexBlob,
    preregister_path: PREREGISTER_PATH,
    preregister_commit: PREREGISTER_COMMIT,
    preregister_blob: preregisterBlob,
    index_bytes: fs.statSync(INDEX_PATH).size,
    worker_bytes: fs.statSync(WORKER_PATH).size,
    extracted_from: 'index.html HypergraphRewriter (not worker.js / not Three.js)',
    cite_pr2: 'https://github.com/walkthroughwonder/topological-light-propagation/pull/2',
    cite_pr3: 'https://github.com/walkthroughwonder/topological-light-propagation/pull/3',
  };
}

function assertSealed(stamp) {
  if (stamp.current_index_blob !== stamp.index_blob) {
    throw new Error(
      `index.html blob drifted: sealed ${stamp.index_blob} vs ${stamp.current_index_blob}`
    );
  }
  if (stamp.current_worker_blob !== stamp.worker_blob) {
    throw new Error(
      `worker.js blob drifted: sealed ${stamp.worker_blob} vs ${stamp.current_worker_blob}`
    );
  }
  if (!stamp.citation_commit_matched) {
    throw new Error(`merge-base with origin/master is not ${CITED_COMMIT_PREFIX}`);
  }
  if (!stamp.citation_index_matched) {
    throw new Error(`index.html blob prefix ${CITED_INDEX_BLOB_PREFIX} missing`);
  }
}

function assertPreregisterLocked() {
  const text = fs.readFileSync(PREREGISTER_PATH, 'utf8');
  const needed = [
    'Einstein-like sign would be',
    '\\mathrm{corr}<0',
    'We do **not** require that sign on these three rules',
    'Adopted converging threshold:',
    'dev < -0.1',
    'maxEdges=8000',
    'MATCH may fail',
    '2.7 CONTROL, not a pass target',
  ];
  for (const needle of needed) {
    if (!text.includes(needle)) {
      throw new Error(`PREREGISTER.md missing locked sentence: ${needle}`);
    }
  }
  const first = git(['log', '--diff-filter=A', '--format=%H', '--', 'audit/idea-grav-four-numbers/PREREGISTER.md']);
  const added = first.split('\n').filter(Boolean).pop();
  if (added !== PREREGISTER_COMMIT) {
    throw new Error(
      `PREREGISTER.md first-add commit drifted: sealed ${PREREGISTER_COMMIT} vs ${added}`
    );
  }
  return text;
}

function loadSealedRewriter(classSource) {
  if (typeof classSource !== 'string' || !classSource.includes('class HypergraphRewriter')) {
    throw new Error('refusing to eval a non-class extract');
  }
  if (classSource.includes('checkCausalInvariance')) {
    throw new Error('refusing extract that mentions checkCausalInvariance');
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
  vm.runInContext(classSource + '\nthis.HypergraphRewriter = HypergraphRewriter;\n', ctx);
  if (typeof ctx.HypergraphRewriter !== 'function') {
    throw new Error('failed to extract HypergraphRewriter from index.html');
  }
  return ctx.HypergraphRewriter;
}

module.exports = {
  REPO_ROOT,
  WORKER_PATH,
  INDEX_PATH,
  CITED_COMMIT,
  CITED_COMMIT_PREFIX,
  CITED_WORKER_BLOB,
  CITED_WORKER_BLOB_PREFIX,
  CITED_INDEX_BLOB,
  CITED_INDEX_BLOB_PREFIX,
  PREREGISTER_COMMIT,
  PREREGISTER_PATH,
  stampSources,
  assertSealed,
  assertPreregisterLocked,
  loadSealedRewriter,
};
