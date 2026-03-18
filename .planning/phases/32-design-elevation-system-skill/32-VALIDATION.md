---
phase: 32
slug: design-elevation-system-skill
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bash test scripts (.sh pattern from Phases 29-31) |
| **Config file** | None — standalone shell scripts |
| **Quick run command** | `bash .planning/phases/32-design-elevation-system-skill/test_sys04_apca_guidance.sh` |
| **Full suite command** | `for f in .planning/phases/32-design-elevation-system-skill/test_sys*.sh; do bash "$f"; done` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash .planning/phases/32-design-elevation-system-skill/test_sys04_apca_guidance.sh`
- **After every plan wave:** Run `for f in .planning/phases/32-design-elevation-system-skill/test_sys*.sh; do bash "$f"; done`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 0 | SYS-01 | smoke | `bash .planning/phases/32-design-elevation-system-skill/test_sys01_motion_tokens.sh` | ❌ W0 | ⬜ pending |
| 32-01-02 | 01 | 0 | SYS-02 | smoke | `bash .planning/phases/32-design-elevation-system-skill/test_sys02_varfont_tokens.sh` | ❌ W0 | ⬜ pending |
| 32-01-03 | 01 | 0 | SYS-03 | smoke | `bash .planning/phases/32-design-elevation-system-skill/test_sys03_harmony_palettes.sh` | ❌ W0 | ⬜ pending |
| 32-01-04 | 01 | 0 | SYS-04 | smoke | `bash .planning/phases/32-design-elevation-system-skill/test_sys04_apca_guidance.sh` | ❌ W0 | ⬜ pending |
| 32-01-05 | 01 | 0 | SYS-05 | smoke | `bash .planning/phases/32-design-elevation-system-skill/test_sys05_density_spacing.sh` | ❌ W0 | ⬜ pending |
| 32-01-06 | 01 | 0 | SYS-06 | smoke | `bash .planning/phases/32-design-elevation-system-skill/test_sys06_type_pairings.sh` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test_sys01_motion_tokens.sh` — covers SYS-01 (duration scale, easing, delay tokens)
- [ ] `test_sys02_varfont_tokens.sh` — covers SYS-02 (variable font axis tokens)
- [ ] `test_sys03_harmony_palettes.sh` — covers SYS-03 (OKLCH harmony palettes)
- [ ] `test_sys04_apca_guidance.sh` — covers SYS-04 (APCA Lc guidance)
- [ ] `test_sys05_density_spacing.sh` — covers SYS-05 (density spacing)
- [ ] `test_sys06_type_pairings.sh` — covers SYS-06 (type pairing recommendations)
- [ ] `fixtures/SYS-tokens-fixture.json` — fixture token file for tests to validate against

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
