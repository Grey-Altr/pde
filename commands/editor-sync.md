---
name: pde:editor-sync
description: Regenerate all editor context files from current .planning/ state
argument-hint: '[--editor cursor|gemini|agents|antigravity|all]'
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---
<objective>
Execute the /pde:editor-sync command.
</objective>

<process>
Follow @workflows/editor-sync.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
