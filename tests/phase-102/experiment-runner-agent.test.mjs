/**
 * experiment-runner-agent.test.mjs
 *
 * Structural tests for agents/pde-experiment-runner.md.
 * Verifies frontmatter and body content meet the requirements specified
 * in 102-02-PLAN.md (EXEC-02, SELF-06, SELF-07, SELF-08, EXEC-03).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_PATH = path.resolve(__dirname, '../../agents/pde-experiment-runner.md');

let content;
try {
  content = fs.readFileSync(AGENT_PATH, 'utf-8');
} catch {
  content = '';
}

// ─── Structural tests ──────────────────────────────────────────────────────────

test('agent file exists at agents/pde-experiment-runner.md', () => {
  assert.ok(fs.existsSync(AGENT_PATH), 'agents/pde-experiment-runner.md should exist');
});

test('file contains YAML frontmatter with name: pde-experiment-runner', () => {
  assert.ok(content.includes('name: pde-experiment-runner'), 'frontmatter should have name: pde-experiment-runner');
});

test('frontmatter contains model: haiku', () => {
  assert.ok(content.includes('model: haiku'), 'frontmatter should have model: haiku');
});

test('frontmatter contains allowed-tools with Read, Edit, Bash', () => {
  assert.ok(content.includes('allowed-tools'), 'should have allowed-tools');
  assert.ok(content.includes('Read'), 'allowed-tools should include Read');
  assert.ok(content.includes('Edit'), 'allowed-tools should include Edit');
  assert.ok(content.includes('Bash'), 'allowed-tools should include Bash');
});

test('frontmatter contains argument-hint with experiment-md-path, iteration, baseline-sha, context-mode', () => {
  assert.ok(content.includes('argument-hint'), 'should have argument-hint');
  assert.ok(content.includes('experiment-md-path') || content.includes('experiment_md_path'), 'argument-hint should include experiment-md-path');
  assert.ok(content.includes('iteration'), 'argument-hint should include iteration');
  assert.ok(content.includes('baseline-sha') || content.includes('baseline_sha'), 'argument-hint should include baseline-sha');
  assert.ok(content.includes('context-mode') || content.includes('context_mode'), 'argument-hint should include context-mode');
});

test('body contains "minimal context" or "context window" instruction (SELF-06)', () => {
  const lower = content.toLowerCase();
  assert.ok(
    lower.includes('minimal context') || lower.includes('context window'),
    'body should reference minimal context window'
  );
});

test('body contains "Haiku" and "Sonnet" and "escalat" (SELF-07)', () => {
  assert.ok(content.includes('Haiku') || content.includes('haiku'), 'should mention Haiku model');
  assert.ok(content.includes('Sonnet') || content.includes('sonnet'), 'should mention Sonnet model');
  assert.ok(
    content.toLowerCase().includes('escalat'),
    'should describe escalation from Haiku to Sonnet'
  );
});

test('body contains consecutive_violations (SELF-07 tracking mechanism)', () => {
  assert.ok(content.includes('consecutive_violations'), 'should reference consecutive_violations tracking');
});

test('body contains structured JSON return format with iteration, metric_value, metric_delta, status, description, tokens_used (EXEC-02)', () => {
  assert.ok(content.includes('iteration'), 'return format should include iteration');
  assert.ok(content.includes('metric_value'), 'return format should include metric_value');
  assert.ok(content.includes('metric_delta'), 'return format should include metric_delta');
  assert.ok(content.includes('status'), 'return format should include status');
  assert.ok(content.includes('description'), 'return format should include description');
  assert.ok(content.includes('tokens_used'), 'return format should include tokens_used');
});

test('body contains "boundary" and "mutable" (EXEC-03 enforcement instructions)', () => {
  assert.ok(
    content.toLowerCase().includes('boundary'),
    'should reference boundary enforcement'
  );
  assert.ok(
    content.toLowerCase().includes('mutable'),
    'should reference mutable files'
  );
});

test('body contains "diff" context reference (SELF-08)', () => {
  assert.ok(
    content.toLowerCase().includes('diff'),
    'should reference diff-based context'
  );
});
