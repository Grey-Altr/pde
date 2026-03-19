/**
 * PEN-01 — sync-pencil.md workflow structural validation
 *
 * Verifies the sync-pencil.md workflow file exists and contains all
 * required structural elements: bridge.call() usage for pencil:set-variables,
 * loadConnections() call, tokens.json reference, degraded mode message,
 * get-before-set pattern, and minimum line count.
 *
 * NOTE: These tests are intentionally RED at Task 1 commit (TDD).
 * They will turn GREEN after Task 2 creates workflows/sync-pencil.md.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = path.resolve(__dirname, '../../workflows/sync-pencil.md');

describe('PEN-01 — sync-pencil.md exists and contains token push logic', () => {
  let content;

  it('workflows/sync-pencil.md exists on disk', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_PATH),
      `Expected workflows/sync-pencil.md to exist at ${WORKFLOW_PATH}`
    );
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(content.length > 0, 'workflows/sync-pencil.md must not be empty');
  });

  it('sync-pencil.md uses bridge.call for adapter pattern', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('pencil:set-variables'") ||
                    content.includes('b.call("pencil:set-variables"') ||
                    content.includes("bridge.call('pencil:set-variables'") ||
                    content.includes('bridge.call("pencil:set-variables"');
    assert.ok(hasCall, 'sync-pencil.md must use bridge.call() to look up pencil:set-variables');
  });

  it('sync-pencil.md calls loadConnections() to read Pencil connection metadata', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('loadConnections()') || content.includes('b.loadConnections()'),
      'sync-pencil.md must call loadConnections() to read Pencil connection metadata'
    );
  });

  it('sync-pencil.md references pencil:set-variables (canonical tool name)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('pencil:set-variables'),
      'sync-pencil.md must reference pencil:set-variables canonical tool name'
    );
  });

  it('sync-pencil.md references pencil:get-variables (get-before-set pattern)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('pencil:get-variables'),
      'sync-pencil.md must reference pencil:get-variables for get-before-set merge pattern'
    );
  });

  it('sync-pencil.md references tokens.json as DTCG token source', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('tokens.json'),
      'sync-pencil.md must reference tokens.json as the DTCG token source'
    );
  });

  it('sync-pencil.md contains /pde:connect pencil degraded mode guidance', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('/pde:connect pencil'),
      'sync-pencil.md must contain degraded mode message referencing /pde:connect pencil'
    );
  });

  it('sync-pencil.md has at least 80 lines of content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount >= 80,
      `sync-pencil.md must have at least 80 lines, got ${lineCount}`
    );
  });
});
