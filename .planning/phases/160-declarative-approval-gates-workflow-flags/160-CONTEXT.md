# Phase 160: Declarative Approval Gates + Workflow Flags - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two capabilities:
1. **Approval gates as declarative WebMCP tool forms** — browser AI agents can approve/reject pending PDE gates by calling a WebMCP tool, replacing the current imperative approval flow
2. **--webmcp flag on four design workflow commands** — wireframe, mockup, critique, and competitive produce WebMCP-enhanced output when the flag is passed

This does NOT include auto-generated competitor tools (Phase 161) or multi-editor relay (Phase 162).

</domain>

<decisions>
## Implementation Decisions

### Approval Gate Tool Design
- **D-01:** Single `pde_approval_gate` tool with `action` parameter (approve/reject) and `gate_id` — follows the existing single-tool-per-capability pattern from Phase 157 browser-tools. No separate approve/reject tools.
- **D-02:** Gate tool uses the same useMcpTool() hook pattern as existing browser-tools (use-design-state-tool.ts, use-project-info-tool.ts, use-artifact-list-tool.ts). New file: `use-approval-gate-tool.ts` in `dashboard/lib/mcp/browser-tools/`.
- **D-03:** Tool form presents gate metadata (what's being approved, context, requester) plus approve/reject action buttons. The tool's inputSchema defines the form structure that browser AI agents render.

### Gate State Persistence
- **D-04:** Pending approval gates stored file-based in `.planning/` — consistent with PDE's file-based state model. No new Redis infrastructure for gate state.
- **D-05:** Gate state file format follows existing PDE patterns (markdown or JSON in .planning/ directory). Gate IDs are deterministic from the workflow context (phase + step + artifact).

### --webmcp Output Format
- **D-06:** `--webmcp` flag adds additional markdown sections to workflow output with WebMCP tool context — tool names, schemas, and usage examples for browser AI agents. This is additive, not destructive to existing output.
- **D-07:** The enhanced sections provide enough context for a browser AI agent to understand what WebMCP tools are available for the workflow artifact and how to call them.

### Workflow Command Integration Pattern
- **D-08:** Early flag check in argument parsing (same pattern as `--use-stitch`, `--analyze`, `--batch`). Conditional section injection at the output step of each workflow.
- **D-09:** All four workflows (wireframe.md, mockup.md, critique.md, competitive.md) follow the same integration pattern for consistency. The --webmcp flag detection and output injection is structurally identical across all four.

### Claude's Discretion
- Gate state file naming convention and directory location within .planning/
- Exact markdown format of the WebMCP-enhanced output sections
- Whether to register the approval gate tool via the existing useWebMcpTools() composite hook or separately

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Workflow Integration — WFL-01 through WFL-05 define acceptance criteria
- `.planning/ROADMAP.md` §Phase 160 — Success criteria and dependency on Phase 157

### Existing Browser Tools Pattern
- `dashboard/lib/mcp/browser-tools/use-design-state-tool.ts` — Reference implementation for useMcpTool() pattern
- `dashboard/lib/mcp/browser-tools/use-project-info-tool.ts` — Second reference for tool registration
- `dashboard/lib/mcp/browser-tools/use-artifact-list-tool.ts` — Third reference for tool registration
- `dashboard/hooks/use-webmcp-tools.ts` — Composite hook that registers all tools

### Workflow Files (to be modified)
- `workflows/wireframe.md` — Wireframe workflow command (WFL-02)
- `workflows/mockup.md` — Mockup workflow command (WFL-03)
- `workflows/critique.md` — Critique workflow command (WFL-04)
- `workflows/competitive.md` — Competitive workflow command (WFL-05)

### Prior Phase Infrastructure
- `dashboard/components/webmcp-tools-registrar.tsx` — WebMCP tool registration component
- `dashboard/components/providers.tsx` — Provider setup with @mcp-b/global polyfill

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useMcpTool()` hook pattern — All three existing browser-tools follow the same structure: define inputSchema constant, call useMcpTool() with name/description/schema/handler. New approval gate tool should follow identically.
- `useWebMcpTools()` composite hook — Central registration point in `dashboard/hooks/use-webmcp-tools.ts`. Approval gate tool can be added here.
- `webmcp-tools-registrar.tsx` — Component that mounts the composite hook. No changes needed if tool is added to the composite hook.
- Server-factory pattern — `server-factory.ts` for MCP server construction, reusable for any new tool handlers.

### Established Patterns
- **Tool registration:** inputSchema constants at module level prevent zombie re-registrations (Phase 157 decision)
- **Dual output:** type: 'resource' rich blocks + type: 'text' fallbacks for all tool handlers (Phase 158 decision)
- **File-based state:** PDE uses .planning/ directory for all state — no separate database for workflow state
- **Flag patterns in workflows:** `--use-stitch`, `--analyze`, `--batch`, `--text` are all parsed early in workflow argument handling

### Integration Points
- Approval gate tool registers in the browser via useWebMcpTools() composite hook
- Workflows parse flags from $ARGUMENTS in their initialize/process steps
- Output is markdown — WebMCP sections append to existing workflow output

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Auto-mode selected recommended defaults for all decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 160-declarative-approval-gates-workflow-flags*
*Context gathered: 2026-03-28*
