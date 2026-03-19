/**
 * FIG-03 — handoff-figma-codeConnect.md exists and contains Code Connect mapping logic
 *
 * Verifies the handoff-figma-codeConnect.md workflow file exists and contains all
 * required structural elements: bridge.call() usage for figma:get-code-connect-map,
 * loadConnections() call, Code Connect reference, table header format, and degraded
 * mode handling for empty maps.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, '../..');
const WORKFLOW_PATH = path.resolve(pluginRoot, 'workflows/handoff-figma-codeConnect.md');

describe('FIG-03 — handoff-figma-codeConnect.md workflow structure', () => {
  let content;

  it('workflows/handoff-figma-codeConnect.md exists on disk', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_PATH),
      `Expected workflows/handoff-figma-codeConnect.md to exist at ${WORKFLOW_PATH}`
    );
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(content.length > 0, 'workflows/handoff-figma-codeConnect.md must not be empty');
  });

  it('handoff-figma-codeConnect.md uses bridge.call for figma:get-code-connect-map tool lookup', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('figma:get-code-connect-map'") ||
                    content.includes('b.call("figma:get-code-connect-map"') ||
                    content.includes("bridge.call('figma:get-code-connect-map'") ||
                    content.includes('bridge.call("figma:get-code-connect-map"');
    assert.ok(hasCall, 'handoff-figma-codeConnect.md must use bridge.call() to look up figma:get-code-connect-map');
  });

  it('handoff-figma-codeConnect.md calls loadConnections() to read figma config', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('loadConnections()') || content.includes('b.loadConnections()'),
      'handoff-figma-codeConnect.md must call loadConnections() to read mcp-connections.json'
    );
  });

  it('handoff-figma-codeConnect.md contains "Code Connect" text', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('Code Connect'),
      'handoff-figma-codeConnect.md must reference "Code Connect" in its content'
    );
  });

  it('handoff-figma-codeConnect.md contains markdown table format with "Figma Node ID" column', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('Figma Node ID'),
      'handoff-figma-codeConnect.md must contain table header "Figma Node ID"'
    );
  });

  it('handoff-figma-codeConnect.md contains "Component" column in table format', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('Component'),
      'handoff-figma-codeConnect.md must contain "Component" in table format'
    );
  });

  it('handoff-figma-codeConnect.md contains "Source Path" column in table format', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('Source Path'),
      'handoff-figma-codeConnect.md must contain "Source Path" in table format'
    );
  });

  it('handoff-figma-codeConnect.md contains degraded mode handling for empty Code Connect map', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasDegraded = content.includes('@figma/code-connect') ||
                        content.includes('No Code Connect') ||
                        content.includes('empty') ||
                        content.includes('not connected');
    assert.ok(hasDegraded, 'handoff-figma-codeConnect.md must handle empty/missing Code Connect map gracefully, referencing @figma/code-connect setup');
  });

  it('handoff-figma-codeConnect.md has at least 40 lines of content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount >= 40,
      `handoff-figma-codeConnect.md must have at least 40 lines, got ${lineCount}`
    );
  });
});
