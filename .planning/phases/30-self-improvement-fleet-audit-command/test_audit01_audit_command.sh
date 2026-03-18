#!/usr/bin/env bash
# AUDIT-01 — /pde:audit command and workflow existence
#
# Requirement: /pde:audit produces .planning/audit-report.md with severity-rated
# findings across commands, agents, templates, references, and agent prompts.
#
# Test type: smoke (file existence + content checks)
# Run: bash .planning/phases/30-self-improvement-fleet-audit-command/test_audit01_audit_command.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[/pde:audit command — AUDIT-01]"
echo ""

# Command file exists
echo "[Command invoker]"
if [[ -f "$REPO_ROOT/commands/audit.md" ]]; then
  pass "commands/audit.md exists"
else
  fail "commands/audit.md exists" "File not found"
fi

# Frontmatter has pde:audit name
if grep -q "pde:audit" "$REPO_ROOT/commands/audit.md" 2>/dev/null; then
  pass "command name is pde:audit"
else
  fail "command name is pde:audit" "pde:audit not found in frontmatter"
fi

# References workflow
if grep -q "workflows/audit.md" "$REPO_ROOT/commands/audit.md" 2>/dev/null; then
  pass "command references workflows/audit.md"
else
  fail "command references workflows/audit.md" "workflow reference not found"
fi

# Task tool in allowed-tools
if grep -q "Task" "$REPO_ROOT/commands/audit.md" 2>/dev/null; then
  pass "Task tool in allowed-tools"
else
  fail "Task tool in allowed-tools" "Task not found in allowed-tools"
fi

echo ""
echo "[Workflow file]"

# Workflow file exists
if [[ -f "$REPO_ROOT/workflows/audit.md" ]]; then
  pass "workflows/audit.md exists"
else
  fail "workflows/audit.md exists" "File not found"
fi

# Workflow has <purpose> section
if grep -q "<purpose>" "$REPO_ROOT/workflows/audit.md" 2>/dev/null; then
  pass "workflow has <purpose> section"
else
  fail "workflow has <purpose> section" "<purpose> not found"
fi

# Workflow has <process> section
if grep -q "<process>" "$REPO_ROOT/workflows/audit.md" 2>/dev/null; then
  pass "workflow has <process> section"
else
  fail "workflow has <process> section" "<process> not found"
fi

# Workflow references all three agents
for agent in "pde-quality-auditor" "pde-skill-improver" "pde-skill-validator"; do
  if grep -q "$agent" "$REPO_ROOT/workflows/audit.md" 2>/dev/null; then
    pass "workflow references $agent"
  else
    fail "workflow references $agent" "$agent not found in workflow"
  fi
done

# Workflow has severity levels
for severity in "CRITICAL" "HIGH" "MEDIUM" "LOW"; do
  if grep -q "$severity" "$REPO_ROOT/workflows/audit.md" 2>/dev/null; then
    pass "workflow references $severity severity"
  else
    fail "workflow references $severity severity" "$severity not found"
  fi
done

# Workflow outputs to .planning/audit-report.md
if grep -q "audit-report.md" "$REPO_ROOT/workflows/audit.md" 2>/dev/null; then
  pass "workflow writes to .planning/audit-report.md"
else
  fail "workflow writes to .planning/audit-report.md" "audit-report.md not found"
fi

echo ""
echo "------------------------------------------------------------"
total=$((PASS + FAIL))
echo "AUDIT-01 audit command: $total tests -- $PASS passed, $FAIL failed"

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
