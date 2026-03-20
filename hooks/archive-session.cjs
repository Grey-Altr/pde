#!/usr/bin/env node
'use strict';

/**
 * PDE Hook — Session Archiver
 * Triggered by SessionEnd (async: false)
 *
 * Reads the session's NDJSON file from os.tmpdir(), aggregates metrics
 * (event count, agents spawned, files changed, commits made, duration),
 * and writes a structured markdown summary to .planning/logs/.
 *
 * Exit codes: always 0 — hook failures must never affect Claude Code execution.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ─── Aggregation ─────────────────────────────────────────────────────────────

function aggregateNdjson(ndjsonPath) {
  if (!fs.existsSync(ndjsonPath)) {
    return {
      eventCount: 0,
      agentCount: 0,
      changedFiles: 0,
      ndjsonMissing: true,
    };
  }

  let eventCount = 0;
  let agentCount = 0;
  const changedFiles = new Set();

  let content;
  try {
    content = fs.readFileSync(ndjsonPath, 'utf-8');
  } catch {
    return { eventCount: 0, agentCount: 0, changedFiles: 0, ndjsonMissing: true };
  }

  const lines = content.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    let ev;
    try { ev = JSON.parse(line); } catch { continue; } // skip corrupt lines

    eventCount++;

    if (ev.event_type === 'subagent_start') agentCount++;
    if (ev.event_type === 'file_changed' && ev.file_path) changedFiles.add(ev.file_path);
  }

  return { eventCount, agentCount, changedFiles: changedFiles.size, ndjsonMissing: false };
}

// ─── Git commit count ─────────────────────────────────────────────────────────

function countCommits(projectRoot, sessionStartTs) {
  if (!sessionStartTs) return 0;
  try {
    const result = spawnSync('git', [
      'log',
      `--since=${sessionStartTs}`,
      '--oneline',
    ], {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 3000,
    });
    if (result.status !== 0 || result.error) return 0;
    return result.stdout.trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}

// ─── Duration formatting ──────────────────────────────────────────────────────

function computeDuration(startTs, endTs) {
  if (!startTs || !endTs) return 'unknown';
  const ms = new Date(endTs) - new Date(startTs);
  if (isNaN(ms) || ms < 0) return 'unknown';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

// ─── Markdown generation ──────────────────────────────────────────────────────

function writeSummary(projectRoot, sessionId, sessionEndTs, duration, metrics, commitCount, ndjsonPath) {
  const logDir = path.join(projectRoot, '.planning', 'logs');
  fs.mkdirSync(logDir, { recursive: true });

  const ts = new Date().toISOString()
    .replace(/:/g, '-')      // colons invalid in macOS filenames
    .replace(/\..+$/, '');   // strip milliseconds: 2026-03-20T11-16-27
  const filename = `${ts}-${sessionId}.md`;
  const logPath = path.join(logDir, filename);

  // Date portion (YYYY-MM-DD) from sessionEndTs
  const dateStr = sessionEndTs ? sessionEndTs.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const ndjsonNote = metrics.ndjsonMissing
    ? 'NDJSON file not found — event bus may have failed silently.'
    : `*Raw NDJSON: ${ndjsonPath}*`;

  const content = `# PDE Session Summary

**Session ID:** ${sessionId}
**Date:** ${dateStr}
**Duration:** ${duration}

## Metrics

| Metric | Value |
|--------|-------|
| Total events | ${metrics.eventCount} |
| Agents spawned | ${metrics.agentCount} |
| Files changed | ${metrics.changedFiles} |
| Commits made | ${commitCount} |

## Phase / Plan Progress

No phase/plan events recorded this session.

## Notes

${ndjsonNote}
*Generated: ${new Date().toISOString()}*
`;

  fs.writeFileSync(logPath, content, 'utf-8');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    let hookData;
    try { hookData = JSON.parse(raw); } catch { process.exit(0); }

    // Resolve project root from hook payload cwd
    const projectRoot = hookData.cwd || process.cwd();
    const configPath = path.join(projectRoot, '.planning', 'config.json');

    // Read session metadata from config.json
    let sessionId = 'unknown';
    let sessionStartTs = null;
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.monitoring) {
        sessionId = cfg.monitoring.session_id || 'unknown';
        sessionStartTs = cfg.monitoring.session_start_ts || null;
      }
    } catch { /* config unreadable — use defaults */ }

    // Aggregate NDJSON events
    const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
    const metrics = aggregateNdjson(ndjsonPath);

    // Count commits made during session
    const commitCount = countCommits(projectRoot, sessionStartTs);

    // Compute session duration
    const sessionEndTs = new Date().toISOString();
    const duration = computeDuration(sessionStartTs, sessionEndTs);

    // Write markdown summary to .planning/logs/
    writeSummary(projectRoot, sessionId, sessionEndTs, duration, metrics, commitCount, ndjsonPath);
  } catch { /* swallow all errors — hook must never crash Claude Code */ }

  process.exit(0);
});
