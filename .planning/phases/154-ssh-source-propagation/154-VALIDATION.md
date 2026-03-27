---
phase: 154
slug: ssh-source-propagation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 154 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest v4.1.1 |
| **Config file (root)** | vitest.config.ts (includes tests/**/*.{test,spec}.{cjs,mjs,js,ts}) |
| **Config file (dashboard)** | dashboard/vitest.config.ts |
| **Quick run command** | `npx vitest run tests/dispatcher/coordinator-remote.test.cjs` |
| **Full suite command** | `npx vitest run && cd dashboard && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/dispatcher/coordinator-remote.test.cjs && cd dashboard && npx vitest run __tests__/session-source.test.ts`
- **After every plan wave:** Run `npx vitest run && cd dashboard && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 154-01-01 | 01 | 1 | SSH-03 | unit | `npx vitest run tests/dispatcher/coordinator-remote.test.cjs` | NO -- Wave 0 gap | ⬜ pending |
| 154-01-02 | 01 | 1 | SSH-04 | unit | New test file needed | NO -- Wave 0 gap | ⬜ pending |
| 154-01-03 | 01 | 1 | SSH-01 | integration | `cd dashboard && npx vitest run __tests__/session-source.test.ts` | YES (SS-02, SS-05, SS-07) | ⬜ pending |
| 154-01-04 | 01 | 1 | SSH-02 | unit | `cd dashboard && npx vitest run __tests__/session-source.test.ts` | YES (SS-02) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New test in `tests/dispatcher/coordinator-remote.test.cjs` verifying PDE_BACKEND=remote-ssh appears in envPrefix -- covers SSH-03
- [ ] New test verifying emit-event.cjs reads PDE_BACKEND as source fallback when hookData.source is absent -- covers SSH-04
- [ ] New test verifying PDE_SESSION_ID uses UUID relayId (not non-UUID sessionId) in SSH envPrefix -- covers Finding 1

*Existing dashboard tests (SS-01..SS-10) cover ingest and queries layers completely.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSH session shows source='remote-ssh' in live dashboard | SSH-01 | Requires live SSH session with remote machine | 1. Configure remote dispatch 2. Trigger SSH session 3. Check session health matrix |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
