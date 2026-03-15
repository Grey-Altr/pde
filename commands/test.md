---
name: pde:test
description: Validate skill files against style rules and run smoke tests
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
Execute the /pde:test command.
</objective>

<process>
**Status:** Planned -- available in PDE v2 (design pipeline).

This command validates PDE skill files against the skill style guide rules and runs smoke tests to verify command invocations work end-to-end. It checks frontmatter completeness, workflow reference integrity, and output format compliance.

Related design-pipeline commands: brief, flows, system, wireframe, mockup, critique, hig, iterate, handoff.

See references/skill-style-guide.md for documentation on skill file validation rules.
</process>
