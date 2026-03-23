/**
 * Phase 105: Researcher Empirical Mode — Structural Tests
 *
 * Verifies that:
 * 1. agents/pde-phase-researcher.md exists with --empirical flag support
 * 2. workflows/research-phase.md has empirical mode routing
 *
 * Requirements: RSRCH-01, RSRCH-02, RSRCH-03
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../', import.meta.url).pathname.replace(/\/$/, ''));

// ─── Agent File ───────────────────────────────────────────────────────────────

describe('RSRCH-01: pde-phase-researcher agent empirical mode', () => {
  const agentPath = join(ROOT, 'agents/pde-phase-researcher.md');

  it('agents/pde-phase-researcher.md exists', () => {
    assert.ok(existsSync(agentPath), `Missing file: ${agentPath}`);
  });

  it('file contains agent name "pde-phase-researcher"', () => {
    const content = readFileSync(agentPath, 'utf8');
    assert.ok(
      content.includes('pde-phase-researcher'),
      'Expected name: pde-phase-researcher in agent file'
    );
  });

  it('file contains --empirical flag documentation (RSRCH-01)', () => {
    const content = readFileSync(agentPath, 'utf8');
    assert.ok(
      content.includes('--empirical'),
      'Expected --empirical flag documented in agent file'
    );
  });

  it('file contains try_candidates return field (RSRCH-01)', () => {
    const content = readFileSync(agentPath, 'utf8');
    assert.ok(
      content.includes('try_candidates'),
      'Expected try_candidates field in empirical return format'
    );
  });

  it('file contains Experiments Attempted section reference (RSRCH-03)', () => {
    const content = readFileSync(agentPath, 'utf8');
    assert.ok(
      content.includes('Experiments Attempted'),
      'Expected "Experiments Attempted" section in empirical RESEARCH.md template'
    );
  });

  it('file contains RESEARCH_COMPLETE status return', () => {
    const content = readFileSync(agentPath, 'utf8');
    assert.ok(
      content.includes('RESEARCH_COMPLETE'),
      'Expected RESEARCH_COMPLETE status in return format'
    );
  });

  it('file contains mutable_files candidate field', () => {
    const content = readFileSync(agentPath, 'utf8');
    assert.ok(
      content.includes('mutable_files'),
      'Expected mutable_files field in try_candidates structure'
    );
  });

  it('file contains confidence levels (HIGH/MEDIUM/LOW)', () => {
    const content = readFileSync(agentPath, 'utf8');
    assert.ok(
      content.includes('confidence'),
      'Expected confidence field in candidate structure'
    );
    const hasLevel = content.includes('HIGH') || content.includes('MEDIUM') || content.includes('LOW');
    assert.ok(hasLevel, 'Expected HIGH/MEDIUM/LOW confidence values documented');
  });

  it('empirical mode is described as additive (desk research preserved)', () => {
    const content = readFileSync(agentPath, 'utf8');
    const hasAdditive = content.includes('additive') || content.includes('PLUS') || content.includes('standard mode PLUS');
    assert.ok(hasAdditive, 'Expected empirical mode described as additive (not replacing) desk research');
  });
});

// ─── Research-Phase Workflow ───────────────────────────────────────────────────

describe('RSRCH-02: research-phase.md empirical mode routing', () => {
  const workflowPath = join(ROOT, 'workflows/research-phase.md');

  it('workflows/research-phase.md exists', () => {
    assert.ok(existsSync(workflowPath), `Missing file: ${workflowPath}`);
  });

  it('file contains empirical mode keyword routing logic (RSRCH-02)', () => {
    const content = readFileSync(workflowPath, 'utf8');
    assert.ok(
      content.includes('empirical'),
      'Expected empirical mode routing logic in research-phase.md'
    );
  });

  it('file contains "optimize" as keyword trigger', () => {
    const content = readFileSync(workflowPath, 'utf8');
    assert.ok(
      content.includes('optimize'),
      'Expected "optimize" as an empirical mode keyword trigger'
    );
  });

  it('file contains "experiment" as keyword trigger', () => {
    const content = readFileSync(workflowPath, 'utf8');
    assert.ok(
      content.includes('experiment'),
      'Expected "experiment" as an empirical mode keyword trigger'
    );
  });

  it('file contains "benchmark" as keyword trigger', () => {
    const content = readFileSync(workflowPath, 'utf8');
    assert.ok(
      content.includes('benchmark'),
      'Expected "benchmark" as an empirical mode keyword trigger'
    );
  });

  it('file contains "metric" as keyword trigger', () => {
    const content = readFileSync(workflowPath, 'utf8');
    assert.ok(
      content.includes('metric'),
      'Expected "metric" as an empirical mode keyword trigger'
    );
  });

  it('file contains --empirical flag pass-through to spawn', () => {
    const content = readFileSync(workflowPath, 'utf8');
    assert.ok(
      content.includes('--empirical'),
      'Expected --empirical flag passed to researcher spawn when empirical mode detected'
    );
  });

  it('file contains Experiments Attempted section reference (RSRCH-03)', () => {
    const content = readFileSync(workflowPath, 'utf8');
    assert.ok(
      content.includes('Experiments Attempted'),
      'Expected "Experiments Attempted" section requirement in empirical mode instructions'
    );
  });

  it('file still spawns pde-phase-researcher (original agent preserved)', () => {
    const content = readFileSync(workflowPath, 'utf8');
    assert.ok(
      content.includes('pde-phase-researcher'),
      'Expected pde-phase-researcher still used as subagent_type'
    );
  });

  it('file reads CONTEXT.md for keyword detection', () => {
    const content = readFileSync(workflowPath, 'utf8');
    assert.ok(
      content.includes('CONTEXT.md'),
      'Expected CONTEXT.md to be read for empirical keyword detection'
    );
  });

  it('file requires 2 or more keyword matches for empirical mode activation', () => {
    const content = readFileSync(workflowPath, 'utf8');
    const hasThreshold = content.includes('2 or more') || content.includes('two or more') || content.includes('2+');
    assert.ok(hasThreshold, 'Expected "2 or more" keyword match threshold documented');
  });
});

// ─── Integration: Agent + Workflow ────────────────────────────────────────────

describe('RSRCH integration: agent and workflow are consistent', () => {
  it('both agent and workflow reference try_candidates', () => {
    const agent = readFileSync(join(ROOT, 'agents/pde-phase-researcher.md'), 'utf8');
    const workflow = readFileSync(join(ROOT, 'workflows/research-phase.md'), 'utf8');
    assert.ok(agent.includes('try_candidates'), 'Agent must define try_candidates return');
    // Workflow may reference try_candidates or the empirical return JSON
    const workflowHasCandidates = workflow.includes('try_candidates') || workflow.includes('candidates');
    assert.ok(workflowHasCandidates, 'Workflow must reference candidate extraction');
  });

  it('both agent and workflow reference Experiments Attempted', () => {
    const agent = readFileSync(join(ROOT, 'agents/pde-phase-researcher.md'), 'utf8');
    const workflow = readFileSync(join(ROOT, 'workflows/research-phase.md'), 'utf8');
    assert.ok(agent.includes('Experiments Attempted'), 'Agent must include Experiments Attempted template');
    assert.ok(workflow.includes('Experiments Attempted'), 'Workflow must reference Experiments Attempted section');
  });
});
