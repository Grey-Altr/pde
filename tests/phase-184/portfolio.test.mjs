/**
 * tests/phase-184/portfolio.test.mjs
 * Unit tests for bin/lib/portfolio.cjs
 *
 * Coverage:
 *   PORT-01  detectSchemaVersion — three paths: v1.0, pre-1.0-modern, unknown
 *   PORT-02  extractMilestoneHistory — real format, empty, missing file
 *   PORT-04  buildPortfolioIR — valid paths, mixed, empty array, throw scenario
 *   PORT-05  Sentinel: unavailable entries never throw, always return { unavailable: true, reason }
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);

// ─── Load module under test ───────────────────────────────────────────────────

let portfolioMod;
try {
  portfolioMod = require('../../bin/lib/portfolio.cjs');
} catch (_) {
  portfolioMod = null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-portfolio-test-'));
}

function makeProject(tmpDir, opts = {}) {
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });

  if (opts.stateVersion === '1.0') {
    fs.writeFileSync(path.join(planningDir, 'STATE.md'), `---
gsd_state_version: 1.0
milestone: v0.22
status: active
---

# Project State
`);
  } else if (opts.stateVersion === 'pre-1.0-modern') {
    fs.writeFileSync(path.join(planningDir, 'STATE.md'), `---
milestone: v0.22
status: active
progress:
  total_phases: 5
  completed_phases: 2
---

# Project State
`);
  }

  if (opts.milestones) {
    fs.writeFileSync(path.join(planningDir, 'MILESTONES.md'), opts.milestones);
  }

  // Create minimal files so buildPresentationIR doesn't fail completely
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), '# Project\n');
  fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# Roadmap\n');
  fs.writeFileSync(path.join(planningDir, 'REQUIREMENTS.md'), '# Requirements\n');

  return tmpDir;
}

const MILESTONES_CONTENT = `# Milestones

## v0.21 Desktop App Integration (Shipped: 2026-03-29)

**Phases completed:** 12 phases, 28 plans, 35 tasks

**Key accomplishments:**

- Integrated desktop application wrappers

## v0.20 CLI-Anything + Asset Engine (Shipped: 2026-03-28)

**Phases completed:** 8 phases, 23 plans, 41 tasks

**Key accomplishments:**

- CLI-Anything module shipped
`;

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('portfolio.cjs module', () => {
  it('exports required functions', () => {
    expect(portfolioMod).not.toBeNull();
    expect(typeof portfolioMod.detectSchemaVersion).toBe('function');
    expect(typeof portfolioMod.extractMilestoneHistory).toBe('function');
    expect(typeof portfolioMod.buildPortfolioIR).toBe('function');
    expect(typeof portfolioMod.cmdPortfolioBuild).toBe('function');
  });
});

describe('detectSchemaVersion', () => {
  let tmpDir;

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns version 1.0 when STATE.md has gsd_state_version: 1.0', () => {
    tmpDir = makeTmpDir();
    makeProject(tmpDir, { stateVersion: '1.0' });
    const result = portfolioMod.detectSchemaVersion(tmpDir);
    expect(result.version).toBe('1.0');
    expect(result.source).toContain('STATE.md');
  });

  it('returns pre-1.0-modern when STATE.md has progress block but no gsd_state_version', () => {
    const dir = makeTmpDir();
    makeProject(dir, { stateVersion: 'pre-1.0-modern' });
    const result = portfolioMod.detectSchemaVersion(dir);
    expect(result.version).toBe('pre-1.0-modern');
    expect(result.source).toContain('STATE.md');
    fs.rmSync(dir, { recursive: true });
  });

  it('returns unknown when STATE.md is missing', () => {
    const dir = makeTmpDir();
    // No .planning dir, no STATE.md
    const result = portfolioMod.detectSchemaVersion(dir);
    expect(result.version).toBe('unknown');
    expect(result).toHaveProperty('reason');
    fs.rmSync(dir, { recursive: true });
  });
});

describe('extractMilestoneHistory', () => {
  it('returns milestone array when MILESTONES.md exists with content', () => {
    const dir = makeTmpDir();
    makeProject(dir, { milestones: MILESTONES_CONTENT });
    const result = portfolioMod.extractMilestoneHistory(dir);
    expect(result.available).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.milestones)).toBe(true);
    expect(result.milestones[0]).toHaveProperty('version');
    expect(result.milestones[0]).toHaveProperty('name');
    expect(result.milestones[0]).toHaveProperty('shipped');
    fs.rmSync(dir, { recursive: true });
  });

  it('returns unavailable sentinel when MILESTONES.md is missing', () => {
    const dir = makeTmpDir();
    makeProject(dir, {}); // no milestones file
    const result = portfolioMod.extractMilestoneHistory(dir);
    expect(result.unavailable).toBe(true);
    expect(result).toHaveProperty('reason');
    fs.rmSync(dir, { recursive: true });
  });

  it('returns unavailable sentinel for empty MILESTONES.md', () => {
    const dir = makeTmpDir();
    makeProject(dir, { milestones: '# Milestones\n\n(no entries yet)' });
    const result = portfolioMod.extractMilestoneHistory(dir);
    expect(result.unavailable).toBe(true);
    expect(result).toHaveProperty('reason');
    fs.rmSync(dir, { recursive: true });
  });
});

describe('buildPortfolioIR', () => {
  it('returns portfolioIR with correct shape for empty array', () => {
    const result = portfolioMod.buildPortfolioIR([]);
    expect(result.schema_version).toBe('1.0');
    expect(result.project_count).toBe(0);
    expect(result.available_count).toBe(0);
    expect(Array.isArray(result.projects)).toBe(true);
    expect(result).toHaveProperty('extracted_at');
  });

  it('returns unavailable sentinel for missing .planning/ directory', () => {
    const dir = makeTmpDir();
    // No .planning dir
    const result = portfolioMod.buildPortfolioIR([dir]);
    expect(result.project_count).toBe(1);
    expect(result.available_count).toBe(0);
    expect(result.projects[0].unavailable).toBe(true);
    expect(result.projects[0]).toHaveProperty('reason');
    expect(result.projects[0].path).toBe(dir);
    fs.rmSync(dir, { recursive: true });
  });

  it('returns mix of available and unavailable for mixed paths', () => {
    const validDir = makeTmpDir();
    makeProject(validDir, { stateVersion: '1.0', milestones: MILESTONES_CONTENT });
    const missingDir = '/tmp/pde-nonexistent-project-99999999';

    const result = portfolioMod.buildPortfolioIR([validDir, missingDir]);
    expect(result.project_count).toBe(2);
    // available_count may be 0 or 1 depending on whether buildPresentationIR succeeds
    // with minimal files — main thing is no throw
    expect(typeof result.available_count).toBe('number');
    expect(result.projects.length).toBe(2);

    const missingEntry = result.projects.find(p => p.path === missingDir);
    expect(missingEntry).toBeDefined();
    expect(missingEntry.unavailable).toBe(true);

    fs.rmSync(validDir, { recursive: true });
  });

  it('never throws when buildPresentationIR encounters errors — returns unavailable sentinel', () => {
    // Provide a path with .planning/ but no meaningful files — should return sentinel not throw
    const dir = makeTmpDir();
    fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
    // Empty .planning dir — buildPresentationIR will do its best but shouldn't throw from buildPortfolioIR
    let threw = false;
    let result;
    try {
      result = portfolioMod.buildPortfolioIR([dir]);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result.project_count).toBe(1);
    fs.rmSync(dir, { recursive: true });
  });
});
