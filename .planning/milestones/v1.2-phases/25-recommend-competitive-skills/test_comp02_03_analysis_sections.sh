#!/usr/bin/env bash
# COMP-02 + COMP-03 (partial) — Competitive workflow analysis sections test
#
# Requirement (COMP-02): workflows/competitive.md contains "feature comparison matrix"
# or equivalent section; contains "positioning map" section; contains confidence
# label framework (confirmed/inferred/unverified).
#
# Requirement (COMP-03 partial / structural): workflows/competitive.md contains
# "Opportunity Highlights" section with required sub-fields
# (Source, Estimated reach, Competitive advantage).
#
# Test type: structural / smoke
# Run: bash .planning/phases/25-recommend-competitive-skills/test_comp02_03_analysis_sections.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WF_FILE="$REPO_ROOT/workflows/competitive.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 — $2"); }

echo ""
echo "[workflows/competitive.md — file readable]"

if [[ ! -r "$WF_FILE" ]]; then
  fail "workflows/competitive.md — file readable" "Cannot read: $WF_FILE"
  echo "────────────────────────────────────────────────────────────"
  echo "COMP-02+03 Analysis sections: 1 tests — 0 passed, 1 failed"
  exit 1
fi
pass "workflows/competitive.md — file readable"

# ── COMP-02: Feature comparison matrix ───────────────────────────────────────
echo ""
echo "[COMP-02 — Feature comparison matrix]"

if grep -qiE "feature comparison matrix|## Feature Comparison" "$WF_FILE"; then
  pass "workflows/competitive.md — contains feature comparison matrix section"
else
  fail "workflows/competitive.md — contains feature comparison matrix section" \
    "No 'feature comparison matrix' or '## Feature Comparison' found"
fi

# Matrix cells must reference per-cell confidence labels
if grep -qiE "per.cell|each cell|cell.*confidence|confidence.*cell" "$WF_FILE"; then
  pass "workflows/competitive.md — feature matrix specifies per-cell confidence labels"
else
  # Alternative: check for the exact cell format example shown in the spec
  if grep -qF "full [confirmed]" "$WF_FILE" || grep -qF '"full [confirmed]"' "$WF_FILE" || \
     grep -qE "\`full \[confirmed\]\`" "$WF_FILE"; then
    pass "workflows/competitive.md — feature matrix shows cell confidence label examples"
  else
    fail "workflows/competitive.md — feature matrix specifies per-cell confidence labels" \
      "No per-cell confidence label instruction found near feature comparison matrix"
  fi
fi

# ── COMP-02: Positioning map ──────────────────────────────────────────────────
echo ""
echo "[COMP-02 — Positioning map]"

if grep -qiE "positioning map|## Positioning" "$WF_FILE"; then
  pass "workflows/competitive.md — contains positioning map section"
else
  fail "workflows/competitive.md — contains positioning map section" \
    "No 'positioning map' or '## Positioning' found"
fi

# SVG map must be mentioned (the implementation uses inline SVG)
if grep -qiF "SVG" "$WF_FILE" || grep -qiF "svg" "$WF_FILE"; then
  pass "workflows/competitive.md — positioning map uses SVG format"
else
  fail "workflows/competitive.md — positioning map uses SVG format" \
    "No SVG reference found in file"
fi

# ── COMP-02: Confidence label framework ──────────────────────────────────────
echo ""
echo "[COMP-02 — Confidence label framework]"

if grep -qF "[confirmed]" "$WF_FILE"; then
  pass "workflows/competitive.md — confidence label [confirmed] defined"
else
  fail "workflows/competitive.md — confidence label [confirmed] defined" \
    "[confirmed] not found in file"
fi

if grep -qF "[inferred]" "$WF_FILE"; then
  pass "workflows/competitive.md — confidence label [inferred] defined"
else
  fail "workflows/competitive.md — confidence label [inferred] defined" \
    "[inferred] not found in file"
fi

if grep -qF "[unverified]" "$WF_FILE"; then
  pass "workflows/competitive.md — confidence label [unverified] defined"
else
  fail "workflows/competitive.md — confidence label [unverified] defined" \
    "[unverified] not found in file"
fi

# Labels must be formally defined (not just mentioned in passing)
if grep -qE "\[confirmed\].*verified|verified.*\[confirmed\]|directly verified" "$WF_FILE"; then
  pass "workflows/competitive.md — [confirmed] label has a definition"
else
  fail "workflows/competitive.md — [confirmed] label has a definition" \
    "No definition sentence found for [confirmed] label"
fi

# ── COMP-03 (structural): Opportunity Highlights section ──────────────────────
echo ""
echo "[COMP-03 (structural) — Opportunity Highlights section]"

if grep -qF "## Opportunity Highlights" "$WF_FILE"; then
  pass "workflows/competitive.md — contains '## Opportunity Highlights' section"
else
  fail "workflows/competitive.md — contains '## Opportunity Highlights' section" \
    "No '## Opportunity Highlights' heading found"
fi

# Required sub-fields: Source, Estimated reach, Competitive advantage
if grep -qF "Source:" "$WF_FILE"; then
  pass "workflows/competitive.md — Opportunity Highlights contains 'Source:' sub-field"
else
  fail "workflows/competitive.md — Opportunity Highlights contains 'Source:' sub-field" \
    "No 'Source:' sub-field found in file"
fi

if grep -qF "Estimated reach:" "$WF_FILE"; then
  pass "workflows/competitive.md — Opportunity Highlights contains 'Estimated reach:' sub-field"
else
  fail "workflows/competitive.md — Opportunity Highlights contains 'Estimated reach:' sub-field" \
    "No 'Estimated reach:' sub-field found in file"
fi

if grep -qF "Competitive advantage:" "$WF_FILE"; then
  pass "workflows/competitive.md — Opportunity Highlights contains 'Competitive advantage:' sub-field"
else
  fail "workflows/competitive.md — Opportunity Highlights contains 'Competitive advantage:' sub-field" \
    "No 'Competitive advantage:' sub-field found in file"
fi

# The section must be the machine-readable contract (not prose)
if grep -qiE "machine.readable|/pde:opportunity.*parse|parses.*section|downstream contract" "$WF_FILE"; then
  pass "workflows/competitive.md — Opportunity Highlights is marked as machine-readable contract"
else
  fail "workflows/competitive.md — Opportunity Highlights is marked as machine-readable contract" \
    "No machine-readable or downstream contract language found near Opportunity Highlights"
fi

# Anti-pattern guard: prose alternative MUST be forbidden
if grep -qiE "NEVER write.*prose|not prose|Do NOT write.*prose|prose.*forbidden" "$WF_FILE"; then
  pass "workflows/competitive.md — Opportunity Highlights forbids prose format"
else
  fail "workflows/competitive.md — Opportunity Highlights forbids prose format" \
    "No 'NEVER write.*prose' or equivalent anti-pattern guard found"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "COMP-02+03 Analysis sections: $total tests — $PASS passed, $FAIL failed"

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
