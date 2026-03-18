#!/usr/bin/env bash
# QUAL-05 — model-profiles.cjs 4 new agent entries test
#
# Requirement: bin/lib/model-profiles.cjs contains 4 new agent entries:
# pde-quality-auditor, pde-skill-linter, pde-design-quality-evaluator,
# pde-template-auditor. require() must succeed (no syntax errors). Total agent
# count must be >= 19 (grows as phases add agents).
#
# Test type: integration (file content + Node.js require validation)
# Run: bash .planning/phases/29-quality-infrastructure/test_qual05_model_profiles.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TARGET="$REPO_ROOT/bin/lib/model-profiles.cjs"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[bin/lib/model-profiles.cjs — QUAL-05]"
echo ""

# File must be readable
if [[ ! -r "$TARGET" ]]; then
  fail "bin/lib/model-profiles.cjs readable" "Cannot read: $TARGET"
  echo "────────────────────────────────────────────────────────────"
  echo "QUAL-05 Model profiles: 1 tests — 0 passed, 1 failed"
  exit 1
fi
pass "bin/lib/model-profiles.cjs readable"

echo ""
echo "[Node.js require succeeds — no syntax errors]"

require_output=$(node -e "
  try {
    require('$TARGET');
    console.log('ok');
  } catch (e) {
    console.error('require failed: ' + e.message);
    process.exit(1);
  }
" 2>&1) || true

if [[ "$require_output" == "ok" ]]; then
  pass "require() succeeds with no syntax errors"
else
  fail "require() succeeds with no syntax errors" "$require_output"
fi

echo ""
echo "[4 new quality-fleet agent entries present]"

NEW_AGENTS=(
  "pde-quality-auditor"
  "pde-skill-linter"
  "pde-design-quality-evaluator"
  "pde-template-auditor"
)

for agent in "${NEW_AGENTS[@]}"; do
  if grep -qF "'$agent'" "$TARGET"; then
    pass "Agent '$agent' present in MODEL_PROFILES"
  else
    fail "Agent '$agent' present in MODEL_PROFILES" \
      "String '$agent' not found in file"
  fi
done

echo ""
echo "[Agent model tier values]"

# pde-design-quality-evaluator must have quality: 'opus' (requires max reasoning)
if grep -qF "'pde-design-quality-evaluator'" "$TARGET" && \
   node -e "
     const m = require('$TARGET');
     const entry = m.MODEL_PROFILES['pde-design-quality-evaluator'];
     if (!entry) { console.error('entry missing'); process.exit(1); }
     if (entry.quality !== 'opus') { console.error('quality is ' + entry.quality + ', expected opus'); process.exit(1); }
     console.log('ok');
   " 2>/dev/null; then
  pass "pde-design-quality-evaluator has quality: 'opus'"
else
  fail "pde-design-quality-evaluator has quality: 'opus'" \
    "Expected quality tier 'opus' for design judgment agent"
fi

# pde-skill-linter must have balanced: 'haiku' (low-cost high-volume linting)
if node -e "
  const m = require('$TARGET');
  const entry = m.MODEL_PROFILES['pde-skill-linter'];
  if (!entry) { console.error('entry missing'); process.exit(1); }
  if (entry.balanced !== 'haiku') { console.error('balanced is ' + entry.balanced + ', expected haiku'); process.exit(1); }
  console.log('ok');
" 2>/dev/null; then
  pass "pde-skill-linter has balanced: 'haiku'"
else
  fail "pde-skill-linter has balanced: 'haiku'" \
    "Expected balanced tier 'haiku' for high-volume skill linter"
fi

echo ""
echo "[Total agent count]"

agent_count=$(node -e "
  const m = require('$TARGET');
  console.log(Object.keys(m.MODEL_PROFILES).length);
" 2>&1)

if [[ "$agent_count" -ge 19 ]]; then
  pass "MODEL_PROFILES contains >= 19 agents (15 original + 4 Phase 29 + later phases)"
else
  fail "MODEL_PROFILES contains >= 19 agents" \
    "Found $agent_count agents — expected at least 19"
fi

echo ""
echo "[MODEL_PROFILES exported correctly]"

if node -e "
  const m = require('$TARGET');
  if (!m.MODEL_PROFILES) { console.error('MODEL_PROFILES not exported'); process.exit(1); }
  if (!m.VALID_PROFILES) { console.error('VALID_PROFILES not exported'); process.exit(1); }
  console.log('ok');
" 2>/dev/null; then
  pass "MODEL_PROFILES and VALID_PROFILES exported from module"
else
  fail "MODEL_PROFILES and VALID_PROFILES exported from module" \
    "Module exports missing required symbols"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "QUAL-05 Model profiles: $total tests — $PASS passed, $FAIL failed"

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
