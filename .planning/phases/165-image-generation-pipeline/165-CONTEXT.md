# Phase 165: Image Generation Pipeline - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the image generation pipeline: `/pde:image` command with subcommands for OG images (Satori), social cards (3 platform sizes), device mockups (Sharp compositing), product screenshots (Playwright), and background removal (remove.bg free tier). All assets stored in `.planning/design/assets/` with JSON sidecar metadata.

</domain>

<decisions>
## Implementation Decisions

### Image Generation Commands
- `/pde:image <type> [options]` single command with subcommands: og, social, mockup, screenshot, rembg
- OG images via Satori (JSX → SVG → @resvg/resvg-js → PNG) — no browser needed, pure Node.js, free
- Social cards auto-generate all 3 variants from one data input: Twitter/X (1200x628), LinkedIn (1200x627), Facebook (1200x630)
- Device mockups via Sharp compositing — overlay screenshot onto pre-built browser/phone frame PNG templates in templates/mockup-frames/

### Screenshot & Background Removal
- Named viewport presets: `desktop` (1440x900), `tablet` (768x1024), `mobile` (375x812), `custom WxH`
- PNG always (lossless, needed for compositing downstream) with optional `--format jpg` for smaller files
- remove.bg free tier API (50 images/month) with `REMOVEBG_API_KEY` env var, graceful degradation if no key
- Track usage in `.planning/cli-anything/removebg-usage.json` with monthly reset, warn at 40/50, block at 50

### Asset Storage & Metadata
- `.planning/design/assets/{type}/{slug}-{timestamp}.png` with types: og, social, mockup, screenshot, rembg
- JSON sidecar per asset: `{slug}-{timestamp}.meta.json` with `{ type, source, dimensions, timestamp, params, hash }`
- `pde-tools.cjs image list [--type og|social|...]` returns JSON array of all assets with metadata
- OG/social templates are JSX functions in `bin/lib/image-pipeline/templates/` — user can add custom templates

### Claude's Discretion
No items deferred to Claude's discretion — all grey areas resolved by user.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/pde-tools.cjs` — Central CLI with subcommand routing pattern (cli-anything already added)
- `bin/lib/cli-anything/model.cjs` — CapabilityModelSchema pattern for asset metadata schemas
- Existing CJS module pattern in bin/lib/
- Playwright MCP available for screenshot capture

### Established Patterns
- CJS modules (.cjs) in bin/lib/
- pde-tools.cjs subcommand routing
- Skill commands in commands/*.md
- .planning/ directory for all generated artifacts
- JSON metadata sidecars (see cli-anything capability model pattern)

### Integration Points
- New `/pde:image` command in commands/image.md
- New modules in bin/lib/image-pipeline/: og.cjs, social.cjs, mockup.cjs, screenshot.cjs, rembg.cjs, assets.cjs
- Templates in templates/mockup-frames/ (browser.png, phone.png)
- Templates in bin/lib/image-pipeline/templates/ (og-default.cjs, social-default.cjs)
- pde-tools.cjs additions: `image og|social|mockup|screenshot|rembg|list`
- Phase 166 consumes assets for visual diff

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decided architecture.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
