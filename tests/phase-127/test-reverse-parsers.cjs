'use strict';

/**
 * test-reverse-parsers.cjs — Nyquist test suite for Phase 127 (CUR-01, CUR-02, AGR-01, AGR-02)
 *
 * CUR-01: parseMdcContent gate checks (null/empty/no-marker/corrupt input, frontmatter extraction)
 * CUR-02: Section mapping and PDE:BEGIN/END marker handling
 * AGR-01: parseSkillMd gate checks, section extraction, agentAdditions
 * AGR-02: parseDesignMd gate checks, color extraction, version detection
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const { parseMdcContent, parseSkillMd, parseDesignMd, emitAll } = require('../../bin/lib/context-sync.cjs');

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

// ─── AGR-01: parseSkillMd ────────────────────────────────────────────────────

const VALID_SKILL_MD = `<!-- PDE-GENERATED | hash:${VALID_HASH} | generated:${VALID_GENERATED} -->
---
name: pde-design
description: PDE design system context
---

# PDE Design System

## Goal
Provide design context.

## Instructions
Follow the design system.

## Design Tokens Available
Token data here

## Component Catalog
Component data here

## Constraints
- Use hex color values
- Follow typography hierarchy
`;

const SKILL_MD_WRONG_NAME = `<!-- PDE-GENERATED | hash:${VALID_HASH} | generated:${VALID_GENERATED} -->
---
name: other-skill
description: Some other skill
---

# Other Skill

## Goal
Something else.
`;

const SKILL_MD_WITH_AGENT_ADDITIONS = `<!-- PDE-GENERATED | hash:${VALID_HASH} | generated:${VALID_GENERATED} -->
---
name: pde-design
description: PDE design system context
---

# PDE Design System

## Goal
Provide design context.

## Instructions
Follow the design system.

## Design Tokens Available
Token data here

## Component Catalog
Component data here

## Constraints
- Use hex color values

## Custom Agent Notes
Agent wrote this.
`;

test('AGR-01: parseSkillMd(null) returns null', () => {
  const result = parseSkillMd(null);
  assert.equal(result, null, 'null input must return null');
});

test('AGR-01: parseSkillMd(no-marker-content) returns null', () => {
  const result = parseSkillMd('no PDE-GENERATED marker here');
  assert.equal(result, null, 'content without PDE-GENERATED marker must return null');
});

test('AGR-01: parseSkillMd(valid_with_wrong_name) returns null when frontmatter name != pde-design', () => {
  const result = parseSkillMd(SKILL_MD_WRONG_NAME);
  assert.equal(result, null, 'skill.md with name != pde-design must return null');
});

test('AGR-01: parseSkillMd(valid_skill_md) extracts designTokens, componentCatalog, constraints', () => {
  const result = parseSkillMd(VALID_SKILL_MD);
  assert.notEqual(result, null, 'valid skill.md must return an object');
  assert.ok(typeof result.designTokens === 'string', 'designTokens must be a string');
  assert.ok(result.designTokens.includes('Token data here'), 'designTokens must contain section content');
  assert.ok(typeof result.componentCatalog === 'string', 'componentCatalog must be a string');
  assert.ok(result.componentCatalog.includes('Component data here'), 'componentCatalog must contain section content');
  assert.ok(typeof result.constraints === 'string', 'constraints must be a string');
  assert.ok(result.constraints.includes('Use hex color values'), 'constraints must contain section content');
});

test('AGR-01: parseSkillMd captures unknown section as agentAdditions', () => {
  const result = parseSkillMd(SKILL_MD_WITH_AGENT_ADDITIONS);
  assert.notEqual(result, null, 'valid skill.md must return an object');
  assert.ok('agentAdditions' in result, 'agentAdditions must be present when unknown sections exist');
  assert.ok(result.agentAdditions.includes('Agent wrote this'), 'agentAdditions must contain unknown section content');
  assert.ok(result.agentAdditions.includes('Custom Agent Notes'), 'agentAdditions must include the section heading');
});

test('AGR-01: parseSkillMd handles marker-before-frontmatter ordering (PDE-GENERATED on line 1)', () => {
  // The marker appears on line 1, then --- frontmatter on line 2
  // This is the standard SKILL.md format from emitAntigravitySkill
  const result = parseSkillMd(VALID_SKILL_MD);
  assert.notEqual(result, null, 'marker-before-frontmatter format must parse correctly');
  // If we can extract sections, the header stripping worked correctly
  assert.ok('designTokens' in result || 'constraints' in result, 'must extract at least one field');
});

// ─── AGR-02: parseDesignMd ───────────────────────────────────────────────────

const VALID_DESIGN_MD = `<!-- PDE-GENERATED | hash:${VALID_HASH} | generated:${VALID_GENERATED} -->
<!-- pde-format-version: 1.0 -->
# Design System: Test Project
**Source Hash:** aaaaaaaaaaaa

## 2. Color Palette & Roles
- **Primary** (#3b82f6) -- primary color role
- **Secondary** (#8b5cf6) -- secondary color role
`;

const DESIGN_MD_NO_VERSION = `<!-- PDE-GENERATED | hash:${VALID_HASH} | generated:${VALID_GENERATED} -->
# Design System: Test Project
**Source Hash:** aaaaaaaaaaaa

## 2. Color Palette & Roles
- **Primary** (#3b82f6) -- primary color role
- **Secondary** (#8b5cf6) -- secondary color role
`;

const PLACEHOLDER_DESIGN_MD = `<!-- PDE-GENERATED | hash:${VALID_HASH} | generated:${VALID_GENERATED} -->
# Design System: Test Project

Design tokens not yet generated -- run the PDE design pipeline to populate this file.

## 2. Color Palette & Roles

Not yet generated.
`;

test('AGR-02: parseDesignMd(null) returns null', () => {
  const result = parseDesignMd(null);
  assert.equal(result, null, 'null input must return null');
});

test('AGR-02: parseDesignMd(no-marker-content) returns null', () => {
  const result = parseDesignMd('no PDE-GENERATED marker here');
  assert.equal(result, null, 'content without PDE-GENERATED marker must return null');
});

test('AGR-02: parseDesignMd(valid_design_md) extracts hex colors from Color Palette', () => {
  const result = parseDesignMd(VALID_DESIGN_MD);
  assert.notEqual(result, null, 'valid design.md must return an object');
  assert.ok('designTokens' in result, 'designTokens must be present');
  assert.ok(result.designTokens.includes('#3b82f6'), 'designTokens must contain primary hex color');
  assert.ok(result.designTokens.includes('#8b5cf6'), 'designTokens must contain secondary hex color');
  assert.ok(result.designTokens.includes('Primary'), 'designTokens must contain role name');
});

test('AGR-02: parseDesignMd(design_md_without_format_version) still extracts colors (lenient fallback)', () => {
  const stderrMessages = [];
  const origWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (msg, ...args) => { stderrMessages.push(String(msg)); return origWrite(msg, ...args); };

  let result;
  try {
    result = parseDesignMd(DESIGN_MD_NO_VERSION);
  } finally {
    process.stderr.write = origWrite;
  }

  assert.notEqual(result, null, 'missing version marker must still return an object (lenient fallback)');
  assert.ok('designTokens' in result, 'designTokens must still be extracted without version marker');
  assert.ok(result.designTokens.includes('#3b82f6'), 'colors must be extracted even without version marker');
  const hasVersionWarning = stderrMessages.some(m => m.includes('pde-format-version'));
  assert.ok(hasVersionWarning, 'must log warning when pde-format-version marker is absent');
});

test('AGR-02: parseDesignMd(placeholder_design_md) returns {} (no color entries, valid empty partial)', () => {
  const result = parseDesignMd(PLACEHOLDER_DESIGN_MD);
  assert.notEqual(result, null, 'placeholder design.md must return an object, not null');
  assert.deepEqual(result, {}, 'placeholder design.md must return empty object {}');
});

// ─── Round-trip integration tests ────────────────────────────────────────────

test('Round-trip: emitAll() -> read pde-project.mdc -> parseMdcContent() -> partial.constraints present', () => {
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);
  emitAll(baseDir);
  const mdcPath = path.join(baseDir, '.cursor', 'rules', 'pde-project.mdc');
  assert.ok(fs.existsSync(mdcPath), 'pde-project.mdc must be emitted by emitAll()');
  const content = fs.readFileSync(mdcPath, 'utf-8');
  const partial = parseMdcContent(content, 'pde-project.mdc');
  assert.notEqual(partial, null, 'parseMdcContent must return non-null for PDE-authored .mdc file');
  assert.ok('constraints' in partial, 'partial IR must have constraints field after round-trip');
});

test('Round-trip: emitAll() -> read SKILL.md -> parseSkillMd() -> partial contains at least one IR field', () => {
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);
  emitAll(baseDir);
  const skillPath = path.join(baseDir, '.agent', 'skills', 'pde-design', 'SKILL.md');
  assert.ok(fs.existsSync(skillPath), 'SKILL.md must be emitted by emitAll()');
  const content = fs.readFileSync(skillPath, 'utf-8');
  const partial = parseSkillMd(content);
  assert.notEqual(partial, null, 'parseSkillMd must return non-null for PDE-authored SKILL.md');
  // At minimum one field must be extractable (Constraints is always hardcoded in SKILL.md)
  const hasField = 'designTokens' in partial || 'componentCatalog' in partial || 'constraints' in partial;
  assert.ok(hasField, 'partial IR must have at least one extractable field after round-trip');
});

test('Exports check: parseMdcContent, parseSkillMd, parseDesignMd all present in module.exports', () => {
  const m = require('../../bin/lib/context-sync.cjs');
  assert.equal(typeof m.parseMdcContent, 'function', 'parseMdcContent must be exported as a function');
  assert.equal(typeof m.parseSkillMd, 'function', 'parseSkillMd must be exported as a function');
  assert.equal(typeof m.parseDesignMd, 'function', 'parseDesignMd must be exported as a function');
});
