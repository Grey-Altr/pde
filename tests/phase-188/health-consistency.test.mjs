/**
 * tests/phase-188/health-consistency.test.mjs
 * Unit tests for pde-tools health consistency subcommand
 *
 * Coverage:
 *   - Returns structured JSON with version, passed, mismatches, warnings fields
 *   - Falls back to STATE.md milestone when no version provided
 *   - Returns structured error (not throw) for unknown version
 *   - Detects requirement_not_checked mismatch when ROADMAP phase is [x] but REQUIREMENTS has [ ]
 *   - Returns passed: true with empty mismatches for clean state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const REPO_ROOT = path.resolve(__dirname, '../..');
const verify = require('../../bin/lib/verify.cjs');

// Helper: capture output from cmdHealthConsistency (it calls output() which writes to stdout)
function captureOutput(fn) {
  const chunks = [];
  const origWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => {
    chunks.push(chunk);
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = origWrite;
  }
  const raw = chunks.join('');
  // output() with raw=true emits JSON; without raw it may emit formatted text
  // We call with raw=true so we get clean JSON
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

describe('cmdHealthConsistency', () => {
  it('is exported from bin/lib/verify.cjs', () => {
    expect(typeof verify.cmdHealthConsistency).toBe('function');
  });

  it('Test 1: returns structured JSON with version, passed, mismatches, warnings fields for v0.22', () => {
    const result = captureOutput(() => {
      verify.cmdHealthConsistency(REPO_ROOT, 'v0.22', true);
    });

    expect(result).toBeTypeOf('object');
    expect(result).toHaveProperty('version', 'v0.22');
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('mismatches');
    expect(result).toHaveProperty('warnings');
    expect(Array.isArray(result.mismatches)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('Test 2: falls back to STATE.md milestone when no version argument provided', () => {
    const result = captureOutput(() => {
      verify.cmdHealthConsistency(REPO_ROOT, undefined, true);
    });

    // STATE.md milestone is v0.23, so the result should reference that version
    // or return a structured error if v0.23 milestone files don't exist yet
    expect(result).toBeTypeOf('object');
    // Should not throw — must return a structured response
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('passed');
    // The version should be what STATE.md says (v0.23) or an error about missing files
    // Either way it must be a real version string from STATE.md, not undefined
    expect(result.version).toBeTruthy();
  });

  it('Test 3: returns structured error object for unknown version (v99.99), does not throw', () => {
    let threw = false;
    let result;
    try {
      result = captureOutput(() => {
        verify.cmdHealthConsistency(REPO_ROOT, 'v99.99', true);
      });
    } catch (e) {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeTypeOf('object');
    expect(result).toHaveProperty('passed', false);
    // Should have an error field or mismatches indicating file not found
    const hasError = result.error || (result.mismatches && result.mismatches.length > 0) || result.warnings;
    expect(hasError).toBeTruthy();
  });

  describe('Test 4: mismatch detection with fabricated fixture files', () => {
    let tmpDir;

    beforeEach(() => {
      // Create temp directory mimicking .planning structure
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-health-test-'));
      const milestonesDir = path.join(tmpDir, '.planning', 'milestones');
      fs.mkdirSync(milestonesDir, { recursive: true });

      // REQUIREMENTS.md: EXT-01 is UNCHECKED ([ ]) — should be checked since phase is complete
      const reqContent = `# Requirements Archive: v0.99 Test

## v1 Requirements

### Data Extraction

- [ ] **EXT-01**: System can extract project data *(Phase 176, 176-01-PLAN)*
- [x] **EXT-02**: System can extract phase data *(Phase 177, 177-01-PLAN)*
`;
      fs.writeFileSync(path.join(milestonesDir, 'v0.99-REQUIREMENTS.md'), reqContent);

      // ROADMAP.md: Phase 176 is marked [x] complete (but EXT-01 is unchecked above)
      const roadmapContent = `# Roadmap: Test Project

## Phases

- [x] **Phase 176: Data Extraction** — completed 2026-01-01
- [x] **Phase 177: Phase Data** — completed 2026-01-02
`;
      fs.writeFileSync(path.join(milestonesDir, 'v0.99-ROADMAP.md'), roadmapContent);
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('reports requirement_not_checked mismatch when ROADMAP phase is [x] but requirement is [ ]', () => {
      const result = captureOutput(() => {
        verify.cmdHealthConsistency(tmpDir, 'v0.99', true);
      });

      expect(result).toBeTypeOf('object');
      expect(result).toHaveProperty('version', 'v0.99');
      expect(result).toHaveProperty('passed', false);
      expect(Array.isArray(result.mismatches)).toBe(true);
      expect(result.mismatches.length).toBeGreaterThan(0);

      // Should report EXT-01 as requirement_not_checked
      const mismatch = result.mismatches.find(m => m.requirement_id === 'EXT-01');
      expect(mismatch).toBeDefined();
      expect(mismatch.type).toBe('requirement_not_checked');
      expect(mismatch.expected_state).toBe('checked');
      expect(mismatch.actual_state).toBe('unchecked');
      expect(mismatch.file).toContain('REQUIREMENTS.md');
    });
  });

  describe('Test 5: clean state returns passed: true', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-health-clean-'));
      const milestonesDir = path.join(tmpDir, '.planning', 'milestones');
      fs.mkdirSync(milestonesDir, { recursive: true });

      // REQUIREMENTS.md: all requirements are checked
      const reqContent = `# Requirements Archive: v0.98 Clean

## v1 Requirements

### Data Extraction

- [x] **EXT-01**: System can extract project data *(Phase 176, 176-01-PLAN)*
- [x] **EXT-02**: System can extract phase data *(Phase 177, 177-01-PLAN)*
`;
      fs.writeFileSync(path.join(milestonesDir, 'v0.98-REQUIREMENTS.md'), reqContent);

      // ROADMAP.md: all phases are complete — matches checked requirements
      const roadmapContent = `# Roadmap: Test Project

## Phases

- [x] **Phase 176: Data Extraction** — completed 2026-01-01
- [x] **Phase 177: Phase Data** — completed 2026-01-02
`;
      fs.writeFileSync(path.join(milestonesDir, 'v0.98-ROADMAP.md'), roadmapContent);
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns passed: true with empty mismatches array when all artifacts agree', () => {
      const result = captureOutput(() => {
        verify.cmdHealthConsistency(tmpDir, 'v0.98', true);
      });

      expect(result).toBeTypeOf('object');
      expect(result).toHaveProperty('version', 'v0.98');
      expect(result).toHaveProperty('passed', true);
      expect(Array.isArray(result.mismatches)).toBe(true);
      expect(result.mismatches).toHaveLength(0);
    });
  });
});
