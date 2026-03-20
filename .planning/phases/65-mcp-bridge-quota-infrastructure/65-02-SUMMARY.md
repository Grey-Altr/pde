---
phase: 65-mcp-bridge-quota-infrastructure
plan: 02
subsystem: mcp-bridge
tags: [quota, stitch, config-json, progress, health, tdd, nyquist]
dependency_graph:
  requires: [65-01]
  provides: [stitch-quota-counter, stitch-quota-check, stitch-quota-display]
  affects: [bin/lib/mcp-bridge.cjs, .planning/config.json, workflows/progress.md, workflows/health.md]
tech_stack:
  added: []
  patterns: [lazy-monthly-reset, configPath-injection, read-modify-write, quota-warning-threshold]
key_files:
  created:
    - tests/phase-65/quota-counter.test.mjs
    - tests/phase-65/quota-display.test.mjs
  modified:
    - bin/lib/mcp-bridge.cjs
    - workflows/progress.md
    - workflows/health.md
decisions:
  - configPath optional parameter added to all three quota functions for test isolation — avoids process.cwd() monkey-patching, follows existing PDE test patterns
  - UTC-based reset calculation (Date.UTC) used throughout — prevents timezone edge cases at month boundaries
  - readStitchQuota returns null (not default object) when quota block absent — callers can distinguish "not configured" from "configured at 0"
  - checkStitchQuota never writes to disk — it only reads; incrementStitchQuota is the only write path (clean separation of concerns)
metrics:
  duration: ~3min
  completed: 2026-03-20
  tasks_completed: 2
  files_changed: 5
---

# Phase 65 Plan 02: Stitch Quota Infrastructure Summary

Three quota management functions exported from mcp-bridge.cjs (readStitchQuota, incrementStitchQuota, checkStitchQuota) with lazy UTC monthly reset, 80% threshold warnings, exhaustion detection, configPath injection for test isolation, and quota display sections added to both progress.md and health.md workflows.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 (TDD) | Implement quota functions in mcp-bridge.cjs with Nyquist tests | 9b97f79 | bin/lib/mcp-bridge.cjs, tests/phase-65/quota-counter.test.mjs |
| 2 (TDD) | Add Stitch quota display to progress.md and health.md with Nyquist tests | b812050 | workflows/progress.md, workflows/health.md, tests/phase-65/quota-display.test.mjs |

## Verification Results

All plan verification checks passed:

1. `node --test tests/phase-65/quota-counter.test.mjs` — 18 tests PASS (QUOTA-01, QUOTA-02, QUOTA-03)
2. `node --test tests/phase-65/quota-display.test.mjs` — 3 tests PASS (QUOTA-04)
3. `typeof readStitchQuota, incrementStitchQuota, checkStitchQuota` — all 'function'
4. `grep 'Stitch Quota' workflows/progress.md` — section exists
5. `grep -i 'stitch.*quota' workflows/health.md` — health check exists
6. Full Phase 65 suite: `node --test tests/phase-65/*.test.mjs` — 49/49 PASS

## What Was Built

### bin/lib/mcp-bridge.cjs — Three New Exports

**readStitchQuota(generationType, configPath?):**
- Returns null when no quota block configured (callers can distinguish unconfigured from zero)
- Reads `quota.stitch.{generationType}` from config.json
- Performs lazy monthly reset: if `now >= reset_at`, returns `{used:0, wasReset:true, reset_at:nextMonth}`
- Reset calculation uses `Date.UTC()` for timezone safety at month boundaries
- configPath parameter defaults to `.planning/config.json` relative to `process.cwd()`

**incrementStitchQuota(generationType, configPath?):**
- Auto-initializes quota block if missing: `standard` gets limit 350, `experimental` gets limit 50
- Performs lazy reset before incrementing (compound read-modify-write)
- Atomic: reads full config, increments field, writes full config in one operation
- Returns the updated quota entry after write

**checkStitchQuota(generationType, configPath?):**
- Delegates to readStitchQuota (read-only — never writes)
- Returns `{allowed:true, remaining:null, reason:'no_quota_configured'}` when no block
- Returns `{allowed:true, reason:'quota_reset', needsWrite:true}` when reset_at has passed
- Returns `{allowed:false, remaining:0, reason:'quota_exhausted'}` when used >= limit
- Returns `{allowed:true, reason:'quota_warning', pct:N}` when usage >= 80%
- Returns `{allowed:true, remaining:N, reason:'ok'}` otherwise

### workflows/progress.md — display_stitch_quota Step

New step added before the route step. Uses `readStitchQuota` via inline Node.js to read both quota types. Displays a markdown table with Standard (350) and Experimental (50) limits, used/remaining/reset date. Appends threshold warnings at 80% and exhaustion messages at limit. Skips entirely if both values are null.

### workflows/health.md — display_stitch_quota_health Step

New step added before offer_repair. Uses `readStitchQuota` to surface quota state in health output. Reports `Stitch quota: Standard {used}/{limit} | Experimental {used}/{limit}`. Flags 80% threshold with WARNING, flags exhaustion separately. Skips if quota block not initialized.

## Decisions Made

1. **configPath injection pattern:** All three functions accept an optional `configPath` parameter defaulting to `path.join(process.cwd(), '.planning', 'config.json')`. Tests use `mkdtempSync` to create isolated temp directories and pass the temp config path directly. This avoids process.cwd() monkey-patching and is consistent with how PDE tests handle file-based state.

2. **UTC-based reset dates:** `Date.UTC(year, month+1, 1, 0, 0, 0, 0)` used for all reset_at calculations. A user in UTC-8 at 11pm on March 31 sees their quota reset at UTC midnight April 1 (4pm local), not local midnight. This matches standard Google Cloud billing cycle behavior and prevents off-by-one-day errors.

3. **readStitchQuota returns null not default:** When `quota.stitch.{type}` is absent, `readStitchQuota` returns `null` rather than a zeroed default object. `checkStitchQuota` translates this to `reason: 'no_quota_configured'`. This distinction lets callers differentiate between "user has never used Stitch" (null) and "user has used 0 this month" (configured object with used:0).

4. **Read/write separation:** `checkStitchQuota` never writes to config.json. Only `incrementStitchQuota` writes. This keeps the check function pure (safe to call multiple times in a workflow without side effects) and the increment explicit (callers decide when to debit quota).

## Deviations from Plan

None — plan executed exactly as written. The configPath injection approach specified in the plan action matched exactly with the implementation.

## Self-Check

Files exist:
- [x] bin/lib/mcp-bridge.cjs — modified with readStitchQuota, incrementStitchQuota, checkStitchQuota
- [x] tests/phase-65/quota-counter.test.mjs — created, 18 tests
- [x] tests/phase-65/quota-display.test.mjs — created, 3 tests
- [x] workflows/progress.md — modified with display_stitch_quota step
- [x] workflows/health.md — modified with display_stitch_quota_health step

Commits exist:
- [x] 9b97f79 — feat(65-02): implement Stitch quota functions with Nyquist tests
- [x] b812050 — feat(65-02): add Stitch quota display to progress.md and health.md

## Self-Check: PASSED
