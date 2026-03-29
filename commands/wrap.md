---
name: pde:wrap
description: Auto-wrap any CLI binary as an agent-native MCP server with recursive subcommand discovery
argument-hint: "<binary-path> (binary name on PATH or absolute path)"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Execute the /pde:wrap command. Wrap a CLI binary as an agent-native MCP server.
</objective>

# /pde:wrap

Auto-wrap any CLI binary as an agent-native MCP server.

## Usage

`/pde:wrap <binary-path>`

## What It Does

1. Resolves the binary path (supports both absolute paths and PATH lookup)
2. Recursively parses `--help` output to discover subcommands (max depth 3)
3. Extracts flags and arguments for each subcommand
4. Generates a unified capability model (type: 'cli')
5. Generates a self-contained MCP server (server.cjs) with stdio transport
6. Generates a SKILL.md for agent discovery
7. Writes all artifacts to `.planning/cli-anything/{slug}/`

## Output

- `.planning/cli-anything/{slug}/capability-model.json` -- Unified capability model
- `.planning/cli-anything/{slug}/server/server.cjs` -- MCP server (stdio transport)
- `.planning/cli-anything/{slug}/server/SKILL.md` -- Agent skill documentation

## Examples

```
/pde:wrap git
/pde:wrap /usr/local/bin/gh
/pde:wrap npm
```

## Server Flags

- `--dry-run` -- Log commands without executing them
- Every tool accepts `useJson: true` to append `--json` to the command

## Next Steps

After wrapping, publish to the local CLI-Hub registry:
```
/pde:publish {slug}
```

## Implementation

```bash
node bin/pde-tools.cjs cli-anything wrap "$1"
```

<process>
Run:

```
node bin/pde-tools.cjs cli-anything wrap $ARGUMENTS
```

On success: report the output files written (capability-model.json, server.cjs, SKILL.md) and the number of capabilities discovered.

On failure: diagnose the error — check that the binary exists and is executable. Try running `which <binary>` to verify it is on PATH.
</process>
