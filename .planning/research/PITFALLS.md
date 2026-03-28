# Pitfalls Research: PDE v0.19 WebMCP Integration

**Domain:** Adding WebMCP browser integration, Streamable HTTP remote MCP, and MCP Apps rich UI to an existing MCP-based Claude Code plugin
**Researched:** 2026-03-27
**Confidence:** HIGH (patterns verified against official MCP spec, Chrome WebMCP early preview docs, Invariant Labs security research, Obsidian Security OAuth post-mortems, MCP community issue threads, and Vercel deployment guides)

---

## Context: The Integration Trap

v0.19 adds ten features onto a working v0.18 system. The danger is not the features themselves but the assumption that adding "a WebMCP layer on top" is additive-only. Every pitfall below was produced by this assumption in the wild. PDE's existing stdio MCP transport, security allowlist (mcp-bridge.cjs), dashboard SSE streams, and zero-npm-dep constraint at the plugin root will each create friction against the new remote and browser-based surfaces. The failures are ordered by damage-before-detection.

---

## Critical Pitfalls

### Pitfall 1: Dual Transport Process Proliferation (stdio + Streamable HTTP)

**What goes wrong:**
When `packages/pde-mcp-server/` is updated to support both stdio and Streamable HTTP transport, Claude Code continues to spawn a stdio child process for the server on every new session even after the HTTP endpoint is deployed. The result is N+1 MCP server processes per user: one persistent HTTP server plus one stdio child per Claude Code session. These accumulate, consume memory, and produce duplicate tool call logs. Confirmed in Claude Code issue #29688.

**Why it happens:**
Claude Code's MCP client evaluates transport type from the local config entry (`"type": "http"` vs `"type": "stdio"`). If the config is not updated to point at the HTTP URL, or if a user has a local config that still references the stdio binary, the old spawn path activates regardless of the new server code.

**How to avoid:**
- Treat stdio and HTTP as mutually exclusive configurations per deployment context. Do not try to serve both from the same running process.
- Provide explicit migration guidance: update `claude mcp add` command from stdio to HTTP in the install instructions for the remote server.
- Add a startup check in the shared handler: if `process.stdin.isTTY === false`, assert that `MCP_TRANSPORT=stdio` is set and refuse to start as HTTP.
- Add an integration test that verifies only one transport is active at a time.

**Warning signs:**
- `ps aux | grep pde-mcp-server` shows multiple processes per Claude Code session
- Tool calls arrive duplicated in the session log
- Memory grows monotonically across sessions without decay

**Phase to address:**
Remote MCP Server phase (Feature 1). Architecture decision must be made before any code is written: stdio-only local, HTTP-only remote, or explicit opt-in per deployment context.

---

### Pitfall 2: Mcp-Session-Id Breaks on Serverless (Vercel Stateful Session Anti-Pattern)

**What goes wrong:**
The MCP spec's Streamable HTTP transport assigns a session ID (`Mcp-Session-Id`) on initialization and expects all subsequent requests from that client to include it. Vercel's serverless functions (Node.js runtime) have no session affinity: two consecutive requests from the same client may hit different cold-started function instances, neither of which has the in-memory session state from initialization. The server returns 404 for the session ID it cannot find, and the client must re-initialize. Under load, this creates a re-initialization storm.

**Why it happens:**
Developers copy Streamable HTTP examples built for long-running Node.js servers (Express, Fastify) and deploy them to Vercel without adapting the session model. The transport spec says session ID is OPTIONAL, but skipping it forces stateless tool execution — which breaks any tool that depends on initialization-time configuration (auth tokens, user preferences, project context).

**How to avoid:**
- Design the remote PDE MCP server as stateless-first: push all session state into the `Mcp-Session-Id` value itself (signed JWT containing project context) rather than storing state in process memory.
- If stateful sessions are necessary, use a shared external store (Vercel KV / Redis) keyed by session ID with short TTL (15 minutes).
- Test with Vercel's local dev runtime (`vercel dev`) before deploying — it emulates serverless cold starts better than `node server.js`.
- Add an integration test that sends two consecutive requests to different function instances and verifies session continuity.

**Warning signs:**
- Works perfectly in local `node server.js` but fails intermittently on Vercel
- Clients log re-initialization loops ("starting new session" more than once per user session)
- Session state is ever stored in a module-level variable (e.g., `const sessions = new Map()` outside a request handler)

**Phase to address:**
Remote MCP Server phase (Feature 1). Stateless-first architecture must be specified in the phase plan before implementation begins.

---

### Pitfall 3: WebMCP provideContext() Overwrite Destroys All Registered Tools

**What goes wrong:**
When multiple components in the PDE dashboard each call `navigator.modelContext.provideContext()` to register their tools (design artifact preview, token playground, approval gate forms), only the last call's tools survive. `provideContext()` has replace-all semantics: every invocation clears the entire tool registry before registering the new set. A React re-render that triggers one component's `provideContext()` silently deletes all tools from other components.

**Why it happens:**
The original WebMCP spec had `provideContext()` as the primary API. Multiple independent code paths calling it seems natural until you discover it is destructive. This is documented in `webmachinelearning/webmcp` issue #101: "allows overwriting of previously registered tools in the same environment."

**How to avoid:**
- Use `registerTool()` and `unregisterTool()` exclusively (the replacement API from the March 5, 2026 spec update). Never use `provideContext()` in new code.
- Treat the tool registry as a shared resource: each component is responsible for registering its tools on mount and unregistering on unmount.
- Create a central `useMcpTools()` React hook that manages tool lifecycle with `useEffect` plus cleanup, ensuring `unregisterTool()` is called on component unmount.
- Add a test that mounts two tool-registering components and asserts both sets of tools are present simultaneously.

**Warning signs:**
- Tools from one dashboard section disappear when another section renders
- `navigator.modelContext.registerTool` is undefined (using old polyfill that only has `provideContext`)
- Components call `provideContext()` inside `useEffect` dependencies that fire on every render

**Phase to address:**
Dashboard WebMCP Tools phase (Feature 4). Must be addressed in the first phase that registers any tools — set the pattern correct from the start.

---

### Pitfall 4: DNS Rebinding Attack via Origin Header Omission

**What goes wrong:**
The remote PDE MCP server on Vercel, and especially any local dev instance, skips Origin header validation because "it's already behind authentication." An attacker tricks a victim into visiting a malicious page, rebinds the attacker's domain DNS to resolve to the MCP server's IP, and the browser treats the subsequent request as same-origin. Because SSE GET requests skip CORS preflight, the attacker can establish a streaming connection to the MCP server and execute tool calls on the victim's behalf.

**Why it happens:**
Authentication (OAuth tokens) protects against unauthorized callers but does not prevent DNS rebinding, which exploits the browser's same-origin trust. Developers conflate "authenticated" with "secure against browser-based attacks."

**How to avoid:**
- Validate the `Origin` header on every incoming request, including GET requests that open SSE streams. The spec's security warning makes this MUST-level: "Servers MUST validate the Origin header on all incoming connections."
- Maintain an explicit allowlist of permitted origins: `["https://pde-dashboard.vercel.app", "https://claude.ai"]`.
- For local dev, bind only to `127.0.0.1`, never `0.0.0.0`.
- Reject requests where `Origin` is absent (not just where it is wrong), unless the client is an MCP client that legitimately omits it (use User-Agent heuristics).

**Warning signs:**
- No `Origin` validation in the POST/GET handlers for the MCP endpoint
- Server bound to `0.0.0.0` in local dev
- "We don't need that because we have OAuth" reasoning in code review

**Phase to address:**
Remote MCP Server phase (Feature 1). Security must be in the initial implementation, not added as a follow-up.

---

### Pitfall 5: OAuth CSRF via Shared Client ID Enables One-Click Account Takeover

**What goes wrong:**
The remote PDE MCP server uses a single static OAuth `client_id` to connect to downstream services (GitHub, Linear, Figma). When a user completes the OAuth consent flow, the authorization server sees the same `client_id` and may skip re-consent on subsequent requests. An attacker can capture the authorization redirect URL and forward it to a victim, completing consent on the victim's behalf. The MCP server cannot distinguish who initiated the authorization vs. who completed it — this is a CSRF attack by design. Obsidian Security documented this as a real-world one-click account takeover vector in multiple production MCP deployments.

**Why it happens:**
MCP servers acting as OAuth proxies inherit dual-layer complexity: they are simultaneously an OAuth client (to upstream services) and an authorization server (to MCP clients). Standard PKCE mitigates some flows but not the consent hijacking path when client_id is shared across sessions.

**How to avoid:**
- Use per-user OAuth client credentials or per-session `state` parameters that are bound to the initiating session cookie.
- Harden consent cookies with the `__Host-` prefix to prevent injection from subdomains.
- Validate that the `state` parameter in the OAuth callback matches what was stored in the session that initiated the flow.
- Implement MCP-layer consent display (show the user what client and redirect destination they are authorizing) before forwarding to the upstream OAuth server.
- Restrict `redirect_uri` to a static allowlist — reject any dynamic redirect URI.

**Warning signs:**
- `state` parameter in OAuth flow is random but not tied to a session
- Redirect URIs accepted dynamically from query parameters
- "Users only ever log in from the dashboard, not arbitrary pages" assumption

**Phase to address:**
Remote MCP Server phase (Feature 1) and Declarative Approval Gates phase (Feature 6). OAuth architecture must be reviewed before any auth code ships.

---

### Pitfall 6: MCP Apps CSP Blocks All External Fetch Calls by Default

**What goes wrong:**
MCP Apps (Feature 2, Feature 3) run their UI inside a sandboxed iframe with the default CSP including `connect-src 'none'`. Any fetch(), XMLHttpRequest, or WebSocket call from the app fails silently with a CSP violation. Design artifact previews that need to fetch artifact JSON from PDE's API will fail entirely unless the app explicitly declares `connectDomains` in its `_meta.ui.csp` field.

**Why it happens:**
Developers test MCP Apps locally with their own API server, which is permitted because it is same-origin. When deployed, the iframe is on a different origin and the default `connect-src 'none'` kicks in. The failure mode is silent in the UI (no error thrown to the app, just a network request that never resolves).

**How to avoid:**
- Declare all required external API origins in `_meta.ui.csp.connectDomains` at tool registration time: `["https://pde-dashboard.vercel.app", "https://api.pde.dev"]`.
- Add a test that verifies the `connectDomains` declaration is present on all tools that make network calls.
- Note: dynamic code execution is blocked by CSP (`unsafe-eval` is not in the default policy). Any dependency that uses this internally (some charting libraries, older Handlebars versions, some JSON parsers) will fail. Pin to safe versions.
- `resourceDomains` must also be declared for any external fonts, images, or scripts (CDN-hosted libraries).

**Warning signs:**
- fetch() calls hang indefinitely without rejecting
- Browser console shows CSP violation errors (only visible if you can attach devtools to the iframe)
- App works in local dev but hangs after deployment

**Phase to address:**
MCP Apps phase (Feature 2) and Design Artifact Preview phase (Feature 3). Must be in the tool registration scaffold from day one.

---

### Pitfall 7: Tool Poisoning via Competitor Tool Descriptions

**What goes wrong:**
Feature 8 (Auto-Generated Competitor Tools) scrapes competitor websites to generate tool definitions describing those sites' capabilities. An adversarial competitor can embed hidden instructions in their page content — invisible to human users but ingested by the tool scraper into the `description` field of generated tools. These poisoned descriptions are injected into the LLM's context on every tool listing, causing the model to follow hidden instructions regardless of whether the tool is ever called. The MCPTox benchmark found 72.8% attack success rates against o1-mini using this vector.

**Why it happens:**
Tool descriptions are trusted as documentation. The scraper treats competitor page content as a reliable source for tool metadata. There is no validation layer between "text from the web" and "instruction in the LLM's context."

**How to avoid:**
- Sanitize all scraped content before it appears in tool descriptions: strip anything resembling instruction syntax (suspiciously placed blank lines before directives, `<INST>` tags, `SYSTEM:` prefixes, "Ignore previous instructions" phrases, XML-like tags).
- Apply length limits on tool descriptions (MCP spec recommends under 1024 characters; enforce 512 for auto-generated tools).
- Human review gate: auto-generated competitor tools must be reviewed and approved before activation — never auto-activate.
- Add a `source: "auto-generated"` flag to generated tools so the host can display a warning UI.
- Run `mcp-scan` against generated tool bundles before import.

**Warning signs:**
- Tool description text contains HTML tags, markdown headers, or instruction-like syntax
- No length cap on auto-generated descriptions
- Auto-generated tools are activated without review

**Phase to address:**
Auto-Generated Competitor Tools phase (Feature 8). Sanitization pipeline must be designed before any scraping code ships.

---

### Pitfall 8: Vercel Serverless SSE Timeout Under Node.js Runtime

**What goes wrong:**
The Streamable HTTP transport for the remote MCP server uses SSE to stream long-running tool responses back to the client. Vercel's Node.js serverless runtime has a 10-second default timeout (60 seconds on Pro plans). Tool calls in PDE that involve design artifact generation, Playwright screenshot capture, or multi-step workflows will routinely exceed 10 seconds, causing the SSE stream to be terminated mid-response with no clean error to the client.

**Why it happens:**
Developers test locally against a Node.js server with no timeout. Vercel's timeout limit is a deploy-time constraint, not a development-time one. SSE streaming on Edge runtime works but has its own constraints (no Node.js built-ins, no `require()`, limited npm packages).

**How to avoid:**
- For long-running tools, use a polling pattern: the tool immediately returns a `job_id`, and the client polls a separate `/mcp/status/:job_id` endpoint. This keeps each HTTP request well under 10 seconds.
- Alternatively, use Vercel's Edge runtime for the MCP SSE endpoint — Edge allows long-lived connections but loses access to Node.js built-ins.
- Set explicit timeouts in tool implementations: wrap all tool logic in a `Promise.race()` with a 55-second timeout that returns a structured "in progress" response with a polling URL.
- Upgrade to Vercel Pro (60s limit) as a short-term mitigation but document that the polling architecture is the production path.

**Warning signs:**
- Tool calls time out after exactly 10 seconds with no error in the MCP client
- SSE connections close without a proper JSON-RPC response event
- "Works locally, fails on Vercel" is the only symptom

**Phase to address:**
Remote MCP Server phase (Feature 1). The long-running tool pattern must be in the initial architecture design, not retrofitted.

---

### Pitfall 9: Browser SSE Connection Limit (6 per Domain, HTTP/1.1)

**What goes wrong:**
The PDE dashboard already maintains SSE connections for the monitoring event stream (existing v0.8 infrastructure). Adding WebMCP tool connections, design artifact preview tools, and token playground tools creates multiple concurrent SSE connections to the same domain. Under HTTP/1.1, browsers enforce a hard limit of 6 concurrent SSE connections per domain across all tabs. When this limit is reached, new EventSource connections queue indefinitely — the dashboard freezes without a clear error.

**Why it happens:**
Each SSE stream is a long-lived HTTP/1.1 connection. Browsers treat each `new EventSource(url)` as consuming one of 6 slots. Opening the dashboard in a second tab consumes 6 more slots. This limit is marked "Won't fix" in both Chrome and Firefox bug trackers.

**How to avoid:**
- Ensure the Vercel deployment uses HTTP/2 (it does by default on Vercel). HTTP/2 multiplexes over a single TCP connection with a soft limit of ~100 streams, eliminating the 6-connection bottleneck.
- For local development (HTTP/1.1), multiplex all SSE streams through a single EventSource connection using event type filtering (`event: tool-update`, `event: monitor-update`).
- Audit the dashboard: count the number of concurrent `EventSource` instances created per tab. Target: 1-2 maximum under HTTP/1.1.
- If the local dev server uses `http://localhost`, this is HTTP/1.1 by default — test the multiplexed path explicitly.

**Warning signs:**
- Dashboard hangs when a second tab is opened
- `new EventSource()` calls resolve successfully but never emit messages
- Chrome DevTools network tab shows connections in "pending" state

**Phase to address:**
Dashboard WebMCP Tools phase (Feature 4). Connection audit must happen before adding any new SSE streams to the dashboard.

---

### Pitfall 10: Zero-npm-dep Constraint Violated by New Package Dependencies

**What goes wrong:**
PDE's plugin root has zero npm dependencies by design — all logic is in `.cjs` files using only Node.js built-ins. v0.19 features (WebMCP, OAuth, Streamable HTTP server) require packages like `@modelcontextprotocol/sdk`, `oauth4webapi`, or `@mcp-b/global`. A developer adds these to the root `package.json` (or creates one for the first time), breaking the zero-dep guarantee. Other developers who install PDE via the standard path get unexpected npm install requirements and breakage.

**Why it happens:**
WebMCP SDK packages and OAuth libraries are designed as npm packages. The path of least resistance is `npm install`. The zero-dep constraint is not enforced by any automated check — it is only documented in PROJECT.md.

**How to avoid:**
- All new dependencies for WebMCP/remote MCP go exclusively into `packages/pde-mcp-server/` or a new `packages/pde-remote-server/` package. The root `package.json` (if it exists) must not gain any new dependencies.
- The dashboard (`dashboard/`) already has its own `package.json` — new dashboard-side WebMCP tooling goes there.
- Browser-side WebMCP (`navigator.modelContext`) is a native browser API — zero npm packages needed for basic usage.
- Add a CI check: `test -z "$(jq -r '.dependencies // {} | keys | .[]' package.json 2>/dev/null)"` at the project root.

**Warning signs:**
- A root-level `package.json` with a `dependencies` section appears for the first time
- `npm install` is required before `claude` commands work
- Any `require('oauth4webapi')` in root-level `.cjs` files

**Phase to address:**
All v0.19 phases. This is a cross-cutting constraint that must be stated explicitly in the plan for every phase.

---

### Pitfall 11: WebMCP Spec Instability — API Removed Mid-Project

**What goes wrong:**
WebMCP is in early preview (Chrome 146, February 2026). The spec already broke backwards compatibility once on March 5, 2026, removing `provideContext()` and `clearContext()` methods that existed in the earlier API. A phase that ships using these deprecated methods will need rewriting in the next phase. Given the spec is still in draft at W3C, further breaking changes are likely during v0.19 development.

**Why it happens:**
Early adopters build on preview APIs. The stable API surface for `navigator.modelContext` has not been locked — Chrome's intent to ship notice did not include a full API freeze guarantee.

**How to avoid:**
- Pin to a specific Chrome version in CI tests rather than "latest."
- Use the `@mcp-b/global` polyfill as an abstraction layer: it maintains compatibility shims for removed APIs with deprecation warnings, giving a migration window.
- Do not use `provideContext()` or `clearContext()` in any new code (already deprecated).
- Read the webmachinelearning/webmcp GitHub repository issues and commits before each WebMCP phase to check for breaking changes.
- Design WebMCP tool registration behind a service layer so API changes require updating one file, not every component.

**Warning signs:**
- Direct calls to `navigator.modelContext.provideContext()` in any component
- No abstraction layer between framework code and the `navigator.modelContext` API
- WebMCP tests passing on Chrome 146 but failing on Chrome 147+

**Phase to address:**
All phases that use `navigator.modelContext`. A central `mcpToolRegistry.ts` service should be the only file that calls the native API.

---

## Moderate Pitfalls

### Pitfall 12: Token Refresh Not Implemented — 1-Hour Session Expiry

**What goes wrong:**
Remote MCP servers using OAuth 2.1 tokens (GitHub, Linear, Figma) issue access tokens with ~1-hour TTL. Multiple MCP clients (including open-webui) have confirmed bugs where OAuth tokens are not proactively refreshed, causing silent session loss after exactly 60 minutes. The user's PDE session appears functional but all tool calls to external services return 401, with no user-visible error.

**Why it happens:**
Implementing token refresh requires handling the `refresh_token` grant separately, storing refresh tokens securely, and running a background refresh 5 minutes before expiry. Most initial implementations skip refresh and handle re-authentication lazily, which is unacceptable for a 60-minute session limit.

**How to avoid:**
- Implement proactive token refresh: schedule refresh 5 minutes before `expires_in` from the token response.
- Store `refresh_token` in an encrypted session store, not in the browser's `localStorage` (which is accessible to XSS attacks).
- Add a middleware wrapper on every outgoing tool call that checks token expiry before the call, not just on 401 response.
- Test with intentionally short-lived tokens (1-minute TTL) during development.

**Warning signs:**
- Tool calls start failing exactly 60 minutes after session establishment
- `expires_in` from token response is stored but never acted on
- Re-authentication is the only recovery path (no silent refresh)

**Phase to address:**
Remote MCP Server phase (Feature 1). Token lifecycle must be part of the auth design, not an afterthought.

---

### Pitfall 13: WebMCP Tools Disappear After SPA Navigation

**What goes wrong:**
When the PDE dashboard navigates between sections (React Router `<Link>` or `useNavigate()`), components that registered WebMCP tools are unmounted. If `unregisterTool()` is not called in the `useEffect` cleanup function, the tools remain registered as zombies — their handler functions reference stale closures from the unmounted component. Tool calls succeed at the protocol level but fail silently because the JavaScript callback throws on accessing unmounted state.

Conversely, if `unregisterTool()` is called but `registerTool()` is not called on the new route, users navigating to a section expect its tools to be available but find an empty tool list.

**Why it happens:**
React's `useEffect` cleanup is easy to forget. Tool registration feels like a "set it and forget it" operation. SPA navigation feels like it should preserve registered state, but WebMCP tools are tied to the JavaScript context of the registering page.

**How to avoid:**
- Enforce a pattern: always pair registration with cleanup in `useEffect`: register on mount, `unregisterTool()` in the return cleanup function.
- Write a custom hook `useMcpTool(name, handler, inputSchema)` that enforces this pattern and cannot be called without cleanup.
- Add integration tests that navigate away from a tool-providing component and assert the tool is no longer listed, then navigate back and assert it is available again.

**Warning signs:**
- Tool calls return undefined or throw after navigation
- The `navigator.modelContext` tool list grows monotonically and never shrinks
- Tool handler references `useRef` values that are stale after navigation

**Phase to address:**
Dashboard WebMCP Tools phase (Feature 4). The `useMcpTool` hook must be the first deliverable in that phase.

---

### Pitfall 14: Unsafe Code Execution Blocked in MCP App Libraries

**What goes wrong:**
Design artifact preview (Feature 3) likely uses charting, diagram rendering (Mermaid), or syntax highlighting libraries inside MCP App iframes. Several common libraries use dynamic code generation internally (older Mermaid versions, some template engines, Marked.js in certain configs). The MCP Apps CSP blocks `unsafe-eval` by default. The library silently fails, producing empty renders with no error in the app UI.

**Why it happens:**
Libraries that work fine in normal browser contexts fail in sandboxed iframes without `unsafe-eval`. The failure is silent because CSP violations are reported to the console, not thrown as JavaScript errors.

**How to avoid:**
- Audit every library used in MCP App iframes for dynamic code generation before integrating. Use `mcp-scan` or manual inspection.
- Prefer safe alternatives: use Mermaid v11+ (dynamic-code-free since v10.6), use Prism.js instead of dynamic-code-using highlighters.
- If a library cannot be replaced, it must be bundled and its CSP declared explicitly — but `unsafe-eval` should be a last resort requiring explicit justification.

**Warning signs:**
- Library renders fine in the main dashboard but is blank inside the MCP App iframe
- CSP violation for `unsafe-eval` in browser console
- Library changelog mentions "removed dynamic code generation" as a feature in a specific version

**Phase to address:**
Design Artifact Preview phase (Feature 3). Library selection must be audited before any iframe UI is built.

---

### Pitfall 15: mcp-bridge.cjs Allowlist Does Not Cover the New Remote Server

**What goes wrong:**
PDE's security policy is enforced in `mcp-bridge.cjs` through `APPROVED_SERVERS`. The new remote PDE MCP server on Vercel (`packages/pde-remote-server/`) needs to be registered in this allowlist with its HTTP URL and probe tool. If it is not registered, the probe/degrade contract will treat the remote server as unavailable and silently fall back to stdio — giving no indication to the user that the remote surface is not functioning.

**Why it happens:**
New servers are added to the codebase but the mcp-bridge allowlist is not updated. The existing pattern (Phases 40-44) requires explicit registration, but it is easy to forget when adding a new package-level server.

**How to avoid:**
- Add the remote server to `APPROVED_SERVERS` in the same phase that creates `packages/pde-remote-server/`. Include `probeTimeoutMs`, `probeTool`, and a valid `probeArgs` that exercises the initialization path.
- Add a test that verifies `APPROVED_SERVERS` contains an entry for the remote server URL.
- Document the registration requirement in the phase plan template.

**Warning signs:**
- Remote server is deployed and accessible but PDE always falls back to stdio
- No entry in `APPROVED_SERVERS` for the Vercel URL
- "The remote server works in Postman but not through PDE" diagnosis

**Phase to address:**
Remote MCP Server phase (Feature 1). Registration and probe must be in the same commit as the server scaffolding.

---

### Pitfall 16: Multi-Editor Universal Bridge Creates Circular MCP Relay

**What goes wrong:**
Feature 9 (Multi-Editor Universal Bridge via WebMCP relay) routes tool calls from Cursor/Gemini through a WebMCP browser relay back into PDE's MCP server. If the relay is not carefully scoped, a tool call from Cursor triggers a PDE tool that triggers another outbound MCP call that circles back through the relay. The relay becomes a message loop, consuming tokens at each hop until the session is terminated by timeout.

**Why it happens:**
Bidirectional relay architectures create cycles when the relay is not explicitly unidirectional. Tool A calls Tool B which calls Tool A (via the relay) is a valid graph if there is no cycle detection.

**How to avoid:**
- Mark relay-originated tool calls with a `X-PDE-Relay-Depth` header. Reject any call with depth > 1 at the relay ingress.
- Define the relay as strictly unidirectional: Cursor/Gemini → WebMCP browser → PDE MCP server. PDE MCP server tools must never call back through the relay.
- Add a cycle detection test: simulate a tool call that triggers another tool call and verify the depth header prevents re-entry.

**Warning signs:**
- Tool calls take unexpectedly long (multiple relay round-trips)
- Session token usage spikes on simple relay tool calls
- Stack depth errors or infinite loop detection in the relay handler

**Phase to address:**
Multi-Editor Universal Bridge phase (Feature 9). The relay architecture must be documented with explicit cycle prevention before implementation.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `provideContext()` instead of `registerTool()` | Faster initial implementation | Breaks multi-component tool registration; requires rewrite when spec finalizes | Never — `registerTool()` is not harder |
| In-memory session state for Mcp-Session-Id | Simpler code, works locally | Breaks on Vercel serverless; forces sticky sessions or rewrite | Never for production deployments |
| Static OAuth client_id for all users | Single configuration | One-click account takeover vulnerability per Obsidian Security research | Never |
| Skip Origin header validation in MCP endpoint | Faster to ship | DNS rebinding attack surface on every installation | Never — 3 lines of code to add |
| `connect-src *` in MCP App CSP | Fixes all network errors | Allows data exfiltration from the sandboxed app | Never — declare explicit origins |
| Root-level `package.json` with dependencies | Unblocks development | Breaks zero-dep constraint, forces npm install for all users | Never — use packages/ subdirectory |
| HTTP/1.1 for local SSE dev without multiplexing | Simpler dev setup | 6-connection limit hit in integration tests | Acceptable in dev if explicitly documented |
| Polling pattern for long tools on Vercel Hobby | Avoids Edge runtime complexity | Extra HTTP round-trips per tool call | Acceptable short-term; document migration path |

---

## Integration Gotchas

Common mistakes when connecting the new v0.19 surfaces to existing PDE systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Streamable HTTP + existing stdio server | Deploying both simultaneously with no transport guard | Explicit `MCP_TRANSPORT` env var selecting one mode; no dual-mode process |
| WebMCP + React dashboard | Multiple components calling `provideContext()` | Central `useMcpTool()` hook using `registerTool()` / `unregisterTool()` |
| MCP Apps + external APIs | No `connectDomains` declaration | Declare every fetch target in `_meta.ui.csp.connectDomains` at tool registration |
| OAuth + MCP proxy | Shared `client_id` across sessions | Per-session PKCE `state` parameter bound to session cookie |
| Remote server + mcp-bridge.cjs | New server not in `APPROVED_SERVERS` | Registration in same commit as server scaffolding |
| Auto-generated competitor tools + LLM context | Raw scraped content in tool descriptions | Sanitize, length-cap, human-review gate before activation |
| WebMCP + SPA navigation | Tools persist as zombies after unmount | `useEffect` cleanup calls `unregisterTool()` on every registered tool |
| Vercel deployment + SSE streaming | Node.js runtime 10s timeout | Polling architecture for long tools; Edge runtime for streaming |
| Dashboard + new WebMCP SSE connections | Exceeding 6-connection HTTP/1.1 limit | Verify HTTP/2 on Vercel; multiplex in local dev |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| In-memory session map in Streamable HTTP server | Works for one user; fails for two concurrent users on different Vercel instances | Use external KV store (Vercel KV) for session state | Any serverless deployment with >1 function instance |
| SSE per-feature instead of multiplexed | 6-connection browser limit hit when multiple dashboard sections are open | Single multiplexed EventSource connection; event type routing | When user opens second tab or adds 3rd SSE-based feature |
| Polling without exponential backoff | 10x increase in server requests per user when many long-running tools are active | Backoff: 1s, 2s, 4s, 8s max, with jitter | At ~50 concurrent users with long-running tool calls |
| Auto-generated competitor tool scraper runs synchronously | Hangs the request handler for 30+ seconds per site scraped | Background job queue with async scraping and result storage | Single concurrent user with large competitor list |
| Main-thread tool execution in WebMCP handler | Browser UI freezes during tool execution | Offload heavy computation to Web Workers; keep handlers async | Design artifact processing (tokenization, layout calculation) |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Tool description accepts arbitrary string from web scraper | Prompt injection / tool poisoning — model follows hidden instructions | Sanitize all scraped content; length cap at 512 chars; human review gate |
| MCP endpoint accepts all Origins | DNS rebinding attack — attacker executes tools in victim's browser context | Validate `Origin` header against explicit allowlist on every request |
| Single OAuth `client_id` for all MCP sessions | CSRF consent bypass leading to account takeover | Per-session `state` bound to `__Host-` prefixed session cookie |
| `refresh_token` stored in `localStorage` | XSS can steal refresh token, enabling permanent session hijack | Store in `HttpOnly` cookie or encrypted server-side session |
| Auto-generated tools activated without review | Poisoned tool description in LLM context from day one | Require human approval gate; `source: "auto-generated"` flag |
| MCP App iframe with `connect-src *` | Exfiltration of design artifacts or tokens via tool side-channel | Explicit `connectDomains` declaration; block wildcard CSP |
| Remote relay without depth tracking | Circular tool calls consuming unbounded tokens | `X-PDE-Relay-Depth` header; reject depth > 1 at ingress |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No graceful degradation for non-Chrome browsers | WebMCP features silently absent; user confused why tools are missing | Feature-detect `'modelContext' in navigator`; show "WebMCP requires Chrome 146+" message with fallback UI |
| Re-authentication after 60-minute token expiry | User's workflow interrupted mid-task | Proactive token refresh 5 minutes before expiry; silent background renewal |
| MCP App iframe blank with no error | User sees empty preview; has no idea the tool failed | Add timeout detection (3 seconds with no render event); show "preview unavailable" with retry |
| Tools disappear after navigation | User expects tools from previous section to still work | Register per-route tools on route enter; clearly document tool scope per dashboard section |
| Long-running tools with no progress indicator | User thinks the tool hung | Progress events via SSE during tool execution; polling endpoint with `status: "in_progress"` |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Remote MCP Server:** Works locally but not on Vercel — verify with `vercel dev` and test session handling across cold starts
- [ ] **WebMCP tools registered:** Tools appear in Chrome DevTools but do not work after navigation — verify `unregisterTool()` cleanup in all components
- [ ] **MCP Apps UI renders:** Renders locally but blank on deployment — verify `connectDomains` in `_meta.ui.csp` covers every API endpoint called
- [ ] **OAuth flow completes:** User can authenticate but loses session after 60 minutes — verify proactive token refresh is wired up
- [ ] **Auto-generated competitor tools load:** Tools appear in the registry but descriptions contain raw HTML — verify sanitization pipeline and length cap
- [ ] **Dual transport server:** Stdio and HTTP both "work" — verify no process proliferation under `ps aux`; test with `MCP_TRANSPORT` switching
- [ ] **Origin validation:** MCP endpoint responds correctly — verify it rejects requests with invalid or missing Origin headers, not just unauthenticated ones
- [ ] **SSE connection budget:** Dashboard loads all features — open second tab and verify no connections queue; check HTTP/2 is active on Vercel

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Dual transport process proliferation | LOW | Update Claude Code config to HTTP transport; restart sessions; add transport guard to server code |
| Stateful session breaks on Vercel | MEDIUM | Migrate session state to Vercel KV; 2-4 hours implementation; requires redeployment |
| provideContext() clobber discovered in production | MEDIUM | Replace all calls with `registerTool()` / `unregisterTool()`; add `useMcpTool` hook; 1 day refactor |
| OAuth CSRF account takeover reported | HIGH | Rotate all OAuth client secrets immediately; implement `__Host-` cookies; audit all active sessions; 1-2 days |
| Tool poisoning discovered in auto-generated tools | HIGH | Disable all auto-generated tools; audit existing descriptions with `mcp-scan`; add sanitization pipeline; days |
| DNS rebinding exploit on local MCP server | MEDIUM | Add Origin header validation (3-line fix); rebind to 127.0.0.1; redeploy |
| Vercel 10s timeout killing SSE responses | LOW | Switch affected tools to polling pattern; Edge runtime is backup option; 4-8 hours |
| WebMCP API breaking change from spec update | MEDIUM | Update `mcpToolRegistry.ts` central service only; 2-4 hours if abstraction layer is in place; days if calls are scattered |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Dual transport proliferation (P1) | Feature 1: Remote MCP Server | `ps aux` shows single server process per deployment mode |
| Stateless session on Vercel (P2) | Feature 1: Remote MCP Server | Integration test sends 2 requests to different function instances; session preserved |
| provideContext() overwrite (P3) | Feature 4: Dashboard WebMCP Tools | Mount 2 tool-registering components; assert both tool sets present simultaneously |
| DNS rebinding (P4) | Feature 1: Remote MCP Server | Send request with invalid Origin; assert 403 response |
| OAuth CSRF (P5) | Feature 1: Remote MCP Server | Security review of `state` binding to session cookie |
| MCP Apps CSP blocks fetch (P6) | Feature 2: MCP Apps rich UI | Deploy to production-like iframe; assert fetch() resolves |
| Tool poisoning from competitor scraper (P7) | Feature 8: Auto-Generated Competitor Tools | Inject adversarial text; assert it is sanitized before tool registration |
| Vercel SSE timeout (P8) | Feature 1: Remote MCP Server | Trigger 15-second tool call; assert completion without timeout |
| SSE 6-connection limit (P9) | Feature 4: Dashboard WebMCP Tools | Open 2 tabs; assert no queued SSE connections |
| Zero-dep constraint violation (P10) | All phases | CI check: root `package.json` has no `dependencies` key |
| WebMCP spec instability (P11) | All phases using navigator.modelContext | Single `mcpToolRegistry.ts` abstraction; no direct API calls in components |
| Token refresh missing (P12) | Feature 1: Remote MCP Server | Test with 1-minute token TTL; assert silent refresh fires |
| Tools disappear on navigation (P13) | Feature 4: Dashboard WebMCP Tools | Navigate away and back; assert tools re-register correctly |
| CSP-blocked library in MCP App (P14) | Feature 3: Design Artifact Preview | CSP violation check in CI; audit dependencies for dynamic code generation |
| mcp-bridge allowlist missing entry (P15) | Feature 1: Remote MCP Server | Test APPROVED_SERVERS probe for remote server URL |
| Circular relay (P16) | Feature 9: Multi-Editor Universal Bridge | Depth-header test: relay call triggering relay call is rejected |

---

## Sources

- [MCP Streamable HTTP Transport Specification (2025-03-26)](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) — Session management requirements, Origin validation MUST clauses
- [WebMCP Tool Registration and Management (DeepWiki)](https://deepwiki.com/webmachinelearning/webmcp/3.2-tool-registration-and-management) — provideContext() replace semantics, navigation lifecycle
- [Patrick Brosset: WebMCP Updates and Next Steps (2026-02-23)](https://patrickbrosset.com/articles/2026-02-23-webmcp-updates-clarifications-and-next-steps/) — API naming changes, spec evolution
- [Straiker AI: DNS Rebinding Exposes Internal MCP Servers](https://www.straiker.ai/blog/agentic-danger-dns-rebinding-exposing-your-internal-mcp-servers) — SSE GET request bypasses CORS preflight, attack mechanism
- [Obsidian Security: When MCP Meets OAuth — One-Click Account Takeover](https://www.obsidiansecurity.com/blog/when-mcp-meets-oauth-common-pitfalls-leading-to-one-click-account-takeover) — Shared client_id CSRF, consent hijacking
- [Invariant Labs: MCP Security Notification — Tool Poisoning Attacks](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) — Real-world tool poisoning, WhatsApp exfiltration example
- [Auth0: Why MCP's Move Away from SSE Simplifies Security](https://auth0.com/blog/mcp-streamable-http/) — Streamable HTTP vs SSE security comparison
- [MCP Apps Specification (2026-01-26)](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) — iframe sandbox, CSP defaults, connectDomains
- [Vercel: Building Efficient MCP Servers](https://vercel.com/blog/building-efficient-mcp-servers) — Serverless timeout limits, SSE vs Streamable HTTP on Vercel
- [MCP Apps CSP Domains (sunpeak.ai)](https://sunpeak.ai/blogs/mcp-app-csp-external-api-calls/) — connectDomains vs resourceDomains, default connect-src none
- [open-webui Discussion #19820: MCP OAuth tokens not proactively refreshed](https://github.com/open-webui/open-webui/discussions/19820) — Real-world 60-minute session loss
- [Claude Code Issue #29688: stdio process spawned for HTTP transport](https://github.com/anthropics/claude-code/issues/29688) — Dual transport process proliferation
- [WebMCP Browser Status 2026 (ai-agent-economy)](https://ai-agent-economy.hashnode.dev/webmcp-browser-status-2026-chrome-146-only-edge-coming-firefox-at-8-12-weeks) — Chrome 146 only, Edge/Firefox timeline
- [Chromium Issue #275955: SSE 6-connection limit](https://bugs.chromium.org/p/chromium/issues/detail?id=275955) — Won't fix status, HTTP/2 solution
- [@mcp-b/global npm package](https://www.npmjs.com/package/@mcp-b/global) — Polyfill for removed provideContext() / clearContext() APIs
- [webmachinelearning/webmcp Issue #101](https://github.com/webmachinelearning/webmcp/issues/101) — provideContext() overwrites all previously registered tools

---
*Pitfalls research for: PDE v0.19 WebMCP Integration — adding WebMCP browser surface, Streamable HTTP remote server, and MCP Apps rich UI to an existing stdio MCP plugin*
*Researched: 2026-03-27*
