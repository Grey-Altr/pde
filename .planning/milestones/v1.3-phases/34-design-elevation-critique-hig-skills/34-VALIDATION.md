---
phase: 34
slug: design-elevation-critique-hig-skills
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-17
updated: 2026-03-18
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
| 34-01-01 | 01 | 0 | CRIT-01 | grep unit | `bash test_crit01_awwwards.sh` | ✓ | ✅ green (7/7) |
| 34-01-02 | 01 | 0 | CRIT-02 | grep unit | `bash test_crit02_ai_aesthetic.sh` | ✓ | ✅ green (6/6) |
| 34-01-03 | 01 | 0 | CRIT-03 | grep unit | `bash test_crit03_motion.sh` | ✓ | ✅ green (6/6) |
| 34-01-04 | 01 | 0 | CRIT-04 | grep unit | `bash test_crit04_typography.sh` | ✓ | ✅ green (5/5) |
| 34-01-05 | 01 | 0 | HIG-01 | grep unit | `bash test_hig01_motion_a11y.sh` | ✓ | ✅ green (8/8) |
| 34-01-06 | 01 | 0 | HIG-02 | grep unit | `bash test_hig02_performance.sh` | ✓ | ✅ green (6/6) |
| 34-01-07 | 01 | 0 | HIG-03 | grep unit | `bash test_hig03_touch_target.sh` | ✓ | ✅ green (5/5) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `test_crit01_awwwards.sh` — CRIT-01 (Awwwards dimension mapping) — 7 checks
- [x] `test_crit02_ai_aesthetic.sh` — CRIT-02 (AI aesthetic pattern detection) — 6 checks
- [x] `test_crit03_motion.sh` — CRIT-03 (motion choreography assessment) — 6 checks
- [x] `test_crit04_typography.sh` — CRIT-04 (typography pairing assessment) — 5 checks
- [x] `test_hig01_motion_a11y.sh` — HIG-01 (motion accessibility audit) — 8 checks
- [x] `test_hig02_performance.sh` — HIG-02 (animation performance check) — 6 checks
- [x] `test_hig03_touch_target.sh` — HIG-03 (touch target motion state) — 5 checks

All 7 test scripts delivered as Wave 0 — created before skill file edits, following Phase 33 pattern.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Critique output quality with real artifact | CRIT-01–04 | Requires running `/pde:critique` against a wireframe | Run critique on Phase 33 wireframe output, verify dimension mapping in output |
| HIG output quality with real artifact | HIG-01–03 | Requires running `/pde:hig` against a wireframe | Run HIG on Phase 33 wireframe output, verify motion audit in output |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✓ approved (2026-03-18)

---

## Validation Audit 2026-03-18

| Metric | Count |
|--------|-------|
| Requirements | 7 |
| Automated tests | 7 |
| Total checks | 43 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Manual-only | 2 (runtime output quality — by design) |
