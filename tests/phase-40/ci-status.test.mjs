/**
 * Gap 4: GH-04 (pipeline-status)
 * Verifies pipeline-status workflow structure:
 * - bridge.call('github:list-workflow-runs') canonical lookup
 * - actions_list / list_workflow_runs reference
 * - --no-mcp flag handling
 * - degraded-mode message
 * - per_page: 5 parameter
 * - display format (event, branch, status, conclusion columns)
 * - node --input-type=module with createRequire pattern
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../workflows/pipeline-status.md');
const content = fs.readFileSync(workflowPath, 'utf-8');

describe('pipeline-status.md workflow structure (Gap 4 — GH-04)', () => {
  it('pipeline-status.md uses bridge.call with github:list-workflow-runs canonical name', () => {
    assert.match(content, /bridge\.call\(['"]github:list-workflow-runs['"]/,
      'Expected bridge.call(\'github:list-workflow-runs\') in pipeline-status.md');
  });

  it('pipeline-status.md references actions_list or list_workflow_runs MCP tool', () => {
    assert.match(content, /actions_list|list_workflow_runs/,
      'Expected actions_list or list_workflow_runs reference in pipeline-status.md');
  });

  it('pipeline-status.md handles --no-mcp flag', () => {
    assert.match(content, /no.mcp/i,
      'Expected --no-mcp flag handling in pipeline-status.md');
  });

  it('pipeline-status.md has degraded-mode message when GitHub is unavailable', () => {
    assert.match(content, /not connected|not configured|unavailable|degraded/i,
      'Expected degraded-mode message in pipeline-status.md');
  });

  it('pipeline-status.md passes per_page: 5 to the workflow run list call', () => {
    assert.match(content, /per_page.*5|5.*per_page/,
      'Expected per_page: 5 parameter in pipeline-status.md');
  });

  it('pipeline-status.md displays event, branch, status, conclusion columns', () => {
    assert.match(content, /event/i, 'Expected event column in pipeline-status.md display');
    assert.match(content, /branch/i, 'Expected branch column in pipeline-status.md display');
    assert.match(content, /status/i, 'Expected status column in pipeline-status.md display');
    assert.match(content, /conclusion/i, 'Expected conclusion column in pipeline-status.md display');
  });

  it('pipeline-status.md uses node --input-type=module with createRequire pattern', () => {
    assert.match(content, /node --input-type=module/,
      'Expected node --input-type=module in pipeline-status.md bash blocks');
    assert.match(content, /createRequire/,
      'Expected createRequire in pipeline-status.md bash blocks');
  });

  it('commands/pipeline-status.md has name: pde:pipeline-status in frontmatter', () => {
    const cmdPath = path.resolve(__dirname, '../../commands/pipeline-status.md');
    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    assert.match(cmdContent, /name:\s*pde:pipeline-status/,
      'Expected name: pde:pipeline-status in commands/pipeline-status.md frontmatter');
  });

  it('commands/pipeline-status.md references pipeline-status.md workflow', () => {
    const cmdPath = path.resolve(__dirname, '../../commands/pipeline-status.md');
    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    assert.match(cmdContent, /pipeline-status\.md/,
      'Expected commands/pipeline-status.md to reference pipeline-status.md workflow');
  });

  it('pipeline-status.md purpose mentions GitHub Actions CI status', () => {
    assert.match(content, /GitHub Actions|CI.*status|status.*CI/i,
      'Expected GitHub Actions CI status in pipeline-status.md purpose');
  });
});
