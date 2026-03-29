# Phase 166: Visual Diff + Asset Reporting - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the visual diff engine: pHash-based perceptual comparison of image assets between git branches using `git show` (no checkout), producing a structured Markdown + JSON report classifying every asset as changed/unchanged/new/deleted with a 0-100% change score.

</domain>

<decisions>
## Implementation Decisions

### Visual Diff Engine
- pHash (DCT-based) via Sharp — resize to 8x8 grayscale, compute DCT, threshold median → 64-bit hash. Hamming distance for comparison
- `/pde:visual-diff <branch-a> <branch-b>` command and `pde-tools.cjs image diff <branch-a> <branch-b>`
- 4-tier Hamming distance scoring: 0 = unchanged, 1-5 = minor (0-8%), 6-15 = significant (9-23%), 16+ = major (25%+) — normalized to 0-100%

### Report Format
- Markdown report at `.planning/design/assets/visual-diff-{timestamp}.md` with JSON sidecar for machine consumption
- Path-based asset matching: same relative path = same asset. Track new (only in B), deleted (only in A), changed (both, hash differs), unchanged (both, hash matches)
- `git show <branch>:<path>` to read file contents without checking out — no working tree changes

### Claude's Discretion
No items deferred to Claude's discretion.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/image-pipeline/assets.cjs` — saveAsset(), listAssets() (from Phase 165)
- `sharp` — already installed, provides resize/grayscale for pHash
- `bin/pde-tools.cjs` — image subcommand routing already present

### Integration Points
- New module: `bin/lib/image-pipeline/visual-diff.cjs`
- pde-tools.cjs addition: `image diff` subcommand
- commands/visual-diff.md for /pde:visual-diff
- Phase 170 wraps this as /pde: command surface

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond decided architecture.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
