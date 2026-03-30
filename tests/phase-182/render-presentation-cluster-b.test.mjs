/**
 * tests/phase-182/render-presentation-cluster-b.test.mjs
 * Unit + integration tests for Phase 182 Cluster B persona builders
 *
 * Coverage:
 *   CLR-02  buildAgileReport — agile-report persona         (FULL)
 *   CLR-03  buildDesignReport — design-report persona       (FULL)
 *   CLR-04  buildResearchReport — research-report persona   (FULL)
 *   CLR-05  buildPostMortem — post-mortem persona           (scaffold)
 *   CLR-06  buildAdrSummary — adr-summary persona           (scaffold)
 *   CLR-07  buildLaunchAnnouncement — launch-announcement persona (scaffold)
 *   CLR-08  buildPortfolioOverview — portfolio-overview persona   (scaffold)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);

// ─── Load module under test ───────────────────────────────────────────────────

let renderMod;
try {
  renderMod = require('../../bin/lib/render-presentation.cjs');
} catch (_) {
  renderMod = null;
}

// ─── Fixture IR ───────────────────────────────────────────────────────────────

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
    milestone_name: 'Stakeholder Presentations',
    current_phase_name: 'Phase 182: Remaining Cluster B Personas',
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
    ],
  },
  decisions: {
    items: [
      { text: 'Extraction-first architecture — LLM never reads .planning/ files directly', source: 'STATE.md' },
      { text: 'Two reference personas built end-to-end before shared abstractions', source: 'ROADMAP.md' },
      { text: 'Design tokens hardcoded as hex values in CSS — CSS custom properties unreliable in SVG fill', source: 'DECISIONS.md' },
    ],
  },
  output_dir: '.planning/presentations',
  output_dir_created: true,
  cross_ref_warnings: [],
};

// ─── Temp dir setup ───────────────────────────────────────────────────────────

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-182-test-'));
});

afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});

// ─── Module load guard ────────────────────────────────────────────────────────

describe('render-presentation module (Phase 182)', () => {
  it('loads without error', () => {
    expect(renderMod).not.toBeNull();
  });

  it('exports buildAgileReport, buildDesignReport, buildResearchReport', () => {
    expect(typeof renderMod.buildAgileReport).toBe('function');
    expect(typeof renderMod.buildDesignReport).toBe('function');
    expect(typeof renderMod.buildResearchReport).toBe('function');
  });
});

// ─── CLR-02: buildAgileReport ─────────────────────────────────────────────────

describe('buildAgileReport (CLR-02)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildAgileReport(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it('includes overview, retrospective, burndown, velocity sections', () => {
    const sections = renderMod.buildAgileReport(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('overview');
    expect(ids).toContain('retrospective');
    expect(ids).toContain('burndown');
    expect(ids).toContain('velocity');
  });

  it('each section has id, title, level, content', () => {
    const sections = renderMod.buildAgileReport(MOCK_IR);
    for (const s of sections) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(typeof s.level).toBe('number');
      expect(typeof s.content).toBe('string');
    }
  });

  it('retrospective section lists completed phases and blockers', () => {
    const sections = renderMod.buildAgileReport(MOCK_IR);
    const retro = sections.find(s => s.id === 'retrospective');
    expect(retro).toBeTruthy();
    expect(retro.content).toContain('176-data-extraction-ir-foundation');
  });

  it('handles unavailable phases gracefully', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true, reason: 'STATE.md not found' } };
    const sections = renderMod.buildAgileReport(ir);
    const retro = sections.find(s => s.id === 'retrospective');
    expect(retro.content).toContain('unavailable');
  });

  it('handles unavailable blockers gracefully', () => {
    const ir = { ...MOCK_IR, blockers: { unavailable: true, reason: 'no data' } };
    const sections = renderMod.buildAgileReport(ir);
    expect(sections.length).toBeGreaterThan(0);
  });

  it('does not throw when called with full MOCK_IR', () => {
    expect(() => renderMod.buildAgileReport(MOCK_IR)).not.toThrow();
  });
});

// ─── CLR-03: buildDesignReport ────────────────────────────────────────────────

describe('buildDesignReport (CLR-03)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildDesignReport(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });

  it('includes overview, design-decisions, artifacts sections', () => {
    const sections = renderMod.buildDesignReport(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('overview');
    expect(ids).toContain('design-decisions');
    expect(ids).toContain('artifacts');
  });

  it('each section has id, title, level, content', () => {
    const sections = renderMod.buildDesignReport(MOCK_IR);
    for (const s of sections) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(typeof s.level).toBe('number');
      expect(typeof s.content).toBe('string');
    }
  });

  it('design-decisions section filters design-related decisions', () => {
    const sections = renderMod.buildDesignReport(MOCK_IR);
    const dd = sections.find(s => s.id === 'design-decisions');
    expect(dd).toBeTruthy();
    // MOCK_IR has a decision with "Design tokens" which contains "design"
    expect(dd.content).toContain('Design tokens');
  });

  it('handles unavailable decisions gracefully', () => {
    const ir = { ...MOCK_IR, decisions: { unavailable: true, reason: 'no data' } };
    const sections = renderMod.buildDesignReport(ir);
    const dd = sections.find(s => s.id === 'design-decisions');
    expect(dd.content).toContain('unavailable');
  });

  it('handles unavailable design_artifacts gracefully', () => {
    const ir = { ...MOCK_IR, design_artifacts: { unavailable: true, reason: 'no manifest' } };
    const sections = renderMod.buildDesignReport(ir);
    const artifacts = sections.find(s => s.id === 'artifacts');
    expect(artifacts.content).toContain('unavailable');
  });

  it('does not throw when called with full MOCK_IR', () => {
    expect(() => renderMod.buildDesignReport(MOCK_IR)).not.toThrow();
  });
});

// ─── CLR-04: buildResearchReport ─────────────────────────────────────────────

describe('buildResearchReport (CLR-04)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildResearchReport(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });

  it('includes overview, findings, recommendations sections', () => {
    const sections = renderMod.buildResearchReport(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('overview');
    expect(ids).toContain('findings');
    expect(ids).toContain('recommendations');
  });

  it('each section has id, title, level, content', () => {
    const sections = renderMod.buildResearchReport(MOCK_IR);
    for (const s of sections) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(typeof s.level).toBe('number');
      expect(typeof s.content).toBe('string');
    }
  });

  it('findings section shows research findings', () => {
    const sections = renderMod.buildResearchReport(MOCK_IR);
    const findings = sections.find(s => s.id === 'findings');
    expect(findings).toBeTruthy();
    expect(findings.content).toContain('hallucination');
  });

  it('handles unavailable research gracefully', () => {
    const ir = { ...MOCK_IR, research: { unavailable: true, reason: 'no research data' } };
    const sections = renderMod.buildResearchReport(ir);
    const findings = sections.find(s => s.id === 'findings');
    expect(findings.content).toContain('unavailable');
  });

  it('does not throw when called with full MOCK_IR', () => {
    expect(() => renderMod.buildResearchReport(MOCK_IR)).not.toThrow();
  });
});

// ─── CLR-05: buildPostMortem (scaffold) ──────────────────────────────────────

describe('buildPostMortem (CLR-05)', () => {
  it.skip('returns an array of sections', () => {
    // Will be implemented in 182-02-PLAN.md
    const sections = renderMod.buildPostMortem(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it.skip('includes expected section IDs', () => {
    // Will be implemented in 182-02-PLAN.md
    const sections = renderMod.buildPostMortem(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('overview');
  });
});

// ─── CLR-06: buildAdrSummary (scaffold) ──────────────────────────────────────

describe('buildAdrSummary (CLR-06)', () => {
  it.skip('returns an array of sections', () => {
    // Will be implemented in 182-02-PLAN.md
    const sections = renderMod.buildAdrSummary(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it.skip('includes expected section IDs', () => {
    // Will be implemented in 182-02-PLAN.md
    const sections = renderMod.buildAdrSummary(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('overview');
  });
});

// ─── CLR-07: buildLaunchAnnouncement (scaffold) ───────────────────────────────

describe('buildLaunchAnnouncement (CLR-07)', () => {
  it.skip('returns an array of sections', () => {
    // Will be implemented in 182-03-PLAN.md
    const sections = renderMod.buildLaunchAnnouncement(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it.skip('includes expected section IDs', () => {
    // Will be implemented in 182-03-PLAN.md
    const sections = renderMod.buildLaunchAnnouncement(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('overview');
  });
});

// ─── CLR-08: buildPortfolioOverview (scaffold) ───────────────────────────────

describe('buildPortfolioOverview (CLR-08)', () => {
  it.skip('returns an array of sections', () => {
    // Will be implemented in 182-03-PLAN.md
    const sections = renderMod.buildPortfolioOverview(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it.skip('includes expected section IDs', () => {
    // Will be implemented in 182-03-PLAN.md
    const sections = renderMod.buildPortfolioOverview(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('overview');
  });
});

// ─── Integration: render() accepts 3 Cluster B persona slugs ─────────────────

describe('render() integration — CLR-02, CLR-03, CLR-04', () => {
  it('render() accepts agile-report persona', () => {
    const htmlPath = path.join(tmpDir, 'agile-report.html');
    const mdPath = path.join(tmpDir, 'agile-report.md');
    expect(() => renderMod.render(MOCK_IR, 'agile-report', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });

  it('render() accepts design-report persona', () => {
    const htmlPath = path.join(tmpDir, 'design-report.html');
    const mdPath = path.join(tmpDir, 'design-report.md');
    expect(() => renderMod.render(MOCK_IR, 'design-report', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });

  it('render() accepts research-report persona', () => {
    const htmlPath = path.join(tmpDir, 'research-report.html');
    const mdPath = path.join(tmpDir, 'research-report.md');
    expect(() => renderMod.render(MOCK_IR, 'research-report', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });

  it('render() still accepts executive-summary (no regression)', () => {
    const htmlPath = path.join(tmpDir, 'exec-summary.html');
    const mdPath = path.join(tmpDir, 'exec-summary.md');
    expect(() => renderMod.render(MOCK_IR, 'executive-summary', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
  });

  it('render() still accepts case-study (no regression)', () => {
    const htmlPath = path.join(tmpDir, 'case-study.html');
    const mdPath = path.join(tmpDir, 'case-study.md');
    expect(() => renderMod.render(MOCK_IR, 'case-study', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
  });

  it('render() throws for unknown persona', () => {
    const htmlPath = path.join(tmpDir, 'unknown.html');
    const mdPath = path.join(tmpDir, 'unknown.md');
    expect(() => renderMod.render(MOCK_IR, 'unknown-persona', htmlPath, mdPath)).toThrow();
  });
});
