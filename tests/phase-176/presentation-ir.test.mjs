/**
 * tests/phase-176/presentation-ir.test.mjs
 * Tests for bin/lib/presentation.cjs (EXT-01 through EXT-04)
 *
 * Each extractor returns structured data from its source file,
 * or an { unavailable: true, reason } sentinel when the file is missing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);

// ─── Load module under test ──────────────────────────────────────────────────

let extractProjectIdentity;
let extractPhaseCompletion;
let extractRequirements;
let extractDesignArtifacts;

try {
  ({
    extractProjectIdentity,
    extractPhaseCompletion,
    extractRequirements,
    extractDesignArtifacts,
  } = require('../../bin/lib/presentation.cjs'));
} catch (err) {
  extractProjectIdentity = null;
  extractPhaseCompletion = null;
  extractRequirements = null;
  extractDesignArtifacts = null;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PROJECT_MD_FIXTURE = `# My Test Platform

A platform that helps users ship products.

## Core Value

Any user can go from idea to shipped product through a single platform.

## Goal

Ship great products faster.

## What This Is

A full professional product design and development platform.
`;

const STATE_MD_FIXTURE = `---
gsd_state_version: 1.0
milestone: v0.22
milestone_name: Stakeholder Presentations
status: In Progress
stopped_at: Phase 176
last_updated: "2026-03-29T22:00:00.000Z"
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 14
  completed_plans: 6
---

# Project State

## Current Position

Phase: 176 of 184 (Data Extraction IR Foundation)
Plan: 01
Status: In Progress
`;

const ROADMAP_MD_FIXTURE = `# Roadmap

### v0.22 Stakeholder Presentations (In Progress)

- [x] Phase 176: Data Extraction IR Foundation
- [x] Phase 177: Command Interface
- [ ] Phase 178: Reference Personas
- [ ] Phase 179: SVG Charts
- [ ] Phase 180: Claim Verification
- [ ] Phase 181: Cluster A Personas
- [ ] Phase 182: Cluster B Personas
- [ ] Phase 183: Auto-Generation
- [ ] Phase 184: Portfolio Synthesis
`;

const REQUIREMENTS_MD_FIXTURE = `# Requirements: PDE v0.22

## v1 Requirements

### Data Extraction

- [x] **EXT-01**: Extract project identity
- [x] **EXT-02**: Extract phase completion
- [ ] **EXT-03**: Extract requirements coverage
- [ ] **EXT-04**: Extract design artifacts

### Rendering & Output

- [x] **RND-01**: Generate HTML output
- [ ] **RND-02**: Generate Markdown output
- [ ] **RND-03**: Table of contents

## Future Requirements

- [ ] **FUT-01**: Future feature (should not be counted)
`;

const DESIGN_MANIFEST_FIXTURE = JSON.stringify({
  version: 1,
  productType: 'software',
  tokens: { colorPrimary: '#0070f3', spacing: '8px' },
  artifacts: [
    { id: 'wfr-001', type: 'wireframe', path: 'design/wireframes/home.svg' },
    { id: 'mck-001', type: 'mockup', path: 'design/mockups/home.html' },
    { id: 'flw-001', type: 'flow', path: 'design/flows.md' },
  ],
}, null, 2);

// ─── Helper: create a temp project dir ──────────────────────────────────────

function makeTmpProject() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-ir-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.mkdirSync(designDir, { recursive: true });
  return { tmpDir, planningDir, designDir };
}

// ─── EXT-01: extractProjectIdentity ─────────────────────────────────────────

describe('project identity', () => {
  it('returns name, goal, core_value, product_type, summary when PROJECT.md exists', () => {
    const { tmpDir, planningDir, designDir } = makeTmpProject();
    try {
      fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), PROJECT_MD_FIXTURE);
      fs.writeFileSync(
        path.join(designDir, 'design-manifest.json'),
        DESIGN_MANIFEST_FIXTURE
      );

      const result = extractProjectIdentity(tmpDir);

      expect(result).toBeDefined();
      expect(result.unavailable).toBeUndefined();
      expect(result.name).toBe('My Test Platform');
      expect(result.core_value).toContain('idea to shipped product');
      expect(result.product_type).toBe('software');
      expect(result.summary).toBeTruthy();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns unavailable sentinel when PROJECT.md is missing', () => {
    const { tmpDir } = makeTmpProject();
    try {
      const result = extractProjectIdentity(tmpDir);

      expect(result).toBeDefined();
      expect(result.unavailable).toBe(true);
      expect(result.reason).toBeTruthy();
      expect(result.reason).toMatch(/PROJECT\.md/i);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns product_type as unknown when design-manifest.json is missing', () => {
    const { tmpDir, planningDir } = makeTmpProject();
    try {
      fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), PROJECT_MD_FIXTURE);

      const result = extractProjectIdentity(tmpDir);

      expect(result.unavailable).toBeUndefined();
      expect(result.product_type).toBe('unknown');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─── EXT-02: extractPhaseCompletion ──────────────────────────────────────────

describe('phase completion', () => {
  it('returns total, completed, progress_percent from STATE.md and ROADMAP.md', () => {
    const { tmpDir, planningDir } = makeTmpProject();
    try {
      fs.writeFileSync(path.join(planningDir, 'STATE.md'), STATE_MD_FIXTURE);
      fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), ROADMAP_MD_FIXTURE);

      const result = extractPhaseCompletion(tmpDir);

      expect(result).toBeDefined();
      expect(result.unavailable).toBeUndefined();
      expect(result.total).toBe(9);
      expect(result.completed).toBe(2);
      expect(result.plans_total).toBe(14);
      expect(result.plans_completed).toBe(6);
      expect(result.milestone).toBe('v0.22');
      expect(result.milestone_name).toBe('Stakeholder Presentations');
      expect(typeof result.progress_percent).toBe('number');
      expect(result.progress_percent).toBeGreaterThanOrEqual(0);
      expect(result.progress_percent).toBeLessThanOrEqual(100);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns unavailable sentinel when STATE.md is missing', () => {
    const { tmpDir } = makeTmpProject();
    try {
      const result = extractPhaseCompletion(tmpDir);

      expect(result).toBeDefined();
      expect(result.unavailable).toBe(true);
      expect(result.reason).toBeTruthy();
      expect(result.reason).toMatch(/STATE\.md/i);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('includes current_phase and current_phase_name from STATE.md body', () => {
    const { tmpDir, planningDir } = makeTmpProject();
    try {
      fs.writeFileSync(path.join(planningDir, 'STATE.md'), STATE_MD_FIXTURE);
      fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), ROADMAP_MD_FIXTURE);

      const result = extractPhaseCompletion(tmpDir);

      expect(result.current_phase).toBe('176');
      expect(result.current_phase_name).toBeTruthy();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─── EXT-03: extractRequirements ─────────────────────────────────────────────

describe('requirements', () => {
  it('returns total, completed, pending from REQUIREMENTS.md v1 Requirements section', () => {
    const { tmpDir, planningDir } = makeTmpProject();
    try {
      fs.writeFileSync(path.join(planningDir, 'REQUIREMENTS.md'), REQUIREMENTS_MD_FIXTURE);

      const result = extractRequirements(tmpDir);

      expect(result).toBeDefined();
      expect(result.unavailable).toBeUndefined();
      // Data Extraction: 2 checked (EXT-01, EXT-02), 2 unchecked (EXT-03, EXT-04)
      // Rendering & Output: 1 checked (RND-01), 2 unchecked (RND-02, RND-03)
      // Total v1 = 7, completed = 3
      expect(result.total).toBe(7);
      expect(result.completed).toBe(3);
      expect(result.pending).toBe(4);
      expect(result.blocked).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('includes per-category breakdown', () => {
    const { tmpDir, planningDir } = makeTmpProject();
    try {
      fs.writeFileSync(path.join(planningDir, 'REQUIREMENTS.md'), REQUIREMENTS_MD_FIXTURE);

      const result = extractRequirements(tmpDir);

      expect(result.categories).toBeDefined();
      expect(result.categories['Data Extraction']).toBeDefined();
      expect(result.categories['Data Extraction'].total).toBe(4);
      expect(result.categories['Data Extraction'].completed).toBe(2);
      expect(result.categories['Rendering & Output']).toBeDefined();
      expect(result.categories['Rendering & Output'].total).toBe(3);
      expect(result.categories['Rendering & Output'].completed).toBe(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('excludes Future Requirements section from counts', () => {
    const { tmpDir, planningDir } = makeTmpProject();
    try {
      fs.writeFileSync(path.join(planningDir, 'REQUIREMENTS.md'), REQUIREMENTS_MD_FIXTURE);

      const result = extractRequirements(tmpDir);

      // FUT-01 from Future Requirements should not be counted
      expect(result.total).toBe(7);
      expect(result.categories['Future Requirements']).toBeUndefined();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns unavailable sentinel when REQUIREMENTS.md is missing', () => {
    const { tmpDir } = makeTmpProject();
    try {
      const result = extractRequirements(tmpDir);

      expect(result).toBeDefined();
      expect(result.unavailable).toBe(true);
      expect(result.reason).toBeTruthy();
      expect(result.reason).toMatch(/REQUIREMENTS\.md/i);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─── EXT-04: extractDesignArtifacts ──────────────────────────────────────────

describe('design artifacts', () => {
  it('returns artifact_count, types_covered, has_tokens, has_wireframes, has_mockups from design-manifest.json', () => {
    const { tmpDir, planningDir, designDir } = makeTmpProject();
    try {
      fs.writeFileSync(
        path.join(designDir, 'design-manifest.json'),
        DESIGN_MANIFEST_FIXTURE
      );

      const result = extractDesignArtifacts(tmpDir);

      expect(result).toBeDefined();
      expect(result.unavailable).toBeUndefined();
      expect(result.available).toBe(true);
      expect(result.artifact_count).toBe(3);
      expect(result.has_tokens).toBe(true);
      expect(result.has_wireframes).toBe(true);
      expect(result.has_mockups).toBe(true);
      expect(Array.isArray(result.types_covered)).toBe(true);
      expect(result.types_covered).toContain('wireframe');
      expect(result.types_covered).toContain('mockup');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns unavailable sentinel when design-manifest.json is missing', () => {
    const { tmpDir } = makeTmpProject();
    try {
      const result = extractDesignArtifacts(tmpDir);

      expect(result).toBeDefined();
      expect(result.unavailable).toBe(true);
      expect(result.reason).toBeTruthy();
      expect(result.reason).toMatch(/design-manifest\.json/i);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('handles manifest with no artifacts gracefully', () => {
    const { tmpDir, planningDir, designDir } = makeTmpProject();
    try {
      const emptyManifest = JSON.stringify({ version: 1, productType: 'software', artifacts: [] }, null, 2);
      fs.writeFileSync(path.join(designDir, 'design-manifest.json'), emptyManifest);

      const result = extractDesignArtifacts(tmpDir);

      expect(result.unavailable).toBeUndefined();
      expect(result.available).toBe(true);
      expect(result.artifact_count).toBe(0);
      expect(result.has_tokens).toBe(false);
      expect(result.has_wireframes).toBe(false);
      expect(result.has_mockups).toBe(false);
      expect(result.types_covered).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns unavailable sentinel when manifest JSON is malformed', () => {
    const { tmpDir, planningDir, designDir } = makeTmpProject();
    try {
      fs.writeFileSync(path.join(designDir, 'design-manifest.json'), '{ invalid json }');

      const result = extractDesignArtifacts(tmpDir);

      expect(result).toBeDefined();
      expect(result.unavailable).toBe(true);
      expect(result.reason).toBeTruthy();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
