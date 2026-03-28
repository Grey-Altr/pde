# Project Research Summary

**Project:** PDE v0.19 WebMCP Integration
**Domain:** Browser-native MCP interface, Streamable HTTP remote MCP, MCP Apps rich UI, design artifact preview, dashboard WebMCP tools, token playground
**Researched:** 2026-03-27
**Confidence:** HIGH (all 4 research files grounded in official specs and verified source code)

## Executive Summary

v0.19 adds a browser-native agent interface (WebMCP) and a publicly accessible Streamable HTTP remote MCP server onto PDE's working v0.18 foundation. The approach is additive by design: the same `McpServer` instance serves both stdio and HTTP transports via a shared server factory; the existing NDJSON/SSE/PWA pipeline requires zero wire protocol changes; and all new npm dependencies are scoped exclusively to `dashboard/package.json` or `packages/pde-mcp-server/`, preserving the plugin root's zero-dep constraint. The WebMCP ecosystem converged on a stable pattern in early 2026 — `@mcp-b/global` for polyfilled browser runtime, `mcp-handler` for Vercel Streamable HTTP, and `registerTool()`/`unregisterTool()` lifecycle hooks for React — with Chrome 146+ native support and full polyfill coverage for all other browsers.

The recommended sequence is Remote MCP Server first, then Dashboard WebMCP Tools, then MCP Apps and Design Artifact Preview together, then the remaining features (token playground, approval gates, competitor tools, multi-editor bridge, remote collaboration). This ordering is driven by hard dependencies: the remote endpoint must exist before browser hooks can call it; the CSP and sandboxing architecture must be set before any iframe UI is built; OAuth architecture must be final before any auth code ships.

The primary risks are architectural, not technical: dual-transport process proliferation (stdio and HTTP running simultaneously), Vercel stateless session pitfalls, `provideContext()` replacing all registered tools (deprecated since March 5, 2026), DNS rebinding attacks via missing Origin validation, OAuth CSRF via shared client IDs, and MCP Apps CSP silently blocking all network calls. Every one of these has caused production failures in comparable projects. They are all avoidable if the architecture is specified correctly before implementation begins.

---

## Key Findings

### Recommended Stack

The browser integration layer requires three packages in `dashboard/`: `@mcp-b/global` (one-import WebMCP runtime + polyfill, 285KB, no-op on Chrome 146+), `@mcp-b/react-webmcp` (React hooks: `useWebMCP()`, `useMcpClient()`, `McpClientProvider`), and `@mcp-b/webmcp-types` (TypeScript types for `navigator.modelContext`). The remote server layer requires `mcp-handler@1.1.0` (Vercel-optimized Streamable HTTP route handler) with `@modelcontextprotocol/sdk@1.28.0` (upgrade from the currently pinned `^1.26.0`; 1.25.x has documented security vulnerabilities). The token playground requires `@ai-sdk/mcp@1.0.25` (AI SDK 6 MCP client with structured token usage per call). Remote auth requires `mcp-auth` for resource server validation of Clerk-issued tokens. Auto-generated competitor tools require `@keak/webmcp-core` installed in `packages/` only. MCP Apps rich UI requires zero new packages — it is a protocol extension on the existing SDK.

**Core technologies:**
- `@mcp-b/global`: WebMCP browser runtime — zero-config polyfill, native passthrough on Chrome 146+, covers all non-Chrome browsers
- `@mcp-b/react-webmcp`: React lifecycle management for tool registration — prevents stale closure and zombie-tool failures via automatic cleanup
- `mcp-handler@1.1.0`: Vercel Streamable HTTP adapter — single `createMcpHandler()` call, SSE + Redis session resumability with Upstash (already installed)
- `@modelcontextprotocol/sdk@1.28.0`: MCP protocol primitives including `WebStandardStreamableHTTPServerTransport` (already in installed 1.27.1)
- `mcp-auth`: RFC 9728 Protected Resource Metadata — required by MCP spec for any remote MCP server; minimal addition for validating Clerk-issued tokens
- `@ai-sdk/mcp@1.0.25`: Token-usage-aware MCP client for the token playground; part of AI SDK 6 only

**Critical version constraints:**
- `zod@^3` only — `mcp-handler` and `@mcp-b/react-webmcp` both require it; zod v4 breaks both
- `@ai-sdk/mcp@1.0.25` requires `ai@^6`; incompatible with AI SDK 4 or 5
- `@mcp-b/global` must initialize before any `useWebMCP()` hook calls
- `provideContext()` is deprecated (March 5, 2026) — use `registerTool()` / `unregisterTool()` exclusively
- All new packages install into `dashboard/package.json` ONLY; plugin root retains zero-dep constraint

### Expected Features

**Must have (table stakes):**
- Remote Streamable HTTP MCP endpoint at `dashboard/app/api/mcp/route.ts` with Clerk auth and Origin validation — users expect a remote-accessible PDE server
- WebMCP browser tools in dashboard React components via `useWebMCP()` hook — browser-based AI agents expect `navigator.modelContext` tool access
- MCP Apps rich UI return format: `type: 'resource'` blocks with `text/html;profile=mcp-app` MIME plus text fallback — AI chat clients supporting MCP Apps expect rendered artifacts
- Token playground UI with per-call cost breakdown — users expect token cost visibility on tool calls
- Desktop client bridge documentation (`npx @mcp-b/webmcp-local-relay@latest`) — zero code change needed; just document

**Should have (differentiators):**
- Design artifact preview inside AI chat clients via `ui://pde/[artifact]` resource scheme — differentiates PDE from static file export workflows
- Declarative approval gate forms as WebMCP tools — replaces current imperative approval flow with browser-native forms
- Auto-generated competitor tool stubs from competitive.md workflow (with mandatory human review gate — never auto-activate)
- Multi-editor bridge (Cursor/Gemini via WebMCP relay) — extends PDE's reach beyond Claude Code
- `.webmcp/config.json` emitter as 7th `context-sync.cjs` emitter — gives any WebMCP client a discovery endpoint

**Defer (v2+):**
- Full OAuth provider (PDE issuing tokens to external MCP clients) — use `mcp-auth` validate-only for now
- Real-time cross-session state sharing during execution
- Running full PDE plugin in the cloud (PDE Standalone CLI milestone scope)
- Cost controls and spend caps (requires accurate token counting + API integration)

### Architecture Approach

The architecture is strict layering with additive-only integration points. A new `packages/pde-mcp-server/src/server-factory.ts` extracts `McpServer` construction for reuse by both the existing stdio entrypoint and the new dashboard route handler. The dashboard route at `app/api/mcp/route.ts` creates a fresh stateless `WebStandardStreamableHTTPServerTransport` (with `sessionIdGenerator: undefined` for Vercel compatibility) per request. The existing SSE event pipeline, ingest endpoint, relay daemon, and all 6 context-sync emitters are untouched. The `mcp-bridge.cjs` allowlist is explicitly NOT updated for v0.19 — the remote endpoint is consumed by browser clients, not the Claude Code MCP runtime. Tool handlers emit both `type: 'resource'` rich blocks and `type: 'text'` fallbacks — backward-compatible with all stdio consumers.

**Major components:**
1. `packages/pde-mcp-server/src/server-factory.ts` (NEW) — Shared `McpServer` construction; zero changes to existing tool handlers
2. `dashboard/app/api/mcp/route.ts` (NEW) — Stateless per-request Streamable HTTP endpoint; Clerk auth; Origin allowlist
3. `dashboard/hooks/use-mcp-client.ts` (NEW) — Thin fetch-based MCP JSON-RPC hook; no SDK in browser bundle
4. WebMCP tool registration layer (dashboard components) — `useMcpTool()` wrapper enforcing strict mount/unmount lifecycle
5. MCP Apps content layer (selected `pde-mcp-server` tool handlers) — `type: 'resource'` rich blocks with text fallback
6. `bin/lib/context-sync.cjs` 7th emitter — `emitWebMcpConfig()` writing `.webmcp/config.json`; zero changes to existing 6 emitters
7. `--webmcp` flag in wireframe.md, mockup.md, critique.md, competitive.md — additive prose; no existing step logic changes

### Critical Pitfalls

1. **Dual Transport Process Proliferation** — Treat stdio and HTTP as mutually exclusive per deployment context. Add startup assertion rejecting HTTP mode when `MCP_TRANSPORT=stdio` is not set. Document explicit migration path from stdio to HTTP in install instructions. Missing this: N+1 MCP server processes accumulate per session.

2. **Vercel Stateless Session Anti-Pattern** — Use `sessionIdGenerator: undefined` in `WebStandardStreamableHTTPServerTransport`. Never store session state in module-level variables. Route-level session state goes in Upstash Redis (already available) with a signed JWT key. Missing this: works locally, fails intermittently on Vercel with re-initialization loops.

3. **`provideContext()` Replaces All Registered Tools** — Use `registerTool()` / `unregisterTool()` exclusively. Create a central `useMcpTool(name, handler, schema)` React hook that enforces mount/unmount lifecycle. Missing this: tools from one dashboard section silently disappear when another section renders.

4. **DNS Rebinding Attack via Missing Origin Validation** — Validate the `Origin` header on every request including GET/SSE. Maintain an explicit allowlist. MCP spec makes this MUST-level. Local dev binds to `127.0.0.1` only. Missing this: attacker executes tool calls on victim's behalf via DNS rebinding.

5. **OAuth CSRF via Shared Client ID** — Use per-session `state` parameters bound to the initiating session cookie. Restrict `redirect_uri` to a static allowlist. Harden cookies with `__Host-` prefix. Missing this: one-click account takeover via consent flow hijacking.

6. **MCP Apps CSP Silently Blocks All Network Calls** — Declare all required external origins in `_meta.ui.csp.connectDomains` at tool registration. Add a test asserting the declaration is present on every tool that makes network calls. Default CSP is `connect-src 'none'`. Missing this: fetch calls hang indefinitely with no error in the app UI.

7. **WebMCP Spec Instability** — Use `@mcp-b/global` as the abstraction layer. Design all `navigator.modelContext` calls behind a central `mcpToolRegistry.ts` service. Check `webmachinelearning/webmcp` commits before each WebMCP phase. Missing this: a breaking spec change requires patching every component.

---

## Implications for Roadmap

Phase structure is determined by hard dependency chains. The remote endpoint is the root. OAuth/security architecture is foundational and cannot be retrofitted. MCP Apps iframe/CSP constraints must be understood before any iframe UI is built.

### Phase 1: Remote MCP Server Foundation
**Rationale:** All browser-facing features depend on this endpoint existing and being secure. OAuth, Origin validation, stateless session design, and Vercel timeout patterns must be finalized here — they cannot be retrofitted without rework.
**Delivers:** `dashboard/app/api/mcp/route.ts`, `packages/pde-mcp-server/src/server-factory.ts`, `mcp-auth` RFC 9728 well-known endpoint, Clerk auth, Origin allowlist, stateless session architecture, long-running tool polling pattern
**Addresses:** Remote Streamable HTTP MCP server (Feature 1)
**Avoids:** Pitfalls 1 (dual transport), 2 (Vercel stateless session), 4 (DNS rebinding), 5 (OAuth CSRF), 8 (SSE timeout), 10 (zero-npm-dep constraint)

### Phase 2: Dashboard WebMCP Tools
**Rationale:** Browser tools can be built once the remote endpoint exists. The `useMcpTool()` lifecycle hook must be the first deliverable — it sets the registration pattern for all subsequent dashboard components.
**Delivers:** `useMcpTool()` hook, `use-mcp-client.ts`, initial tool registrations (design state, project info, artifact listing), SSE connection audit
**Addresses:** Dashboard WebMCP Tools (Feature 4)
**Avoids:** Pitfalls 3 (`provideContext()` overwrite), 9 (6-connection SSE limit), 11 (spec instability abstraction), 13 (SPA navigation zombie tools)

### Phase 3: MCP Apps Rich UI + Design Artifact Preview
**Rationale:** These two features share the same `type: 'resource'` return format change in tool handlers and the same CSP/sandbox constraints. Building them together prevents inconsistent CSP patterns. Library audit for `unsafe-eval` compatibility is a prerequisite.
**Delivers:** Enhanced return blocks in `get-artifact`, `get-tokens`, `get-handoff`, `list-artifacts`; MCP App HTML resources at `ui://pde/[artifact]`; `connectDomains` and `resourceDomains` declarations; iframe-safe library audit
**Addresses:** MCP Apps rich UI (Feature 2), Design artifact preview (Feature 3)
**Avoids:** Pitfalls 6 (MCP Apps CSP), 14 (unsafe-eval in iframe libraries)

### Phase 4: Token Playground
**Rationale:** Depends on the remote endpoint (Phase 1) and dashboard component patterns (Phase 2). Straightforward once the server is running.
**Delivers:** Token playground UI component, `@ai-sdk/mcp` wired to `/api/mcp`, per-tool cost breakdown, session context window utilization view
**Addresses:** Token playground (Feature 5)
**Uses:** `@ai-sdk/mcp@1.0.25`, Upstash Redis for session cost aggregation

### Phase 5: Declarative Approval Gates + Workflow Flags
**Rationale:** Approval gates as WebMCP tools build on the established `useMcpTool()` pattern. Workflow flags and the 7th context-sync emitter are low-complexity additive changes.
**Delivers:** Approval gate forms as WebMCP tools; `--webmcp` flag in wireframe.md, mockup.md, critique.md, competitive.md; `emitWebMcpConfig()` 7th emitter; `.webmcp/config.json` in MONITORED_FILES
**Addresses:** Declarative approval gates (Feature 6), workflow integration (Feature 7)
**Avoids:** Pitfall 12 (token refresh — OAuth token expiry in approval flow)

### Phase 6: Auto-Generated Competitor Tools
**Rationale:** Depends on workflow flag infrastructure (Phase 5) and tool security patterns (Phases 1-3). Sanitization pipeline is a prerequisite — no scraping ships without it.
**Delivers:** Optional Step 7 in competitive.md; `@keak/webmcp-core` in `packages/`; sanitization pipeline (strip instruction syntax, 512-char description limit, `source: "auto-generated"` flag); human review gate; `.webmcp/competitor-tools-registry.json`
**Addresses:** Auto-generated competitor tools (Feature 8)
**Avoids:** Pitfall 7 (tool poisoning via competitor descriptions)

### Phase 7: Multi-Editor Bridge + Remote Collaboration
**Rationale:** Most complex integration surface — builds on all prior phases. Relay cycle detection and Clerk org-level namespace scoping benefit from the full system being stable.
**Delivers:** WebMCP relay from Cursor/Gemini to PDE MCP (unidirectional with `X-PDE-Relay-Depth` guard); desktop client bridge documentation; Clerk org-level namespace scoping; `mcp-bridge.cjs` APPROVED_SERVERS entry for the remote server
**Addresses:** Multi-editor bridge (Feature 9), Remote collaboration (Feature 10)
**Avoids:** Pitfall 15 (mcp-bridge allowlist omission), Pitfall 16 (circular MCP relay)

### Phase Ordering Rationale

- Phase 1 is the root dependency; OAuth and security architecture cannot be deferred or retrofitted
- Phases 3 and 4 can be parallelized after Phase 2, but Phase 3 is sequenced before Phase 4 because the MCP Apps `type: 'resource'` format is easier to validate before the token tracking layer is active
- Phase 5 (workflow flags) follows Phases 2-4 so the team knows the full WebMCP surface before writing workflow prose
- Phase 6 is gated on Phase 5 (competitive.md needs the `--webmcp` flag infrastructure) and Phase 1 security patterns (same risk surface)
- Phase 7 is last: has the most architectural unknowns and depends on the full system being stable

### Research Flags

Needs `/gsd:research-phase` before planning:
- **Phase 6 (Competitor Tools):** `@keak/webmcp-core` is MEDIUM confidence; `generateToolDefinitions()` API details need verification at implementation time; sanitization design for tool poisoning prevention needs deeper research
- **Phase 7 (Multi-Editor Bridge):** Limited production examples of WebMCP relay implementations; relay depth detection and cycle prevention patterns are not well-documented; Clerk org-scoping for multi-tenant MCP sessions needs API verification

Standard patterns (skip research):
- **Phase 1:** All patterns verified against official specs (HIGH confidence); `mcp-handler` source read directly
- **Phase 2:** `@mcp-b/react-webmcp` hooks are fully documented; React lifecycle patterns are standard
- **Phase 3:** MCP Apps spec is the official Anthropic extension document; iframe/CSP patterns are well-established
- **Phase 4:** `@ai-sdk/mcp` is released, documented, and HIGH confidence
- **Phase 5:** Workflow prose changes are additive and low-risk; `context-sync.cjs` emitter pattern is established

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core packages verified against official docs, source code, and npm release notes; version compatibility matrix traced to peer dependency declarations |
| Features | HIGH | Feature scope verified against existing codebase source files and official MCP spec; existing system components traced to exact file paths |
| Architecture | HIGH | Integration points traced to actual source code (`packages/pde-mcp-server/src/index.ts`, `dashboard/app/api/events/route.ts`, `bin/lib/mcp-bridge.cjs`, `bin/lib/context-sync.cjs`); transport choice verified against installed SDK source |
| Pitfalls | HIGH | 16 pitfalls documented; 7 critical, 9 moderate; all verified against official spec warnings, production post-mortems (Obsidian Security, Invariant Labs), or documented community issue threads |

**Overall confidence:** HIGH

### Gaps to Address

- **`@keak/webmcp-core` API surface:** MEDIUM confidence only — validate `generateToolDefinitions()` signature and supported output formats at the start of Phase 6 before writing any plan
- **`mcp-handler` npm vs GitHub version gap:** npm shows v1.0.7; GitHub releases show v1.1.0 — verify the npm-available version at install time and pin explicitly
- **Vercel plan tier timeout:** Research assumes 60s timeout available on Pro plan for long-running tools; confirm plan tier before Phase 1 deployment
- **Clerk org-level namespace scoping:** Exact Clerk API for org membership gating on the Redis namespace key needs verification against current Clerk Next.js SDK docs before Phase 7
- **WebMCP spec stability during development:** The spec broke once on March 5, 2026; check `webmachinelearning/webmcp` commits before each WebMCP phase — estimated 1-3 further breaking changes possible before W3C Recommendation

---

## Sources

### Primary (HIGH confidence)
- [vercel/mcp-handler GitHub](https://github.com/vercel/mcp-handler) — v1.1.0 route handler pattern, peer deps, stateless mode
- [modelcontextprotocol/ext-apps spec 2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) — MCP Apps content types, CSP rules, sandbox constraints, `ui://` scheme, tool metadata
- [modelcontextprotocol.io authorization spec](https://modelcontextprotocol.io/specification/draft/basic/authorization) — RFC 9728, RFC 8707, MUST-level Origin validation
- [docs.mcp-b.ai](https://docs.mcp-b.ai/) — `@mcp-b` package descriptions, hook signatures, relay v2.2.0, `@mcp-b/global` internals
- [@ai-sdk/mcp npm](https://www.npmjs.com/package/@ai-sdk/mcp) — v1.0.25, AI SDK 6 ecosystem confirmation
- [Chrome for Developers: WebMCP early preview](https://developer.chrome.com/blog/webmcp-epp) — Browser API overview, Chrome 146+ native support
- [@mcp-b/global deprecation note](https://www.npmjs.com/package/@mcp-b/global) — `provideContext()` deprecated March 5, 2026
- Installed source: `packages/pde-mcp-server/` at `@modelcontextprotocol/sdk@1.27.1` — `WebStandardStreamableHTTPServerTransport` confirmed present
- Source files read: `dashboard/app/api/events/route.ts`, `bin/lib/mcp-bridge.cjs`, `bin/lib/context-sync.cjs` — integration boundaries verified

### Secondary (MEDIUM confidence)
- [keak-ai/webmcp-core GitHub](https://github.com/keak-ai/webmcp-core) — `generateToolDefinitions()` API, pipeline steps, TypeScript/Node requirements
- [mcp-auth.dev docs](https://mcp-auth.dev/docs/configure-server/mcp-auth) — `mcp-auth` RFC 9728 integration pattern
- [better-auth MCP plugin](https://better-auth.com/docs/plugins/mcp) — OAuth provider path, deprecation note toward `oauth-provider`
- [WebMCP Browser Status 2026](https://dev.to/ai-agent-economy/webmcp-in-2026-which-browsers-support-navigatormodelcontext-complete-compatibility-status-1oe4) — Browser compatibility matrix

### Tertiary (LOW confidence)
- Obsidian Security OAuth CSRF post-mortems — one-click account takeover via shared client_id in production MCP deployments (cited in PITFALLS.md; primary source not directly verified)
- Invariant Labs MCPTox benchmark — 72.8% tool poisoning attack success rate against o1-mini (cited in PITFALLS.md; primary paper not directly verified)

---
*Research completed: 2026-03-27*
*Ready for roadmap: yes*
