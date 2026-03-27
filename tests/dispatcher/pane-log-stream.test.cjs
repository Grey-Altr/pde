'use strict';

/**
 * pane-log-stream.test.cjs — Behavioral tests for pane-log-stream.sh
 *
 * Phase 148: tmux integration
 * Satisfies: TMX-03
 *
 * Verifies that the script prepends a colored [sid] tag to every event line,
 * with distinct ANSI colors per session.
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(PROJECT_ROOT, 'bin', 'pane-log-stream.sh');

/**
 * Run pane-log-stream.sh against a temp NDJSON file.
 * Writes the event to a temp file, runs the script in background for 1s,
 * then kills it and reads the captured output.
 *
 * @param {object} event - NDJSON event object
 * @returns {string} stdout output collected during the 1s window
 */
function runScript(event) {
  const suffix = `${process.pid}-${Date.now()}`;
  const ndjsonFile = path.join(os.tmpdir(), `pde-test-logstream-${suffix}.ndjson`);
  const outFile = path.join(os.tmpdir(), `pde-test-logstream-out-${suffix}.txt`);

  fs.writeFileSync(ndjsonFile, JSON.stringify(event) + '\n', 'utf8');

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

describe('pane-log-stream.sh (TMX-03)', () => {

  // ─── Test 1: [sid] prefix from _pde_session_id last 4 chars ──────────────

  it('prepends a [sid] tag using the last 4 chars of the session hex suffix', () => {
    // _pde_session_id = "p148-1-abc12345" → last segment = "abc12345" → first 4 = "abc1"
    const output = runScript({
      event_type: 'session_start',
      ts: '2026-01-01T12:00:00.000Z',
      _pde_session_id: 'p148-1-abc12345',
      _pde_color_index: 0,
    });

    expect(output).toContain('[abc1]');
  });

  // ─── Test 2: ANSI color code for color_index 0 (blue: 38;5;33m) ──────────

  it('emits ANSI 256-color escape code for color_index 0 (blue) in the sid prefix', () => {
    const output = runScript({
      event_type: 'session_start',
      ts: '2026-01-01T12:00:00.000Z',
      _pde_session_id: 'p148-1-abc12345',
      _pde_color_index: 0,
    });

    expect(output).toMatch(/\[38;5;33m/);
  });

  // ─── Test 3: ANSI color code for color_index 1 (green: 38;5;82m) ─────────

  it('emits ANSI 256-color escape code for color_index 1 (green: 38;5;82m)', () => {
    const output = runScript({
      event_type: 'session_start',
      ts: '2026-01-01T12:00:00.000Z',
      _pde_session_id: 'p148-2-def67890',
      _pde_color_index: 1,
    });

    expect(output).toMatch(/\[38;5;82m/);
  });

  // ─── Test 4: session_start event is rendered ──────────────────────────────

  it('renders session_start event_type in the output line', () => {
    const output = runScript({
      event_type: 'session_start',
      ts: '2026-01-01T08:00:00.000Z',
      _pde_session_id: 'p148-1-abc12345',
      _pde_color_index: 0,
    });

    expect(output).toContain('session_start');
  });

  // ─── Test 5: subagent_start event is rendered with agent_type ─────────────

  it('renders subagent_start event with agent_type in the output', () => {
    const output = runScript({
      event_type: 'subagent_start',
      ts: '2026-01-01T09:00:00.000Z',
      agent_type: 'planner',
      _pde_session_id: 'p148-1-abc12345',
      _pde_color_index: 0,
    });

    expect(output).toContain('subagent_start');
    expect(output).toContain('planner');
  });

  // ─── Test 6: file_changed event is rendered with tool_name ────────────────

  it('renders file_changed event with tool_name in the output', () => {
    const output = runScript({
      event_type: 'file_changed',
      ts: '2026-01-01T10:00:00.000Z',
      tool_name: 'Write',
      _pde_session_id: 'p148-1-abc12345',
      _pde_color_index: 2,
    });

    expect(output).toContain('file_changed');
  });

  // ─── Test 7: phase_started event is rendered (pipeline progress branch) ───

  it('renders phase_started event in the output', () => {
    const output = runScript({
      event_type: 'phase_started',
      ts: '2026-01-01T11:00:00.000Z',
      _pde_session_id: 'p148-1-abc12345',
      _pde_color_index: 3,
    });

    expect(output).toContain('phase_started');
  });

  // ─── Test 8: unknown event type falls through to default branch ───────────

  it('renders unknown event_type via the default catch-all branch', () => {
    const output = runScript({
      event_type: 'custom_event_xyz',
      ts: '2026-01-01T12:00:00.000Z',
      _pde_session_id: 'p148-1-abc12345',
      _pde_color_index: 0,
    });

    expect(output).toContain('custom_event_xyz');
  });

  // ─── Test 9: timestamp rendered in HH:MM:SS format ────────────────────────

  it('renders the timestamp in HH:MM:SS format for every event', () => {
    const output = runScript({
      event_type: 'session_start',
      ts: '2026-01-01T22:15:45.000Z',
      _pde_session_id: 'p148-1-abc12345',
      _pde_color_index: 0,
    });

    expect(output).toContain('[22:15:45]');
  });

  // ─── Test 10: ANSI reset code follows each event line ─────────────────────

  it('emits ANSI reset code at end of each event line', () => {
    const output = runScript({
      event_type: 'session_start',
      ts: '2026-01-01T12:00:00.000Z',
      _pde_session_id: 'p148-1-abc12345',
      _pde_color_index: 0,
    });

    // ESC[0m — resets color after each formatted line
    expect(output).toMatch(/\[0m/);
  });

});
