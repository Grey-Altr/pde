# Phase 14: Design System (/pde:system) - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate a canonical DTCG design token set with derived CSS custom properties that all downstream design skills consume. The skill reads the brief for product context, generates tokens across all categories, and outputs both JSON (canonical) and CSS (consumable) files. Wireframes, critique, and handoff stages all depend on this output.

</domain>

<decisions>
## Implementation Decisions

### Token scope
- All 7 token categories: color, typography, spacing, shadows, borders, motion, components
- Components include CSS utility classes (.pde-btn, .pde-card, .pde-input) for direct wireframe use
- Basic layout utility classes included (spacing utilities .mt-*, .p-*, flex helpers, width/gap classes)
- Motion tokens: duration and easing values only (--duration-fast, --easing-default), not full transition shorthands
- Shadow tokens: 5 elevation levels (xs, sm, md, lg, xl)
- Border tokens: radius + width + style (full border vocabulary, not radius-only)

### Preset system
- Default behavior: fully custom generation from brief context (no preset auto-applied)
- When brief lacks brand colors/fonts: generate algorithmically from product name or domain keywords
- Typography scale ratio: derived from brief context (data-dense -> Minor Third, marketing -> Perfect Fourth, reading -> Augmented Fourth)
- Optional --preset flag available as power user override (minimal|corporate|playful|editorial)
- Presets use the curated defaults from references/typography.md and references/color-systems.md

### Dark mode
- Both light and dark mode tokens generated in v1.1
- CSS implementation: both @media (prefers-color-scheme: dark) AND [data-theme="dark"] attribute selector
- DTCG JSON uses $extensions condition pattern: { "$extensions": { "com.pde.condition": "dark" } }
- Component CSS classes (.pde-btn, etc.) have explicit dark variants (.dark .pde-btn) rather than auto-adapting

### Output artifacts
- Per-category CSS files in visual/ (SYS-colors.css, SYS-typography.css, SYS-spacing.css, SYS-shadows.css, SYS-borders.css, SYS-motion.css, SYS-components.css, SYS-utilities.css)
- Unified assets/tokens.css aggregating all categories
- DTCG JSON canonical source: visual/SYS-tokens.json (single file with $extensions for dark mode)
- Browser-viewable preview: visual/SYS-preview.html with color swatches, type scale, spacing, component demos, light/dark toggle
- Markdown usage guide: visual/SYS-usage-guide.md with actual token values, import instructions, code examples
- Design manifest (design-manifest.json) updated with SYS artifact entry on completion
- DESIGN-STATE.md updated to mark system stage complete

### Claude's Discretion
- Exact component class API beyond .pde-btn, .pde-card, .pde-input (which specific components to include)
- Specific utility class naming convention (Tailwind-like vs BEM vs custom)
- OKLCH gamut clamping implementation details
- Preview HTML layout and styling
- How to derive hue algorithmically from product name/domain keywords when no brand colors specified

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Token format and conversion
- `references/color-systems.md` -- OKLCH palette generation algorithm, scale table, semantic mappings, dark mode strategy, product-type fallback palettes, DTCG color token format
- `references/typography.md` -- Modular scale algorithm, font pairing rules, line-height/letter-spacing derivation, DTCG typography token format, preset mappings
- `templates/design-system.md` -- Output template for SYS-usage-guide.md, token overview table, usage examples

### Infrastructure
- `bin/lib/design.cjs` -- dtcgToCssLines(), generateCssVars(), manifest CRUD, write-lock operations (existing infrastructure)
- `templates/design-manifest.json` -- Manifest schema including SYS artifact structure, tokenDependencyMap, designCoverage flags
- `templates/design-state-root.md` -- DESIGN-STATE.md schema for tracking pipeline stage completion

### Skill definition
- `commands/system.md` -- Current stub command (to be replaced with full workflow)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `design.cjs:dtcgToCssLines()` -- Converts DTCG JSON token tree to CSS custom property lines. Handles nested groups with hyphenated prefix. Ready to use.
- `design.cjs:generateCssVars()` -- Wraps token lines in :root {} block. Produces complete CSS output.
- `design.cjs:cmdTokensToCss()` -- CLI wrapper that reads a JSON file and outputs CSS. Can be called from skill workflow.
- `design.cjs:updateManifestArtifact()` -- Upserts artifact entry in design-manifest.json. Use for SYS registration.
- `design.cjs:cmdManifestSetTopLevel()` -- Sets root-level manifest fields (e.g., designCoverage.hasDesignSystem = true).
- `design.cjs:acquireWriteLock()/releaseWriteLock()` -- Write-lock for DESIGN-STATE.md concurrent write protection.

### Established Patterns
- Zero npm dependencies -- all computation uses Node.js builtins only (Phase 12 decision)
- Self-test pattern: each lib file exports a runSelfTest() activated by --self-test flag
- Skill commands are markdown files in commands/ with YAML frontmatter
- Workflow files in workflows/ contain the full skill logic referenced by commands
- pde-tools.cjs routes subcommands to lib functions (design.cjs for design operations)

### Integration Points
- Brief output (strategy/BRF-brief-v1.md) provides product type, personas, constraints -- read for token generation context
- DESIGN-STATE.md -- update system stage to complete after successful generation
- design-manifest.json -- register SYS artifact with path, version, token list, dependency metadata
- assets/tokens.css -- wireframe skill will `<link>` this file for styling
- tokenDependencyMap in manifest -- populate with token-to-artifact mappings for staleness tracking

</code_context>

<specifics>
## Specific Ideas

- Algorithmic hue generation from product context (not product-type presets) as the default path
- Full template coverage (all 7 categories, preview page, usage guide) -- comprehensive output
- Dual dark mode strategy (media query + data attribute) for maximum flexibility
- Explicit dark component variants rather than implicit token adaptation -- gives more control over dark mode appearance

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 14-design-system-pde-system*
*Context gathered: 2026-03-15*
