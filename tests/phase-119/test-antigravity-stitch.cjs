'use strict';

/**
 * test-antigravity-stitch.cjs — Structural tests for Antigravity + Stitch bridge
 *
 * Covers requirements: CTX-05, STH-01, STH-02, STH-03
 * Tests run in isolated temp directories — no side effects on real project.
 *
 * Run: node --test tests/phase-119/test-antigravity-stitch.cjs
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  buildContextIR,
  emitAll,
  emitAntigravitySkill,
  emitDesignMd,
  oklchToHex,
  isStitchSource,
} = require('../../bin/lib/context-sync.cjs');

// ─── Test fixture helpers ──────────────────────────────────────────────────

function createMockPlanningWithTokens(tmpDir) {
  const planningDir = path.join(tmpDir, '.planning');
  const designDir = path.join(planningDir, 'design');
  const handoffDir = path.join(designDir, 'handoff');

  fs.mkdirSync(handoffDir, { recursive: true });

  fs.writeFileSync(
    path.join(planningDir, 'PROJECT.md'),
    [
      '# Test Project',
      '',
      'A test project for Antigravity context verification.',
      '',
      '## Tech Stack',
      'Node.js, TypeScript',
      '',
      '## Constraints',
      'Zero npm deps at plugin root.',
    ].join('\n'),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(planningDir, 'STATE.md'),
    [
      '---',
      'milestone: v0.15',
      '---',
      '# Project State',
      'Phase: 119',
    ].join('\n'),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(designDir, 'DESIGN-STATE.md'),
    [
      '# Design State',
      'Stage: handoff',
      'Completion: 80%',
      'Status: active',
    ].join('\n'),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(designDir, 'design-manifest.json'),
    JSON.stringify({
      projectName: 'Test',
      productType: 'software',
      tokens: {
        color: {
          primary: { $value: 'oklch(0.7 0.15 150)', $type: 'color' },
          secondary: { $value: 'oklch(0.5 0.1 250)', $type: 'color' },
          surface: { $value: 'oklch(0.95 0.02 90)', $type: 'color' },
          text: { $value: 'oklch(0.2 0.01 270)', $type: 'color' },
        },
        spacing: {
          base: { $value: '8px', $type: 'dimension' },
          lg: { $value: '24px', $type: 'dimension' },
        },
        typography: {
          fontFamily: { $value: 'Inter, sans-serif', $type: 'fontFamily' },
        },
      },
      artifacts: [],
      designCoverage: { palette: true, typography: true },
    }),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(handoffDir, 'HND-button.md'),
    [
      '# Button Component',
      '',
      'A reusable button component with primary and secondary variants.',
    ].join('\n'),
    'utf-8'
  );

  return planningDir;
}

// ─── oklchToHex tests ──────────────────────────────────────────────────────

describe('oklchToHex', () => {
  it('converts oklch(0.7 0.15 150) to a valid 7-char hex string', () => {
    const result = oklchToHex('oklch(0.7 0.15 150)');
    assert.match(result, /^#[0-9a-f]{6}$/i, `Expected 7-char hex, got: ${result}`);
  });

  it('converts oklch(0 0 0) to #000000 (black)', () => {
    assert.equal(oklchToHex('oklch(0 0 0)'), '#000000');
  });

  it('converts oklch(1 0 0) to #ffffff (white)', () => {
    assert.equal(oklchToHex('oklch(1 0 0)'), '#ffffff');
  });

  it('passes through non-OKLCH values unchanged', () => {
    assert.equal(oklchToHex('not-oklch'), 'not-oklch');
    assert.equal(oklchToHex('#ff0000'), '#ff0000');
    assert.equal(oklchToHex('rgb(255,0,0)'), 'rgb(255,0,0)');
  });

  it('clamps out-of-gamut values (no hex digits outside 00-ff)', () => {
    // High chroma value that may exceed sRGB gamut
    const result = oklchToHex('oklch(0.8 0.4 150)');
    assert.match(result, /^#[0-9a-f]{6}$/i, `Must be valid hex even for out-of-gamut: ${result}`);
    // Verify each channel is 00-ff (already guaranteed by hex format but double-check)
    const r = parseInt(result.slice(1, 3), 16);
    const g = parseInt(result.slice(3, 5), 16);
    const b = parseInt(result.slice(5, 7), 16);
    assert.ok(r >= 0 && r <= 255, `Red channel must be 0-255, got ${r}`);
    assert.ok(g >= 0 && g <= 255, `Green channel must be 0-255, got ${g}`);
    assert.ok(b >= 0 && b <= 255, `Blue channel must be 0-255, got ${b}`);
  });
});

// ─── STH-02: Antigravity Stitch detection via manifest metadata ─────────────

describe('STH-02: Antigravity Stitch detection via manifest metadata', () => {
  it('returns true for "stitch"', () => {
    assert.equal(isStitchSource('stitch'), true);
  });

  it('returns true for "antigravity-stitch"', () => {
    assert.equal(isStitchSource('antigravity-stitch'), true);
  });

  it('returns false for "pde"', () => {
    assert.equal(isStitchSource('pde'), false);
  });

  it('returns false for undefined', () => {
    assert.equal(isStitchSource(undefined), false);
  });

  it('returns false for null', () => {
    assert.equal(isStitchSource(null), false);
  });

  it('returns false for partial match like "stitch-v2"', () => {
    assert.equal(isStitchSource('stitch-v2'), false);
  });
});

// ─── CTX-05: emitAntigravitySkill tests ────────────────────────────────────

describe('CTX-05: emitAntigravitySkill', () => {
  let tmpDir;
  let planningDir;
  let ir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-skill-'));
    planningDir = createMockPlanningWithTokens(tmpDir);
    ir = buildContextIR(planningDir);
    emitAntigravitySkill(ir, tmpDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates .agent/skills/pde-design/SKILL.md', () => {
    const skillPath = path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), 'SKILL.md must exist');
  });

  it('SKILL.md contains YAML frontmatter with name: pde-design', () => {
    const content = fs.readFileSync(
      path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md'),
      'utf-8'
    );
    // Find frontmatter between --- delimiters (after PDE-GENERATED header)
    const fmMatch = content.match(/---\n([\s\S]*?)\n---/);
    assert.ok(fmMatch, 'Must have YAML frontmatter between --- delimiters');
    assert.ok(fmMatch[1].includes('name: pde-design'), 'Frontmatter must have name: pde-design');
  });

  it('SKILL.md contains description field in frontmatter', () => {
    const content = fs.readFileSync(
      path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md'),
      'utf-8'
    );
    const fmMatch = content.match(/---\n([\s\S]*?)\n---/);
    assert.ok(fmMatch[1].includes('description:'), 'Frontmatter must have description field');
  });

  it('SKILL.md contains PDE-GENERATED marker', () => {
    const content = fs.readFileSync(
      path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md'),
      'utf-8'
    );
    assert.ok(content.includes('<!-- PDE-GENERATED'), 'Must have PDE-GENERATED marker');
  });

  it('SKILL.md body has required sections', () => {
    const content = fs.readFileSync(
      path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md'),
      'utf-8'
    );
    assert.ok(content.includes('## Goal'), 'Must have Goal section');
    assert.ok(content.includes('## Instructions'), 'Must have Instructions section');
    assert.ok(content.includes('## Design Tokens Available'), 'Must have Design Tokens Available section');
    assert.ok(content.includes('## Component Catalog'), 'Must have Component Catalog section');
    assert.ok(content.includes('## Constraints'), 'Must have Constraints section');
  });
});

// ─── STH-01: emitDesignMd tests ────────────────────────────────────────────

describe('STH-01: emitDesignMd', () => {
  let tmpDir;
  let planningDir;
  let ir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-design-'));
    planningDir = createMockPlanningWithTokens(tmpDir);
    ir = buildContextIR(planningDir);
    emitDesignMd(ir, tmpDir, planningDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates DESIGN.md at project root', () => {
    assert.ok(fs.existsSync(path.join(tmpDir, 'DESIGN.md')), 'DESIGN.md must exist');
  });

  it('DESIGN.md contains PDE-GENERATED marker', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'DESIGN.md'), 'utf-8');
    assert.ok(content.includes('<!-- PDE-GENERATED'), 'Must have PDE-GENERATED marker');
  });

  it('DESIGN.md has 5 required sections', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'DESIGN.md'), 'utf-8');
    assert.ok(content.includes('## 1.'), 'Must have section 1');
    assert.ok(content.includes('## 2.'), 'Must have section 2');
    assert.ok(content.includes('## 3.'), 'Must have section 3');
    assert.ok(content.includes('## 4.'), 'Must have section 4');
    assert.ok(content.includes('## 5.'), 'Must have section 5');
  });

  it('Color Palette section contains hex codes when DTCG tokens have OKLCH values', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'DESIGN.md'), 'utf-8');
    // Extract section 2 content
    const section2Match = content.match(/## 2\.[^]*?(?=## 3\.|$)/);
    assert.ok(section2Match, 'Must have section 2');
    const hexMatches = section2Match[0].match(/#[0-9a-f]{6}/gi);
    assert.ok(hexMatches && hexMatches.length > 0, 'Color Palette must contain hex codes');
  });

  it('Color Palette does NOT contain OKLCH values', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'DESIGN.md'), 'utf-8');
    const section2Match = content.match(/## 2\.[^]*?(?=## 3\.|$)/);
    assert.ok(section2Match, 'Must have section 2');
    assert.ok(!section2Match[0].includes('oklch('), 'Color Palette must not contain oklch() values');
  });

  it('gracefully handles missing tokens with placeholder content', () => {
    const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-notokens-'));
    const planDir2 = path.join(tmpDir2, '.planning');
    const designDir2 = path.join(planDir2, 'design');
    fs.mkdirSync(path.join(designDir2, 'handoff'), { recursive: true });

    fs.writeFileSync(path.join(planDir2, 'PROJECT.md'), '# Empty Project\n\nNo tokens.\n', 'utf-8');
    fs.writeFileSync(path.join(planDir2, 'STATE.md'), '---\nmilestone: v0.15\n---\n# State\n', 'utf-8');
    fs.writeFileSync(path.join(designDir2, 'DESIGN-STATE.md'), '# Design State\n', 'utf-8');
    fs.writeFileSync(
      path.join(designDir2, 'design-manifest.json'),
      JSON.stringify({ projectName: 'Empty', productType: 'software', artifacts: [] }),
      'utf-8'
    );

    const ir2 = buildContextIR(planDir2);
    emitDesignMd(ir2, tmpDir2, planDir2);

    const content = fs.readFileSync(path.join(tmpDir2, 'DESIGN.md'), 'utf-8');
    assert.ok(content.includes('<!-- PDE-GENERATED'), 'Placeholder DESIGN.md must have PDE-GENERATED marker');
    assert.ok(
      content.toLowerCase().includes('not yet generated') || content.toLowerCase().includes('placeholder'),
      'Placeholder DESIGN.md must indicate tokens not yet generated'
    );

    fs.rmSync(tmpDir2, { recursive: true, force: true });
  });
});

// ─── STH-03: emitAll extension tests ───────────────────────────────────────

describe('STH-03: emitAll extension', () => {
  let tmpDir;
  let result;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-emitall-'));
    createMockPlanningWithTokens(tmpDir);
    result = emitAll(tmpDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emitAll returns object with antigravitySkill key', () => {
    assert.ok('antigravitySkill' in result, 'Must have antigravitySkill key');
    assert.equal(result.antigravitySkill.written, true);
  });

  it('emitAll returns object with designMd key', () => {
    assert.ok('designMd' in result, 'Must have designMd key');
    assert.equal(result.designMd.written, true);
  });

  it('both SKILL.md and DESIGN.md exist after emitAll', () => {
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md')),
      'SKILL.md must exist after emitAll'
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, 'DESIGN.md')),
      'DESIGN.md must exist after emitAll'
    );
  });
});

// ─── STH-03: cmdContextSync --editor antigravity ───────────────────────────

describe('STH-03: cmdContextSync --editor antigravity', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-cmd-'));
    createMockPlanningWithTokens(tmpDir);
    // Capture output by redirecting the output function
    const { cmdContextSync } = require('../../bin/lib/context-sync.cjs');
    cmdContextSync(tmpDir, ['--editor', 'antigravity'], true);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces SKILL.md when --editor antigravity', () => {
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md')),
      'SKILL.md must exist'
    );
  });

  it('produces DESIGN.md when --editor antigravity', () => {
    assert.ok(
      fs.existsSync(path.join(tmpDir, 'DESIGN.md')),
      'DESIGN.md must exist'
    );
  });

  it('does NOT produce .cursor/rules/ when --editor antigravity', () => {
    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.cursor', 'rules')),
      '.cursor/rules/ must NOT exist for antigravity-only'
    );
  });

  it('does NOT produce GEMINI.md when --editor antigravity', () => {
    assert.ok(
      !fs.existsSync(path.join(tmpDir, 'GEMINI.md')),
      'GEMINI.md must NOT exist for antigravity-only'
    );
  });
});
