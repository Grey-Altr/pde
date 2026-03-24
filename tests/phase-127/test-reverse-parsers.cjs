'use strict';

/**
 * test-reverse-parsers.cjs — Nyquist test suite for Phase 127 (CUR-01, CUR-02)
 *
 * CUR-01: parseMdcContent gate checks (null/empty/no-marker/corrupt input, frontmatter extraction)
 * CUR-02: Section mapping and PDE:BEGIN/END marker handling
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const { parseMdcContent } = require('../../bin/lib/context-sync.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-127-test-'));
}

function makePlanningDir(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), '# Test Project\n', 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '# State\n', 'utf-8');
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  fs.writeFileSync(path.join(designDir, 'DESIGN-STATE.md'), '', 'utf-8');
  fs.writeFileSync(path.join(designDir, 'design-manifest.json'), '{}', 'utf-8');
  return planningDir;
}

// ─── Fixture helpers ─────────────────────────────────────────────────────────

const VALID_HASH = 'a'.repeat(64);
const VALID_GENERATED = '2025-01-01T00:00:00.000Z';
const PDE_GENERATED_MARKER = `<!-- PDE-GENERATED | hash:${VALID_HASH} | generated:${VALID_GENERATED} -->`;

function makeValidMdc(opts = {}) {
  const {
    description = 'Test rule description',
    globs = '"**/*.ts"',
    alwaysApply = false,
    bodyContent = '## Conventions\n- Use TypeScript strict mode\n- Follow ESLint rules',
  } = opts;

  const frontmatterLines = ['---', `description: ${description}`];
  if (globs !== undefined && globs !== null) {
    frontmatterLines.push(`globs: ${globs}`);
  }
  frontmatterLines.push(`alwaysApply: ${alwaysApply}`);
  frontmatterLines.push('---');

  return `${frontmatterLines.join('\n')}\n\n${PDE_GENERATED_MARKER}\n\n${bodyContent}`;
}

// ─── CUR-01: Gate checks ──────────────────────────────────────────────────────

test('CUR-01: parseMdcContent(null, ...) returns null', () => {
  const result = parseMdcContent(null, 'pde-project.mdc');
  assert.equal(result, null, 'null input must return null');
});

test('CUR-01: parseMdcContent("", ...) returns null', () => {
  const result = parseMdcContent('', 'pde-project.mdc');
  assert.equal(result, null, 'empty string input must return null');
});

test('CUR-01: parseMdcContent(no-marker-content, ...) returns null', () => {
  const result = parseMdcContent('no PDE-GENERATED marker here', 'pde-project.mdc');
  assert.equal(result, null, 'content without PDE-GENERATED marker must return null');
});

test('CUR-01: parseMdcContent(corrupt_content, ...) returns null without throwing', () => {
  // Corrupt: has PDE-GENERATED marker but no valid frontmatter
  const corrupt = `${PDE_GENERATED_MARKER}\nsome random corrupt content without frontmatter`;
  let result;
  assert.doesNotThrow(() => {
    result = parseMdcContent(corrupt, 'pde-project.mdc');
  }, 'must not throw on corrupt content');
  assert.equal(result, null, 'corrupt content must return null');
});

test('CUR-01: parseMdcContent(valid_content, ...) extracts frontmatter fields', () => {
  const content = makeValidMdc({
    description: 'My awesome rule',
    globs: '"src/**/*.ts"',
    alwaysApply: false,
  });
  const result = parseMdcContent(content, 'pde-project.mdc');
  assert.notEqual(result, null, 'valid content must return an object');
  assert.equal(result.description, 'My awesome rule', 'description must be extracted');
  assert.equal(result.globs, '"src/**/*.ts"', 'globs must be extracted');
  assert.equal(result.alwaysApply, false, 'alwaysApply must be false');
});

test('CUR-01: parseMdcContent(valid_content_no_globs, ...) returns globs as null when absent', () => {
  const content = makeValidMdc({ globs: null });
  const result = parseMdcContent(content, 'pde-project.mdc');
  assert.notEqual(result, null, 'valid content must return an object');
  assert.equal(result.globs, null, 'globs must be null when absent, not empty string');
});

// ─── CUR-02: Section mapping and PDE:BEGIN/END ────────────────────────────────

test('CUR-02: pde-project.mdc with ## Conventions -> partial.constraints contains section content', () => {
  const content = makeValidMdc({
    bodyContent: '## Conventions\n- Use TypeScript strict mode\n- Follow ESLint rules',
  });
  const result = parseMdcContent(content, 'pde-project.mdc');
  assert.notEqual(result, null, 'must return an object');
  assert.ok(typeof result.constraints === 'string', 'constraints must be a string');
  assert.ok(result.constraints.includes('TypeScript strict mode'), 'constraints must contain section content');
});

test('CUR-02: pde-architecture.mdc with ## Tech Stack -> partial.techStack contains section content', () => {
  const content = makeValidMdc({
    bodyContent: '## Tech Stack\n- Node.js 20\n- TypeScript 5',
  });
  const result = parseMdcContent(content, 'pde-architecture.mdc');
  assert.notEqual(result, null, 'must return an object');
  assert.ok(typeof result.techStack === 'string', 'techStack must be a string');
  assert.ok(result.techStack.includes('Node.js 20'), 'techStack must contain section content');
});

test('CUR-02: content with PDE:BEGIN/PDE:END -> only content between markers is extracted as pdeOwned', () => {
  const userContentAbove = 'User content above that should be ignored';
  const pdeContent = '## Conventions\n- PDE rule here';
  const userContentBelow = 'User content below that should be ignored';
  const body = `${userContentAbove}\n<!-- PDE:BEGIN -->\n${pdeContent}\n<!-- PDE:END -->\n${userContentBelow}`;

  const content = makeValidMdc({ bodyContent: body });
  const result = parseMdcContent(content, 'pde-project.mdc');
  assert.notEqual(result, null, 'must return an object');
  assert.ok(result.constraints.includes('PDE rule here'), 'constraints must contain PDE-owned content');
  assert.ok(!result.constraints.includes('User content above'), 'must not contain user content above markers');
  assert.ok(!result.constraints.includes('User content below'), 'must not contain user content below markers');
});

test('CUR-02: content WITHOUT PDE:BEGIN/PDE:END -> entire body after frontmatter is PDE-owned (D-07 backward compat)', () => {
  const content = makeValidMdc({
    bodyContent: '## Conventions\n- Backward compat rule\n',
  });
  // Confirm no PDE:BEGIN in fixture
  assert.ok(!content.includes('PDE:BEGIN'), 'fixture must not have PDE:BEGIN markers');
  const result = parseMdcContent(content, 'pde-project.mdc');
  assert.notEqual(result, null, 'must return an object');
  assert.ok(result.constraints.includes('Backward compat rule'), 'constraints must include section content from full body');
});

test('CUR-02: malformed markers (BEGIN present, END absent) -> no crash, returns partial with frontmatter only', () => {
  const body = `## Conventions\n- Some rule\n<!-- PDE:BEGIN -->\nOrphaned begin marker without end`;
  const content = makeValidMdc({ bodyContent: body });
  let result;
  assert.doesNotThrow(() => {
    result = parseMdcContent(content, 'pde-project.mdc');
  }, 'must not throw on malformed markers');
  assert.notEqual(result, null, 'must return an object (not null) — frontmatter is still valid');
  assert.equal(typeof result.description, 'string', 'frontmatter description must still be present');
  // constraints should be empty or absent — malformed markers mean no PDE content extracted from section
  assert.ok(
    result.constraints === '' || result.constraints === undefined,
    'constraints must be empty when markers are malformed'
  );
});
