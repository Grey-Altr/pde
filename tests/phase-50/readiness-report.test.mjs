/**
 * readiness-report.test.mjs
 * Smoke tests: command file, workflow file, pde-tools dispatch, writeReadinessMd format
 *
 * Covers VRFY-03:
 *   - commands/check-readiness.md existence and key content
 *   - workflows/check-readiness.md existence and key content
 *   - bin/pde-tools.cjs dispatch for 'readiness' command
 *   - writeReadinessMd() output format
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const {
  writeReadinessMd,
  cmdReadinessCheck,
  cmdReadinessResult,
  runStructuralChecks,
  classifyResult,
} = require('../../bin/lib/readiness.cjs');

// ─── commands/check-readiness.md ─────────────────────────────────────────────

test('commands/check-readiness.md exists', () => {
  const filePath = path.join(projectRoot, 'commands', 'check-readiness.md');
  assert.ok(fs.existsSync(filePath), 'commands/check-readiness.md must exist');
});

test('commands/check-readiness.md contains name: pde:check-readiness', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'commands', 'check-readiness.md'), 'utf-8');
  assert.ok(
    content.includes('name: pde:check-readiness'),
    'command file must contain "name: pde:check-readiness"'
  );
});

test('commands/check-readiness.md contains check-readiness.md in execution_context', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'commands', 'check-readiness.md'), 'utf-8');
  assert.ok(
    content.includes('check-readiness.md'),
    'command file execution_context must reference check-readiness.md'
  );
});

// ─── workflows/check-readiness.md ────────────────────────────────────────────

test('workflows/check-readiness.md exists', () => {
  const filePath = path.join(projectRoot, 'workflows', 'check-readiness.md');
  assert.ok(fs.existsSync(filePath), 'workflows/check-readiness.md must exist');
});

test('workflows/check-readiness.md contains run_structural_checks step name', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'workflows', 'check-readiness.md'), 'utf-8');
  assert.ok(
    content.includes('run_structural_checks'),
    'workflow must contain "run_structural_checks" step name'
  );
});

test('workflows/check-readiness.md contains <purpose> block', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'workflows', 'check-readiness.md'), 'utf-8');
  assert.ok(content.includes('<purpose>'), 'workflow must contain <purpose> block');
});

test('workflows/check-readiness.md contains <process> block', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'workflows', 'check-readiness.md'), 'utf-8');
  assert.ok(content.includes('<process>'), 'workflow must contain <process> block');
});

// ─── bin/pde-tools.cjs dispatch ──────────────────────────────────────────────

test("bin/pde-tools.cjs contains case 'readiness':", () => {
  const content = fs.readFileSync(path.join(projectRoot, 'bin', 'pde-tools.cjs'), 'utf-8');
  assert.ok(
    content.includes("case 'readiness':"),
    "pde-tools.cjs must contain case 'readiness':"
  );
});

test("bin/pde-tools.cjs contains require('./lib/readiness.cjs')", () => {
  const content = fs.readFileSync(path.join(projectRoot, 'bin', 'pde-tools.cjs'), 'utf-8');
  assert.ok(
    content.includes("require('./lib/readiness.cjs')"),
    "pde-tools.cjs must require('./lib/readiness.cjs')"
  );
});

// ─── bin/lib/readiness.cjs exports ───────────────────────────────────────────

test('bin/lib/readiness.cjs exists and exports cmdReadinessCheck', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'bin', 'lib', 'readiness.cjs')), 'readiness.cjs must exist');
  assert.strictEqual(typeof cmdReadinessCheck, 'function', 'cmdReadinessCheck must be a function');
});

test('bin/lib/readiness.cjs exports cmdReadinessResult', () => {
  assert.strictEqual(typeof cmdReadinessResult, 'function', 'cmdReadinessResult must be a function');
});

// ─── writeReadinessMd output format ──────────────────────────────────────────

test('writeReadinessMd produces file with result: in frontmatter', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-test-'));
  try {
    const checks = [
      { id: 'A1', description: 'Plan content present', passed: true, severity: 'fail', details: '' },
      { id: 'A3', description: 'Requirements non-empty', passed: false, severity: 'concerns', details: 'empty' },
    ];
    const result = classifyResult(checks);
    const outputFile = writeReadinessMd(tmpDir, '50', 'readiness-gate', checks, result);
    const content = fs.readFileSync(outputFile, 'utf-8');
    assert.ok(content.includes('result:'), 'READINESS.md must have "result:" in frontmatter');
    assert.ok(content.includes('checks_run:'), 'READINESS.md must have "checks_run:" in frontmatter');
    assert.ok(content.includes('checks_failed:'), 'READINESS.md must have "checks_failed:" in frontmatter');
    assert.ok(content.includes('generated:'), 'READINESS.md must have "generated:" in frontmatter');
    assert.ok(content.includes('phase:'), 'READINESS.md must have "phase:" in frontmatter');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writeReadinessMd produces ## Structural Checks section', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-test-'));
  try {
    const checks = [
      { id: 'A1', description: 'Plan content present', passed: true, severity: 'fail', details: '' },
    ];
    const result = classifyResult(checks);
    const outputFile = writeReadinessMd(tmpDir, '50', 'readiness-gate', checks, result);
    const content = fs.readFileSync(outputFile, 'utf-8');
    assert.ok(content.includes('## Structural Checks'), 'READINESS.md must have ## Structural Checks section');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writeReadinessMd produces ## Consistency Checks section', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-test-'));
  try {
    const checks = [
      { id: 'B1', description: 'Requirements mapped', passed: true, severity: 'fail', details: '' },
    ];
    const result = classifyResult(checks);
    const outputFile = writeReadinessMd(tmpDir, '50', 'readiness-gate', checks, result);
    const content = fs.readFileSync(outputFile, 'utf-8');
    assert.ok(content.includes('## Consistency Checks'), 'READINESS.md must have ## Consistency Checks section');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writeReadinessMd produces ## Executor Handoff section', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-test-'));
  try {
    const checks = [
      { id: 'A1', description: 'Plan content present', passed: true, severity: 'fail', details: '' },
    ];
    const result = classifyResult(checks);
    const outputFile = writeReadinessMd(tmpDir, '50', 'readiness-gate', checks, result);
    const content = fs.readFileSync(outputFile, 'utf-8');
    assert.ok(content.includes('## Executor Handoff'), 'READINESS.md must have ## Executor Handoff section');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writeReadinessMd: result=fail produces blocking message in Executor Handoff', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-test-'));
  try {
    const checks = [
      { id: 'A1', description: 'Plan content present', passed: false, severity: 'fail', details: 'missing' },
    ];
    const result = classifyResult(checks);
    assert.strictEqual(result, 'fail');
    const outputFile = writeReadinessMd(tmpDir, '50', 'readiness-gate', checks, result);
    const content = fs.readFileSync(outputFile, 'utf-8');
    assert.ok(
      content.includes('blocking issue'),
      'READINESS.md Executor Handoff should mention "blocking issue" for fail result'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writeReadinessMd: result=concerns produces non-blocking message in Executor Handoff', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-test-'));
  try {
    const checks = [
      { id: 'A3', description: 'Requirements non-empty', passed: false, severity: 'concerns', details: 'empty' },
    ];
    const result = classifyResult(checks);
    assert.strictEqual(result, 'concerns');
    const outputFile = writeReadinessMd(tmpDir, '50', 'readiness-gate', checks, result);
    const content = fs.readFileSync(outputFile, 'utf-8');
    assert.ok(
      content.includes('non-blocking'),
      'READINESS.md Executor Handoff should mention "non-blocking" for concerns result'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writeReadinessMd: result=pass produces all checks passed message', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-test-'));
  try {
    const checks = [
      { id: 'A1', description: 'Plan content present', passed: true, severity: 'fail', details: '' },
    ];
    const result = classifyResult(checks);
    assert.strictEqual(result, 'pass');
    const outputFile = writeReadinessMd(tmpDir, '50', 'readiness-gate', checks, result);
    const content = fs.readFileSync(outputFile, 'utf-8');
    assert.ok(
      content.includes('All checks passed'),
      'READINESS.md Executor Handoff should confirm all checks passed'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writeReadinessMd: output file named {phaseNumber}-READINESS.md', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-test-'));
  try {
    const checks = [
      { id: 'A1', description: 'Plan content present', passed: true, severity: 'fail', details: '' },
    ];
    const result = classifyResult(checks);
    const outputFile = writeReadinessMd(tmpDir, '50', 'readiness-gate', checks, result);
    assert.ok(
      outputFile.endsWith('50-READINESS.md'),
      `Output file should be named 50-READINESS.md, got: ${path.basename(outputFile)}`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
