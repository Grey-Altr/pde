---
phase: 185
slug: data-integrity-baseline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 185 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (nyquist_validation: true in config.json) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run grep smoke test for that specific requirement
- **After every plan wave:** All four grep smoke tests pass
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 185-01-01 | 01 | 1 | INT-01 | Smoke (grep) | `grep "🚧.*v0.22" .planning/ROADMAP.md \| wc -l` (expect 0) | N/A — grep command | ⬜ pending |
| 185-01-02 | 01 | 1 | INT-02 | Smoke (grep) | `grep "^- One-liner:" .planning/MILESTONES.md` (expect 0 in v0.19–v0.22 sections) | N/A — grep command | ⬜ pending |
| 185-01-03 | 01 | 1 | INT-03 | Smoke (grep) | `grep "EXT-0[1-9]\|EXT-10" .planning/milestones/v0.22-REQUIREMENTS.md` (all `[x]`) | N/A — grep command | ⬜ pending |
| 185-01-04 | 01 | 1 | INT-04 | Smoke (grep) | `grep "^status:" .planning/milestones/v0.22-phases/180-*/180-VERIFICATION.md` (expect `complete`) | N/A — grep command | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements (grep-based smoke tests, no new test files required).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MILESTONES.md one-liners are accurate descriptions | INT-02 | Semantic accuracy requires human judgment | Read each one-liner and verify it captures the milestone's key achievement |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
