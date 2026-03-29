---
gsd_state_version: 1.0
milestone: v0.20
milestone_name: CLI-Anything + Asset Engine
status: Ready to plan
stopped_at: Completed 168-03-PLAN.md
last_updated: "2026-03-29T04:31:36.647Z"
progress:
  total_phases: 15
  completed_phases: 13
  total_plans: 34
  completed_plans: 34
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.
**Current focus:** Phase 168 — AI 3D Generation + Web Embedding

## Current Position

Phase: 169
Plan: Not started

## Performance Metrics

**Prior milestone reference:**

- v0.19: 7 phases, 16 plans, 30 requirements, 7 commits (1 day)
- v0.18: 13 phases, 28 plans, 54 requirements, 129 commits (2 days)
- v0.17: 13 phases, 27 plans, 27 requirements, 224 commits (2 days)
- v0.16: 8 phases, 15 plans, 26 requirements, 48 commits

*Updated after each plan completion*

## Accumulated Context

### Decisions

- All v0.20 services must use free or open-source toolchains — no paid API keys required (constraint from PROJECT.md)
- CLI-Anything: unified capability model is the shared data structure consumed by all downstream generators (tool(), SKILL.md, MCP server)
- Image pipeline: .planning/design/assets/ is the canonical output directory with metadata JSON sidecar per asset
- 3D pipeline: .planning/design/3d/ is the canonical output directory for generated GLB/STEP files with generation metadata
- Visual diff (IMG-05/06) is the engine layer; UTL-04 is the /pde: command surface that calls it — clean separation across phases
- Phase 169 (CAD) depends on Phase 168 (3D) because CadQuery output lives in the same 3D asset directory and builds on the 3D pipeline conventions
- [Phase 163]: Zod v4.3.6 requires z.record(z.string(), z.unknown()) — one-arg z.record(z.unknown()) crashes on non-trivial values; fixed in model.cjs
- [Phase 163]: vitest.config.ts server.deps.inline zod — prevents dual Zod instance issue between CJS modules and ESM test files
- [Phase 163]: resolveRefs for OpenAPI: paths starting with 'components/' resolved relative to spec.components to handle '#/components/schemas/X' format
- [Phase 163]: buildInputSchema flattens requestBody object properties directly into inputSchema.properties (not nested under 'body') for type:object with properties
- [Phase 163]: JSON Schema parser uses path.basename(source) slug as root capability name;  entries use their definition key names
- [Phase 163]: GraphQL and MCP parsers expose unit-testable helper functions (parseIntrospectionResult, parseMCPToolsList) to avoid live network/process dependencies in tests
- [Phase 163]: MCP SDK must be required from packages/pde-mcp-server/node_modules absolute path — bare require('@modelcontextprotocol/sdk') fails
- [Phase 164]: Fixture files are plain text captures of real CLI --help output (git, gh) plus one synthetic minimal fixture for deterministic testing
- [Phase 164]: Test scaffolds use createRequire(import.meta.url) pattern to bridge ESM/CJS boundary; registry tests use mkdtempSync for fs isolation
- [Phase 164]: parseFlags returns { flag, short, long, arg, description } with flag as primary key (long || short) — test contract from 164-01 scaffolds
- [Phase 164]: generateServerSource accepts full model object { meta, capabilities } matching test call signature, with optional sdkBasePath second param
- [Phase 164]: help-parser uses spawnSync with array args (no shell) to prevent injection; cmdWrap added to help-parser.cjs for pipeline cohesion
- [Phase 164]: server-gen embeds absolute SDK path via JSON.stringify in generated server.cjs — fully self-contained MCP stdio server
- [Phase 165]: Pass ASSETS_DIR from assets.cjs to all saving subcommands so CLI always persists output to .planning/design/assets/
- [Phase 165]: image subcommand routing in pde-tools.cjs uses case 'image' following cli-anything pattern with args.indexOf() for flag parsing
- [Phase 166]: pHash uses 32x32 resize to full DCT then top-left 8x8 (not 8x8 resize) for proper 64-bit hash with adequate frequency information
- [Phase 166]: Solid-color synthetic images produce degenerate pHash outputs (Pitfall 5) — relative distance ordering unreliable; tests assert only non-zero distance
- [Phase 166-visual-diff-asset-reporting]: diff subcommand added after existing image subcommands before the default else block; missing args produce usage error and exit 1
- [Phase 167-video-production-pipeline]: Isolated Remotion package.json with exact pinned versions; walkTokens() maps DTCG color/fontFamily tokens to BrandedVideo props; assets.cjs created in parallel to unblock compose.cjs
- [Phase 167]: ffmpeg-static used as bundled binary source — no system FFmpeg required
- [Phase 167]: spawnSync used in getClipDuration to reliably capture FFmpeg stderr (exits code 1 for -f null -)
- [Phase 167]: Playwright video path only accessible after context.close() — video ref saved before close
- [Phase 167]: video case block placed after image case block, before phase-plan-index — maintains consistent ordering of media commands in pde-tools.cjs
- [Phase 168-ai-3d-generation-web-embedding]: No ios-src in model-viewer embed — model-viewer 4.x auto-generates USDZ for iOS Quick Look
- [Phase 168-ai-3d-generation-web-embedding]: gltf-transform used as CLI (spawnSync) not programmatic API to avoid ESM/CJS boundary issues in CJS modules
- [Phase 168]: Dependency injection (_hfClient, _convertFn, _gradioClient, etc.) used in generate3D/convert3D for CJS test mocking — vi.mock() cannot intercept require() in CJS files loaded via Node's native loader
- [Phase 168]: SPACE_CHAIN tries multiple Gradio route names (/run, /predict, /generate) per space — different HF Spaces expose different function names and SF3D/TripoSR spaces confirmed down as of 2026-03-29
- [Phase 168]: 3d.md placed in commands/ (root) not bin/lib/commands/ — all command docs follow root commands/ pattern

### Pending Todos

(None)

### Blockers/Concerns

- TRD-01/TRD-02: TripoSR/SF3D require local GPU inference — document minimum hardware and provide CPU fallback path during planning
- VID-03/VID-04: Remotion requires Node.js 18+ and a bundler; verify compatibility with existing PDE toolchain before planning Phase 167
- CLI-03: GraphQL introspection requires a live endpoint — plan must handle offline/schema-file fallback

## Session Continuity

Last session: 2026-03-29T04:27:55.403Z
Stopped at: Completed 168-03-PLAN.md
Resume with: `/gsd:plan-phase 163`
Resume file: None
