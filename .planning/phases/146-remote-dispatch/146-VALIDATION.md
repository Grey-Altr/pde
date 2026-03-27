---
phase: 146
slug: remote-dispatch
status: active
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
---

# Phase 146 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run tests/dispatcher/ --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/ --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/dispatcher/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run tests/ --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 146-01-01 | 01 | 1 | RMT-04, RMT-05, RMT-06 | unit | `node -e "require('./packages/dispatcher/lib/remote-managed.cjs')"` | ✅ inline | ⬜ pending |
| 146-01-02 | 01 | 1 | RMT-04, RMT-05, RMT-06 | unit | `npx vitest run tests/dispatcher/remote-router.test.cjs` | TDD T2 | ⬜ pending |
| 146-02-01 | 02 | 1 | RMT-01, RMT-02, RMT-03 | unit | `node -e "require('./packages/dispatcher/lib/remote-ssh.cjs')"` | ✅ inline | ⬜ pending |
| 146-02-02 | 02 | 1 | RMT-01, RMT-02, RMT-03 | unit | `npx vitest run tests/dispatcher/remote-ssh.test.cjs` | TDD T2 | ⬜ pending |
| 146-03-01 | 03 | 2 | RMT-01 thru RMT-06 | unit | `node -e "require('./packages/dispatcher/lib/coordinator.cjs')"` | ✅ inline | ⬜ pending |
| 146-03-02 | 03 | 2 | RMT-01 thru RMT-06 | integration | `npx vitest run tests/dispatcher/ --reporter=verbose` | TDD T2 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*No separate Wave 0 plan required.* Test files are created via TDD Task-2 pattern within Wave 1 plans (01-T2 creates remote-router.test.cjs, 02-T2 creates remote-ssh.test.cjs). Each Task 1 has an inline `node -e` verify that validates the production module independently before tests exist. Package install (`cd packages/dispatcher && npm install node-ssh`) is handled in Plan 02 Task 1.

Existing vitest infrastructure covers framework — no framework install needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end SSH dispatch to real remote host | RMT-01 | Requires actual SSH server with Claude CLI installed | 1. Configure `dispatch.remote` in config.json with real host 2. Run `/gsd:execute-phase 146 --auto` 3. Verify session completes on remote and results merge back |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (inline node -e for T1, vitest for T2)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 handled via in-wave TDD Task-2 pattern + inline verify on Task 1
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-26
