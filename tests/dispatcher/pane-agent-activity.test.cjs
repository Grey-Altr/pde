'use strict';

/**
 * pane-agent-activity.test.cjs — Behavioral tests for pane-agent-activity.sh
 *
 * Phase 148: tmux integration
 * Satisfies: TMX-02
 *
 * Verifies that the script renders [L]/[R] source tags with per-session
 * ANSI color codes when NDJSON events are piped through it.
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(PROJECT_ROOT, 'bin', 'pane-agent-activity.sh');

/**
 * Run pane-agent-activity.sh against a temp NDJSON file.
 * Writes the event to a temp file, runs the script in background for 1s,
 * then kills it and reads the captured output.
 *
 * @param {object} event - NDJSON event object
 * @returns {string} stdout output collected during the 1s window
 */
function runScript(event) {
  const suffix = `${process.pid}-${Date.now()}`;
  const ndjsonFile = path.join(os.tmpdir(), `pde-test-activity-${suffix}.ndjson`);
  const outFile = path.join(os.tmpdir(), `pde-test-activity-out-${suffix}.txt`);

  fs.writeFileSync(ndjsonFile, JSON.stringify(event) + '\n', 'utf8');

  // Run script in background, wait 1s for event processing, then kill
  const shellCmd = [
    `bash ${JSON.stringify(SCRIPT)} ${JSON.stringify(ndjsonFile)}`,
    `> ${JSON.stringify(outFile)} 2>/dev/null`,
    `& BGPID=$!; sleep 1; kill $BGPID 2>/dev/null; true`,
  ].join(' ');

  spawnSync('/bin/bash', ['-c', shellCmd], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout: 6000,
  });

  const output = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';

  try { fs.rmSync(ndjsonFile, { force: true }); } catch (_) {}
  try { fs.rmSync(outFile, { force: true }); } catch (_) {}

  return output;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pane-agent-activity.sh (TMX-02)', () => {

  // ─── Test 1: subagent_start renders [L] source tag ────────────────────────

  it('renders [L] source tag for a local session spawn event', () => {
    const output = runScript({
      event_type: 'subagent_start',
      ts: '2026-01-01T12:00:00.000Z',
      agent_type: 'planner',
      _pde_session_source: 'L',
      _pde_color_index: 0,
    });

    expect(output).toContain('[L]');
  });

  // ─── Test 2: subagent_start renders [R] for remote source ─────────────────

  it('renders [R] source tag for a remote session spawn event', () => {
    const output = runScript({
      event_type: 'subagent_start',
      ts: '2026-01-01T14:30:00.000Z',
      agent_type: 'executor',
      _pde_session_source: 'R',
      _pde_color_index: 1,
    });

    expect(output).toContain('[R]');
  });

  // ─── Test 3: ANSI color code for color_index 0 (blue: 38;5;33m) ──────────

  it('emits ANSI 256-color escape code for color_index 0 (blue: 38;5;33m)', () => {
    const output = runScript({
      event_type: 'subagent_start',
      ts: '2026-01-01T09:00:00.000Z',
      agent_type: 'planner',
      _pde_session_source: 'L',
      _pde_color_index: 0,
    });

    // ESC[38;5;33m — blue
    expect(output).toMatch(/\[38;5;33m/);
  });

  // ─── Test 4: ANSI color code for color_index 2 (violet: 38;5;129m) ───────

  it('emits ANSI 256-color escape code for color_index 2 (violet: 38;5;129m)', () => {
    const output = runScript({
      event_type: 'subagent_start',
      ts: '2026-01-01T10:00:00.000Z',
      agent_type: 'researcher',
      _pde_session_source: 'L',
      _pde_color_index: 2,
    });

    // ESC[38;5;129m — violet
    expect(output).toMatch(/\[38;5;129m/);
  });

  // ─── Test 5: timestamp rendered in HH:MM:SS format ────────────────────────

  it('renders the timestamp in HH:MM:SS format from the ISO ts field', () => {
    const output = runScript({
      event_type: 'subagent_start',
      ts: '2026-01-01T15:45:30.000Z',
      agent_type: 'planner',
      _pde_session_source: 'L',
      _pde_color_index: 0,
    });

    expect(output).toContain('[15:45:30]');
  });

  // ─── Test 6: SPAWN label for subagent_start ───────────────────────────────

  it('renders SPAWN label for subagent_start events', () => {
    const output = runScript({
      event_type: 'subagent_start',
      ts: '2026-01-01T12:00:00.000Z',
      agent_type: 'planner',
      _pde_session_source: 'L',
      _pde_color_index: 0,
    });

    expect(output).toContain('SPAWN');
  });

  // ─── Test 7: DONE label for subagent_stop ─────────────────────────────────

  it('renders DONE label for subagent_stop events', () => {
    const output = runScript({
      event_type: 'subagent_stop',
      ts: '2026-01-01T12:05:00.000Z',
      agent_type: 'planner',
      _pde_session_source: 'L',
      _pde_color_index: 0,
    });

    expect(output).toContain('DONE');
  });

  // ─── Test 8: agent_type value is included in output ───────────────────────

  it('includes the agent_type field value in the rendered output line', () => {
    const output = runScript({
      event_type: 'subagent_start',
      ts: '2026-01-01T12:00:00.000Z',
      agent_type: 'nyquist-auditor',
      _pde_session_source: 'L',
      _pde_color_index: 3,
    });

    expect(output).toContain('nyquist-auditor');
  });

  // ─── Test 9: ANSI reset code is emitted ───────────────────────────────────

  it('emits ANSI reset escape code after colored output', () => {
    const output = runScript({
      event_type: 'subagent_start',
      ts: '2026-01-01T12:00:00.000Z',
      agent_type: 'planner',
      _pde_session_source: 'L',
      _pde_color_index: 0,
    });

    // ESC[0m
    expect(output).toMatch(/\[0m/);
  });

  // ─── Test 10: non-agent events produce no SPAWN/DONE lines ────────────────

  it('produces no event lines for non-agent event_types like session_start', () => {
    const output = runScript({
      event_type: 'session_start',
      ts: '2026-01-01T12:00:00.000Z',
      _pde_session_source: 'L',
      _pde_color_index: 0,
    });

    expect(output).not.toContain('SPAWN');
    expect(output).not.toContain('DONE');
  });

});
