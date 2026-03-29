# Project Research Summary

**Project:** PDE Desktop App CLI Integration + Design Pipeline Binding
**Domain:** Desktop app discovery, CLI wrapping, design pipeline orchestration
**Researched:** 2026-03-28
**Confidence:** HIGH (stack and architecture verified against existing codebase; CLI-Anything verified against live repo; pitfalls from CVE reports and confirmed GitHub issues)

## Executive Summary

This milestone adds three capabilities on top of the validated v0.20 CLI-Anything foundation: (1) cross-platform discovery of installed GUI applications, (2) a fast path that detects when HKUDS CLI-Anything has already produced a Python harness for a discovered app, and (3) design-pipeline integration that lets `/pde:build` workflows invoke Blender, GIMP, and Inkscape as first-class tools. The architecture is additive — one new module (`discover.cjs`), targeted modifications to `mcp-bridge.cjs` and `pde-tools.cjs`, and new optional steps in `wireframe.md`/`mockup.md`. No npm dependencies are added anywhere; all subprocess work uses Node.js built-ins following the `execFileNoThrow` pattern already established across v0.15–v0.20.

The recommended approach is a five-step pipeline: discover binary on the system → parse `--help` with `help-parser.cjs` or read the CLI-Anything harness SKILL.md → validate capability model via `model.cjs` → generate stdio MCP server via `server-gen.cjs` → register in `registry.json` for `mcp-bridge.cjs` to pick up at session init. This pipeline reuses every existing CLI-Anything module without modification to their core contracts. The only architectural extension is `loadDynamicServers()` in `mcp-bridge.cjs`, which reads `registry.json` at module load time and populates `APPROVED_SERVERS` and `TOOL_MAP` programmatically — replacing hardcoded entries for user-installed apps.

The dominant risk is the GUI-app mock-wrapping trap: CLI-Anything wraps the filesystem interface of an app, not the running app itself. Blender and GIMP only have genuine headless modes via specific flags (`--background`, `--no-interface --batch`). Without explicit `executionMode` classification at discovery time, the agent will believe it controlled an app that was never involved. The second critical risk is security boundary collapse from wrapping arbitrary discovered executables without human approval. Both risks have clear mitigations (per-app `executionMode` field, two-tier `pending`/`approved` registry) that must be built into the first phase, not retrofitted.

---

## Key Findings

### Recommended Stack

The entire milestone runs on Node.js 20.20.0 built-ins plus the binaries already present on the user's OS. `child_process.execFileSync` and `spawnSync` with args-as-array (never shell-mode invocations) handle all subprocess work for discovery and invocation. macOS discovery uses `system_profiler -json SPApplicationsDataType` as the primary source (structured JSON, full metadata) with `mdfind` as a fast existence probe (~50ms vs ~3s). Linux uses `find` + `fs.readFileSync` on XDG `.desktop` files. Windows uses PowerShell `Get-StartApps | ConvertTo-Json` supplemented by the Uninstall registry key.

The CLI-Anything (HKUDS) fast path requires Python 3.10+ on the host and `pipx install cli-anything` (not `pip install` — PEP-668 breaks pip on Homebrew Python 3.12+). The fast path is gated behind an availability check: `execFileSync('python3', ['--version'])` with semver parse. If unavailable, `help-parser.cjs` is the fallback. The existing `CADQUERY_PYTHON` env-var pattern from `cad.cjs` extends cleanly to `BLENDER_BIN`, `REMBG_PYTHON`, and any new pip CLI, maintaining zero Python at plugin root.

**Core technologies:**
- `execFileSync` / `spawnSync` (args-as-array): all subprocess work — zero npm deps, no shell injection risk; consistent with the `execFileNoThrow` pattern already in the codebase
- `system_profiler -json SPApplicationsDataType`: macOS app inventory — structured JSON, covers /Applications + MAS + ~/Applications
- `mdfind 'kMDItemKind == "Application"'`: macOS fast probe — ~50ms, used for existence check only
- `/usr/libexec/PlistBuddy`: macOS executable resolution inside `.app` bundles
- XDG `.desktop` parsing via `find` + `fs.readFileSync`: Linux app discovery — stable since 2003
- PowerShell `Get-StartApps | ConvertTo-Json`: Windows app discovery
- Python 3.10+ via `spawnSync` (not imported): CLI-Anything harness invocation — always args-as-array
- `pipx`: CLI-Anything install path — required over pip on macOS 14+/Homebrew Python 3.12+

### Expected Features

**Must have (table stakes):**
- App presence detection + version check — foundation for every wrapper; probe by executable before generating any capability model
- Blender CLI wrapper with `--background` headless mode — highest-value design pipeline integration
- GIMP CLI wrapper with `--no-interface --batch` Script-Fu mode — connects to image pipeline (Phase 165)
- Inkscape CLI wrapper — pure CLI (`inkscape --export-type=png`), no headless flags needed; lowest-friction wrap
- `executionMode` classification at discovery time — `"headless" | "gui-required" | "mock"` per capability model; gates all tool calls
- SKILL.md generation for all wrapped apps — extends Phase 164 machinery; required for agent discoverability
- JSON output mode for every wrapped app command — structured output required for pipeline chaining
- MCP tool map registration — wrapped apps appear in `APPROVED_SERVERS` / `TOOL_MAP` via `loadDynamicServers()`
- Two-tier approval registry (`pending` → `approved`) — security gate; required before agents can invoke discovered tools

**Should have (competitive):**
- Design-pipeline-aware app chaining — Blender → 3D pipeline (Phase 168), GIMP → image pipeline (Phase 165)
- FreeCAD → CadQuery bridge — visual modeling to parametric CAD (Phase 169) pipeline closure
- `pde-tools app discover|wrap|register|list|probe` subcommand — user-facing entry point for all app management
- `parseQuality` annotation on capability models + `col -b` preprocessing — prevents corrupt tool descriptions from poisoning agent context

**Defer (v2+):**
- ComfyUI workflow-as-code — high complexity, niche workflow; defer until AI image generation is a validated frequent use case
- Autonomous CLI-Hub discovery (agent-driven pip install) — requires security review; meaningful prompt injection risk
- App catalog dashboard pane — valuable once 5+ apps wrapped; premature before wrappers are stable
- OBS Studio, Krita, Audacity wrappers — lower design-pipeline priority

### Architecture Approach

The architecture is a five-step discovery-to-registration pipeline built on existing infrastructure. A new `discover.cjs` module handles cross-platform binary resolution using a five-tier probe (env var → `which`/`where` → pip module check → `mdfind` → well-known paths). `discover.cjs` writes to `registry.json` via existing `registry.cjs`. A new `loadDynamicServers()` function in `mcp-bridge.cjs` reads `registry.json` at module load and programmatically populates `APPROVED_SERVERS` and `TOOL_MAP` — avoiding the startup-hang anti-pattern of probing uninstalled apps. Design workflow files (`wireframe.md`, `mockup.md`) gain optional app-tool steps gated by `probeServer()`, following the identical probe/degrade contract used for Stitch and Figma today.

**Major components:**
1. `bin/lib/cli-anything/discover.cjs` (NEW) — cross-platform binary resolution, pip module check, five-tier probe, writes `status`/`executionMode` to registry
2. `bin/lib/mcp-bridge.cjs` (MODIFY) — add `loadDynamicServers(registryPath)` and `registerDynamicServer(slug, serverPath, caps)` for registry-driven APPROVED_SERVERS
3. `bin/pde-tools.cjs` (MODIFY) — add `case 'app':` routing block for discover/wrap/register/list/probe subcommands
4. `bin/lib/cli-anything/server-gen.cjs` (MODIFY) — add `generatePythonModuleHandler()` for pip CLIs (`python -m {tool}` spawn pattern)
5. `bin/lib/cli-anything/registry.cjs` (MODIFY) — add `status`, `install_hint`, `executionMode`, `requiresDisplay`, `startupMs` fields
6. `references/app-integrations.md` (NEW) — catalog of known design app CLIs with bundle IDs, pip status, discovery hints
7. `workflows/wireframe.md`, `workflows/mockup.md` (MODIFY) — optional app-tool steps with probe/degrade

**Build order (critical path):** Phase A `discover.cjs` → Phase B `mcp-bridge.cjs loadDynamicServers()` → Phase E workflow integrations. Phases C (`pde-tools app`) and D (`server-gen.cjs pip handler`) are off the critical path and can develop in parallel with Phase B.

### Critical Pitfalls

1. **GUI app mock wrapping** — CLI-Anything wraps the filesystem interface, not the running app. Avoid by classifying every discovered app as `executionMode: "headless" | "gui-required" | "mock"` at discovery time, before writing any capability model. Reject `"mock"` entries at tool call time with a visible error. Verify Blender uses `--background` and GIMP uses `--no-interface --batch` explicitly. (Source: CLI-Anything issue #16, gedit wrapping post-mortem)

2. **Unapproved executables executed by agents** — Discovery intentionally finds arbitrary binaries, which collapses the APPROVED_SERVERS security boundary if treated as trusted. Avoid by implementing a two-tier registry (`pending` → human `/pde:cli-approve` → `approved`) before any discovery code is written. Store binary SHA-256 hash alongside the approved path; detect binary substitution at tool call time. (Source: OWASP MCP05:2025, CVE-2025-53109 symlink bypass pattern)

3. **pip PATH isolation failure on Homebrew Python 3.12+** — PEP-668 rejects global pip installs; PATH inherited by Node.js subprocesses does not include `~/.local/bin` when custom env objects are passed. Avoid by using `pipx` (not `pip`) as the canonical install method, resolving the CLI-Anything binary to an absolute path at setup time, and always spreading `process.env` before adding custom keys (`{ ...process.env, MY_VAR: value }`) — never a bare custom env object. (Source: Node.js issue #58290, Homebrew PEP-668 thread)

4. **`--help` output parsing failures producing corrupt capability models** — Tools like Blender and git emit nroff/backspace-escaped man page output that pollutes tool descriptions (confirmed in existing `.planning/cli-anything/git/capability-model.json`). Avoid by preprocessing all `--help` output through `col -b` to strip backspace sequences, adding a `parseQuality: "degraded"` annotation when parse quality is low, and maintaining curated override models in `.planning/config/capability-overrides/` for known complex apps. (Source: CLI-Anything issue #154, local registry.json inspection)

5. **Long-startup apps blocking the MCP response loop** — Blender takes 2-8 seconds per invocation; GIMP takes 3-10 seconds. Multiple sequential tool calls in one agent turn compound to 30-60 second hangs. Avoid by using only async `spawn` (never synchronous variants) in generated MCP servers, declaring `startupMs` in capability model metadata, and setting explicit per-call timeouts (default 30 seconds).

---

## Implications for Roadmap

Based on research, the build order is driven by two hard constraints: (1) security architecture must be established before any discovery code runs — the two-tier registry must exist before it can be written to; (2) `discover.cjs` must populate `registry.json` before `mcp-bridge.cjs` can load dynamic servers. The ARCHITECTURE.md critical path maps cleanly to four phases.

### Phase 1: Security Architecture + Discovery Foundation

**Rationale:** The two-tier approval registry and `executionMode` classification are foundational — every subsequent phase writes into this schema. Building discovery without this gate would require a retrofit that touches every component. This phase also establishes `discover.cjs` as the single binary-resolution source of truth, and adds `col -b` preprocessing to `help-parser.cjs` to prevent corrupt capability models from the start.

**Delivers:**
- Two-tier registry schema (`status: "pending" | "approved" | "rejected"`, `executionMode`, `requiresDisplay`, `startupMs`, `install_hint`, binary SHA-256)
- `discover.cjs` with five-tier probe (env var → which/where → pip module → mdfind → well-known path)
- `references/app-integrations.md` with known design app CLIs, bundle IDs, and discovery hints
- `col -b` preprocessing in `help-parser.cjs` + `parseQuality` annotation on capability models

**Addresses:** App presence detection, version-aware capability model foundation, cross-platform discovery
**Avoids:** Unapproved-executable security regression, mock-wrapping silent success, corrupt capability model descriptions

### Phase 2: Core App Wrappers (Blender, GIMP, Inkscape)

**Rationale:** These three apps deliver the highest design pipeline value and cover all three `executionMode` patterns: Blender (headless via `--background`), GIMP (conditional headless via `--no-interface --batch`, version-sensitive), Inkscape (pure CLI, no headless flag needed). Shipping all three in one phase validates the wrapper template before applying it to lower-priority apps.

**Delivers:**
- Blender wrapper with `--background` headless mode, `startupMs: 5000`, async-only MCP server
- GIMP wrapper with `--no-interface --batch` Script-Fu, GIMP 2.x vs 3.x version detection
- Inkscape wrapper with `inkscape --export-type` pure CLI
- SKILL.md generation for all three (extending Phase 164 machinery)
- JSON output mode per wrapper
- Display server probe integrated into probe/degrade contract

**Addresses:** Headless execution mode, JSON output, SKILL.md generation, display server dependency handling
**Avoids:** Mock wrapping silent success, display server failure, GIMP 2/3 version mismatch

### Phase 3: MCP Bridge Dynamic Registration + pde-tools app Subcommand

**Rationale:** Once wrappers exist in `registry.json`, the bridge must load them dynamically. This phase enables agents to invoke the Phase 2 wrappers and provides the user-facing `pde-tools app` entry point. `loadDynamicServers()` is a targeted modification to `mcp-bridge.cjs` — its implementation depends on stable registry schema from Phase 1.

**Delivers:**
- `mcp-bridge.cjs` `loadDynamicServers(registryPath)` — reads registry, populates `APPROVED_SERVERS` + `TOOL_MAP` for `status: "approved"` entries only
- `mcp-bridge.cjs` `registerDynamicServer(slug, serverPath, caps)` — single-app registration path
- `pde-tools app discover|wrap|register|list|probe` subcommand
- `server-gen.cjs` `generatePythonModuleHandler()` for pip CLIs (`python -m {tool}` spawn pattern)

**Uses:** Five-tier discovery from Phase 1, registry schema from Phase 1, wrappers from Phase 2
**Avoids:** Startup-hang from probing uninstalled apps, hardcoded APPROVED_SERVERS growth, pip PATH isolation failure

### Phase 4: Design Pipeline Integration

**Rationale:** Workflow integration is last because it depends on all tools being available in `TOOL_MAP` (Phase 3) and wrappers being stable (Phase 2). Optional steps in `wireframe.md` and `mockup.md` are low-risk additions — they are gated by `probeServer()` and degrade to no-op with a documented skip, following existing Stitch/Figma patterns exactly.

**Delivers:**
- `workflows/wireframe.md` optional Blender 3D preview step (gated by `probeServer('blender')`)
- `workflows/mockup.md` optional GIMP retouch and Inkscape SVG export steps
- Blender → Phase 168 (3D pipeline) chaining: render output fed into GLB optimize → model-viewer
- GIMP → Phase 165 (image pipeline) chaining: GIMP retouch as an editing step within existing image pipeline

**Addresses:** Design-pipeline-aware app chaining, pipeline integration with existing v0.20 asset pipelines
**Avoids:** Direct shell command invocation in workflow markdown, bypassing TOOL_MAP

### Phase Ordering Rationale

- Security architecture (Phase 1) is non-negotiable first because the two-tier registry must exist before any binary can be written to it. Retrofitting approval status after discovery data exists is a policy violation, not just technical debt.
- Discovery (`discover.cjs`) comes in Phase 1 rather than its own phase because the security schema and discovery module are developed against each other — the `executionMode` and `status` fields are outputs of the discovery classifier.
- Wrappers (Phase 2) come before bridge registration (Phase 3) because `loadDynamicServers()` needs real registry entries to test against. Building the bridge reader against an empty registry produces an untestable module.
- Workflow integration (Phase 4) is last because it is the highest-level consumer of all lower layers. A bug in any lower phase surfaces immediately in workflow integration tests.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (GIMP wrapper):** GIMP 3.x changed the batch interpreter and Script-Fu API significantly from 2.10. The exact `--batch` invocation must be verified against the installed version on the target machine before writing the wrapper contract. Research notes the flag names but the exact GIMP 3.x batch sequence needs hands-on validation.
- **Phase 3 (pip CLI server-gen handler):** The `generatePythonModuleHandler()` variant in `server-gen.cjs` has not been prototyped. The invocation pattern is straightforward but the MCP server template changes need validation against an actual pip CLI (rembg is the obvious test case) before committing to the template design.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (discovery):** Cross-platform binary detection patterns verified against official Apple/Microsoft/ArchWiki documentation. The five-tier probe order is stable and well-documented.
- **Phase 3 (mcp-bridge loadDynamicServers):** APPROVED_SERVERS and TOOL_MAP patterns are fully established in the existing codebase. `loadDynamicServers()` is a straightforward extension of the existing module-load pattern.
- **Phase 4 (workflow integration):** `probeServer()` + `resolveToolName()` + degrade patterns are identical to how Stitch and Figma tools are invoked today. No new patterns needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are either existing Node.js built-ins (zero-dep constraint confirmed across v0.15–v0.20) or OS-native commands verified against official Apple/Microsoft/ArchWiki documentation. Python/pipx risk explicitly documented with PEP-668 mitigation. |
| Features | MEDIUM-HIGH | CLI-Anything feature set verified directly from live HKUDS repo and HARNESS.md. Blender/GIMP/Inkscape headless invocations verified from official docs. Pipeline integration value judgments are based on existing v0.20 architecture — well-grounded but not yet user-validated. |
| Architecture | HIGH | Architecture derived from direct examination of the existing codebase (`mcp-bridge.cjs`, `cad.cjs`, `help-parser.cjs`, `registry.cjs`, `wireframe.md`). Every component extension follows an established precedent in the codebase. No speculative patterns. |
| Pitfalls | HIGH | Sourced from verified CVEs (CVE-2025-53109, CVE-2025-31199), OWASP MCP Top 10 2025, confirmed GitHub issues (CLI-Anything #16/#143/#154), Node.js issue #58290, and Homebrew PEP-668 discussion. These are documented failures in directly relevant contexts, not inferences. |

**Overall confidence:** HIGH

### Gaps to Address

- **GIMP 3.x batch API surface:** GIMP 3.0 changed the Script-Fu batch interpreter. The exact `--batch` flag and interpreter syntax for GIMP 3.x should be confirmed against `gimp --help` output on the target machine during Phase 2 planning.
- **Claude Code MCP server slot limit:** The research flags the Claude Code MCP server slot limit as the first bottleneck at 20+ wrapped apps. The exact limit is not documented publicly. Validate during Phase 3 integration testing with 10+ registered apps.
- **Blender 3.x vs 4.x Python API delta:** The `--background --python script.py` path differs between Blender 3.x and 4.x. Version-conditional script templates or two separate scripts may be needed; confirm against Blender 4.x release notes before Phase 2 implementation.
- **Linux Flatpak/Snap discovery testing:** The research documents the probe paths (`flatpak list`, `snap list`, `~/.local/bin`) but they have not been tested on an actual Linux environment with Flatpak/Snap-installed apps. Validate during Phase 1 implementation on a Linux CI environment.

---

## Sources

### Primary (HIGH confidence)
- Existing PDE codebase: `bin/lib/cli-anything/`, `bin/lib/mcp-bridge.cjs`, `bin/lib/3d-pipeline/cad.cjs`, `workflows/wireframe.md` — verified 2026-03-28
- [HKUDS/CLI-Anything HARNESS.md](https://github.com/HKUDS/CLI-Anything/blob/main/cli-anything-plugin/HARNESS.md) — 7-phase pipeline, SKILL.md schema, JSON output format
- [Apple Developer — CFBundles](https://developer.apple.com/library/archive/documentation/CoreFoundation/Conceptual/CFBundles/) — `.app` bundle structure, Info.plist, `CFBundleExecutable`
- [ArchWiki — Desktop entries](https://wiki.archlinux.org/title/Desktop_entries) — XDG `.desktop` format, `Exec=` field, storage paths
- [Microsoft Learn — Get-StartApps](https://learn.microsoft.com/en-us/powershell/module/startlayout/get-startapps) — Windows app discovery via PowerShell
- [OWASP MCP Top 10 2025](https://owasp.org/www-project-mcp-top-10/2025/) — MCP05 Command Injection, MCP02 Privilege Escalation
- [CVE-2025-53109/53110](https://cymulate.com/blog/cve-2025-53109-53110-escaperoute-anthropic/) — Anthropic Filesystem MCP symlink bypass (symlink canonicalization requirement)
- [Blender CLI docs](https://docs.blender.org/manual/en/latest/advanced/command_line/render.html) — `--background` flag, headless rendering

### Secondary (MEDIUM confidence)
- [HKUDS/CLI-Anything GitHub](https://github.com/HKUDS/CLI-Anything) — registry.json app list (27 apps), issues #16/#143/#144/#154
- [HKUDS/CLI-Anything skill_generator.py](https://github.com/HKUDS/CLI-Anything/blob/main/cli-anything-plugin/skill_generator.py) — Python imports, jinja2 optional fallback
- [FastMCP PyPI](https://pypi.org/project/fastmcp/) — v3.1.1 production-grade Python MCP SDK (referenced as alternative; not a PDE dependency)
- [Node.js issue #58290](https://github.com/nodejs/node/issues/58290) — PATH not inherited when custom env passed to spawn
- [Homebrew PEP-668 discussion](https://discuss.python.org/t/on-macos-14-pip-install-throws-error-externally-managed-environment/50352) — pip breakage on macOS 14+
- [Blender headless forum](https://devtalk.blender.org/t/solved-2-90-headless-rendering-ignoring-script-selecting-gpus-falls-back-on-the-cpu/16886) — GPU fallback in headless mode
- [Python venv docs — Real Python](https://realpython.com/python-virtual-environments-a-primer/) — isolation pattern rationale

### Tertiary (LOW confidence)
- [MCP Dynamic Tool Discovery — Speakeasy](https://www.speakeasy.com/mcp/tool-design/dynamic-tool-discovery) — dynamic registration patterns
- [Manus Desktop App launch](https://manus.im/blog/manus-my-computer-desktop) — desktop-to-CLI invocation in agent context
- [How to sandbox AI agents 2026 — Northflank](https://northflank.com/blog/how-to-sandbox-ai-agents) — subprocess isolation patterns

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
