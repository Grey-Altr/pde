---
phase: 85
slug: brief-extensions-detection
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-22
updated: 2026-03-22
---

# Phase 85 — Validation Strategy

> Per-phase validation contract. Updated after phase completion by Nyquist auditor.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | None — runs directly with node --test |
| **Quick run command** | `node --test .planning/phases/85-brief-extensions-detection/tests/*.cjs` |
| **Full suite command** | `node --test .planning/phases/85-brief-extensions-detection/tests/*.cjs` |
| **Estimated runtime** | ~50ms |

---

## Sampling Rate

- **After every task commit:** `node --test .planning/phases/85-brief-extensions-detection/tests/*.cjs`
- **After every plan wave:** Same command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** <1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 85-01-T1 | 01 | 1 | BRIEF-01, BRIEF-02, BRIEF-05, BRIEF-07 | structural | `node --test .planning/phases/85-brief-extensions-detection/tests/test-brief-detection.cjs` | ✅ | ✅ green |
| 85-01-T2 | 01 | 1 | BRIEF-01, BRIEF-02, BRIEF-05, BRIEF-07 | structural | `node --test .planning/phases/85-brief-extensions-detection/tests/test-brief-detection.cjs` | ✅ | ✅ green |
| 85-02-T1 | 02 | 2 | BRIEF-03, BRIEF-04, BRIEF-06 | structural | `node --test .planning/phases/85-brief-extensions-detection/tests/test-brief-artifacts.cjs` | ✅ | ✅ green |
| 85-02-T2 | 02 | 2 | BRIEF-03, BRIEF-04, BRIEF-06 | structural | `node --test .planning/phases/85-brief-extensions-detection/tests/test-brief-artifacts.cjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirements Coverage

| Requirement | Covered By | Test File | Tests | Status |
|-------------|------------|-----------|-------|--------|
| BRIEF-01 | `describe('BRIEF-01: Business intent detection')` | test-brief-detection.cjs | 5 | ✅ green |
| BRIEF-02 | `describe('BRIEF-02: Track selection')` | test-brief-detection.cjs | 4 | ✅ green |
| BRIEF-03 | `describe('BRIEF-03: BTH artifact generation')` | test-brief-artifacts.cjs | 7 | ✅ green |
| BRIEF-04 | `describe('BRIEF-04: LCV artifact generation')` | test-brief-artifacts.cjs | 7 | ✅ green |
| BRIEF-05 | `describe('BRIEF-05: Domain Strategy section')` | test-brief-detection.cjs | 5 | ✅ green |
| BRIEF-06 | `describe('BRIEF-06: 20-field designCoverage write')` | test-brief-artifacts.cjs | 4 | ✅ green |
| BRIEF-07 | `describe('BRIEF-07: Financial placeholder enforcement')` | test-brief-detection.cjs | 3 | ✅ green |

**Total: 35 tests, 0 failures, 7/7 requirements covered.**

---

## Test Files

| File | Lines | Tests | Requirements |
|------|-------|-------|--------------|
| `.planning/phases/85-brief-extensions-detection/tests/test-brief-detection.cjs` | 225 | 17 | BRIEF-01, BRIEF-02, BRIEF-05, BRIEF-07 |
| `.planning/phases/85-brief-extensions-detection/tests/test-brief-artifacts.cjs` | 247 | 18 | BRIEF-03, BRIEF-04, BRIEF-06 |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Track selection prompt appears | BRIEF-02 | Interactive user input cannot be automated | Run `/pde:brief` on a business project, verify 3-option prompt appears |
| BTH content quality | BRIEF-03 | Subjective content assessment | Review generated BTH for coherent problem/solution/market/unfair-advantage |
| LCV hypothesis marking | BRIEF-04 | Content quality check | Verify each of 9 boxes has validated/assumed/unknown status |
| Financial placeholder enforcement at runtime | BRIEF-07 | Template passes; only runtime confirms generated artifact is free of dollar amounts | Run `/pde:brief` on a business project; inspect BTH and LCV artifacts for absence of `$[digit]` patterns |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] All 7 BRIEF requirements have test coverage
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete — verified 2026-03-22 by Nyquist auditor (35/35 tests green)
