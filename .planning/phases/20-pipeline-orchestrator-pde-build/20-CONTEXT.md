# Phase 20: Pipeline Orchestrator (/pde:build) - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

A thin orchestrator command that runs the full design pipeline (brief → system → flows → wireframe → critique → iterate → handoff) with a single invocation. Reads DESIGN-STATE.md / designCoverage to determine completed stages, skips them, and resumes from the first incomplete stage. Adds no skill logic of its own — all behavior lives in individual skill workflows.

</domain>

<decisions>
## Implementation Decisions

### Stage execution order
- Sequential execution in canonical order: brief → system → flows → wireframe → critique → iterate → handoff
- No parallel stage execution — simplicity over speed; Claude Code workflows are inherently sequential
- Dependency order matches the pipeline: wireframe depends on system + flows, critique depends on wireframe, iterate depends on critique, handoff depends on iterate

### Resume and skip logic
- Read designCoverage from design-manifest.json to determine completed stages
- Skip stages where the corresponding flag is true (hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasIterate, hasHandoff)
- Brief completion checked via brief.md existence in strategy/ (no hasBrief flag — per Phase 15.1 decision)
- Resume from first incomplete stage on re-run

### Verification gates
- In interactive mode: prompt user between each stage ("Stage X complete. Continue to Stage Y?")
- In yolo mode: auto-continue between stages without prompts
- Read mode from .planning/config.json (consistent with all other PDE workflows)

### Crash recovery
- If interrupted mid-stage, re-run the incomplete stage from scratch on next invocation
- Each skill is idempotent — overwrites its own output, so partial artifacts are safely replaced
- designCoverage flags are set at the end of each skill, so incomplete stages appear as not-done

### Invocation pattern
- Each stage invoked via Skill tool (same mechanism as --auto chain in discuss-phase)
- Keeps execution flat — no nested Task agents (avoids deep nesting freeze per #686)
- Pass stage-specific flags through (e.g., fidelity level for wireframe)

### Claude's Discretion
- Exact progress display format between stages
- Whether to show a summary of completed stages at startup
- Error message wording when a stage fails

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `design.cjs:cmdCoverageCheck()` — Returns designCoverage object from manifest, showing which stages are complete
- `design.cjs:ensureDesignDirs()` — Creates .planning/design/ directory tree, idempotent
- `design.cjs:acquireWriteLock()/releaseWriteLock()` — Write-lock for DESIGN-STATE.md
- `pde-tools.cjs design coverage-check` — CLI entry point for coverage check
- All 7 skill commands already exist in commands/ with proper delegation to workflows/

### Established Patterns
- Skill invocation via Skill tool to keep nesting flat (--auto chain pattern from discuss-phase)
- Config mode check: read .planning/config.json for yolo/interactive/custom
- designCoverage read-before-set pattern used by all 7 skills
- Each skill command is a markdown file with YAML frontmatter + @workflow delegation

### Integration Points
- design-manifest.json designCoverage — the orchestrator's primary state source
- .planning/config.json mode — controls verification gate behavior
- commands/build.md — current stub to be replaced with full workflow delegation
- workflows/build.md — new workflow file to be created
- DESIGN-STATE.md — read for pipeline overview, but designCoverage is authoritative for skip logic

</code_context>

<specifics>
## Specific Ideas

- The orchestrator is deliberately thin — a sequencing wrapper, not a new abstraction layer
- Stage invocation reuses the same Skill tool mechanism as the --auto chain, keeping the execution model consistent
- designCoverage is the single source of truth for resume logic — no separate orchestrator state needed
- Human verification gates match existing config.json mode patterns (yolo = auto, interactive = prompt)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-pipeline-orchestrator-pde-build*
*Context gathered: 2026-03-16*
