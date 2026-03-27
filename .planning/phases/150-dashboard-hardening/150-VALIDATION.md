---
phase: 150
slug: dashboard-hardening
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
updated: 2026-03-27
---

# Phase 150 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | dashboard/vitest.config.ts |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 150-01-01 | 01 | 1 | HDN-01 | unit | `cd dashboard && npx vitest run __tests__/hardening-hdn.test.ts` | ✅ | ✅ green |
| 150-01-02 | 01 | 1 | HDN-02 | unit | `cd dashboard && npx vitest run __tests__/hardening-hdn.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `dashboard/__tests__/hardening-hdn.test.ts` — 7 tests for HDN-01 (auth guard) and HDN-02 (action handlers)

*Note: Test file named `hardening-hdn.test.ts` (not `hardening.test.ts`) to avoid mock conflicts with pre-existing ingest/cron tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FailureCard buttons visible in UI | HDN-02 | Requires running dashboard with active sessions | Start dispatcher, create a failed session, verify buttons appear and respond |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

---

## Validation Audit 2026-03-27

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 7 tests in `hardening-hdn.test.ts` cover both requirements (HDN-01: 2 tests, HDN-02: 5 tests). Full dashboard suite (212 tests, 28 files) green.
