# Phase 28: Build Orchestrator Expansion - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand `/pde:build` from 7 to 13 stages, wiring all six new v1.2 skills (recommend, competitive, opportunity, ideate, mockup, hig) into the pipeline. Add dynamic stage counting (no hardcoded numeric literals), `--from` flag for mid-pipeline entry, and per-stage skip support. The orchestrator remains strictly read-only — each skill owns its own coverage flag.

</domain>

<decisions>
## Implementation Decisions

### Stage Ordering
- Locked by success criteria: recommend → competitive → opportunity → ideate → brief → system → flows → wireframe → critique → iterate → mockup → hig → handoff
- This represents: pre-brief research (1-4) → core design (5-11) → post-iterate quality (12-13)

### --from Flag Behavior
- `--from {stage_name}` skips all stages before the named stage without executing them
- Skipped stages are NOT checked for completion — user is asserting they want to enter at that point
- If a required upstream artifact is missing, the invoked skill handles degradation (all v1.2 skills have graceful degradation built in)
- Invalid stage name → error with valid stage list

### Stage List Architecture
- Define stages as a structured data list at the top of the workflow file
- Stage count derived from the list length at runtime (satisfies BUILD-02: no hardcoded numeric literals)
- Each stage entry: name, skill command, coverage check field/method, display label

### Completion Messaging
- Flat stage table (1/13 through 13/13) — consistent with current 1/7 pattern
- No grouping — keep it simple and scannable

### New Coverage Flag Mapping
- hasRecommendations → recommend stage
- hasCompetitive → competitive stage
- hasOpportunity → opportunity stage
- hasIdeation → ideate stage (also check via Glob for IDT artifact)
- hasMockup → mockup stage
- hasHigAudit → hig stage
- Brief: Glob BRF-brief-v*.md (unchanged from v1.1)
- hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasIterate, hasHandoff (unchanged)

### Flag Passthrough
- Keep uniform PASSTHROUGH_ARGS (--quick, --verbose, --force) forwarded to all skills
- No stage-specific args — individual skills handle their own defaults
- HIG runs as full standalone (not --light) when invoked from build pipeline

### Claude's Discretion
- Internal variable naming and code organization within the workflow file
- Exact wording of stage transition messages
- Whether to add a `--to` flag (stop after a specific stage) in addition to `--from`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `workflows/build.md` — Current 7-stage orchestrator, all patterns carry forward
- `references/skill-style-guide.md` — Lint rules and output formatting
- All 13 skill workflows already exist and are individually tested

### Established Patterns
- Flat Skill() invocation (never Task()) — Issue #686
- Coverage read once at startup, never re-read mid-pipeline
- PASSTHROUGH_ARGS forwarding (--quick, --verbose, --force)
- Mode reading from config.json (yolo/interactive)
- Verification gates between stages in interactive mode
- Crash recovery via coverage flags (incomplete stage = flag not set)

### Integration Points
- `pde-tools.cjs design coverage-check` — Returns all 13 coverage flags
- `pde-tools.cjs design ensure-dirs` — Creates all design directories including ux/mockups/
- Each skill sets its own coverage flag via manifest-set-top-level designCoverage
- Brief completion: Glob on BRF-brief-v*.md (no coverage flag)
- Ideation completion: hasIdeation flag + Glob on IDT-ideation-v*.md

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond ROADMAP.md success criteria — user deferred all gray areas to Claude's discretion. This is a mechanical expansion of a well-established pattern.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 28-build-orchestrator-expansion*
*Context gathered: 2026-03-17*
