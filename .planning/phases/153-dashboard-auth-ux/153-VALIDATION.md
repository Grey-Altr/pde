---
phase: 153
slug: dashboard-auth-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
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
| 153-01-01 | 01 | 1 | AUX-01 | source-inspection | `cd dashboard && npm test -- auth-ux` | ❌ W0 | ⬜ pending |
| 153-01-02 | 01 | 1 | AUX-01 | source-inspection | `cd dashboard && npm test -- auth-ux` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/__tests__/auth-ux.test.ts` — source inspection tests for AUX-01 (401 redirect in useAllSessions)

*Existing infrastructure covers all other phase requirements — 28 test files, 212 tests already passing.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
