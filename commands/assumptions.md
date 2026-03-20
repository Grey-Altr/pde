---
name: pde:assumptions
description: Surface planner assumptions about a phase before planning begins.
argument-hint: "[phase-number]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

# /pde:assumptions

Surface planner assumptions about a phase before planning begins.

**Usage:** `/pde:assumptions [phase-number]`

**Workflow:** workflows/list-phase-assumptions.md

**Arguments:**
- `phase-number` — Phase to analyze (required)

**Examples:**
- `/pde:assumptions 52` — Surface assumptions for Phase 52

**Related:**
- `/pde:list-phase-assumptions` — Same workflow (alias)
- `/pde:plan-phase` — Includes assumptions gate (Step 7.6)

<objective>
Execute the /pde:assumptions workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/list-phase-assumptions.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/list-phase-assumptions.md.
Pass any $ARGUMENTS to the workflow process.
</process>
