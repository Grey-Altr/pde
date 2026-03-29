---
name: pde:video
description: Record, assemble, compose, and caption product videos — Playwright UI capture, FFmpeg assembly, Remotion branded compositions
argument-hint: "<subcommand> [options]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---
<objective>
Execute the /pde:video command. Record and produce videos for product assets.
</objective>

# /pde:video

Record and produce product videos — UI interaction recordings, assembled clips, branded Remotion compositions, and captioned outputs. All assets are stored in `.planning/design/assets/video/` with JSON metadata sidecars.

## Usage

`/pde:video <subcommand> [options]`

## Subcommands

### record — Record UI Interaction

Record a product UI interaction via headless Playwright Chromium, capturing a video of the specified URL.

```
/pde:video record <url> [--slug <slug>] [--resolution <WxH|720p|1080p|4k>] [--duration <ms>]
```

Arguments:
- `<url>` — URL to record (required, positional)

Options:
- `--slug` — Identifier slug for output filename (default: `recording`)
- `--resolution` — Output resolution preset or custom `WxH` (default: `1920x1080`)
- `--duration` — Recording duration in milliseconds (default: `5000`)

Example:
```
/pde:video record https://example.com --slug homepage-demo --resolution 1080p --duration 8000
/pde:video record https://app.example.com/dashboard --slug dashboard-walkthrough --resolution 1920x1080
```

### assemble — Assemble Video Clips

Assemble multiple video clips into a single output using FFmpeg. Supports sequential concatenation and crossfade transitions.

```
/pde:video assemble <clip1.mp4> <clip2.mp4> [...] [--transition crossfade] [--transition-dur <sec>] [--slug <slug>]
```

Arguments:
- `<clip1.mp4> <clip2.mp4> [...]` — Two or more input video clip paths (required, positional)

Options:
- `--transition` — Transition type: `none` (default, sequential concat) or `crossfade`
- `--transition-dur` — Transition duration in seconds (default: `1`)
- `--slug` — Identifier slug for output filename (default: `assembled`)

Example:
```
/pde:video assemble intro.mp4 demo.mp4 outro.mp4 --slug full-demo
/pde:video assemble clip1.mp4 clip2.mp4 --transition crossfade --transition-dur 0.5 --slug crossfade-demo
```

### compose — Compose Branded Video

Compose a branded product video via Remotion, reading PDE design tokens automatically from `.planning/design/SYS-*.json`.

```
/pde:video compose [--title <title>] [--subtitle <subtitle>] [--slug <slug>] [--resolution <WxH|720p|1080p|4k>] [--duration-frames <n>]
```

Options:
- `--title` — Main title text (default: `Product Demo`)
- `--subtitle` — Subtitle text shown below title (default: empty)
- `--slug` — Identifier slug for output filename (default: `branded`)
- `--resolution` — Output resolution preset or custom `WxH` (default: `1920x1080`)
- `--duration-frames` — Total duration in frames at 30fps (default: `150` = 5 seconds)

Reads PDE design tokens from `.planning/design/SYS-*.json` automatically for brand colors, typography, and spacing.

Example:
```
/pde:video compose --title "Platform Development Engine" --subtitle "From idea to shipped product" --slug pde-launch
/pde:video compose --title "v0.20 Release" --slug v020-announce --duration-frames 300
```

### caption — Add Captions to Video

Add captions or subtitles to a video using FFmpeg. Accepts either an SRT file or a JSON array of caption entries.

```
/pde:video caption <input.mp4> [--srt <file.srt>] [--captions '<json>'] [--font-size <n>] [--slug <slug>]
```

Arguments:
- `<input.mp4>` — Input video file path (required, positional)

Options:
- `--srt` — Path to an SRT subtitle file
- `--captions` — JSON array of caption objects: `[{"start": 0, "end": 3, "text": "Hello"}]`
- `--font-size` — Caption font size in pixels (default: `24`)
- `--slug` — Identifier slug for output filename (default: `captioned`)

One of `--srt` or `--captions` is required.

SRT format example (`captions.srt`):
```srt
1
00:00:00,000 --> 00:00:03,000
Welcome to the Platform Development Engine

2
00:00:03,500 --> 00:00:07,000
From idea to shipped product
```

JSON captions format example:
```json
[
  {"start": 0, "end": 3, "text": "Welcome to the Platform Development Engine"},
  {"start": 3.5, "end": 7, "text": "From idea to shipped product"}
]
```

Example:
```
/pde:video caption demo.mp4 --srt captions.srt --slug demo-captioned
/pde:video caption demo.mp4 --captions '[{"start":0,"end":3,"text":"Hello world"}]' --font-size 32 --slug demo-captioned
```

## Resolution Shortcuts

| Alias | Resolution  |
|-------|-------------|
| `720p`  | 1280x720  |
| `1080p` | 1920x1080 |
| `4k`    | 3840x2160 |

Custom resolutions use `WxH` format (e.g. `1280x720`).

## Asset Storage

All generated assets are stored at:

```
.planning/design/assets/video/{slug}-{timestamp}.mp4
```

Each asset has a JSON metadata sidecar:

```
.planning/design/assets/video/{slug}-{timestamp}.meta.json
```

Sidecar format:
```json
{
  "type": "video",
  "source": "record",
  "dimensions": { "width": 1920, "height": 1080 },
  "timestamp": "2026-03-29T00:00:00.000Z",
  "params": { "url": "https://...", "slug": "homepage-demo", "durationMs": 5000 },
  "hash": "sha256hex"
}
```

## Prerequisites

Install required Node.js packages:

```bash
npm install playwright
npx playwright install chromium
```

For `compose` (Remotion):
```bash
npm install remotion @remotion/renderer @remotion/bundler
```

For `assemble` and `caption` (FFmpeg): `ffmpeg-static` is bundled as an npm dependency — no system FFmpeg installation required. It is installed automatically with `npm install`.

## Implementation

```bash
node bin/pde-tools.cjs video $ARGUMENTS
```

<process>
Parse the subcommand from $ARGUMENTS and run:

```bash
node bin/pde-tools.cjs video $ARGUMENTS
```

**record:** Playwright launches headless Chromium and records the viewport. Output is JSON metadata of the generated MP4. Report the saved path and resolution used.

**assemble:** FFmpeg concatenates the provided clips. If `--transition crossfade` is specified, applies a crossfade filter between each pair of clips. Output is JSON metadata of the assembled MP4.

**compose:** Remotion renders a branded video composition reading design tokens from `.planning/design/SYS-*.json`. Output is JSON metadata of the composed MP4.

**caption:** FFmpeg overlays captions from SRT or JSON onto the input video. Output is JSON metadata of the captioned MP4.

On failure: diagnose the error — check that dependencies are installed (FFmpeg on PATH, `npm install`, Playwright installed), and that input file paths exist.
</process>
