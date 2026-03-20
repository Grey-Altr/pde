/**
 * quota-display.test.mjs
 * Phase 65 — Quota Display Infrastructure (QUOTA-04)
 *
 * Tests: progress.md contains Stitch Quota section, health.md contains quota check
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

test('QUOTA-04: progress.md contains Stitch Quota section', () => {
  const content = readFileSync(resolve(ROOT, 'workflows', 'progress.md'), 'utf-8');
  assert.ok(content.includes('Stitch Quota'), 'missing Stitch Quota heading');
  assert.ok(content.includes('Standard'), 'missing Standard type');
  assert.ok(content.includes('Experimental'), 'missing Experimental type');
  assert.ok(content.includes('readStitchQuota'), 'missing readStitchQuota call');
  assert.ok(content.includes('350'), 'missing standard limit 350');
  assert.ok(content.includes('50'), 'missing experimental limit 50');
});

test('QUOTA-04: progress.md contains quota warning messaging', () => {
  const content = readFileSync(resolve(ROOT, 'workflows', 'progress.md'), 'utf-8');
  assert.ok(content.includes('80%') || content.includes('quota_warning'), 'missing 80% threshold reference');
  assert.ok(content.includes('quota') && content.includes('exhausted'), 'missing exhaustion messaging');
});

test('QUOTA-04: health.md contains Stitch quota health check', () => {
  const content = readFileSync(resolve(ROOT, 'workflows', 'health.md'), 'utf-8');
  assert.ok(
    content.includes('stitch') || content.includes('Stitch'),
    'missing stitch reference in health.md'
  );
  assert.ok(content.includes('quota'), 'missing quota reference in health.md');
});
