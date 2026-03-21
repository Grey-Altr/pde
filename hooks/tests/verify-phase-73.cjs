#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { execFileSync } = require('child_process');

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

// ─── DASH-01: P6 in build_full_layout() only ──────────────────────────────
test('DASH-01: build_full_layout contains P6 split', () => {
  const src = fs.readFileSync(path.join(ROOT, 'bin', 'monitor-dashboard.sh'), 'utf-8');
  assert.ok(src.includes('P6=$(tmux split-window'), 'P6 split-window missing');
  assert.ok(src.includes('"suggestions"'), 'suggestions pane title missing');
});

// ─── DASH-02: pane-suggestions.sh reads file with ANSI formatting ──────────
test('DASH-02: pane-suggestions.sh exists and has polling loop', () => {
  const scriptPath = path.join(ROOT, 'bin', 'pane-suggestions.sh');
  assert.ok(fs.existsSync(scriptPath), 'pane-suggestions.sh missing');
  const src = fs.readFileSync(scriptPath, 'utf-8');
  assert.ok(src.includes('while true'), 'polling loop missing');
  assert.ok(src.includes('sleep 3'), 'sleep 3 missing');
  assert.ok(src.includes('\\033['), 'ANSI escape codes missing');
  assert.ok(!src.includes('tail -F'), 'must not use tail -F (file is atomically replaced)');
});

// ─── DASH-03: zero-state message present ───────────────────────────────────
test('DASH-03: zero-state message in pane script', () => {
  const src = fs.readFileSync(path.join(ROOT, 'bin', 'pane-suggestions.sh'), 'utf-8');
  assert.ok(
    src.includes('Waiting for PDE to start a phase'),
    'zero-state message missing from pane-suggestions.sh'
  );
});

// ─── DASH-04: build_minimal_layout unchanged ──────────────────────────────
test('DASH-04: build_minimal_layout has no P6 or suggestions references', () => {
  const src = fs.readFileSync(path.join(ROOT, 'bin', 'monitor-dashboard.sh'), 'utf-8');
  const minimalMatch = src.match(/build_minimal_layout\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(minimalMatch, 'build_minimal_layout function not found');
  const minimalBody = minimalMatch[1];
  assert.ok(!minimalBody.includes('P6'), 'build_minimal_layout must not reference P6');
  assert.ok(!minimalBody.includes('suggestion'), 'build_minimal_layout must not reference suggestions');
  assert.ok(minimalBody.includes('P0='), 'build_minimal_layout must have P0');
  assert.ok(minimalBody.includes('P1='), 'build_minimal_layout must have P1');
});

// ─── DASH-05: pde-tools.cjs suggestions subcommand ─────────────────────────
test('DASH-05: pde-tools.cjs has suggestions case', () => {
  const src = fs.readFileSync(path.join(ROOT, 'bin', 'pde-tools.cjs'), 'utf-8');
  assert.ok(src.includes("case 'suggestions'"), 'suggestions case missing');
  assert.ok(src.includes('pde-suggestions-'), 'suggestion file path pattern missing');
  assert.ok(src.includes("require('os')") || src.includes('require("os")'), 'os module import missing');
});

test('DASH-05: pde-tools.cjs suggestions prints output', () => {
  const result = execFileSync(
    process.execPath,
    [path.join(ROOT, 'bin', 'pde-tools.cjs'), 'suggestions'],
    { encoding: 'utf-8', timeout: 5000 }
  ).trim();
  assert.ok(result.length > 0, 'suggestions command produced no output');
});

test('DASH-05: commands/suggestions.md exists', () => {
  const cmdPath = path.join(ROOT, 'commands', 'suggestions.md');
  assert.ok(fs.existsSync(cmdPath), 'commands/suggestions.md missing');
  const src = fs.readFileSync(cmdPath, 'utf-8');
  assert.ok(src.includes('pde:suggestions'), 'pde:suggestions name missing');
});

// ─── DASH-06: monitor.md updated for 7-pane layout ─────────────────────────
test('DASH-06: monitor.md describes 7-pane layout', () => {
  const src = fs.readFileSync(path.join(ROOT, 'workflows', 'monitor.md'), 'utf-8');
  assert.ok(src.includes('7-pane'), '7-pane reference missing');
  assert.ok(src.includes('suggestions'), 'suggestions pane description missing');
  assert.ok(
    src.includes('Waiting for PDE to start a phase'),
    'zero-state description missing from monitor.md'
  );
});

// ─── Summary ────────────────────────────────────────────────────────────────
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
