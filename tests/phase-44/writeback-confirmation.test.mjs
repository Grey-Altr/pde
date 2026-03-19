/**
 * VAL-03 — Write-back confirmation gate structural audit: gate ordering, cancel paths,
 * case-insensitive acceptance for all 4 write-back workflows.
 *
 * Note: sync-pencil.md is intentionally excluded (non-interactive by design).
 * sync-pencil.md pushes design tokens to Pencil canvas from /pde:system non-interactively —
 * reversible, low-risk, enhancement not hard dependency (see STATE.md Phase 43 decisions).
 *
 * CRITICAL: handoff-create-jira-tickets.md has a 5-step workflow (not 4):
 *   - Step 4 = confirmation gate (not Step 3 like GitHub/Linear)
 *   - Step 5 = write (not Step 4 like GitHub/Linear)
 * All test regex patterns are calibrated per-workflow.
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

// Parameterized write-back workflow audit array.
// Source: Verified by codebase inspection (2026-03-19).
// Exact gate text, cancel text, and step numbers confirmed from actual workflow files.
const WRITEBACK_WORKFLOWS = [
  {
    file: 'workflows/handoff-create-prs.md',
    requirement: 'GH-02',
    gateText: 'Create this PR?',
    cancelText: 'No PRs created',
    gateSection: /Step 3.*confirmation gate/is,
    writeSection: /Step 4.*only after user confirm/is,
  },
  {
    file: 'workflows/handoff-create-linear-issues.md',
    requirement: 'LIN-03',
    gateText: 'Create this issue in Linear?',
    cancelText: 'No issues created',
    gateSection: /Step 3.*confirmation gate/is,
    writeSection: /Step 4.*only after user confirm/is,
  },
  {
    file: 'workflows/handoff-create-jira-tickets.md',
    requirement: 'JIRA-03',
    gateText: 'Create this ticket in Jira?',
    cancelText: 'No tickets created',
    // JIRA HAS 5 STEPS: gate at Step 4, write at Step 5
    gateSection: /Step 4.*confirmation gate/is,
    writeSection: /Step 5.*only after user confirm/is,
  },
  {
    file: 'workflows/mockup-export-figma.md',
    requirement: 'FIG-04',
    gateText: 'This will write to your Figma file. Proceed?',
    cancelText: 'Export cancelled',
    gateSection: /Step 3|confirmation gate/is,
    writeSection: /Step 4|only after user confirm/is,
  },
];

// ─── Per-workflow confirmation gate audits ────────────────────────────────────

for (const wf of WRITEBACK_WORKFLOWS) {
  describe(`VAL-03 — ${wf.requirement}: ${path.basename(wf.file)}`, () => {
    let content;

    // Load content once, reuse across all tests in this describe block
    it(`${wf.file} exists`, () => {
      const filePath = resolve(wf.file);
      assert.ok(fs.existsSync(filePath), `Expected ${wf.file} to exist at ${filePath}`);
      content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(content.length > 0, `${wf.file} must not be empty`);
    });

    it('confirmation gate text present', () => {
      if (!content) content = fs.readFileSync(resolve(wf.file), 'utf-8');
      assert.ok(
        content.includes(wf.gateText),
        `Expected "${wf.gateText}" in ${wf.file}`
      );
    });

    it('(y/n) prompt present', () => {
      if (!content) content = fs.readFileSync(resolve(wf.file), 'utf-8');
      assert.match(content, /\(y\/n\)/,
        `${wf.file} must include (y/n) prompt for user confirmation`);
    });

    it('cancel path present', () => {
      if (!content) content = fs.readFileSync(resolve(wf.file), 'utf-8');
      assert.ok(
        content.includes(wf.cancelText),
        `Expected cancel text "${wf.cancelText}" in ${wf.file}`
      );
    });

    it('case-insensitive acceptance documented', () => {
      if (!content) content = fs.readFileSync(resolve(wf.file), 'utf-8');
      assert.match(content, /case-insensitive/i,
        `${wf.file} must document case-insensitive y/yes acceptance`);
    });

    it('gate section precedes write section (gate ordering enforcement)', () => {
      if (!content) content = fs.readFileSync(resolve(wf.file), 'utf-8');
      const gateIdx = content.search(wf.gateSection);
      const writeIdx = content.search(wf.writeSection);
      assert.ok(gateIdx !== -1,
        `gate section pattern ${wf.gateSection} not found in ${wf.file}`);
      assert.ok(writeIdx !== -1,
        `write section pattern ${wf.writeSection} not found in ${wf.file}`);
      assert.ok(
        gateIdx < writeIdx,
        `gate must appear before write step in ${wf.file} — gate at ${gateIdx}, write at ${writeIdx}`
      );
    });
  });
}

// ─── Standalone: Exactly 4 write-back workflows ───────────────────────────────

describe('VAL-03 — Write-back workflow count', () => {
  it('exactly 4 write-back workflows are audited (sync-pencil.md excluded by design)', () => {
    // sync-pencil.md is intentionally excluded: non-interactive token push,
    // no confirmation gate needed (reversible, low-risk, enhancement not hard dependency)
    assert.strictEqual(
      WRITEBACK_WORKFLOWS.length,
      4,
      'VAL-03 must audit exactly 4 write-back workflows — sync-pencil.md is excluded by design'
    );
  });

  it('sync-pencil.md is not in the write-back audit list', () => {
    const hasPencil = WRITEBACK_WORKFLOWS.some(wf => wf.file.includes('sync-pencil'));
    assert.ok(!hasPencil,
      'sync-pencil.md must not be in WRITEBACK_WORKFLOWS — non-interactive, no confirmation gate by design');
  });
});
