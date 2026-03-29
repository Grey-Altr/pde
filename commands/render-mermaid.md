---
name: pde:render-mermaid
description: Render Mermaid diagrams to SVG or PNG using the mmdr Rust renderer (500-1000x faster than mermaid-cli), with automatic fallback to mmdc
argument-hint: "--input <file.mmd> --output <file.svg> [--format svg|png]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---
<objective>
Execute the /pde:render-mermaid command. Render a Mermaid diagram file to SVG or PNG.
</objective>

# /pde:render-mermaid

Render Mermaid `.mmd` diagram files to SVG or PNG. Uses the mmdr Rust renderer (500-1000x faster than mermaid-cli) when available, with automatic fallback to mmdc.

## Prerequisites

**mmdr (recommended):** 500-1000x faster Rust-based Mermaid renderer.

```bash
brew tap 1jehuang/mmdr && brew install mmdr
```

**mmdc (fallback):** Official Mermaid CLI renderer.

```bash
npm install -g @mermaid-js/mermaid-cli
```

At least one renderer must be installed. If mmdr is installed but not in PATH, set:

```bash
export MMDR_PATH=/path/to/mmdr
```

## Usage

`/pde:render-mermaid --input <file.mmd> --output <file.svg>`

Or via CLI: `node bin/pde-tools.cjs utils render-mermaid --input <file.mmd> --output <file.svg> [--format svg|png]`

## Parameters

- `--input` — Path to the Mermaid `.mmd` source file (required)
- `--output` — Path for the rendered output file (required)
- `--format` — Output format: `svg` or `png` (default: `svg`)

## Output

Rendered SVG or PNG file written to the specified output path. JSON confirmation to stdout:

```json
{
  "input": "diagram.mmd",
  "output": "diagram.svg",
  "format": "svg"
}
```

## Examples

```
/pde:render-mermaid --input .planning/design/ux/flows.mmd --output .planning/design/ux/flows.svg
/pde:render-mermaid --input diagram.mmd --output diagram.png --format png
node bin/pde-tools.cjs utils render-mermaid --input architecture.mmd --output architecture.svg
```

## Notes

- mmdr is auto-detected from PATH or `MMDR_PATH` environment variable
- If mmdr is not found, falls back to mmdc automatically
- If neither renderer is installed, the command exits with an error and installation instructions
- SVG output is recommended for web use (scalable, smaller file size)
- PNG output requires a headless browser (Puppeteer, bundled with mmdc)
