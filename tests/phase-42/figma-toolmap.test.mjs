/**
 * FIG-01 — Figma TOOL_MAP entries resolve correctly via bridge.call()
 *
 * Verifies that all 7 Figma canonical names are registered in TOOL_MAP and
 * that bridge.call() returns the correct raw MCP tool name for each.
 * Also verifies bridge.probe('figma') returns probe_deferred (not not_configured).
 * Also verifies APPROVED_SERVERS.figma properties match Phase 42 research.
 *
 * Total TOOL_MAP entries: 29 (8 GitHub + 7 Linear + 7 Atlassian + 7 Figma)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const bridge = req(path.resolve(__dirname, '../../bin/lib/mcp-bridge.cjs'));

describe('FIG-01 — Figma TOOL_MAP entries resolve via bridge.call()', () => {
  it('TOOL_MAP contains exactly 29 total entries (8 GitHub + 7 Linear + 7 Atlassian + 7 Figma)', () => {
    const keys = Object.keys(bridge.TOOL_MAP);
    assert.equal(
      keys.length,
      29,
      `Expected 29 TOOL_MAP entries, got ${keys.length}: ${keys.join(', ')}`
    );
  });

  it('bridge.call resolves figma:probe to mcp__figma__get_design_context', () => {
    const result = bridge.call('figma:probe', {});
    assert.equal(result.toolName, 'mcp__figma__get_design_context');
  });

  it('bridge.call resolves figma:get-design-context to mcp__figma__get_design_context', () => {
    const result = bridge.call('figma:get-design-context', {});
    assert.equal(result.toolName, 'mcp__figma__get_design_context');
  });

  it('bridge.call resolves figma:get-variable-defs to mcp__figma__get_variable_defs', () => {
    const result = bridge.call('figma:get-variable-defs', {});
    assert.equal(result.toolName, 'mcp__figma__get_variable_defs');
  });

  it('bridge.call resolves figma:get-code-connect-map to mcp__figma__get_code_connect_map', () => {
    const result = bridge.call('figma:get-code-connect-map', {});
    assert.equal(result.toolName, 'mcp__figma__get_code_connect_map');
  });

  it('bridge.call resolves figma:get-screenshot to mcp__figma__get_screenshot', () => {
    const result = bridge.call('figma:get-screenshot', {});
    assert.equal(result.toolName, 'mcp__figma__get_screenshot');
  });

  it('bridge.call resolves figma:generate-design to mcp__figma__generate_figma_design', () => {
    const result = bridge.call('figma:generate-design', {});
    assert.equal(result.toolName, 'mcp__figma__generate_figma_design');
  });

  it('bridge.call resolves figma:get-metadata to mcp__figma__get_metadata', () => {
    const result = bridge.call('figma:get-metadata', {});
    assert.equal(result.toolName, 'mcp__figma__get_metadata');
  });

  it('bridge.call forwards args unchanged for figma tools', () => {
    const args = { fileUrl: 'https://www.figma.com/design/ABC123/MyDesign', nodeId: '1:2' };
    const result = bridge.call('figma:get-variable-defs', args);
    assert.deepEqual(result.args, args);
  });

  it('bridge.probe returns probe_deferred for figma (probeTool is configured)', () => {
    const result = bridge.probe('figma');
    assert.equal(
      result.status,
      'probe_deferred',
      `Expected probe_deferred, got ${result.status}`
    );
  });

  it('APPROVED_SERVERS.figma.probeTool is mcp__figma__get_design_context', () => {
    assert.equal(
      bridge.APPROVED_SERVERS.figma.probeTool,
      'mcp__figma__get_design_context'
    );
  });

  it('APPROVED_SERVERS.figma uses HTTP transport', () => {
    assert.equal(bridge.APPROVED_SERVERS.figma.transport, 'http');
  });

  it('APPROVED_SERVERS.figma.url points to https://mcp.figma.com/mcp', () => {
    assert.equal(bridge.APPROVED_SERVERS.figma.url, 'https://mcp.figma.com/mcp');
  });
});
