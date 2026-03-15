---
phase: 4
slug: workflow-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework; inline smoke tests via pde-tools CLI |
| **Config file** | none |
| **Quick run command** | `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state json` |
| **Full suite command** | Manual verification per plan (pde-tools smoke tests + git log checks) |
| **Estimated runtime** | ~10 seconds per plan |

---

## Sampling Rate

- **After every task commit:** Run `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state json` — verify frontmatter current
- **After every plan wave:** Run `pde-tools roadmap analyze` + `git log --oneline` — full checklist
- **Before `/pde:verify-work`:** All 6 WORK requirements have green smoke tests
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | WORK-01, WORK-02 | smoke | `pde-tools state json` after write + simulated reset | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | WORK-03 | smoke | Edit ROADMAP.md, run `roadmap analyze`, verify edit read | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | WORK-04 | smoke | `state advance-plan`, `state update-progress`, verify frontmatter | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | WORK-04 | smoke | `state record-session`, `state json` → compare fields | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | WORK-05 | smoke | `phase complete` test → grep REQUIREMENTS.md for status change | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 1 | WORK-06 | smoke | `git log --oneline --grep="04-0"` → verify commit format | ❌ W0 | ⬜ pending |
| 04-04-02 | 04 | 1 | WORK-06 | smoke | Check Co-Authored-By trailer in commit messages | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Inline verification commands in each PLAN.md task — no standalone test scripts needed
- [ ] All verification uses pde-tools CLI commands (state json, roadmap analyze, phase complete)
- [ ] Git log verification uses `git log --format="%B" --grep` patterns

*Existing pde-tools infrastructure covers all phase requirements. No framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full discuss→plan→execute→verify cycle without state loss | WORK-01 | Requires multi-step workflow across context resets | Run each workflow step, `/clear` between steps, verify STATE.md reflects all steps |
| ROADMAP.md user edit round-trip | WORK-03 | Requires manual user edit simulation | Edit ROADMAP.md body, run `roadmap analyze`, confirm edit is reflected |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
