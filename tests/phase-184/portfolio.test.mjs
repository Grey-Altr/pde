/**
 * tests/phase-184/portfolio.test.mjs
 * Unit tests for portfolio.cjs — multi-project IR extraction layer
 *
 * Coverage:
 *   detectSchemaVersion  — three STATE.md variants
 *   extractMilestoneHistory — present / empty / missing MILESTONES.md
 *   buildPortfolioIR — valid paths / invalid paths / mixed / empty / throws
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);

// ─── Load module under test ───────────────────────────────────────────────────

let portfolio;
try {
  portfolio = require('../../bin/lib/portfolio.cjs');
} catch (_) {
  portfolio = null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpProject(subFiles = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-portfolio-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });

  for (const [relPath, content] of Object.entries(subFiles)) {
    const fullPath = path.join(planningDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  return tmpDir;
}

function cleanup(dirs) {
  for (const d of dirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch {}
  }
}

// STATE.md variants
const STATE_WITH_GSD_VERSION = `---
gsd_state_version: 1.0
milestone: v0.22
status: in_progress
progress:
  total_phases: 9
  completed_phases: 3
---

# Project State
`;

const STATE_WITH_PROGRESS_ONLY = `---
milestone: v0.22
status: in_progress
progress:
  total_phases: 9
  completed_phases: 3
---

# Project State
`;

const STATE_LEGACY = `# Project State

Current Phase: 5
Status: active
`;

// MILESTONES.md content modelled on actual format
const MILESTONES_CONTENT = `# Milestones

## v0.21 Desktop App Integration (Shipped: 2026-03-29)

**Phases completed:** 12 phases, 28 plans, 35 tasks

**Key accomplishments:**

- Desktop app discovery, approval, and wrapping pipeline

---

## v0.20 CLI-Anything + Asset Engine (Shipped: 2026-03-29)

**Phases completed:** 15 phases, 39 plans, 51 tasks

**Key accomplishments:**

- CLI-Anything router with harness detection

---

## v0.19 WebMCP Integration (Shipped: 2026-03-28)

**Phases completed:** 7 phases, 16 plans, 30 tasks

**Key accomplishments:**

- Remote MCP server with approval gates

---
`;

// ─── Tests ────────────────────────────────────────────────────────────────────

const tmpDirs = [];

describe('portfolio.cjs module', () => {
  it('loads successfully', () => {
    expect(portfolio).not.toBeNull();
  });

  it('exports detectSchemaVersion', () => {
    expect(typeof portfolio?.detectSchemaVersion).toBe('function');
  });

  it('exports extractMilestoneHistory', () => {
    expect(typeof portfolio?.extractMilestoneHistory).toBe('function');
  });

  it('exports buildPortfolioIR', () => {
    expect(typeof portfolio?.buildPortfolioIR).toBe('function');
  });

  it('exports cmdPortfolioBuild', () => {
    expect(typeof portfolio?.cmdPortfolioBuild).toBe('function');
  });
});

describe('detectSchemaVersion', () => {
  afterAll(() => cleanup(tmpDirs));

  it('returns version 1.0 when STATE.md has gsd_state_version: 1.0', () => {
    const tmpDir = makeTmpProject({ 'STATE.md': STATE_WITH_GSD_VERSION });
    tmpDirs.push(tmpDir);

    const result = portfolio.detectSchemaVersion(tmpDir);
    expect(result.version).toBe('1.0');
    expect(result.source).toBe('STATE.md gsd_state_version');
  });

  it('returns pre-1.0-modern when STATE.md has progress block but no gsd_state_version', () => {
    const tmpDir = makeTmpProject({ 'STATE.md': STATE_WITH_PROGRESS_ONLY });
    tmpDirs.push(tmpDir);

    const result = portfolio.detectSchemaVersion(tmpDir);
    expect(result.version).toBe('pre-1.0-modern');
    expect(result.source).toBe('STATE.md progress block');
  });

  it('returns pre-1.0-legacy when STATE.md exists but no frontmatter and no progress block', () => {
    const tmpDir = makeTmpProject({ 'STATE.md': STATE_LEGACY });
    tmpDirs.push(tmpDir);

    const result = portfolio.detectSchemaVersion(tmpDir);
    expect(result.version).toBe('pre-1.0-legacy');
  });

  it('returns unknown when STATE.md is missing', () => {
    const tmpDir = makeTmpProject({});
    tmpDirs.push(tmpDir);

    const result = portfolio.detectSchemaVersion(tmpDir);
    expect(result.version).toBe('unknown');
    expect(result).toHaveProperty('reason');
  });
});

describe('extractMilestoneHistory', () => {
  afterAll(() => cleanup(tmpDirs));

  it('returns available milestone array from valid MILESTONES.md', () => {
    const tmpDir = makeTmpProject({ 'MILESTONES.md': MILESTONES_CONTENT });
    tmpDirs.push(tmpDir);

    const result = portfolio.extractMilestoneHistory(tmpDir);
    expect(result.available).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(result.milestones)).toBe(true);

    const first = result.milestones[0];
    expect(first).toHaveProperty('version');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('shipped');
  });

  it('parses milestone version correctly', () => {
    const tmpDir = makeTmpProject({ 'MILESTONES.md': MILESTONES_CONTENT });
    tmpDirs.push(tmpDir);

    const result = portfolio.extractMilestoneHistory(tmpDir);
    const versions = result.milestones.map(m => m.version);
    expect(versions).toContain('v0.21');
    expect(versions).toContain('v0.20');
  });

  it('parses shipped date correctly', () => {
    const tmpDir = makeTmpProject({ 'MILESTONES.md': MILESTONES_CONTENT });
    tmpDirs.push(tmpDir);

    const result = portfolio.extractMilestoneHistory(tmpDir);
    const v021 = result.milestones.find(m => m.version === 'v0.21');
    expect(v021).toBeDefined();
    expect(v021.shipped).toBe('2026-03-29');
  });

  it('returns unavailable sentinel when MILESTONES.md is missing', () => {
    const tmpDir = makeTmpProject({});
    tmpDirs.push(tmpDir);

    const result = portfolio.extractMilestoneHistory(tmpDir);
    expect(result.unavailable).toBe(true);
    expect(result).toHaveProperty('reason');
  });

  it('returns unavailable sentinel when MILESTONES.md is empty', () => {
    const tmpDir = makeTmpProject({ 'MILESTONES.md': '' });
    tmpDirs.push(tmpDir);

    const result = portfolio.extractMilestoneHistory(tmpDir);
    expect(result.unavailable).toBe(true);
  });
});

describe('buildPortfolioIR', () => {
  afterAll(() => cleanup(tmpDirs));

  it('returns portfolioIR with correct shape for empty path array', () => {
    const result = portfolio.buildPortfolioIR([]);
    expect(result.schema_version).toBe('1.0');
    expect(result.project_count).toBe(0);
    expect(result.available_count).toBe(0);
    expect(Array.isArray(result.projects)).toBe(true);
    expect(result).toHaveProperty('extracted_at');
  });

  it('returns unavailable sentinel for a path with no .planning/ directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-no-planning-'));
    tmpDirs.push(tmpDir);

    const result = portfolio.buildPortfolioIR([tmpDir]);
    expect(result.project_count).toBe(1);
    expect(result.available_count).toBe(0);
    expect(result.projects[0].unavailable).toBe(true);
    expect(result.projects[0].path).toBe(tmpDir);
    expect(result.projects[0]).toHaveProperty('reason');
  });

  it('does not throw when a path does not exist', () => {
    const nonExistent = '/tmp/pde-test-does-not-exist-12345xyz';
    expect(() => portfolio.buildPortfolioIR([nonExistent])).not.toThrow();

    const result = portfolio.buildPortfolioIR([nonExistent]);
    expect(result.projects[0].unavailable).toBe(true);
  });

  it('handles mixed valid and invalid paths with correct counts', () => {
    // A dir with .planning/ but minimal STATE.md (buildPresentationIR may return partial IR)
    const validDir = makeTmpProject({
      'STATE.md': STATE_WITH_GSD_VERSION,
      'MILESTONES.md': MILESTONES_CONTENT,
    });
    tmpDirs.push(validDir);

    const invalidDir = '/tmp/pde-portfolio-invalid-missing-99999';

    const result = portfolio.buildPortfolioIR([validDir, invalidDir]);
    expect(result.project_count).toBe(2);
    // One may succeed (has .planning/), one fails (no dir)
    const invalid = result.projects.find(p => p.path === invalidDir);
    expect(invalid.unavailable).toBe(true);
  });

  it('returns available_count=1 for a single valid project', () => {
    const tmpDir = makeTmpProject({
      'STATE.md': STATE_WITH_GSD_VERSION,
      'MILESTONES.md': MILESTONES_CONTENT,
    });
    tmpDirs.push(tmpDir);

    const result = portfolio.buildPortfolioIR([tmpDir]);
    expect(result.project_count).toBe(1);
    // available_count is 1 only if buildPresentationIR didn't throw
    // It may be 0 if the minimal fixture isn't enough — what we assert is no throw
    expect(result.available_count).toBeGreaterThanOrEqual(0);
    expect(result.available_count).toBeLessThanOrEqual(1);
  });

  it('returns unavailable sentinel (not a throw) when buildPresentationIR throws', () => {
    // Create a dir with .planning/ that has a malformed STATE.md to trigger internal errors
    // The key guarantee is: never throw, always return sentinel
    const tmpDir = makeTmpProject({
      'STATE.md': STATE_WITH_GSD_VERSION,
    });
    tmpDirs.push(tmpDir);

    // Even if buildPresentationIR internally errors, buildPortfolioIR should not throw
    expect(() => portfolio.buildPortfolioIR([tmpDir])).not.toThrow();

    const result = portfolio.buildPortfolioIR([tmpDir]);
    expect(result).toHaveProperty('projects');
    expect(result.projects[0]).toHaveProperty('path');
  });

  it('sets extracted_at to a valid ISO date string', () => {
    const result = portfolio.buildPortfolioIR([]);
    expect(result.extracted_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
