/**
 * experiment-orchestrator-tools.test.mjs
 *
 * Structural tests for CMD-01, CMD-02, CMD-04 requirements.
 *
 * CMD-01: commands/optimize.md has valid YAML frontmatter with correct name,
 *         allowed-tools (including Task and AskUserQuestion), and workflow reference.
 *
 * CMD-02: workflows/optimize.md exists with all 9 required step sections and
 *         references to pde-experiment-runner and pde-experiment-runner-sonnet.
 *
 * CMD-04: All 5 circuit breaker variables referenced in workflows/optimize.md:
 *         iteration_budget, time_budget, consecutive_failures, no_progress, cost_estimate.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const COMMAND_FILE = path.join(ROOT, 'commands', 'optimize.md');
const WORKFLOW_FILE = path.join(ROOT, 'workflows', 'optimize.md');

// --- CMD-01: commands/optimize.md structural tests ---------------------------

test('CMD-01: commands/optimize.md exists', () => {
  assert.ok(fs.existsSync(COMMAND_FILE), 'commands/optimize.md should exist');
});

test('CMD-01: commands/optimize.md contains "name: pde:optimize" in frontmatter', () => {
  const content = fs.readFileSync(COMMAND_FILE, 'utf-8');
  assert.ok(content.includes('name: pde:optimize'), 'should contain name: pde:optimize');
});

test('CMD-01: commands/optimize.md contains "allowed-tools:" with Task', () => {
  const content = fs.readFileSync(COMMAND_FILE, 'utf-8');
  assert.ok(content.includes('allowed-tools:'), 'should contain allowed-tools:');
  assert.ok(content.includes('Task'), 'allowed-tools should include Task');
});

test('CMD-01: commands/optimize.md contains "allowed-tools:" with AskUserQuestion', () => {
  const content = fs.readFileSync(COMMAND_FILE, 'utf-8');
  assert.ok(content.includes('AskUserQuestion'), 'allowed-tools should include AskUserQuestion');
});

test('CMD-01: commands/optimize.md references workflows/optimize.md', () => {
  const content = fs.readFileSync(COMMAND_FILE, 'utf-8');
  assert.ok(
    content.includes('workflows/optimize.md') || content.includes('workflows/optimize'),
    'should reference workflows/optimize.md'
  );
});

test('CMD-01: commands/optimize.md contains "argument-hint:" with experiment.md path', () => {
  const content = fs.readFileSync(COMMAND_FILE, 'utf-8');
  assert.ok(content.includes('argument-hint:'), 'should contain argument-hint:');
  assert.ok(
    content.includes('experiment.md') || content.includes('experiment'),
    'argument-hint should reference experiment.md path'
  );
});

// --- CMD-02: workflows/optimize.md structural tests --------------------------

test('CMD-02: workflows/optimize.md exists', () => {
  assert.ok(fs.existsSync(WORKFLOW_FILE), 'workflows/optimize.md should exist');
});

test('CMD-02: workflows/optimize.md contains Step 1 (Parse Arguments / Validate)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('Step 1') && (content.includes('Parse') || content.includes('Validate')),
    'should contain Step 1 Parse/Validate'
  );
});

test('CMD-02: workflows/optimize.md contains Step 2 (Clean Working Tree / git status --porcelain)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('Step 2') && (content.includes('Clean Working Tree') || content.includes('git status --porcelain')),
    'should contain Step 2 clean working tree check'
  );
});

test('CMD-02: workflows/optimize.md contains Step 3 (Concurrency Check / experiment/*)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('Step 3') && (content.includes('Concurrency') || content.includes('experiment/*')),
    'should contain Step 3 concurrency check'
  );
});

test('CMD-02: workflows/optimize.md contains Step 4 (Cost Estimate / BREAK-05)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('Step 4') && (content.includes('Cost Estimate') || content.includes('BREAK-05')),
    'should contain Step 4 cost estimate gate'
  );
});

test('CMD-02: workflows/optimize.md contains Step 5 (Initialize Experiment / experiment init)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('Step 5') && (content.includes('Initialize') || content.includes('experiment init')),
    'should contain Step 5 initialize experiment branch'
  );
});

test('CMD-02: workflows/optimize.md contains Step 6 (Baseline Metric / eval-metric)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('Step 6') && (content.includes('Baseline') || content.includes('eval-metric')),
    'should contain Step 6 baseline metric capture'
  );
});

test('CMD-02: workflows/optimize.md contains Step 7 (Iteration Loop / LOOP)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('Step 7') && (content.includes('Iteration Loop') || content.includes('LOOP')),
    'should contain Step 7 iteration loop'
  );
});

test('CMD-02: workflows/optimize.md contains Step 8 (Generate REPORT / generate-report)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('Step 8') && (content.includes('Generate') || content.includes('generate-report')),
    'should contain Step 8 generate report'
  );
});

test('CMD-02: workflows/optimize.md contains Step 9 (Promotion / promote)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('Step 9') && (content.includes('Promotion') || content.includes('promote')),
    'should contain Step 9 promotion approval'
  );
});

test('CMD-02: workflows/optimize.md references "pde-experiment-runner" for Task() dispatch', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(content.includes('pde-experiment-runner'), 'should reference pde-experiment-runner for Task() dispatch');
});

test('CMD-02: workflows/optimize.md references "pde-experiment-runner-sonnet" for model escalation', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(content.includes('pde-experiment-runner-sonnet'), 'should reference pde-experiment-runner-sonnet for model escalation');
});

// --- CMD-04: All 5 circuit breaker variables in workflows/optimize.md --------

test('CMD-04: workflows/optimize.md contains "iteration_budget" (BREAK-01)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(content.includes('iteration_budget'), 'should contain iteration_budget for BREAK-01');
});

test('CMD-04: workflows/optimize.md contains "time_budget" (BREAK-02)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(content.includes('time_budget'), 'should contain time_budget for BREAK-02');
});

test('CMD-04: workflows/optimize.md contains "consecutive_failures" or "consecutiveFailures" (BREAK-03)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('consecutive_failures') || content.includes('consecutiveFailures'),
    'should contain consecutive_failures or consecutiveFailures for BREAK-03'
  );
});

test('CMD-04: workflows/optimize.md contains "no_progress" or "iterationsSinceImprovement" (BREAK-04)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(
    content.includes('no_progress') || content.includes('iterationsSinceImprovement'),
    'should contain no_progress or iterationsSinceImprovement for BREAK-04'
  );
});

test('CMD-04: workflows/optimize.md contains "cost_estimate" (BREAK-05)', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  assert.ok(content.includes('cost_estimate'), 'should contain cost_estimate for BREAK-05');
});
