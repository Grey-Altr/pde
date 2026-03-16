---
phase: 17
slug: design-critique-pde-critique
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | grep / bash assertions (skill file validation) |
| **Config file** | none — skill files are markdown, validated structurally |
| **Quick run command** | `grep -c "severity:" .claude/skills/critique.md` |
| **Full suite command** | `bash -c 'test -f .claude/skills/critique.md && test -f .claude/commands/critique.md && echo PASS || echo FAIL'` |
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
| 17-01-01 | 01 | 1 | CRT-01 | structural | `grep -c "perspectives:" .claude/skills/critique.md` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | CRT-02 | structural | `grep -c "BLOCKED" .claude/skills/critique.md` | ❌ W0 | ⬜ pending |
| 17-01-03 | 01 | 1 | CRT-03 | structural | `grep -c "severity" .claude/skills/critique.md` | ❌ W0 | ⬜ pending |
| 17-01-04 | 01 | 1 | CRT-03 | structural | `grep -c "What Works" .claude/skills/critique.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Skill file structure validated against existing patterns (e.g., wireframe.md, flows.md)
- [ ] Template file structure validated against templates/ directory conventions

*Existing infrastructure covers framework requirements — skills are markdown-based.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Four-perspective review quality | CRT-01 | LLM output quality requires human judgment | Run `/pde:critique` on a sample wireframe and verify all 4 perspectives appear with substantive analysis |
| Block message clarity | CRT-02 | UX quality of error message | Invoke without brief/flows and verify recovery message is actionable |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
