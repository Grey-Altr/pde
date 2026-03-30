/**
 * tests/phase-184/portfolio-render.test.mjs
 * Unit tests for cross-project portfolio render function
 *
 * Coverage:
 *   PORT-03  buildCrossProjectPortfolio — 5-section array, multi-project
 *   PORT-05  Unavailable project sentinel handling — "data unavailable" markers
 *   PORT-06  cmdPortfolioRender — writes HTML+MD files from portfolioIR JSON
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

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeMinimalIR(name) {
  return {
    schema_version: '1.0',
    extracted_at: '2026-03-30T01:00:00.000Z',
    source_hash: 'abcdef1234567890',
    project: {
      name,
      goal: 'A test project goal.',
      core_value: 'Test core value.',
      summary: 'Test summary.',
      product_type: 'software',
    },
    phases: {
      total: 9,
      completed: 5,
      completion_pct: 55,
      milestone_name: 'v0.22',
      current_phase_name: 'Phase 184',
      phase_list: [],
    },
    requirements: {
      total: 58,
      completed: 30,
      completion_pct: 51,
      by_category: [],
      incomplete: [],
    },
    design_artifacts: { count: 2, types: [] },
    git_velocity: { commits_30d: 10, commits_90d: 30 },
    cost_timing: { total_sessions: 5, estimated_cost_usd: 50 },
    blockers: [],
    risks: [],
    decisions: [
      { summary: 'Extraction-first architecture', phase: 'roadmap' },
      { summary: 'TDD for all new modules', phase: 'phase-176' },
    ],
    research: {
      project_research_files: 2,
      topics: ['ai-sdk-patterns', 'schema-heterogeneity'],
      phase_research_count: 3,
    },
    verification: { pass: true, checks: [] },
    cross_ref_warnings: [],
  };
}

function makePortfolioIR(overrides = {}) {
  const base = {
    schema_version: '1.0',
    extracted_at: '2026-03-30T01:00:00.000Z',
    project_count: 2,
    available_count: 2,
    projects: [
      {
        path: '/project/a',
        unavailable: false,
        ir: makeMinimalIR('Project Alpha'),
        milestoneHistory: {
          available: true,
          count: 2,
          milestones: [
            { version: 'v0.21', name: 'Desktop Integration', shipped: '2026-03-29', phases_completed: 12 },
            { version: 'v0.20', name: 'CLI-Anything', shipped: '2026-03-28', phases_completed: 8 },
          ],
        },
        schemaVersion: { version: '1.0', source: 'STATE.md gsd_state_version' },
      },
      {
        path: '/project/b',
        unavailable: false,
        ir: makeMinimalIR('Project Beta'),
        milestoneHistory: {
          available: true,
          count: 1,
          milestones: [
            { version: 'v0.10', name: 'Initial Release', shipped: '2026-02-01', phases_completed: 5 },
          ],
        },
        schemaVersion: { version: '1.0', source: 'STATE.md gsd_state_version' },
      },
    ],
  };
  return Object.assign({}, base, overrides);
}

// ─── Tests: buildCrossProjectPortfolio ───────────────────────────────────────

describe('buildCrossProjectPortfolio', () => {
  it('is exported from render-presentation.cjs', () => {
    expect(renderMod).not.toBeNull();
    expect(typeof renderMod.buildCrossProjectPortfolio).toBe('function');
  });

  it('returns 5-section array for portfolioIR with 2 available projects', () => {
    const portfolioIR = makePortfolioIR();
    const sections = renderMod.buildCrossProjectPortfolio(portfolioIR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBe(5);
  });

  it('each section has id, title, level, and non-empty content string', () => {
    const portfolioIR = makePortfolioIR();
    const sections = renderMod.buildCrossProjectPortfolio(portfolioIR);
    for (const section of sections) {
      expect(typeof section.id).toBe('string');
      expect(section.id.length).toBeGreaterThan(0);
      expect(typeof section.title).toBe('string');
      expect(section.title.length).toBeGreaterThan(0);
      expect(typeof section.level).toBe('number');
      expect(typeof section.content).toBe('string');
      expect(section.content.length).toBeGreaterThan(0);
    }
  });

  it('section IDs include header, projects, patterns, outcomes, timeline', () => {
    const portfolioIR = makePortfolioIR();
    const sections = renderMod.buildCrossProjectPortfolio(portfolioIR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('header');
    expect(ids).toContain('projects');
    expect(ids).toContain('patterns');
    expect(ids).toContain('outcomes');
    expect(ids).toContain('timeline');
  });

  it('includes unavailable marker for skipped project (PORT-05)', () => {
    const portfolioIR = makePortfolioIR({
      project_count: 2,
      available_count: 1,
      projects: [
        {
          path: '/project/a',
          unavailable: false,
          ir: makeMinimalIR('Project Alpha'),
          milestoneHistory: { available: true, count: 1, milestones: [
            { version: 'v0.21', name: 'Desktop', shipped: '2026-03-29', phases_completed: 5 },
          ]},
          schemaVersion: { version: '1.0', source: 'STATE.md' },
        },
        {
          path: '/project/bad',
          unavailable: true,
          reason: '.planning/ directory not found',
        },
      ],
    });

    const sections = renderMod.buildCrossProjectPortfolio(portfolioIR);
    const projectsSection = sections.find(s => s.id === 'projects');
    expect(projectsSection).toBeDefined();
    // Should mention "unavailable" or "data unavailable" for the bad project
    const contentLower = projectsSection.content.toLowerCase();
    expect(contentLower).toMatch(/unavailable|data unavailable|not available|skipped/);
  });

  it('returns sections with "no projects available" content when available_count is 0', () => {
    const portfolioIR = makePortfolioIR({
      project_count: 1,
      available_count: 0,
      projects: [
        { path: '/project/x', unavailable: true, reason: 'missing' },
      ],
    });
    const sections = renderMod.buildCrossProjectPortfolio(portfolioIR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBe(5);
    // Header should mention no available projects
    const headerSection = sections.find(s => s.id === 'header');
    expect(headerSection).toBeDefined();
    const contentLower = headerSection.content.toLowerCase();
    expect(contentLower).toMatch(/no projects|0 available|could not be extracted/);
  });
});

// ─── Tests: cmdPortfolioRender ────────────────────────────────────────────────

describe('cmdPortfolioRender', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-portfolio-render-'));
  });

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  });

  it('is exported from render-presentation.cjs', () => {
    expect(typeof renderMod.cmdPortfolioRender).toBe('function');
  });

  it('writes HTML and MD files from portfolioIR JSON file', () => {
    const portfolioIR = makePortfolioIR();
    const irPath = path.join(tmpDir, 'portfolioIR.json');
    fs.writeFileSync(irPath, JSON.stringify(portfolioIR, null, 2), 'utf-8');

    const htmlPath = path.join(tmpDir, 'portfolio.html');
    const mdPath = path.join(tmpDir, 'portfolio.md');

    // cmdPortfolioRender calls output() which calls process.exit(0).
    // Intercept process.exit to allow test to continue after files are written.
    const origExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; };
    try {
      renderMod.cmdPortfolioRender(tmpDir, irPath, htmlPath, mdPath);
    } finally {
      process.exit = origExit;
    }

    expect(exitCode).toBe(0);
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html.length).toBeGreaterThan(500);

    const md = fs.readFileSync(mdPath, 'utf-8');
    expect(md.length).toBeGreaterThan(100);
  });
});
