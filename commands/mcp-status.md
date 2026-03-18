---
name: pde:mcp-status
description: Display connection status for all configured MCP integrations
argument-hint: '[--json] [--no-mcp]'
allowed-tools:
  - Read
  - Bash
---
<objective>
Execute the /pde:mcp-status command.
</objective>

<process>
Follow @workflows/mcp-status.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
