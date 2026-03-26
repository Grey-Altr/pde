---
phase: 143
slug: session-isolation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 143 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `node_modules/.bin/vitest run tests/dispatcher/` |
| **Full suite command** | `node_modules/.bin/vitest run tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node_modules/.bin/vitest run tests/dispatcher/`
- **After every plan wave:** Run `node_modules/.bin/vitest run tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 143-01-01 | 01 | 0 | ISO-01 | unit | `node_modules/.bin/vitest run tests/dispatcher/worktree.test.cjs` | ❌ W0 | ⬜ pending |
| 143-01-02 | 01 | 0 | ISO-03 | unit | `node_modules/.bin/vitest run tests/dispatcher/worktree.test.cjs` | ❌ W0 | ⬜ pending |
| 143-02-01 | 02 | 0 | ISO-02 | unit | `node_modules/.bin/vitest run tests/dispatcher/merge.test.cjs` | ❌ W0 | ⬜ pending |
| 143-02-02 | 02 | 0 | ISO-09 | unit | `node_modules/.bin/vitest run tests/dispatcher/merge.test.cjs` | ❌ W0 | ⬜ pending |
| 143-03-01 | 03 | 0 | ISO-04 | unit | `node_modules/.bin/vitest run tests/dispatcher/orphan.test.cjs` | ❌ W0 | ⬜ pending |
| 143-03-02 | 03 | 0 | ISO-05 | unit | `node_modules/.bin/vitest run tests/dispatcher/orphan.test.cjs` | ❌ W0 | ⬜ pending |
| 143-04-01 | 04 | 0 | ISO-06 | unit | `node_modules/.bin/vitest run tests/dispatcher/artifacts.test.cjs` | ❌ W0 | ⬜ pending |
| 143-04-02 | 04 | 0 | ISO-07 | unit | `node_modules/.bin/vitest run tests/dispatcher/artifacts.test.cjs` | ❌ W0 | ⬜ pending |
| 143-04-03 | 04 | 0 | ISO-08 | unit | `node_modules/.bin/vitest run tests/dispatcher/artifacts.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dispatcher/worktree.test.cjs` — stubs for ISO-01, ISO-03
- [ ] `tests/dispatcher/merge.test.cjs` — stubs for ISO-02, ISO-09
- [ ] `tests/dispatcher/orphan.test.cjs` — stubs for ISO-04, ISO-05
- [ ] `tests/dispatcher/artifacts.test.cjs` — stubs for ISO-06, ISO-07, ISO-08
- [ ] `packages/dispatcher/package.json` — CJS package definition
- [ ] `packages/dispatcher/index.cjs` — entry point
- [ ] `packages/dispatcher/lib/worktree.cjs` — core module
- [ ] `packages/dispatcher/lib/merge.cjs` — core module
- [ ] `packages/dispatcher/lib/orphan.cjs` — core module

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Orphan detection prompts adopt/kill/ignore | ISO-04 | Requires interactive terminal | Run PDE startup with orphaned worktree present, verify prompt appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
