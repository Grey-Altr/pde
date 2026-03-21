# Phase 66: Wireframe + Mockup Stitch Integration - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `--use-stitch` flag to `/pde:wireframe` and `/pde:mockup` that routes screen generation through the Stitch MCP server (registered in Phase 65) instead of Claude HTML/CSS. Includes the full generate-fetch-persist-annotate pipeline, user consent gates before every outbound/inbound exchange, local artifact caching for downstream reuse, graceful fallback to Claude generation on failure/quota exhaustion, and annotation injection for downstream critique/handoff.

Requirements: WFR-01, WFR-02, WFR-03, WFR-04, WFR-05, WFR-06, CONSENT-01, CONSENT-02, CONSENT-03, CONSENT-04, EFF-01, EFF-02, EFF-04, EFF-05

</domain>

<decisions>
## Implementation Decisions

### Stitch Artifact Storage
- STH-{slug}.html files stored in `.planning/design/ux/wireframes/` alongside WFR- artifacts (same directory, different prefix)
- STH-{slug}.png screenshots stored in same directory as their HTML — critique needs PNG for multimodal analysis
- Mockup Stitch artifacts named STH-{slug}-hifi.html in `.planning/design/ux/mockups/` (mirrors mockup-{slug}.html pattern)
- `hasStitchWireframes: true` set in designCoverage when first STH artifact is persisted (Phase 64 prepared this field)
- Manifest entries use `source: "stitch"` metadata field to distinguish from Claude-generated artifacts

### Consent UX Flow
- Outbound consent: AskUserQuestion before each Stitch call showing the prompt text being sent (CONSENT-01/03)
- Inbound consent: show artifact type, size, and target path; persist only after user approval (CONSENT-02)
- Multi-screen wireframe runs use a single batch-consent prompt showing all screens before generation starts (CONSENT-04)
- Consent is NOT remembered across pipeline stages — each command (wireframe, mockup, critique) re-consents independently

### Annotation Injection
- DOM-level comment injection using regex pattern matching on semantic HTML elements (`<nav>`, `<header>`, `<main>`, `<section>`, `<form>`)
- Format: `<!-- @component: ComponentName -->` injected before each identified structural element
- Injection happens immediately after fetch, before manifest registration (EFF-05)
- `stitch_annotated: true` set in manifest entry alongside artifact registration
- Partial annotations accepted — inject what's identifiable, log warning about unidentified sections, still set stitch_annotated: true

### Fallback Behavior
- Three fallback triggers: MCP unavailable (connection probe fails), Stitch error response, quota exhausted (checkStitchQuota returns allowed:false) — all checked within 10-second timeout budget (EFF-04/WFR-06)
- User-visible warning message explains why Stitch was skipped, then proceeds with Claude HTML/CSS generation
- Fallback artifacts use standard WFR- prefix (not STH-) — they are Claude-generated, manifest `source` field reflects origin
- No retry loops — single attempt, then fallback

### Pipeline Efficiency
- Fetched Stitch HTML and PNG cached locally — critique, handoff, iterate reuse cached files without re-fetching (EFF-01)
- Stitch artifact reuse across pipeline stages: wireframe output flows to mockup/critique/handoff via manifest paths (EFF-02)
- Annotation injection begins as soon as first screen arrives, not after all screens complete (EFF-05)

### Claude's Discretion
- Exact regex patterns for component annotation matching
- Error message wording for consent prompts and fallback warnings
- Whether to include Stitch artifacts in index.html navigation alongside Claude wireframes
- Order of operations within the generate-fetch-persist-annotate pipeline steps

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### MCP Bridge Infrastructure (Phase 65)
- `bin/lib/mcp-bridge.cjs` — APPROVED_SERVERS (stitch entry), TOOL_MAP (10 stitch: entries), AUTH_INSTRUCTIONS, readStitchQuota/incrementStitchQuota/checkStitchQuota functions
- `.planning/phases/65-mcp-bridge-quota-infrastructure/65-01-SUMMARY.md` — Stitch bridge registration decisions (stdio transport, TOOL_MAP_VERIFY_REQUIRED markers)
- `.planning/phases/65-mcp-bridge-quota-infrastructure/65-02-SUMMARY.md` — Quota infrastructure decisions (configPath injection, UTC reset, null vs default)

### Existing Wireframe Pipeline
- `workflows/wireframe.md` — Full wireframe workflow: screen generation, WFR-{slug}.html persistence, index.html navigation, DESIGN-STATE.md update, manifest registration with designCoverage pass-through-all (14 fields)
- `templates/design-manifest.json` — Manifest schema with designCoverage (14 boolean fields including hasStitchWireframes), artifact entry structure

### Existing Mockup Pipeline
- `workflows/mockup.md` — Full mockup workflow: wireframe-to-hifi evolution, mockup-{slug}.html persistence, MCK-mockup-spec-v{N}.md, DESIGN-STATE.md update, manifest registration

### Requirements
- `.planning/REQUIREMENTS.md` — WFR-01–06, CONSENT-01–04, EFF-01/02/04/05 definitions with success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mcp-bridge.cjs` TOOL_MAP: `stitch:generate-screen`, `stitch:get-screen`, `stitch:list-screens`, `stitch:fetch-screen-code`, `stitch:fetch-screen-image`, `stitch:extract-design-context` — canonical names for all Stitch MCP calls
- `checkStitchQuota(generationType, configPath)` — pre-generation quota check returning `{allowed, reason, used, limit}`
- `incrementStitchQuota(generationType, configPath)` — post-generation counter increment with lazy monthly reset
- `readStitchQuota(configPath)` — raw quota state reader (returns null when unconfigured)
- `wireframe.md` Step 7c manifest registration pattern — `manifest-set-top-level designCoverage` with 14-field pass-through-all

### Established Patterns
- **WFR- artifact naming**: `WFR-{slug}.html` for wireframes, `mockup-{slug}.html` for mockups — STH- prefix parallels this
- **Manifest registration**: `pde-tools.cjs design manifest-add-artifact` for per-artifact entries, `manifest-set-top-level` for coverage flags
- **14-field designCoverage pass-through**: Every skill reads all 14 flags, sets only its own — Phase 64 added hasStitchWireframes to this pattern
- **DESIGN-STATE.md artifact table**: Each skill adds/updates its artifact row in the domain-level state file

### Integration Points
- `workflows/wireframe.md` — `--use-stitch` flag parsing, Stitch pipeline branch after flag detection
- `workflows/mockup.md` — `--use-stitch` flag parsing, same branch pattern
- `workflows/critique.md` — reads `source: "stitch"` from manifest to apply Stitch-aware evaluation (Phase 68)
- `workflows/handoff.md` — reads `stitch_annotated: true` from manifest for pattern extraction (Phase 69)
- `workflows/connect.md` Step 3.10 — Stitch connection with MCP-05 live verification gate

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The REQUIREMENTS.md success criteria are precise enough to guide implementation directly.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 66-wireframe-mockup-stitch-integration*
*Context gathered: 2026-03-20*
