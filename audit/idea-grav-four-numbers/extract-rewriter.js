'use strict';

/**
 * Brace-match extract of HypergraphRewriter from sealed index.html.
 * Does not extract estimateDimension, measureGeodesicDeviation, or
 * worker.js checkCausalInvariance.
 */

const fs = require('fs');
const { INDEX_PATH } = require('./load-sealed-rewriter');

const CLASS_NAME = 'HypergraphRewriter';
const CLASS_LINE = 12430;
const FORBIDDEN = [
  'checkCausalInvariance',
  'measureGeodesicDeviation',
  'levenshteinLike',
  'computeRicciCurvature',
  'estimateDimension',
];

function skipLineComment(src, i) {
  if (src[i] === '/' && src[i + 1] === '/') {
    const nl = src.indexOf('\n', i);
    return nl < 0 ? src.length : nl + 1;
  }
  return i;
}

function extractNamedClass(src, name) {
  const needle = `class ${name} {`;
  const start = src.indexOf(needle);
  if (start < 0) {
    return { name, found: false, source: null, start_line: null, end_line: null };
  }
  let depth = 0;
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error(`no body for ${name}`);
  for (; i < src.length; i++) {
    const next = skipLineComment(src, i);
    if (next !== i) {
      i = next - 1;
      continue;
    }
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const source = src.slice(start, i + 1);
        const start_line = src.slice(0, start).split('\n').length;
        const end_line = src.slice(0, i + 1).split('\n').length;
        return { name, found: true, source, start_line, end_line };
      }
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

function inspectClass(source) {
  const forbidden_hits = FORBIDDEN.filter(s => source.includes(s));
  return {
    has_maxEdges_8000: /this\.maxEdges\s*=\s*8000/.test(source),
    has_truncated: source.includes('this.truncated'),
    has_events: source.includes('this.events'),
    has_causalEdges: source.includes('this.causalEdges'),
    mentions_worker_ci: source.includes('checkCausalInvariance'),
    forbidden_hits,
  };
}

function extractRewriter() {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');
  const extracted = extractNamedClass(src, CLASS_NAME);
  if (!extracted.found) throw new Error('UNEXTRACTABLE: HypergraphRewriter');
  if (extracted.start_line !== CLASS_LINE) {
    throw new Error(
      `HypergraphRewriter starts at L${extracted.start_line}, seal pointer is L${CLASS_LINE}`
    );
  }
  const inspect = inspectClass(extracted.source);
  if (inspect.forbidden_hits.length) {
    throw new Error(`extracted class contains forbidden: ${inspect.forbidden_hits.join(',')}`);
  }
  if (!inspect.has_maxEdges_8000) {
    throw new Error('extracted class lost maxEdges=8000');
  }
  return { extracted, inspect };
}

module.exports = {
  CLASS_NAME,
  CLASS_LINE,
  FORBIDDEN,
  extractNamedClass,
  extractRewriter,
};
