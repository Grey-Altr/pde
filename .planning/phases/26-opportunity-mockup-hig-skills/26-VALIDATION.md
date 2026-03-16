---
phase: 26
slug: opportunity-mockup-hig-skills
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PDE `/pde:test` (skill lint + smoke tests) |
| **Config file** | none — tests defined in `references/tooling-patterns.md` and executed by `/pde:test` |
| **Quick run command** | `/pde:test opportunity,mockup,hig --lint` |
| **Full suite command** | `/pde:test opportunity,mockup,hig` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `/pde:test opportunity,mockup,hig --lint` (lint validation only, fast)
- **After every plan wave:** Run `/pde:test opportunity,mockup,hig` (lint + smoke)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | OPP-01 | smoke | `/pde:test opportunity` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | OPP-02 | smoke | `/pde:test opportunity` with mock input | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | OPP-03 | smoke | `/pde:test opportunity` + section check | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 1 | MOCK-01 | smoke | `/pde:test mockup` | ❌ W0 | ⬜ pending |
| 26-02-02 | 02 | 1 | MOCK-02 | smoke | `/pde:test mockup` + HTML grep | ❌ W0 | ⬜ pending |
| 26-02-03 | 02 | 1 | MOCK-03 | smoke | `/pde:test mockup` + comment grep | ❌ W0 | ⬜ pending |
| 26-03-01 | 03 | 2 | HIG-01 | smoke | `/pde:test hig` | ❌ W0 | ⬜ pending |
| 26-03-02 | 03 | 2 | HIG-02 | integration | Manual — compare critique + HIG output | Manual | ⬜ pending |
| 26-03-03 | 03 | 2 | HIG-03 | smoke | `/pde:test hig` + severity field check | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `workflows/opportunity.md` — full workflow to be built (covers OPP-01, OPP-02, OPP-03)
- [ ] `workflows/mockup.md` — full workflow to be built (covers MOCK-01, MOCK-02, MOCK-03)
- [ ] `workflows/hig.md` — full workflow to be built (covers HIG-01, HIG-02, HIG-03)
- [ ] `commands/opportunity.md` — update stub to `@workflows/opportunity.md` delegation
- [ ] `commands/mockup.md` — update stub to `@workflows/mockup.md` delegation
- [ ] `commands/hig.md` — update stub to `@workflows/hig.md` delegation
- [ ] `workflows/critique.md` — update Perspective 3 to delegate to `/pde:hig --light`
- [ ] `skill-registry.md` — create at project root with all 13 current skill codes (covers LINT-010)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/pde:critique` delegates Accessibility to `/pde:hig --light` | HIG-02 | Integration between two skills requires running both and comparing output severity ratings | 1. Run `/pde:critique` on a test artifact. 2. Run `/pde:hig` standalone on same artifact. 3. Verify severity ratings for identical issues match between both outputs. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
