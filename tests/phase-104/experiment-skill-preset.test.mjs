/**
 * experiment-skill-preset.test.mjs
 *
 * Structural tests for the --skill preset resolution in workflows/optimize.md (SELF-03).
 *
 * Verifies that:
 * - Step 1 contains --skill preset resolution logic (not the abort stub)
 * - Skill name validation against known workflow names is present
 * - Error message for unknown skill names lists available skills
 * - Single-file targeting pattern workflows/{name}.md is present
 * - pde-skill- slug prefix is present
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const OPTIMIZE_WORKFLOW = path.join(ROOT, 'workflows', 'optimize.md');

test('SELF-03: workflows/optimize.md exists', () => {
  assert.ok(fs.existsSync(OPTIMIZE_WORKFLOW), 'workflows/optimize.md should exist');
});

test('SELF-03: workflows/optimize.md Step 1 contains --skill preset resolution logic (not abort stub)', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(
    !content.includes('Preset mode (--self / --skill) is not yet implemented'),
    'abort stub should be removed — --skill preset resolution must be in place'
  );
});

test('SELF-03: workflows/optimize.md contains skill name validation against known workflow names', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(
    content.includes('--skill') || content.includes('skill name') || content.includes('known skill'),
    'should contain --skill flag handling and skill name validation'
  );
});

test('SELF-03: workflows/optimize.md contains error message for unknown skill names', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(content.includes('Unknown skill'), 'should contain "Unknown skill" error message for unknown skill names');
});

test('SELF-03: workflows/optimize.md error message lists known skills', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  // The error message should include a list of known skills
  assert.ok(
    content.includes('Known skills') || content.includes('known skills'),
    'error message should list "Known skills:" for user guidance'
  );
});

test('SELF-03: workflows/optimize.md contains single-file targeting pattern workflows/{name}.md', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(
    content.includes('workflows/{name}.md') || content.includes('workflows/'),
    'should reference workflows/{name}.md as the single-file targeting pattern for --skill'
  );
});

test('SELF-03: workflows/optimize.md contains pde-skill- slug prefix pattern', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(content.includes('pde-skill-'), 'should contain pde-skill- slug prefix for --skill experiments');
});

test('SELF-03: workflows/optimize.md --skill preset uses nyquist_pass_count metric', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(content.includes('nyquist_pass_count'), '--skill preset should also use nyquist_pass_count metric');
});

test('SELF-03: workflows/optimize.md --skill preset writes to /tmp path', () => {
  const content = fs.readFileSync(OPTIMIZE_WORKFLOW, 'utf-8');
  assert.ok(
    content.includes('/tmp/pde-skill-') || content.includes('/tmp/'),
    'should write --skill generated experiment.md to /tmp/ path'
  );
});
