---
phase: 120
slug: artifact-formatting
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-23
completed: 2026-03-24
---

# Phase 120 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — uses node --test directly |
| **Quick run command** | `node --test tests/phase-120/test-artifact-format.cjs` |
| **Full suite command** | `node --test tests/phase-120/test-artifact-format.cjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-120/test-artifact-format.cjs`
- **After every plan wave:** Run `node --test tests/phase-120/test-artifact-format.cjs`
- **Before `/pde:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 120-01-01 | 01 | 1 | FMT-01 | unit | `node --test tests/phase-120/test-artifact-format.cjs` | yes | ✅ green |
| 120-01-02 | 01 | 1 | FMT-02 | unit | `node --test tests/phase-120/test-artifact-format.cjs` | yes | ✅ green |
| 120-01-03 | 01 | 1 | FMT-03 | unit | `node --test tests/phase-120/test-artifact-format.cjs` | yes | ✅ green |

*Status legend: pending · ✅ green · red · flaky*

---

## Wave 0 Requirements

- [x] `tests/phase-120/test-artifact-format.cjs` — stubs for FMT-01, FMT-02, FMT-03
- [x] `bin/lib/artifact-format.cjs` — module under test

*Existing node:test infrastructure from prior phases covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Generated Tailwind @theme block is valid CSS | FMT-02 | Syntax validation beyond regex | Paste into a .css file, run Tailwind build |
| Component stubs render in target framework | FMT-03 | Requires framework dev server | Create temp project, import stub, verify no errors |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** APPROVED
