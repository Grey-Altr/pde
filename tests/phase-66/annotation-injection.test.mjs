/**
 * annotation-injection.test.mjs
 * Phase 66 — Wireframe + Mockup Stitch Integration
 *
 * Tests: WFR-03 (annotation injection), EFF-05 (per-screen immediate injection)
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

describe('WFR-03: annotation injection', () => {
  test('wireframe.md contains <!-- @component: Navigation --> pattern', () => {
    assert.ok(
      wireframeMd.includes("'<!-- @component: Navigation -->'"),
      'wireframe.md missing <!-- @component: Navigation --> annotation pattern'
    );
  });

  test('wireframe.md contains <!-- @component: Header --> pattern', () => {
    assert.ok(
      wireframeMd.includes("'<!-- @component: Header -->'"),
      'wireframe.md missing <!-- @component: Header --> annotation pattern'
    );
  });

  test('wireframe.md contains <!-- @component: MainContent --> pattern', () => {
    assert.ok(
      wireframeMd.includes("'<!-- @component: MainContent -->'"),
      'wireframe.md missing <!-- @component: MainContent --> annotation pattern'
    );
  });

  test('wireframe.md contains <!-- @component: Section --> pattern', () => {
    assert.ok(
      wireframeMd.includes("'<!-- @component: Section -->'"),
      'wireframe.md missing <!-- @component: Section --> annotation pattern'
    );
  });

  test('wireframe.md contains <!-- @component: Form --> pattern', () => {
    assert.ok(
      wireframeMd.includes("'<!-- @component: Form -->'"),
      'wireframe.md missing <!-- @component: Form --> annotation pattern'
    );
  });

  test('wireframe.md contains all 5 semantic tag triggers: <nav', () => {
    assert.ok(
      wireframeMd.includes("'<nav'"),
      'wireframe.md missing <nav semantic tag trigger in componentMap'
    );
  });

  test('wireframe.md contains all 5 semantic tag triggers: <header', () => {
    assert.ok(
      wireframeMd.includes("'<header'"),
      'wireframe.md missing <header semantic tag trigger in componentMap'
    );
  });

  test('wireframe.md contains all 5 semantic tag triggers: <main', () => {
    assert.ok(
      wireframeMd.includes("'<main'"),
      'wireframe.md missing <main semantic tag trigger in componentMap'
    );
  });

  test('wireframe.md contains all 5 semantic tag triggers: <section', () => {
    assert.ok(
      wireframeMd.includes("'<section'"),
      'wireframe.md missing <section semantic tag trigger in componentMap'
    );
  });

  test('wireframe.md contains all 5 semantic tag triggers: <form', () => {
    assert.ok(
      wireframeMd.includes("'<form'"),
      'wireframe.md missing <form semantic tag trigger in componentMap'
    );
  });

  test('mockup.md also contains annotation injection section with Navigation pattern', () => {
    assert.ok(
      mockupMd.includes("'<!-- @component: Navigation -->'"),
      'mockup.md missing <!-- @component: Navigation --> annotation pattern'
    );
  });

  test('mockup.md contains all 5 semantic component patterns', () => {
    const patterns = [
      "'<!-- @component: Navigation -->'",
      "'<!-- @component: Header -->'",
      "'<!-- @component: MainContent -->'",
      "'<!-- @component: Section -->'",
      "'<!-- @component: Form -->'"
    ];
    for (const pattern of patterns) {
      assert.ok(
        mockupMd.includes(pattern),
        `mockup.md missing annotation pattern: ${pattern}`
      );
    }
  });
});

describe('EFF-05: per-screen immediate annotation', () => {
  test('In wireframe.md, annotation injection appears BEFORE manifest-add-artifact (indexOf ordering)', () => {
    const annotationIdx = wireframeMd.indexOf('Annotation injection');
    const manifestAddIdx = wireframeMd.indexOf('manifest-add-artifact STH-{slug}');
    assert.ok(annotationIdx !== -1, 'wireframe.md missing "Annotation injection" section');
    assert.ok(manifestAddIdx !== -1, 'wireframe.md missing "manifest-add-artifact STH-{slug}"');
    assert.ok(
      annotationIdx < manifestAddIdx,
      `annotation injection (index ${annotationIdx}) does not appear before manifest-add-artifact (index ${manifestAddIdx})`
    );
  });

  test('In wireframe.md, annotation section appears within the per-screen loop (between fetch and persist)', () => {
    // Annotation injection (step 6) should be after fetch-screen-code (step 4) but before Write/persist (step 8)
    const fetchCodeIdx = wireframeMd.indexOf('stitch:fetch-screen-code');
    const annotationIdx = wireframeMd.indexOf('Annotation injection (EFF-05');
    const persistIdx = wireframeMd.indexOf('Persist artifacts (only after inbound consent)');
    assert.ok(fetchCodeIdx !== -1, 'wireframe.md missing stitch:fetch-screen-code');
    assert.ok(annotationIdx !== -1, 'wireframe.md missing "Annotation injection (EFF-05" section marker');
    assert.ok(persistIdx !== -1, 'wireframe.md missing "Persist artifacts (only after inbound consent)" section');
    assert.ok(
      fetchCodeIdx < annotationIdx,
      `stitch:fetch-screen-code (index ${fetchCodeIdx}) does not appear before annotation injection (index ${annotationIdx})`
    );
    assert.ok(
      annotationIdx < persistIdx,
      `annotation injection (index ${annotationIdx}) does not appear before persist (index ${persistIdx})`
    );
  });

  test('In mockup.md, annotation injection appears before manifest-add-artifact', () => {
    const annotationIdx = mockupMd.indexOf('Annotation injection (EFF-05');
    const manifestAddIdx = mockupMd.indexOf('manifest-add-artifact STH-{slug}-hifi');
    assert.ok(annotationIdx !== -1, 'mockup.md missing "Annotation injection (EFF-05" section marker');
    assert.ok(manifestAddIdx !== -1, 'mockup.md missing "manifest-add-artifact STH-{slug}-hifi"');
    assert.ok(
      annotationIdx < manifestAddIdx,
      `mockup.md: annotation injection (index ${annotationIdx}) does not appear before manifest-add-artifact (index ${manifestAddIdx})`
    );
  });
});
