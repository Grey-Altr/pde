# Requirements: Platform Development Engine

**Defined:** 2026-03-19
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.6 Requirements

Requirements for v0.6 Advanced Workflow Methodology. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: System generates agent-optimized project-context.md (max 4KB) from PROJECT.md + REQUIREMENTS.md + key STATE.md decisions, auto-updated when source files change
- [x] **FOUND-02**: Every subagent spawn includes project-context.md as baseline context alongside task-specific files
- [x] **FOUND-03**: Methodology reference document (workflow-methodology.md) exists in references/ documenting imported BMAD + PAUL patterns, terminology mapping, and PDE conventions

### Planning

- [x] **PLAN-01**: Planner emits tasks/ directory alongside PLAN.md with one self-contained task-NNN.md file per task, each including AC references, file paths, and relevant schema snippets
- [x] **PLAN-02**: Executor loads only the current task file (not full PLAN.md), reducing context consumption by ~90% for phases with 5+ tasks
- [ ] **PLAN-03**: Planner output schema includes acceptance criteria section before task list; each AC has a unique identifier (AC-N)
- [ ] **PLAN-04**: Each task references specific AC-N identifiers it satisfies; tasks cannot be marked done without AC verification
- [ ] **PLAN-05**: Task schema supports optional boundaries field listing protected paths/sections; executor respects DO NOT CHANGE sections during execution

### Verification

- [ ] **VRFY-01**: Mandatory reconciliation step runs after executor completion and before verifier; compares planned tasks vs actual git commits; produces RECONCILIATION.md
- [ ] **VRFY-02**: RECONCILIATION.md reports: tasks completed vs planned, AC satisfaction status, deviations found, and unplanned changes detected
- [ ] **VRFY-03**: /pde:check-readiness command (or execute-phase pre-flight) runs PO-style checklist validating PROJECT.md + REQUIREMENTS.md + PLAN.md consistency; produces PASS/CONCERNS/FAIL
- [ ] **VRFY-04**: Execute-phase blocks on readiness gate FAIL result; CONCERNS proceeds with warning; PASS proceeds normally
- [ ] **VRFY-05**: Planner tags tasks with risk:high based on file patterns (migrations, auth, CI/CD, destructive refactors); executor pauses for user confirmation before and after high-risk tasks

### Tracking

- [ ] **TRCK-01**: Executor updates per-task status (TODO/IN_PROGRESS/DONE/SKIPPED) in tasks/workflow-status.md as each task completes
- [ ] **TRCK-02**: /pde:progress displays task-level granularity when inside an active phase with story files
- [ ] **TRCK-03**: Auto-generated HANDOFF.md captures current position, last action, next step, blockers, and key decisions when session ends or /pde:pause-work is invoked

### Agent Enhancement

- [ ] **AGNT-01**: /pde:assumptions command surfaces planner's key assumptions about a phase approach before plan generation; user confirms or corrects before full plan is written
- [ ] **AGNT-02**: Analyst persona agent (pde-analyst) performs multi-round probing interviews during new-project and new-milestone to surface unspoken assumptions and produce structured product briefs
- [ ] **AGNT-03**: Analyst output feeds into /pde:brief as upstream context with graceful degradation when absent
- [ ] **AGNT-04**: Per-agent-type persistent memory in .planning/agent-memory/{agent-type}/memories.md; loaded on agent spawn, appended after completion
- [ ] **AGNT-05**: Agent memory has 50-entry cap with automatic archival of oldest entries; memory entries include timestamp, phase context, and relevance tags

### Infrastructure

- [x] **INFR-01**: .planning/config/files-manifest.csv tracks path, SHA256 hash, source (stock/user-modified), and last_updated for all PDE framework files
- [x] **INFR-02**: Manifest generated on install and updated on each PDE update
- [x] **INFR-03**: pde-sync-engine consults manifest before overwriting: stock files get silent updates; user-modified files get preserved with conflict notice

## Future Requirements

Deferred to v0.7+.

### Multi-Perspective Design

- **PARTY-01**: Party Mode for /pde:discuss-phase — multi-persona critique with 2-3 relevant agent perspectives
- **PARTY-02**: BMad Master orchestration pattern routes messages to relevant personas during discussion

### Context Optimization

- **CTXT-01**: CARL-style just-in-time rule unloading for skill injection context management

## Out of Scope

| Feature | Reason |
|---------|--------|
| Direct BMAD agent file import | BMAD agents written for human-directed sequential workflows; PDE agents are autonomous parallel — verbatim import breaks orchestration |
| PAUL .paul/ directory structure | PDE's entire platform built around .planning/; parallel state tree creates two sources of truth |
| BMAD YAML compilation pipeline | PDE already has target format (plain markdown); build step adds complexity for zero benefit |
| PAUL in-session-over-subagents philosophy | PDE's architecture depends on parallel subagent waves; context isolation prevents cross-task contamination |
| Story points and sprint ceremonies | PDE's phase/milestone model is simpler and better suited to AI-assisted development |
| CARL rule unloading | Large scope change to hook system with uncertain payoff in Claude Code's session model |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 46 | Complete |
| FOUND-02 | Phase 46 | Complete |
| FOUND-03 | Phase 46 | Complete |
| PLAN-01 | Phase 47 | Complete |
| PLAN-02 | Phase 47 | Complete |
| PLAN-03 | Phase 48 | Pending |
| PLAN-04 | Phase 48 | Pending |
| PLAN-05 | Phase 48 | Pending |
| VRFY-01 | Phase 49 | Pending |
| VRFY-02 | Phase 49 | Pending |
| VRFY-03 | Phase 50 | Pending |
| VRFY-04 | Phase 50 | Pending |
| VRFY-05 | Phase 49 | Pending |
| TRCK-01 | Phase 51 | Pending |
| TRCK-02 | Phase 51 | Pending |
| TRCK-03 | Phase 51 | Pending |
| AGNT-01 | Phase 52 | Pending |
| AGNT-02 | Phase 52 | Pending |
| AGNT-03 | Phase 52 | Pending |
| AGNT-04 | Phase 52 | Pending |
| AGNT-05 | Phase 52 | Pending |
| INFR-01 | Phase 46 | Complete |
| INFR-02 | Phase 46 | Complete |
| INFR-03 | Phase 46 | Complete |

**Coverage:**
- v0.6 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation — traceability complete*
