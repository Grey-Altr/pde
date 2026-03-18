#!/usr/bin/env bash
# QUAL-01 — Awwwards 4-dimension quality rubric content test
#
# Requirement: references/quality-standards.md exists with Design 40%, Usability 30%,
# Creativity 20%, Content 10%, score levels 1-10, SOTD >= 8.0, HM >= 6.5 award thresholds,
# and inferred criteria explicitly labeled as inferred.
#
# Test type: content / smoke
# Run: bash .planning/phases/29-quality-infrastructure/test_qual01_quality_standards_rubric.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TARGET="$REPO_ROOT/references/quality-standards.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[references/quality-standards.md — QUAL-01]"
echo ""

# File must be readable
if [[ ! -r "$TARGET" ]]; then
  fail "references/quality-standards.md readable" "Cannot read: $TARGET"
  echo "────────────────────────────────────────────────────────────"
  echo "QUAL-01 Quality standards rubric: 1 tests — 0 passed, 1 failed"
  exit 1
fi
pass "references/quality-standards.md readable"

echo ""
echo "[Dimension weights]"

# Each of the 4 dimensions with correct weights
if grep -qE "Design[[:space:]]*\|[[:space:]]*40%" "$TARGET"; then
  pass "Design dimension has 40% weight"
else
  fail "Design dimension has 40% weight" "Pattern 'Design | 40%' not found"
fi

if grep -qE "Usability[[:space:]]*\|[[:space:]]*30%" "$TARGET"; then
  pass "Usability dimension has 30% weight"
else
  fail "Usability dimension has 30% weight" "Pattern 'Usability | 30%' not found"
fi

if grep -qE "Creativity[[:space:]]*\|[[:space:]]*20%" "$TARGET"; then
  pass "Creativity dimension has 20% weight"
else
  fail "Creativity dimension has 20% weight" "Pattern 'Creativity | 20%' not found"
fi

if grep -qE "Content[[:space:]]*\|[[:space:]]*10%" "$TARGET"; then
  pass "Content dimension has 10% weight"
else
  fail "Content dimension has 10% weight" "Pattern 'Content | 10%' not found"
fi

echo ""
echo "[Award thresholds]"

# SOTD threshold >= 8.0
if grep -qE "SOTD" "$TARGET" && grep -qE "8\.0" "$TARGET"; then
  pass "SOTD award threshold 8.0 documented"
else
  fail "SOTD award threshold 8.0 documented" "SOTD or 8.0 not found in file"
fi

# Honorable Mention threshold >= 6.5
if grep -qE "Honorable Mention" "$TARGET" && grep -qE "6\.5" "$TARGET"; then
  pass "Honorable Mention threshold 6.5 documented"
else
  fail "Honorable Mention threshold 6.5 documented" "Honorable Mention or 6.5 not found in file"
fi

echo ""
echo "[Score bands — 1-10 scale]"

# Score bands must cover the full 1-10 range: check for low and high ends
if grep -qE "9\.0|9\.0.10\.0" "$TARGET"; then
  pass "SOTD Elite score band (9.0+) present"
else
  fail "SOTD Elite score band (9.0+) present" "Score range 9.0 not found"
fi

if grep -qE "1\.0.2\.9|Poor" "$TARGET"; then
  pass "Poor score band (1.0-2.9) present"
else
  fail "Poor score band (1.0-2.9) present" "Score range 1.0-2.9 or 'Poor' not found"
fi

# Middle bands must be present
if grep -qE "5\.0.6\.4|Professional" "$TARGET"; then
  pass "Professional score band (5.0-6.4) present"
else
  fail "Professional score band (5.0-6.4) present" "Score range 5.0-6.4 or 'Professional' not found"
fi

if grep -qE "3\.0.4\.9|Functional" "$TARGET"; then
  pass "Functional score band (3.0-4.9) present"
else
  fail "Functional score band (3.0-4.9) present" "Score range 3.0-4.9 or 'Functional' not found"
fi

echo ""
echo "[Inferred criteria labeling]"

# Inferred criteria must be explicitly labeled as inferred
if grep -qi "inferred" "$TARGET"; then
  pass "Inferred criteria labeled as inferred"
else
  fail "Inferred criteria labeled as inferred" "Word 'inferred' not found in file"
fi

# Must clarify it is NOT published by Awwwards
if grep -qiE "not published|NOT published" "$TARGET"; then
  pass "Inferred criteria labeled as NOT published by Awwwards"
else
  fail "Inferred criteria labeled as NOT published by Awwwards" "Phrase 'NOT published' or 'not published' not found"
fi

echo ""
echo "[Reference file anatomy]"

# Header block required fields
if grep -q "Version:" "$TARGET"; then
  pass "Header block contains Version field"
else
  fail "Header block contains Version field" "'Version:' not found"
fi

if grep -q "Scope:" "$TARGET"; then
  pass "Header block contains Scope field"
else
  fail "Header block contains Scope field" "'Scope:' not found"
fi

if grep -q "Ownership:" "$TARGET"; then
  pass "Header block contains Ownership field"
else
  fail "Header block contains Ownership field" "'Ownership:' not found"
fi

if grep -q "Boundary:" "$TARGET"; then
  pass "Header block contains Boundary field"
else
  fail "Header block contains Boundary field" "'Boundary:' not found"
fi

# Citations section
if grep -qiE "## Citations|Citations" "$TARGET"; then
  pass "Citations section present"
else
  fail "Citations section present" "No Citations section heading found"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "QUAL-01 Quality standards rubric: $total tests — $PASS passed, $FAIL failed"

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
