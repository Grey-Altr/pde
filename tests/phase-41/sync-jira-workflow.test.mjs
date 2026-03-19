/**
 * JIRA-02 — sync-jira.md exists and contains epic table logic
 *
 * Verifies the sync-jira.md workflow file exists and contains all
 * required structural elements: bridge.call() for jira:search-issues,
 * JIRA-<key> dedup format, ## Jira Epics table, nextPageToken pagination
 * (not startAt), degraded mode handling, and dry-run support.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = path.resolve(__dirname, '../../workflows/sync-jira.md');

describe('JIRA-02 — sync-jira.md exists and contains epic table logic', () => {
  let content;

  it('workflows/sync-jira.md exists on disk', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_PATH),
      `Expected workflows/sync-jira.md to exist at ${WORKFLOW_PATH}`
    );
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(content.length > 0, 'workflows/sync-jira.md must not be empty');
  });

  it('sync-jira.md uses bridge.call for jira:search-issues tool lookup', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('jira:search-issues'") ||
                    content.includes('b.call("jira:search-issues"') ||
                    content.includes("bridge.call('jira:search-issues'") ||
                    content.includes('bridge.call("jira:search-issues"');
    assert.ok(hasCall, 'sync-jira.md must use bridge.call() to look up jira:search-issues');
  });

  it('sync-jira.md contains ### Jira Issues section heading format', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('### Jira Issues'),
      'sync-jira.md must reference ### Jira Issues section for REQUIREMENTS.md append target'
    );
  });

  it('sync-jira.md contains JIRA-<key> deduplication key format', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('JIRA-'),
      'sync-jira.md must use JIRA-<key> format for deduplication keys'
    );
  });

  it('sync-jira.md contains ## Jira Epics reference table section (JIRA-02)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('## Jira Epics'),
      'sync-jira.md must produce ## Jira Epics reference table in REQUIREMENTS.md (JIRA-02)'
    );
  });

  it('sync-jira.md uses nextPageToken for pagination (not startAt)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('nextPageToken'),
      'sync-jira.md must use nextPageToken cursor pagination (Atlassian MCP does not support startAt)'
    );
    // The word "startAt" may appear in a prohibition statement (e.g., "NOT startAt").
    // What must NOT appear is startAt used as an actual pagination parameter call.
    // The plan requires: "does NOT contain startAt for pagination" — meaning no `startAt:` parameter usage.
    const hasStartAtAsParam = /startAt\s*:/.test(content) || /`startAt`[^,\s]*\s*pagination/.test(content);
    // Verify startAt is only mentioned as forbidden, not used as an actual call parameter
    const startAtLines = content.split('\n').filter(l => l.includes('startAt'));
    const startAtUsedAsParam = startAtLines.some(l =>
      // A line using startAt as an actual key-value pair in a call (not a prohibition sentence)
      /startAt\s*:/.test(l)
    );
    assert.ok(
      !startAtUsedAsParam,
      `sync-jira.md must NOT use startAt as an actual pagination parameter. Lines containing startAt: ${startAtLines.join(' | ')}`
    );
  });

  it('sync-jira.md contains issuetype = Epic JQL for epic fetch (JIRA-02)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('issuetype = Epic'),
      'sync-jira.md must use issuetype = Epic JQL to fetch epics'
    );
  });

  it('sync-jira.md contains issuetype != Epic JQL to exclude epics from issue list', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('issuetype != Epic'),
      'sync-jira.md must exclude epics from the main issues JQL query'
    );
  });

  it('sync-jira.md contains degraded mode handling when Atlassian is not connected', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('Atlassian (Jira) is not connected'),
      'sync-jira.md must handle degraded mode with "Atlassian (Jira) is not connected" message'
    );
  });

  it('sync-jira.md contains --dry-run flag handling', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('--dry-run'),
      'sync-jira.md must support --dry-run flag'
    );
  });

  it('sync-jira.md reads projectKey from mcp-connections.json via loadConnections()', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('loadConnections()') || content.includes('b.loadConnections()'),
      'sync-jira.md must call loadConnections() to read projectKey'
    );
    assert.ok(
      content.includes('projectKey'),
      'sync-jira.md must read projectKey from connection data'
    );
  });

  it('sync-jira.md references mcp__atlassian__searchJiraIssuesUsingJql raw tool name', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('mcp__atlassian__searchJiraIssuesUsingJql'),
      'sync-jira.md must reference mcp__atlassian__searchJiraIssuesUsingJql as the resolved toolName'
    );
  });

  it('sync-jira.md reads siteUrl for constructing Jira browse links', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('siteUrl'),
      'sync-jira.md must use siteUrl from mcp-connections.json to construct Jira browse URLs'
    );
  });

  it('sync-jira.md has at least 80 lines of content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount >= 80,
      `sync-jira.md must have at least 80 lines, got ${lineCount}`
    );
  });
});
