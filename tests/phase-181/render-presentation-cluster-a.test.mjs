/**
 * tests/phase-181/render-presentation-cluster-a.test.mjs
 * Unit + integration tests for Phase 181 Cluster A persona builders
 *
 * Coverage:
 *   CLU-02  buildInvestorUpdate — investor-update persona
 *   CLU-03  buildSprintReview — sprint-review persona
 *   CLU-04  buildClientDeliverable — client-deliverable persona
 *   CLU-05  buildStakeholderStatus — stakeholder-status persona
 *   CLU-06  buildProductManager — pm-view persona
 *   CLU-07  buildProjectManager — project-manager-view persona
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
    current_phase_name: 'Phase 181: Remaining Cluster A Personas',
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
    ],
  },
  output_dir: '.planning/presentations',
  output_dir_created: true,
  cross_ref_warnings: [],
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

describe('render-presentation module (Phase 181)', () => {
  it('loads without error', () => {
    expect(renderMod).not.toBeNull();
  });

  it('exports buildProductManager and buildProjectManager', () => {
    expect(typeof renderMod.buildProductManager).toBe('function');
    expect(typeof renderMod.buildProjectManager).toBe('function');
  });
});

// ─── CLU-02: buildInvestorUpdate ─────────────────────────────────────────────

describe('buildInvestorUpdate (CLU-02)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildInvestorUpdate(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it('includes vision, velocity, delivery, moat, activity sections', () => {
    const sections = renderMod.buildInvestorUpdate(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('vision');
    expect(ids).toContain('velocity');
    expect(ids).toContain('delivery');
    expect(ids).toContain('moat');
    expect(ids).toContain('activity');
  });

  it('each section has id, title, level, content', () => {
    const sections = renderMod.buildInvestorUpdate(MOCK_IR);
    for (const s of sections) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(typeof s.level).toBe('number');
      expect(typeof s.content).toBe('string');
    }
  });

  it('handles unavailable phases gracefully', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true, reason: 'STATE.md not found' } };
    const sections = renderMod.buildInvestorUpdate(ir);
    const velocitySection = sections.find(s => s.id === 'velocity');
    expect(velocitySection.content).toContain('unavailable');
  });
});

// ─── CLU-03: buildSprintReview ────────────────────────────────────────────────

describe('buildSprintReview (CLU-03)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildSprintReview(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it('includes shipped, acceptance, next, burndown sections', () => {
    const sections = renderMod.buildSprintReview(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('shipped');
    expect(ids).toContain('acceptance');
    expect(ids).toContain('next');
    expect(ids).toContain('burndown');
  });

  it('shipped section lists completed phases', () => {
    const sections = renderMod.buildSprintReview(MOCK_IR);
    const shipped = sections.find(s => s.id === 'shipped');
    expect(shipped.content).toContain('176-data-extraction-ir-foundation');
    expect(shipped.content).toContain('177-command-interface');
  });

  it('handles unavailable phases gracefully', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true, reason: 'STATE.md not found' } };
    const sections = renderMod.buildSprintReview(ir);
    const shipped = sections.find(s => s.id === 'shipped');
    expect(shipped.content).toContain('unavailable');
  });
});

// ─── CLU-04: buildClientDeliverable ──────────────────────────────────────────

describe('buildClientDeliverable (CLU-04)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildClientDeliverable(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it('includes scope, features, acceptance, verification sections', () => {
    const sections = renderMod.buildClientDeliverable(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('scope');
    expect(ids).toContain('features');
    expect(ids).toContain('acceptance');
    expect(ids).toContain('verification');
  });

  it('verification section shows phases verified stats', () => {
    const sections = renderMod.buildClientDeliverable(MOCK_IR);
    const ver = sections.find(s => s.id === 'verification');
    expect(ver.content).toContain('2/2');
  });

  it('handles unavailable verification gracefully', () => {
    const ir = { ...MOCK_IR, verification: { unavailable: true, reason: 'no data' } };
    const sections = renderMod.buildClientDeliverable(ir);
    const ver = sections.find(s => s.id === 'verification');
    expect(ver.content).toContain('unavailable');
  });
});

// ─── CLU-05: buildStakeholderStatus ──────────────────────────────────────────

describe('buildStakeholderStatus (CLU-05)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildStakeholderStatus(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it('includes rag, focus, blockers, risks, decisions sections', () => {
    const sections = renderMod.buildStakeholderStatus(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('rag');
    expect(ids).toContain('focus');
    expect(ids).toContain('blockers');
    expect(ids).toContain('risks');
    expect(ids).toContain('decisions');
  });

  it('RAG status is deterministic — RED for 22% completion', () => {
    const sections = renderMod.buildStakeholderStatus(MOCK_IR);
    const rag = sections.find(s => s.id === 'rag');
    expect(rag.content).toContain('RED');
  });

  it('RAG status is GREEN for high completion', () => {
    const ir = { ...MOCK_IR, phases: { ...MOCK_IR.phases, total: 10, completed: 8 } };
    const sections = renderMod.buildStakeholderStatus(ir);
    const rag = sections.find(s => s.id === 'rag');
    expect(rag.content).toContain('GREEN');
  });

  it('RAG status is AMBER for mid-range completion', () => {
    const ir = { ...MOCK_IR, phases: { ...MOCK_IR.phases, total: 10, completed: 5 } };
    const sections = renderMod.buildStakeholderStatus(ir);
    const rag = sections.find(s => s.id === 'rag');
    expect(rag.content).toContain('AMBER');
  });

  it('handles unavailable phases gracefully', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true, reason: 'no data' } };
    const sections = renderMod.buildStakeholderStatus(ir);
    const rag = sections.find(s => s.id === 'rag');
    expect(rag.content).toContain('unavailable');
  });
});

// ─── CLU-06: buildProductManager ─────────────────────────────────────────────

describe('buildProductManager (CLU-06)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildProductManager(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it('includes coverage, roadmap, categories, scope, decisions, effort-chart sections', () => {
    const sections = renderMod.buildProductManager(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('coverage');
    expect(ids).toContain('roadmap');
    expect(ids).toContain('categories');
    expect(ids).toContain('scope');
    expect(ids).toContain('decisions');
    expect(ids).toContain('effort-chart');
  });

  it('category breakdown shows per-category percentages', () => {
    const sections = renderMod.buildProductManager(MOCK_IR);
    const cat = sections.find(s => s.id === 'categories');
    // Rendering (3/7 = 43%), Command (4/5 = 80%)
    expect(cat.content).toContain('%');
    expect(cat.content).toContain('Rendering');
    expect(cat.content).toContain('43%');
    expect(cat.content).toContain('Command');
    expect(cat.content).toContain('80%');
  });

  it('handles empty categories gracefully', () => {
    const ir = { ...MOCK_IR, requirements: { ...MOCK_IR.requirements, categories: [] } };
    const sections = renderMod.buildProductManager(ir);
    const cat = sections.find(s => s.id === 'categories');
    expect(cat.content).toContain('No category data available');
  });

  it('handles unavailable requirements gracefully', () => {
    const ir = { ...MOCK_IR, requirements: { unavailable: true, reason: 'no data' } };
    const sections = renderMod.buildProductManager(ir);
    const coverage = sections.find(s => s.id === 'coverage');
    expect(coverage.content).toContain('unavailable');
  });

  it('handles unavailable phases gracefully for roadmap health', () => {
    const ir = { ...MOCK_IR, phases: { unavailable: true, reason: 'no data' } };
    const sections = renderMod.buildProductManager(ir);
    const roadmap = sections.find(s => s.id === 'roadmap');
    expect(roadmap.content).toContain('unavailable');
  });
});

// ─── CLU-07: buildProjectManager ─────────────────────────────────────────────

describe('buildProjectManager (CLU-07)', () => {
  it('returns an array of sections', () => {
    const sections = renderMod.buildProjectManager(MOCK_IR);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it('includes timeline, tracking, resources, risk-register, cost, timeline-chart sections', () => {
    const sections = renderMod.buildProjectManager(MOCK_IR);
    const ids = sections.map(s => s.id);
    expect(ids).toContain('timeline');
    expect(ids).toContain('tracking');
    expect(ids).toContain('resources');
    expect(ids).toContain('risk-register');
    expect(ids).toContain('cost');
    expect(ids).toContain('timeline-chart');
  });

  it('phase tracking lists all phases without truncation', () => {
    // Create IR with 15 phases to verify no .slice() truncation
    const manyPhases = Array.from({ length: 15 }, (_, i) => ({
      name: `phase-${i + 1}`,
      completed: i < 8,
    }));
    const ir = { ...MOCK_IR, phases: { ...MOCK_IR.phases, total: 15, completed: 8, phase_list: manyPhases } };
    const sections = renderMod.buildProjectManager(ir);
    const tracking = sections.find(s => s.id === 'tracking');
    // All 15 phases should appear in the content
    for (let i = 1; i <= 15; i++) {
      expect(tracking.content).toContain(`phase-${i}`);
    }
  });

  it('cost section shows duration in hours when > 120 min', () => {
    const ir = { ...MOCK_IR, cost_timing: { total_duration_min: 240, phases_with_timing: 4, avg_duration_min: 60 } };
    const sections = renderMod.buildProjectManager(ir);
    const cost = sections.find(s => s.id === 'cost');
    expect(cost.content).toContain('hours');
    expect(cost.content).toContain('4.0');
  });

  it('cost section shows minutes when <= 120', () => {
    const ir = { ...MOCK_IR, cost_timing: { total_duration_min: 90, phases_with_timing: 3, avg_duration_min: 30 } };
    const sections = renderMod.buildProjectManager(ir);
    const cost = sections.find(s => s.id === 'cost');
    expect(cost.content).toContain('90 min');
  });

  it('handles unavailable cost_timing gracefully', () => {
    const ir = { ...MOCK_IR, cost_timing: { unavailable: true, reason: 'no timing data' } };
    const sections = renderMod.buildProjectManager(ir);
    const cost = sections.find(s => s.id === 'cost');
    expect(cost.content).toContain('unavailable');
  });

  it('handles unavailable risks gracefully', () => {
    const ir = { ...MOCK_IR, risks: { unavailable: true, reason: 'no risks' } };
    const sections = renderMod.buildProjectManager(ir);
    const risks = sections.find(s => s.id === 'risk-register');
    expect(risks.content).toContain('unavailable');
  });
});

// ─── Integration: render() accepts all 6 Cluster A persona slugs ─────────────

describe('render() integration — all Cluster A personas', () => {
  it('render() accepts investor-update persona', () => {
    const htmlPath = path.join(tmpDir, 'investor-update.html');
    const mdPath = path.join(tmpDir, 'investor-update.md');
    expect(() => renderMod.render(MOCK_IR, 'investor-update', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });

  it('render() accepts sprint-review persona', () => {
    const htmlPath = path.join(tmpDir, 'sprint-review.html');
    const mdPath = path.join(tmpDir, 'sprint-review.md');
    expect(() => renderMod.render(MOCK_IR, 'sprint-review', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });

  it('render() accepts client-deliverable persona', () => {
    const htmlPath = path.join(tmpDir, 'client-deliverable.html');
    const mdPath = path.join(tmpDir, 'client-deliverable.md');
    expect(() => renderMod.render(MOCK_IR, 'client-deliverable', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });

  it('render() accepts stakeholder-status persona', () => {
    const htmlPath = path.join(tmpDir, 'stakeholder-status.html');
    const mdPath = path.join(tmpDir, 'stakeholder-status.md');
    expect(() => renderMod.render(MOCK_IR, 'stakeholder-status', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });

  it('render() accepts pm-view persona', () => {
    const htmlPath = path.join(tmpDir, 'pm-view.html');
    const mdPath = path.join(tmpDir, 'pm-view.md');
    expect(() => renderMod.render(MOCK_IR, 'pm-view', htmlPath, mdPath)).not.toThrow();
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);
  });

  it('render() accepts project-manager-view persona', () => {
    const htmlPath = path.join(tmpDir, 'project-manager-view.html');
    const mdPath = path.join(tmpDir, 'project-manager-view.md');
    expect(() => renderMod.render(MOCK_IR, 'project-manager-view', htmlPath, mdPath)).not.toThrow();
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
