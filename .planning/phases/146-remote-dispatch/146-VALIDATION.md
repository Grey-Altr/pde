---
phase: 146
slug: remote-dispatch
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 146-01-01 | 01 | 0 | RMT-01, RMT-02, RMT-03 | unit | `npx vitest run tests/dispatcher/remote-ssh.test.cjs` | ❌ W0 | ⬜ pending |
| 146-01-02 | 01 | 0 | RMT-04, RMT-05, RMT-06 | unit | `npx vitest run tests/dispatcher/remote-router.test.cjs` | ❌ W0 | ⬜ pending |
| 146-02-01 | 02 | 1 | RMT-01 | unit | `npx vitest run tests/dispatcher/remote-ssh.test.cjs` | ❌ W0 | ⬜ pending |
| 146-02-02 | 02 | 1 | RMT-02 | unit | `npx vitest run tests/dispatcher/remote-ssh.test.cjs` | ❌ W0 | ⬜ pending |
| 146-02-03 | 02 | 1 | RMT-03 | unit | `npx vitest run tests/dispatcher/remote-ssh.test.cjs` | ❌ W0 | ⬜ pending |
| 146-03-01 | 03 | 1 | RMT-04, RMT-05, RMT-06 | unit | `npx vitest run tests/dispatcher/remote-router.test.cjs` | ❌ W0 | ⬜ pending |
| 146-04-01 | 04 | 2 | RMT-01, RMT-04 | integration | `npx vitest run tests/dispatcher/ --reporter=verbose` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dispatcher/remote-ssh.test.cjs` — stubs for RMT-01, RMT-02, RMT-03 with mocked NodeSSH + mocked execFileSync
- [ ] `tests/dispatcher/remote-router.test.cjs` — stubs for RMT-04, RMT-05, RMT-06 routing decisions
- [ ] Package install: `cd packages/dispatcher && npm install node-ssh` — required before any SSH code

*Existing infrastructure covers vitest framework — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end SSH dispatch to real remote host | RMT-01 | Requires actual SSH server with Claude CLI installed | 1. Configure `dispatch.remote` in config.json with real host 2. Run `/gsd:execute-phase 146 --auto` 3. Verify session completes on remote and results merge back |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
