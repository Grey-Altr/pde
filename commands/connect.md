---
name: pde:connect
description: Connect PDE to an approved external MCP server with guided auth instructions
argument-hint: '<service> [--confirm] [--disconnect]'
allowed-tools:
  - Read
  - Write
  - Bash
---
<objective>
Execute the /pde:connect command.
</objective>

<process>
Follow @workflows/connect.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
