---
phase: 36
slug: design-elevation-handoff-flows-cross-cutting
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bash grep scripts (established pattern from phases 29-35) |
| **Config file** | None — standalone shell scripts |
| **Quick run command** | `bash .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_hand01_motion_spec.sh` |
| **Full suite command** | `for f in .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_hand*.sh .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_flow*.sh .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_cross*.sh; do bash "$f"; done` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_hand01_motion_spec.sh`
- **After every plan wave:** Run full suite (all `test_hand*.sh`, `test_flow*.sh`, `test_cross*.sh`)
- **Before `/gsd:verify-work`:** Full suite must be green + manual CROSS-02 delta documented
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 1 | HAND-01 | unit/grep | `bash test_hand01_motion_spec.sh` | ❌ W0 | ⬜ pending |
| 36-01-02 | 01 | 1 | HAND-02 | unit/grep | `bash test_hand02_impl_notes.sh` | ❌ W0 | ⬜ pending |
| 36-01-03 | 01 | 1 | FLOW-01 | unit/grep | `bash test_flow01_transitions.sh` | ❌ W0 | ⬜ pending |
| 36-01-04 | 01 | 1 | CROSS-01 | unit/grep | `bash test_cross01_includes.sh` | ❌ W0 | ⬜ pending |
| 36-01-05 | 01 | 1 | CROSS-02 | manual | Run `/pde:audit` before+after | N/A | ⬜ pending |
| 36-01-06 | 01 | 1 | ORDER-01 | manual | Review VERIFICATION.md | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test_hand01_motion_spec.sh` — stubs for HAND-01 (5 checks: motionTrigger, motionDuration, motionEasing, respectReducedMotion, motion-design include)
- [ ] `test_hand02_impl_notes.sh` — stubs for HAND-02 (3 checks: Implementation Notes section, VISUAL-HOOK ref, Recommended Approach column)
- [ ] `test_flow01_transitions.sh` — stubs for FLOW-01 (2 checks: transition vocabulary, transition annotation instruction)
- [ ] `test_cross01_includes.sh` — stubs for CROSS-01 (7 checks: one per skill file for `@references/` in required_reading)

*All tests use established `PASS=$((PASS+1))` pattern (not `((PASS++))`) per Phase 32 documentation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audit delta measurement | CROSS-02 | Requires running `/pde:audit` before+after and comparing severity/count | 1. Run `/pde:audit --save-baseline` before edits 2. Complete all elevations 3. Run `/pde:audit` again 4. Compare findings count in elevated skill areas |
| Dependency order documentation | ORDER-01 | Documentation/reference fact, not code behavior | Review VERIFICATION.md for ORDER-01 evidence that phase dependencies are documented |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
