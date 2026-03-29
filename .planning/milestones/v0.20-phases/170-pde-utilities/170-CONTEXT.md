# Phase 170: PDE Utilities - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build five utility tools as first-class /pde: commands: fast Mermaid rendering (mmdr), DTCG design token validation with gamut/contrast checks, visual diff command surface, flow-derived test scaffolds, and handoff spec verification. Each utility is a thin command layer over existing or new modules.

</domain>

<decisions>
## Implementation Decisions

### Mermaid Renderer + Token Validator
- Auto-detect `mmdr` Rust binary, fall back to `mermaid-cli` if missing — same detection pattern as CadQuery
- Token validator validates against DTCG spec: required fields `$value`, `$type`, naming convention `{group}.{token}`
- OKLCH gamut check: flag values outside P3 gamut. APCA contrast: flag ratios below 60 Lc for body text, 45 Lc for large text
- Output format: structured JSON + formatted markdown summary (matches visual-diff report pattern)

### Visual Diff Command + Flow-Derived Tests
- `/pde:visual-diff` wraps existing `bin/lib/image-pipeline/visual-diff.cjs` — thin command layer over Phase 166 engine
- Branch comparison via `git stash` current, checkout target, capture screenshots, restore — matches Phase 166 approach
- Flow test generation: Playwright `test('navigates {path}', async ({ page }) => { ... })` skeletons with `page.goto()` + `page.click()` from flow edges
- Parse Mermaid flowchart syntax from /pde:flows output — extract nodes as pages, edges as navigation paths

### Handoff Spec Verifier
- Compare HANDOFF-SPEC.md component APIs + TypeScript interfaces against actual source files
- Grep-based detection: parse component names from spec, search for `export.*{ComponentName}` and interface signatures
- Gap report as markdown table: Component | Spec Status | Code Status | Gap Type (missing/diverged/extra)
- `/pde:verify-handoff` as standalone skill file + pde-tools.cjs subcommand

### Claude's Discretion
No items deferred.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/image-pipeline/visual-diff.cjs` — Phase 166 visual diff engine (perceptual hashing, comparison report)
- `bin/lib/image-pipeline/screenshot.cjs` — Playwright screenshot capture at configurable viewports
- `workflows/flows.md` — Mermaid flowchart generation (output to parse for test scaffolds)
- `workflows/handoff.md` — Handoff spec generation (output to verify against)
- `workflows/system.md` — Design system/token generation (tokens to validate)
- `bin/pde-tools.cjs` — Central subcommand router

### Established Patterns
- CJS modules with JSDoc, async functions, dependency injection for testing
- Subprocess execution via execFile for external tools (mmdr, mermaid-cli)
- Structured JSON + markdown report output (visual-diff, 3d pipeline)
- Skill files in commands/ directory with frontmatter metadata

### Integration Points
- `bin/lib/utils/mermaid-renderer.cjs` — new module for mmdr/mermaid-cli abstraction
- `bin/lib/utils/token-validator.cjs` — new module for DTCG validation
- `bin/lib/utils/flow-test-gen.cjs` — new module for Mermaid→Playwright scaffold
- `bin/lib/utils/handoff-verifier.cjs` — new module for spec→code gap detection
- `pde-tools.cjs` additions for each new command
- Skill files: `commands/validate-tokens.md`, `commands/visual-diff.md`, `commands/gen-tests.md`, `commands/verify-handoff.md`

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond decided architecture.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
