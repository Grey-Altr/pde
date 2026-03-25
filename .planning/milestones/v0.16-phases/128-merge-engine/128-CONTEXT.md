# Phase 128: Merge Engine and Conflict Resolution - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

A 3-way merge engine correctly merges editor-parsed partial IR against the base IR snapshot and current .planning/ IR, with conflicts detected, logged, and resolved per configurable field policy

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `context-sync.cjs` — main sync engine with buildContextIR(), emitAll(), writeStateFile(), readStateFile()
- `computeLoopBreak()` — hash comparison for loop prevention (Phase 126)
- `parseMdcContent()`, `parseSkillMd()`, `parseDesignMd()` — reverse parsers (Phase 127)
- `.planning/.context-sync-state.json` — state file with lastIR snapshot as merge base

### Established Patterns
- All sync logic lives in `packages/context-sync/context-sync.cjs` as CommonJS
- State file uses atomic write via tmp+rename pattern with PID-based paths
- NDJSON logging pattern for structured append-only logs
- config.json for user-configurable settings

### Integration Points
- `mergePartialIR()` will be called between reverse parse and emitAll()
- State file `lastIR` snapshot serves as the base for 3-way comparison
- `appendConflictLog()` writes to `.planning/.sync-conflicts.log`
- `readFieldPolicy()` reads from `.planning/config.json` contextSync.fieldPolicies

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
