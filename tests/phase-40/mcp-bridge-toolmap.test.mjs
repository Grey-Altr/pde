/**
 * Gap 1: INFRA (TOOL_MAP)
 * Verifies TOOL_MAP has 8 GitHub entries and bridge.call() resolves them correctly.
 * Also verifies probe('github') returns probe_deferred (not probe_not_implemented),
 * and that other servers (linear, figma, pencil, atlassian) still have probeTool: null.
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
  it('TOOL_MAP contains exactly 8 GitHub canonical entries', () => {
    const keys = Object.keys(bridge.TOOL_MAP);
    assert.equal(keys.length, 8, `Expected 8 TOOL_MAP entries, got ${keys.length}: ${keys.join(', ')}`);
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

  it('linear probeTool is still null (other servers unaffected)', () => {
    assert.equal(bridge.APPROVED_SERVERS.linear.probeTool, null);
  });

  it('figma probeTool is still null (other servers unaffected)', () => {
    assert.equal(bridge.APPROVED_SERVERS.figma.probeTool, null);
  });

  it('pencil probeTool is still null (other servers unaffected)', () => {
    assert.equal(bridge.APPROVED_SERVERS.pencil.probeTool, null);
  });

  it('atlassian probeTool is still null (other servers unaffected)', () => {
    assert.equal(bridge.APPROVED_SERVERS.atlassian.probeTool, null);
  });
});
