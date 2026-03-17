#!/usr/bin/env bash
# IDEAT-01 — Command stub + workflow v1.2 sections structural test
#
# Requirement: commands/ideate.md exists and delegates to @workflows/ideate.md;
# workflows/ideate.md has all required v1.2 sections; has diverge pass with
# "minimum 5" constraint and evaluative language ban; has converge pass.
#
# Test type: structural / smoke
# Run: bash .planning/phases/27-ideation-skill-brief-update/test_ideat01_command_and_workflow_structure.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

COMMAND_FILE="$REPO_ROOT/commands/ideate.md"
WORKFLOW_FILE="$REPO_ROOT/workflows/ideate.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

# ── commands/ideate.md ────────────────────────────────────────────────────────

echo ""
echo "[commands/ideate.md]"

if [[ ! -r "$COMMAND_FILE" ]]; then
  fail "commands/ideate.md exists and is readable" "Cannot read: $COMMAND_FILE"
else
  pass "commands/ideate.md exists and is readable"

  # name: pde:ideate in frontmatter
  if grep -qF 'name: pde:ideate' "$COMMAND_FILE"; then
    pass "commands/ideate.md has name: pde:ideate in frontmatter"
  else
    fail "commands/ideate.md has name: pde:ideate in frontmatter" "Pattern 'name: pde:ideate' not found"
  fi

  # delegates to @workflows/ideate.md
  if grep -qF '@workflows/ideate.md' "$COMMAND_FILE"; then
    pass "commands/ideate.md delegates to @workflows/ideate.md"
  else
    fail "commands/ideate.md delegates to @workflows/ideate.md" "Pattern '@workflows/ideate.md' not found"
  fi
fi

# ── workflows/ideate.md ───────────────────────────────────────────────────────

echo ""
echo "[workflows/ideate.md — required v1.2 sections]"

if [[ ! -r "$WORKFLOW_FILE" ]]; then
  fail "workflows/ideate.md exists and is readable" "Cannot read: $WORKFLOW_FILE"
  echo ""
  echo "────────────────────────────────────────────────────────────"
  total=$((PASS + FAIL))
  echo "IDEAT-01 Command+Workflow structure: $total tests -- $PASS passed, $FAIL failed"
  exit 1
fi
pass "workflows/ideate.md exists and is readable"

# Required v1.2 top-level sections / tags
REQUIRED_SECTIONS=(
  '<purpose>'
  '<skill_code>IDT</skill_code>'
  '<skill_domain>strategy</skill_domain>'
  '<context_routing>'
  '<required_reading>'
  '<flags>'
  '<process>'
  '<output>'
)

for section in "${REQUIRED_SECTIONS[@]}"; do
  if grep -qF "$section" "$WORKFLOW_FILE"; then
    pass "workflows/ideate.md contains section: $section"
  else
    fail "workflows/ideate.md contains section: $section" "Pattern not found in $WORKFLOW_FILE"
  fi
done

# ── Diverge pass constraints ──────────────────────────────────────────────────

echo ""
echo "[workflows/ideate.md — diverge pass constraints]"

# "minimum 5" directions constraint
if grep -qiE 'minimum 5' "$WORKFLOW_FILE"; then
  pass "diverge pass enforces minimum 5 directions constraint"
else
  fail "diverge pass enforces minimum 5 directions constraint" "No 'minimum 5' pattern found"
fi

# ZERO evaluative language guard
if grep -qiE 'ZERO evaluative language' "$WORKFLOW_FILE"; then
  pass "diverge pass has ZERO evaluative language constraint"
else
  fail "diverge pass has ZERO evaluative language constraint" "No 'ZERO evaluative language' pattern found"
fi

# Banned word list present (spot-check 3 representative words)
BANNED_WORDS=("best" "recommended" "superior")
for word in "${BANNED_WORDS[@]}"; do
  # The banned-word list is inside a quoted enumeration — check the explicit list
  if grep -qiE "Banned words.*$word|$word.*banned" "$WORKFLOW_FILE"; then
    pass "diverge pass banned word list contains: $word"
  else
    # Fallback: check any line that enumerates banned words contains the word
    if grep -iE '"best"|"recommended"|"superior"' "$WORKFLOW_FILE" | grep -qiF "\"$word\""; then
      pass "diverge pass banned word list contains: $word"
    else
      fail "diverge pass banned word list contains: $word" "Word not found in banned-word enumeration"
    fi
  fi
done

# ── Converge pass presence ────────────────────────────────────────────────────

echo ""
echo "[workflows/ideate.md — converge pass]"

if grep -qiE 'CONVERGE' "$WORKFLOW_FILE"; then
  pass "workflows/ideate.md has converge pass"
else
  fail "workflows/ideate.md has converge pass" "No 'CONVERGE' heading found"
fi

# Step 4 (Diverge) and Step 6 (Converge) headings
if grep -qiE 'Step 4/7.*DIVERGE|DIVERGE.*Step 4' "$WORKFLOW_FILE"; then
  pass "diverge pass is Step 4/7"
else
  fail "diverge pass is Step 4/7" "Step 4/7 DIVERGE heading not found"
fi

if grep -qiE 'Step 6/7.*CONVERGE|CONVERGE.*Step 6' "$WORKFLOW_FILE"; then
  pass "converge pass is Step 6/7"
else
  fail "converge pass is Step 6/7" "Step 6/7 CONVERGE heading not found"
fi

# ── Anti-Patterns section ─────────────────────────────────────────────────────

echo ""
echo "[workflows/ideate.md — Anti-Patterns section]"

if grep -qiE 'Anti-Patterns' "$WORKFLOW_FILE"; then
  pass "workflows/ideate.md has Anti-Patterns section"
else
  fail "workflows/ideate.md has Anti-Patterns section" "No 'Anti-Patterns' heading found"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "IDEAT-01 Command+Workflow structure: $total tests -- $PASS passed, $FAIL failed"

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
