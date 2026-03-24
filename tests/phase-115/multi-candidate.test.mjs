/**
 * multi-candidate.test.mjs — Phase 115 Nyquist Coverage
 *
 * Validates the multi-candidate experiment infrastructure:
 *   MULTI-04: candidates field parsing in experiment-schema.cjs
 *   MULTI-03: JSONL schema multi-candidate fields
 *   MULTI-01: _resetToSha export and contract
 *   MULTI-02: evaluation contract unchanged
 *
 * Run: node --test tests/phase-115/multi-candidate.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseExperimentFile, JSONL_ROW_FIELDS } = require('../../bin/lib/experiment-schema.cjs');
const runner = require('../../bin/lib/experiment-runner.cjs');

// ─── ROOT path (decoded — handles spaces in project directory name) ────────────

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// ─── Tmp helper ───────────────────────────────────────────────────────────────

/**
 * Creates a temp experiment.md file with the provided frontmatter fields.
 * Returns { filePath, cleanup }.
 */
function makeTmpExperiment(frontmatterLines) {
  const suffix = Math.random().toString(36).slice(2);
  const filePath = path.join(os.tmpdir(), `pde-exp-test-${suffix}.md`);
  const content = [
    '---',
    ...frontmatterLines,
    '---',
    '',
    '# Experiment',
  ].join('\n');
  fs.writeFileSync(filePath, content, 'utf-8');
  return {
    filePath,
    cleanup() {
      try { fs.unlinkSync(filePath); } catch { /* best-effort */ }
    },
  };
}

// ─── MULTI-04: candidates field parsing ───────────────────────────────────────

describe('MULTI-04: candidates field parsing', () => {
  it('defaults to 3 when candidates field absent', () => {
    const { filePath, cleanup } = makeTmpExperiment([
      'metric: test',
      'direction: max',
      'verify: echo 1',
      'mutable_files:',
      '  - test.md',
    ]);
    try {
      const result = parseExperimentFile(filePath);
      assert.ok(result.valid, `parseExperimentFile should succeed: ${JSON.stringify(result.errors)}`);
      assert.strictEqual(result.candidates, 3);
    } finally {
      cleanup();
    }
  });

  it('parses explicit candidates: 2', () => {
    const { filePath, cleanup } = makeTmpExperiment([
      'metric: test',
      'direction: max',
      'verify: echo 1',
      'mutable_files:',
      '  - test.md',
      'candidates: 2',
    ]);
    try {
      const result = parseExperimentFile(filePath);
      assert.ok(result.valid, `parseExperimentFile should succeed: ${JSON.stringify(result.errors)}`);
      assert.strictEqual(result.candidates, 2);
    } finally {
      cleanup();
    }
  });

  it('parses candidates: 1 for single-candidate mode', () => {
    const { filePath, cleanup } = makeTmpExperiment([
      'metric: test',
      'direction: max',
      'verify: echo 1',
      'mutable_files:',
      '  - test.md',
      'candidates: 1',
    ]);
    try {
      const result = parseExperimentFile(filePath);
      assert.ok(result.valid, `parseExperimentFile should succeed: ${JSON.stringify(result.errors)}`);
      assert.strictEqual(result.candidates, 1);
    } finally {
      cleanup();
    }
  });
});

// ─── MULTI-03: JSONL schema multi-candidate fields ────────────────────────────

describe('MULTI-03: JSONL schema multi-candidate fields', () => {
  it('includes candidates_evaluated', () => {
    assert.ok(JSONL_ROW_FIELDS.includes('candidates_evaluated'));
  });

  it('includes candidates_scores', () => {
    assert.ok(JSONL_ROW_FIELDS.includes('candidates_scores'));
  });

  it('includes best_candidate_index', () => {
    assert.ok(JSONL_ROW_FIELDS.includes('best_candidate_index'));
  });

  it('has 14 total fields', () => {
    assert.strictEqual(JSONL_ROW_FIELDS.length, 14);
  });

  it('preserves original 11 fields in order', () => {
    const expected = [
      'id',
      'iteration',
      'ts',
      'commit',
      'metric_value',
      'metric_delta',
      'status',
      'description',
      'tokens_used',
      'screenshot_hash',
      'baseline_hash',
    ];
    assert.deepStrictEqual(Array.from(JSONL_ROW_FIELDS.slice(0, 11)), expected);
  });
});

// ─── MULTI-01: _resetToSha export and contract ────────────────────────────────

describe('MULTI-01: _resetToSha export and contract', () => {
  it('exports _resetToSha function', () => {
    assert.strictEqual(typeof runner._resetToSha, 'function');
  });

  it('_resetToSha has 3 parameters (cwd, slug, sha)', () => {
    assert.strictEqual(runner._resetToSha.length, 3);
  });

  it('_resetToSha returns { reset: false, reason: "wrong_branch" } when not on experiment branch', () => {
    // Use ROOT as cwd — will be on main/feature branch, not experiment/{slug}
    const result = runner._resetToSha(ROOT, 'test-slug', 'HEAD');
    assert.strictEqual(result.reset, false);
    assert.strictEqual(result.reason, 'wrong_branch');
  });
});

// ─── MULTI-02: evaluation contract unchanged ──────────────────────────────────

describe('MULTI-02: evaluation contract unchanged', () => {
  it('_evalMetric has 3 parameters', () => {
    assert.strictEqual(runner._evalMetric.length, 3);
  });

  it('_compareMetric has 3 parameters', () => {
    assert.strictEqual(runner._compareMetric.length, 3);
  });

  it('_writeJsonlRow has 4 parameters', () => {
    assert.strictEqual(runner._writeJsonlRow.length, 4);
  });
});

// ─── MULTI-05: optimize.md multi-candidate integration ────────────────────────

describe('MULTI-05: optimize.md multi-candidate integration', () => {
  const optimizePath = path.join(ROOT, 'workflows', 'optimize.md');
  const content = fs.readFileSync(optimizePath, 'utf-8');

  it('optimize.md contains candidateCount variable', () => {
    assert.ok(content.includes('candidateCount'), 'optimize.md must reference candidateCount');
  });

  it('optimize.md contains candidate loop', () => {
    assert.ok(content.includes('candidate_index'), 'optimize.md must have candidate_index loop variable');
  });

  it('optimize.md uses reset-to-sha for candidate selection', () => {
    assert.ok(content.includes('reset-to-sha'), 'optimize.md must call reset-to-sha subcommand');
  });

  it('optimize.md contains candidate selection phase', () => {
    assert.ok(content.includes('candidates_evaluated') || content.includes('candidateResults'),
      'optimize.md must have candidate selection logic');
  });

  it('optimize.md references candidates_scores for JSONL', () => {
    assert.ok(content.includes('candidates_scores'), 'optimize.md must write candidates_scores to JSONL');
  });

  it('optimize.md references best_candidate_index for JSONL', () => {
    assert.ok(content.includes('best_candidate_index'), 'optimize.md must write best_candidate_index to JSONL');
  });
});
