# Phase 119: Antigravity Context + Stitch Bridge - Research

**Researched:** 2026-03-23
**Domain:** Antigravity Agent Manager integration, Stitch MCP bridge, DTCG-to-Design-DNA conversion
**Confidence:** MEDIUM (Antigravity SKILL.md format verified via official Codelab; DESIGN.md format verified via official google-labs-code/stitch-skills example; Stitch source detection verified from existing codebase)

## Summary

Phase 119 extends the context-sync.cjs module (built in Phase 118) with two new emitters: `emitAntigravitySkill()` producing `.agent/skills/pde-design/SKILL.md`, and `emitDesignMd()` producing `DESIGN.md` in Antigravity's Design DNA format. It also adds manifest metadata support for detecting Antigravity-originated Stitch projects (source: "antigravity-stitch") and documents the bidirectional flow where PDE writes DESIGN.md for Stitch/Antigravity consumption while Stitch screen outputs enter PDE through the existing STH pipeline.

The main technical challenges are: (1) OKLCH-to-hex color conversion (PDE stores tokens in OKLCH, but DESIGN.md requires hex codes), (2) understanding the five-section DESIGN.md format from the official stitch-skills repository, and (3) extending the existing `source: "stitch"` manifest pattern to support `"antigravity-stitch"` without breaking existing critique/handoff detection.

**Primary recommendation:** Add two new emitter functions to context-sync.cjs following the exact IR-to-output pattern from Phase 118, implement `oklchToHex()` as the inverse of the existing `hexToOklch()` from handoff.md, and extend the manifest artifact source field to accept "antigravity-stitch" alongside existing "stitch" values.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None -- all implementation choices are at Claude's discretion (pure infrastructure phase).

### Claude's Discretion
All implementation choices. Key constraints from research:
- DESIGN.md maps OKLCH palette to hex with semantic roles, typography from SYS-typography.json, spacing from tokens
- .agent/skills/pde-design/SKILL.md follows Antigravity skill format (directory-based with SKILL.md)
- Stitch bridge extends existing v0.9 manifest metadata pattern (source: "antigravity-stitch")
- Reverse flow (Stitch to PDE) already 80% built via v0.9 --use-stitch pipeline
- Zero npm deps -- extend existing context-sync.cjs module

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTX-05 | PDE generates .agent/skills/pde-design/SKILL.md for Antigravity Agent Manager with PDE workflow instructions | SKILL.md format verified via Google Codelabs; directory structure: .agent/skills/pde-design/SKILL.md with YAML frontmatter (name, description) + markdown body |
| STH-01 | PDE generates DESIGN.md in Antigravity Design DNA format from DTCG tokens (palette, typography, spacing, component patterns) | DESIGN.md five-section format verified via official stitch-skills repo example; requires oklchToHex() conversion function |
| STH-02 | Antigravity-originated Stitch projects detected via manifest metadata (source: "antigravity-stitch") | Existing pattern: wireframe.md sets source: "stitch" via manifest-update; critique.md and handoff.md check artifact.source === "stitch"; extend to also match "antigravity-stitch" |
| STH-03 | Bidirectional artifact flow: PDE design artifacts to Stitch canvas via DESIGN.md, Stitch outputs to PDE critique/handoff via existing STH pipeline | PDE-to-Stitch: DESIGN.md at project root consumed by Antigravity's design-md and stitch-design skills; Stitch-to-PDE: existing --use-stitch pipeline (wireframe.md, critique.md, handoff.md) already handles STH artifacts |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `crypto` | N/A | SHA-256 hash for PDE-GENERATED markers | Already used in context-sync.cjs |
| Node.js built-in `fs` | N/A | File I/O for emitted files | Zero-dep constraint |
| Node.js built-in `path` | N/A | Cross-platform path handling | Zero-dep constraint |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `./core.cjs` | internal | safeReadFile, output, error helpers | All file reads in IR builder |
| `./design.cjs` | internal | dtcgToCssLines, readManifest | Reading DTCG tokens and manifest |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled oklchToHex | culori npm package | Would break zero-dep constraint; math is straightforward (~30 LOC) |
| Inline DESIGN.md template | External template file | Inline is simpler and matches existing emitter pattern in context-sync.cjs |

**Installation:**
```bash
# No installation needed -- zero npm dependencies, all Node.js built-ins
```

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
  context-sync.cjs          # MODIFIED: add emitAntigravitySkill(), emitDesignMd(), oklchToHex()
                             # emitAll() updated to call both new emitters

# Output files (generated at target project root):
.agent/skills/pde-design/
  SKILL.md                   # CTX-05: Antigravity skill with PDE workflow instructions
DESIGN.md                    # STH-01: Design DNA format from DTCG tokens
```

### Pattern 1: Emitter Extension (from Phase 118 IR pattern)
**What:** New emitter functions (`emitAntigravitySkill`, `emitDesignMd`) that take the existing IR object and produce output files, following the same signature as `emitAgentsMd`, `emitCursorRules`, etc.
**When to use:** For all new context file outputs in Phase 119.
**Example:**
```javascript
// Source: Phase 118 context-sync.cjs established pattern
function emitAntigravitySkill(ir, projectRoot) {
  const skillDir = path.join(projectRoot, '.agent', 'skills', 'pde-design');
  fs.mkdirSync(skillDir, { recursive: true });

  const header = makeHeader(ir.sourceHash, ir.generatedAt);
  const content = [
    header,
    '---',
    'name: pde-design',
    'description: PDE design system context — palette, typography, spacing, component patterns',
    '---',
    '',
    '# PDE Design System',
    '',
    '## Goal',
    `Provide ${ir.projectName} design system context...`,
    // ... instructions, constraints
  ].join('\n');

  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf-8');
  return { written: true, path: '.agent/skills/pde-design/SKILL.md' };
}
```

### Pattern 2: OKLCH-to-Hex Conversion (inverse of handoff.md hexToOklch)
**What:** Pure math function converting OKLCH color strings to hex, the inverse of the `hexToOklch()` function already defined in workflows/handoff.md.
**When to use:** When generating DESIGN.md, which requires hex color codes while PDE stores tokens in OKLCH.
**Example:**
```javascript
// Inverse of hexToOklch from workflows/handoff.md
function oklchToHex(oklchStr) {
  const match = oklchStr.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/);
  if (!match) return oklchStr; // passthrough non-OKLCH values
  const L = parseFloat(match[1]);
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]) * (Math.PI / 180);
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);
  // OKLAB to linear-light sRGB via inverse matrix
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  // Linear sRGB
  let r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bC = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  // Gamma + clamp
  const gamma = (x) => x <= 0 ? 0 : (x >= 1 ? 1 : (x >= 0.0031308 ? 1.055 * Math.pow(x, 1/2.4) - 0.055 : 12.92 * x));
  r = gamma(r); g = gamma(g); bC = gamma(bC);
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(bC);
}
```

### Pattern 3: Manifest Source Field Extension
**What:** The manifest `artifacts[code].source` field currently supports `"stitch"`. Extend to also support `"antigravity-stitch"` for projects originating from Antigravity's Stitch canvas.
**When to use:** When detecting artifact origin in critique.md and handoff.md workflows.
**Example:**
```javascript
// In existing workflow detection (critique.md, handoff.md):
// Current: source === "stitch"
// Extended: source === "stitch" || source === "antigravity-stitch"
// Or equivalently: source?.startsWith("stitch") || source === "antigravity-stitch"
```

### Anti-Patterns to Avoid
- **Separate module for DESIGN.md:** Do NOT create a new stitch-bridge.cjs for this phase. The DESIGN.md emitter is a context-sync function like all others. Stitch bridge (bidirectional MCP sync) is a different concern for a later phase.
- **Generating DESIGN.md with OKLCH values:** DESIGN.md must contain hex codes, not OKLCH. Stitch and Antigravity consume hex. Always convert via oklchToHex().
- **Modifying critique.md/handoff.md for source detection:** The existing `source === "stitch"` checks just need awareness that "antigravity-stitch" exists. Document the pattern; actual workflow modifications (if any) are minimal.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OKLCH to hex conversion | External npm color library | Hand-rolled oklchToHex() (~30 LOC) | Zero-dep constraint; math is well-defined inverse of existing hexToOklch |
| DESIGN.md format | Custom schema parser | String template matching stitch-skills example | Format is plain markdown with 5 known sections |
| SKILL.md format | Complex YAML generator | Simple string concatenation with frontmatter | Only 2 frontmatter fields (name, description) |
| Manifest source detection | New detection framework | Extend existing `source === "stitch"` checks | Pattern already established in critique.md and handoff.md |

**Key insight:** This phase is almost entirely string generation (two new emitter functions) plus one math function (oklchToHex). No new modules, no new patterns, no new dependencies.

## Common Pitfalls

### Pitfall 1: OKLCH Gamut Clipping
**What goes wrong:** OKLCH values may map to sRGB values outside [0, 1] range, producing invalid hex codes.
**Why it happens:** OKLCH color space is larger than sRGB. Some OKLCH colors have no exact sRGB equivalent.
**How to avoid:** Clamp linear RGB values to [0, 1] before gamma encoding. The gamma function in the code example above handles this with `x <= 0 ? 0 : (x >= 1 ? 1 : ...)`.
**Warning signs:** Hex values like `#ff00ff` or `#000000` appearing for colors that should be muted tones.

### Pitfall 2: DESIGN.md Without Design Tokens
**What goes wrong:** emitDesignMd() is called but no DTCG token files exist yet (pipeline hasn't reached design-system stage).
**Why it happens:** Context sync can be triggered at any pipeline stage, not just after tokens are generated.
**How to avoid:** If no DTCG tokens are found, either skip DESIGN.md generation entirely or emit a placeholder DESIGN.md noting "Design tokens not yet generated."
**Warning signs:** DESIGN.md with empty palette/typography sections.

### Pitfall 3: Source Field String Comparison
**What goes wrong:** Using `source.includes("stitch")` instead of exact match, which could match unintended values.
**Why it happens:** Trying to be flexible with source matching.
**How to avoid:** Use exact equality: `source === "stitch" || source === "antigravity-stitch"`. Or use a set: `["stitch", "antigravity-stitch"].includes(source)`.
**Warning signs:** Non-Stitch artifacts being treated as Stitch artifacts.

### Pitfall 4: SKILL.md Description Quality
**What goes wrong:** Antigravity Agent Manager doesn't activate the PDE skill because the description field is too vague.
**Why it happens:** The `description` field in SKILL.md frontmatter acts as the semantic trigger for skill activation. Generic descriptions like "Design stuff" won't match user queries.
**How to avoid:** Make the description specific and action-oriented: "PDE design system context -- query palette colors, typography rules, spacing scale, and component patterns for the current project."
**Warning signs:** Agent Manager never suggests or activates the PDE skill.

## Code Examples

### DESIGN.md Format (from official google-labs-code/stitch-skills example)
```markdown
# Design System: {Project Name}
**Project ID:** {manifest ID or hash}

## 1. Visual Theme & Atmosphere

{Descriptive mood paragraph from project brief or design state}

## 2. Color Palette & Roles

### Primary Foundation
- **{Descriptive Name}** ({hex}) -- {functional role, e.g., "Primary background"}

### Accent & Interactive
- **{Descriptive Name}** ({hex}) -- {functional role}

### Typography & Text Hierarchy
- **{Descriptive Name}** ({hex}) -- {functional role}

## 3. Typography Rules

**Primary Font Family:** {font from tokens}

### Hierarchy & Weights
- **H1:** {weight}, {letter-spacing}, {size}
- **Body:** {weight}, {line-height}, {size}

## 4. Component Stylings

### {Component Name}
- **Shape:** {description}
- **Primary CTA:** {color description}

## 5. Layout Principles

### Whitespace Strategy
- **Base Unit:** {from spacing tokens}
- **Section Margins:** {from spacing tokens}
```
**Source:** https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/skills/design-md/examples/DESIGN.md (HIGH confidence -- official Google Labs repository)

### SKILL.md Format (from Antigravity official Codelab)
```markdown
---
name: pde-design
description: PDE design system context -- query palette colors, typography rules, spacing scale, and component patterns for the current project
---

# PDE Design System

## Goal

Provide design system context for {projectName} to enable consistent
code generation aligned with the project's visual identity.

## Instructions

1. Check DESIGN.md at project root for full design DNA (palette, typography, spacing)
2. Design tokens are in DTCG format at .planning/design/SYS-tokens.json
3. Component patterns are documented in handoff specs at .planning/design/handoff/

## Design Tokens Available

{ir.designTokens}

## Component Catalog

{ir.componentCatalog}

## Constraints

- Use hex color values from DESIGN.md, not raw OKLCH from token files
- Follow typography hierarchy defined in DESIGN.md section 3
- Spacing uses the base unit defined in DESIGN.md section 5
```
**Source:** https://codelabs.developers.google.com/getting-started-with-antigravity-skills (HIGH confidence -- official Google Codelab)

### Manifest Source Detection (existing pattern)
```javascript
// From workflows/critique.md line 153:
// Look up manifest.artifacts["STH-login"].source
// If source === "stitch": add code to STITCH_ARTIFACTS list

// From workflows/handoff.md line 225:
// If manifest.artifacts[code].source === "stitch": add code to STITCH_CANDIDATES

// Phase 119 extension: also detect "antigravity-stitch"
// If source === "stitch" || source === "antigravity-stitch": add to candidates
```
**Source:** Existing codebase (HIGH confidence)

### emitAll() Extension Pattern
```javascript
// Current emitAll() in context-sync.cjs:
function emitAll(cwd) {
  const planningDir = path.join(cwd, '.planning');
  const ir = buildContextIR(planningDir);
  const agentsMd = emitAgentsMd(ir, cwd);
  const cursorRules = emitCursorRules(ir, cwd);
  const cursorrules = emitCursorrules(ir, cwd);
  const geminiMd = emitGeminiMd(ir, cwd, planningDir);
  return { agentsMd, cursorRules, cursorrules, geminiMd, sourceHash: ir.sourceHash, generatedAt: ir.generatedAt };
}

// Phase 119 extension:
function emitAll(cwd) {
  const planningDir = path.join(cwd, '.planning');
  const ir = buildContextIR(planningDir);
  const agentsMd = emitAgentsMd(ir, cwd);
  const cursorRules = emitCursorRules(ir, cwd);
  const cursorrules = emitCursorrules(ir, cwd);
  const geminiMd = emitGeminiMd(ir, cwd, planningDir);
  const antigravitySkill = emitAntigravitySkill(ir, cwd);       // NEW
  const designMd = emitDesignMd(ir, cwd, planningDir);          // NEW
  return { agentsMd, cursorRules, cursorrules, geminiMd, antigravitySkill, designMd,
           sourceHash: ir.sourceHash, generatedAt: ir.generatedAt };
}
```
**Source:** bin/lib/context-sync.cjs (HIGH confidence -- existing codebase)

### cmdContextSync() Editor Flag Extension
```javascript
// Current: --editor cursor|gemini|agents|all
// Phase 119: add --editor antigravity
if (editor === 'antigravity') {
  results.antigravitySkill = emitAntigravitySkill(ir, cwd);
  results.designMd = emitDesignMd(ir, cwd, planningDir);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual DESIGN.md creation via Stitch MCP agent | PDE auto-generates DESIGN.md from DTCG tokens | Phase 119 (new) | Eliminates manual Stitch MCP step; DESIGN.md always in sync with PDE tokens |
| Source: "stitch" only in manifest | Source: "stitch" or "antigravity-stitch" | Phase 119 (new) | Distinguishes PDE-direct Stitch from Antigravity-routed Stitch projects |

**DESIGN.md format confidence note:** The DESIGN.md format was reconstructed from the official google-labs-code/stitch-skills repository example. STATE.md notes: "Antigravity DESIGN.md format reconstructed from community guides, not official spec -- validate during Phase 119 execution." The stitch-skills example is the closest to an official spec available.

## Open Questions

1. **DTCG Token File Location**
   - What we know: Tokens are expected at .planning/design/SYS-tokens.json (from FEATURES.md references to SYS-typography.json, SYS-tokens.json)
   - What's unclear: The current design-manifest.json has empty artifacts -- no SYS-tokens.json files exist in the test project. The IR builder needs to read DTCG tokens for DESIGN.md generation but they may not exist.
   - Recommendation: emitDesignMd() should gracefully handle missing tokens by checking if the manifest has token data and falling back to IR's designTokens field. Generate a minimal DESIGN.md with available info.

2. **Section 6 in DESIGN.md**
   - What we know: The stitch-skills example has a "Section 6: Design System Notes for Stitch Generation" with prompt suggestions.
   - What's unclear: Whether PDE should generate Section 6 or stick to the core 5 sections.
   - Recommendation: Include Section 6 with Stitch-specific prompt hints derived from component catalog. Low effort, high value for Antigravity users.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | none -- direct execution |
| Quick run command | `node --test tests/phase-119/test-antigravity-stitch.cjs` |
| Full suite command | `node --test tests/phase-119/test-antigravity-stitch.cjs tests/phase-118/test-context-sync.cjs` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTX-05 | .agent/skills/pde-design/SKILL.md generated with YAML frontmatter (name, description) and PDE instructions | unit | `node --test tests/phase-119/test-antigravity-stitch.cjs` | Wave 0 |
| STH-01 | DESIGN.md generated with 5 sections, hex colors converted from OKLCH, typography and spacing from IR | unit | `node --test tests/phase-119/test-antigravity-stitch.cjs` | Wave 0 |
| STH-02 | Manifest source "antigravity-stitch" detected correctly, distinguishable from "stitch" | unit | `node --test tests/phase-119/test-antigravity-stitch.cjs` | Wave 0 |
| STH-03 | emitAll() returns antigravitySkill and designMd results; cmdContextSync --editor antigravity works | unit | `node --test tests/phase-119/test-antigravity-stitch.cjs` | Wave 0 |
| N/A | oklchToHex conversion accuracy (round-trip with hexToOklch) | unit | `node --test tests/phase-119/test-antigravity-stitch.cjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-119/test-antigravity-stitch.cjs`
- **Per wave merge:** `node --test tests/phase-119/test-antigravity-stitch.cjs tests/phase-118/test-context-sync.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-119/test-antigravity-stitch.cjs` -- covers CTX-05, STH-01, STH-02, STH-03 + oklchToHex accuracy
- [ ] Test fixtures: mock .planning/ with DTCG token data for DESIGN.md generation testing

## Sources

### Primary (HIGH confidence)
- bin/lib/context-sync.cjs -- Phase 118 IR builder and emitter pattern (existing codebase)
- bin/lib/mcp-bridge.cjs -- Stitch TOOL_MAP entries, source detection patterns (existing codebase)
- workflows/handoff.md -- hexToOklch function, source === "stitch" detection (existing codebase)
- workflows/critique.md -- source === "stitch" detection pattern (existing codebase)
- workflows/wireframe.md -- manifest-update STH source stitch pattern (existing codebase)
- [Google Labs stitch-skills DESIGN.md example](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/skills/design-md/examples/DESIGN.md) -- official DESIGN.md format
- [Authoring Antigravity Skills Codelab](https://codelabs.developers.google.com/getting-started-with-antigravity-skills) -- official SKILL.md format specification

### Secondary (MEDIUM confidence)
- [Google Stitch + Antigravity design-to-code Codelab](https://codelabs.developers.google.com/design-to-code-with-antigravity-stitch) -- DESIGN.md workflow context
- [Antigravity rules guide](https://antigravity.codes/blog/user-rules) -- priority hierarchy: System rules > GEMINI.md > AGENTS.md > .agent/rules/
- [stitch-skills design-md SKILL.md](https://raw.githubusercontent.com/google-labs-code/stitch-skills/main/skills/design-md/SKILL.md) -- five-section DESIGN.md format specification

### Tertiary (LOW confidence)
- None -- all findings verified against official sources or existing codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- extending existing context-sync.cjs with same patterns, zero new dependencies
- Architecture: HIGH -- emitter pattern established in Phase 118, just adding two more emitters
- DESIGN.md format: MEDIUM -- based on official stitch-skills example, but Antigravity may evolve the format
- oklchToHex math: HIGH -- well-documented color space conversion, inverse of existing hexToOklch
- Pitfalls: MEDIUM -- gamut clipping edge case is real but mitigated by clamping

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (DESIGN.md format may evolve with Antigravity updates; stitch-skills repo is the canonical reference)
