---
phase: 75
slug: brief-extensions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 75 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x / vitest |
| **Config file** | vitest.config.ts or jest.config.js (project-dependent) |
| **Quick run command** | `npm test -- --grep "brief"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --grep "brief"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 75-01-01 | 01 | 1 | BREF-01 | unit | `npm test -- --grep "experience brief"` | ❌ W0 | ⬜ pending |
| 75-01-02 | 01 | 1 | BREF-02 | unit | `npm test -- --grep "brief fields"` | ❌ W0 | ⬜ pending |
| 75-01-03 | 01 | 1 | BREF-03 | unit | `npm test -- --grep "software brief"` | ❌ W0 | ⬜ pending |
| 75-01-04 | 01 | 1 | BREF-04 | unit | `npm test -- --grep "design-state"` | ❌ W0 | ⬜ pending |
| 75-01-05 | 01 | 1 | BREF-05 | unit | `npm test -- --grep "sub-type"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for BREF-01 through BREF-05 — experience brief field prompting and output
- [ ] Test stubs for software brief regression — byte-identical output check
- [ ] Test stubs for DESIGN-STATE.md Sub-type row population

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Interactive prompting flow | BREF-01 | Requires user interaction with AskUserQuestion | Run `/pde:brief` with experience product, verify all 5 fields are prompted |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
