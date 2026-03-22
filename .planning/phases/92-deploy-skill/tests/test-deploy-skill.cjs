'use strict';

/**
 * test-deploy-skill.cjs — Phase 92 Plan 01 structural validation tests
 *
 * Covers requirements:
 *   DEPLOY-01: workflows/deploy.md exists as Stage 14, conditionally gated on businessMode
 *   DEPLOY-02: deploy.md references Next.js 16.2.1 scaffold at deploy-staging/landing-page/,
 *              consuming LDP-landing-page artifact
 *   DEPLOY-03: deploy.md contains pk_test_REPLACE_WITH_YOUR_KEY and stripe-config.json
 *   DEPLOY-04: deploy.md references @react-email/components and OTR artifact
 *   DEPLOY-05: deploy.md invokes npx vercel --prod --no-wait with vercel whoami auth check
 *   DEPLOY-06: deploy.md contains 4 approval gates (Gate 1/4 through Gate 4/4) with Halt option
 *   DEPLOY-07: All deploy artifacts route to .planning/deploy-staging/ (not .planning/design/)
 *   DEPLOY-08: commands/deploy.md exists with name: pde:deploy in YAML frontmatter
 *   DEPLOY-09: deploy.md contains deploy-manifest.json and review_required per artifact
 *
 * Run: node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs
 *
 * All tests assert STRUCTURAL properties of workflows/deploy.md and commands/deploy.md
 * by reading the files once at module top and running pattern checks. No runtime execution.
 *
 * RED state (before Task 2): All 21 assertions fail — workflows/deploy.md does not exist.
 * GREEN state (after Task 2): 19/21 assertions pass (DEPLOY-08 x2 remain RED until Plan 02
 *   creates commands/deploy.md).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/92-deploy-skill/tests/ -> go up 4 levels
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// Read target files with graceful fallback for pre-creation RED state
let deployContent = '';
try {
  deployContent = fs.readFileSync(path.join(ROOT, 'workflows', 'deploy.md'), 'utf-8');
} catch { /* file not created yet — all tests depending on this will be RED */ }

let buildContent = '';
try {
  buildContent = fs.readFileSync(path.join(ROOT, 'workflows', 'build.md'), 'utf-8');
} catch { /* file not created yet */ }

let deployCommandContent = '';
try {
  deployCommandContent = fs.readFileSync(path.join(ROOT, 'commands', 'deploy.md'), 'utf-8');
} catch { /* file not created yet — DEPLOY-08 tests will be RED */ }

// ─── DEPLOY-01: Stage 14 existence and business gate ──────────────────────────

describe('DEPLOY-01: Stage 14 existence and business gate', () => {
  it('workflows/deploy.md file exists', () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, 'workflows', 'deploy.md')),
      'workflows/deploy.md must exist as the Stage 14 deploy workflow'
    );
  });

  it('deploy.md contains "Stage 14" (pipeline stage label)', () => {
    assert.ok(
      deployContent.includes('Stage 14'),
      'deploy.md must contain "Stage 14" to identify it as the 14th pipeline stage'
    );
  });

  it('deploy.md contains "manifest-get-top-level businessMode" (business gate)', () => {
    assert.ok(
      deployContent.includes('manifest-get-top-level businessMode'),
      'deploy.md must contain "manifest-get-top-level businessMode" to gate on business mode'
    );
  });
});

// ─── DEPLOY-02: Next.js scaffold with pinned versions and LDP consumption ─────

describe('DEPLOY-02: Next.js scaffold with pinned versions and LDP artifact read', () => {
  it('deploy.md contains "16.2.1" (pinned Next.js version)', () => {
    assert.ok(
      deployContent.includes('16.2.1'),
      'deploy.md must contain "16.2.1" as the pinned Next.js version per DEPLOY-02'
    );
  });

  it('deploy.md contains "deploy-staging/landing-page" (Next.js scaffold output path)', () => {
    assert.ok(
      deployContent.includes('deploy-staging/landing-page'),
      'deploy.md must contain "deploy-staging/landing-page" as the Next.js scaffold output directory'
    );
  });

  it('deploy.md contains "LDP-landing-page" (LDP artifact consumption)', () => {
    assert.ok(
      deployContent.includes('LDP-landing-page'),
      'deploy.md must contain "LDP-landing-page" to show it reads the LDP wireframe artifact'
    );
  });
});

// ─── DEPLOY-03: Stripe config with test-mode placeholder keys ─────────────────

describe('DEPLOY-03: Stripe config with test-mode placeholder key', () => {
  it('deploy.md contains "pk_test_REPLACE_WITH_YOUR_KEY" (Stripe test key placeholder)', () => {
    assert.ok(
      deployContent.includes('pk_test_REPLACE_WITH_YOUR_KEY'),
      'deploy.md must contain "pk_test_REPLACE_WITH_YOUR_KEY" — live Stripe keys must never appear'
    );
  });

  it('deploy.md contains "stripe-config.json" (Stripe config artifact reference)', () => {
    assert.ok(
      deployContent.includes('stripe-config.json'),
      'deploy.md must contain "stripe-config.json" as the Stripe pricing config output file'
    );
  });
});

// ─── DEPLOY-04: Resend email templates with React Email components ─────────────

describe('DEPLOY-04: React Email components and OTR artifact consumption', () => {
  it('deploy.md contains "@react-email/components" (React Email dependency)', () => {
    assert.ok(
      deployContent.includes('@react-email/components'),
      'deploy.md must reference "@react-email/components" for email template stub generation'
    );
  });

  it('deploy.md contains "OTR" (OTR outreach artifact consumption)', () => {
    assert.ok(
      deployContent.includes('OTR'),
      'deploy.md must reference "OTR" to show it reads the outreach email sequence artifact'
    );
  });
});

// ─── DEPLOY-05: Vercel non-blocking deployment with auth pre-check ─────────────

describe('DEPLOY-05: Vercel non-blocking deploy with auth pre-check', () => {
  it('deploy.md contains "npx vercel --prod --no-wait" (non-blocking deploy command)', () => {
    assert.ok(
      deployContent.includes('npx vercel --prod --no-wait'),
      'deploy.md must contain "npx vercel --prod --no-wait" for non-blocking Vercel deployment'
    );
  });

  it('deploy.md contains "vercel whoami" (auth pre-check before deploy gate)', () => {
    assert.ok(
      deployContent.includes('vercel whoami'),
      'deploy.md must contain "vercel whoami" to pre-check Vercel CLI authentication before Gate 4'
    );
  });
});

// ─── DEPLOY-06: Four mandatory human approval gates ───────────────────────────

describe('DEPLOY-06: Four mandatory human approval gates', () => {
  it('deploy.md contains "Gate 1/4" (first approval gate label)', () => {
    assert.ok(
      deployContent.includes('Gate 1/4'),
      'deploy.md must contain "Gate 1/4" as the label for the first approval gate'
    );
  });

  it('deploy.md contains "Gate 4/4" (fourth approval gate label)', () => {
    assert.ok(
      deployContent.includes('Gate 4/4'),
      'deploy.md must contain "Gate 4/4" as the label for the fourth approval gate'
    );
  });

  it('deploy.md contains "Halt" (halt option present in approval gates)', () => {
    assert.ok(
      deployContent.includes('Halt'),
      'deploy.md must contain "Halt" as a selectable option in the AskUserQuestion approval gates'
    );
  });
});

// ─── DEPLOY-07: All artifacts in deploy-staging (never design/) ───────────────

describe('DEPLOY-07: All deploy artifacts route to .planning/deploy-staging/', () => {
  it('deploy.md contains ".planning/deploy-staging/" (correct output directory)', () => {
    assert.ok(
      deployContent.includes('.planning/deploy-staging/'),
      'deploy.md must contain ".planning/deploy-staging/" as the primary output directory for deploy artifacts'
    );
  });

  it('deploy.md references "deploy-staging" more than 5 times (primary output directory dominates)', () => {
    const deployStagingMatches = (deployContent.match(/deploy-staging/g) || []).length;
    assert.ok(
      deployStagingMatches > 5,
      `deploy.md must reference "deploy-staging" more than 5 times — found ${deployStagingMatches}. Deploy artifacts must route to deploy-staging/, not design/.`
    );
  });
});

// ─── DEPLOY-08: /pde:deploy slash command entry point ─────────────────────────

describe('DEPLOY-08: /pde:deploy slash command entry point', () => {
  it('commands/deploy.md file exists', () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, 'commands', 'deploy.md')),
      'commands/deploy.md must exist as the /pde:deploy slash command entry point'
    );
  });

  it('commands/deploy.md contains "name: pde:deploy" (slash command name in YAML frontmatter)', () => {
    assert.ok(
      deployCommandContent.includes('name: pde:deploy'),
      'commands/deploy.md must contain "name: pde:deploy" in its YAML frontmatter'
    );
  });
});

// ─── DEPLOY-09: deploy-manifest.json with review_required per artifact ─────────

describe('DEPLOY-09: deploy-manifest.json with review_required flag', () => {
  it('deploy.md contains "deploy-manifest.json" (manifest file reference)', () => {
    assert.ok(
      deployContent.includes('deploy-manifest.json'),
      'deploy.md must contain "deploy-manifest.json" as the deployment artifact status tracker'
    );
  });

  it('deploy.md contains "review_required" (per-artifact review flag)', () => {
    assert.ok(
      deployContent.includes('review_required'),
      'deploy.md must contain "review_required" as a field in the deploy-manifest.json schema (set to true per artifact)'
    );
  });
});
