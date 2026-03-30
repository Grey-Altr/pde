# Milestones

## v0.24 Cloud Dispatch & State Sync (Shipped: 2026-03-30)

**Phases completed:** 8 phases, 15 plans, 17 tasks

**Key accomplishments:**

- One-liner:
- SessionSourceSchema Zod enum and VALID_SOURCES allowlist narrowing added to dashboard, enabling remote-cloud and docker session sources to flow correctly through queries.ts instead of silently falling back to 'local'
- One-liner:
- One-liner:
- Sync.cjs wired into coordinator dispatch lifecycle: push before spawn for cloud backends, fetch+merge before session merge in _handleExit, with lock-based sequential ordering and fallback-to-local routing
- One-liner:
- Commit:
- Priority-ordered classifyTaskRouting() pure function with cost ceiling, CLI/config override, and fast-path routing via 5-level decision tree
- classifyTaskRouting() wired into coordinator.dispatch() with priority-ordered routing decisions, cost ceiling, fast-path, CLI --dispatch flag, and routing_decision observability events on every dispatch call
- Extended SessionListItem with 5 sync/cost fields, added HTTP-based cloud session actions, and scaffolded DSH-01 through DSH-06 integration tests with source-inspection pattern
- Source badges [C]/[D] with color styling, SyncStatePanel pane, Infrastructure Cost card, and 8-pane grid — all DSH-01/04/05 tests now passing
- Per-server Docker container blocks on APPROVED_SERVERS playwright/stitch with isDockerAvailable() cache, getInstallCmd() docker run form, and getProbeTimeoutMs() startup-latency extension
- One-liner:
- One-liner:

---

## v0.23 Quality & Reliability Hardening (Shipped: 2026-03-30)

**Phases completed:** 5 phases, 9 plans, 16 tasks

**Key accomplishments:**

- Three stale v0.22 state documents corrected: Phase 180 VERIFICATION.md marked complete, 5 unchecked ROADMAP.md plan boxes fixed, and EXT-01 through EXT-10 requirements annotated with inline Phase 176 traceability references
- 34 bare One-liner: placeholders replaced across v0.19-v0.22 sections of MILESTONES.md with accurate descriptions sourced from 34 SUMMARY.md files in the milestones archive — 1 phantom blank remains (no SUMMARY source exists for it).
- Vitest configured with three exclude globs to eliminate 135 false node:test failures; @vitest/coverage-v8@4.1.1 installed with HTML baseline report generated for all 100+ bin/lib modules
- Fixed buildCrossPatterns to read research.topics (not research.findings), reconciled makeMinimalIR mock to match extractResearch() shape, all 23 Phase 184 tests green
- Rewrote 3 stub VALIDATION.md files and created 2 new ones for v0.22 phases 176-180 with nyquist_compliant: true and behavioral node/vitest assertions
- 4 Nyquist-compliant VALIDATION.md files created for v0.22 phases 181-184 and one-liner frontmatter added to 5 v0.7 SUMMARY.md files
- pde-tools health consistency subcommand that cross-checks REQUIREMENTS.md checkboxes against ROADMAP.md phase completion states for any milestone version
- 4 stale pde-tools.cjs paths corrected to CLAUDE_PLUGIN_ROOT, knip and jscpd first-run reports produced with full triage (44 findings, 5 clones, 0.47% duplication rate)
- ESLint 10 flat config with eslint-plugin-n configured for 123 CJS files; zero errors on first clean pass after adding missing Node 20 Web API globals

---

## v0.22 Stakeholder Presentations (Shipped: 2026-03-30)

**Phases completed:** 9 phases, 18 plans, 16 tasks

**Key accomplishments:**

- Four deterministic extractors reading PROJECT.md, STATE.md, ROADMAP.md, REQUIREMENTS.md, and design-manifest.json into structured IR with unavailable sentinels for missing files.
- Six deterministic IR extractors (git velocity, cost/timing, blockers, verification, research, decisions) using execGit and SUMMARY.md frontmatter, with 29 unit tests.
- buildPresentationIR composer wiring all 10 EXT functions into a single JSON IR with SHA-256 source hash and non-blocking cross-reference validation, accessible via `pde-tools presentation artifact-read`.
- `/pde:present` command wired with 15-persona registry, three-branch dispatch (LIST/GENERATE/ERROR), IR acquisition from pde-tools, and Phase 178 generation stub — 32 integration tests all green
- Dual-format HTML+Markdown rendering engine with executive-summary (CLU-01) and case-study (CLR-01) persona builders using section-based document model and PDE design token CSS.
- Replaced workflows/present.md Step 6 stub with a single `pde-tools presentation render` CLI call, completing the end-to-end /pde:present pipeline.
- Four parametric SVG chart generators (burndown, velocity, phase timeline, effort breakdown) with accessibility attributes and HTML fallback tables, wired into the executive-summary and case-study presentation personas.
- Non-blocking claim verification engine that fact-checks every numeric IR value against rendered section content, appending a pass/fail footer section to both HTML and Markdown output via word-boundary regex scanning on stripHtml'd content.
- Playwright page.pdf() PDF export from HTML presentations via pde-tools subcommand and --pdf workflow flag, with printBackground:true for PDE dark theme preservation.
- Added investor-update (CLU-02) and sprint-review (CLU-03) persona builders with 5 new helpers, full test coverage, and CLU-04 through CLU-07 test scaffolds.
- Client deliverable (CLU-04) and stakeholder status (CLU-05) persona builders with deterministic RAG status computation and full test coverage.
- Complete Cluster A persona set with buildProductManager (CLU-06) and buildProjectManager (CLU-07) — requirement coverage with per-category breakdown, full phase tracking without truncation, and cost duration in hours.
- Three Cluster B persona builders added to render-presentation.cjs: agile-report (retro + burndown + velocity), design-report (design-filtered decisions + token evolution), research-report (findings + recommendations + landscape) — 28 tests passing, 11 switch cases total
- buildPostMortem (CLR-05) and buildAdrSummary (CLR-06) added to render-presentation.cjs with ADR-formatted decisions, cause-effect root-cause analysis, and full test coverage (44 passing)
- Two final persona builders (launch-announcement + portfolio-overview) complete the full 15-persona suite with all slugs registered in personaDisplayName(), render() switch, and module.exports — 66 Phase 182 tests green, 0 skipped.
- presentations.auto_generate config toggle and auto_generate_presentations lifecycle hooks wired to phase-complete and milestone-complete workflows with non-blocking persona rendering
- bin/lib/portfolio.cjs
- bin/lib/render-presentation.cjs

---

## v0.21 Desktop App Integration (Shipped: 2026-03-29)

**Phases completed:** 12 phases, 28 plans, 35 tasks

**Key accomplishments:**

- asyncMode spawn/Promise extension to server-gen.cjs plus app-wrappers orchestration layer (index.cjs + generate.cjs) with Wave 0 test scaffolds for all three wrapper plans.
- Streamable HTTP MCP endpoint at /api/mcp with Clerk OAuth auth, RFC 9728 .well-known discovery routes, and 15-test suite verifying export shapes and auth wiring
- start_pipeline_run/check_pipeline_run MCP tools using Upstash Redis job store with 1hr TTL, plus desktop client config docs for Claude Code, Cursor, and mcp-remote relay
- Dynamic server registration in mcp-bridge.cjs with loadDynamicServers() reading approved app-registry entries into TOOL_MAP at module init and registerDynamicServer() for runtime single-app registration, with assertApproved extended to accept DYNAMIC_SERVERS keys.
- emitWebMcpConfig() added as the 7th context-sync emitter, writing .webmcp/config.json for WebMCP browser agent discovery on every emitAll() cycle
- 1. [Rule 3 - Blocking] Wave 1 files not available in worktree
- @modelcontextprotocol/ext-apps installed with registerArtifactPreviewTools wiring two dual-mode tools (preview_artifact, list_design_artifacts) and a CSP-declared HTML resource into the PDE MCP server
- ResourceTemplate registered at ui://pde/{artifact} serving design artifacts as HTML previews via marked (Markdown), JSON pre blocks, and HTML pass-through with inlined tokens.css
- pip module handler for server-gen.cjs using spawnSync python3 -m argument array, plus pde-tools app register subcommand that approves and loads into bridge in one command.
- Slash command and integration test suite for the one-command CLI wrap pipeline with dual-strategy routing (fast path via CLI-Anything harness, fallback via native --help).
- Optional Blender 3D step wired into wireframe.md and optional GIMP retouch step wired into mockup.md, both gated by probeAppTool registry probe with graceful degradation via HTML skip comment annotations when tools are unavailable.
- --webmcp flag added to all four design workflows (wireframe, mockup, critique, competitive) with USE_WEBMCP parse step and conditional WebMCP Context section containing pde_approval_gate tool table and gate ID
- Step 8/8 added to competitive.md with full sanitization pipeline (injection stripping, 512-char truncation), registry write to .webmcp/competitor-tools-registry.json, gate file creation, and GET /api/planning/competitor-tools route serving approved entries
- useCompetitorTools hook registered as query_competitor_data WebMCP dispatcher tool, wired into barrel and composite hook, with full source inspection test coverage
- X-PDE-Relay-Depth circular relay guard module and pde_remote APPROVED_SERVERS entry enabling Claude Code bridge routing to PDE remote MCP server
- Relay depth guard wired into MCP guardedHandler pipeline (origin -> relay depth -> auth) and Gemini CLI httpUrl config documented
- Five-tier binary probe with display detection, col-b preprocessing, and executionMode classification for cross-platform desktop app discovery
- Two-tier approval registry with pending/approved/rejected state machine, SHA-256 hash verification at approval time, and checkApproved guard with actionable CLI error messages
- pde-tools app subcommands wired for discover/probe/list/approve with known design app catalog documenting Blender, GIMP, and Inkscape
- Blender and Inkscape CapabilityModel builders with TDD coverage — Blender has 3 headless capabilities (render/python-exec/export) with asyncRequired true + 5s startup, Inkscape has 1 pure CLI export capability with no deprecated flags.
- GIMP 2.x/3.x version-conditional Script-Fu wrapper (parseMajorVersion + buildGimpArgs + getScriptFuTemplates) and pde-tools app wrap subcommand routing to generateAppWrapper pipeline
- Dual-strategy CLI-Anything router with harness detection, pipx setup, approval-gated wrapping pipeline, and pde-tools subcommand wiring
- commands/cli-wrap.md
- probeAppTool (never-throwing registry probe), Blender bpy GLB export script, and two pipeline chains (Blender->optimize->embed, GIMP->saveAsset) with 16 passing tests

---

## v0.20 CLI-Anything + Asset Engine (Shipped: 2026-03-29)

**Phases completed:** 15 phases, 39 plans, 51 tasks

**Key accomplishments:**

- Zod-validated capability model schema, spec-type auto-detection, ingest orchestrator skeleton, /pde:ingest command, and vitest test infrastructure for all 4 spec types (OpenAPI, JSON Schema, GraphQL, MCP).
- Streamable HTTP MCP endpoint at /api/mcp with Clerk OAuth auth, RFC 9728 .well-known discovery routes, and 15-test suite verifying export shapes and auth wiring
- start_pipeline_run/check_pipeline_run MCP tools using Upstash Redis job store with 1hr TTL, plus desktop client config docs for Claude Code, Cursor, and mcp-remote relay
- GraphQL HTTP introspection parser mapping Query/Mutation fields to capabilities, plus MCP StdioClientTransport parser using @modelcontextprotocol/sdk via absolute path require — 26 tests green.
- emitWebMcpConfig() added as the 7th context-sync emitter, writing .webmcp/config.json for WebMCP browser agent discovery on every emitAll() cycle
- 1. [Rule 3 - Blocking] Wave 1 files not available in worktree
- @modelcontextprotocol/ext-apps installed with registerArtifactPreviewTools wiring two dual-mode tools (preview_artifact, list_design_artifacts) and a CSP-declared HTML resource into the PDE MCP server
- ResourceTemplate registered at ui://pde/{artifact} serving design artifacts as HTML previews via marked (Markdown), JSON pre blocks, and HTML pass-through with inlined tokens.css
- Extended CapabilityModelSchema to accept 'cli' type and established TDD RED scaffolds for all four new cli-anything modules (help-parser, server-gen, skill-gen, registry) with 3 fixture files for deterministic parser testing.
- Implemented help-parser.cjs for extracting CLI subcommands/flags from --help output with recursive discovery, and server-gen.cjs for generating self-contained CJS MCP server files with JSON envelope output, --json flag support, and --dry-run mode.
- Full wrap+publish pipeline: help-parser with recursive --help discovery, self-contained MCP server generator, SKILL.md generator with SHA256 provenance, and local CLI-Hub registry — wired end-to-end via pde-tools.cjs and skill command files.
- --webmcp flag added to all four design workflows (wireframe, mockup, critique, competitive) with USE_WEBMCP parse step and conditional WebMCP Context section containing pde_approval_gate tool table and gate ID
- Step 8/8 added to competitive.md with full sanitization pipeline (injection stripping, 512-char truncation), registry write to .webmcp/competitor-tools-registry.json, gate file creation, and GET /api/planning/competitor-tools route serving approved entries
- useCompetitorTools hook registered as query_competitor_data WebMCP dispatcher tool, wired into barrel and composite hook, with full source inspection test coverage
- X-PDE-Relay-Depth circular relay guard module and pde_remote APPROVED_SERVERS entry enabling Claude Code bridge routing to PDE remote MCP server
- Relay depth guard wired into MCP guardedHandler pipeline (origin -> relay depth -> auth) and Gemini CLI httpUrl config documented
- Playwright headless screenshot capture with named viewport presets, Sharp device-frame compositing, and remove.bg API client with monthly usage tracking (warn at 40/50, block at 50/50).
- OpenAPI 3.x parser with recursive $ref resolution and JSON Schema parser with $defs expansion — both produce CapabilitySchema-validated arrays from real fixture files, 22 tests green
- FFmpeg-static video pipeline with Playwright WebM-to-MP4 recording, concat/xfade assembly, SRT caption burn-in, and asset sidecar storage.
- JSON Schema to Zod codegen walker + AI SDK tool() generator wiring all 4 parsers into a complete end-to-end ingest pipeline
- [Rule 2 - Auto-fix] Merged main into worktree branch
- Isolated Remotion 4.0.441 project with spring-animated BrandedVideo.tsx reading DTCG design tokens, orchestrated by compose.cjs driving `npx remotion render --codec h264`.
- Satori+resvg-js OG/social image pipeline with SHA-256 asset sidecar storage — 15 tests green in 4 minutes
- Wired all 3D pipeline modules into pde-tools.cjs as `case '3d'` with generate|convert|optimize|embed|list subcommands, plus /pde:3d command documentation.
- `node bin/pde-tools.cjs image og|social|screenshot|mockup|rembg|list` fully wired into pde-tools.cjs with /pde:image command documentation for agent discovery
- 64-bit pHash engine using Sharp + 2D DCT over git branches, classifying image assets as changed/unchanged/new/deleted with Markdown + JSON reports
- `pde-tools.cjs image diff <branchA> <branchB>` subcommand wired to runVisualDiff with JSON summary stdout output and /pde:visual-diff command documentation
- CadQuery subprocess module with execFileSync injection for STEP generation, validation, and .step+.cq.py+.meta.json triple asset storage.
- Implemented `mermaid-renderer.cjs` (mmdr/mmdc auto-detection with _execFn injection) and `token-validator.cjs` (DTCG schema validation, OKLCH P3 gamut check via colorjs.io, APCA contrast check via apca-w3) — both in `bin/lib/utils/` with full vitest test coverage, 23 tests passing.
- pde-tools.cjs wired with case 'video' routing record|assemble|compose|caption to video-pipeline modules, plus /pde:video command documentation with SRT/JSON captions, Remotion compose, and resolution aliases
- Three CJS foundation modules for GLB storage, draco optimization via gltf-transform CLI, and model-viewer AR embed — 27 tests passing with a hand-built GLB fixture
- convert3D (image-to-3D via @gradio/client SPACE_CHAIN fallback) and generate3D (text-to-3D via FLUX.1-schnell + convert3D) with 14 mocked unit tests using dependency injection
- Mermaid flowchart parser + Playwright test scaffold generator; handoff spec grep-based gap detector with structured JSON + markdown report output.
- CLI router wired to four utility modules (mermaid, tokens, flow-tests, handoff-verifier) with complete /pde: command skill files — Phase 170 milestone capstone complete.
- `3d cad` CLI subcommand wired into pde-tools.cjs routing generateCAD from cad.cjs, with full /pde:3d cad documentation added to commands/3d.md including setup, options, examples, and CadQuery requirement note.

---

## v0.19 WebMCP Integration (Shipped: 2026-03-28)

**Phases completed:** 7 phases, 16 plans, 21 tasks

**Key accomplishments:**

- Shared McpServer tool registration factory (RMT-05) with MCP-spec-compliant Origin header guard (RMT-03) plus six Wave 0 test scaffolds for all phase requirements.
- Streamable HTTP MCP endpoint at /api/mcp with Clerk OAuth auth, RFC 9728 .well-known discovery routes, and 15-test suite verifying export shapes and auth wiring
- start_pipeline_run/check_pipeline_run MCP tools using Upstash Redis job store with 1hr TTL, plus desktop client config docs for Claude Code, Cursor, and mcp-remote relay
- WebMCP polyfill initialized in providers.tsx via SSR-safe useEffect, plus thin fetch-based JSON-RPC 2.0 hook (useMcpClient) with no SDK dependencies and source-inspection test scaffolds for BRW-01/BRW-02/BRW-04.
- emitWebMcpConfig() added as the 7th context-sync emitter, writing .webmcp/config.json for WebMCP browser agent discovery on every emitAll() cycle
- 1. [Rule 3 - Blocking] Wave 1 files not available in worktree
- @modelcontextprotocol/ext-apps installed with registerArtifactPreviewTools wiring two dual-mode tools (preview_artifact, list_design_artifacts) and a CSP-declared HTML resource into the PDE MCP server
- ResourceTemplate registered at ui://pde/{artifact} serving design artifacts as HTML previews via marked (Markdown), JSON pre blocks, and HTML pass-through with inlined tokens.css
- Three WebMCP browser tool hooks (get_design_state, get_project_info, list_artifacts) registered via useWebMCP with API routes that serve .planning/ file data over HTTP.
- Per-agent cost attribution using Math.max token aggregation, context window percentage, and atomic Redis HINCRBY persistence for the Token Playground UI.
- TokenPlayground replaces CostMeter with 3-card UI (Context Window Progress bar, Session Cost grid, Per-Agent Breakdown table) backed by Redis SSR hydration and debounced persistence.
- --webmcp flag added to all four design workflows (wireframe, mockup, critique, competitive) with USE_WEBMCP parse step and conditional WebMCP Context section containing pde_approval_gate tool table and gate ID
- Step 8/8 added to competitive.md with full sanitization pipeline (injection stripping, 512-char truncation), registry write to .webmcp/competitor-tools-registry.json, gate file creation, and GET /api/planning/competitor-tools route serving approved entries
- useCompetitorTools hook registered as query_competitor_data WebMCP dispatcher tool, wired into barrel and composite hook, with full source inspection test coverage
- X-PDE-Relay-Depth circular relay guard module and pde_remote APPROVED_SERVERS entry enabling Claude Code bridge routing to PDE remote MCP server
- Relay depth guard wired into MCP guardedHandler pipeline (origin -> relay depth -> auth) and Gemini CLI httpUrl config documented

---

## v0.18 Distributed Execution (Shipped: 2026-03-28)

**Phases completed:** 13 phases, 28 plans, 34 tasks
**Commits:** 129 | **Files:** 142 | **LOC:** +19,639
**Timeline:** 2 days (2026-03-26 → 2026-03-28)
**Requirements:** 54/54 satisfied (47 original + 7 gap closure)

**Delivered:** PDE can dispatch parallel sessions to git worktrees (local and remote), coordinate them with Agent SDK intelligence, and surface all session activity in a unified dashboard and tmux panes.

**Key accomplishments:**

1. Session isolation with atomic worktree lifecycle (create/merge/cleanup), single-writer protocol, and COMPLETE.json-driven post-merge recalculation of shared state files
2. Local CLI dispatch with concurrency queue, crash-recoverable session registry, and NDJSON aggregation across parallel `claude` subprocesses
3. Agent SDK orchestrator for DAG analysis, file-overlap detection, failure summarization, and merge conflict triage — ESM-to-CJS bridge pattern
4. SSH remote dispatch routing autonomous sessions to configured servers with git-based state sync and managed backend fallback chain
5. Dashboard multi-session integration: session health matrix, striped animated progress bars, failure cards with server actions, responsive pane grid, keyboard shortcuts
6. tmux multi-session fan-out with color-prefixed session tags, [L]/[R] source labels, aggregate cost display, and session cycling

---

## v0.17 Remote Dashboard (Shipped: 2026-03-26)

**Phases completed:** 13 phases, 27 plans, 38 tasks
**Commits:** 224 | **Files:** 308 | **LOC:** +44,337
**Timeline:** 2 days (2026-03-24 → 2026-03-26)
**Git range:** v0.16..HEAD
**Requirements:** 27/27 satisfied (RLY-01–05, DSH-01–06, MON-01–05, APR-01–05, PWA-01–04, HRD-01–05)

**Key accomplishments:**

1. Relay daemon with zod wire protocol (WireEnvelopeSchema), circuit breaker, HTTP batching, and zero-impact PDE isolation gated behind PDE_REMOTE env var — zero npm deps, node:https only
2. Next.js 16 dashboard with Clerk proxy.ts auth, Upstash Redis sorted sets, SSE streaming with polling fallback, auto-reconnection on heartbeat loss, and shadcn/ui + Geist mobile-first UI
3. Core monitoring: phase progress hierarchy (phase→plan→wave), token/cost meter with Sonnet 4.5 pricing, live event log with type filtering, mobile-responsive card layout with 44px touch targets
4. Bidirectional approval gates with TOCTOU-safe cryptographic approval_id, AlertDialog confirmation UI, 1h TTL + one-shot delete Redis protocol, and relay daemon polling with fd-based stdio capture
5. Installable PWA with Serwist service worker (Turbopack route handler), Web Push notifications via VAPID for approval gates and critical errors, offline shell caching, bottom tab navigation
6. Production hardened: @upstash/ratelimit (120 req/min), 7-day Redis TTL, event downsampling (bash_called/file_changed/tool_called at 1-in-N), 1000-event buffer cap, daily cron GC

**Delivered:** A remotely monitorable PDE platform — push-based relay daemon streams session events from local machine to cloud-hosted Next.js dashboard, enabling phone-based monitoring of phase progress, token costs, and live events, with bidirectional approval gate responses and Web Push notifications — all production-hardened with rate limiting, TTL, downsampling, and garbage collection.

---

## v0.16 Multi-Editor Context Sync (Shipped: 2026-03-24)

**Phases completed:** 7 phases, 14 plans, 8 tasks

**Key accomplishments:**

- Atomic sync state file infrastructure with writeStateFile()/readStateFile() using PID-based tmp, schema v1.0 with 4-field lastIR snapshot, and forward-compatibility guard — establishes the 3-way merge base for Phase 128
- One-liner:
- One-liner:
- One-liner:
- 3-way field-level merge engine with conflict detection and NDJSON logging — mergePartialIR() + appendConflictLog() — plus parseMdcContent Architecture Conventions fix and canonical token SOURCE comment in both DESIGN.md output paths
- One-liner:
- emitAntigravitySkill modified with read-before-write pattern: AGENT-ADDITIONS marker always present, agent content below marker preserved verbatim across all regeneration cycles
- One-liner:
- One-liner:
- Sync audit trail (SYNC-LOG.md append-only markdown), pre-write snapshot system with auto-cleanup, and two CLI subcommands (sync-status, sync-rollback) added to context-sync.cjs with 17 Nyquist tests GREEN
- PDE:BEGIN/PDE:END user content preservation in .mdc files, improved glob patterns, and SKILL.md enriched with pde-skill-version, Workflows checklist, ir.constraints, and design-manifest.json reference

---

## v0.15 Multi-Editor Integration (Shipped: 2026-03-24)

**Phases completed:** 1 phases, 2 plans, 5 tasks

**Key accomplishments:**

- isStitchSource() wired as production consumer in handoff.md, closing STH-02 and DIV-05 gaps — all 25 v0.15 requirements now complete
- Promoted all 7 v0.15 VALIDATION.md files to Nyquist-compliant and backfilled requirements-completed in all 14 SUMMARY.md files, closing all metadata gaps from the v0.15 milestone audit.

---

## v0.15 Multi-Editor Integration (Shipped: 2026-03-24)

**Phases completed:** 7 phases, 14 plans, 6 tasks

**Key accomplishments:**

- (none recorded)

---

## v0.14 Visual AutoResearch (Shipped: 2026-03-24)

**Phases completed:** 10 phases, 21 plans, 15 tasks

**Key accomplishments:**

- Playwright registered as 7th APPROVED_SERVER with stdio transport, 10 TOOL_MAP entries, AUTH_INSTRUCTIONS, and 27 Nyquist tests GREEN
- mcp-integration.md updated with Playwright --headless/--allow-unrestricted-file-access flags, corrected browser_snapshot probe, Flags subsection, %20 encoding note, version fallback, and MCP-08 gate deferred for live verification
- playwright:resize TOOL_MAP entry + wireframe Step 5d expanded into per-file screenshot loop with resize/navigate/screenshot/close bridge calls at 1280x800
- mockup.md Step 7f expanded from multi-breakpoint stub to full per-file Playwright MCP screenshot loop at 1280x800 using the wireframe Step 5d pattern
- Playwright AOM probe added to critique.md Step 3 with 4-way merge logic: landmarks/headings/unlabeled analysis when Playwright available, AOM+Axe combined table when both available, graceful degradation to manual WCAG checklist when neither available.
- One-liner:
- One-liner:
- Task 1 — 4 Non-Browser Experiment Templates
- Multi-stage pipeline metric wrapper (PIPE-04) and two upstream isolation experiment templates (PIPE-01/02/03) enabling AutoResearch to optimize brief.md vs system.md by downstream wireframe DOM quality delta comparison
- One-liner:
- SHA-256 screenshot hash comparison + metric score AND gate in visual-regression.cjs, with JSONL schema extension and 16 Nyquist tests covering VRCB-01 through VRCB-04
- BREAK-05 visual regression circuit breaker wired into optimize.md Step 6b/7h/7k with 11 new Nyquist tests covering VRCB-05 integration — all 27 phase-114 tests pass, full suite 1540/1548 unchanged
- TDD approach — RED then GREEN:
- Multi-candidate loop wired into optimize.md Step 7: N candidates dispatched per iteration, argmax/argmin selection promotes the best via reset-to-sha, DISCARD/all-crash paths reset to iteration baseline, and JSONL rows include candidates_evaluated, candidates_scores, and best_candidate_index.
- 1. [Rule 3 - Blocking] Replaced inline `node -e "require()"` with direct script invocation
- One-liner:
- TOOL_MAP count assertions corrected from 56 to 57 across phases 40-43 test files, restoring the pre-v0.14 Nyquist baseline to 1216 pass / 8 fail (zero v0.14-introduced regressions)

---

## v0.12 Business Product Type (Shipped: 2026-03-23)

**Phases completed:** 15 phases, 24 plans, 46 tasks

**Key accomplishments:**

- Manifest schema extended with businessMode/businessTrack fields and launch/ directory added to design pipeline — Wave 0 test scaffold covers all 7 FOUND requirements
- Four business reference files creating single-source-of-truth for track branching (solo_founder/startup_team/product_leader), lean canvas + pitch deck + service blueprint + Stripe pricing templates, and financial/legal guardrails with placeholder enforcement
- Business intent detection in brief.md via 5-category signal taxonomy (3+/2+ threshold), interactive track selection with solo_founder/startup_team/product_leader, conditional Domain Strategy section in BRF output, and businessMode/businessTrack manifest writes
- Business Thesis and Lean Canvas artifact generation added to brief.md, with 9-box lean canvas schema, confidence status rules, financial placeholders, manifest registration with dependsOn chaining, and 20-field designCoverage write using coverage-check read pattern.
- competitive.md extended with MLS artifact generation (TAM/SAM/SOM placeholders), Mermaid quadrantChart positioning matrix, three-track market depth differentiation, and 20-field designCoverage write; 17/17 structural tests pass
- opportunity.md extended with businessMode-gated RICE unit economics framing (LTV, CAC ceiling, payback at 3 churn scenarios) and 20-field designCoverage write — all 12 structural tests pass
- 5-lane SBP service blueprint and GTM channel flow generation added to flows.md with businessMode detection, track depth branching, strategy/ artifact writes, and 20-field designCoverage upgrade — all 10 Nyquist tests pass
- Strategy DESIGN-STATE update instructions added to flows.md Step 7 — SBP and GTM artifact rows now wired into Cross-Domain Dependency Map, Quick Reference, Decision Log, and Iteration History under conditional guards
- Business brand system added to system.md: Steps 5c/5d generate SYS-brand-tokens.json (DTCG brand-marketing group) and MKT-brand-system artifact with Geoffrey Moore positioning, tone of voice spectrum, and visual differentiation rationale when businessMode==true
- wireframe.md businessMode detection + LDP landing page spec generation (Next.js 11-section map) + 20-field designCoverage upgrade + LDP schema in launch-frameworks.md
- wireframe.md STR Stripe pricing config (Step 4i with LCV/MLS cross-refs) + DPD pitch deck outline (Step 4j with YC/Sequoia/Internal Business Case track branching) + Step 7e-launch DESIGN-STATE wiring for all three launch artifacts, 11/11 Nyquist tests GREEN
- critique.md extended with 4 business perspectives, pitch coherence cross-check, business composite formula (denominator 9.5), and 20-field designCoverage write
- hig.md business communications HIG section with 3 domain checks (pitch deck readability, email cadence, content calendar) gated on LIGHT_MODE + businessMode, plus 20-field designCoverage write — all 24/24 Nyquist tests GREEN
- handoff.md extended with Steps 4k-4m and 5e: 11-artifact LKT manifest, 30-day CNT calendar, and Resend-compatible OTR email sequences assembled in business mode with DPD-gated investor outreach and full 20-field designCoverage
- handoff.md Step 7b-lkt manifest registration for LKT/CNT/OTR, 4 business anti-patterns, output section entries, Step 7d summary extension — 21/21 Nyquist GREEN
- Stage 14 deploy workflow (workflows/deploy.md) with 4 approval-gated Next.js/Stripe/Resend scaffold generation and non-blocking Vercel CLI deployment — 19/21 Nyquist tests GREEN
- `/pde:deploy` slash command and Stage 14 wiring in build.md with businessMode conditional gate — 21/21 Nyquist tests GREEN
- 20-field designCoverage clobber regression fixed in recommend.md and iterate.md, preventing hasLaunchKit destruction when /pde:recommend or /pde:iterate runs after business-mode handoff
- 20-field designCoverage clobber regression fixed in mockup.md and ideate.md, completing the INTG-01 audit across all 4 regression workflows with all 11 Nyquist tests GREEN
- 35-assertion CJS regression matrix validating v0.12 business mode composition isolation, deploy approval gates, and 20-field designCoverage across all 9 coverage-writing workflows — 224/224 full suite GREEN
- Closed 6 requirement gaps: OTR/BTH glob fixes, 21-field designCoverage with hasDeployStaging, handoff required_reading with 4 business refs
- test-foundation.cjs:
- 6 line-level glob fixes across 3 consumer workflows so deploy.md, handoff.md, and critique.md discover STR/DPD/GTM artifacts by their actual producer filenames — closing all 5 v0.12 audit gaps with 235/235 Nyquist tests passing
- 7 tech debt closures: LDP glob -spec stem removed in critique.md BIZ-3 and 6 workflow prose sections updated from "20 fields" to "21 fields" with hasDeployStaging — all 235/235 Nyquist tests remain GREEN

---

## v0.11 Experience Product Type (Shipped: 2026-03-22)

**Phases completed:** 10 phases, 19 plans
**Commits:** 116 | **Files:** 112 | **LOC:** ~245,000
**Timeline:** ~15 hours (2026-03-21)
**Git range:** docs: start milestone v0.11 → docs(v0.11): Nyquist validation
**Nyquist tests:** 162 pass / 0 fail across all phases

**Key accomplishments:**

1. Experience product type detection: 48 keyword signals, 5 sub-types (single-night, multi-day, recurring-series, installation, hybrid-event), conditional blocks in all 14 pipeline workflows with zero new workflow files — sub-types as manifest metadata, not pipeline branches
2. Experience brief extensions: Five physical design inputs (promise statement, vibe contract, audience archetype, venue constraints, repeatability intent) feeding all downstream artifact generation
3. Physical design token architecture: SYS-experience-tokens.json with 6 categories (sonic, lighting, spatial, atmospheric, wayfinding, brand coherence) in DTCG format, 30-token cap, isolated from base SYS-tokens.json
4. Experience flow dimensions and wireframe artifacts: Temporal/spatial/social flow diagrams with spaces-inventory.json, floor plan (FLP) as inline SVG with zone boundaries and accessibility routes, timeline (TML) as Mermaid gantt with energy curve overlay
5. Event-specific critique and physical interface guidelines: 7 critique perspectives (safety, accessibility, operations, sustainability, licensing/legal, financial, community) + 7 HIG domains (wayfinding, acoustic zoning, queue UX, transaction speed, toilet ratio, hydration, first aid) — all regulatory values carry [VERIFY WITH LOCAL AUTHORITY] disclaimer
6. Print collateral and production bible: Event flyer (FLY) with A5/A4/Instagram variants and CMYK tables, series identity template (SIT), festival program (PRG), plus six-section production bible (BIB) handoff with advance document, run sheet, staffing plan, budget framework, post-event template, and print spec — Awwwards-level composition standards throughout

**Delivered:** The "experience" product type — events, festivals, and installations as first-class PDE citizens — with physical design tokens, spatial/temporal flow diagrams, floor plan and timeline wireframes, event-specific safety and accessibility critique, physical interface guidelines, print collateral (flyers, programs, series identity), and a complete production bible handoff — all integrated as conditional blocks in the existing 13-stage pipeline with 48 requirements satisfied, 162 Nyquist tests, and zero regressions across software/hardware/hybrid product types.

---

## v0.10 Idle Time Productivity (Shipped: 2026-03-21)

**Phases completed:** 4 phases, 8 plans
**Commits:** 56 | **Files:** 107 | **LOC:** ~109,000
**Timeline:** ~4 hours (2026-03-21)
**Git range:** v0.9..HEAD

**Key accomplishments:**

1. Hook delivery infrastructure: Notification/idle_prompt hook with zero-stdout contract, NDJSON event gating (fires only on meaningful PDE events), marker-based idempotency, and /tmp/-only state files
2. Suggestion engine: Standalone CJS module (bin/lib/idle-suggestions.cjs) with phase-aware ranking, blocker prioritization, next-phase preview, artifact-fed targeting, time-bounded micro-task calibration — zero LLM calls, <2s budget, tech-noir output
3. Suggestion catalog: Human-editable idle-catalog.md with 6 phase categories (research/plan/execute/design/validation/default), DESIGN-STATE.md incomplete-item extraction, time-to-complete labels and resumption cost categories
4. Context notes: User-authored .planning/context-notes/ directory with README, injected into /pde:plan (Step 7.2 + planner prompt) and /pde:brief (Sub-step 2c + Step 5) for domain knowledge enrichment
5. Dashboard integration: 7-pane tmux layout with Pane 7 (suggestions) via pane-suggestions.sh polling script, adaptive degradation preserved, /pde:suggestions CLI command for non-tmux access
6. Documentation: Getting Started updated with messageIdleNotifThresholdMs: 5000 recommendation, monitor.md updated for 7-pane layout

**Delivered:** A guided productivity system for users during PDE processing wait times — phase-aware suggestions ranked by blockers, artifacts, and upcoming work, delivered via ambient tmux dashboard pane and CLI command, with user-authored context notes flowing into planning workflows — all built with zero LLM calls, zero npm dependencies, and zero stdout pollution.

---

## v0.9 Google Stitch Integration (Shipped: 2026-03-21)

**Phases completed:** 6 phases, 12 plans
**Commits:** 76 | **Files:** 91 | **LOC:** ~100,000
**Timeline:** ~6 hours (2026-03-20 → 2026-03-21)
**Git range:** feat(64-01): extend designCoverage schema → docs(v0.9): milestone audit
**Nyquist tests:** 215 assertions, all green

**Key accomplishments:**

1. Stitch MCP integration: Registered Google Stitch as 6th approved MCP server in mcp-bridge.cjs with auth (STITCH_API_KEY), 10-entry TOOL_MAP with live verification gate (MCP-05), probe/degrade contracts, and quota tracking (Standard 350/mo, Experimental 50/mo with 80% warning threshold and auto-fallback)
2. Wireframe + mockup pipeline: `--use-stitch` flag on `/pde:wireframe` and `/pde:mockup` with full generate-fetch-persist-annotate pipeline, consent gates, 10s timeout with Claude fallback, annotation injection (5 semantic HTML tags), and STH-{slug} artifact caching in design-manifest.json
3. Visual divergence: `/pde:ideate --diverge` feeds concept descriptions to Stitch for 3-5 visual interpretations per concept, batch quota-aware with partial-batch fallback (uses remaining quota rather than hard stop), PNG storage alongside text-based ideation artifacts
4. Critique comparison: `/pde:critique` detects Stitch-sourced artifacts via manifest `source: "stitch"`, suppresses DTCG token-format false positives (CRT-02), reads STH PNG screenshots for multimodal visual analysis (CRT-03), and appends conditional `## Stitch Comparison` delta reports as recommendations not failures
5. Handoff pattern extraction: `/pde:handoff` Step 2l gates on `stitch_annotated: true`, Step 4b-stitch extracts `@component:` annotations via regex, Step 5b produces STITCH_COMPONENT_PATTERNS section with WFR+Stitch/Stitch-only/WFR-only source tags, Step 5c generates `STH_{Slug}_{Component}Props` TypeScript interfaces with inline hex-to-OKLCH conversion and `@verify` labels for Stitch-only components
6. 215 Nyquist tests: Full structural regression suite across phases 65-69 using file-parse assertions (readFileSync + node:test), covering all 30 requirements with zero failures — provides regression safety net for future changes

**Delivered:** Google Stitch AI UI design tool fully integrated into PDE's 13-stage design pipeline as an alternative rendering engine (wireframe/mockup), visual exploration tool (ideation divergence), critique comparator (multimodal analysis with token suppression), and pattern extraction source (handoff with TypeScript interface generation) — all with quota tracking, consent gates, graceful fallback to Claude HTML/CSS, and zero npm dependencies.

---

## v0.8 Observability & Event Infrastructure (Shipped: 2026-03-20)

**Phases completed:** 6 phases, 13 plans
**Commits:** 80 | **Files:** 81 | **LOC:** ~192,000
**Timeline:** ~15 hours (2026-03-19 → 2026-03-20)
**Git range:** docs: start milestone v0.8 → docs(v0.8): milestone audit

**Key accomplishments:**

1. Event infrastructure: PdeEventBus class with setImmediate-deferred dispatch, session-scoped NDJSON files in /tmp, Claude Code hooks for automatic tool/agent event capture, future-proof schema with extensions field
2. tmux dashboard: `/pde:monitor` command with 6-pane layout (agent activity, pipeline progress, file changes, log stream, token/cost meter, context window), adaptive layout for small terminals, nested tmux detection, platform-aware auto-install
3. Session archival: Structured markdown summaries in `.planning/logs/` at every SessionEnd, NDJSON cleanup of files >7 days, ISO-timestamped session log filenames
4. Token & context metering: chars/4 heuristic with ~est. labels, per-model cost estimation from model-profiles config, orchestrator context utilization percentage
5. Workflow instrumentation: Semantic phase/wave/plan events emitted from execute-phase.md and execute-plan.md via surgical manual calls, enriching dashboard and session summaries
6. Gap closure: plan_started/plan_complete events added to session summary aggregation (MISS-01 from audit), 26/26 requirements satisfied, 6/6 phases Nyquist compliant

**Delivered:** A complete observability layer for PDE — structured event infrastructure with NDJSON event bus, persistent tmux monitoring dashboard with 6 live panes, automatic session history with structured summaries, and token/cost estimation — all built with zero npm dependencies using only Node.js built-ins and shell scripts.

---

## v0.7 Pipeline Reliability & Validation (Shipped: 2026-03-20)

**Phases completed:** 4 phases, 11 plans, 3 tasks

**Key accomplishments:**

- TRACKING-PLAN.md created to fix broken consent panel reference, one-liner field added to SUMMARY template, and all 20 v0.6 SUMMARY files backfilled for automated extraction
- Smoke-tested pde-research-validator against Phase 54 research: 9 claims extracted, verified against codebase, RESEARCH-VALIDATION.md produced with validated_at_phase: 55 — proves RVAL-03 and RVAL-06
- Dimension 9 (Cross-Phase Dependencies) added to pde-plan-checker using roadmap analyze --raw for gap detection with DEPENDENCY-GAPS.md artifact and three resolution option types
- Dimension 10 (Edge Cases) added to pde-plan-checker with LLM reasoning pass, severity classification, 5-8 cap, BDD candidates for HIGH findings, and EDGE-06 AC approval gate added to plan-phase.md as Step 11.5 outside the revision loop
- Dimension 11 (Integration Mode A) added to pde-plan-checker: @-reference extraction from <context> blocks, file existence checks, TOOL_MAP_PREREGISTERED exclusion-set for orphan detection, INTG-05 scope bound via allowlist, and INTEGRATION-CHECK.md artifact specification

---

## v0.6 Advanced Workflow Methodology (Shipped: 2026-03-20)

**Phases completed:** 8 phases, 19 plans, 2 tasks

**Key accomplishments:**

- (none recorded)

### Plugin Install Status (PLUG-01)

**Status: Working** — Plugin installs successfully via the two-step sequence:

```
/plugin marketplace add Grey-Altr/pde
```

```
/plugin install platform-development-engine@pde
```

Both commands completed without error when tested programmatically via the `claude` CLI (v2.1.79). The first command clones the GitHub repository via HTTPS and registers it as a marketplace source. The second command installs the plugin into user scope. Verify by typing `/pde:` in Claude Code and confirming the command palette appears.

### Known Exceptions

- Commits `e067974` and `efe3af0` lack `Co-Authored-By` trailers. These commits predate the convention and cannot be retroactively amended without rewriting published history. Documented here as known exceptions — not a defect.

---

## v0.5 MCP Integrations (Shipped: 2026-03-19)

**Phases completed:** 7 phases, 18 plans
**Commits:** 99 | **Files:** 118 | **LOC:** ~145,000
**Timeline:** 2 days (2026-03-18 → 2026-03-19)
**Git range:** feat(39-01) → docs(quick-260319-0u1)

**Key accomplishments:**

1. MCP Infrastructure Foundation: Central adapter module (mcp-bridge.cjs) with security allowlist, probe/degrade contracts, connection persistence, and canonical tool name mapping — all integrations share one bridge
2. GitHub Integration: Bidirectional sync (issues → REQUIREMENTS.md, handoff → PRs), brief from GitHub issue, CI pipeline status, write-back confirmation gates
3. Linear + Jira Integration: Issue sync, milestone/epic mapping, ticket creation from handoff, configurable `task_tracker` toggle — unified adapter pattern for both services
4. Figma Integration: DTCG token import/export, wireframe design context, Code Connect handoff, mockup-to-Figma canvas export with non-destructive merge
5. Pencil Integration: Design token sync to VS Code canvas, screenshot capture for visual critique audit, detection-based connection with graceful degradation
6. End-to-End Validation: 315 structural tests verifying multi-server concurrency isolation, post-compaction auth recovery, and write-back confirmation enforcement across all integrations

**Delivered:** A connected development platform with 5 MCP integrations (GitHub, Linear, Jira, Figma, Pencil) — all sharing a central adapter module with security allowlist, probe/degrade contracts, and write-back confirmation gates — enabling bidirectional sync between PDE planning state and external development tools, validated by 315 structural tests.

---

## v0.4 Self-Improvement & Design Excellence (Shipped: 2026-03-18)

**Phases completed:** 10 phases, 20 plans
**Commits:** 131 | **Files:** 259 | **LOC:** ~134,000
**Timeline:** 4 days (2026-03-14 → 2026-03-18)
**Git range:** test(phase-24) → docs(v1.3): re-audit

**Key accomplishments:**

1. Quality infrastructure: Awwwards 4-dimension rubric, motion design reference, composition/typography reference, protected-files mechanism for safe self-modification
2. Self-improvement fleet: `/pde:audit` with 3-agent orchestration (auditor/improver/validator), baseline delta tracking, PDE Health Reports
3. Skill builder: `/pde:improve` with create/improve/eval modes, validation gate, style guide enforcement — PDE can create and elevate its own skills
4. Design elevation: All 7 pipeline skills elevated with DTCG motion tokens, OKLCH harmony palettes, APCA contrast, spring physics, scroll-driven animations, variable font axes (330+ Nyquist assertions)
5. Pressure test: `/pde:pressure-test` with two-tier evaluation (process compliance + Awwwards quality rubric) and AI aesthetic avoidance detection
6. Tech debt closure: All audit findings resolved — 62/62 requirements satisfied, 10/10 phases verified, 0 remaining debt

**Delivered:** A self-improving design platform that audits, validates, and elevates its own output quality against professional standards — producing Awwwards-level design artifacts through a 13-stage pipeline with motion choreography, perceptual color harmony, and AI aesthetic avoidance, validated by end-to-end pressure testing.

---

## v0.3 Advanced Design Skills (Shipped: 2026-03-17)

**Phases completed:** 5 phases, 10 plans
**Commits:** 67 | **Files:** 84 | **LOC:** ~101,700
**Timeline:** 2 days (2026-03-16 → 2026-03-17)
**Git range:** feat(24-01) → feat(28-01)

**Key accomplishments:**

1. Built 6 new design skills: recommend, competitive, opportunity, mockup, HIG, and ideate
2. Migrated all existing skills to 13-field pass-through-all coverage pattern (zero flag clobber)
3. Expanded /pde:build orchestrator from 7 to 13 stages with --from entry point and dynamic stage counting
4. Created two-pass diverge→converge ideation pipeline with auto tool discovery at checkpoint
5. Added WCAG 2.2 AA / HIG audit with dual mode (light in critique, full standalone) and severity-rated findings
6. Wired soft upstream context injection (IDT/CMP/OPP) into /pde:brief with graceful degradation

**Delivered:** Six advanced design skills expanding the pipeline from 7 to 13 stages — ideation, competitive analysis, opportunity scoring, hi-fi mockups, HIG audit, and tool discovery — creating a comprehensive pre-brief research layer and post-iterate quality gate, all orchestrable via `/pde:build`.

---

## v0.2 Design Pipeline (Shipped: 2026-03-16)

**Phases completed:** 15 phases, 16 plans
**Commits:** 135 | **Files:** 172 | **LOC:** ~89,000
**Timeline:** 2 days (2026-03-15 → 2026-03-16)
**Git range:** docs(12) → docs(v1.1)

**Key accomplishments:**

1. Design pipeline infrastructure: state management, DTCG-to-CSS conversion, write-lock protocol, artifact manifest (design.cjs + pde-tools.cjs)
2. Problem framing (/pde:brief): structured brief generation with product-type detection (software/hardware/hybrid)
3. Design system (/pde:system): DTCG 2025.10 JSON tokens with CSS custom properties, OKLCH color space, dual dark mode
4. User flow mapping (/pde:flows): Mermaid flowchart diagrams with screen inventory JSON for wireframe stage
5. Wireframing + critique + iteration: fidelity-controlled HTML/CSS wireframes (/pde:wireframe), 4-perspective severity-rated critique (/pde:critique), versioned revision with convergence signal (/pde:iterate)
6. Handoff + orchestrator: TypeScript interfaces and STACK.md-aligned component specs (/pde:handoff), single-command full pipeline (/pde:build)

**Delivered:** A complete 7-stage design pipeline (brief → system → flows → wireframe → critique → iterate → handoff) that takes users from problem framing through visual wireframes to implementation-ready TypeScript specs, orchestrable via a single `/pde:build` command.

---

## v0.1 PDE MVP (Shipped: 2026-03-15)

**Phases completed:** 11 phases, 23 plans
**Commits:** 127 | **Files:** 303 | **LOC:** ~60,000
**Timeline:** 2 days (2026-03-14 → 2026-03-15)
**Git range:** feat(01-01) → feat(11-01)

**Key accomplishments:**

1. Complete GSD → PDE rebrand: zero GSD strings in any source file (grep-clean verified)
2. 34 `/pde:` slash commands operational with full command palette integration
3. Workflow engine with persistent `.planning/` state across context resets
4. Agent system with 12 PDE agent types and parallel wave orchestration
5. Public distribution ready: README, Getting Started guide, marketplace.json, version 1.0.0
6. Gap closure: runtime crash fix (telemetry.cjs), STATE.md regressions, 21 command stubs for dangling references

**Delivered:** A fully rebranded, publicly distributable Claude Code plugin that provides AI-assisted end-to-end product development lifecycle management.

---
