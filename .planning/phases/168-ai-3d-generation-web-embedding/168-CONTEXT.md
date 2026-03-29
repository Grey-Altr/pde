# Phase 168: AI 3D Generation + Web Embedding - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the 3D generation and web embedding pipeline: `/pde:3d` command with subcommands for text-to-3D (via HF Inference API + TripoSR), image-to-3D, GLB optimization (gltf-transform), model-viewer web embedding with AR fallback (USDZ/WebXR), and organized 3D asset storage.

</domain>

<decisions>
## Implementation Decisions

### 3D Generation Engine
- TripoSR via Hugging Face Inference API (free tier, no local GPU needed) with SF3D as fallback — both return GLB
- Text-to-3D: two-step pipeline — text to image (via Stable Diffusion/SDXL on HF free tier), then image to 3D via TripoSR
- `/pde:3d <type>` with subcommands: generate (text to 3D), convert (image to 3D), embed, optimize
- HF Inference API as primary (cloud, free tier), local Python documented as optional upgrade path

### GLB Optimization & Storage
- `gltf-transform` CLI for draco compression, texture resize, mesh simplification — target <5MB for web
- `.planning/design/3d/{slug}-{timestamp}.glb` with JSON sidecar: `{source_model, input_type, input_hash, timestamp, file_size, vertex_count}`
- `pde-tools.cjs 3d list` returns JSON array of all 3D assets with metadata

### Web Embedding & AR
- Generate `<model-viewer>` HTML snippet with src, ar, ar-modes="webxr scene-viewer quick-look", ios-src for USDZ, camera-orbit presets
- `gltf-transform` GLB to USDZ conversion for iOS Quick Look — generated alongside GLB
- Self-contained HTML file at `.planning/design/3d/{slug}-embed.html` plus raw snippet for copy-paste

### Claude's Discretion
No items deferred.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/image-pipeline/assets.cjs` — saveAsset pattern for metadata sidecars
- `bin/pde-tools.cjs` — subcommand routing pattern
- `sharp` — available for image preprocessing before 3D inference

### Integration Points
- New modules in bin/lib/3d-pipeline/: generate.cjs, convert.cjs, optimize.cjs, embed.cjs, assets.cjs
- pde-tools.cjs additions: `3d generate|convert|embed|optimize|list`
- commands/3d.md for /pde:3d
- .planning/design/3d/ for asset storage

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond decided architecture.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
