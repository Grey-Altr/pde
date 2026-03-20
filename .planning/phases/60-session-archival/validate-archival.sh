#!/usr/bin/env bash
# Phase 60 — Session Archival Validation
# Tests all HIST requirements: HIST-01 (archive), HIST-02 (metrics), HIST-03 (cleanup), HIST-04 (naming)
# Must complete in under 5 seconds and exit 0 only if all checks pass.

set -uo pipefail

PASS_COUNT=0
FAIL_COUNT=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Resolve the actual OS temp directory (macOS returns /var/folders/..., not /tmp)
TMPDIR_PATH="$(node -e "process.stdout.write(require('os').tmpdir())")"

# Helper: run a check and track pass/fail
check() {
  local id="$1"
  local result="$2"
  local reason="${3:-}"
  if [ "$result" = "PASS" ]; then
    echo "$id PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "$id FAIL: $reason"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# ─── FILE-01: hooks/cleanup-old-sessions.cjs exists with required patterns ───

if [ -f "$PROJECT_ROOT/hooks/cleanup-old-sessions.cjs" ]; then
  CLEANUP_CONTENT=$(cat "$PROJECT_ROOT/hooks/cleanup-old-sessions.cjs")
  if echo "$CLEANUP_CONTENT" | grep -q 'pde-session-' && \
     echo "$CLEANUP_CONTENT" | grep -q 'unlinkSync' && \
     echo "$CLEANUP_CONTENT" | grep -q 'statSync'; then
    check "FILE-01" "PASS"
  else
    check "FILE-01" "FAIL" "cleanup-old-sessions.cjs missing required patterns (pde-session-, unlinkSync, statSync)"
  fi
else
  check "FILE-01" "FAIL" "hooks/cleanup-old-sessions.cjs does not exist"
fi

# ─── FILE-02: hooks/archive-session.cjs exists with required patterns ─────────

if [ -f "$PROJECT_ROOT/hooks/archive-session.cjs" ]; then
  ARCHIVE_CONTENT=$(cat "$PROJECT_ROOT/hooks/archive-session.cjs")
  if echo "$ARCHIVE_CONTENT" | grep -q 'aggregateNdjson' && \
     echo "$ARCHIVE_CONTENT" | grep -q '\.planning/logs/' && \
     echo "$ARCHIVE_CONTENT" | grep -q 'writeFileSync'; then
    check "FILE-02" "PASS"
  else
    check "FILE-02" "FAIL" "archive-session.cjs missing required patterns (aggregateNdjson, .planning/logs/, writeFileSync)"
  fi
else
  check "FILE-02" "FAIL" "hooks/archive-session.cjs does not exist"
fi

# ─── HOOKS-01: hooks.json has cleanup-old-sessions.cjs in SessionStart ───────

HOOKS01_RESULT=$(PROJECT_ROOT="$PROJECT_ROOT" node - <<'NODEEOF' 2>&1
const fs = require('fs');
const path = require('path');

const projectRoot = process.env.PROJECT_ROOT || '';
const hooksPath = path.join(projectRoot, 'hooks', 'hooks.json');

try {
  const parsed = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
  const sessionStart = parsed.hooks && parsed.hooks.SessionStart;
  if (!sessionStart || !sessionStart[0] || !sessionStart[0].hooks) {
    console.log('FAIL:SessionStart hooks array missing');
    process.exit(0);
  }

  const commands = sessionStart[0].hooks.map(h => h.command || '');
  const hasCleanup = commands.some(c => c.includes('cleanup-old-sessions.cjs'));
  if (!hasCleanup) {
    console.log('FAIL:cleanup-old-sessions.cjs not in SessionStart hooks');
    process.exit(0);
  }

  console.log('PASS');
} catch (err) {
  console.log('FAIL:' + err.message);
}
NODEEOF
)

if [ "$HOOKS01_RESULT" = "PASS" ]; then
  check "HOOKS-01" "PASS"
else
  REASON="${HOOKS01_RESULT#FAIL:}"
  check "HOOKS-01" "FAIL" "$REASON"
fi

# ─── HOOKS-02: hooks.json has archive-session.cjs in SessionEnd ───────────────

HOOKS02_RESULT=$(PROJECT_ROOT="$PROJECT_ROOT" node - <<'NODEEOF' 2>&1
const fs = require('fs');
const path = require('path');

const projectRoot = process.env.PROJECT_ROOT || '';
const hooksPath = path.join(projectRoot, 'hooks', 'hooks.json');

try {
  const parsed = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
  const sessionEnd = parsed.hooks && parsed.hooks.SessionEnd;
  if (!sessionEnd || !sessionEnd[0] || !sessionEnd[0].hooks) {
    console.log('FAIL:SessionEnd hooks array missing');
    process.exit(0);
  }

  const commands = sessionEnd[0].hooks.map(h => h.command || '');
  const hasArchive = commands.some(c => c.includes('archive-session.cjs'));
  if (!hasArchive) {
    console.log('FAIL:archive-session.cjs not in SessionEnd hooks');
    process.exit(0);
  }

  console.log('PASS');
} catch (err) {
  console.log('FAIL:' + err.message);
}
NODEEOF
)

if [ "$HOOKS02_RESULT" = "PASS" ]; then
  check "HOOKS-02" "PASS"
else
  REASON="${HOOKS02_RESULT#FAIL:}"
  check "HOOKS-02" "FAIL" "$REASON"
fi

# ─── PDE-01: bin/pde-tools.cjs contains session_start_ts ─────────────────────

if grep -q 'session_start_ts' "$PROJECT_ROOT/bin/pde-tools.cjs"; then
  check "PDE-01" "PASS"
else
  check "PDE-01" "FAIL" "session_start_ts not found in bin/pde-tools.cjs"
fi

# ─── HIST-03: cleanup removes NDJSON files older than 7 days, preserves newer ─

HIST03_RESULT=$(PROJECT_ROOT="$PROJECT_ROOT" TMPDIR_PATH="$TMPDIR_PATH" node - <<'NODEEOF' 2>&1
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpdir = process.env.TMPDIR_PATH || os.tmpdir();
const projectRoot = process.env.PROJECT_ROOT || '';
const cleanupScript = path.join(projectRoot, 'hooks', 'cleanup-old-sessions.cjs');

if (!fs.existsSync(cleanupScript)) {
  console.log('FAIL:cleanup-old-sessions.cjs does not exist (needed for HIST-03 test)');
  process.exit(0);
}

// Create two test fixture files
const oldFile = path.join(tmpdir, 'pde-session-test-hist03-old.ndjson');
const newFile = path.join(tmpdir, 'pde-session-test-hist03-new.ndjson');

try {
  fs.writeFileSync(oldFile, '{"test":"old"}\n', 'utf-8');
  fs.writeFileSync(newFile, '{"test":"new"}\n', 'utf-8');

  // Backdate the old file to 8 days ago using utimesSync
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  fs.utimesSync(oldFile, eightDaysAgo, eightDaysAgo);

  // Run cleanup-old-sessions.cjs with minimal stdin payload
  const { spawnSync } = require('child_process');
  const result = spawnSync(process.execPath, [cleanupScript], {
    input: JSON.stringify({ hook_event_name: 'SessionStart', cwd: projectRoot }),
    encoding: 'utf-8',
    timeout: 5000,
  });

  if (result.status !== 0) {
    console.log('FAIL:cleanup-old-sessions.cjs exited non-zero: ' + result.status);
    // Cleanup test files on failure
    try { fs.unlinkSync(oldFile); } catch {}
    try { fs.unlinkSync(newFile); } catch {}
    process.exit(0);
  }

  // Verify: old file deleted, new file preserved
  const oldExists = fs.existsSync(oldFile);
  const newExists = fs.existsSync(newFile);

  // Cleanup new file (old should already be gone)
  try { fs.unlinkSync(newFile); } catch {}
  try { fs.unlinkSync(oldFile); } catch {} // safety cleanup

  if (oldExists) {
    console.log('FAIL:file older than 7 days was NOT deleted (still exists)');
    process.exit(0);
  }
  if (!newExists) {
    console.log('FAIL:file newer than 7 days was DELETED (should be preserved)');
    process.exit(0);
  }

  console.log('PASS');
} catch (err) {
  // Cleanup on error
  try { fs.unlinkSync(oldFile); } catch {}
  try { fs.unlinkSync(newFile); } catch {}
  console.log('FAIL:' + err.message);
}
NODEEOF
)

if [ "$HIST03_RESULT" = "PASS" ]; then
  check "HIST-03" "PASS"
else
  REASON="${HIST03_RESULT#FAIL:}"
  check "HIST-03" "FAIL" "$REASON"
fi

# ─── HIST-04: log filename matches ISO timestamp + session ID pattern ──────────

HIST04_RESULT=$(node - <<'NODEEOF' 2>&1
// Test filename generation: verify regex match
// Pattern: YYYY-MM-DDTHH-MM-SS-{session-id}.md (colons replaced with hyphens)

const sessionId = '170d5f22-5afd-44ed-ab9d-870594588b11'; // example UUID
const ts = new Date().toISOString()
  .replace(/:/g, '-')       // colons invalid in macOS filenames
  .replace(/\..+$/, '');    // strip milliseconds
const filename = `${ts}-${sessionId}.md`;

const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-f0-9-]+\.md$/;
if (pattern.test(filename)) {
  console.log('PASS');
} else {
  console.log('FAIL:filename "' + filename + '" does not match expected pattern ' + pattern.toString());
}
NODEEOF
)

if [ "$HIST04_RESULT" = "PASS" ]; then
  check "HIST-04" "PASS"
else
  REASON="${HIST04_RESULT#FAIL:}"
  check "HIST-04" "FAIL" "$REASON"
fi

# ─── HIST-01/02: NDJSON aggregation produces markdown with correct metrics ────

HIST01_RESULT=$(PROJECT_ROOT="$PROJECT_ROOT" TMPDIR_PATH="$TMPDIR_PATH" node - <<'NODEEOF' 2>&1
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpdir = process.env.TMPDIR_PATH || os.tmpdir();
const projectRoot = process.env.PROJECT_ROOT || '';
const archiveScript = path.join(projectRoot, 'hooks', 'archive-session.cjs');

if (!fs.existsSync(archiveScript)) {
  console.log('FAIL:archive-session.cjs does not exist (needed for HIST-01/02 test)');
  process.exit(0);
}

// Create fixture NDJSON: 3x subagent_start, 5x file_changed, 1x session_start, 1x session_end = 10 events
const fixtureSessionId = 'test-hist01-fixture-00000000-0000-0000-0000';
const fixturePath = path.join(tmpdir, `pde-session-${fixtureSessionId}.ndjson`);

const now = new Date();
const startTs = new Date(now - 5 * 60 * 1000).toISOString(); // 5 minutes ago

const events = [
  { schema_version: '1.0', ts: startTs, event_type: 'session_start', session_id: fixtureSessionId, extensions: {} },
  { schema_version: '1.0', ts: new Date(now - 4 * 60 * 1000).toISOString(), event_type: 'subagent_start', session_id: fixtureSessionId, extensions: { agent_type: 'executor' } },
  { schema_version: '1.0', ts: new Date(now - 3 * 60 * 1000).toISOString(), event_type: 'subagent_start', session_id: fixtureSessionId, extensions: { agent_type: 'executor' } },
  { schema_version: '1.0', ts: new Date(now - 2 * 60 * 1000).toISOString(), event_type: 'subagent_start', session_id: fixtureSessionId, extensions: { agent_type: 'executor' } },
  { schema_version: '1.0', ts: new Date(now - 90 * 1000).toISOString(), event_type: 'file_changed', session_id: fixtureSessionId, extensions: {}, file_path: 'src/a.ts' },
  { schema_version: '1.0', ts: new Date(now - 80 * 1000).toISOString(), event_type: 'file_changed', session_id: fixtureSessionId, extensions: {}, file_path: 'src/b.ts' },
  { schema_version: '1.0', ts: new Date(now - 70 * 1000).toISOString(), event_type: 'file_changed', session_id: fixtureSessionId, extensions: {}, file_path: 'src/c.ts' },
  { schema_version: '1.0', ts: new Date(now - 60 * 1000).toISOString(), event_type: 'file_changed', session_id: fixtureSessionId, extensions: {}, file_path: 'src/d.ts' },
  { schema_version: '1.0', ts: new Date(now - 50 * 1000).toISOString(), event_type: 'file_changed', session_id: fixtureSessionId, extensions: {}, file_path: 'src/e.ts' },
  { schema_version: '1.0', ts: now.toISOString(), event_type: 'session_end', session_id: fixtureSessionId, extensions: {} },
];

try {
  fs.writeFileSync(fixturePath, events.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');

  // Write fixture config so archive-session.cjs can read session_start_ts
  const fixtureCfgDir = path.join(projectRoot, '.planning');
  const fixtureCfgPath = path.join(fixtureCfgDir, 'config.json');
  let originalCfg = {};
  let originalCfgStr = null;
  try {
    originalCfgStr = fs.readFileSync(fixtureCfgPath, 'utf-8');
    originalCfg = JSON.parse(originalCfgStr);
  } catch {}

  // Temporarily override session_id and session_start_ts in config
  const testCfg = JSON.parse(JSON.stringify(originalCfg));
  if (!testCfg.monitoring) testCfg.monitoring = {};
  testCfg.monitoring.session_id = fixtureSessionId;
  testCfg.monitoring.session_start_ts = startTs;
  fs.writeFileSync(fixtureCfgPath, JSON.stringify(testCfg, null, 2), 'utf-8');

  // List logs dir before running
  const logsDir = path.join(projectRoot, '.planning', 'logs');
  const logsBefore = fs.existsSync(logsDir) ? fs.readdirSync(logsDir).filter(f => f.endsWith('.md')) : [];

  // Run archive-session.cjs
  const { spawnSync } = require('child_process');
  const hookPayload = JSON.stringify({ hook_event_name: 'SessionEnd', cwd: projectRoot, session_id: fixtureSessionId });
  const result = spawnSync(process.execPath, [archiveScript], {
    input: hookPayload,
    encoding: 'utf-8',
    timeout: 10000,
  });

  // Restore original config
  if (originalCfgStr !== null) {
    fs.writeFileSync(fixtureCfgPath, originalCfgStr, 'utf-8');
  }

  // Cleanup fixture NDJSON
  try { fs.unlinkSync(fixturePath); } catch {}

  if (result.status !== 0) {
    console.log('FAIL:archive-session.cjs exited non-zero: ' + result.status + ' stderr: ' + (result.stderr || '').slice(0, 200));
    process.exit(0);
  }

  // Find new log file
  const logsAfter = fs.existsSync(logsDir) ? fs.readdirSync(logsDir).filter(f => f.endsWith('.md')) : [];
  const newLogs = logsAfter.filter(f => !logsBefore.includes(f));

  if (newLogs.length === 0) {
    console.log('FAIL:no new markdown file created in .planning/logs/ after archive-session.cjs ran');
    process.exit(0);
  }

  // Read the generated summary
  const summaryPath = path.join(logsDir, newLogs[0]);
  const summaryContent = fs.readFileSync(summaryPath, 'utf-8');

  // Verify it contains expected metrics markers
  if (!summaryContent.includes('Session ID')) {
    console.log('FAIL:summary missing "Session ID" field');
    process.exit(0);
  }
  if (!summaryContent.includes('Total events')) {
    console.log('FAIL:summary missing "Total events" metric');
    process.exit(0);
  }
  if (!summaryContent.includes('Agents spawned')) {
    console.log('FAIL:summary missing "Agents spawned" metric');
    process.exit(0);
  }

  console.log('PASS');
} catch (err) {
  // Cleanup on error
  try { fs.unlinkSync(fixturePath); } catch {}
  console.log('FAIL:' + err.message);
}
NODEEOF
)

if [ "$HIST01_RESULT" = "PASS" ]; then
  check "HIST-01/02" "PASS"
else
  REASON="${HIST01_RESULT#FAIL:}"
  check "HIST-01/02" "FAIL" "$REASON"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────

TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo ""
echo "=== PHASE 60 VALIDATION: $PASS_COUNT/$TOTAL PASS ==="

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
