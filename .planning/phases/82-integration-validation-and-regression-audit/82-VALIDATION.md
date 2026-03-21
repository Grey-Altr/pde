---
phase: 82
slug: integration-validation-and-regression-audit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 82 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` (v18+) |
| **Config file** | None — standalone `.mjs` files |
| **Quick run command** | `node --test tests/phase-82/regression-matrix.test.mjs` |
| **Full suite command** | `node --test tests/phase-64/*.mjs tests/phase-74/*.mjs tests/phase-79/*.mjs tests/phase-80/*.mjs tests/phase-81/*.mjs tests/phase-82/*.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-64/*.mjs tests/phase-82/*.mjs`
- **After every plan wave:** Run `node --test tests/phase-64/*.mjs tests/phase-74/*.mjs tests/phase-79/*.mjs tests/phase-80/*.mjs tests/phase-81/*.mjs tests/phase-82/*.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 82-01-01 | 01 | 1 | SC-1 (Phase 64 fix) | structural | `node --test tests/phase-64/manifest-schema.test.mjs` | Yes | pending |
| 82-01-02 | 01 | 1 | SC-1 (Phase 64 fix) | structural | `node --test tests/phase-64/workflow-pass-through.test.mjs` | Yes | pending |
| 82-01-03 | 01 | 1 | SC-1, SC-3, SC-4 | structural | `node --test tests/phase-82/regression-matrix.test.mjs` | No (W0) | pending |
| 82-02-01 | 02 | 2 | SC-2 | structural | `node --test tests/phase-82/milestone-completion.test.mjs` | No (W0) | pending |
| 82-02-02 | 02 | 2 | SC-3 | git assertion | `git diff --diff-filter=A v0.10..HEAD --name-only \| grep workflows/` | N/A | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-82/regression-matrix.test.mjs` — cross-type regression matrix, skill registry, no-new-workflow-files assertions (SC-1, SC-3, SC-4)
- [ ] `tests/phase-82/milestone-completion.test.mjs` — milestone state audit with todo() markers for phases 75-78 (SC-2)

*Existing infrastructure (phase-64, phase-74, phase-79, phase-80, phase-81 test suites) covers baseline regression assertions.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
