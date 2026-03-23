/**
 * wireframe-mockup-screenshots.test.mjs
 * Phase 109 — Wireframe + Mockup Screenshots
 *
 * Nyquist structural tests for WFR-01 through WFR-05 and MOK-01 through MOK-03.
 * Tests: wireframe.md Step 5d screenshot loop, screenshots directory, multi-page handling,
 * --no-playwright degradation, viewport 1280x800, mockup Step 7f screenshot loop,
 * mockup screenshots directory, mockup degradation, and playwright:resize TOOL_MAP entry.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);

const bridge = require(`${ROOT}/bin/lib/mcp-bridge.cjs`);
const { TOOL_MAP } = bridge;

const wireframeContent = readFileSync(resolve(ROOT, 'workflows', 'wireframe.md'), 'utf-8');
const mockupContent = readFileSync(resolve(ROOT, 'workflows', 'mockup.md'), 'utf-8');

describe("WFR-01: wireframe.md Step 5d screenshot loop", () => {
  test('wireframe.md contains bridge call playwright:navigate', () => {
    assert.ok(
      wireframeContent.includes('playwright:navigate'),
      'wireframe.md does not contain "playwright:navigate"'
    );
  });

  test('wireframe.md contains bridge call playwright:screenshot', () => {
    assert.ok(
      wireframeContent.includes('playwright:screenshot'),
      'wireframe.md does not contain "playwright:screenshot"'
    );
  });
});

describe("WFR-02: wireframe screenshots directory", () => {
  test('wireframe.md contains screenshots/ directory reference', () => {
    assert.ok(
      wireframeContent.includes('screenshots/'),
      'wireframe.md does not contain "screenshots/"'
    );
  });

  test('wireframe.md contains mkdir -p for directory creation', () => {
    assert.ok(
      wireframeContent.includes('mkdir -p'),
      'wireframe.md does not contain "mkdir -p"'
    );
  });
});

describe("WFR-03: multi-page wireframe handling", () => {
  test('wireframe.md contains index.html reference in Step 5d section', () => {
    assert.ok(
      wireframeContent.includes('index.html'),
      'wireframe.md does not contain "index.html"'
    );
  });

  test('wireframe.md contains WFR- multi-file iteration reference', () => {
    assert.ok(
      wireframeContent.includes('WFR-'),
      'wireframe.md does not contain "WFR-" (multi-page file iteration reference)'
    );
  });
});

describe("WFR-04: --no-playwright degradation", () => {
  test('wireframe.md contains PLAYWRIGHT_AVAILABLE guard check', () => {
    assert.ok(
      wireframeContent.includes('PLAYWRIGHT_AVAILABLE'),
      'wireframe.md does not contain "PLAYWRIGHT_AVAILABLE"'
    );
  });

  test('wireframe.md contains --no-playwright flag reference', () => {
    assert.ok(
      wireframeContent.includes('--no-playwright'),
      'wireframe.md does not contain "--no-playwright"'
    );
  });

  test('wireframe.md contains fallback "Not validated" message', () => {
    assert.ok(
      wireframeContent.includes('Not validated'),
      'wireframe.md does not contain "Not validated" fallback message'
    );
  });
});

describe("WFR-05: viewport 1280x800", () => {
  test('wireframe.md contains playwright:resize bridge call', () => {
    assert.ok(
      wireframeContent.includes('playwright:resize'),
      'wireframe.md does not contain "playwright:resize"'
    );
  });

  test('wireframe.md contains viewport width 1280', () => {
    assert.ok(
      wireframeContent.includes('1280'),
      'wireframe.md does not contain "1280" (viewport width)'
    );
  });

  test('wireframe.md contains viewport height 800', () => {
    assert.ok(
      wireframeContent.includes('800'),
      'wireframe.md does not contain "800" (viewport height)'
    );
  });
});

describe("MOK-01: mockup.md Step 7f screenshot loop", () => {
  test('mockup.md contains bridge call playwright:navigate', () => {
    assert.ok(
      mockupContent.includes('playwright:navigate'),
      'mockup.md does not contain "playwright:navigate"'
    );
  });

  test('mockup.md contains bridge call playwright:screenshot', () => {
    assert.ok(
      mockupContent.includes('playwright:screenshot'),
      'mockup.md does not contain "playwright:screenshot"'
    );
  });
});

describe("MOK-02: mockup screenshots directory", () => {
  test('mockup.md contains screenshots/ directory reference', () => {
    assert.ok(
      mockupContent.includes('screenshots/'),
      'mockup.md does not contain "screenshots/"'
    );
  });

  test('mockup.md contains mkdir -p for directory creation', () => {
    assert.ok(
      mockupContent.includes('mkdir -p'),
      'mockup.md does not contain "mkdir -p"'
    );
  });
});

describe("MOK-03: --no-playwright degradation", () => {
  test('mockup.md contains PLAYWRIGHT_AVAILABLE guard', () => {
    assert.ok(
      mockupContent.includes('PLAYWRIGHT_AVAILABLE'),
      'mockup.md does not contain "PLAYWRIGHT_AVAILABLE"'
    );
  });

  test('mockup.md contains fallback "Not validated" message', () => {
    assert.ok(
      mockupContent.includes('Not validated'),
      'mockup.md does not contain "Not validated" fallback message'
    );
  });
});

describe("TOOL_MAP: playwright:resize entry", () => {
  test('TOOL_MAP["playwright:resize"] equals "mcp__playwright__browser_resize"', () => {
    assert.strictEqual(
      TOOL_MAP['playwright:resize'],
      'mcp__playwright__browser_resize',
      `Expected TOOL_MAP["playwright:resize"] to be "mcp__playwright__browser_resize", got "${TOOL_MAP['playwright:resize']}"`
    );
  });

  test('TOOL_MAP has exactly 11 playwright:* entries', () => {
    const playwrightKeys = Object.keys(TOOL_MAP).filter(k => k.startsWith('playwright:'));
    assert.strictEqual(
      playwrightKeys.length,
      11,
      `Expected 11 playwright:* entries, got ${playwrightKeys.length}: ${playwrightKeys.join(', ')}`
    );
  });
});
