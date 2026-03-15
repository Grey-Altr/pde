---
phase: 10
slug: fix-statemd-regressions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification via node CLI commands |
| **Config file** | none (no automated test framework configured) |
| **Quick run command** | `node bin/pde-tools.cjs state json` |
| **Full suite command** | `grep -n "gsd_state_version" ~/.claude/get-shit-done/bin/lib/state.cjs .planning/STATE.md` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node bin/pde-tools.cjs state json`
- **After every plan wave:** Run `grep -n "gsd_state_version" ~/.claude/get-shit-done/bin/lib/state.cjs .planning/STATE.md && node bin/pde-tools.cjs state json | grep percent`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | PLUG-04 | smoke | `node bin/pde-tools.cjs state json \| grep -c gsd_state_version` (expect 0) | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | BRAND-01 | smoke | `grep -n "gsd_state_version" ~/.claude/get-shit-done/bin/lib/state.cjs` (expect 0) | ✅ | ⬜ pending |
| 10-01-03 | 01 | 1 | WORK-04 | smoke | `node bin/pde-tools.cjs state json \| grep percent` (expect 100) | ✅ | ⬜ pending |
| 10-01-04 | 01 | 1 | WORK-04 | smoke | `grep "Phase: 4 of 8" .planning/STATE.md` (expect no match) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| State-writing code preserves pde_state_version on subsequent writes | WORK-04 | Requires triggering a state write then inspecting result | Run `node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" state record-session --stopped-at "test"`, then check frontmatter key |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
