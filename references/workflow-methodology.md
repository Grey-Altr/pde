# Workflow Methodology Reference

> Internal reference for PDE contributors and planner agents. Describes the methodology patterns underlying PDE's v0.6 workflow enhancements.

## Overview

PDE's methodology layer strengthens its existing workflow engine with five interconnected patterns: context constitution, task-file sharding, acceptance-criteria-first planning, post-execution reconciliation, and safe framework updates. These patterns ensure agents receive consistent project context, execute against atomic self-contained task files, plan from verifiable acceptance criteria, reconcile planned work against actual changes, and update framework files without overwriting user customizations.

Each pattern addresses a specific weakness in the pre-v0.6 workflow:

| Pattern | Problem Solved | Phase |
|---------|----------------|-------|
| Context Constitution | Agents independently parse PROJECT.md + STATE.md, producing inconsistent baselines | 46 |
| Task-File Sharding | Large plans consume excessive context; agents load full PLAN.md even for single tasks | 47 |
| AC-First Planning | Tasks lack verifiable completion criteria; "done" is subjective | 48 |
| Post-Execution Reconciliation | No systematic comparison of planned vs actual work after execution | 49 |
| Safe Framework Updates | PDE updates overwrite user-customized framework files | 46 |
| Readiness Gating | No pre-execution validation that plans are consistent and complete | 50 |

## Context Constitution

### What It Does

At milestone boundaries (`/pde:new-project`, `/pde:new-milestone`), PDE generates a compact project baseline document (`.planning/project-context.md`, max 4KB) by synthesizing:

- **Tech Stack** and **Constraints** from PROJECT.md
- **Active Requirements** (unchecked items) from REQUIREMENTS.md
- **Current Milestone** position and **Key Decisions** from STATE.md

### How Agents Use It

Every subagent spawn loads `project-context.md` as the FIRST file in its `<files_to_read>` block. This establishes project-wide conventions as baseline context before plan-specific instructions are loaded. Agents no longer independently extract project context — they receive it pre-synthesized.

### Size Enforcement

The 4KB cap prevents context bloat across milestones. If content exceeds 4096 bytes, truncation follows a priority order:
1. Key Decisions trimmed to last 5 entries
2. Active Requirements trimmed to first 10 entries
3. Tech Stack and Constraints are never truncated (load-bearing for agent decisions)

### Staleness Detection

During execute-phase pre-flight, PDE compares modification timestamps of `project-context.md` vs `PROJECT.md`. If PROJECT.md is newer, a warning is emitted. Automatic regeneration is avoided to prevent overwriting manual customizations — users explicitly regenerate via `/pde:new-milestone`.

## Task-File Sharding

### What It Does

For plans with 5 or more tasks, the planner emits a `tasks/` directory alongside PLAN.md containing one `task-NNN.md` file per task. Each task file is self-contained: it includes the task description, acceptance criteria references, relevant file paths, and any schema snippets needed for execution.

### Why It Matters

A 10-task PLAN.md might consume 30-40% of an executor's context window. By loading only the current `task-NNN.md`, the executor uses ~3-5% per task — a ~90% reduction. This keeps execution quality high throughout long plans.

### Threshold Rule

Plans with fewer than 5 tasks continue to execute directly from PLAN.md. The sharding threshold balances the overhead of file management against the context savings.

## Acceptance-Criteria-First Planning

### What It Does

Every PLAN.md includes a versioned acceptance criteria (AC) section before the task list. Each AC carries a unique identifier (`AC-N`) in BDD Given/When/Then format. Tasks reference the specific AC identifiers they satisfy.

### Verification Chain

1. **Planning:** Planner writes ACs derived from phase requirements
2. **Execution:** Executor completes task and checks referenced ACs
3. **Verification:** Verifier refuses to mark a task DONE unless its referenced ACs are verified as satisfied

### Task Boundaries

Tasks may declare a `boundaries` field listing protected paths or sections. The executor treats these as DO NOT CHANGE zones, logging a warning if those paths are touched during execution. This prevents tasks from accidentally modifying files outside their scope.

## Post-Execution Reconciliation

### What It Does

After every plan execution and before the verifier runs, PDE generates a `RECONCILIATION.md` that compares planned tasks against actual git commits. This surfaces:

- Tasks completed vs planned
- Acceptance criteria satisfaction status per task
- Deviations from the plan (unplanned changes, skipped tasks)
- Unplanned file modifications detected in git

### High-Risk Task Gates

Tasks tagged `risk:high` (migrations, auth changes, CI/CD modifications, destructive refactors) trigger confirmation prompts before and after execution. The executor pauses and waits for user acknowledgment before proceeding.

### Verifier Integration

The verifier reads RECONCILIATION.md as input and surfaces any deviation summary in its verification report. This closes the loop between planning and execution.

## Safe Framework Updates

### What It Does

PDE tracks all framework files (workflows, references, agents, templates, bin scripts) in a SHA256 hash manifest (`.planning/config/files-manifest.csv`). During updates, the manifest determines which files the user has modified vs which remain stock.

### Three-Way Classification

For each tracked file during an update:
- **Hash matches manifest** (user hasn't modified) -> auto-update silently with new version
- **Hash differs from manifest** (user modified) -> preserve user version, emit conflict notice
- **No manifest entry** (first run or new file) -> preserve conservatively, generate manifest entry

### Manifest Format

CSV with four columns: `path`, `sha256` (64-char hex), `source` (`stock` or `user-modified`), `last_updated` (YYYY-MM-DD). Generated at install time and regenerated after each update.

### Conflict Resolution

Non-interactive: user-modified files are preserved automatically. A summary table lists all preserved files after the update completes. Users merge upstream changes manually at their discretion.

## Readiness Gating

### What It Does

Before executing any phase, PDE can validate plan consistency with a readiness check. The check examines:

- PROJECT.md, REQUIREMENTS.md, and PLAN.md alignment
- Missing required sections in plans
- Unmapped requirements (requirement IDs not covered by any plan)

### Gate Results

| Result | Meaning | Execution Behavior |
|--------|---------|-------------------|
| PASS | Plans are consistent and complete | Proceed normally |
| CONCERNS | Minor issues found | Proceed with visible warning |
| FAIL | Critical inconsistencies | Block execution until resolved |

---

## Terminology Mapping

> [Internal use only] Maps PDE terminology to source framework concepts for contributor reference. These terms MUST NOT appear in user-facing command output, error messages, or documentation outside this table.

| PDE Term | Source Framework | Source Concept | Description |
|----------|-----------------|----------------|-------------|
| Context Constitution | BMAD v6 | project-context.md generation | Agent-optimized project baseline synthesized from multiple source files |
| Task-File Sharding | BMAD v6 | Story files | Decomposing plans into atomic per-task files for context reduction |
| Plan Reconciliation | PAUL | Unify step | Comparing planned work against actual git changes post-execution |
| Framework Manifest | BMAD v6 | files-manifest.csv | SHA256 hash tracking for safe framework file updates |
| Readiness Gate | PAUL | Preflight checklist | Pre-execution validation of plan consistency and completeness |
| AC-First Planning | PAUL | Acceptance criteria contract | Defining verifiable criteria before implementation begins |
| Risk Tagging | PAUL | HALT checkpoints | Flagging high-risk tasks for human confirmation gates |
| Agent Baseline Context | BMAD v6 | Context constitution | Pre-synthesized project context loaded by all agents |

---

*Created: Phase 46 (v0.6) — Methodology Foundation*
*Last updated: 2026-03-19*
