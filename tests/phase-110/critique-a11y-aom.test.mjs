/**
 * critique-a11y-aom.test.mjs
 * Phase 110 — Critique A11y AOM Integration
 *
 * Nyquist structural tests for A11Y-01 through A11Y-04.
 * Tests: Playwright AOM probe in Step 3, AOM analysis for landmarks/headings/unlabeled,
 * merge logic for Playwright+Axe, fallback to manual WCAG checklist when neither available.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const critiqueContent = readFileSync(resolve(ROOT, 'workflows', 'critique.md'), 'utf-8');

describe("A11Y-01: critique.md uses browser_snapshot for AOM", () => {
  test('critique.md contains playwright:snapshot bridge call', () => {
    assert.ok(
      critiqueContent.includes('playwright:snapshot'),
      'critique.md does not contain "playwright:snapshot" bridge call'
    );
  });

  test('critique.md stores AOM data in AOM_DATA variable', () => {
    assert.ok(
      critiqueContent.includes('AOM_DATA'),
      'critique.md does not contain "AOM_DATA" variable'
    );
  });

  test('critique.md sets PLAYWRIGHT_A11Y_AVAILABLE flag', () => {
    assert.ok(
      critiqueContent.includes('PLAYWRIGHT_A11Y_AVAILABLE'),
      'critique.md does not contain "PLAYWRIGHT_A11Y_AVAILABLE" availability flag'
    );
  });
});

describe("A11Y-02: AOM analyzed for landmarks, headings, unlabeled controls", () => {
  test('critique.md checks for banner landmark role', () => {
    assert.ok(
      critiqueContent.includes('banner'),
      'critique.md does not contain "banner" (landmark role check)'
    );
  });

  test('critique.md checks for main landmark role', () => {
    assert.ok(
      critiqueContent.includes('main'),
      'critique.md does not contain "main" (landmark role check)'
    );
  });

  test('critique.md checks for contentinfo landmark role', () => {
    assert.ok(
      critiqueContent.includes('contentinfo'),
      'critique.md does not contain "contentinfo" (landmark role check)'
    );
  });

  test('critique.md checks heading level hierarchy', () => {
    assert.ok(
      critiqueContent.includes('heading') && /level=/.test(critiqueContent),
      'critique.md does not contain both "heading" and "level=" (heading hierarchy check)'
    );
  });

  test('critique.md checks for unlabeled interactive controls', () => {
    assert.ok(
      critiqueContent.includes('unlabeled') || critiqueContent.includes('UNLABELED'),
      'critique.md does not contain "unlabeled" or "UNLABELED" (unlabeled controls check)'
    );
  });
});

describe("A11Y-03: merge when both Playwright and Axe available", () => {
  test('critique.md contains both-available merge branch', () => {
    assert.ok(
      /PLAYWRIGHT_A11Y_AVAILABLE.*AND.*AXE_AVAILABLE|AXE_AVAILABLE.*AND.*PLAYWRIGHT_A11Y_AVAILABLE/i.test(critiqueContent),
      'critique.md does not contain a branch for both PLAYWRIGHT_A11Y_AVAILABLE AND AXE_AVAILABLE'
    );
  });

  test('critique.md contains combined AOM + Axe findings section', () => {
    assert.ok(
      critiqueContent.includes('AOM + Axe') || critiqueContent.includes('AOM+Axe'),
      'critique.md does not contain "AOM + Axe" (combined findings heading)'
    );
  });
});

describe("A11Y-04: fallback to manual WCAG checklist when neither available", () => {
  test('critique.md preserves wcag-baseline.md fallback reference', () => {
    assert.ok(
      critiqueContent.includes('wcag-baseline.md'),
      'critique.md does not contain "wcag-baseline.md" (fallback reference)'
    );
  });

  test('critique.md documents neither-available fallback path', () => {
    assert.ok(
      /neither.*Playwright.*Axe|neither.*available/i.test(critiqueContent),
      'critique.md does not contain a "neither ... Playwright ... Axe" or "neither ... available" path'
    );
  });
});
