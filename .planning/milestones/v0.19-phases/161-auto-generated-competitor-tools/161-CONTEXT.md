# Phase 161: Auto-Generated Competitor Tools - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase extends the competitive analysis workflow (/pde:competitive) to optionally generate WebMCP tool stubs from competitor data. Generated tools go through a mandatory sanitization pipeline and human review gate before activation. A persistent registry tracks tool status across sessions.

This does NOT include multi-editor relay (Phase 162) or changes to the existing competitive analysis output format.

</domain>

<decisions>
## Implementation Decisions

### Tool Stub Generation Design
- **D-01:** Tool stub generation occurs after Step 7 (output writing), as a new Step 8 in the competitive workflow — keeps core analysis clean, tool stubs are a post-processing derivative
- **D-02:** The existing `--webmcp` flag triggers generation — if --webmcp is active AND competitor data exists, generate stubs. No new flag needed.
- **D-03:** Tool stubs derive from competitor name + key differentiators + feature matrix row data — enough for meaningful descriptions without leaking full analysis
- **D-04:** 1 tool per competitor — "query_{sanitized_name}" tool returning that competitor's key data from the analysis

### Sanitization Pipeline
- **D-05:** Strip known injection patterns: `<system>`, `IMPORTANT:`, `You must`, `Ignore previous`, markdown headers `#` — focus on known attack vectors
- **D-06:** 512-char limit enforced by truncating at last complete sentence before 512 characters — preserves readability
- **D-07:** Each stub tagged with full provenance: `source: "auto-generated"`, `competitor_name`, `generated_from` (CMP artifact version), `generated_at` timestamp

### Review Gate & Registry
- **D-08:** Reuse existing `pde_approval_gate` WebMCP tool from Phase 160 — each generated stub gets a gate_id, human approves/rejects via the same tool. Gate ID format: `competitor-tool-{sanitized_name}-{YYYYMMDD}-{4_HEX}`
- **D-09:** Registry is a flat JSON array of tool objects with fields: `name`, `description`, `competitor_name`, `status` (pending/approved/rejected), `gate_id`, `metadata`, `approved_at`
- **D-10:** Registry file at `.webmcp/competitor-tools-registry.json` per ADV-04
- **D-11:** Approved tools registered via a new `useCompetitorTools()` browser-tool hook — follows existing useMcpTool() pattern, reads registry and only registers approved tools

### Claude's Discretion
- Exact regex patterns for sanitization beyond the specified injection markers
- Error handling when registry file is corrupted or missing
- Tool naming convention details beyond the "query_{sanitized_name}" pattern

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Advanced Tools — ADV-01 through ADV-04 define acceptance criteria
- `.planning/ROADMAP.md` §Phase 161 — Success criteria and dependency on Phase 160

### Competitive Workflow (to be modified)
- `workflows/competitive.md` — Current workflow with --webmcp flag support (Step 8 will be added)

### Existing Browser Tools Pattern
- `dashboard/lib/mcp/browser-tools/use-approval-gate-tool.ts` — Approval gate tool to reuse for review
- `dashboard/lib/mcp/browser-tools/index.ts` — Barrel export for browser tools
- `dashboard/hooks/use-webmcp-tools.ts` — Composite hook that registers all tools

### Prior Phase Infrastructure
- `dashboard/lib/mcp/browser-tools/use-design-state-tool.ts` — Reference useMcpTool() pattern
- `dashboard/components/webmcp-tools-registrar.tsx` — WebMCP tool registration component
- `.webmcp/config.json` — WebMCP client discovery file (Phase 157)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useMcpTool()` hook pattern — All browser-tools follow same structure: module-level inputSchema, useMcpTool() call with name/description/schema/handler
- `pde_approval_gate` tool — Already handles approve/reject actions with gate_id, can be reused for competitor tool review
- `useWebMcpTools()` composite hook — Central registration point for new useCompetitorTools() hook
- `--webmcp` flag parsing — Already implemented in competitive.md workflow (Phase 160)

### Established Patterns
- **Tool registration:** inputSchema constants at module level prevent zombie re-registrations
- **Dual output:** type: 'resource' rich blocks + type: 'text' fallbacks for all tool handlers
- **File-based state:** .webmcp/ directory for WebMCP-specific state files
- **Flag patterns in workflows:** --webmcp parsed early in argument handling, conditional section injection at output step

### Integration Points
- New Step 8 in competitive.md workflow (after existing Step 7 output writing)
- New useCompetitorTools() hook registered via useWebMcpTools() composite hook
- Registry file at .webmcp/competitor-tools-registry.json read by browser hook
- Gate IDs for competitor tools follow Phase 160 gate ID pattern

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

*Phase: 161-auto-generated-competitor-tools*
*Context gathered: 2026-03-28*
