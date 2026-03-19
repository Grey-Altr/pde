/**
 * FIG-01 — sync-figma.md exists and contains token import logic
 *
 * Verifies the sync-figma.md workflow file exists and contains all
 * required structural elements: bridge.call() usage for figma:get-variable-defs,
 * loadConnections() call, fileUrl reference, tokens.json reference,
 * dry-run handling, degraded mode, and color conversion logic.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = path.resolve(__dirname, '../../workflows/sync-figma.md');

describe('FIG-01 — sync-figma.md exists and contains token import logic', () => {
  let content;

  it('workflows/sync-figma.md exists on disk', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_PATH),
      `Expected workflows/sync-figma.md to exist at ${WORKFLOW_PATH}`
    );
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(content.length > 0, 'workflows/sync-figma.md must not be empty');
  });

  it('sync-figma.md uses bridge.call for figma:get-variable-defs tool lookup', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('figma:get-variable-defs'") ||
                    content.includes('b.call("figma:get-variable-defs"') ||
                    content.includes("bridge.call('figma:get-variable-defs'") ||
                    content.includes('bridge.call("figma:get-variable-defs"');
    assert.ok(hasCall, 'sync-figma.md must use bridge.call() to look up figma:get-variable-defs');
  });

  it('sync-figma.md calls loadConnections() to read Figma connection metadata', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('loadConnections()') || content.includes('b.loadConnections()'),
      'sync-figma.md must call loadConnections() to read Figma connection metadata'
    );
  });

  it('sync-figma.md references fileUrl for Figma file context', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('fileUrl'),
      'sync-figma.md must reference fileUrl from mcp-connections.json'
    );
  });

  it('sync-figma.md references tokens.json as the output file', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('tokens.json') || content.includes('tokens.css'),
      'sync-figma.md must reference tokens.json (or tokens.css) as the output file'
    );
  });

  it('sync-figma.md contains --dry-run flag handling', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('--dry-run'),
      'sync-figma.md must support --dry-run flag'
    );
  });

  it('sync-figma.md contains degraded mode message with Run /pde:connect figma', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('Run /pde:connect figma') || content.includes('/pde:connect figma'),
      'sync-figma.md must contain degraded mode message referencing /pde:connect figma'
    );
  });

  it('sync-figma.md has at least 80 lines of content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount >= 80,
      `sync-figma.md must have at least 80 lines, got ${lineCount}`
    );
  });
});
