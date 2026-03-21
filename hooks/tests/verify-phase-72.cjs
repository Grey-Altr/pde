#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('PASS: ' + name);
    passed++;
  } catch (e) {
    console.log('FAIL: ' + name + ' — ' + (e.message || e));
    failed++;
  }
}

const ROOT = path.join(__dirname, '..', '..');
const { generateSuggestions } = require(
  path.join(ROOT, 'bin', 'lib', 'idle-suggestions.cjs')
);

// Minimal fixture helper — creates a temp dir with .planning/STATE.md and .planning/ROADMAP.md
function makeTmpFixture() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-72-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(
    path.join(planningDir, 'STATE.md'),
    '---\nstatus: executing\n---\n\n# State\n\n## Current Position\n\nPhase: 72\n\n### Blockers/Concerns\n\n(None)\n',
    'utf-8'
  );
  fs.writeFileSync(
    path.join(planningDir, 'ROADMAP.md'),
    '## v0.10\n\n- [ ] **Phase 73: Dashboard Integration** — pane 7\n',
    'utf-8'
  );
  return { tmpDir, planningDir };
}

// ─── CONT-01: catalog file has 6 sections with 3-5 entries each ──────────────

test('CONT-01: catalog file has exactly 6 sections', () => {
  const catalogPath = path.join(ROOT, '.planning', 'idle-catalog.md');
  const content = fs.readFileSync(catalogPath, 'utf-8');
  const headings = content.match(/^##\s+\w+/gm) || [];
  assert.strictEqual(headings.length, 6, 'expected 6 ## headings, got ' + headings.length + ': ' + headings.join(', '));
});

test('CONT-01: each catalog section has 3-5 bullet entries', () => {
  const catalogPath = path.join(ROOT, '.planning', 'idle-catalog.md');
  const content = fs.readFileSync(catalogPath, 'utf-8');
  const lines = content.split('\n');

  const sections = {};
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^##\s+(\w+)/);
    if (h) { current = h[1].toLowerCase(); sections[current] = 0; continue; }
    if (current && /^-\s+/.test(lines[i])) sections[current]++;
  }

  const names = Object.keys(sections);
  assert.strictEqual(names.length, 6, 'expected 6 sections in map, got ' + names.join(', '));
  for (const name of names) {
    const count = sections[name];
    assert.ok(count >= 3 && count <= 5,
      'section "' + name + '" has ' + count + ' entries (expected 3-5)');
  }
});

// ─── CONT-01: catalog entries parsed for matching phase type ─────────────────

test('CONT-01: catalog entries appear for matching phase type (execute)', () => {
  const catalogContent = [
    '## execute',
    '',
    '- capture: what edge cases did you discover during execution?',
    '  5min // resumption:low',
    '',
    '## default',
    '',
    '- capture: what would you tell a new team member about this project?',
    '  5min // resumption:low',
  ].join('\n');

  const { tmpDir, planningDir } = makeTmpFixture();
  try {
    const catalogPath = path.join(planningDir, 'idle-catalog.md');
    fs.writeFileSync(catalogPath, catalogContent, 'utf-8');

    const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'phase_started' }, catalogPath });
    assert.ok(output.includes('edge cases'),
      'catalog execute entry not found in output: ' + output);
    assert.ok(!output.includes('what decisions shaped this phase'),
      'STATIC_THINK text found in output (should have been replaced by catalog): ' + output);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── CONT-02: phase_complete surfaces artifact review with file path ──────────

test('CONT-02: phase_complete surfaces artifact review with specific file path', () => {
  const { tmpDir, planningDir } = makeTmpFixture();
  try {
    const designDir = path.join(planningDir, 'design');
    fs.mkdirSync(designDir, { recursive: true });

    const manifest = {
      artifacts: {
        BRF: {
          code: 'BRF',
          name: 'design brief',
          status: 'complete',
          path: '.planning/design/strategy/BRF-brief-v1.md'
        }
      }
    };
    fs.writeFileSync(path.join(designDir, 'design-manifest.json'), JSON.stringify(manifest), 'utf-8');

    const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'phase_complete' } });
    assert.ok(output.toLowerCase().includes('design brief'),
      'output does not include "design brief": ' + output);
    assert.ok(output.includes('BRF-brief-v1.md'),
      'output does not include "BRF-brief-v1.md": ' + output);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── CONT-03: each catalog section has at least one question ─────────────────

test('CONT-03: each catalog section has at least one question ending in ?', () => {
  const catalogPath = path.join(ROOT, '.planning', 'idle-catalog.md');
  const content = fs.readFileSync(catalogPath, 'utf-8');
  const lines = content.split('\n');

  const sections = {};
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^##\s+(\w+)/);
    if (h) { current = h[1].toLowerCase(); sections[current] = []; continue; }
    if (current && /^-\s+/.test(lines[i])) sections[current].push(lines[i]);
  }

  for (const name of Object.keys(sections)) {
    const hasQuestion = sections[name].some(line => line.trim().endsWith('?'));
    assert.ok(hasQuestion,
      'section "' + name + '" has no question-phrased entry (ending in ?): ' + sections[name].join(' | '));
  }
});

// ─── CONT-05: DESIGN-STATE [ ] items produce per-item think candidates ────────

test('CONT-05: DESIGN-STATE incomplete items produce per-item think candidates', () => {
  const { tmpDir, planningDir } = makeTmpFixture();
  try {
    fs.writeFileSync(
      path.join(planningDir, 'DESIGN-STATE.md'),
      '## Stages\n- [ ] Choose color palette\n- [ ] Select typography\n- [x] Define layout\n',
      'utf-8'
    );

    const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'phase_started' } });
    assert.ok(output.toLowerCase().includes('choose color palette'),
      'output does not include "choose color palette": ' + output);
    assert.ok(output.toLowerCase().includes('select typography'),
      'output does not include "select typography": ' + output);
    assert.ok(!output.toLowerCase().includes('define layout'),
      'output includes completed item "define layout" (should not): ' + output);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── CONT-05: DESIGN-STATE items appear under think, not review ──────────────

test('CONT-05: DESIGN-STATE items are under think header not review header', () => {
  const { tmpDir, planningDir } = makeTmpFixture();
  try {
    fs.writeFileSync(
      path.join(planningDir, 'DESIGN-STATE.md'),
      '## Stages\n- [ ] Choose color palette\n- [ ] Select typography\n- [x] Define layout\n',
      'utf-8'
    );

    const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'phase_started' } });
    const lines = output.split('\n');

    // Find positions of section headers and design-state items
    let reviewHeaderIdx = -1;
    let thinkHeaderIdx = -1;
    let colorPaletteIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('// review')) reviewHeaderIdx = i;
      if (lines[i].includes('// think')) thinkHeaderIdx = i;
      if (lines[i].toLowerCase().includes('choose color palette')) colorPaletteIdx = i;
    }

    assert.ok(colorPaletteIdx > -1, 'choose color palette not found in output: ' + output);
    assert.ok(thinkHeaderIdx > -1, '// think header not found in output: ' + output);

    // The item must appear after the think header, not between review and think headers
    assert.ok(colorPaletteIdx > thinkHeaderIdx,
      'color palette item (line ' + colorPaletteIdx + ') appears before // think header (line ' + thinkHeaderIdx + ')');
    if (reviewHeaderIdx > -1 && thinkHeaderIdx > reviewHeaderIdx) {
      assert.ok(
        !(colorPaletteIdx > reviewHeaderIdx && colorPaletteIdx < thinkHeaderIdx),
        'color palette item appears in the review section, not think section'
      );
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── CONT-06: all output entries have Nmin // resumption:cost label ───────────

test('CONT-06: all suggestion verb lines have Nmin // resumption:cost label on next line', () => {
  const { tmpDir, planningDir } = makeTmpFixture();
  try {
    const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'phase_started' } });
    const lines = output.split('\n');
    const verbPrefixes = ['address:', 'prep:', 'review:', 'capture:', 'decide:'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasVerb = verbPrefixes.some(v => line.includes(v));
      if (hasVerb) {
        const nextLine = lines[i + 1] || '';
        assert.ok(
          /^\s+\d+min\s*\/\/\s*resumption:(low|med|high)/.test(nextLine),
          'line "' + line.trim() + '" next line does not match label format: "' + nextLine.trim() + '"'
        );
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── Hook handler passes catalogPath ─────────────────────────────────────────

test('Hook handler passes catalogPath to generateSuggestions', () => {
  const hookPath = path.join(ROOT, 'hooks', 'idle-suggestions.cjs');
  const src = fs.readFileSync(hookPath, 'utf-8');
  assert.ok(src.includes('catalogPath'),
    'hooks/idle-suggestions.cjs does not contain "catalogPath"');
  assert.ok(src.includes('idle-catalog.md'),
    'hooks/idle-suggestions.cjs does not contain "idle-catalog.md"');
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
