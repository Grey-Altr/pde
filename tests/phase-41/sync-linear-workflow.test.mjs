/**
 * LIN-02 — sync-linear.md exists and contains cycle-mapping logic
 *
 * Verifies the sync-linear.md workflow file exists and contains all
 * required structural elements: bridge.call() usage for both list-issues
 * and list-cycles, LIN-<identifier> format, Linear Active Cycle annotation
 * format, degraded mode handling, and dry-run support.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = path.resolve(__dirname, '../../workflows/sync-linear.md');

describe('LIN-02 — sync-linear.md exists and contains cycle-mapping logic', () => {
  let content;

  it('workflows/sync-linear.md exists on disk', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_PATH),
      `Expected workflows/sync-linear.md to exist at ${WORKFLOW_PATH}`
    );
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(content.length > 0, 'workflows/sync-linear.md must not be empty');
  });

  it('sync-linear.md uses bridge.call for linear:list-issues tool lookup', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('linear:list-issues'") ||
                    content.includes('b.call("linear:list-issues"') ||
                    content.includes("bridge.call('linear:list-issues'") ||
                    content.includes('bridge.call("linear:list-issues"');
    assert.ok(hasCall, 'sync-linear.md must use bridge.call() to look up linear:list-issues');
  });

  it('sync-linear.md uses bridge.call for linear:list-cycles tool lookup', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCall = content.includes("b.call('linear:list-cycles'") ||
                    content.includes('b.call("linear:list-cycles"') ||
                    content.includes("bridge.call('linear:list-cycles'") ||
                    content.includes('bridge.call("linear:list-cycles"');
    assert.ok(hasCall, 'sync-linear.md must use bridge.call() to look up linear:list-cycles (LIN-02 cycle mapping)');
  });

  it('sync-linear.md contains ### Linear Issues section heading format', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('### Linear Issues'),
      'sync-linear.md must reference ### Linear Issues section for REQUIREMENTS.md append target'
    );
  });

  it('sync-linear.md contains LIN-<identifier> deduplication key format', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('LIN-'),
      'sync-linear.md must use LIN-<identifier> format for deduplication keys'
    );
  });

  it('sync-linear.md contains Linear Active Cycle HTML comment format for ROADMAP.md annotation', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('<!-- Linear Active Cycle:'),
      'sync-linear.md must produce <!-- Linear Active Cycle: --> HTML comment annotations in ROADMAP.md (LIN-02)'
    );
  });

  it('sync-linear.md contains degraded mode handling when Linear is not connected', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('Linear is not connected'),
      'sync-linear.md must handle degraded mode with "Linear is not connected" message'
    );
  });

  it('sync-linear.md contains --dry-run flag handling', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('--dry-run'),
      'sync-linear.md must support --dry-run flag'
    );
  });

  it('sync-linear.md loads teamId from mcp-connections.json via loadConnections()', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('loadConnections()') || content.includes('b.loadConnections()'),
      'sync-linear.md must call loadConnections() to read teamId from mcp-connections.json'
    );
    assert.ok(
      content.includes('teamId'),
      'sync-linear.md must read teamId from connection data'
    );
  });

  it('sync-linear.md references mcp__linear__list_issues raw tool name', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('mcp__linear__list_issues'),
      'sync-linear.md must reference mcp__linear__list_issues as the resolved toolName'
    );
  });

  it('sync-linear.md references mcp__linear__list_cycles raw tool name', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('mcp__linear__list_cycles'),
      'sync-linear.md must reference mcp__linear__list_cycles as the resolved toolName for LIN-02'
    );
  });

  it('sync-linear.md has at least 80 lines of content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount >= 80,
      `sync-linear.md must have at least 80 lines, got ${lineCount}`
    );
  });
});
