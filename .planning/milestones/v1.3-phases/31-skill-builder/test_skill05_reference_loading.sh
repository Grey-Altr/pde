#!/usr/bin/env bash
# SKILL-05 — Reference loading in pde-skill-builder agent
#
# Requirement: pde-skill-builder agent loads skill-style-guide.md and
# tooling-patterns.md via required_reading before generating skill content.
#
# Test type: content (agent file content checks + dependency existence)
# Run: bash .planning/phases/31-skill-builder/test_skill05_reference_loading.sh

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[pde-skill-builder reference loading — SKILL-05]"
echo ""

# pde-skill-builder has skill-style-guide.md in required reading
echo "[Required Reading references]"
if grep -q "skill-style-guide.md" "$PLUGIN_ROOT/agents/pde-skill-builder.md" 2>/dev/null; then
  pass "agents/pde-skill-builder.md references skill-style-guide.md"
else
  fail "agents/pde-skill-builder.md references skill-style-guide.md" "skill-style-guide.md not found in pde-skill-builder.md"
fi

# pde-skill-builder has tooling-patterns.md in required reading
if grep -q "tooling-patterns.md" "$PLUGIN_ROOT/agents/pde-skill-builder.md" 2>/dev/null; then
  pass "agents/pde-skill-builder.md references tooling-patterns.md"
else
  fail "agents/pde-skill-builder.md references tooling-patterns.md" "tooling-patterns.md not found in pde-skill-builder.md"
fi

# pde-skill-builder has required_reading or Required Reading section
if grep -qiE "required_reading|Required Reading" "$PLUGIN_ROOT/agents/pde-skill-builder.md" 2>/dev/null; then
  pass "agents/pde-skill-builder.md has required_reading / Required Reading section"
else
  fail "agents/pde-skill-builder.md has required_reading / Required Reading section" "required_reading section not found"
fi

# Reference files exist (dependencies)
echo ""
echo "[Reference file existence]"
if [[ -f "$PLUGIN_ROOT/references/skill-style-guide.md" ]]; then
  pass "references/skill-style-guide.md exists"
else
  fail "references/skill-style-guide.md exists" "File not found"
fi

if [[ -f "$PLUGIN_ROOT/references/tooling-patterns.md" ]]; then
  pass "references/tooling-patterns.md exists"
else
  fail "references/tooling-patterns.md exists" "File not found"
fi

echo ""
echo "------------------------------------------------------------"
total=$((PASS + FAIL))
echo "SKILL-05 reference loading: $total tests -- $PASS passed, $FAIL failed"

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
