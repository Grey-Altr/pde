---
status: testing
phase: 28-build-orchestrator-expansion
source: 28-01-SUMMARY.md
started: 2026-03-17T13:10:00Z
updated: 2026-03-17T13:10:00Z
---

## Current Test

number: 3
name: Mid-Pipeline Entry with --from
expected: |
  Run `/pde:build --from wireframe` (or inspect the workflow). The orchestrator should skip stages 1-7 (recommend through flows) and begin execution at stage 8 (wireframe). Skipped stages should not trigger completion checks.
awaiting: user response

## Tests

### 1. 13-Stage Pipeline Dry Run
expected: Run `/pde:build --dry-run`. Output displays exactly 13 stages in order: recommend → competitive → opportunity → ideate → brief → system → flows → wireframe → critique → iterate → mockup → hig → handoff. Stage count shows "13 stages" derived from the list.
result: issue
reported: "the command doesn't seem to work"
severity: major

### 2. No Hardcoded Numeric Literals
expected: Open `workflows/build.md` and search for hardcoded `13` or `7` in any stage progress message (e.g., "Stage 5/13"). None should exist — all denominators should reference TOTAL (derived from STAGES list length). `grep -cE "Stage [0-9]+/[0-9]+" workflows/build.md` should return 0.
result: pass

### 3. Mid-Pipeline Entry with --from
expected: Run `/pde:build --from wireframe` (or inspect the workflow). The orchestrator should skip stages 1-7 (recommend through flows) and begin execution at stage 8 (wireframe). Skipped stages should not trigger completion checks.
result: [pending]

### 4. Invalid --from Stage Name
expected: Run `/pde:build --from nonexistent` (or inspect the workflow). The orchestrator should halt with an error message that lists all valid stage names (recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, iterate, mockup, hig, handoff).
result: [pending]

### 5. Coverage Flag Completeness
expected: Inspect `workflows/build.md` — each of the 13 stages should map to its corresponding coverage flag in design-manifest.json. The ideate stage should require BOTH `hasIdeation == true` AND a `IDT-ideation-v*.md` Glob match. The brief stage should use Glob-only (no `hasBrief` flag). HIG should invoke `pde:hig` without `--light` flag.
result: [pending]

## Summary

total: 5
passed: 0
issues: 1
pending: 4
skipped: 0

## Gaps

- truth: "Run /pde:build --dry-run displays exactly 13 stages in order"
  status: failed
  reason: "User reported: the command doesn't seem to work"
  severity: major
  test: 1
  artifacts: []
  missing: []
