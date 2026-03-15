---
phase: 7
slug: rebranding-completeness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — grep-based bash validation (no test runner) |
| **Config file** | none |
| **Quick run command** | `grep -rni "gsd" bin/ lib/ commands/ workflows/ templates/ references/ 2>/dev/null \| wc -l` (expect: `0`) |
| **Full suite command** | Run all four audit greps from Per-Task Verification Map; all must return `0` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `grep -rni "gsd" bin/ lib/ commands/ workflows/ templates/ references/ 2>/dev/null | wc -l` (expect: `0`)
- **After every plan wave:** Run full suite — all six audit commands from Per-Task Verification Map
- **Before `/pde:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | BRAND-01, BRAND-02 | smoke | `grep -rni "gsd\|get-shit-done" bin/ lib/ commands/ workflows/ templates/ references/ .claude-plugin/ 2>/dev/null \| wc -l` (expect: `0`) | N/A — bash | ⬜ pending |
| 07-01-02 | 01 | 1 | PLUG-04 | smoke | `grep -rn "/gsd:" bin/ lib/ commands/ workflows/ 2>/dev/null \| wc -l` (expect: `0`) | N/A — bash | ⬜ pending |
| 07-01-03 | 01 | 1 | BRAND-03 | smoke | `grep -rn "\.gsd\|/\.gsd" bin/ lib/ commands/ workflows/ templates/ references/ 2>/dev/null \| wc -l` (expect: `0`) | N/A — bash | ⬜ pending |
| 07-02-01 | 02 | 1 | BRAND-03 | smoke | `grep -rni "greyaltaer" bin/ lib/ commands/ workflows/ templates/ references/ 2>/dev/null \| wc -l` (expect: `0`) | N/A — bash | ⬜ pending |
| 07-03-01 | 03 | 1 | BRAND-04 | smoke | `grep -rn "banner.*GSD" workflows/ 2>/dev/null \| wc -l` (expect: `0`) | N/A — bash | ⬜ pending |
| 07-03-02 | 03 | 1 | BRAND-05 | smoke | `grep "Platform Development Engine" lib/ui/splash.cjs` (expect: match found) | N/A — bash | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

No test files or frameworks needed — all validation is bash grep commands runnable immediately from the project root.

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

Every success criterion is expressible as a grep command with a deterministic expected result.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
