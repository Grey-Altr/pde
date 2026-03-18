/**
 * Gap 3: GH-01 (sync github)
 * Verifies sync-github workflow structure:
 * - bridge.call('github:list-issues') canonical lookup present
 * - state: "OPEN" (uppercase GraphQL enum)
 * - deduplication check for #<number> in REQUIREMENTS.md
 * - ### GitHub Issues section heading
 * - pagination with after cursor and 200-issue cap
 * - degraded-mode message when GitHub unavailable
 * - --dry-run flag handling
 * - GH-<number> format for entries
 * - node --input-type=module with createRequire pattern in bash blocks
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../workflows/sync-github.md');
const content = fs.readFileSync(workflowPath, 'utf-8');

describe('sync-github.md workflow structure (Gap 3 — GH-01)', () => {
  it('sync-github.md uses bridge.call with github:list-issues canonical name', () => {
    assert.match(content, /bridge\.call\(['"]github:list-issues['"]/,
      'Expected bridge.call(\'github:list-issues\') in sync-github.md');
  });

  it('sync-github.md uses state: "OPEN" (uppercase GraphQL enum)', () => {
    assert.match(content, /state:\s*["']OPEN["']/,
      'Expected state: "OPEN" (uppercase) in sync-github.md');
  });

  it('sync-github.md deduplicates by checking #<issue_number> in REQUIREMENTS.md', () => {
    assert.match(content, /#.*issue|issue.*#.*REQUIREMENTS|dedup|already.*synced/i,
      'Expected deduplication logic checking for #<number> in REQUIREMENTS.md');
  });

  it('sync-github.md appends under ### GitHub Issues section heading', () => {
    assert.match(content, /###\s*GitHub Issues/,
      'Expected ### GitHub Issues section heading in sync-github.md');
  });

  it('sync-github.md handles pagination with after cursor', () => {
    assert.match(content, /after.*cursor|cursor.*after|pagination|hasNextPage/i,
      'Expected pagination handling with after cursor in sync-github.md');
  });

  it('sync-github.md caps issues at 200 (4 pages)', () => {
    assert.match(content, /200|4 page/i,
      'Expected 200-issue cap or 4-page reference in sync-github.md');
  });

  it('sync-github.md has degraded-mode message when GitHub is unavailable', () => {
    assert.match(content, /degraded|not available|not connected|unavailable/i,
      'Expected degraded-mode message in sync-github.md');
  });

  it('sync-github.md handles --dry-run flag', () => {
    assert.match(content, /dry.run/i,
      'Expected --dry-run flag handling in sync-github.md');
  });

  it('sync-github.md formats entries as **GH-<number>**: <title>', () => {
    assert.match(content, /\*\*GH-/,
      'Expected **GH-<number>**: format for issue entries in sync-github.md');
  });

  it('sync-github.md uses node --input-type=module with createRequire pattern', () => {
    assert.match(content, /node --input-type=module/,
      'Expected node --input-type=module in sync-github.md bash blocks');
    assert.match(content, /createRequire/,
      'Expected createRequire in sync-github.md bash blocks');
  });

  it('commands/sync.md routes --github flag to sync-github.md workflow', () => {
    const cmdPath = path.resolve(__dirname, '../../commands/sync.md');
    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    assert.match(cmdContent, /sync-github\.md/,
      'Expected commands/sync.md to reference sync-github.md workflow');
  });

  it('commands/sync.md has name: pde:sync in frontmatter', () => {
    const cmdPath = path.resolve(__dirname, '../../commands/sync.md');
    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    assert.match(cmdContent, /name:\s*pde:sync/,
      'Expected name: pde:sync in commands/sync.md frontmatter');
  });
});
