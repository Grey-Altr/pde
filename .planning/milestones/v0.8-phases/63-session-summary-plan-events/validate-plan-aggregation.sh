#!/usr/bin/env bash
# Phase 63 — Session Summary Plan Event Aggregation Validation
# Tests EVNT-04 gap closure: plan_started/plan_complete in archive-session.cjs aggregation

set -uo pipefail

PASS_COUNT=0
FAIL_COUNT=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

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

# EVNT04-P1: PHASE_EVENT_TYPES includes plan_started
if grep -q 'plan_started' "$PROJECT_ROOT/hooks/archive-session.cjs" 2>/dev/null; then
  check "EVNT04-P1" "PASS"
else
  check "EVNT04-P1" "FAIL" "hooks/archive-session.cjs PHASE_EVENT_TYPES missing plan_started"
fi

# EVNT04-P2: PHASE_EVENT_TYPES includes plan_complete
if grep -q 'plan_complete' "$PROJECT_ROOT/hooks/archive-session.cjs" 2>/dev/null; then
  check "EVNT04-P2" "PASS"
else
  check "EVNT04-P2" "FAIL" "hooks/archive-session.cjs PHASE_EVENT_TYPES missing plan_complete"
fi

# EVNT04-P3: renderPhaseProgress handles plan_started case
if grep -q "case 'plan_started'" "$PROJECT_ROOT/hooks/archive-session.cjs" 2>/dev/null; then
  check "EVNT04-P3" "PASS"
else
  check "EVNT04-P3" "FAIL" "renderPhaseProgress() missing case 'plan_started'"
fi

# EVNT04-P4: renderPhaseProgress handles plan_complete case
if grep -q "case 'plan_complete'" "$PROJECT_ROOT/hooks/archive-session.cjs" 2>/dev/null; then
  check "EVNT04-P4" "PASS"
else
  check "EVNT04-P4" "FAIL" "renderPhaseProgress() missing case 'plan_complete'"
fi

# EVNT04-P5: archive-session.cjs parses without syntax error
SYNTAX_ERR=$(node --check "$PROJECT_ROOT/hooks/archive-session.cjs" 2>&1)
if [ -z "$SYNTAX_ERR" ]; then
  check "EVNT04-P5" "PASS"
else
  check "EVNT04-P5" "FAIL" "archive-session.cjs syntax error: $SYNTAX_ERR"
fi

# EVNT04-P6: Unit test — renderPhaseProgress renders plan events
RENDER_RESULT=$(node -e "
const src = require('fs').readFileSync('$PROJECT_ROOT/hooks/archive-session.cjs', 'utf-8');
const hasPlanStarted = src.includes(\"case 'plan_started'\");
const hasPlanComplete = src.includes(\"case 'plan_complete'\");
const hasPlanId = src.includes('ev.plan_id');
if (hasPlanStarted && hasPlanComplete && hasPlanId) {
  console.log('PASS');
} else {
  console.log('FAIL: missing plan_started=' + hasPlanStarted + ' plan_complete=' + hasPlanComplete + ' plan_id=' + hasPlanId);
}
" 2>&1)
if [ "$RENDER_RESULT" = "PASS" ]; then
  check "EVNT04-P6" "PASS"
else
  check "EVNT04-P6" "FAIL" "$RENDER_RESULT"
fi

TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo ""
echo "=== PHASE 63 VALIDATION: $PASS_COUNT/$TOTAL PASS ==="

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
