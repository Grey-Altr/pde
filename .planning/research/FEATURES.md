# Feature Research

**Domain:** Desktop App CLI Integration + Design Pipeline — PDE next milestone
**Researched:** 2026-03-28
**Confidence:** MEDIUM-HIGH (CLI-Anything verified against live repo; integration patterns from current ecosystem)

---

## Context: What Already Exists

Before listing new features, the following are already built and must not be redone:

| Already Shipped | Version |
|----------------|---------|
| OpenAPI/JSON Schema/GraphQL/MCP parsers → unified capability model | v0.20 Phase 163 |
| AI SDK tool() codegen from capability models | v0.20 Phase 163 |
| --help → MCP server + SKILL.md + registry publishing | v0.20 Phase 164 |
| Image pipeline (OG/social/mockup/screenshot/rembg) | v0.20 Phase 165 |
| Video pipeline (record/assemble/compose/caption) | v0.20 Phase 167 |
| 3D pipeline (text-to-3D, image-to-3D, GLB optimize, model-viewer) | v0.20 Phase 168 |
| Parametric CAD (CadQuery → STEP) | v0.20 Phase 169 |
| Playwright MCP for browser automation | v0.14 |
| MCP bridge with 7 APPROVED_SERVERS, 57 TOOL_MAP entries | v0.5 |

---

## CLI-Anything (HKUDS) — Verified Findings

Source: https://github.com/HKUDS/CLI-Anything (verified 2026-03-28, repo active)

### Supported Applications (27 registered in registry.json)

| Category | Apps |
|----------|------|
| AI/ML | Ollama, ComfyUI, NotebookLM, Novita |
| 3D & Graphics | Blender, FreeCAD, RenderDoc |
| Image Editing | GIMP, Inkscape, Krita |
| Video Editing | Kdenlive, Shotcut |
| Audio | Audacity |
| Music Notation | MuseScore |
| Office | LibreOffice, Mubu |
| Design | Sketch, Draw.io |
| Diagrams | Mermaid |
| Web/Browser | Browser (DOMShell) |
| Network | AdGuardHome, RMS |
| Communication | Zoom |
| Content Gen | AnyGen |
| Streaming | OBS Studio |
| Development | iTerm2 |

**Design-pipeline-relevant apps** (highest value for PDE):
- **Blender** — 3D modeling, scene rendering, compositing (integrates with existing 3D pipeline)
- **GIMP** — Raster image editing, batch processing, scripting via Script-Fu
- **Inkscape** — SVG vector editing, icon production, design token export
- **Krita** — Digital painting, texture creation, concept art
- **FreeCAD** — Parametric modeling, Python scripting (integrates with CAD pipeline)
- **ComfyUI** — Diffusion workflow nodes, image generation pipeline control
- **OBS Studio** — Screen recording, scene composition (integrates with video pipeline)
- **LibreOffice** — Document export, presentation generation, calc scripting

### The 7-Phase Pipeline (verified from HARNESS.md)

```
Phase 1: Codebase Analysis
  - Identify backend engine, map GUI actions to APIs
  - Catalog existing CLI entry points
  - Document undo/command system

Phase 2: CLI Architecture Design
  - Stateful REPL vs subcommand CLI decision
  - Command group taxonomy
  - Output schema: human-readable + JSON dual format

Phase 3: Implementation
  - Data layer + probe/info commands
  - Mutation commands via subprocess to real software
  - Rendering/export pipelines
  - Session management + REPL interface

Phase 4: Test Planning (TEST.md written before code)
  - Unit test inventory
  - E2E test plans with real software
  - Realistic workflow scenarios

Phase 5: Test Implementation
  - Unit tests, E2E tests invoking actual application
  - Subprocess tests, output verification

Phase 6: Test Documentation
  - Append results + coverage analysis to TEST.md

Phase 6.5: SKILL.md Generation (added 2026-03-16)
  - YAML frontmatter + markdown doc
  - Auto-discoverable by AI agents after pip install
  - REPL banner displays absolute path to skill file

Phase 7: PyPI Publishing
  - setup.py, pip install cli-anything-<software>
  - Entry point: cli-anything-<software> <command> [options]
```

### Output Format

Every generated CLI produces:
- `--json` flag — structured JSON for agent consumption
- Default — human-readable text for debugging
- REPL mode — stateful interactive session

### Discovery/Registration/Invocation Lifecycle

```
Discovery:    Agent reads cli-hub-meta-skill/SKILL.md (catalog index)
              OR reads installed package's SKILL.md directly
Registration: PR to registry.json -> GitHub Actions -> CLI-Hub catalog update
              Published at: https://hkuds.github.io/CLI-Anything/SKILL.txt
Installation: pip install cli-anything-<software>
Invocation:   cli-anything-blender render scene.blend --output=out.png --json
              OR enter REPL: cli-anything-blender repl
Agent Use:    Agent reads SKILL.md path from REPL banner
              Executes commands with --json output
              Parses structured response
```

**Critical architectural constraint:** CLI wrappers invoke REAL software via subprocess — they do not reimplement functionality. The target application must be installed on the host. This is a hard dependency.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that make desktop app integration feel complete. Missing any of these makes the milestone feel half-done.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| App presence detection | Before invoking any desktop app, agent must know if it's installed | LOW | — | `which blender`, `blender --version`, platform-specific paths; fail gracefully if absent |
| Version-aware capability model | Different versions expose different APIs; stale SKILL.md is a runtime error | MEDIUM | App detection | Blender 3.x vs 4.x Python API differs substantially |
| SKILL.md auto-generation for wrapped apps | Existing v0.20 Phase 164 already does --help → SKILL.md; must also handle Python API surface | MEDIUM | Phase 164 | Extend to CLI-Anything-style YAML frontmatter format |
| JSON output mode for all wrapped CLIs | Agents need structured output; --json flag is the standard | LOW | Phase 164 wrapper | Already in v0.20 wrapper pattern |
| Headless execution mode | Design pipeline apps (Blender, GIMP, LibreOffice) must run without display | MEDIUM | App detection | Blender uses `--background`; GIMP uses `--no-interface`; must be verified per app |
| Error propagation with structured output | Subprocess failures must surface as JSON error objects, not raw stderr | LOW | JSON output mode | Wrap subprocess CalledProcessError into structured `{error, code, stderr}` |
| Registration in PDE MCP tool map | Wrapped desktop apps should appear in APPROVED_SERVERS / TOOL_MAP for agent access | MEDIUM | MCP bridge (v0.5) | Each app CLI becomes an MCP tool group |
| Idempotent install/setup script | Running the integration setup twice must not break anything | LOW | — | Standard but often skipped; critical for CI |

### Differentiators (Competitive Advantage)

Features that set PDE's desktop app integration apart from generic CLI wrapping tools.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Design-pipeline-aware app chaining | Blender → image-to-3D → GLB optimize → model-viewer is a single orchestrated flow, not manual steps | HIGH | 3D pipeline (Phase 168), Blender CLI wrapper | The v0.20 asset pipelines become composable with desktop apps |
| GIMP batch pipeline integration | Connect GIMP scriptable editing to image pipeline (Phase 165): background removal → GIMP retouch → OG card output | HIGH | Image pipeline (Phase 165), GIMP CLI wrapper | High value for design teams; GIMP Script-Fu is Python-callable |
| Inkscape as design token exporter | SVG → DTCG token extraction; export artboards as named SVG assets into .planning/design/ | HIGH | Design system (v0.2), Inkscape CLI wrapper | Differentiates PDE as the only platform connecting vector design to token pipeline |
| ComfyUI workflow-as-code | Serialize ComfyUI diffusion pipelines to JSON, replay them as CLI commands, integrate with image pipeline | HIGH | Image pipeline (Phase 165), ComfyUI wrapper | ComfyUI already has JSON API; CLI-Anything wrapper exists in catalog |
| FreeCAD → CadQuery bridge | FreeCAD visual modeling session → export Python CadQuery script → feed into Phase 169 parametric CAD pipeline | HIGH | CAD pipeline (Phase 169), FreeCAD CLI wrapper | Closes the loop between visual and parametric CAD |
| App catalog UI in PDE dashboard | Show installed/available apps, health status, version info; one-click register into MCP tool map | MEDIUM | Remote dashboard (v0.17), app detection | Visibility into what desktop app capabilities are available |
| Cross-app visual comparison | Use Phase 166 visual diff (perceptual hash) to compare outputs from different apps or settings | MEDIUM | Visual diff (Phase 166) | "Did changing this Blender light setting actually improve the render?" |
| Autonomous app discovery via CLI-Hub | Agent can browse CLI-Anything catalog, install missing app CLI, and immediately use it — zero human config | HIGH | SKILL.md generation, pip subprocess | CLI-Hub meta-skill + PDE orchestration = fully autonomous tool acquisition |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Reimplementing app logic in Python | Avoid requiring Blender installed — lighter dependency | CLI-Anything's explicit architecture principle: never reimplement, always subprocess to real app. Reimplementation creates permanent maintenance burden and misses app updates | Require app installation; provide clear setup instructions and version detection |
| GUI automation (screenshot + click) | Some apps resist CLI scripting; vision models can drive them | Brittle, resolution-dependent, breaks on app updates, extreme latency. Playwright MCP is already present for web; desktop GUI automation is a different problem domain | Focus on apps with Python API or native CLI (Blender scripting, GIMP Script-Fu, LibreOffice UNO) |
| Universal app detection via OS APIs | Discover everything installed, like a full app catalog | Platform-specific (macOS /Applications, Windows registry, Linux PATH/XDG), inconsistent results, security surface, not worth the complexity for a small known app set | Whitelist-based detection for PDE's 8-10 priority apps; probe by running `<app> --version` |
| Real-time sync with app state | Live update when user changes something in Blender | Requires IPC socket, polling, or file-watch loops — massive complexity, app-specific protocols, race conditions | File-based exchange: agent writes scene file, app renders, agent reads output |
| Multi-app concurrent sessions | Run Blender + GIMP + LibreOffice simultaneously in one pipeline | Process management complexity, port conflicts, resource contention on a developer workstation | Sequential pipeline steps; use v0.18 worktree dispatch for true parallelism if needed |
| Packaging wrapped CLIs for end-user distribution | Ship the PDE app with bundled Blender CLI | License conflicts (GPL Blender), binary size, version pinning nightmares | Treat desktop apps as host-installed dependencies; document minimum versions |

---

## Feature Dependencies

```
App Presence Detection
    +--required-by--> All Desktop App Wrappers
                          +--required-by--> SKILL.md Auto-generation
                                                +--required-by--> MCP Tool Map Registration
                                                                       +--required-by--> Agent Autonomous Discovery

Headless Execution Mode
    +--required-by--> Blender CLI Wrapper (3D pipeline integration)
    +--required-by--> GIMP CLI Wrapper (image pipeline integration)
    +--required-by--> LibreOffice CLI Wrapper (document export)

Version-Aware Capability Model
    +--required-by--> SKILL.md generation (must reflect actual available commands)
    +--required-by--> Correct subprocess flags (--background vs -b changed in Blender versions)

JSON Output Mode
    +--required-by--> Design Pipeline Chaining (structured data between steps)
    +--required-by--> App Catalog Dashboard (parse CLI output for health display)

Phase 164 CLI Wrapper (v0.20)
    +--enhances--> All CLI-Anything-style wrappers (reuse --help -> SKILL.md machinery)

Phase 165 Image Pipeline (v0.20)
    +--enhances--> GIMP CLI Wrapper (GIMP becomes an editing step within image pipeline)

Phase 168 3D Pipeline (v0.20)
    +--enhances--> Blender CLI Wrapper (Blender becomes advanced step in 3D pipeline)

Phase 169 CAD Pipeline (v0.20)
    +--enhances--> FreeCAD CLI Wrapper (visual -> parametric bridge)

Blender CLI Wrapper
    +--resource-conflict--> GIMP CLI Wrapper
        (not a code conflict; resource conflict: both GPU-intensive, should not run concurrently)
```

### Dependency Notes

- **App detection required before all wrappers:** A wrapper that assumes an app is installed will hard-crash agents. Detection must be the first gate.
- **Headless mode is not optional for pipelines:** Blender's `--background` flag disables the GUI and is required for unattended operation. Without it, the process hangs waiting for a display.
- **Version awareness prevents silent failures:** Blender 3.x uses `bpy.ops.*` differently from 4.x; GIMP Script-Fu changed between 2.10 and 3.0. SKILL.md must be generated against the installed version.
- **Phase 164 reuse:** The existing `--help → MCP server + SKILL.md` machinery from Phase 164 is the foundation. Desktop app wrappers extend it with: version detection, headless-mode flags, and Python API introspection.

---

## MVP Definition

### Launch With (this milestone)

Minimum viable product for desktop app integration that delivers real value to the design pipeline.

- [ ] App presence detection + version check — Foundation for everything; single probe function covering 8 priority apps
- [ ] Blender CLI wrapper — Highest value: render scenes headlessly, export to formats consumed by Phase 168 (GLB, OBJ, PNG)
- [ ] GIMP CLI wrapper — Connects to existing image pipeline (Phase 165); Script-Fu batch mode well-documented
- [ ] Inkscape CLI wrapper — SVG export + DTCG integration; pure CLI (`inkscape --export-png`), lowest friction app to wrap
- [ ] SKILL.md generation for all wrapped apps — Required for agent discoverability; extend Phase 164 machinery
- [ ] MCP tool map registration — Each app CLI registered as APPROVED_SERVER entries so agents can invoke them
- [ ] JSON output mode — Structured output from every wrapped app command; required for pipeline chaining

### Add After Validation (v1.x / next milestone)

- [ ] ComfyUI workflow-as-code — Trigger: if AI image generation is a frequent design pipeline step
- [ ] FreeCAD → CadQuery bridge — Trigger: if physical product design users are active
- [ ] App catalog dashboard pane — Trigger: once 5+ apps are wrapped; visibility becomes valuable
- [ ] Cross-app visual comparison — Trigger: after Blender + GIMP wrappers ship and pipeline chaining is working

### Future Consideration (v2+)

- [ ] OBS Studio CLI wrapper — Video pipeline is already strong (Phase 167); OBS adds streaming/recording not yet covered
- [ ] Autonomous CLI-Hub discovery — Full agent-driven app installation and SKILL.md acquisition; requires security review
- [ ] Krita + Audacity wrappers — Lower priority; digital painting and audio editing are edge cases in PDE's current user profile

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase Placement |
|---------|------------|---------------------|----------|-----------------|
| App presence detection | HIGH | LOW | P1 | Phase 1 of milestone |
| Blender CLI wrapper (headless render) | HIGH | MEDIUM | P1 | Phase 2 |
| GIMP CLI wrapper (batch, Script-Fu) | HIGH | MEDIUM | P1 | Phase 2 |
| Inkscape CLI wrapper | HIGH | LOW | P1 | Phase 2 |
| SKILL.md generation for desktop apps | HIGH | LOW | P1 | Phase 1-2 (extends Phase 164) |
| MCP tool map registration | HIGH | LOW | P1 | Phase 3 |
| JSON output mode | HIGH | LOW | P1 | Phase 2 (per wrapper) |
| Headless execution mode verification | HIGH | LOW | P1 | Phase 2 (per wrapper) |
| Design pipeline chaining (Blender → 3D pipeline) | HIGH | HIGH | P2 | Phase 4 |
| GIMP → image pipeline integration | HIGH | HIGH | P2 | Phase 4 |
| FreeCAD → CAD pipeline bridge | MEDIUM | HIGH | P2 | Phase 4 or deferred |
| ComfyUI workflow-as-code | MEDIUM | HIGH | P2 | Phase 4 or deferred |
| App catalog dashboard pane | MEDIUM | MEDIUM | P3 | After validation |
| Autonomous CLI-Hub discovery | HIGH | HIGH | P3 | v2+ |
| Cross-app visual comparison | MEDIUM | LOW | P3 | After wrappers stable |

---

## Competitor Feature Analysis

| Feature | CLI-Anything (HKUDS) | Generic MCP Wrappers | PDE Approach |
|---------|---------------------|----------------------|--------------|
| App discovery | CLI-Hub catalog (agent-browsable) | Manual config | Whitelist-based probe + MCP registration |
| SKILL.md format | YAML frontmatter + markdown | Varies | Extend Phase 164 format to match CLI-Anything standard |
| Output format | JSON + human-readable dual mode | Varies | JSON mandatory, human readable for debug |
| Pipeline integration | None (standalone CLIs) | None | First-class design pipeline integration (unique to PDE) |
| Version awareness | Not documented | Not documented | Required — probe version before generating SKILL.md |
| Headless mode | Per-app (documented in harness) | Not addressed | Explicit per-app headless flag in wrapper |
| Registration | PyPI + CLI-Hub registry | Manual APPROVED_SERVERS | APPROVED_SERVERS + SKILL.md auto-publish |
| Real software requirement | Strict (subprocess, not reimplemented) | Varies | Follow CLI-Anything pattern: always subprocess |

---

## Phase-Specific Implementation Notes

### App Detection Pattern

```bash
# Pattern for each app:
which blender && blender --version 2>&1 | head -1
# Returns: "Blender 4.1.0 (hash abc123)" -- parse major.minor
# macOS path fallback: /Applications/Blender.app/Contents/MacOS/blender
# Windows fallback: %PROGRAMFILES%\Blender Foundation\Blender\blender.exe
```

### Blender Headless Invocation Pattern

```bash
blender --background scene.blend --python render_script.py -- --output /tmp/out.png
# --background: no GUI, exits when script finishes
# --python: execute Python script in Blender's embedded Python
# --: separator for user script args
```

### GIMP Headless Pattern

```bash
gimp --no-interface --batch '(gimp-version)' --batch '(gimp-quit 0)'
# Script-Fu batch mode; GIMP 3.0+ uses --script-fu-batch
# Alternate for GIMP 2.10: gimp -i -b '...'
```

### Inkscape Pure CLI (No Headless Needed)

```bash
inkscape --export-type=png --export-filename=out.png input.svg
# Inkscape 1.x: fully CLI-driven, no display required
# Inkscape 0.91: different flag set -- version check mandatory
```

---

## Sources

- [CLI-Anything GitHub repo (HKUDS)](https://github.com/HKUDS/CLI-Anything) — registry.json app list, HARNESS.md pipeline, confidence: HIGH
- [CLI-Anything HARNESS.md](https://github.com/HKUDS/CLI-Anything/blob/main/cli-anything-plugin/HARNESS.md) — 7-phase pipeline verified directly, confidence: HIGH
- [Figma MCP Server Guide](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server) — MCP integration pattern for design tools, confidence: HIGH
- [MCP Skills (modelcontextprotocol.io)](https://modelcontextprotocol.io/docs/develop/build-with-agent-skills) — SKILL.md standard for agent discoverability, confidence: HIGH
- [Agent Auto-Discovery Bug (Claude Code #9930)](https://github.com/anthropics/claude-code/issues/9930) — Known discovery failure modes, confidence: MEDIUM
- [Manus Desktop App launch](https://manus.im/blog/manus-my-computer-desktop) — Desktop app to CLI invocation pattern in agent context, confidence: MEDIUM
- [How to sandbox AI agents 2026 (Northflank)](https://northflank.com/blog/how-to-sandbox-ai-agents) — Subprocess isolation patterns, confidence: MEDIUM
- PDE .planning/PROJECT.md — Existing v0.20 capabilities (verified locally 2026-03-28), confidence: HIGH

---

*Feature research for: PDE desktop app CLI integration milestone*
*Researched: 2026-03-28*
*Confidence: MEDIUM-HIGH — CLI-Anything findings HIGH (verified from live repo); integration pattern findings MEDIUM (ecosystem search + official docs); pitfall avoidance recommendations MEDIUM (patterns from multiple sources)*
