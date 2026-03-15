---
name: pde:discuss-phase
description: Gather phase context through adaptive questioning before planning. Use --auto to skip interactive questions (Claude picks recommended defaults).
argument-hint: "<phase> [--auto]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Task
  - mcp__context7__resolve-library-id
  - mcp__context7__query-docs
---
<objective>
Execute the /pde:discuss-phase workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/discuss-phase.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/discuss-phase.md.
Pass any $ARGUMENTS to the workflow process.
</process>
