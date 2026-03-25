# Phase 127: Reverse Parsers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 127-reverse-parsers
**Areas discussed:** Parser placement, Partial IR contract, Error handling, Section markers
**Mode:** --auto (all decisions auto-selected)

---

## Parser Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Same file (context-sync.cjs) | Co-locates with emitters for round-trip visibility | ✓ |
| Separate module (reverse-parsers.cjs) | Isolates parsing from emission | |
| Per-format files (.mdc-parser.cjs, etc.) | Maximum separation | |

**User's choice:** [auto] Same file (context-sync.cjs) — recommended default
**Notes:** Consistent with Phase 126 pattern; keeps emitter and parser adjacent for round-trip maintenance.

---

## Partial IR Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Flat partial IR (only parsed fields) | { techStack?, constraints?, agentAdditions? } | ✓ |
| Full IR with nulls for unparsed fields | All IR fields present, unparsed = null | |
| Wrapper with metadata | { fields: {...}, source: 'mdc', confidence: N } | |

**User's choice:** [auto] Flat partial IR — recommended default
**Notes:** Mirrors lastIR shape from Phase 126's state file. Simpler for Phase 128's merge engine.

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Return null + log warning | Non-fatal, matches readStateFile pattern | ✓ |
| Throw with detailed error | Caller handles try/catch | |
| Return error object { error, partial } | Rich error info with partial results | |

**User's choice:** [auto] Return null + log warning — recommended default
**Notes:** Phase 126 established this pattern. Parsers operate in hot paths (hook callbacks) where throwing would break the session.

---

## Section Markers

| Option | Description | Selected |
|--------|-------------|----------|
| Recognize markers, don't add to emitters | Phase 132 adds markers; Phase 127 parsers handle both cases | ✓ |
| Add markers to emitters now | Immediate section ownership in output files | |
| Skip marker support entirely | Parse whole body as PDE-owned | |

**User's choice:** [auto] Recognize markers, don't add to emitters — recommended default
**Notes:** ROADMAP assigns CUR-06 (enhanced .mdc generation with markers) to Phase 132. Phase 127 builds parser support for markers so they work immediately when 132 ships.

---

## Claude's Discretion

- Test file naming and organization
- Internal helper function naming
- Regex vs string-split for section extraction
- Test count per parser (minimum: requirement coverage)

## Deferred Ideas

None — auto-mode stayed within phase scope.
