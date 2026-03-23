# MCP Server Implementation Research

**Domain:** Read-only MCP server exposing file-based planning state
**Researched:** 2026-03-23
**Overall confidence:** HIGH (protocol spec is authoritative, implementation patterns verified)

---

## 1. Minimal MCP Server Without SDK

### The Protocol is Simple

MCP over stdio is newline-delimited JSON-RPC 2.0. No Content-Length headers (unlike LSP). No HTTP. The server reads one JSON line from stdin, writes one JSON line to stdout. That is the entire transport layer.

**Confidence:** HIGH -- directly from [MCP Transport Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)

### Minimal JSON-RPC Implementation

A zero-dependency MCP server needs exactly these Node.js built-ins:
- `readline` -- read newline-delimited JSON from stdin
- `fs` -- read .planning/ files
- `path` -- resolve file paths

The core loop is approximately 30 lines:

```javascript
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    // Invalid JSON -- ignore per spec
    return;
  }

  // Route by method
  const handler = HANDLERS[msg.method];
  if (!handler) {
    // Unknown method -- return error if it has an id (request), ignore if notification
    if (msg.id !== undefined) {
      respond(msg.id, null, { code: -32601, message: `Method not found: ${msg.method}` });
    }
    return;
  }

  const result = handler(msg.params || {});
  if (msg.id !== undefined) {
    respond(msg.id, result);
  }
});

function respond(id, result, error) {
  const msg = { jsonrpc: '2.0', id };
  if (error) msg.error = error;
  else msg.result = result;
  process.stdout.write(JSON.stringify(msg) + '\n');
}
```

**Critical:** Never use `console.log()` -- it writes to stdout and corrupts the JSON-RPC stream. Use `console.error()` or `process.stderr.write()` for all logging.

**Confidence:** HIGH -- transport spec explicitly states messages are newline-delimited, MUST NOT contain embedded newlines.

### Required Protocol Handlers (Minimal Spec Compliance)

Only 4 methods are needed for a functional read-only MCP server:

| Method | Type | Required | Purpose |
|--------|------|----------|---------|
| `initialize` | Request | YES | Handshake, capability negotiation |
| `notifications/initialized` | Notification | YES (receive only) | Client signals ready |
| `tools/list` | Request | YES | Enumerate available tools |
| `tools/call` | Request | YES | Execute a tool |
| `ping` | Request | Recommended | Health check / keep-alive |

**Not needed for read-only server:** `resources/list`, `resources/read`, `prompts/list`, `prompts/get`, `sampling/createMessage`, `notifications/tools/list_changed`.

### Initialize Handshake (Exact Format)

**Step 1: Client sends `initialize` request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-03-26",
    "capabilities": {
      "roots": { "listChanged": true },
      "sampling": {}
    },
    "clientInfo": {
      "name": "claude-code",
      "version": "1.0.0"
    }
  }
}
```

**Step 2: Server responds with capabilities:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-03-26",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "pde-state",
      "version": "1.0.0"
    }
  }
}
```

**Step 3: Client sends `notifications/initialized`:**
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```
No response needed (it is a notification, no `id` field).

**Version negotiation:** If the server supports the client's requested version, respond with the same version. For PDE, hardcode `"2025-03-26"` (current latest). If Claude Code sends a newer version, respond with `"2025-03-26"` and let the client decide compatibility.

**Confidence:** HIGH -- from [MCP Lifecycle Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle)

### Ping Handler

```json
// Request:  {"jsonrpc":"2.0","id":5,"method":"ping"}
// Response: {"jsonrpc":"2.0","id":5,"result":{}}
```

The receiver MUST respond promptly with an empty result object. Required for connection health checks.

**Confidence:** HIGH -- from [MCP Ping Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/ping)

---

## 2. Tools vs Resources: Use Tools

### Decision: Tools Only, No Resources

**Resources** are application-controlled -- the client application (Claude Code) decides when to load them. The user or client must explicitly request resource content. Resources are ideal for context the user manually attaches.

**Tools** are model-controlled -- the LLM can discover and invoke them autonomously during conversation. This is exactly what PDE needs: the model should be able to query project state on-demand without user intervention.

**Recommendation:** Expose everything as **tools**, not resources. Rationale:
1. PDE state queries are model-initiated ("What phase am I on?" "What are the requirements?")
2. Tools are universally supported by all MCP clients
3. Resources have weaker client support (Claude Code supports them but the UX is "attach resource" rather than autonomous access)
4. Tool responses can include structured data the model can reason about immediately

**Confidence:** HIGH -- from [MCP Server Concepts](https://modelcontextprotocol.io/docs/learn/server-concepts) and the spec's own distinction: "Tools = model-controlled actions, Resources = application-controlled data"

---

## 3. Recommended MCP Tools for PDE State Server

### Tool Design Principles

1. **Granular over monolithic** -- separate tools for each concern so the model can fetch only what it needs
2. **Structured output** -- return parsed/structured data, not raw markdown (the model already has the Read tool for raw files)
3. **Zero parameters where possible** -- most PDE state queries need no arguments
4. **Include file paths in responses** -- so the model knows where to look for details

### Recommended Tool Set

#### Core State Tools

| Tool Name | Parameters | Returns | Purpose |
|-----------|-----------|---------|---------|
| `get_project_info` | none | Project name, description, core value, product type | Quick project identity |
| `get_current_state` | none | Current milestone, phase, plan, status, progress metrics | Where are we right now? |
| `get_roadmap_overview` | none | All milestones with status, current phase list | High-level project trajectory |
| `get_phase_detail` | `phase_number` (int) | Phase plan, tasks, status, success criteria | Drill into specific phase |
| `get_requirements` | `status` (optional: all/validated/pending) | Requirements list with REQ-IDs and status | What needs to be built |
| `get_decisions` | none | Key decisions from PROJECT.md | Architecture/design decisions made |

#### Design Pipeline Tools

| Tool Name | Parameters | Returns | Purpose |
|-----------|-----------|---------|---------|
| `get_design_state` | none | Pipeline stage, coverage flags, current artifact | Design pipeline progress |
| `get_design_manifest` | none | Artifact registry, 21 coverage flags | What design artifacts exist |
| `list_design_artifacts` | `stage` (optional) | Artifact filenames by stage | Browse design output |

#### Planning Metadata Tools

| Tool Name | Parameters | Returns | Purpose |
|-----------|-----------|---------|---------|
| `get_milestone_info` | `milestone` (optional, defaults to current) | Milestone details, phase range, status | Milestone-level view |
| `get_config` | none | PDE configuration (model profile, branching, etc.) | Current settings |
| `get_context_notes` | none | User-authored context notes | Context for planning |

### Tool Response Format

All tools should return `content` array with `type: "text"` items containing JSON:

```json
{
  "content": [{
    "type": "text",
    "text": "{\"milestone\":\"v0.14\",\"phase\":null,\"status\":\"defining requirements\"}"
  }],
  "isError": false
}
```

Use JSON in the text field rather than prose -- the model can parse it, and structured data is more useful for reasoning.

**Confidence:** MEDIUM -- tool set is opinionated based on PDE's existing state files and usage patterns. Comparable project management MCP servers (Linear, Plane, Jira) expose similar granularity.

---

## 4. Existing MCP Server Patterns and Examples

### Claude Code Plugin Configuration

To register the MCP server with Claude Code, add to `.mcp.json` (project scope):

```json
{
  "mcpServers": {
    "pde-state": {
      "command": "node",
      "args": ["bin/mcp-server.cjs"],
      "cwd": "/path/to/project"
    }
  }
}
```

Or via CLI:
```bash
claude mcp add pde-state --transport stdio -- node bin/mcp-server.cjs
```

The `--scope project` flag stores in `.mcp.json` (version-controlled, shared). The `--scope local` flag (default) stores in `.claude/settings.local.json` (local only).

**Confidence:** HIGH -- from [Claude Code MCP docs](https://code.claude.com/docs/en/mcp)

### Existing Project Management MCP Servers (Patterns to Follow)

Surveyed servers for tool naming and granularity patterns:

| Server | Tool Count | Pattern |
|--------|-----------|---------|
| GitHub MCP | 30+ | Verb-noun: `create_issue`, `list_pull_requests`, `get_file_contents` |
| Linear MCP | 20+ | Verb-noun: `list_issues`, `create_issue`, `update_issue` |
| Plane MCP | 76 | Entity-action: `project_list`, `issue_create`, `module_update` |

**PDE pattern recommendation:** Use `get_` prefix for all read-only tools (consistent, clear intent). Examples: `get_project_info`, `get_current_state`, `get_roadmap_overview`.

**Confidence:** MEDIUM -- based on web search of MCP server registries.

---

## 5. Handling Large Responses

### The Problem

ROADMAP.md can be 300+ lines. PROJECT.md can be 200+ lines. Raw file dumps waste model context tokens.

### Strategies (Ranked)

1. **Parse and summarize** (recommended for PDE): Extract structured data from markdown files rather than returning raw content. `get_roadmap_overview` returns milestone list with status, not the full ROADMAP.md text. This is the primary mitigation.

2. **Drill-down tools**: Provide coarse-grained overview tools and fine-grained detail tools. `get_roadmap_overview` returns milestones; `get_phase_detail(42)` returns one phase's full plan. The model calls the detail tool only when needed.

3. **Truncation with continuation**: For truly large content, return first N characters with a flag indicating truncation. Not needed if tools are properly granular.

4. **Pagination via cursors**: The MCP spec supports cursor-based pagination for `tools/list`. For tool results, implement a `cursor` parameter if a tool could return unbounded lists. Probably unnecessary for PDE -- the data is bounded (tens of phases, not thousands).

### No Protocol-Level Size Limit

The MCP spec does NOT define a maximum response size. However, Claude Code and other clients may truncate or fail on very large responses. The [community discussion](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/2211) suggests 256-512 KB as a practical ceiling. PDE state files are well under this.

**Recommendation:** Parse files into structured JSON. Return summaries by default, details on request. Never dump raw multi-hundred-line markdown into a tool response.

**Confidence:** HIGH for the strategy; MEDIUM for the size limit (community consensus, not spec).

---

## 6. Implementation Architecture

### File Structure

```
bin/
  mcp-server.cjs          # Entry point -- stdio JSON-RPC loop + tool dispatch
  lib/
    mcp-tools.cjs          # Tool definitions and implementations (or inline in mcp-server.cjs)
```

Single file (`mcp-server.cjs`) is viable and preferred for simplicity given PDE's CommonJS pattern. The existing `bin/lib/*.cjs` modules can be required for shared utilities like `safeReadFile`, `loadConfig`, `extractFrontmatter`.

### Architecture Pattern

```
stdin (JSON-RPC) --> readline --> parse --> route by method --> handler --> respond --> stdout
                                                                  |
                                                            fs.readFileSync(.planning/*)
                                                            parse markdown/JSON
                                                            return structured data
```

### Key Design Decisions

1. **Synchronous file reads** -- Use `fs.readFileSync` like the rest of PDE. State files are small (< 100KB). No need for async complexity.

2. **CWD detection** -- The server needs to find `.planning/`. Use `process.cwd()` since Claude Code launches the server from the project root. Accept `--cwd` flag as override.

3. **Error handling** -- Tool execution errors use `isError: true` in the result. Protocol errors (unknown method, malformed request) use JSON-RPC error codes (-32600 to -32603). Never crash the process on bad input.

4. **No state mutation** -- Purely read-only. No fs.writeFile, no process.exec, no side effects. This is a core safety constraint.

5. **Graceful degradation** -- If a file doesn't exist, return `{ "exists": false }` rather than an error. PDE projects at different lifecycle stages will have different files present.

### Estimated Size

The complete implementation should be approximately 200-400 lines:
- ~30 lines: JSON-RPC transport (readline + respond)
- ~30 lines: Protocol handlers (initialize, ping, tools/list)
- ~20 lines: Tool registry and dispatch
- ~150-300 lines: Tool implementations (file parsing, data extraction)

### Protocol Version Strategy

Support `"2025-03-26"` (current spec). Also accept `"2024-11-05"` (older clients). The initialize handler should echo back whichever version the client requests if supported, or respond with `"2025-03-26"` and let the client negotiate.

---

## 7. Pitfalls and Gotchas

### Critical

1. **stdout corruption** -- Any `console.log()` call will break the JSON-RPC stream. All logging MUST go to stderr. Audit every require'd module for stray console.log calls. PDE's existing `core.cjs` uses `process.stdout.write()` and `process.exit()` which would also corrupt the stream -- DO NOT require modules that call these.

2. **Embedded newlines in responses** -- Messages MUST NOT contain embedded newlines per spec. When returning file content, replace `\n` with `\\n` in JSON serialization (JSON.stringify handles this automatically, but be careful with template literals).

3. **Process lifecycle** -- Claude Code manages the server subprocess. The server must stay alive until stdin closes. Do NOT call `process.exit()` in handlers (unlike the existing PDE tools pattern). Handle `rl.on('close', ...)` for graceful shutdown.

### Moderate

4. **CWD assumptions** -- Claude Code may not always launch from project root. Accept `--cwd` argument and fall back to `process.cwd()`. The existing PDE mcp-bridge.cjs pattern uses explicit cwd passing.

5. **File watching** -- The server reads files on each tool call (not cached). This is correct -- state files change during the session as phases progress. Do NOT cache file contents.

6. **Batch requests** -- JSON-RPC 2.0 supports batch requests (array of messages). The spec says the `initialize` request MUST NOT be batched, but other requests can be. For simplicity, handle single messages only in v1 -- Claude Code does not batch requests in practice.

### Minor

7. **Tool naming collision** -- MCP tool names are prefixed by Claude Code as `mcp__servername__toolname`. Keep tool names short and descriptive. Avoid underscores in tool names to prevent double-underscore confusion.

8. **Protocol version mismatch** -- If Claude Code sends a version we don't support, return an error per spec. This is unlikely in practice but handle it defensively.

---

## 8. Integration with Existing PDE Codebase

### Reusable Modules

These existing PDE modules can be safely required (they don't write to stdout in import):

| Module | What to reuse |
|--------|--------------|
| `bin/lib/frontmatter.cjs` | `extractFrontmatter()` for STATE.md YAML parsing |
| `bin/lib/core.cjs` | `safeReadFile()`, `loadConfig()` -- but NOT `output()` or `error()` (they call process.exit) |

### Modules to Avoid Requiring

| Module | Why |
|--------|-----|
| `bin/lib/state.cjs` | Calls `output()` which writes to stdout and exits |
| `bin/lib/roadmap.cjs` | Same pattern -- uses output() |
| Any module using `output()` | Will corrupt JSON-RPC stream |

### Recommended Approach

Extract parsing logic into the MCP server directly rather than requiring existing modules. The file parsing is straightforward (readFileSync + regex/split) and avoids any risk of stdout corruption from transitive dependencies.

Alternatively, factor out pure parsing functions from existing modules into a shared `parsers.cjs` that has zero side effects. This is a larger refactor and may not be worth it for v1.

---

## 9. Configuration and Registration

### Auto-Registration Strategy

PDE's `init.cjs` (project initialization) should automatically add the MCP server to `.mcp.json`:

```json
{
  "mcpServers": {
    "pde-state": {
      "command": "node",
      "args": [".pde/bin/mcp-server.cjs"]
    }
  }
}
```

This makes the MCP server available in every Claude Code session within the project without manual setup.

### Alternative: Hook-Based Registration

Use Claude Code's hook system to register the MCP server on session start. However, `.mcp.json` is simpler and declarative. Prefer `.mcp.json`.

---

## Sources

### Authoritative (HIGH confidence)
- [MCP Transport Specification - stdio](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) -- Message framing, newline delimiter, stdout/stderr rules
- [MCP Lifecycle Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle) -- Initialize handshake, version negotiation, shutdown
- [MCP Tools Specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) -- tools/list, tools/call request/response format, error handling
- [MCP Ping Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/ping) -- Ping/pong health check
- [MCP Server Concepts](https://modelcontextprotocol.io/docs/learn/server-concepts) -- Resources vs Tools distinction
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp) -- Configuration format, .mcp.json, registration commands
- [MCP Pagination Specification](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/pagination) -- Cursor-based pagination

### Verified (MEDIUM confidence)
- [MCP Response Size Discussion](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/2211) -- Community consensus on size limits (256-512KB practical ceiling)
- [JSON-RPC Protocol in MCP Guide](https://mcpcat.io/guides/understanding-json-rpc-protocol-mcp/) -- Protocol details and examples
- [MCP Resources Explained](https://medium.com/@laurentkubaski/mcp-resources-explained-and-how-they-differ-from-mcp-tools-096f9d15f767) -- Resources vs Tools comparison
- [Project Management MCP Servers Overview](https://www.merge.dev/blog/project-management-mcp-servers) -- Existing PM server patterns
- [MCP Best Practices - The New Stack](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/) -- Production MCP server patterns

### Reference (LOW confidence -- used for pattern validation only)
- [Minimal MCP Server/Client - Skywork AI](https://skywork.ai/blog/how-to-build-minimal-mcp-server-client-echo-stdio/) -- Raw implementation example (page did not fully load)
- [MCP Server Node - GitHub](https://github.com/lucianoayres/mcp-server-node) -- SDK-based example for architecture reference
