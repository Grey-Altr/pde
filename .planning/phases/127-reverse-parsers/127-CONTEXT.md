# Phase 127: Reverse Parsers - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Parse editor-authored changes from .mdc files (Cursor) and SKILL.md/DESIGN.md (Antigravity) into partial IR objects. Enforce PDE:BEGIN/PDE:END section-marker ownership boundaries. Verify round-trip fidelity via Nyquist tests.

This phase builds the **read** half of bidirectional sync — extracting structured data from editor files. It does NOT merge, detect changes, or write back. Those are Phase 128 (merge engine) and Phase 129 (hook integration).

Requirements: CUR-01, CUR-02, AGR-01, AGR-02.

</domain>

<decisions>
## Implementation Decisions

### Parser Placement
- **D-01:** All reverse parser functions live in `bin/lib/context-sync.cjs` alongside their corresponding emitters. Co-location ensures round-trip visibility (emitter format changes are immediately visible to the parser). Consistent with Phase 126's writeStateFile/readStateFile placement.

### Partial IR Contract
- **D-02:** Each parser returns a flat partial IR object containing ONLY the fields it successfully extracted. Shape: `{ techStack?, constraints?, componentCatalog?, designTokens?, agentAdditions? }`. The 4 writable fields mirror the `lastIR` snapshot from Phase 126's state file. `agentAdditions` is Antigravity-specific (AGR-01 requirement). Callers check for field presence, not truthiness (a field may be legitimately empty string).
- **D-03:** Parsers return `null` when the file has no PDE-GENERATED marker (user-authored file), is empty, or is corrupt. This distinguishes "file has no parseable content" from "file parsed but all fields empty."

### Error Handling
- **D-04:** Parsers never throw. On corrupt/unexpected input, return `null` and log a warning to stderr. Matches Phase 126's readStateFile() pattern — non-fatal resilience. Parse errors are logged with the filename and error detail so the user can diagnose.
- **D-05:** Malformed section markers (e.g., unclosed PDE:BEGIN without PDE:END) are treated as "no PDE-owned section" — parser extracts nothing from that section, does not crash.

### Section Marker Recognition
- **D-06:** Phase 127 parsers RECOGNIZE `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` markers if present. However, the markers are NOT added to emitters until Phase 132 (CUR-06 enhanced .mdc generation). Phase 127 tests use synthetic files with markers; the parsers handle both marker-present and marker-absent cases.
- **D-07:** For .mdc files without PDE:BEGIN/PDE:END markers (current v0.15 format), the entire body after YAML frontmatter is treated as PDE-owned content. This preserves backward compatibility until Phase 132 adds markers.

### DESIGN.md Format Version
- **D-08:** The DESIGN.md parser checks for `<!-- pde-format-version: 1.0 -->` marker. If present, uses v1.0 extraction logic. If absent or different version, uses lenient fallback (extract what's recognizable, log version mismatch). This satisfies AGR-02's forward-compatibility requirement.

### Cursor .mdc Parsing Details
- **D-09:** .mdc YAML frontmatter is extracted via regex (not a YAML library) — the frontmatter format is simple enough (description, globs, alwaysApply) and adding a YAML dependency violates the zero-npm-dependency constraint. Pattern: content between first `---` and second `---`.
- **D-10:** Only `pde-*.mdc` files in `.cursor/rules/` are parsed. Non-PDE .mdc files are silently skipped. PDE-GENERATED marker check is the primary gate.

### SKILL.md Parsing Details
- **D-11:** SKILL.md parser extracts content under known section headers (## Design Tokens, ## Component Catalog, ## Constraints). Content under unknown headers is captured as `agentAdditions` — a string blob that emitAntigravitySkill() must preserve on re-emit (AGR-05, delivered in Phase 130).
- **D-12:** SKILL.md frontmatter (YAML between `---` delimiters) is parsed to confirm `name: pde-design` before extracting sections.

### Claude's Discretion
- Test file naming and organization
- Internal helper function naming within parsers
- Regex vs string-split approach for section extraction (whichever is more readable)
- Number of Nyquist tests per parser (minimum: coverage for all requirements' behaviors)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Emitter Source (round-trip counterparts)
- `bin/lib/context-sync.cjs` lines 433-520 — emitCursorRules() defines .mdc output format that the reverse parser must invert
- `bin/lib/context-sync.cjs` lines 659-702 — emitAntigravitySkill() defines SKILL.md output format
- `bin/lib/context-sync.cjs` lines 733-end — emitDesignMd() defines DESIGN.md output format

### Phase 126 Foundation
- `bin/lib/context-sync.cjs` lines 68-70 — makeHeader() defines PDE-GENERATED marker format
- `bin/lib/context-sync.cjs` lines 75-100 — PDE_HASH_RE and computeLoopBreak() (how to check if a file is PDE-written)
- `tests/phase-126/test-sync-foundation.cjs` — existing test patterns and helpers (makeTmpDir, makePlanningDir)

### Requirements
- `.planning/REQUIREMENTS.md` — CUR-01, CUR-02, AGR-01, AGR-02 requirement text with acceptance details

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `makeHeader()` and `PDE_HASH_RE` — PDE-GENERATED marker creation and extraction (Phase 126)
- `computeLoopBreak()` — determines if a file was PDE-written or externally edited
- `readStateFile()` — pattern for null-safe file reading with schema validation
- `safeReadFile()` — existing utility for safe file reads (used by emitters)
- `writeMdcRule()` — .mdc file writer (defines the YAML frontmatter + body format that parser must invert)
- `readDesignTokens()` — reads design-manifest.json tokens (used by DESIGN.md emitter)
- `buildContextIR()` — produces the full IR object (defines the fields parsers extract into)
- `oklchToHex()` — already exported, needed for any future hex↔OKLCH roundtrip (Phase 130)

### Established Patterns
- PDE-GENERATED marker as file ownership gate — check marker before parsing (consistent with emitter skip logic)
- Atomic operations — Phase 126 established PID-based tmp files for concurrent safety
- Non-fatal resilience — functions return null on error, never throw (readStateFile, safeReadFile)
- node:test framework with makeTmpDir/makePlanningDir helpers for test isolation

### Integration Points
- Parsers will be called by Phase 128's merge engine (not by Phase 127 itself)
- Parsers must be exported from `module.exports` so Phase 128 can import them
- The partial IR shape must align with `lastIR` in the state file for 3-way merge base comparison

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The emitter functions define the exact format that parsers must invert, making this a well-constrained reversal exercise.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 127-reverse-parsers*
*Context gathered: 2026-03-24*
