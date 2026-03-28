# Phase 160: Declarative Approval Gates + Workflow Flags - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 160-declarative-approval-gates-workflow-flags
**Areas discussed:** Approval gate form design, Gate state persistence, --webmcp output format, Workflow command integration pattern
**Mode:** --auto (all decisions auto-selected)

---

## Approval Gate Form Design

| Option | Description | Selected |
|--------|-------------|----------|
| Single tool with action parameter | One `pde_approval_gate` tool with approve/reject action and gate_id | ✓ |
| Separate approve/reject tools | Individual `pde_approve_gate` and `pde_reject_gate` tools | |
| Per-gate-type tools | Different tools for different gate types (design, review, etc.) | |

**User's choice:** [auto] Single tool with action parameter (recommended — follows existing single-tool-per-capability pattern)
**Notes:** Aligns with useMcpTool() pattern from Phase 157 browser-tools. Simpler registration, one inputSchema.

---

## Gate State Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| File-based in .planning/ | Consistent with PDE state model, no new infrastructure | ✓ |
| Redis (Upstash) | Like token playground, real-time updates | |
| In-memory only | Simplest, but lost on navigation | |

**User's choice:** [auto] File-based in .planning/ (recommended — aligns with existing state model)
**Notes:** PDE is fundamentally file-based. Adding Redis for gate state would create an inconsistency.

---

## --webmcp Output Format

| Option | Description | Selected |
|--------|-------------|----------|
| Additional markdown sections | WebMCP tool context appended to existing workflow output | ✓ |
| Separate JSON blocks | Structured data alongside markdown | |
| Tool registration metadata only | Minimal — just tool names and schemas | |

**User's choice:** [auto] Additional markdown sections (recommended — additive, not destructive)
**Notes:** Keeps workflow output readable while providing browser AI agents with actionable tool context.

---

## Workflow Command Integration Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Early flag check, conditional injection | Parse --webmcp in argument handling, inject sections at output step | ✓ |
| Post-processing pass | Generate normal output, then transform for WebMCP | |
| Template-based | Different output templates for webmcp vs standard | |

**User's choice:** [auto] Early flag check, conditional injection (recommended — follows existing flag patterns)
**Notes:** Same pattern as --use-stitch, --analyze, --batch. Consistent with PDE workflow conventions.

---

## Claude's Discretion

- Gate state file naming convention and directory location within .planning/
- Exact markdown format of WebMCP-enhanced output sections
- Whether approval gate tool goes in composite hook or registers separately

## Deferred Ideas

None — auto-mode stayed within phase scope.
