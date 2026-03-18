#!/usr/bin/env bash
# AUDIT-02 + AUDIT-10 + AUDIT-12 — Auditor agent definition
#
# Requirement: pde-quality-auditor.md exists in agents/ with read-only constraint,
# quality rubric reference, agent prompt evaluation (AUDIT-12), and missing
# reference identification (AUDIT-10).
#
# Test type: smoke + content
# Run: bash .planning/phases/30-self-improvement-fleet-audit-command/test_audit02_auditor_agent.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[pde-quality-auditor.md — AUDIT-02, AUDIT-10, AUDIT-12]"
echo ""

AGENT="$REPO_ROOT/agents/pde-quality-auditor.md"

# Agent file exists
echo "[File existence]"
if [[ -f "$AGENT" ]]; then
  pass "agents/pde-quality-auditor.md exists"
else
  fail "agents/pde-quality-auditor.md exists" "File not found"
  echo "------------------------------------------------------------"
  echo "AUDIT-02 auditor agent: 1 tests -- 0 passed, 1 failed"
  exit 1
fi

echo ""
echo "[AUDIT-02: Read-only constraint]"

if grep -qi "READ-ONLY" "$AGENT"; then
  pass "READ-ONLY constraint present"
else
  fail "READ-ONLY constraint present" "READ-ONLY not found"
fi

if grep -q "quality-standards.md" "$AGENT"; then
  pass "references quality-standards.md"
else
  fail "references quality-standards.md" "quality-standards.md not found"
fi

if grep -q "tooling-patterns.md" "$AGENT"; then
  pass "references tooling-patterns.md"
else
  fail "references tooling-patterns.md" "tooling-patterns.md not found"
fi

echo ""
echo "[AUDIT-02: Return format]"

if grep -q "findings" "$AGENT" && grep -q "summary" "$AGENT" && grep -q "scores" "$AGENT"; then
  pass "return format includes findings, summary, scores"
else
  fail "return format includes findings, summary, scores" "Missing one or more return fields"
fi

echo ""
echo "[AUDIT-10: Missing reference identification]"

if grep -q "missing_references" "$AGENT"; then
  pass "return format includes missing_references (AUDIT-10)"
else
  fail "return format includes missing_references (AUDIT-10)" "missing_references not found"
fi

echo ""
echo "[AUDIT-12: Agent prompt quality evaluation]"

if grep -qi "agent.*prompt\|prompt.*quality\|AUDIT-12" "$AGENT"; then
  pass "agent prompt quality evaluation documented (AUDIT-12)"
else
  fail "agent prompt quality evaluation documented (AUDIT-12)" "No agent prompt evaluation section found"
fi

# Circular self-evaluation prevention
if grep -q "pde-quality-auditor.md" "$AGENT" && grep -qi "skip\|except\|exclude\|circular" "$AGENT"; then
  pass "circular self-evaluation prevention present"
else
  fail "circular self-evaluation prevention present" "No skip/exclude clause for self-evaluation"
fi

echo ""
echo "[Scan scope]"

for category in "commands" "workflows" "agents" "templates" "references"; do
  if grep -q "$category" "$AGENT"; then
    pass "scan scope includes $category"
  else
    fail "scan scope includes $category" "$category not found in scan scope"
  fi
done

echo ""
echo "------------------------------------------------------------"
total=$((PASS + FAIL))
echo "AUDIT-02/10/12 auditor agent: $total tests -- $PASS passed, $FAIL failed"

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
