#!/usr/bin/env bash
# SKILL-04 — Validation gate in /pde:improve workflow
#
# Requirement: /pde:improve runs validate-skill after create/improve and enters a
# retry cycle if the output fails validation. Rejects if max cycles exceeded.
#
# Test type: integration (workflow content + CLI check)
# Run: bash .planning/phases/31-skill-builder/test_skill04_validation_gate.sh

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[/pde:improve validation gate — SKILL-04]"
echo ""

# workflows/improve.md calls validate-skill
echo "[validate-skill gate call]"
if grep -q "validate-skill" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md calls validate-skill"
else
  fail "workflows/improve.md calls validate-skill" "validate-skill not found in workflows/improve.md"
fi

# workflows/improve.md has retry/cycle logic
echo ""
echo "[Retry/cycle logic]"
if grep -qiE "CYCLE|cycle|retry|MAX_CYCLES" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md contains retry/cycle logic"
else
  fail "workflows/improve.md contains retry/cycle logic" "CYCLE/retry/MAX_CYCLES not found in workflows/improve.md"
fi

# workflows/improve.md has rejection path
echo ""
echo "[Rejection path]"
if grep -qiE "reject|FAIL|failed validation" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md contains rejection path"
else
  fail "workflows/improve.md contains rejection path" "reject/FAIL/failed validation not found in workflows/improve.md"
fi

# validate-skill CLI is available
echo ""
echo "[validate-skill CLI availability]"
if node "${PLUGIN_ROOT}/bin/pde-tools.cjs" validate-skill --help 2>/dev/null | grep -qiE "validate|skill\|usage\|options" || \
   node "${PLUGIN_ROOT}/bin/pde-tools.cjs" validate-skill 2>&1 | grep -qiE "validate|skill|path|required"; then
  pass "validate-skill CLI is available in pde-tools.cjs"
else
  # Fallback: check if validate-skill case exists in the source
  if grep -q "validate-skill" "${PLUGIN_ROOT}/bin/pde-tools.cjs" 2>/dev/null; then
    pass "validate-skill CLI handler exists in pde-tools.cjs (source check)"
  else
    fail "validate-skill CLI is available in pde-tools.cjs" "validate-skill not found in pde-tools.cjs"
  fi
fi

echo ""
echo "------------------------------------------------------------"
total=$((PASS + FAIL))
echo "SKILL-04 validation gate: $total tests -- $PASS passed, $FAIL failed"

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
