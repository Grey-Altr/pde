/**
 * Gap 6: GH-02 (handoff --create-prs)
 * Verifies handoff-create-prs workflow structure:
 * - bridge.call('github:create-pr') canonical lookup
 * - confirmation gate ("Create this PR?" with y/n prompt)
 * - "No PRs created." response for declined confirmation
 * - HND-handoff-spec-v*.md artifact discovery pattern
 * - "Which branch contains this work?" prompt for branch name
 * - degraded-mode message when GitHub unavailable
 * - no MCP write call before user confirmation
 * - node --input-type=module with createRequire pattern
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../workflows/handoff-create-prs.md');
const content = fs.readFileSync(workflowPath, 'utf-8');

describe('handoff-create-prs.md workflow structure (Gap 6 — GH-02)', () => {
  it('handoff-create-prs.md uses bridge.call with github:create-pr canonical name', () => {
    assert.match(content, /bridge\.call\(['"]github:create-pr['"]/,
      'Expected bridge.call(\'github:create-pr\') in handoff-create-prs.md');
  });

  it('handoff-create-prs.md has confirmation prompt before any PR write', () => {
    assert.match(content, /Create this PR\?|Create these.*PR/i,
      'Expected "Create this PR?" confirmation prompt in handoff-create-prs.md');
  });

  it('handoff-create-prs.md confirmation prompt includes y/n choice', () => {
    assert.match(content, /\(y\/n\)/i,
      'Expected (y/n) in confirmation prompt of handoff-create-prs.md');
  });

  it('handoff-create-prs.md shows "No PRs created." when user declines', () => {
    assert.match(content, /No PRs created/,
      'Expected "No PRs created." response for declined confirmation');
  });

  it('handoff-create-prs.md discovers HND-handoff-spec-v*.md artifacts', () => {
    assert.match(content, /HND-handoff-spec-v/,
      'Expected HND-handoff-spec-v*.md artifact discovery pattern in handoff-create-prs.md');
  });

  it('handoff-create-prs.md asks user for branch name', () => {
    assert.match(content, /Which branch contains this work\?|Branch name/i,
      'Expected "Which branch contains this work?" prompt in handoff-create-prs.md');
  });

  it('handoff-create-prs.md has degraded-mode message when GitHub is unavailable', () => {
    assert.match(content, /not connected|not configured|PR creation skipped/i,
      'Expected degraded-mode message in handoff-create-prs.md');
  });

  it('handoff-create-prs.md Step 4 MCP call is gated after confirmation', () => {
    // The confirmation gate (Step 3) must appear before the Step 4 MCP call section.
    // The raw tool name mcp__github__create_pull_request appears in Step 0 prose as documentation,
    // and again in Step 4 as the actual call instruction. We look for Step 4 explicitly.
    const step3Idx = content.search(/Step 3|confirmation gate/i);
    const step4Idx = content.search(/Step 4|only after user confirm/i);
    assert.ok(step3Idx !== -1, 'Expected Step 3 (confirmation gate) section in handoff-create-prs.md');
    assert.ok(step4Idx !== -1, 'Expected Step 4 (MCP call after confirmation) section in handoff-create-prs.md');
    assert.ok(step3Idx < step4Idx,
      'Step 3 (confirmation gate) must appear before Step 4 (MCP call) in handoff-create-prs.md');
    // Also verify the actual MCP tool call instruction appears within or after Step 4
    const step4Content = content.slice(step4Idx);
    assert.match(step4Content, /mcp__github__create_pull_request|bridge\.call\(['"]github:create-pr['"]\)/,
      'Expected MCP create_pull_request call to appear in Step 4 (after confirmation gate)');
  });

  it('handoff-create-prs.md uses node --input-type=module with createRequire pattern', () => {
    assert.match(content, /node --input-type=module/,
      'Expected node --input-type=module in handoff-create-prs.md bash blocks');
    assert.match(content, /createRequire/,
      'Expected createRequire in handoff-create-prs.md bash blocks');
  });

  it('commands/handoff.md has --create-prs in argument-hint', () => {
    const cmdPath = path.resolve(__dirname, '../../commands/handoff.md');
    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    assert.match(cmdContent, /create-prs/,
      'Expected --create-prs in commands/handoff.md argument-hint');
  });

  it('commands/handoff.md has mcp__github__* in allowed-tools', () => {
    const cmdPath = path.resolve(__dirname, '../../commands/handoff.md');
    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    assert.match(cmdContent, /mcp__github__\*/,
      'Expected mcp__github__* in commands/handoff.md allowed-tools');
  });

  it('commands/handoff.md routes --create-prs to handoff-create-prs.md workflow', () => {
    const cmdPath = path.resolve(__dirname, '../../commands/handoff.md');
    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    assert.match(cmdContent, /handoff-create-prs\.md/,
      'Expected commands/handoff.md to route --create-prs to handoff-create-prs.md');
  });
});
