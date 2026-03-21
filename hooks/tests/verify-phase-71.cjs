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
const { generateSuggestions, rankSuggestions, classifyPhase } = require(
  path.join(ROOT, 'bin', 'lib', 'idle-suggestions.cjs')
);

// ─── ENGN-01: Phase classification ────────────────────────────────────────────

test('ENGN-01: classifyPhase returns plan for plan_started event', () => {
  const result = classifyPhase({ event_type: 'plan_started' }, { fm: {}, body: '' }, null);
  assert.strictEqual(result, 'plan');
});

test('ENGN-01: classifyPhase returns design when DESIGN-STATE.md has incomplete stages', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'DESIGN-STATE.md'), '## Stages\n- [ ] wireframe\n- [x] brief\n', 'utf-8');
  const result = classifyPhase(null, { fm: {}, body: '' }, tmpDir);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.strictEqual(result, 'design');
});

test('ENGN-01: classifyPhase returns null on zero-state (no event, no STATE.md)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const result = classifyPhase(null, { fm: {}, body: '' }, tmpDir);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.strictEqual(result, null);
});

// ─── ENGN-02: Performance / synchronous ───────────────────────────────────────

test('ENGN-02: no async/await in source', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'bin', 'lib', 'idle-suggestions.cjs'), 'utf-8'
  );
  // Strip comments before checking
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  assert.ok(!noComments.includes('async '), 'source contains async keyword');
  assert.ok(!noComments.includes('await '), 'source contains await keyword');
});

test('ENGN-02: no http or fetch calls in source', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'bin', 'lib', 'idle-suggestions.cjs'), 'utf-8'
  );
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  assert.ok(!noComments.includes('http'), 'source contains http');
  assert.ok(!noComments.includes('fetch('), 'source contains fetch');
});

test('ENGN-02: generateSuggestions completes in under 2000ms', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const start = Date.now();
  generateSuggestions({ cwd: tmpDir, event: null });
  const elapsed = Date.now() - start;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.ok(elapsed < 2000, 'took ' + elapsed + 'ms (over 2000ms budget)');
});

// ─── ENGN-03: Priority ranking ────────────────────────────────────────────────

test('ENGN-03: blockers sort above all other categories', () => {
  const candidates = [
    { category: 'next_phase', text: 'prep task', minutes: 5, resumption: 'low' },
    { category: 'blocker', text: 'resolve auth error', minutes: 5, resumption: 'high' },
    { category: 'think', text: 'capture patterns', minutes: 5, resumption: 'low' },
  ];
  const { shown } = rankSuggestions(candidates, 'execute');
  assert.strictEqual(shown[0].category, 'blocker');
});

test('ENGN-03: multiple blockers all appear before next_phase', () => {
  const candidates = [
    { category: 'next_phase', text: 'review phase 72', minutes: 3, resumption: 'low' },
    { category: 'blocker', text: 'fix ci failure', minutes: 5, resumption: 'high' },
    { category: 'blocker', text: 'resolve merge conflict', minutes: 5, resumption: 'high' },
  ];
  const { shown } = rankSuggestions(candidates, 'execute');
  assert.strictEqual(shown[0].category, 'blocker');
  assert.strictEqual(shown[1].category, 'blocker');
  assert.ok(shown.findIndex(s => s.category === 'next_phase') > 1);
});

// ─── ENGN-04: Next-phase from ROADMAP.md ─────────────────────────────────────

test('ENGN-04: next-phase prep from ROADMAP.md fixture', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  const roadmapContent = [
    '## v0.10 Milestone',
    '',
    '- [x] **Phase 71: suggestion-engine** — engine module',
    '- [ ] **Phase 72: suggestion catalog** — idle-catalog.md',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), roadmapContent, 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '---\nstatus: executing\n---\n\n# State\n\n### Blockers/Concerns\n\n(None)\n', 'utf-8');
  const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'plan_started' } });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const lower = output.toLowerCase();
  assert.ok(
    lower.includes('phase 72') || lower.includes('suggestion catalog'),
    'output does not mention phase 72 or suggestion catalog: ' + output
  );
});

// ─── ENGN-05: Completed artifact paths ───────────────────────────────────────

test('ENGN-05: completed artifact paths in suggestions', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  const manifest = {
    artifacts: {
      wireframe: {
        status: 'complete',
        path: 'design/wireframe.md',
        name: 'Wireframe',
        code: 'WF'
      }
    }
  };
  // readManifest looks in .planning/design/design-manifest.json
  fs.writeFileSync(path.join(designDir, 'design-manifest.json'), JSON.stringify(manifest), 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '---\nstatus: executing\n---\n\n# State\n\n### Blockers/Concerns\n\n(None)\n', 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '## v0.10 Milestone\n\n- [ ] **Phase 72: suggestion catalog** — catalog\n', 'utf-8');
  const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'plan_started' } });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.ok(output.includes('wireframe.md'), 'output does not contain wireframe.md: ' + output);
});

// ─── ENGN-06: Time-bounded filtering ─────────────────────────────────────────

test('ENGN-06: time-bounded filtering removes over-budget suggestions', () => {
  const candidates = [
    { category: 'think', text: 'too long task', minutes: 60, resumption: 'low' },
    { category: 'blocker', text: 'quick fix', minutes: 3, resumption: 'high' },
  ];
  // plan budget is 5min — 60min candidate should be filtered
  const { shown, cut } = rankSuggestions(candidates, 'plan');
  const hasLong = shown.some(s => s.minutes === 60);
  assert.ok(!hasLong, 'over-budget candidate was not filtered out');
  assert.ok(cut >= 1, 'cut count should be >= 1, got ' + cut);
});

test('ENGN-06: stats footer shows cut count', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  // put lots of high-minute think entries via a manifest with no real artifacts but force think entries
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '---\nstatus: executing\n---\n\n# State\n\n### Blockers/Concerns\n\n(None)\n', 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '## v0.10\n\n', 'utf-8');
  // Use plan phase which has budget 5min — static think entries are 5min (edge — on budget)
  const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'plan_started' } });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  // Stats footer always present
  assert.ok(output.includes('cut:'), 'stats footer missing cut: field: ' + output);
});

// ─── FORMAT: Visual output structure ─────────────────────────────────────────

test('FORMAT: all four category headers present', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '---\nstatus: executing\n---\n\n# State\n\n### Blockers/Concerns\n\n(None)\n', 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '## v0.10\n\n- [ ] **Phase 72: suggestion catalog** — catalog\n', 'utf-8');
  const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'plan_started' } });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.ok(output.includes('// blocker'), 'missing // blocker header');
  assert.ok(output.includes('// next_phase'), 'missing // next_phase header');
  assert.ok(output.includes('// review'), 'missing // review header');
  assert.ok(output.includes('// think'), 'missing // think header');
});

test('FORMAT: empty categories show -- none', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  // No blockers, no artifacts, no roadmap next phase → review will be empty
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '---\nstatus: executing\n---\n\n# State\n\n### Blockers/Concerns\n\n(None)\n', 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '## v0.10\n\n', 'utf-8');
  const output = generateSuggestions({ cwd: tmpDir, event: { event_type: 'plan_started' } });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.ok(output.includes('-- none'), 'empty category does not show -- none: ' + output);
});

test('FORMAT: max 7 suggestions', () => {
  const candidates = [];
  for (let i = 0; i < 10; i++) {
    candidates.push({ category: 'think', text: 'task ' + i, minutes: 5, resumption: 'low' });
  }
  const { shown } = rankSuggestions(candidates, 'execute');
  assert.ok(shown.length <= 7, 'shown.length is ' + shown.length + ' (> 7)');
});

test('FORMAT: resumption cost block chars', () => {
  const low = [{ category: 'think', text: 'low', minutes: 5, resumption: 'low' }];
  const med = [{ category: 'think', text: 'med', minutes: 5, resumption: 'med' }];
  const high = [{ category: 'blocker', text: 'high', minutes: 5, resumption: 'high' }];
  const { shown: shownLow } = rankSuggestions(low, 'execute');
  const { shown: shownMed } = rankSuggestions(med, 'execute');
  const { shown: shownHigh } = rankSuggestions(high, 'execute');

  // Verify the block char lookup values
  const BLOCK = { low: '\u2591', med: '\u2592', high: '\u2588' };
  assert.strictEqual(shownLow[0].blockChar, BLOCK.low, 'low should map to ░ (' + shownLow[0].blockChar + ')');
  assert.strictEqual(shownMed[0].blockChar, BLOCK.med, 'med should map to ▒ (' + shownMed[0].blockChar + ')');
  assert.strictEqual(shownHigh[0].blockChar, BLOCK.high, 'high should map to █ (' + shownHigh[0].blockChar + ')');
});

// ─── ZERO-STATE: null phase returns awaiting message ─────────────────────────

test('ZERO-STATE: null phase returns awaiting message', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const output = generateSuggestions({ cwd: tmpDir, event: null });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.strictEqual(output, '// awaiting phase data...');
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
