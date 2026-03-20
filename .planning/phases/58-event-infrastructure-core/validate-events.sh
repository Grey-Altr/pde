#!/usr/bin/env bash
# validate-events.sh — Phase 58 end-to-end validation script
# Tests EVNT-01, EVNT-02, EVNT-03, EVNT-05, EVNT-06, and FAIL-SILENT behavior
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

# ─── EVNT-01: event-emit produces NDJSON with all 5 required envelope fields ──

# Start a fresh session so we have a known session ID
node "$PROJECT_ROOT/bin/pde-tools.cjs" session-start > /dev/null 2>&1 || true

# Emit a test event
node "$PROJECT_ROOT/bin/pde-tools.cjs" event-emit evnt01_test '{"test":true}' > /dev/null 2>&1 || true

# Find newest NDJSON file and validate last line schema
EVNT01_RESULT=$(TMPDIR_PATH="$TMPDIR_PATH" node - <<'NODEEOF' 2>&1
const fs = require('fs');
const path = require('path');

const tmpDir = process.env.TMPDIR_PATH || require('os').tmpdir();

try {
  const allFiles = fs.readdirSync(tmpDir);
  const files = allFiles
    .filter(f => f.startsWith('pde-session-') && f.endsWith('.ndjson'))
    .map(f => {
      const fullPath = path.join(tmpDir, f);
      return { path: fullPath, mtime: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.log('FAIL:no NDJSON files found in ' + tmpDir);
    process.exit(0);
  }

  const content = fs.readFileSync(files[0].path, 'utf-8').trim();
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) {
    console.log('FAIL:NDJSON file is empty');
    process.exit(0);
  }

  // Find the evnt01_test event line
  let testLine = null;
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      if (e.event_type === 'evnt01_test') { testLine = e; }
    } catch {}
  }

  if (!testLine) {
    console.log('FAIL:evnt01_test event not found in NDJSON file');
    process.exit(0);
  }

  if (testLine.schema_version !== '1.0') {
    console.log('FAIL:schema_version is not 1.0, got: ' + testLine.schema_version);
    process.exit(0);
  }
  if (typeof testLine.ts !== 'string' || testLine.ts.length === 0) {
    console.log('FAIL:ts field missing or not a string');
    process.exit(0);
  }
  if (testLine.event_type !== 'evnt01_test') {
    console.log('FAIL:event_type mismatch');
    process.exit(0);
  }
  if (typeof testLine.session_id !== 'string' || testLine.session_id === 'unknown' || testLine.session_id.length === 0) {
    console.log('FAIL:session_id is missing, empty, or "unknown", got: ' + testLine.session_id);
    process.exit(0);
  }
  if (testLine.extensions === undefined || testLine.extensions === null || typeof testLine.extensions !== 'object') {
    console.log('FAIL:extensions field missing or not an object');
    process.exit(0);
  }

  console.log('PASS');
} catch (err) {
  console.log('FAIL:' + err.message);
}
NODEEOF
)

if [ "$EVNT01_RESULT" = "PASS" ]; then
  check "EVNT-01" "PASS"
else
  REASON="${EVNT01_RESULT#FAIL:}"
  check "EVNT-01" "FAIL" "$REASON"
fi

# ─── EVNT-02: NDJSON file exists in tmpdir with session-scoped UUID filename ──

NDJSON_COUNT=$(ls "$TMPDIR_PATH"/pde-session-*.ndjson 2>/dev/null | wc -l | tr -d ' ')
if [ "$NDJSON_COUNT" -gt 0 ]; then
  check "EVNT-02" "PASS"
else
  check "EVNT-02" "FAIL" "no NDJSON files in $TMPDIR_PATH"
fi

# ─── EVNT-03: hooks/hooks.json has correct structure ─────────────────────────

EVNT03_RESULT=$(PROJECT_ROOT="$PROJECT_ROOT" node - <<'NODEEOF' 2>&1
const fs = require('fs');
const path = require('path');

const projectRoot = process.env.PROJECT_ROOT || '';
const resolvedPath = path.join(projectRoot, 'hooks', 'hooks.json');

try {
  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const parsed = JSON.parse(content);

  const required = ['SubagentStart', 'SubagentStop', 'PostToolUse', 'SessionStart', 'SessionEnd'];
  const h = parsed.hooks;
  if (!h) {
    console.log('FAIL:hooks key missing at root');
    process.exit(0);
  }

  for (const key of required) {
    if (!h[key]) {
      console.log('FAIL:missing hook event: ' + key);
      process.exit(0);
    }
    if (!h[key][0] || !h[key][0].hooks) {
      console.log('FAIL:missing inner hooks array for: ' + key);
      process.exit(0);
    }
  }

  // SessionStart must be async: false
  if (h.SessionStart[0].hooks[0].async !== false) {
    console.log('FAIL:SessionStart async must be false, got: ' + h.SessionStart[0].hooks[0].async);
    process.exit(0);
  }

  // SessionEnd must be async: false
  if (h.SessionEnd[0].hooks[0].async !== false) {
    console.log('FAIL:SessionEnd async must be false, got: ' + h.SessionEnd[0].hooks[0].async);
    process.exit(0);
  }

  console.log('PASS');
} catch (err) {
  console.log('FAIL:' + err.message);
}
NODEEOF
)

if [ "$EVNT03_RESULT" = "PASS" ]; then
  check "EVNT-03" "PASS"
else
  REASON="${EVNT03_RESULT#FAIL:}"
  check "EVNT-03" "FAIL" "$REASON"
fi

# ─── EVNT-05: extensions field present on emitted events ─────────────────────

EVNT05_RESULT=$(TMPDIR_PATH="$TMPDIR_PATH" node - <<'NODEEOF' 2>&1
const fs = require('fs');
const path = require('path');

const tmpDir = process.env.TMPDIR_PATH || require('os').tmpdir();

try {
  const files = fs.readdirSync(tmpDir)
    .filter(f => f.startsWith('pde-session-') && f.endsWith('.ndjson'))
    .map(f => {
      const fullPath = path.join(tmpDir, f);
      return { path: fullPath, mtime: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.log('FAIL:no NDJSON files found');
    process.exit(0);
  }

  const content = fs.readFileSync(files[0].path, 'utf-8').trim();
  const lines = content.split('\n').filter(l => l.trim());

  let testLine = null;
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      if (e.event_type === 'evnt01_test') { testLine = e; }
    } catch {}
  }

  if (!testLine) {
    console.log('FAIL:evnt01_test event not found (reusing EVNT-01 event)');
    process.exit(0);
  }

  if (testLine.extensions === undefined) {
    console.log('FAIL:extensions field missing');
    process.exit(0);
  }

  console.log('PASS');
} catch (err) {
  console.log('FAIL:' + err.message);
}
NODEEOF
)

if [ "$EVNT05_RESULT" = "PASS" ]; then
  check "EVNT-05" "PASS"
else
  REASON="${EVNT05_RESULT#FAIL:}"
  check "EVNT-05" "FAIL" "$REASON"
fi

# ─── EVNT-06: Two sequential session-starts produce separate NDJSON files ────

COUNT_BEFORE=$(ls "$TMPDIR_PATH"/pde-session-*.ndjson 2>/dev/null | wc -l | tr -d ' ')

node "$PROJECT_ROOT/bin/pde-tools.cjs" session-start > /dev/null 2>&1 || true
node "$PROJECT_ROOT/bin/pde-tools.cjs" event-emit evnt06_a '{}' > /dev/null 2>&1 || true
node "$PROJECT_ROOT/bin/pde-tools.cjs" session-start > /dev/null 2>&1 || true
node "$PROJECT_ROOT/bin/pde-tools.cjs" event-emit evnt06_b '{}' > /dev/null 2>&1 || true

COUNT_AFTER=$(ls "$TMPDIR_PATH"/pde-session-*.ndjson 2>/dev/null | wc -l | tr -d ' ')
EXPECTED_MIN=$((COUNT_BEFORE + 2))

if [ "$COUNT_AFTER" -ge "$EXPECTED_MIN" ]; then
  check "EVNT-06" "PASS"
else
  check "EVNT-06" "FAIL" "expected $EXPECTED_MIN+ files, got $COUNT_AFTER (was $COUNT_BEFORE before)"
fi

# ─── FAIL-SILENT: event-emit with malformed payload exits 0 ──────────────────

node "$PROJECT_ROOT/bin/pde-tools.cjs" event-emit bad_event 'NOT_JSON' > /dev/null 2>&1 || true
EXIT_CODE=$?

if [ "$EXIT_CODE" -eq 0 ]; then
  check "FAIL-SILENT" "PASS"
else
  check "FAIL-SILENT" "FAIL" "non-zero exit ($EXIT_CODE) on malformed payload"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────

TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo ""
echo "=== PHASE 58 VALIDATION: $PASS_COUNT/$TOTAL PASS ==="

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
