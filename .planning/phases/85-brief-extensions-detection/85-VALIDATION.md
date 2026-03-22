---
phase: 85
slug: brief-extensions-detection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 85 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | tests/pde/business/run-tests.sh |
| **Quick run command** | `node --test tests/pde/business/*.test.mjs` |
| **Full suite command** | `bash tests/pde/business/run-tests.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/pde/business/*.test.mjs`
- **After every plan wave:** Run `bash tests/pde/business/run-tests.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 85-01-01 | 01 | 1 | BRIEF-01 | unit | `node --test tests/pde/business/brief-detection.test.mjs` | ❌ W0 | ⬜ pending |
| 85-01-02 | 01 | 1 | BRIEF-02 | unit | `node --test tests/pde/business/brief-track.test.mjs` | ❌ W0 | ⬜ pending |
| 85-02-01 | 02 | 1 | BRIEF-03, BRIEF-04 | unit | `node --test tests/pde/business/brief-bth.test.mjs` | ❌ W0 | ⬜ pending |
| 85-02-02 | 02 | 1 | BRIEF-05, BRIEF-06 | unit | `node --test tests/pde/business/brief-lcv.test.mjs` | ❌ W0 | ⬜ pending |
| 85-02-03 | 02 | 1 | BRIEF-07 | unit | `node --test tests/pde/business/brief-financial.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/pde/business/brief-detection.test.mjs` — stubs for BRIEF-01
- [ ] `tests/pde/business/brief-track.test.mjs` — stubs for BRIEF-02
- [ ] `tests/pde/business/brief-bth.test.mjs` — stubs for BRIEF-03, BRIEF-04
- [ ] `tests/pde/business/brief-lcv.test.mjs` — stubs for BRIEF-05, BRIEF-06
- [ ] `tests/pde/business/brief-financial.test.mjs` — stubs for BRIEF-07

*Existing test scaffold from Phase 84 provides run-tests.sh and directory structure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Track selection prompt appears | BRIEF-02 | AskUserQuestion cannot be automated | Run `/pde:brief` on business project, verify 3-option prompt appears |
| BTH content quality | BRIEF-04 | Subjective content assessment | Review generated BTH for coherent problem/solution/market/unfair-advantage |
| LCV hypothesis marking | BRIEF-06 | Content quality check | Verify each of 9 boxes has validated/assumed/unknown status |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
