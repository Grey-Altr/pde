---
phase: 140
slug: clerk-public-route-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
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
| 140-01-01 | 01 | 1 | APR-04 | unit (static config assert) | `cd dashboard && npm test` | ❌ W0 | ⬜ pending |
| 140-01-02 | 01 | 1 | HRD-05 (guard) | unit (static config assert) | `cd dashboard && npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/__tests__/proxy-public-routes.test.ts` — stubs for APR-04 and HRD-05 guard (test IDs PR-01, PR-02)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Approval Gate E2E flow completes | APR-04 | Requires live PDE → relay → dashboard → Redis → SSE chain | Deploy to Vercel preview, trigger approval gate from PDE, verify card appears, approve, verify PDE unblocks |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
