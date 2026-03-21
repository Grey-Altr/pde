#!/usr/bin/env node
'use strict';

// ZERO STDOUT — all output to /tmp/ only. Claude Code displays hook stdout to the user.
// This handler writes idle suggestion content to /tmp/pde-suggestions-{sessionId}.md
// only when a meaningful PDE event has fired since the last idle_prompt.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateSuggestions } = require('../bin/lib/idle-suggestions.cjs');

// ─── Event gating ─────────────────────────────────────────────────────────────

const MEANINGFUL_EVENTS = new Set(['phase_started', 'phase_complete', 'plan_started']);

function getLastNdjsonLines(filePath, n) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.slice(-n).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    // Parse hook payload
    let hookData;
    try { hookData = JSON.parse(raw); } catch { process.exit(0); }

    // Resolve cwd and session ID (same pattern as emit-event.cjs)
    const cwd = hookData.cwd || process.cwd();
    const configPath = path.join(cwd, '.planning', 'config.json');
    let sessionId = 'unknown';
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.monitoring && cfg.monitoring.session_id) {
        sessionId = cfg.monitoring.session_id;
      }
    } catch { /* config not found — use 'unknown' */ }

    // Check for NDJSON session file existence
    const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
    if (!fs.existsSync(ndjsonPath)) { process.exit(0); }

    // Tail last 20 lines of NDJSON and find last meaningful event
    const recentEvents = getLastNdjsonLines(ndjsonPath, 20);
    const lastMeaningful = [...recentEvents].reverse().find(e => MEANINGFUL_EVENTS.has(e.event_type));
    if (!lastMeaningful) { process.exit(0); }

    // Gate: check if this event was already processed
    const markerPath = path.join(os.tmpdir(), `pde-suggestions-${sessionId}.last-event-ts`);
    let lastProcessedTs = null;
    try { lastProcessedTs = fs.readFileSync(markerPath, 'utf-8').trim(); } catch { /* first run */ }
    if (lastMeaningful.ts && lastMeaningful.ts === lastProcessedTs) {
      process.exit(0); // already processed this event
    }

    // Write engine suggestions to /tmp/
    const suggPath = path.join(os.tmpdir(), `pde-suggestions-${sessionId}.md`);
    const content = generateSuggestions({ cwd, event: lastMeaningful });
    fs.writeFileSync(suggPath, content, 'utf-8');

    // Write marker file
    if (lastMeaningful.ts) {
      fs.writeFileSync(markerPath, lastMeaningful.ts, 'utf-8');
    }
  } catch { /* swallow all errors */ }

  process.exit(0);
});
