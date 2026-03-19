/**
 * LIN-01 — Linear TOOL_MAP entries resolve correctly via bridge.call()
 *
 * Verifies that all 7 Linear canonical names are registered in TOOL_MAP and
 * that bridge.call() returns the correct raw MCP tool name for each.
 * Also verifies bridge.probe('linear') returns probe_deferred (not not_configured).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const bridge = req(path.resolve(__dirname, '../../bin/lib/mcp-bridge.cjs'));

describe('LIN-01 — Linear TOOL_MAP entries resolve via bridge.call()', () => {
  it('TOOL_MAP contains exactly 22 total entries (8 GitHub + 7 Linear + 7 Atlassian)', () => {
    const keys = Object.keys(bridge.TOOL_MAP);
    assert.equal(
      keys.length,
      22,
      `Expected 22 TOOL_MAP entries, got ${keys.length}: ${keys.join(', ')}`
    );
  });

  it('bridge.call resolves linear:list-issues to mcp__linear__list_issues', () => {
    const result = bridge.call('linear:list-issues', {});
    assert.equal(result.toolName, 'mcp__linear__list_issues');
  });

  it('bridge.call resolves linear:probe to mcp__linear__list_issues', () => {
    const result = bridge.call('linear:probe', {});
    assert.equal(result.toolName, 'mcp__linear__list_issues');
  });

  it('bridge.call resolves linear:get-issue to mcp__linear__get_issue', () => {
    const result = bridge.call('linear:get-issue', {});
    assert.equal(result.toolName, 'mcp__linear__get_issue');
  });

  it('bridge.call resolves linear:list-cycles to mcp__linear__list_cycles', () => {
    const result = bridge.call('linear:list-cycles', {});
    assert.equal(result.toolName, 'mcp__linear__list_cycles');
  });

  it('bridge.call resolves linear:list-teams to mcp__linear__list_teams', () => {
    const result = bridge.call('linear:list-teams', {});
    assert.equal(result.toolName, 'mcp__linear__list_teams');
  });

  it('bridge.call resolves linear:create-issue to mcp__linear__create_issue', () => {
    const result = bridge.call('linear:create-issue', {});
    assert.equal(result.toolName, 'mcp__linear__create_issue');
  });

  it('bridge.call resolves linear:list-statuses to mcp__linear__list_issue_statuses', () => {
    const result = bridge.call('linear:list-statuses', {});
    assert.equal(result.toolName, 'mcp__linear__list_issue_statuses');
  });

  it('bridge.call forwards args unchanged for linear tools', () => {
    const args = { teamId: 'team-abc', limit: 50 };
    const result = bridge.call('linear:list-issues', args);
    assert.deepEqual(result.args, args);
  });

  it('bridge.probe returns probe_deferred for linear (probeTool is configured)', () => {
    const result = bridge.probe('linear');
    assert.equal(
      result.status,
      'probe_deferred',
      `Expected probe_deferred, got ${result.status}`
    );
  });

  it('APPROVED_SERVERS.linear.probeTool is mcp__linear__list_issues', () => {
    assert.equal(
      bridge.APPROVED_SERVERS.linear.probeTool,
      'mcp__linear__list_issues'
    );
  });

  it('APPROVED_SERVERS.linear uses HTTP transport', () => {
    assert.equal(bridge.APPROVED_SERVERS.linear.transport, 'http');
  });

  it('APPROVED_SERVERS.linear.url points to mcp.linear.app/mcp', () => {
    assert.equal(bridge.APPROVED_SERVERS.linear.url, 'https://mcp.linear.app/mcp');
  });

  it('APPROVED_SERVERS.linear.installCmd uses HTTP transport (not stdio)', () => {
    const cmd = bridge.APPROVED_SERVERS.linear.installCmd;
    assert.match(cmd, /--transport http/, 'installCmd must use --transport http');
    assert.match(cmd, /mcp\.linear\.app\/mcp/, 'installCmd must reference mcp.linear.app/mcp');
  });
});
