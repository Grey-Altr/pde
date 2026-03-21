/**
 * batch-efficiency.test.mjs
 * Phase 67 — Ideation Visual Divergence
 *
 * Tests: EFF-03 (batch prompt construction before loop, no HTML fetch, no annotation injection)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ideateMd = readFileSync(resolve(ROOT, 'workflows', 'ideate.md'), 'utf8');

describe('EFF-03: Batch MCP efficiency', () => {
  test('prompts built before generation loop (4-STITCH-B before 4-STITCH-D)', () => {
    const promptBuildIdx = ideateMd.indexOf('4-STITCH-B');
    const loopIdx = ideateMd.indexOf('4-STITCH-D');
    assert.ok(promptBuildIdx > 0, 'ideate.md missing 4-STITCH-B prompt build section');
    assert.ok(loopIdx > 0, 'ideate.md missing 4-STITCH-D generation loop section');
    assert.ok(
      promptBuildIdx < loopIdx,
      `4-STITCH-B (prompt build, index ${promptBuildIdx}) must come before 4-STITCH-D (generation loop, index ${loopIdx})`
    );
  });

  test('no HTML fetch in 4-STITCH section — explicit prohibition present', () => {
    // The 4-STITCH section must explicitly prohibit stitch:fetch-screen-code.
    // A "Do NOT fetch HTML" prohibition in the section is the evidence that HTML fetch is intentionally excluded (EFF-03).
    const stitchStart = ideateMd.indexOf('### Step 4-STITCH');
    const stitchEnd = ideateMd.indexOf('### Step 5/7');
    assert.ok(stitchStart > 0, 'ideate.md missing ### Step 4-STITCH section header');
    assert.ok(stitchEnd > stitchStart, '### Step 5/7 must follow ### Step 4-STITCH');
    const stitchSection = ideateMd.slice(stitchStart, stitchEnd);
    assert.ok(
      stitchSection.includes('Do NOT fetch HTML'),
      'ideate.md 4-STITCH section missing "Do NOT fetch HTML" prohibition — EFF-03 requires explicit PNG-only constraint'
    );
  });

  test('no annotation injection in 4-STITCH section', () => {
    const stitchStart = ideateMd.indexOf('### Step 4-STITCH');
    const stitchEnd = ideateMd.indexOf('### Step 5/7');
    const stitchSection = ideateMd.slice(stitchStart, stitchEnd);
    assert.ok(
      !stitchSection.includes('injectComponentAnnotations'),
      'ideate.md 4-STITCH section must NOT contain injectComponentAnnotations (PNGs have no DOM)'
    );
    assert.ok(
      !stitchSection.includes('@component:'),
      'ideate.md 4-STITCH section must NOT contain @component: annotations'
    );
  });

  test('PNG-only: stitch:fetch-screen-image present in loop', () => {
    assert.ok(
      ideateMd.includes('stitch:fetch-screen-image'),
      'ideate.md missing stitch:fetch-screen-image — PNG fetch is required for ideation visual variants'
    );
  });
});
