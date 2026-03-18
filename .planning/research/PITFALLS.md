# Pitfalls Research

**Domain:** Adding MCP server integrations to an existing file-based Claude Code plugin (PDE v0.5)
**Researched:** 2026-03-18
**Confidence:** HIGH (grounded in direct PDE codebase inspection, verified MCP protocol documentation, confirmed Claude Code issue tracker bugs, and multiple credible ecosystem sources)

---

## Critical Pitfalls

### Pitfall 1: Authentication State Lost on Context Compaction

**What goes wrong:**
When a Claude Code session runs long enough to trigger context compaction, MCP connector authentication state stored in conversation context is destroyed. Every MCP server that was authenticated must be manually re-authenticated before tools can resume. In PDE's case, this means a pipeline that reaches `/pde:handoff` after heavy use may find GitHub, Linear, and Figma connections gone mid-session. Confirmed in the Claude Code issue tracker (issue #34832: "Cowork MCP connectors lose auth after context compaction").

**Why it happens:**
OAuth tokens and session handles are passed as transient context rather than persisted outside the conversation. Context compaction rebuilds the context window from scratch — transient state is not preserved. Developers assume MCP connections persist at the process level, but the connection auth is scoped to conversation context when not explicitly externalized.

**How to avoid:**
Never store authentication state inside conversation context. Persist OAuth tokens and session credentials to disk in a dedicated `.planning/mcp-state/` directory, using OS keychain APIs where available. On each skill invocation, the MCP orchestration layer must load credentials from disk, not assume they are already present. Implement a connection health-check at skill start that re-authenticates from stored credentials if the session handle is stale. For the Claude Code plugin, use environment variables (scoped to the project's `.env` or Claude Code settings) as the canonical credential store.

**Warning signs:**
- MCP tool calls fail after a long design pipeline session with "unauthorized" or "not connected" errors
- Re-running a skill that was working earlier in the session suddenly fails to reach the MCP server
- No credential persistence layer exists — auth only happens on explicit user command

**Phase to address:** MCP infrastructure phase (Phase 1) — credential persistence architecture must be designed before any individual MCP integration is built. Retrofitting auth persistence to five separate integrations is five times the work.

---

### Pitfall 2: SSE Transport Disconnect Crashes the Session Instead of Degrading Gracefully

**What goes wrong:**
When an SSE-based MCP server (Figma, Pencil, or any remote MCP) drops its connection mid-session, Claude Code exits the session entirely rather than marking the server as unavailable and continuing. Confirmed in Claude Code issue #18557: "SSE MCP server disconnection crashes session instead of graceful degradation." For PDE, a Figma connection dropping during `/pde:build` would kill the entire pipeline — destroying in-progress state.

**Why it happens:**
The SSE transport client does not wrap network operations in try-catch. A network error propagates as an unhandled exception that terminates the process. This is a known Claude Code bug rather than a developer mistake, but integrations must be designed defensively because the fix may not ship before PDE v0.5.

**How to avoid:**
Treat every MCP server as potentially unavailable at any moment. Design each PDE skill that uses an MCP server with an explicit "optional dependency" pattern: the skill checks whether the MCP server is reachable at the start of execution, not mid-execution, and decides at that point whether to proceed with full functionality or gracefully degrade to a local-only mode. Never call an MCP tool in the middle of a stateful operation (e.g., mid-artifact-generation). All MCP calls must happen either at the very start (data fetching) or very end (data publishing) of a skill execution — never interleaved with state writes.

**Warning signs:**
- A skill calls MCP tools in the middle of a workflow that also writes to `.planning/` files
- No `try-catch` wrapper exists around any MCP tool call in the orchestration layer
- There is no local fallback path for a skill that also has an MCP-enhanced path

**Phase to address:** MCP infrastructure phase (Phase 1) — the optional-dependency pattern and graceful degradation contract must be established as the foundation before any individual MCP integration is built.

---

### Pitfall 3: Protocol Versioning Breaks Integrations Every Three Months

**What goes wrong:**
The MCP specification uses date-based versions (2025-03-26, 2025-06-18, etc.) with breaking changes appearing on roughly three-month cycles. A feature added in one version may be removed or changed in the next (batching was added in 2025-03-26 and removed in 2025-06-18). PDE integrations built against a specific MCP server version may silently break after a server-side version upgrade — with no semver signal that a breaking change occurred.

**Why it happens:**
Date-based version strings carry no semantic signal. A developer who sees "2025-06-18" vs "2025-09-15" cannot tell whether this is a minor update or a breaking change without reading the full changelog. The MCP ecosystem lacks the SemVer governance required to signal "this upgrade requires integration changes." Additionally, tool descriptions can change between versions in ways that affect agent behavior without triggering hard errors (issue: "Your MCP Server's Tool Descriptions Changed Last Night. Nobody Noticed.").

**How to avoid:**
Pin MCP server connections to a specific protocol version in configuration. Document the tested version for each integration in a `mcp-integrations.json` manifest. Implement a version-check step in the MCP orchestration layer: on connection, compare the server's reported protocol version against the pinned version; if they diverge, log a warning and optionally fail rather than silently operating against an untested version. For GitHub, Linear, and Figma specifically: maintain a contract test suite (lightweight tests that verify the specific tools PDE uses still behave as expected) that runs against the live server monthly. Treat a contract test failure as a regression that blocks the next PDE release, not a background noise event.

**Warning signs:**
- No protocol version is pinned in the MCP connection configuration
- Integration tests only test against a mock server, not the live service
- A previously working integration suddenly fails with "tool not found" or incorrect return shapes

**Phase to address:** Each individual MCP integration phase — pinning and contract tests must be built with the integration, not added later. The GitHub integration phase should establish the pattern; subsequent integrations inherit it.

---

### Pitfall 4: Configuration Sprawl as Each Integration Adds Its Own Credential Store

**What goes wrong:**
GitHub integration adds `GITHUB_TOKEN` to `.env`. Linear integration adds `LINEAR_API_KEY`. Figma adds `FIGMA_ACCESS_TOKEN`. Pencil adds its own auth configuration. Each integration invents its own configuration key naming, storage location, validation logic, and error message. After five integrations, users face a ten-key `.env` file with no documentation about what each key does, which integrations depend on which keys, and which keys are optional vs. required. Setup instructions become a multi-page document users skip, then ask for help.

**Why it happens:**
Integrations are built one at a time by following whatever pattern the individual MCP server documentation recommends. No cross-integration configuration schema is designed upfront. The first integration sets a bad precedent; subsequent integrations copy it because "that's how we did GitHub."

**How to avoid:**
Design a unified MCP configuration schema before building the first integration. All credentials live in one place (`.planning/mcp-config.json` or Claude Code's project-level settings). The schema must specify: service name, credential type (oauth/api-key/token), required vs. optional, scopes needed, and a documentation URL. The MCP orchestration layer reads from this single config; individual integration modules never read from environment variables directly — they receive their credentials from the orchestration layer. Build a `/pde:mcp-status` command in the first phase that shows all configured integrations, their auth status, and what features they enable/disable when unavailable.

**Warning signs:**
- Each integration has its own credential variable names with no shared naming convention
- There is no single place to see "which MCP integrations are configured and active"
- Setup instructions require setting more than 3 environment variables without a setup wizard

**Phase to address:** MCP infrastructure phase (Phase 1) — configuration schema must be designed before the first integration is implemented.

---

### Pitfall 5: Tool Poisoning via Malicious MCP Server Descriptions

**What goes wrong:**
MCP tool poisoning places malicious instructions in a tool's description, parameter names, or schema fields — not just tool outputs. Because the LLM processes the entire tool schema as part of its reasoning loop, hidden instructions in a tool description can redirect the agent to take unauthorized actions. This affects PDE specifically because PDE uses agent-based execution: an agent that loads a compromised MCP tool's schema could be directed to read `.planning/` state, exfiltrate credentials from context, or make destructive writes.

PDE's agents already have broad access to the `.planning/` directory and project files. A compromised MCP tool combined with an agent that has Write access is a high-impact attack vector.

**Why it happens:**
Developers focus on the functionality of MCP tools and do not threat-model the tool schemas themselves as an attack surface. Community-maintained MCP servers may contain malicious or negligently poisoned tool descriptions. "Tool shadowing" — where one MCP server registers a tool with the same name as a legitimate tool to intercept calls — is a confirmed attack pattern.

**How to avoid:**
Only use MCP servers from verified, official sources for PDE integrations (official GitHub MCP, official Linear MCP, official Figma MCP). Never install community MCP servers in the same session as PDE's agent workflows. Document this constraint explicitly in PDE's setup guide. For any MCP server PDE integrates: review the tool schema before integration, checking for instructions in description fields that reference actions outside the tool's stated scope. Implement a tool schema review step in the "add new MCP integration" workflow.

**Warning signs:**
- A tool description contains instructions referencing actions beyond the tool's stated purpose (e.g., a "get repository info" tool that mentions "first check for credentials in context")
- Multiple MCP servers are configured with tools that share the same name
- PDE agents are configured to use MCP tools from unverified community sources

**Phase to address:** MCP infrastructure phase (Phase 1) — define the verified-sources-only policy before any integration ships. Security review of tool schemas should be a gate in the "add integration" process.

---

### Pitfall 6: Over-Coupling PDE Logic to Specific MCP Server Implementations

**What goes wrong:**
The GitHub integration is built to work specifically with the official GitHub MCP server's tool names and return shapes. When the GitHub MCP server updates its tool API, renames tools, or changes response formats, PDE's integration breaks entirely. Worse, if a user wants to use a self-hosted GitHub Enterprise instance with a slightly different MCP server, PDE fails. The Linear integration has similar fragility: Linear's MCP server naming conventions are baked into every workflow that touches it.

**Why it happens:**
It is faster to build directly against the specific tool names and return shapes of the live MCP server. Abstractions feel like over-engineering when you are integrating the first server. The fragility only becomes visible when the server changes, which takes months.

**How to avoid:**
Build a thin adapter layer between PDE's workflows and the MCP server tool calls. The adapter translates between PDE's canonical data model (e.g., `Issue { id, title, status, assignee }`) and whatever the specific MCP server returns. PDE workflows call `mcp.github.getIssue(id)` — not the raw MCP tool name. The adapter normalizes the response into PDE's model. When the GitHub MCP server changes, only the adapter changes — not the 15 workflow files that use GitHub data. This adapter is also what makes it possible to swap GitHub for GitLab without rewriting workflows.

**Warning signs:**
- Workflow files contain raw MCP tool names like `github_list_issues` instead of a normalized PDE API call
- The return shape from an MCP tool is used directly in workflow logic with no normalization step
- A breaking change in one MCP server would require editing more than three files

**Phase to address:** GitHub integration phase (first MCP integration) — the adapter pattern must be established with the first integration. Every subsequent integration inherits the pattern.

---

### Pitfall 7: Rate Limiting Creates Silent Failures in Long Pipeline Runs

**What goes wrong:**
GitHub's API rate limit is 5,000 requests/hour for authenticated users and 60/hour for unauthenticated. Linear has per-minute rate limits. Figma has per-second rate limits on design file reads. During a long PDE build pipeline that calls MCP tools at multiple stages, rate limits can be exhausted mid-run. The failure mode is not an obvious error — it is a tool call that returns an empty result or a 429 response that the agent interprets as "no issues found" or "no design files available" rather than "rate limited." The pipeline continues with incomplete data.

**Why it happens:**
Rate limit responses are treated as business logic responses by the LLM. An agent that receives a 429 does not naturally distinguish "the service says try again" from "the service says there is nothing here." Without explicit rate limit handling in the adapter layer, the agent makes incorrect downstream decisions based on empty-due-to-rate-limit results.

**How to avoid:**
The MCP adapter layer must explicitly handle 429 responses: detect them, log them with the retry-after time, halt the current operation, and surface a human-readable error to the user rather than passing empty results to the workflow. Do not implement automatic retry with exponential backoff inside the workflow — this creates unpredictable execution times. Instead, pause and inform the user: "GitHub rate limit reached. 47 minutes until reset. You can continue the pipeline from `/pde:build --from wireframe` when the limit resets." Track cumulative API call counts per service in the session and warn proactively when 80% of a rate limit is consumed.

**Warning signs:**
- The integration handles 429 responses by returning empty results
- No API call count tracking exists across a pipeline run
- A pipeline that "ran successfully" produced fewer GitHub issues than are known to exist

**Phase to address:** GitHub integration phase (first MCP integration) — rate limit handling must be built into the adapter before any pipeline integration work begins.

---

### Pitfall 8: State Synchronization Conflicts Between File-Based .planning/ State and External Service State

**What goes wrong:**
PDE's planning state is file-based: DESIGN-STATE.md, design-manifest.json, artifact files. GitHub, Linear, and Jira each have their own state model: issues have statuses, assignees, labels, comments. When PDE syncs requirements from Linear into a phase plan, the plan and the Linear board can diverge: a task is marked done in Linear but still open in PLAN.md, or vice versa. When this divergence is not detected, agents receive contradictory signals about what is complete. The file-based state is authoritative for PDE's execution engine; the external service is authoritative for the team's planning view. The two sources of truth are never reconciled.

**Why it happens:**
The PDE file-based model was designed for single-user autonomous operation — it has no concept of external authoritative state. Integrating services with their own state creates a bidirectional sync problem that the architecture did not anticipate. Developers build the "import from Linear" path and declare integration complete, without building the "detect divergence" or "reconcile conflict" paths.

**How to avoid:**
PDE's external service integrations must be read-first, write-explicit. Reading from GitHub/Linear/Figma is always acceptable. Writing back to these services (closing issues, updating statuses, pushing comments) is only acceptable on explicit user instruction — never as an automatic side effect of pipeline execution. This eliminates the bidirectional sync problem at the cost of requiring manual reconciliation. For the v0.5 milestone, do not attempt bidirectional sync — make PDE a consumer of external service data, not a writer. Document this scope limit explicitly so users understand that closing a PDE task does not close the GitHub issue.

**Warning signs:**
- Integration writes to external services as an automatic side effect of pipeline execution
- PLAN.md and the linked Linear board show different task statuses with no reconciliation view
- A workflow file writes to both `.planning/` state and calls an MCP "update" or "close" tool in the same execution

**Phase to address:** Each integration phase — the read-first/write-explicit contract must be established in the first integration and enforced in all subsequent ones.

---

### Pitfall 9: UX Degrades to "Service Unavailable" Walls When External Services Are Down

**What goes wrong:**
A user runs `/pde:build` at 9am. GitHub is experiencing an incident. The build pipeline starts, reaches the GitHub integration step, fails with a connection error, and stops. The user cannot continue their pipeline even for stages that have no GitHub dependency. The entire PDE experience degrades to "unavailable" because one optional external service is unavailable. This is the single most common user complaint about integration-heavy tools.

**Why it happens:**
Integrations are built as blocking dependencies: if the service is unavailable, the skill fails. The "service is unavailable" case is not explicitly designed as a first-class path. It is handled by the underlying error propagation, which means the user sees whatever error the MCP transport emits rather than a human-readable "this is optional, here is how to continue."

**How to avoid:**
Every MCP integration in PDE must have a documented degraded mode. The degraded mode must be explicitly designed before the integration is built, not added as an afterthought. For GitHub: degraded mode is "no issue context; proceed with user-provided description only." For Linear: degraded mode is "no requirement sync; use REQUIREMENTS.md as sole requirements source." For Figma: degraded mode is "no design import; use local artifacts only." The `/pde:mcp-status` command surfaces which services are available and what degraded mode each unavailable service triggers. Skills must begin with a capabilities check and communicate clearly which features are operating in degraded mode before proceeding.

**Warning signs:**
- A skill with MCP dependencies fails entirely when the MCP server is unreachable
- There is no local fallback path for any MCP-enhanced skill
- The user cannot tell which pipeline stages require which MCP services

**Phase to address:** MCP infrastructure phase (Phase 1) — degraded mode contracts must be defined for every planned integration before any integration is built.

---

### Pitfall 10: Exposing PDE as an MCP Server Leaks Planning State to External Consumers

**What goes wrong:**
PDE's PROJECT.md considers exposing PDE as an MCP server — making `.planning/` state available to other tools. If implemented naively, this means any MCP client that connects to PDE's server can read the entire `.planning/` directory: PLAN.md with task details, STATE.md with execution logs, design artifacts, and potentially files that contain sensitive project information. The MCP server exposes tools like `read_planning_state` with no access control, and any MCP client that connects gets full read access to the project's internal state.

**Why it happens:**
PDE's file-based model was designed for local, single-user access. There is no authentication layer on `.planning/` — the operating system user has full access. When this model is exposed over MCP, the implicit "local user trust" assumption is violated: MCP clients may run in contexts with different trust levels, and MCP connections can traverse network boundaries.

**How to avoid:**
Exposing PDE as an MCP server is explicitly out of scope for v0.5 unless a security model is designed first. If this feature is re-scoped into v0.5, the minimum viable security model is: (1) tool-level access control (define explicitly which planning state is safe to expose: high-level project status is safe; detailed execution logs and design artifacts are not); (2) connection authentication (only accept connections from explicitly whitelisted clients); (3) no tool that exposes raw file contents — only structured data views. Do not ship PDE-as-MCP-server as part of the initial integrations milestone without this security model in place.

**Warning signs:**
- The MCP server exposes a `read_file` or `list_planning_state` tool with no filtering
- There is no authentication on the MCP server's incoming connections
- PDE-as-MCP-server is built alongside the consumer integrations, competing for the same milestone scope

**Phase to address:** If in scope: a dedicated security-design phase must precede any PDE-as-MCP-server implementation phase. If out of scope for v0.5: flag it as a future milestone with a security prerequisite.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding MCP tool names in workflow files | Faster initial integration | Every tool rename or server update requires editing multiple workflow files | Never — use an adapter layer |
| Storing OAuth tokens in `.env` without a unified config schema | Simple to document | Configuration sprawl; no central visibility into which integrations are active | MVP only, with explicit debt ticket |
| Building each integration without a degraded mode | Faster to ship | Any service outage degrades entire PDE experience | Never — degraded mode is a required part of integration design |
| No contract tests against live MCP servers | No test infrastructure needed | Silent breakage when server updates tool schemas | Never for production integrations |
| Bidirectional sync between PLAN.md and external services | Richer integration | State conflict and data loss; two sources of truth diverge | Never — read-first/write-explicit only |
| Using community MCP servers without schema review | Access to more tools faster | Tool poisoning attack surface; unverified behavior | Never — verified sources only |
| Skipping version pinning on MCP server protocol | No version management needed | Breaking changes appear silently every 3 months | Never for integrations that PDE ships as supported |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub MCP | Using unauthenticated connection (60 req/hr limit) | Always authenticate; document GITHUB_TOKEN requirement in setup |
| GitHub MCP | Assuming issue list is complete when result is empty | Check for rate limit 429 before treating empty result as "no issues" |
| Linear MCP | Writing task status back to Linear automatically after pipeline execution | Read only; user must explicitly push status updates |
| Figma MCP | Loading entire design file (can be 10MB+) into context | Request only specific frames/components; never load whole file |
| Figma MCP | Assuming design file is the source of truth for PDE's design state | DESIGN-STATE.md is authoritative; Figma is an import source, not an override |
| Pencil MCP | Treating visual canvas as a live sync target | Pencil is an output consumer, not a state manager |
| Any SSE-based MCP | Building stateful operations that depend on connection staying alive | All MCP calls must be atomic; no multi-step operations that require persistent connection |
| Any OAuth-based MCP | Assuming token is valid after context compaction | Always reload from persistent storage; never assume in-context auth state |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all GitHub issues at pipeline start | Slow startup; may exhaust rate limits on large repos | Fetch only issues relevant to current phase scope; use labels/milestones as filters | Any repo with more than 200 open issues |
| Loading Figma design file per skill invocation | 5-15 second delays; Figma rate limits triggered | Cache Figma responses in `.planning/mcp-cache/` with TTL; invalidate on user command | Any Figma file larger than 2MB |
| Calling MCP tools in a loop over a list of items | Rate limits exhausted quickly; O(n) latency added to pipeline | Batch requests where MCP server supports it; otherwise fetch once and process locally | Any loop with more than 20 iterations |
| MCP server connection handshake on every skill invocation | 200-500ms added to every skill start | Connection pooling or lazy initialization with health check; do not reconnect unless needed | Pipelines with 5+ connected MCP servers |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing API tokens in plaintext `.env` committed to git | Credential exposure in repository history | Add `.env` to `.gitignore`; document required variables in `.env.example` only |
| Using catch-all OAuth scopes (e.g., `repo` instead of `repo:read`) | Blast radius of compromised token includes write access | Request minimum required scopes per integration; document required scopes |
| Logging MCP request payloads that include token values | Credentials appear in session logs | Redact Authorization headers and token values from all logging |
| Installing unverified community MCP servers alongside PDE agents | Tool poisoning attack vector | Only use official MCP servers from verified publishers; document this policy |
| PDE agents having write access to both `.planning/` and external service MCP tools | A compromised tool description could direct an agent to write malicious content | Separate tool permission scopes: planning-write agents do not have MCP write tools; MCP-write tools are only available on explicit user confirmation |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Pipeline fails silently when MCP service is unavailable | User cannot tell why pipeline stopped; no recovery path visible | Show explicit "GitHub unavailable — running in offline mode" status before execution begins |
| Credential setup requires reading multiple documentation pages | High setup friction; users give up before first use | `/pde:mcp-setup` guided wizard that walks through each integration one at a time with inline validation |
| Rate limit hit produces an error that looks like a data error | User thinks their project has no issues, no tasks, no design files | Rate limit errors must always surface with "rate limited — not a data error" messaging |
| Ten separate API key variables with no explanation | Setup feels like configuring enterprise software | Single mcp-config.json with inline comments explaining each field; never more than 2 required credentials per integration |
| No way to see which integrations are active without running a command that fails | User discovers broken auth mid-pipeline | `/pde:mcp-status` available at any time shows each integration's connection state before any pipeline execution |

---

## "Looks Done But Isn't" Checklist

- [ ] **Auth persistence:** OAuth tokens are stored outside conversation context (disk/keychain) and survive context compaction — verify by compacting context and confirming MCP tools still work
- [ ] **Degraded mode:** Every MCP-enhanced skill has a documented fallback path that activates automatically when the service is unreachable — verify by running the skill with the MCP server disabled
- [ ] **Rate limit handling:** The adapter layer returns a human-readable "rate limited" error (not empty results) when a 429 is received — verify by mocking a 429 response and checking what the workflow receives
- [ ] **Version pinning:** Each MCP integration records the tested protocol version in `mcp-integrations.json` — verify by checking the file exists and is populated
- [ ] **Read-first/write-explicit:** No workflow automatically writes to an external service without explicit user confirmation — verify by tracing every MCP write-capable tool call in workflow files
- [ ] **Schema review:** Each integrated MCP server's tool schemas were reviewed before integration for unexpected instructions in description fields — verify by checking the integration review checklist
- [ ] **Unified config:** All MCP credentials are managed through a single config schema — verify by confirming no workflow files read directly from environment variables
- [ ] **Status command:** `/pde:mcp-status` shows connection state for all configured integrations — verify by running it with one service deliberately disabled
- [ ] **Adapter layer:** No raw MCP tool names appear in workflow files — verify by grepping for known tool name patterns (github_list_issues, linear_create_issue) in `workflows/`
- [ ] **Contract tests:** A contract test suite exists for each integration and runs against the live service — verify by running the test suite and confirming at least one tool call per integration is covered

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Auth state lost to context compaction | LOW | Re-authenticate from stored credentials; add persistence layer before next run |
| SSE disconnect crashed session mid-pipeline | MEDIUM | Resume from last completed stage using `--from`; restructure MCP calls to be atomic before next run |
| Protocol version breaking change broke integration | MEDIUM | Pin to working version; update adapter for new schema; run contract tests before re-enabling |
| Configuration sprawl with inconsistent credential naming | MEDIUM | Migrate to unified config schema; update all workflow files to use config loader |
| Rate limit exhausted mid-pipeline with data loss | LOW | Resume from affected stage; add rate limit tracking before next run |
| Tool poisoning attack via compromised MCP server description | HIGH | Disconnect the affected MCP server immediately; audit all actions taken during the affected session; rotate any credentials that were accessible; replace with verified server source |
| State divergence between PLAN.md and external service | MEDIUM | Declare PLAN.md authoritative; manually reconcile with external service; establish read-only policy for future |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Auth state lost to context compaction (Pitfall 1) | Phase 1: MCP infrastructure | Context compaction test: auth still works after compaction |
| SSE disconnect crashes session (Pitfall 2) | Phase 1: MCP infrastructure | Disable MCP server mid-pipeline: workflow continues in degraded mode |
| Protocol versioning breaks integrations (Pitfall 3) | Each integration phase | Version pinned in manifest; contract test suite passes against live server |
| Configuration sprawl (Pitfall 4) | Phase 1: MCP infrastructure | Single config schema; no direct env variable reads in workflow files |
| Tool poisoning via schema injection (Pitfall 5) | Phase 1: MCP infrastructure | Schema review checklist completed before each integration merges |
| Over-coupling to specific server implementations (Pitfall 6) | Phase 2: GitHub integration (sets adapter pattern) | No raw MCP tool names in any workflow file |
| Rate limiting creates silent failures (Pitfall 7) | Phase 2: GitHub integration (sets rate limit handling) | Mock 429: workflow receives human-readable error, not empty result |
| State sync conflicts between .planning/ and external (Pitfall 8) | Each integration phase | No workflow writes to external service without explicit user action |
| UX degrades entirely when service is down (Pitfall 9) | Phase 1: MCP infrastructure | Disable all MCP servers: pipeline still runs with degraded mode messaging |
| PDE-as-MCP-server leaks planning state (Pitfall 10) | Defer unless security model designed first | N/A for v0.5 if deferred |

---

## Sources

- Claude Code issue tracker, issue #34832: "Cowork MCP connectors lose auth after context compaction" — HIGH confidence (confirmed bug, direct source)
- Claude Code issue tracker, issue #18557: "SSE MCP server disconnection crashes session instead of graceful degradation" — HIGH confidence (confirmed bug, direct source)
- modelcontextprotocol.info/docs/best-practices/ — HIGH confidence (official MCP documentation)
- modelcontextprotocol.io/specification/versioning — HIGH confidence (official MCP specification)
- Nordic APIs, "The Weak Point in MCP Nobody's Talking About: API Versioning" — MEDIUM confidence (verified pattern; consistent with spec analysis)
- GitHub issue SEP-1400: "Semantic Versioning for MCP Specification" — HIGH confidence (official MCP repository discussion)
- Phil Schmid, "MCP is Not the Problem, It's your Server: Best Practices for Building MCP Servers" — MEDIUM confidence (practitioner article; verified against official docs)
- Invariant Labs, "MCP Security Notification: Tool Poisoning Attacks" — MEDIUM confidence (security research; consistent with MCP architecture)
- Nudge Security, "MCP Security Risks and Best Practices" — MEDIUM confidence (verified against other security sources)
- Elastic Security Labs, "MCP Tools: Attack Vectors and Defense Recommendations" — MEDIUM confidence (security research organization)
- ByteBridge Medium, "Managing MCP Servers at Scale: The Case for Gateways, Lazy Loading, and Automation" — LOW confidence (single practitioner source; consistent with observed patterns)
- PDE PROJECT.md v0.5 milestone context — HIGH confidence (primary source)
- PDE v0.4 architecture (file-based state, agent execution model) — HIGH confidence (direct codebase inspection)

---

*Pitfalls research for: Adding MCP server integrations to an existing file-based Claude Code plugin (PDE v0.5)*
*Researched: 2026-03-18*
