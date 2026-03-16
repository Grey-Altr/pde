---
phase: 26
slug: opportunity-mockup-hig-skills
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
validated: 2026-03-16
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
| 26-01-01 | 01 | 1 | OPP-01 | grep | `grep -q "<skill_code>OPP" workflows/opportunity.md && grep -q "RICE_base" workflows/opportunity.md` | ✅ | ✅ green |
| 26-01-02 | 01 | 1 | OPP-02 | grep | `grep -q "Reach.*Impact.*Confidence.*Effort" workflows/opportunity.md` | ✅ | ✅ green |
| 26-01-03 | 01 | 1 | OPP-03 | grep | `grep -q "Rank Change" workflows/opportunity.md && grep -q "Now/Next/Later" workflows/opportunity.md` | ✅ | ✅ green |
| 26-02-01 | 02 | 1 | MOCK-01 | grep | `grep -q "<purpose>" workflows/mockup.md && grep -q "pde-layout--hifi" workflows/mockup.md` | ✅ | ✅ green |
| 26-02-02 | 02 | 1 | MOCK-02 | grep | `grep -q "tokens.css" workflows/mockup.md && grep -q "focus-visible" workflows/mockup.md` | ✅ | ✅ green |
| 26-02-03 | 02 | 1 | MOCK-03 | grep | `grep -q "WIREFRAME-SOURCE" workflows/mockup.md && grep -q "WIREFRAME-ANNOTATION" workflows/mockup.md` | ✅ | ✅ green |
| 26-03-01 | 03 | 1 | HIG-01 | grep | `grep -q "POUR" workflows/hig.md && grep -q "2.4.11" workflows/hig.md && grep -q "2.5.8" workflows/hig.md` | ✅ | ✅ green |
| 26-03-02 | 03 | 1 | HIG-02 | grep+manual | `grep -q "workflows/hig.md" workflows/critique.md && grep -q "\-\-light" workflows/critique.md` | ✅ | ✅ green |
| 26-03-03 | 03 | 1 | HIG-03 | grep | `grep -q "LIGHT_MODE" workflows/hig.md && grep -q "critical.*major.*minor.*nit" workflows/hig.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `workflows/opportunity.md` — full workflow built (covers OPP-01, OPP-02, OPP-03)
- [x] `workflows/mockup.md` — full workflow built (covers MOCK-01, MOCK-02, MOCK-03)
- [x] `workflows/hig.md` — full workflow built (covers HIG-01, HIG-02, HIG-03)
- [x] `commands/opportunity.md` — stub updated to `@workflows/opportunity.md` delegation
- [x] `commands/mockup.md` — stub updated to `@workflows/mockup.md` delegation
- [x] `commands/hig.md` — stub updated to `@workflows/hig.md` delegation
- [x] `workflows/critique.md` — Perspective 3 delegates to `/pde:hig --light`
- [x] `skill-registry.md` — created at project root with all 13 skill codes (LINT-010)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/pde:critique` delegates Accessibility to `/pde:hig --light` | HIG-02 | Integration between two skills requires running both and comparing output severity ratings | 1. Run `/pde:critique` on a test artifact. 2. Run `/pde:hig` standalone on same artifact. 3. Verify severity ratings for identical issues match between both outputs. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-16

---

## Validation Audit 2026-03-16

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 9 requirements have automated grep-based verification. HIG-02 has additional manual integration verification documented in Manual-Only section. All automated checks pass green.
