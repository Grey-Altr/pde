/**
 * PEN-02 — critique-pencil-screenshot.md workflow structural validation
 *
 * Verifies the critique-pencil-screenshot.md workflow file exists and contains all
 * required structural elements: bridge.call() usage, loadConnections() call,
 * pencil:get-screenshot tool reference, output file path, degraded mode guidance,
 * base64 decoding, and minimum line count.
 *
 * NOTE: These tests are intentionally RED at Task 1 commit (TDD).
 * They will turn GREEN after Task 2 creates workflows/critique-pencil-screenshot.md.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = path.resolve(__dirname, '../../workflows/critique-pencil-screenshot.md');

describe('PEN-02 — critique-pencil-screenshot.md workflow structural validation', () => {
  let content;

  it('workflows/critique-pencil-screenshot.md exists on disk', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_PATH),
      `Expected workflows/critique-pencil-screenshot.md to exist at ${WORKFLOW_PATH}`
    );
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(content.length > 0, 'workflows/critique-pencil-screenshot.md must not be empty');
  });

  it('critique-pencil-screenshot.md uses bridge.call or b.call (adapter pattern)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('pencil:get-screenshot'") ||
                    content.includes('b.call("pencil:get-screenshot"') ||
                    content.includes("bridge.call('pencil:get-screenshot'") ||
                    content.includes('bridge.call("pencil:get-screenshot"') ||
                    content.includes('b.call(') ||
                    content.includes('bridge.call(');
    assert.ok(hasCall, 'critique-pencil-screenshot.md must use bridge.call() or b.call() for adapter pattern');
  });

  it('critique-pencil-screenshot.md calls loadConnections (connection check)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('loadConnections()') || content.includes('b.loadConnections()'),
      'critique-pencil-screenshot.md must call loadConnections() to check Pencil connection status'
    );
  });

  it('critique-pencil-screenshot.md contains pencil:get-screenshot (canonical tool name)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('pencil:get-screenshot'),
      'critique-pencil-screenshot.md must reference pencil:get-screenshot canonical tool name'
    );
  });

  it('critique-pencil-screenshot.md contains pencil-canvas.png (output file path)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('pencil-canvas.png'),
      'critique-pencil-screenshot.md must reference pencil-canvas.png as the output file path'
    );
  });

  it('critique-pencil-screenshot.md contains /pde:connect pencil (degraded mode guidance)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('/pde:connect pencil'),
      'critique-pencil-screenshot.md must contain degraded mode message referencing /pde:connect pencil'
    );
  });

  it('critique-pencil-screenshot.md contains base64 (response decoding)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('base64'),
      'critique-pencil-screenshot.md must contain base64 decoding logic for screenshot response'
    );
  });

  it('critique-pencil-screenshot.md has at least 60 lines of content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount >= 60,
      `critique-pencil-screenshot.md must have at least 60 lines, got ${lineCount}`
    );
  });
});
