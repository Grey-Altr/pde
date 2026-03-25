---
phase: 127-reverse-parsers
generated: "2026-03-24T00:00:00.000Z"
finding_count: 4
high_count: 1
has_bdd_candidates: true
---

# Phase 127: Edge Cases

**Generated:** 2026-03-24T00:00:00.000Z
**Findings:** 4 (cap: 8)
**HIGH severity:** 1
**BDD candidates:** yes

## Findings

### 1. [HIGH] parseMdcContent malformed YAML frontmatter (non-standard delimiter)

**Plan element:** `bin/lib/context-sync.cjs` — `parseMdcContent(content, filename)`
**Category:** boundary_condition

The regex `/^---\n([\s\S]*?)\n---/` will fail silently if the .mdc file has Windows line endings (CRLF) — the frontmatter block won't match and all fields will be empty. The plan specifies try/catch returns null, but a CRLF mismatch is a parse miss rather than an exception — the function returns a partial with no fields rather than null.

**BDD Acceptance Criteria Candidate:**
```
Given a .mdc file with a PDE-GENERATED marker and CRLF line endings in the frontmatter
When parseMdcContent() is called with that content
Then the function should either return null or return a partial with correctly extracted fields — not silently return an empty partial {}
```

### 2. [MEDIUM] parseDesignMd returns {} for placeholder — caller cannot distinguish "no colors yet" from "parse failure"

**Plan element:** `bin/lib/context-sync.cjs` — `parseDesignMd(content)` return `{}`
**Category:** empty_state

The plan specifies that a placeholder DESIGN.md with no color entries returns `{}` (valid empty partial). However, `{}` is also the shape returned when parsing succeeded but produced nothing — callers (Phase 128 merge engine) have no way to distinguish "empty file, skip merge" from "file had colors but regex missed them." A `_parsed: true` sentinel or a `colors: []` explicit field would disambiguate.

### 3. [MEDIUM] parseSkillMd agentAdditions split may include Goal/Instructions section bodies

**Plan element:** `bin/lib/context-sync.cjs` — agentAdditions logic in `parseSkillMd`
**Category:** boundary_condition

The plan specifies: split body on `/^(?=## )/m`, filter out KNOWN sections `['Goal', 'Instructions', 'Design Tokens Available', 'Component Catalog', 'Constraints']`, join remainder. If the ## Goal or ## Instructions section body happens to contain a nested `## ` pattern (edge case in markdown), the split may produce extra fragments that leak into agentAdditions. The known-sections filter is by heading name, so it only removes the heading line itself — not the full section body fragment if the split produces sub-fragments.

### 4. [LOW] Round-trip test (Test 12) depends on emitAll() writing to tmp dir path it creates

**Plan element:** `tests/phase-127/test-reverse-parsers.cjs` — round-trip Test 12 / Test 13
**Category:** error_path

The round-trip tests call `emitAll(baseDir)` with a tmp dir. If emitAll() requires a `.cursor/rules/` subdirectory or similar to already exist, it may silently skip writing the .mdc file without error, causing the subsequent parseMdcContent() call to receive an empty/null string and the assertion to fail with a confusing message. The plan does not specify that makePlanningDir() creates the .cursor/rules/ dir.
