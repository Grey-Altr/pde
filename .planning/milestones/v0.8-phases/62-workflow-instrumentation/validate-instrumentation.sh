#!/usr/bin/env bash
# Phase 62 — Workflow Instrumentation Validation
# Tests EVNT-04 requirements: workflow event emissions in execute-phase.md and execute-plan.md,
# archive-session.cjs phase event aggregation, and fire-and-forget safety pattern.
# Must complete in under 5 seconds and exit 0 only if all checks pass.

set -uo pipefail

PASS_COUNT=0
FAIL_COUNT=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Parse flags
QUICK_MODE=false
for arg in "$@"; do
  if [ "$arg" = "--quick" ]; then
    QUICK_MODE=true
  fi
done

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

# ─── EVNT04-A: execute-phase.md contains event-emit phase_started ─────────────

if grep -q 'event-emit phase_started' "$PROJECT_ROOT/workflows/execute-phase.md" 2>/dev/null; then
  check "EVNT04-A" "PASS"
else
  check "EVNT04-A" "FAIL" "workflows/execute-phase.md does not contain 'event-emit phase_started'"
fi

# ─── EVNT04-B: execute-phase.md contains event-emit phase_complete ────────────

if grep -q 'event-emit phase_complete' "$PROJECT_ROOT/workflows/execute-phase.md" 2>/dev/null; then
  check "EVNT04-B" "PASS"
else
  check "EVNT04-B" "FAIL" "workflows/execute-phase.md does not contain 'event-emit phase_complete'"
fi

# ─── EVNT04-C: execute-phase.md contains event-emit wave_started ──────────────

if grep -q 'event-emit wave_started' "$PROJECT_ROOT/workflows/execute-phase.md" 2>/dev/null; then
  check "EVNT04-C" "PASS"
else
  check "EVNT04-C" "FAIL" "workflows/execute-phase.md does not contain 'event-emit wave_started'"
fi

# ─── EVNT04-D: execute-phase.md contains event-emit wave_complete ─────────────

if grep -q 'event-emit wave_complete' "$PROJECT_ROOT/workflows/execute-phase.md" 2>/dev/null; then
  check "EVNT04-D" "PASS"
else
  check "EVNT04-D" "FAIL" "workflows/execute-phase.md does not contain 'event-emit wave_complete'"
fi

# ─── EVNT04-E: execute-plan.md contains plan_started AND plan_complete ────────

HAS_STARTED=false
HAS_COMPLETE=false
grep -q 'event-emit plan_started' "$PROJECT_ROOT/workflows/execute-plan.md" 2>/dev/null && HAS_STARTED=true
grep -q 'event-emit plan_complete' "$PROJECT_ROOT/workflows/execute-plan.md" 2>/dev/null && HAS_COMPLETE=true

if [ "$HAS_STARTED" = true ] && [ "$HAS_COMPLETE" = true ]; then
  check "EVNT04-E" "PASS"
else
  MISSING=""
  [ "$HAS_STARTED" = false ] && MISSING="${MISSING}plan_started "
  [ "$HAS_COMPLETE" = false ] && MISSING="${MISSING}plan_complete"
  check "EVNT04-E" "FAIL" "workflows/execute-plan.md missing: ${MISSING}"
fi

# ─── Unit checks (skip when --quick) ──────────────────────────────────────────

if [ "$QUICK_MODE" = true ]; then
  echo ""
  echo "(Unit checks EVNT04-F, EVNT04-G, and EVNT04-H skipped in --quick mode)"
else

  # ─── EVNT04-F: archive-session.cjs contains phaseEvents aggregation ────────

  if grep -q 'phaseEvents' "$PROJECT_ROOT/hooks/archive-session.cjs" 2>/dev/null; then
    check "EVNT04-F" "PASS"
  else
    check "EVNT04-F" "FAIL" "hooks/archive-session.cjs does not contain 'phaseEvents' (Plan 02 will fix this)"
  fi

  # ─── EVNT04-G: archive-session.cjs renders phase progress dynamically ──────

  if grep -qE 'renderPhaseProgress|phase_started.*phase_complete' "$PROJECT_ROOT/hooks/archive-session.cjs" 2>/dev/null; then
    check "EVNT04-G" "PASS"
  else
    check "EVNT04-G" "FAIL" "hooks/archive-session.cjs missing renderPhaseProgress or dynamic phase rendering (Plan 02 will fix this)"
  fi

  # ─── EVNT04-H: All event-emit calls in execute-phase.md use || true ────────

  UNSAFE=$(grep 'event-emit' "$PROJECT_ROOT/workflows/execute-phase.md" 2>/dev/null | grep -v '|| true' | wc -l | tr -d ' ')
  if [ "$UNSAFE" -eq 0 ]; then
    check "EVNT04-H" "PASS"
  else
    check "EVNT04-H" "FAIL" "Found $UNSAFE event-emit call(s) in execute-phase.md without '|| true' (fire-and-forget required)"
  fi

fi

# ─── Summary ─────────────────────────────────────────────────────────────────

TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo ""
echo "=== PHASE 62 VALIDATION: $PASS_COUNT/$TOTAL PASS ==="

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
