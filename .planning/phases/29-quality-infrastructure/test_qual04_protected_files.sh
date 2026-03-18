#!/usr/bin/env bash
# QUAL-04 — protected-files.json structure and content test
#
# Requirement: protected-files.json exists at repo root, is valid JSON,
# has enforcement: "prompt", lists quality-standards.md, bin/ directory,
# .claude/ directory, and protected-files.json itself in its protection scope.
#
# Test type: integration (file existence + JSON validity + content)
# Run: bash .planning/phases/29-quality-infrastructure/test_qual04_protected_files.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TARGET="$REPO_ROOT/protected-files.json"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 -- $2"); }

echo "[protected-files.json — QUAL-04]"
echo ""

# File must exist at repo root
if [[ ! -r "$TARGET" ]]; then
  fail "protected-files.json exists at repo root" "Cannot read: $TARGET"
  echo "────────────────────────────────────────────────────────────"
  echo "QUAL-04 Protected files: 1 tests — 0 passed, 1 failed"
  exit 1
fi
pass "protected-files.json exists at repo root"

echo ""
echo "[JSON validity]"

# Valid JSON via node
node_output=$(node -e "
  const fs = require('fs');
  try {
    const content = fs.readFileSync('$TARGET', 'utf8');
    JSON.parse(content);
    console.log('valid');
  } catch (e) {
    console.log('invalid: ' + e.message);
    process.exit(1);
  }
" 2>&1) || true

if [[ "$node_output" == "valid" ]]; then
  pass "protected-files.json is valid JSON"
else
  fail "protected-files.json is valid JSON" "JSON.parse error: $node_output"
fi

echo ""
echo "[Enforcement mode]"

# enforcement: "prompt" field
if grep -qF '"enforcement"' "$TARGET" && grep -qF '"prompt"' "$TARGET"; then
  pass "enforcement field is present"
else
  fail "enforcement field is present" "\"enforcement\" or \"prompt\" not found"
fi

# Verify enforcement value is exactly "prompt" via node
enforcement_value=$(node -e "
  const f = JSON.parse(require('fs').readFileSync('$TARGET', 'utf8'));
  console.log(f.enforcement);
" 2>&1)

if [[ "$enforcement_value" == "prompt" ]]; then
  pass "enforcement value is exactly \"prompt\""
else
  fail "enforcement value is exactly \"prompt\"" "Got: $enforcement_value"
fi

echo ""
echo "[Protected entries — critical files]"

# quality-standards.md must be in protected list
if node -e "
  const f = JSON.parse(require('fs').readFileSync('$TARGET', 'utf8'));
  const hasIt = f.protected.some(p => p.includes('quality-standards.md'));
  process.exit(hasIt ? 0 : 1);
" 2>/dev/null; then
  pass "quality-standards.md listed in protected array"
else
  fail "quality-standards.md listed in protected array" \
    "quality-standards.md not found in protected[]"
fi

# protected-files.json itself must be listed (meta-protection)
if node -e "
  const f = JSON.parse(require('fs').readFileSync('$TARGET', 'utf8'));
  const hasIt = f.protected.some(p => p === 'protected-files.json');
  process.exit(hasIt ? 0 : 1);
" 2>/dev/null; then
  pass "protected-files.json itself listed in protected array (meta-protection)"
else
  fail "protected-files.json itself listed in protected array (meta-protection)" \
    "'protected-files.json' not found in protected[]"
fi

# bin/lib/model-profiles.cjs must be listed
if node -e "
  const f = JSON.parse(require('fs').readFileSync('$TARGET', 'utf8'));
  const hasIt = f.protected.some(p => p.includes('model-profiles.cjs'));
  process.exit(hasIt ? 0 : 1);
" 2>/dev/null; then
  pass "bin/lib/model-profiles.cjs listed in protected array"
else
  fail "bin/lib/model-profiles.cjs listed in protected array" \
    "model-profiles.cjs not found in protected[]"
fi

echo ""
echo "[Protected directories]"

# bin/ directory protected
if node -e "
  const f = JSON.parse(require('fs').readFileSync('$TARGET', 'utf8'));
  const hasIt = (f.protected_directories || []).some(d => d === 'bin/' || d === 'bin');
  process.exit(hasIt ? 0 : 1);
" 2>/dev/null; then
  pass "bin/ listed in protected_directories"
else
  fail "bin/ listed in protected_directories" \
    "'bin/' not found in protected_directories[]"
fi

# .claude/ directory protected
if node -e "
  const f = JSON.parse(require('fs').readFileSync('$TARGET', 'utf8'));
  const hasIt = (f.protected_directories || []).some(d => d === '.claude/' || d === '.claude');
  process.exit(hasIt ? 0 : 1);
" 2>/dev/null; then
  pass ".claude/ listed in protected_directories"
else
  fail ".claude/ listed in protected_directories" \
    "'.claude/' not found in protected_directories[]"
fi

echo ""
echo "[Protected list size — at least 10 entries]"

protected_count=$(node -e "
  const f = JSON.parse(require('fs').readFileSync('$TARGET', 'utf8'));
  console.log(f.protected.length);
" 2>&1)

if [[ "$protected_count" -ge 10 ]]; then
  pass "protected[] has $protected_count entries (>= 10 required)"
else
  fail "protected[] has >= 10 entries" \
    "Found only $protected_count entries — expected at least 10"
fi

echo ""
echo "[Note field explaining prompt-enforcement limitation]"

if node -e "
  const f = JSON.parse(require('fs').readFileSync('$TARGET', 'utf8'));
  const hasNote = typeof f.note === 'string' && f.note.length > 20;
  process.exit(hasNote ? 0 : 1);
" 2>/dev/null; then
  pass "note field present and non-empty (explains enforcement limitation)"
else
  fail "note field present and non-empty" \
    "note field missing or too short"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "QUAL-04 Protected files: $total tests — $PASS passed, $FAIL failed"

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
