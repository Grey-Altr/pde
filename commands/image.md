---
name: pde:image
description: Generate production-ready images — OG images, social cards, device mockups, screenshots, and background removal
argument-hint: "<subcommand> [options]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---
<objective>
Execute the /pde:image command. Generate and manage images for product assets.
</objective>

# /pde:image

Generate production-ready images for your product — OG images, social media cards, device mockups, URL screenshots, and background removal. All assets are stored in `.planning/design/assets/` with JSON metadata sidecars.

## Usage

`/pde:image <subcommand> [options]`

## Subcommands

### og — Generate OG Image

Generate a 1200x630 Open Graph image from product data using Satori (JSX to SVG to PNG, pure Node.js).

```
/pde:image og --title <title> --description <description> --slug <slug>
```

Options:
- `--title` — Page or product title (required)
- `--description` — Short description shown below title
- `--slug` — Identifier slug used in the output filename
- `--template` — Custom template function path (defaults to og-default)

Example:
```
/pde:image og --title "Platform Development Engine" --description "From idea to shipped product" --slug pde-og
```

### social — Generate Social Cards

Generate social media cards for all 3 platforms from one data input: Twitter/X (1200x628), LinkedIn (1200x627), Facebook (1200x630).

```
/pde:image social --title <title> --description <description> --slug <slug>
```

Options:
- `--title` — Product or page title
- `--description` — Short description
- `--slug` — Identifier slug (3 files created: `{slug}-twitter-…`, `{slug}-linkedin-…`, `{slug}-facebook-…`)

Example:
```
/pde:image social --title "v0.20 Launch" --description "CLI-Anything + Asset Engine" --slug v020-launch
```

### screenshot — Capture URL Screenshot

Capture a product screenshot via headless Playwright Chromium at named viewport sizes.

```
/pde:image screenshot <url> [--viewport <preset>] [--slug <slug>] [--format <format>]
```

Arguments:
- `<url>` — URL to capture (required, positional)

Options:
- `--viewport` — Preset: `desktop` (1440x900), `tablet` (768x1024), `mobile` (375x812), or custom `WxH` (e.g. `1280x800`)
- `--slug` — Identifier slug for output filename
- `--format` — `png` (default, lossless) or `jpg`
- `--timeout` — Navigation timeout in milliseconds (default: 30000)

Example:
```
/pde:image screenshot https://example.com --viewport desktop --slug homepage
/pde:image screenshot https://example.com --viewport mobile --slug homepage-mobile --format jpg
```

### mockup — Composite Device Mockup

Composite a screenshot onto a browser or phone device frame using Sharp.

```
/pde:image mockup <screenshot-path> [--frame <frame>] [--slug <slug>]
```

Arguments:
- `<screenshot-path>` — Path to the screenshot PNG to composite (required, positional)

Options:
- `--frame` — Device frame template: `browser` (default) or `phone`
- `--slug` — Identifier slug for output filename

Example:
```
/pde:image mockup .planning/design/assets/screenshot/homepage-1234567890.png --frame browser --slug homepage-mockup
/pde:image mockup .planning/design/assets/screenshot/homepage-mobile-1234567890.png --frame phone --slug homepage-phone-mockup
```

### rembg — Remove Image Background

Remove the background of an image via the remove.bg API. Requires `REMOVEBG_API_KEY` environment variable. Gracefully skips if no key is set.

```
/pde:image rembg <image-path> [--slug <slug>]
```

Arguments:
- `<image-path>` — Path to the input image (required, positional)

Options:
- `--slug` — Identifier slug for output filename

Limits:
- Free tier: 50 images/month
- Warns at 40/50 uses
- Blocks at 50/50 uses
- Usage tracked in `.planning/cli-anything/removebg-usage.json` with monthly reset

Prerequisites:
```bash
export REMOVEBG_API_KEY=your_key_here
```

Example:
```
/pde:image rembg assets/product-photo.png --slug product-nobg
```

### list — List Generated Assets

List all generated image assets with metadata. Optionally filter by type.

```
/pde:image list [--type <type>]
```

Options:
- `--type` — Filter by asset type: `og`, `social`, `mockup`, `screenshot`, or `rembg`

Output: JSON array of asset metadata objects including type, source, dimensions, timestamp, params, hash, file, and dir fields.

Example:
```
/pde:image list
/pde:image list --type og
/pde:image list --type screenshot
```

## Asset Storage

All generated assets are stored at:

```
.planning/design/assets/{type}/{slug}-{timestamp}.png
```

Each asset has a JSON metadata sidecar:

```
.planning/design/assets/{type}/{slug}-{timestamp}.meta.json
```

Sidecar format:
```json
{
  "type": "og",
  "source": "ogDefault",
  "dimensions": { "width": 1200, "height": 630 },
  "timestamp": "2026-03-29T00:00:00.000Z",
  "params": { "title": "...", "description": "..." },
  "hash": "sha256hex"
}
```

## Prerequisites

Install required Node.js packages:

```bash
npm install satori @resvg/resvg-js sharp playwright htm
npx playwright install chromium
```

Set environment variables (optional — only for rembg):

```bash
export REMOVEBG_API_KEY=your_key_here
```

## Implementation

```bash
node bin/pde-tools.cjs image $ARGUMENTS
```

<process>
Parse the subcommand from $ARGUMENTS and run:

```bash
node bin/pde-tools.cjs image $ARGUMENTS
```

**og / social:** Output is JSON metadata of the generated asset(s). Report the output path(s) and dimensions.

**screenshot:** Playwright launches headless Chromium. Report the saved path and viewport used. If Playwright is not installed, suggest running `npx playwright install chromium`.

**mockup:** Composites screenshot onto device frame. Report output path and frame type used.

**rembg:** Calls remove.bg API. If `REMOVEBG_API_KEY` is not set, status will be `{ "status": "skipped", "reason": "no API key" }` — inform the user to set the env var. If monthly limit is reached, inform the user.

**list:** Output JSON array. Format as a summary table for readability: type, slug, dimensions, timestamp.

On failure: diagnose the error — check that dependencies are installed (`npm install`) and that the input paths exist.
</process>
