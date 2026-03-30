/**
 * tests/phase-181/render-presentation-cluster-a.test.mjs
 * Unit + integration tests for Cluster A personas in bin/lib/render-presentation.cjs
 *
 * Coverage:
 *   CLU-02  Investor Update persona — buildInvestorUpdate
 *   CLU-03  Sprint Review persona   — buildSprintReview
 *   CLU-04  (scaffold — unskipped by plan 02)
 *   CLU-05  (scaffold — unskipped by plan 02)
 *   CLU-06  (scaffold — unskipped by plan 03)
 *   CLU-07  (scaffold — unskipped by plan 03)
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
    phase_list: [
      { name: '176-data-extraction-ir-foundation', completed: true },
      { name: '177-command-interface-+-workflow-shell', completed: true },
      { name: '178-reference-personas-+-rendering-engine', completed: false },
      { name: '179-svg-charts', completed: false },
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

// ─── Unavailable IR variant ───────────────────────────────────────────────────

const MOCK_IR_UNAVAILABLE = {
  ...MOCK_IR,
  phases:           { unavailable: true, reason: 'test sentinel' },
  requirements:     { unavailable: true, reason: 'test sentinel' },
  design_artifacts: { unavailable: true, reason: 'test sentinel' },
  decisions:        { unavailable: true, reason: 'test sentinel' },
  git_velocity:     { unavailable: true, reason: 'test sentinel' },
  cost_timing:      { unavailable: true, reason: 'test sentinel' },
};

// ─── Temp dir setup ───────────────────────────────────────────────────────────

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-181-test-'));
});

afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});

// ─── Module load guard ────────────────────────────────────────────────────────

describe('render-presentation module (cluster-a)', () => {
  it('loads without error', () => {
    expect(renderMod).not.toBeNull();
  });

  it('exports buildInvestorUpdate and buildSprintReview', () => {
    expect(typeof renderMod.buildInvestorUpdate).toBe('function');
    expect(typeof renderMod.buildSprintReview).toBe('function');
  });
});

// ─── CLU-02: buildInvestorUpdate ─────────────────────────────────────────────

describe('buildInvestorUpdate (CLU-02)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildInvestorUpdate(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it('includes vision, velocity, delivery, moat, activity, v-chart sections', () => {
    const sections = renderMod.buildInvestorUpdate(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('vision');
    expect(ids).toContain('velocity');
    expect(ids).toContain('delivery');
    expect(ids).toContain('moat');
    expect(ids).toContain('activity');
    expect(ids).toContain('v-chart');
  });

  it('velocity section contains completion percentage', () => {
    const sections = renderMod.buildInvestorUpdate(MOCK_IR);
    const velocity = sections.find(s => s.id === 'velocity');
    expect(velocity).toBeDefined();
    expect(velocity.content).toContain('%');
  });

  it('velocity section shows milestone name when present', () => {
    const sections = renderMod.buildInvestorUpdate(MOCK_IR);
    const velocity = sections.find(s => s.id === 'velocity');
    expect(velocity.content).toContain('Stakeholder Presentations');
  });

  it('handles unavailable phases gracefully', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true, reason: 'test' } };
    expect(() => renderMod.buildInvestorUpdate(ir)).not.toThrow();
    const sections = renderMod.buildInvestorUpdate(ir);
    const velocity = sections.find(s => s.id === 'velocity');
    expect(velocity.content).toContain('unavailable');
  });

  it('handles unavailable decisions gracefully', () => {
    const ir = { ...MOCK_IR, decisions: { unavailable: true, reason: 'test' } };
    expect(() => renderMod.buildInvestorUpdate(ir)).not.toThrow();
    const sections = renderMod.buildInvestorUpdate(ir);
    const moat = sections.find(s => s.id === 'moat');
    expect(moat.content).toContain('unavailable');
  });
});

// ─── CLU-03: buildSprintReview ────────────────────────────────────────────────

describe('buildSprintReview (CLU-03)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildSprintReview(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it('includes shipped, artifacts, acceptance, next, burndown sections', () => {
    const sections = renderMod.buildSprintReview(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('shipped');
    expect(ids).toContain('artifacts');
    expect(ids).toContain('acceptance');
    expect(ids).toContain('next');
    expect(ids).toContain('burndown');
  });

  it('shipped section lists completed phases', () => {
    const sections = renderMod.buildSprintReview(MOCK_IR);
    const shipped = sections.find(s => s.id === 'shipped');
    expect(shipped).toBeDefined();
    expect(shipped.content).toContain('176-data-extraction-ir-foundation');
    expect(shipped.content).toContain('177-command-interface-+-workflow-shell');
  });

  it('shipped section handles empty phase_list', () => {
    const ir = {
      ...MOCK_IR,
      phases: { ...MOCK_IR.phases, phase_list: [], completed: 3 },
    };
    expect(() => renderMod.buildSprintReview(ir)).not.toThrow();
    const sections = renderMod.buildSprintReview(ir);
    const shipped = sections.find(s => s.id === 'shipped');
    expect(shipped.content).toContain('3');
  });

  it("whats-next section shows incomplete phases", () => {
    const sections = renderMod.buildSprintReview(MOCK_IR);
    const next = sections.find(s => s.id === 'next');
    expect(next).toBeDefined();
    expect(next.content).toContain('178-reference-personas-+-rendering-engine');
  });

  it('handles unavailable phases gracefully', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true, reason: 'test' } };
    expect(() => renderMod.buildSprintReview(ir)).not.toThrow();
    const sections = renderMod.buildSprintReview(ir);
    const shipped = sections.find(s => s.id === 'shipped');
    expect(shipped.content).toContain('unavailable');
  });
});

// ─── CLU-04: buildClientDeliverable ──────────────────────────────────────────

describe('buildClientDeliverable (CLU-04)', () => {
  it('exports buildClientDeliverable', () => {
    expect(typeof renderMod.buildClientDeliverable).toBe('function');
  });

  it('returns an array of sections', () => {
    const sections = renderMod.buildClientDeliverable(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it('includes scope, features, verification, artifacts, effort sections', () => {
    const sections = renderMod.buildClientDeliverable(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('scope');
    expect(ids).toContain('features');
    expect(ids).toContain('verification');
    expect(ids).toContain('artifacts');
    expect(ids).toContain('effort');
  });

  it('verification section shows phases_verified count', () => {
    const sections = renderMod.buildClientDeliverable(MOCK_IR);
    const verSection = sections.find(s => s.id === 'verification');
    expect(verSection).toBeDefined();
    // MOCK_IR has phases_verified: 2, total_phases: 2
    expect(verSection.content).toContain('2');
    expect(verSection.content).toContain('%');
  });

  it('handles unavailable verification gracefully', () => {
    const ir = { ...MOCK_IR, verification: { unavailable: true, reason: 'test sentinel' } };
    expect(() => renderMod.buildClientDeliverable(ir)).not.toThrow();
    const sections = renderMod.buildClientDeliverable(ir);
    const verSection = sections.find(s => s.id === 'verification');
    expect(verSection.content).toContain('unavailable');
  });
});

// ─── CLU-05: buildStakeholderStatus ──────────────────────────────────────────

describe('buildStakeholderStatus (CLU-05)', () => {
  it('exports buildStakeholderStatus', () => {
    expect(typeof renderMod.buildStakeholderStatus).toBe('function');
  });

  it('returns an array of sections', () => {
    const sections = renderMod.buildStakeholderStatus(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it('includes rag, focus, blockers, risks, decisions, next-actions sections', () => {
    const sections = renderMod.buildStakeholderStatus(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('rag');
    expect(ids).toContain('focus');
    expect(ids).toContain('blockers');
    expect(ids).toContain('risks');
    expect(ids).toContain('decisions');
    expect(ids).toContain('next-actions');
  });

  it('RAG status is GREEN when >= 75% complete', () => {
    const ir = {
      ...MOCK_IR,
      phases: { ...MOCK_IR.phases, total: 10, completed: 8, phase_list: [] },
    };
    const sections = renderMod.buildStakeholderStatus(ir);
    const ragSection = sections.find(s => s.id === 'rag');
    expect(ragSection).toBeDefined();
    expect(ragSection.content).toContain('GREEN');
  });

  it('RAG status is AMBER when 40-74% complete', () => {
    const ir = {
      ...MOCK_IR,
      phases: { ...MOCK_IR.phases, total: 10, completed: 5, phase_list: [] },
    };
    const sections = renderMod.buildStakeholderStatus(ir);
    const ragSection = sections.find(s => s.id === 'rag');
    expect(ragSection).toBeDefined();
    expect(ragSection.content).toContain('AMBER');
  });

  it('RAG status is RED when < 40% complete', () => {
    const ir = {
      ...MOCK_IR,
      phases: { ...MOCK_IR.phases, total: 10, completed: 2, phase_list: [] },
    };
    const sections = renderMod.buildStakeholderStatus(ir);
    const ragSection = sections.find(s => s.id === 'rag');
    expect(ragSection).toBeDefined();
    expect(ragSection.content).toContain('RED');
  });

  it('handles unavailable phases gracefully', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true, reason: 'test sentinel' } };
    expect(() => renderMod.buildStakeholderStatus(ir)).not.toThrow();
    const sections = renderMod.buildStakeholderStatus(ir);
    const ragSection = sections.find(s => s.id === 'rag');
    expect(ragSection.content).toContain('unavailable');
  });
});

// ─── CLU-06 scaffold (unskipped by plan 03) ───────────────────────────────────

describe.skip('buildRoadmapReview (CLU-06)', () => {
  it('returns an array of sections', () => {});
  it('includes roadmap, progress, upcoming sections', () => {});
  it('handles unavailable phases gracefully', () => {});
});

// ─── CLU-07 scaffold (unskipped by plan 03) ───────────────────────────────────

describe.skip('buildTeamUpdate (CLU-07)', () => {
  it('returns an array of sections', () => {});
  it('includes shipped, blockers, decisions, next sections', () => {});
  it('handles unavailable blockers gracefully', () => {});
});

// ─── Integration: render() dispatch ──────────────────────────────────────────

describe('render() integration (CLU-02 + CLU-03 + CLU-04 + CLU-05)', () => {
  it('render() accepts investor-update persona', () => {
    const htmlPath = path.join(tmpDir, 'investor-update.html');
    const mdPath   = path.join(tmpDir, 'investor-update.md');
    expect(() => renderMod.render(MOCK_IR, 'investor-update', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('Investor Update');
    expect(html.length).toBeGreaterThan(500);
  });

  it('render() accepts sprint-review persona', () => {
    const htmlPath = path.join(tmpDir, 'sprint-review.html');
    const mdPath   = path.join(tmpDir, 'sprint-review.md');
    expect(() => renderMod.render(MOCK_IR, 'sprint-review', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('Sprint Review');
    expect(html.length).toBeGreaterThan(500);
  });

  it('render() accepts client-deliverable persona', () => {
    const htmlPath = path.join(tmpDir, 'client-deliverable.html');
    const mdPath   = path.join(tmpDir, 'client-deliverable.md');
    expect(() => renderMod.render(MOCK_IR, 'client-deliverable', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('Client Deliverable Report');
    expect(html.length).toBeGreaterThan(500);
  });

  it('render() accepts stakeholder-status persona', () => {
    const htmlPath = path.join(tmpDir, 'stakeholder-status.html');
    const mdPath   = path.join(tmpDir, 'stakeholder-status.md');
    expect(() => renderMod.render(MOCK_IR, 'stakeholder-status', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('Stakeholder Status Update');
    expect(html.length).toBeGreaterThan(500);
  });
});
