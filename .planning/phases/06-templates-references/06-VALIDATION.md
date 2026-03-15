---
phase: 06
slug: templates-references
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash/grep (string matching audit) |
| **Config file** | none — grep-based verification |
| **Quick run command** | `grep -rni "gsd\|get-shit-done" templates/ references/ \| grep -v ".planning"` |
| **Full suite command** | `grep -rni "gsd\|get-shit-done" templates/ references/ lib/ui/ \| grep -v ".planning"` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick grep command
- **After every plan wave:** Run full suite command
- **Before `/pde:verify-work`:** Full suite must return zero matches
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | TOOL-03 | grep audit | `grep -rnic "gsd\|get-shit-done" templates/ \| grep -v ":0$"` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 1 | TOOL-04 | grep audit | `grep -rnic "gsd\|get-shit-done" references/ \| grep -v ":0$"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — grep is built-in, no framework installation needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fresh project produces zero GSD strings | TOOL-03, TOOL-04 | Requires interactive /pde:new-project session | Run /pde:new-project in test dir, grep .planning/ for GSD strings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
