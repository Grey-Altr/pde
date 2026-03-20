#!/usr/bin/env node
'use strict';
/**
 * PDE Hook — Old Session Cleanup
 * Triggered by SessionStart (async: false)
 * Deletes pde-session-*.ndjson files older than 7 days from os.tmpdir()
 *
 * Exit codes: always 0 — cleanup failure must never affect Claude Code execution.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

process.stdin.resume();
process.stdin.on('end', () => {
  const tmpdir = os.tmpdir();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - sevenDaysMs;

  try {
    const files = fs.readdirSync(tmpdir)
      .filter(f => f.startsWith('pde-session-') && f.endsWith('.ndjson'));

    for (const file of files) {
      const fullPath = path.join(tmpdir, file);
      try {
        if (fs.statSync(fullPath).mtimeMs < cutoff) {
          fs.unlinkSync(fullPath);
        }
      } catch { /* file may already be gone — ignore */ }
    }
  } catch { /* tmpdir read failure — non-fatal */ }

  process.exit(0);
});
