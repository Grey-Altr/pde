#!/usr/bin/env bash
# BUILD-03 — --from flag parsing and skip logic structural test
#
# Requirement: workflows/build.md contains --from flag parsing; contains
# case-sensitive stage name validation with error halt; contains FROM_INDEX
# skip logic; commands/build.md argument-hint includes --from.
#
# Test type: structural / smoke
# Run: bash .planning/phases/28-build-orchestrator-expansion/test_build03_from_flag.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WORKFLOW="$REPO_ROOT/workflows/build.md"
COMMAND="$REPO_ROOT/commands/build.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[workflows/build.md — --from flag]"
echo ""

if [[ ! -r "$WORKFLOW" ]]; then
  fail "workflows/build.md readable" "Cannot read: $WORKFLOW"
  echo "────────────────────────────────────────────────────────────"
  echo "BUILD-03 --from flag: 1 tests -- 0 passed, 1 failed"
  exit 1
fi
pass "workflows/build.md readable"

# --- --from flag parsing block present ---
# The bash parsing block uses grep -oE '--from\s+\S+' to extract the stage name.
if grep -qE '\-\-from' "$WORKFLOW"; then
  pass "--from flag referenced in workflows/build.md"
else
  fail "--from flag referenced in workflows/build.md" "No '--from' text found"
fi

# FROM_STAGE variable defined
if grep -qF 'FROM_STAGE' "$WORKFLOW"; then
  pass "FROM_STAGE variable referenced"
else
  fail "FROM_STAGE variable referenced" "No 'FROM_STAGE' found in workflows/build.md"
fi

# Bash parsing block: grep -oE pattern to extract the stage value
# The workflow uses escaped dashes (\-\-from) inside the grep pattern string.
if grep -qE "grep -oE.*from" "$WORKFLOW"; then
  pass "bash parsing block with grep -oE for --from value extraction present"
else
  fail "bash parsing block with grep -oE for --from value extraction present" "No 'grep -oE.*from' pattern found"
fi

# --- Case-sensitive validation with error halt ---
# The error message explicitly names all valid stages and is followed by HALT.
if grep -qE "Unknown stage" "$WORKFLOW"; then
  pass "Error message for unknown stage name present"
else
  fail "Error message for unknown stage name present" "No 'Unknown stage' text found in workflows/build.md"
fi

# The error message must list the valid stage names
if grep -qE "Valid stages:" "$WORKFLOW"; then
  pass "'Valid stages:' label present in error message"
else
  fail "'Valid stages:' label present in error message" "No 'Valid stages:' text found"
fi

# HALT instruction present after validation failure
halt_count=$(grep -cF 'HALT' "$WORKFLOW" || true)
if [[ "$halt_count" -ge 1 ]]; then
  pass "HALT instruction present ($halt_count occurrences)"
else
  fail "HALT instruction present" "No 'HALT' text found in workflows/build.md"
fi

# --- FROM_INDEX skip logic ---
if grep -qF 'FROM_INDEX' "$WORKFLOW"; then
  pass "FROM_INDEX variable referenced"
else
  fail "FROM_INDEX variable referenced" "No 'FROM_INDEX' found in workflows/build.md"
fi

# Skip logic: if FROM_INDEX is set AND stage index < FROM_INDEX
if grep -qE 'FROM_INDEX is set' "$WORKFLOW"; then
  pass "FROM_INDEX skip condition ('FROM_INDEX is set') present"
else
  fail "FROM_INDEX skip condition ('FROM_INDEX is set') present" "No 'FROM_INDEX is set' conditional text found"
fi

# The skip action displays a message rather than running the skill
if grep -qE 'skipped.*--from' "$WORKFLOW"; then
  pass "Skip display message with '--from' annotation present"
else
  fail "Skip display message with '--from' annotation present" "No 'skipped.*--from' pattern found"
fi

# --- --from must NOT appear in PASSTHROUGH_ARGS ---
# The workflow must explicitly state --from is NOT forwarded.
if grep -qE 'Do NOT include.*--from' "$WORKFLOW"; then
  pass "--from explicitly excluded from PASSTHROUGH_ARGS"
else
  fail "--from explicitly excluded from PASSTHROUGH_ARGS" "No 'Do NOT include.*--from' instruction found"
fi

echo ""
echo "[commands/build.md — argument-hint includes --from]"
echo ""

if [[ ! -r "$COMMAND" ]]; then
  fail "commands/build.md readable" "Cannot read: $COMMAND"
else
  pass "commands/build.md readable"

  if grep -qF -- '--from' "$COMMAND"; then
    pass "commands/build.md argument-hint contains '--from'"
  else
    fail "commands/build.md argument-hint contains '--from'" "No '--from' text found in commands/build.md"
  fi
fi

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "BUILD-03 --from flag: $total tests -- $PASS passed, $FAIL failed"

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
