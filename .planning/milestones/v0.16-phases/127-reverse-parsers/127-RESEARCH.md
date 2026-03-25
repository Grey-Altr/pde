# Phase 127: Reverse Parsers - Research

**Researched:** 2026-03-24
**Domain:** Regex-based markdown/YAML parsing in CommonJS, Node.js built-ins only
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** All reverse parser functions live in `bin/lib/context-sync.cjs` alongside their corresponding emitters. Co-location ensures round-trip visibility.
- **D-02:** Each parser returns a flat partial IR object containing ONLY the fields it successfully extracted. Shape: `{ techStack?, constraints?, componentCatalog?, designTokens?, agentAdditions? }`. The 4 writable fields mirror the `lastIR` snapshot from Phase 126. Callers check for field presence, not truthiness.
- **D-03:** Parsers return `null` when the file has no PDE-GENERATED marker, is empty, or is corrupt. Distinguishes "no parseable content" from "parsed but empty."
- **D-04:** Parsers never throw. On corrupt/unexpected input, return `null` and log a warning to stderr. Matches Phase 126 readStateFile() pattern.
- **D-05:** Malformed section markers (unclosed PDE:BEGIN without PDE:END) treated as "no PDE-owned section" — parser extracts nothing, does not crash.
- **D-06:** Phase 127 parsers RECOGNIZE `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` markers if present. Markers NOT added to emitters until Phase 132. Phase 127 tests use synthetic files with markers; parsers handle both marker-present and marker-absent cases.
- **D-07:** For .mdc files without PDE:BEGIN/PDE:END markers (current v0.15 format), the entire body after YAML frontmatter is treated as PDE-owned content. Backward compatibility until Phase 132.
- **D-08:** DESIGN.md parser checks for `<!-- pde-format-version: 1.0 -->` marker. If present, uses v1.0 extraction logic. If absent or different version, uses lenient fallback with version mismatch log.
- **D-09:** .mdc YAML frontmatter extracted via regex (not a YAML library) — zero-npm-dependency constraint. Pattern: content between first `---` and second `---`.
- **D-10:** Only `pde-*.mdc` files in `.cursor/rules/` are parsed. Non-PDE .mdc files are silently skipped. PDE-GENERATED marker check is the primary gate.
- **D-11:** SKILL.md parser extracts content under known section headers (## Design Tokens Available, ## Component Catalog, ## Constraints). Unknown headers captured as `agentAdditions`.
- **D-12:** SKILL.md frontmatter (YAML between `---` delimiters) parsed to confirm `name: pde-design` before extracting sections.

### Claude's Discretion

- Test file naming and organization
- Internal helper function naming within parsers
- Regex vs string-split approach for section extraction (whichever is more readable)
- Number of Nyquist tests per parser (minimum: coverage for all requirements' behaviors)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CUR-01 | .mdc reverse parser — extract YAML frontmatter (description, globs, alwaysApply) from .cursor/rules/pde-*.mdc files using regex; skip files without PDE-GENERATED marker; strip inline comments; log parse errors without throwing | Exact emitter format documented in writeMdcRule(); PDE_HASH_RE already provides the marker detection gate |
| CUR-02 | .mdc PDE-owned section extraction — content between PDE:BEGIN/PDE:END markers is PDE-parseable; content outside is user-authored; maps pde-project.mdc Conventions to constraints IR, pde-architecture.mdc Tech Stack to techStack IR | Section marker pattern documented; backward-compat strategy (D-07) documented; body structure per rule confirmed from emitCursorRules() |
| AGR-01 | SKILL.md reverse parser — section-aware extraction from .agent/skills/pde-design/SKILL.md; parse Design Tokens Available, Component Catalog, Constraints sections to partial IR; capture unknown sections as agentAdditions; skip files without PDE-GENERATED marker; handle marker-before-frontmatter ordering | emitAntigravitySkill() fully read; actual SKILL.md format observed; marker-before-frontmatter ordering confirmed |
| AGR-02 | DESIGN.md reverse parser — extract hex color values from Color Palette section using pattern `- **Name** (#hex) -- role`; format version detection via `<!-- pde-format-version: 1.0 -->`; capture unknown sections as agentAdditions; lenient fallback for unknown versions | emitDesignMd() fully read; actual DESIGN.md format observed; color entry pattern confirmed from emitter source |
</phase_requirements>

---

## Summary

Phase 127 is a pure parsing phase — it builds the "read" half of bidirectional sync by inverting the three emitter functions already present in `bin/lib/context-sync.cjs`. The emitters are the specification: each parser must reconstruct the fields that the corresponding emitter wrote. No new dependencies are needed; all parsing uses regex and string operations within the existing CommonJS module.

The key technical constraint is zero npm dependencies. This means YAML is parsed with regex (feasible because the frontmatter structure is trivially simple: three known keys in fixed positions). Markdown sections are extracted using the existing `extractSection()` helper already in the file, or an inline variant of the same pattern. The domain is well-understood because all output formats are PDE-generated and precisely controlled.

The phase is shaped by one critical asymmetry: `agentAdditions` flows only in one direction (editor to IR) and is not a field in `lastIR`. The parsers must capture it as a passthrough blob so Phase 130's emitters can re-append it without data loss. This is a capture concern, not a merge concern (Phase 128), and must be correct from the start.

**Primary recommendation:** Implement all three parsers as standalone functions in `bin/lib/context-sync.cjs`, export them alongside existing exports, write one test file `tests/phase-127/test-reverse-parsers.cjs` using the `node:test` + `makeTmpDir`/`makePlanningDir` pattern from Phase 126.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Node.js built-in | Test runner | Established in Phase 126; zero deps |
| `node:assert/strict` | Node.js built-in | Assertions | Same |
| `node:fs` | Node.js built-in | File I/O in tests | Same |
| `node:path` | Node.js built-in | Path construction | Same |
| `node:os` | Node.js built-in | `os.tmpdir()` for test isolation | Same |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `crypto` (built-in) | Node.js built-in | Already imported in context-sync.cjs | Do not re-import; already available |
| `PDE_HASH_RE` | existing export | Detect PDE-GENERATED marker | Gate check before any parser proceeds |
| `extractSection()` | existing private helper in context-sync.cjs | Extract `## Heading` to next `## Heading` | Reuse directly in AGR-01 section extraction |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex YAML parsing | `js-yaml` npm package | js-yaml handles edge cases better, but violates zero-npm-dependency constraint — rejected |
| Regex section extraction | `unified`/`remark` | Overkill for controlled PDE-generated markdown — rejected |
| Separate parser file | In-module functions | D-01 mandates co-location in context-sync.cjs — no alternative |

**Installation:** No new packages. Zero npm dependencies.

---

## Architecture Patterns

### Exact .mdc File Format (from writeMdcRule, lines 410-425)

Every PDE-generated `.mdc` file follows this exact structure:

```
---
description: <description>
globs: <globs>          (line omitted entirely if globs is null)
alwaysApply: <boolean>
---

<!-- PDE-GENERATED | hash:<64hex> | generated:<ISO> -->

<body content>
```

Notes for the parser:
- The YAML frontmatter is lines 1 through N until the second `---` line
- `globs` is absent (not `globs: null`) when the rule has no globs
- After the closing `---`, there is a blank line, then the PDE-GENERATED header, then a blank line, then body
- The PDE-GENERATED marker is in the body, not the frontmatter

### Exact SKILL.md File Format (from emitAntigravitySkill, lines 659-701)

```
<!-- PDE-GENERATED | hash:<64hex> | generated:<ISO> -->
---
name: pde-design
description: PDE design system context ...
---

# PDE Design System

## Goal
...

## Instructions
...

## Design Tokens Available
<ir.designTokens>

## Component Catalog
<ir.componentCatalog>

## Constraints
- Use hex color values from DESIGN.md, not raw OKLCH from token files
- Follow typography hierarchy defined in DESIGN.md section 3
- Spacing uses the base unit defined in DESIGN.md section 5
```

Critical detail: **the PDE-GENERATED marker appears BEFORE the YAML frontmatter** (line 1), not after. This is the "marker-before-frontmatter ordering" referenced in AGR-01. The frontmatter starts at line 2. This is unique to SKILL.md — in .mdc files the PDE header is inside the body (after closing `---`).

### Exact DESIGN.md File Format (from emitDesignMd, lines 733-832)

When tokens exist:
```
<!-- PDE-GENERATED | hash:<64hex> | generated:<ISO> -->
# Design System: <projectName>
**Source Hash:** <first 12 chars of hash>

## 1. Visual Theme & Atmosphere
...

## 2. Color Palette & Roles
- **Name** (#hex) -- role
- **Name** (#hex) -- role
...

## 3. Typography Rules
...

## 4. Component Stylings
...

## 5. Layout Principles
...
```

Color entry format confirmed from emitter source line 775:
```javascript
return `- **${role}** (${hex}) -- ${name} color role`;
```

Parser extraction regex: `/^-\s+\*\*([^*]+)\*\*\s+\(#([a-fA-F0-9]{3,6})\)\s+--\s+(.+)$/gm`

### Pattern 1: Null-safe gate check

Every parser begins with the same guard pattern, matching Phase 126's readStateFile():

```javascript
// Source: inverts pattern from readStateFile() in context-sync.cjs
function parseMdcContent(content, filename) {
  if (!content) return null;
  if (!PDE_HASH_RE.test(content)) return null;  // Not PDE-authored, skip silently
  try {
    // ... parse logic ...
    return partialIR;
  } catch (err) {
    process.stderr.write(`[context-sync] parse error: ${err.message}\n`);
    return null;
  }
}
```

### Pattern 2: YAML frontmatter extraction via regex (zero-dep, D-09)

```javascript
// Matches frontmatter block between first and second --- delimiters
const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
if (!fmMatch) return null;
const block = fmMatch[1];
const description = (block.match(/^description:\s*(.+)$/m) || [])[1]?.trim() || '';
const globs = (block.match(/^globs:\s*(.+)$/m) || [])[1]?.trim() || null;
const alwaysApplyRaw = (block.match(/^alwaysApply:\s*(true|false)$/m) || [])[1];
const alwaysApply = alwaysApplyRaw === 'true';
```

### Pattern 3: PDE:BEGIN/PDE:END section extraction (D-06/D-07)

```javascript
// Returns PDE-owned content string, or null to signal fallback
function extractPdeOwned(body) {
  const BEGIN = '<!-- PDE:BEGIN -->';
  const END   = '<!-- PDE:END -->';
  const beginIdx = body.indexOf(BEGIN);
  const endIdx   = body.indexOf(END);
  if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) return null; // malformed or absent
  return body.slice(beginIdx + BEGIN.length, endIdx).trim();
}
// D-07: if extractPdeOwned returns null, entire body is PDE-owned (backward compat)
const pdeOwned = extractPdeOwned(body) ?? body;
```

### Pattern 4: Section extraction via existing helper

The private `extractSection(content, sectionName)` helper at lines 112-125 of context-sync.cjs does exactly what AGR-01 needs. It handles `## Heading` to next `## Heading` and EOF correctly. Reuse it directly inside the new parser functions.

### Pattern 5: agentAdditions capture

Unknown sections are everything under a `## Heading` that is not one of the known extraction targets:

```javascript
const KNOWN_SECTIONS = ['Goal', 'Instructions', 'Design Tokens Available', 'Component Catalog', 'Constraints'];
// Split on ## boundaries, filter out known, join remainder
const sections = body.split(/^(?=## )/m);
const unknown = sections.filter(s => {
  const header = s.match(/^## (.+)/)?.[1]?.trim();
  return header && !KNOWN_SECTIONS.includes(header);
});
const agentAdditions = unknown.join('\n').trim() || null;
```

### Anti-Patterns to Avoid

- **Throwing on parse errors:** Parsers must catch all exceptions and return null with stderr log. Never propagate exceptions (D-04).
- **Returning empty object `{}` instead of `null` for non-PDE files:** An empty `{}` means "parsed successfully but found nothing" — different from "not PDE-authored." Callers depend on this distinction (D-03).
- **Checking field truthiness instead of presence:** `if (partialIR.constraints)` fails for legitimate empty string. D-02 mandates `'constraints' in partialIR` style checks in callers.
- **Parsing non-`pde-*` .mdc files:** D-10 is explicit — only `pde-*.mdc` filenames are valid inputs.
- **Writing to disk inside parsers:** Phase 127 is read-only. Parsers extract only; emitAll() is not called.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | Custom recursive parser | Single-line regex per known key | Frontmatter has exactly 3 known keys in fixed structure — full YAML parser is overkill |
| Markdown section splitting | Custom AST | `extractSection()` (already in file at lines 112-125) | Already tested, handles EOF correctly |
| PDE marker detection | Custom regex | `PDE_HASH_RE` (already exported) | Derived from makeHeader() — auto-syncs if header format changes |
| Safe file reading | Custom file utilities | `safeReadFile()` from core.cjs | Already handles errors and missing files |

**Key insight:** The emitters are the specification. Don't research output formats — read the emitter source directly. The parsers are exact inverses, not independent designs.

---

## Common Pitfalls

### Pitfall 1: SKILL.md marker-before-frontmatter ordering

**What goes wrong:** Parser looks for frontmatter at line 1 with `---` but hits the PDE-GENERATED HTML comment first, returning null.
**Why it happens:** emitAntigravitySkill() writes the PDE header on line 1, then `---` on line 2. In .mdc files the PDE header is inside the body after the closing `---` — SKILL.md reverses this order.
**How to avoid:** Strip the first line (the PDE-GENERATED comment) before matching the frontmatter block. Use: `content.replace(/^<!--[^>]+-->\n/, '')` then match `/^---\n([\s\S]*?)\n---/`.
**Warning signs:** parseSkillMd() returns null for valid SKILL.md content in tests.

### Pitfall 2: globs field absent vs. null

**What goes wrong:** Parser treats missing `globs:` line as parsing failure rather than valid `null`.
**Why it happens:** writeMdcRule() only writes `globs: ${globs}` if globs is truthy. Some .mdc files legitimately have no globs line (pde-project.mdc and pde-pipeline.mdc).
**How to avoid:** Default globs to `null` if the regex match for `globs:` fails, not to empty string or error condition.

### Pitfall 3: Section header name mismatch between emitter and parser

**What goes wrong:** Parser extracts wrong fields because section names don't match exactly.
**Why it happens:** Section names differ across files. Confirmed mapping from emitter source:
  - `pde-project.mdc` body: `## Conventions` maps to `constraints` IR
  - `pde-architecture.mdc` body: `## Tech Stack` maps to `techStack` IR
  - `pde-design-tokens.mdc` body: `## Design Tokens` maps to `designTokens` IR
  - `pde-components.mdc` body: `## Component Catalog` maps to `componentCatalog` IR
  - `SKILL.md` section: `## Design Tokens Available` (NOT "Design Tokens") maps to `designTokens` IR
  - `SKILL.md` section: `## Component Catalog` maps to `componentCatalog` IR
  - `SKILL.md` section: `## Constraints` maps to `constraints` IR
**Warning signs:** Round-trip test returns empty string for a field that should have content.

### Pitfall 4: SKILL.md Constraints section is hardcoded, not ir.constraints

**What goes wrong:** Confusion about what `constraints` field will contain after parsing SKILL.md.
**Why it happens:** Looking at emitAntigravitySkill(), the `## Constraints` section body is hardcoded (3 bullet lines about hex colors, typography, spacing) — it is NOT `ir.constraints` from PROJECT.md. The ir.constraints value flows from pde-project.mdc `## Conventions`, not SKILL.md.
**How to avoid:** Accept that parseSkillMd() will populate `constraints` with those 3 hardcoded lines. If an agent edits those lines, the parser captures the edit. This is correct behavior. Document it in the function's JSDoc.

### Pitfall 5: DESIGN.md Color Palette section heading includes a number

**What goes wrong:** Parser looks for `## Color Palette` but the actual heading is `## 2. Color Palette & Roles`.
**Why it happens:** emitDesignMd() uses numbered headings: `## 2. Color Palette & Roles`.
**How to avoid:** Rather than section-gate the extraction, apply the color pattern regex (`/^-\s+\*\*([^*]+)\*\*\s+\(#([a-fA-F0-9]{3,6})\)\s+--\s+(.+)$/gm`) to the entire document content. This is more resilient and correct — color entries only appear in the palette section anyway.

### Pitfall 6: Round-trip whitespace normalization

**What goes wrong:** Round-trip Nyquist test fails due to trailing whitespace or newline differences.
**Why it happens:** extractSection() returns a `.trim()`-ed string. If the emitter wrote trailing newlines, trim removes them. Re-emission adds them back. Net result is no semantic change, but raw string comparison fails.
**How to avoid:** Nyquist round-trip tests must compare trimmed values, or normalize consistently with `.trim()` on both sides of the assertion.

### Pitfall 7: parseMdcContent called with directory path instead of content

**What goes wrong:** Caller passes a file path string to the parser, not file content.
**Why it happens:** API design is easy to misuse.
**How to avoid:** Parser function signature should be `parseMdcContent(content, filename)` where content is the raw file text. Callers read the file first with `safeReadFile()`, then pass content. Add a JSDoc note.

---

## Code Examples

### CUR-01/CUR-02: .mdc Reverse Parser Skeleton

```javascript
// Source: inverts writeMdcRule() at bin/lib/context-sync.cjs:410-425
// and emitCursorRules() at lines 433-519
/**
 * Parse a single PDE .mdc rule file content into a partial IR object.
 * Returns null when: content is empty, PDE-GENERATED marker absent, parse error occurs.
 * @param {string} content - Raw file content
 * @param {string} filename - e.g. 'pde-project.mdc' (drives IR field mapping)
 * @returns {object|null} Partial IR or null
 */
function parseMdcContent(content, filename) {
  if (!content) return null;
  if (!PDE_HASH_RE.test(content)) return null;
  try {
    // Extract YAML frontmatter (between first --- and second ---)
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const block = fmMatch[1];
    const frontmatter = {
      description: (block.match(/^description:\s*(.+)$/m) || [])[1]?.trim() || '',
      globs: (block.match(/^globs:\s*(.+)$/m) || [])[1]?.trim() || null,
      alwaysApply: (block.match(/^alwaysApply:\s*(true|false)$/m) || [])[1] === 'true',
    };

    // Extract body (everything after the closing --- plus newline)
    const closingDelim = content.indexOf('\n---\n', content.indexOf('---\n') + 4);
    const body = closingDelim !== -1 ? content.slice(closingDelim + 5) : '';

    // PDE:BEGIN/PDE:END gate — D-06/D-07
    const BEGIN = '<!-- PDE:BEGIN -->';
    const END   = '<!-- PDE:END -->';
    const bi = body.indexOf(BEGIN);
    const ei = body.indexOf(END);
    const pdeOwned = (bi !== -1 && ei !== -1 && ei > bi)
      ? body.slice(bi + BEGIN.length, ei).trim()
      : body; // D-07 backward compat: no markers -> entire body is PDE-owned

    // Map section to IR field by filename
    const partial = { ...frontmatter };
    if (filename === 'pde-project.mdc') {
      partial.constraints = extractSection(pdeOwned, 'Conventions');
    } else if (filename === 'pde-architecture.mdc') {
      partial.techStack = extractSection(pdeOwned, 'Tech Stack');
    } else if (filename === 'pde-design-tokens.mdc') {
      partial.designTokens = extractSection(pdeOwned, 'Design Tokens');
    } else if (filename === 'pde-components.mdc') {
      partial.componentCatalog = extractSection(pdeOwned, 'Component Catalog');
    }
    return partial;
  } catch (err) {
    process.stderr.write(`[context-sync] mdc parse error (${filename}): ${err.message}\n`);
    return null;
  }
}
```

### AGR-01: SKILL.md Parser Skeleton

```javascript
// Source: inverts emitAntigravitySkill() at bin/lib/context-sync.cjs:659-701
/**
 * Parse .agent/skills/pde-design/SKILL.md into a partial IR object.
 * Returns null when: content is empty, PDE-GENERATED marker absent,
 * name != pde-design, or parse error occurs.
 * @param {string} content - Raw SKILL.md file content
 * @returns {object|null} Partial IR or null
 */
function parseSkillMd(content) {
  if (!content) return null;
  if (!PDE_HASH_RE.test(content)) return null;
  try {
    // Strip first line (PDE-GENERATED header precedes frontmatter in SKILL.md)
    const withoutHeader = content.replace(/^<!--[^>]+-->\n/, '');

    // Validate frontmatter contains name: pde-design (D-12)
    const fmMatch = withoutHeader.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    if (!/^name:\s*pde-design$/m.test(fmMatch[1])) return null;

    const body = withoutHeader.slice(fmMatch[0].length).trim();
    const partial = {};

    const designTokens = extractSection(body, 'Design Tokens Available');
    if (designTokens !== '') partial.designTokens = designTokens;

    const componentCatalog = extractSection(body, 'Component Catalog');
    if (componentCatalog !== '') partial.componentCatalog = componentCatalog;

    const constraints = extractSection(body, 'Constraints');
    if (constraints !== '') partial.constraints = constraints;

    // agentAdditions: sections not in the known list (D-11)
    const KNOWN = ['Goal', 'Instructions', 'Design Tokens Available', 'Component Catalog', 'Constraints'];
    const unknownSections = body.split(/^(?=## )/m).filter(s => {
      const h = s.match(/^## (.+)/)?.[1]?.trim();
      return h && !KNOWN.includes(h);
    });
    if (unknownSections.length > 0) {
      partial.agentAdditions = unknownSections.join('\n').trim();
    }

    return partial; // may be {} if SKILL.md has no extractable content — valid empty partial IR
  } catch (err) {
    process.stderr.write(`[context-sync] skill.md parse error: ${err.message}\n`);
    return null;
  }
}
```

### AGR-02: DESIGN.md Parser Skeleton

```javascript
// Source: inverts emitDesignMd() at bin/lib/context-sync.cjs:733-832
// Color entry format confirmed: `- **${role}** (${hex}) -- ${name} color role`
/**
 * Parse DESIGN.md into a partial IR object (color token data only).
 * Returns null when: content is empty, PDE-GENERATED marker absent, or parse error.
 * Returns {} (empty partial IR) when DESIGN.md is a placeholder with no color entries.
 * @param {string} content - Raw DESIGN.md file content
 * @returns {object|null} Partial IR { designTokens? } or null
 */
function parseDesignMd(content) {
  if (!content) return null;
  if (!PDE_HASH_RE.test(content)) return null;
  try {
    // D-08: format version detection
    const isV1 = /<!--\s*pde-format-version:\s*1\.0\s*-->/.test(content);
    if (!isV1) {
      process.stderr.write('[context-sync] design.md: no pde-format-version marker, using lenient fallback\n');
    }

    // Extract hex colors from anywhere in document (more resilient than section-gating)
    // Pattern matches confirmed emitter output: - **Name** (#hex) -- role
    const colorPattern = /^-\s+\*\*([^*]+)\*\*\s+\(#([a-fA-F0-9]{3,6})\)\s+--\s+(.+)$/gm;
    const colors = [];
    let m;
    while ((m = colorPattern.exec(content)) !== null) {
      colors.push({ name: m[1].trim(), hex: `#${m[2]}`, role: m[3].trim() });
    }

    if (colors.length === 0) return {}; // Placeholder DESIGN.md — valid empty partial IR

    // Reconstruct designTokens string in same format (Phase 128 handles DTCG mapping)
    const designTokens = colors.map(c => `- **${c.name}** (${c.hex}) -- ${c.role}`).join('\n');
    return { designTokens };
  } catch (err) {
    process.stderr.write(`[context-sync] design.md parse error: ${err.message}\n`);
    return null;
  }
}
```

### Round-trip Nyquist Test Pattern

```javascript
// Source: test pattern from tests/phase-126/test-sync-foundation.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { emitAll, parseMdcContent, parseSkillMd, parseDesignMd } = require('../../bin/lib/context-sync.cjs');

test('CUR-01/CUR-02 round-trip: pde-project.mdc constraints field survives emit -> parse', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-127-'));
  // ... setup makePlanningDir ...
  emitAll(baseDir);
  const mdcPath = path.join(baseDir, '.cursor', 'rules', 'pde-project.mdc');
  const content = fs.readFileSync(mdcPath, 'utf-8');
  const partial = parseMdcContent(content, 'pde-project.mdc');
  assert.notEqual(partial, null, 'parseMdcContent must return non-null for PDE-authored file');
  assert.ok('constraints' in partial, 'partial IR must have constraints field');
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full YAML library | Regex per known key | Phase 127 decision D-09 | Zero deps maintained |
| Separate parser module | Co-located in context-sync.cjs | Phase 127 decision D-01 | Round-trip visibility |
| No section markers | PDE:BEGIN/PDE:END support (forward-compat) | Phase 127 decision D-06 | Parsers handle both with/without markers |

**Phase 132 note:** CUR-06 adds `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` to emitters. Phase 127 parsers already handle both cases via D-07, so Phase 132 is a pure emitter change with no parser modification needed.

---

## Open Questions

1. **DESIGN.md `designTokens` partial IR value interpretation**
   - What we know: parseDesignMd() returns a color-list string in `designTokens`, which differs structurally from the full `ir.designTokens` token summary string.
   - What's unclear: Phase 128's merge engine receives this field — it needs to know whether the value is a color list (from DESIGN.md) or a full token summary (from state file).
   - Recommendation: Document this in parseDesignMd() JSDoc. Phase 128 is responsible for reconciliation; Phase 127 captures faithfully.

2. **Whether to export `parseMdcContent` or a higher-level `parseMdcFile(filepath)` wrapper**
   - What we know: D-01 says parsers live in context-sync.cjs; Phase 128 will call them.
   - What's unclear: Whether callers prefer to handle file reading themselves or want the parser to also read the file.
   - Recommendation: Export both the content-level function (for testability) and a file-level convenience wrapper (for Phase 128 ergonomics). Both patterns are established in the codebase.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (Node.js built-in) |
| Config file | none — direct invocation |
| Quick run command | `node --test tests/phase-127/test-reverse-parsers.cjs` |
| Full suite command | `node --test tests/phase-126/test-sync-foundation.cjs tests/phase-127/test-reverse-parsers.cjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CUR-01 | parseMdcContent() returns null for file without PDE-GENERATED marker | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| CUR-01 | parseMdcContent() extracts description, globs, alwaysApply from frontmatter | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| CUR-01 | parseMdcContent() returns null for null/empty input | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| CUR-01 | parseMdcContent() returns null (not throw) on corrupt input | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| CUR-01 | parseMdcContent() returns null for non-pde-* filename with valid content | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| CUR-02 | pde-project.mdc: Conventions section maps to constraints partial IR | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| CUR-02 | pde-architecture.mdc: Tech Stack section maps to techStack partial IR | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| CUR-02 | PDE:BEGIN/PDE:END present: only content between markers extracted as pdeOwned | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| CUR-02 | PDE:BEGIN/PDE:END absent (v0.15): entire body treated as PDE-owned (D-07) | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| CUR-02 | Malformed markers (BEGIN without END): extract nothing from section, no crash | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| AGR-01 | parseSkillMd() returns null for file without PDE-GENERATED marker | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| AGR-01 | parseSkillMd() returns null when frontmatter name != pde-design | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| AGR-01 | parseSkillMd() extracts designTokens, componentCatalog, constraints | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| AGR-01 | parseSkillMd() captures unknown sections as agentAdditions | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| AGR-01 | parseSkillMd() handles marker-before-frontmatter ordering correctly | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| AGR-02 | parseDesignMd() returns null for file without PDE-GENERATED marker | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| AGR-02 | parseDesignMd() extracts hex colors from Color Palette section | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| AGR-02 | parseDesignMd() logs version warning when pde-format-version absent | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| AGR-02 | parseDesignMd() still extracts colors when version marker absent (lenient fallback) | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| AGR-02 | parseDesignMd() returns {} for placeholder DESIGN.md (no color entries) | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| ALL | Round-trip: emitAll() then parse each file type; extracted fields match original IR fields (trimmed) | integration | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |
| ALL | parseMdcContent, parseSkillMd, parseDesignMd exported from module.exports | unit | `node --test tests/phase-127/test-reverse-parsers.cjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-127/test-reverse-parsers.cjs`
- **Per wave merge:** `node --test tests/phase-126/test-sync-foundation.cjs tests/phase-127/test-reverse-parsers.cjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-127/` directory
- [ ] `tests/phase-127/test-reverse-parsers.cjs` — covers all 22 tests above

Note: `makeTmpDir` and `makePlanningDir` helpers from phase-126 test are not exported. They must be re-declared in the phase-127 test file (copy-adapted with updated prefix `pde-127-`).

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/context-sync.cjs` lines 68-102 — makeHeader, PDE_HASH_RE, computeLoopBreak (marker format and detection)
- `bin/lib/context-sync.cjs` lines 112-125 — extractSection() helper (reusable in parsers)
- `bin/lib/context-sync.cjs` lines 410-425 — writeMdcRule() (exact .mdc output format)
- `bin/lib/context-sync.cjs` lines 433-519 — emitCursorRules() (5-file body structure and section names)
- `bin/lib/context-sync.cjs` lines 659-701 — emitAntigravitySkill() (SKILL.md format, section names)
- `bin/lib/context-sync.cjs` lines 733-832 — emitDesignMd() (DESIGN.md format, color entry pattern)
- `bin/lib/context-sync.cjs` lines 974-981 — module.exports (export pattern to follow)
- `tests/phase-126/test-sync-foundation.cjs` — test framework, makeTmpDir/makePlanningDir helpers
- `.cursor/rules/pde-project.mdc` — live .mdc output confirming exact format
- `.agent/skills/pde-design/SKILL.md` — live SKILL.md output confirming marker-before-frontmatter ordering
- `DESIGN.md` — live DESIGN.md output (placeholder state)
- `.planning/phases/127-reverse-parsers/127-CONTEXT.md` — all decisions locked by user

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — requirement text for CUR-01, CUR-02, AGR-01, AGR-02
- `.planning/STATE.md` — zero-npm-dep constraint, Phase 126 shipped functions

### Tertiary (LOW confidence)

None — all claims verified against primary source code read directly in this session.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — zero new dependencies; all tools are Node.js built-ins already in use
- Architecture: HIGH — emitter source code directly inspected; parsers are mechanical inverses with no ambiguity
- Pitfalls: HIGH — identified from direct code inspection (marker ordering, section name mismatches, hardcoded vs IR-driven Constraints content)
- Validation: HIGH — test framework and helper patterns from Phase 126 are identical and available

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable — no external dependencies to track; formats controlled by this codebase)
