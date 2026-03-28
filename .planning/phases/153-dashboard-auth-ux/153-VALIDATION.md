---
phase: 153
slug: dashboard-auth-ux
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-27
validated: 2026-03-27
---

# Phase 153 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (latest) |
| **Config file** | `dashboard/vitest.config.ts` |
| **Quick run command** | `cd dashboard && npm test` |
| **Full suite command** | `cd dashboard && npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npm test`
- **After every plan wave:** Run `cd dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 153-01-01 | 01 | 1 | AUX-01 | source-inspection | `cd dashboard && npm test -- auth-ux` | ✅ | ✅ green |
| 153-01-02 | 01 | 1 | AUX-01 | source-inspection | `cd dashboard && npm test -- auth-ux` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `dashboard/__tests__/auth-ux.test.ts` — source inspection tests for AUX-01 (401 redirect in useAllSessions) — 5/5 passing

*All phase requirements covered — 29 test files, 217 tests passing.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s (110ms actual)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

---

## Validation Audit 2026-03-27

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All requirements (AUX-01) have automated verification via 5 source-inspection tests in `dashboard/__tests__/auth-ux.test.ts`. Full suite: 217/217 passing across 29 test files. No gaps detected.
