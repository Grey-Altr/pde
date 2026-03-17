#!/usr/bin/env bash
# IDEAT-02 — Converge pass 0-3 scoring rubric + recommended direction structural test
#
# Requirement: workflows/ideate.md converge pass contains 0-3 scoring rubric with
# Goal Alignment, Feasibility, Distinctiveness dimensions; contains "recommended
# direction" output.
#
# Test type: structural / smoke
# Run: bash .planning/phases/27-ideation-skill-brief-update/test_ideat02_converge_scoring_rubric.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

WORKFLOW_FILE="$REPO_ROOT/workflows/ideate.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo ""
echo "[workflows/ideate.md — converge 0-3 scoring rubric]"

if [[ ! -r "$WORKFLOW_FILE" ]]; then
  fail "workflows/ideate.md exists and is readable" "Cannot read: $WORKFLOW_FILE"
  echo ""
  echo "────────────────────────────────────────────────────────────"
  echo "IDEAT-02 Converge scoring rubric: 1 tests -- 0 passed, 1 failed"
  exit 1
fi
pass "workflows/ideate.md exists and is readable"

# ── Three scoring dimensions ──────────────────────────────────────────────────

DIMENSIONS=("Goal Alignment" "Feasibility" "Distinctiveness")

for dim in "${DIMENSIONS[@]}"; do
  if grep -qiF "$dim" "$WORKFLOW_FILE"; then
    pass "converge rubric contains dimension: $dim"
  else
    fail "converge rubric contains dimension: $dim" "Pattern '$dim' not found in $WORKFLOW_FILE"
  fi
done

# ── 0-3 scale present ─────────────────────────────────────────────────────────

# The rubric table headers must contain 0, 1, 2, 3 columns — look for the table
# by checking for a line that has all four numeric columns in a markdown table row
if grep -qE '\| *0 *\| *1 *\| *2 *\| *3 *\|' "$WORKFLOW_FILE"; then
  pass "converge rubric has 0-3 scale columns in scoring table"
else
  fail "converge rubric has 0-3 scale columns in scoring table" "No table row matching '| 0 | 1 | 2 | 3 |' pattern found"
fi

# ── 0-3 numeric scores present in total column header (confirms /9 max) ───────

if grep -qiE 'Total.*\(/9\)|/9\)' "$WORKFLOW_FILE"; then
  pass "converge scoring table has Total (/9) column confirming 0-3 per dimension"
else
  fail "converge scoring table has Total (/9) column confirming 0-3 per dimension" "No 'Total (/9)' pattern found"
fi

# ── Recommended Direction output ─────────────────────────────────────────────

echo ""
echo "[workflows/ideate.md — recommended direction output]"

if grep -qiE '## Recommended Direction' "$WORKFLOW_FILE"; then
  pass "converge pass contains '## Recommended Direction' heading"
else
  fail "converge pass contains '## Recommended Direction' heading" "Pattern '## Recommended Direction' not found"
fi

# Rationale field present in recommended direction output block
if grep -qiE '\*\*Rationale:\*\*' "$WORKFLOW_FILE"; then
  pass "recommended direction block has Rationale field"
else
  fail "recommended direction block has Rationale field" "No '**Rationale:**' pattern found"
fi

# Feasibility Note field (from recommend checkpoint)
if grep -qiE '\*\*Feasibility Note:\*\*' "$WORKFLOW_FILE"; then
  pass "recommended direction block has Feasibility Note field"
else
  fail "recommended direction block has Feasibility Note field" "No '**Feasibility Note:**' pattern found"
fi

# ── Scoring table format ──────────────────────────────────────────────────────

echo ""
echo "[workflows/ideate.md — converge scoring table format]"

# Converge Phase heading
if grep -qiE '## Converge Phase' "$WORKFLOW_FILE"; then
  pass "converge pass has '## Converge Phase' section heading"
else
  fail "converge pass has '## Converge Phase' section heading" "No '## Converge Phase' heading found"
fi

# Scoring table has Recommended column
if grep -qiE 'Recommended' "$WORKFLOW_FILE"; then
  pass "converge scoring table has Recommended column marker"
else
  fail "converge scoring table has Recommended column marker" "No 'Recommended' column found"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "IDEAT-02 Converge scoring rubric: $total tests -- $PASS passed, $FAIL failed"

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
