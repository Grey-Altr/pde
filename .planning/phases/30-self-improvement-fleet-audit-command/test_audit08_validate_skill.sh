#!/usr/bin/env bash
# AUDIT-08 — pde-tools validate-skill CLI command
#
# Requirement: validate-skill checks SKILL.md frontmatter validity,
# allowed-tools correctness, workflow path existence, skill code uniqueness,
# and required sections.
#
# Test type: integration (CLI execution + output parsing)
# Run: bash .planning/phases/30-self-improvement-fleet-audit-command/test_audit08_validate_skill.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[validate-skill CLI — AUDIT-08]"
echo ""

# validate-skill.cjs module exists
echo "[Module existence]"
if [[ -f "$REPO_ROOT/bin/lib/validate-skill.cjs" ]]; then
  pass "bin/lib/validate-skill.cjs exists"
else
  fail "bin/lib/validate-skill.cjs exists" "File not found"
fi

# pde-tools.cjs has validate-skill case
if grep -q "validate-skill" "$REPO_ROOT/bin/pde-tools.cjs"; then
  pass "pde-tools.cjs has validate-skill case"
else
  fail "pde-tools.cjs has validate-skill case" "case 'validate-skill' not found"
fi

echo ""
echo "[Running against a real command file (should detect non-skill)]"

# Running validate-skill against a workflow file should produce skipped: true
wf_result=$(node "$REPO_ROOT/bin/pde-tools.cjs" validate-skill workflows/critique.md --raw 2>&1) || true

if echo "$wf_result" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    try { const j=JSON.parse(d); process.exit(j.skipped===true?0:1); }
    catch { process.exit(1); }
  });
" 2>/dev/null; then
  pass "workflow file produces skipped: true"
else
  fail "workflow file produces skipped: true" "Got: $wf_result"
fi

echo ""
echo "[Running against a real command file (should return valid JSON)]"

# Running validate-skill against a command file should return JSON with valid field
cmd_result=$(node "$REPO_ROOT/bin/pde-tools.cjs" validate-skill commands/critique.md --raw 2>&1) || true

if echo "$cmd_result" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    try { const j=JSON.parse(d); process.exit('valid' in j ? 0 : 1); }
    catch { process.exit(1); }
  });
" 2>/dev/null; then
  pass "command file produces JSON with valid field"
else
  fail "command file produces JSON with valid field" "Got: $cmd_result"
fi

echo ""
echo "[LINT rule references in validate-skill.cjs]"

# Must reference key LINT rules
for rule in "LINT-001" "LINT-002" "LINT-024"; do
  if grep -q "$rule" "$REPO_ROOT/bin/lib/validate-skill.cjs"; then
    pass "validate-skill.cjs references $rule"
  else
    fail "validate-skill.cjs references $rule" "$rule not found in source"
  fi
done

echo ""
echo "[Frontmatter integration]"

# Must use extractFrontmatter
if grep -q "extractFrontmatter" "$REPO_ROOT/bin/lib/validate-skill.cjs"; then
  pass "validate-skill.cjs uses extractFrontmatter"
else
  fail "validate-skill.cjs uses extractFrontmatter" "extractFrontmatter not found"
fi

# Must check skill-registry.md
if grep -q "skill-registry.md" "$REPO_ROOT/bin/lib/validate-skill.cjs"; then
  pass "validate-skill.cjs checks skill-registry.md"
else
  fail "validate-skill.cjs checks skill-registry.md" "skill-registry.md not found"
fi

echo ""
echo "------------------------------------------------------------"
total=$((PASS + FAIL))
echo "AUDIT-08 validate-skill CLI: $total tests -- $PASS passed, $FAIL failed"

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
