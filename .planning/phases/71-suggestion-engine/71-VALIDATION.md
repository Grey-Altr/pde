---
phase: 71
slug: suggestion-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 71 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:assert` + manual test runner (Phase 70 pattern) |
| **Config file** | none — no framework config needed |
| **Quick run command** | `node hooks/tests/verify-phase-71.cjs` |
| **Full suite command** | `node hooks/tests/verify-phase-71.cjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node hooks/tests/verify-phase-71.cjs`
- **After every plan wave:** Run `node hooks/tests/verify-phase-71.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 71-01-01 | 01 | 1 | ENGN-01 | unit | `node hooks/tests/verify-phase-71.cjs` | ❌ W0 | ⬜ pending |
| 71-01-02 | 01 | 1 | ENGN-02 | integration | `node hooks/tests/verify-phase-71.cjs` | ❌ W0 | ⬜ pending |
| 71-01-03 | 01 | 1 | ENGN-03 | unit | `node hooks/tests/verify-phase-71.cjs` | ❌ W0 | ⬜ pending |
| 71-01-04 | 01 | 1 | ENGN-04 | unit | `node hooks/tests/verify-phase-71.cjs` | ❌ W0 | ⬜ pending |
| 71-01-05 | 01 | 1 | ENGN-05 | unit | `node hooks/tests/verify-phase-71.cjs` | ❌ W0 | ⬜ pending |
| 71-01-06 | 01 | 1 | ENGN-06 | unit | `node hooks/tests/verify-phase-71.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `hooks/tests/verify-phase-71.cjs` — test file covering ENGN-01 through ENGN-06 with fixture-based unit tests
- [ ] Fixture data for STATE.md, ROADMAP.md, DESIGN-STATE.md, and design-manifest.json

*Existing infrastructure (Node.js assert, manual runner pattern from Phase 70) covers framework needs.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
