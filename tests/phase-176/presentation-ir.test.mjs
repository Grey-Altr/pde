/**
 * tests/phase-176/presentation-ir.test.mjs
 * Unit tests for bin/lib/presentation.cjs — IR extractor functions
 * EXT-01 through EXT-04 (Plan 01) and EXT-05 through EXT-10 (Plan 02)
 *
 * Strategy: Each extractor is tested with happy-path fixtures via fs mocks
 * and edge cases (missing data, empty sections, git failures).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const require = createRequire(import.meta.url);

// ─── Load module under test ───────────────────────────────────────────────────

let extractGitVelocity, extractCostTiming, extractBlockers,
  extractVerification, extractResearch, extractDecisions;

try {
  ({
    extractGitVelocity,
    extractCostTiming,
    extractBlockers,
    extractVerification,
    extractResearch,
    extractDecisions,
  } = require('../../bin/lib/presentation.cjs'));
} catch (_) {
  // Will be caught in each test
}

// ─── Helper: create a temp dir with a basic .planning structure ───────────────

function makePlanningDir(tmpDir, opts = {}) {
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.mkdirSync(path.join(planningDir, 'phases'), { recursive: true });

  if (opts.withPhases) {
    for (const phase of opts.withPhases) {
      const phaseDir = path.join(planningDir, 'phases', phase.name);
      fs.mkdirSync(phaseDir, { recursive: true });
      if (phase.summary) {
        fs.writeFileSync(path.join(phaseDir, `${phase.name}-SUMMARY.md`), phase.summary);
      }
      if (phase.verification) {
        fs.writeFileSync(path.join(phaseDir, `${phase.name}-VERIFICATION.md`), phase.verification);
      }
      if (phase.research) {
        fs.writeFileSync(path.join(phaseDir, `${phase.name}-RESEARCH.md`), phase.research);
      }
    }
  }

  if (opts.stateContent) {
    fs.writeFileSync(path.join(planningDir, 'STATE.md'), opts.stateContent);
  }

  if (opts.withResearchDir) {
    const researchDir = path.join(planningDir, 'research');
    fs.mkdirSync(researchDir, { recursive: true });
    for (const file of opts.withResearchDir) {
      fs.writeFileSync(path.join(researchDir, file), '# research');
    }
  }

  return planningDir;
}

const SAMPLE_SUMMARY_WITH_TIMING = `---
phase: 175-design-pipeline-integration
plan: 01
duration: 27min
key-decisions:
  - "vi.spyOn on module.exports for CJS-in-CJS mocking"
tech-stack: []
---
# Summary content
`;

const SAMPLE_SUMMARY_NO_TIMING = `---
phase: 174-some-phase
plan: 01
tech-stack: []
---
# No duration here
`;

const SAMPLE_VERIFICATION_ACHIEVED = `---
phase: 175
---
- [x] AC-1: Feature works correctly
- [x] AC-2: Edge cases handled
- [ ] AC-3: Performance check pending

**Overall: ACHIEVED**
`;

const SAMPLE_VERIFICATION_NOT_ACHIEVED = `---
phase: 174
---
- [x] AC-1: Basic test passes
- [ ] AC-2: Integration test fails

**Overall: NOT ACHIEVED**
`;

const SAMPLE_STATE_WITH_BLOCKERS = `---
gsd_state_version: 1.0
---

# Project State

## Accumulated Context

### Decisions

- [Roadmap]: Extraction-first architecture chosen
- [Phase 176]: IR field completeness needed

### Pending Todos

None.

### Blockers/Concerns

- [Phase 176]: IR field completeness validation needed before finalizing schema
- [Phase 184]: Schema version inventory — high risk concern for portfolio synthesis
`;

const SAMPLE_STATE_EMPTY_BLOCKERS = `---
gsd_state_version: 1.0
---

# Project State

## Accumulated Context

### Decisions

- [Phase 100]: Some decision made

### Pending Todos

None.

### Blockers/Concerns

None.
`;

// ─── EXT-05: git velocity ─────────────────────────────────────────────────────

describe('extractGitVelocity', () => {
  it('is exported from presentation.cjs', () => {
    expect(extractGitVelocity).toBeDefined();
    expect(typeof extractGitVelocity).toBe('function');
  });

  it('returns git velocity data when git is available', () => {
    let tmpDir;
    try {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-git-test-'));

      // Initialize a git repo with some history
      spawnSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
      spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tmpDir, stdio: 'pipe' });
      spawnSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir, stdio: 'pipe' });

      // Create commits
      fs.writeFileSync(path.join(tmpDir, 'file1.txt'), 'hello world\n');
      spawnSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
      spawnSync('git', ['commit', '-m', 'first commit'], { cwd: tmpDir, stdio: 'pipe' });

      fs.writeFileSync(path.join(tmpDir, 'file2.txt'), 'another line\n');
      spawnSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
      spawnSync('git', ['commit', '-m', 'second commit'], { cwd: tmpDir, stdio: 'pipe' });

      const result = extractGitVelocity(tmpDir);

      expect(result).toBeDefined();
      expect(result.unavailable).toBeUndefined();
      expect(typeof result.total_commits).toBe('number');
      expect(result.total_commits).toBeGreaterThanOrEqual(2);
      expect(typeof result.commits_last_30_days).toBe('number');
      expect(result.commits_last_30_days).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(result.contributors)).toBe(true);
      expect(result.contributors.length).toBeGreaterThan(0);
      expect(typeof result.estimated_loc_added).toBe('number');
      expect(result.estimated_loc_added).toBeGreaterThanOrEqual(0);
    } finally {
      if (tmpDir) {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      }
    }
  });

  it('returns unavailable sentinel when not a git repo', () => {
    let tmpDir;
    try {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-nogit-test-'));
      const result = extractGitVelocity(tmpDir);
      expect(result).toBeDefined();
      expect(result.unavailable).toBe(true);
      expect(typeof result.reason).toBe('string');
    } finally {
      if (tmpDir) {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      }
    }
  });
});

// ─── EXT-06: cost/timing ─────────────────────────────────────────────────────

describe('extractCostTiming', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-timing-test-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  });

  it('is exported from presentation.cjs', () => {
    expect(extractCostTiming).toBeDefined();
    expect(typeof extractCostTiming).toBe('function');
  });

  it('returns timing data when SUMMARY.md files exist with duration fields', () => {
    makePlanningDir(tmpDir, {
      withPhases: [
        { name: '175-design-pipeline', summary: SAMPLE_SUMMARY_WITH_TIMING },
        { name: '174-some-phase', summary: SAMPLE_SUMMARY_WITH_TIMING },
      ],
    });

    const result = extractCostTiming(tmpDir);

    expect(result).toBeDefined();
    expect(result.unavailable).toBeUndefined();
    expect(typeof result.session_count).toBe('number');
    expect(result.session_count).toBeGreaterThanOrEqual(2);
    expect(typeof result.total_duration_min).toBe('number');
    expect(result.total_duration_min).toBeGreaterThan(0);
    expect(typeof result.phases_with_timing).toBe('number');
    expect(result.phases_with_timing).toBeGreaterThan(0);
    expect(typeof result.average_phase_duration_min).toBe('number');
  });

  it('counts sessions even when some SUMMARY.md lack duration field', () => {
    makePlanningDir(tmpDir, {
      withPhases: [
        { name: '175-design-pipeline', summary: SAMPLE_SUMMARY_WITH_TIMING },
        { name: '174-some-phase', summary: SAMPLE_SUMMARY_NO_TIMING },
      ],
    });

    const result = extractCostTiming(tmpDir);

    expect(result).toBeDefined();
    expect(result.unavailable).toBeUndefined();
    expect(result.session_count).toBe(2);
    expect(result.phases_with_timing).toBe(1);
    expect(result.total_duration_min).toBe(27);
  });

  it('returns unavailable sentinel when no SUMMARY.md files found', () => {
    makePlanningDir(tmpDir, { withPhases: [] });

    const result = extractCostTiming(tmpDir);

    expect(result).toBeDefined();
    expect(result.unavailable).toBe(true);
    expect(typeof result.reason).toBe('string');
  });

  it('does not read from os.tmpdir() or pde-session files', () => {
    // Verify the function works from .planning/ SUMMARY.md files only
    makePlanningDir(tmpDir, {
      withPhases: [{ name: '175-design', summary: SAMPLE_SUMMARY_WITH_TIMING }],
    });

    const result = extractCostTiming(tmpDir);
    expect(result.unavailable).toBeUndefined();
    expect(result.session_count).toBe(1);
  });
});

// ─── EXT-07: blockers ────────────────────────────────────────────────────────

describe('extractBlockers', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-blockers-test-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  });

  it('is exported from presentation.cjs', () => {
    expect(extractBlockers).toBeDefined();
    expect(typeof extractBlockers).toBe('function');
  });

  it('returns blockers and risks arrays from STATE.md', () => {
    makePlanningDir(tmpDir, { stateContent: SAMPLE_STATE_WITH_BLOCKERS });

    const result = extractBlockers(tmpDir);

    expect(result).toBeDefined();
    expect(result.unavailable).toBeUndefined();
    expect(Array.isArray(result.blockers)).toBe(true);
    expect(Array.isArray(result.risks)).toBe(true);
    const total = result.blockers.length + result.risks.length;
    expect(total).toBeGreaterThan(0);
  });

  it('classifies items with risk/concern keywords as risks', () => {
    makePlanningDir(tmpDir, { stateContent: SAMPLE_STATE_WITH_BLOCKERS });

    const result = extractBlockers(tmpDir);

    const hasRisk = result.risks.some(r => /risk/i.test(r.text));
    expect(hasRisk).toBe(true);
  });

  it('returns empty arrays (not unavailable) when blockers section has None', () => {
    makePlanningDir(tmpDir, { stateContent: SAMPLE_STATE_EMPTY_BLOCKERS });

    const result = extractBlockers(tmpDir);

    expect(result).toBeDefined();
    expect(result.unavailable).toBeUndefined();
    expect(Array.isArray(result.blockers)).toBe(true);
    expect(Array.isArray(result.risks)).toBe(true);
  });

  it('returns empty arrays when STATE.md does not exist', () => {
    makePlanningDir(tmpDir, {});

    const result = extractBlockers(tmpDir);

    expect(result).toBeDefined();
    expect(result.unavailable).toBeUndefined();
    expect(result.blockers).toEqual([]);
    expect(result.risks).toEqual([]);
  });

  it('returns items with text, phase, and type fields', () => {
    makePlanningDir(tmpDir, { stateContent: SAMPLE_STATE_WITH_BLOCKERS });

    const result = extractBlockers(tmpDir);

    const allItems = [...result.blockers, ...result.risks];
    for (const item of allItems) {
      expect(typeof item.text).toBe('string');
      expect(item.text.length).toBeGreaterThan(0);
      expect(['blocker', 'concern', 'risk']).toContain(item.type);
    }
  });
});

// ─── EXT-08: verification ────────────────────────────────────────────────────

describe('extractVerification', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-verif-test-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  });

  it('is exported from presentation.cjs', () => {
    expect(extractVerification).toBeDefined();
    expect(typeof extractVerification).toBe('function');
  });

  it('returns verification stats when VERIFICATION.md files exist', () => {
    makePlanningDir(tmpDir, {
      withPhases: [
        { name: '175-design', verification: SAMPLE_VERIFICATION_ACHIEVED },
        { name: '174-some', verification: SAMPLE_VERIFICATION_NOT_ACHIEVED },
        { name: '173-other', summary: SAMPLE_SUMMARY_WITH_TIMING },
      ],
    });

    const result = extractVerification(tmpDir);

    expect(result).toBeDefined();
    expect(result.unavailable).toBeUndefined();
    expect(typeof result.phases_verified).toBe('number');
    expect(result.phases_verified).toBe(2);
    expect(typeof result.phases_achieved).toBe('number');
    expect(result.phases_achieved).toBe(1);
    expect(typeof result.phases_not_achieved).toBe('number');
    expect(result.phases_not_achieved).toBe(1);
    expect(typeof result.phases_missing_verification).toBe('number');
    expect(result.phases_missing_verification).toBe(1);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBe(2);
  });

  it('counts ac_pass and ac_fail checkboxes correctly', () => {
    makePlanningDir(tmpDir, {
      withPhases: [
        { name: '175-design', verification: SAMPLE_VERIFICATION_ACHIEVED },
      ],
    });

    const result = extractVerification(tmpDir);
    const r = result.results[0];

    expect(r.ac_pass).toBe(2);
    expect(r.ac_fail).toBe(1);
    expect(r.status).toBe('achieved');
  });

  it('returns phases_verified=0 when no VERIFICATION.md files found', () => {
    makePlanningDir(tmpDir, {
      withPhases: [
        { name: '175-design', summary: SAMPLE_SUMMARY_WITH_TIMING },
      ],
    });

    const result = extractVerification(tmpDir);

    expect(result).toBeDefined();
    expect(result.unavailable).toBeUndefined();
    expect(result.phases_verified).toBe(0);
    expect(result.phases_achieved).toBe(0);
    expect(result.results).toEqual([]);
  });

  it('returns phases_verified=0 when no phase directories exist', () => {
    makePlanningDir(tmpDir, { withPhases: [] });

    const result = extractVerification(tmpDir);

    expect(result).toBeDefined();
    expect(result.phases_verified).toBe(0);
    expect(result.phases_missing_verification).toBe(0);
  });
});

// ─── EXT-09: research ────────────────────────────────────────────────────────

describe('extractResearch', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-research-test-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  });

  it('is exported from presentation.cjs', () => {
    expect(extractResearch).toBeDefined();
    expect(typeof extractResearch).toBe('function');
  });

  it('returns research stats when research files exist', () => {
    makePlanningDir(tmpDir, {
      withResearchDir: ['ARCHITECTURE.md', 'PERSONAS.md', 'COMPETITIVE.md'],
      withPhases: [
        { name: '176-ir-foundation', research: '# Research content' },
        { name: '175-design', research: '# More research' },
        { name: '174-other', summary: SAMPLE_SUMMARY_WITH_TIMING },
      ],
    });

    const result = extractResearch(tmpDir);

    expect(result).toBeDefined();
    expect(result.unavailable).toBeUndefined();
    expect(typeof result.project_research_files).toBe('number');
    expect(result.project_research_files).toBe(3);
    expect(Array.isArray(result.topics)).toBe(true);
    expect(result.topics).toContain('ARCHITECTURE');
    expect(result.topics).toContain('PERSONAS');
    expect(typeof result.phase_research_count).toBe('number');
    expect(result.phase_research_count).toBe(2);
  });

  it('returns project_research_files=0 and topics=[] when research/ dir does not exist', () => {
    makePlanningDir(tmpDir, {
      withPhases: [
        { name: '176-ir-foundation', research: '# Research content' },
      ],
    });

    const result = extractResearch(tmpDir);

    expect(result).toBeDefined();
    expect(result.project_research_files).toBe(0);
    expect(result.topics).toEqual([]);
    expect(result.phase_research_count).toBe(1);
  });

  it('returns all zeros when no planning artifacts exist at all', () => {
    makePlanningDir(tmpDir, { withPhases: [] });

    const result = extractResearch(tmpDir);

    expect(result).toBeDefined();
    expect(result.project_research_files).toBe(0);
    expect(result.topics).toEqual([]);
    expect(result.phase_research_count).toBe(0);
  });
});

// ─── EXT-10: decisions ───────────────────────────────────────────────────────

describe('extractDecisions', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-decisions-test-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  });

  it('is exported from presentation.cjs', () => {
    expect(extractDecisions).toBeDefined();
    expect(typeof extractDecisions).toBe('function');
  });

  it('returns decisions array combining STATE.md and SUMMARY.md key-decisions', () => {
    makePlanningDir(tmpDir, {
      stateContent: SAMPLE_STATE_WITH_BLOCKERS,
      withPhases: [
        { name: '175-design', summary: SAMPLE_SUMMARY_WITH_TIMING },
      ],
    });

    const result = extractDecisions(tmpDir);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns decisions with summary field', () => {
    makePlanningDir(tmpDir, {
      stateContent: SAMPLE_STATE_WITH_BLOCKERS,
      withPhases: [
        { name: '175-design', summary: SAMPLE_SUMMARY_WITH_TIMING },
      ],
    });

    const result = extractDecisions(tmpDir);

    for (const d of result) {
      expect(typeof d.summary).toBe('string');
      expect(d.summary.length).toBeGreaterThan(0);
    }
  });

  it('returns empty array (not unavailable) when STATE.md missing and no SUMMARY files', () => {
    makePlanningDir(tmpDir, { withPhases: [] });

    const result = extractDecisions(tmpDir);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it('includes decisions from SUMMARY.md key-decisions frontmatter array', () => {
    makePlanningDir(tmpDir, {
      withPhases: [
        { name: '175-design', summary: SAMPLE_SUMMARY_WITH_TIMING },
      ],
    });

    const result = extractDecisions(tmpDir);

    const hasCjsDecision = result.some(d =>
      d.summary && d.summary.includes('vi.spyOn')
    );
    expect(hasCjsDecision).toBe(true);
  });

  it('includes decisions from STATE.md Decisions section', () => {
    makePlanningDir(tmpDir, {
      stateContent: SAMPLE_STATE_WITH_BLOCKERS,
      withPhases: [],
    });

    const result = extractDecisions(tmpDir);

    const hasRoadmapDecision = result.some(d =>
      d.summary && d.summary.includes('Extraction-first')
    );
    expect(hasRoadmapDecision).toBe(true);
  });
});
