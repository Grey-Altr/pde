# Phase 167: Video Production Pipeline - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the video production pipeline: `/pde:video` command with subcommands for Playwright UI recording, FFmpeg clip assembly with transitions/overlays/captions, Remotion branded video composition using PDE design tokens, and caption rendering via FFmpeg drawtext. All assets stored in `.planning/design/assets/video/` with JSON sidecar metadata.

</domain>

<decisions>
## Implementation Decisions

### Video Recording & Assembly
- `/pde:video <type>` with subcommands: record, assemble, compose, caption
- Playwright `page.video.start()` API with configurable viewport + duration, outputs WebM, auto-convert to MP4 via FFmpeg
- FFmpeg assembly: concat demuxer for sequential clips, crossfade filter for transitions, drawtext filter for captions — all via `execFileSync('ffmpeg', [...])` (safe from shell injection)
- Default resolution 1920x1080 (1080p) with `--resolution WxH` flag and `--resolution 720p` shorthand

### Remotion Branded Videos
- Standalone Remotion project in `bin/lib/video-pipeline/remotion/` with pre-built compositions reading PDE design tokens
- Read `.planning/design/SYS-*.json` DTCG tokens, extract colors/fonts/spacing, pass as `inputProps` to Remotion compositions
- `npx remotion render` CLI with `--props` JSON, `--codec h264`, outputs MP4

### Captions & Output
- Caption input: SRT file or inline JSON array `[{start, end, text}]` — both accepted
- FFmpeg drawtext filter with configurable font size, color, position (bottom-center default)
- `.planning/design/assets/video/{slug}-{timestamp}.mp4` with JSON sidecar metadata

### Claude's Discretion
No items deferred.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/image-pipeline/assets.cjs` — saveAsset(), listAssets() (from Phase 165)
- `bin/lib/image-pipeline/screenshot.cjs` — Playwright capture patterns (from Phase 165)
- `sharp` — installed, available for thumbnail generation
- Playwright — installed from Phase 165

### Established Patterns
- CJS modules in bin/lib/
- pde-tools.cjs subcommand routing
- JSON sidecar metadata pattern from image pipeline
- .planning/design/assets/ directory structure

### Integration Points
- New modules in bin/lib/video-pipeline/: record.cjs, assemble.cjs, compose.cjs, caption.cjs
- Remotion project in bin/lib/video-pipeline/remotion/
- pde-tools.cjs additions: `video record|assemble|compose|caption`
- commands/video.md for /pde:video

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond decided architecture.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
