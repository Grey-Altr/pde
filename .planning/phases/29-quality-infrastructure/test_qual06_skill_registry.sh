#!/usr/bin/env bash
# QUAL-06 — skill-registry.md AUD, IMP, PRT row registration test
#
# Requirement: skill-registry.md contains AUD, IMP, and PRT rows with
# correct workflow paths and status: pending. No existing rows modified.
#
# Test type: content / smoke
# Run: bash .planning/phases/29-quality-infrastructure/test_qual06_skill_registry.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TARGET="$REPO_ROOT/skill-registry.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[skill-registry.md — QUAL-06]"
echo ""

# File must be readable
if [[ ! -r "$TARGET" ]]; then
  fail "skill-registry.md readable" "Cannot read: $TARGET"
  echo "────────────────────────────────────────────────────────────"
  echo "QUAL-06 Skill registry: 1 tests — 0 passed, 1 failed"
  exit 1
fi
pass "skill-registry.md readable"

echo ""
echo "[AUD skill code registration]"

# AUD row with pending status
if grep -qF "| AUD |" "$TARGET"; then
  pass "AUD skill code row present"
else
  fail "AUD skill code row present" "Row '| AUD |' not found in skill-registry.md"
fi

if grep -qF "| AUD |" "$TARGET" && grep -F "| AUD |" "$TARGET" | grep -q "pending"; then
  pass "AUD row has status: pending"
else
  fail "AUD row has status: pending" \
    "AUD row does not contain 'pending' status"
fi

if grep -F "| AUD |" "$TARGET" | grep -q "workflows/audit.md"; then
  pass "AUD row references workflows/audit.md"
else
  fail "AUD row references workflows/audit.md" \
    "AUD row does not reference 'workflows/audit.md'"
fi

if grep -F "| AUD |" "$TARGET" | grep -q "/pde:audit"; then
  pass "AUD row has command /pde:audit"
else
  fail "AUD row has command /pde:audit" \
    "AUD row does not contain '/pde:audit'"
fi

echo ""
echo "[IMP skill code registration]"

# IMP row with pending status
if grep -qF "| IMP |" "$TARGET"; then
  pass "IMP skill code row present"
else
  fail "IMP skill code row present" "Row '| IMP |' not found in skill-registry.md"
fi

if grep -F "| IMP |" "$TARGET" | grep -q "pending"; then
  pass "IMP row has status: pending"
else
  fail "IMP row has status: pending" \
    "IMP row does not contain 'pending' status"
fi

if grep -F "| IMP |" "$TARGET" | grep -q "workflows/improve.md"; then
  pass "IMP row references workflows/improve.md"
else
  fail "IMP row references workflows/improve.md" \
    "IMP row does not reference 'workflows/improve.md'"
fi

if grep -F "| IMP |" "$TARGET" | grep -q "/pde:improve"; then
  pass "IMP row has command /pde:improve"
else
  fail "IMP row has command /pde:improve" \
    "IMP row does not contain '/pde:improve'"
fi

echo ""
echo "[PRT skill code registration]"

# PRT row with pending status
if grep -qF "| PRT |" "$TARGET"; then
  pass "PRT skill code row present"
else
  fail "PRT skill code row present" "Row '| PRT |' not found in skill-registry.md"
fi

if grep -F "| PRT |" "$TARGET" | grep -q "pending"; then
  pass "PRT row has status: pending"
else
  fail "PRT row has status: pending" \
    "PRT row does not contain 'pending' status"
fi

if grep -F "| PRT |" "$TARGET" | grep -q "workflows/pressure-test.md"; then
  pass "PRT row references workflows/pressure-test.md"
else
  fail "PRT row references workflows/pressure-test.md" \
    "PRT row does not reference 'workflows/pressure-test.md'"
fi

if grep -F "| PRT |" "$TARGET" | grep -q "/pde:pressure-test"; then
  pass "PRT row has command /pde:pressure-test"
else
  fail "PRT row has command /pde:pressure-test" \
    "PRT row does not contain '/pde:pressure-test'"
fi

echo ""
echo "[Existing active rows preserved]"

# Spot-check a sample of existing rows to ensure they were not modified
EXISTING_CODES=("BRF" "FLW" "SYS" "WFR" "MCK" "CRT" "HIG" "IDT")

for code in "${EXISTING_CODES[@]}"; do
  if grep -qF "| $code |" "$TARGET"; then
    pass "Existing row | $code | preserved"
  else
    fail "Existing row | $code | preserved" \
      "| $code | row missing — existing rows must not be modified or deleted"
  fi
done

echo ""
echo "[Total data row count — 17 expected]"

# Count pipe-delimited data rows (exclude header and separator)
# Data rows start with | and have code | command | workflow | domain | status pattern
data_row_count=$(grep -cE "^\|[[:space:]]*[A-Z]{2,3}[[:space:]]*\|" "$TARGET" || true)

if [[ "$data_row_count" -eq 17 ]]; then
  pass "skill-registry.md has exactly 17 data rows (14 original + 3 new)"
else
  fail "skill-registry.md has exactly 17 data rows" \
    "Found $data_row_count data rows — expected 17"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "QUAL-06 Skill registry: $total tests — $PASS passed, $FAIL failed"

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
