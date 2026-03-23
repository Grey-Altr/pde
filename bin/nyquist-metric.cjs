#!/usr/bin/env node
'use strict';
/**
 * nyquist-metric.cjs — Nyquist pass count extraction helper.
 *
 * Runs the full Nyquist test suite and outputs the integer pass count as
 * the last line of stdout, then exits 0.
 *
 * Required contract for _evalMetric (experiment-runner.cjs):
 * - Last line of stdout must be a parseable float (integer here)
 * - Exit code MUST be 0 — non-zero exit = CRASH status in the experiment loop
 *
 * The pass count is the metric — a decrease fires DISCARD (direction: max).
 * Pre-existing test failures are captured in the baseline and don't cause
 * spurious CRASHes.
 */

const { spawnSync } = require('child_process');

const result = spawnSync('node', ['--test', 'tests/'], {
  encoding: 'utf-8',
  stdio: 'pipe',
  cwd: process.cwd(),
});

// Parse the "# pass N" line from Node.js TAP output
// Example full suite output:
//   # tests 1083
//   # pass 1075
//   # fail 8
const match = (result.stdout || '').match(/^# pass (\d+)/m);
const passCount = match ? parseInt(match[1], 10) : 0;

process.stdout.write(String(passCount) + '\n');
process.exit(0);  // always exit 0 — pass count IS the metric, not binary pass/fail
