# Requirements: Platform Development Engine

**Defined:** 2026-03-29
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.21 Requirements

Requirements for Desktop App Integration milestone. Each maps to roadmap phases.

### Discovery & Security

- [x] **DISC-01**: PDE can detect installed desktop applications via five-tier probe (env var → which/where → pip module → mdfind → well-known paths) on macOS, Linux, and Windows
- [x] **DISC-02**: Discovered apps are written to a two-tier approval registry with `pending`/`approved`/`rejected` status and binary SHA-256 hash verification
- [x] **DISC-03**: Every discovered app is classified with `executionMode` (`headless`/`gui-required`/`mock`) at discovery time, gating all subsequent tool calls
- [x] **DISC-04**: `--help` output is preprocessed with `col -b` to strip backspace sequences, with `parseQuality` annotation on degraded capability models
- [x] **DISC-05**: Display server availability probe is integrated into the existing probe/degrade contract for GUI-requiring apps
- [x] **DISC-06**: Known design app catalog (`references/app-integrations.md`) documents bundle IDs, pip status, executionMode, discovery hints for priority apps

### Core App Wrappers

- [ ] **WRAP-01**: Blender CLI wrapper with `--background` headless mode, version-aware (3.x vs 4.x), `startupMs` declaration, async-only MCP server
- [ ] **WRAP-02**: GIMP CLI wrapper with `--no-interface --batch` Script-Fu mode, GIMP 2.x vs 3.x version detection and flag adaptation
- [ ] **WRAP-03**: Inkscape CLI wrapper with `inkscape --export-type` pure CLI mode, no headless flags needed
- [x] **WRAP-04**: SKILL.md auto-generation for all three wrapped apps extending Phase 164 machinery
- [x] **WRAP-05**: JSON structured output mode for every wrapped app command (required for pipeline chaining)
- [ ] **WRAP-06**: Version-aware capability models that reflect the actual installed version's API surface

### MCP Bridge & Registration

- [ ] **REG-01**: `mcp-bridge.cjs` gains `loadDynamicServers(registryPath)` reading registry.json at module init, populating APPROVED_SERVERS + TOOL_MAP for `approved` entries only
- [ ] **REG-02**: `pde-tools app discover|wrap|register|list|probe` subcommand as user-facing CLI entry point
- [ ] **REG-03**: `server-gen.cjs` gains `generatePythonModuleHandler()` for pip CLIs using `python -m {tool}` spawn pattern
- [ ] **REG-04**: Dynamic registration uses `registerDynamicServer(slug, serverPath, caps)` for single-app registration path

### Design Pipeline Integration

- [ ] **PIPE-01**: `wireframe.md` and `mockup.md` gain optional app-tool steps gated by `probeServer()`, degrading to no-op with documented skip
- [ ] **PIPE-02**: Blender → 3D pipeline chaining: render output feeds into GLB optimize → model-viewer (Phase 168 integration)
- [ ] **PIPE-03**: GIMP → image pipeline chaining: GIMP retouch as an editing step within existing Phase 165 image pipeline

### CLI Wrap Skill

- [ ] **CLI-01**: `/pde:cli-wrap` skill takes any installed app and produces agent-native CLI + MCP server + SKILL.md in one command
- [ ] **CLI-02**: Dual strategy routing: CLI-Anything pre-built CLIs (pipx) as fast path when available, native `--help` → capability model → codegen as fallback
- [ ] **CLI-03**: pipx (not pip) as canonical install method for CLI-Anything CLIs, with absolute path resolution stored in config

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Wrappers

- **WRAP-07**: FreeCAD → CadQuery bridge (visual modeling to parametric CAD pipeline)
- **WRAP-08**: ComfyUI workflow-as-code (diffusion pipeline control via CLI)
- **WRAP-09**: OBS Studio CLI wrapper (screen recording, scene composition)
- **WRAP-10**: LibreOffice CLI wrapper (document export, presentation generation)
- **WRAP-11**: Krita + Audacity wrappers (digital painting, audio editing)

### Extended Integration

- **PIPE-04**: Inkscape SVG → DTCG token extraction pipeline
- **PIPE-05**: Cross-app visual comparison via Phase 166 visual diff
- **PIPE-06**: App catalog dashboard pane in v0.17 remote dashboard
- **CLI-04**: Autonomous CLI-Hub discovery (agent-driven pipx install without human config)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Reimplementing app logic in Python | CLI-Anything principle: always subprocess to real app, never reimplement |
| GUI automation (screenshot + click) | Brittle, resolution-dependent, breaks on app updates; Playwright handles web only |
| Real-time sync with app state | Requires IPC socket/polling; massive complexity for marginal value |
| Multi-app concurrent sessions | Process management complexity; use v0.18 worktree dispatch for parallelism |
| Packaging wrapped CLIs for distribution | License conflicts (GPL), binary size, version pinning nightmares |
| Universal OS-level app discovery | Platform-specific inconsistencies; whitelist-based detection for known apps is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISC-01 | Phase 171 | Complete |
| DISC-02 | Phase 171 | Complete |
| DISC-03 | Phase 171 | Complete |
| DISC-04 | Phase 171 | Complete |
| DISC-05 | Phase 171 | Complete |
| DISC-06 | Phase 171 | Complete |
| WRAP-01 | Phase 172 | Pending |
| WRAP-02 | Phase 172 | Pending |
| WRAP-03 | Phase 172 | Pending |
| WRAP-04 | Phase 172 | Complete |
| WRAP-05 | Phase 172 | Complete |
| WRAP-06 | Phase 172 | Pending |
| REG-01 | Phase 173 | Pending |
| REG-02 | Phase 173 | Pending |
| REG-03 | Phase 173 | Pending |
| REG-04 | Phase 173 | Pending |
| CLI-01 | Phase 174 | Pending |
| CLI-02 | Phase 174 | Pending |
| CLI-03 | Phase 174 | Pending |
| PIPE-01 | Phase 175 | Pending |
| PIPE-02 | Phase 175 | Pending |
| PIPE-03 | Phase 175 | Pending |

**Coverage:**
- v0.21 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 — traceability complete, all 22 requirements mapped to phases 171-175*
