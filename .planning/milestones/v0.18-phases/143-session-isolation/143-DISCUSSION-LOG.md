# Phase 143: Session Isolation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 143-session-isolation
**Areas discussed:** Session directory layout, Completion artifact format, Write protocol migration, Merge strategy, Orphan detection, Dispatcher package
**Mode:** User requested standard best practices — all decisions made by Claude

---

## Session Directory Layout

| Option | Description | Selected |
|--------|-------------|----------|
| `.sessions/<id>` | Dedicated directory per design spec, separate from Claude Code worktrees | ✓ |
| `.claude/worktrees/pde-<id>` | Nest under existing Claude worktree dir | |
| `<project-root>/worktrees/<id>` | Generic worktree dir | |

**User's choice:** Best practices — `.sessions/<id>` per design spec
**Notes:** Keeps PDE sessions cleanly separated from Claude Code's own `.claude/worktrees/agent-*` system

## Completion Artifact Format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON marker (`COMPLETE.json`) | Structured metadata, machine-parseable | ✓ |
| Touch file (`COMPLETE`) | Simplest possible — just presence/absence | |
| Markdown with frontmatter | Human-readable but harder to parse programmatically | |

**User's choice:** Best practices — JSON for machine parseability
**Notes:** COMPLETED-REQS.md uses markdown+YAML frontmatter to match existing requirements format

## Write Protocol Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Big-bang switchover | All-at-once, gated by PDE_SESSION_ID env var | ✓ |
| Gradual with shim | Compatibility layer that writes to both old and new paths | |

**User's choice:** Best practices — big-bang with env var gate
**Notes:** No existing v0.18 consumers to break. Pre-v0.18 workflows continue unchanged when PDE_SESSION_ID is absent.

## Merge Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Ours for metadata, recursive for code | STATE.md/REQUIREMENTS.md discarded (recalculated), code merged normally | ✓ |
| Custom merge driver | Register git merge driver for .planning/ files | |
| Manual resolution | Surface all conflicts to user | |

**User's choice:** Best practices — ours + recalculation
**Notes:** Dispatcher recalculates STATE.md/ROADMAP.md/REQUIREMENTS.md from disk artifacts post-merge, so session-side writes are safely discardable

## Orphan Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Startup commands only | Trigger on progress/execute/autonomous — not every command | ✓ |
| Every PDE command | Always check for orphans | |
| Manual only (`/gsd:sessions`) | User explicitly checks | |

**User's choice:** Best practices — startup commands only
**Notes:** Balances safety with performance. Nuclear reset always available via `/gsd:sessions reset`

## Claude's Discretion

- Session ID naming convention
- Git merge driver vs scripted recalculation
- Recalculation strategy (COMPLETE.json scan vs git diff)
- Git operation error handling and retry logic
