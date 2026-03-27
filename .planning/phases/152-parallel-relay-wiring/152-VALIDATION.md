---
phase: 152
slug: parallel-relay-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 152 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.1 |
| **Config file** | vitest.config.ts (root), dashboard/vitest.config.ts (dashboard) |
| **Quick run command** | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` |
| **Full suite command** | `npx vitest run tests/dispatcher/ && cd dashboard && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/dispatcher/coordinator-relay.test.cjs`
- **After every plan wave:** Run `npx vitest run tests/dispatcher/ && cd dashboard && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 152-01-01 | 01 | 1 | RLY-01 | unit | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` | ❌ W0 | ⬜ pending |
| 152-01-02 | 01 | 1 | RLY-01 | unit | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` | ❌ W0 | ⬜ pending |
| 152-01-03 | 01 | 1 | RLY-01 | unit | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` | ❌ W0 | ⬜ pending |
| 152-01-04 | 01 | 1 | RLY-01 | source inspection | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` | ❌ W0 | ⬜ pending |
| 152-01-05 | 01 | 1 | RLY-01 | unit | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` | ❌ W0 | ⬜ pending |
| 152-01-06 | 01 | 1 | RLY-02 | unit (existing) | `cd dashboard && npx vitest run __tests__/session-source.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dispatcher/coordinator-relay.test.cjs` — stubs for RLY-01 (relay spawning, cleanup, lifecycle)

*Existing dashboard tests cover RLY-02 path.*

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
