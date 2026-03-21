/**
 * consent-gates.test.mjs
 * Phase 66 — Wireframe + Mockup Stitch Integration
 *
 * Tests: CONSENT-01 (outbound consent), CONSENT-02 (inbound consent),
 *        CONSENT-03 (data visibility), CONSENT-04 (batch consent)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const wireframeMd = readFileSync(resolve(ROOT, 'workflows', 'wireframe.md'), 'utf8');
const mockupMd = readFileSync(resolve(ROOT, 'workflows', 'mockup.md'), 'utf8');

describe('CONSENT-01: outbound consent before Stitch call', () => {
  test('wireframe.md contains AskUserQuestion consent prompt BEFORE stitch:generate-screen (indexOf ordering)', () => {
    const consentIdx = wireframeMd.indexOf('AskUserQuestion');
    const generateIdx = wireframeMd.indexOf('stitch:generate-screen');
    assert.ok(consentIdx !== -1, 'wireframe.md missing AskUserQuestion consent prompt');
    assert.ok(generateIdx !== -1, 'wireframe.md missing stitch:generate-screen call');
    assert.ok(
      consentIdx < generateIdx,
      `wireframe.md: AskUserQuestion (index ${consentIdx}) does not appear before stitch:generate-screen (index ${generateIdx})`
    );
  });

  test('mockup.md contains outbound consent BEFORE stitch:generate-screen', () => {
    const consentIdx = mockupMd.indexOf('AskUserQuestion');
    const generateIdx = mockupMd.indexOf('stitch:generate-screen');
    assert.ok(consentIdx !== -1, 'mockup.md missing AskUserQuestion consent prompt');
    assert.ok(generateIdx !== -1, 'mockup.md missing stitch:generate-screen call');
    assert.ok(
      consentIdx < generateIdx,
      `mockup.md: AskUserQuestion (index ${consentIdx}) does not appear before stitch:generate-screen (index ${generateIdx})`
    );
  });

  test('wireframe.md outbound consent section contains Approve or approval prompt text', () => {
    assert.ok(
      wireframeMd.includes('Approve sending these prompts to Stitch'),
      'wireframe.md missing "Approve sending these prompts to Stitch" approval prompt text'
    );
  });
});

describe('CONSENT-02: inbound consent before persist', () => {
  test('wireframe.md contains inbound consent section with Persist prompt', () => {
    assert.ok(
      wireframeMd.includes('Persist these files locally'),
      'wireframe.md missing "Persist these files locally" inbound consent prompt'
    );
  });

  test('wireframe.md inbound consent appears BEFORE persist step (indexOf ordering)', () => {
    // The inbound consent AskUserQuestion appears at step 7, persist is step 8
    const inboundConsentIdx = wireframeMd.indexOf('Persist these files locally');
    const persistArtifactsIdx = wireframeMd.indexOf('Persist artifacts (only after inbound consent)');
    assert.ok(inboundConsentIdx !== -1, 'wireframe.md missing "Persist these files locally" inbound consent');
    assert.ok(persistArtifactsIdx !== -1, 'wireframe.md missing "Persist artifacts (only after inbound consent)" section');
    assert.ok(
      inboundConsentIdx < persistArtifactsIdx,
      `wireframe.md: inbound consent (index ${inboundConsentIdx}) does not appear before persist (index ${persistArtifactsIdx})`
    );
  });

  test('mockup.md contains inbound consent section', () => {
    assert.ok(
      mockupMd.includes('Persist this file locally'),
      'mockup.md missing "Persist this file locally" inbound consent prompt'
    );
  });
});

describe('CONSENT-03: data visibility in consent prompts', () => {
  test('wireframe.md outbound consent contains Google Stitch service name', () => {
    assert.ok(
      wireframeMd.includes('Google Stitch'),
      'wireframe.md outbound consent missing "Google Stitch" service name'
    );
  });

  test('wireframe.md outbound consent contains stitch.withgoogle.com URL', () => {
    assert.ok(
      wireframeMd.includes('stitch.withgoogle.com'),
      'wireframe.md outbound consent missing "stitch.withgoogle.com" URL'
    );
  });

  test('wireframe.md inbound consent shows HTML artifact type', () => {
    // The inbound consent prompt shows "HTML: STH-{slug}.html" artifact type
    assert.ok(
      wireframeMd.includes('STH-{slug}.html'),
      'wireframe.md inbound consent missing HTML artifact type reference'
    );
  });

  test('wireframe.md inbound consent shows target path .planning/design/ux/wireframes/', () => {
    // The inbound consent shows: "Target: .planning/design/ux/wireframes/"
    assert.ok(
      wireframeMd.includes('Target: .planning/design/ux/wireframes/'),
      'wireframe.md inbound consent missing "Target: .planning/design/ux/wireframes/" path'
    );
  });

  test('mockup.md consent prompts contain Google Stitch', () => {
    assert.ok(
      mockupMd.includes('Google Stitch'),
      'mockup.md consent prompts missing "Google Stitch" service name'
    );
  });

  test('mockup.md consent prompts show target mockups/ path', () => {
    assert.ok(
      mockupMd.includes('Target: .planning/design/ux/mockups/'),
      'mockup.md inbound consent missing "Target: .planning/design/ux/mockups/" path'
    );
  });
});

describe('CONSENT-04: batch consent for multi-screen', () => {
  test('wireframe.md contains batch consent — single AskUserQuestion with screen count/list BEFORE per-screen loop', () => {
    // The batch consent AskUserQuestion should appear before the per-screen loop
    const batchConsentIdx = wireframeMd.indexOf('AskUserQuestion');
    const perScreenLoopIdx = wireframeMd.indexOf('4-STITCH-C: Generate screens via Stitch (per-screen loop)');
    assert.ok(batchConsentIdx !== -1, 'wireframe.md missing AskUserQuestion batch consent');
    assert.ok(perScreenLoopIdx !== -1, 'wireframe.md missing 4-STITCH-C per-screen loop section');
    assert.ok(
      batchConsentIdx < perScreenLoopIdx,
      `wireframe.md: batch AskUserQuestion (index ${batchConsentIdx}) does not appear before per-screen loop (index ${perScreenLoopIdx})`
    );
  });

  test('wireframe.md batch consent mentions Screens ({count}) with screen listing', () => {
    assert.ok(
      wireframeMd.includes('Screens ({count}):'),
      'wireframe.md batch consent missing "Screens ({count}):" listing pattern'
    );
  });

  test('mockup.md contains similar batch consent pattern with Screens ({count})', () => {
    assert.ok(
      mockupMd.includes('Screens ({count}):'),
      'mockup.md batch consent missing "Screens ({count}):" listing pattern'
    );
  });
});
