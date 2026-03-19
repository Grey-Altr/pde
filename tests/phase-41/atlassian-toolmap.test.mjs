/**
 * JIRA-01 — Atlassian TOOL_MAP entries resolve correctly via bridge.call()
 *
 * Verifies that all 7 Atlassian/Jira canonical names are registered in TOOL_MAP
 * and that bridge.call() returns the correct raw MCP tool name for each.
 * Also verifies bridge.probe('atlassian') returns probe_deferred.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const bridge = req(path.resolve(__dirname, '../../bin/lib/mcp-bridge.cjs'));

describe('JIRA-01 — Atlassian TOOL_MAP entries resolve via bridge.call()', () => {
  it('bridge.call resolves jira:search-issues to mcp__atlassian__searchJiraIssuesUsingJql', () => {
    const result = bridge.call('jira:search-issues', {});
    assert.equal(result.toolName, 'mcp__atlassian__searchJiraIssuesUsingJql');
  });

  it('bridge.call resolves jira:probe to mcp__atlassian__getVisibleJiraProjectsList', () => {
    const result = bridge.call('jira:probe', {});
    assert.equal(result.toolName, 'mcp__atlassian__getVisibleJiraProjectsList');
  });

  it('bridge.call resolves jira:get-issue to mcp__atlassian__getJiraIssue', () => {
    const result = bridge.call('jira:get-issue', {});
    assert.equal(result.toolName, 'mcp__atlassian__getJiraIssue');
  });

  it('bridge.call resolves jira:create-issue to mcp__atlassian__createJiraIssue', () => {
    const result = bridge.call('jira:create-issue', {});
    assert.equal(result.toolName, 'mcp__atlassian__createJiraIssue');
  });

  it('bridge.call resolves jira:get-project-types to mcp__atlassian__getJiraProjectIssueTypesMetadata', () => {
    const result = bridge.call('jira:get-project-types', {});
    assert.equal(result.toolName, 'mcp__atlassian__getJiraProjectIssueTypesMetadata');
  });

  it('bridge.call resolves jira:get-issue-type-fields to mcp__atlassian__getJiraIssueTypeMetaWithFields', () => {
    const result = bridge.call('jira:get-issue-type-fields', {});
    assert.equal(result.toolName, 'mcp__atlassian__getJiraIssueTypeMetaWithFields');
  });

  it('bridge.call resolves jira:list-projects to mcp__atlassian__getVisibleJiraProjectsList', () => {
    const result = bridge.call('jira:list-projects', {});
    assert.equal(result.toolName, 'mcp__atlassian__getVisibleJiraProjectsList');
  });

  it('bridge.call forwards args unchanged for jira tools', () => {
    const args = { jql: 'project = MYPROJ AND status != Done', maxResults: 50 };
    const result = bridge.call('jira:search-issues', args);
    assert.deepEqual(result.args, args);
  });

  it('bridge.probe returns probe_deferred for atlassian (probeTool is configured)', () => {
    const result = bridge.probe('atlassian');
    assert.equal(
      result.status,
      'probe_deferred',
      `Expected probe_deferred, got ${result.status}`
    );
  });

  it('APPROVED_SERVERS.atlassian.probeTool is mcp__atlassian__getVisibleJiraProjectsList', () => {
    assert.equal(
      bridge.APPROVED_SERVERS.atlassian.probeTool,
      'mcp__atlassian__getVisibleJiraProjectsList'
    );
  });

  it('APPROVED_SERVERS.atlassian uses SSE transport', () => {
    assert.equal(bridge.APPROVED_SERVERS.atlassian.transport, 'sse');
  });

  it('APPROVED_SERVERS.atlassian.url points to mcp.atlassian.com/v1/sse', () => {
    assert.equal(bridge.APPROVED_SERVERS.atlassian.url, 'https://mcp.atlassian.com/v1/sse');
  });

  it('APPROVED_SERVERS.atlassian.installCmd uses SSE transport (not stdio)', () => {
    const cmd = bridge.APPROVED_SERVERS.atlassian.installCmd;
    assert.match(cmd, /--transport sse/, 'installCmd must use --transport sse');
    assert.match(cmd, /mcp\.atlassian\.com\/v1\/sse/, 'installCmd must reference mcp.atlassian.com/v1/sse');
  });
});
