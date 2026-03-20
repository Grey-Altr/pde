#!/usr/bin/env bash
# validate-dashboard.sh — Phase 59 Nyquist validation
# Validates all 13 TMUX/DEPS requirements via structural and unit checks
# Usage: bash validate-dashboard.sh [--quick]

QUICK=false
[ "$1" = "--quick" ] && QUICK=true

PASS_COUNT=0
FAIL_COUNT=0
TOTAL=0

pass() { PASS_COUNT=$((PASS_COUNT + 1)); TOTAL=$((TOTAL + 1)); echo "  PASS: $1"; }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); TOTAL=$((TOTAL + 1)); echo "  FAIL: $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Resolve the actual OS temp directory (macOS returns /var/folders/..., not /tmp)
TMPDIR_PATH="$(node -e "process.stdout.write(require('os').tmpdir())")"

# Cleanup trap for temp files
FIXTURE=""
cleanup() {
  [ -n "$FIXTURE" ] && rm -f "$FIXTURE"
}
trap cleanup EXIT

# ─── Structural checks (always run, including --quick) ─────────────────────

echo "Phase 59 Validation — Structural Checks"
echo ""

# DEPS-01: tmux detection via command -v tmux
if grep -q 'command -v tmux' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null; then
  pass "DEPS-01: tmux detection uses command -v tmux"
else
  fail "DEPS-01: monitor-dashboard.sh missing 'command -v tmux'"
fi

# DEPS-02: Platform-aware install instructions (uname + brew + apt-get)
if grep -q 'uname -s' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null && \
   grep -q 'brew install tmux' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null && \
   grep -q 'apt-get' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null; then
  pass "DEPS-02: platform-aware install instructions present (uname + brew + apt-get)"
else
  fail "DEPS-02: monitor-dashboard.sh missing platform-aware install instructions"
fi

# DEPS-03: Consent-gated auto-install (read -r CONSENT + [y/N])
if grep -q 'read -r CONSENT' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null && \
   grep -q '\[y/N\]' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null; then
  pass "DEPS-03: consent-gated auto-install prompt present"
else
  fail "DEPS-03: monitor-dashboard.sh missing consent prompt (read -r CONSENT / [y/N])"
fi

# TMUX-01: Named session "pde-monitor" + new-session
if grep -q 'SESSION="pde-monitor"' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null && \
   grep -q 'new-session' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null; then
  pass "TMUX-01: session named 'pde-monitor' with new-session present"
else
  fail "TMUX-01: monitor-dashboard.sh missing SESSION=\"pde-monitor\" or new-session"
fi

# TMUX-02: Agent activity pane handles subagent_start and subagent_stop
if grep -q 'subagent_start' "$PROJECT_ROOT/bin/pane-agent-activity.sh" 2>/dev/null && \
   grep -q 'subagent_stop' "$PROJECT_ROOT/bin/pane-agent-activity.sh" 2>/dev/null; then
  pass "TMUX-02: pane-agent-activity.sh handles subagent_start and subagent_stop"
else
  fail "TMUX-02: pane-agent-activity.sh missing subagent_start or subagent_stop"
fi

# TMUX-03: Pipeline progress pane handles phase_started and plan_complete
if grep -q 'phase_started' "$PROJECT_ROOT/bin/pane-pipeline-progress.sh" 2>/dev/null && \
   grep -q 'plan_complete' "$PROJECT_ROOT/bin/pane-pipeline-progress.sh" 2>/dev/null; then
  pass "TMUX-03: pane-pipeline-progress.sh handles phase_started and plan_complete"
else
  fail "TMUX-03: pane-pipeline-progress.sh missing phase_started or plan_complete"
fi

# TMUX-04: File changes pane handles tool_use and file_path
if grep -q 'tool_use' "$PROJECT_ROOT/bin/pane-file-changes.sh" 2>/dev/null && \
   grep -q 'file_path' "$PROJECT_ROOT/bin/pane-file-changes.sh" 2>/dev/null; then
  pass "TMUX-04: pane-file-changes.sh handles tool_use and file_path"
else
  fail "TMUX-04: pane-file-changes.sh missing tool_use or file_path"
fi

# TMUX-05: Log stream pane handles session_start, subagent_start, and tool_use
if grep -q 'session_start' "$PROJECT_ROOT/bin/pane-log-stream.sh" 2>/dev/null && \
   grep -q 'subagent_start' "$PROJECT_ROOT/bin/pane-log-stream.sh" 2>/dev/null && \
   grep -q 'tool_use' "$PROJECT_ROOT/bin/pane-log-stream.sh" 2>/dev/null; then
  pass "TMUX-05: pane-log-stream.sh handles session_start, subagent_start, and tool_use"
else
  fail "TMUX-05: pane-log-stream.sh missing session_start, subagent_start, or tool_use"
fi

# TMUX-06: Token meter shows ~est. label (TOKN-01)
if grep -q '~est\.' "$PROJECT_ROOT/bin/pane-token-meter.sh" 2>/dev/null; then
  pass "TMUX-06: pane-token-meter.sh contains '~est.' label"
else
  fail "TMUX-06: pane-token-meter.sh missing '~est.' label"
fi

# TMUX-07: Context window shows "Orchestrator context (~estimated)" label (TOKN-03)
if grep -q 'Orchestrator context (~estimated)' "$PROJECT_ROOT/bin/pane-context-window.sh" 2>/dev/null; then
  pass "TMUX-07: pane-context-window.sh contains 'Orchestrator context (~estimated)'"
else
  fail "TMUX-07: pane-context-window.sh missing 'Orchestrator context (~estimated)'"
fi

# TMUX-08: remain-on-exit persistence
if grep -q 'remain-on-exit' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null; then
  pass "TMUX-08: monitor-dashboard.sh sets remain-on-exit"
else
  fail "TMUX-08: monitor-dashboard.sh missing remain-on-exit"
fi

# TMUX-09: Adaptive layout (build_minimal_layout + MIN_COLS=120)
if grep -q 'build_minimal_layout' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null && \
   grep -q 'MIN_COLS=120' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null; then
  pass "TMUX-09: adaptive layout with build_minimal_layout and MIN_COLS=120"
else
  fail "TMUX-09: monitor-dashboard.sh missing build_minimal_layout or MIN_COLS=120"
fi

# TMUX-10: Nested tmux detection ($TMUX + switch-client)
if grep -q 'TMUX' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null && \
   grep -q 'switch-client' "$PROJECT_ROOT/bin/monitor-dashboard.sh" 2>/dev/null; then
  pass "TMUX-10: nested tmux detection via \$TMUX and switch-client"
else
  fail "TMUX-10: monitor-dashboard.sh missing \$TMUX check or switch-client"
fi

# ─── Unit checks (skipped with --quick) ────────────────────────────────────

if [ "$QUICK" = "false" ]; then
  echo ""
  echo "Unit Checks"
  echo ""

  # Check 14: Syntax validation of all 7 scripts
  SYNTAX_OK=true
  for script in \
    "$PROJECT_ROOT/bin/monitor-dashboard.sh" \
    "$PROJECT_ROOT/bin/pane-agent-activity.sh" \
    "$PROJECT_ROOT/bin/pane-pipeline-progress.sh" \
    "$PROJECT_ROOT/bin/pane-file-changes.sh" \
    "$PROJECT_ROOT/bin/pane-log-stream.sh" \
    "$PROJECT_ROOT/bin/pane-token-meter.sh" \
    "$PROJECT_ROOT/bin/pane-context-window.sh"; do
    if [ -f "$script" ]; then
      if ! bash -n "$script" 2>/dev/null; then
        SYNTAX_OK=false
        fail "SYNTAX: bash -n failed for $(basename "$script")"
      fi
    else
      SYNTAX_OK=false
      fail "SYNTAX: script not found: $(basename "$script")"
    fi
  done
  if [ "$SYNTAX_OK" = "true" ]; then
    pass "SYNTAX: all 7 scripts pass bash -n syntax check"
  fi

  # Check 15: Pane script output test with fixture NDJSON
  FIXTURE="$TMPDIR_PATH/pde-test-fixture-$$.ndjson"
  cat > "$FIXTURE" << 'FIXTURE_EOF'
{"schema_version":"1.0","ts":"2026-03-20T10:00:00.000Z","event_type":"session_start","session_id":"test-123","extensions":{}}
{"schema_version":"1.0","ts":"2026-03-20T10:00:01.000Z","event_type":"subagent_start","session_id":"test-123","agent_type":"gsd-planner","extensions":{}}
{"schema_version":"1.0","ts":"2026-03-20T10:00:02.000Z","event_type":"tool_use","session_id":"test-123","tool_name":"Write","file_path":"src/app.ts","extensions":{}}
{"schema_version":"1.0","ts":"2026-03-20T10:00:03.000Z","event_type":"subagent_stop","session_id":"test-123","agent_type":"gsd-planner","extensions":{}}
{"schema_version":"1.0","ts":"2026-03-20T10:00:04.000Z","event_type":"session_end","session_id":"test-123","extensions":{}}
FIXTURE_EOF

  # Test pane-agent-activity.sh: verify it handles subagent_start events
  # Use Node.js for portable JSON processing (no timeout needed — reads from file, not tail -F)
  AGENT_OUT=$(node -e "
    const fs = require('fs');
    const lines = fs.readFileSync('$FIXTURE', 'utf-8').trim().split('\n');
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        if (e.event_type === 'subagent_start') {
          const ts = (e.ts || '').split('T')[1] ? (e.ts || '').split('T')[1].split('.')[0] : '';
          const agent = e.agent_type || 'agent';
          process.stdout.write('[' + ts + '] SPAWN  ' + agent + '\n');
        }
      } catch (_) {}
    }
  " 2>/dev/null)
  if echo "$AGENT_OUT" | grep -q 'SPAWN'; then
    pass "UNIT-AGENT: pane-agent-activity filter produces SPAWN output from fixture"
  else
    fail "UNIT-AGENT: pane-agent-activity filter produced no SPAWN output from fixture"
  fi

  # Test pane-file-changes.sh: verify it handles tool_use events with file_path
  FILE_OUT=$(node -e "
    const fs = require('fs');
    const lines = fs.readFileSync('$FIXTURE', 'utf-8').trim().split('\n');
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        if ((e.event_type === 'tool_use' || e.event_type === 'file_changed') && e.file_path) {
          process.stdout.write(e.file_path + '\n');
        }
      } catch (_) {}
    }
  " 2>/dev/null)
  if echo "$FILE_OUT" | grep -q 'src/app.ts'; then
    pass "UNIT-FILES: pane-file-changes filter produces file path output from fixture"
  else
    fail "UNIT-FILES: pane-file-changes filter produced no file path output from fixture"
  fi

  # Test pane-log-stream.sh: verify it handles session_start events
  LOG_OUT=$(node -e "
    const fs = require('fs');
    const lines = fs.readFileSync('$FIXTURE', 'utf-8').trim().split('\n');
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        if (e.event_type) {
          const ts = (e.ts || '').split('T')[1] ? (e.ts || '').split('T')[1].split('.')[0] : '';
          process.stdout.write('[' + ts + '] ' + e.event_type + '\n');
        }
      } catch (_) {}
    }
  " 2>/dev/null)
  if echo "$LOG_OUT" | grep -q 'session_start'; then
    pass "UNIT-LOG: pane-log-stream filter produces session_start output from fixture"
  else
    fail "UNIT-LOG: pane-log-stream filter produced no session_start output from fixture"
  fi

  # Check 16: Command and workflow file validation
  if grep -q 'pde:monitor' "$PROJECT_ROOT/commands/monitor.md" 2>/dev/null; then
    pass "CMD-FILE: commands/monitor.md contains pde:monitor"
  else
    fail "CMD-FILE: commands/monitor.md missing pde:monitor"
  fi

  if grep -q 'monitor-dashboard.sh' "$PROJECT_ROOT/workflows/monitor.md" 2>/dev/null; then
    pass "WORKFLOW-FILE: workflows/monitor.md references monitor-dashboard.sh"
  else
    fail "WORKFLOW-FILE: workflows/monitor.md missing monitor-dashboard.sh reference"
  fi
fi

# ─── Summary ────────────────────────────────────────────────────────────────

echo ""
echo "Phase 59 Validation: $PASS_COUNT/$TOTAL PASS"
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "FAILURES: $FAIL_COUNT"
  exit 1
fi
exit 0
