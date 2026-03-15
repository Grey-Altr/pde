---
name: pde:reapply-patches
description: Re-apply patches after a PDE update
argument-hint: ""
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
Execute the /pde:reapply-patches command.
</objective>

<process>
**Status:** Planned -- available in PDE v2.

This command will re-apply any local customizations or patches to PDE skill files after running /pde:update, preserving user modifications across version upgrades. It tracks a patch manifest and applies diffs intelligently.

For now, re-run /pde:update to get the latest version and manually reapply any local changes afterward.

See references/skill-style-guide.md for documentation on customizing PDE skill files.
</process>
