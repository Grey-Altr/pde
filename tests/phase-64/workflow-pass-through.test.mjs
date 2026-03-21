/**
 * workflow-pass-through.test.mjs
 * Phase 64 — Coverage Schema Migration (MCP-04)
 *
 * Tests: All 12 workflow files include hasStitchWireframes in their
 * manifest-set-top-level designCoverage call. brief.md is not contaminated.
 * design.cjs self-test passes. hasStitchWireframes activation state reflects v0.9 Phase 66 behavior.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// 12 workflow files that must have hasStitchWireframes in their manifest-set-top-level call
const WORKFLOW_FILES = [
  'workflows/wireframe.md',
  'workflows/mockup.md',
  'workflows/system.md',
  'workflows/flows.md',
  'workflows/critique.md',
  'workflows/iterate.md',
  'workflows/handoff.md',
  'workflows/ideate.md',
  'workflows/competitive.md',
  'workflows/opportunity.md',
  'workflows/hig.md',
  'workflows/recommend.md',
];

function readWorkflow(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf-8');
}

test('all 12 workflow files contain hasStitchWireframes', () => {
  for (const relPath of WORKFLOW_FILES) {
    const content = readWorkflow(relPath);
    assert.ok(
      content.includes('hasStitchWireframes'),
      `${relPath}: does not contain hasStitchWireframes`
    );
  }
});

test('all 12 workflow files include hasStitchWireframes in their manifest-set-top-level designCoverage call', () => {
  for (const relPath of WORKFLOW_FILES) {
    const content = readWorkflow(relPath);
    const hasManifestCall = content.includes('manifest-set-top-level designCoverage');
    assert.ok(hasManifestCall, `${relPath}: no manifest-set-top-level designCoverage call found`);

    // Extract lines around manifest-set-top-level; multi-line calls use backslash continuation
    const lines = content.split('\n');
    let foundInCall = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('manifest-set-top-level designCoverage')) {
        // Check this line and up to 5 continuation lines
        const callBlock = lines.slice(i, i + 6).join('\n');
        if (callBlock.includes('hasStitchWireframes')) {
          foundInCall = true;
          break;
        }
      }
    }
    assert.ok(
      foundInCall,
      `${relPath}: hasStitchWireframes not found within the manifest-set-top-level designCoverage call`
    );
  }
});

test('brief.md does not contain hasStitchWireframes (untouched by Phase 64)', () => {
  const briefPath = join(ROOT, 'workflows/brief.md');
  assert.ok(existsSync(briefPath), 'workflows/brief.md should exist');
  const content = readFileSync(briefPath, 'utf-8');
  assert.ok(
    !content.includes('hasStitchWireframes'),
    'workflows/brief.md must not contain hasStitchWireframes'
  );
});

test('hasStitchWireframes activation reflects v0.9 behavior (wireframe.md may set true when Stitch active)', () => {
  // Phase 64 originally asserted hasStitchWireframes was never true.
  // v0.9 Phase 66 legitimately activated the flag in wireframe.md when --use-stitch is passed.
  // The Phase 64 invariant to preserve: all 12 workflow files INCLUDE the field.
  // The activation state (true/false) is controlled by v0.9 wireframe.md logic.
  for (const relPath of WORKFLOW_FILES) {
    const content = readWorkflow(relPath);
    assert.ok(
      content.includes('hasStitchWireframes'),
      `${relPath}: must still include hasStitchWireframes field`
    );
  }
  // JSON manifest files still have false as default — this is correct
  const jsonFiles = [
    'templates/design-manifest.json',
    '.planning/design/design-manifest.json',
    '.planning/pressure-test/fixture-greenfield/design/design-manifest.json',
    '.planning/pressure-test/fixture-partial/design/design-manifest.json',
    '.planning/pressure-test/fixture-rerun/design/design-manifest.json',
  ];
  for (const relPath of jsonFiles) {
    const content = readFileSync(join(ROOT, relPath), 'utf-8');
    const manifest = JSON.parse(content);
    assert.strictEqual(
      manifest.designCoverage.hasStitchWireframes,
      false,
      `${relPath}: JSON manifest default should remain false`
    );
  }
});

test('recommend.md uses named placeholder convention for hasStitchWireframes', () => {
  const content = readWorkflow('workflows/recommend.md');
  assert.ok(
    content.includes('hasStitchWireframes'),
    'recommend.md: missing hasStitchWireframes entirely'
  );
  assert.ok(
    content.includes('current_hasStitchWireframes'),
    'recommend.md: should use named placeholder {current_hasStitchWireframes} convention'
  );
});

test('design.cjs self-test passes after schema migration', () => {
  const designCjsPath = join(ROOT, 'bin/lib/design.cjs');
  const result = spawnSync(process.execPath, [designCjsPath, '--self-test'], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  const output = result.stdout || '';
  assert.strictEqual(
    result.status,
    0,
    `design.cjs --self-test exited with code ${result.status}. Output:\n${output}\nStderr:\n${result.stderr || ''}`
  );
  assert.ok(
    output.includes('passed'),
    `design.cjs --self-test output does not confirm tests passed. Got:\n${output}`
  );
});
