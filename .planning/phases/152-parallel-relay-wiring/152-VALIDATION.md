---
phase: 152
slug: parallel-relay-wiring
status: validated
nyquist_compliant: true
wave_0_complete: true
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
| 152-01-01 | 01 | 1 | RLY-01 | unit | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` | ✅ | ✅ green |
| 152-01-02 | 01 | 1 | RLY-01 | unit | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` | ✅ | ✅ green |
| 152-01-03 | 01 | 1 | RLY-01 | unit | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` | ✅ | ✅ green |
| 152-01-04 | 01 | 1 | RLY-01 | source inspection | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` | ✅ | ✅ green |
| 152-01-05 | 01 | 1 | RLY-01 | unit | `npx vitest run tests/dispatcher/coordinator-relay.test.cjs` | ✅ | ✅ green |
| 152-01-06 | 01 | 1 | RLY-02 | unit (existing) | `cd dashboard && npx vitest run __tests__/session-source.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/dispatcher/coordinator-relay.test.cjs` — 8 tests for RLY-01 (relay spawning, cleanup, lifecycle)

*Existing dashboard tests cover RLY-02 path.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-27

---

## Validation Audit 2026-03-27

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 8 relay tests pass (8/8). Full dispatcher suite green (229/229). No gaps detected.
