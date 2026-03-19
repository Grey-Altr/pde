/**
 * VAL-01 — Concurrency isolation structural audit
 *
 * Verifies that all sync workflows write to distinct non-overlapping sections,
 * sync.md routes each flag to exactly one sub-workflow with no combined
 * multi-flag execution, Pencil dispatches from system.md (not sync.md),
 * and sync-linear.md ROADMAP.md writes use a section-additive HTML comment pattern.
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

// ─── Group 1: Command routing isolation (sync.md) ────────────────────────────

describe('VAL-01 — Command routing isolation (sync.md)', () => {
  let content;

  it('sync.md exists', () => {
    const filePath = resolve('commands/sync.md');
    assert.ok(fs.existsSync(filePath), `Expected commands/sync.md at ${filePath}`);
    content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.length > 0, 'commands/sync.md must not be empty');
  });

  it('sync.md routes --github to sync-github.md (VAL-01)', () => {
    if (!content) content = fs.readFileSync(resolve('commands/sync.md'), 'utf-8');
    assert.match(content, /--github.*follow.*@workflows\/sync-github\.md/s,
      'sync.md must route --github to sync-github.md via follow @workflows/sync-github.md');
  });

  it('sync.md routes --linear to sync-linear.md (VAL-01)', () => {
    if (!content) content = fs.readFileSync(resolve('commands/sync.md'), 'utf-8');
    assert.match(content, /--linear.*follow.*@workflows\/sync-linear\.md/s,
      'sync.md must route --linear to sync-linear.md via follow @workflows/sync-linear.md');
  });

  it('sync.md routes --jira to sync-jira.md (VAL-01)', () => {
    if (!content) content = fs.readFileSync(resolve('commands/sync.md'), 'utf-8');
    assert.match(content, /--jira.*follow.*@workflows\/sync-jira\.md/s,
      'sync.md must route --jira to sync-jira.md via follow @workflows/sync-jira.md');
  });

  it('sync.md routes --figma to sync-figma.md (VAL-01)', () => {
    if (!content) content = fs.readFileSync(resolve('commands/sync.md'), 'utf-8');
    assert.match(content, /--figma.*follow.*@workflows\/sync-figma\.md/s,
      'sync.md must route --figma to sync-figma.md via follow @workflows/sync-figma.md');
  });

  it('sync.md does NOT contain --pencil flag (Pencil dispatched from system.md)', () => {
    if (!content) content = fs.readFileSync(resolve('commands/sync.md'), 'utf-8');
    assert.doesNotMatch(content, /--pencil/,
      'sync.md must not have a --pencil flag — Pencil is dispatched from system.md');
  });

  it('sync.md does NOT combine multiple sync workflows in a single execution path', () => {
    if (!content) content = fs.readFileSync(resolve('commands/sync.md'), 'utf-8');
    assert.doesNotMatch(content, /sync-github.*AND.*sync-linear/is,
      'sync.md must not combine multiple sync workflows — each flag routes independently');
  });
});

// ─── Group 2: Pencil dispatch from system.md ─────────────────────────────────

describe('VAL-01 — Pencil dispatch location (system.md, not sync.md)', () => {
  it('commands/system.md exists and contains mcp__pencil__* in allowed-tools (VAL-01)', () => {
    const filePath = resolve('commands/system.md');
    assert.ok(fs.existsSync(filePath), `Expected commands/system.md at ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.match(content, /mcp__pencil__\*/,
      'system.md must include mcp__pencil__* in allowed-tools — Pencil is dispatched here, not from sync.md');
  });
});

// ─── Group 3: REQUIREMENTS.md section isolation ───────────────────────────────

describe('VAL-01 — REQUIREMENTS.md section isolation (named sections prevent cross-service conflicts)', () => {
  const ISOLATION_ASSERTIONS = [
    { file: 'workflows/sync-github.md', section: '### GitHub Issues' },
    { file: 'workflows/sync-linear.md', section: '### Linear Issues' },
    { file: 'workflows/sync-jira.md',   section: '### Jira Issues' },
  ];

  for (const { file, section } of ISOLATION_ASSERTIONS) {
    it(`${file} scopes writes to "${section}" section`, () => {
      const content = fs.readFileSync(resolve(file), 'utf-8');
      assert.ok(content.includes(section),
        `${file} must target "${section}" section — prevents cross-service REQUIREMENTS.md write conflicts`);
    });
  }
});

// ─── Group 4: Figma writes to tokens.json, not REQUIREMENTS.md ──────────────

describe('VAL-01 — Figma write target isolation (assets/tokens.json, not REQUIREMENTS.md)', () => {
  let content;

  it('sync-figma.md references assets/tokens.json as write target', () => {
    content = fs.readFileSync(resolve('workflows/sync-figma.md'), 'utf-8');
    assert.match(content, /assets\/tokens\.json/,
      'sync-figma.md must target assets/tokens.json, not REQUIREMENTS.md');
  });

  it('sync-figma.md does NOT write to REQUIREMENTS.md', () => {
    if (!content) content = fs.readFileSync(resolve('workflows/sync-figma.md'), 'utf-8');
    assert.doesNotMatch(content, /writeFileSync.*REQUIREMENTS|write.*REQUIREMENTS\.md/,
      'sync-figma.md must not write to REQUIREMENTS.md — it writes to assets/tokens.json only');
  });
});

// ─── Group 5: Pencil writes to external canvas, not .planning/ ───────────────

describe('VAL-01 — Pencil write target isolation (external canvas, not .planning/ filesystem)', () => {
  let content;

  it('sync-pencil.md uses pencil:set-variables to write to Pencil canvas', () => {
    content = fs.readFileSync(resolve('workflows/sync-pencil.md'), 'utf-8');
    assert.ok(content.includes('pencil:set-variables'),
      'sync-pencil.md must use pencil:set-variables — writes to external Pencil canvas');
  });

  it('sync-pencil.md does NOT write to .planning/ filesystem', () => {
    if (!content) content = fs.readFileSync(resolve('workflows/sync-pencil.md'), 'utf-8');
    assert.doesNotMatch(content, /writeFileSync.*\.planning/,
      'sync-pencil.md must not write to .planning/ — all writes go to Pencil canvas via MCP');
  });
});

// ─── Group 6: ROADMAP.md write isolation for Linear LIN-02 ──────────────────

describe('VAL-01 — Linear ROADMAP.md write isolation (HTML comment, section-additive)', () => {
  let content;

  it('sync-linear.md uses HTML comment pattern for ROADMAP.md cycle annotation (section-additive)', () => {
    content = fs.readFileSync(resolve('workflows/sync-linear.md'), 'utf-8');
    assert.match(content, /<!-- Linear.*Cycle/i,
      'sync-linear.md must use HTML comment pattern for ROADMAP.md cycle annotation — additive, not full rewrite');
  });

  it('sync-linear.md references ROADMAP.md for LIN-02 cycle annotation', () => {
    if (!content) content = fs.readFileSync(resolve('workflows/sync-linear.md'), 'utf-8');
    assert.match(content, /ROADMAP\.md/,
      'sync-linear.md must reference ROADMAP.md for LIN-02 cycle annotation');
  });
});
