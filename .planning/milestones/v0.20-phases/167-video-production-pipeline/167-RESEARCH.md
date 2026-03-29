# Phase 167: Video Production Pipeline - Research

**Researched:** 2026-03-28
**Domain:** Playwright video recording, FFmpeg assembly, Remotion branded video composition
**Confidence:** HIGH

## Summary

Phase 167 builds a four-subcommand video pipeline under `/pde:video`. The architecture is fully locked in CONTEXT.md: Playwright `recordVideo` outputs WebM, FFmpeg converts to MP4 and handles assembly/captions/overlays, Remotion renders branded compositions from PDE design tokens, all assets land in `.planning/design/assets/video/`. The project has Node.js 20.20.0, Playwright already installed (with Chromium at a verified path), but FFmpeg is not installed system-wide. The plan must install `ffmpeg-static` (npm package providing a bundled binary) to avoid a system dependency. Remotion requires React and its own Chromium (downloaded separately into `node_modules/.remotion/`) — this does not conflict with Playwright's Chromium.

The primary complexity points are: (1) Playwright video path is only accessible after `context.close()`, (2) FFmpeg concat demuxer requires all clips to share the same codec/resolution or use re-encode, (3) Remotion needs a dedicated subdirectory with its own `package.json` and TSX/JSX files because it relies on its own bundler, (4) drawtext vs. subtitles filter — both work but subtitles filter (SRT) is simpler for the decided input format.

**Primary recommendation:** Use `ffmpeg-static` npm package as the FFmpeg binary source — no system install required. Structure the Remotion project as `bin/lib/video-pipeline/remotion/` with its own `package.json`, `react`, `react-dom`, `remotion`, and `@remotion/cli` pinned at exact versions.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Video Recording & Assembly**
- `/pde:video <type>` with subcommands: record, assemble, compose, caption
- Playwright `page.video.start()` API with configurable viewport + duration, outputs WebM, auto-convert to MP4 via FFmpeg
- FFmpeg assembly: concat demuxer for sequential clips, crossfade filter for transitions, drawtext filter for captions — all via `execFileSync('ffmpeg', [...])` (safe from shell injection)
- Default resolution 1920x1080 (1080p) with `--resolution WxH` flag and `--resolution 720p` shorthand

**Remotion Branded Videos**
- Standalone Remotion project in `bin/lib/video-pipeline/remotion/` with pre-built compositions reading PDE design tokens
- Read `.planning/design/SYS-*.json` DTCG tokens, extract colors/fonts/spacing, pass as `inputProps` to Remotion compositions
- `npx remotion render` CLI with `--props` JSON, `--codec h264`, outputs MP4

**Captions & Output**
- Caption input: SRT file or inline JSON array `[{start, end, text}]` — both accepted
- FFmpeg drawtext filter with configurable font size, color, position (bottom-center default)
- `.planning/design/assets/video/{slug}-{timestamp}.mp4` with JSON sidecar metadata

### Claude's Discretion
No items deferred.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VID-01 | User can record product UI interactions via Playwright screen capture | Playwright `browser.newContext({ recordVideo: { dir, size } })` — video saved as WebM on `context.close()`, converted to MP4 via FFmpeg |
| VID-02 | User can assemble video clips with FFmpeg (transitions, overlays, captions) | FFmpeg concat demuxer for sequential clips; xfade filter for crossfade transitions; subtitles/drawtext filters for captions |
| VID-03 | User can compose branded product videos via Remotion React components | `npx remotion render <entry> <composition-id> <output.mp4> --codec h264 --props ./props.json` |
| VID-04 | Remotion templates include PDE design tokens (colors, fonts, spacing) | Read `.planning/design/SYS-*.json`, pass token values as `inputProps` to Remotion `<Composition>` |
| VID-05 | Video pipeline produces MP4 output with configurable resolution | FFmpeg `-s WxH` on WebM-to-MP4 convert; Remotion `width`/`height` in `<Composition>`; `--resolution` flag parsing |
| VID-06 | User can add text captions/subtitles to generated videos | FFmpeg `subtitles=file.srt` filter (SRT path) or `drawtext=text=...:enable='between(t,start,end)'` (JSON array) |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| playwright | 1.58.2 (installed) | UI recording via `recordVideo` | Already in project from Phase 165; provides WebM recording via headless Chromium |
| ffmpeg-static | 5.3.0 | Bundled FFmpeg binary | No system install required; `require('ffmpeg-static')` returns binary path for `execFileSync` |
| remotion | 4.0.441 | React-based programmatic video | The decided tool; renders TSX compositions to MP4 via h264 |
| @remotion/cli | 4.0.441 | `npx remotion render` CLI | Required for CLI-driven rendering from CJS orchestrator via `execFileSync` |
| react | 19.2.4 | Remotion peer dependency | Required by Remotion; must install in Remotion subdirectory |
| react-dom | 19.2.4 | Remotion peer dependency | Required by Remotion; must install alongside react |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sharp | 0.34.5 (installed) | Video thumbnail extraction | Extract poster frame from MP4 for sidecar metadata |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ffmpeg-static | System ffmpeg | System ffmpeg requires manual install; ffmpeg-static is self-contained npm install |
| ffmpeg subtitles filter | drawtext per frame | subtitles filter handles SRT natively; drawtext requires manual time-range expressions |
| Remotion isolated package.json | Root package.json | Remotion needs exact pinned versions; isolating prevents version drift with existing deps |

**Installation:**
```bash
# In project root
npm install --save-exact ffmpeg-static@5.3.0

# In bin/lib/video-pipeline/remotion/ (separate package.json)
npm install --save-exact remotion@4.0.441 @remotion/cli@4.0.441 react@19.2.4 react-dom@19.2.4
```

**Version verification:**
- `ffmpeg-static`: 5.3.0 (verified via `npm view ffmpeg-static version`)
- `remotion`: 4.0.441 (verified via `npm view remotion version`)
- `@remotion/cli`: 4.0.441 (verified via `npm view @remotion/cli version`)
- `react`: 19.2.4 (verified via `npm view react version`)
- `react-dom`: 19.2.4 (verified via `npm view react-dom version`)

---

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/video-pipeline/
├── record.cjs          # Playwright recordVideo → WebM → MP4 conversion
├── assemble.cjs        # FFmpeg concat demuxer + xfade transitions
├── caption.cjs         # FFmpeg subtitles/drawtext filter application
├── compose.cjs         # Remotion token extraction + npx remotion render
├── assets.cjs          # saveVideoAsset() — mirrors image-pipeline/assets.cjs
└── remotion/
    ├── package.json    # Isolated: remotion, @remotion/cli, react, react-dom
    ├── index.ts        # registerRoot(RemotionRoot)
    ├── Root.tsx        # <Composition id="branded" ...>
    └── BrandedVideo.tsx # Main composition reading inputProps tokens

.planning/design/assets/video/   # MP4 outputs + .meta.json sidecars
```

### Pattern 1: Playwright WebM Recording
**What:** Launch headless Chromium with `recordVideo` option, navigate URL, perform interactions (or just navigate + wait), close context to flush video, convert WebM to MP4 via FFmpeg.
**When to use:** VID-01 — recording UI interactions.

```javascript
// Source: https://playwright.dev/docs/api/class-video
const { chromium } = require('playwright');
const ffmpegBin = require('ffmpeg-static');
const { execFileSync } = require('child_process');

async function recordUIInteraction({ url, slug, viewport = '1920x1080', durationMs = 5000, outputDir }) {
  const [width, height] = viewport.split('x').map(Number);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: outputDir, size: { width, height } },
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(durationMs);
  await context.close();  // MUST close before calling video.path()
  const webmPath = await page.video().path(); // resolves after context.close()
  const mp4Path = webmPath.replace('.webm', '.mp4');
  // Convert WebM → MP4 (re-encode for codec compatibility in concat demuxer)
  execFileSync(ffmpegBin, [
    '-i', webmPath,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
    '-y', mp4Path,
  ]);
  return mp4Path;
}
```

**Critical pitfall:** `page.video().path()` must be called AFTER `context.close()`. The video is only guaranteed written to disk after context closure. Do NOT call `page.video().path()` before closing.

### Pattern 2: FFmpeg Concat Demuxer (Sequential Assembly)
**What:** Write a concat list file, run FFmpeg concat demuxer with `-c copy` if clips are same codec/resolution, or with re-encode if mixed.
**When to use:** VID-02 — assembling sequential clips.

```javascript
// Source: https://ffmpeg.org/ffmpeg-formats.html (concat demuxer)
const { execFileSync, execSync } = require('child_process');
const ffmpegBin = require('ffmpeg-static');
const fs = require('fs');
const os = require('os');
const path = require('path');

function assembleClips({ clips, outputPath }) {
  // Write concat list file
  const listPath = path.join(os.tmpdir(), `concat-${Date.now()}.txt`);
  const listContent = clips.map(c => `file '${c}'`).join('\n');
  fs.writeFileSync(listPath, listContent);
  execFileSync(ffmpegBin, [
    '-f', 'concat', '-safe', '0',
    '-i', listPath,
    '-c', 'copy',           // assumes same codec/resolution (from recordUIInteraction)
    '-y', outputPath,
  ]);
  fs.unlinkSync(listPath);
  return outputPath;
}
```

### Pattern 3: FFmpeg xfade Crossfade Transition
**What:** For a crossfade between two clips, use the xfade filter. Duration shrinks total by the transition duration.
**When to use:** VID-02 — transitions between clips.

```javascript
// Source: https://ffmpeg.org/ffmpeg-filters.html#xfade
// Two-clip crossfade: output = sum(durations) - transition_duration
function assembleCrossfade({ clipA, clipB, transitionDur = 1, outputPath }) {
  execFileSync(ffmpegBin, [
    '-i', clipA,
    '-i', clipB,
    '-filter_complex', `[0:v][1:v]xfade=transition=fade:duration=${transitionDur}:offset=<clip_a_duration - transition_dur>[v]`,
    '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'fast',
    '-y', outputPath,
  ]);
}
// NOTE: offset = duration_of_clip_a - transition_dur
// For N clips: chain with multiple xfade filters in filtergraph
```

### Pattern 4: FFmpeg Subtitles (SRT Burn-in)
**What:** Burn SRT file directly into video with subtitles filter. Alternatively build SRT from JSON array input.
**When to use:** VID-06 — adding captions from SRT or JSON array.

```javascript
// Source: https://www.bannerbear.com/blog/how-to-add-subtitles-to-a-video-file-using-ffmpeg/
// SRT path input:
execFileSync(ffmpegBin, [
  '-i', inputMp4,
  '-vf', `subtitles=${srtPath}:force_style='Fontsize=24,PrimaryColour=&H00FFFFFF,FontName=Arial'`,
  '-c:a', 'copy',
  '-y', outputMp4,
]);

// JSON array [{start, end, text}] → write as SRT first, then apply same filter
function jsonToSrt(captions) {
  return captions.map((c, i) => {
    const fmt = (s) => new Date(s * 1000).toISOString().slice(11, 23).replace('.', ',');
    return `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n`;
  }).join('\n');
}
```

### Pattern 5: FFmpeg drawtext (inline text overlay, non-SRT)
**What:** Burn a static text label at a position. For time-ranged text use `enable='between(t,start,end)'`.
**When to use:** VID-02 — title overlays, watermarks not tied to SRT.

```javascript
// Source: FFmpeg drawtext filter docs
// Bottom-center text with time-range
const drawtextFilter = [
  `drawtext=text='${text}'`,
  `x=(w-text_w)/2`,
  `y=h-text_h-20`,
  `fontsize=${fontSize}`,
  `fontcolor=white`,
  `enable='between(t,${startSec},${endSec})'`,
].join(':');
execFileSync(ffmpegBin, ['-i', inputMp4, '-vf', drawtextFilter, '-c:a', 'copy', '-y', outputMp4]);
```

### Pattern 6: Remotion Project Structure and Render
**What:** Isolated `package.json` in `bin/lib/video-pipeline/remotion/`, TSX compositions reading `inputProps` tokens, rendered via `npx remotion render` from `compose.cjs`.
**When to use:** VID-03, VID-04 — branded video composition.

```typescript
// Source: https://www.remotion.dev/docs/passing-props
// Root.tsx
import { Composition } from 'remotion';
import { BrandedVideo } from './BrandedVideo';
export const RemotionRoot = () => (
  <Composition
    id="branded"
    component={BrandedVideo}
    durationInFrames={150}   // 5 seconds at 30fps — overridden via inputProps
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ colors: {}, fonts: {}, title: 'Demo' }}
  />
);

// BrandedVideo.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
export const BrandedVideo = ({ colors, fonts, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: colors.background || '#0a0a0a' }}>
      <h1 style={{ color: colors.primary, fontFamily: fonts.heading }}>{title}</h1>
    </AbsoluteFill>
  );
};
```

```javascript
// compose.cjs — call npx remotion render via execFileSync
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function composeVideo({ tokens, slug, outputPath, durationFrames = 150 }) {
  const remotionDir = path.join(__dirname, 'remotion');
  const propsPath = path.join(os.tmpdir(), `remotion-props-${Date.now()}.json`);
  fs.writeFileSync(propsPath, JSON.stringify({ ...tokens, durationFrames }));
  execFileSync(
    'npx',
    ['remotion', 'render', 'index.ts', 'branded', outputPath,
     '--codec', 'h264',
     '--props', propsPath],
    { cwd: remotionDir, stdio: 'inherit' }
  );
  fs.unlinkSync(propsPath);
  return outputPath;
}
```

### Pattern 7: Video Asset Storage (mirrors image pipeline)
**What:** Save MP4 with `.meta.json` sidecar to `.planning/design/assets/video/`.
**When to use:** All video subcommands.

```javascript
// Adapted from bin/lib/image-pipeline/assets.cjs pattern
function saveVideoAsset({ slug, mp4Path, dimensions, params, source, assetsDir }) {
  const videoDir = path.join(assetsDir || ASSETS_DIR, 'video');
  fs.mkdirSync(videoDir, { recursive: true });
  const timestamp = Date.now();
  const filename = `${slug}-${timestamp}.mp4`;
  const destPath = path.join(videoDir, filename);
  fs.copyFileSync(mp4Path, destPath);
  const meta = { type: 'video', source, dimensions, timestamp: new Date(timestamp).toISOString(), params };
  fs.writeFileSync(destPath.replace('.mp4', '.meta.json'), JSON.stringify(meta, null, 2));
  return { path: destPath, meta };
}
```

### Pattern 8: Resolution Flag Parsing
**What:** The `--resolution` flag supports WxH string or shorthand aliases (`720p`, `1080p`, `4k`).

```javascript
const RESOLUTION_ALIASES = { '720p': '1280x720', '1080p': '1920x1080', '4k': '3840x2160' };
function resolveResolution(r = '1920x1080') {
  const canonical = RESOLUTION_ALIASES[r] || r;
  const [width, height] = canonical.split('x').map(Number);
  if (!width || !height) throw new Error(`Invalid resolution: ${r}`);
  return { width, height };
}
```

### Anti-Patterns to Avoid
- **Calling `page.video().path()` before `context.close()`:** Video is not flushed until context close. Always `await context.close()` first, then access the path.
- **Mixing codec/resolution clips with `-c copy` in concat demuxer:** If clips have different resolutions, `-c copy` will fail or produce corrupted output. Always re-encode when resolution may vary.
- **Inline JSON props for Remotion on Windows:** `--props='{"k":"v"}'` strips quotes on Windows shells. Use a temp JSON file path instead (always).
- **Putting Remotion in the root `package.json`:** Version conflicts with existing deps (satori, sharp, zod). Keep Remotion fully isolated in its subfolder.
- **Using `require('ffmpeg-static')` and passing a falsy path:** `ffmpeg-static` returns `null` if the binary is not available for the platform. Add a guard and throw a clear error.
- **xfade offset miscalculation:** Offset must equal `clip_a_duration - transition_duration` not `clip_a_duration`. Wrong offset causes black frames or corrupted output.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FFmpeg binary distribution | Custom download/install script | `ffmpeg-static` npm package | Self-contained, cross-platform, no system dependency; path via `require()` |
| WebM to MP4 conversion | Custom encoder/remuxer | FFmpeg with libx264 | Codec compatibility, muxing complexity; FFmpeg handles all container formats |
| SRT time parsing | Custom SRT parser for caption burn-in | FFmpeg `subtitles=file.srt` filter | libass handles all SRT edge cases (unicode, RTL, overlapping entries) |
| Video duration detection | Custom container parser | FFmpeg `-i input -f null -` or `ffprobe` | Frame counting and timestamp extraction are subtle; let FFmpeg do it |
| Chromium download for Remotion | Manual browser management | Let Remotion auto-download `node_modules/.remotion/` | Remotion manages its own headless shell lifecycle; no conflict with Playwright |

**Key insight:** The entire video pipeline should treat FFmpeg as an external binary invoked via `execFileSync` with array args. This prevents shell injection and offloads all media complexity to a mature tool.

---

## Common Pitfalls

### Pitfall 1: Video Path Unavailable Before Context Close
**What goes wrong:** `page.video().path()` throws or returns undefined if called before `context.close()`.
**Why it happens:** Playwright streams video frames into a WebM file incrementally; the file is only finalized (flushed) when the browser context closes.
**How to avoid:** Always `await context.close()` before `await page.video().path()`. The `video.saveAs(path)` method waits for page close automatically — use it as an alternative.
**Warning signs:** Zero-byte `.webm` file, `path()` returning `undefined`, FFmpeg failing with "invalid data found when processing input."

### Pitfall 2: Remotion Downloads Its Own Chrome
**What goes wrong:** First `npx remotion render` call triggers a ~130MB Chrome Headless Shell download.
**Why it happens:** Remotion manages its own browser installation separate from Playwright.
**How to avoid:** Two options: (a) add `remotion install` as a one-time Wave 0 setup step, or (b) set `browserExecutable` in `remotion.config.ts` to point at the existing Playwright Chromium path (`chromium.executablePath()`). Option (b) saves disk space and CI time.
**Warning signs:** Slow first render, "downloading chrome-headless-shell" log output during test runs.

### Pitfall 3: Remotion Version Mismatch
**What goes wrong:** `remotion`, `@remotion/cli`, and any future `@remotion/*` packages must all be pinned to the exact same version without `^`.
**Why it happens:** Remotion's bundler checks version alignment at startup and throws a hard error on mismatch.
**How to avoid:** Use `--save-exact` on install. Never use `^` in the Remotion `package.json`. The install command is `npm install --save-exact remotion@4.0.441 @remotion/cli@4.0.441`.
**Warning signs:** "Remotion: Version mismatch" error at render time.

### Pitfall 4: xfade Offset Requires Clip Duration
**What goes wrong:** xfade offset must be computed as `duration_of_clip_a - transition_duration`. If the clip duration is unknown at assembly time, the offset will be wrong.
**Why it happens:** xfade offset is relative to the start of the first clip's timeline, not the end.
**How to avoid:** Read clip duration via `ffprobe` before building the xfade filtergraph. `execFileSync(ffprobeBin, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', clipPath])`.
**Warning signs:** Black frames at transition point, output video shorter or longer than expected.

### Pitfall 5: SRT vs. drawtext Filter Choice
**What goes wrong:** CONTEXT.md specifies both SRT and JSON array input — but the filter used differs. If SRT is passed to the drawtext filter (not subtitles filter), it won't render.
**Why it happens:** `subtitles=file.srt` uses libass (handles SRT natively). `drawtext` only draws static/scripted text, not SRT content.
**How to avoid:** Route by input type: if input is `.srt` path → use `subtitles=file.srt` filter. If input is JSON array `[{start, end, text}]` → convert to `.srt` temp file → use `subtitles=tempfile.srt`. Both paths end at the same filter.
**Warning signs:** No captions in output video, FFmpeg filter_complex parse error.

### Pitfall 6: Remotion TSX Requires React Import
**What goes wrong:** Remotion compositions need React in scope. In React 17+ JSX transform, `import React from 'react'` is optional in bundled contexts, but Remotion's internal bundler may require explicit import.
**Why it happens:** Remotion uses its own esbuild-based bundler which may not auto-inject the JSX runtime.
**How to avoid:** Add `import React from 'react';` at the top of every `.tsx` composition file.
**Warning signs:** "React is not defined" error at bundle time.

### Pitfall 7: ffmpeg-static Returns null on Unsupported Platforms
**What goes wrong:** `require('ffmpeg-static')` returns `null` on unsupported architectures, causing a cryptic error when passed to `execFileSync`.
**Why it happens:** ffmpeg-static only ships binaries for darwin (x64, arm64), linux (x64, arm64, ia32, armhf), and win32 (x64, ia32).
**How to avoid:** Guard at module load time: `const FFMPEG = require('ffmpeg-static'); if (!FFMPEG) throw new Error('ffmpeg-static: no binary for this platform');`

---

## Code Examples

### Complete recordVideo → MP4 flow
```javascript
// Source: https://playwright.dev/docs/api/class-video + ffmpeg-static pattern
const { chromium } = require('playwright');
const ffmpegBin = require('ffmpeg-static');
const { execFileSync } = require('child_process');
const path = require('path');
const os = require('os');

async function recordUI({ url, slug, resolution = '1920x1080', durationMs = 5000 }) {
  const [width, height] = resolution.split('x').map(Number);
  const tmpDir = os.tmpdir();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: tmpDir, size: { width, height } },
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(durationMs);
  // CRITICAL: close context BEFORE getting video path
  await context.close();
  await browser.close();
  const webmPath = await page.video().path();
  const mp4Path = path.join(tmpDir, `${slug}-${Date.now()}.mp4`);
  execFileSync(ffmpegBin, [
    '-i', webmPath,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-s', `${width}x${height}`,
    '-c:a', 'aac', '-b:a', '128k',
    '-y', mp4Path,
  ]);
  return mp4Path;
}
```

### Remotion project package.json (bin/lib/video-pipeline/remotion/package.json)
```json
{
  "name": "pde-remotion",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "remotion": "4.0.441",
    "@remotion/cli": "4.0.441",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  }
}
```

### Remotion entry point (index.ts)
```typescript
// Source: https://www.remotion.dev/docs/register-root
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';
registerRoot(RemotionRoot);
```

### FFmpeg concat list file syntax
```
# concat-list.txt — exact format for concat demuxer
file '/absolute/path/clip1.mp4'
file '/absolute/path/clip2.mp4'
file '/absolute/path/clip3.mp4'
```
```bash
# Command
ffmpeg -f concat -safe 0 -i concat-list.txt -c copy output.mp4
```

### SRT format (for JSON-to-SRT conversion)
```
1
00:00:00,000 --> 00:00:03,500
Welcome to Platform Development Engine

2
00:00:04,000 --> 00:00:08,000
Build anything. Ship fast.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| puppeteer video recording | Playwright `recordVideo` built-in | Playwright 1.14+ | No external library needed |
| Remotion Lambda for rendering | Local `npx remotion render` (free) | v0.20 constraint | Zero cost, full local control |
| System ffmpeg dependency | `ffmpeg-static` npm package | npm ecosystem | Portable across machines, no sysadmin |
| Soft-code subtitles (stream) | Hardcoded burn-in via libass | v0.20 approach | Simpler, no player dependency for subtitle rendering |

**Deprecated/outdated:**
- `playwright-video` npm package: Abandoned, uses an old Playwright API. Don't use — Playwright's built-in `recordVideo` supersedes it entirely.
- `fluent-ffmpeg`: Adds abstraction layer over FFmpeg; using `execFileSync` with array args is simpler, safer (no shell injection), and has no extra dependency.

---

## Open Questions

1. **Playwright `page.video()` after context close — reference validity**
   - What we know: `video.path()` resolves after context close; `page.video()` reference must be saved before close
   - What's unclear: Whether calling `page.video()` on a page whose context is already closed is safe — the page object may be garbage collected
   - Recommendation: Save the video object reference BEFORE closing: `const video = page.video(); await context.close(); const webmPath = await video.path();`

2. **Remotion browser reuse with existing Playwright Chromium**
   - What we know: Remotion defaults to downloading Chrome Headless Shell; it can be pointed at an existing binary via `setBrowserExecutable`
   - What's unclear: Whether Playwright's Chromium (Chrome for Testing at `chromium.executablePath()`) is stable enough for Remotion rendering vs Chrome Headless Shell
   - Recommendation: Default to Remotion's auto-download for simplicity; document the `setBrowserExecutable` option as an optimization for CI environments

3. **DTCG token file location for Remotion**
   - What we know: CONTEXT.md says "Read `.planning/design/SYS-*.json`" but no such files exist yet in the project (design-manifest.json is present but has empty artifacts)
   - What's unclear: Whether Remotion compose will always have tokens available at render time
   - Recommendation: Implement graceful fallback defaults in `BrandedVideo.tsx`; `compose.cjs` should pass an empty `{}` if no SYS-*.json files exist, not throw

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All subcommands | ✓ | v20.20.0 | — |
| Playwright / Chromium | VID-01 (record) | ✓ | 1.58.2 / Chromium 1208 | — |
| ffmpeg-static (npm) | VID-02, VID-05, VID-06 | ✗ (not yet installed) | 5.3.0 available | No fallback — must install |
| ffprobe (from ffmpeg-static) | xfade offset calculation | ✗ (not yet installed) | Ships with ffmpeg-static | Install ffmpeg-static |
| remotion + @remotion/cli (npm) | VID-03, VID-04 | ✗ (not yet installed) | 4.0.441 available | No fallback — must install in subfolder |
| react + react-dom | Remotion peer deps | ✗ in Remotion subfolder | 19.2.4 available | No fallback — required by Remotion |
| Chrome Headless Shell (Remotion) | VID-03 render | ✗ (auto-download on first render) | Downloads via Remotion | Point at Playwright Chromium |
| `.planning/design/SYS-*.json` | VID-04 (tokens) | ✗ (no tokens yet in project) | N/A | Default fallback values in BrandedVideo.tsx |
| system ffmpeg | VID-02 (assemble) | ✗ (brew not installed) | 8.1 available via brew | Use ffmpeg-static (npm) — preferred |

**Missing dependencies with no fallback:**
- `ffmpeg-static`: Must add to root `package.json` (`npm install --save-exact ffmpeg-static@5.3.0`)
- `remotion`, `@remotion/cli`, `react`, `react-dom`: Must install in Remotion subfolder (`bin/lib/video-pipeline/remotion/`)

**Missing dependencies with fallback:**
- Chrome Headless Shell (Remotion): Auto-downloads on first render; can alternatively reuse Playwright Chromium via `setBrowserExecutable`
- `.planning/design/SYS-*.json`: BrandedVideo.tsx must have hardcoded default tokens as fallback

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `/vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/phase-167/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VID-01 | `recordUIInteraction()` writes WebM, converts to MP4 | unit (skip if no chromium) | `npx vitest run tests/phase-167/record.test.mjs -x` | ❌ Wave 0 |
| VID-02 | `assembleClips()` concatenates clips, returns valid path | unit (with real ffmpeg-static) | `npx vitest run tests/phase-167/assemble.test.mjs -x` | ❌ Wave 0 |
| VID-03 | `composeVideo()` calls `npx remotion render`, produces MP4 | integration (slow, skip if Remotion not installed) | `npx vitest run tests/phase-167/compose.test.mjs -x` | ❌ Wave 0 |
| VID-04 | `extractTokens()` reads SYS-*.json and returns colors/fonts/spacing | unit | `npx vitest run tests/phase-167/compose.test.mjs -x` | ❌ Wave 0 |
| VID-05 | Output MP4 dimensions match requested resolution | unit (ffprobe verify) | `npx vitest run tests/phase-167/record.test.mjs -x` | ❌ Wave 0 |
| VID-06 | `captionVideo()` with SRT path produces captioned MP4 | unit (with real ffmpeg-static) | `npx vitest run tests/phase-167/caption.test.mjs -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-167/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-167/record.test.mjs` — covers VID-01, VID-05 (skip if no Chromium, mirrors screenshot.test.mjs pattern)
- [ ] `tests/phase-167/assemble.test.mjs` — covers VID-02 (uses real `ffmpeg-static` binary; creates tiny MP4 fixtures via ffmpeg)
- [ ] `tests/phase-167/caption.test.mjs` — covers VID-06 (unit tests for SRT-gen, real FFmpeg for burn-in)
- [ ] `tests/phase-167/compose.test.mjs` — covers VID-03, VID-04 (unit: token extraction; integration: render with `.skipIf(!remotionInstalled)`)
- [ ] `tests/phase-167/fixtures/` — synthetic MP4 clips for assembly/caption tests (generated via ffmpeg lavfi testsrc)

---

## Sources

### Primary (HIGH confidence)
- `https://playwright.dev/docs/api/class-video` — Video class methods, path(), saveAs(), close-before-path requirement
- `https://playwright.dev/docs/videos` — recordVideo option, size configuration, context setup
- `https://www.remotion.dev/docs/cli/render` — Full render command syntax, --props, --codec flags
- `https://www.remotion.dev/docs/passing-props` — inputProps pattern, defaultProps, --props file path
- `https://www.remotion.dev/docs/the-fundamentals` — useCurrentFrame, useVideoConfig, Composition structure
- `https://www.remotion.dev/docs/brownfield` — Installing in existing project, entry point, folder structure
- `https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell` — Remotion browser auto-download, setBrowserExecutable
- `npm view remotion version` → 4.0.441 (verified 2026-03-28)
- `npm view ffmpeg-static version` → 5.3.0 (verified 2026-03-28)

### Secondary (MEDIUM confidence)
- `https://www.bannerbear.com/blog/how-to-add-subtitles-to-a-video-file-using-ffmpeg/` — subtitles filter syntax, force_style parameters
- `https://ffmpeg.org/ffmpeg-formats.html` — concat demuxer input.txt format (`file 'path'`)
- FFmpeg xfade: xfade syntax, transition types, offset parameter (from multiple sources)
- ffmpeg-static GitHub (eugeneware/ffmpeg-static) — `require('ffmpeg-static')` returns binary path pattern

### Tertiary (LOW confidence)
- WebSearch synthesis on FFmpeg drawtext bottom-center positioning — verified from multiple consistent sources but not from official FFmpeg HTML docs directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions npm-verified 2026-03-28
- Architecture: HIGH — patterns verified from official Playwright and Remotion docs
- Pitfalls: HIGH — most from official docs or reproducible behavior (Pitfall 1 from Playwright docs, Pitfall 2/3 from Remotion docs)
- FFmpeg filter syntax: MEDIUM — synthesized from multiple community sources; official FFmpeg filter docs confirmed concepts

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable APIs; Remotion version may update frequently — verify before install)
