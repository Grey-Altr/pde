# Phase 169: Parametric CAD Generation - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the parametric CAD generation module: `/pde:3d cad` subcommand that generates CadQuery Python scripts from product descriptions, executes them via Python subprocess, and exports STEP files ready for manufacturing handoff. Extends the existing 3D pipeline in `bin/lib/3d-pipeline/`.

</domain>

<decisions>
## Implementation Decisions

### CadQuery Execution Environment
- Execute CadQuery scripts via `python3` subprocess (using execFile for safety) — matches existing subprocess patterns
- Auto-detect CadQuery availability via `python3 -c "import cadquery"`, error with clear install instructions if missing
- Place CAD module at `bin/lib/3d-pipeline/cad.cjs` — extends existing 3D pipeline directory
- Require Python 3.10+ (CadQuery minimum), validate at runtime with version check

### Script Generation Strategy
- LLM generates the full CadQuery Python script inline — Claude writes Python directly based on the product description
- Top-of-file `PARAMS = {}` dict with all dimensions, referenced throughout — easy for users to tweak
- No template library — LLM generates from scratch each time, keeps codebase minimal
- Single-part scope only for v0.20 — assemblies deferred to future milestone

### Output & Validation
- Validate STEP files by checking file exists, is non-empty, and header contains `ISO-10303-21` signature
- Store at `.planning/design/3d/{slug}-{timestamp}.step` with JSON sidecar (matches GLB pattern from Phase 168)
- Metadata sidecar: `{source_script, params, timestamp, file_size, step_version}`
- `/pde:3d cad` subcommand — generates script, runs it, exports STEP

### Claude's Discretion
No items deferred.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/3d-pipeline/generate.cjs` — text-to-3D pipeline pattern (two-step, subprocess)
- `bin/lib/3d-pipeline/convert.cjs` — image-to-3D with fallback chain pattern
- `bin/lib/3d-pipeline/assets.cjs` — `save3DAsset()` for metadata sidecar writes
- `bin/lib/3d-pipeline/optimize.cjs` — GLB optimization (may not apply to STEP)

### Established Patterns
- CJS modules with JSDoc, async functions, dependency injection for testing
- Subprocess execution via execFile with timeout (safe against shell injection)
- Asset storage in `.planning/design/3d/` with JSON sidecar per file
- `pde-tools.cjs` subcommand routing for `/pde:3d`

### Integration Points
- `bin/lib/3d-pipeline/cad.cjs` — new module
- `pde-tools.cjs` — add `3d cad` subcommand routing
- `skills/3d.md` or commands section — document `/pde:3d cad` usage
- `.planning/design/3d/` — STEP file output directory

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond decided architecture.

</specifics>

<deferred>
## Deferred Ideas

- Multi-part CadQuery assemblies — deferred to future milestone
- CadQuery template library (enclosures, brackets, gears) — generate from scratch is sufficient

</deferred>
