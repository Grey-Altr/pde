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

  it('exports buildPostMortem and buildAdrSummary', () => {
    expect(typeof renderMod.buildPostMortem).toBe('function');
    expect(typeof renderMod.buildAdrSummary).toBe('function');
  });

  it('exports buildLaunchAnnouncement and buildPortfolioOverview', () => {
    expect(typeof renderMod.buildLaunchAnnouncement).toBe('function');
    expect(typeof renderMod.buildPortfolioOverview).toBe('function');
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

// ─── CLR-05: buildPostMortem ─────────────────────────────────────────────────

describe('buildPostMortem (CLR-05)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildPostMortem(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it('includes expected section IDs', () => {
    const sections = renderMod.buildPostMortem(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('overview');
    expect(ids).toContain('what-broke');
    expect(ids).toContain('root-cause');
    expect(ids).toContain('prevention');
    expect(ids).toContain('timeline');
    expect(ids).toContain('phase-chart');
  });

  it('each section has id, title, level, content', () => {
    const sections = renderMod.buildPostMortem(MOCK_IR);
    for (const s of sections) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(typeof s.level).toBe('number');
      expect(typeof s.content).toBe('string');
    }
  });

  it('what-broke section lists blockers as incidents', () => {
    const sections = renderMod.buildPostMortem(MOCK_IR);
    const wb = sections.find(s => s.id === 'what-broke');
    expect(wb).toBeTruthy();
    // MOCK_IR has a blocker about SVG chart
    expect(wb.content).toContain('SVG chart');
  });

  it('handles unavailable ir.blockers gracefully', () => {
    const ir = { ...MOCK_IR, blockers: { unavailable: true, reason: 'no blocker data' } };
    const sections = renderMod.buildPostMortem(ir);
    const wb = sections.find(s => s.id === 'what-broke');
    expect(wb).toBeTruthy();
    expect(wb.content).not.toThrow;
    expect(typeof wb.content).toBe('string');
  });

  it('handles unavailable ir.decisions gracefully', () => {
    const ir = { ...MOCK_IR, decisions: { unavailable: true, reason: 'no decisions' } };
    const sections = renderMod.buildPostMortem(ir);
    const prevention = sections.find(s => s.id === 'prevention');
    expect(prevention.content).toContain('unavailable');
  });

  it('does not throw when called with full MOCK_IR', () => {
    expect(() => renderMod.buildPostMortem(MOCK_IR)).not.toThrow();
  });

  it('integration: render() accepts post-mortem persona and writes files', () => {
    const htmlPath = path.join(tmpDir, 'post-mortem.html');
    const mdPath = path.join(tmpDir, 'post-mortem.md');
    expect(() => renderMod.render(MOCK_IR, 'post-mortem', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });
});

// ─── CLR-06: buildAdrSummary ─────────────────────────────────────────────────

describe('buildAdrSummary (CLR-06)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildAdrSummary(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it('includes expected section IDs', () => {
    const sections = renderMod.buildAdrSummary(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('overview');
    expect(ids).toContain('decisions');
    expect(ids).toContain('technical');
    expect(ids).toContain('requirements');
    expect(ids).toContain('effort');
  });

  it('each section has id, title, level, content', () => {
    const sections = renderMod.buildAdrSummary(MOCK_IR);
    for (const s of sections) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(typeof s.level).toBe('number');
      expect(typeof s.content).toBe('string');
    }
  });

  it('decisions section formats each decision as ADR entry with status, context, decision fields', () => {
    const sections = renderMod.buildAdrSummary(MOCK_IR);
    const dec = sections.find(s => s.id === 'decisions');
    expect(dec).toBeTruthy();
    // MOCK_IR has 3 decisions
    expect(dec.content).toContain('ADR-001');
    expect(dec.content).toContain('Accepted');
    // One of the decisions contains "Extraction-first"
    expect(dec.content).toContain('Extraction-first');
  });

  it('handles unavailable ir.decisions gracefully', () => {
    const ir = { ...MOCK_IR, decisions: { unavailable: true, reason: 'no decisions data' } };
    const sections = renderMod.buildAdrSummary(ir);
    const dec = sections.find(s => s.id === 'decisions');
    expect(dec).toBeTruthy();
    expect(dec.content).toContain('unavailable');
  });

  it('does not throw when called with full MOCK_IR', () => {
    expect(() => renderMod.buildAdrSummary(MOCK_IR)).not.toThrow();
  });

  it('integration: render() accepts adr-summary persona and writes files', () => {
    const htmlPath = path.join(tmpDir, 'adr-summary.html');
    const mdPath = path.join(tmpDir, 'adr-summary.md');
    expect(() => renderMod.render(MOCK_IR, 'adr-summary', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });
});

// ─── CLR-07: buildLaunchAnnouncement ─────────────────────────────────────────

describe('buildLaunchAnnouncement (CLR-07)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildLaunchAnnouncement(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it('includes expected section IDs: headline, whats-new, who-its-for, how-to-start, metrics', () => {
    const sections = renderMod.buildLaunchAnnouncement(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('headline');
    expect(ids).toContain('whats-new');
    expect(ids).toContain('who-its-for');
    expect(ids).toContain('how-to-start');
    expect(ids).toContain('metrics');
  });

  it('each section has id, title, level, content', () => {
    const sections = renderMod.buildLaunchAnnouncement(MOCK_IR);
    for (const s of sections) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(typeof s.level).toBe('number');
      expect(typeof s.content).toBe('string');
    }
  });

  it('headline section contains project name and milestone', () => {
    const sections = renderMod.buildLaunchAnnouncement(MOCK_IR);
    const headline = sections.find(s => s.id === 'headline');
    expect(headline).toBeTruthy();
    expect(headline.content).toContain('Platform Development Engine');
  });

  it('whats-new section lists completed phases', () => {
    const sections = renderMod.buildLaunchAnnouncement(MOCK_IR);
    const whatsNew = sections.find(s => s.id === 'whats-new');
    expect(whatsNew).toBeTruthy();
    // MOCK_IR has 2 completed phases
    expect(whatsNew.content).toContain('176-data-extraction-ir-foundation');
  });

  it('handles unavailable ir.project gracefully', () => {
    const ir = { ...MOCK_IR, project: { unavailable: true, reason: 'project data not found' } };
    const sections = renderMod.buildLaunchAnnouncement(ir);
    const headline = sections.find(s => s.id === 'headline');
    expect(headline).toBeTruthy();
    expect(headline.content).toContain('unavailable');
  });

  it('handles unavailable ir.phases gracefully', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true, reason: 'STATE.md not found' } };
    const sections = renderMod.buildLaunchAnnouncement(ir);
    const whatsNew = sections.find(s => s.id === 'whats-new');
    expect(whatsNew).toBeTruthy();
    expect(typeof whatsNew.content).toBe('string');
  });

  it('does not throw when called with full MOCK_IR', () => {
    expect(() => renderMod.buildLaunchAnnouncement(MOCK_IR)).not.toThrow();
  });

  it('integration: render() accepts launch-announcement persona and writes files', () => {
    const htmlPath = path.join(tmpDir, 'launch-announcement.html');
    const mdPath = path.join(tmpDir, 'launch-announcement.md');
    expect(() => renderMod.render(MOCK_IR, 'launch-announcement', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });
});

// ─── CLR-08: buildPortfolioOverview ──────────────────────────────────────────

describe('buildPortfolioOverview (CLR-08)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildPortfolioOverview(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it('includes expected section IDs: overview, patterns, skills, outcomes, velocity, effort', () => {
    const sections = renderMod.buildPortfolioOverview(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('overview');
    expect(ids).toContain('patterns');
    expect(ids).toContain('skills');
    expect(ids).toContain('outcomes');
    expect(ids).toContain('velocity');
    expect(ids).toContain('effort');
  });

  it('each section has id, title, level, content', () => {
    const sections = renderMod.buildPortfolioOverview(MOCK_IR);
    for (const s of sections) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(typeof s.level).toBe('number');
      expect(typeof s.content).toBe('string');
    }
  });

  it('patterns section shows phase and requirements statistics', () => {
    const sections = renderMod.buildPortfolioOverview(MOCK_IR);
    const patterns = sections.find(s => s.id === 'patterns');
    expect(patterns).toBeTruthy();
    // MOCK_IR has phases.total=9, phases.completed=2
    expect(patterns.content).toContain('2');
  });

  it('skills section includes requirement categories and decisions', () => {
    const sections = renderMod.buildPortfolioOverview(MOCK_IR);
    const skills = sections.find(s => s.id === 'skills');
    expect(skills).toBeTruthy();
    // MOCK_IR.requirements.categories has 'Rendering' and 'Command'
    expect(skills.content).toContain('Rendering');
  });

  it('handles unavailable ir.phases gracefully', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true, reason: 'no data' } };
    const sections = renderMod.buildPortfolioOverview(ir);
    const patterns = sections.find(s => s.id === 'patterns');
    expect(patterns).toBeTruthy();
    expect(typeof patterns.content).toBe('string');
  });

  it('handles unavailable ir.requirements gracefully', () => {
    const ir = { ...MOCK_IR, requirements: { unavailable: true, reason: 'no data' } };
    const sections = renderMod.buildPortfolioOverview(ir);
    expect(sections.length).toBeGreaterThan(0);
  });

  it('handles unavailable ir.git_velocity gracefully', () => {
    const ir = { ...MOCK_IR, git_velocity: { unavailable: true, reason: 'no data' } };
    const sections = renderMod.buildPortfolioOverview(ir);
    const patterns = sections.find(s => s.id === 'patterns');
    expect(patterns).toBeTruthy();
    expect(typeof patterns.content).toBe('string');
  });

  it('does not throw when called with full MOCK_IR', () => {
    expect(() => renderMod.buildPortfolioOverview(MOCK_IR)).not.toThrow();
  });

  it('integration: render() accepts portfolio-overview persona and writes files', () => {
    const htmlPath = path.join(tmpDir, 'portfolio-overview.html');
    const mdPath = path.join(tmpDir, 'portfolio-overview.md');
    expect(() => renderMod.render(MOCK_IR, 'portfolio-overview', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });
});

// ─── Complete 15-persona suite ────────────────────────────────────────────────

describe('Complete 15-persona suite', () => {
  const ALL_15_SLUGS = [
    'executive-summary',
    'case-study',
    'investor-update',
    'sprint-review',
    'client-deliverable',
    'stakeholder-status',
    'pm-view',
    'project-manager-view',
    'agile-report',
    'design-report',
    'research-report',
    'post-mortem',
    'adr-summary',
    'launch-announcement',
    'portfolio-overview',
  ];

  it('personaDisplayName() returns non-slug display names for all 15 slugs', () => {
    for (const slug of ALL_15_SLUGS) {
      const name = renderMod.personaDisplayName(slug);
      // Display name must not equal the slug (it must be a human-readable name)
      expect(name).not.toBe(slug);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('render() does not throw Unknown persona for any of the 15 slugs', () => {
    for (const slug of ALL_15_SLUGS) {
      const htmlPath = path.join(tmpDir, `suite-${slug}.html`);
      const mdPath = path.join(tmpDir, `suite-${slug}.md`);
      expect(
        () => renderMod.render(MOCK_IR, slug, htmlPath, mdPath),
        `render() threw for slug: ${slug}`
      ).not.toThrow();
    }
  });
});

// ─── Integration: render() accepts Cluster B persona slugs ───────────────────

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
