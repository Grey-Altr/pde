/**
 * Gap 1: INFRA (TOOL_MAP)
 * Verifies TOOL_MAP has 8 GitHub entries and bridge.call() resolves them correctly.
 * Also verifies probe('github') returns probe_deferred (not probe_not_implemented).
 *
 * NOTE (Phase 41 update): linear and atlassian probeTool values were populated in
 * Phase 41. Tests for those (previously asserting null) have been updated to assert
 * the correct non-null values. figma and pencil remain null (Phases 42-43).
 * TOOL_MAP total is now 22 (8 GitHub + 7 Linear + 7 Atlassian).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const bridge = req(path.resolve(__dirname, '../../bin/lib/mcp-bridge.cjs'));

describe('TOOL_MAP has 8 GitHub entries (Gap 1 — INFRA)', () => {
  it('TOOL_MAP contains exactly 22 total entries (8 GitHub + 7 Linear + 7 Atlassian added in Phase 41)', () => {
    const keys = Object.keys(bridge.TOOL_MAP);
    assert.equal(keys.length, 22, `Expected 22 TOOL_MAP entries after Phase 41, got ${keys.length}: ${keys.join(', ')}`);
  });

  it('TOOL_MAP contains exactly 8 GitHub canonical entries', () => {
    const githubKeys = Object.keys(bridge.TOOL_MAP).filter(k => k.startsWith('github:'));
    assert.equal(githubKeys.length, 8, `Expected 8 GitHub TOOL_MAP entries, got ${githubKeys.length}: ${githubKeys.join(', ')}`);
  });

  it('bridge.call resolves github:list-issues to mcp__github__list_issues', () => {
    const result = bridge.call('github:list-issues', { owner: 'test', repo: 'test' });
    assert.equal(result.toolName, 'mcp__github__list_issues');
  });

  it('bridge.call resolves github:get-issue to mcp__github__issue_read', () => {
    const result = bridge.call('github:get-issue', {});
    assert.equal(result.toolName, 'mcp__github__issue_read');
  });

  it('bridge.call resolves github:create-pr to mcp__github__create_pull_request', () => {
    const result = bridge.call('github:create-pr', {});
    assert.equal(result.toolName, 'mcp__github__create_pull_request');
  });

  it('bridge.call resolves github:list-workflow-runs to mcp__github__actions_list', () => {
    const result = bridge.call('github:list-workflow-runs', {});
    assert.equal(result.toolName, 'mcp__github__actions_list');
  });

  it('bridge.call resolves github:update-pr to mcp__github__update_pull_request', () => {
    const result = bridge.call('github:update-pr', {});
    assert.equal(result.toolName, 'mcp__github__update_pull_request');
  });

  it('bridge.call resolves github:get-workflow-run to mcp__github__actions_get', () => {
    const result = bridge.call('github:get-workflow-run', {});
    assert.equal(result.toolName, 'mcp__github__actions_get');
  });

  it('bridge.call resolves github:search-issues to mcp__github__search_issues', () => {
    const result = bridge.call('github:search-issues', {});
    assert.equal(result.toolName, 'mcp__github__search_issues');
  });

  it('bridge.call resolves github:probe to mcp__github__list_issues', () => {
    const result = bridge.call('github:probe', {});
    assert.equal(result.toolName, 'mcp__github__list_issues');
  });

  it('bridge.call forwards args unchanged', () => {
    const args = { owner: 'acme', repo: 'widget', state: 'OPEN' };
    const result = bridge.call('github:list-issues', args);
    assert.deepEqual(result.args, args);
  });

  it('bridge.probe returns probe_deferred for github (not probe_not_implemented)', () => {
    const result = bridge.probe('github');
    assert.notEqual(result.status, 'probe_not_implemented',
      'github probe should not return probe_not_implemented — probeTool must be set');
    assert.equal(result.status, 'probe_deferred');
  });

  it('linear probeTool is mcp__linear__list_issues (populated in Phase 41)', () => {
    // Phase 41 set linear.probeTool — probe_deferred is now returned, not not_configured
    assert.equal(bridge.APPROVED_SERVERS.linear.probeTool, 'mcp__linear__list_issues');
  });

  it('figma probeTool is still null (Phase 42 fills)', () => {
    assert.equal(bridge.APPROVED_SERVERS.figma.probeTool, null);
  });

  it('pencil probeTool is still null (Phase 43 fills)', () => {
    assert.equal(bridge.APPROVED_SERVERS.pencil.probeTool, null);
  });

  it('atlassian probeTool is mcp__atlassian__getVisibleJiraProjectsList (populated in Phase 41)', () => {
    // Phase 41 set atlassian.probeTool — probe_deferred is now returned, not not_configured
    assert.equal(
      bridge.APPROVED_SERVERS.atlassian.probeTool,
      'mcp__atlassian__getVisibleJiraProjectsList'
    );
  });
});
