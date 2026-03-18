#!/usr/bin/env bash
# SKILL-06 — Path sandboxing in /pde:improve workflow
#
# Requirement: /pde:improve workflow enforces path sandboxing so skill files
# are only written to allowed destinations (commands/ for --for-pde,
# .claude/skills/ for user-project). Protected paths must not be writable.
#
# Test type: path-guard (workflow content + protected-files.json checks)
# Run: bash .planning/phases/31-skill-builder/test_skill06_path_sandboxing.sh

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[/pde:improve path sandboxing — SKILL-06]"
echo ""

# workflows/improve.md references protected-files
echo "[Workflow path guard checks]"
if grep -q "protected-files" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md references protected-files"
else
  fail "workflows/improve.md references protected-files" "protected-files not found in workflows/improve.md"
fi

# workflows/improve.md references commands/ write path
if grep -q "commands/" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md references commands/ write path"
else
  fail "workflows/improve.md references commands/ write path" "commands/ not found in workflows/improve.md"
fi

# workflows/improve.md references .claude/skills/ write path
if grep -q "\.claude/skills/" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md references .claude/skills/ write path"
else
  fail "workflows/improve.md references .claude/skills/ write path" ".claude/skills/ not found in workflows/improve.md"
fi

# workflows/improve.md has --for-pde flag for PDE-internal destination
if grep -q "\-\-for-pde" "$PLUGIN_ROOT/workflows/improve.md" 2>/dev/null; then
  pass "workflows/improve.md has --for-pde flag"
else
  fail "workflows/improve.md has --for-pde flag" "--for-pde not found in workflows/improve.md"
fi

# protected-files.json allows commands/ as write destination
echo ""
echo "[protected-files.json checks]"
if [[ -f "$PLUGIN_ROOT/protected-files.json" ]]; then
  if node -e "
    const f = require('$PLUGIN_ROOT/protected-files.json');
    const dirs = f.allowed_write_directories || [];
    const ok = dirs.some(d => d.startsWith('commands/') || d === 'commands/');
    process.exit(ok ? 0 : 1);
  " 2>/dev/null; then
    pass "protected-files.json allows commands/ in allowed_write_directories"
  else
    fail "protected-files.json allows commands/ in allowed_write_directories" "commands/ not in allowed_write_directories"
  fi
else
  fail "protected-files.json exists" "File not found"
fi

# protected-files.json does NOT list .claude/skills/ in protected[] (user-project path is safe)
if node -e "
  const f = require('$PLUGIN_ROOT/protected-files.json');
  const p = f.protected || [];
  const d = f.protected_directories || [];
  const blocked = p.some(x => x.includes('.claude/skills')) || d.some(x => x.includes('.claude/skills'));
  process.exit(blocked ? 1 : 0);
" 2>/dev/null; then
  pass "protected-files.json does NOT block .claude/skills/ (user-project path is safe)"
else
  fail "protected-files.json does NOT block .claude/skills/" ".claude/skills/ found in protected[] or protected_directories[]"
fi

# pde-skill-builder agent references protected-files.json
echo ""
echo "[Agent path guard reference]"
if grep -q "protected-files.json" "$PLUGIN_ROOT/agents/pde-skill-builder.md" 2>/dev/null; then
  pass "agents/pde-skill-builder.md references protected-files.json"
else
  fail "agents/pde-skill-builder.md references protected-files.json" "protected-files.json not found in pde-skill-builder.md"
fi

echo ""
echo "------------------------------------------------------------"
total=$((PASS + FAIL))
echo "SKILL-06 path sandboxing: $total tests -- $PASS passed, $FAIL failed"

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
