---
phase: 154
slug: ssh-source-propagation
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| 154-01-01 | 01 | 1 | SSH-03 | unit | `npx vitest run tests/dispatcher/coordinator-remote.test.cjs tests/dispatcher/remote-ssh.test.cjs` | YES (Tests 8-9, Tests 13-14) | ✅ green |
| 154-01-02 | 01 | 1 | SSH-04 | unit | `npx vitest run tests/dispatcher/emit-event-source.test.cjs` | YES (3 tests) | ✅ green |
| 154-01-03 | 01 | 1 | SSH-01 | integration | `cd dashboard && npx vitest run __tests__/session-source.test.ts` | YES (SS-02, SS-05, SS-07) | ✅ green |
| 154-01-04 | 01 | 1 | SSH-02 | unit | `cd dashboard && npx vitest run __tests__/session-source.test.ts` | YES (SS-02) | ✅ green |
| 154-01-05 | 01 | 1 | Finding-1 | unit | `npx vitest run tests/dispatcher/coordinator-remote.test.cjs tests/dispatcher/remote-ssh.test.cjs` | YES (Tests 8-9, Test 14) | ✅ green |
| 154-01-06 | 01 | 1 | Finding-2 | unit | `npx vitest run tests/dispatcher/remote-ssh.test.cjs` | YES (Test 15) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] New test in `tests/dispatcher/coordinator-remote.test.cjs` verifying relayId UUID passed to SSH path -- covers SSH-03, Finding-1
- [x] New test verifying emit-event.cjs reads PDE_BACKEND as source fallback -- covers SSH-04
- [x] New test verifying PDE_SESSION_ID uses UUID relayId in SSH envPrefix -- covers Finding-1
- [x] New test verifying PDE_BACKEND=remote-ssh in envPrefix -- covers SSH-01
- [x] New test verifying PDE_REMOTE injection from remoteConfig.ingest_url -- covers Finding-2

*All Wave 0 gaps resolved during Phase 154 execution (TDD tasks).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSH session shows source='remote-ssh' in live dashboard | SSH-01 | Requires live SSH session with remote machine | 1. Configure remote dispatch 2. Trigger SSH session 3. Check session health matrix |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-27

---

## Validation Audit 2026-03-27

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 6 requirements (SSH-01..SSH-04, Finding-1, Finding-2) have automated test coverage. 28 tests across 3 test suites + 10 dashboard tests verify the full SSH source propagation pipeline. Phase is Nyquist-compliant.
