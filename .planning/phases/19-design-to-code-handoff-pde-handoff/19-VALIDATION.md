---
phase: 19
slug: design-to-code-handoff-pde-handoff
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + grep verification (skill-level integration tests) |
| **Config file** | none — skills validated via command output and file checks |
| **Quick run command** | `grep -l "handoff" .claude/skills/*.md` |
| **Full suite command** | `bash -c 'test -f .planning/design/handoff/HANDOFF-SPEC.md && echo PASS || echo FAIL'` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick verification commands
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | HND-01 | integration | `test -f .claude/skills/handoff/SKILL.md` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | HND-02 | integration | `grep -q "interface" .claude/skills/handoff/SKILL.md` | ❌ W0 | ⬜ pending |
| 19-01-03 | 01 | 1 | HND-03 | integration | `grep -q "STACK.md" .claude/skills/handoff/SKILL.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Handoff skill directory structure — if not yet created
- [ ] Design manifest schema — verify `design-manifest.json` has handoff fields

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TypeScript interface quality | HND-02 | Generated interfaces need human review for API ergonomics | Review generated interfaces against wireframe annotations |
| Stack alignment accuracy | HND-03 | Naming conventions require domain judgment | Compare generated prop names with project's existing component patterns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
