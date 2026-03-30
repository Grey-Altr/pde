---
phase: 193
slug: cloud-web-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 193 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (globals: true) |
| **Quick run command** | `npx vitest run tests/dispatcher/coordinator-cloud.test.cjs 2>&1 \| tail -20` |
| **Full suite command** | `npx vitest run tests/dispatcher/` |
| **Estimated runtime** | ~20 seconds |

## Sampling Rate

- **After every task commit:** Quick run command
- **After every plan wave:** Full suite command
- **Max feedback latency:** 20 seconds

## Wave 0 Requirements

- [ ] `tests/dispatcher/coordinator-cloud.test.cjs` — Cloud dispatch tests (created by TDD)
- [ ] `tests/dispatcher/remote-cloud.test.cjs` — CloudPoller + spawnCloudSession tests (created by TDD)

## Validation Sign-Off

- [ ] All tasks have automated verify
- [ ] Sampling continuity verified
- [ ] Wave 0 covers all MISSING references
- [ ] Feedback latency < 20s

**Approval:** pending
