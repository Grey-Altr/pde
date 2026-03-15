---
name: pde:setup
description: Install and configure PDE dependencies and MCP servers
argument-hint: ""
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
Execute the /pde:setup command.
</objective>

<process>
**Status:** Planned -- available in PDE v2 (design pipeline).

This command installs and configures PDE dependencies and MCP servers for your environment. It detects your editor, installs required MCP packages, and writes the appropriate configuration files to get the full design pipeline operational.

Related design-pipeline commands: brief, flows, system, wireframe, mockup, critique, hig, iterate, handoff.

See references/mcp-integration.md for documentation on MCP integration and setup requirements.
</process>
