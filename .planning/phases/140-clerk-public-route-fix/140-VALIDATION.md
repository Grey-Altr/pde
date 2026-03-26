---
phase: 140
slug: clerk-public-route-fix
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-25
validated: 2026-03-26
---

# Phase 140 — Validation Strategy

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
| 140-01-01 | 01 | 1 | APR-04 | unit (static config assert) | `cd dashboard && npm test` | ✅ PR-01 | ✅ green |
| 140-01-02 | 01 | 1 | HRD-05 (guard) | unit (static config assert) | `cd dashboard && npm test` | ✅ PR-02 | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `dashboard/__tests__/proxy-public-routes.test.ts` — 4 tests (PR-01 through PR-04) covering APR-04 and HRD-05 guard + regression

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Approval Gate E2E flow completes | APR-04 | Requires live PDE → relay → dashboard → Redis → SSE chain | Deploy to Vercel preview, trigger approval gate from PDE, verify card appears, approve, verify PDE unblocks |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s (547ms actual)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ validated 2026-03-26

---

## Validation Audit 2026-03-26

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 4 PR-* tests (PR-01 through PR-04) pass green. 121/121 total suite green in 547ms. No gaps to fill.
