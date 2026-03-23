'use strict';

/**
 * test-handoff-launch-kit.cjs — Phase 91 Plan 01 structural validation tests
 *
 * Covers requirements:
 *   KIT-01: handoff.md assembles LKT manifest artifact listing all business
 *           artifacts with paths, statuses, and deployment readiness flags
 *   KIT-02: CNT artifact = 30-day pre-launch/launch/post-launch skeleton with
 *           slots from GTM channel priorities
 *   KIT-03: OTR artifact = onboarding sequence (5-7 emails, trigger/delay/CTA,
 *           Resend-compatible) + investor outreach (3 emails, gated on pitch deck)
 *   KIT-04: Domain strategy notes consolidated from brief into launch kit
 *   KIT-05: hasLaunchKit coverage flag set in designCoverage after LKT creation
 *   KIT-06: Email sequences use structural placeholders — never specific company
 *           names or partner references
 *
 * Run: node --test .planning/phases/91-handoff-launch-kit-assembly/tests/test-handoff-launch-kit.cjs
 *
 * All tests assert STRUCTURAL properties of workflows/handoff.md by reading
 * the file once at module top and running pattern checks. No runtime execution.
 *
 * RED state (before Task 2): KIT-01 through KIT-06 tests fail against
 *   unmodified handoff.md. Only assertions about BRIEF_CONTENT (already present
 *   in handoff.md for other reasons) may pass — all others are RED.
 * GREEN state (after Task 2): All 21 Nyquist assertions pass.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/91-handoff-launch-kit-assembly/tests/ -> go up 4 levels
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const handoffContent = fs.readFileSync(path.join(ROOT, 'workflows', 'handoff.md'), 'utf-8');

// ─── KIT-01: LKT manifest generation ─────────────────────────────────────────

describe('KIT-01: LKT manifest generation', () => {
  it('handoff.md contains "manifest-get-top-level businessMode" (business detection present)', () => {
    assert.ok(
      handoffContent.includes('manifest-get-top-level businessMode'),
      'handoff.md must contain "manifest-get-top-level businessMode" for businessMode detection'
    );
  });

  it('handoff.md contains "LKT-launch-kit" (LKT artifact code)', () => {
    assert.ok(
      handoffContent.includes('LKT-launch-kit'),
      'handoff.md must contain "LKT-launch-kit" as the launch kit manifest artifact code'
    );
  });

  it('handoff.md contains "Deployment Ready" (LKT manifest column header)', () => {
    assert.ok(
      handoffContent.includes('Deployment Ready'),
      'handoff.md must contain "Deployment Ready" as a column header in the LKT manifest Artifact Registry table'
    );
  });

  it('handoff.md contains "Artifact Registry" (LKT manifest section header)', () => {
    assert.ok(
      handoffContent.includes('Artifact Registry'),
      'handoff.md must contain "Artifact Registry" as the section header for the LKT manifest table'
    );
  });
});

// ─── KIT-02: CNT content calendar ────────────────────────────────────────────

describe('KIT-02: CNT content calendar', () => {
  it('handoff.md contains "CNT-content-calendar" (CNT artifact code)', () => {
    assert.ok(
      handoffContent.includes('CNT-content-calendar'),
      'handoff.md must contain "CNT-content-calendar" as the content calendar artifact code'
    );
  });

  it('handoff.md contains "30-day" or "30 day" (calendar duration reference)', () => {
    assert.ok(
      handoffContent.includes('30-day') || handoffContent.includes('30 day'),
      'handoff.md must contain "30-day" or "30 day" to reference the 30-day content calendar duration'
    );
  });

  it('handoff.md contains "Pre-Launch" (calendar phase 1 header)', () => {
    assert.ok(
      handoffContent.includes('Pre-Launch'),
      'handoff.md must contain "Pre-Launch" as the first phase header in the content calendar'
    );
  });

  it('handoff.md contains "Post-Launch" (calendar phase 3 header)', () => {
    assert.ok(
      handoffContent.includes('Post-Launch'),
      'handoff.md must contain "Post-Launch" as the third phase header in the content calendar'
    );
  });
});

// ─── KIT-03: OTR outreach sequences ──────────────────────────────────────────

describe('KIT-03: OTR outreach sequences', () => {
  it('handoff.md contains "OTR-outreach-sequences" (OTR artifact code)', () => {
    assert.ok(
      handoffContent.includes('OTR-outreach-sequences'),
      'handoff.md must contain "OTR-outreach-sequences" as the outreach sequences artifact code'
    );
  });

  it('handoff.md contains "resend-compatible" (case insensitive) (Resend spec reference)', () => {
    assert.ok(
      handoffContent.toLowerCase().includes('resend-compatible'),
      'handoff.md must contain "resend-compatible" (case-insensitive) to mark OTR as Resend API spec format'
    );
  });

  it('handoff.md contains "DPD_AVAILABLE" or "DPD-pitch-deck" (investor sequence DPD gate)', () => {
    assert.ok(
      handoffContent.includes('DPD_AVAILABLE') || handoffContent.includes('DPD-pitch-deck'),
      'handoff.md must contain "DPD_AVAILABLE" or "DPD-pitch-deck" to gate the investor outreach sequence on DPD artifact presence'
    );
  });

  it('handoff.md contains "Investor Outreach" (investor sequence section)', () => {
    assert.ok(
      handoffContent.includes('Investor Outreach'),
      'handoff.md must contain "Investor Outreach" as a section name in the OTR outreach sequences artifact'
    );
  });
});

// ─── KIT-04: Domain strategy consolidation ───────────────────────────────────

describe('KIT-04: Domain strategy consolidation', () => {
  it('handoff.md contains "Domain Strategy" (domain strategy section in LKT)', () => {
    assert.ok(
      handoffContent.includes('Domain Strategy'),
      'handoff.md must contain "Domain Strategy" as a section in the LKT manifest artifact'
    );
  });

  it('handoff.md contains "BRIEF_CONTENT" or "BRF" (brief artifact reference for domain extraction)', () => {
    assert.ok(
      handoffContent.includes('BRIEF_CONTENT') || handoffContent.includes('BRF'),
      'handoff.md must contain "BRIEF_CONTENT" or "BRF" to reference the brief artifact for domain strategy extraction'
    );
  });
});

// ─── KIT-05: hasLaunchKit coverage flag ──────────────────────────────────────

describe('KIT-05: hasLaunchKit coverage flag', () => {
  it('handoff.md contains "hasLaunchKit" (coverage flag name)', () => {
    assert.ok(
      handoffContent.includes('hasLaunchKit'),
      'handoff.md must contain "hasLaunchKit" as the designCoverage flag for the launch kit artifact'
    );
  });

  it('handoff.md contains "hasBusinessThesis" (20-field coverage includes business fields)', () => {
    assert.ok(
      handoffContent.includes('hasBusinessThesis'),
      'handoff.md must contain "hasBusinessThesis" in designCoverage write — confirms 16→20 field upgrade'
    );
  });

  it('handoff.md contains "hasServiceBlueprint" (20-field coverage includes all business fields)', () => {
    assert.ok(
      handoffContent.includes('hasServiceBlueprint'),
      'handoff.md must contain "hasServiceBlueprint" in designCoverage write — confirms all 20 fields present'
    );
  });

  it('handoff.md contains "hasMarketLandscape" (20-field coverage includes all business fields)', () => {
    assert.ok(
      handoffContent.includes('hasMarketLandscape'),
      'handoff.md must contain "hasMarketLandscape" in designCoverage write — confirms all 20 fields present'
    );
  });
});

// ─── KIT-06: structural placeholders in OTR ──────────────────────────────────

describe('KIT-06: structural placeholders in OTR email sequences', () => {
  it('handoff.md contains "[YOUR_PRODUCT_NAME]" (product name placeholder)', () => {
    assert.ok(
      handoffContent.includes('[YOUR_PRODUCT_NAME]'),
      'handoff.md must contain "[YOUR_PRODUCT_NAME]" as a structural placeholder in OTR email sequences — never use actual product names'
    );
  });

  it('handoff.md contains "[YOUR_FROM_ADDRESS]" (email from address placeholder)', () => {
    assert.ok(
      handoffContent.includes('[YOUR_FROM_ADDRESS]'),
      'handoff.md must contain "[YOUR_FROM_ADDRESS]" as a structural placeholder for the email from address in OTR sequences'
    );
  });

  it('handoff.md contains "[YOUR_COMPANY_NAME]" (company name placeholder)', () => {
    assert.ok(
      handoffContent.includes('[YOUR_COMPANY_NAME]'),
      'handoff.md must contain "[YOUR_COMPANY_NAME]" as a structural placeholder in OTR email sequences — never use actual company names'
    );
  });
});
