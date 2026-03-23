/**
 * deploy-smoke-test.test.mjs
 * Phase 110 — Critique A11y + Deploy Smoke Test
 *
 * Nyquist structural tests for DEP-01 through DEP-05.
 * Tests: deploy.md post-deploy smoke test step, Playwright navigation, AOM snapshot,
 * exponential backoff retry (10s/20s/40s), LDP section verification, manifest schema.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const deployContent = readFileSync(resolve(ROOT, 'workflows', 'deploy.md'), 'utf-8');

describe("DEP-01: deploy.md has smoke test step after Gate 4 success", () => {
  test('deploy.md contains smoke test concept', () => {
    assert.ok(
      deployContent.includes('smoke'),
      'deploy.md does not contain "smoke" — smoke test concept missing'
    );
  });

  test('deploy.md has smoke test as a numbered step (Step 5/7 or similar)', () => {
    assert.ok(
      /Step [567]\/7.*[Ss]moke/i.test(deployContent),
      'deploy.md does not have a smoke test numbered step (expected "Step N/7 ... Smoke")'
    );
  });

  test('deploy.md references DEPLOY_EXIT (confirms smoke step follows Gate 4 success path)', () => {
    assert.ok(
      deployContent.includes('DEPLOY_EXIT'),
      'deploy.md does not contain "DEPLOY_EXIT" — smoke step must follow Gate 4 success'
    );
  });
});

describe("DEP-02: deploy.md navigates to DEPLOY_URL, captures screenshot and AOM snapshot", () => {
  test('deploy.md contains playwright:navigate bridge call', () => {
    assert.ok(
      deployContent.includes('playwright:navigate'),
      'deploy.md does not contain "playwright:navigate"'
    );
  });

  test('deploy.md contains playwright:screenshot bridge call', () => {
    assert.ok(
      deployContent.includes('playwright:screenshot'),
      'deploy.md does not contain "playwright:screenshot"'
    );
  });

  test('deploy.md contains playwright:snapshot bridge call', () => {
    assert.ok(
      deployContent.includes('playwright:snapshot'),
      'deploy.md does not contain "playwright:snapshot"'
    );
  });

  test('deploy.md references DEPLOY_URL for navigation', () => {
    assert.ok(
      deployContent.includes('DEPLOY_URL'),
      'deploy.md does not contain "DEPLOY_URL" — smoke test must navigate to deploy URL'
    );
  });
});

describe("DEP-03: deploy.md verifies expected LDP sections (hero, pricing, CTA)", () => {
  test('deploy.md references LDP_SECTIONS for section verification', () => {
    assert.ok(
      deployContent.includes('LDP_SECTIONS'),
      'deploy.md does not contain "LDP_SECTIONS" — must reference loaded LDP sections'
    );
  });

  test('deploy.md references canonical section names (hero, pricing, cta)', () => {
    assert.ok(
      /hero|pricing|cta/i.test(deployContent),
      'deploy.md does not contain canonical section names (hero, pricing, cta)'
    );
  });

  test('deploy.md contains section verification result tracking', () => {
    assert.ok(
      deployContent.includes('sections_found') || deployContent.includes('SECTION_RESULTS'),
      'deploy.md does not contain section result tracking ("sections_found" or "SECTION_RESULTS")'
    );
  });
});

describe("DEP-04: deploy.md uses exponential backoff retry (3 attempts, 10s/20s/40s)", () => {
  test('deploy.md contains backoff delay values 10, 20, 40', () => {
    assert.ok(
      /10.*20.*40|backoff/i.test(deployContent),
      'deploy.md does not contain backoff delay values "10, 20, 40" or "backoff"'
    );
  });

  test('deploy.md specifies 3-attempt limit', () => {
    assert.ok(
      /3 attempt|attempt.*3|BACKOFF_DELAYS/i.test(deployContent),
      'deploy.md does not specify 3-attempt limit or BACKOFF_DELAYS array'
    );
  });

  test('deploy.md contains retry/sleep mechanism', () => {
    assert.ok(
      deployContent.includes('sleep') || deployContent.includes('retry'),
      'deploy.md does not contain retry mechanism ("sleep" or "retry")'
    );
  });
});

describe("DEP-05: deploy.md logs smoke test results to deploy-manifest.json", () => {
  test('deploy.md contains smoke_test key in manifest schema', () => {
    assert.ok(
      deployContent.includes('smoke_test'),
      'deploy.md does not contain "smoke_test" — must add smoke_test key to manifest'
    );
  });

  test('deploy.md records screenshot_path in manifest', () => {
    assert.ok(
      deployContent.includes('screenshot_path'),
      'deploy.md does not contain "screenshot_path" — must record screenshot path in manifest'
    );
  });

  test('deploy.md records sections_found in manifest', () => {
    assert.ok(
      deployContent.includes('sections_found'),
      'deploy.md does not contain "sections_found" — must record found sections in manifest'
    );
  });

  test('deploy.md records sections_missing in manifest', () => {
    assert.ok(
      deployContent.includes('sections_missing'),
      'deploy.md does not contain "sections_missing" — must record missing sections in manifest'
    );
  });
});
