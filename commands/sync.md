---
name: pde:sync
description: Sync external service data into PDE planning state
argument-hint: '--github | --linear | --jira [--dry-run]'
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - mcp__github__*
  - mcp__linear__*
  - mcp__atlassian__*
---
<objective>
Execute the /pde:sync command.
</objective>

<process>
Parse $ARGUMENTS to determine which service to sync.

If `--github` is present in $ARGUMENTS, follow @workflows/sync-github.md exactly, passing all of $ARGUMENTS.

If `--linear` is present in $ARGUMENTS, follow @workflows/sync-linear.md exactly, passing all of $ARGUMENTS.

If `--jira` is present in $ARGUMENTS, follow @workflows/sync-jira.md exactly, passing all of $ARGUMENTS.

If no service flag is provided, check the task_tracker config to determine the default service:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const fs = req('fs');
const path = req('path');
const configPath = path.join(process.cwd(), '.planning', 'config.json');
let taskTracker = 'none';
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  taskTracker = config.task_tracker || 'none';
} catch {}
process.stdout.write(JSON.stringify({ taskTracker }) + '\n');
EOF
```

Parse the JSON output. Based on `taskTracker`:
- If `taskTracker` is `"linear"`: follow @workflows/sync-linear.md, passing all of $ARGUMENTS.
- If `taskTracker` is `"jira"`: follow @workflows/sync-jira.md, passing all of $ARGUMENTS.
- If `taskTracker` is `"none"` or any other value, display usage:

```
Usage: /pde:sync --github | --linear | --jira

Sync external service data into PDE planning state.

Available flags:
  --github      Sync GitHub issues to REQUIREMENTS.md
  --linear      Sync Linear issues to REQUIREMENTS.md and cycles to ROADMAP.md
  --jira        Sync Jira issues to REQUIREMENTS.md and epics to REQUIREMENTS.md
  --dry-run     Preview changes without writing to disk

Tip: Set a default task tracker with /pde:settings task_tracker linear (or jira)
     Then just run /pde:sync without flags.
```
</process>
