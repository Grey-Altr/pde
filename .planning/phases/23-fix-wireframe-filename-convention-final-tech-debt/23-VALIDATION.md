---
phase: 23
slug: fix-wireframe-filename-convention-final-tech-debt
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash grep assertions (no test runner — documentation-only changes) |
| **Config file** | none |
| **Quick run command** | `grep 'WFR-{slug}' workflows/wireframe.md \| wc -l` (expect 6) |
| **Full suite command** | `grep '{slug}\.html' workflows/wireframe.md \| wc -l` (expect 0 after fix) |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's specific grep verification (< 2 seconds)
- **After every plan wave:** Run full verification suite: all 5 grep commands
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | ITR-01, ITR-02 | structural | `grep 'WFR-{slug}' workflows/wireframe.md` (expect 6+ hits) | ✅ existing | ⬜ pending |
| 23-01-02 | 01 | 1 | SC-meta-1 | structural | `grep 'status: complete' .planning/phases/14-*/14-VALIDATION.md` | ✅ existing | ⬜ pending |
| 23-01-03 | 01 | 1 | SC-meta-2 | structural | `grep 'status: complete' .planning/phases/15.1-*/15.1-VALIDATION.md` | ✅ existing | ⬜ pending |
| 23-01-04 | 01 | 1 | SC-meta-3 | structural | `grep 'nyquist_compliant: true' .planning/phases/22-*/22-VALIDATION.md` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files, frameworks, or fixtures are needed.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
