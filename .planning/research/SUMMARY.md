# Project Research Summary

**Project:** Platform Development Engine (PDE) — v0.5 MCP Server Integrations
**Domain:** Claude Code plugin with external MCP server integrations (GitHub, Linear, Jira, Figma, Pencil)
**Researched:** 2026-03-18
**Confidence:** HIGH (core architecture, stack, and pitfalls — verified against official docs and direct codebase inspection); MEDIUM (Pencil MCP tool names, PDE-as-MCP-server demand)

## Executive Summary

PDE is a mature Claude Code plugin with a complete 13-stage design pipeline, 34+ slash commands, a self-improvement fleet, and a file-based `.planning/` state model. The v0.5 milestone adds MCP server integrations — connecting GitHub, Linear, Jira, Figma, and Pencil to the pipeline without restructuring any existing capability. Research confirms this is a well-understood additive layer: Claude Code's plugin system natively supports bundled MCP servers via `.mcp.json`, and all five target services have official MCP servers with documented tool inventories. The integration pattern is not novel — it extends PDE's existing probe/use/degrade architecture that already handles Playwright, Axe, Sequential Thinking, Context7, and other MCPs.

The recommended approach is a dependency-ordered build sequence: infrastructure foundation first (connection manager, unified config schema, probe/degrade contracts for all new servers), then GitHub as the pattern-validating integration, then Linear and Jira in parallel, then design tools (Figma and Pencil), and finally the optional PDE-as-MCP-server exposure. This sequencing is non-negotiable — every sync workflow depends on the connection layer, the GitHub integration must establish the adapter pattern and rate-limit handling that all subsequent integrations inherit, and the state server must be last so its API surface reflects actual consumer patterns. The adapter layer is the single most critical architectural decision: workflows must call normalized PDE API methods, not raw MCP tool names, or every server-side tool rename cascades into multi-file edits.

The primary risk category is not implementation complexity but operational reliability. Two confirmed Claude Code bugs (auth loss on context compaction, SSE disconnect session crashes) and a structural MCP ecosystem problem (date-based version strings with no semantic breaking-change signal) will affect all five integrations unless specifically mitigated in Phase 1. The configuration surface must also be designed once up front — allowing five integrations to each invent their own credential schema produces user-hostile setup friction that cannot be refactored cheaply after launch. These are not theoretical concerns; they are documented failure modes in the live Claude Code issue tracker and official MCP specification.

## Key Findings

### Recommended Stack

PDE's zero-npm-dependency constraint at the plugin root is a feature and must be preserved. The stack for v0.5 is an extension of the existing Node.js 20.x LTS / CommonJS pattern with one isolated exception: the PDE state MCP server lives in `bin/mcp-server/` with its own `package.json` carrying `@modelcontextprotocol/sdk` v1.x. This isolates the only new npm dependency from the plugin root entirely.

**Core technologies:**
- Node.js 20.x LTS / CommonJS (.cjs): runtime and module format — required for Claude Code plugin compatibility; zero-install for end users; all new `bin/lib/` modules follow this pattern
- `@modelcontextprotocol/sdk` v1.x (isolated in `bin/mcp-server/`): Official MCP server SDK for PDE-as-MCP-server; use v1.x only — v2.x is in development as of early 2026 and not production-stable
- `.mcp.json` at plugin root: Claude Code's native project-scoped MCP declaration format; auto-starts bundled servers on plugin enable; safe to commit (no credentials); uses `${CLAUDE_PLUGIN_ROOT}` for server paths
- External MCP servers: GitHub at `api.githubcopilot.com/mcp/` (HTTP), Linear via stdio (`npx @linear/mcp-server`), Figma at `mcp.figma.com/mcp` (HTTP), Pencil via local stdio (auto-started by Pencil app), Jira via `mcp.atlassian.com/` (HTTP OAuth 2.1)
- `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}`: Plugin environment variables for path and state resolution — required for plugin-bundled MCP servers

No template engine, no schema compiler, no test runner added. MCP Tool Search (auto-enabled at 10% threshold) handles context window pressure from 11+ active MCP servers without any PDE-side changes.

### Expected Features

**Must have for v0.5 to close (table stakes):**
- Plugin-bundled MCP infrastructure — `.mcp.json`, availability probe, `.planning/mcp-connections.json` runtime state, unified config schema in `pde-config.json`
- `/pde:mcp-status` — shows all integration connection states and degraded-mode implications before any pipeline execution
- GitHub MCP integration (`/pde:sync --github`) — issues to REQUIREMENTS.md; PR creation from handoff artifacts; `/pde:brief --from-github` flag
- Linear OR Jira toggle (`/pde:sync --linear`, `--jira`) — config-driven selection via `task_tracker` field; Linear MCP is stdio, Jira Rovo MCP is HTTP OAuth 2.1
- Figma design import (`/pde:sync --figma`) — `get_variable_defs` to DTCG non-destructive merge; `get_design_context` for wireframe reference; `get_code_connect_map` for handoff
- Pencil Level 1 — token sync via `set_variables` in `/pde:system`; `get_screenshot` in `/pde:critique`; probe/degrade for VS Code dependency
- MCP server recommendations in `/pde:recommend` — detect project type and surface relevant MCP servers alongside existing tool recommendations

**Should have after core integrations validate (v0.5.x differentiators):**
- Figma "Code to Canvas" export (`/pde:export-figma` via `generate_figma_design`) — reverse workflow: PDE mockup HTML to editable Figma frame
- PDE-as-MCP-server — expose `.planning/` state as read-only MCP resources (`pde://plan`, `pde://state`, `pde://design-state`) and tools (`get_current_phase`, `get_requirements`, `get_design_artifacts`)
- Cross-server pipeline (`/pde:build --sync`) — MCP syncs injected at pre-brief (requirements pull), post-mockup (design push), post-handoff (ticket creation)

**Defer to v0.6+:**
- Jira Data Center support — community `sooperset/mcp-atlassian` has different auth, tools, and stability; doubles QA surface; wait for confirmed demand
- Slack/Notion requirements import — GitHub/Linear/Jira covers 90% of dev-team requirement sources
- Sentry/Vercel post-deployment feedback loop — requires deployed user projects first
- Pencil Level 2 (native `.pen` file output from `/pde:wireframe`) — validate Level 1 before deeper canvas integration

**Anti-features to avoid:**
- Auto-configure all MCP servers on install — triggers unexpected OAuth flows; always require explicit user consent via `/pde:mcp-setup`
- Real-time bidirectional Figma sync — architecturally impossible in a session-based plugin; use explicit sync commands with deterministic versioning
- MCP tool passthrough to all subagents — destroys 85% context savings from Tool Search; scope MCP tools at agent spawn time by role
- Write tools in PDE-as-MCP-server — creates a second write path bypassing `pde-tools.cjs` validation and locking; state server must be read-only

### Architecture Approach

The v0.5 architecture is additive infrastructure layered onto a stable base. The existing 13-stage design pipeline, all commands, agent definitions, and `bin/lib/*.cjs` modules are untouched — zero modifications to the design pipeline are required or acceptable. A new MCP integration layer introduces two lib modules, two new commands, per-service sync workflows, and an isolated PDE state MCP server. The canonical architectural rule: `.planning/` is the single source of truth; external services are read-only input sources; write-back to external systems requires explicit user confirmation with a prompt. The probe/use/degrade pattern from `references/mcp-integration.md` is extended — not replaced — for all five new servers.

**Major components:**
1. `bin/lib/mcp-bridge.cjs` — External MCP connection manager: per-server probe, auth metadata lookup, probe caching; all sync workflows invoke exclusively via `pde-tools.cjs mcp *`; never imported directly from `.md` files
2. `bin/lib/mcp-config.cjs` — Connection metadata CRUD; reads/writes `.planning/mcp-connections.json` (gitignored); stores `{server, connected, scopes, last_sync}` only — never tokens
3. `workflows/sync-{github,linear,jira,figma}.md` — Per-service sync logic; each follows probe/use/degrade pattern; write-back branches require explicit user confirmation gate
4. `bin/mcp-server/state-server.cjs` — Bundled stdio MCP server; isolated npm dep in `bin/mcp-server/package.json`; read-only contract; exposes structured views of `.planning/` files, not raw file contents
5. `commands/connect.md` + `commands/sync.md` — Two new user-facing commands; `connect` handles guided auth setup; `sync` is the unified entry point for all service syncs with `--github`, `--linear`, `--jira`, `--figma`, `--pencil` flags

### Critical Pitfalls

1. **Auth state lost on context compaction** — OAuth tokens in conversation context are destroyed during compaction. Prevention: persist credentials to disk or OS keychain; reload on every skill invocation; never assume in-context auth state. Must be in Phase 1 before any integration is built — retrofitting is five times the work.

2. **SSE transport disconnect crashes session** — Confirmed Claude Code bug (#18557): SSE disconnect terminates the session rather than degrading gracefully. Prevention: all MCP calls must be atomic (probe at start OR publish at end — never interleaved with state writes); every skill with MCP dependencies needs an explicit degraded mode as a first-class path, not an afterthought.

3. **Protocol versioning breaks integrations every ~3 months** — MCP uses date-based version strings with no semantic breaking-change signal. Prevention: pin each integration to a tested protocol version in `mcp-connections.json`; maintain contract tests against live services; treat contract test failure as a release blocker. Pattern established in Phase 3 (GitHub); inherited by all subsequent integrations.

4. **Configuration sprawl from per-integration credential schemas** — Each integration inventing its own credential variable names produces a 10-key `.env` with no central visibility. Prevention: unified MCP config schema designed in Phase 1 before any integration is built; all credentials routed through the connection manager; `/pde:mcp-status` as the single visibility surface for all configured integrations.

5. **Tool poisoning via malicious MCP server descriptions** — LLM processes tool schemas as part of reasoning; hidden instructions in descriptions can redirect agent actions. PDE agents have broad `.planning/` write access, amplifying blast radius. Prevention: verified-sources-only policy (official GitHub, Linear, Figma, Atlassian servers only); tool schema review before each integration merges; policy documented and enforced before any integration ships.

## Implications for Roadmap

The architecture's dependency graph directly dictates phase structure. There is no flexibility in the first three phases — each is hard-blocked until its predecessor completes. Phases 4 and 5 are independent of each other and can proceed in parallel if resources allow.

### Phase 1: MCP Infrastructure Foundation
**Rationale:** Every sync workflow, integration command, and connection UI depends on this layer. Building any integration before the foundation produces throwaway code — retrofitting auth persistence, unified config, and degraded-mode contracts to five integrations is five times the work. The two confirmed Claude Code bugs and the configuration sprawl pitfall make this phase non-deferrable.
**Delivers:** `bin/lib/mcp-config.cjs`, `bin/lib/mcp-bridge.cjs`, `pde-tools.cjs mcp` subcommand group, unified config schema in `pde-config.json`, `.planning/mcp-connections.json` template (gitignored), probe/degrade contracts defined for all five planned servers, `/pde:mcp-status` command, verified-sources-only policy documented
**Addresses:** Plugin-bundled MCP infrastructure (table stakes), MCP availability probe (table stakes), `/pde:mcp-status` (table stakes)
**Avoids:** Auth state loss (Pitfall 1), SSE session crashes (Pitfall 2), configuration sprawl (Pitfall 4), tool poisoning policy gap (Pitfall 5), total UX degradation when services are down (Pitfall 9)

### Phase 2: Connection Management and Reference Documentation
**Rationale:** Users must be able to connect servers before sync workflows are useful. Reference entries in `mcp-integration.md` for all five new servers must exist before sync workflows can cite the probe/degrade patterns — this is documentation work with no implementation unknowns and can complete quickly.
**Delivers:** `commands/connect.md` + connection workflow, updated `references/mcp-integration.md` with GitHub, Linear, Jira, Pencil entries (~40 lines each), `skill-registry.md` CON + SYN entries, `bin/lib/config.cjs` `mcp.*` config keys
**Uses:** `mcp-bridge.cjs` and `mcp-config.cjs` from Phase 1
**Implements:** Guided connection setup flow: display auth instructions → confirm probe → write connection metadata

### Phase 3: GitHub Integration (Pattern Validation)
**Rationale:** GitHub is the highest-value integration (most users) and the pattern-validation phase. The adapter layer — normalizing raw MCP tool names into PDE canonical API calls — is established here and inherited by all subsequent integrations. Rate-limit handling (human-readable errors on 429, not empty results) is also established here. Do not defer either to a later integration.
**Delivers:** `workflows/sync-github.md`, `commands/sync.md --github`, adapter layer in `mcp-bridge.cjs`, rate-limit handling, `/pde:brief --from-github`, `/pde:handoff --create-prs` with confirmation gate
**Avoids:** Over-coupling to specific MCP tool names (Pitfall 6 — adapter layer is the mitigation), rate limit silent failures (Pitfall 7), state sync conflicts between PLAN.md and GitHub (Pitfall 8 — read-first/write-explicit enforced)

### Phase 4: Linear + Jira Integration
**Rationale:** After GitHub validates the sync pattern, Linear and Jira follow the same template via the adapter layer. Both can be built in parallel within this phase — they share no code paths. Linear is higher-priority (richer project/milestone model maps cleanly to PDE's STATE.md; Jira epic-to-REQUIREMENTS.md mapping requires an additional translation layer).
**Delivers:** `workflows/sync-linear.md`, `workflows/sync-jira.md`, config-driven toggle (`task_tracker: "linear" | "jira" | "none"`), `/pde:sync --linear` and `--jira`, Linear cycles to ROADMAP.md phases, Jira epics to REQUIREMENTS.md
**Uses:** Adapter pattern from Phase 3 (inherit, not reinvent); protocol version pinning established here per Pitfall 3

### Phase 5: Design Tool Integration (Figma + Pencil)
**Rationale:** Design tool sync is more complex than text-based syncs — token format transforms, visual artifact handling, binary concepts vs. Markdown. Both Figma and Pencil can be built in parallel within the phase. Figma has partial coverage in `mcp-integration.md` already. Pencil requires probe/degrade for its VS Code dependency. Both integrations are only useful after a project has run `/pde:system` (DTCG tokens must exist for Pencil `set_variables`).
**Delivers:** `workflows/sync-figma.md` (import: `get_variable_defs` to DTCG non-destructive merge, `get_design_context` for wireframe reference, `get_code_connect_map` for handoff; export: `generate_figma_design` with confirmation gate), Pencil Level 1 (token sync in `/pde:system`, `get_screenshot` in `/pde:critique`, `snapshot_layout` layout audit — all behind probe/degrade), `/pde:sync --figma` and `--pencil`
**Avoids:** Loading entire Figma design files into context (request only selected frames/components per gotcha table), treating Figma as source of truth for PDE design state (DESIGN-STATE.md remains authoritative), hardcoded Pencil tool names (adapter layer from Phase 3 applies here too)

### Phase 6: PDE-as-MCP-Server (Additive, Non-Blocking)
**Rationale:** The state server is architecturally clean (read-only, thin view layer) and does not block any sync integration. Deferring to Phase 6 means its API surface reflects validated consumer patterns rather than speculation. The security model (tool-level access control, no raw file exposure, no write tools) must be designed as the first deliverable — do not start implementation without it.
**Delivers:** `bin/mcp-server/state-server.cjs` (bundled stdio server), `bin/mcp-server/package.json` (`@modelcontextprotocol/sdk` v1.x isolated), `.mcp.json` at plugin root, `plugin.json mcpServers` update, read-only resources (`pde://plan`, `pde://state`, `pde://design-state`, `pde://requirements`, `pde://artifacts`), read-only tools (`get_current_phase`, `get_requirements`, `get_design_artifacts`, `get_pipeline_status`)
**Avoids:** State server write tools that bypass `pde-tools.cjs` (second write path creates race conditions — hard constraint), planning state exposure without access control (Pitfall 10), competing with sync integration milestone scope (build after all consuming integrations are stable)

### Phase 7: End-to-End Validation
**Rationale:** Each integration was validated independently; this phase validates them in combination and under failure conditions.
**Delivers:** Multi-server connect (2+ simultaneously), full sync run with `.planning/` state verification, state server resource requests verified, `--no-mcp` degradation confirmed for every integration, write-back confirmation flows exercised, context compaction auth recovery confirmed, rate-limit error surfacing confirmed (mock 429 test)

### Phase Ordering Rationale

- Infrastructure before workflows: `mcp-bridge.cjs` must exist before any sync workflow can be written or tested — hard dependency, not a preference
- GitHub before Linear/Jira: establishes adapter pattern and rate-limit handling that subsequent integrations inherit; most common service gives highest signal for pattern validation
- Text-based syncs before design syncs: simpler transformation logic validates the probe/use/degrade extension before tackling DTCG token merges and visual artifact handling
- State server last: additive value; use cases are clearer once all consuming integration patterns are built and validated; security model complexity warrants dedicated attention without competing scope

### Research Flags

Phases needing deeper research during planning:
- **Phase 5 (Figma token import — DTCG merge):** The non-destructive merge logic requires a mapping strategy between Figma variable naming conventions and PDE's existing DTCG token names. This mapping is not yet defined. Needs validation against real Figma files before implementation.
- **Phase 6 (PDE-as-MCP-server — security model):** No prior art in PDE codebase for MCP server access control. Security model (which resources are safe to expose, connection authentication, no raw file contents) must be designed before implementation begins. Treat as a design phase with implementation blocked until the design is complete.
- **Phase 5 (Pencil Level 1 — tool name validation):** Official Pencil MCP docs are sparse. The 6 tool names sourced from community articles (MEDIUM confidence). Validate tool names in a real Pencil + Claude Code + VS Code environment before committing workflow logic.
- **Phase 1 (Availability probe — `listTools` access):** FEATURES.md flags MEDIUM confidence on whether MCP tool list is callable programmatically within skill context. Validate in Phase 1 before finalizing the probe implementation approach.

Phases with well-documented patterns (can skip research-phase):
- **Phase 1 (infrastructure):** Plugin `.mcp.json` format, `${CLAUDE_PLUGIN_ROOT}`, connection metadata schema — verified against official Claude Code docs (HIGH confidence)
- **Phase 2 (connection management):** `mcp-integration.md` probe/use/degrade pattern is established and working for 5 existing MCPs; extending it is additive documentation work
- **Phase 3 (GitHub):** Official server, HTTP transport at `api.githubcopilot.com/mcp/`, toolset names (issues, pull_requests, repos), OAuth/PAT pattern — HIGH confidence across all sources
- **Phase 4 (Linear):** Official server, HTTP remote, recent changelog confirmed; richer project/milestone model (HIGH confidence); Jira Rovo MCP cloud-only constraint confirmed (MEDIUM confidence for Jira specifically)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | v0.5 stack is additive to verified v1.x stack; `.mcp.json` format and plugin env vars verified from official docs; MCP SDK version from npm search (MEDIUM for version number) |
| Features | HIGH | Official MCP server tool inventories verified for GitHub and Figma; Linear changelog confirmed 2026 additions; Pencil tool names MEDIUM (sparse official docs) |
| Architecture | HIGH | Build order is dependency-derived from hard blockers; component design grounded in direct codebase inspection of existing lib modules; anti-patterns all sourced from official MCP docs or confirmed bugs |
| Pitfalls | HIGH | Two pitfalls from confirmed Claude Code issue tracker bugs; MCP versioning from official specification; security pitfalls from multiple independent security research organizations |

**Overall confidence:** HIGH

### Gaps to Address

- **Pencil tool name accuracy:** `docs.pencil.dev` is sparse; tool names sourced from community articles and project memory note (MEDIUM confidence). Validate tool names in a real Pencil + Claude Code session before writing workflow logic that depends on them.
- **`listTools` programmatic access:** Needed for the availability probe mechanism. FEATURES.md flags MEDIUM confidence on whether this is callable within skill context. Validate in Phase 1 before finalizing probe implementation approach.
- **PDE-as-MCP-server user demand:** Architecturally correct (read-only) but no confirmed user demand exists for consuming PDE planning state from external MCP clients. Treat as experimental; validate concrete use cases before investing in API surface design.
- **Figma token naming conventions:** The non-destructive merge logic depends on a mapping strategy between Figma variable names and PDE's existing DTCG token names. This mapping is undefined. Address in Phase 5 planning before implementation begins.
- **Jira Data Center:** Atlassian Rovo MCP is cloud-only. Data Center requires `sooperset/mcp-atlassian` (community, different auth, different tools). Do not scope into v0.5 without explicit user demand confirmation.

## Sources

### Primary (HIGH confidence)
- `https://code.claude.com/docs/en/mcp` — Claude Code MCP plugin API: `.mcp.json` format, `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}`, scopes, Tool Search auto-enable at 10% threshold, `claude mcp serve`, passthrough limitation, OAuth 2.0 support
- `https://github.com/github/github-mcp-server` — GitHub MCP toolsets (repos, issues, pull_requests, actions, code_security), HTTP transport URL, auth options
- `https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/` — All 13 Figma MCP tools with descriptions
- `https://linear.app/docs/mcp` — Linear MCP HTTP transport, OAuth, tool scope
- `https://linear.app/changelog/2026-02-05-linear-mcp-for-product-management` — 2026 additions: initiatives, milestones, project updates, project labels
- `https://github.com/atlassian/atlassian-mcp-server` — Atlassian Rovo MCP official repo; cloud-only, OAuth 2.1, Jira + Confluence + Compass
- `https://modelcontextprotocol.io/docs/develop/build-server` — MCP Resources vs Tools vs Prompts primitives
- `https://www.npmjs.com/package/@modelcontextprotocol/sdk` — MCP SDK Node.js server implementation
- Claude Code issue tracker #34832 — Auth loss on context compaction (confirmed bug)
- Claude Code issue tracker #18557 — SSE disconnect session crash (confirmed bug)
- `https://modelcontextprotocol.io/specification/versioning` — Date-based version schema, breaking change cadence, GitHub SEP-1400 discussion
- PDE codebase direct inspection: `references/mcp-integration.md`, `bin/pde-tools.cjs`, `bin/lib/design.cjs`, `bin/lib/config.cjs`, `.claude-plugin/plugin.json`, `commands/recommend.md`, `workflows/recommend.md`

### Secondary (MEDIUM confidence)
- `https://www.atlassian.com/platform/remote-mcp-server` — Atlassian Rovo MCP cloud-only constraint, OAuth 2.1, compatible clients
- `https://github.blog/changelog/2026-01-28-github-mcp-server-new-projects-tools-oauth-scope-filtering-and-new-features/` — 2026 GitHub MCP additions: Projects tools, OAuth scope filtering, HTTP mode for enterprise
- `https://muz.li/blog/claude-code-to-figma-how-the-new-code-to-canvas-integration-works/` — Figma Code to Canvas (2026-02 feature)
- `https://modelcontextprotocol.info/docs/best-practices/` — Tool composition, security patterns
- Invariant Labs, "MCP Security Notification: Tool Poisoning Attacks" — Tool poisoning via description injection
- Nordic APIs, "The Weak Point in MCP Nobody's Talking About: API Versioning" — Date-based version fragility; consistent with official spec analysis
- Nudge Security, "MCP Security Risks and Best Practices" — Verified against other security sources
- `https://atalupadhyay.wordpress.com/2026/02/25/pencil-dev-claude-code-workflow-from-design-to-production-code-in-minutes/` — Pencil MCP tool names (community source; sparse official docs)
- `https://docs.pencil.dev/getting-started/ai-integration` + project_pencil_mcp.md project memory — Pencil MCP 6 tools, `.pen` file format, VS Code constraint

### Tertiary (LOW confidence)
- ByteBridge Medium, "Managing MCP Servers at Scale: The Case for Gateways, Lazy Loading, and Automation" — Connection pooling and lazy loading patterns; single practitioner source; consistent with observed patterns but unverified
- PDE-as-MCP-server user demand — No prior art or confirmed use cases; pattern derived from `claude mcp serve` capability only; need real consumer validation before committing to API surface

---
*Research completed: 2026-03-18*
*Ready for roadmap: yes*
