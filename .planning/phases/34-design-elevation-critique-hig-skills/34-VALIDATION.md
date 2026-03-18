---
phase: 34
slug: design-elevation-critique-hig-skills
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash grep tests (same as Phase 33) |
| **Config file** | none — tests are standalone .sh scripts |
| **Quick run command** | `bash .planning/phases/34-design-elevation-critique-hig-skills/test_crit01_awwwards.sh` |
| **Full suite command** | `for f in .planning/phases/34-design-elevation-critique-hig-skills/test_*.sh; do bash "$f"; done` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run the test scripts for the requirement being addressed
- **After every plan wave:** Run `for f in .planning/phases/34-design-elevation-critique-hig-skills/test_*.sh; do bash "$f"; done`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 0 | CRIT-01 | grep unit | `bash test_crit01_awwwards.sh` | ❌ W0 | ⬜ pending |
| 34-01-02 | 01 | 0 | CRIT-02 | grep unit | `bash test_crit02_ai_aesthetic.sh` | ❌ W0 | ⬜ pending |
| 34-01-03 | 01 | 0 | CRIT-03 | grep unit | `bash test_crit03_motion.sh` | ❌ W0 | ⬜ pending |
| 34-01-04 | 01 | 0 | CRIT-04 | grep unit | `bash test_crit04_typography.sh` | ❌ W0 | ⬜ pending |
| 34-01-05 | 01 | 0 | HIG-01 | grep unit | `bash test_hig01_motion_a11y.sh` | ❌ W0 | ⬜ pending |
| 34-01-06 | 01 | 0 | HIG-02 | grep unit | `bash test_hig02_performance.sh` | ❌ W0 | ⬜ pending |
| 34-01-07 | 01 | 0 | HIG-03 | grep unit | `bash test_hig03_touch_target.sh` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test_crit01_awwwards.sh` — stubs for CRIT-01 (Awwwards dimension mapping)
- [ ] `test_crit02_ai_aesthetic.sh` — stubs for CRIT-02 (AI aesthetic pattern detection)
- [ ] `test_crit03_motion.sh` — stubs for CRIT-03 (motion choreography assessment)
- [ ] `test_crit04_typography.sh` — stubs for CRIT-04 (typography pairing assessment)
- [ ] `test_hig01_motion_a11y.sh` — stubs for HIG-01 (motion accessibility audit)
- [ ] `test_hig02_performance.sh` — stubs for HIG-02 (animation performance check)
- [ ] `test_hig03_touch_target.sh` — stubs for HIG-03 (touch target motion state)

All 7 test scripts are Wave 0 deliverables — created before skill file edits, following Phase 33 pattern.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Critique output quality with real artifact | CRIT-01–04 | Requires running `/pde:critique` against a wireframe | Run critique on Phase 33 wireframe output, verify dimension mapping in output |
| HIG output quality with real artifact | HIG-01–03 | Requires running `/pde:hig` against a wireframe | Run HIG on Phase 33 wireframe output, verify motion audit in output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
