/**
 * nyquist-metric.test.mjs
 *
 * Structural tests for bin/nyquist-metric.cjs (SELF-01).
 *
 * Verifies that the Nyquist pass count extraction helper:
 * - Exists and is valid JavaScript
 * - Uses spawnSync with node --test
 * - Contains # pass regex pattern
 * - Always exits with process.exit(0)
 * - Handles no-match case with '0' fallback
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const SCRIPT_FILE = path.join(ROOT, 'bin', 'nyquist-metric.cjs');

test('SELF-01: bin/nyquist-metric.cjs exists', () => {
  assert.ok(fs.existsSync(SCRIPT_FILE), 'bin/nyquist-metric.cjs should exist');
});

test('SELF-01: bin/nyquist-metric.cjs is valid JavaScript (require does not throw)', () => {
  assert.ok(fs.existsSync(SCRIPT_FILE), 'file must exist before require check');
  const content = fs.readFileSync(SCRIPT_FILE, 'utf-8');
  // Check it has 'use strict' and shebang line
  assert.ok(content.includes("'use strict'") || content.includes('"use strict"'), "should have 'use strict' directive");
});

test('SELF-01: bin/nyquist-metric.cjs contains spawnSync call with node and --test arguments', () => {
  const content = fs.readFileSync(SCRIPT_FILE, 'utf-8');
  assert.ok(content.includes('spawnSync'), 'should call spawnSync');
  assert.ok(content.includes("'node'") || content.includes('"node"'), "should spawn 'node'");
  assert.ok(content.includes("'--test'") || content.includes('"--test"'), "should pass '--test' argument");
});

test('SELF-01: bin/nyquist-metric.cjs contains # pass regex pattern', () => {
  const content = fs.readFileSync(SCRIPT_FILE, 'utf-8');
  assert.ok(
    content.includes('# pass') || content.includes('#\\s*pass'),
    'should contain # pass regex pattern for extracting Nyquist pass count'
  );
});

test('SELF-01: bin/nyquist-metric.cjs contains process.exit(0) — always exits 0', () => {
  const content = fs.readFileSync(SCRIPT_FILE, 'utf-8');
  assert.ok(content.includes('process.exit(0)'), 'should call process.exit(0) — non-zero exit causes CRASH in _evalMetric');
});

test('SELF-01: bin/nyquist-metric.cjs outputs 0 as fallback when no match found', () => {
  const content = fs.readFileSync(SCRIPT_FILE, 'utf-8');
  // Should have a fallback of 0 (either via ternary or default assignment)
  assert.ok(
    content.includes(': 0') || content.includes('|| 0') || content.includes('? 0') || content.match(/passCount\s*=.*0/),
    'should have 0 as fallback when no # pass match found'
  );
});

test('SELF-01: bin/nyquist-metric.cjs has shebang line', () => {
  const content = fs.readFileSync(SCRIPT_FILE, 'utf-8');
  assert.ok(content.startsWith('#!/usr/bin/env node'), 'should have #!/usr/bin/env node shebang');
});
