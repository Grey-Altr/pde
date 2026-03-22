---
phase: 80
slug: print-collateral
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
validated: 2026-03-21
---

# Phase 80 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in test runner) / manual HTML inspection |
| **Config file** | none — uses node:test built-in |
| **Quick run command** | `node --test tests/phase-80/print-collateral.test.mjs` |
| **Full suite command** | `node --test tests/phase-80/print-collateral.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-80/print-collateral.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-80/print-collateral.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 80-01-01 | 01 | 1 | PRNT-01, PRNT-02, PRNT-04 | unit | `node --test tests/phase-80/print-collateral.test.mjs` | ✅ | ✅ green |
| 80-01-02 | 01 | 1 | PRNT-01, PRNT-02, PRNT-04 | unit | `node --test tests/phase-80/print-collateral.test.mjs` | ✅ | ✅ green |
| 80-02-01 | 02 | 2 | PRNT-03 | unit | `node --test tests/phase-80/print-collateral.test.mjs` | ✅ | ✅ green |
| 80-02-02 | 02 | 2 | PRNT-04 | manual | Visual inspection of composition quality | N/A | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/phase-80/print-collateral.test.mjs` — unified test file for all PRNT requirements (FLY @page, bleed, CMYK, SIT {{variable}} slots, prepress disclaimer, PRG multi-page) — 23 tests, all green

*Wave 0 completed by Plan 01 Task 1. Extended by Plan 02 Task 1 (7 PRNT-03 tests).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Awwwards-level composition quality | PRNT-04 | Subjective visual assessment of hierarchy, negative space, typeface count, legibility | Open generated flyer HTML in browser, verify: clear focal hierarchy, intentional negative space, max 3 typefaces, legible at print size |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s (~54ms actual)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-21

---

## Validation Audit 2026-03-21

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total automated tests | 23 |
| Total manual checks | 1 |
| All tests passing | ✅ |
