import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

describe('BREF-01: brief workflow can capture reference screenshots', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/brief.md`, 'utf-8');

  it('brief.md contains Step 3b reference capture', () => {
    assert.ok(content.includes('Step 3b'), 'Missing Step 3b in brief.md');
  });

  it('brief.md contains reference screenshot capture prose', () => {
    assert.ok(/reference.*screenshot|screenshot.*reference/i.test(content), 'Missing reference screenshot prose');
  });
});

describe('BREF-02: URL → Playwright navigate → screenshot → save to references/', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/brief.md`, 'utf-8');

  it('contains --reference-url flag', () => {
    assert.ok(content.includes('--reference-url'), 'Missing --reference-url flag');
  });

  it('contains playwright:navigate reference', () => {
    assert.ok(content.includes('playwright:navigate') || content.includes('navigate'), 'Missing navigate reference');
  });

  it('saves to .planning/design/references/ path', () => {
    assert.ok(content.includes('.planning/design/references/'), 'Missing references/ save path');
  });

  it('uses REF- prefix for filename', () => {
    assert.ok(content.includes('REF-'), 'Missing REF- prefix');
  });
});

describe('BREF-03: reference screenshots available to downstream skills', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/brief.md`, 'utf-8');

  it('contains Reference Material section for brief artifact', () => {
    assert.ok(content.includes('Reference Material'), 'Missing Reference Material section');
  });

  it('contains REFERENCE_SCREENSHOT_PATH variable', () => {
    assert.ok(content.includes('REFERENCE_SCREENSHOT_PATH'), 'Missing REFERENCE_SCREENSHOT_PATH');
  });
});

describe('BREF-04: reference capture is opt-in', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/brief.md`, 'utf-8');

  it('skip silently when --reference-url absent', () => {
    assert.ok(/skip.*silent|no reference capture/i.test(content), 'Missing silent skip when flag absent');
  });

  it('contains REFERENCE_URL empty check', () => {
    assert.ok(content.includes('REFERENCE_URL'), 'Missing REFERENCE_URL variable');
  });
});
