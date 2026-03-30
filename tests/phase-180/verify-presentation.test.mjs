/**
 * tests/phase-180/verify-presentation.test.mjs
 * Unit + integration tests for bin/lib/verify-presentation.cjs
 *
 * Coverage:
 *   VER-01  buildClaimsMap extracts numeric IR fields (skips unavailable/null)
 *   VER-02  verifyPresentation detects mismatches in rendered section content
 *   VER-03  buildVerificationFooterHtml returns pass/fail HTML with correct classes
 *   INT-01  render() integration — verification section appears in both HTML and Markdown
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);

// ─── Load modules under test ──────────────────────────────────────────────────

let verifyMod;
try {
  verifyMod = require('../../bin/lib/verify-presentation.cjs');
} catch (_) {
  verifyMod = null;
}

let renderMod;
try {
  renderMod = require('../../bin/lib/render-presentation.cjs');
} catch (_) {
  renderMod = null;
}

// ─── Fixture IR ───────────────────────────────────────────────────────────────

/**
 * A realistic mock IR matching the schema from buildPresentationIR().
 * Mirrors the MOCK_IR from phase-178 tests.
 */
const MOCK_IR = {
  schema_version: '1.0',
  extracted_at: '2026-03-30T01:00:00.000Z',
  source_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  project: {
    name: 'Platform Development Engine',
    goal: 'A full professional product design and development platform delivered as a Claude Code plugin.',
    core_value: 'Any user can go from idea to shipped product through a single platform.',
    summary: 'PDE is an all-in-one AI-assisted platform for the full development lifecycle.',
    product_type: 'software',
    target_users: 'Developers and product managers',
  },
  phases: {
    total: 9,
    completed: 2,
    completion_pct: 22,
    phase_list: [
      { name: '176-data-extraction-ir-foundation', completed: true },
      { name: '177-command-interface-+-workflow-shell', completed: true },
      { name: '178-reference-personas-+-rendering-engine', completed: false },
    ],
  },
  requirements: {
    total: 58,
    completed: 12,
    blocked: 2,
    categories: [
      { name: 'Rendering', total: 7, completed: 3 },
      { name: 'Command', total: 5, completed: 4 },
    ],
  },
  design_artifacts: {
    unavailable: true,
    reason: 'design-manifest.json not found or hasDesignSystem is false',
  },
  git_velocity: {
    total_commits: 42,
    commits_per_phase: 3.5,
    recent_activity: '2026-03-30',
  },
  cost_timing: {
    total_duration_min: 180,
    phases_with_timing: 6,
    avg_duration_min: 30,
  },
  blockers: {
    items: [
      { text: 'SVG chart implementation pending Phase 179', source: 'STATE.md' },
    ],
  },
  risks: {
    items: [
      { text: 'Portfolio synthesis complexity with schema heterogeneity', source: 'ROADMAP.md' },
    ],
  },
  verification: {
    phases_verified: 2,
    total_phases: 2,
    pct: 100,
  },
  research: {
    findings: [
      'Extraction-first prevents 28-39% hallucination rate',
      'Zero npm dependencies required throughout',
    ],
  },
  decisions: {
    items: [
      { text: 'Extraction-first architecture — LLM never reads .planning/ files directly', source: 'STATE.md' },
      { text: 'Two reference personas built end-to-end before shared abstractions', source: 'ROADMAP.md' },
      { text: 'Case study uses problem-approach-outcome-lessons structure', source: 'ROADMAP.md' },
    ],
  },
  output_dir: '.planning/presentations',
  output_dir_created: true,
  cross_ref_warnings: [],
};

// ─── Temp dir setup ───────────────────────────────────────────────────────────

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-180-test-'));
});

afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});

// ─── Module load guard ────────────────────────────────────────────────────────

describe('verify-presentation module', () => {
  it('loads without error', () => {
    expect(verifyMod).not.toBeNull();
  });

  it('exports buildClaimsMap, verifyPresentation, buildVerificationFooterHtml', () => {
    expect(typeof verifyMod.buildClaimsMap).toBe('function');
    expect(typeof verifyMod.verifyPresentation).toBe('function');
    expect(typeof verifyMod.buildVerificationFooterHtml).toBe('function');
  });
});

// ─── stripHtml export guard ───────────────────────────────────────────────────

describe('render-presentation stripHtml export', () => {
  it('exports stripHtml', () => {
    expect(renderMod).not.toBeNull();
    expect(typeof renderMod.stripHtml).toBe('function');
  });

  it('stripHtml removes HTML tags and decodes entities', () => {
    const result = renderMod.stripHtml('<p><strong>42</strong> commits &amp; counting</p>');
    expect(result).toContain('42');
    expect(result).toContain('commits & counting');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});

// ─── buildClaimsMap ───────────────────────────────────────────────────────────

describe('buildClaimsMap', () => {
  it('returns an array', () => {
    const claims = verifyMod.buildClaimsMap(MOCK_IR);
    expect(Array.isArray(claims)).toBe(true);
  });

  it('includes phases.total claim', () => {
    const claims = verifyMod.buildClaimsMap(MOCK_IR);
    const claim = claims.find(c => c.label === 'phases.total');
    expect(claim).toBeDefined();
    expect(claim.value).toBe(9);
  });

  it('includes phases.completed claim', () => {
    const claims = verifyMod.buildClaimsMap(MOCK_IR);
    const claim = claims.find(c => c.label === 'phases.completed');
    expect(claim).toBeDefined();
    expect(claim.value).toBe(2);
  });

  it('includes phases.completion_pct as Math.round((completed/total)*100)', () => {
    const claims = verifyMod.buildClaimsMap(MOCK_IR);
    const claim = claims.find(c => c.label === 'phases.completion_pct');
    expect(claim).toBeDefined();
    // Math.round((2/9)*100) = 22
    expect(claim.value).toBe(Math.round((2 / 9) * 100));
  });

  it('uses Math.round for percentage when completed/total differ from stored pct', () => {
    const modIR = { ...MOCK_IR, phases: { ...MOCK_IR.phases, completion_pct: 99 } };
    const claims = verifyMod.buildClaimsMap(modIR);
    const claim = claims.find(c => c.label === 'phases.completion_pct');
    expect(claim).toBeDefined();
    // Should use Math.round((2/9)*100) = 22, NOT the stored 99
    expect(claim.value).toBe(Math.round((2 / 9) * 100));
  });

  it('includes requirements.total, requirements.completed, requirements.blocked', () => {
    const claims = verifyMod.buildClaimsMap(MOCK_IR);
    const reqTotal = claims.find(c => c.label === 'requirements.total');
    const reqCompleted = claims.find(c => c.label === 'requirements.completed');
    const reqBlocked = claims.find(c => c.label === 'requirements.blocked');
    expect(reqTotal).toBeDefined();
    expect(reqTotal.value).toBe(58);
    expect(reqCompleted).toBeDefined();
    expect(reqCompleted.value).toBe(12);
    expect(reqBlocked).toBeDefined();
    expect(reqBlocked.value).toBe(2);
  });

  it('includes git_velocity.total_commits', () => {
    const claims = verifyMod.buildClaimsMap(MOCK_IR);
    const claim = claims.find(c => c.label === 'git_velocity.total_commits');
    expect(claim).toBeDefined();
    expect(claim.value).toBe(42);
  });

  it('includes cost_timing.total_duration_min', () => {
    const claims = verifyMod.buildClaimsMap(MOCK_IR);
    const claim = claims.find(c => c.label === 'cost_timing.total_duration_min');
    expect(claim).toBeDefined();
    expect(claim.value).toBe(180);
  });

  it('skips phases section when unavailable', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true } };
    const claims = verifyMod.buildClaimsMap(ir);
    const phasesClaims = claims.filter(c => c.label.startsWith('phases.'));
    expect(phasesClaims).toHaveLength(0);
  });

  it('skips git_velocity section when unavailable', () => {
    const ir = { ...MOCK_IR, git_velocity: { unavailable: true } };
    const claims = verifyMod.buildClaimsMap(ir);
    const velClaims = claims.filter(c => c.label.startsWith('git_velocity.'));
    expect(velClaims).toHaveLength(0);
  });

  it('skips null/undefined values', () => {
    const ir = {
      ...MOCK_IR,
      phases: { total: null, completed: undefined, completion_pct: 0 },
    };
    const claims = verifyMod.buildClaimsMap(ir);
    const phasesTotal = claims.find(c => c.label === 'phases.total');
    const phasesCompleted = claims.find(c => c.label === 'phases.completed');
    // null and undefined should be skipped
    expect(phasesTotal).toBeUndefined();
    expect(phasesCompleted).toBeUndefined();
  });

  it('skips claims with value 0', () => {
    const ir = { ...MOCK_IR, requirements: { ...MOCK_IR.requirements, blocked: 0 } };
    const claims = verifyMod.buildClaimsMap(ir);
    const blocked = claims.find(c => c.label === 'requirements.blocked');
    expect(blocked).toBeUndefined();
  });
});

// ─── verifyPresentation ───────────────────────────────────────────────────────

describe('verifyPresentation', () => {
  it('returns result object with expected shape', () => {
    const sections = [
      { id: 'progress', title: 'Progress', level: 2, content: '<p>2 of 9 phases done (22%)</p>' },
    ];
    const result = verifyMod.verifyPresentation(MOCK_IR, sections);
    expect(typeof result).toBe('object');
    expect(typeof result.claimsChecked).toBe('number');
    expect(Array.isArray(result.mismatches)).toBe(true);
    expect(typeof result.pass).toBe('boolean');
    expect(typeof result.checkedAt).toBe('string');
  });

  it('returns pass: true when section content contains all IR numeric values', () => {
    // Build sections with content matching MOCK_IR values
    const sections = [
      {
        id: 'progress',
        title: 'Progress',
        level: 2,
        content: '<p><strong>Completion:</strong> 22% (2 of 9 phases done)</p>',
      },
      {
        id: 'requirements',
        title: 'Requirements',
        level: 2,
        content: '<p>12 of 58 requirements complete (21%) · 2 blocked</p>',
      },
      {
        id: 'timeline',
        title: 'Timeline',
        level: 2,
        content: '<p><strong>Commits:</strong> 42 total · 3.5 avg/phase</p><p>Total duration: 180 min across 6 phases</p>',
      },
    ];
    const result = verifyMod.verifyPresentation(MOCK_IR, sections);
    // With matching values, should pass
    expect(result.pass).toBe(true);
    expect(result.mismatches).toHaveLength(0);
  });

  it('returns pass: false with mismatch entry when section shows wrong number', () => {
    // Section says "10 phases" but IR has 9
    const sections = [
      {
        id: 'progress',
        title: 'Progress',
        level: 2,
        content: '<p><strong>Completion:</strong> 22% (2 of 10 phases done)</p>',
      },
    ];
    const result = verifyMod.verifyPresentation(MOCK_IR, sections);
    expect(result.pass).toBe(false);
    const mismatch = result.mismatches.find(m => m.label === 'phases.total');
    expect(mismatch).toBeDefined();
    expect(mismatch.irValue).toBe(9);
  });

  it('does not flag CSS numerics or HTML tag attributes', () => {
    // Section content has HTML tags with numbers and CSS-like values
    const sections = [
      {
        id: 'style',
        title: 'Styled',
        level: 2,
        content: '<div style="width: 9px; padding: 42px"><p><strong>Completion:</strong> 22% (2 of 9 phases done)</p></div>',
      },
      {
        id: 'requirements',
        title: 'Requirements',
        level: 2,
        content: '<p>12 of 58 requirements complete (21%) · 2 blocked</p>',
      },
      {
        id: 'timeline',
        title: 'Timeline',
        level: 2,
        content: '<p>42 total commits · 180 min duration</p>',
      },
    ];
    // All IR values should be found in stripped content — pass should be true
    const result = verifyMod.verifyPresentation(MOCK_IR, sections);
    // IR values ARE present in the text, so should pass
    expect(result.pass).toBe(true);
  });

  it('only scans section .content fields, not .title or .id', () => {
    // Title and id contain IR values, but content does not
    const sections = [
      {
        id: '9',         // id = '9' (phases.total)
        title: '9 Phases',  // title contains 9
        level: 2,
        content: '<p>No numeric data here</p>',
      },
    ];
    const result = verifyMod.verifyPresentation(MOCK_IR, sections);
    // phases.total = 9 is NOT in content, so should be a mismatch
    const mismatch = result.mismatches.find(m => m.label === 'phases.total');
    expect(mismatch).toBeDefined();
  });

  it('never throws even when mismatches exist', () => {
    const sections = [
      { id: 'empty', title: 'Empty', level: 2, content: '<p>nothing relevant</p>' },
    ];
    expect(() => verifyMod.verifyPresentation(MOCK_IR, sections)).not.toThrow();
    const result = verifyMod.verifyPresentation(MOCK_IR, sections);
    expect(result).toBeDefined();
    expect(typeof result.pass).toBe('boolean');
  });

  it('handles empty sections array gracefully', () => {
    const result = verifyMod.verifyPresentation(MOCK_IR, []);
    expect(result).toBeDefined();
    expect(result.pass).toBe(false); // no content to find values in
    expect(result.claimsChecked).toBeGreaterThan(0);
  });

  it('checkedAt is a valid ISO timestamp', () => {
    const result = verifyMod.verifyPresentation(MOCK_IR, []);
    expect(() => new Date(result.checkedAt)).not.toThrow();
    expect(new Date(result.checkedAt).toISOString()).toBe(result.checkedAt);
  });
});

// ─── buildVerificationFooterHtml ─────────────────────────────────────────────

describe('buildVerificationFooterHtml', () => {
  it('returns HTML string', () => {
    const result = verifyMod.buildVerificationFooterHtml({
      claimsChecked: 5,
      mismatches: [],
      pass: true,
      checkedAt: '2026-03-30T02:00:00.000Z',
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns HTML with class="verification-status pass" for passing result', () => {
    const result = verifyMod.buildVerificationFooterHtml({
      claimsChecked: 5,
      mismatches: [],
      pass: true,
      checkedAt: '2026-03-30T02:00:00.000Z',
    });
    expect(result).toContain('verification-status pass');
    expect(result).toContain('5');
    expect(result).toContain('PASS');
  });

  it('returns HTML with class="verification-status fail" for failing result', () => {
    const result = verifyMod.buildVerificationFooterHtml({
      claimsChecked: 5,
      mismatches: [{ label: 'phases.total', irValue: 9, foundInSection: false }],
      pass: false,
      checkedAt: '2026-03-30T02:00:00.000Z',
    });
    expect(result).toContain('verification-status fail');
    expect(result).toContain('FAIL');
  });

  it('lists each mismatch in a <ul> when mismatches exist', () => {
    const result = verifyMod.buildVerificationFooterHtml({
      claimsChecked: 3,
      mismatches: [
        { label: 'phases.total', irValue: 9, foundInSection: false },
        { label: 'git_velocity.total_commits', irValue: 42, foundInSection: false },
      ],
      pass: false,
      checkedAt: '2026-03-30T02:00:00.000Z',
    });
    expect(result).toContain('<ul>');
    expect(result).toContain('phases.total');
    expect(result).toContain('git_velocity.total_commits');
  });

  it('includes verification-meta class for timestamp paragraph', () => {
    const result = verifyMod.buildVerificationFooterHtml({
      claimsChecked: 5,
      mismatches: [],
      pass: true,
      checkedAt: '2026-03-30T02:00:00.000Z',
    });
    expect(result).toContain('verification-meta');
    expect(result).toContain('2026-03-30T02:00:00.000Z');
  });

  it('does not include <ul> when no mismatches', () => {
    const result = verifyMod.buildVerificationFooterHtml({
      claimsChecked: 5,
      mismatches: [],
      pass: true,
      checkedAt: '2026-03-30T02:00:00.000Z',
    });
    expect(result).not.toContain('<ul>');
  });
});

// ─── Integration: render() includes verification section ─────────────────────

describe('render() integration', () => {
  it('render() does not throw', () => {
    if (!renderMod) return;
    const htmlPath = path.join(tmpDir, 'test-exec.html');
    const mdPath = path.join(tmpDir, 'test-exec.md');
    expect(() => renderMod.render(MOCK_IR, 'executive-summary', htmlPath, mdPath)).not.toThrow();
  });

  it('render() produces HTML containing verification-status', () => {
    if (!renderMod) return;
    const htmlPath = path.join(tmpDir, 'test-ver-exec.html');
    const mdPath = path.join(tmpDir, 'test-ver-exec.md');
    renderMod.render(MOCK_IR, 'executive-summary', htmlPath, mdPath);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('verification-status');
  });

  it('render() HTML contains section id="verification"', () => {
    if (!renderMod) return;
    const htmlPath = path.join(tmpDir, 'test-ver-id.html');
    const mdPath = path.join(tmpDir, 'test-ver-id.md');
    renderMod.render(MOCK_IR, 'executive-summary', htmlPath, mdPath);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('id="verification"');
  });

  it('render() Markdown contains Verification heading', () => {
    if (!renderMod) return;
    const htmlPath = path.join(tmpDir, 'test-ver-md.html');
    const mdPath = path.join(tmpDir, 'test-ver-md.md');
    renderMod.render(MOCK_IR, 'executive-summary', htmlPath, mdPath);
    const md = fs.readFileSync(mdPath, 'utf-8');
    expect(md).toMatch(/#+\s+Verification/i);
  });

  it('render() does not throw even when verification mismatches exist', () => {
    if (!renderMod) return;
    // Use an IR with impossible numbers that will definitely mismatch
    const badIr = {
      ...MOCK_IR,
      phases: { ...MOCK_IR.phases, total: 99999 },
    };
    const htmlPath = path.join(tmpDir, 'test-ver-mismatch.html');
    const mdPath = path.join(tmpDir, 'test-ver-mismatch.md');
    expect(() => renderMod.render(badIr, 'executive-summary', htmlPath, mdPath)).not.toThrow();
  });
});
