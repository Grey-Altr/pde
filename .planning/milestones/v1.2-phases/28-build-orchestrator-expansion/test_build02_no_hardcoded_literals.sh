#!/usr/bin/env bash
# BUILD-02 — No hardcoded numeric literals in stage display messages
#
# Requirement: workflows/build.md contains no hardcoded numeric literals in
# stage display/progress messages (no "Stage N/13" or "Stage N/7" patterns);
# TOTAL is referenced instead of any literal count; grep for
# "Stage [0-9]+/[0-9]+" returns 0 matches.
#
# Test type: structural / smoke
# Run: bash .planning/phases/28-build-orchestrator-expansion/test_build02_no_hardcoded_literals.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WORKFLOW="$REPO_ROOT/workflows/build.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[workflows/build.md — no hardcoded stage count literals]"
echo ""

if [[ ! -r "$WORKFLOW" ]]; then
  fail "workflows/build.md readable" "Cannot read: $WORKFLOW"
  echo "────────────────────────────────────────────────────────────"
  echo "BUILD-02 No hardcoded literals: 1 tests -- 0 passed, 1 failed"
  exit 1
fi
pass "workflows/build.md readable"

# --- No "Stage N/N" literal pattern in stage progress messages ---
# Pattern: "Stage " followed by one-or-more digits, a slash, one-or-more digits.
# This covers "Stage 1/13", "Stage 3/7", etc.
literal_matches=$(grep -cE 'Stage [0-9]+/[0-9]+' "$WORKFLOW" || true)

if [[ "$literal_matches" -eq 0 ]]; then
  pass "No 'Stage N/N' hardcoded literal patterns found (grep count = 0)"
else
  matching_lines=$(grep -nE 'Stage [0-9]+/[0-9]+' "$WORKFLOW" | head -5)
  fail "No 'Stage N/N' hardcoded literal patterns found" "Found $literal_matches match(es). First lines: $matching_lines"
fi

# --- No bare "/13" denominator in stage messages (belt-and-suspenders) ---
slash_13_count=$(grep -cE '/13' "$WORKFLOW" || true)
if [[ "$slash_13_count" -eq 0 ]]; then
  pass "No '/13' literal denominator found"
else
  # It might appear in documentation/comments — check specifically for Stage context
  stage_slash_13=$(grep -cE 'Stage[^{]*/13' "$WORKFLOW" || true)
  if [[ "$stage_slash_13" -eq 0 ]]; then
    pass "No 'Stage.../13' literal denominator found (occurrences of /13 are in non-stage-message context)"
  else
    lines=$(grep -nE 'Stage[^{]*/13' "$WORKFLOW" | head -5)
    fail "No 'Stage.../13' literal denominator in stage messages" "Found $stage_slash_13 match(es): $lines"
  fi
fi

# --- No bare "/7" denominator in stage messages ---
stage_slash_7=$(grep -cE 'Stage[^{]*/7' "$WORKFLOW" || true)
if [[ "$stage_slash_7" -eq 0 ]]; then
  pass "No 'Stage.../7' literal denominator found"
else
  lines=$(grep -nE 'Stage[^{]*/7' "$WORKFLOW" | head -5)
  fail "No 'Stage.../7' literal denominator in stage messages" "Found $stage_slash_7 match(es): $lines"
fi

# --- TOTAL is referenced in stage display messages ---
# The correct pattern uses {TOTAL} as placeholder.
total_refs=$(grep -cE '\{TOTAL\}' "$WORKFLOW" || true)
if [[ "$total_refs" -ge 1 ]]; then
  pass "{TOTAL} placeholder referenced in workflows/build.md ($total_refs occurrences)"
else
  fail "{TOTAL} placeholder referenced in workflows/build.md" "No occurrences of {TOTAL} found"
fi

# --- TOTAL definition present and data-driven ---
if grep -qF 'TOTAL = count(STAGES)' "$WORKFLOW"; then
  pass "TOTAL derived from STAGES list: 'TOTAL = count(STAGES)' present"
else
  fail "TOTAL derived from STAGES list" "'TOTAL = count(STAGES)' string not found"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "BUILD-02 No hardcoded literals: $total tests -- $PASS passed, $FAIL failed"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "Failures:"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
else
  echo "All pass."
  exit 0
fi
