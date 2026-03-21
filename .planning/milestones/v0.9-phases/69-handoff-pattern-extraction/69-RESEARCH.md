# Phase 69: Handoff Pattern Extraction - Research

**Researched:** 2026-03-21
**Domain:** handoff.md workflow modification, Stitch artifact detection, hex-to-OKLCH conversion, TypeScript interface generation with Stitch-only component handling
**Confidence:** HIGH (all infrastructure from Phases 65-68 is directly readable; handoff.md is fully traced; patterns directly mirrored from Phase 68)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HND-01 | `/pde:handoff` detects Stitch-sourced artifacts and applies pattern extraction mode | `manifest-read` command in pde-tools.cjs; manifest `artifacts[slug].source === "stitch"` field written by Phase 66; detection follows identical pattern to Phase 68 CRT-01 (Step 2g) |
| HND-02 | Hex-to-OKLCH inline conversion for extracted color values (following existing `figmaColorToCss` precedent) | `figmaColorToCss` in sync-figma.md is the precedent: inline JS function, no npm deps. Inverse operation (hex→OKLCH) requires hex→linear sRGB→OKLab→OKLCH math, fully defined in 29-RESEARCH.md lines 1757-1793 with inverse direction |
| HND-03 | Component pattern extraction from annotated Stitch HTML produces TypeScript interfaces | Handoff Step 4b already extracts `<!-- ANNOTATION: -->` blocks; Stitch HTML uses `<!-- @component: ComponentName -->` format (Phase 66 injection); extraction needs to handle both annotation formats |
| HND-04 | `stitch_annotated: true` gate — handoff verifies annotation injection completed before extracting patterns | Manifest `stitch_annotated` field written by wireframe.md line 421; `manifest-read` returns this field; gate fires before component extraction, not before entire handoff |

</phase_requirements>

---

## Summary

Phase 69 modifies `workflows/handoff.md` in targeted places to add Stitch-aware pattern extraction. The work is entirely a workflow modification — no new pde-tools.cjs commands, no new mcp-bridge.cjs exports, no new Node.js scripts. The pattern is identical to Phase 68: detect Stitch artifacts from the manifest, apply mode-specific behavior when detected, and append a new output section to the existing handoff spec.

There are four insertion points: (1) **New Step 2l** — after the existing annotation completeness check (Step 2j) and version gate (Step 2k), read the manifest and classify each wireframe as Stitch-sourced or Claude-sourced; also verify `stitch_annotated: true` before marking the artifact as extractable; (2) **Step 4b extension** — when extracting annotations from wireframe HTML, handle Stitch's `<!-- @component: ComponentName -->` format alongside the existing `<!-- ANNOTATION: ... -->` format; (3) **Step 5b extension** — when writing HND-types-v{N}.ts, add a `## STITCH_COMPONENT_PATTERNS` section for Stitch-sourced artifacts, with component entries tagged by source (WFR+Stitch / Stitch-only / WFR-only), and Stitch-only components labeled "verify before implementation"; (4) **Step 5c extension** — in HND-types-v{N}.ts, for color values extracted from Stitch HTML, apply inline hex-to-OKLCH conversion before writing the TypeScript interface fields.

The critical design constraint is the `stitch_annotated: true` hard gate: if a Stitch artifact exists in the manifest but `stitch_annotated` is false (or absent), handoff must refuse to extract patterns for that artifact and tell the user to run `/pde:wireframe --use-stitch` first. This is the success criterion for HND-04. The gate is per-artifact (not global) — a run may have some artifacts that pass and some that fail the gate.

**Primary recommendation:** Implement as a single workflow-modification plan (handoff.md only — four insertion points) plus a single Nyquist test plan covering all 4 requirements.

---

## Standard Stack

### Core (all from Phases 65-68 — already shipped)

| Module | Version | Purpose | Why Standard |
|--------|---------|---------|--------------|
| `bin/pde-tools.cjs` | Phase 65 | `design manifest-read` — reads per-artifact `source` and `stitch_annotated` fields | Only authorised way to read design-manifest.json; returns full JSON |
| `bin/pde-tools.cjs` | Phase 65 | `design coverage-check` + `manifest-set-top-level` | Read-before-set pattern for hasHandoff coverage flag (unchanged from existing Step 7c) |
| Node.js built-in test runner | Built-in | Nyquist tests (`node:test`) | Project standard since Phase 65 |

### Supporting

| Module | Version | Purpose | When to Use |
|--------|---------|---------|-------------|
| `.planning/design/design-manifest.json` | Phase 66 | Contains `artifacts.STH-{slug}.source === "stitch"` and `artifacts.STH-{slug}.stitch_annotated === true` | Read via `pde-tools design manifest-read` in new Step 2l |
| Inline `hexToOklch` function | inline JS | Hex color to `oklch(L C H)` string — no npm deps | Applied to color values extracted from Stitch HTML per HND-02 |

### No New npm Dependencies

Zero-npm constraint is project policy (REQUIREMENTS.md Out of Scope). All libraries used here are Node.js built-ins or inline functions defined in the workflow prose.

---

## Architecture Patterns

### Workflow Insertion Map

Phase 69 adds exactly 4 insertion points to `workflows/handoff.md`. All other steps run unchanged.

```
/pde:handoff [flags]

Step 1/7: Initialize design directories             ← unchanged
Step 1.5/7: Figma Code Connect                      ← unchanged
Step 2/7: Check prerequisites + discover artifacts
  2a. STACK.md (hard dependency)                    ← unchanged
  2b. Coverage flags                                 ← unchanged
  2c-2i. Soft dependencies (brief, flows, wireframes, etc.) ← unchanged
  2j. Annotation completeness check                 ← unchanged
  2k. Version gate                                   ← unchanged
  *** 2l. NEW: Read manifest, classify STH artifacts, verify stitch_annotated ***
Step 3/7: MCP probes                                ← unchanged
Step 4/7: Synthesize artifacts into spec content
  4a. Load artifacts                                 ← unchanged
  4b. Extract annotations from wireframes
      *** EXTEND: handle @component: format for Stitch HTML ***
  4c-4i. (unchanged)
Step 5/7: Write output files
  5b. Write HND-handoff-spec-v{N}.md
      *** EXTEND: append STITCH_COMPONENT_PATTERNS section ***
  5c. Write HND-types-v{N}.ts
      *** EXTEND: add STITCH_COMPONENT_PATTERNS section with hexToOklch colors ***
  5d. Release lock                                   ← unchanged
Step 6/7: Update handoff DESIGN-STATE               ← unchanged
Step 7/7: Update root DESIGN-STATE + manifest + coverage ← unchanged
```

### Pattern 1: Manifest-Based Stitch Detection + stitch_annotated Gate (HND-01 + HND-04)

**What:** After Step 2k (version gate), read the manifest to classify each wireframe as Stitch-sourced. For each Stitch artifact, check `stitch_annotated`. Artifacts without `stitch_annotated: true` are placed on a STITCH_UNANNOTATED list — they are excluded from pattern extraction and trigger a user-visible message.

**Step insertion:** New Step 2l, after Step 2k (version gate), before Step 3.

```markdown
#### 2l. Classify Stitch artifacts and verify annotation gate

Read the design manifest:

```bash
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
```

Parse JSON. For each file in WIREFRAME_FILES:
- Extract artifact code from filename stem (e.g., `STH-login.html` → `STH-login`)
- If `manifest.artifacts[code].source === "stitch"`: add to STITCH_CANDIDATES

For each code in STITCH_CANDIDATES:
- If `manifest.artifacts[code].stitch_annotated === true`: add to STITCH_ARTIFACTS (extractable)
- Else: add to STITCH_UNANNOTATED (gate failed)

If STITCH_UNANNOTATED is non-empty:
  For each unannotated artifact, display:
  ```
  Warning: Stitch artifact STH-{slug} cannot be pattern-extracted.
    stitch_annotated: true was not set in the manifest.
    Annotation injection is a hard prerequisite for pattern extraction.
    To fix: run /pde:wireframe --use-stitch to regenerate with annotations.
    This artifact will be skipped in STITCH_COMPONENT_PATTERNS output.
  ```

If STITCH_ARTIFACTS is non-empty:
  Display: `Step 2/7: {N} Stitch artifact(s) ready for pattern extraction: {slug-list}.`
Else if STITCH_UNANNOTATED is non-empty:
  Display: `Step 2/7: No Stitch artifacts available for extraction. Run /pde:wireframe --use-stitch first.`
Else:
  Display: `Step 2/7: No Stitch artifacts detected. Standard handoff mode.`
```

**Why `stitch_annotated` is the gate, not `source`:** `source: "stitch"` means the artifact came from Stitch. `stitch_annotated: true` means the annotation injection step (Phase 66 Step 6 sub-step 10) completed successfully. A Stitch artifact without annotations cannot yield meaningful component patterns. The gate reflects HND-04 exactly: "handoff verifies annotation injection completed before extracting patterns."

**Why per-artifact, not global:** The user may run `/pde:wireframe --use-stitch` for some screens and Claude generation for others. The gate must allow partial Stitch extraction while still producing a valid handoff spec for Claude-generated screens.

### Pattern 2: Annotation Extraction from Stitch HTML (HND-03)

**What:** Handoff Step 4b already extracts `<!-- ANNOTATION: ... -->` blocks from wireframe HTML. Stitch HTML uses a different comment format: `<!-- @component: ComponentName -->` (injected by Phase 66). Step 4b must be extended to extract both formats.

**Insertion point:** In Step 4b, inside the per-wireframe loop, for files in STITCH_ARTIFACTS.

**Existing format (Claude wireframes):**
```html
<!-- ANNOTATION: Component: LoginForm, State: default, Props: {onSubmit?: (data: FormData) => void}, ... -->
<div class="pde-state--default">
```

**Stitch format (Phase 66 injection):**
```html
<!-- @component: Navigation -->
<nav class="...">
<!-- @component: Form -->
<form class="...">
```

The `@component:` format provides component names only, not full prop shapes. The extraction strategy:
1. Extract all `<!-- @component: ComponentName -->` comments — these define component boundaries
2. Inspect the HTML element immediately following each comment (tag name, attributes, children) to infer props
3. Apply the same semantic reasoning already used in Step 4b for sparse annotations
4. For color values found in inline styles or style attributes (`color: #rrggbb`, `background-color: #rrggbb`, `border-color: #rrggbb`), extract the hex values for HND-02 conversion in Step 5c

**Phase 66 annotation format confirmed:** wireframe.md line 344-372 shows the exact componentMap:
- `<!-- @component: Navigation -->` before `<nav`
- `<!-- @component: Header -->` before `<header`
- `<!-- @component: MainContent -->` before `<main`
- `<!-- @component: Section -->` before `<section`
- `<!-- @component: Form -->` before `<form`

These 5 component types are the maximum injection set. Stitch HTML may contain additional structural elements (divs, articles, asides) that are NOT annotated — these should be reported as unannotated sections in the extraction log.

### Pattern 3: STITCH_COMPONENT_PATTERNS Section in Handoff Spec (HND-01 success criterion)

**What:** Appended after the existing per-screen detail sections in the handoff spec. One `## STITCH_COMPONENT_PATTERNS` section covers all Stitch artifacts. Each component entry is tagged by source: WFR+Stitch, Stitch-only, or WFR-only.

**Source tagging logic:**
- **WFR+Stitch**: Component found in BOTH the Stitch `@component:` annotations AND in WFR wireframe annotations from the same screen (cross-reference by component name)
- **Stitch-only**: Component found ONLY in Stitch `@component:` annotations — no matching WFR annotation exists
- **WFR-only**: Component found ONLY in WFR `<!-- ANNOTATION: -->` blocks — no Stitch counterpart

**Stitch-only handling (HND-04 success criterion 4):** Components tagged Stitch-only must NOT be silently omitted OR silently accepted as authoritative. They must be included in HND-types.ts with:
1. A JSDoc `/** @verify - Stitch-only component: verify before implementation */` comment
2. A human decision prompt in the handoff spec: "This component appears in Stitch output but has no WFR wireframe counterpart. Verify it represents intended functionality before implementing."

```markdown
## STITCH_COMPONENT_PATTERNS

> This section is generated from Stitch-annotated HTML artifacts.
> Components are tagged by source: WFR+Stitch (confirmed), Stitch-only (verify before implementation), WFR-only (no Stitch counterpart).
> Color values have been converted from hex to OKLCH format.

{for each slug in STITCH_ARTIFACTS:}

### STH-{slug} Component Patterns

| Component | Source Tag | Annotation Type | Notes |
|-----------|-----------|-----------------|-------|
| Navigation | WFR+Stitch | @component: Navigation | Found in both STH and WFR wireframes |
| Form | WFR+Stitch | @component: Form | Found in both |
| {ComponentName} | Stitch-only | @component: {tag} | **Verify before implementation** |
| {ComponentName} | WFR-only | ANNOTATION: | No Stitch counterpart |

{end per-slug loop}
```

### Pattern 4: Hex-to-OKLCH Inline Conversion (HND-02)

**What:** Color values extracted from Stitch HTML (hardcoded hex: `#3b82f6`, `#ffffff`, `#1f2937`, etc.) must be converted to OKLCH format in the TypeScript interfaces. This follows the `figmaColorToCss` precedent in sync-figma.md: an inline function in the workflow prose, no npm dependencies.

**Math pipeline (hex → OKLCH):** This is the reverse of the `oklchToSRGB` function already documented in the codebase (29-RESEARCH.md lines 1757-1793). The forward path is OKLCH → OKLab → Linear sRGB → sRGB. The inverse path is:

```
hex → sRGB [0-255] → Linear sRGB → OKLab → OKLCH
```

```javascript
// Inline hexToOklch function — no npm dependencies
// Source pattern: sync-figma.md figmaColorToCss (inline, zero deps)
// Math source: bottosson.github.io/posts/oklab/ (reverse of oklchToSRGB in 29-RESEARCH.md)
function hexToOklch(hex) {
  // Handle shorthand hex (#rgb → #rrggbb)
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  // Handle 8-digit hex with alpha (#rrggbbaa) — drop alpha, use rgb only
  if (hex.length === 9) {
    hex = hex.slice(0, 7);
  }
  // Guard: return null for non-hex (named colors like 'transparent', 'inherit')
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

  // Step 1: Hex → sRGB [0-1]
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // Step 2: sRGB → Linear sRGB (gamma expansion)
  function toLinear(x) {
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // Step 3: Linear sRGB → OKLab (via LMS)
  // LMS cube root
  const lms_l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const lms_m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const lms_s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  // LMS → OKLab
  const L = 0.2104542553 * lms_l + 0.7936177850 * lms_m - 0.0040720468 * lms_s;
  const a = 1.9779984951 * lms_l - 2.4285922050 * lms_m + 0.4505937099 * lms_s;
  const bVal = 0.0259040371 * lms_l + 0.7827717662 * lms_m - 0.8086757660 * lms_s;

  // Step 4: OKLab → OKLCH
  const C = Math.sqrt(a * a + bVal * bVal);
  let H = Math.atan2(bVal, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  // Round to 3 decimal places (matches system.md rounding convention)
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}
```

**Edge cases to handle:**

| Input | Behavior |
|-------|----------|
| `#rgb` (3-digit shorthand) | Expand to `#rrggbb` before conversion |
| `#rrggbbaa` (8-digit with alpha) | Drop alpha channel, convert rgb portion only |
| `transparent` (named color) | Return `null` — cannot convert; skip or use `oklch(0 0 0 / 0)` |
| `inherit`, `currentColor`, CSS variables | Return `null` — cannot convert; preserve original string in interface |
| `#ffffff` (white) | `oklch(1.000 0.000 0.0)` — valid, zero chroma |
| `#000000` (black) | `oklch(0.000 0.000 0.0)` — valid |
| Values with sRGB gamut clipping | OKLCH can represent out-of-gamut; clamp to valid OKLCH range if C > 0.37 at target L |

**Where conversion applies:** Only color values extracted from Stitch HTML inline styles, style attributes, and color-bearing CSS properties. The conversion happens in Step 5c (TypeScript interface generation), not Step 4b (annotation extraction). This keeps Step 4b as a pure extraction step.

### Pattern 5: TypeScript Interfaces with Stitch-Only Labels (HND-03 + HND-04)

The TypeScript interfaces for Stitch components follow the existing HND-types-v{N}.ts content rules (interfaces only, no imports, JSDoc on every field). Stitch-sourced components get a dedicated section in the types file:

```typescript
// ─── Stitch Component Patterns ──────────────────────────────────────────────

/**
 * Components extracted from Stitch-annotated HTML artifacts.
 * WFR+Stitch: confirmed in both wireframe and Stitch output.
 * Stitch-only: present in Stitch output only — verify before implementation.
 * Color values converted from hex to OKLCH.
 */

// Screen: {slug} — {WFR+Stitch or Stitch-only} source tag

/** Navigation component extracted from STH-{slug}.html */
export interface STH_{Slug}_NavigationProps {
  /** Primary navigation links */
  links: Array<{ label: string; href: string }>;
  /** Brand color — converted from Stitch hex #3b82f6 to OKLCH */
  brandColor?: string; // oklch(0.590 0.210 264.0)
}

/**
 * @verify - Stitch-only component: verify before implementation.
 * Human decision required: this component appears in Stitch output
 * but has no WFR wireframe counterpart. Confirm it represents
 * intended functionality before building.
 */
export interface STH_{Slug}_{StitchOnlyComponent}Props {
  // ... inferred props from HTML structure
}
```

**Naming convention:** `STH_{Slug}_{ComponentName}Props` using PascalCase slug (e.g., `STH_Login_NavigationProps`). This distinguishes Stitch-extracted interfaces from standard WFR interfaces in the same file and makes the source explicit in code.

### Anti-Patterns to Avoid

- **Silently omitting Stitch-only components:** The success criterion explicitly requires inclusion with a "verify before implementation" label. A Stitch-only component that is absent from the types file is a violation.
- **Running pattern extraction without stitch_annotated gate:** If `stitch_annotated` is false/absent, the `@component:` comments were not injected — the HTML contains no component boundaries. Extracting from unannotated Stitch HTML produces meaningless results.
- **Checking `source: "stitch"` without checking `stitch_annotated`:** Both checks are required. The source field confirms origin; the stitch_annotated field confirms usability for extraction.
- **Adding STITCH_COMPONENT_PATTERNS to the scored critique or Action List:** This section is informational. It does not affect the handoff spec composite score (there is no score) and must not be confused with WFR-sourced component specs.
- **Applying hexToOklch to non-color values:** Only CSS color values (`color:`, `background-color:`, `border-color:`, `fill:`, `stroke:`) should be converted. Spacing values in px, opacity values in 0-1, and font sizes in rem/px are not colors and must not be processed by hexToOklch.
- **Replacing the standard handoff pipeline for Stitch artifacts:** The entire existing handoff pipeline (STACK.md, wireframe annotation extraction, TypeScript interfaces, route mapping) runs for ALL artifacts. Phase 69 ADDS pattern extraction on top for Stitch artifacts — it does not create a separate Stitch-only handoff path.
- **Converting named/CSS-variable colors to OKLCH:** `transparent`, `inherit`, `currentColor`, `var(--color-*)` are not convertible. Return the original value unchanged.
- **Using inline `require()` in workflow bash blocks:** Phase 66 confirmed the project validator rejects this pattern. All Node.js bash blocks that load CJS modules must use the ESM `createRequire` pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading manifest for Stitch source + stitch_annotated | Direct JSON file read in bash | `pde-tools.cjs design manifest-read` | Same as CRT-01/CRT-02; wrapper handles @file: pattern, path resolution |
| Coverage flag update at Step 7c | Partial JSON write | `coverage-check` + `manifest-set-top-level` 14-field object | Mandatory read-before-set — identical to existing handoff.md Step 7c pattern |
| Hex-to-OKLCH math | npm `culori` or `color` package | Inline `hexToOklch` function (see Code Examples) | Zero-npm policy; math is 25 lines, fully self-contained |
| Component name extraction from HTML | Full HTML parser / cheerio | Regex on `<!-- @component: ComponentName -->` comments | Phase 66 annotations are simple comments; regex is sufficient and matches the injection format exactly |
| Stitch artifact discovery | Custom glob on `STH-*.html` | `manifest-read` — look for `source === "stitch"` | Manifest is the authoritative record; file system scan misses `stitch_annotated` status |
| WFR vs Stitch component cross-reference | Custom comparison logic | Simple string-match on component names from both SCREEN_ANNOTATIONS[slug] and Stitch extraction | Annotation component names are already extracted by Step 4b; Stitch names come from `@component:` comments |

---

## Common Pitfalls

### Pitfall 1: stitch_annotated Gate Placement
**What goes wrong:** The gate fires once globally (blocking entire handoff if any unannotated artifact exists) instead of per-artifact.
**Why it happens:** Treating the unannotated artifact check as a hard stop rather than a per-artifact filter.
**How to avoid:** The gate is per-artifact: unannotated artifacts are excluded from STITCH_ARTIFACTS and placed on STITCH_UNANNOTATED, but the handoff still proceeds for all other artifacts. Display a clear warning per unannotated artifact. Only halt (per REQUIREMENTS success criterion 2) when `stitch_annotated` is absent/false AND the user appears to expect Stitch extraction.
**Warning signs:** User runs handoff and all Claude-sourced wireframes are skipped because one Stitch artifact failed the gate.

### Pitfall 2: @component: vs ANNOTATION: Format Mismatch
**What goes wrong:** Step 4b's annotation extraction ignores `<!-- @component: -->` comments because it only looks for `<!-- ANNOTATION: -->` format.
**Why it happens:** handoff.md Step 4b sub-step 1 says "Find all `<!-- ANNOTATION: ... -->` blocks" — the Stitch format uses `@component:`, not `ANNOTATION:`.
**How to avoid:** The Step 4b extension for Stitch artifacts must explicitly search for `<!-- @component: -->` (literal `@component:` prefix). These are two separate extraction passes: one for standard ANNOTATION format, one for Stitch @component format.
**Warning signs:** STITCH_COMPONENT_PATTERNS section is empty even though the HTML contains `@component:` comments.

### Pitfall 3: Shorthand Hex and Named Colors in hexToOklch
**What goes wrong:** `hexToOklch('#fff')` returns null or throws because the regex `/^#[0-9a-fA-F]{6}$/` rejects 3-digit hex. `hexToOklch('transparent')` throws during parseInt.
**Why it happens:** Stitch HTML uses a mix of shorthand hex (`#fff`), full hex (`#ffffff`), and named colors (`transparent`, `white`).
**How to avoid:** Normalize input before the regex check: expand 3-digit hex to 6-digit, strip alpha from 8-digit hex. Guard against non-hex strings by checking the pattern early and returning null. In the TypeScript interface, use a comment showing the original hex alongside the OKLCH value.
**Warning signs:** hexToOklch crashes on `#fff` or `transparent`, causing the entire workflow step to fail.

### Pitfall 4: Naming Collision Between WFR and STH Interfaces
**What goes wrong:** `export interface NavigationProps` is declared twice in HND-types-v{N}.ts — once for the WFR-sourced navigation and once for the Stitch-extracted navigation.
**Why it happens:** Both pipelines may discover a "Navigation" component; without namespacing, identical interface names collide.
**How to avoid:** Stitch-extracted interfaces use the `STH_{Slug}_{ComponentName}Props` naming convention (e.g., `STH_Login_NavigationProps`). WFR-sourced interfaces use the existing convention (`LoginNavigationProps` or `NavigationProps`). The prefix `STH_` distinguishes the two.
**Warning signs:** TypeScript compilation errors on duplicate identifier names in HND-types-v{N}.ts.

### Pitfall 5: ESM createRequire Pattern
**What goes wrong:** Workflow bash block uses `require()` directly for pde-tools.cjs calls related to manifest-read, triggering the project validator error.
**Why it happens:** Phase 66 confirmed the validator rejects inline `require()` in workflow sandbox scope.
**How to avoid:** The `manifest-read` call uses the plain `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs"` pattern (not inline Node.js with require). The ESM createRequire pattern is needed only when calling mcp-bridge.cjs functions from inside a Node.js heredoc (`node --input-type=module <<'EOF'`). Review Phase 66 Summary for exact examples.
**Warning signs:** Project validator flags the workflow file after modification.

### Pitfall 6: Stitch-Only Components Silently Omitted
**What goes wrong:** A component found only in Stitch output (`@component: CardGrid`) has no WFR counterpart, so it gets silently excluded from STITCH_COMPONENT_PATTERNS because no cross-reference match is found.
**Why it happens:** Cross-reference logic only adds components found in BOTH sources — components with no WFR counterpart fall through.
**How to avoid:** The WFR-cross-reference loop must have a collect-unmatched step. Components with no WFR counterpart are added to the STITCH_ONLY_COMPONENTS list and explicitly included in the output with the "verify before implementation" label.
**Warning signs:** STITCH_COMPONENT_PATTERNS shows fewer components than `@component:` annotations in the HTML.

### Pitfall 7: Standard Handoff Annotation Completeness Check Rejects Stitch HTML
**What goes wrong:** Step 2j's annotation completeness check counts `pde-state--` divs and `<!-- ANNOTATION: -->` comments. Stitch HTML has neither (it's Google-generated HTML without PDE scaffold). The check may emit a misleading "low annotation coverage" warning or incorrect percentage for STH files.
**Why it happens:** Step 2j logic is designed for Claude-generated WFR HTML. Stitch HTML has a completely different structure.
**How to avoid:** In the Step 2j extension (or in the new Step 2l), for Stitch artifacts: skip the STATE_DIV_COUNT / ANNOTATION_COUNT check. Instead, count `@component:` comment occurrences as the annotation proxy. Log a note that Stitch HTML uses @component: format, not pde-state/ANNOTATION format.
**Warning signs:** Every STH file shows "0% annotation coverage" warning in Step 2j.

---

## Code Examples

Verified patterns from project codebase analysis:

### Step 2l: Manifest Read, Stitch Classification, and stitch_annotated Gate

```markdown
#### 2l. Classify Stitch artifacts and verify annotation gate

```bash
MANIFEST=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-read)
if [[ "$MANIFEST" == @file:* ]]; then MANIFEST=$(cat "${MANIFEST#@file:}"); fi
```

Parse JSON output. For each file path in WIREFRAME_FILES:
- Extract slug from path (e.g., `.planning/design/ux/wireframes/STH-login.html` → code `STH-login`)
- Check: `manifest.artifacts["STH-login"].source === "stitch"`
- If true: check `manifest.artifacts["STH-login"].stitch_annotated === true`
  - If stitch_annotated true: add code to STITCH_ARTIFACTS
  - If stitch_annotated false/absent: add code to STITCH_UNANNOTATED

For each code in STITCH_UNANNOTATED: display warning with /pde:wireframe --use-stitch remediation message.
SET STITCH_ARTIFACTS = [...] (only annotated ones)
```

### Step 4b Extension: @component: Extraction for Stitch HTML

```markdown
#### 4b sub-step for Stitch artifacts:

For each slug in STITCH_ARTIFACTS (within WIREFRAME_FILES):
  From WIREFRAME_CONTENTS[slug]:

  1. Find all `<!-- @component: ComponentName -->` comments.
     Regex: /<!-- @component: ([^>]+) -->/g
     For each match: store {name: match[1], element: nextSiblingTag}

  2. For each found component, inspect the HTML immediately following the comment:
     - If `<nav`: links array, aria-label
     - If `<header`: logo, nav, actions
     - If `<main`: content children, scroll behavior
     - If `<section`: section-id, heading, children
     - If `<form`: fields array, onSubmit handler, isLoading, error states

  3. Extract all hex color values from inline styles or class-embedded styles:
     Regex: /#([0-9a-fA-F]{3,8})\b/g
     Store as STITCH_COLORS[slug] = [{property, hexValue, componentName}]

Store as STITCH_SCREEN_ANNOTATIONS[slug] = {components, colors}
```

### hexToOklch Inline Function (for workflow prose)

```javascript
// Source: math from bottosson.github.io/posts/oklab/ (reverse of 29-RESEARCH.md oklchToSRGB)
// Pattern: inline zero-dep function following sync-figma.md figmaColorToCss precedent
function hexToOklch(hex) {
  // Normalize shorthand
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    hex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3];
  }
  // Strip alpha from 8-digit hex
  if (/^#[0-9a-fA-F]{8}$/.test(hex)) {
    hex = hex.slice(0, 7);
  }
  // Guard: non-hex (transparent, inherit, var(--), etc.)
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  function toLinear(x) {
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);

  // Linear sRGB → LMS (cube roots)
  const l_ = Math.cbrt(0.4122214708*lr + 0.5363325363*lg + 0.0514459929*lb);
  const m_ = Math.cbrt(0.2119034982*lr + 0.6806995451*lg + 0.1073969566*lb);
  const s_ = Math.cbrt(0.0883024619*lr + 0.2817188376*lg + 0.6299787005*lb);

  // LMS → OKLab
  const L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_;
  const a = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_;
  const bK = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_;

  // OKLab → OKLCH
  const C = Math.sqrt(a*a + bK*bK);
  let H = Math.atan2(bK, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}
```

**Verification test cases:**
- `hexToOklch('#3b82f6')` → approximately `oklch(0.590 0.210 264.0)` (medium blue)
- `hexToOklch('#ffffff')` → `oklch(1.000 0.000 0.0)` (white — zero chroma)
- `hexToOklch('#000000')` → `oklch(0.000 0.000 0.0)` (black)
- `hexToOklch('#fff')` → same as `#ffffff` after expansion
- `hexToOklch('transparent')` → `null` (named color guard)

### TypeScript Interface with Stitch-Only Label

```typescript
// Source: HND-types-v{N}.ts format from handoff.md Step 5c
// Section header follows existing box-drawing comment convention

// ─── Stitch Component Patterns ──────────────────────────────────────────────

// Screen: login — extracted from STH-login.html

/** Navigation component extracted from STH-login.html (WFR+Stitch) */
export interface STH_Login_NavigationProps {
  /** Navigation links */
  links: Array<{ label: string; href: string }>;
  /**
   * Brand color — Stitch hex #3b82f6 converted to OKLCH.
   * @see oklch(0.590 0.210 264.0)
   */
  brandColor?: string;
}

/**
 * @verify - Stitch-only component: verify before implementation.
 * This component (CardGrid) appears in Stitch output (STH-login.html)
 * but has no WFR wireframe counterpart. Confirm it represents
 * intended functionality before building.
 */
export interface STH_Login_CardGridProps {
  /** Card data items */
  items: Array<{ id: string; title: string; description?: string }>;
  /**
   * Card background — Stitch hex #f9fafb converted to OKLCH.
   * @see oklch(0.985 0.003 247.9)
   */
  cardBackground?: string;
}
```

### Nyquist Test Pattern (following Phase 68 file-parse style)

```javascript
// Pattern: identical to tests/phase-68/stitch-detection.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const handoffMd = readFileSync(resolve(ROOT, 'workflows', 'handoff.md'), 'utf8');

describe('HND-01: Stitch artifact detection', () => {
  test('handoff.md reads design manifest for source classification', () => {
    assert.ok(handoffMd.includes('manifest-read'), 'missing manifest-read');
  });
  test('handoff.md references STITCH_ARTIFACTS', () => {
    assert.ok(handoffMd.includes('STITCH_ARTIFACTS'), 'missing STITCH_ARTIFACTS');
  });
});

describe('HND-04: stitch_annotated gate', () => {
  test('handoff.md checks stitch_annotated', () => {
    assert.ok(handoffMd.includes('stitch_annotated'), 'missing stitch_annotated check');
  });
  test('handoff.md references STITCH_UNANNOTATED list', () => {
    assert.ok(handoffMd.includes('STITCH_UNANNOTATED'), 'missing STITCH_UNANNOTATED');
  });
  test('Remediation message present for unannotated artifacts', () => {
    assert.ok(
      handoffMd.includes('--use-stitch') && handoffMd.includes('stitch_annotated'),
      'missing user remediation message'
    );
  });
});
```

---

## Existing Code Integration Points

### handoff.md — Four Insertion Points

**Insertion 1: New Step 2l** (after Step 2k version gate, before Step 3)
- Add `manifest-read` command
- Build STITCH_ARTIFACTS (annotated Stitch artifacts) and STITCH_UNANNOTATED (gate failed)
- Display per-artifact warning for unannotated Stitch artifacts with remediation message
- Log count of extractable Stitch artifacts

**Insertion 2: Step 4b extension** (per-wireframe loop, for files in STITCH_ARTIFACTS)
- After standard `<!-- ANNOTATION: -->` extraction, also extract `<!-- @component: -->` comments
- Regex for Stitch annotations: `/<!-- @component: ([^>]+) -->/g`
- Infer props from element structure following each comment
- Extract hex color values from inline styles for later OKLCH conversion
- Store as STITCH_SCREEN_ANNOTATIONS[slug]

**Insertion 3: Step 5b extension** (HND-handoff-spec assembly)
- After the existing per-screen sections (section 10), before or after the Hardware Handoff section (section 11)
- Add conditional `## STITCH_COMPONENT_PATTERNS` section
- Include per-screen component table with WFR+Stitch / Stitch-only / WFR-only source tags
- Stitch-only entries include "verify before implementation" decision prompt

**Insertion 4: Step 5c extension** (HND-types writing)
- Add `// ─── Stitch Component Patterns ───` section after existing screen sections
- For each Stitch artifact: write STH_{Slug}_{Component}Props interfaces
- Apply hexToOklch to extracted color values; include original hex in JSDoc comment
- Stitch-only components get `@verify` JSDoc annotation

**No changes to:** Steps 1, 1.5, 3, 4c-4i, 5a (lock), 5d (lock release), 6, 7 — all unchanged. The standard pipeline (STACK.md, flows, wireframes, tokens, critique, changelogs, motion specs, hardware sections, manifest registration, coverage flag) is unchanged.

### handoff.md — Step 2j Compatibility Fix

Step 2j counts `<div class="pde-state--` occurrences and `<!-- ANNOTATION: -->` occurrences to check annotation coverage. Stitch HTML has neither (no PDE scaffold). Without a compatibility fix, Step 2j will flag every STH file as "0% annotation coverage."

The fix is to add a Stitch-awareness check in Step 2j: if the current wireframe file is in STITCH_CANDIDATES (detected as Stitch-sourced), skip the STATE_DIV_COUNT / ANNOTATION_COUNT ratio check. Instead, count `<!-- @component: -->` occurrences and log: "STH-{slug}: Stitch HTML format — {N} @component: annotations found (pde-state coverage not applicable)."

This requires STITCH_CANDIDATES to be populated before Step 2j. Currently, Step 2l (the new Stitch detection step) is placed AFTER Steps 2j and 2k. To resolve this ordering issue, either:
- Option A: Move Step 2l to run BEFORE Step 2j (read manifest early)
- Option B: Add a lightweight pre-check in Step 2j to detect STH- filename prefix and skip the ratio check

Option B is simpler and avoids restructuring the existing steps. Use filename prefix detection: if the wireframe filename starts with `STH-`, apply Stitch annotation counting instead of the pde-state counting.

### design-manifest.json — Read-Only in Phase 69

Phase 69 reads the manifest (Step 2l) but does NOT add new per-artifact fields. The `stitch_annotated` field was already set by Phase 66. The manifest update in Step 7b still registers the HND artifact with standard fields (unchanged). No new manifest fields are added.

### pde-tools.cjs — No Modifications

`manifest-read` exists and returns full JSON. No new CLI commands needed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Handoff ignores artifact source; processes all wireframes identically | Handoff detects Stitch source and applies @component: extraction pipeline | Phase 69 | Enables Stitch component interfaces without manual annotation |
| Color values in interfaces are implementation-specific (hex or raw) | Color values extracted from Stitch HTML converted to OKLCH in TypeScript interfaces | Phase 69 | Handoff output aligns with PDE OKLCH-first design system convention |
| Components not found in WFR wireframes silently absent | Stitch-only components included with @verify label and human decision prompt | Phase 69 | Engineer sees ALL discovered components with clear guidance on what needs verification |
| stitch_annotated gate did not exist | stitch_annotated: true required before extraction runs | Phase 69 | Prevents meaningless extraction from unannotated HTML |

**Lineage of this phase:**
- Phase 64: `hasStitchWireframes` field added to 14-field schema (foundation)
- Phase 65: MCP bridge with quota management (infrastructure)
- Phase 66: Annotation injection pipeline (`stitch_annotated: true` field written) — **direct dependency**
- Phase 68: Stitch detection pattern (`manifest-read`, `STITCH_ARTIFACTS`, `source === "stitch"`) — **pattern to mirror**
- Phase 69: Pattern extraction in handoff — **this phase**

---

## Open Questions

1. **WFR cross-reference scope**
   - What we know: The WFR+Stitch source tag requires matching component names between WFR and STH annotations. WFR annotations use rich `<!-- ANNOTATION: Component: LoginForm, ... -->` format with explicit names. STH annotations use `<!-- @component: Navigation -->` format with generic tag-based names.
   - What's unclear: The generic names ("Navigation", "Header", "Form") from STH may not match the specific names from WFR ("SiteNavigation", "DashboardHeader", "LoginForm"). A naive string match will find zero WFR+Stitch matches.
   - Recommendation: Use semantic matching, not exact string matching. "Navigation" in STH matches any WFR component containing "Nav" or "Navigation" in its name. "Form" in STH matches any WFR component containing "Form" in its name. Log match confidence as a note in the STITCH_COMPONENT_PATTERNS table.

2. **hexToOklch color extraction scope in Stitch HTML**
   - What we know: Stitch HTML uses inline styles (`style="color: #3b82f6"`) and stylesheet-embedded styles (`<style>` blocks). The extraction regex can catch inline styles but `<style>` blocks require a more complete CSS parse.
   - What's unclear: How common `<style>` blocks are in Stitch output vs. inline styles. The Phase 66 annotation injection only targets semantic HTML elements, not style content.
   - Recommendation: Extract colors from both inline `style=` attributes (regex on `[a-zA-Z-]+:\s*#[0-9a-fA-F]{3,8}`) and `<style>` block content. For `<style>` blocks, extract all `#[0-9a-fA-F]{3,8}` occurrences with their property context. This is sufficient for the 5 most impactful token categories.

3. **Step 2j ordering with Step 2l**
   - What we know: Step 2j needs to know which files are Stitch-sourced to skip the pde-state ratio check. Step 2l is currently after 2j.
   - Recommendation: Use the filename prefix approach (Option B from Integration Points above): if filename starts with `STH-`, apply Stitch annotation counting. This avoids moving Step 2l before 2j and keeps the implementation minimal.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — tests run directly with `node --test` |
| Quick run command | `node --test tests/phase-69/*.test.mjs` |
| Full suite command | `node --test tests/phase-65/*.test.mjs tests/phase-66/*.test.mjs tests/phase-67/*.test.mjs tests/phase-68/*.test.mjs tests/phase-69/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HND-01 | handoff.md reads manifest-read + builds STITCH_ARTIFACTS from source === "stitch" | unit (file parse) | `node --test tests/phase-69/stitch-detection.test.mjs` | ❌ Wave 0 |
| HND-01 | STITCH_COMPONENT_PATTERNS section present in handoff.md Step 5b | unit (string match) | `node --test tests/phase-69/component-patterns.test.mjs` | ❌ Wave 0 |
| HND-01 | WFR+Stitch / Stitch-only / WFR-only source tags documented in workflow | unit (string match) | `node --test tests/phase-69/component-patterns.test.mjs` | ❌ Wave 0 |
| HND-02 | hexToOklch function present in handoff.md | unit (string match) | `node --test tests/phase-69/hex-to-oklch.test.mjs` | ❌ Wave 0 |
| HND-02 | hexToOklch handles shorthand hex (#rgb), 8-digit hex, and non-hex gracefully | unit (function logic) | `node --test tests/phase-69/hex-to-oklch.test.mjs` | ❌ Wave 0 |
| HND-02 | hexToOklch('#3b82f6') produces oklch(0.59x 0.2xx 264.x) approximately | unit (output check) | `node --test tests/phase-69/hex-to-oklch.test.mjs` | ❌ Wave 0 |
| HND-03 | handoff.md Step 4b extension handles @component: comment format | unit (file parse) | `node --test tests/phase-69/annotation-extraction.test.mjs` | ❌ Wave 0 |
| HND-03 | Stitch-only components included in HND-types with @verify label | unit (string match) | `node --test tests/phase-69/component-patterns.test.mjs` | ❌ Wave 0 |
| HND-04 | stitch_annotated variable present in handoff.md | unit (string match) | `node --test tests/phase-69/stitch-detection.test.mjs` | ❌ Wave 0 |
| HND-04 | STITCH_UNANNOTATED list present for failed gate | unit (string match) | `node --test tests/phase-69/stitch-detection.test.mjs` | ❌ Wave 0 |
| HND-04 | Remediation message references --use-stitch and stitch_annotated | unit (string match) | `node --test tests/phase-69/stitch-detection.test.mjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-69/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-65/*.test.mjs tests/phase-66/*.test.mjs tests/phase-67/*.test.mjs tests/phase-68/*.test.mjs tests/phase-69/*.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-69/stitch-detection.test.mjs` — covers HND-01 (manifest-read, STITCH_ARTIFACTS), HND-04 (stitch_annotated check, STITCH_UNANNOTATED, remediation message)
- [ ] `tests/phase-69/component-patterns.test.mjs` — covers HND-01 (STITCH_COMPONENT_PATTERNS section, source tags), HND-03 (Stitch-only with @verify label)
- [ ] `tests/phase-69/hex-to-oklch.test.mjs` — covers HND-02 (function present, edge cases, output format)
- [ ] `tests/phase-69/annotation-extraction.test.mjs` — covers HND-03 (@component: format handling in Step 4b)

---

## Sources

### Primary (HIGH confidence)

- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/handoff.md` — Full handoff workflow: all 7 steps, Step 4b annotation extraction format, Step 5c TypeScript interface rules, existing coverage flag pattern (Step 7c), anti-patterns section
- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/wireframe.md` (lines 344-421) — Annotation injection format (`@component:` comments, componentMap of 5 elements), `stitch_annotated true` manifest-update call (line 421), `source stitch` manifest-update call (line 420)
- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/sync-figma.md` (lines 99-116) — `figmaColorToCss` function: established precedent for inline zero-dep color conversion functions in workflow prose
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/phases/68-critique-stitch-comparison/68-RESEARCH.md` — Phase 68 CRT-01 pattern (manifest-read + STITCH_ARTIFACTS + source=stitch classification); CRT-02 per-artifact gate; Nyquist test pattern; ESM createRequire confirmation
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/phases/66-wireframe-mockup-stitch-integration/66-RESEARCH.md` — Annotation injection design (Pattern 2), manifest registration fields, stitch_annotated lifecycle
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/phases/66-wireframe-mockup-stitch-integration/66-01-SUMMARY.md` — Confirmed ESM createRequire requirement; stitch_annotated true written at registration (line 421)
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/REQUIREMENTS.md` — HND-01, HND-02, HND-03, HND-04 success criteria (lines 64-68)
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/config.json` — `workflow.nyquist_validation: true` (validation architecture section required)
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/milestones/v1.3-phases/29-quality-infrastructure/29-RESEARCH.md` (lines 1757-1793) — `oklchToSRGB` function with OKLab math constants — exact same constants used in reverse for hexToOklch

### Secondary (MEDIUM confidence)

- `/Users/greyaltaer/code/projects/Platform Development Engine/references/color-systems.md` — OKLCH gamut considerations (sRGB-safe chroma ranges); rounding convention (3 decimal places for L and C)
- `/Users/greyaltaer/code/projects/Platform Development Engine/tests/phase-68/stitch-detection.test.mjs` — Nyquist test structure; file-parse assertion pattern; Root path resolution pattern

### Tertiary (LOW confidence)

- OKLab math source: Björn Ottosson's blog post (bottosson.github.io/posts/oklab/) — cited in 29-RESEARCH.md. The conversion matrices used in hexToOklch are verbatim from this source as implemented in the codebase. HIGH confidence on the specific values (they match a known-good prior implementation in this codebase).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all infrastructure (pde-tools, manifest-read, handoff.md structure) directly verified from source files
- Stitch detection pattern (HND-01/HND-04): HIGH — identical to Phase 68 CRT-01 pattern which is already implemented and tested; manifest fields confirmed written by Phase 66
- Hex-to-OKLCH math (HND-02): HIGH — math constants directly from codebase's own 29-RESEARCH.md oklchToSRGB implementation (inverse); figmaColorToCss pattern confirmed
- Annotation extraction from @component: format (HND-03): HIGH — Phase 66 injection format confirmed from wireframe.md lines 344-372; componentMap of exactly 5 elements
- Stitch-only component handling: HIGH — success criterion explicitly stated; naming convention and @verify pattern derived from existing handoff.md TypeScript rules
- Edge cases (hex variants, named colors): MEDIUM — shorthand/8-digit handling is standard JavaScript; named color guard is defensive; not verified by a running test
- Nyquist test strategy: HIGH — follows Phase 68 pattern exactly; file-parse assertions on workflow markdown

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (30 days — all dependencies are stable Phase 65-68 infrastructure; no external API changes expected)
