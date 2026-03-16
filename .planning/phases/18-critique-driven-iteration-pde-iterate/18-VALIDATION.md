---
phase: 18
slug: critique-driven-iteration-pde-iterate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | grep / bash assertions (skill file validation) |
| **Config file** | none — skill files are markdown, validated structurally |
| **Quick run command** | `grep -c "Step 1/7" workflows/iterate.md` |
| **Full suite command** | `bash -c 'test -f workflows/iterate.md && test -f commands/iterate.md && echo PASS || echo FAIL'` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick validation command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | ITR-01 | structural | `grep -c "WFR-.*-v" workflows/iterate.md` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | ITR-01 | structural | `grep -c "ITR-changelog" workflows/iterate.md` | ❌ W0 | ⬜ pending |
| 18-01-03 | 01 | 1 | ITR-02 | structural | `grep -c "convergence" workflows/iterate.md` | ❌ W0 | ⬜ pending |
| 18-01-04 | 01 | 1 | ITR-02 | structural | `grep -c "handoff" workflows/iterate.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Skill file structure validated against existing patterns (e.g., critique.md, wireframe.md)
- [ ] Template file structure validated against templates/ directory conventions

*Existing infrastructure covers framework requirements — skills are markdown-based.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Versioned wireframe quality | ITR-01 | LLM output quality requires human judgment | Run `/pde:iterate` on a sample wireframe after critique and verify v2 HTML is correct |
| Convergence checklist accuracy | ITR-02 | Handoff readiness judgment | Run 3+ iteration cycles and verify convergence checklist surfaces correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
