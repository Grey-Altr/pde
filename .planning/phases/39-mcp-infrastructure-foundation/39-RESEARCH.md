# Phase 39: MCP Infrastructure Foundation - Research

**Researched:** 2026-03-18
**Domain:** Claude Code MCP connection management, adapter layer design, connection state persistence, security policy enforcement
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | User can view all MCP integration connection states via `/pde:mcp-status` | Claude Code `/mcp` command reveals per-server status; `claude mcp list` + programmatic probe gives the same data; mcp-bridge.cjs can aggregate into a single status view |
| INFRA-02 | User can connect to external MCP servers via guided `/pde:connect` flow with auth instructions | `claude mcp add` + OAuth 2.0 flow via `/mcp` command; connection confirmation proven via probe attempt; per-server auth instructions documented in research |
| INFRA-03 | All MCP-dependent commands detect server availability at runtime and degrade gracefully | Probe/use/degrade pattern already in mcp-integration.md; mcp-bridge.cjs implements it centrally; all callers use the bridge, not raw MCP tools |
| INFRA-04 | MCP connection metadata stored in unified `.planning/mcp-connections.json` schema (gitignored, no credentials) | Claude Code stores auth tokens in system keychain / credentials file, NOT in .mcp.json; mcp-connections.json stores only metadata (server name, transport, url, connected_at, last_probe_at, status) |
| INFRA-05 | Verified-sources-only security policy — only official MCP servers from GitHub, Linear, Figma, Pencil, Atlassian | Claude Code managed settings support `allowedMcpServers` / `deniedMcpServers` policy; plugin-level enforcement via mcp-bridge.cjs allowlist is the correct implementation path for PDE |
| INFRA-06 | MCP adapter layer normalizes raw tool names into PDE canonical API calls (insulates workflows from server-side renames) | Adapter pattern: mcp-bridge.cjs wraps all MCP calls; canonical API map defined once; workflows import `bridge.call('pde:github:list-issues')` not `mcp__github__listIssues` |
</phase_requirements>

---

## Summary

Phase 39 builds the MCP integration backbone that all five subsequent integration phases (40-44) depend on. The central deliverable is `bin/lib/mcp-bridge.cjs` — a CommonJS module that implements probe/availability detection, graceful degradation, canonical tool name mapping, auth-flow guidance, and connection metadata persistence. Without this layer, each integration workflow would duplicate probe logic, handle its own tool-name drift, and have no shared policy enforcement.

PDE already has the probe/use/degrade pattern documented in `references/mcp-integration.md`, but only at the skill (prompt) level. Phase 39 promotes that pattern into executable code so it is reliable, testable, and DRY. Claude Code's MCP subsystem manages the actual transport connections; PDE's mcp-bridge.cjs is a coordination and abstraction layer that wraps calls to those connections, not a new connection manager.

The security constraint (INFRA-05) is enforced at two independent levels: Claude Code's `allowedMcpServers` managed policy (for system-level enforcement) and the mcp-bridge.cjs allowlist check (for plugin-level enforcement and user-facing error messages). The two-level approach means PDE produces a clear, named-policy rejection even in environments where managed settings are not deployed.

**Primary recommendation:** Build `bin/lib/mcp-bridge.cjs` first (the adapter + probe layer), then write `/pde:connect` and `/pde:mcp-status` as thin wrappers over it. Everything else in phases 40-44 imports from the bridge — never calls MCP tools directly.

---

## Standard Stack

### Core
| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| Node.js CommonJS module (`bin/lib/mcp-bridge.cjs`) | Node 20+ (existing constraint) | Central adapter layer — all MCP calls flow through here | Consistent with existing zero-npm-dependency bin/lib pattern; no new deps needed |
| Claude Code `claude mcp` CLI | Current (installed) | Add/list/remove MCP server registrations at local/project/user scope | Official API for managing MCP connections in Claude Code |
| Claude Code `/mcp` in-session command | Current | OAuth flow initiation and per-server connection status | Official way to authenticate and verify MCP connections |
| MCP stdio transport (npx-based) | Per-server spec | GitHub, Linear, Jira, Pencil MCP servers | Standard MCP transport; managed by Claude Code runtime |
| MCP HTTP transport | Per-server spec | Figma MCP (`https://mcp.figma.com/mcp`) | Official Figma server uses HTTP, not stdio |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing `bin/lib/core.cjs` | In-repo | File I/O, JSON helpers, path utilities | All file operations in mcp-bridge.cjs delegate here |
| Existing `bin/lib/config.cjs` | In-repo | `.planning/config.json` read/write | Reading task_tracker config for Linear vs Jira toggle |
| `.planning/mcp-connections.json` (new file) | Custom schema | Persists connection metadata between sessions | Written by `/pde:connect`; read by `/pde:mcp-status` and all probe calls |

### Approved MCP Servers (INFRA-05 allowlist)
| Server | Install Command | Transport | Auth Method |
|--------|-----------------|-----------|-------------|
| GitHub MCP | `claude mcp add --transport http github https://api.githubcopilot.com/mcp/` | HTTP | OAuth 2.0 via `/mcp` |
| Linear MCP | `claude mcp add --transport stdio linear -- npx -y @linear/mcp-server` | stdio | API key via env var `LINEAR_API_KEY` |
| Figma MCP | `claude mcp add --transport http figma https://mcp.figma.com/mcp` | HTTP | OAuth 2.0 via `/mcp` |
| Pencil MCP | TBD (see Open Questions) | stdio | TBD |
| Atlassian MCP | `claude mcp add --transport stdio jira -- npx -y @atlassian/jira-mcp` | stdio | OAuth / API token |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single mcp-bridge.cjs | Per-workflow probe logic | Per-workflow is already what mcp-integration.md describes for skills; Phase 39 escalates to code because multiple integration phases will need it |
| `.planning/mcp-connections.json` | Claude Code's `~/.claude.json` internal storage | PDE doesn't have read access to `~/.claude.json`; own metadata file is the only viable option |
| Plugin `allowedMcpServers` in managed settings | Managed-policy enforcement only | Managed settings require admin deployment; plugin-level allowlist works for all users without sys-admin access |

---

## Architecture Patterns

### Recommended File Structure (new files only)

```
bin/lib/
├── mcp-bridge.cjs          # NEW — central adapter + probe + allowlist
.planning/
├── mcp-connections.json    # NEW — connection metadata (gitignored, no creds)
commands/
├── mcp-status.md           # NEW — /pde:mcp-status command
├── connect.md              # NEW — /pde:connect command
workflows/
├── mcp-status.md           # NEW — status display logic
├── connect.md              # NEW — guided auth flow logic
references/
└── mcp-integration.md      # EXISTING — already documents probe/use/degrade
```

### Pattern 1: mcp-bridge.cjs Canonical Tool Map

**What:** A JavaScript object mapping PDE canonical names to raw MCP tool names. All callers in phases 40-44 import this map and call `bridge.call(canonicalName, args)` rather than `mcp__github__listIssues` directly.

**When to use:** Any workflow that reads from or writes to an external MCP server.

**Example:**
```javascript
// bin/lib/mcp-bridge.cjs — canonical tool map (illustrative, Phase 40 fills real tool names)
const TOOL_MAP = {
  'github:list-issues':        'mcp__github__listIssues',
  'github:create-pr':          'mcp__github__createPullRequest',
  'linear:list-issues':        'mcp__linear__listIssues',
  'figma:get-variables':       'mcp__figma__getVariableDefs',
  'pencil:set-variables':      'mcp__pencil__set_variables',
  'pencil:capture-screenshot': 'mcp__pencil__capture_screenshot',
};

// Callers do this — insulated from server-side renames:
// const issues = await bridge.call('github:list-issues', { repo: 'foo/bar' });
```

**Source:** STATE.md architecture constraint: "Adapter layer normalizing raw MCP tool names into PDE canonical API calls is established in Phase 40 (GitHub) and inherited by all subsequent integrations". Phase 39 creates the map skeleton; phases 40-44 populate it.

### Pattern 2: Probe-Then-Degrade in mcp-bridge.cjs

**What:** `bridge.probe(serverKey)` attempts a lightweight MCP tool call and returns `{ available: true|false, status: 'connected'|'disconnected'|'degraded' }`. Every workflow calls this before using any MCP capability.

**When to use:** Start of every MCP-dependent workflow step.

**Example:**
```javascript
// bin/lib/mcp-bridge.cjs
async function probe(serverKey) {
  const server = APPROVED_SERVERS[serverKey];
  if (!server) {
    return { available: false, status: 'unknown', reason: 'not_in_allowlist' };
  }
  try {
    // Attempt the server's designated probe tool call (timeout via Promise.race)
    const result = await Promise.race([
      callRawTool(server.probeTool, server.probeArgs),
      timeout(server.probeTimeoutMs)
    ]);
    return { available: true, status: 'connected', probeResult: result };
  } catch (e) {
    return { available: false, status: 'disconnected', reason: e.message };
  }
}
```

**Important:** The STATE.md research flag notes "Validate whether `listTools` is callable programmatically within skill context before finalizing probe implementation approach." Web research confirms that `listTools` is part of MCP's dynamic tool discovery (used internally by Claude Code's Tool Search feature). It is NOT directly callable as a tool from within skill/workflow context. The correct probe approach is to attempt the server's lightest actual tool call and catch errors — exactly what the existing mcp-integration.md describes. This confirms the approach above.

### Pattern 3: mcp-connections.json Schema

**What:** A gitignored JSON file tracking connection metadata. No credentials. Auth tokens are in the system keychain (managed by Claude Code's OAuth layer).

**When to use:** Written on each successful `/pde:connect`; read by `/pde:mcp-status` and probe calls.

**Example:**
```json
{
  "schema_version": "1.0",
  "connections": {
    "github": {
      "server_key": "github",
      "display_name": "GitHub",
      "transport": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "status": "connected",
      "connected_at": "2026-03-18T10:00:00Z",
      "last_probe_at": "2026-03-18T12:30:00Z",
      "last_probe_status": "connected"
    }
  }
}
```

**What it MUST NOT contain:** API keys, OAuth tokens, secrets of any kind. Claude Code stores those in macOS Keychain / a credentials file.

### Pattern 4: Security Allowlist Enforcement

**What:** mcp-bridge.cjs maintains a hardcoded `APPROVED_SERVERS` map. Any call with a server key not in this map is rejected immediately with a policy message.

**Example:**
```javascript
const APPROVED_SERVERS = {
  github:    { displayName: 'GitHub',    probeTool: 'mcp__github__...',   ... },
  linear:    { displayName: 'Linear',    probeTool: 'mcp__linear__...',   ... },
  figma:     { displayName: 'Figma',     probeTool: 'mcp__figma__...',    ... },
  pencil:    { displayName: 'Pencil',    probeTool: 'mcp__pencil__...',   ... },
  atlassian: { displayName: 'Atlassian', probeTool: 'mcp__atlassian__...', ... },
};

function assertApproved(serverKey) {
  if (!APPROVED_SERVERS[serverKey]) {
    throw new PolicyError(
      `"${serverKey}" is not an approved MCP server.\n` +
      `PDE only connects to: ${Object.keys(APPROVED_SERVERS).join(', ')}.\n` +
      `See .planning/phases/39-mcp-infrastructure-foundation/ for the security policy.`
    );
  }
}
```

### Pattern 5: /pde:mcp-status Display Format

**What:** Reads mcp-connections.json and runs a probe for each registered connection. Prints a status table.

**Example output:**
```
MCP Integration Status

  github     connected    Last probe: 2 min ago
  linear     disconnected Run /pde:connect linear to authenticate
  figma      --           Not configured. Run /pde:connect figma
  pencil     --           Not configured. Run /pde:connect pencil
  atlassian  --           Not configured. Run /pde:connect atlassian

2/5 integrations active. Run /pde:connect <name> to add.
```

### Anti-Patterns to Avoid

- **Direct MCP tool calls in workflows:** Workflows MUST call `bridge.call()`, never `mcp__github__listIssues` directly. Server-side renames break anything that uses raw tool names.
- **Storing credentials in mcp-connections.json:** Claude Code's OAuth layer handles token storage in the system keychain. PDE must not duplicate this.
- **Probing with `listTools`:** `listTools` is a Claude Code internal MCP discovery mechanism, not a callable tool from within skill/workflow context. Use a lightweight real tool call as the probe.
- **Hard-failing on missing MCP servers:** Every MCP-dependent command must complete in degraded mode with a clear message. Crashing is not acceptable (INFRA-03).
- **Skipping the allowlist in /pde:connect:** The connect flow MUST check APPROVED_SERVERS before attempting any connection. The rejection message must name which servers ARE approved.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth token storage | Custom credentials file or keychain calls | Claude Code's built-in OAuth flow (`/mcp` + `claude mcp add`) | Claude Code already manages tokens securely in the system keychain with auto-refresh |
| MCP server connection lifecycle | Custom connection pooling or retry loops | Claude Code's MCP runtime manages connections | PDE doesn't control when Claude Code starts/stops MCP servers; probe-then-use is the correct model |
| MCP server discovery | Scanning `~/.claude.json` or running `claude mcp list` programmatically | Maintain APPROVED_SERVERS map in mcp-bridge.cjs | PDE needs a fixed, policy-controlled allowlist, not dynamic discovery of whatever the user has installed |
| Auth token refresh | Custom OAuth refresh logic | Claude Code's automatic token refresh | OAuth token lifecycle is handled by Claude Code automatically |
| Transport-level MCP protocol | Custom stdio/HTTP MCP client | Claude Code's built-in MCP client | Claude Code IS the MCP client; PDE skills just call MCP tools through Claude Code |

**Key insight:** Claude Code is the MCP runtime. PDE's job is to coordinate, policy-check, and adapt — not to implement MCP transport. Every custom transport implementation would fight Claude Code's own MCP subsystem and lose.

---

## Common Pitfalls

### Pitfall 1: Credentials in mcp-connections.json
**What goes wrong:** A developer stores API keys or OAuth tokens in the metadata file for convenience.
**Why it happens:** The file is the natural place to "remember" everything about a connection.
**How to avoid:** The schema explicitly has no credential fields. mcp-bridge.cjs must have no code path that writes secrets to this file.
**Warning signs:** Any field named `token`, `secret`, `key`, `password`, `auth` in mcp-connections.json.

### Pitfall 2: Treating Probe Success as Guaranteed
**What goes wrong:** Workflow assumes `probe()` success means all tool calls will succeed, so it doesn't handle runtime MCP failures.
**Why it happens:** Probe and actual use are two separate network calls; network state can change between them.
**How to avoid:** Every `bridge.call()` wraps in try/catch and degrades on failure even after a successful probe.
**Warning signs:** Workflows with no error handling after MCP tool calls.

### Pitfall 3: `listTools` as the Probe Mechanism
**What goes wrong:** Probe implementation tries to call `listTools` (the MCP protocol's tool discovery endpoint) as if it were a Claude Code tool.
**Why it happens:** STATE.md research flag mentions this as an open question, making it tempting to try.
**How to avoid:** `listTools` is not exposed as a callable tool in Claude Code skill context. Use the server's lightest real tool call instead (e.g., for GitHub, call a read-only tool like `list_issues` with minimal args).
**Warning signs:** Any `mcp__*__listTools` call in workflow code.

### Pitfall 4: mcp-connections.json Missing from .gitignore
**What goes wrong:** Connection metadata gets committed to the project repo.
**Why it happens:** Developer forgets to add the gitignore entry.
**How to avoid:** Phase 39 Wave 0 task adds the .gitignore entry BEFORE any connection metadata is written.
**Warning signs:** `git status` shows mcp-connections.json as a tracked file.

### Pitfall 5: Adapter Map Populated Before Tool Names Are Known
**What goes wrong:** Phase 39 tries to fill in real tool names for GitHub, Linear, etc. before those integrations are researched.
**Why it happens:** Wanting to "complete" the adapter in one phase.
**How to avoid:** Phase 39 creates the adapter scaffold with placeholder entries. Phases 40-44 replace placeholders with verified tool names from each server.
**Warning signs:** Phase 39 plan tasks that reference specific `mcp__github__*` tool names — those belong in Phase 40 research.

### Pitfall 6: Blocking User on Unavailable MCP (INFRA-03 violation)
**What goes wrong:** A command that depends on GitHub MCP throws an error and stops when GitHub is not connected.
**Why it happens:** Easiest code path is to throw on missing connection.
**How to avoid:** Every command that calls `bridge.probe()` and gets `available: false` must complete its non-MCP work and report what was skipped.
**Warning signs:** Any workflow step with `throw new Error('GitHub not connected')` without a degraded fallback path.

---

## Code Examples

Verified patterns from project context:

### mcp-bridge.cjs Skeleton (Node.js CommonJS, zero new deps)
```javascript
// Source: Derived from bin/lib/core.cjs pattern + mcp-integration.md probe pattern
'use strict';
const fs = require('fs');
const path = require('path');
const { safeReadFile } = require('./core.cjs');

const APPROVED_SERVERS = {
  github:    { displayName: 'GitHub',    transport: 'http',  url: 'https://api.githubcopilot.com/mcp/', probeTimeoutMs: 10000 },
  linear:    { displayName: 'Linear',    transport: 'stdio', probeTool: null /* Phase 40 fills */ },
  figma:     { displayName: 'Figma',     transport: 'http',  url: 'https://mcp.figma.com/mcp',         probeTimeoutMs: 15000 },
  pencil:    { displayName: 'Pencil',    transport: 'stdio', probeTool: null /* Phase 43 fills */ },
  atlassian: { displayName: 'Atlassian', transport: 'stdio', probeTool: null /* Phase 41 fills */ },
};

const TOOL_MAP = {
  // Canonical → raw tool names. Populated by phases 40-44.
  // 'github:list-issues': 'mcp__github__listIssues',
};

const CONNECTIONS_PATH = path.join(process.cwd(), '.planning', 'mcp-connections.json');

function assertApproved(serverKey) {
  if (!APPROVED_SERVERS[serverKey]) {
    const approved = Object.keys(APPROVED_SERVERS).join(', ');
    const err = new Error(
      `"${serverKey}" is not an approved MCP server. PDE only connects to: ${approved}.`
    );
    err.code = 'POLICY_VIOLATION';
    throw err;
  }
}

function loadConnections() {
  const raw = safeReadFile(CONNECTIONS_PATH);
  if (!raw) return { schema_version: '1.0', connections: {} };
  try { return JSON.parse(raw); } catch { return { schema_version: '1.0', connections: {} }; }
}

function saveConnections(data) {
  fs.writeFileSync(CONNECTIONS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { APPROVED_SERVERS, TOOL_MAP, assertApproved, loadConnections, saveConnections };
```

### /pde:connect Command Skeleton (commands/connect.md pattern)
```markdown
---
name: pde:connect
description: Connect PDE to an approved external MCP server with guided auth instructions
argument-hint: "<service>"
allowed-tools:
  - Read
  - Write
  - Bash
---
<objective>
Execute the /pde:connect command.
</objective>

<process>
@workflows/connect.md
</process>
```

### Gitignore Entry
```
# MCP connection metadata — gitignored (no credentials, but still project-local)
.planning/mcp-connections.json
```

### Auth Instructions by Server (for /pde:connect workflow)

**GitHub:**
```
1. Run in terminal: claude mcp add --transport http github https://api.githubcopilot.com/mcp/
2. In Claude Code session: /mcp
3. Select "github" → "Authenticate" → follow browser flow
4. Return here and run /pde:connect github --confirm
```

**Figma:**
```
1. Run: claude mcp add --transport http figma https://mcp.figma.com/mcp
2. In Claude Code: /mcp → select "figma" → "Authenticate" → browser flow
3. Run /pde:connect figma --confirm
```

**Linear:**
```
1. Get your Linear API key: linear.app/settings/api
2. Run: claude mcp add --transport stdio --env LINEAR_API_KEY=<your-key> linear -- npx -y @linear/mcp-server
3. Run /pde:connect linear --confirm
```

**Atlassian (Jira):**
```
1. Get your Atlassian API token: id.atlassian.com/manage-profile/security
2. Run: claude mcp add --transport stdio --env ATLASSIAN_EMAIL=<email> --env ATLASSIAN_TOKEN=<token> jira -- npx -y @atlassian/jira-mcp
3. Run /pde:connect atlassian --confirm
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SSE transport for remote MCP servers | HTTP (Streamable HTTP) transport | Early 2026 | Figma, GitHub use HTTP; SSE is deprecated — don't use SSE for new servers |
| Manual auth configuration via config files | OAuth 2.0 via `/mcp` in-session command | 2026 | Auth tokens stored in system keychain automatically; no manual token management |
| All MCP tool definitions loaded upfront | MCP Tool Search (deferred loading) | Jan 2026 | 85% context savings; tools load on demand; enabled by default |
| Per-scope config in multiple files | Three-scope model: local/project/user | Current | local = per-project private; project = .mcp.json (shared); user = cross-project |

**Deprecated/outdated:**
- SSE transport: Deprecated in favor of HTTP (Streamable HTTP). Only use stdio and HTTP.
- `--scope project` was previously called `--scope local`: Terminology changed; `project` now means .mcp.json-based shared config.

---

## Open Questions

1. **Pencil MCP tool names and install command**
   - What we know: `set_variables` and `capture_screenshot` are cited in REQUIREMENTS.md/STATE.md as Pencil tool names (MEDIUM confidence, sourced from community articles)
   - What's unclear: Official Pencil MCP package name, exact install command, probe tool to use
   - Recommendation: Phase 39 leaves Pencil entry as a placeholder `probeTool: null` in APPROVED_SERVERS. Phase 43 research resolves this before populating. STATE.md already flags this: "validate in real Pencil + Claude Code + VS Code environment before committing workflow logic."

2. **Atlassian MCP package name**
   - What we know: `@atlassian/jira-mcp` is the presumed package name (MEDIUM confidence)
   - What's unclear: Whether this is an official Atlassian-published package vs community (`sooperset/mcp-atlassian`)
   - Recommendation: Phase 41 research resolves. Phase 39 uses the official Atlassian package name as placeholder; Phase 41 corrects if needed.

3. **Linear MCP package name**
   - What we know: `@linear/mcp-server` is referenced in the existing mcp-integration.md reference catalog
   - What's unclear: Whether `@linear/mcp-server` or `linear-mcp-server` is the correct npm package
   - Recommendation: Phase 41 research verifies. Phase 39 uses `@linear/mcp-server` as placeholder.

4. **mcp-connections.json location**
   - What we know: `.planning/` is the established home for PDE state files
   - What's unclear: Whether this file should live in `.planning/` (project state) or `~/.claude/` (user state)
   - Recommendation: `.planning/mcp-connections.json` is correct — it is project-scoped connection state. User-scoped auth is handled by Claude Code. No ambiguity.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — PDE uses Claude Code Nyquist assertions (inline behavioral checks in workflow output), not a traditional test framework |
| Config file | None |
| Quick run command | `/pde:test mcp-bridge` (post-Phase 39, once test skill covers new files) |
| Full suite command | `/pde:test --all` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | `/pde:mcp-status` shows all configured integrations and their state | smoke | `/pde:mcp-status` — verify output contains a row for each APPROVED_SERVER | ❌ Wave 0 |
| INFRA-02 | `/pde:connect github` shows step-by-step instructions, then confirms connection | smoke | `/pde:connect github` — verify auth instructions displayed, confirmation message shown | ❌ Wave 0 |
| INFRA-03 | A command invoked without GitHub connected tells user what is unavailable and completes | smoke | Manual: disconnect github, run `/pde:sync --github`, verify degraded-mode output | Manual only |
| INFRA-04 | `.planning/mcp-connections.json` exists after connect, is gitignored, has no credential fields | unit | `node bin/pde-tools.cjs verify-path-exists .planning/mcp-connections.json` + `grep -v 'token\|secret\|key'` | ❌ Wave 0 |
| INFRA-05 | `/pde:connect unofficial-server` is rejected with policy message | smoke | `/pde:connect unofficial-server` — verify error output contains policy rejection message | ❌ Wave 0 |
| INFRA-06 | `bridge.call('github:list-issues', ...)` maps to correct raw tool name | unit | Unit test in mcp-bridge.cjs: assert `TOOL_MAP['github:list-issues'] === 'mcp__github__listIssues'` (Phase 40 populates) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Run `/pde:health` to verify no .planning/ regressions
- **Per wave merge:** Run `/pde:test --lint` to verify all new skill files pass structural linting
- **Phase gate:** Full status check (`/pde:mcp-status` smoke, gitignore verify, policy rejection verify) before Phase 40 begins

### Wave 0 Gaps

- [ ] `commands/mcp-status.md` — new command file for INFRA-01
- [ ] `commands/connect.md` — new command file for INFRA-02
- [ ] `workflows/mcp-status.md` — status display workflow
- [ ] `workflows/connect.md` — guided auth workflow
- [ ] `bin/lib/mcp-bridge.cjs` — the central adapter module
- [ ] `.planning/mcp-connections.json` schema (auto-created on first connect)
- [ ] `.gitignore` entry for `.planning/mcp-connections.json`

---

## Sources

### Primary (HIGH confidence)
- Official Claude Code MCP docs (`https://code.claude.com/docs/en/mcp`) — connection management, auth flows, scope model, managed policy, .mcp.json format
- Project `references/mcp-integration.md` — existing probe/use/degrade pattern, per-MCP timeouts, log format, all 7 MCP entries
- Project `bin/pde-tools.cjs` — CommonJS module conventions, zero-npm-dependency constraint, existing command surface
- Project `.planning/STATE.md` — architecture constraints: mcp-bridge.cjs required before Phase 40, listTools research flag, auth persistence requirement
- Project `.planning/REQUIREMENTS.md` — all INFRA-* requirement text verbatim

### Secondary (MEDIUM confidence)
- WebSearch verified: MCP Tool Search (deferred loading) is enabled by default; `listTools` is internal to Claude Code, not callable as a skill tool; OAuth tokens stored in system keychain
- Project `workflows/recommend.md` — confirms probe-then-degrade pattern already in use at skill level; mcp-compass, WebSearch probe patterns
- Project `references/tooling-patterns.md` — confirmed probe check IDs (MCP-001 through MCP-007), dual-path test requirements

### Tertiary (LOW confidence)
- `@linear/mcp-server` npm package name — sourced from mcp-integration.md catalog; not verified against npm registry (Phase 41 research task)
- Atlassian `@atlassian/jira-mcp` package name — inferred; Phase 41 verifies
- Pencil MCP tool names (`set_variables`, `capture_screenshot`) — sourced from STATE.md community article citation; Phase 43 validates

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Claude Code MCP docs are authoritative; CommonJS pattern is existing project standard
- Architecture patterns: HIGH — mcp-bridge.cjs pattern derived from project's own mcp-integration.md; connection schema is straightforward
- Pitfalls: HIGH — credential-in-metadata and listTools pitfalls verified against official docs; others derived from existing codebase patterns
- Open questions (Pencil, Linear, Atlassian package names): LOW — intentionally deferred to phase-specific research

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable Claude Code MCP API; 30-day window)
