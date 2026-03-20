---
phase: 54
slug: tech-debt-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 54 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner + shell assertions |
| **Config file** | none — shell-based verification |
| **Quick run command** | `node bin/pde-tools.cjs help 2>&1 | head -20` |
| **Full suite command** | `bash -c 'node bin/pde-tools.cjs help && grep -q one-liner templates/SUMMARY.md'` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick verification command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 54-01-01 | 01 | 1 | DEBT-01 | manual | `claude plugin install` test | N/A | ⬜ pending |
| 54-01-02 | 01 | 1 | DEBT-02 | grep | `grep -r TRACKING-PLAN lib/ui/` | ✅ | ⬜ pending |
| 54-01-03 | 01 | 1 | DEBT-03 | grep | `grep -rn 'lock-release' workflows/` | ✅ | ⬜ pending |
| 54-01-04 | 01 | 1 | DEBT-04 | grep | `grep -c 'cmdLockRelease' workflows/*.md` | ✅ | ⬜ pending |
| 54-01-05 | 01 | 1 | DEBT-05 | grep | `grep 'one-liner' templates/SUMMARY.md` | ✅ | ⬜ pending |
| 54-01-06 | 01 | 1 | DEBT-06 | grep | `grep 'one-liner' .planning/milestones/v0.6-phases/*/SUMMARY.md` | ✅ | ⬜ pending |
| 54-01-07 | 01 | 1 | DEBT-07 | grep | `node bin/pde-tools.cjs help 2>&1 \| grep -E 'manifest\|readiness\|tracking'` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plugin install from GitHub | DEBT-01 | Requires `claude` CLI + network access | Run `claude plugin install` from repo root, observe result |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
