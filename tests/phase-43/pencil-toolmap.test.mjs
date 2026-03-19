/**
 * PEN-01 — Pencil TOOL_MAP entries resolve correctly via bridge.call()
 *
 * Verifies that all 7 Pencil canonical names are registered in TOOL_MAP and
 * that bridge.call() returns the correct raw MCP tool name for each.
 * Also verifies bridge.probe('pencil') returns probe_deferred (not not_configured).
 * Also verifies APPROVED_SERVERS.pencil properties match Phase 43 research.
 *
 * Total TOOL_MAP entries: 36 (8 GitHub + 7 Linear + 7 Atlassian + 7 Figma + 7 Pencil)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const bridge = req(path.resolve(__dirname, '../../bin/lib/mcp-bridge.cjs'));

describe('PEN-01 — Pencil TOOL_MAP entries resolve via bridge.call()', () => {
  it('TOOL_MAP contains exactly 36 total entries (8 GitHub + 7 Linear + 7 Atlassian + 7 Figma + 7 Pencil)', () => {
    const keys = Object.keys(bridge.TOOL_MAP);
    assert.equal(
      keys.length,
      36,
      `Expected 36 TOOL_MAP entries, got ${keys.length}: ${keys.join(', ')}`
    );
  });

  it('bridge.call resolves pencil:probe to mcp__pencil__get_variables', () => {
    const result = bridge.call('pencil:probe', {});
    assert.equal(result.toolName, 'mcp__pencil__get_variables');
  });

  it('bridge.call resolves pencil:get-variables to mcp__pencil__get_variables', () => {
    const result = bridge.call('pencil:get-variables', {});
    assert.equal(result.toolName, 'mcp__pencil__get_variables');
  });

  it('bridge.call resolves pencil:set-variables to mcp__pencil__set_variables', () => {
    const result = bridge.call('pencil:set-variables', {});
    assert.equal(result.toolName, 'mcp__pencil__set_variables');
  });

  it('bridge.call resolves pencil:get-screenshot to mcp__pencil__get_screenshot', () => {
    const result = bridge.call('pencil:get-screenshot', {});
    assert.equal(result.toolName, 'mcp__pencil__get_screenshot');
  });

  it('bridge.call resolves pencil:batch-get to mcp__pencil__batch_get', () => {
    const result = bridge.call('pencil:batch-get', {});
    assert.equal(result.toolName, 'mcp__pencil__batch_get');
  });

  it('bridge.call resolves pencil:batch-design to mcp__pencil__batch_design', () => {
    const result = bridge.call('pencil:batch-design', {});
    assert.equal(result.toolName, 'mcp__pencil__batch_design');
  });

  it('bridge.call resolves pencil:get-editor-state to mcp__pencil__get_editor_state', () => {
    const result = bridge.call('pencil:get-editor-state', {});
    assert.equal(result.toolName, 'mcp__pencil__get_editor_state');
  });

  it('bridge.call forwards args unchanged for pencil tools', () => {
    const args = { variables: { 'color.primary': { type: 'color', value: '#3b82f6' } } };
    const result = bridge.call('pencil:set-variables', args);
    assert.deepEqual(result.args, args);
  });

  it('bridge.probe returns probe_deferred for pencil (probeTool is configured)', () => {
    const result = bridge.probe('pencil');
    assert.equal(
      result.status,
      'probe_deferred',
      `Expected probe_deferred, got ${result.status}`
    );
  });

  it('APPROVED_SERVERS.pencil.probeTool is mcp__pencil__get_variables', () => {
    assert.equal(
      bridge.APPROVED_SERVERS.pencil.probeTool,
      'mcp__pencil__get_variables'
    );
  });

  it('APPROVED_SERVERS.pencil uses stdio transport', () => {
    assert.equal(bridge.APPROVED_SERVERS.pencil.transport, 'stdio');
  });

  it('APPROVED_SERVERS.pencil.probeTimeoutMs is 8000', () => {
    assert.equal(bridge.APPROVED_SERVERS.pencil.probeTimeoutMs, 8000);
  });
});
