---
name: pde:check-readiness
description: Validate phase readiness — checks PROJECT.md, REQUIREMENTS.md, and PLAN.md consistency before execution
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
<objective>
Execute the /pde:check-readiness workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/check-readiness.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/check-readiness.md.
Pass any $ARGUMENTS to the workflow process.
</process>
