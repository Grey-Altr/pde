#!/usr/bin/env node
'use strict';

/**
 * tmux-cycle-session.cjs — Cycle through running PDE sessions in tmux
 *
 * Phase 148: tmux integration
 * Satisfies: TMX-04, TMX-05
 *
 * Invoked by tmux `run-shell` when the user presses `s`. Reads the dispatcher
 * registry (.planning/dispatcher.pids) to find running sessions, reads the
 * current filter from $TMPDIR/pde-tmux-filter.txt, advances to the next
 * session (wrapping back to "all" after the last one), and writes the new
 * filter value.
 *
 * Filter file ($TMPDIR/pde-tmux-filter.txt) contains either:
 *   "all"                     — show all sessions
 *   "<session-id>"            — show only that session
 *
 * CLI usage:
 *   node tmux-cycle-session.cjs <pids-file>
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const FILTER_FILE = path.join(os.tmpdir(), 'pde-tmux-filter.txt');

/**
 * Cycle the session filter forward by one step.
 *
 * Reads running sessions from the dispatcher.pids registry, determines the
 * current filter, advances to the next session in sorted order, then wraps
 * back to "all" after the last session.
 *
 * @param {string} pidsFile   - Absolute path to the dispatcher.pids JSON file
 * @param {string} [filterFile] - Path to filter state file (defaults to FILTER_FILE)
 * @returns {string} The new filter value written to filterFile
 */
function cycleSession(pidsFile, filterFile) {
  const filterPath = filterFile || FILTER_FILE;

  // Read running sessions from dispatcher.pids
  let sessions = [];
  try {
    const raw = JSON.parse(fs.readFileSync(pidsFile, 'utf8'));
    sessions = Object.entries(raw.sessions || {})
      .filter(([, entry]) => entry.status === 'running')
      .map(([id]) => id)
      .sort();
  } catch (_) {
    // File missing or malformed — no sessions available
  }

  // Read current filter (defaults to 'all' if file does not exist)
  let current;
  try {
    current = fs.readFileSync(filterPath, 'utf8').trim();
  } catch {
    current = 'all';
  }

  // Compute next filter value
  let next;
  if (current === 'all') {
    // Advance to first running session, or stay at 'all' if none
    next = sessions[0] || 'all';
  } else {
    const idx = sessions.indexOf(current);
    if (idx === -1 || idx === sessions.length - 1) {
      // Current session not in running list, or it's the last one — wrap to 'all'
      next = 'all';
    } else {
      next = sessions[idx + 1];
    }
  }

  fs.writeFileSync(filterPath, next, 'utf8');
  return next;
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

if (require.main === module) {
  const pidsFile = process.argv[2];
  if (!pidsFile) {
    process.stderr.write('Usage: tmux-cycle-session.cjs <pids-file>\n');
    process.exit(1);
  }
  cycleSession(pidsFile);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { cycleSession, FILTER_FILE };
