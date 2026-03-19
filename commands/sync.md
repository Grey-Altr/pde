---
name: pde:sync
description: Sync external service data into PDE planning state
argument-hint: '--github [--dry-run]'
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - mcp__github__*
---
<objective>
Execute the /pde:sync command.
</objective>

<process>
Parse $ARGUMENTS to determine which service to sync.

If `--github` is present in $ARGUMENTS, follow @workflows/sync-github.md exactly, passing all of $ARGUMENTS.

If no service flag is provided, display usage:
```
Usage: /pde:sync --github

Sync external service data into PDE planning state.

Available flags:
  --github      Sync GitHub issues to REQUIREMENTS.md
  --dry-run     Preview changes without writing to disk (use with --github)

More services (--linear, --jira, --figma) will be available in later phases.
```
</process>
