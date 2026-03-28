# Phase 143: Session Isolation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish atomic worktree lifecycle and single-writer protocol for .planning/ files. This is the correctness prerequisite for all parallel execution — no parallel sessions are spawned until this phase ships. Delivers: session create/merge/cleanup lifecycle, executor write protocol migration, orphan detection, and nuclear reset.

</domain>

<decisions>
## Implementation Decisions

### Session Directory Layout
- **D-01:** Sessions live in `.sessions/<session-id>` at project root — separate from `.claude/worktrees/` (Claude Code's own system)
- **D-02:** `.sessions/` added to `.gitignore` — worktrees are ephemeral, never committed
- **D-03:** Session branch naming: `pde/session/<session-id>` (per design spec)

### Completion Artifact Format
- **D-04:** Completion marker is `COMPLETE.json` written to the phase directory with structured metadata: `{ session_id, exit_code, duration_ms, completed_at, phase, plan }` — machine-parseable for post-merge recalculation
- **D-05:** `COMPLETED-REQS.md` written to phase directory with YAML frontmatter matching existing requirements format — lists requirement IDs satisfied by this session's work
- **D-06:** Both artifacts are the source of truth for post-merge STATE.md and REQUIREMENTS.md recalculation

### Write Protocol Migration
- **D-07:** Big-bang switchover — no compatibility shim. This is phase 143, nothing depends on the old protocol in v0.18 yet
- **D-08:** New write paths only activate when `PDE_SESSION_ID` env var is present — existing pre-v0.18 workflows continue unchanged
- **D-09:** Executor writes COMPLETE.json + COMPLETED-REQS.md to phase directory instead of STATE.md/REQUIREMENTS.md during execution
- **D-10:** STATE.md, ROADMAP.md progress, and REQUIREMENTS.md checkboxes are recalculated from disk artifacts post-merge by the dispatcher

### Merge Strategy
- **D-11:** Git default recursive merge for source code files
- **D-12:** `.planning/STATE.md` and `.planning/REQUIREMENTS.md` use "ours" strategy on merge conflicts — dispatcher recalculates from artifacts anyway, so session-side writes are discarded
- **D-13:** Agent memory files (`.planning/agent-memory/`) are append-only — concatenate on conflict
- **D-14:** `.planning/config.json` is snapshot-at-spawn, never written during session execution — no merge conflicts possible

### Orphan Detection
- **D-15:** Orphan detection triggers on PDE startup commands (`/gsd:progress`, `/gsd:execute-phase`, `/gsd:autonomous`) — not every command
- **D-16:** Detection presents adopt/kill/ignore options via `AskUserQuestion` when orphaned worktrees are found
- **D-17:** Nuclear reset (`/gsd:sessions reset`) skips the prompt — kills all sessions, removes all worktrees, prunes all branches unconditionally

### Dispatcher Package
- **D-18:** New `packages/dispatcher/` directory — CJS package, zero npm dependencies in phase 143 (Agent SDK added in phase 145)
- **D-19:** Plugin root (`bin/`) stays zero-npm-dependency — dispatcher is invoked via `node packages/dispatcher/...`
- **D-20:** Core modules in phase 143: `lib/worktree.cjs` (create/remove/list), `lib/merge.cjs` (merge-back + recalculate), `lib/orphan.cjs` (detection + cleanup)

### Claude's Discretion
- Naming convention for session IDs (short hash, UUID, timestamp-based — whatever is most debuggable)
- Exact git merge driver configuration vs scripted post-merge recalculation
- Whether recalculation reads COMPLETE.json files or uses git log/diff to determine what changed
- Internal error handling and retry logic for git operations

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Specification
- `docs/superpowers/specs/2026-03-26-distributed-execution-design.md` — Full v0.18 architecture. Section 1 (Session Isolation) is the primary reference. Section 6 (Merge Strategy) details auto-resolve rules.

### Requirements
- `.planning/REQUIREMENTS.md` §Session Isolation — ISO-01 through ISO-09 acceptance criteria

### Existing Tooling
- `bin/pde-tools.cjs` — Current `state`, `requirements mark-complete`, `record-session` commands that need migration awareness
- `bin/lib/event-bus.cjs` — Existing NDJSON event infrastructure (already session-aware via `session_id` field)

### Project State
- `.planning/STATE.md` — Current state format and accumulated decisions from roadmap creation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/event-bus.cjs`: Event infrastructure already tags events with `session_id` — new session lifecycle events (spawn, complete, fail, merge) can use the same bus
- `bin/pde-tools.cjs`: Has `state`, `requirements mark-complete`, `record-session` subcommands — these are the write paths that need session-scoping
- `packages/pde-mcp-server/`: Only existing package — establishes the `packages/` directory convention for `packages/dispatcher/`

### Established Patterns
- CJS modules throughout (`*.cjs`) — dispatcher should follow the same pattern
- `gsd-tools.cjs` / `pde-tools.cjs` CLI pattern: subcommand dispatch via `process.argv` parsing
- YAML frontmatter in markdown files for structured metadata (STATE.md, REQUIREMENTS.md)
- NDJSON for event streaming (session-scoped files at `/tmp/pde-session-*.ndjson`)

### Integration Points
- Executor agents (in GSD workflows) currently call `gsd-tools.cjs state record-session` and `requirements mark-complete` — these need conditional routing based on `PDE_SESSION_ID`
- `.claude/worktrees/agent-*` directories visible in git status — these are Claude Code's own worktrees, not PDE sessions. The two systems coexist independently.
- `monitor-dashboard.sh` and pane scripts consume NDJSON events — new session lifecycle events will appear in dashboard automatically

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard best practices applied across all areas. Key principle: session isolation is a correctness primitive, not a user-facing feature. Keep it simple, deterministic, and debuggable.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 143-session-isolation*
*Context gathered: 2026-03-26*
