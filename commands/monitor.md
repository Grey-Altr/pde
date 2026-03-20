---
name: pde:monitor
description: Launch the PDE monitoring dashboard — a persistent tmux session showing live agent activity, pipeline progress, file changes, log stream, token/cost meter, and context utilization from the event stream.
argument-hint: "[--kill]"
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---
<objective>
Execute the /pde:monitor workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/monitor.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/monitor.md. Pass all of $ARGUMENTS to the workflow.
</process>
