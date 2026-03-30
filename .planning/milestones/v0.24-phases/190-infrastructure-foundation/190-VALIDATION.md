---
phase: 190
slug: infrastructure-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 190 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (dashboard), node:test + cjs (dispatcher) |
| **Config file** | dashboard/vitest.config.ts, tests/dispatcher/*.test.cjs |
| **Quick run command** | `npx vitest run --reporter=verbose 2>&1 | tail -20` |
| **Full suite command** | `npx vitest run && node --test tests/dispatcher/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 190-01-01 | 01 | 1 | INF-03 | unit | `npx vitest run dashboard/__tests__/session-source.test.ts` | ✅ | ⬜ pending |
| 190-01-02 | 01 | 1 | INF-01 | unit | `node --test tests/dispatcher/lock.test.cjs` | ✅ | ⬜ pending |
| 190-01-03 | 01 | 1 | INF-02 | unit | `node --test tests/dispatcher/aggregator.test.cjs` | ✅ | ⬜ pending |
| 190-02-01 | 02 | 1 | CLD-06 | integration | `node -e "require('./packages/cloud-adapter')"` | ❌ W0 | ⬜ pending |
| 190-02-02 | 02 | 1 | INF-06 | unit | `node --test tests/dispatcher/config-dispatch.test.cjs` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/cloud-adapter/index.cjs` — module stub for require check
- [ ] `packages/cloud-adapter/package.json` — zero-dependency package manifest

*Existing test infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TypeScript compilation across dashboard consumers | INF-03 | Full tsc check across workspace | Run `cd dashboard && npx tsc --noEmit` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
