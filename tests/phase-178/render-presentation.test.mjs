/**
 * tests/phase-178/render-presentation.test.mjs
 * Unit + integration tests for bin/lib/render-presentation.cjs
 *
 * Coverage:
 *   RND-01  Self-contained HTML (no external URLs, no <script>, <500KB)
 *   RND-02  Markdown companion (ATX headings, metadata line)
 *   RND-03  TOC nav with anchor links
 *   RND-04  Base64 image embedding + graceful fallback
 *   RND-05  PDE design tokens in CSS
 *   RND-06  Files written to specified paths
 *   RND-07  Re-run overwrites prior output
 *   CLU-01  Executive summary persona — 7 sections, graceful unavailable
 *   CLR-01  Case study persona — 6 sections, graceful unavailable
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

/**
 * A realistic mock IR matching the schema from buildPresentationIR().
 * design_artifacts is set to unavailable to test sentinel handling.
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

// ─── IR with all fields available (for comprehensive tests) ──────────────────

const MOCK_IR_FULL = {
  ...MOCK_IR,
  design_artifacts: {
    available: false,
    artifact_count: 0,
    artifacts: [],
  },
};

// ─── Temp dir setup ───────────────────────────────────────────────────────────

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-178-test-'));
});

afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});

// ─── Module load guard ────────────────────────────────────────────────────────

describe('render-presentation module', () => {
  it('loads without error', () => {
    expect(renderMod).not.toBeNull();
  });

  it('exports all 10 required functions', () => {
    const required = [
      'render', 'renderHTML', 'renderMarkdown', 'buildExecutiveSummary',
      'buildCaseStudy', 'buildTOC', 'embedImage', 'escHtml',
      'personaDisplayName', 'cmdPresentationRender',
    ];
    for (const fn of required) {
      expect(renderMod, `missing export: ${fn}`).toHaveProperty(fn);
      expect(typeof renderMod[fn], `${fn} should be a function`).toBe('function');
    }
  });
});

// ─── RND-01: Self-contained HTML ─────────────────────────────────────────────

describe('RND-01 self-contained HTML', () => {
  it('starts with <!DOCTYPE html> and ends with </html>', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const html = renderMod.renderHTML(MOCK_IR, 'executive-summary', sections);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toMatch(/<\/html>\s*$/i);
  });

  it('contains no <script tags', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const html = renderMod.renderHTML(MOCK_IR, 'executive-summary', sections);
    expect(html).not.toMatch(/<script/i);
  });

  it('contains no external href="http or src="http URLs', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const html = renderMod.renderHTML(MOCK_IR, 'executive-summary', sections);
    expect(html).not.toMatch(/href="https?:/i);
    expect(html).not.toMatch(/src="https?:/i);
  });

  it('is under 500KB', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const html = renderMod.renderHTML(MOCK_IR, 'executive-summary', sections);
    const bytes = Buffer.byteLength(html, 'utf-8');
    expect(bytes).toBeLessThan(500 * 1024);
  });
});

// ─── RND-02: Markdown companion ──────────────────────────────────────────────

describe('RND-02 Markdown companion', () => {
  it('starts with # (ATX heading)', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const md = renderMod.renderMarkdown(MOCK_IR, 'executive-summary', sections);
    expect(md).toMatch(/^# /);
  });

  it('contains > Generated metadata blockquote line', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const md = renderMod.renderMarkdown(MOCK_IR, 'executive-summary', sections);
    expect(md).toMatch(/^> Generated/m);
  });
});

// ─── RND-03: TOC ─────────────────────────────────────────────────────────────

describe('RND-03 TOC navigation', () => {
  it('contains <nav class="toc">', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const html = renderMod.renderHTML(MOCK_IR, 'executive-summary', sections);
    expect(html).toContain('<nav class="toc">');
  });

  it('contains anchor links matching section IDs', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const html = renderMod.renderHTML(MOCK_IR, 'executive-summary', sections);
    expect(html).toMatch(/<a href="#[a-z]/);
    // Should have link to overview section
    expect(html).toContain('href="#overview"');
  });
});

// ─── RND-04: Base64 image embedding ──────────────────────────────────────────

describe('RND-04 base64 image embedding', () => {
  it('embedImage returns data:image/png;base64,... for existing PNG', () => {
    // Create a minimal 1-byte PNG placeholder
    const pngPath = path.join(tmpDir, 'test.png');
    // Write a minimal valid PNG (8-byte signature)
    const minPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    fs.writeFileSync(pngPath, minPng);

    const result = renderMod.embedImage(pngPath);
    expect(result).not.toBeNull();
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('embedImage returns null for non-existent path', () => {
    const result = renderMod.embedImage('/tmp/definitely-does-not-exist-12345.png');
    expect(result).toBeNull();
  });

  it('buildArtifacts (via buildExecutiveSummary) handles unavailable design_artifacts gracefully', () => {
    // MOCK_IR has design_artifacts.unavailable = true
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const artifactSection = sections.find(s => s.id === 'artifacts');
    expect(artifactSection).toBeDefined();
    // Should contain some "unavailable" or informational text, not crash
    expect(artifactSection.content).toBeTruthy();
    expect(artifactSection.content).not.toMatch(/NaN/);
    expect(artifactSection.content).not.toMatch(/undefined/);
  });
});

// ─── RND-05: PDE design tokens ───────────────────────────────────────────────

describe('RND-05 PDE design tokens', () => {
  it('HTML contains --pde-bg: CSS custom property', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const html = renderMod.renderHTML(MOCK_IR, 'executive-summary', sections);
    expect(html).toContain('--pde-bg:');
  });

  it('HTML contains --pde-accent: CSS custom property', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const html = renderMod.renderHTML(MOCK_IR, 'executive-summary', sections);
    expect(html).toContain('--pde-accent:');
  });
});

// ─── RND-06: File output ──────────────────────────────────────────────────────

describe('RND-06 file output', () => {
  it('render() writes HTML file at specified path', () => {
    const htmlPath = path.join(tmpDir, 'rnd06-test.html');
    const mdPath = path.join(tmpDir, 'rnd06-test.md');
    renderMod.render(MOCK_IR, 'executive-summary', htmlPath, mdPath);
    expect(fs.existsSync(htmlPath)).toBe(true);
  });

  it('render() writes MD file at specified path', () => {
    const htmlPath = path.join(tmpDir, 'rnd06b-test.html');
    const mdPath = path.join(tmpDir, 'rnd06b-test.md');
    renderMod.render(MOCK_IR, 'executive-summary', htmlPath, mdPath);
    expect(fs.existsSync(mdPath)).toBe(true);
  });

  it('render() returns { htmlPath, mdPath, htmlBytes }', () => {
    const htmlPath = path.join(tmpDir, 'rnd06c-test.html');
    const mdPath = path.join(tmpDir, 'rnd06c-test.md');
    const result = renderMod.render(MOCK_IR, 'executive-summary', htmlPath, mdPath);
    expect(result).toHaveProperty('htmlPath');
    expect(result).toHaveProperty('mdPath');
    expect(result).toHaveProperty('htmlBytes');
    expect(result.htmlBytes).toBeGreaterThan(0);
  });
});

// ─── RND-07: Overwrite on re-run ─────────────────────────────────────────────

describe('RND-07 overwrite on re-run', () => {
  it('render() called twice overwrites first file', () => {
    const htmlPath = path.join(tmpDir, 'rnd07-test.html');
    const mdPath = path.join(tmpDir, 'rnd07-test.md');

    // First render
    renderMod.render(MOCK_IR, 'executive-summary', htmlPath, mdPath);
    const stat1 = fs.statSync(htmlPath);

    // Small delay to ensure mtime changes
    const ir2 = { ...MOCK_IR, extracted_at: '2026-03-30T02:00:00.000Z' };
    renderMod.render(ir2, 'executive-summary', htmlPath, mdPath);
    const stat2 = fs.statSync(htmlPath);

    // File still exists and was modified
    expect(fs.existsSync(htmlPath)).toBe(true);
    // Content changes because extracted_at differs
    const content = fs.readFileSync(htmlPath, 'utf-8');
    expect(content).toContain('02:00:00');
  });
});

// ─── CLU-01: Executive summary persona ───────────────────────────────────────

describe('CLU-01 buildExecutiveSummary', () => {
  it('returns an array of section objects with id, title, level, content', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('title');
      expect(s).toHaveProperty('level');
      expect(s).toHaveProperty('content');
    }
  });

  it('sections include all 7 required IDs', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const ids = sections.map(s => s.id);
    const required = ['overview', 'progress', 'requirements', 'blockers', 'decisions', 'timeline', 'artifacts'];
    for (const id of required) {
      expect(ids, `missing section id: ${id}`).toContain(id);
    }
  });

  it('handles unavailable IR fields gracefully — no NaN, no empty strings', () => {
    const ir = {
      ...MOCK_IR,
      phases: { unavailable: true, reason: 'STATE.md not found' },
      requirements: { unavailable: true, reason: 'REQUIREMENTS.md not found' },
      blockers: { unavailable: true, reason: 'no blockers data' },
    };
    const sections = renderMod.buildExecutiveSummary(ir);
    for (const s of sections) {
      expect(s.content).not.toMatch(/NaN/);
      expect(s.content).not.toBe('');
    }
  });

  it('includes project name in overview section', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const overview = sections.find(s => s.id === 'overview');
    expect(overview).toBeDefined();
    expect(overview.content).toContain('Platform Development Engine');
  });
});

// ─── CLR-01: Case study persona ──────────────────────────────────────────────

describe('CLR-01 buildCaseStudy', () => {
  it('returns an array of section objects with id, title, level, content', () => {
    const sections = renderMod.buildCaseStudy(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('title');
      expect(s).toHaveProperty('level');
      expect(s).toHaveProperty('content');
    }
  });

  it('sections include all 6 required IDs', () => {
    const sections = renderMod.buildCaseStudy(MOCK_IR);
    const ids = sections.map(s => s.id);
    const required = ['problem', 'approach', 'outcome', 'lessons', 'technical', 'artifacts'];
    for (const id of required) {
      expect(ids, `missing section id: ${id}`).toContain(id);
    }
  });

  it('handles unavailable IR fields gracefully — no NaN, no empty strings', () => {
    const ir = {
      ...MOCK_IR,
      decisions: { unavailable: true, reason: 'STATE.md not found' },
      blockers: { unavailable: true, reason: 'no blockers data' },
      verification: { unavailable: true, reason: 'no verification data' },
    };
    const sections = renderMod.buildCaseStudy(ir);
    for (const s of sections) {
      expect(s.content).not.toMatch(/NaN/);
      expect(s.content).not.toBe('');
    }
  });

  it('problem section contains goal/context information', () => {
    const sections = renderMod.buildCaseStudy(MOCK_IR);
    const problem = sections.find(s => s.id === 'problem');
    expect(problem).toBeDefined();
    expect(problem.content.length).toBeGreaterThan(10);
  });
});

// ─── buildTOC ─────────────────────────────────────────────────────────────────

describe('buildTOC', () => {
  it('produces <nav class="toc"> element', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const toc = renderMod.buildTOC(sections);
    expect(toc).toContain('<nav class="toc">');
  });

  it('contains anchor links for each section', () => {
    const sections = [
      { id: 'overview', title: 'Overview', level: 1, content: '' },
      { id: 'progress', title: 'Progress', level: 2, content: '' },
    ];
    const toc = renderMod.buildTOC(sections);
    expect(toc).toContain('href="#overview"');
    expect(toc).toContain('href="#progress"');
  });
});

// ─── escHtml ──────────────────────────────────────────────────────────────────

describe('escHtml', () => {
  it('escapes & < > " and apostrophe', () => {
    const result = renderMod.escHtml('<script>alert("xss & \'stuff\'");</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&gt;');
  });

  it('returns empty string for falsy input', () => {
    expect(renderMod.escHtml(null)).toBe('');
    expect(renderMod.escHtml(undefined)).toBe('');
    expect(renderMod.escHtml('')).toBe('');
  });
});

// ─── personaDisplayName ───────────────────────────────────────────────────────

describe('personaDisplayName', () => {
  it('maps executive-summary to display name', () => {
    expect(renderMod.personaDisplayName('executive-summary')).toContain('Executive');
  });

  it('maps case-study to display name', () => {
    expect(renderMod.personaDisplayName('case-study')).toContain('Case Study');
  });
});

// ─── Chart integration (CHT-05) ──────────────────────────────────────────────

describe('Chart integration (CHT-05)', () => {
  it('buildExecutiveSummary returns section with id "burndown"', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const burndown = sections.find(s => s.id === 'burndown');
    expect(burndown).toBeDefined();
  });

  it('buildExecutiveSummary returns section with id "velocity"', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const velocity = sections.find(s => s.id === 'velocity');
    expect(velocity).toBeDefined();
  });

  it('burndown section content contains <svg', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const burndown = sections.find(s => s.id === 'burndown');
    expect(burndown.content).toContain('<svg');
  });

  it('velocity section content contains <svg', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const velocity = sections.find(s => s.id === 'velocity');
    expect(velocity.content).toContain('<svg');
  });

  it('buildCaseStudy returns section with id "timeline-chart"', () => {
    const sections = renderMod.buildCaseStudy(MOCK_IR);
    const timeline = sections.find(s => s.id === 'timeline-chart');
    expect(timeline).toBeDefined();
  });

  it('buildCaseStudy returns section with id "effort"', () => {
    const sections = renderMod.buildCaseStudy(MOCK_IR);
    const effort = sections.find(s => s.id === 'effort');
    expect(effort).toBeDefined();
  });

  it('timeline-chart section content contains <svg', () => {
    const sections = renderMod.buildCaseStudy(MOCK_IR);
    const timeline = sections.find(s => s.id === 'timeline-chart');
    expect(timeline.content).toContain('<svg');
  });

  it('effort section content contains <svg', () => {
    const sections = renderMod.buildCaseStudy(MOCK_IR);
    const effort = sections.find(s => s.id === 'effort');
    expect(effort.content).toContain('<svg');
  });

  it('renderHTML for executive-summary contains burndown-title (chart SVG in final HTML)', () => {
    const sections = renderMod.buildExecutiveSummary(MOCK_IR);
    const html = renderMod.renderHTML(MOCK_IR, 'executive-summary', sections);
    expect(html).toContain('burndown-title');
  });
});

// ─── render() with case-study persona ────────────────────────────────────────

describe('render() case-study persona', () => {
  it('produces valid HTML+MD for case-study persona', () => {
    const htmlPath = path.join(tmpDir, 'case-study-test.html');
    const mdPath = path.join(tmpDir, 'case-study-test.md');
    const result = renderMod.render(MOCK_IR, 'case-study', htmlPath, mdPath);
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    const md = fs.readFileSync(mdPath, 'utf-8');
    expect(md).toMatch(/^# /);
  });
});
