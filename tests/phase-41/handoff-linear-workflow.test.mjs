/**
 * LIN-03 — handoff-create-linear-issues.md exists and contains confirmation gate
 *
 * Verifies the handoff-create-linear-issues.md workflow file exists and contains
 * the mandatory confirmation gate pattern: reads HND-handoff-spec, loads teamId
 * from mcp-connections.json, shows "Create this issue in Linear? (y/n)" prompt,
 * and only proceeds on explicit y/yes response.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = path.resolve(__dirname, '../../workflows/handoff-create-linear-issues.md');

describe('LIN-03 — handoff-create-linear-issues.md exists with confirmation gate', () => {
  let content;

  it('workflows/handoff-create-linear-issues.md exists on disk', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_PATH),
      `Expected workflows/handoff-create-linear-issues.md to exist at ${WORKFLOW_PATH}`
    );
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(content.length > 0, 'workflows/handoff-create-linear-issues.md must not be empty');
  });

  it('workflow uses bridge.call to look up linear:create-issue tool name', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('linear:create-issue'") ||
                    content.includes('b.call("linear:create-issue"') ||
                    content.includes("bridge.call('linear:create-issue'") ||
                    content.includes('bridge.call("linear:create-issue"');
    assert.ok(hasCall, 'handoff-create-linear-issues.md must use bridge.call() to look up linear:create-issue');
  });

  it('workflow reads teamId from mcp-connections.json', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('teamId'),
      'handoff-create-linear-issues.md must read teamId from mcp-connections.json'
    );
    const teamIdCount = (content.match(/teamId/g) || []).length;
    assert.ok(
      teamIdCount >= 4,
      `Expected teamId to appear at least 4 times, got ${teamIdCount}`
    );
  });

  it('workflow globs for HND-handoff-spec-v*.md', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('HND-handoff-spec-v'),
      'handoff-create-linear-issues.md must glob for HND-handoff-spec-v*.md artifacts'
    );
  });

  it('workflow shows confirmation gate prompt before creating issue', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasConfirmPrompt = content.includes('Create this issue in Linear? (y/n)') ||
                             content.includes('Create this issue in Linear?');
    assert.ok(
      hasConfirmPrompt,
      'handoff-create-linear-issues.md must show "Create this issue in Linear? (y/n)" confirmation prompt'
    );
  });

  it('workflow stops with "No issues created." on non-yes response', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('No issues created'),
      'handoff-create-linear-issues.md must output "No issues created." when user does not confirm'
    );
  });

  it('workflow contains CRITICAL annotation on confirmation gate step', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('CRITICAL'),
      'handoff-create-linear-issues.md must mark the confirmation gate as CRITICAL'
    );
  });

  it('workflow handles degraded mode when Linear is not connected', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('Linear is not connected'),
      'handoff-create-linear-issues.md must handle degraded mode with "Linear is not connected" message'
    );
  });

  it('workflow references mcp__linear__create_issue raw tool name', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('mcp__linear__create_issue'),
      'handoff-create-linear-issues.md must reference mcp__linear__create_issue as the resolved toolName'
    );
  });

  it('workflow contains anti_patterns section prohibiting write without confirmation', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('anti_patterns') || content.includes('NEVER create'),
      'handoff-create-linear-issues.md must have anti_patterns section prohibiting write without confirmation'
    );
  });

  it('workflow has at least 60 lines of content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount >= 60,
      `handoff-create-linear-issues.md must have at least 60 lines, got ${lineCount}`
    );
  });
});
