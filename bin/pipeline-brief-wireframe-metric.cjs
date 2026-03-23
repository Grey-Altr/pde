#!/usr/bin/env node
'use strict';
/**
 * pipeline-brief-wireframe-metric.cjs -- Multi-stage pipeline metric.
 *
 * Chains skill invocations to measure downstream visual quality from upstream prose.
 * PIPE-04: Multi-stage verify wrapper that chains:
 *   upstream skill measurement -> downstream DOM metric.
 * Phase 113 mode: fixture-based (upstream measurement is a passthrough,
 *   downstream uses dom-metric.cjs on fixture).
 * Future phases: replace Stage 1 with live skill invocation
 *   (pde-tools.cjs invoke brief && pde-tools.cjs invoke wireframe).
 *
 * Contract: exit 0 always, last line of stdout = numeric score 0-100.
 * Usage: node bin/pipeline-brief-wireframe-metric.cjs <path-to-html-file>
 */

const path = require('path');
const { spawnSync } = require('child_process');

const targetFile = process.argv[2];

// Graceful degradation: no file arg
if (!targetFile) {
  process.stdout.write('0\n');
  process.exit(0);
}

// VIS-06: timeout guard
const TIMEOUT_MS = 30000;
const timeoutId = setTimeout(() => {
  process.stderr.write('pipeline-brief-wireframe-metric: timeout reached, returning 0\n');
  process.stdout.write('0\n');
  process.exit(0);
}, TIMEOUT_MS);

try {
  // Stage 1: Upstream skill chain
  // Phase 113 fixture mode: upstream measurement is passthrough (no live skill invocation)
  // Future: spawnSync('node', [path.join(__dirname, 'pde-tools.cjs'), 'invoke', 'brief'], ...)
  // Future: spawnSync('node', [path.join(__dirname, 'pde-tools.cjs'), 'invoke', 'wireframe'], ...)
  process.stderr.write('Stage 1: upstream skill chain (fixture passthrough)\n');

  // Stage 2: Terminal DOM metric measurement
  process.stderr.write('Stage 2: terminal DOM metric measurement\n');
  const result = spawnSync(
    'node',
    [path.join(__dirname, 'dom-metric.cjs'), targetFile],
    { encoding: 'utf-8', timeout: 20000 }
  );

  if (result.status !== 0 || !result.stdout) {
    clearTimeout(timeoutId);
    process.stdout.write('0\n');
    process.exit(0);
  }

  // Extract last non-empty line from stdout
  const lines = result.stdout.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) {
    clearTimeout(timeoutId);
    process.stdout.write('0\n');
    process.exit(0);
  }
  const lastLine = lines[lines.length - 1];
  const score = parseFloat(lastLine);

  if (isNaN(score)) {
    clearTimeout(timeoutId);
    process.stdout.write('0\n');
    process.exit(0);
  }

  clearTimeout(timeoutId);
  process.stdout.write(lastLine.trim() + '\n');
  process.exit(0);
} catch (_) {
  clearTimeout(timeoutId);
  process.stdout.write('0\n');
  process.exit(0);
}
