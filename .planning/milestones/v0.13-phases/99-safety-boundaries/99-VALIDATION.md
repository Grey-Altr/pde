---
phase: 99
slug: safety-boundaries
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 99 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (vitest-compatible via existing test suite) |
| **Config file** | `tests/` directory (78 existing test files) |
| **Quick run command** | `node --experimental-vm-modules node_modules/.bin/jest --testPathPattern "tests/phase-99"` |
| **Full suite command** | `node --experimental-vm-modules node_modules/.bin/jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command (phase-99 tests only)
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 99-01-01 | 01 | 1 | SAFE-01 | structural | `test -f references/experiment-boundaries.md` | ❌ W0 | ⬜ pending |
| 99-01-02 | 01 | 1 | SAFE-02 | grep | `grep -l "LOCKED" workflows/*.md \| wc -l` | ❌ W0 | ⬜ pending |
| 99-01-03 | 01 | 1 | SAFE-03 | unit | `jest --testPathPattern "phase-99/protected-files"` | ❌ W0 | ⬜ pending |
| 99-01-04 | 01 | 1 | SAFE-04 | unit | `jest --testPathPattern "phase-99/rejection"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-99/boundary-markers.test.mjs` — stubs for SAFE-01, SAFE-02 (file existence and marker presence)
- [ ] `tests/phase-99/protected-files.test.mjs` — stubs for SAFE-03 (Nyquist/Awwwards in protected list)
- [ ] `tests/phase-99/rejection.test.mjs` — stubs for SAFE-04 (explicit rejection of locked file targeting)

*Existing test infrastructure (jest 29.x) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LOCKED/OPTIMIZABLE markers are semantically correct in workflows | SAFE-02 | Requires domain judgment on which sections are optimizable vs locked | Review 3 random workflow files, verify markers align with section purpose |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
