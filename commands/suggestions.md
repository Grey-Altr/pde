---
name: pde:suggestions
description: Print the current idle-time suggestion list to stdout. Shows phase-aware suggestions when a PDE session is active, or a zero-state message when no phase has started.
argument-hint: ""
allowed-tools:
  - Bash
---
<objective>
Print the current PDE idle suggestions.
</objective>

<process>
Run via Bash tool:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" suggestions
```

If `CLAUDE_PLUGIN_ROOT` is not set, resolve it first:

```bash
PLUGIN_ROOT=$(cd "$(dirname "$0")/.." 2>/dev/null && pwd || echo ".")
node "${PLUGIN_ROOT}/bin/pde-tools.cjs" suggestions
```

The command reads the suggestion file from `/tmp/pde-suggestions-{sessionId}.md` (session ID from `.planning/config.json`) and prints the content. If no suggestion file exists, prints the zero-state message.
</process>
