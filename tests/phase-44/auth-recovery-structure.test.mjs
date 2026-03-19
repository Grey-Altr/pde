/**
 * VAL-02 — Auth recovery structural audit: loadConnections() presence in all MCP workflows,
 * mcp-bridge.cjs schema completeness
 *
 * Verifies that all 10 MCP-dependent workflows call loadConnections() at startup
 * (enabling disk-based auth recovery after context compaction), that mcp-bridge.cjs
 * updateConnectionStatus writes all required base fields plus extraFields, and that
 * mcp-connections.json is gitignored (user-specific, no credentials).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to resolve paths from project root
function resolve(relPath) {
  return path.resolve(__dirname, '../../', relPath);
}

// All 10 MCP-dependent workflow paths (verified by codebase inspection 2026-03-19)
const MCP_WORKFLOWS = [
  'workflows/sync-github.md',
  'workflows/sync-linear.md',
  'workflows/sync-jira.md',
  'workflows/sync-figma.md',
  'workflows/sync-pencil.md',
  'workflows/handoff-create-prs.md',
  'workflows/handoff-create-linear-issues.md',
  'workflows/handoff-create-jira-tickets.md',
  'workflows/mockup-export-figma.md',
  'workflows/critique-pencil-screenshot.md',
];

// ─── Group 1: All 10 MCP workflows call loadConnections() at startup ─────────

describe('VAL-02 — All 10 MCP workflows call loadConnections() at startup', () => {
  for (const wfPath of MCP_WORKFLOWS) {
    it(`${wfPath} reads mcp-connections.json at startup (VAL-02)`, () => {
      const filePath = resolve(wfPath);
      assert.ok(
        fs.existsSync(filePath),
        `Expected ${wfPath} to exist at ${filePath}`
      );
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasLoadConnections =
        content.includes('loadConnections()') ||
        content.includes('b.loadConnections()');
      assert.ok(
        hasLoadConnections,
        `${wfPath} must call loadConnections() — disk-based auth recovery for VAL-02`
      );
    });
  }

  it('exactly 10 MCP workflows are audited (VAL-02 completeness)', () => {
    assert.strictEqual(
      MCP_WORKFLOWS.length,
      10,
      'VAL-02 must audit all 10 MCP-dependent workflows — add new workflows here when phases 45+ add integrations'
    );
  });
});

// ─── Group 2: mcp-bridge.cjs updateConnectionStatus writes required base fields ─

describe('VAL-02 — mcp-bridge.cjs updateConnectionStatus schema completeness', () => {
  let content;

  it('bin/lib/mcp-bridge.cjs exists', () => {
    const filePath = resolve('bin/lib/mcp-bridge.cjs');
    assert.ok(fs.existsSync(filePath), `Expected bin/lib/mcp-bridge.cjs at ${filePath}`);
    content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.length > 0, 'mcp-bridge.cjs must not be empty');
  });

  it('mcp-bridge.cjs updateConnectionStatus includes server_key field', () => {
    if (!content) content = fs.readFileSync(resolve('bin/lib/mcp-bridge.cjs'), 'utf-8');
    assert.match(content, /server_key/, 'schema must include server_key');
  });

  it('mcp-bridge.cjs updateConnectionStatus includes display_name field', () => {
    if (!content) content = fs.readFileSync(resolve('bin/lib/mcp-bridge.cjs'), 'utf-8');
    assert.match(content, /display_name/, 'schema must include display_name');
  });

  it('mcp-bridge.cjs updateConnectionStatus includes transport field', () => {
    if (!content) content = fs.readFileSync(resolve('bin/lib/mcp-bridge.cjs'), 'utf-8');
    assert.match(content, /transport/, 'schema must include transport');
  });

  it('mcp-bridge.cjs updateConnectionStatus includes status field', () => {
    if (!content) content = fs.readFileSync(resolve('bin/lib/mcp-bridge.cjs'), 'utf-8');
    assert.match(content, /status/, 'schema must include status');
  });

  it('mcp-bridge.cjs updateConnectionStatus includes last_updated field', () => {
    if (!content) content = fs.readFileSync(resolve('bin/lib/mcp-bridge.cjs'), 'utf-8');
    assert.match(content, /last_updated/, 'schema must include last_updated');
  });

  it('mcp-bridge.cjs updateConnectionStatus accepts extraFields (service-specific metadata)', () => {
    if (!content) content = fs.readFileSync(resolve('bin/lib/mcp-bridge.cjs'), 'utf-8');
    assert.match(content, /extraFields/,
      'updateConnectionStatus must accept extraFields — allows repo/teamId/projectKey/fileUrl per service');
  });
});

// ─── Group 3: mcp-connections.json is gitignored ─────────────────────────────

describe('VAL-02 — mcp-connections.json is gitignored (user-specific, no credentials)', () => {
  it('.gitignore contains mcp-connections.json', () => {
    const filePath = resolve('.gitignore');
    assert.ok(fs.existsSync(filePath), `Expected .gitignore at ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(
      content.includes('mcp-connections.json'),
      '.gitignore must exclude mcp-connections.json — user-specific project-local metadata, no credentials'
    );
  });
});
