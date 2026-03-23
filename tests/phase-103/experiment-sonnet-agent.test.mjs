/**
 * experiment-sonnet-agent.test.mjs
 *
 * Structural tests for:
 * - agents/pde-experiment-runner-sonnet.md: model: sonnet, correct frontmatter
 * - bin/pde-tools.cjs: generate-report and diff-summary subcommands are wired
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const SONNET_AGENT = path.join(ROOT, 'agents', 'pde-experiment-runner-sonnet.md');
const HAIKU_AGENT = path.join(ROOT, 'agents', 'pde-experiment-runner.md');
const PDE_TOOLS = path.join(ROOT, 'bin', 'pde-tools.cjs');

// --- Structural tests for pde-experiment-runner-sonnet.md --------------------

test('agents/pde-experiment-runner-sonnet.md exists', () => {
  assert.ok(fs.existsSync(SONNET_AGENT), 'pde-experiment-runner-sonnet.md should exist');
});

test('pde-experiment-runner-sonnet.md contains "model: sonnet" in frontmatter', () => {
  const content = fs.readFileSync(SONNET_AGENT, 'utf-8');
  assert.ok(content.includes('model: sonnet'), 'should contain model: sonnet');
});

test('pde-experiment-runner-sonnet.md contains "name: pde-experiment-runner-sonnet"', () => {
  const content = fs.readFileSync(SONNET_AGENT, 'utf-8');
  assert.ok(content.includes('name: pde-experiment-runner-sonnet'), 'should contain correct name');
});

test('pde-experiment-runner-sonnet.md contains same allowed-tools as pde-experiment-runner.md (Read, Edit, Bash)', () => {
  const sonnetContent = fs.readFileSync(SONNET_AGENT, 'utf-8');
  assert.ok(sonnetContent.includes('- Read'), 'sonnet agent should include Read tool');
  assert.ok(sonnetContent.includes('- Edit'), 'sonnet agent should include Edit tool');
  assert.ok(sonnetContent.includes('- Bash'), 'sonnet agent should include Bash tool');

  // Verify haiku agent also has these tools (baseline comparison)
  const haikuContent = fs.readFileSync(HAIKU_AGENT, 'utf-8');
  assert.ok(haikuContent.includes('- Read'), 'haiku agent should include Read tool');
  assert.ok(haikuContent.includes('- Edit'), 'haiku agent should include Edit tool');
  assert.ok(haikuContent.includes('- Bash'), 'haiku agent should include Bash tool');
});

// --- Dispatch tests for pde-tools.cjs ----------------------------------------

test('pde-tools experiment with missing slug includes "generate-report" in error message', () => {
  const result = spawnSync('node', [PDE_TOOLS, 'experiment', 'generate-report'], {
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  // Should error because --slug is missing; error message should list generate-report
  const combined = (result.stdout || '') + (result.stderr || '');
  assert.ok(
    combined.includes('generate-report'),
    `Error message should include "generate-report". Got: ${combined}`
  );
});

test('pde-tools experiment with missing slug includes "diff-summary" in error message', () => {
  const result = spawnSync('node', [PDE_TOOLS, 'experiment', 'diff-summary'], {
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  const combined = (result.stdout || '') + (result.stderr || '');
  assert.ok(
    combined.includes('diff-summary'),
    `Error message should include "diff-summary". Got: ${combined}`
  );
});

test('pde-tools.cjs contains "generate-report" dispatch branch', () => {
  const content = fs.readFileSync(PDE_TOOLS, 'utf-8');
  assert.ok(content.includes("'generate-report'") || content.includes('"generate-report"'), 'pde-tools.cjs should have generate-report dispatch');
});

test('pde-tools.cjs contains "diff-summary" dispatch branch', () => {
  const content = fs.readFileSync(PDE_TOOLS, 'utf-8');
  assert.ok(content.includes("'diff-summary'") || content.includes('"diff-summary"'), 'pde-tools.cjs should have diff-summary dispatch');
});

test('pde-tools.cjs requires experiment-report module', () => {
  const content = fs.readFileSync(PDE_TOOLS, 'utf-8');
  assert.ok(content.includes('experiment-report'), 'pde-tools.cjs should require experiment-report.cjs');
});
