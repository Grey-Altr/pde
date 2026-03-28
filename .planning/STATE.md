---
gsd_state_version: 1.0
milestone: v0.19
milestone_name: WebMCP Integration
status: Milestone complete
stopped_at: Completed 162-02-PLAN.md
last_updated: "2026-03-28T23:18:06.324Z"
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 16
  completed_plans: 16
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.
**Current focus:** Phase 162 — multi-editor-bridge

## Current Position

Phase: 162
Plan: Not started

## Performance Metrics

**Prior milestone reference:**

- v0.18: 13 phases, 28 plans, 54 requirements, 129 commits (2 days)
- v0.17: 13 phases, 27 plans, 27 requirements, 224 commits (2 days)
- v0.16: 8 phases, 15 plans, 26 requirements, 48 commits
- v0.15: 8 phases, 16 plans, 25 requirements

*Updated after each plan completion*

## Accumulated Context

### Decisions

- Phase 156: Use stateless per-request transport (sessionIdGenerator: undefined) for Vercel compatibility — NOT module-level session state
- Phase 156: Origin header validation is MUST-level per MCP spec — enforce on every request type including GET/SSE
- Phase 157: useMcpTool() central hook is the only registration path — provideContext() is deprecated since March 5, 2026
- Phase 158: All tool handlers emit both type: 'resource' rich blocks AND type: 'text' fallbacks — preserves stdio backward compatibility
- Phase 161: Auto-generated competitor tools require explicit human approval gate — never auto-activate
- [Phase 156]: mcp-handler@1.1.0 installed with --legacy-peer-deps to resolve SDK version pin conflict (1.26.0 vs 1.28.0, backward-compatible)
- [Phase 156]: Origin guard allows null origin for CLI/relay clients that don't send Origin header (MCP spec compliant)
- [Phase 156]: server-factory.ts is pure (registers tools only, no transport) - HTTP route handler owns transport lifecycle
- [Phase 156]: Redis key pattern pde:mcp:job:{uuid} namespaced to avoid collisions, 3600s TTL for auto-expiry
- [Phase 156]: after() from next/server used for fire-and-forget pipeline stub within same maxDuration budget
- [Phase 156]: MCP route uses acceptsToken=oauth_token not default — plain auth() returns session tokens which MCP clients cannot provide
- [Phase 156]: Origin guard wraps auth handler (validateOrigin first) — bad-origin requests rejected before Clerk token processing
- [Phase 157]: Test file placed in tests/ not __tests__/ — vitest.config.js only scans tests/ path
- [Phase 157]: emitWebMcpConfig() added as 7th emitter — .webmcp/config.json regenerates on every emitAll() cycle for WebMCP client discovery
- [Phase 157]: Used source-inspection (readFileSync) tests instead of renderHook — project vitest config uses node environment, jsdom not available
- [Phase 157]: Source inspection tests used instead of renderHook — vitest runs in node environment (no DOM/jsdom)
- [Phase 157]: inputSchema constants defined at module level in browser tool hooks — prevents zombie re-registration on re-renders
- [Phase 158]: CSP _meta.ui.csp belongs in contents[]._meta (read callback return value) not registerAppResource config — config-level is listing-level fallback only
- [Phase 158]: registerAppTool signature: (server, name, config, handler) — name is second positional arg per SDK declaration
- [Phase 158]: ResourceTemplate.uriTemplate is a UriTemplate object — use .uriTemplate.template for string, not String(rt)
- [Phase 158]: vi.mock must share vi.fn() instances between ESM default and named exports for default-import modules
- [Phase 159]: Math.max per agent for token_usage events (cumulative snapshots, not deltas)
- [Phase 159]: Cost stored as integer * 10000 in Redis to avoid HINCRBY float limitation
- [Phase 159]: CostMeter import removed from session-detail.tsx but cost-meter.tsx retained for cleanup in future phase
- [Phase 159]: 5-second debounce on persistSessionCost prevents Upstash command exhaustion under rapid token events
- [Phase 160]: inputSchema const defined at module level outside hook function — prevents zombie re-registration on re-renders (extends Phase 157 pattern to approval gate tool)
- [Phase 160]: Phase 160-02: WebMCP Context section is additive-only — appended after standard output when --webmcp flag present, no behavior change otherwise (per D-06)
- [Phase 160]: Phase 160-02: Gate ID format for workflow gates: {workflow}-{PHASE_NUMBER}-{YYYYMMDD}-{4_HEX} (wireframe/mockup/critique/competitive)
- [Phase 161]: Phase 160-02 workflow changes to competitive.md were not merged to main — absorbed into Phase 161-01 as auto-fix (Rule 3)
- [Phase 161]: competitor-tools GET route is unauthenticated (read-only, matches gates GET pattern)
- [Phase 161]: Single dispatcher query_competitor_data tool accepts competitor_name param — avoids hooks-in-loop for dynamic per-competitor registration (D-04 resolution)
- [Phase 162]: validateRelayDepth extracted to relay-depth-guard.ts (mirrors origin-guard.ts) for direct import testing; RELAY_DEPTH_LIMIT=1; pde_remote uses underscore key for mcp__pde_remote__ prefix alignment
- [Phase 162]: relay-depth-guard.ts created in Plan 02 as Rule 3 auto-fix (Plan 01 artifact was missing but required by Plan 02)
- [Phase 162]: Gemini CLI uses httpUrl field (not url) for Streamable HTTP — url selects SSE transport which PDE does not support
- [Phase 162]: Guard pipeline order: origin (cheapest) -> relay depth (header check) -> auth (Clerk RPC, expensive)

### Pending Todos

(None)

### Blockers/Concerns

- Phase 161: @keak/webmcp-core API surface is MEDIUM confidence — verify generateToolDefinitions() signature before planning
- Phase 162: Limited production examples of WebMCP relay; relay depth detection patterns need verification before planning
- mcp-handler npm (v1.0.7) vs GitHub (v1.1.0) gap — pin explicitly at install time in Phase 156

## Session Continuity

Last session: 2026-03-28T23:13:21.955Z
Stopped at: Completed 162-02-PLAN.md
Resume with: `/gsd:plan-phase 156`
Resume file: None
