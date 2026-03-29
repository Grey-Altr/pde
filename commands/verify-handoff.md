---
name: pde:verify-handoff
description: Verify implementation matches the handoff spec by comparing component APIs and TypeScript interfaces in source files against HANDOFF-SPEC.md — produces a gap report
argument-hint: "[--spec <path>] [--src-dir <path>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---
<objective>
Execute the /pde:verify-handoff command. Compare the handoff spec's component list against the actual TypeScript source files and produce a gap report showing matched, missing, and diverged components.
</objective>

# /pde:verify-handoff

Verify that the implementation matches the handoff spec produced by `/pde:handoff`. Searches TypeScript source files for each component named in the spec, comparing exported interfaces and props. Produces a markdown gap report and JSON stats.

## Usage

`/pde:verify-handoff [--spec <path>] [--src-dir <path>]`

Or via CLI: `node bin/pde-tools.cjs utils verify-handoff [--spec <path>] [--src-dir <path>]`

## Parameters

- `--spec` — Path to the handoff spec markdown file (optional, auto-detects latest `HND-handoff-spec-v*.md` in `.planning/design/handoff/`)
- `--src-dir` — Root source directory to search for component files (default: `src/`)

## Output

Markdown gap report table printed to stdout, followed by JSON stats:

```json
{
  "total": 8,
  "matched": 5,
  "missing": 2,
  "diverged": 1
}
```

Gap report table columns: Component | Spec Status | Code Status | Gap Type

| Gap Type | Meaning |
|----------|---------|
| matched | Component exists in source with matching export |
| missing | Component in spec but no matching file/export found in src/ |
| diverged | Component found but exported interface differs from spec |

## Examples

```
/pde:verify-handoff
/pde:verify-handoff --spec .planning/design/handoff/HND-handoff-spec-v2.md
/pde:verify-handoff --spec spec.md --src-dir packages/ui/src
node bin/pde-tools.cjs utils verify-handoff --src-dir src/components
```

## Workflow

1. Run `/pde:handoff` to generate a handoff spec in `.planning/design/handoff/`
2. Build components from the spec
3. Run `/pde:verify-handoff` to check implementation completeness
4. Address any `missing` or `diverged` gaps
5. Re-run until all components are `matched`

## Notes

- Auto-detects the latest spec file by scanning `.planning/design/handoff/` for `HND-handoff-spec-v*.md` filenames
- If no spec file is found, the command exits with instructions to run `/pde:handoff` first
- Source search is recursive — searches all `.ts`, `.tsx`, `.js`, `.jsx` files under `--src-dir`
- Export matching uses regex search for `export` + component name — does not do full AST analysis
- `diverged` detection is heuristic: looks for exported function/class/interface with the same name but different prop signatures
