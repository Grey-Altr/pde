#!/usr/bin/env bash
# SKILL-01 — /pde:improve create mode infrastructure
#
# Requirement: /pde:improve create mode produces a complete, valid skill workflow
# file at the specified output path. Requires commands/improve.md, workflows/improve.md,
# and pde-skill-builder agent to exist.
#
# Test type: smoke (file existence + content checks)
# Run: bash .planning/phases/31-skill-builder/test_skill01_create_mode.sh

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[/pde:improve create mode — SKILL-01]"
echo ""

# Command file exists
echo "[Command invoker]"
if [[ -f "$PLUGIN_ROOT/commands/improve.md" ]]; then
  pass "commands/improve.md exists"
else
  fail "commands/improve.md exists" "File not found"
fi

# Workflow file exists
echo ""
echo "[Workflow file]"
if [[ -f "$PLUGIN_ROOT/workflows/improve.md" ]]; then
  pass "workflows/improve.md exists"
else
  fail "workflows/improve.md exists" "File not found"
fi

# Agent files exist
echo ""
echo "[Agent files]"
if [[ -f "$PLUGIN_ROOT/agents/pde-skill-builder.md" ]]; then
  pass "agents/pde-skill-builder.md exists"
else
  fail "agents/pde-skill-builder.md exists" "File not found"
fi

if [[ -f "$PLUGIN_ROOT/agents/pde-design-quality-evaluator.md" ]]; then
  pass "agents/pde-design-quality-evaluator.md exists"
else
  fail "agents/pde-design-quality-evaluator.md exists" "File not found"
fi

# Skill registry has IMP code
echo ""
echo "[Skill registry]"
if grep -q "IMP" "$PLUGIN_ROOT/skill-registry.md" 2>/dev/null; then
  pass "skill-registry.md contains IMP code"
else
  fail "skill-registry.md contains IMP code" "IMP not found in skill-registry.md"
fi

# IMP row points to workflows/improve.md
if grep -q "IMP.*workflows/improve.md\|workflows/improve.md.*IMP" "$PLUGIN_ROOT/skill-registry.md" 2>/dev/null; then
  pass "skill-registry.md IMP row references workflows/improve.md"
else
  fail "skill-registry.md IMP row references workflows/improve.md" "IMP + workflows/improve.md link not found"
fi

# commands/improve.md frontmatter
echo ""
echo "[Command frontmatter]"
if grep -q "pde:improve" "$PLUGIN_ROOT/commands/improve.md" 2>/dev/null; then
  pass "command name is pde:improve"
else
  fail "command name is pde:improve" "pde:improve not found in commands/improve.md"
fi

if grep -q "Task" "$PLUGIN_ROOT/commands/improve.md" 2>/dev/null; then
  pass "Task tool in allowed-tools"
else
  fail "Task tool in allowed-tools" "Task not found in commands/improve.md"
fi

# workflows/improve.md has create mode handling
echo ""
echo "[Workflow create mode]"
if grep -q "create" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md contains create mode handling"
else
  fail "workflows/improve.md contains create mode handling" "create mode not found in workflows/improve.md"
fi

echo ""
echo "------------------------------------------------------------"
total=$((PASS + FAIL))
echo "SKILL-01 create mode: $total tests -- $PASS passed, $FAIL failed"

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
