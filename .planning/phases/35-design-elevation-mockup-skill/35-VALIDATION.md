---
phase: 35
slug: design-elevation-mockup-skill
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bash grep/awk scripts (project standard from phases 29-34) |
| **Config file** | none — scripts are standalone |
| **Quick run command** | `bash .planning/phases/35-design-elevation-mockup-skill/test_mock0N.sh` |
| **Full suite command** | `for f in .planning/phases/35-design-elevation-mockup-skill/test_mock*.sh; do bash "$f"; done` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick grep against `workflows/mockup.md` for the specific requirement
- **After every plan wave:** Run `for f in .planning/phases/35-design-elevation-mockup-skill/test_mock*.sh; do bash "$f"; done`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 0 | MOCK-01 | unit/grep | `grep -c 'cubic-bezier(0.34, 1.56' workflows/mockup.md` | ❌ W0 | ⬜ pending |
| 35-01-02 | 01 | 0 | MOCK-01 | unit/grep | `grep -c 'ease-spring' workflows/mockup.md` | ❌ W0 | ⬜ pending |
| 35-01-03 | 01 | 0 | MOCK-02 | unit/grep | `grep -c '@supports.*animation-timeline' workflows/mockup.md` | ❌ W0 | ⬜ pending |
| 35-01-04 | 01 | 0 | MOCK-02 | unit/grep | see test_mock02.sh | ❌ W0 | ⬜ pending |
| 35-01-05 | 01 | 0 | MOCK-03 | unit/grep | `grep -cE 'aria-busy\|aria-disabled\|aria-invalid' workflows/mockup.md` | ❌ W0 | ⬜ pending |
| 35-01-06 | 01 | 0 | MOCK-04 | unit/grep | `grep -ci 'narrative\|reading order\|stagger.*start' workflows/mockup.md` | ❌ W0 | ⬜ pending |
| 35-01-07 | 01 | 0 | MOCK-05 | unit/grep | `grep -c 'font-variation-settings' workflows/mockup.md` | ❌ W0 | ⬜ pending |
| 35-01-08 | 01 | 0 | MOCK-06 | unit/grep | `grep -c 'VISUAL-HOOK' workflows/mockup.md` | ❌ W0 | ⬜ pending |
| 35-01-09 | 01 | 0 | MOCK-07 | unit/grep | `grep -ci 'will-change\|GPU\|composited' workflows/mockup.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test_mock01_spring_physics.sh` — stubs for MOCK-01
- [ ] `test_mock02_scroll_driven.sh` — stubs for MOCK-02
- [ ] `test_mock03_interaction_states.sh` — stubs for MOCK-03
- [ ] `test_mock04_narrative_entrance.sh` — stubs for MOCK-04
- [ ] `test_mock05_variable_fonts.sh` — stubs for MOCK-05
- [ ] `test_mock06_visual_hook.sh` — stubs for MOCK-06
- [ ] `test_mock07_performance.sh` — stubs for MOCK-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual quality of spring physics animation | MOCK-01 | Visual assessment of animation feel | Open mockup HTML, interact with buttons, verify spring overshoot |
| Scroll-driven animation timing | MOCK-02 | Requires scrolling interaction | Open mockup HTML, scroll through content, verify progressive reveal |
| 7-state visual distinctness | MOCK-03 | Visual differentiation assessment | Inspect each state, verify unique visual treatment |
| Narrative entrance ordering | MOCK-04 | Temporal ordering assessment | Load page, observe entrance sequence matches reading order |
| Variable font visual quality | MOCK-05 | Typography aesthetic assessment | Hover elements, verify weight/width transitions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
