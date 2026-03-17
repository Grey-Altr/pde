#!/usr/bin/env bash
# REC-01 — Recommend command delegation and workflow structure test
#
# Requirement: commands/recommend.md exists and delegates to @workflows/recommend.md;
# workflows/recommend.md exists and has all required v1.2 sections (purpose, skill_code,
# context_routing, required_reading, flags, process, output); workflow has 7 steps;
# coverage flag write present with hasRecommendations:true in 13-field JSON.
#
# Test type: structural / smoke
# Run: bash .planning/phases/25-recommend-competitive-skills/test_rec01_command_and_workflow_structure.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CMD_FILE="$REPO_ROOT/commands/recommend.md"
WF_FILE="$REPO_ROOT/workflows/recommend.md"

PASS=0
FAIL=0
FAILURES=()

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; echo "        $2"; FAIL=$((FAIL + 1)); FAILURES+=("$1 — $2"); }

# ── commands/recommend.md ─────────────────────────────────────────────────────
echo ""
echo "[commands/recommend.md]"

if [[ ! -r "$CMD_FILE" ]]; then
  fail "commands/recommend.md — file readable" "Cannot read: $CMD_FILE"
else
  pass "commands/recommend.md — file readable"

  if grep -qF "@workflows/recommend.md" "$CMD_FILE"; then
    pass "commands/recommend.md — delegates to @workflows/recommend.md"
  else
    fail "commands/recommend.md — delegates to @workflows/recommend.md" \
      "@workflows/recommend.md not found in file"
  fi

  if grep -qF "@references/skill-style-guide.md" "$CMD_FILE"; then
    pass "commands/recommend.md — references skill-style-guide.md"
  else
    fail "commands/recommend.md — references skill-style-guide.md" \
      "@references/skill-style-guide.md not found in file"
  fi
fi

# ── workflows/recommend.md — file exists ─────────────────────────────────────
echo ""
echo "[workflows/recommend.md — existence]"

if [[ ! -r "$WF_FILE" ]]; then
  fail "workflows/recommend.md — file readable" "Cannot read: $WF_FILE"
  echo ""
  echo "────────────────────────────────────────────────────────────"
  total=$((PASS + FAIL))
  echo "REC-01 Command & workflow structure: $total tests — $PASS passed, $FAIL failed"
  exit 1
fi
pass "workflows/recommend.md — file readable"

# ── workflows/recommend.md — required v1.2 sections ──────────────────────────
echo ""
echo "[workflows/recommend.md — required sections]"

REQUIRED_SECTIONS=(
  "<purpose>"
  "<skill_code>"
  "<context_routing>"
  "<required_reading>"
  "<flags>"
  "<process>"
  "<output>"
)

for section in "${REQUIRED_SECTIONS[@]}"; do
  if grep -qF "$section" "$WF_FILE"; then
    pass "workflows/recommend.md — contains section $section"
  else
    fail "workflows/recommend.md — contains section $section" \
      "Section tag not found in file"
  fi
done

# ── workflows/recommend.md — 7 pipeline steps ────────────────────────────────
echo ""
echo "[workflows/recommend.md — 7-step pipeline]"

# Count "### Step N/7:" headings (any digit /7)
step_count=$(grep -cE "^### Step [0-9]+/7:" "$WF_FILE" || true)

if [[ "$step_count" -eq 7 ]]; then
  pass "workflows/recommend.md — contains exactly 7 pipeline steps (Step N/7:)"
else
  fail "workflows/recommend.md — contains exactly 7 pipeline steps (Step N/7:)" \
    "Found $step_count step headings matching '### Step N/7:'"
fi

# ── workflows/recommend.md — coverage flag: coverage-check read ───────────────
echo ""
echo "[workflows/recommend.md — coverage flag write]"

if grep -qF "coverage-check" "$WF_FILE"; then
  pass "workflows/recommend.md — contains coverage-check read before flag write"
else
  fail "workflows/recommend.md — contains coverage-check read before flag write" \
    "coverage-check not found in file"
fi

# Extract the manifest-set-top-level designCoverage command line
cmd_line="$(awk '
  /manifest-set-top-level/ && /designCoverage/ {
    line = $0
    while (sub(/\\[[:space:]]*$/, "", line)) {
      if ((getline next_line) > 0) line = line next_line
    }
    print line
    found = 1
  }
  END { if (!found) print "" }
' "$WF_FILE")"

if [[ -z "$cmd_line" ]]; then
  fail "workflows/recommend.md — contains manifest-set-top-level designCoverage command" \
    "No matching line found"
else
  pass "workflows/recommend.md — contains manifest-set-top-level designCoverage command"

  # Check hasRecommendations:true is present in the JSON
  if echo "$cmd_line" | grep -qF '"hasRecommendations":true'; then
    pass "workflows/recommend.md — manifest-set-top-level sets hasRecommendations:true"
  else
    fail "workflows/recommend.md — manifest-set-top-level sets hasRecommendations:true" \
      "\"hasRecommendations\":true not found in command line: $(echo "$cmd_line" | cut -c1-300)"
  fi

  # All 13 canonical fields must be present in the JSON command
  REQUIRED_FIELDS=(
    "hasDesignSystem"
    "hasWireframes"
    "hasFlows"
    "hasHardwareSpec"
    "hasCritique"
    "hasIterate"
    "hasHandoff"
    "hasIdeation"
    "hasCompetitive"
    "hasOpportunity"
    "hasMockup"
    "hasHigAudit"
    "hasRecommendations"
  )

  for field in "${REQUIRED_FIELDS[@]}"; do
    if echo "$cmd_line" | grep -qF "\"$field\""; then
      pass "workflows/recommend.md — 13-field JSON contains \"$field\""
    else
      fail "workflows/recommend.md — 13-field JSON contains \"$field\"" \
        "Field absent from: $(echo "$cmd_line" | cut -c1-200)"
    fi
  done
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────────────────────"
total=$((PASS + FAIL))
echo "REC-01 Command & workflow structure: $total tests — $PASS passed, $FAIL failed"

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
