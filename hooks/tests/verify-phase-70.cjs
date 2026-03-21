#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name} — ${e.message || e}`);
    failed++;
  }
}

// DLVR-01: hooks.json Notification block
test('DLVR-01: hooks.json has Notification/idle_prompt with async:true', () => {
  const h = require('../hooks.json');
  const n = h.hooks.Notification;
  if (!n) throw new Error('missing Notification key');
  const entry = n.find(e => e.matcher === 'idle_prompt');
  if (!entry) throw new Error('no idle_prompt matcher');
  if (!entry.hooks[0].async) throw new Error('async not true');
  if (!entry.hooks[0].command.includes('idle-suggestions.cjs')) throw new Error('wrong command');
});

// DLVR-02: Zero stdout in handler
test('DLVR-02: idle-suggestions.cjs has zero stdout writes', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'idle-suggestions.cjs'), 'utf-8');
  if (src.includes('console.log(')) throw new Error('has console.log');
  if (src.includes('console.error(')) throw new Error('has console.error');
  if (src.includes('process.stdout.write(')) throw new Error('has stdout write');
});

// DLVR-03: Event gating on meaningful events
test('DLVR-03: idle-suggestions.cjs gates on meaningful PDE events', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'idle-suggestions.cjs'), 'utf-8');
  if (!src.includes('MEANINGFUL_EVENTS')) throw new Error('missing MEANINGFUL_EVENTS set');
  if (!src.includes('phase_started')) throw new Error('missing phase_started');
  if (!src.includes('phase_complete')) throw new Error('missing phase_complete');
  if (!src.includes('plan_started')) throw new Error('missing plan_started');
  if (!src.includes('last-event-ts')) throw new Error('missing marker file logic');
});

// DLVR-04: All writes to /tmp/, nothing in .planning/
test('DLVR-04: idle-suggestions.cjs writes only to /tmp/', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'idle-suggestions.cjs'), 'utf-8');
  if (!src.includes('os.tmpdir()')) throw new Error('missing os.tmpdir');
  // Check no direct .planning/ writes (config.json read is OK)
  const lines = src.split('\n');
  for (const line of lines) {
    if (line.includes('writeFileSync') && line.includes('.planning')) {
      throw new Error('writes to .planning/ directory');
    }
  }
  if (!src.includes('process.exit(0)')) throw new Error('missing exit(0)');
});

// DLVR-05: Getting Started threshold docs
test('DLVR-05: GETTING-STARTED.md has threshold config', () => {
  const md = fs.readFileSync(path.join(__dirname, '..', '..', 'GETTING-STARTED.md'), 'utf-8');
  if (!md.includes('messageIdleNotifThresholdMs')) throw new Error('missing key');
  if (!md.includes('5000')) throw new Error('missing 5000 value');
  if (!md.includes('~/.CLAUDE.json')) throw new Error('missing file path');
  if (!md.includes('Idle Suggestion Threshold')) throw new Error('missing section title');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
