# Requirements: Platform Development Engine

**Defined:** 2026-03-20
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.9 Requirements

Requirements for Google Stitch Integration milestone. Each maps to roadmap phases.

### MCP Infrastructure

- [ ] **MCP-01**: Stitch registered as 6th approved server in mcp-bridge.cjs APPROVED_SERVERS with probe/degrade contract
- [ ] **MCP-02**: TOOL_MAP populated with verified Stitch MCP tool names (generate, list, get, fetch-image, fetch-html, extract-design-context, create-project, list-projects, get-project, build-site)
- [ ] **MCP-03**: API key authentication via STITCH_API_KEY env var with AUTH_INSTRUCTIONS for /pde:connect stitch
- [ ] **MCP-04**: designCoverage schema extended with hasStitchWireframes field across all 13 existing pipeline skills (pass-through-all pattern preserved)
- [ ] **MCP-05**: Live MCP tool name verification gate before TOOL_MAP entries are finalized (official docs returned minified JS — names must be confirmed against live server)

### Quota Management

- [ ] **QUOTA-01**: Generation counter tracks Standard (350/mo) and Experimental (50/mo) Stitch usage with persistent storage in .planning/config.json
- [ ] **QUOTA-02**: Pre-generation quota check warns user when approaching limits (80% threshold)
- [ ] **QUOTA-03**: Automatic fallback to Claude HTML/CSS generation when Stitch quota is exhausted
- [ ] **QUOTA-04**: Quota status visible via /pde:progress and /pde:health commands

### User Consent

- [ ] **CONSENT-01**: Every outbound call to Stitch (prompts, images, design context sent TO Stitch) requires explicit user approval before transmission
- [ ] **CONSENT-02**: Every inbound artifact from Stitch (HTML, images, Design DNA received FROM Stitch) requires explicit user approval before persisting to local files
- [ ] **CONSENT-03**: Consent prompts clearly show what data is being sent/received and to/from where
- [ ] **CONSENT-04**: Batch operations (ideation diverge with multiple variants) present a single batch-consent prompt rather than per-item consent

### Pipeline Efficiency

- [ ] **EFF-01**: Fetched Stitch HTML and images cached locally — critique, handoff, and iterate reuse cached artifacts without re-fetching
- [ ] **EFF-02**: Stitch artifact reuse across pipeline stages — wireframe output flows directly to mockup/critique/handoff without regeneration
- [ ] **EFF-03**: Batch MCP calls for multi-screen generation (ideation variants, wireframe sets) rather than sequential one-at-a-time
- [ ] **EFF-04**: Stitch failure detection within 10-second timeout budget with immediate fallback to Claude generation (no retry loops)
- [ ] **EFF-05**: Annotation injection (PDE component comments) begins as soon as first screen arrives, not after all screens complete

### Wireframe & Mockup Integration

- [ ] **WFR-01**: --use-stitch flag on /pde:wireframe routes generation through Stitch MCP instead of Claude HTML/CSS
- [ ] **WFR-02**: Stitch-generated HTML fetched from download URL, persisted as STH-{slug}.html in .planning/design/ (separate namespace from WFR- artifacts)
- [ ] **WFR-03**: Annotation injection step adds <!-- @component: --> comments to Stitch HTML before manifest registration (required for downstream critique/handoff)
- [ ] **WFR-04**: design-manifest.json registers Stitch artifacts with source: "stitch" metadata for downstream stage awareness
- [ ] **WFR-05**: /pde:mockup supports --use-stitch flag with same generate-fetch-persist-annotate pipeline
- [ ] **WFR-06**: Graceful degradation to Claude HTML/CSS when Stitch MCP is unavailable or quota exhausted

### Ideation Visual Divergence

- [ ] **IDT-01**: /pde:ideate --diverge feeds concept descriptions to Stitch to generate 3-5 visual interpretations per concept
- [ ] **IDT-02**: Stitch-generated variant images stored alongside text-based concept descriptions in ideation artifacts
- [ ] **IDT-03**: Visual variants feed into convergence/scoring phase for comparison
- [ ] **IDT-04**: Quota-aware: checks remaining Experimental generations before starting batch, falls back to text-only diverge if insufficient

### Critique Comparison

- [ ] **CRT-01**: /pde:critique detects Stitch-sourced artifacts (via source: "stitch" in manifest) and applies Stitch-aware evaluation mode
- [ ] **CRT-02**: Stitch-aware mode suppresses DTCG token-format consistency checks (Stitch uses hardcoded hex, not OKLCH custom properties)
- [ ] **CRT-03**: Multimodal critique uses Claude's image reading to analyze Stitch PNG screenshots alongside HTML source
- [ ] **CRT-04**: Critique compares Stitch output against design system tokens and flags divergences as recommendations (not failures)

### Handoff Pattern Extraction

- [ ] **HND-01**: /pde:handoff detects Stitch-sourced artifacts and applies pattern extraction mode
- [ ] **HND-02**: Hex-to-OKLCH inline conversion for extracted color values (following existing figmaColorToCss precedent)
- [ ] **HND-03**: Component pattern extraction from annotated Stitch HTML produces TypeScript interfaces
- [ ] **HND-04**: stitch_annotated: true gate — handoff verifies annotation injection completed before extracting patterns

## Future Requirements

### Stitch Enhancements (v0.10+)

- **STH-F01**: Sketch/image upload as Stitch input for wireframe generation
- **STH-F02**: Vibe Design mode (emotional descriptions → visual output)
- **STH-F03**: Stitch → Figma export pipeline (generated screens editable in Figma)
- **STH-F04**: Design DNA as reusable style preset across projects

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing Claude HTML/CSS entirely | Stitch lacks DTCG/OKLCH awareness, annotations, interactions — Claude remains quality/compliance authority |
| npm dependency at plugin root for Stitch SDK | Zero-npm constraint; SDK usage isolated to helper scripts if needed |
| Community MCP server packages | Verified-sources-only policy — only official Google Stitch MCP server |
| Automatic Stitch calls without consent | User explicitly requires approval for all upstream/downstream exchanges |
| OAuth authentication for Stitch | API key auth is the supported path; OAuth adds unnecessary complexity |
| Real-time bidirectional Stitch sync | Same architectural constraint as Figma — session-based plugin model |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| (To be populated by roadmapper) | | |

**Coverage:**
- v0.9 requirements: 30 total
- Mapped to phases: 0
- Unmapped: 30

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after initial definition*
