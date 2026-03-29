# Pitfalls Research: Desktop App CLI Integration

**Domain:** Adding desktop app discovery, CLI-Anything (HKUDS) wrapping, and design pipeline integration (Blender/GIMP) to an existing MCP-based Claude Code plugin
**Researched:** 2026-03-28
**Confidence:** HIGH (patterns verified against HKUDS GitHub issues, Node.js subprocess docs, macOS TCC/Spotlight CVE reports, OWASP MCP Top 10, Blender headless dev forum, pip/venv PEP-668 docs, and community post-mortems)

---

## Context: The Integration Trap

This milestone adds desktop app discovery and execution as a new capability surface on top of a working MCP bridge with a verified-sources-only security policy. The danger is not the individual features but the assumption that "CLI wrapping is just more MCP tools." Every pitfall below was produced by that assumption in the wild. PDE's existing APPROVED_SERVERS allowlist, CJS-only root constraint, probe/degrade contracts, and markdown-based state each create specific friction against arbitrary subprocess execution, Python dependencies, and display-server-dependent GUI apps. The failures are ordered by damage-before-detection.

---

## Critical Pitfalls

### Pitfall 1: GUI App CLI Is Not Headless CLI — The Mock Wrapping Trap

**What goes wrong:**
When CLI-Anything (or the native --help parser) wraps a GUI app like GIMP or Blender, the generated harness wraps the *filesystem interface* of the app, not the running app itself. Tool calls appear to succeed: they write files, read configs, manipulate paths. But the underlying app is never controlled. The agent believes GIMP "exported the layer" because a file operation succeeded; GIMP was never involved. Confirmed in CLI-Anything issue #16 (gedit wrapping): "the implementation is a mock/simulation, rather than truly controlling the gedit GUI application."

**Why it happens:**
CLI-Anything's approach works cleanly for apps with well-defined backend interfaces, APIs, or Python modules (git, ffmpeg, ImageMagick). GUI apps that interact via D-Bus, X11 events, or in-memory buffers have no clean CLI surface to parse. The --help output is real; the capability model is synthetic.

**How to avoid:**
- Classify apps at discovery time into three tiers: (1) true CLI (git, ffmpeg, convert) — full wrapping supported; (2) CLI-accessible GUI (Blender -b, GIMP --no-interface) — limited but genuine headless mode; (3) GUI-only apps (gedit, Inkscape without --actions) — mock wrapping only, flag as `headless: false` in capability model.
- Require each capability model entry to declare `executionMode: "headless" | "gui-required" | "mock"`.
- During skill execution, reject `mock` entries with a user-visible error rather than silently proceeding.
- For Blender: use `blender --background --python script.py` path explicitly, not the generic CLI wrap.
- For GIMP: use `gimp --no-interface --batch` with Script-Fu explicitly. GIMP 3.x changed the batch interpreter; verify the exact invocation against installed version at wrap time.

**Warning signs:**
- Tool call returns exit code 0 but produces no observable artifact change.
- Capability model has rich tool descriptions but every tool has identical inputSchema (only `useJson` flag).
- Agent reports success but the file system shows no new outputs in the expected location.

**Phase to address:**
App discovery and classification phase — before any capability model is written to disk. The `headless` classification must be a gate, not a post-hoc annotation.

---

### Pitfall 2: Display Server Dependency in Headless Environments

**What goes wrong:**
Spawning GUI apps that require X11 or Wayland fails silently or with cryptic errors (`No X11 DISPLAY variable was set`, `cannot open display`, `GDK_BACKEND not set`) when Claude Code runs in an SSH session, CI/CD, or any context without a display server. The process exits with code 1, but stderr is often swallowed by the MCP tool wrapper's output buffering. The agent receives a tool error and either retries or proceeds as if successful depending on the error-handling path.

**Why it happens:**
Node.js `spawn()` inherits the parent process environment. Claude Code's environment when launched headlessly does not carry `DISPLAY` or `WAYLAND_DISPLAY`. GUI apps check these variables at startup before accepting any CLI arguments. Blender with `-b` flag is the exception (genuinely headless); GIMP without `--no-interface` is the rule (requires display).

**How to avoid:**
- At app wrap time, probe for display server availability: `process.env.DISPLAY || process.env.WAYLAND_DISPLAY`. Emit a capability model annotation `requiresDisplay: true/false`.
- For apps requiring display: either (a) require Xvfb as a dependency and document this clearly, or (b) mark tools as `unavailable` in the capability model when no display is detected, triggering the probe/degrade contract already established in PDE's MCP bridge.
- Never pass user-visible tool descriptions implying the app will operate when `requiresDisplay: true` and no display is available.
- Forward `process.env` explicitly when spawning — do not pass a custom `env` object without preserving `DISPLAY`.

**Warning signs:**
- App discovery succeeds (binary found on PATH) but all tool invocations fail.
- Exit code 1 with empty stdout and non-empty stderr containing "display" or "GDK".
- macOS-only: apps succeed; Linux CI fails. The asymmetry is the display server, not the app.

**Phase to address:**
Probe/degrade integration phase — the display server check should be part of the same probe contract that already governs MCP server availability.

---

### Pitfall 3: pip Dependency in a Node.js/CJS Plugin — PATH and Environment Isolation

**What goes wrong:**
`pip install cli-anything` or `pipx install cli-anything` is invoked from a Node.js subprocess. The installed binary lands in `~/.local/bin` (Linux) or `~/Library/Python/3.x/bin` (macOS Homebrew). This directory is not in the PATH of Claude Code's spawned child processes. The invocation throws `ENOENT`. Alternatively, if the pip install runs system-wide on a Homebrew Python (macOS 14+, PEP-668 enforced), it throws `error: externally-managed-environment` and fails entirely, silently breaking the fast path.

**Why it happens:**
Node.js `spawn()` uses `process.env.PATH` by default. When `env` is passed to `spawn()` options (which PDE does for controlled subprocess environments), `PATH` is only carried forward if explicitly included in the options object — a known Node.js 2025 issue (nodejs/node#58290). Homebrew Python 3.12+ enforces PEP-668 by default: global pip installs are rejected unless `--break-system-packages` is passed (which itself is the wrong fix). The combination means CLI-Anything's "pip install" documentation breaks silently on modern macOS.

**How to avoid:**
- Use `pipx install cli-anything` as the canonical install path — pipx manages its own venv and adds to PATH via `~/.local/bin` with a shim, reducing the breakage surface.
- At startup, resolve the CLI-Anything binary path explicitly: `which cli-anything` or `$(pipx environment --value PIPX_BIN_DIR)/cli-anything`. Store the resolved absolute path; never rely on PATH lookup at tool invocation time.
- When spawning from Node.js, always pass `{ env: { ...process.env, PATH: process.env.PATH } }` explicitly. Never pass a bare custom env object.
- Document the pip vs pipx distinction in SKILL.md for `/pde:cli-wrap`. Treat pipx as required, pip as unsupported.
- Consider detecting Python version at setup time: if `python3 --version` returns 3.12+ and Homebrew owns the binary, redirect to pipx unconditionally.

**Warning signs:**
- `ENOENT` on `cli-anything` invocation despite user reporting successful install.
- `error: externally-managed-environment` in stderr during setup.
- Binary found in interactive shell (`which cli-anything` works) but not in PDE subprocess context.

**Phase to address:**
CLI-Anything integration phase, specifically the dependency setup and path resolution step. The resolved binary path should be persisted to `.planning/config/` alongside other MCP server configs.

---

### Pitfall 4: Verified-Sources-Only Policy vs. Auto-Discovered Executables

**What goes wrong:**
PDE's existing MCP security model enforces an APPROVED_SERVERS allowlist. Desktop app discovery intentionally finds and wraps arbitrary executables from `mdfind`/`find` results. These are by definition not pre-approved sources. If the wrapping pipeline treats discovered binaries with the same trust level as approved MCP servers, the security boundary collapses. An attacker (or a confused agent) could wrap a malicious binary that happens to be on the system, then execute it with agent-constructed arguments.

**Why it happens:**
The CLI-Anything wrapping pipeline does not distinguish between vetted and unvetted executables. The capability model format is identical regardless of source. When PDE's executor agent receives a capability model, it issues tool calls against it. There is no layer checking whether the underlying binary was human-approved before the capability model was created.

**How to avoid:**
- Establish a two-tier registry: `system-discovered` (no-execute until human approved) vs. `human-approved` (full tool call rights). Implement a `status: "pending" | "approved" | "rejected"` field in the registry JSON. The `/pde:cli-wrap` skill should write to `pending` by default and require explicit `/pde:cli-approve <tool>` before the executor agent can issue tool calls.
- The APPROVED_SERVERS pattern already exists — extend it to cover app executables. Store approved binary paths (with SHA-256 hash of the binary) in an `APPROVED_EXECUTABLES` block in the MCP config.
- At tool call time, verify the binary's current hash against the stored hash. Binary substitution (symlink swap, PATH hijacking) would be caught by hash mismatch.
- CLI-Anything issue #143 confirms this risk explicitly: "SKILL.md prompt injection risk via auto-install in cli-hub-meta-skill." Tool descriptions sourced from --help output can contain adversarial text that poisons the agent's context.

**Warning signs:**
- Capability model registry grows without corresponding human approval events.
- Tool descriptions contain imperative sentences, URL references, or instructions to the agent (prompt injection in `--help` output).
- A discovered binary is in an unusual path (not `/Applications/`, `/usr/local/bin/`, `/opt/homebrew/bin/`).

**Phase to address:**
Security design phase, before any discovery or wrapping code is written. The two-tier registry architecture must be established as the foundation.

---

### Pitfall 5: --help Output Parsing Fails on Unpredictable Formats

**What goes wrong:**
The native --help parser assumes structured output: flags with descriptions, subcommands listed consistently, USAGE: header present. Real-world tools output man pages with backspace-formatting escape sequences (Blender, git), interactive TUI paginators (some older tools), single-line summaries with no subcommand listing, or nothing at all (some GUI launchers). The parser either produces an empty capability model (zero tools) or a corrupt one (binary-escaped descriptions in tool names). The agent then issues tool calls against garbage tool names that fail.

The CLI-Anything git capability model in `.planning/cli-anything/git/capability-model.json` already shows this: descriptions contain raw backspace-encoded man page output (e.g., `G\bGI\bIT\bT-\b-C\bCL\bLO\bON\bNE\bE`), which is nonfunctional as a tool description and will confuse any model trying to interpret it.

**Why it happens:**
`--help` output is designed for human terminals, not machine parsing. Tools that use nroff/groff formatting, less/more paginators, or multi-column layouts are common. There is no standard for machine-readable CLI help. The HKUDS CLI-Anything fast path and the native parser both face this; CLI-Anything has better heuristics but still fails on truly edge-case output (confirmed in issue #154: "default generated CLI for new applications is limited and lacks accuracy").

**How to avoid:**
- Add a post-parse validation step: if capability count is 0, or if any tool description contains backslash-b sequences, flag the capability model as `parseQuality: "degraded"` and fall back to a minimal capability model with a single `run_raw` tool that passes arguments through directly.
- Strip man page formatting before parsing: `col -b` (on macOS/Linux) strips backspace overprint sequences. Run output through this filter before any parsing step.
- For known apps with complex --help output (Blender, GIMP, FFmpeg), maintain a curated capability model override in `.planning/config/capability-overrides/` that takes precedence over auto-generated ones.
- Test the parser against at least three output format types: standard POSIX (`--flag <value>  description`), GNU long-form, and nroff-escaped man page output.

**Warning signs:**
- Capability model descriptions contain `\b` sequences or unprintable characters.
- Tool count for a known-complex app (git, blender) is suspiciously low (fewer than 5).
- Agent tool calls fail with "unknown tool" because the tool name was parsed from malformed output.

**Phase to address:**
--help parser implementation phase. The `parseQuality` annotation and `col -b` preprocessing should be in the initial implementation, not added as a fix later.

---

### Pitfall 6: Long Startup Apps Block the MCP Response Loop

**What goes wrong:**
Each MCP tool call that wraps a desktop app CLI creates a new subprocess. Some desktop apps have long startup times: Blender takes 2-8 seconds to initialize even in headless mode; GIMP with plugins takes 3-10 seconds. If the MCP server awaits these synchronously per tool call, the Claude Code response loop blocks. With multiple tool calls in a single agent turn (which PDE executor agents routinely make), total wait times compound to 30-60 seconds. Claude Code has no visible progress indicator for hanging tool calls; the user sees nothing and assumes failure.

**Why it happens:**
PDE's CLI wrapping uses a per-invocation subprocess pattern (as seen in the git server under `.planning/cli-anything/git/server/`). This is correct for fast CLIs. It becomes a blocking bottleneck for apps with significant initialization overhead. The problem is compounded by the `execSync` pattern, which some wrapping generators emit — this blocks the entire event loop, not just the current operation.

**How to avoid:**
- Never use synchronous variants in the MCP server implementation. Always use async `spawn` with promise wrappers.
- For apps with known long startup times, implement a process pool: spawn one persistent process at MCP server startup, keep it warm, route tool calls to the running process via stdin/stdout protocol or a Unix socket.
- Add a timeout per tool call (default 30 seconds, configurable per capability model entry). Emit a structured timeout error rather than hanging indefinitely.
- Declare startup time in the capability model: `startupMs: 5000`. The executor agent can use this to batch tool calls rather than calling sequentially.
- For the design pipeline (Blender render, GIMP export), expect these to be long-running operations and document expected durations in the SKILL.md.

**Warning signs:**
- Agent tool calls timeout at the Claude Code level (no response after 60 seconds).
- CPU usage spikes repeatedly (each tool call launching a new heavy process).
- Log shows the same app binary being launched and terminated for each tool call.

**Phase to address:**
MCP server generation phase. The timeout and async-only constraint should be part of the server generation template. Process pooling can be addressed in a later phase for specific heavy apps.

---

### Pitfall 7: Cross-Platform App Detection Inconsistencies

**What goes wrong:**
macOS detection (`mdfind "kMDItemContentType == 'com.apple.application-bundle'"`) finds `.app` bundles; the associated CLI binary may be at `Contents/MacOS/AppName`, `Contents/MacOS/appname-cli`, or a shell script wrapper at `/usr/local/bin`. Linux detection (`find /usr/bin /usr/local/bin /opt`) finds binaries directly but misses Snap/Flatpak/AppImage installs (`/snap/bin`, `~/Applications/*.AppImage`, `~/.local/bin`). A discovery algorithm that works on the developer's machine silently misses half the installed app surface on the user's machine.

**Why it happens:**
There is no cross-platform standard for app discovery. macOS uses bundle directories. Linux has five or more installation paths depending on the package manager. AppImage and Flatpak add user-local paths not in the standard system PATH. The `which` command finds only PATH-registered binaries, missing GUI apps that install no shell wrapper.

**How to avoid:**
- Implement platform-specific discovery strategies with explicit probing: macOS uses `mdfind` plus `/Applications/` enumeration plus Homebrew Cask list; Linux probes standard PATH plus Snap (`snap list`) plus Flatpak (`flatpak list`) plus `~/.local/bin` plus `~/Applications/`.
- For each discovered `.app` bundle on macOS, look for CLI entry points in this priority order: `Contents/MacOS/<BundleName>-cli`, `Contents/MacOS/<BundleName>`, Homebrew Cask shim in `/opt/homebrew/bin/`.
- Test discovery on macOS Sequoia, Ubuntu 24.04, and a Snap-heavy environment before declaring the feature complete.
- The discovery result is not authoritative: always validate that the found binary is executable (`fs.accessSync(path, fs.constants.X_OK)`) before writing it to the registry.

**Warning signs:**
- Discovery works on macOS but finds zero apps on Linux CI.
- Blender or GIMP found via `mdfind` but spawn fails (bundle path returned, not the binary path inside the bundle).
- App listed in registry but the execute permission check fails (GUI launcher script, not executable directly).

**Phase to address:**
App discovery implementation phase. Platform-specific strategies should be separate functions tested independently, not a unified function with ad-hoc conditionals.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `shell: true` in spawn for convenience | Avoids argument array construction | Command injection vector; never safe with agent-constructed args | Never — always use argument arrays |
| Write capability models with generic `useJson` inputSchema only | Fast to implement | Agent cannot construct valid tool calls; effectively useless | Never for production tools |
| Trust discovered binary paths without hash verification | Simple implementation | Binary substitution attack; PATH hijacking goes undetected | Never when security policy exists |
| Parse --help synchronously at tool call time | No caching needed | 2-8 second delay per first call per tool; blocks MCP loop | Only in development/prototyping |
| Use `pip install` without venv for CLI-Anything | One fewer setup step | Breaks on Homebrew Python 3.12+ (PEP-668); system package corruption | Never — always use pipx |
| Skip `headless` classification for all discovered apps | Simpler discovery | Mock tools succeed silently; agent produces no actual output | Never — classification is required |
| Auto-discovered tools without human approval gate | Faster UX | Violates PDE's verified-sources-only policy; security regression | Only if scope explicitly limited to known-safe app categories |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-----------------|
| CLI-Anything fast path | Calling `cli-anything` by name and relying on PATH | Resolve absolute path at setup time via `which cli-anything` after pipx install; store in config |
| Blender headless | Using `blender <file>` without `-b` flag | Always use `blender --background` for headless; `-b` is the headless gate |
| GIMP batch mode | Using GIMP 2.x Script-Fu syntax on GIMP 3.x | GIMP 3.x changed batch interpreter; verify `gimp --version` and use appropriate `--batch` syntax |
| Node.js spawn with custom env | Passing `env: { MY_VAR: value }` | Always pass `env: { ...process.env, MY_VAR: value }` to preserve PATH and DISPLAY |
| MCP probe/degrade contract | Treating spawn failure as a hard error | Wrap all subprocess failures in the existing probe/degrade pattern; degrade to no-op with user message |
| macOS app bundle CLI | Using the `.app` path directly | Resolve to the executable inside the bundle: `app.app/Contents/MacOS/binary` |
| Agent tool call arguments | Passing raw user text as CLI arguments | Always construct argument arrays; never concatenate strings; validate against inputSchema before invocation |
| SKILL.md generation from --help | Including raw man page escape sequences in descriptions | Run output through `col -b` before generating SKILL.md; strip all backspace sequences |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-call heavy app launch | Tool calls take 5-10 seconds each; agent turn takes 60+ seconds | Process pool for heavy apps; declare `startupMs` in capability model | Every call to Blender/GIMP |
| Synchronous subprocess wait | Node.js event loop blocked; MCP server unresponsive to other requests | Use async spawn with promise wrapper; never use synchronous variants | Immediately on first heavy tool call |
| Recursive --help parsing | Parser calls `app subcommand --help` for every subcommand to build full capability model | Limit depth to 2 levels; parse top-level --help only; defer subcommand discovery | Apps with 50+ subcommands (git) |
| Capability model regeneration on every use | Slow startup for cached tools | Cache capability models to disk; only regenerate on binary version change (hash check) | After 3+ tools are wrapped |
| stdout buffer overflow | Large command output (render logs, verbose mode) blocks pipe buffer; deadlock | Always pipe stdout/stderr to consuming streams; never accumulate full output in memory | Commands producing more than 64KB output |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Treating all discovered executables as trusted | Arbitrary code execution via PATH hijacking or symlink substitution | Two-tier registry (pending/approved) plus binary hash verification |
| Passing agent-constructed strings to shell | Command injection (OWASP MCP05:2025, CVE-2026-33475 Langflow pattern) | Always use argument arrays with spawn(); never use shell mode |
| Inlining --help tool descriptions verbatim into agent context | Prompt injection via adversarial `--help` output (CLI-Anything issue #143) | Sanitize descriptions: strip imperative sentences, URLs, angle-bracket placeholders before writing SKILL.md |
| Storing discovered binary paths as-is without canonicalization | Symlink bypass (CVE-2025-53109 Anthropic Filesystem MCP pattern) | Use `fs.realpath()` to resolve symlinks; store canonical path plus hash |
| Auto-approving CLI-Anything generated tools without review | Tool poisoning via malformed capability model | Require human `/pde:cli-approve` before any tool enters approved tier |
| Wrapping apps with OAuth token storage (e.g., Zoom) | OAuth token exfiltration via tool call (CLI-Anything issue #144) | Flag apps with credential files in capability model; require explicit user consent before wrapping |
| Ignoring `requiresDisplay` when in headless context | Unexpected process spawning in production; potential privilege escalation if display forwarding misconfigured | Probe display availability at tool call time; hard-fail rather than attempt spawn |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent mock success (GUI-only app returns exit 0, no actual operation) | User believes GIMP edited the image; it did not; hours of work based on false state | Require explicit artifact verification: check that expected output file exists and has changed after tool call |
| No feedback during long Blender render | User sees spinner for 2 minutes; assumes failure; cancels | Stream stderr to the agent context as incremental progress; surface render completion percentage |
| Discovery finds app but wrapping fails silently | `/pde:cli-wrap` returns "done" but no SKILL.md generated | Use probe/degrade: if wrapping fails, emit a visible WARN entry to the event bus with diagnosis |
| Version-specific capability models become stale | GIMP 2 to 3 upgrade breaks all Script-Fu tool calls silently | Store binary version in capability model metadata; warn when binary version changes |
| Unhelpful ENOENT errors | User sees "Error: spawn ENOENT" with no diagnosis | Resolve ENOENT to human-readable: "CLI-Anything binary not found. Run: pipx install cli-anything" |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **App discovery:** Found the `.app` bundle — but did not verify the executable binary inside the bundle is runnable. `mdfind` returns bundles; agents need binaries.
- [ ] **Capability model written:** File exists at `.planning/cli-anything/<app>/capability-model.json` — but `parseQuality` not set; tool descriptions contain backspace sequences; agent context will be poisoned.
- [ ] **CLI-Anything installed:** `pipx install cli-anything` succeeded — but absolute binary path not resolved and stored; PATH-lookup will fail in subprocess context.
- [ ] **Blender tool works:** Blender exits 0 — but no `-b` flag was used; Blender opened GUI window (or failed silently in headless), did not execute the script.
- [ ] **GIMP batch works:** GIMP exits 0 — but `RUN-NONINTERACTIVE` mode was not specified; Script-Fu ran in interactive mode and blocked waiting for user input.
- [ ] **Tool approved:** Capability model written to registry — but `status: "pending"` was not checked before tool call; agent executed against unapproved binary.
- [ ] **Cross-platform tested:** Works on macOS — but Linux discovery paths not implemented; `/snap/bin` and Flatpak not probed; Linux users see zero apps discovered.
- [ ] **Error handling done:** Try/catch around subprocess — but stderr not captured; binary hash not checked; timeout not set; probe/degrade not triggered on failure.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Mock wrapping produced false state | HIGH | Audit all tool call outputs in current session for affected app; identify which design pipeline artifacts are contaminated; regenerate from last known-good state |
| CLI-Anything pip breakage on Homebrew Python | LOW | `brew install pipx && pipx install cli-anything`; re-resolve binary path; no capability model changes needed |
| Binary hash mismatch after app update | LOW | Revoke approval in registry; re-run `/pde:cli-wrap <app>`; require re-approval |
| Agent injected adversarial --help content into SKILL.md | MEDIUM | Delete SKILL.md for affected app; regenerate with sanitization pass; audit agent context for any tool calls issued against poisoned descriptions |
| stdout buffer overflow deadlock | MEDIUM | Kill hung process; fix piping to use streaming; increase timeout; restart MCP server |
| Full capability model registry corruption | HIGH | Restore from last committed registry.json; re-run discovery and approval flow; no user data lost if design artifacts are separate |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| GUI app mock wrapping | App classification and discovery phase | Each capability model must have `executionMode` field; test a `headless: false` app and verify error is surfaced |
| Display server dependency | Probe/degrade integration phase | Run tool call against display-dependent app in `DISPLAY=` env; verify probe/degrade fires, not silent failure |
| pip PATH isolation | CLI-Anything setup phase | Test binary resolution in a subprocess context with a clean env; verify absolute path lookup works |
| Unapproved executables in tool calls | Security architecture phase (first phase) | Attempt tool call against `status: "pending"` entry; verify hard rejection |
| --help parsing failures | Parser implementation phase | Test parser against git (nroff output), blender (long output), and a minimal tool; verify `parseQuality` annotation |
| Long-startup app blocking | MCP server generation phase | Run 3 sequential Blender tool calls; verify total time is less than 3x single-call time (async, not sequential blocking) |
| Cross-platform detection failures | Discovery implementation phase | Run discovery against macOS and Linux; verify Flatpak/Snap paths probed on Linux |
| Agent argument injection | Security architecture phase (first phase) | Attempt tool call with shell metacharacters in an argument field; verify argument array prevents shell expansion |

---

## Sources

- HKUDS/CLI-Anything GitHub Issues: #16 (gedit mock wrapping), #143 (SKILL.md prompt injection), #144 (OAuth token exposure), #154 (capability model accuracy) — https://github.com/HKUDS/CLI-Anything/issues
- Node.js spawn PATH environment issue — https://github.com/nodejs/node/issues/58290
- Node.js spawn ENOENT diagnosis — https://thecodersblog.com/demystifying-error-spawn-enoent-node-js
- Homebrew Python PEP-668 externally-managed-environment — https://discuss.python.org/t/on-macos-14-pip-install-throws-error-externally-managed-environment/50352
- stdout deadlock with PIPE — https://thraxil.org/users/anders/posts/2008/03/13/Subprocess-Hanging-PIPE-is-your-enemy/
- OWASP MCP Top 10 2025 — MCP05 Command Injection, MCP02 Privilege Escalation — https://owasp.org/www-project-mcp-top-10/2025/
- CVE-2025-53109/53110 Anthropic Filesystem MCP symlink bypass — https://cymulate.com/blog/cve-2025-53109-53110-escaperoute-anthropic/
- macOS Spotlight TCC vulnerability CVE-2025-31199 (Sploitlight) — https://www.microsoft.com/en-us/security/blog/2025/07/28/sploitlight-analyzing-a-spotlight-based-macos-tcc-vulnerability/
- Blender headless GPU fallback issue — https://devtalk.blender.org/t/solved-2-90-headless-rendering-ignoring-script-selecting-gpus-falls-back-on-the-cpu/16886
- Blender CLI automation guide — https://renderday.com/blog/mastering-the-blender-cli
- GIMP Script-Fu batch mode differences — https://discuss.pixls.us/t/script-fu-example-batch-script-explained-for-beginners/7341
- X11 DISPLAY errors in headless context — https://www.baeldung.com/linux/no-x11-display-error
- MCP security post-mortems (Supabase incident, CVE-2025-6514 mcp-remote) — https://www.practical-devsecops.com/mcp-security-vulnerabilities/

---
*Pitfalls research for: Desktop App CLI Integration — PDE v0.21 milestone*
*Researched: 2026-03-28*
