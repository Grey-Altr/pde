---
phase: 192
slug: git-based-state-sync
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 192 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (dispatcher tests use vitest globals) |
| **Quick run command** | `npx vitest run tests/dispatcher/sync.test.cjs 2>&1 \| tail -20` |
| **Full suite command** | `npx vitest run tests/dispatcher/` |
| **Estimated runtime** | ~25 seconds (real git fixtures add ~5s) |

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 25 seconds

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 192-01-01 | 01 | 1 | SYN-01, SYN-07 | integration | `npx vitest run tests/dispatcher/sync.test.cjs` | ❌ W0 | pending |
| 192-01-02 | 01 | 1 | SYN-02, SYN-03 | integration | `npx vitest run tests/dispatcher/sync.test.cjs` | ❌ W0 | pending |
| 192-02-01 | 02 | 2 | SYN-04 | integration | `npx vitest run tests/dispatcher/coordinator-sync.test.cjs` | ❌ W0 | pending |

## Wave 0 Requirements

- [ ] `tests/dispatcher/sync.test.cjs` — sync function tests (created by Plan 01 TDD)
- [ ] `tests/dispatcher/coordinator-sync.test.cjs` — coordinator integration tests (created by Plan 02)

## Validation Sign-Off

- [ ] All tasks have automated verify
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
