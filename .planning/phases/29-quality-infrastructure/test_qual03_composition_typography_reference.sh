#!/usr/bin/env bash
# QUAL-03 — Composition and typography reference content test
#
# Requirement: references/composition-typography.md exists with named grid systems,
# APCA |Lc| thresholds documented with absolute value notation, type pairing rationale,
# and spatial asymmetry principles.
#
# Test type: content / smoke
# Run: bash .planning/phases/29-quality-infrastructure/test_qual03_composition_typography_reference.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TARGET="$REPO_ROOT/references/composition-typography.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[references/composition-typography.md — QUAL-03]"
echo ""

# File must be readable
if [[ ! -r "$TARGET" ]]; then
  fail "references/composition-typography.md readable" "Cannot read: $TARGET"
  echo "────────────────────────────────────────────────────────────"
  echo "QUAL-03 Composition/typography reference: 1 tests — 0 passed, 1 failed"
  exit 1
fi
pass "references/composition-typography.md readable"

echo ""
echo "[APCA contrast thresholds]"

# APCA present
if grep -qF "APCA" "$TARGET"; then
  pass "APCA contrast thresholds section present"
else
  fail "APCA contrast thresholds section present" "String 'APCA' not found"
fi

# |Lc| absolute value notation (prevents polarity confusion)
if grep -qF "|Lc|" "$TARGET"; then
  pass "APCA |Lc| absolute value notation used"
else
  fail "APCA |Lc| absolute value notation used" \
    "String '|Lc|' not found — APCA values must use absolute value notation"
fi

# Body text threshold documented (>= 75)
if grep -qE "75|90" "$TARGET"; then
  pass "APCA body text Lc threshold (75/90) documented"
else
  fail "APCA body text Lc threshold (75/90) documented" \
    "Neither 75 nor 90 found — expected body text Lc minimum"
fi

# Large headline threshold (>= 45)
if grep -qE "45" "$TARGET"; then
  pass "APCA large headline Lc threshold (45) documented"
else
  fail "APCA large headline Lc threshold (45) documented" \
    "Value 45 not found — expected headline Lc minimum"
fi

echo ""
echo "[Named grid systems]"

# At minimum: 12-column, modular, golden ratio, rule of thirds, asymmetric
for grid in "12-column" "Modular" "Golden ratio" "Rule of thirds" "Asymmetric"; do
  if grep -qi "$grid" "$TARGET"; then
    pass "Named grid system '$grid' documented"
  else
    fail "Named grid system '$grid' documented" \
      "Grid system name '$grid' not found"
  fi
done

echo ""
echo "[Spatial asymmetry]"

# Spatial asymmetry section present
if grep -qi "asymmetr" "$TARGET"; then
  pass "Spatial asymmetry principles present"
else
  fail "Spatial asymmetry principles present" \
    "Word 'asymmetr...' not found in file"
fi

# Intentional vs accidental asymmetry distinction
if grep -qi "intentional" "$TARGET" && grep -qi "accidental" "$TARGET"; then
  pass "Intentional vs accidental asymmetry distinction present"
else
  fail "Intentional vs accidental asymmetry distinction present" \
    "Both 'intentional' and 'accidental' must appear in file"
fi

echo ""
echo "[Type pairing]"

# Type pairing section
if grep -qi "type pairing\|type.*pairing\|pairing.*type" "$TARGET"; then
  pass "Type pairing section present"
else
  fail "Type pairing section present" \
    "Type pairing content not found"
fi

# Classification contrast (not just size) — the key requirement
if grep -qi "classification\|structural contrast\|category contrast" "$TARGET"; then
  pass "Type pairing uses classification/structural contrast (not just size)"
else
  fail "Type pairing uses classification/structural contrast (not just size)" \
    "No classification or structural contrast language found in type pairing section"
fi

# Size contrast alone is NOT sufficient — explicitly called out
if grep -qi "size.*not\|not.*size\|size alone\|size is not" "$TARGET"; then
  pass "Explicit note that size difference alone is not a valid type pairing"
else
  fail "Explicit note that size difference alone is not a valid type pairing" \
    "No explicit disqualification of size-only pairings found"
fi

echo ""
echo "[Reference file anatomy]"

# Header block required fields
for field in "Version:" "Scope:" "Ownership:" "Boundary:"; do
  if grep -q "$field" "$TARGET"; then
    pass "Header block contains $field"
  else
    fail "Header block contains $field" "'$field' not found"
  fi
done

# Citations section
if grep -qiE "## Citations|Citations" "$TARGET"; then
  pass "Citations section present"
else
  fail "Citations section present" "No Citations section heading found"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "QUAL-03 Composition/typography reference: $total tests — $PASS passed, $FAIL failed"

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
