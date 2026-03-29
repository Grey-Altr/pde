---
name: pde:cli-wrap
description: Wrap any approved installed app as an agent-native CLI with dual-strategy routing
argument-hint: "<app-slug> (must be in app-registry with approved status)"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Execute the /pde:cli-wrap command. Wrap an approved app as an agent-native CLI with automatic strategy selection.
</objective>

# /pde:cli-wrap

One-command app wrapping: approval check -> strategy routing -> capability model -> MCP server -> SKILL.md -> bridge registration.

## Usage

`/pde:cli-wrap <slug>`

## What It Does

1. Reads `app-registry.json` to confirm the app has `approved` status
2. Checks if a CLI-Anything pre-built harness (`cli-anything-<slug>`) is available via pipx
3. If harness found: uses it as the capability source (FAST PATH — skips native --help parsing)
4. If no harness: falls back to native `--help` -> capability model -> codegen (FALLBACK PATH)
5. Writes all artifacts to `.planning/app-wrappers/{slug}/`
6. Registers the server with `mcp-bridge.cjs` for immediate tool use

## Output

- `.planning/app-wrappers/{slug}/capability-model.json` -- Unified capability model
- `.planning/app-wrappers/{slug}/server/server.cjs` -- MCP server (stdio transport)
- `.planning/app-wrappers/{slug}/server/SKILL.md` -- Agent skill documentation

## Prerequisites

- App must be discovered and approved: `pde-tools app discover <name>` then `pde-tools app approve <name>`
- For fast path: pipx configured via `pde-tools app pipx-setup` (run once)

## Examples

```
/pde:cli-wrap blender
/pde:cli-wrap gimp
/pde:cli-wrap inkscape
```

## Implementation

```bash
node bin/pde-tools.cjs app cli-wrap "$1"
```

<process>
Run:

```
node bin/pde-tools.cjs app cli-wrap $ARGUMENTS
```

On success: report the strategy used (harness or fallback), the number of capabilities discovered, and the output file paths.
On failure: diagnose the error. Common issues:
- "not approved" — run `pde-tools app approve <slug>` first
- "not in registry" — run `pde-tools app discover <slug>` first
- pipx not found — run `pde-tools app pipx-setup` or install pipx
</process>
