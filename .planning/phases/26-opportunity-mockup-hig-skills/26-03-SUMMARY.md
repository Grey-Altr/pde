---
phase: 26-opportunity-mockup-hig-skills
plan: "03"
subsystem: design-skills
tags: [hig, wcag, accessibility, critique, workflow]
dependency_graph:
  requires: []
  provides: [workflows/hig.md, commands/hig.md (updated), workflows/critique.md (Perspective 3 delegation)]
  affects: [critique pipeline, iterate pipeline, design review domain]
tech_stack:
  added: []
  patterns: [probe/use/degrade MCP pattern, --light delegation mode, 13-field coverage pass-through]
key_files:
  created:
    - workflows/hig.md
  modified:
    - commands/hig.md
    - workflows/critique.md
decisions:
  - "HIG skill uses --light flag for critique delegation -- 5 mandatory checks only, no artifact written"
  - "Axe MCP probe removed from critique Step 3 -- HIG workflow handles its own Axe probing"
  - "Critique Perspective 3 fallback preserved so critique works when hig.md is absent"
  - "Fidelity calibration for color contrast: lofi=nit, midfi=minor, hifi=major/critical"
  - "hasHigAudit is the canonical flag name (not hasHIG or hasHig)"
metrics:
  duration: "5 min"
  completed: "2026-03-16T21:59:06Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 26 Plan 03: HIG Skill and Critique Delegation Summary

**One-liner:** WCAG 2.2 AA + HIG audit workflow with --light delegation mode for critique integration, using probe/use/degrade Axe MCP pattern and fidelity-calibrated severity ratings.

---

## What Was Built

### Task 1: /pde:hig Command and Workflow

**commands/hig.md** — Replaced the "Planned — available in PDE v2" stub with a thin delegation wrapper:
- YAML frontmatter preserved exactly (name: pde:hig, description, allowed-tools)
- Process section now contains `@workflows/hig.md` + `@references/skill-style-guide.md`

**workflows/hig.md** — New full WCAG 2.2 AA + HIG audit workflow following the v1.2 canonical section order:

- `<purpose>`, `<skill_code>HIG</skill_code>`, `<skill_domain>review</skill_domain>`, `<context_routing>`, `<required_reading>`, `<flags>`, `<process>`, `<output>`

**Full mode pipeline (7 steps):**
1. Initialize design directories
2. Check prerequisites, detect fidelity (lofi/midfi/hifi), detect platform, determine version N
3. Probe MCP availability (Axe a11y MCP + Sequential Thinking MCP)
4. Execute WCAG + HIG audit — ~56 criteria organized by POUR principle, 5 mandatory checks, WCAG 2.2 new criteria, platform-specific HIG checks (web/iOS/Android), component-grouped findings
5. Write HIG-audit-v{N}.md artifact
6. Update review domain DESIGN-STATE
7. Update root DESIGN-STATE, manifest (7-call pattern), and designCoverage (hasHigAudit: true, 13-field pass-through)

**Light mode behavior:**
- Activated by `--light` flag
- Runs only 5 mandatory checks: color contrast (1.4.3), focus visibility (2.4.11), touch targets (2.5.8), form labels, heading hierarchy
- Outputs inline finding table in critique-compatible format: | Severity | Effort | Location | Issue | Suggestion | Reference |
- Applies fidelity calibration automatically
- Skips Steps 5-7 entirely — no artifact, no DESIGN-STATE, no manifest writes
- Tagged: `[HIG skill -- /pde:hig --light]`

**Severity scale** (matches critique exactly): `critical` / `major` / `minor` / `nit`

**Fidelity calibration for color contrast:**
- lofi: `nit` (placeholder colors — not real product colors)
- midfi: `minor` (placeholder colors still likely)
- hifi: `major` or `critical` (real product colors applied)

**Platform support:** `--platform {web|ios|android}`
- web: ARIA Tier 1-3 patterns, landmark regions, focus ring visibility
- ios: Apple HIG (Dynamic Type, .accessibilityLabel(), SF Symbols, VoiceOver, reduce motion)
- android: Material Design (content descriptions, touch ripple, elevation semantics, 48dp targets)

### Task 2: Critique Perspective 3 Delegation

**workflows/critique.md** — Updated Perspective 3 (Accessibility, weight 1.5x):

Replaced inline WCAG checklist logic with delegation pattern:

```
IF workflows/hig.md exists:
  Load @workflows/hig.md with --light
  Embed returned findings as Accessibility perspective findings
  Tag: [HIG skill -- /pde:hig --light]
ELSE (fallback):
  Fall back to manual WCAG checklist (5 checks, apply fidelity calibration)
  Tag: [Manual WCAG review -- install /pde:hig for enhanced accessibility audit]
```

Additional changes:
- Removed Axe MCP probe (Step 3b) from critique — HIG skill handles its own Axe probing
- Removed AXE_AVAILABLE variable from critique Step 3 flag logic
- Kept `--no-axe` documented in critique flags section (pass-through to HIG)
- Updated dry-run output, footer, and anti-patterns to reflect new delegation architecture
- Perspectives 1 (UX/Usability), 2 (Visual Hierarchy), and 4 (Business Alignment) unchanged

---

## Decisions Made

1. **--light flag as delegation contract** — HIG --light is designed as a composable sub-skill. It runs exactly 5 checks, outputs in critique's exact table format, and writes no files. This makes it safe to invoke from within critique without side effects.

2. **Axe MCP removed from critique Step 3** — With delegation, the accessibility probe is now inside HIG. Keeping Axe in critique would mean double-probing with mismatched results. The `--no-axe` flag passes through to HIG.

3. **Fallback path preserved** — Critique still works without hig.md (edge case: user removed or hasn't installed the file). The fallback runs the same 5 mandatory checks manually.

4. **Severity scale parity guaranteed** — Both paths (HIG --light and fallback) use identical severity definitions: critical/major/minor/nit. The fidelity calibration table is applied in both paths.

5. **hasHigAudit canonical flag name** — Matches the Phase 24 13-field schema. The coverage flag write uses read-before-set pattern to avoid clobbering other flags.

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| workflows/hig.md created | FOUND |
| commands/hig.md updated | FOUND |
| workflows/critique.md updated | FOUND |
| 26-03-SUMMARY.md created | FOUND |
| Task 1 commit 744aad5 | FOUND |
| Task 2 commit 606a5e5 | FOUND |
