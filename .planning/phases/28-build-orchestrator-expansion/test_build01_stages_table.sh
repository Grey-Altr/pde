#!/usr/bin/env bash
# BUILD-01 — 13-stage STAGES table structural test
#
# Requirement: workflows/build.md contains exactly 13 stage entries in the
# STAGES table; stage names are in correct canonical order (recommend,
# competitive, opportunity, ideate, brief, system, flows, wireframe, critique,
# iterate, mockup, hig, handoff); each stage has a Skill() invocation;
# commands/build.md description lists all 13 stage names.
#
# Test type: structural / smoke
# Run: bash .planning/phases/28-build-orchestrator-expansion/test_build01_stages_table.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WORKFLOW="$REPO_ROOT/workflows/build.md"
COMMAND="$REPO_ROOT/commands/build.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

CANONICAL_ORDER=(
  recommend
  competitive
  opportunity
  ideate
  brief
  system
  flows
  wireframe
  critique
  iterate
  mockup
  hig
  handoff
)

echo "[workflows/build.md — STAGES table]"
echo ""

# File must be readable
if [[ ! -r "$WORKFLOW" ]]; then
  fail "workflows/build.md readable" "Cannot read: $WORKFLOW"
  echo "────────────────────────────────────────────────────────────"
  echo "BUILD-01 Stages table: 1 tests — 0 passed, 1 failed"
  exit 1
fi
pass "workflows/build.md readable"

# --- STAGES table row count ---
# Count table rows: lines that match "| N | name | pde:name |..." in the STAGES block.
# We look for lines that start with a pipe, have a digit index, and contain one of the
# canonical names in the second column.
stage_row_count=$(grep -cE '^\|[[:space:]]*[0-9]+[[:space:]]*\|[[:space:]]*(recommend|competitive|opportunity|ideate|brief|system|flows|wireframe|critique|iterate|mockup|hig|handoff)[[:space:]]*\|' "$WORKFLOW" || true)

if [[ "$stage_row_count" -eq 13 ]]; then
  pass "STAGES table contains exactly 13 rows (found $stage_row_count)"
else
  fail "STAGES table contains exactly 13 rows" "Found $stage_row_count rows matching canonical stage pattern"
fi

# --- Canonical order check ---
# Extract the stage names from STAGES table rows in document order and compare.
actual_order=$(grep -E '^\|[[:space:]]*[0-9]+[[:space:]]*\|[[:space:]]*(recommend|competitive|opportunity|ideate|brief|system|flows|wireframe|critique|iterate|mockup|hig|handoff)[[:space:]]*\|' "$WORKFLOW" \
  | grep -oE '\|[[:space:]]*(recommend|competitive|opportunity|ideate|brief|system|flows|wireframe|critique|iterate|mockup|hig|handoff)[[:space:]]*\|' \
  | tr -d '| ' \
  | tr -s '[:space:]' '\n' \
  | grep -v '^$' || true)

expected_order=$(printf '%s\n' "${CANONICAL_ORDER[@]}")

if [[ "$actual_order" == "$expected_order" ]]; then
  pass "STAGES table rows appear in canonical order"
else
  fail "STAGES table rows appear in canonical order" "Expected: $(printf '%s ' "${CANONICAL_ORDER[@]}") -- Got: $(echo "$actual_order" | tr '\n' ' ')"
fi

# --- Each stage has a Skill() invocation ---
for name in "${CANONICAL_ORDER[@]}"; do
  skill_line=$(grep -c "Skill(skill=\"pde:${name}\"" "$WORKFLOW" || true)
  if [[ "$skill_line" -ge 1 ]]; then
    pass "Skill(skill=\"pde:${name}\") invocation present"
  else
    fail "Skill(skill=\"pde:${name}\") invocation present" "No Skill() call found for pde:${name}"
  fi
done

# --- TOTAL = count(STAGES) definition present ---
if grep -qF 'TOTAL = count(STAGES)' "$WORKFLOW"; then
  pass "TOTAL = count(STAGES) definition present"
else
  fail "TOTAL = count(STAGES) definition present" "String 'TOTAL = count(STAGES)' not found in workflows/build.md"
fi

echo ""
echo "[commands/build.md — description lists all 13 stage names]"
echo ""

if [[ ! -r "$COMMAND" ]]; then
  fail "commands/build.md readable" "Cannot read: $COMMAND"
else
  pass "commands/build.md readable"

  for name in "${CANONICAL_ORDER[@]}"; do
    if grep -qF "$name" "$COMMAND"; then
      pass "commands/build.md description contains stage name \"$name\""
    else
      fail "commands/build.md description contains stage name \"$name\"" "Stage name absent from commands/build.md"
    fi
  done
fi

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "BUILD-01 Stages table: $total tests -- $PASS passed, $FAIL failed"

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
