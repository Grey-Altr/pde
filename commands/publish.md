---
name: pde:publish
description: Publish a wrapped CLI to the local CLI-Hub registry
argument-hint: "<slug> (slug of previously wrapped CLI, e.g. git, gh, npm)"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Execute the /pde:publish command. Publish a wrapped CLI to the local CLI-Hub registry.
</objective>

# /pde:publish

Publish a wrapped CLI to the local CLI-Hub registry.

## Usage

`/pde:publish <slug>`

## What It Does

1. Validates that capability-model.json, server.cjs, and SKILL.md exist for the slug
2. Reads capability model metadata
3. Registers an entry in `.planning/cli-anything/registry.json`
4. Entry includes: name, version, description, binary path, capability count, file paths, timestamp

## Registry

The registry is a local JSON file at `.planning/cli-anything/registry.json`. It stores metadata for all published CLIs. Use `/pde:list` or `pde-tools cli-anything list` to view entries.

## Examples

```
/pde:publish git
/pde:publish gh
```

## Listing Published CLIs

```bash
node bin/pde-tools.cjs cli-anything list
```

## Implementation

```bash
node bin/pde-tools.cjs cli-anything publish "$1"
```

<process>
Run:

```
node bin/pde-tools.cjs cli-anything publish $ARGUMENTS
```

On success: report that the CLI was registered and the number of capabilities.

On failure: diagnose the error — check that the slug was previously wrapped with `/pde:wrap`. The following artifacts must exist:
- `.planning/cli-anything/{slug}/capability-model.json`
- `.planning/cli-anything/{slug}/server/server.cjs`
- `.planning/cli-anything/{slug}/server/SKILL.md`
</process>
