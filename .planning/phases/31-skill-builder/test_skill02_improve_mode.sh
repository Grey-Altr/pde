#!/usr/bin/env bash
# SKILL-02 — /pde:improve improve mode (additive and rewrite)
#
# Requirement: /pde:improve improve mode makes targeted enhancements to an existing
# skill without destroying working content. --rewrite flag produces a full replacement.
#
# Test type: smoke (file existence + content checks)
# Run: bash .planning/phases/31-skill-builder/test_skill02_improve_mode.sh

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[/pde:improve improve mode — SKILL-02]"
echo ""

# workflows/improve.md contains --rewrite flag handling
echo "[Rewrite flag]"
if grep -q "\-\-rewrite" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md contains --rewrite flag handling"
else
  fail "workflows/improve.md contains --rewrite flag handling" "--rewrite not found in workflows/improve.md"
fi

# workflows/improve.md contains improve mode handling
echo ""
echo "[Improve mode]"
if grep -q "improve" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md contains improve mode handling"
else
  fail "workflows/improve.md contains improve mode handling" "improve mode not found in workflows/improve.md"
fi

# additive mode logic — workflow applies additions/replacements from agent JSON
echo ""
echo "[Additive mode logic]"
if grep -qE "additions|additive" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md contains additive mode logic (additions or additive)"
else
  fail "workflows/improve.md contains additive mode logic" "additions/additive not found in workflows/improve.md"
fi

# backup logic before rewrite
echo ""
echo "[Backup logic]"
if grep -qE "\.bak|backup" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md contains backup logic (.bak or backup)"
else
  fail "workflows/improve.md contains backup logic" ".bak/backup not found in workflows/improve.md"
fi

# pde-skill-builder has IMPROVE section
echo ""
echo "[Agent IMPROVE section]"
if grep -q "IMPROVE\|Mode: IMPROVE" "$PLUGIN_ROOT/agents/pde-skill-builder.md" 2>/dev/null; then
  pass "agents/pde-skill-builder.md contains IMPROVE section"
else
  fail "agents/pde-skill-builder.md contains IMPROVE section" "IMPROVE section not found in pde-skill-builder.md"
fi

echo ""
echo "------------------------------------------------------------"
total=$((PASS + FAIL))
echo "SKILL-02 improve mode: $total tests -- $PASS passed, $FAIL failed"

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
