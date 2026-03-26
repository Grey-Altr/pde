---
phase: 139
slug: production-hardening
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-25
---

# Phase 139 — Validation Strategy

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
| 139-01-01 | 01 | 1 | HRD-01 | unit | `cd dashboard && npx vitest run` | ❌ W0 | ⬜ pending |
| 139-01-02 | 01 | 1 | HRD-02 | unit | `cd dashboard && npx vitest run` | ❌ W0 | ⬜ pending |
| 139-02-01 | 02 | 1 | HRD-03 | unit | `cd dashboard && npx vitest run` | ✅ | ⬜ pending |
| 139-02-02 | 02 | 1 | HRD-04 | unit | `cd dashboard && npx vitest run` | ❌ W0 | ⬜ pending |
| 139-03-01 | 03 | 2 | HRD-05 | unit | `cd dashboard && npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for HRD-01 (Redis TTL)
- [ ] Test stubs for HRD-02 (Rate limiting)
- [ ] Test stubs for HRD-04 (Downsampling)
- [ ] Test stubs for HRD-05 (Cron GC)

*HRD-03 already has test coverage at tests/phase-134/test-relay-batch.cjs test 14.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Redis keys expire after 7 days | HRD-01 | TTL expiry is time-dependent | Set short TTL in test env, verify key disappears |
| Cron runs daily | HRD-05 | Vercel cron scheduling | Deploy and check Vercel dashboard cron logs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
