/**
 * FIG-02 — wireframe-figma-context.md exists and contains Figma design context logic
 *
 * Verifies the wireframe-figma-context.md workflow file exists and contains all
 * required structural elements: bridge.call() usage for figma:get-design-context,
 * loadConnections() call, fileUrl reference, <purpose> tag, and degraded mode handling.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, '../..');
const WORKFLOW_PATH = path.resolve(pluginRoot, 'workflows/wireframe-figma-context.md');

describe('FIG-02 — wireframe-figma-context.md workflow structure', () => {
  let content;

  it('workflows/wireframe-figma-context.md exists on disk', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_PATH),
      `Expected workflows/wireframe-figma-context.md to exist at ${WORKFLOW_PATH}`
    );
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(content.length > 0, 'workflows/wireframe-figma-context.md must not be empty');
  });

  it('wireframe-figma-context.md uses bridge.call for figma:get-design-context tool lookup', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('figma:get-design-context'") ||
                    content.includes('b.call("figma:get-design-context"') ||
                    content.includes("bridge.call('figma:get-design-context'") ||
                    content.includes('bridge.call("figma:get-design-context"');
    assert.ok(hasCall, 'wireframe-figma-context.md must use bridge.call() to look up figma:get-design-context');
  });

  it('wireframe-figma-context.md calls loadConnections() to read figma config', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('loadConnections()') || content.includes('b.loadConnections()'),
      'wireframe-figma-context.md must call loadConnections() to read mcp-connections.json'
    );
  });

  it('wireframe-figma-context.md references fileUrl for Figma file URL', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('fileUrl'),
      'wireframe-figma-context.md must reference fileUrl (Figma file URL from mcp-connections.json)'
    );
  });

  it('wireframe-figma-context.md contains a <purpose> block', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('<purpose>'),
      'wireframe-figma-context.md must have a <purpose> block describing its function'
    );
  });

  it('wireframe-figma-context.md contains degraded mode handling text', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasDegraded = content.includes('unavailable') ||
                        content.includes('not connected') ||
                        content.includes('degraded') ||
                        content.includes('Figma context unavailable');
    assert.ok(hasDegraded, 'wireframe-figma-context.md must contain degraded mode handling for when Figma is not connected');
  });

  it('wireframe-figma-context.md has at least 40 lines of content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount >= 40,
      `wireframe-figma-context.md must have at least 40 lines, got ${lineCount}`
    );
  });
});
