# Phase 129: Hook Integration - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Editor file changes are detected automatically during active sessions and ingested on session start, with zero stdout overhead and the full Cursor write-back path verified end-to-end

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `context-sync.cjs` — main sync engine with buildContextIR(), emitAll(), mergePartialIR(), parseMdcContent(), parseSkillMd(), parseDesignMd()
- `writeStateFile()` / `readStateFile()` — atomic state persistence with lastIR snapshot and lastEmittedAt
- `computeLoopBreak()` — hash comparison for loop prevention
- `appendConflictLog()` — NDJSON conflict logging
- `readFieldPolicy()` — per-field merge policy from config.json

### Established Patterns
- All sync logic in `packages/context-sync/context-sync.cjs` as CommonJS
- Hook scripts in `hooks/` directory (pde-tools.cjs handles routing)
- State file uses atomic write via tmp+rename with PID-based paths
- Zero stdout from hooks — all output via stderr

### Integration Points
- SessionStart hook triggers reconciliation sweep of monitored files
- PostToolUse hook triggers mtime comparison for live change detection
- `pde context-sync --ingest` CLI command for manual full scan
- pendingIngest queue in state file for deferred processing

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
