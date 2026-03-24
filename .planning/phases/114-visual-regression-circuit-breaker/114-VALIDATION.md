---
phase: 114
slug: visual-regression-circuit-breaker
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-23
---

# Phase 114 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node 20) |
| **Config file** | none — run directly |
| **Quick run command** | `node --test tests/phase-114/visual-regression.test.mjs` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-114/visual-regression.test.mjs`
- **After every plan wave:** Run `node --test tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 114-01-01 | 01 | 1 | VRCB-01 | unit | `node --test tests/phase-114/visual-regression.test.mjs` | Yes | green |
| 114-01-02 | 01 | 1 | VRCB-02 | unit | `node --test tests/phase-114/visual-regression.test.mjs` | Yes | green |
| 114-01-03 | 01 | 1 | VRCB-03 | unit | `node --test tests/phase-114/visual-regression.test.mjs` | Yes | green |
| 114-01-04 | 01 | 1 | VRCB-04 | unit | `node --test tests/phase-114/visual-regression.test.mjs` | Yes | green |
| 114-02-01 | 02 | 2 | VRCB-05 | regression | `node --test tests/phase-114/visual-regression.test.mjs` | Yes | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [x] `tests/phase-114/` directory — created in Plan 01 Task 2
- [x] `tests/phase-114/visual-regression.test.mjs` — 27 tests covering VRCB-01..05
- [x] `bin/lib/visual-regression.cjs` — created in Plan 01 Task 1

*Existing infrastructure covers test framework (node:test is built-in).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Playwright screenshot capture | VRCB-02 | Requires live Playwright MCP | Run experiment with visual_regression_guard: true, verify baseline PNG exists in /tmp/ |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-23

---

## Validation Audit 2026-03-23

| Metric | Count |
|--------|-------|
| Requirements audited | 5 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Tests passing | 27/27 |

### Test Coverage Detail

| Req ID | Tests | Description |
|--------|-------|-------------|
| VRCB-01 | 4 | hashScreenshot: null for missing, consistent hash, hex format, diff files |
| VRCB-02 | 2 | captureAndStoreBaseline: exists, no-throw graceful degradation |
| VRCB-03 | 6 | checkVisualRegression: no baseline, no current, same hash, max decrease fires, max improve safe, min increase fires |
| VRCB-04 | 4 | Schema: enabled default false, target default null, JSONL screenshot_hash, JSONL baseline_hash |
| VRCB-05 | 11 | optimize.md: BREAK-05 present, Step 6b capture, checkVisualRegression call, CRASH gate, 4 existing breakers preserved, KEEP update, guard activation, screenshot_hash JSONL, baseline_hash JSONL, REQUIRED_FIELDS unchanged, field count |
