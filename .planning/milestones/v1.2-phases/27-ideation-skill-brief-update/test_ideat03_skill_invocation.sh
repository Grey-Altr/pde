#!/usr/bin/env bash
# IDEAT-03 — Skill("pde:recommend") invocation structural test
#
# Requirement: workflows/ideate.md contains Skill("pde:recommend") call at the
# diverge-converge checkpoint, and explicitly guards against Task() invocation.
#
# Note: Runtime behavior (actual recommend execution) is manual-only.
# This test covers the verifiable structural portion of IDEAT-03.
#
# Test type: structural / smoke
# Run: bash .planning/phases/27-ideation-skill-brief-update/test_ideat03_skill_invocation.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

WORKFLOW_FILE="$REPO_ROOT/workflows/ideate.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo ""
echo "[workflows/ideate.md — Skill() pde:recommend invocation]"

if [[ ! -r "$WORKFLOW_FILE" ]]; then
  fail "workflows/ideate.md exists and is readable" "Cannot read: $WORKFLOW_FILE"
  echo ""
  echo "────────────────────────────────────────────────────────────"
  echo "IDEAT-03 Skill() invocation: 1 tests -- 0 passed, 1 failed"
  exit 1
fi
pass "workflows/ideate.md exists and is readable"

# Skill("pde:recommend") call present
if grep -qiF 'Skill("pde:recommend"' "$WORKFLOW_FILE"; then
  pass "workflows/ideate.md contains Skill(\"pde:recommend\") call"
else
  fail "workflows/ideate.md contains Skill(\"pde:recommend\") call" "Pattern 'Skill(\"pde:recommend\"' not found"
fi

# --quick flag passed to recommend
if grep -qiF 'Skill("pde:recommend", "--quick")' "$WORKFLOW_FILE"; then
  pass "Skill() invocation passes --quick flag to recommend"
else
  fail "Skill() invocation passes --quick flag to recommend" "Pattern 'Skill(\"pde:recommend\", \"--quick\")' not found"
fi

# NEVER Task() anti-pattern guard
if grep -qiE 'NEVER Task\(\)|never.*Task\(\).*Issue #686|Issue #686' "$WORKFLOW_FILE"; then
  pass "workflows/ideate.md has NEVER Task() anti-pattern guard (Issue #686 reference)"
else
  fail "workflows/ideate.md has NEVER Task() anti-pattern guard (Issue #686 reference)" "No 'NEVER Task()' or 'Issue #686' guard found"
fi

# Recommend checkpoint is at diverge-converge transition (Step 5/7)
if grep -qiE 'Step 5/7.*[Rr]ecommend|[Rr]ecommend checkpoint' "$WORKFLOW_FILE"; then
  pass "Skill() recommend invocation is at diverge-converge checkpoint (Step 5/7)"
else
  fail "Skill() recommend invocation is at diverge-converge checkpoint (Step 5/7)" "No 'Step 5/7' recommend checkpoint heading found"
fi

# Anti-patterns section also repeats the NEVER Task() guard
if grep -c 'Task()' "$WORKFLOW_FILE" | grep -qE '^[2-9]|^[0-9]{2,}'; then
  pass "NEVER Task() guard appears in multiple locations (process + anti-patterns)"
else
  # Single occurrence is still acceptable — check anti-patterns section specifically
  if grep -A5 'Anti-Patterns' "$WORKFLOW_FILE" | grep -qiE 'NEVER.*Task\(\)|Task\(\).*Issue'; then
    pass "Anti-Patterns section repeats NEVER Task() guard"
  else
    fail "Anti-Patterns section repeats NEVER Task() guard" "Task() guard not found in Anti-Patterns section"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "IDEAT-03 Skill() invocation: $total tests -- $PASS passed, $FAIL failed"

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
