'use strict';

/**
 * Three ST_PRESETS only. Values copied from index.html ST_PRESETS
 * (sealed blob 36070e4f). run-golden asserts the source still matches.
 */

module.exports = [
  {
    rule: 'dim27',
    label: 'dim ≈ 2.7',
    lhs: [[0, 1], [0, 2]],
    rhs: [[0, 2], [0, 3], [1, 3], [2, 3]],
    init: [[1, 2], [1, 3]],
    steps: 8,
    role: '2.7 CONTROL, not a pass target',
  },
  {
    rule: 'chain27',
    label: 'Chain ≈ 2.7',
    lhs: [[0, 1], [1, 2]],
    rhs: [[3, 1], [1, 0], [0, 3], [3, 2]],
    init: [[0, 1], [1, 2], [2, 3], [3, 0]],
    steps: 10,
    role: 'same preregister unless MATCH fails',
  },
  {
    rule: 'flat2d',
    label: 'Flat 2D',
    lhs: [[0, 1], [1, 2]],
    rhs: [[0, 2], [2, 3], [3, 0], [3, 1]],
    init: [[0, 1], [1, 2], [2, 0]],
    steps: 8,
    role: 'same preregister unless MATCH fails',
  },
];
