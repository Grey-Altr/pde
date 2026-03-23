/**
 * experiment-self-preset.test.mjs
 *
 * Structural tests for the --self preset resolution in workflows/optimize.md (SELF-01, SELF-02).
 *
 * Verifies that:
 * - Step 1 contains --self preset resolution logic (not the abort stub)
 * - The pde-self-improve slug is present
 * - The nyquist_pass_count metric is referenced
 * - The nyquist-metric verify command is referenced
 * - OPTIMIZABLE auto-discovery via grep is present
 * - References to all 14 authorized workflow files from experiment-boundaries.md
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const OPTIMIZE_WORKFLOW = path.join(ROOT, 'workflows', 'optimize.md');

// The 14 authorized OPTIMIZABLE workflow files from experiment-boundaries.md
const AUTHORIZED_WORKFLOW_FILES = [
  'workflows/brief.md',
  'workflows/system.md',
  'workflows/flows.md',
  'workflows/ideate.md',
  'workflows/wireframe.md',
  'workflows/critique.md',
  'workflows/hig.md',
  'workflows/iterate.md',
  'workflows/recommend.md',
  'workflows/mockup.md',
  'workflows/competitive.md',
  'workflows/opportunity.md',
  'workflows/handoff.md',
  'workflows/deploy.md',
];

test('SELF-01: workflows/optimize.md exists', () => {
  assert.ok(fs.existsSync(OPTIMIZE_WORKFLOW), 'workflows/optimize.md should exist');
});

test('SELF-01: workflows/optimize.md Step 1 contains --self preset resolution logic (not abort stub)', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(
    !content.includes('Preset mode (--self / --skill) is not yet implemented'),
    'abort stub should be removed — preset resolution logic must be in place'
  );
});

test('SELF-01: workflows/optimize.md contains pde-self-improve slug', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(content.includes('pde-self-improve'), 'should contain pde-self-improve slug');
});

test('SELF-01: workflows/optimize.md contains nyquist_pass_count metric reference', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(content.includes('nyquist_pass_count'), 'should contain nyquist_pass_count metric reference');
});

test('SELF-01: workflows/optimize.md contains nyquist-metric verify command reference', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(content.includes('nyquist-metric'), 'should contain nyquist-metric verify command reference');
});

test('SELF-02: workflows/optimize.md contains auto-discovery via grep for OPTIMIZABLE markers', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(
    content.includes('OPTIMIZABLE'),
    'should reference OPTIMIZABLE marker for auto-discovery'
  );
});

test('SELF-02: workflows/optimize.md references experiment-boundaries.md for cross-check', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(
    content.includes('experiment-boundaries') || content.includes('authorized'),
    'should reference experiment-boundaries.md or authorized file list for cross-check'
  );
});

test('SELF-02: workflows/optimize.md contains all 14 authorized workflow file references', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  for (const file of AUTHORIZED_WORKFLOW_FILES) {
    // Extract just the workflow name (e.g., 'brief.md' from 'workflows/brief.md')
    const name = file.replace('workflows/', '').replace('.md', '');
    assert.ok(
      content.includes(file) || content.includes(name),
      `should reference ${file} (or at least '${name}') in the --self preset authorized files list`
    );
  }
});

test('SELF-01: workflows/optimize.md --self preset sets direction to max', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(content.includes('direction: max'), 'self-improvement preset should use direction: max');
});

test('SELF-01: workflows/optimize.md writes generated experiment.md to /tmp path', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(
    content.includes('/tmp/pde-self-improve') || content.includes('/tmp/'),
    'should write generated experiment.md to a /tmp/ path'
  );
});
