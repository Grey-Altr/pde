# Stack Research: WebMCP Integration

**Domain:** WebMCP browser-native MCP integration, remote MCP servers, MCP Apps rich UI, design artifact preview, dashboard WebMCP tools, token playground
**Researched:** 2026-03-27
**Confidence:** MEDIUM (WebMCP spec is production-ready; browser ecosystem packages are still evolving rapidly — verify versions at install time)

---

## Context: What Already Exists (Do Not Re-Add)

The following are validated and must NOT be reinstalled or changed:

- `dashboard/package.json`: Next.js (latest), React (latest), `@clerk/nextjs`, `@upstash/redis`, `zod` (latest), Tailwind CSS, `lucide-react`, `shadcn`
- `packages/pde-mcp-server/`: ESM TypeScript, `@modelcontextprotocol/sdk ^1.26.0`, `zod ^3.25.0`, 14 read-only tools, stdio transport only
- Plugin root: zero-npm-deps constraint — do NOT install any WebMCP deps at root
- `mcp-bridge.cjs`: 7 approved servers (GitHub, Linear, Figma, Pencil, Atlassian, Stitch, Playwright)

All new packages install into `dashboard/package.json` ONLY.

---

## Recommended Stack

### Core: WebMCP Browser Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@mcp-b/global` | latest (~2.x) | One-import WebMCP runtime: polyfill + bridge transport | Self-contained 285KB bundle, auto-initializes `navigator.modelContext`, covers all non-Chrome browsers via polyfill, no-op on Chrome 146+ (detects native support). Single import replaces manually wiring `@mcp-b/webmcp-polyfill` + transports. Use this instead of the strict polyfill alone. |
| `@mcp-b/react-webmcp` | latest | React hooks for tool registration and MCP client consumption | `useWebMCP()` registers tools with Zod schema validation; `useWebMCPContext()` for read-only context; `useMcpClient()` for consuming MCP servers; `McpClientProvider` wraps components. Automatic lifecycle management — cleanup on unmount. |
| `@mcp-b/webmcp-types` | latest | TypeScript types for W3C `navigator.modelContext` surface | Pure types, zero runtime cost. Required for TypeScript correctness when accessing `window.navigator.modelContext` directly in non-React code paths. |

### Core: Remote MCP Server (Streamable HTTP on Vercel)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `mcp-handler` | 1.1.0 | Vercel/Next.js MCP route handler | Official Vercel package (renamed from `@vercel/mcp-adapter`). Single `createMcpHandler()` call at `app/api/[transport]/route.ts`. Handles Streamable HTTP + SSE transports automatically. Optional Redis integration for session resumability — `@upstash/redis` already installed. |
| `@modelcontextprotocol/sdk` | 1.28.0 | MCP protocol primitives: `StreamableHTTPServerTransport`, `Server`, `McpError` | The canonical SDK. `mcp-handler` requires `>=1.26.0` (1.25.x has security vulnerabilities). `pde-mcp-server` already pins `^1.26.0` — upgrade to `1.28.0` for latest. Streamable HTTP transport is now the spec standard for remote MCP, replacing the older SSE-only transport. |

### Core: MCP Apps Rich UI

No additional npm packages needed. MCP Apps is a protocol extension on top of `@modelcontextprotocol/sdk`.

What IS needed in code:
- Tools declare `_meta.ui.resourceUri` field pointing to a `ui://[server]/[name]` resource
- Resources are served via `resources/read` MCP response with `text/html;profile=mcp-app` MIME type
- `connectDomains` / `resourceDomains` fields declared in resource metadata (CSP)
- Communication via `postMessage` JSON-RPC between sandboxed iframe and host

The spec lives at `modelcontextprotocol/ext-apps` — no SDK needed beyond `@modelcontextprotocol/sdk`.

### Supporting: OAuth / Remote MCP Auth

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `mcp-auth` | latest | RFC 9728 Protected Resource Metadata, OAuth 2.1 resource server validation | Use when the PDE remote MCP endpoint needs to validate tokens issued by external OAuth providers (Clerk, Auth0). Mounts `/.well-known/oauth-protected-resource` automatically. This is the minimal addition — start here. |
| `better-auth` (with `oauth-provider` plugin) | 1.5+ | Full OAuth 2.1 provider — PDE issues tokens to MCP clients directly | Only add if PDE needs to *issue* tokens (not just validate). `mcp` plugin will migrate to `oauth-provider` plugin; use `oauth-provider` for new implementations. Has first-class Next.js + Clerk compatibility. |

Clerk handles user-facing auth already. These packages handle machine-to-machine OAuth for programmatic MCP clients.

### Supporting: Auto-Generated Competitor Tools

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@keak/webmcp-core` | latest | Crawl any URL, auto-generate `navigator.modelContext` tool definitions | Use for the auto-generated competitor tools feature. `generateToolDefinitions(url, options)` pipeline: scan → propose → LLM-enhance → export. Outputs TypeScript snippets, React hooks, JSON manifests, HTML embeds. Requires Node.js >= 18, TypeScript 5.7+. |

### Supporting: Token Playground

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@ai-sdk/mcp` | 1.0.25 | AI SDK 6 MCP client — connects to MCP servers with token usage tracking | Use for the token playground UI data source. Part of AI SDK 6; provides OAuth auth, resources, prompts, elicitation. Returns structured token usage per tool call. Do not mix with AI SDK 4/5. |

### Supporting: Desktop Client Bridge (No Dashboard Install)

| Tool | Version | Purpose | How to Use |
|------|---------|---------|------------|
| `@mcp-b/webmcp-local-relay` | 2.2.0 | Bridges browser-registered tools to Claude Desktop / Cursor via WebSocket+stdio | No dashboard install. Users run `npx @mcp-b/webmcp-local-relay@latest` locally. PDE dashboard tools exposed via `@mcp-b/global` become callable from desktop AI clients automatically. Document in GETTING-STARTED.md. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@mcp-b/chrome-devtools-mcp` | MCP server exposing Chrome DevTools to agents | Run during development: `npx @mcp-b/chrome-devtools-mcp@latest`. Inspect WebMCP tool registration. No install needed. |
| Model Context Tool Inspector (Chrome extension) | Inspect `navigator.modelContext` registrations in DevTools | Not an npm package. Install from `GoogleChromeLabs/webmcp-tools` repo. Verifies tool registration is working correctly. |

---

## Installation

```bash
# All WebMCP installs go inside dashboard/ — not plugin root
cd /path/to/pde/dashboard

# WebMCP browser layer
npm install @mcp-b/global @mcp-b/react-webmcp @mcp-b/webmcp-types

# Remote MCP server (Streamable HTTP)
# Note: upgrade @modelcontextprotocol/sdk from ^1.26.0 to 1.28.0 in packages/pde-mcp-server too
npm install mcp-handler @modelcontextprotocol/sdk@1.28.0
# zod@^3 already in dashboard/package.json — do not upgrade to zod v4

# AI SDK for token playground
npm install @ai-sdk/mcp

# OAuth for remote MCP auth (choose one or neither)
npm install mcp-auth          # resource server only (validate external tokens)
# OR
npm install better-auth       # if PDE needs to issue tokens to MCP clients

# Competitor tool auto-generation (add to packages/ or scripts/, not dashboard)
npm install @keak/webmcp-core
# Requires Node.js >= 18, TypeScript 5.7+
```

```bash
# Local relay — document for users, no dashboard dep
# Add to docs:
npx @mcp-b/webmcp-local-relay@latest
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@mcp-b/global` | `@mcp-b/webmcp-polyfill` (strict spec surface) | Only when you need spec-exact `navigator.modelContext` behavior without MCP-B bridge extensions. PDE needs bridge transport for local relay connectivity — `global` is the right choice. |
| `mcp-handler@1.1.0` | Manual `StreamableHTTPServerTransport` wiring | Only when deploying to non-Vercel infra (raw Express, Cloudflare Workers). `mcp-handler` is the Vercel-optimized path and matches the existing `dashboard/` deployment target. |
| `mcp-auth` (validate only) | `better-auth` oauth-provider | `mcp-auth` when PDE is a resource server validating Clerk-issued tokens. `better-auth` only if PDE must issue its own tokens to MCP clients — a more complex setup. Default to `mcp-auth`. |
| `@keak/webmcp-core` | `GoogleChromeLabs/webmcp-tools` evals CLI | Chrome Labs tools are for testing/inspecting existing WebMCP implementations, not auto-generating definitions from arbitrary URLs. `@keak/webmcp-core` is the right choice for competitor site scraping. |
| `@ai-sdk/mcp@1.0.25` | `@modelcontextprotocol/sdk` client directly | `@ai-sdk/mcp` wraps client connection + token usage tracking in one. For the token playground, you want the usage data — use the AI SDK wrapper, not raw SDK client. |
| `useWebMCP()` React hook | `navigator.modelContext.registerTool()` directly | `useWebMCP()` provides React lifecycle cleanup automatically. Direct API is fine for non-React code (scripts, workers). In React components, always use the hook. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@vercel/mcp-adapter` (old package name) | Renamed to `mcp-handler`; old package may stagnate | `mcp-handler@1.1.0` |
| `@modelcontextprotocol/sdk` < 1.26.0 | Security vulnerabilities documented in `mcp-handler` 1.1.0 release notes | `@modelcontextprotocol/sdk@1.28.0` |
| SSE-only transport (pre-2025-03-26 MCP spec) | Deprecated by the MCP spec; `StreamableHTTPServerTransport` is the standard | `StreamableHTTPServerTransport` via `mcp-handler` |
| `@mcp-b/webmcp-polyfill` standalone | Strict spec surface only — no bridge transport, no MCP-B extensions. Requires manual transport wiring that `@mcp-b/global` handles. | `@mcp-b/global` |
| `provideContext()` on `@mcp-b/global` | Deprecated March 5, 2026 per upstream WebMCP spec change. Logs deprecation warning; removed in next major. | `registerTool()` / `unregisterTool()` |
| Installing WebMCP packages at plugin root | Root has zero-npm-deps constraint for zero-friction Claude Code install | Install everything in `dashboard/package.json` only |
| Loosening MCP Apps iframe sandbox (`allow-same-origin`) | MCP Apps spec 2026-01-26 explicitly prohibits loosening; hosts may only restrict further | Declare external domain needs in `connectDomains` / `resourceDomains` resource metadata |
| `zod@^4` | `mcp-handler` and `@mcp-b/react-webmcp` specify `zod@^3`. v4 is a breaking API change. | Keep `zod@^3` in `dashboard/package.json` |
| `@ai-sdk/mcp` with AI SDK 4 or 5 | `@ai-sdk/mcp@1.0.25` is part of AI SDK 6 ecosystem — incompatible APIs across major versions | `ai@^6` + `@ai-sdk/mcp@^1.0.25` together |

---

## Stack Patterns by Variant

**Exposing PDE dashboard tools to browser-based AI agents (WebMCP imperative):**
- `@mcp-b/global` for runtime + `@mcp-b/react-webmcp` `useWebMCP()` hook in React components
- Tools register on mount, clean up on unmount — automatic lifecycle
- HTTPS required; same-origin security enforced by browser natively on Chrome 146+
- Non-Chrome browsers: polyfill from `@mcp-b/global` covers without native security model

**Exposing PDE as a Streamable HTTP remote MCP server:**
- `mcp-handler` → `createMcpHandler()` at `app/api/[transport]/route.ts`
- Route exports: `export { handler as GET, handler as POST }`
- Add Redis session key to `createMcpHandler()` options for resumability (Upstash already available)
- `maxDuration: 60` in handler options for Vercel function timeout

**Building MCP Apps rich UI (design artifact preview inside AI chat clients):**
- Serve HTML via `resources/read` with MIME `text/html;profile=mcp-app`
- Tool declares `_meta.ui.resourceUri: "ui://pde/[artifact-name]"`
- Set `_meta.ui.visibility: ["model", "app"]` to expose to both agent reasoning and UI rendering
- Declare external asset domains in resource metadata (CSP); default is `default-src 'none'`
- Communicate with the MCP server from inside iframe via `postMessage` JSON-RPC only — no direct SDK calls inside iframe

**Auto-generating competitor WebMCP tool definitions:**
- `@keak/webmcp-core` `generateToolDefinitions(url, { depth: 2, headless: true, minConfidence: 0.5 })`
- Output format: TypeScript snippets or React hook code ready to drop into dashboard
- Run as a CLI script / API route, not as a persistent server dependency
- Playwright-based crawling internally — `headless: true` for CI

**Desktop AI client bridge (Claude Desktop / Cursor users):**
- No code change needed in dashboard — `@mcp-b/global` exposes tools automatically
- `@mcp-b/webmcp-local-relay@2.2.0` forwards registered tools to desktop clients via WebSocket+stdio
- Document `npx @mcp-b/webmcp-local-relay@latest` in GETTING-STARTED.md
- Users add to their `claude_desktop_config.json` or Cursor MCP settings

**Token playground:**
- `@ai-sdk/mcp` client connects to the PDE remote MCP server
- Structured tool call response includes token usage per call
- Dashboard UI reads usage data and renders per-tool cost breakdown
- No new backend routes needed — playground consumes the Streamable HTTP endpoint

---

## Browser Compatibility

| Browser | `navigator.modelContext` | With `@mcp-b/global` | Notes |
|---------|--------------------------|----------------------|-------|
| Chrome 146+ | Native | Native (no-op polyfill) | Full WebMCP, production-ready |
| Chrome < 146 | None | Polyfill active | No browser-native security model |
| Edge (Chromium) | Pending | Polyfill active | Expected ~Q2 2026 |
| Firefox | None | Polyfill active | W3C Recommendation expected Q3 2026; polyfill works today |
| Safari | None | Polyfill active | Apple in W3C WG; no timeline committed; 6-12 months behind Chrome realistic |

Recommended strategy: Use `@mcp-b/global` unconditionally — Chrome 146+ uses native, all others get polyfill. Design with graceful degradation: most dashboard visitors will have no MCP client listening, which is normal.

---

## MCP Apps Specification Constraints (Protocol Level)

These are constraints from the `modelcontextprotocol/ext-apps` spec (2026-01-26), not npm config:

| Constraint | Value | Implication |
|------------|-------|-------------|
| Supported content type | `text/html;profile=mcp-app` only | No external URL iframes, no native widgets in initial spec |
| Resource scheme | `ui://[server-id]/[resource-name]` | Must serve via `resources/read`, not arbitrary HTTP |
| Default CSP | `default-src 'none'` | All external access must be declared upfront in metadata |
| External domain declaration | `connectDomains`, `resourceDomains`, `frameDomains`, `baseUriDomains` | Omitting = "none" = blocked |
| iframe sandbox | Mandatory; cannot loosen | Host enforces; server declares needs only |
| Tool visibility | `["model"]`, `["app"]`, or `["model","app"]` | Controls whether agent or UI (or both) can call the tool |

---

## OAuth / Remote MCP Auth Requirements (Protocol Level)

Per MCP spec authorization draft (2025-03-26):

1. Remote MCP servers MUST implement RFC 9728 Protected Resource Metadata at `/.well-known/oauth-protected-resource`
2. MCP clients MUST use RFC 8707 `resource` parameter on token requests (audience binding)
3. Servers MUST validate token audience as specifically issued for the MCP server
4. Discovery: clients check `WWW-Authenticate` headers on 401/403 for `resource_metadata` param OR fetch well-known URI

PDE already has Clerk for user sessions. For machine-to-machine: `mcp-auth` (validates external tokens) is the minimal addition. Add `better-auth` only if PDE must issue its own tokens.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `mcp-handler@1.1.0` | `@modelcontextprotocol/sdk@>=1.26.0` | Explicitly documented; 1.25.x has security vulnerabilities |
| `mcp-handler@1.1.0` | `zod@^3` | Does NOT support zod v4 |
| `@mcp-b/react-webmcp` | `@mcp-b/global` (must initialize first) | `useWebMCP()` requires `navigator.modelContext` to exist; initialize `@mcp-b/global` before any hook calls |
| `@ai-sdk/mcp@1.0.25` | `ai@^6` (AI SDK 6) | Do not mix with AI SDK 4 or 5 — breaking API changes across majors |
| `@keak/webmcp-core` | `typescript@5.7+`, `node@>=18` | TypeScript version constraint is strict — affects `packages/` target only |
| `zod@^3` | All above packages | mcp-handler, @mcp-b/react-webmcp, existing pde-mcp-server all require ^3; do not upgrade to v4 |

---

## Sources

- [WebMCP-org/npm-packages GitHub](https://github.com/WebMCP-org/npm-packages) — Package list and purposes (MEDIUM — docs don't expose explicit version numbers)
- [docs.mcp-b.ai](https://docs.mcp-b.ai/) — `@mcp-b` package descriptions, `@mcp-b/webmcp-local-relay` v2.2.0, `@mcp-b/global` 285KB size + auto-detection behavior (HIGH)
- [docs.mcp-b.ai/packages/react-webmcp/reference](https://docs.mcp-b.ai/packages/react-webmcp/reference) — Complete hook signatures for `useWebMCP`, `useWebMCPContext`, `useMcpClient`, `McpClientProvider` (HIGH)
- [vercel/mcp-handler GitHub](https://github.com/vercel/mcp-handler) — v1.1.0 (March 24, 2026), route handler pattern, peer dep `@modelcontextprotocol/sdk@1.26.0` (HIGH)
- [mcp-handler npm](https://www.npmjs.com/package/mcp-handler) — v1.0.7 current on npm; v1.1.0 from GitHub releases (MEDIUM — npm may lag GitHub)
- [modelcontextprotocol/ext-apps spec 2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) — MCP Apps content types, sandbox constraints, CSP rules, `ui://` scheme, tool metadata (HIGH — official Anthropic spec)
- [modelcontextprotocol.io authorization spec](https://modelcontextprotocol.io/specification/draft/basic/authorization) — RFC 9728 requirements for remote MCP auth (HIGH — official spec)
- [Chrome for Developers: When to use WebMCP and MCP](https://developer.chrome.com/blog/webmcp-mcp-usage) — Declarative vs imperative API distinction (HIGH)
- [Chrome for Developers: WebMCP early preview](https://developer.chrome.com/blog/webmcp-epp) — Browser API overview (HIGH)
- [keak-ai/webmcp-core GitHub](https://github.com/keak-ai/webmcp-core) — `generateToolDefinitions()` API, pipeline steps, Node.js/TypeScript requirements (MEDIUM)
- [@ai-sdk/mcp npm](https://www.npmjs.com/package/@ai-sdk/mcp) — v1.0.25, AI SDK 6 (HIGH)
- [Vercel AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6) — MCP OAuth + resources + elicitation in `@ai-sdk/mcp` (HIGH)
- [WebMCP Browser Status 2026](https://dev.to/ai-agent-economy/webmcp-in-2026-which-browsers-support-navigatormodelcontext-complete-compatibility-status-1oe4) — Browser compatibility matrix (MEDIUM)
- [mcp-auth.dev docs](https://mcp-auth.dev/docs/configure-server/mcp-auth) — `mcp-auth` package, RFC 9728 integration pattern (MEDIUM)
- [better-auth MCP plugin](https://better-auth.com/docs/plugins/mcp) — OAuth provider path, deprecation note toward `oauth-provider` plugin (MEDIUM)
- [@mcp-b/global deprecation note](https://www.npmjs.com/package/@mcp-b/global) — `provideContext()` deprecated March 5, 2026 (HIGH — npm package page)

---

*Stack research for: WebMCP Integration (remote MCP server, MCP Apps rich UI, design artifact preview, dashboard WebMCP tools, token playground, declarative approval gates, auto-generated competitor tools, multi-editor bridge, remote collaboration)*
*Researched: 2026-03-27*
