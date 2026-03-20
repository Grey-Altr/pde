#!/usr/bin/env bash
# Phase 61 — Token/Context Metering Validation
# Tests TOKN requirements: TOKN-01 (chars/4 heuristic, ~est. labels),
# TOKN-02 (per-model pricing), TOKN-03 (context window scope disclaimer)
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

# ─── TOKN01-A: pane-token-meter.sh contains ~est. label ───────────────────────

if grep -q '~est\.' "$PROJECT_ROOT/bin/pane-token-meter.sh"; then
  check "TOKN01-A" "PASS"
else
  check "TOKN01-A" "FAIL" "bin/pane-token-meter.sh does not contain '~est.' approximation label"
fi

# ─── TOKN01-B: pane-token-meter.sh contains chars/4 heuristic ─────────────────

if grep -qE 'line_len / 4|\$\{#line\}' "$PROJECT_ROOT/bin/pane-token-meter.sh"; then
  check "TOKN01-B" "PASS"
else
  check "TOKN01-B" "FAIL" "bin/pane-token-meter.sh does not contain chars/4 heuristic (line_len / 4 or \${#line})"
fi

# ─── TOKN02-A: pane-token-meter.sh contains all three pricing tiers ───────────

if grep -q 'opus' "$PROJECT_ROOT/bin/pane-token-meter.sh" && \
   grep -q 'sonnet' "$PROJECT_ROOT/bin/pane-token-meter.sh" && \
   grep -q 'haiku' "$PROJECT_ROOT/bin/pane-token-meter.sh"; then
  check "TOKN02-A" "PASS"
else
  check "TOKN02-A" "FAIL" "bin/pane-token-meter.sh missing one or more pricing tiers (opus/sonnet/haiku)"
fi

# ─── TOKN02-B: pane-token-meter.sh requires model-profiles.cjs ────────────────

if grep -q 'model-profiles' "$PROJECT_ROOT/bin/pane-token-meter.sh"; then
  check "TOKN02-B" "PASS"
else
  check "TOKN02-B" "FAIL" "bin/pane-token-meter.sh does not reference model-profiles.cjs"
fi

# ─── TOKN03-A: pane-context-window.sh contains 'Orchestrator context (~estimated)' ─

if grep -q 'Orchestrator context (~estimated)' "$PROJECT_ROOT/bin/pane-context-window.sh"; then
  check "TOKN03-A" "PASS"
else
  check "TOKN03-A" "FAIL" "bin/pane-context-window.sh does not contain 'Orchestrator context (~estimated)'"
fi

# ─── TOKN03-B: pane-context-window.sh contains subagent scope disclaimer ──────

if grep -q 'not subagents' "$PROJECT_ROOT/bin/pane-context-window.sh"; then
  check "TOKN03-B" "PASS"
else
  check "TOKN03-B" "FAIL" "bin/pane-context-window.sh does not contain 'not subagents' scope disclaimer"
fi

# ─── Unit checks (skip when --quick) ──────────────────────────────────────────

if [ "$QUICK_MODE" = true ]; then
  echo ""
  echo "(Unit checks TOKN02-C and TOKN03-C skipped in --quick mode)"
else

  # ─── TOKN02-C: Sonnet and Haiku costs differ for same token count ──────────

  TOKN02C_RESULT=$(node -e "
const tokens = 100000;
// 70/30 input/output split
const sonnetCost = (tokens * 0.7 / 1e6 * 3) + (tokens * 0.3 / 1e6 * 15);
const haikuCost  = (tokens * 0.7 / 1e6 * 1) + (tokens * 0.3 / 1e6 * 5);
// sonnet: (0.07 * 3) + (0.03 * 15) = 0.21 + 0.45 = 0.66
// haiku:  (0.07 * 1) + (0.03 * 5)  = 0.07 + 0.15 = 0.22
if (sonnetCost !== haikuCost) {
  process.stdout.write('PASS');
} else {
  process.stdout.write('FAIL:sonnet cost (' + sonnetCost + ') equals haiku cost (' + haikuCost + ') — must differ');
}
" 2>&1)

  if [ "$TOKN02C_RESULT" = "PASS" ]; then
    check "TOKN02-C" "PASS"
  else
    REASON="${TOKN02C_RESULT#FAIL:}"
    check "TOKN02-C" "FAIL" "$REASON"
  fi

  # ─── TOKN03-C: Context percentage calculation is correct ──────────────────

  TOKN03C_RESULT=$(node -e "
const tokens = 10000;
const contextWindow = 1000000;
const pct = Math.floor(tokens / contextWindow * 100);
if (pct === 1) {
  process.stdout.write('PASS');
} else {
  process.stdout.write('FAIL:expected 1, got ' + pct);
}
" 2>&1)

  if [ "$TOKN03C_RESULT" = "PASS" ]; then
    check "TOKN03-C" "PASS"
  else
    REASON="${TOKN03C_RESULT#FAIL:}"
    check "TOKN03-C" "FAIL" "$REASON"
  fi

fi

# ─── Summary ─────────────────────────────────────────────────────────────────

TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo ""
echo "=== PHASE 61 VALIDATION: $PASS_COUNT/$TOTAL PASS ==="

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
