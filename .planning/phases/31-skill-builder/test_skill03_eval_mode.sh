#!/usr/bin/env bash
# SKILL-03 — /pde:improve eval mode
#
# Requirement: /pde:improve eval mode runs pde-design-quality-evaluator against a
# target skill and returns structured JSON scores with dimension coverage.
#
# Test type: smoke + integration (file existence + content + CLI check)
# Run: bash .planning/phases/31-skill-builder/test_skill03_eval_mode.sh

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[/pde:improve eval mode — SKILL-03]"
echo ""

# pde-design-quality-evaluator agent exists
echo "[Agent existence]"
if [[ -f "$PLUGIN_ROOT/agents/pde-design-quality-evaluator.md" ]]; then
  pass "agents/pde-design-quality-evaluator.md exists"
else
  fail "agents/pde-design-quality-evaluator.md exists" "File not found"
fi

# evaluator references skill-quality-rubric
echo ""
echo "[Evaluator references rubric]"
if grep -q "skill-quality-rubric" "$PLUGIN_ROOT/agents/pde-design-quality-evaluator.md" 2>/dev/null; then
  pass "agents/pde-design-quality-evaluator.md references skill-quality-rubric"
else
  fail "agents/pde-design-quality-evaluator.md references skill-quality-rubric" "skill-quality-rubric not found"
fi

# skill-quality-rubric reference file exists
echo ""
echo "[Rubric file]"
if [[ -f "$PLUGIN_ROOT/references/skill-quality-rubric.md" ]]; then
  pass "references/skill-quality-rubric.md exists"
else
  fail "references/skill-quality-rubric.md exists" "File not found"
fi

# rubric has overall_score field
if grep -q "overall_score" "$PLUGIN_ROOT/references/skill-quality-rubric.md" 2>/dev/null; then
  pass "skill-quality-rubric.md contains overall_score"
else
  fail "skill-quality-rubric.md contains overall_score" "overall_score not found in rubric"
fi

# rubric has dimensions field
if grep -q "dimensions" "$PLUGIN_ROOT/references/skill-quality-rubric.md" 2>/dev/null; then
  pass "skill-quality-rubric.md contains dimensions"
else
  fail "skill-quality-rubric.md contains dimensions" "dimensions not found in rubric"
fi

# workflows/improve.md has eval mode handling
echo ""
echo "[Workflow eval mode]"
if grep -q "eval" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md contains eval mode handling"
else
  fail "workflows/improve.md contains eval mode handling" "eval mode not found in workflows/improve.md"
fi

# pde-design-quality-evaluator is registered in model-profiles
echo ""
echo "[Model profile registration]"
if node "${PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-design-quality-evaluator --raw 2>/dev/null | grep -qE "sonnet|opus|haiku"; then
  pass "pde-design-quality-evaluator is registered in model-profiles"
else
  fail "pde-design-quality-evaluator is registered in model-profiles" "resolve-model did not return a model name"
fi

echo ""
echo "------------------------------------------------------------"
total=$((PASS + FAIL))
echo "SKILL-03 eval mode: $total tests -- $PASS passed, $FAIL failed"

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
