/**
 * pipeline-iterate-experiments.test.mjs — Phase 113 Nyquist Coverage
 *
 * Validates pipeline experiment templates (PIPE-01 through PIPE-04).
 *
 * Covers:
 *   PIPE-01: Pipeline templates exist and pass schema validation
 *   PIPE-02: Pipeline templates use pipeline-brief-wireframe-metric.cjs (dom-metric.cjs as terminal)
 *   PIPE-03: Upstream isolation templates target different upstream skills for attribution
 *   PIPE-04: Pipeline metric wrapper chains multi-stage invocation
 *
 * Run: node --test tests/phase-113/pipeline-iterate-experiments.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { parseExperimentFile } = require('../../bin/lib/experiment-schema.cjs');

// ─── ROOT path (decoded — handles spaces in project directory name) ───────────

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// ─── Pipeline templates ───────────────────────────────────────────────────────

const PIPELINE_TEMPLATES = [
  'pipeline-brief-to-wireframe.md',
  'pipeline-upstream-isolation.md',
];

// ─── PIPE-01/04: Templates exist and validate ─────────────────────────────────

describe('PIPE-01/04: pipeline templates exist and validate', () => {
  for (const name of PIPELINE_TEMPLATES) {
    const fullPath = path.join(ROOT, 'references', 'experiments', name);
    let result;

    it(`references/experiments/${name} exists`, () => {
      assert.ok(
        fs.existsSync(fullPath),
        `references/experiments/${name} must exist`
      );
    });

    it(`references/experiments/${name} passes parseExperimentFile() validation`, () => {
      result = parseExperimentFile(fullPath);
      assert.equal(result.valid, true, `${name} must be valid: ${JSON.stringify(result.errors || [])}`);
    });

    it(`references/experiments/${name} verify starts with 'node bin/'`, () => {
      result = parseExperimentFile(fullPath);
      assert.ok(
        result.verify.startsWith('node bin/'),
        `${name} verify must start with 'node bin/', got: "${result.verify}"`
      );
    });

    it(`references/experiments/${name} direction is max`, () => {
      result = parseExperimentFile(fullPath);
      assert.equal(result.direction, 'max', `${name} direction must be 'max'`);
    });

    it(`references/experiments/${name} mutable_files start with 'workflows/'`, () => {
      result = parseExperimentFile(fullPath);
      for (const entry of result.mutable_files) {
        assert.ok(
          entry.startsWith('workflows/'),
          `${name} mutable_files entry "${entry}" must start with 'workflows/'`
        );
      }
    });
  }
});

// ─── PIPE-02: Pipeline templates use pipeline-brief-wireframe-metric.cjs ──────

describe('PIPE-02: pipeline templates use dom-metric.cjs as terminal metric', () => {
  for (const name of PIPELINE_TEMPLATES) {
    it(`references/experiments/${name} verify command uses pipeline-brief-wireframe-metric.cjs`, () => {
      const content = fs.readFileSync(
        path.join(ROOT, 'references', 'experiments', name),
        'utf-8'
      );
      assert.ok(
        content.includes('pipeline-brief-wireframe-metric.cjs'),
        `${name} verify must use pipeline-brief-wireframe-metric.cjs`
      );
    });
  }
});

// ─── PIPE-03: Upstream isolation targets different skills ─────────────────────

describe('PIPE-03: upstream isolation templates target different upstream skills', () => {
  it('pipeline-brief-to-wireframe.md targets workflows/brief.md', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'references', 'experiments', 'pipeline-brief-to-wireframe.md'),
      'utf-8'
    );
    assert.ok(
      content.includes('workflows/brief.md'),
      'pipeline-brief-to-wireframe.md must target workflows/brief.md'
    );
  });

  it('pipeline-upstream-isolation.md targets workflows/system.md', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'references', 'experiments', 'pipeline-upstream-isolation.md'),
      'utf-8'
    );
    assert.ok(
      content.includes('workflows/system.md'),
      'pipeline-upstream-isolation.md must target workflows/system.md'
    );
  });

  it('both templates use the same terminal metric for comparable results', () => {
    const r1 = parseExperimentFile(
      path.join(ROOT, 'references', 'experiments', 'pipeline-brief-to-wireframe.md')
    );
    const r2 = parseExperimentFile(
      path.join(ROOT, 'references', 'experiments', 'pipeline-upstream-isolation.md')
    );
    assert.ok(r1.valid, 'pipeline-brief-to-wireframe.md must be valid');
    assert.ok(r2.valid, 'pipeline-upstream-isolation.md must be valid');
    assert.equal(r1.metric, r2.metric, 'both templates must use the same metric for comparable results');
  });
});

// ─── PIPE-04: Wrapper chains multi-stage invocation ──────────────────────────

describe('PIPE-04: pipeline metric wrapper chains multi-stage invocation', () => {
  const wrapperPath = path.join(ROOT, 'bin', 'pipeline-brief-wireframe-metric.cjs');

  it('bin/pipeline-brief-wireframe-metric.cjs exists', () => {
    assert.ok(
      fs.existsSync(wrapperPath),
      'bin/pipeline-brief-wireframe-metric.cjs must exist'
    );
  });

  it('bin/pipeline-brief-wireframe-metric.cjs outputs numeric with fixture arg', () => {
    const fixturePath = path.join(ROOT, 'references', 'experiments', 'fixtures', 'good-wireframe.html');
    const proc = spawnSync(
      'node',
      [wrapperPath, fixturePath],
      { encoding: 'utf-8', timeout: 15000 }
    );
    assert.equal(proc.status, 0, 'wrapper must exit 0 with fixture arg');
    const lines = proc.stdout.split('\n').filter(l => l.trim() !== '');
    assert.ok(lines.length > 0, 'wrapper must produce stdout output');
    const lastLine = lines[lines.length - 1];
    const score = parseFloat(lastLine);
    assert.ok(!isNaN(score), `last stdout line must be a parseable number, got: "${lastLine}"`);
  });

  it('bin/pipeline-brief-wireframe-metric.cjs outputs 0 with no args (graceful degradation)', () => {
    const proc = spawnSync(
      'node',
      [wrapperPath],
      { encoding: 'utf-8', timeout: 15000 }
    );
    assert.equal(proc.status, 0, 'wrapper must exit 0 with no args');
    const lines = proc.stdout.split('\n').filter(l => l.trim() !== '');
    assert.ok(lines.length > 0, 'wrapper must produce stdout output with no args');
    const lastLine = lines[lines.length - 1];
    assert.equal(lastLine.trim(), '0', 'wrapper must output 0 with no args');
  });

  it('bin/pipeline-brief-wireframe-metric.cjs contains multi-stage structure (Stage 1, Stage 2)', () => {
    const content = fs.readFileSync(wrapperPath, 'utf-8');
    assert.ok(
      content.includes('Stage 1') && content.includes('Stage 2'),
      'wrapper must contain Stage 1 and Stage 2 comments'
    );
  });

  const PROTECTED_PREFIXES = ['bin/', 'tests/', 'references/', '.planning/', 'agents/', '.claude/'];

  for (const name of PIPELINE_TEMPLATES) {
    it(`references/experiments/${name} mutable_files do not target protected directories`, () => {
      const fullPath = path.join(ROOT, 'references', 'experiments', name);
      const result = parseExperimentFile(fullPath);
      assert.ok(result.valid, `${name} must be valid first`);
      for (const entry of result.mutable_files) {
        for (const prefix of PROTECTED_PREFIXES) {
          assert.ok(
            !entry.startsWith(prefix),
            `${name} mutable_files entry "${entry}" must not target protected prefix "${prefix}"`
          );
        }
      }
    });
  }
});

// ITER-01..04 tests added by 113-02-PLAN.md
