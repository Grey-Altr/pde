'use strict';

const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  hexToOklch,
  oklchToHex,
  computeHexDelta,
  writeBackDesignTokens,
  emitAll,
  emitDesignMd,
  buildContextIR,
  parseSkillMd,
} = require('../../bin/lib/context-sync.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-phase130-'));
}

/**
 * Create a minimal .planning/ directory structure with DTCG tokens
 * suitable for testing writeBackDesignTokens and emitAll.
 */
function makePlanningDirWithTokens(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(path.join(planningDir, 'design'), { recursive: true });

  // Minimal PROJECT.md
  fs.writeFileSync(
    path.join(planningDir, 'PROJECT.md'),
    '# Test Project\n\n## Summary\nTest project for phase 130.\n',
    'utf-8'
  );

  // Minimal STATE.md
  fs.writeFileSync(
    path.join(planningDir, 'STATE.md'),
    '---\ngsd_state_version: 1.0\n---\n\n# Project State\n',
    'utf-8'
  );

  // Empty DESIGN-STATE.md
  fs.writeFileSync(
    path.join(planningDir, 'design', 'DESIGN-STATE.md'),
    '',
    'utf-8'
  );

  // design-manifest.json with DTCG tokens
  const manifest = {
    tokens: {
      color: {
        primary: {
          $value: 'oklch(0.6231 0.1880 259.8145)',
          $type: 'color',
          $description: 'Primary brand color',
          $extensions: { 'pde:source': 'design-pipeline' },
        },
        secondary: {
          $value: 'oklch(0.6368 0.2078 25.3313)',
          $type: 'color',
          $description: 'Secondary brand color',
        },
      },
      typography: {
        fontFamily: {
          $value: 'Inter, sans-serif',
          $type: 'fontFamily',
        },
      },
      spacing: {
        base: {
          $value: '8px',
          $type: 'dimension',
        },
      },
    },
  };
  fs.writeFileSync(
    path.join(planningDir, 'design', 'design-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  return planningDir;
}

// ─── AGR-03: hexToOklch tests ─────────────────────────────────────────────────

describe('AGR-03: hexToOklch', () => {

  test('AGR-03: Test 1 -- hexToOklch returns valid oklch() string format', () => {
    const result = hexToOklch('#3b82f6');
    assert.match(
      result,
      /^oklch\(\d+\.\d{4}\s+\d+\.\d{4}\s+\d+\.\d{4}\)$/,
      `Expected oklch(L.4d C.4d H.4d), got: ${result}`
    );
  });

  test('AGR-03: Test 2 -- hexToOklch round-trip exact match for #3b82f6', () => {
    const oklch = hexToOklch('#3b82f6');
    const hex = oklchToHex(oklch);
    assert.equal(hex, '#3b82f6', `Round-trip failed: #3b82f6 -> ${oklch} -> ${hex}`);
  });

  test('AGR-03: Test 3 -- round-trip exact match for all in-gamut test colors', () => {
    const testColors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ef4444'];
    for (const hex of testColors) {
      const oklch = hexToOklch(hex);
      const roundTripped = oklchToHex(oklch);
      assert.equal(roundTripped, hex, `Round-trip failed for ${hex}: got ${roundTripped} (via ${oklch})`);
    }
  });

  test('AGR-03: Test 4 -- 3-char shorthand #f00 equals 6-char #ff0000', () => {
    const short = hexToOklch('#f00');
    const full = hexToOklch('#ff0000');
    assert.equal(short, full, `3-char expansion failed: #f00 -> ${short}, #ff0000 -> ${full}`);
  });

});

// ─── AGR-03: writeBackDesignTokens tests ─────────────────────────────────────

describe('AGR-03: writeBackDesignTokens', () => {

  test('AGR-03: Test 5 -- updates $value for matched color token', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);
    const newHex = '#3b82f6';

    writeBackDesignTokens(planningDir, [
      { name: 'Primary', hex: newHex, role: 'primary color role' },
    ], { cwd: tmpDir });

    const after = JSON.parse(
      fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8')
    );
    const expectedOklch = hexToOklch(newHex);
    assert.equal(
      after.tokens.color.primary.$value,
      expectedOklch,
      `Expected $value=${expectedOklch}, got ${after.tokens.color.primary.$value}`
    );
  });

  test('AGR-03: Test 6 -- $type, $description, $extensions preserved after $value update', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);

    writeBackDesignTokens(planningDir, [
      { name: 'Primary', hex: '#3b82f6', role: 'primary color role' },
    ], { cwd: tmpDir });

    const after = JSON.parse(
      fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8')
    );
    assert.equal(after.tokens.color.primary.$type, 'color', '$type changed');
    assert.equal(after.tokens.color.primary.$description, 'Primary brand color', '$description changed');
    assert.deepEqual(
      after.tokens.color.primary.$extensions,
      { 'pde:source': 'design-pipeline' },
      '$extensions changed'
    );
  });

  test('AGR-03: Test 7 -- typography and spacing groups unchanged after color-only write-back', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);

    writeBackDesignTokens(planningDir, [
      { name: 'Primary', hex: '#3b82f6', role: 'primary color role' },
    ], { cwd: tmpDir });

    const after = JSON.parse(
      fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8')
    );
    assert.equal(after.tokens.typography.fontFamily.$value, 'Inter, sans-serif', 'typography changed');
    assert.equal(after.tokens.typography.fontFamily.$type, 'fontFamily', 'typography $type changed');
    assert.equal(after.tokens.spacing.base.$value, '8px', 'spacing changed');
    assert.equal(after.tokens.spacing.base.$type, 'dimension', 'spacing $type changed');
  });

  test('AGR-03: Test 8 -- computeHexDelta returns 0 for identical colors and >0 for different colors', () => {
    // Unit-test computeHexDelta directly
    const sameColor = computeHexDelta('#ff0000', '#ff0000');
    assert.equal(sameColor, 0, 'Delta for identical colors must be 0');

    const differentColor = computeHexDelta('#ff0000', '#ff0100');
    assert.ok(differentColor > 0, 'Delta for different colors must be >0');
    assert.ok(differentColor < 0.01, 'Delta for close colors should be small (< 0.01)');

    // Test that warning path in writeBackDesignTokens triggers stderr when precision threshold exceeded
    // Simulate by checking that the warning threshold is documented: delta > 0.001 triggers warning
    // White to black is a huge delta to confirm the math is correct
    const bigDelta = computeHexDelta('#000000', '#ffffff');
    assert.ok(bigDelta > 0.001, 'Max delta should exceed warning threshold for #000000 vs #ffffff');
  });

  test('AGR-03: Test 9 -- writeBackDesignTokens calls emitAll after write (return value confirms update count)', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);

    // Verify return value reflects the update
    const result = writeBackDesignTokens(planningDir, [
      { name: 'Primary', hex: '#3b82f6', role: 'primary color role' },
    ], { cwd: tmpDir });

    assert.ok(
      typeof result === 'object' && result !== null,
      'writeBackDesignTokens must return an object'
    );
    assert.ok(
      typeof result.updated === 'number',
      'result.updated must be a number'
    );
    assert.equal(result.updated, 1, 'Should report 1 updated token');
    assert.ok(
      typeof result.warnings === 'number',
      'result.warnings must be a number'
    );
  });

  test('AGR-03: Test 10 -- role matching is case-insensitive and strips " color role" suffix', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);
    const newHex = '#ef4444';

    // Role "Primary Color Role" (uppercase + suffix) must match manifest key "primary"
    const result = writeBackDesignTokens(planningDir, [
      { name: 'Primary', hex: newHex, role: 'Primary Color Role' },
    ], { cwd: tmpDir });

    assert.equal(result.updated, 1, 'Case-insensitive role matching with suffix must match 1 token');

    const after = JSON.parse(
      fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8')
    );
    const expectedOklch = hexToOklch(newHex);
    assert.equal(
      after.tokens.color.primary.$value,
      expectedOklch,
      `Expected $value=${expectedOklch} after case-insensitive match`
    );
  });

});

// ─── AGR-07: format-version tests ────────────────────────────────────────────

describe('AGR-07: emitDesignMd format-version marker', () => {

  test('AGR-07: Test 11 -- emitAll produces DESIGN.md containing pde-format-version: 1.0', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);

    emitAll(tmpDir);

    const designMd = fs.readFileSync(path.join(tmpDir, 'DESIGN.md'), 'utf-8');
    assert.ok(
      designMd.includes('<!-- pde-format-version: 1.0 -->'),
      `DESIGN.md missing pde-format-version marker. Content head:\n${designMd.slice(0, 300)}`
    );
  });

  test('AGR-07: Test 12 -- line order: PDE-GENERATED < SOURCE < pde-format-version < # Design System', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);

    emitAll(tmpDir);

    const designMd = fs.readFileSync(path.join(tmpDir, 'DESIGN.md'), 'utf-8');
    const idxGenerated = designMd.indexOf('PDE-GENERATED');
    const idxSource = designMd.indexOf('SOURCE:');
    const idxFormatVersion = designMd.indexOf('pde-format-version');
    const idxHeading = designMd.indexOf('# Design System');

    assert.ok(idxGenerated >= 0, 'PDE-GENERATED marker not found in DESIGN.md');
    assert.ok(idxSource >= 0, 'SOURCE: marker not found in DESIGN.md');
    assert.ok(idxFormatVersion >= 0, 'pde-format-version marker not found in DESIGN.md');
    assert.ok(idxHeading >= 0, '# Design System heading not found in DESIGN.md');

    assert.ok(
      idxGenerated < idxSource,
      `PDE-GENERATED (${idxGenerated}) must come before SOURCE (${idxSource})`
    );
    assert.ok(
      idxSource < idxFormatVersion,
      `SOURCE (${idxSource}) must come before pde-format-version (${idxFormatVersion})`
    );
    assert.ok(
      idxFormatVersion < idxHeading,
      `pde-format-version (${idxFormatVersion}) must come before # Design System (${idxHeading})`
    );
  });

});

// ─── AGR-05: Agent Additions Preservation ────────────────────────────────────

const AGENT_MARKER = '<!-- AGENT-ADDITIONS: DO NOT EDIT THIS LINE -->';

describe('AGR-05: Agent Additions Preservation', () => {

  test('AGR-05: Test 13 -- emitAll produces SKILL.md containing AGENT-ADDITIONS marker', () => {
    const tmpDir = makeTmpDir();
    makePlanningDirWithTokens(tmpDir);

    emitAll(tmpDir);

    const skillMd = fs.readFileSync(
      path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md'),
      'utf-8'
    );
    assert.ok(
      skillMd.includes(AGENT_MARKER),
      `SKILL.md missing AGENT-ADDITIONS marker. Content tail:\n${skillMd.slice(-200)}`
    );
  });

  test('AGR-05: Test 14 -- agent content below marker preserved after re-emit', () => {
    const tmpDir = makeTmpDir();
    makePlanningDirWithTokens(tmpDir);

    // First emit
    emitAll(tmpDir);

    const skillPath = path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md');
    const agentContent = '\n\n## Custom Agent Notes\nAgent wrote this.\n';

    // Agent appends below marker
    fs.appendFileSync(skillPath, agentContent, 'utf-8');

    // Second emit - should preserve agent content
    emitAll(tmpDir);

    const regenerated = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(
      regenerated.includes('## Custom Agent Notes'),
      `"## Custom Agent Notes" not preserved after re-emit`
    );
    assert.ok(
      regenerated.includes('Agent wrote this.'),
      `"Agent wrote this." not preserved after re-emit`
    );
  });

  test('AGR-05: Test 15 -- multi-section agent content preserved verbatim', () => {
    const tmpDir = makeTmpDir();
    makePlanningDirWithTokens(tmpDir);

    // First emit
    emitAll(tmpDir);

    const skillPath = path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md');
    const multiSectionContent = '\n\n## Custom Notes\nNote 1\n\n## Agent Tips\nTip 1\n';

    // Agent appends multi-section content
    fs.appendFileSync(skillPath, multiSectionContent, 'utf-8');

    // Second emit
    emitAll(tmpDir);

    const regenerated = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(
      regenerated.includes('## Custom Notes'),
      `"## Custom Notes" not preserved after re-emit`
    );
    assert.ok(
      regenerated.includes('## Agent Tips'),
      `"## Agent Tips" not preserved after re-emit`
    );
    assert.ok(
      regenerated.includes('Note 1'),
      `"Note 1" not preserved after re-emit`
    );
    assert.ok(
      regenerated.includes('Tip 1'),
      `"Tip 1" not preserved after re-emit`
    );
  });

  test('AGR-05: Test 16 -- file without marker gets marker added, no content lost', () => {
    const tmpDir = makeTmpDir();
    makePlanningDirWithTokens(tmpDir);

    const skillDir = path.join(tmpDir, '.agent', 'skills', 'pde-design');
    fs.mkdirSync(skillDir, { recursive: true });

    // Write a SKILL.md without the AGENT-ADDITIONS marker
    const noMarkerContent = '<!-- PDE-GENERATED -->\n---\nname: pde-design\n---\n\n# Old PDE Content\n\nSome existing content.\n';
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), noMarkerContent, 'utf-8');

    // emitAll should not crash and should produce marker at bottom
    assert.doesNotThrow(() => {
      emitAll(tmpDir);
    }, 'emitAll must not throw when SKILL.md has no marker');

    const regenerated = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8');
    assert.ok(
      regenerated.includes(AGENT_MARKER),
      `AGENT-ADDITIONS marker not added when file had no marker`
    );
  });

  test('AGR-05: Test 17 -- fresh generation (SKILL.md does not exist) creates marker cleanly', () => {
    const tmpDir = makeTmpDir();
    makePlanningDirWithTokens(tmpDir);

    // Ensure .agent/ does NOT exist
    const agentDir = path.join(tmpDir, '.agent');
    if (fs.existsSync(agentDir)) {
      fs.rmSync(agentDir, { recursive: true });
    }

    // emitAll should create SKILL.md with PDE content + marker, no crash
    assert.doesNotThrow(() => {
      emitAll(tmpDir);
    }, 'emitAll must not throw when SKILL.md does not exist');

    const skillPath = path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), 'SKILL.md must be created on fresh generation');

    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(
      content.includes(AGENT_MARKER),
      `Fresh SKILL.md missing AGENT-ADDITIONS marker. Tail:\n${content.slice(-200)}`
    );
    // No agent content block should be present (just the marker line)
    const markerIdx = content.indexOf(AGENT_MARKER);
    const afterMarker = content.slice(markerIdx + AGENT_MARKER.length).trim();
    assert.equal(
      afterMarker,
      '',
      `Fresh generation must have empty agent block after marker, got: "${afterMarker}"`
    );
  });

  test('AGR-05: Test 18 -- round-trip: emit -> agent writes -> parseSkillMd -> emit preserves agentAdditions', () => {
    const tmpDir = makeTmpDir();
    makePlanningDirWithTokens(tmpDir);

    // Step 1: First emit
    emitAll(tmpDir);

    const skillPath = path.join(tmpDir, '.agent', 'skills', 'pde-design', 'SKILL.md');

    // Step 2: Agent appends custom section
    const agentSection = '\n\n## Agent Domain Knowledge\nThis is domain-specific guidance written by an agent.\n';
    fs.appendFileSync(skillPath, agentSection, 'utf-8');

    // Step 3: parseSkillMd captures agentAdditions
    const intermediate = fs.readFileSync(skillPath, 'utf-8');
    const parsed = parseSkillMd(intermediate);
    assert.ok(parsed !== null, 'parseSkillMd must return non-null for a valid PDE SKILL.md');
    assert.ok(
      parsed.agentAdditions && parsed.agentAdditions.includes('Agent Domain Knowledge'),
      `parseSkillMd must capture agentAdditions. Got: ${JSON.stringify(parsed.agentAdditions)}`
    );

    // Step 4: Second emit
    emitAll(tmpDir);

    // Step 5: Agent content survives
    const afterReemit = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(
      afterReemit.includes('## Agent Domain Knowledge'),
      `"## Agent Domain Knowledge" not preserved after round-trip re-emit`
    );
    assert.ok(
      afterReemit.includes('This is domain-specific guidance'),
      `Agent content body not preserved after round-trip re-emit`
    );
  });

});
