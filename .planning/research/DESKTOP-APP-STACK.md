# Stack Research: Desktop App Discovery + CLI-Anything Integration

**Domain:** Desktop app discovery, CLI-Anything (HKUDS) as fast path, native --help capability model fallback, registering desktop app CLIs as PDE tools
**Researched:** 2026-03-28
**Confidence:** HIGH for CLI-Anything integration and macOS discovery; MEDIUM for cross-platform Linux/Windows paths (platform-specific syscall variance)

---

## Context: What Already Exists (Do NOT Re-Add)

The following are validated in v0.20 and must NOT be rebuilt or re-researched:

- `bin/lib/cli-anything/parsers/` — 4 parsers (openapi, jsonschema, graphql, mcp) producing `{ meta, capabilities[] }` unified model
- `bin/lib/cli-anything/model.cjs` — CapabilityModelSchema + validateCapabilityModel (Zod v4.3.6)
- `bin/lib/cli-anything/codegen.cjs` — jsonSchemaToZod, generateToolSource, generateTools
- `bin/lib/cli-anything/help-parser.cjs` — regex-based --help parser, recursive subcommand discovery (max depth 3)
- `bin/lib/cli-anything/server-gen.cjs` — MCP server generation (stdio transport, stdout/stderr/exitCode envelope)
- `bin/lib/cli-anything/skill-gen.cjs` — SKILL.md template generation
- `bin/lib/cli-anything/registry.cjs` — local JSON registry at `.planning/cli-anything/registry.json`
- `bin/pde-tools.cjs` — `cli-anything wrap`, `cli-anything publish`, `cli-anything list` subcommands
- `@modelcontextprotocol/sdk` v1.27.1 — available in `packages/pde-mcp-server/node_modules/`
- `zod` v4.3.6 — root node_modules
- **Zero npm deps at plugin root** — hard constraint, never install into project root

---

## What This Milestone Adds

Three new capabilities on top of the existing v0.20 CLI-Anything foundation:

1. **Desktop app discovery** — enumerate installed GUI applications on macOS/Linux/Windows, extract their executable paths
2. **CLI-Anything fast path** — when HKUDS CLI-Anything has already wrapped a discovered app, use that pre-built Python harness instead of running help-parser.cjs
3. **Design pipeline driving external apps** — generate PDE tool wrappers for design apps (Blender, GIMP, Inkscape) so `/pde:build` can drive them as first-class tools

---

## Recommended Stack

### Core: Desktop App Discovery

All three discovery mechanisms are zero-dependency — they use native OS commands via Node.js built-in child process APIs.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js `child_process.execFileSync` | built-in (Node 20.20.0) | Invoke OS-native discovery commands safely | Zero deps; execFileSync (not exec) avoids shell injection; arguments passed as array. Synchronous is appropriate for discovery (one-time scan, not hot path). |
| macOS `system_profiler -json SPApplicationsDataType` | system binary (all macOS versions) | Full JSON inventory of installed .app bundles with name, version, location, kind | Returns structured JSON natively; covers /Applications, ~/Applications, and MAS apps. Fields: `_name`, `path`, `version`, `obtained_from`, `lastModified`, `arch_kind`. Parse via `JSON.parse` directly — no additional tooling needed. |
| macOS `mdfind 'kMDItemKind == "Application"'` | system binary (macOS 10.4+) | Fast Spotlight-indexed app path list | Returns one path per line; approximately 50ms vs approximately 3s for system_profiler. Use as fast probe when full metadata not needed (existence check). |
| macOS `PlistBuddy -c "Print CFBundleExecutable" <app>/Contents/Info.plist` | system binary | Resolve actual executable name inside .app bundle | Required because the executable name inside Contents/MacOS/ may differ from the bundle name. Fallback: read `<app>/Contents/Info.plist` with `fs.readFileSync` + regex match on `CFBundleExecutable`. |
| Linux `find /usr/share/applications ~/.local/share/applications -name "*.desktop"` | GNU coreutils | Enumerate XDG .desktop files for installed GUI apps | XDG standard; covers all major desktop environments (GNOME, KDE, XFCE). Parse `Exec=` field for executable path, `Name=` for display name. Plain INI-like text format — parse with `fs.readFileSync` and line-by-line regex. |
| Windows `Get-StartApps \| ConvertTo-Json` | PowerShell (Windows 7+) | List Start menu apps with AppUserModelID | Returns JSON via PowerShell. Invoke via `execFileSync('powershell.exe', ['-Command', 'Get-StartApps | ConvertTo-Json'])`. Limited to Start-pinned apps; supplement with registry scan at `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall` for full inventory. |

**Integration point:** New module `bin/lib/cli-anything/discover.cjs` detects platform via `process.platform`, dispatches to platform-specific scanner, returns `AppEntry[]` array: `{ name, executablePath, bundlePath, version?, kind? }`. Each `executablePath` feeds into the existing CLI-Anything fast-path check or fallback to `help-parser.cjs`.

### Core: CLI-Anything (HKUDS) Fast Path

CLI-Anything is a Python 3.10+ project. PDE invokes it as a subprocess — no Python code runs inside PDE's Node.js process.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Python 3.10+ | system (required pre-installed) | Runtime for CLI-Anything harnesses | CLI-Anything explicitly requires Python 3.10 or higher. PDE probes via `execFileSync('python3', ['--version'])` and gates the fast path behind availability check with graceful degradation to native --help fallback. |
| `click` (Python) | 8.0 or higher | CLI framework inside CLI-Anything harnesses | Installed via `pip install click` when setting up a CLI-Anything harness. PDE does NOT install or manage this dependency — it is the harness's responsibility. |
| `jinja2` (Python) | 3.0 or higher | Optional: skill_generator.py uses for SKILL.md templating; falls back to simple string formatting if absent | CLI-Anything's skill_generator.py conditionally imports jinja2 with graceful degradation. PDE does not need to manage or probe for this. |
| `pytest` (Python) | 7.0 or higher | Test execution inside CLI-Anything harnesses | Only needed if running harness tests from PDE. Not required for the fast-path integration itself. |
| Node.js `child_process.spawnSync` | built-in | Invoke Python harness commands via `python3 <harness>/main.py --json <args>` | spawnSync with args as array avoids shell injection. Capture stdout as Buffer and JSON.parse for structured output. |

**CLI-Anything does NOT install into PDE's node_modules.** It is either:
- Pre-installed by the user as a Claude Code plugin (`/plugin marketplace add HKUDS/CLI-Anything`), or
- Detected at a known path (`~/.claude/plugins/cli-anything-plugin/` or `CLAUDE_PLUGIN_DIR` env var)

PDE's fast path checks for an existing CLI-Anything harness for a given app slug before falling back to `help-parser.cjs`. The check is: does `.planning/cli-anything/{slug}/agent-harness/` exist? If yes, read its SKILL.md and import the capability model. If no, invoke `help-parser.cjs`.

### Core: CLI-Anything Output Format

Understanding the output format is required to map CLI-Anything harnesses into PDE's existing unified capability model.

**SKILL.md schema (YAML frontmatter + Markdown body):**
```
---
name: "cli-anything-<software>"
description: "Command-line interface for <software>"
---
```
Body sections: Installation, Usage, Basic Commands, Command Groups (Markdown table of command to description), Examples (bash code blocks), "For AI Agents" section listing JSON output mode and error handling guidance.

**JSON output mode:** Every CLI-Anything-generated CLI supports a `--json` flag. Response shape:
```json
{
  "method": "<backend-method-name>",
  "status": "success",
  "result": { },
  "file_path": "/path/to/output",
  "format": "png"
}
```
Error responses: `{ "status": "error", "error": "<message>" }`.

**Mapping to PDE capability model:** Each CLI-Anything command group maps to one capability in the existing `{ meta, capabilities[] }` schema. The `extensions.source` field should be `"cli-anything"`, and `extensions.harness_path` holds the Python package path. The existing `Capability` shape from `model.cjs` is compatible — CLI-Anything commands parse cleanly because they use Click with consistent `--help` output format.

**No schema changes to capability-model.json are needed.** Only a new `meta.source` value `"cli-anything"` and new `extensions` fields per capability are added.

### Supporting: Python Subprocess Management

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `child_process.spawnSync` | built-in | Synchronous invocation of CLI-Anything harness for capability model import | Use for the fast-path check during `/pde:discover` (synchronous, small output) |
| Node.js `child_process.spawn` (async) | built-in | Non-blocking invocation when driving design apps from `/pde:build` pipeline | Required for rendering operations (Blender render, GIMP export) that may take seconds to minutes; emit NDJSON progress events on stdout for dashboard visibility |

Both use args-as-array invocation to avoid shell injection — consistent with the `execFileNoThrow` pattern already established in the codebase.

### Supporting: SKILL.md Integration

CLI-Anything's `skill_generator.py` is Python-side. PDE has its own `skill-gen.cjs` (built in Phase 164). For harnesses discovered via CLI-Anything fast path, PDE reads the existing SKILL.md rather than regenerating it. For native --help fallback, `skill-gen.cjs` generates from scratch.

| Module | Purpose | When to Use |
|--------|---------|-------------|
| `bin/lib/cli-anything/skill-gen.cjs` (existing) | Generate SKILL.md from PDE capability model | Native --help fallback path only |
| CLI-Anything `SKILL.md` (read-only) | Authoritative SKILL.md for CLI-Anything-wrapped apps | Fast path: read and register; do not overwrite |

---

## Installation

No new npm packages are required for this milestone. The zero npm deps constraint is maintained.

```bash
# Zero new npm dependencies at plugin root (hard constraint maintained)
# Zero new npm dependencies in any sub-package

# Python-side (user's responsibility, not PDE's):
# pip install click>=8.0   # inside harness virtualenv only
# pip install jinja2>=3.0  # optional, only for skill_generator.py

# OS-native tools used (no installation needed):
# macOS: system_profiler, mdfind, PlistBuddy — all ship with macOS
# Linux: find, grep — GNU coreutils, present on all distributions
# Windows: PowerShell with Get-StartApps — ships with Windows 7+
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `system_profiler -json SPApplicationsDataType` as macOS primary | `mdfind 'kMDItemKind == "Application"'` as primary | Use mdfind only as fast probe (approximately 50ms). Use system_profiler as primary for full metadata (version, source, arch_kind). Both are valid and the milestone should use system_profiler as primary and mdfind as fast existence check. |
| Node.js built-ins for subprocess | `execa` or `@npmcli/run-script` npm packages | Never — zero npm deps constraint. Node built-ins handle all subprocess needs; `execFileSync`/`spawnSync`/`spawn` with args-as-array provide the same safety guarantees as `execa`. |
| CLI-Anything fast path (Python harness) | Re-running `help-parser.cjs` on CLI-Anything-wrapped apps | Only use help-parser.cjs fallback if no CLI-Anything harness exists. CLI-Anything harnesses handle the "rendering gap" — GUI apps that need headless subprocess calls (e.g., Blender `--background --python-expr`) that pure --help parsing cannot model. |
| Reading existing SKILL.md from CLI-Anything harness | Regenerating SKILL.md from scratch via skill-gen.cjs | Always read existing SKILL.md if present. CLI-Anything's SKILL.md includes agent-specific guidance (JSON output mode, backend error handling) that help-parser.cjs cannot derive. |
| FastMCP Python v3.1.1 | click-mcp (12 GitHub stars, experimental) | FastMCP is production-grade (version 3.1.1, Python 3.10+, 1M+ daily downloads, incorporated into official MCP Python SDK). However, neither belongs as a PDE dependency — server-gen.cjs already generates MCP servers. FastMCP/click-mcp only relevant if a CLI-Anything harness needs to expose as an HTTP MCP server endpoint, which is not in scope for this milestone. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `npm install` anything at plugin root | Hard constraint established across v0.15 through v0.20 | Node.js built-ins (`child_process`, `fs`, `path`) for all new discovery and subprocess work |
| `child_process.exec()` with string shell commands | Shell injection risk (OS discovery commands incorporate app paths from filesystem) | `execFileSync`/`spawnSync` with args as arrays — consistent with `execFileNoThrow` pattern in codebase |
| Python `argparse-to-json` PyPI package | CLI-Anything harnesses use Click (not argparse), and the SKILL.md plus `--json` output already provides a machine-readable capability surface with no additional tooling | CLI-Anything's native `--json` flag + SKILL.md reading |
| Rewriting CLI-Anything Python harnesses in Node.js | CLI-Anything harnesses have 1,839+ passing tests and handle the rendering gap (calls to real software backends like `blender --background`, `gimp --batch`). Reimplementing in Node loses all of that and violates the fast-path rationale. | Invoke via `child_process.spawnSync/spawn` and consume JSON output |
| `osquery` for macOS app discovery | Heavyweight dependency requiring separate installation; SQL engine overkill for a one-time discovery scan | `system_profiler -json SPApplicationsDataType` — built-in, returns structured JSON, zero install |
| `xdg-launch` or `lsdesktopf` on Linux | Niche tools requiring separate installation; parsing XDG .desktop files with `find` + `fs.readFileSync` achieves the same result | GNU `find` + `fs.readFileSync` to parse `Exec=` field from .desktop files |
| Launching GUI apps headlessly without a CLI harness | Most GUI apps (Figma, Sketch, Adobe XD) have no headless CLI surface accessible without their dedicated plugin APIs | Graceful degradation: emit `CAPABILITY_UNAVAILABLE` in NDJSON event bus and register in registry with `status: "no-cli-surface"` |

---

## Stack Patterns by Variant

**If discovered app has a CLI-Anything harness (fast path):**
- Check `.planning/cli-anything/{slug}/agent-harness/` for Python package existence
- Read SKILL.md from harness — authoritative, includes JSON output mode guidance
- Derive capability model from Click --help output via `help-parser.cjs` (Click's --help is consistent enough for regex parsing)
- Register in `registry.json` with `source: "cli-anything"` and `harness_path` in extensions

**If discovered app has a CLI but no CLI-Anything harness (native fallback):**
- Run `<executable> --help` via `execFileSync`, pipe through `help-parser.cjs` (recursive, max depth 3)
- Generate capability model via `model.cjs` and write to `.planning/cli-anything/{slug}/capability-model.json`
- Generate SKILL.md via `skill-gen.cjs`
- Generate MCP server via `server-gen.cjs` (stdio transport)
- Register in `registry.json` with `source: "native-help-parser"`

**If discovered app has neither a CLI nor --help output (GUI-only):**
- Write `.planning/cli-anything/{slug}/capability-model.json` with `meta.type: "gui-only"` and `capabilities: []`
- Register in registry with `status: "no-cli-surface"` — enables future wrapping without re-scanning
- Emit informational log: "App discovered but no CLI surface found. Install a CLI-Anything harness or use the app's plugin API directly."

**If running on macOS:**
- Primary discovery: `execFileSync('system_profiler', ['-json', 'SPApplicationsDataType'])` with `maxBuffer: 10 * 1024 * 1024`
- Fast probe: `execFileSync('mdfind', ["kMDItemKind == 'Application'"])`
- Executable resolution: `execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print CFBundleExecutable', `${bundlePath}/Contents/Info.plist`])`

**If running on Linux:**
- Discovery: `spawnSync('find', ['/usr/share/applications', `${os.homedir()}/.local/share/applications`, '-name', '*.desktop'])`
- Parse `Exec=` field (strip `%f`, `%u`, `%U` XDG substitution variables) and `Name=` field with `fs.readFileSync` + line regex
- Resolve absolute path via `execFileSync('which', [basename])` if Exec value is not already absolute

**If running on Windows:**
- Discovery: `spawnSync('powershell.exe', ['-Command', 'Get-StartApps | ConvertTo-Json'])`
- Supplement: `spawnSync('powershell.exe', ['-Command', 'Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | ConvertTo-Json'])`

---

## Version Compatibility

| Package/Tool | Compatible With | Notes |
|--------------|-----------------|-------|
| Node.js 20.20.0 built-in child_process | All platform discovery commands | Override `maxBuffer` to `10 * 1024 * 1024` (10MB) for `system_profiler` output on systems with 100+ installed apps |
| Python 3.10+ | CLI-Anything harnesses | Python 3.9 or earlier: CLI-Anything will fail. Always probe with `execFileSync('python3', ['--version'])` and require version string 3.10 or higher. |
| CLI-Anything main branch (2026-03-23) | PDE v0.20 SKILL.md format | SKILL.md schema (YAML frontmatter + Markdown) is compatible with PDE's skill-gen.cjs output format by design — both follow the same convention |
| macOS Ventura 13+ | `system_profiler -json SPApplicationsDataType` | `-json` flag available since macOS 10.12; `SPApplicationsDataType` available since macOS 10.5. Safe for all modern macOS. |
| Linux (any distribution, XDG-compliant) | XDG .desktop parsing | XDG Base Directory spec stable since 2003. `~/.local/share/applications` is universal across GNOME, KDE, XFCE, i3. No version risk. |
| Windows 10/11 | Get-StartApps PowerShell | Available since Windows 10. Windows 7/8 require registry fallback only — omit Get-StartApps on older Windows. |

---

## CLI-Anything Integration Architecture: Key Decision

CLI-Anything's output maps cleanly into PDE's existing capability model with one addition. The existing `capability-model.json` schema `{ meta, capabilities[] }` requires only a new `meta.source` value of `"cli-anything"`. The `extensions` field per capability (already in schema) carries `{ harness_path, python_package, click_command_group }`. No schema changes are needed.

The fast-path logic in `discover.cjs` follows this priority order:

1. Check for CLI-Anything harness at `.planning/cli-anything/{slug}/agent-harness/` — if present, import from harness (reads SKILL.md + Click --help output via help-parser.cjs)
2. If no harness: run `<executable> --help` through `help-parser.cjs` → generate capability model, SKILL.md, MCP server from scratch
3. If --help returns no parseable output: write gui-only stub and register with `status: "no-cli-surface"`

This respects the existing `help-parser.cjs` investment while giving CLI-Anything harnesses priority — they handle the rendering gap that pure --help parsing cannot address.

---

## Sources

- [HKUDS/CLI-Anything GitHub](https://github.com/HKUDS/CLI-Anything) — Pipeline methodology, Python 3.10 requirement, click 8.0+ dependency, 7-phase harness generation (MEDIUM confidence — verified via WebFetch)
- [HKUDS/CLI-Anything HARNESS.md](https://github.com/HKUDS/CLI-Anything/blob/main/cli-anything-plugin/HARNESS.md) — SKILL.md YAML frontmatter schema, JSON output format with method/status/result/file_path/format fields, three-layer architecture (MEDIUM confidence — verified via WebFetch)
- [HKUDS/CLI-Anything skill_generator.py](https://github.com/HKUDS/CLI-Anything/blob/main/cli-anything-plugin/skill_generator.py) — Python imports including re, pathlib, dataclasses, jinja2 (optional with graceful fallback), argparse (MEDIUM confidence — verified via WebFetch)
- [macOS mdfind documentation](https://ss64.com/mac/mdfind.html) — kMDItemKind query syntax, -onlyin flag (HIGH confidence — official macOS tool, stable since 10.4)
- [macOS system_profiler docs](https://ss64.com/mac/system_profiler.html) — SPApplicationsDataType, -json flag, output field inventory (HIGH confidence — built-in macOS tool)
- [Apple Developer — CFBundles guide](https://developer.apple.com/library/archive/documentation/CoreFoundation/Conceptual/CFBundles/AboutBundles/AboutBundles.html) — Contents/MacOS/CFBundleExecutable path convention, Info.plist structure (HIGH confidence — official Apple documentation)
- [ArchWiki — Desktop entries](https://wiki.archlinux.org/title/Desktop_entries) — XDG .desktop file format, Exec= field, storage paths /usr/share/applications/ and ~/.local/share/applications/ (HIGH confidence — XDG spec stable since 2003)
- [Microsoft Learn — Get-StartApps](https://learn.microsoft.com/en-us/powershell/module/startlayout/get-startapps?view=windowsserver2025-ps) — PowerShell cmdlet for Windows app discovery, AppUserModelID format (HIGH confidence — official Microsoft documentation)
- [FastMCP PyPI](https://pypi.org/project/fastmcp/) — v3.1.1, Python 3.10+, production-grade (HIGH confidence — official PyPI page verified via WebFetch 2026-03-28)
- [PDE Phase 163 RESEARCH.md](.planning/phases/163-cli-ingestion-capability-model/163-RESEARCH.md) — Existing capability model schema, Node.js 20.20.0, zero npm deps constraint, MCP SDK version (HIGH confidence — validated shipped code)
- [PDE Phase 164 CONTEXT.md](.planning/phases/164-cli-wrapping-publishing/164-CONTEXT.md) — Existing help-parser.cjs, server-gen.cjs, skill-gen.cjs, registry.cjs module locations and contracts (HIGH confidence — validated shipped code)

---

*Stack research for: Desktop App Discovery + CLI-Anything Integration (PDE next milestone)*
*Researched: 2026-03-28*
