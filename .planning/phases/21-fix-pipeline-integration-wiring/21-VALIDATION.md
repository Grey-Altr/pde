---
phase: 21
slug: fix-pipeline-integration-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bats + grep-based structural tests |
| **Config file** | tests/structural/ |
| **Quick run command** | `bats tests/structural/` |
| **Full suite command** | `bats tests/structural/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bats tests/structural/`
- **After every plan wave:** Run `bats tests/structural/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | ORC-01 | structural | `grep -q 'Skill' commands/build.md` | ✅ | ⬜ pending |
| 21-01-02 | 01 | 1 | ORC-03 | structural | `grep -c 'hasIterate' skills/system.md` | ✅ | ⬜ pending |
| 21-01-03 | 01 | 1 | ORC-03 | structural | `grep -c 'hasIterate' skills/flows.md` | ✅ | ⬜ pending |
| 21-01-04 | 01 | 1 | ORC-03 | structural | `grep -c 'hasIterate' skills/wireframe.md` | ✅ | ⬜ pending |
| 21-01-05 | 01 | 1 | ORC-03 | structural | `grep -c 'hasIterate' skills/critique.md` | ✅ | ⬜ pending |
| 21-01-06 | 01 | 1 | ORC-03 | structural | `grep 'hasIterate' templates/design-manifest.json` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Re-running upstream skill preserves hasIterate: true | ORC-03 | Requires runtime pipeline execution | Run `/pde:system` after `/pde:iterate`, verify manifest retains `hasIterate: true` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
