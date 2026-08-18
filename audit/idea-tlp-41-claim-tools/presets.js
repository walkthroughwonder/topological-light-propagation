'use strict';

/**
 * Golden string MultiwaySystem presets — cited from TLP PR #2
 * (audit/idea-tlp-29-piskunov/run-golden.js). Not re-derived.
 */

module.exports = [
  {
    preset: 'gorard-fib',
    rules: [{ from: 'A', to: 'AB' }, { from: 'B', to: 'A' }],
    initial: 'A',
    steps: 14,
    note: 'PR #2 gallery Gorard Picks / Fibonacci (pure).',
  },
  {
    preset: 'one-way',
    rules: [{ from: 'Xo', to: 'oX' }],
    initial: 'oooooooooXoooXooooooooo',
    steps: 24,
    note: 'PR #2 gallery Asymmetric / One-way sort.',
  },
  {
    preset: 'wolfram-1',
    rules: [{ from: 'A', to: 'BBB' }, { from: 'BB', to: 'A' }],
    initial: 'A',
    steps: 14,
    note: 'PR #2 gallery Wolfram Canonical / A→BBB, BB→A.',
  },
  {
    preset: 'hand-ci-not-conf',
    rules: [{ from: 'AB', to: 'X' }, { from: 'BC', to: 'Y' }],
    initial: 'ABC',
    steps: 6,
    note: 'PR #2 hand-built overlapping AB/BC on ABC.',
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
    note: 'PR #2 hand-built X→Y|Z then Y→W vs Z→V→W.',
  },
];
