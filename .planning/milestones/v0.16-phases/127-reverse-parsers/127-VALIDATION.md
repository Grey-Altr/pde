---
phase: 127
slug: reverse-parsers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 127 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node.js 20+) |
| **Config file** | none — uses existing pattern from Phase 126 |
| **Quick run command** | `node --test tests/phase-127/test-reverse-parsers.cjs` |
| **Full suite command** | `node --test tests/phase-127/test-reverse-parsers.cjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-127/test-reverse-parsers.cjs`
- **After every plan wave:** Run `node --test tests/phase-127/test-reverse-parsers.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 127-01-01 | 01 | 1 | CUR-01, CUR-02 | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ W0 | ⬜ pending |
| 127-02-01 | 02 | 1 | AGR-01 | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ W0 | ⬜ pending |
| 127-03-01 | 03 | 1 | AGR-02 | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-127/test-reverse-parsers.cjs` — test scaffold with makeTmpDir/makePlanningDir helpers (reuse Phase 126 pattern)
- [ ] Synthetic .mdc, SKILL.md, DESIGN.md fixtures generated in test setup

*Existing Phase 126 test infrastructure provides the pattern.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
