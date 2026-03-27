---
name: pde:sessions
description: List active dispatch sessions or stop a specific session
argument-hint: "[stop <id>]"
allowed-tools:
  - Bash
  - Read
---
<objective>
List or manage active PDE dispatch sessions.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/sessions.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/sessions.md.
Pass any $ARGUMENTS to the workflow process.
</process>
