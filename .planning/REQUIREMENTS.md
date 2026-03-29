# Requirements: Platform Development Engine

**Defined:** 2026-03-28
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.20 Requirements

Requirements for CLI-Anything + Asset Engine milestone. Each maps to roadmap phases.

### CLI Generation

- [x] **CLI-01**: User can ingest an OpenAPI spec and produce a unified capability model
- [x] **CLI-02**: User can ingest a JSON Schema file and produce a unified capability model
- [x] **CLI-03**: User can ingest a GraphQL endpoint (introspection) and produce a unified capability model
- [x] **CLI-04**: User can introspect any MCP server and produce a unified capability model
- [x] **CLI-05**: User can generate AI SDK tool() definitions from any unified capability model
- [x] **CLI-06**: Generated tool definitions include Zod inputSchema and typed execute functions
- [x] **CLI-07**: User can auto-wrap any CLI as an MCP server via --help parsing
- [x] **CLI-08**: Auto-generated MCP servers expose structured JSON output for every command
- [x] **CLI-09**: Every generated CLI/tool produces a SKILL.md for agent discovery
- [x] **CLI-10**: User can publish generated CLIs to a CLI-Hub compatible registry
- [x] **CLI-11**: Generated tools support --json flag for machine consumption

### Image Generation

- [x] **IMG-01**: User can generate dynamic OG images from templates via Satori/next/og
- [x] **IMG-02**: User can generate social media card images from product data
- [x] **IMG-03**: User can generate device mockup composites (browser frame, phone frame) from screenshots
- [x] **IMG-04**: User can capture product screenshots via Playwright at configurable viewports
- [x] **IMG-05**: User can run visual diff across git branches using perceptual hashing
- [x] **IMG-06**: Visual diff produces a comparison report with changed/unchanged/new/deleted assets
- [x] **IMG-07**: User can remove image backgrounds via remove.bg free tier (50/month)
- [x] **IMG-08**: Image pipeline stores assets in .planning/design/assets/ with metadata JSON

### Video Generation

- [ ] **VID-01**: User can record product UI interactions via Playwright screen capture
- [ ] **VID-02**: User can assemble video clips with FFmpeg (transitions, overlays, captions)
- [x] **VID-03**: User can compose branded product videos via Remotion React components
- [x] **VID-04**: Remotion templates include PDE design tokens (colors, fonts, spacing)
- [ ] **VID-05**: Video pipeline produces MP4 output with configurable resolution
- [ ] **VID-06**: User can add text captions/subtitles to generated videos

### 3D Generation

- [ ] **TRD-01**: User can generate 3D models from text descriptions via TripoSR/SF3D
- [ ] **TRD-02**: User can generate 3D models from product images via image-to-3D
- [ ] **TRD-03**: Generated models output in GLB format with optimized geometry
- [ ] **TRD-04**: User can embed 3D models in web pages via model-viewer component
- [ ] **TRD-05**: model-viewer integration includes automatic AR fallback (USDZ/WebXR)
- [ ] **TRD-06**: User can generate parametric CAD models via CadQuery Python scripts for hardware products
- [ ] **TRD-07**: CadQuery outputs STEP files for engineering handoff
- [ ] **TRD-08**: 3D assets stored in .planning/design/3d/ with generation metadata

### PDE Utilities

- [ ] **UTL-01**: Mermaid diagrams render via mmdr Rust renderer (500-1000x faster than mermaid-cli)
- [ ] **UTL-02**: User can validate DTCG design tokens against schema completeness and naming conventions
- [ ] **UTL-03**: Token validator checks OKLCH gamut ranges and APCA contrast ratios
- [ ] **UTL-04**: User can run visual diff comparing Playwright screenshots across branches/commits
- [ ] **UTL-05**: User can generate test scaffolds from /pde:flows flow diagram output
- [ ] **UTL-06**: Generated tests include Playwright E2E skeletons with flow-derived navigation paths
- [ ] **UTL-07**: User can verify implementation matches handoff spec (component APIs, TypeScript interfaces)
- [ ] **UTL-08**: Handoff verify produces a gap report listing unimplemented/divergent components

## Future Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Paid API Integration (v0.21+)

- **PAY-01**: Image generation via AI Gateway (Imagen 4, FLUX.2 Pro, Recraft V3 SVG)
- **PAY-02**: Video generation via AI Gateway (Veo 3.1, Kling)
- **PAY-03**: 3D generation via Meshy API (production-quality, USDZ export)
- **PAY-04**: TTS narration via ElevenLabs or OpenAI TTS
- **PAY-05**: Avatar-based product demos via HeyGen
- **PAY-06**: API client generation via Speakeasy/Stainless

## Out of Scope

| Feature | Reason |
|---------|--------|
| Paid API image generation (Imagen, FLUX, Recraft) | Free-tier-only constraint for v0.20; deferred to v0.21+ |
| Paid video generation (Veo, Runway, Sora) | Free-tier-only constraint |
| Paid 3D generation (Meshy, Rodin) | Free-tier-only constraint; TripoSR/SF3D serve open-source path |
| TTS narration (ElevenLabs, OpenAI TTS) | Paid service; defer to v0.21+ |
| Avatar-based demos (HeyGen, Synthesia) | Paid service |
| Real-time 3D configurators | Complex UX beyond current scope; model-viewer covers display |
| Scene generation (multi-object 3D environments) | Immature ecosystem; single-object generation first |
| LoRA fine-tuning for brand consistency | Requires paid GPU time |
| UTCP protocol support | Emerging standard, insufficient adoption |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 163 | Complete |
| CLI-02 | Phase 163 | Complete |
| CLI-03 | Phase 163 | Complete |
| CLI-04 | Phase 163 | Complete |
| CLI-05 | Phase 163 | Complete |
| CLI-06 | Phase 163 | Complete |
| CLI-07 | Phase 164 | Complete |
| CLI-08 | Phase 164 | Complete |
| CLI-09 | Phase 164 | Complete |
| CLI-10 | Phase 164 | Complete |
| CLI-11 | Phase 164 | Complete |
| IMG-01 | Phase 165 | Complete |
| IMG-02 | Phase 165 | Complete |
| IMG-03 | Phase 165 | Complete |
| IMG-04 | Phase 165 | Complete |
| IMG-05 | Phase 166 | Complete |
| IMG-06 | Phase 166 | Complete |
| IMG-07 | Phase 165 | Complete |
| IMG-08 | Phase 165 | Complete |
| VID-01 | Phase 167 | Pending |
| VID-02 | Phase 167 | Pending |
| VID-03 | Phase 167 | Complete |
| VID-04 | Phase 167 | Complete |
| VID-05 | Phase 167 | Pending |
| VID-06 | Phase 167 | Pending |
| TRD-01 | Phase 168 | Pending |
| TRD-02 | Phase 168 | Pending |
| TRD-03 | Phase 168 | Pending |
| TRD-04 | Phase 168 | Pending |
| TRD-05 | Phase 168 | Pending |
| TRD-06 | Phase 169 | Pending |
| TRD-07 | Phase 169 | Pending |
| TRD-08 | Phase 168 | Pending |
| UTL-01 | Phase 170 | Pending |
| UTL-02 | Phase 170 | Pending |
| UTL-03 | Phase 170 | Pending |
| UTL-04 | Phase 170 | Pending |
| UTL-05 | Phase 170 | Pending |
| UTL-06 | Phase 170 | Pending |
| UTL-07 | Phase 170 | Pending |
| UTL-08 | Phase 170 | Pending |

**Coverage:**
- v0.20 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation for v0.20*
