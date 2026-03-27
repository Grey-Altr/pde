'use strict';

/**
 * pane-token-meter.test.cjs — Behavioral tests for pane-token-meter.sh
 *
 * Phase 148: tmux integration
 * Satisfies: TMX-04, TMX-05
 *
 * Verifies:
 * - Session filter file controls which events are counted
 * - "all" filter passes all events; specific session ID filters to that session
 * - monitor-dashboard.sh references MULTI_NDJSON_PATH and s/a key bindings
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(PROJECT_ROOT, 'bin', 'pane-token-meter.sh');
const DASHBOARD_SCRIPT = path.join(PROJECT_ROOT, 'bin', 'monitor-dashboard.sh');

/**
 * Run pane-token-meter.sh with a given filter value and a list of NDJSON events.
 * Writes events to a temp NDJSON file, sets filter file, runs script for 2s,
 * kills it, and returns captured stdout.
 *
 * @param {object[]} events - Array of NDJSON event objects
 * @param {string} filterValue - Value to write to pde-tmux-filter.txt ("all" or session ID)
 * @returns {string} stdout output collected
 */
function runScript(events, filterValue) {
  const suffix = `${process.pid}-${Date.now()}`;
  const ndjsonFile = path.join(os.tmpdir(), `pde-test-tokenmeter-${suffix}.ndjson`);
  const outFile = path.join(os.tmpdir(), `pde-test-tokenmeter-out-${suffix}.txt`);
  const filterFile = path.join(os.tmpdir(), `pde-test-tokenmeter-filter-${suffix}.txt`);

  // Write all events to NDJSON file (one per line)
  const ndjsonContent = events.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(ndjsonFile, ndjsonContent, 'utf8');

  // Write filter value
  fs.writeFileSync(filterFile, filterValue, 'utf8');

  // Override TMPDIR to use our custom filter file location by setting env
  // The script uses ${TMPDIR:-/tmp}/pde-tmux-filter.txt — we need to override TMPDIR
  // so the filter file path matches what the script constructs.
  // We use a wrapper that copies our filter to the expected path before running.
  const shellCmd = [
    // Ensure our filter file is at the location the script will read
    `cp ${JSON.stringify(filterFile)} ${JSON.stringify(os.tmpdir())}/pde-tmux-filter.txt`,
    `&& bash ${JSON.stringify(SCRIPT)} ${JSON.stringify(ndjsonFile)}`,
    `> ${JSON.stringify(outFile)} 2>/dev/null`,
    `& BGPID=$!; sleep 2; kill $BGPID 2>/dev/null; true`,
  ].join(' ');

  spawnSync('/bin/bash', ['-c', shellCmd], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout: 8000,
  });

  const output = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';

  try { fs.rmSync(ndjsonFile, { force: true }); } catch (_) {}
  try { fs.rmSync(outFile, { force: true }); } catch (_) {}
  try { fs.rmSync(filterFile, { force: true }); } catch (_) {}

  return output;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pane-token-meter.sh (TMX-04, TMX-05)', () => {

  // ─── Test 1: "all" filter shows [ALL SESSIONS] in header ──────────────────

  it('displays [ALL SESSIONS] in header when filter is "all"', () => {
    const events = [
      { event_type: 'task_start', ts: '2026-01-01T12:00:00.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:01.000Z', _pde_session_id: 'p148-2-bbbb2222', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:02.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:03.000Z', _pde_session_id: 'p148-2-bbbb2222', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:04.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
    ];

    const output = runScript(events, 'all');

    expect(output).toContain('ALL SESSIONS');
  });

  // ─── Test 2: session-specific filter shows session ID in header ───────────

  it('displays session ID prefix in header when filter is set to a specific session', () => {
    const events = [
      { event_type: 'task_start', ts: '2026-01-01T12:00:00.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:01.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:02.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:03.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:04.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
    ];

    const output = runScript(events, 'p148-1-aaaa1111');

    // Header should show the session ID (truncated to 16 chars)
    expect(output).toContain('p148-1-aaaa1111');
  });

  // ─── Test 3: "all" filter accumulates events from all sessions ─────────────

  it('accumulates events from multiple sessions when filter is "all"', () => {
    const events = [
      { event_type: 'task_start', ts: '2026-01-01T12:00:00.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(100) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:01.000Z', _pde_session_id: 'p148-2-bbbb2222', content: 'x'.repeat(100) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:02.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(100) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:03.000Z', _pde_session_id: 'p148-2-bbbb2222', content: 'x'.repeat(100) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:04.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(100) },
    ];

    const output = runScript(events, 'all');

    // Should show non-zero event count (5 events processed, not filtered)
    expect(output).toMatch(/Events:\s+[1-9]/);
  });

  // ─── Test 4: session filter skips non-matching session events ─────────────

  it('skips events from other sessions when filter is set to a specific session', () => {
    const events = [
      // 4 events for session A, 1 event for session B
      { event_type: 'task_start', ts: '2026-01-01T12:00:00.000Z', _pde_session_id: 'p148-1-sessA', content: 'x'.repeat(100) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:01.000Z', _pde_session_id: 'p148-2-sessB', content: 'x'.repeat(100) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:02.000Z', _pde_session_id: 'p148-1-sessA', content: 'x'.repeat(100) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:03.000Z', _pde_session_id: 'p148-1-sessA', content: 'x'.repeat(100) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:04.000Z', _pde_session_id: 'p148-1-sessA', content: 'x'.repeat(100) },
    ];

    // Filter to session B only — should see 1 event counted, not 5
    const outputB = runScript(events, 'p148-2-sessB');
    // Filter to session A — should see 4 events counted
    const outputA = runScript(events, 'p148-1-sessA');

    // session A has 4 events that match, so Events count should be >= 4
    expect(outputA).toMatch(/Events:\s+[4-9]/);
    // session B has 1 event that matches; count should be small (1-3 range given timing)
    expect(outputB).toMatch(/Events:\s+[1-3]/);
  });

  // ─── Test 5: model name appears in header ─────────────────────────────────

  it('displays a model name in the header line', () => {
    const events = [
      { event_type: 'task_start', ts: '2026-01-01T12:00:00.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:01.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:02.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:03.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:04.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(20) },
    ];

    const output = runScript(events, 'all');

    // Model name should be one of: opus, sonnet, haiku
    expect(output).toMatch(/model:\s*(opus|sonnet|haiku)/);
  });

  // ─── Test 6: cost estimate appears in output ──────────────────────────────

  it('displays a cost estimate labeled with ~est. in the output', () => {
    const events = [
      { event_type: 'task_start', ts: '2026-01-01T12:00:00.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(200) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:01.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(200) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:02.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(200) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:03.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(200) },
      { event_type: 'task_start', ts: '2026-01-01T12:00:04.000Z', _pde_session_id: 'p148-1-aaaa1111', content: 'x'.repeat(200) },
    ];

    const output = runScript(events, 'all');

    // Cost line: "$0.0001 ~est." or similar
    expect(output).toContain('~est.');
  });

});

// ─── monitor-dashboard.sh static content tests (TMX-05) ──────────────────────

describe('monitor-dashboard.sh (TMX-05)', () => {

  // ─── Test 7: MULTI_NDJSON_PATH constant is defined ────────────────────────

  it('contains MULTI_NDJSON_PATH constant pointing to pde-multi-session.ndjson', () => {
    const content = fs.readFileSync(DASHBOARD_SCRIPT, 'utf8');

    expect(content).toContain('MULTI_NDJSON_PATH');
    expect(content).toContain('pde-multi-session.ndjson');
  });

  // ─── Test 8: pane-agent-activity.sh uses MULTI_NDJSON_PATH ───────────────

  it('passes MULTI_NDJSON_PATH to pane-agent-activity.sh (pane 0)', () => {
    const content = fs.readFileSync(DASHBOARD_SCRIPT, 'utf8');

    expect(content).toMatch(/pane-agent-activity\.sh.*MULTI_NDJSON_PATH/);
  });

  // ─── Test 9: pane-log-stream.sh uses MULTI_NDJSON_PATH ───────────────────

  it('passes MULTI_NDJSON_PATH to pane-log-stream.sh (pane 4)', () => {
    const content = fs.readFileSync(DASHBOARD_SCRIPT, 'utf8');

    expect(content).toMatch(/pane-log-stream\.sh.*MULTI_NDJSON_PATH/);
  });

  // ─── Test 10: pane-token-meter.sh uses MULTI_NDJSON_PATH ─────────────────

  it('passes MULTI_NDJSON_PATH to pane-token-meter.sh (pane 5)', () => {
    const content = fs.readFileSync(DASHBOARD_SCRIPT, 'utf8');

    expect(content).toMatch(/pane-token-meter\.sh.*MULTI_NDJSON_PATH/);
  });

  // ─── Test 11: s key binding wires tmux-cycle-session.cjs ─────────────────

  it('registers tmux bind-key for s key that invokes tmux-cycle-session.cjs', () => {
    const content = fs.readFileSync(DASHBOARD_SCRIPT, 'utf8');

    expect(content).toContain('bind-key');
    expect(content).toContain('tmux-cycle-session.cjs');
  });

  // ─── Test 12: a key binding resets filter to "all" ────────────────────────

  it('registers tmux bind-key for a key that writes "all" to pde-tmux-filter.txt', () => {
    const content = fs.readFileSync(DASHBOARD_SCRIPT, 'utf8');

    // Should have a bind for 'a' key that resets filter file
    expect(content).toMatch(/bind-key.*\bn\b.*a/);
    expect(content).toContain('pde-tmux-filter.txt');
  });

  // ─── Test 13: single-session panes still use ${ndjson} ───────────────────

  it('keeps single-session ndjson path for pane-pipeline-progress.sh (not multi-session)', () => {
    const content = fs.readFileSync(DASHBOARD_SCRIPT, 'utf8');

    // pane-pipeline-progress.sh should still use ${ndjson} (single-session path)
    expect(content).toMatch(/pane-pipeline-progress\.sh.*\$\{ndjson\}/);
  });

});
