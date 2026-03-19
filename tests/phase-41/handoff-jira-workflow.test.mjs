/**
 * JIRA-03 — handoff-create-jira-tickets.md exists with ADF format and confirmation gate
 *
 * Verifies the handoff-create-jira-tickets.md workflow file exists and contains:
 * - bridge.call() for jira:create-issue and jira:get-project-types
 * - ADF description format (type: doc, version: 1)
 * - Pre-flight issue type check
 * - Mandatory confirmation gate before any write
 * - "No tickets created." on non-yes response
 * - Degraded mode handling
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = path.resolve(__dirname, '../../workflows/handoff-create-jira-tickets.md');

describe('JIRA-03 — handoff-create-jira-tickets.md exists with ADF format and confirmation gate', () => {
  let content;

  it('workflows/handoff-create-jira-tickets.md exists on disk', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_PATH),
      `Expected workflows/handoff-create-jira-tickets.md to exist at ${WORKFLOW_PATH}`
    );
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(content.length > 0, 'workflows/handoff-create-jira-tickets.md must not be empty');
  });

  it('workflow uses bridge.call to look up jira:create-issue tool name', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('jira:create-issue'") ||
                    content.includes('b.call("jira:create-issue"') ||
                    content.includes("bridge.call('jira:create-issue'") ||
                    content.includes('bridge.call("jira:create-issue"');
    assert.ok(hasCall, 'handoff-create-jira-tickets.md must use bridge.call() to look up jira:create-issue');
  });

  it('workflow uses bridge.call to look up jira:get-project-types for pre-flight', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('jira:get-project-types'") ||
                    content.includes('b.call("jira:get-project-types"') ||
                    content.includes("bridge.call('jira:get-project-types'") ||
                    content.includes('bridge.call("jira:get-project-types"');
    assert.ok(hasCall, 'handoff-create-jira-tickets.md must use bridge.call() to look up jira:get-project-types for pre-flight issue type validation');
  });

  it('workflow contains ADF description format with type:doc and version:1', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasTypeDoc = content.includes('"type": "doc"') || content.includes("'type': 'doc'") || content.includes('"type":"doc"');
    const hasVersion = content.includes('"version": 1') || content.includes('"version":1') || content.includes("'version': 1");
    assert.ok(
      hasTypeDoc,
      'handoff-create-jira-tickets.md must include ADF format with "type": "doc"'
    );
    assert.ok(
      hasVersion,
      'handoff-create-jira-tickets.md must include ADF format with "version": 1'
    );
  });

  it('workflow reads projectKey from mcp-connections.json', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('projectKey'),
      'handoff-create-jira-tickets.md must read projectKey from mcp-connections.json'
    );
    const projectKeyCount = (content.match(/projectKey/g) || []).length;
    assert.ok(
      projectKeyCount >= 4,
      `Expected projectKey to appear at least 4 times, got ${projectKeyCount}`
    );
  });

  it('workflow globs for HND-handoff-spec-v*.md', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('HND-handoff-spec-v'),
      'handoff-create-jira-tickets.md must glob for HND-handoff-spec-v*.md artifacts'
    );
  });

  it('workflow shows confirmation gate prompt before creating ticket', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasConfirmPrompt = content.includes('Create this ticket in Jira? (y/n)') ||
                             content.includes('Create this ticket in Jira?');
    assert.ok(
      hasConfirmPrompt,
      'handoff-create-jira-tickets.md must show "Create this ticket in Jira? (y/n)" confirmation prompt'
    );
  });

  it('workflow stops with "No tickets created." on non-yes response', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('No tickets created'),
      'handoff-create-jira-tickets.md must output "No tickets created." when user does not confirm'
    );
  });

  it('workflow contains CRITICAL annotation on confirmation gate step', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('CRITICAL'),
      'handoff-create-jira-tickets.md must mark the confirmation gate as CRITICAL'
    );
  });

  it('workflow contains pre-flight issue type check before confirmation gate', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('mcp__atlassian__getJiraProjectIssueTypesMetadata'),
      'handoff-create-jira-tickets.md must reference getJiraProjectIssueTypesMetadata for pre-flight issue type check'
    );
  });

  it('workflow includes Story and Task issue type selection logic', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('Story') && content.includes('Task'),
      'handoff-create-jira-tickets.md must include Story and Task issue type selection logic'
    );
  });

  it('workflow handles degraded mode when Atlassian is not connected', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('Atlassian (Jira) is not connected'),
      'handoff-create-jira-tickets.md must handle degraded mode with "Atlassian (Jira) is not connected" message'
    );
  });

  it('workflow references mcp__atlassian__createJiraIssue raw tool name', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('mcp__atlassian__createJiraIssue'),
      'handoff-create-jira-tickets.md must reference mcp__atlassian__createJiraIssue as the resolved createToolName'
    );
  });

  it('workflow contains anti_patterns section prohibiting write without confirmation', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('anti_patterns') || content.includes('NEVER create'),
      'handoff-create-jira-tickets.md must have anti_patterns section prohibiting write without confirmation'
    );
  });

  it('workflow has at least 70 lines of content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount >= 70,
      `handoff-create-jira-tickets.md must have at least 70 lines, got ${lineCount}`
    );
  });
});
