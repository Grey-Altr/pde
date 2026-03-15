# Phase 10: Fix STATE.md Regressions - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate the `gsd_state_version` frontmatter regression in STATE.md and fix stale body narrative and progress fields. This is a targeted bug fix — no new capabilities, no architecture changes.

</domain>

<decisions>
## Implementation Decisions

### Frontmatter key regression
- Root cause: GSD orchestration layer (`$HOME/.claude/get-shit-done/bin/gsd-tools.cjs`) writes `gsd_state_version` when it updates STATE.md, overwriting Phase 7's fix to `pde_state_version`
- PDE's own `bin/lib/state.cjs` line 640 already writes `pde_state_version: '1.0'` — PDE toolchain is correct
- Fix: correct STATE.md frontmatter AND ensure subsequent state writes from GSD-layer workflows don't regress it
- State-writing code (`writeStateMd` → `buildStateFrontmatter`) always builds fresh frontmatter with `pde_state_version` — the regression comes from the GSD orchestration layer, not PDE code

### Body narrative refresh
- STATE.md body currently says "Phase 4 of 8 (Workflow Engine) — COMPLETE" and has stale performance metrics
- Update body to reflect actual current state: 9 phases complete, Phases 10-11 are gap closure
- Targeted edits to fix obviously wrong parts — not a full regeneration

### Progress accuracy
- `progress.percent` shows 83% but all 21 completed plans are done
- ROADMAP shows 0/0 plans for Phases 10-11 (not yet planned)
- Progress should reflect completed plans vs total plans (21/21 = 100% of planned work)
- Phases 10-11 having 0 plans is expected — they'll get plans when `/pde:plan-phase` runs

### Claude's Discretion
- Exact mechanism for preventing GSD-layer regression (post-write hook, pre-read sanitizer, or direct GSD-layer patch)
- Exact body narrative wording
- Whether to update performance metrics table or leave it as historical record

</decisions>

<specifics>
## Specific Ideas

No specific requirements — success criteria from ROADMAP.md are precise and testable.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/state.cjs`: `writeStateMd()` (line 679), `buildStateFrontmatter()` (line 640), `syncStateFrontmatter()` (line 668) — all correctly use `pde_state_version`
- `bin/lib/frontmatter.cjs`: `extractFrontmatter()`, `reconstructFrontmatter()` — YAML frontmatter parsing/serialization

### Established Patterns
- All STATE.md writes go through `writeStateMd()` which calls `syncStateFrontmatter()` → `buildStateFrontmatter()` — frontmatter is rebuilt from scratch on every write
- `buildStateFrontmatter()` parses body content to extract phase/plan/progress info and computes frontmatter

### Integration Points
- GSD orchestration layer (`$HOME/.claude/get-shit-done/bin/gsd-tools.cjs state record-session`) — this is what regresses the key
- 12+ `writeStateMd()` call sites in `bin/lib/state.cjs` — all use the correct PDE function
- `.planning/STATE.md` — the file being fixed
- `.planning/ROADMAP.md` — source of truth for phase/plan completion status

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-fix-statemd-regressions*
*Context gathered: 2026-03-15*
