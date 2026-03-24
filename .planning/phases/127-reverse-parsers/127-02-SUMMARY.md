---
phase: 127-reverse-parsers
plan: 02
subsystem: context-sync
tags: [reverse-parser, skill-md, design-md, antigravity, tdd, nyquist, round-trip]
requires: [127-01]
provides: [parseSkillMd, parseDesignMd]
affects: [bin/lib/context-sync.cjs, Phase-128-merge-engine]
tech_stack:
  added: []
  patterns: [TDD-RED-GREEN, marker-before-frontmatter, color-regex-extraction, agentAdditions-capture, lenient-fallback]
key_files:
  created: []
  modified:
    - tests/phase-127/test-reverse-parsers.cjs
    - bin/lib/context-sync.cjs
decisions:
  - Color regex applied to entire DESIGN.md (not section-gated) for resilience when section headings change
  - parseDesignMd returns {} (not null) for placeholder DESIGN.md — valid empty partial IR distinct from null (parse failure)
  - pde-format-version absence triggers stderr warning but parsing continues (lenient fallback, not hard gate)
  - agentAdditions captures unknown sections by exclusion from KNOWN list, preserving section headings in output
  - designTokens returned from parseDesignMd is a color-list string; Phase 128 is responsible for DTCG reconciliation
metrics:
  duration: "3 minutes"
  completed: "2026-03-24T18:51:57Z"
  tasks_completed: 2
  files_modified: 2
  tests_added: 14
  tests_passing: 25
---

# Phase 127 Plan 02: SKILL.md and DESIGN.md Reverse Parsers Summary

**One-liner:** parseSkillMd() and parseDesignMd() extract structured partial IR from Antigravity-authored SKILL.md and DESIGN.md files, completing the full reverse-parser triad (mdc + skill + design) ready for Phase 128's merge engine.

## What Was Built

Implemented two reverse parsers in `bin/lib/context-sync.cjs`:

### parseSkillMd(content)

Inverts `emitAntigravitySkill()` — reads `.agent/skills/pde-design/SKILL.md` and returns a partial IR.

- **Marker-before-frontmatter handling:** Strips the PDE-GENERATED comment on line 1 before parsing YAML frontmatter (unique to SKILL.md — `.mdc` files have marker in body, not before frontmatter)
- **Name validation:** Returns null if `name: pde-design` is absent in frontmatter (D-12)
- **Section extraction:** Uses existing `extractSection()` helper with exact section names: `Design Tokens Available` (not "Design Tokens"), `Component Catalog`, `Constraints`
- **agentAdditions:** Unknown sections (not in KNOWN list) are captured as a joined string in `partial.agentAdditions` — enables Phase 128 to preserve Antigravity-authored content
- **Non-fatal:** try/catch wraps all logic; exceptions write to stderr and return null, never throw

### parseDesignMd(content)

Inverts `emitDesignMd()` — reads `DESIGN.md` (Antigravity Design DNA format) and returns a partial IR.

- **Format version detection:** Checks for `<!-- pde-format-version: 1.0 -->` marker; warns to stderr if absent but continues parsing (lenient fallback per D-08)
- **Color extraction:** Regex `/^-\s+\*\*([^*]+)\*\*\s+\(#([a-fA-F0-9]{3,6})\)\s+--\s+(.+)$/gm` applied to entire document (not section-gated) for resilience
- **Placeholder handling:** Returns `{}` (not null) when no color entries found — valid empty partial IR for placeholder DESIGN.md
- **Reconstructed string format:** Colors re-serialized as `- **Name** (#hex) -- role` strings in `designTokens` field; Phase 128 handles DTCG mapping
- **Non-fatal:** try/catch wraps all logic; exceptions write to stderr and return null, never throw

### Exports updated

`module.exports` now includes `parseSkillMd, parseDesignMd` alongside existing `parseMdcContent` — all three reverse parsers ready for Phase 128 consumption.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Write failing AGR-01/AGR-02 and round-trip tests | 018a7ff | tests/phase-127/test-reverse-parsers.cjs (modified) |
| 2 (GREEN) | Implement parseSkillMd and parseDesignMd, make all tests green | 7846007 | bin/lib/context-sync.cjs (modified) |

## Test Results

- **25/25 CUR-01/CUR-02/AGR-01/AGR-02/round-trip Nyquist tests green**
- **15/15 Phase 126 regression tests still pass** (no regression)

### AGR-01 coverage (6 tests)
- null input returns null
- No PDE-GENERATED marker returns null
- Wrong frontmatter name (`!= pde-design`) returns null
- Valid SKILL.md extracts designTokens, componentCatalog, constraints
- Unknown sections captured as agentAdditions
- Marker-before-frontmatter ordering handled correctly

### AGR-02 coverage (5 tests)
- null input returns null
- No PDE-GENERATED marker returns null
- Valid DESIGN.md extracts hex colors from Color Palette
- Missing pde-format-version: colors still extracted + stderr warning
- Placeholder DESIGN.md (no colors): returns `{}`

### Round-trip coverage (3 tests)
- emitAll() -> parseMdcContent() -> constraints field preserved
- emitAll() -> parseSkillMd() -> at least one IR field extractable
- All 3 parsers exported as functions from module.exports

## Deviations from Plan

None — plan executed exactly as written. Implementation matched research skeletons at lines 390-483 of 127-RESEARCH.md without modifications.

## Self-Check: PASSED

- FOUND: tests/phase-127/test-reverse-parsers.cjs
- FOUND: bin/lib/context-sync.cjs
- FOUND: commit 018a7ff (test RED — AGR-01/AGR-02/round-trip failing)
- FOUND: commit 7846007 (feat GREEN — all 25 tests passing)
- FOUND: function parseSkillMd in context-sync.cjs
- FOUND: function parseDesignMd in context-sync.cjs
- FOUND: parseSkillMd, parseDesignMd in module.exports
