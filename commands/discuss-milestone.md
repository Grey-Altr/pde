---
name: pde:discuss-milestone
description: Gather context and scope for a new milestone through adaptive questioning
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
Execute the /pde:discuss-milestone command.
</objective>

<process>
**Status:** Planned -- available in PDE v2.

This command provides an interactive, conversational interface for scoping a new milestone before creating it. It asks adaptive questions to gather context, goals, constraints, and success criteria, then produces a structured brief you can hand to /pde:new-milestone.

For now, use /pde:new-milestone which includes a context-gathering phase as part of milestone creation.

See references/skill-style-guide.md for documentation on the design pipeline command family.
</process>
