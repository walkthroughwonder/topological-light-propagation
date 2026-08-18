'use strict';

/**
 * IDEA-TLP-41-CLAIM-TOOLS — sealed MultiwaySystem loader.
 * Copied/adapted from TLP PR #2 (audit/idea-tlp-29-piskunov/load-sealed-multiway.js).
 * Instantiates MultiwaySystem from worker.js without editing that file.
 * Strips only the Web Worker `self.onmessage` handler (Node has no `self`).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WORKER_PATH = path.join(REPO_ROOT, 'worker.js');
const INDEX_PATH = path.join(REPO_ROOT, 'index.html');
const HANDLER_MARK = '// ─── Worker message handler';

const CITED_COMMIT = 'c60aed3eb08ded734dde98d4365a39450acc4904';
const CITED_COMMIT_PREFIX = 'c60aed3eb08d';
const CITED_BLOB = '961def89f04c3688272e540414d172c70d196fa0';
const CITED_BLOB_PREFIX = '961def89';
const CITED_INDEX_BLOB = '36070e4f18a7e9c92e5e2f4b8bff6a5320577689';

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function stampSources() {
  const commit = git(['rev-parse', 'HEAD']);
  const mergeBase = git(['merge-base', 'HEAD', 'origin/master']);
  const workerBlob = git(['hash-object', 'worker.js']);
  const indexBlob = git(['hash-object', 'index.html']);
  const ls = git(['ls-tree', 'HEAD', 'worker.js']);
  const treeBlob = (ls.split(/\s+/)[2] || '').trim();
  return {
    repo_root: REPO_ROOT,
    worker_path: WORKER_PATH,
    index_path: INDEX_PATH,
    audited_commit: CITED_COMMIT,
    audited_commit_short: CITED_COMMIT_PREFIX,
    worker_blob: CITED_BLOB,
    index_blob: CITED_INDEX_BLOB,
    cited_commit: CITED_COMMIT_PREFIX,
    cited_blob: CITED_BLOB_PREFIX,
    citation_commit_matched: mergeBase.startsWith(CITED_COMMIT_PREFIX) ||
      mergeBase === CITED_COMMIT,
    citation_blob_matched: workerBlob.startsWith(CITED_BLOB_PREFIX),
    current_head: commit,
    current_worker_blob: workerBlob,
    current_index_blob: indexBlob,
    current_tree_blob: treeBlob,
    worker_bytes: fs.statSync(WORKER_PATH).size,
    index_bytes: fs.statSync(INDEX_PATH).size,
    extracted_from: 'index.html (claim-tool handlers); MultiwaySystem graph from worker.js',
    cite_pr2: 'https://github.com/walkthroughwonder/topological-light-propagation/pull/2',
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
  if (stamp.current_index_blob !== stamp.index_blob) {
    throw new Error(
      `index.html blob drifted: sealed ${stamp.index_blob} vs ${stamp.current_index_blob}`
    );
  }
  if (!stamp.citation_commit_matched) {
    throw new Error(`merge-base with origin/master is not ${CITED_COMMIT_PREFIX}`);
  }
}

function loadSealedMultiway() {
  const src = fs.readFileSync(WORKER_PATH, 'utf8');
  const cut = src.indexOf(HANDLER_MARK);
  if (cut < 0) {
    throw new Error('worker.js is missing the Worker message handler marker; refuse to eval the Worker shell');
  }
  const classSrc = src.slice(0, cut);
  if (!classSrc.includes('class MultiwaySystem')) {
    throw new Error('extracted worker.js prefix does not contain MultiwaySystem');
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

module.exports = {
  REPO_ROOT,
  WORKER_PATH,
  INDEX_PATH,
  CITED_COMMIT,
  CITED_COMMIT_PREFIX,
  CITED_BLOB,
  CITED_BLOB_PREFIX,
  CITED_INDEX_BLOB,
  stampSources,
  assertSealed,
  loadSealedMultiway,
};
