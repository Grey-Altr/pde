---
name: pde:migrate
description: Migrate an existing project to the latest PDE project structure
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
Execute the /pde:migrate command.
</objective>

<process>
**Status:** Planned -- available in PDE v2 (design pipeline).

This command migrates an existing project to the latest PDE project structure. It detects your current project format, applies the necessary structural transformations, seeds missing templates (including design-milestone.md), and updates configuration files to be compatible with the current PDE version.

Related design-pipeline commands: brief, flows, system, wireframe, mockup, critique, hig, iterate, handoff.

See references/skill-style-guide.md for documentation on the design pipeline workflow.
</process>
