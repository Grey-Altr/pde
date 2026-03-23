---
phase: 90
slug: critique-hig-extensions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 90 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + grep assertions (skill file testing) |
| **Config file** | none — inline test scripts |
| **Quick run command** | `bash tests/phase-90/test-critique-business.sh` |
| **Full suite command** | `bash tests/phase-90/run-all.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash tests/phase-90/test-critique-business.sh`
- **After every plan wave:** Run `bash tests/phase-90/run-all.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 90-01-01 | 01 | 1 | QUAL-01 | grep | `grep -c 'unit economics viability' skills/critique/SKILL.md` | ❌ W0 | ⬜ pending |
| 90-01-02 | 01 | 1 | QUAL-01 | grep | `grep -c 'GTM-ICP fit' skills/critique/SKILL.md` | ❌ W0 | ⬜ pending |
| 90-01-03 | 01 | 1 | QUAL-01 | grep | `grep -c 'pricing psychology' skills/critique/SKILL.md` | ❌ W0 | ⬜ pending |
| 90-01-04 | 01 | 1 | QUAL-01 | grep | `grep -c 'investor readiness' skills/critique/SKILL.md` | ❌ W0 | ⬜ pending |
| 90-01-05 | 01 | 1 | QUAL-02 | grep | `grep -c 'LCV.box3.UVP' skills/critique/SKILL.md` | ❌ W0 | ⬜ pending |
| 90-01-06 | 01 | 1 | QUAL-04 | grep | `grep -c 'critical\|major\|minor\|nit' skills/critique/SKILL.md` | ❌ W0 | ⬜ pending |
| 90-02-01 | 02 | 1 | QUAL-03 | grep | `grep -c 'business communications' skills/hig/SKILL.md` | ❌ W0 | ⬜ pending |
| 90-02-02 | 02 | 1 | QUAL-03 | grep | `grep -c 'pitch deck readability' skills/hig/SKILL.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-90/test-critique-business.sh` — stubs for QUAL-01, QUAL-02, QUAL-04
- [ ] `tests/phase-90/test-hig-business.sh` — stubs for QUAL-03
- [ ] `tests/phase-90/run-all.sh` — aggregator script

*Existing test infrastructure pattern from prior phases covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Composite score calculation with 8 perspectives | QUAL-01 | Requires running full critique pipeline | Run `/pde:critique` on a business-mode project, verify 8 perspectives scored |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
