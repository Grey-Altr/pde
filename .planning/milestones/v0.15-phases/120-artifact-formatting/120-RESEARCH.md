# Phase 120: Artifact Formatting - Research

**Researched:** 2026-03-23
**Domain:** Handoff spec annotation format, DTCG-to-Tailwind v4 @theme conversion, framework-aware component stub generation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — discuss phase was skipped (auto-generated infrastructure phase).

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from prior phases:
- Zero npm deps at plugin root — all generators as CJS modules in bin/lib/
- Handoff spec template at templates/handoff-spec.md already has token mapping table
- DTCG tokens stored in .planning/design/tokens/ as SYS-*.json files
- context-sync.cjs (898 lines) houses IR builder + emitter pattern from Phase 118
- Existing handoff.md workflow reads STACK.md for framework detection (Step 2a)
- Phase 118 established CJS module pattern; Phase 119 extended with Antigravity/DESIGN.md emitters

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FMT-01 | Handoff specs include @file annotations (@component:, @props:, @tokens:) extractable by any editor | @file annotation format research — insert at component specification blocks in handoff.md Step 3/4 emitter |
| FMT-02 | DTCG tokens converted to Tailwind v4 @theme declarations and CSS custom properties | Tailwind v4 @theme syntax confirmed; existing dtcgToCssLines() in design.cjs extended with new dtcgToTailwindTheme() |
| FMT-03 | Framework detection from package.json generates framework-appropriate component stubs (default: React + Tailwind) | package.json framework detection pattern; templates/handoff-spec.md already has React/Vue/Svelte stub sections |
</phase_requirements>

## Summary

Phase 120 is a focused infrastructure phase adding three formatting capabilities to the handoff pipeline: (1) `@file` annotations on component specs so any editor can extract them, (2) a Tailwind v4 `@theme` block output alongside the existing CSS custom properties, and (3) package.json-based framework detection that gates which component stub gets emitted in the handoff spec.

All three capabilities extend existing modules. The `@file` annotations slot into the handoff workflow emitter (Step 3-4 in handoff.md) as comments prepended to each component section. The DTCG-to-Tailwind conversion is a new function alongside the existing `dtcgToCssLines()` and `generateCssVars()` in `bin/lib/design.cjs`. Framework detection from package.json supplements (and potentially replaces) the existing STACK.md-based detection in the handoff workflow for the stub-selection logic.

**Primary recommendation:** Implement all three as new functions in `bin/lib/artifact-format.cjs` (new module) that are called from `bin/lib/design.cjs` and the handoff workflow, consistent with the emitter pattern from Phase 118/119.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins only | N/A | CJS modules, fs, path, crypto | Zero npm deps at plugin root — project-wide constraint |
| DTCG token format | W3C stable (2025.10) | `{ "$value": "...", "$type": "..." }` token structure | Already used in design-manifest.json fixtures and design.cjs |
| Tailwind CSS v4 | v4.x | `@theme { --color-*: oklch(...); }` block format | FMT-02 requirement; project targets v4 (not v3) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs | built-in | Read package.json from project root | Framework detection for FMT-03 |
| node:path | built-in | Resolve project root from cwd | All file operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `artifact-format.cjs` module | Inline in `design.cjs` | Keeping design.cjs focused; new phase = new module per established pattern |
| New `artifact-format.cjs` module | Inline in `context-sync.cjs` | context-sync.cjs handles editor context, not handoff formatting; separation of concerns |

**Installation:**
```bash
# No installation needed — zero npm deps constraint
```

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
├── artifact-format.cjs   # NEW: @file annotations, DTCG→Tailwind @theme, framework detection
├── design.cjs            # EXISTING: dtcgToCssLines, generateCssVars — extend or delegate
├── context-sync.cjs      # EXISTING: IR builder + emitter pattern
└── core.cjs              # EXISTING: safeReadFile, output, error utilities

tests/
└── phase-120/
    └── test-artifact-format.cjs  # NEW: covers FMT-01, FMT-02, FMT-03
```

### Pattern 1: New CJS Module with Emitter Functions
**What:** Each formatting capability is a pure function — takes input, returns string output. No side effects. Mirrors `dtcgToCssLines()` shape.
**When to use:** All three FMT requirements follow this pattern (annotation injection, token conversion, stub selection).
**Example:**
```javascript
// Source: Phase 118/119 emitter pattern from bin/lib/context-sync.cjs
'use strict';
// Zero npm deps — Node.js built-ins only

/**
 * Generate DTCG token tree as Tailwind v4 @theme block.
 * @param {object} tokens - DTCG token tree (same format as design-manifest tokens)
 * @returns {string} @theme { ... } CSS block
 */
function generateTailwindTheme(tokens) {
  const lines = dtcgToThemeLines(tokens, '');
  return '@theme {\n' + lines.join('\n') + '\n}\n';
}

/**
 * Recursively convert DTCG token tree to @theme variable lines.
 * Maps DTCG $type to appropriate Tailwind namespace prefix:
 *   color → --color-
 *   dimension (spacing) → --spacing-
 *   fontFamily → --font-
 */
function dtcgToThemeLines(tokens, prefix) { ... }
```

### Pattern 2: @file Annotation Injection
**What:** Prepend structured comment blocks before component sections in handoff spec output.
**When to use:** For each component in the per-screen spec (Step 4g of handoff.md), emit annotations.
**Example:**
```markdown
<!-- @component: ButtonComponent -->
<!-- @props: ButtonComponentProps -->
<!-- @tokens: --color-primary, --color-surface, --radius-md -->
```
These comments are extractable by any editor with a simple regex: `/<!-- @(component|props|tokens): ([^>]+) -->/g`

### Pattern 3: package.json Framework Detection
**What:** Read `package.json` `dependencies`/`devDependencies` from project root to infer framework.
**When to use:** As an additional/replacement detection path for stub selection in the handoff workflow (complements existing STACK.md detection in Step 2a).
**Example:**
```javascript
// Source: FMT-03 requirement
function detectFrameworkFromPackageJson(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['react'] || deps['react-dom']) return 'React';
    if (deps['vue']) return 'Vue';
    if (deps['svelte']) return 'Svelte';
    if (deps['@angular/core']) return 'Angular';
    return null; // null = could not detect, caller falls back to STACK.md
  } catch {
    return null; // package.json absent — graceful fallback
  }
}
```

### Pattern 4: DTCG Type → Tailwind Namespace Mapping
**What:** Map DTCG `$type` values to Tailwind v4 theme namespace prefixes.
**When to use:** Inside `dtcgToThemeLines()` to produce the correct variable name prefix.

| DTCG `$type` | Tailwind v4 Namespace | Example output |
|---|---|---|
| `color` | `--color-` | `--color-primary-500` |
| `dimension` (spacing context) | `--spacing-` | `--spacing-sm` |
| `fontFamily` | `--font-` | `--font-body` |
| `fontSize` | `--text-` | `--text-lg` |
| `fontWeight` | `--font-weight-` | `--font-weight-bold` |
| `borderRadius` | `--radius-` | `--radius-md` |
| `shadow` | `--shadow-` | `--shadow-lg` |
| other/unknown | `--` (generic CSS var) | Falls through to :root {} output |

**Critical:** OKLCH values pass through unmodified — Tailwind v4 natively supports OKLCH. No conversion needed. The existing `oklchToHex()` in context-sync.cjs is only needed for DESIGN.md (Antigravity display), NOT for the Tailwind @theme output.

### Anti-Patterns to Avoid
- **Over-detecting Angular:** Angular is mentioned in REQUIREMENTS.md future section only. FMT-03 says "default: React + Tailwind, adapting to detected framework." Default to React when detection is ambiguous.
- **Mutating STACK.md detection:** The existing handoff.md Step 2a STACK.md detection is locked. package.json detection is an additional source, not a replacement. Apply priority: package.json > STACK.md > default "React".
- **Emitting all three stubs always:** The handoff spec template has React/Vue/Svelte stub sections, but FMT-03 says framework-appropriate. Emit only the detected framework's stub plus a note about the others. If detection returns React, emit only the React stub block.
- **Adding npm dependencies:** No Style Dictionary, no token-pipeline packages. Pure CJS with built-ins only.
- **Nesting @theme variables:** Tailwind v4 `@theme` variables must be top-level (not nested under selectors). DTCG has nested objects; the converter must flatten with hyphenated names.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DTCG CSS conversion | Custom parser | Extend existing `dtcgToCssLines()` in design.cjs | Already handles nesting, `$` key skipping, prefix logic |
| OKLCH to Tailwind conversion | Color math | Pass OKLCH values through directly | Tailwind v4 natively accepts `oklch()` — no conversion needed |
| Token namespace mapping | Heuristic guessing | DTCG `$type` field | $type is authoritative; use it to pick the namespace prefix |
| Framework detection regex | Parse package.json manually | `JSON.parse(fs.readFileSync(...))` + deps lookup | Simple, reliable, no special parser needed |

**Key insight:** The DTCG-to-Tailwind converter is ~30 lines of logic — it maps `$type` to namespace prefix, then flattens the nested token tree with hyphens. Reuse the existing recursive traversal from `dtcgToCssLines()`.

## Common Pitfalls

### Pitfall 1: Tailwind v4 @theme vs :root confusion
**What goes wrong:** Developer puts variables in `:root {}` and they don't generate Tailwind utility classes.
**Why it happens:** Tailwind v4 requires `@theme {}` specifically — `:root {}` CSS variables are not picked up by the Tailwind compiler.
**How to avoid:** The module must emit two blocks: `@theme { ... }` for Tailwind utility generation, AND `:root { ... }` for fallback CSS custom property access. Both use the same variable names.
**Warning signs:** Test checks that output string starts with `@theme {` and also contains `:root {`.

### Pitfall 2: DTCG token group keys vs token keys
**What goes wrong:** DTCG has both group objects `{ color: { primary: { $value: ... } } }` and flat tokens `{ $value: ..., $type: ... }`. Code that checks `if '$value' in node` handles leaf nodes correctly, but must also recurse into groups.
**Why it happens:** DTCG nests groups arbitrarily. `SYS-colors.json` likely has `{ color: { primary: { 500: { $value: "oklch(...)", $type: "color" } } } }`.
**How to avoid:** Existing `dtcgToCssLines()` already handles this correctly — the new `dtcgToThemeLines()` must mirror that exact traversal logic.
**Warning signs:** Test with 3-level-deep nesting to verify all leaf nodes appear in output.

### Pitfall 3: @file annotation format breaking markdown parsers
**What goes wrong:** Annotations using unusual syntax confuse markdown renderers or editor parsers.
**Why it happens:** The annotation format needs to be both human-readable and machine-extractable.
**How to avoid:** Use HTML comment syntax `<!-- @key: value -->` — this is invisible in rendered markdown, valid HTML, and trivially extractable with regex. Already used in the codebase (`<!-- @component: -->` pattern in handoff.md Step 4b-stitch).
**Warning signs:** Verify that the annotation lines don't appear in rendered handoff spec output.

### Pitfall 4: Framework detection false positives
**What goes wrong:** A project has React in devDependencies for a test tool but uses Vue as the app framework.
**Why it happens:** Many testing frameworks (Storybook, Testing Library) declare framework deps.
**How to avoid:** Check for `react-dom` specifically (not just `react`) for React detection, since React apps require react-dom. For Vue: `vue` is authoritative. For Svelte: `svelte` package. Priority order: Vue > Svelte > React (React is the default fallback anyway, so no false-positive risk).
**Warning signs:** Test fixture with `@testing-library/react` in deps but no `react-dom` should NOT return "React".

### Pitfall 5: SYS-*.json files not yet in design/tokens/
**What goes wrong:** CONTEXT.md says DTCG tokens are at `.planning/design/tokens/SYS-*.json`, but that directory doesn't exist yet in the project (confirmed by ls check).
**Why it happens:** The tokens directory is created by the design pipeline (/pde:design-system). This is a fresh project with an empty design manifest.
**How to avoid:** The token converter must handle graceful absence — if no token files exist, return empty string with a comment placeholder. Test both "tokens exist" and "tokens absent" cases.
**Warning signs:** Any `fs.readFileSync` on token paths must be wrapped in try/catch.

## Code Examples

Verified patterns from official sources and codebase:

### Tailwind v4 @theme Block Output Target
```css
/* Source: https://tailwindcss.com/docs/theme */
@theme {
  --color-primary: oklch(0.7 0.15 150);
  --color-secondary: oklch(0.5 0.1 250);
  --color-surface: oklch(0.95 0.02 90);
  --spacing-base: 8px;
  --spacing-lg: 24px;
  --font-body: Inter, sans-serif;
}
```

### Companion :root Block (CSS Custom Properties)
```css
/* Source: existing generateCssVars() in bin/lib/design.cjs */
:root {
  --color-primary: oklch(0.7 0.15 150);
  --color-secondary: oklch(0.5 0.1 250);
  --spacing-base: 8px;
  --font-body: Inter, sans-serif;
}
```

### @file Annotation Injection Target
```markdown
<!-- @component: ButtonComponent -->
<!-- @props: ButtonComponentProps -->
<!-- @tokens: --color-primary, --radius-md -->

#### ButtonComponent

```typescript
interface ButtonComponentProps { ... }
```
```

### DTCG Token Input (existing format from design-manifest fixtures)
```json
{
  "color": {
    "primary": { "$value": "oklch(0.7 0.15 150)", "$type": "color" },
    "surface": { "$value": "oklch(0.95 0.02 90)", "$type": "color" }
  },
  "spacing": {
    "base": { "$value": "8px", "$type": "dimension" },
    "lg": { "$value": "24px", "$type": "dimension" }
  },
  "typography": {
    "fontFamily": { "$value": "Inter, sans-serif", "$type": "fontFamily" }
  }
}
```

### Existing dtcgToCssLines Pattern to Mirror
```javascript
// Source: bin/lib/design.cjs lines 167-183
function dtcgToCssLines(tokens, prefix) {
  prefix = prefix || '';
  const lines = [];
  for (const key of Object.keys(tokens)) {
    if (key.startsWith('$')) continue;
    const node = tokens[key];
    if (node && typeof node === 'object' && '$value' in node) {
      lines.push('  --' + prefix + key + ': ' + node.$value + ';');
    } else if (node && typeof node === 'object') {
      const nested = dtcgToCssLines(node, prefix + key + '-');
      for (const line of nested) lines.push(line);
    }
  }
  return lines;
}
```
The new `dtcgToThemeLines()` mirrors this exactly but uses `$type`-aware namespace prefix mapping instead of a flat `--` prefix.

### package.json Framework Detection Pattern
```javascript
// Source: FMT-03 requirement + Node.js built-ins
function detectFrameworkFromPackageJson(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps['vue']) return 'Vue';
    if (deps['svelte']) return 'Svelte';
    if (deps['react'] && deps['react-dom']) return 'React';
    return null;
  } catch {
    return null;
  }
}
```

### Node.js test runner invocation (consistent with all prior phases)
```bash
node --test tests/phase-120/test-artifact-format.cjs
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| STACK.md semantic detection for framework | package.json dependency detection | Phase 120 (new) | More reliable — reads machine-generated file, not freeform prose |
| CSS custom properties only | CSS custom properties + Tailwind v4 @theme | Phase 120 (new) | Enables Tailwind utility class generation from design tokens |
| No editor annotations in handoff spec | @file annotations in HTML comments | Phase 120 (new) | Any editor can extract component artifacts via regex |
| Tailwind v3 tailwind.config.js | Tailwind v4 @theme in CSS | ~Tailwind v4.0 release | CSS-first configuration, no JS config file needed |

**Deprecated/outdated:**
- Tailwind v3 `tailwind.config.js` theme.extend: Use `@theme {}` in CSS instead for v4 projects
- DTCG `value` (no $): Now standardized as `$value` per W3C spec v1.0 (released 2025.10)

## Open Questions

1. **Where does the combined @theme + :root output get written?**
   - What we know: The handoff workflow produces `HND-handoff-spec-v{N}.md` and `HND-types-v{N}.ts`. Token CSS has historically gone to `.planning/design/assets/tokens.css`.
   - What's unclear: FMT-02 says "converted to Tailwind v4 @theme declarations and CSS custom properties" — this could be a new `.planning/design/assets/tokens-tailwind.css` file, or an additional section in the handoff spec.
   - Recommendation: Emit a separate `tokens-tailwind.css` file alongside the existing `tokens.css`. The handoff spec gets a reference block showing the @theme snippet. This keeps the handoff spec human-readable while providing a directly usable CSS file.

2. **Scope of @file annotations: handoff spec only vs. types file too?**
   - What we know: FMT-01 says "handoff specs include @file annotations." The types file (HND-types-v{N}.ts) has JSDoc comments.
   - What's unclear: Whether TypeScript files should also get `@component:` annotations at the interface level.
   - Recommendation: Annotations in `.md` handoff spec only. TypeScript already has JSDoc. Keep the @file annotation format limited to markdown output — the success criteria ("handoff specs include") confirms this scope.

3. **Token source: design-manifest.tokens vs SYS-*.json files?**
   - What we know: `design-manifest.json` has a `tokens` object (from design pipeline). CONTEXT.md says SYS-*.json files are at `.planning/design/tokens/`. The current project has an empty manifest and no tokens directory.
   - What's unclear: Whether FMT-02 should read from manifest in-memory (existing path used by design.cjs) or from SYS-*.json files on disk.
   - Recommendation: Support both paths. If `design-manifest.json` has tokens, use those. If `.planning/design/tokens/SYS-*.json` files exist, merge them. This matches how context-sync.cjs reads design data.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | none — no config needed |
| Quick run command | `node --test tests/phase-120/test-artifact-format.cjs` |
| Full suite command | `node --test tests/phase-118/test-context-sync.cjs && node --test tests/phase-119/test-antigravity-stitch.cjs && node --test tests/phase-120/test-artifact-format.cjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FMT-01 | @file annotations emitted before component sections | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-01 | Annotations use `<!-- @component: X -->`, `<!-- @props: X -->`, `<!-- @tokens: X -->` format | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-01 | Annotations extractable via regex `/<!-- @(component\|props\|tokens): ([^>]+) -->/g` | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-02 | DTCG tokens produce `@theme { ... }` block with correct variable names | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-02 | DTCG `$type: color` maps to `--color-` namespace | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-02 | DTCG `$type: dimension` maps to `--spacing-` namespace | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-02 | DTCG `$type: fontFamily` maps to `--font-` namespace | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-02 | Output also includes `:root { }` CSS custom properties block | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-02 | OKLCH values pass through unmodified in @theme output | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-02 | Graceful empty output when no tokens present | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-03 | `vue` in package.json deps returns "Vue" | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-03 | `svelte` in package.json deps returns "Svelte" | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-03 | `react` + `react-dom` in deps returns "React" | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-03 | Missing package.json returns null (graceful fallback) | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-03 | React component stub contains `FC<Props>`, Vue contains `defineProps<Props>`, Svelte contains `export let` | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |
| FMT-03 | Default stub (no package.json) is React | unit | `node --test tests/phase-120/test-artifact-format.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-120/test-artifact-format.cjs`
- **Per wave merge:** `node --test tests/phase-118/test-context-sync.cjs && node --test tests/phase-119/test-antigravity-stitch.cjs && node --test tests/phase-120/test-artifact-format.cjs`
- **Phase gate:** Full suite green (all 3 test files) before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-120/test-artifact-format.cjs` — covers FMT-01, FMT-02, FMT-03 (all unit tests)
- [ ] `bin/lib/artifact-format.cjs` — new module (created in Wave 0 or task 1)

## Sources

### Primary (HIGH confidence)
- Official Tailwind CSS docs (https://tailwindcss.com/docs/theme) — @theme syntax, namespace prefixes, OKLCH support, :root output behavior
- Codebase: `bin/lib/design.cjs` lines 161-193 — existing `dtcgToCssLines()` and `generateCssVars()` functions to extend
- Codebase: `bin/lib/context-sync.cjs` lines 290-340, 800-870 — IR builder + emitter pattern to replicate
- Codebase: `templates/handoff-spec.md` lines 232-298 — existing React/Vue/Svelte stub templates (literal source for FMT-03 output)
- Codebase: `tests/phase-119/test-antigravity-stitch.cjs` — exact test structure to mirror

### Secondary (MEDIUM confidence)
- W3C DTCG specification announcement (https://www.w3.org/community/design-tokens/) — `$value`/`$type` format confirmed stable 2025.10
- Style Dictionary DTCG docs (https://styledictionary.com/info/dtcg/) — confirmed $type values for color, dimension, fontFamily

### Tertiary (LOW confidence)
- Medium article on Tailwind v4 @theme (https://medium.com/@sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06) — used only to confirm community adoption patterns; official docs are authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero npm deps is a hard project constraint; only built-ins + existing modules apply
- Architecture: HIGH — emitter pattern from Phase 118/119 is well-established in codebase; new module follows identical shape
- FMT-01 (@file annotations): HIGH — format matches existing `<!-- @component: -->` pattern already in handoff.md Step 4b-stitch
- FMT-02 (Tailwind @theme): HIGH — Tailwind v4 @theme syntax confirmed from official docs; OKLCH passthrough confirmed
- FMT-03 (framework detection): HIGH — package.json dependency detection is standard, reliable pattern; template stubs already exist in templates/handoff-spec.md
- Pitfalls: HIGH — derived from direct codebase inspection of existing token conversion logic

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable domain — Tailwind v4 API stable, DTCG spec stable)
