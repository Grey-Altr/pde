# Project Research Summary

**Project:** Platform Development Engine — v0.9 Google Stitch Integration
**Domain:** AI visual design tool integration into an existing self-contained design pipeline (Claude Code plugin)
**Researched:** 2026-03-20
**Confidence:** MEDIUM

## Executive Summary

PDE v0.9 integrates Google Stitch as an optional visual design engine alongside the existing Claude-generated HTML/CSS pipeline. Stitch is a Google Labs AI tool that generates HTML+Tailwind UI screens from text prompts, with native support for multi-direction visual variants, "Vibe Design" emotional prompting, and voice input via its web canvas. The primary integration path is Stitch's official remote MCP server (`https://stitch.googleapis.com/mcp`) authenticated via API key — no OAuth dance, no Google Cloud project required. Stitch becomes the 6th approved server in `mcp-bridge.cjs`, accessed through 10 new TOOL_MAP canonical names following established patterns.

The recommended approach is a complementary architecture, not a replacement: Stitch handles visual exploration and initial direction-setting (ideation diverge, wireframe variants) while Claude retains authority over quality, compliance, interactivity, and code production (token system enforcement, accessibility, motion, handoff). The `--use-stitch` flag on `/pde:wireframe` and `/pde:mockup` routes to Stitch as the primary renderer with automatic Claude fallback. Four touchpoints receive Stitch enhancements — wireframe/mockup, ideation diverge, critique comparison, and handoff pattern extraction — each implemented as additive sub-workflows that extend, not replace, existing workflow files.

The key risks are architectural rather than feature-level. Stitch is a Google Labs tool with early-stage API stability, a 350/month Standard Mode generation limit that automated pipelines exhaust quickly, and HTML output that is fundamentally incompatible with PDE's DTCG/OKLCH token system. Every touchpoint must implement the generate-fetch-persist pattern (never store transient download URLs), annotation injection before handoff, Stitch-aware critique modes (suppress token-consistency checks on Stitch artifacts), and a two-path contract (Stitch or Claude equivalent, never Stitch-or-fail). The `hasStitchWireframes` coverage flag extension requires migrating all 13 existing skill workflows before any Stitch-specific logic ships — this migration is the mandatory first phase.

## Key Findings

### Recommended Stack

The Stitch integration adds exactly three new stack elements to PDE. The **official Stitch remote MCP server** (`https://stitch.googleapis.com/mcp`, HTTP transport) is the primary integration path — cloud-hosted, zero install footprint, registered via `claude mcp add --transport http` exactly as Figma and Linear are today. The **`STITCH_API_KEY` environment variable** is the sole authentication credential; API key auth replaces the OAuth browser flow used by all five existing approved servers. The **`@google/stitch-sdk@0.0.3`** npm package is needed only for programmatic post-processing (fetching HTML from signed download URLs) and must be installed in an isolated `bin/lib/stitch/` subdirectory — never at the plugin root, preserving the zero-npm-at-root constraint.

Two community MCP implementations exist (`@_davideast/stitch-mcp` and `Kargatharaakash/stitch-mcp`) but neither should be used as the approved server endpoint — both are unofficial, expose different tool name sets, and violate PDE's verified-sources-only security policy. The official Stitch MCP setup docs page (`stitch.withgoogle.com/docs/mcp/setup`) is the authoritative tool name source but rendered as minified JS on research fetch; TOOL_MAP entries must be re-verified against the live server at implementation time before any phase ships.

**Core technologies:**
- `https://stitch.googleapis.com/mcp` (HTTP MCP server): Primary Stitch integration endpoint — official Google-operated, zero install, API key auth via `X-Goog-Api-Key` header
- `STITCH_API_KEY` env var: Authentication credential for both MCP server and SDK — generated at stitch.withgoogle.com Settings, replaces OAuth dance; must be added to shell profile for session persistence
- `@google/stitch-sdk@0.0.3` (isolated subdirectory only): Programmatic URL materialization — only needed if MCP `getHtml()`/`getImage()` returns URLs that require fetch; Node.js `https` built-in can substitute

**Critical version requirement:** SDK is pre-release (v0.0.3); `variantCount` field was `numVariants` in prior versions — pin explicitly and re-verify field names at each milestone.

See `.planning/research/STACK.md` for full rationale, MCP tool name table, SDK method signatures, known bugs, and alternatives considered.

### Expected Features

Research identifies a clear MVP (P1 features required for "Stitch as primary engine" claim to be credible) and two subsequent tiers.

**Must have (table stakes — v0.9 core):**
- Stitch MCP server registration as 6th approved server in `mcp-bridge.cjs` — foundational blocker; nothing else ships without this
- `--use-stitch` flag on `/pde:wireframe` — calls `generate_screen_from_text` (confirmation gate), fetches and persists HTML locally as `STH-{slug}.html`, persists PNG as `STH-{slug}.png`
- `--use-stitch` flag on `/pde:mockup` — same pattern with hifi prompt context; reuses wireframe-stitch.md with `--mockup` flag
- Screen image retrieval for `/pde:critique` — `get_screen_image` for visual comparison; Stitch-aware critique mode (suppress DTCG token checks on Stitch artifacts; substitute visual-consistency-with-design-DNA criteria)
- Design DNA extraction for `/pde:handoff` — `extract_design_context` output + hex-to-OKLCH inline conversion (no npm dep); additive merge into DTCG token file
- Graceful degradation when Stitch unavailable — auth failure or network error falls back to Claude HTML/CSS generation with clear user message; no hard failure
- Write-back confirmation gates — `generate_screen_from_text` and `create_project` require explicit user consent (VAL-03 pattern); read-only tools do not

**Should have (differentiators — v0.9.x after core validation):**
- Visual divergence during `/pde:ideate --diverge` — Stitch generates visual variants for first 3 text directions (MAX_STITCH_SCREENS from config, default 3); stored as `STH-ideate-direction-{N}.png`; each variant generated independently (no shared design DNA)
- Design DNA token seeding for `/pde:system` — feed Design DNA into design system generation as starting palette; add after handoff OKLCH conversion is confirmed correct

**Defer (v1.0+):**
- Vibe Design prompt mode — translate brief emotional sections into Stitch vibe prompts; defer until core generation paths are validated
- Persistent Stitch project per PDE project — track project ID in DESIGN-STATE.md across sessions; adds state management complexity for marginal current value

**Anti-features explicitly ruled out in v0.9:**
- Replacing Claude HTML/CSS generation entirely — Stitch lacks motion tokens, OKLCH, ARIA, state transitions; it is an exploration tool, not a production quality path
- Automatic Stitch generation on every pipeline run — 350/month limit; must remain opt-in via `--use-stitch` flag
- Treating Stitch HTML as design system source of truth — DTCG tokens are authoritative; Stitch colors must be converted to OKLCH, never adopted raw
- Exposing all Stitch MCP tools to all subagents — violates TOOL_MAP insulation pattern that preserves 85% context savings

See `.planning/research/FEATURES.md` for full feature dependency graph, capability gap analysis, and confirmed limitations.

### Architecture Approach

The Stitch integration adds a 6th approved server to `mcp-bridge.cjs` and extends the existing sub-workflow pattern at four touchpoints without changing the bridge's contract model. Each touchpoint follows the sub-workflow include pattern already established for Figma (`wireframe-figma-context.md`, `handoff-figma-codeConnect.md`) and Pencil (`critique-pencil-screenshot.md`). Four new sub-workflow files are created; eight existing files are modified to include them conditionally. The engine hierarchy (Stitch primary when connected → Claude fallback always) is enforced at the workflow level — the bridge remains a pure policy layer.

Stitch artifacts use the `STH-` prefix namespace (`STH-{slug}.html`, `STH-{slug}.png`, `STH-design-dna.json`) and coexist alongside existing `WFR-` artifacts without overwriting them. The generate-fetch-persist pattern is mandatory at every touchpoint: Stitch returns signed download URLs (not file content), so immediate fetch-and-write to local paths is required before any downstream workflow reads the artifact. Design manifest entries must reference local paths, never URLs. Stitch project state (project ID) is stored as extra fields on the `mcp-connections.json` stitch entry, following the Pencil editor state precedent.

**Major components:**
1. `mcp-bridge.cjs` (MODIFIED) — add stitch to APPROVED_SERVERS (+1 entry, `probeTool: mcp__stitch__list_projects`) and TOOL_MAP (+10 entries); API key auth pattern differs from existing OAuth servers
2. `workflows/wireframe-stitch.md` (NEW) — generate → URL-fetch → local-persist → annotation-inject → `stitch_annotated: true` in manifest → Design DNA extraction; reused by mockup via `--mockup` flag
3. `workflows/ideate-stitch.md` (NEW) — MAX_STITCH_SCREENS budget → per-direction independent prompt construction (no shared design DNA) → image fetch → `STH-ideate-direction-{N}.png`; quota tracking in config.json
4. `workflows/critique-stitch-compare.md` (NEW) — multimodal PNG analysis + HTML CSS extraction + Design DNA comparison → token-compliance delta report as additive CRT report section
5. `workflows/handoff-stitch-extract.md` (NEW) — `stitch_annotated: true` gate → HTML structural parsing + multimodal visual component identification → WFR annotation cross-reference → STITCH_COMPONENT_PATTERNS → hex-to-OKLCH inline conversion
6. Coverage migration (13 existing workflows MODIFIED) — add `hasStitchWireframes` pass-through to all 13 designCoverage writes; this is Phase 1, must precede all other Stitch work

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams, TOOL_MAP entries, APPROVED_SERVERS shape, anti-patterns, and build order with phase dependencies.

### Critical Pitfalls

1. **Generate-fetch-persist pattern missing — Stitch download URLs expire in minutes** — Every Stitch generation returns a signed URL, not file content. Storing that URL in design-manifest.json causes silent failures when critique or handoff runs later. Each touchpoint must immediately fetch the URL and write the content to a local path; the manifest entry must reference the local path, never the URL. Prevention: establish this pattern in Phase 3 (wireframe) and reuse it everywhere.

2. **Coverage flag migration skipped — `hasStitchWireframes` overwrites existing flags** — The pass-through-all pattern in designCoverage means any skill that writes coverage without the new field resets it to undefined. Adding a 14th coverage field requires updating all 13 existing skills before any Stitch workflow goes live. Prevention: Phase 1 is exclusively this migration, with no Stitch-specific behavior shipped until it completes.

3. **Annotation injection bypassed — handoff reads Stitch HTML expecting PDE annotations** — Stitch generates clean frontend HTML with no `<!-- @component: -->` or `<!-- @state: -->` comments that handoff reads to produce TypeScript interfaces. Without a mandatory annotation-injection step between generation and manifest registration, handoff completes but outputs empty component specs. Prevention: annotation injection is required before `stitch_annotated: true` is set in the manifest; handoff checks this field before proceeding.

4. **Token-consistency critique applied to Stitch artifacts — report polluted with structural artifacts** — PDE's critique evaluates OKLCH/DTCG token compliance. Stitch generates Tailwind CSS with hardcoded hex values. Running the standard critique on Stitch output fills the report with token-mismatch findings that are structural incompatibilities, not design problems. Prevention: critique checks `source: "stitch"` in the manifest and substitutes visual-consistency-with-design-DNA criteria for token-format checks.

5. **`extract_design_context` used in ideation diverge — homogenizes all variants** — This tool maintains Stitch-internal consistency by seeding new screens with existing screen DNA. Applied to ideation diverge (where visual distinctiveness is the goal), it causes all variants to share the same color palette — defeating the purpose of diverge. Prevention: each diverge variant must be generated from its text prompt alone, with no shared design DNA; reserve `extract_design_context` only for explicit consistency workflows.

6. **Google Labs API instability — community tool names baked into TOOL_MAP** — The two community Stitch MCP implementations expose different tool names for overlapping capabilities. TOOL_MAP entries derived from community repos rather than the official docs page will break silently when users install the other server or when Google changes tool names. Prevention: verify all 10 TOOL_MAP entries against the live official server at Phase 2 implementation time using `claude /mcp → stitch → list tools`.

See `.planning/research/PITFALLS.md` for 9 additional pitfalls with warning signs, phase mapping, recovery strategies, and a "looks done but isn't" verification checklist.

## Implications for Roadmap

The phase structure is driven by three hard dependencies: (1) the coverage migration must precede all Stitch-specific logic, (2) MCP bridge registration must precede all touchpoints, and (3) wireframe/mockup (which produces STH artifacts) must precede critique and handoff (which consume them). Ideation diverge is independent of wireframe/mockup and can run in parallel with Phase 3.

### Phase 1: Coverage Schema Migration
**Rationale:** The pass-through-all pattern makes the `hasStitchWireframes` coverage migration a hard prerequisite — any Stitch-specific logic that ships before this migration will silently corrupt the coverage state of all 13 existing skills. This phase has no behavioral change visible to users; it is purely a schema extension that must land first.
**Delivers:** `hasStitchWireframes: false` pass-through in all 13 existing coverage-writing workflows; design-manifest.json template updated with new field; zero behavioral change
**Addresses:** Anti-pattern 3 from ARCHITECTURE.md (adding coverage field without migration); Pitfall 2 (silent coverage flag corruption)
**Avoids:** Retroactive 13-file migration after Stitch logic has already written artifacts and corrupted the schema

### Phase 2: MCP Bridge Registration + Connect Workflow
**Rationale:** Every Stitch feature is blocked until `mcp-bridge.cjs` registers Stitch as the 6th approved server. This phase also establishes the API key authentication path and user-facing setup guidance — the highest-friction onboarding in PDE's history (3 more manual steps than any existing OAuth integration). The authentication UX must be correct from first ship; retrofitting it after user complaints is expensive.
**Delivers:** `stitch` entry in APPROVED_SERVERS with `probeTimeoutMs: 10000`, `transport: 'http'`, `url: 'https://stitch.googleapis.com/mcp'`, `probeTool: 'mcp__stitch__list_projects'`; 10 TOOL_MAP entries (MEDIUM confidence — must be verified against live server); AUTH_INSTRUCTIONS with shell profile persistence recommendation; `stitch` added to connect.md help text; `/pde:connect stitch` prints specific multi-step setup guide if `STITCH_API_KEY` is absent; probe result cached in `mcp-connections.json` with TTL
**Addresses:** Table-stakes feature "Stitch MCP server registration"; Pitfall 1 (API stability/community tool names), Pitfall 8 (authentication friction and session persistence)
**Avoids:** Shipping TOOL_MAP entries derived from community repos; deploying without probe verification gate
**Research flag:** MEDIUM confidence on all TOOL_MAP tool names — verify each entry against live server at implementation time before committing. The `get_screen_code` vs `fetch_screen_code` naming discrepancy between community implementations must be resolved.

### Phase 3: Touchpoint 1 — Wireframe + Mockup (Stitch as Primary Renderer)
**Rationale:** Wireframe is the first and most foundational touchpoint. Its STH artifacts are consumed by critique (Phase 5) and handoff (Phase 6). The generate-fetch-persist pattern established here must be adopted by all subsequent touchpoints — this is the place to establish it correctly, not patch it later.
**Delivers:** `workflows/wireframe-stitch.md` (NEW) implementing: project init → screen loop (3 max) → `stitch:generate-screen` → immediate URL fetch → local file write (`STH-{slug}.html`, `STH-{slug}.png`) → annotation injection → `stitch_annotated: true` in manifest → Design DNA extraction (`STH-design-dna.json`); `workflows/wireframe.md` and `workflows/mockup.md` MODIFIED with Step 1.6 Stitch path; engine hierarchy logic with flag semantics (`--use-stitch` asserts, no flag degrades gracefully, `--no-stitch` skips); Claude fallback on mid-generation failure
**Addresses:** P1 features `--use-stitch` on wireframe/mockup, graceful degradation, confirmation gates; Pitfall 4 (URL expiration), Pitfall 5 (missing annotations in handoff), Pitfall 6 (outage cascading to full design track failure)
**Avoids:** Overwriting WFR artifacts with STH artifacts (separate prefix namespaces, separate file paths); storing signed URLs in design-manifest.json; generating all screens before checking the first result

### Phase 4: Touchpoint 2 — Ideation Visual Divergence (Parallel with Phase 3)
**Rationale:** Ideation diverge generates its own variant images from text directions and has no dependency on wireframe STH artifacts — it can proceed in parallel with Phase 3 once Phase 2 (bridge registration) is complete. Quota management and the explicit decision NOT to use `extract_design_context` must be first-implementation requirements, not retrofits.
**Delivers:** `workflows/ideate-stitch.md` (NEW) implementing: MAX_STITCH_SCREENS budget from config (default 3) → per-direction independent prompt construction (no shared design DNA between variants) → `stitch:generate-screen` → image fetch → `STH-ideate-direction-{N}.png`; `workflows/ideate.md` MODIFIED; `stitch_quota` tracking in config.json (count + monthly reset date + mode used); pre-flight quota check warning when fewer than 5 Standard generations remain; mid-run Claude fallback for remaining variants on quota exhaustion or generation failure
**Addresses:** Differentiator "multi-direction visual exploration during ideation"; Pitfall 2 (quota exhaustion blocking diverge), Pitfall 9 (`extract_design_context` homogenizing variants)
**Avoids:** Using Experimental Mode (50/month) for automated generation; sharing design DNA across diverge variants; consuming all quota before checking first generation result

### Phase 5: Touchpoint 3 — Critique Stitch Comparison (After Phase 3)
**Rationale:** Critique comparison requires STH artifacts from Phase 3. The Stitch-aware critique mode must be built before any Stitch artifact enters critique — the criterion substitution logic (suppress token-format checks; use visual-consistency-with-design-DNA instead) is simpler to design upfront than retrofit after the report is already polluted with structural false positives.
**Delivers:** `workflows/critique-stitch-compare.md` (NEW) implementing: `source: "stitch"` manifest check → load STH-design-dna.json + tokens.css + brief → Claude multimodal PNG analysis → HTML CSS value extraction → per-screen delta report (token compliance %, deviating properties, novel patterns, missing patterns) → aggregate across all screens → token update and prompt refinement recommendations; `workflows/critique.md` MODIFIED with Step 3.6; CRT report enhanced with additive `## Stitch Comparison` section (does not replace 4-perspective critique or composite score)
**Addresses:** P1 feature "screen image retrieval for critique"; Pitfall 3 (DTCG token incompatibility polluting critique reports)
**Avoids:** Running token-consistency criterion on Stitch artifacts; reading artifact from an expired stored URL; replacing the existing critique structure

### Phase 6: Touchpoint 4 — Handoff Pattern Extraction (Parallel with Phase 5)
**Rationale:** Handoff requires STH artifacts and the annotation injection step from Phase 3. It can run in parallel with Phase 5. The hex-to-OKLCH color conversion function must be inline (no npm dependency) following the `figmaColorToCss` and `dtcgToPencilVariables` inline function precedent from v0.5.
**Delivers:** `workflows/handoff-stitch-extract.md` (NEW) implementing: `stitch_annotated: true` gate → HTML structural parsing (nav/form/table/overlay patterns) → multimodal visual component identification → WFR annotation cross-reference → STITCH_COMPONENT_PATTERNS with source tags (WFR+Stitch / Stitch-only / WFR-only) → TypeScript interfaces for Stitch-only components labeled "verify before implementation" → hex-to-OKLCH inline conversion → additive merge into HND handoff spec and HND-types.ts; human decision prompts for Stitch-only components not in WFR annotations; `workflows/handoff.md` MODIFIED with Step 1.6
**Addresses:** P1 feature "Design DNA extraction for handoff"; Pitfall 5 (missing annotation gap producing empty specs); Pitfall 3 (Stitch hex colors not mapped to DTCG tokens in handoff output)
**Avoids:** Treating Stitch HTML as the authoritative handoff source; mapping Stitch colors to component props without DTCG token lookup; setting HND coverage flag on an empty spec

### Phase Ordering Rationale

- **Phase 1 before everything:** The pass-through-all pattern makes coverage schema migration a hard prerequisite for any new `designCoverage` field. No Stitch logic can ship before this completes.
- **Phase 2 before Phases 3-6:** All MCP tool calls are blocked without bridge registration. Authentication UX and probe infrastructure must exist before any touchpoint.
- **Phase 3 before Phases 5 and 6:** Critique and handoff consume STH artifacts that wireframe/mockup produces. The generate-fetch-persist pattern and annotation injection are established in Phase 3 and reused by both.
- **Phase 4 parallel with Phase 3:** Ideation diverge generates its own artifacts independently; no dependency on Phase 3 output.
- **Phases 5 and 6 parallel:** Both are independent consumers of Phase 3's STH artifact output.
- **Minimum viable delivery:** Phases 1-3 alone deliver the core "Stitch as wireframe/mockup renderer" claim. Phases 4-6 add high value but can move to a point release if timeline is constrained.

### Research Flags

Phases needing deeper research or live verification during planning:

- **Phase 2 (MCP bridge registration):** TOOL_MAP raw MCP tool names are MEDIUM confidence — confirmed via Google AI Developers Forum and community repos, but the official `stitch.withgoogle.com/docs/mcp/setup` page returned minified JS on fetch. Must verify all 10 entries against the live server at implementation time using `claude /mcp → stitch → list tools`. The `get_screen_code` vs `fetch_screen_code` naming discrepancy between community servers must be resolved against the official server before TOOL_MAP is committed.
- **Phase 3 (wireframe integration):** The `list_screens` state-sync bug (newly generated screens invisible until project is opened in browser) was confirmed in early 2026 — verify whether it still persists at implementation time. Mitigation (use `screenId` returned directly from `generate_screen_from_text`, never re-list) is architecturally correct regardless.
- **Phase 4 (ideation diverge):** Rate limit values (350 Standard / 50 Experimental per month) are LOW confidence (single community source). Design the quota tracking system defensively. Verify whether `generate_screen_from_text` accepts a `modelId` parameter to force Standard mode for automated generation.

Phases with standard, well-documented patterns (research-phase can be skipped):

- **Phase 1 (coverage migration):** Pure schema extension following the pass-through-all pattern documented in existing codebase. No external dependencies or unknowns.
- **Phase 5 (critique):** Sub-workflow include pattern, multimodal PNG analysis via Claude's Read tool, and CRT report format are all established. Stitch-specific behavior is limited to the `source: "stitch"` check and criterion substitution.
- **Phase 6 (handoff):** Sub-workflow pattern, WFR annotation cross-reference, TypeScript interface generation, and inline color conversion function are all established precedents in the codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Official SDK (v0.0.3) and MCP server URL verified via official repos and Google AI forum. Rate limit quotas are LOW confidence (single community source). Official MCP setup docs page returned minified JS — cannot confirm exact parameter format from official source. |
| Features | MEDIUM | Stitch capabilities verified across Google blog, official Codelabs, and multiple independent reviews. Sketch-upload reliability is LOW confidence (one review found it falls back to text prompts). Voice Canvas MCP exposure is LOW confidence (text-only tools confirmed in community servers as of March 2026). |
| Architecture | MEDIUM | Sub-workflow integration pattern is HIGH confidence (directly modeled on existing Figma/Pencil patterns in the PDE codebase). MCP tool names are MEDIUM confidence (community-verified; official docs not parseable). APPROVED_SERVERS URL field requires live verification at implementation time. |
| Pitfalls | HIGH | Critical failure modes (URL expiration, annotation gap, token incompatibility, quota exhaustion, API instability) are grounded in direct inspection of existing PDE workflows and confirmed Stitch output behavior from multiple independent sources. |

**Overall confidence:** MEDIUM — The integration architecture is solid and grounded in established PDE patterns. The primary uncertainty is Stitch's API surface (tool names, parameter schemas) due to the official docs page not being parseable. This gap is addressable with a live server verification step at the start of Phase 2.

### Gaps to Address

- **Official MCP tool names (addressable at Phase 2):** All TOOL_MAP entries derive from community repos and the Google AI Developers Forum — not from the official docs page (returned minified JS). Must be verified against the live official server before Phase 2 ships. Risk: tool names differ between official server and community implementations; baking the wrong names into TOOL_MAP causes silent failures at tool call sites.
- **Official MCP server URL confirmation (addressable at Phase 2):** The URL `https://stitch.googleapis.com/mcp` is HIGH confidence (confirmed via official Google AI forum and SDK source). The exact `claude mcp add` command parameters (especially `--header` format for API key) should be confirmed by attempting live registration at Phase 2 implementation time.
- **Quota tracking implementation (addressable at Phase 4):** Rate limits (350 Standard / 50 Experimental per month) are LOW confidence. Design the `stitch_quota` tracking in config.json defensively — assume limits may be lower than documented. The Stitch API should return a 429-equivalent on exhaustion; capture this specific error code to distinguish quota exhaustion from other generation failures.
- **`list_screens` state-sync bug persistence (verify at Phase 3):** The confirmed bug (newly generated screens invisible to `list_screens` until project is opened in browser) was documented in early 2026. The mitigation (always use `screenId` returned directly from `generate_screen_from_text`) is architecturally correct regardless, but verify whether the bug still affects other list operations.
- **Sketch-upload input reliability (verify at Phase 3 if image-input path is implemented):** Documented capability; one credible review found it falls back to text prompts. If the wireframe-to-mockup path uses Stitch image input, run a specific test (upload a PDE wireframe screenshot; verify Stitch generates from the image) before committing to this as a supported path.

## Sources

### Primary (HIGH confidence)
- `google-labs-code/stitch-sdk` GitHub — SDK API, method signatures, TypeScript types, authentication setup, `variantCount` field name fix in v0.0.3 release notes
- Stitch by Google X account — official SDK release confirmation, API key auth launch ("goodbye to the OAuth dance")
- Google Developers Blog / Google Labs blog — Stitch official announcement, March 2026 Voice Canvas/Vibe Design/SDK/MCP update
- Google AI Developers Forum (`discuss.ai.google.dev`) — tool names `generate_screen_from_text`, `list_screens`, `get_screen`, `get_project`, `create_project` confirmed; `list_screens` state-sync bug documented with official Google acknowledgment
- Google Codelabs — Design-to-Code with Antigravity and Stitch MCP — official 4-phase workflow; Design DNA extraction confirmed; `extract_design_context` use pattern documented
- PDE codebase direct inspection — `bin/lib/mcp-bridge.cjs`, all 13 skill workflows, `workflows/wireframe.md`, `workflows/critique.md`, `workflows/handoff.md`, `workflows/ideate.md` — APPROVED_SERVERS pattern, TOOL_MAP structure, pass-through-all convention, zero-npm constraint, verified-sources-only policy, sub-workflow include pattern

### Secondary (MEDIUM confidence)
- `davideast/stitch-mcp` GitHub — 9 tool definitions, `build_site`, `get_screen_code`, `get_screen_image`, base64 image return pattern; disclaimer: not officially affiliated with Google
- `Kargatharaakash/stitch-mcp` GitHub — 9-tool surface including `extract_design_context`, `generate_screen_from_text`; cross-validation of tool surface
- `gemini-cli-extensions/stitch` README — Gemini CLI v0.19.0+ runtime dependency confirmed; eliminates this as a PDE integration path
- index.dev Google Stitch Review 2026 — cinema app walkthrough; confirmed no animations, non-functional form submits, no component naming by default
- nxcode.io — Stitch complete guide, Stitch vs Figma, Stitch vs v0 vs Lovable — Vibe Design, Voice Canvas, generation limits, output format ("best design, not best code")
- winbuzzer.com — March 2026 redesign coverage — SDK, MCP server announcement, Claude Code as first-class integration target

### Tertiary (LOW confidence)
- nxcode.io quota guide — 350 Standard / 50 Experimental generations per month (single community source; not confirmed on official Stitch pricing page)
- Sketch-upload reliability (single review finding that it falls back to text prompts; cannot be confirmed from official docs)
- mcpmarket.com server listing — capabilities overview (aggregator, not official source)

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
