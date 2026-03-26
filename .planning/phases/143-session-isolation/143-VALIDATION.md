---
phase: 143
slug: session-isolation
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
validated: 2026-03-26
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
| **Estimated runtime** | ~1.5 seconds (dispatcher), ~5 seconds (full) |

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
| 143-01-01 | 01 | 1 | ISO-01 | unit | `node_modules/.bin/vitest run tests/dispatcher/worktree.test.cjs` | ✅ | ✅ green |
| 143-01-02 | 01 | 1 | ISO-03 | unit | `node_modules/.bin/vitest run tests/dispatcher/worktree.test.cjs` | ✅ | ✅ green |
| 143-01-03 | 01 | 1 | ISO-02 | unit | `node_modules/.bin/vitest run tests/dispatcher/merge.test.cjs` | ✅ | ✅ green |
| 143-01-04 | 01 | 1 | ISO-09 | unit | `node_modules/.bin/vitest run tests/dispatcher/merge.test.cjs` | ✅ | ✅ green |
| 143-02-01 | 02 | 2 | ISO-04 | unit | `node_modules/.bin/vitest run tests/dispatcher/orphan.test.cjs` | ✅ | ✅ green |
| 143-02-02 | 02 | 2 | ISO-05 | unit | `node_modules/.bin/vitest run tests/dispatcher/orphan.test.cjs` | ✅ | ✅ green |
| 143-03-01 | 03 | 1 | ISO-06 | unit | `node_modules/.bin/vitest run tests/dispatcher/artifacts.test.cjs` | ✅ | ✅ green |
| 143-03-02 | 03 | 1 | ISO-07 | unit | `node_modules/.bin/vitest run tests/dispatcher/artifacts.test.cjs` | ✅ | ✅ green |
| 143-03-03 | 03 | 1 | ISO-08 | unit | `node_modules/.bin/vitest run tests/dispatcher/artifacts.test.cjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/dispatcher/worktree.test.cjs` — 15 tests for ISO-01, ISO-03 (+ lock)
- [x] `tests/dispatcher/merge.test.cjs` — 8 tests for ISO-02, ISO-09
- [x] `tests/dispatcher/orphan.test.cjs` — 8 tests for ISO-04, ISO-05
- [x] `tests/dispatcher/artifacts.test.cjs` — 12 tests for ISO-06, ISO-07, ISO-08
- [x] `packages/dispatcher/package.json` — CJS package definition
- [x] `packages/dispatcher/index.cjs` — entry point
- [x] `packages/dispatcher/lib/worktree.cjs` — core module
- [x] `packages/dispatcher/lib/merge.cjs` — core module
- [x] `packages/dispatcher/lib/orphan.cjs` — core module

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Orphan detection prompts adopt/kill/ignore | ISO-04 | Requires interactive terminal | Run PDE startup with orphaned worktree present, verify prompt appears |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-26

---

## Validation Audit 2026-03-26

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 43 |
| Test files | 4 |
| Requirements covered | 9/9 |
