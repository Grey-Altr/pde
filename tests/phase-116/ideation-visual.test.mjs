import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);

describe('IDT-01: ideation divergence scored by screenshot variance', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/ideate.md`, 'utf-8');

  it('ideate.md contains Step 7b visual diversity scoring', () => {
    assert.ok(content.includes('Step 7b'), 'Missing Step 7b in ideate.md');
  });

  it('ideate.md references visual-diversity-metric.cjs', () => {
    assert.ok(content.includes('visual-diversity-metric.cjs'), 'Missing visual-diversity-metric reference');
  });
});

describe('IDT-02: visual similarity metric via structural hash', () => {
  it('visual-diversity-metric.cjs exists', () => {
    assert.ok(fs.existsSync(`${ROOT}/bin/visual-diversity-metric.cjs`), 'Missing visual-diversity-metric.cjs');
  });

  it('exports computeVisualDiversity function', () => {
    const vdm = require(`${ROOT}/bin/visual-diversity-metric.cjs`);
    assert.equal(typeof vdm.computeVisualDiversity, 'function');
  });
});

describe('IDT-03: higher visual diversity = higher score', () => {
  it('computeVisualDiversity returns 100 for all-unique hashes', () => {
    // Create temp dir with 3 files of different content (hashScreenshot hashes any file)
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idt-test-'));
    fs.writeFileSync(path.join(tmpDir, 'a.png'), 'content-a');
    fs.writeFileSync(path.join(tmpDir, 'b.png'), 'content-b');
    fs.writeFileSync(path.join(tmpDir, 'c.png'), 'content-c');
    const vdm = require(`${ROOT}/bin/visual-diversity-metric.cjs`);
    const score = vdm.computeVisualDiversity([
      path.join(tmpDir, 'a.png'),
      path.join(tmpDir, 'b.png'),
      path.join(tmpDir, 'c.png'),
    ]);
    assert.equal(score, 100, 'All-unique should score 100');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('computeVisualDiversity returns 33 for 1-of-3 unique', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idt-test2-'));
    fs.writeFileSync(path.join(tmpDir, 'a.png'), 'same-content');
    fs.writeFileSync(path.join(tmpDir, 'b.png'), 'same-content');
    fs.writeFileSync(path.join(tmpDir, 'c.png'), 'same-content');
    const vdm = require(`${ROOT}/bin/visual-diversity-metric.cjs`);
    const score = vdm.computeVisualDiversity([
      path.join(tmpDir, 'a.png'),
      path.join(tmpDir, 'b.png'),
      path.join(tmpDir, 'c.png'),
    ]);
    assert.equal(score, 33, 'All-identical should score 33 (1 unique / 3 total)');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('IDT-04: graceful degradation when Playwright unavailable', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/ideate.md`, 'utf-8');

  it('contains PLAYWRIGHT_AVAILABLE check in Step 7b', () => {
    assert.ok(content.includes('PLAYWRIGHT_AVAILABLE'), 'Missing PLAYWRIGHT_AVAILABLE check');
  });

  it('contains degradation message', () => {
    assert.ok(content.includes('Visual diversity scoring unavailable'), 'Missing degradation message');
  });
});
