/**
 * experiment-templates.test.mjs — Phase 112 Nyquist Coverage
 *
 * Validates that all 14 experiment templates exist in references/experiments/
 * and conform to the experiment-schema.cjs contract.
 *
 * Covers:
 *   EXP-10: Non-browser skills have experiment templates using nyquist-metric.cjs
 *   EXP-11: Every template validates against experiment-schema.cjs
 *   EXP-12: All eligible design skill workflows have at least one experiment template
 *
 * Run: node --test tests/phase-112/experiment-templates.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseExperimentFile } = require('../../bin/lib/experiment-schema.cjs');

// ─── ROOT path (decoded — handles spaces in project directory name) ───────────

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// ─── Expected templates ───────────────────────────────────────────────────────

const EXPECTED_TEMPLATES = [
  'wireframe.md', 'mockup.md', 'system.md', 'flows.md',
  'critique.md', 'hig.md', 'iterate.md', 'handoff.md',
  'brief.md', 'recommend.md', 'competitive.md',
  'opportunity.md', 'ideate.md', 'deploy.md',
];
// All 14 experiment-eligible design skill workflows from experiment-boundaries.md

// ─── EXP-12: All templates exist ─────────────────────────────────────────────

describe('EXP-12: all 14 design skill experiment templates exist', () => {
  for (const name of EXPECTED_TEMPLATES) {
    it(`references/experiments/${name} exists`, () => {
      const fullPath = path.join(ROOT, 'references', 'experiments', name);
      assert.ok(
        fs.existsSync(fullPath),
        `references/experiments/${name} must exist`
      );
    });
  }
});

// ─── EXP-11: Schema validation ────────────────────────────────────────────────

describe('EXP-11: each template validates against experiment-schema.cjs', () => {
  for (const name of EXPECTED_TEMPLATES) {
    it(`references/experiments/${name} passes parseExperimentFile() validation`, () => {
      const fullPath = path.join(ROOT, 'references', 'experiments', name);
      const result = parseExperimentFile(fullPath);
      assert.equal(result.valid, true, `${name} must be valid: ${JSON.stringify(result.errors || [])}`);
    });

    it(`references/experiments/${name} has non-empty metric field`, () => {
      const fullPath = path.join(ROOT, 'references', 'experiments', name);
      const result = parseExperimentFile(fullPath);
      assert.ok(result.valid, `${name} must be valid first`);
      assert.ok(typeof result.metric === 'string' && result.metric.length > 0, `${name} metric must be non-empty string`);
    });

    it(`references/experiments/${name} has direction: max`, () => {
      const fullPath = path.join(ROOT, 'references', 'experiments', name);
      const result = parseExperimentFile(fullPath);
      assert.ok(result.valid, `${name} must be valid first`);
      assert.equal(result.direction, 'max', `${name} direction must be 'max'`);
    });

    it(`references/experiments/${name} verify starts with 'node bin/'`, () => {
      const fullPath = path.join(ROOT, 'references', 'experiments', name);
      const result = parseExperimentFile(fullPath);
      assert.ok(result.valid, `${name} must be valid first`);
      assert.ok(
        result.verify.startsWith('node bin/'),
        `${name} verify must start with 'node bin/', got: "${result.verify}"`
      );
    });

    it(`references/experiments/${name} mutable_files is non-empty array`, () => {
      const fullPath = path.join(ROOT, 'references', 'experiments', name);
      const result = parseExperimentFile(fullPath);
      assert.ok(result.valid, `${name} must be valid first`);
      assert.ok(Array.isArray(result.mutable_files), `${name} mutable_files must be an array`);
      assert.ok(result.mutable_files.length >= 1, `${name} mutable_files must have at least one entry`);
    });

    it(`references/experiments/${name} mutable_files entries start with 'workflows/'`, () => {
      const fullPath = path.join(ROOT, 'references', 'experiments', name);
      const result = parseExperimentFile(fullPath);
      assert.ok(result.valid, `${name} must be valid first`);
      for (const entry of result.mutable_files) {
        assert.ok(
          entry.startsWith('workflows/'),
          `${name} mutable_files entry "${entry}" must start with 'workflows/'`
        );
      }
    });
  }
});

// ─── Browser-backed templates use correct visual metric scripts ───────────────

describe('EXP-10: browser-backed templates use visual metric scripts', () => {
  const domMetricTemplates = ['wireframe.md', 'mockup.md', 'handoff.md', 'brief.md'];
  for (const name of domMetricTemplates) {
    it(`references/experiments/${name} verify command contains dom-metric.cjs`, () => {
      const content = fs.readFileSync(path.join(ROOT, 'references', 'experiments', name), 'utf-8');
      assert.ok(
        content.includes('dom-metric.cjs'),
        `${name} verify must use dom-metric.cjs`
      );
    });
  }

  it('references/experiments/system.md verify command contains contrast-metric.cjs', () => {
    const content = fs.readFileSync(path.join(ROOT, 'references', 'experiments', 'system.md'), 'utf-8');
    assert.ok(content.includes('contrast-metric.cjs'), 'system.md verify must use contrast-metric.cjs');
  });

  it('references/experiments/flows.md verify command contains mermaid-metric.cjs', () => {
    const content = fs.readFileSync(path.join(ROOT, 'references', 'experiments', 'flows.md'), 'utf-8');
    assert.ok(content.includes('mermaid-metric.cjs'), 'flows.md verify must use mermaid-metric.cjs');
  });

  const a11yMetricTemplates = ['iterate.md', 'hig.md'];
  for (const name of a11yMetricTemplates) {
    it(`references/experiments/${name} verify command contains a11y-metric.cjs`, () => {
      const content = fs.readFileSync(path.join(ROOT, 'references', 'experiments', name), 'utf-8');
      assert.ok(
        content.includes('a11y-metric.cjs'),
        `${name} verify must use a11y-metric.cjs`
      );
    });
  }
});

// ─── EXP-10: Non-browser templates use nyquist-metric.cjs ────────────────────

describe('EXP-10: non-browser templates use nyquist-metric.cjs', () => {
  const nyquistTemplates = ['recommend.md', 'competitive.md', 'opportunity.md', 'ideate.md', 'critique.md', 'deploy.md'];
  for (const name of nyquistTemplates) {
    it(`references/experiments/${name} verify command contains nyquist-metric.cjs`, () => {
      const content = fs.readFileSync(path.join(ROOT, 'references', 'experiments', name), 'utf-8');
      assert.ok(
        content.includes('nyquist-metric.cjs'),
        `${name} verify must use nyquist-metric.cjs`
      );
    });
  }
});

// ─── No template targets protected files ─────────────────────────────────────

describe('EXP-11: no template targets protected files or directories', () => {
  const PROTECTED_PREFIXES = ['bin/', 'tests/', 'references/', '.planning/', 'agents/', '.claude/'];

  for (const name of EXPECTED_TEMPLATES) {
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
