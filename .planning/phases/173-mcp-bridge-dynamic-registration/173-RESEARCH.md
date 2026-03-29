# Phase 173: MCP Bridge Dynamic Registration - Research

**Researched:** 2026-03-29
**Domain:** mcp-bridge.cjs extension, dynamic server registration, pde-tools app CLI surface, server-gen.cjs pip module handler, Node.js file I/O patterns
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REG-01 | `mcp-bridge.cjs` gains `loadDynamicServers(registryPath)` reading registry.json at module init, populating APPROVED_SERVERS + TOOL_MAP for `approved` entries only | Verified: mcp-bridge.cjs APPROVED_SERVERS and TOOL_MAP are plain objects mutated at module scope — `loadDynamicServers()` reads the file at require-time and merges entries |
| REG-02 | `pde-tools app discover\|wrap\|register\|list\|probe` subcommand as user-facing CLI entry point | Verified: `pde-tools.cjs` uses a plain `switch(command)` router; adding `case 'app':` with sub-switch is the established pattern (see `case 'cli-anything':` at line 729) |
| REG-03 | `server-gen.cjs` gains `generatePythonModuleHandler()` for pip CLIs using `python -m {tool}` spawn pattern | Verified: `generateToolHandler()` in server-gen.cjs is the precedent; new function generates an analogous handler body using `spawnSync('python3', ['-m', moduleName, ...args], ...)` with validated module name |
| REG-04 | Dynamic registration uses `registerDynamicServer(slug, serverPath, caps)` for single-app registration path | Verified: APPROVED_SERVERS needs a `serverPath` field (stdio transport); TOOL_MAP needs synthetic canonical-to-raw entries per capability; both are plain objects — mutation at runtime is safe |
</phase_requirements>

---

## Summary

Phase 173 extends two existing modules (`mcp-bridge.cjs` and `server-gen.cjs`) and adds one new routing layer (`pde-tools app` commands). None of these are greenfield — every pattern has a tested precedent in the codebase.

**mcp-bridge.cjs** currently holds static `APPROVED_SERVERS` and `TOOL_MAP` objects populated at require-time. Phase 173 adds `loadDynamicServers(registryPath)` which reads `app-registry.json` (created by Phase 171), filters for `status === 'approved'`, and merges entries into both objects using a deterministic naming convention (`mcp__app_{slug}__{toolName}`). This function is called once at module scope when the registry file exists, so the next Claude Code session automatically sees all approved apps in TOOL_MAP.

**server-gen.cjs** adds `generatePythonModuleHandler(moduleName, cap)` — a variant of `generateToolHandler()` that uses `spawnSync('python3', ['-m', moduleName, ...subcmdArgs, ...userArgs], ...)` instead of `spawnSync(BINARY, ...)`. The critical security requirement is that `moduleName` must pass strict validation (alphanumeric + underscore + hyphen only, no shell metacharacters) before being embedded in generated code.

**pde-tools.cjs** adds `case 'app':` routing `discover`, `wrap`, `register`, `list`, and `probe` subcommands to new functions in `bin/lib/app-discovery.cjs` and `bin/lib/app-registry.cjs` (the Phase 171 modules). These modules do not exist yet — they are the Phase 171 deliverable. Phase 173 assumes Phase 171 has shipped those modules and routes to their functions.

**Primary recommendation:** Keep all three changes orthogonal. `loadDynamicServers()` is the only function that bridges Phase 171 (registry) and the existing bridge; `registerDynamicServer()` is its single-app variant for interactive use. No new npm dependencies. No shell strings anywhere — argument arrays throughout.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs | built-in (v20.x) | Read app-registry.json at module init | Already used by mcp-bridge.cjs via `safeReadFile` from core.cjs |
| Node.js path | built-in (v20.x) | Resolve registry path relative to cwd | Already used throughout mcp-bridge.cjs |
| Node.js child_process spawnSync | built-in (v20.x) | pip module subprocess in generated handlers (argument array, not shell string) | Already used in server-gen.cjs generateToolHandler; spawnSync with argument arrays in generated servers |
| Node.js crypto | built-in (v20.x) | (Inherited) SHA-256 from Phase 171 app-registry.cjs | Phase 171 pattern; not new in Phase 173 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bin/lib/core.cjs (project) | Phase 163 | `safeReadFile()` — returns null on ENOENT instead of throwing | Use for all registry reads in mcp-bridge.cjs to maintain existing error-handling contract |
| bin/lib/app-registry.cjs (Phase 171) | Phase 171 | `loadRegistry()`, `checkApproved()` | Called from `pde-tools app` subcommand handlers only — NOT directly from mcp-bridge.cjs |
| bin/lib/app-discovery.cjs (Phase 171) | Phase 171 | `probeBinary()`, `discoverApp()` | Called from `pde-tools app discover` handler |
| bin/lib/cli-anything/server-gen.cjs (project) | Phase 164 | `writeServer()` — generates MCP server.cjs from capability model | Called from `pde-tools app wrap` handler when generating pip module servers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mutating APPROVED_SERVERS + TOOL_MAP at module scope | Re-reading registry on every `call()` invocation | Module-scope mutation happens once per session — correct semantics (bridge reflects session-start state); per-call reads would add fs I/O to every tool lookup |
| `safeReadFile` for registry read | `fs.readFileSync` with try/catch inline | `safeReadFile` is already the established pattern in mcp-bridge.cjs; use it for consistency |
| `spawnSync('python3', ['-m', module, ...])` in generated code | Template-string shell command | Template strings enable shell injection; spawnSync with argument array is mandatory — see security section |
| Separate `app-bridge.cjs` module | Extending mcp-bridge.cjs directly | Phase 173 explicitly targets mcp-bridge.cjs (REG-01, REG-04); the existing consumers (`call()`, `assertApproved()`) work on the same APPROVED_SERVERS/TOOL_MAP objects — a separate module would require consumers to merge two maps |

**Installation:** No new npm dependencies. All built on Node.js built-ins and existing project modules.

---

## Architecture Patterns

### Recommended Project Structure

Phase 173 modifies two existing files and adds no new lib modules. Phase 171 modules must exist first.

```
bin/lib/
  mcp-bridge.cjs          # MODIFIED: +loadDynamicServers(), +registerDynamicServer()
  cli-anything/
    server-gen.cjs        # MODIFIED: +generatePythonModuleHandler(), +writePythonModuleServer()
  app-registry.cjs        # Phase 171 deliverable (READ-ONLY from Phase 173 perspective)
  app-discovery.cjs       # Phase 171 deliverable (READ-ONLY from Phase 173 perspective)

bin/
  pde-tools.cjs           # MODIFIED: +case 'app': routing block

.planning/
  app-registry.json       # Phase 171 output; mcp-bridge reads this at module init

tests/phase-173/
  mcp-bridge-dynamic.test.mjs    # REG-01, REG-04
  server-gen-python.test.mjs     # REG-03
  pde-tools-app.test.mjs         # REG-02
```

### Pattern 1: loadDynamicServers — Module-Scope Registration

**What:** Called once at module require-time; reads registry, merges approved entries into APPROVED_SERVERS and TOOL_MAP.
**When to use:** Called at the bottom of mcp-bridge.cjs module scope, guarded by existence check on the registry file.

```javascript
// Source: derived from mcp-bridge.cjs architecture + app-registry.cjs schema (Phase 171)
// Verified 2026-03-29

const APP_REGISTRY_PATH = path.join(process.cwd(), '.planning', 'app-registry.json');

/**
 * Load approved app-registry entries into APPROVED_SERVERS and TOOL_MAP.
 * Called at module scope — runs once per Node.js process lifetime.
 * Safe to call when registry file does not exist (no-op).
 *
 * @param {string} [registryPath] - Override for testing; defaults to APP_REGISTRY_PATH
 */
function loadDynamicServers(registryPath) {
  const rPath = registryPath || APP_REGISTRY_PATH;
  const raw = safeReadFile(rPath); // Returns null on ENOENT — never throws
  if (!raw) return;

  let registry;
  try {
    registry = JSON.parse(raw);
  } catch {
    return; // Corrupt registry — fail silently; do not crash the bridge
  }

  const entries = registry.entries || [];
  for (const entry of entries) {
    if (entry.status !== 'approved') continue; // pending + rejected entries are excluded

    // Server entry for APPROVED_SERVERS: stdio transport, path to generated server.cjs
    APPROVED_SERVERS[entry.slug] = {
      displayName: entry.displayName || entry.slug,
      transport: 'stdio',
      serverPath: entry.serverPath,
      probeTimeoutMs: entry.startupMs || 5000,
      probeTool: `mcp__app_${entry.slug}__probe`,
      probeArgs: {},
    };

    // Load capabilities from capability-model.json (Phase 172 output)
    const modelPath = path.join(
      process.cwd(), '.planning', 'app-wrappers', entry.slug, 'capability-model.json'
    );
    let caps = [];
    const modelRaw = safeReadFile(modelPath);
    if (modelRaw) {
      try {
        const model = JSON.parse(modelRaw);
        caps = model.capabilities || [];
      } catch { /* skip caps if model corrupt */ }
    }

    // TOOL_MAP entries: one per capability
    for (const cap of caps) {
      const canonical = `${entry.slug}:${cap.name.replace(/_/g, '-')}`;
      const rawName  = `mcp__app_${entry.slug}__${cap.name}`;
      TOOL_MAP[canonical] = rawName;
    }
  }
}

// Call at module scope — runs once when mcp-bridge.cjs is required
loadDynamicServers();
```

**Key constraints:**
- `safeReadFile` returns null on ENOENT (established pattern from `loadConnections()` in mcp-bridge.cjs lines 325-332)
- Do not throw anywhere inside `loadDynamicServers()` — this function runs at module scope
- `entry.slug` is used directly in APPROVED_SERVERS. See Pitfall 2 for collision handling.

### Pattern 2: registerDynamicServer — Single-App Runtime Registration

**What:** Interactive path used by `pde-tools app register <slug>` — adds a single approved entry without re-reading the whole registry.
**When to use:** After a user approves an app mid-session and wants bridge registration without waiting for next session.

```javascript
// Source: derived from APPROVED_SERVERS + TOOL_MAP structure, verified 2026-03-29

/**
 * Register a single approved app into APPROVED_SERVERS and TOOL_MAP.
 * Idempotent — re-registering an already-registered slug overwrites silently.
 *
 * @param {string} slug - Registry slug (e.g. 'rembg', 'blender')
 * @param {string} serverPath - Absolute path to generated server.cjs
 * @param {Array<{name: string, description: string}>} caps - Capability list
 * @param {object} [opts] - { displayName, startupMs }
 */
function registerDynamicServer(slug, serverPath, caps, opts = {}) {
  if (!slug || typeof slug !== 'string') throw new Error('slug is required');
  if (!serverPath || typeof serverPath !== 'string') throw new Error('serverPath is required');
  if (!Array.isArray(caps)) throw new Error('caps must be an array');

  APPROVED_SERVERS[slug] = {
    displayName: opts.displayName || slug,
    transport: 'stdio',
    serverPath,
    probeTimeoutMs: opts.startupMs || 5000,
    probeTool: `mcp__app_${slug}__probe`,
    probeArgs: {},
  };

  for (const cap of caps) {
    const canonical = `${slug}:${cap.name.replace(/_/g, '-')}`;
    const rawName  = `mcp__app_${slug}__${cap.name}`;
    TOOL_MAP[canonical] = rawName;
  }
}
```

### Pattern 3: generatePythonModuleHandler — pip CLI Handler Body

**What:** Variant of `generateToolHandler()` in server-gen.cjs that uses `spawnSync('python3', ['-m', moduleName, ...])` instead of `spawnSync(BINARY, ...)`.
**When to use:** When `meta.type === 'pip-module'` in the capability model.

Module name validation function (placed in server-gen.cjs, called before codegen):

```javascript
// Source: derived from server-gen.cjs + Python PEP 508 naming rules, verified 2026-03-29

/**
 * Validate a pip module name before embedding it in generated source code.
 * Accepts only [a-zA-Z0-9_-]. Dots are excluded even though PyPI allows them
 * because Python's -m flag normalizes dots to submodule traversal.
 * Throws on any disallowed character.
 *
 * @param {string} moduleName
 * @throws {Error} if moduleName contains disallowed characters
 */
function validateModuleName(moduleName) {
  if (typeof moduleName !== 'string' || moduleName.length === 0) {
    throw new Error('moduleName must be a non-empty string');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(moduleName)) {
    throw new Error(
      `Invalid pip module name "${moduleName}". ` +
      `Only alphanumeric, underscore, and hyphen characters are allowed.`
    );
  }
}
```

Handler body generation:

```javascript
/**
 * Generate a tool handler body for a pip CLI module.
 * Uses spawnSync with an argument array — NOT a shell string.
 * moduleName is validated before this function is called.
 *
 * @param {string} moduleName - Validated pip module name (e.g. 'rembg')
 * @param {object} cap - Capability object
 * @returns {string} JavaScript handler body string
 */
function generatePythonModuleHandler(moduleName, cap) {
  validateModuleName(moduleName); // Throws early on bad input — last-line defense

  const subPath = cap.extensions && cap.extensions.subcommandPath
    ? JSON.stringify(cap.extensions.subcommandPath)
    : JSON.stringify(cap.path ? cap.path.split(' ').slice(1) : []);

  // moduleName is embedded as JSON.stringify(moduleName) — safe because validateModuleName
  // rejected all non-[a-zA-Z0-9_-] characters before reaching this point.
  const safeModuleLiteral = JSON.stringify(moduleName);

  return `async (input) => {
    const args = [...${subPath}];
    if (input && input.useJson) args.push('--json');
    if (input) {
      for (const [key, val] of Object.entries(input)) {
        if (key === 'useJson') continue;
        if (val !== undefined && val !== null && val !== false) {
          args.push('--' + key);
          if (val !== true) args.push(String(val));
        }
      }
    }
    if (DRY_RUN) {
      return { content: [{ type: 'text', text: JSON.stringify({ dryRun: true, command: ['python3', '-m', ${safeModuleLiteral}, ...args] }) }] };
    }
    const r = spawnSync('python3', ['-m', ${safeModuleLiteral}, ...args], { encoding: 'utf8', timeout: 30000 });
    let data;
    try { data = JSON.parse(r.stdout); } catch (_) { data = { stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim(), exitCode: r.status !== null ? r.status : -1 }; }
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  }`;
}
```

**Critical difference from `generateToolHandler`:** The binary literal is hardcoded as `'python3'` and the module name follows after `'-m'`. No `BINARY` constant in the generated server — the generated code has `'python3'` and the module name baked in at codegen time.

### Pattern 4: pde-tools app Subcommand Router

**What:** New `case 'app':` block in `pde-tools.cjs` routing five subcommands to Phase 171 module functions.
**When to use:** Follows the exact structure of `case 'cli-anything':` at line 729 of pde-tools.cjs.

```javascript
// Source: pde-tools.cjs lines 729-748 — the cli-anything case as the exact template
// Phase 171 must be shipped before this block is written — verify actual export names first

case 'app': {
  const subcommand = args[1];
  if (subcommand === 'discover') {
    const { cmdDiscover } = require('./lib/app-discovery.cjs');
    await cmdDiscover(cwd, args.slice(2));
  } else if (subcommand === 'wrap') {
    const { cmdWrap } = require('./lib/app-registry.cjs');
    await cmdWrap(cwd, args.slice(2));
  } else if (subcommand === 'register') {
    const { cmdRegister } = require('./lib/app-registry.cjs');
    await cmdRegister(cwd, args.slice(2));
  } else if (subcommand === 'list') {
    const { cmdList } = require('./lib/app-registry.cjs');
    await cmdList(cwd, args.slice(2));
  } else if (subcommand === 'probe') {
    const { cmdProbe } = require('./lib/app-discovery.cjs');
    await cmdProbe(cwd, args.slice(2));
  } else {
    console.error(`Unknown app subcommand: ${subcommand}. Available: discover, wrap, register, list, probe`);
    process.exit(1);
  }
  break;
}
```

**Dependency contract:** The router assumes Phase 171 exports exactly:
- `app-discovery.cjs`: `cmdDiscover(cwd, args)`, `cmdProbe(cwd, args)`
- `app-registry.cjs`: `cmdWrap(cwd, args)`, `cmdRegister(cwd, args)`, `cmdList(cwd, args)`

If Phase 171 uses different export names, Phase 173 router must match Phase 171's actual exports — not the names above. Verify before writing.

### Pattern 5: Dynamic Naming Convention (canonical to raw tool names)

The MCP runtime generates raw tool names from the server registration name using the pattern `mcp__{serverSlug}__{toolName}`. For app-registry apps:

```
Server slug:     blender
Tool name:       render_frame          (from capability model)
Raw tool name:   mcp__app_blender__render_frame
Canonical name:  blender:render-frame  (underscores become hyphens in canonical form)
```

The `app_` prefix in raw names distinguishes dynamically-registered apps from statically-registered servers (github, linear, figma, etc.) in TOOL_MAP. This prevents raw name collision if an app is named `github` or `linear`.

The canonical form uses the plain slug without `app_` prefix — users write `blender:render-frame`, not `app_blender:render-frame`.

### Anti-Patterns to Avoid

- **Shell string construction for python invocation:** Never use template strings to build subprocess commands. Always pass an argument array to `spawnSync`: `spawnSync('python3', ['-m', moduleName, ...args])`.
- **Throwing in loadDynamicServers:** If the registry file is missing or corrupt, return silently. Never throw from module scope — it crashes any module that requires mcp-bridge.cjs.
- **Reading registry on every `call()` invocation:** Registry is loaded once at module scope. If an app is approved mid-session, users run `pde-tools app register` to refresh.
- **Omitting `app_` prefix in raw MCP tool names:** Without the prefix, a slug like `playwright` would generate raw names colliding with the existing static Playwright entries.
- **Embedding capabilities in APPROVED_SERVERS entries:** APPROVED_SERVERS stores server metadata (transport, probeTool). Capabilities belong in TOOL_MAP. Follow the existing separation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Registry file read with ENOENT safety | Custom try/catch around fs.readFileSync | `safeReadFile` from `bin/lib/core.cjs` | Already exists; consistent error handling across all mcp-bridge.cjs reads |
| MCP server file generation for pip tools | Custom codegen string builder from scratch | `generatePythonModuleHandler()` + existing `generateServerSource()` scaffold from server-gen.cjs | server-gen.cjs already handles tool registration, header/footer boilerplate; only the handler body is new |
| Capability model loading for dynamic registration | Parse server.cjs source to recover caps | Load `capability-model.json` from `.planning/app-wrappers/{slug}/` (Phase 172 output) | capability-model.json is the canonical source; source-file parsing is fragile and unnecessary |
| Output formatting in pde-tools app list | Custom table renderer | Mirror `cmdList` in `bin/lib/cli-anything/registry.cjs` (lines 112-135) | Exact same pattern: compute column widths, print header + separator + rows |

**Key insight:** Phase 173 is extension, not construction. Every new function has a tested precedent in the codebase.

---

## Security: Shell Injection Prevention for python -m Invocations

**Threat model:** `moduleName` originates from user input (pde-tools app discover) and is stored in app-registry.json. A malicious or accidental value containing shell metacharacters could cause harm if handled naively.

**Defense layers (both required):**

1. **Input validation at discovery time** (Phase 171 responsibility): `validateModuleName(pipModule)` called in `app-discovery.cjs` before writing to registry. Rejects any pipModule that does not match `/^[a-zA-Z0-9_-]+$/`.

2. **Input validation at codegen time** (Phase 173 responsibility): `validateModuleName(moduleName)` called as the first line of `generatePythonModuleHandler()`. This is the last-line defense if a corrupt registry entry bypasses Phase 171 validation.

**Why spawnSync with argument array is correct:** `spawnSync('python3', ['-m', moduleName, ...args])` passes the module name as a literal argument to the Python interpreter — the OS never invokes a shell. Shell metacharacters in `moduleName` are passed as-is to Python, which rejects them with `ModuleNotFoundError`. The argument array approach is correct by default.

**Why validation is still required:** The module name appears as a string literal in the generated server.cjs source file. A corpus reader or git diff reviewer would see the injected characters. Validation prevents this and provides defense in depth if the spawnSync pattern is ever refactored.

**Valid pip module name examples:** `rembg`, `imageio-ffmpeg`, `whisper_transcribe`, `torch_utils`
**Invalid (rejected):** `rembg; echo pwned`, `../etc/passwd`, `$(whoami)`, `rembg\nmalicious`

---

## Common Pitfalls

### Pitfall 1: loadDynamicServers Crashing the Entire Bridge

**What goes wrong:** `loadDynamicServers()` throws on a corrupt or partially-written registry file. Because it runs at module scope, the `require('mcp-bridge.cjs')` call fails, crashing any workflow that uses mcp-bridge.
**Why it happens:** JSON.parse throws on syntax errors; unguarded fs.readFileSync throws on ENOENT.
**How to avoid:** Wrap both the file read (use `safeReadFile` — handles ENOENT) and the JSON.parse in try/catch. Log a warning to stderr but return without throwing.
**Warning signs:** Unit test for `loadDynamicServers` with a non-existent registry path must return without error — not throw.

### Pitfall 2: Tool Name Collision Between Static and Dynamic Servers

**What goes wrong:** A discovered app slug matches an existing APPROVED_SERVERS key (e.g., user names their app `github`). The dynamic registration overwrites the static GitHub entry.
**Why it happens:** `loadDynamicServers()` sets `APPROVED_SERVERS[entry.slug] = ...` without verifying the key does not already exist.
**How to avoid:** Check before writing: if `APPROVED_SERVERS[entry.slug]` already exists and was not set by a prior `loadDynamicServers` call, skip the entry and log a warning. Alternatively, keep dynamic entries in a separate `DYNAMIC_SERVERS` object and update `call()` to check both.
**Warning signs:** After `loadDynamicServers()`, `assertApproved('github')` returns a stdio entry instead of the HTTP GitHub entry.

### Pitfall 3: generatePythonModuleHandler With Unvalidated Module Name

**What goes wrong:** Module name from user input or registry entry contains non-alphanumeric characters. Even though `spawnSync` uses argument arrays, the module name is embedded as a string literal in the generated server.cjs source file.
**Why it happens:** Skipping `validateModuleName()` before calling `generatePythonModuleHandler()`.
**How to avoid:** Call `validateModuleName(moduleName)` as the first line of `generatePythonModuleHandler()`. Also validate at the `pde-tools app discover` stage (Phase 171).
**Warning signs:** Registry entries with `pipModule` containing `/`, `;`, `$`, `\n`, or spaces must be rejected at discovery time.

### Pitfall 4: Registry Concurrent Read/Write Race

**What goes wrong:** `loadDynamicServers()` reads app-registry.json while `pde-tools app register` is writing it in another process. The bridge gets a partial JSON file, JSON.parse fails, silent catch skips all registrations.
**Why it happens:** Node.js has no built-in cross-process file locking.
**How to avoid:** Phase 173's exposure is low — `loadDynamicServers()` runs once at session start, not on a timer. The concurrent scenario only arises if both processes run simultaneously, which is unusual in the pde-tools CLI usage pattern.
**If it becomes a concern:** Write-then-rename pattern: `writeFileSync(path + '.tmp', ...)` then `renameSync(path + '.tmp', path)`. On Linux/macOS (same filesystem), rename is atomic. This is a future concern, not a Phase 173 blocker.
**Warning signs:** Intermittent empty TOOL_MAP despite approved entries in registry.

### Pitfall 5: pde-tools app Routing Before Phase 171 Modules Exist

**What goes wrong:** Phase 173 adds the `case 'app':` router, but `app-discovery.cjs` and `app-registry.cjs` do not exist yet. The `require('./lib/app-discovery.cjs')` inside the router throws MODULE_NOT_FOUND.
**Why it happens:** Phase 173 routing code depends on Phase 171 modules. If Phase 171 is not complete, the router blows up.
**How to avoid:** Phase 171 must be verified-complete before Phase 173 begins. Do not write the pde-tools app router until Phase 171 exports are confirmed to exist.
**Warning signs:** `pde-tools-app.test.mjs` tests fail with MODULE_NOT_FOUND rather than assertion errors.

---

## Code Examples

Verified patterns from project source:

### safeReadFile Usage — Established Pattern

```javascript
// Source: mcp-bridge.cjs lines 325-332 — loadConnections() is the exact template
function loadConnections() {
  const raw = safeReadFile(CONNECTIONS_PATH);
  if (!raw) return { schema_version: '1.0', connections: {} };
  try {
    return JSON.parse(raw);
  } catch {
    return { schema_version: '1.0', connections: {} };
  }
}
// loadDynamicServers() follows this exact pattern
```

### pde-tools Case Block Structure

```javascript
// Source: pde-tools.cjs lines 729-748 — cli-anything case as the exact template
case 'cli-anything': {
  const subcommand = args[1];
  if (subcommand === 'ingest') {
    const { cmdIngest } = require('./lib/cli-anything/ingest.cjs');
    await cmdIngest(cwd, args.slice(2));
  } else if (subcommand === 'wrap') {
    const { cmdWrap } = require('./lib/cli-anything/help-parser.cjs');
    await cmdWrap(cwd, args.slice(2));
  } else {
    console.error('Unknown cli-anything subcommand: ...');
    process.exit(1);
  }
  break;
}
// Phase 173 'app' case is structurally identical to this
```

### server-gen.cjs generateToolHandler — Reference Implementation

```javascript
// Source: server-gen.cjs lines 40-64 — generatePythonModuleHandler() is a variant of this
// The only difference is the spawnSync call: BINARY becomes 'python3', '-m', moduleName
function generateToolHandler(cap) {
  const subPath = ...; // subcommand path from cap.extensions or cap.path
  return `async (input) => {
    const args = [...${subPath}];
    // arg building loop...
    const r = spawnSync(BINARY, args, { encoding: 'utf8', timeout: 30000 });
    // JSON envelope...
  }`;
}
// In generatePythonModuleHandler, the spawnSync line becomes:
// spawnSync('python3', ['-m', MODULE_LITERAL, ...args], ...)
// where MODULE_LITERAL is JSON.stringify(validatedModuleName)
```

### Generated pip Module Server — Key Lines

```
// What the generated server.cjs file contains for a pip module (rembg example):
// Header uses 'python3' as the effective binary, no BINARY constant needed
// Tool handler line: spawnSync('python3', ['-m', 'rembg', ...args], ...)
// 'rembg' is a string literal baked in at codegen time by generatePythonModuleHandler
// It is NOT read from a variable or process.env — it is fixed in the generated source
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static APPROVED_SERVERS (hardcoded) | Static + dynamic merger via `loadDynamicServers()` | Phase 173 | Any approved app in registry.json appears in TOOL_MAP without manual mcp-bridge.cjs edits |
| pde-tools has no app management commands | `pde-tools app discover\|wrap\|register\|list\|probe` | Phase 173 | User can manage full app lifecycle without editing JSON by hand |
| server-gen.cjs only generates subprocess-of-binary servers | Adds pip module variant with `python3 -m` pattern | Phase 173 | pip CLIs (rembg, whisper, etc.) can be wrapped as MCP servers |

**Deprecated/outdated after Phase 173:**
- Manual APPROVED_SERVERS edits in mcp-bridge.cjs for app-registry apps: use `pde-tools app register` instead.

---

## Open Questions

1. **Phase 171 export names**
   - What we know: Phase 171 must export `cmdDiscover`, `cmdProbe` from `app-discovery.cjs` and `cmdWrap`, `cmdRegister`, `cmdList` from `app-registry.cjs`
   - What's unclear: Phase 171 has not shipped yet; exact export names are planned but unverified
   - Recommendation: At the start of Phase 173 task execution, read the actual exports from the Phase 171 modules before writing the pde-tools router. Do NOT assume the names match this research.

2. **Capability list storage location**
   - What we know: `loadDynamicServers()` needs a capabilities list per approved app to populate TOOL_MAP
   - What's unclear: Phase 171's registry schema stores discovery metadata but not capabilities. Phase 172 produces capability-model.json at `.planning/app-wrappers/{slug}/capability-model.json`.
   - Recommendation: `loadDynamicServers()` loads caps from capability-model.json (Phase 172 output), not from the registry entry. If the cap model file does not exist, skip TOOL_MAP entries for that app — do not block server registration.

3. **APPROVED_SERVERS key collision handling**
   - What we know: Static entries use bare keys (`github`, `linear`); dynamic entries must not shadow them
   - What's unclear: Best collision resolution strategy — prefix dynamic keys vs separate DYNAMIC_SERVERS map
   - Recommendation: Use a separate `DYNAMIC_SERVERS` object for dynamic registrations. Update `call()` to check `TOOL_MAP` (which covers both) without modifying `assertApproved()`. This avoids all changes to the static server validation path.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All modules | Yes | v20.x | — |
| vitest | Test runner | Yes | ^4.1.1 | — |
| bin/lib/app-discovery.cjs | pde-tools app discover, probe | Phase 171 deliverable | — | Phase 173 blocked until Phase 171 ships |
| bin/lib/app-registry.cjs | pde-tools app wrap, register, list | Phase 171 deliverable | — | Phase 173 blocked until Phase 171 ships |
| .planning/app-registry.json | loadDynamicServers() | Created by Phase 171 discovery run | — | loadDynamicServers() is a no-op when absent — safe |
| .planning/app-wrappers/{slug}/capability-model.json | loadDynamicServers() cap loading | Created by Phase 172 | — | loadDynamicServers() skips TOOL_MAP entries when cap model absent |

**Missing dependencies with no fallback:**
- `bin/lib/app-discovery.cjs` and `bin/lib/app-registry.cjs` — pde-tools app routing is blocked until Phase 171 delivers these modules.

**Missing dependencies with fallback:**
- `app-registry.json` — `loadDynamicServers()` is a no-op when file absent. Static servers continue to work.
- `capability-model.json` — `loadDynamicServers()` registers the server in APPROVED_SERVERS but skips TOOL_MAP entries. The app is visible as a server but has no callable tools until Phase 172 runs.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.1 |
| Config file | none — vitest auto-discovers `tests/**/*.test.mjs` |
| Quick run command | `npx vitest run tests/phase-173/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REG-01 | `loadDynamicServers()` populates APPROVED_SERVERS + TOOL_MAP for approved entries | unit | `npx vitest run tests/phase-173/mcp-bridge-dynamic.test.mjs` | No — Wave 0 |
| REG-01 | `loadDynamicServers()` is a no-op when registry file does not exist | unit | same | No — Wave 0 |
| REG-01 | `pending` and `rejected` entries are NOT loaded into TOOL_MAP | unit | same | No — Wave 0 |
| REG-02 | `pde-tools app discover` routes to cmdDiscover | unit | `npx vitest run tests/phase-173/pde-tools-app.test.mjs` | No — Wave 0 |
| REG-02 | `pde-tools app list` routes to cmdList and outputs a table | unit | same | No — Wave 0 |
| REG-02 | `pde-tools app probe` routes to cmdProbe | unit | same | No — Wave 0 |
| REG-03 | `generatePythonModuleHandler('rembg', cap)` produces spawnSync handler with argument array | unit | `npx vitest run tests/phase-173/server-gen-python.test.mjs` | No — Wave 0 |
| REG-03 | `validateModuleName` rejects names with shell metacharacters | unit | same | No — Wave 0 |
| REG-03 | Generated handler uses `spawnSync('python3', ['-m', 'rembg', ...args])` not a shell string | unit | same | No — Wave 0 |
| REG-04 | `registerDynamicServer(slug, serverPath, caps)` adds entries to APPROVED_SERVERS + TOOL_MAP | unit | `npx vitest run tests/phase-173/mcp-bridge-dynamic.test.mjs` | No — Wave 0 |
| REG-04 | `call()` resolves canonical names from dynamically registered tools | unit | same | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-173/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-173/mcp-bridge-dynamic.test.mjs` — covers REG-01, REG-04
- [ ] `tests/phase-173/server-gen-python.test.mjs` — covers REG-03
- [ ] `tests/phase-173/pde-tools-app.test.mjs` — covers REG-02; requires Phase 171 modules OR mock stubs

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/mcp-bridge.cjs` — Full source read (593 lines); APPROVED_SERVERS, TOOL_MAP, `safeReadFile` pattern, `loadConnections` template — all verified directly
- `bin/lib/cli-anything/server-gen.cjs` — Full source read (154 lines); `generateToolHandler`, `generateServerSource`, `writeServer` patterns verified
- `bin/pde-tools.cjs` lines 729-748 — `case 'cli-anything':` routing pattern verified; no existing `case 'app':` found in router
- `bin/lib/cli-anything/registry.cjs` — `loadRegistry`, `upsertEntry`, `cmdList` table pattern verified (138 lines)
- `.planning/phases/171-security-architecture-discovery-foundation/171-RESEARCH.md` — app-registry.json schema, Phase 171 module contract, `app-registry.cjs` + `app-discovery.cjs` export expectations
- `.planning/phases/172-core-app-wrappers/172-RESEARCH.md` — capability model shape, server generation patterns, Phase 172 output structure

### Secondary (MEDIUM confidence)
- Python subprocess security: `spawnSync` argument array vs shell string — verified by Node.js child_process documentation convention and project-internal precedent (execFileSync in Phase 171 research patterns)
- pip module name character set: PyPI naming convention (PEP 508) — `[a-zA-Z0-9._-]` normalized to `[a-zA-Z0-9_-]` for validation (dots excluded from validation regex because Python `-m` treats dots as submodule separators — cleaner to require underscore form for top-level module names)

### Tertiary (LOW confidence)
- MCP tool name prefix convention `mcp__app_{slug}__{toolName}`: inferred from Claude Code MCP tool naming patterns observed in TOOL_MAP (`mcp__github__list_issues`, `mcp__plugin_playwright_playwright__browser_snapshot`). The `app_` disambiguation prefix is a Phase 173 design decision, not an MCP SDK requirement. It is not documented externally — it is a project convention.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all built on Node.js built-ins and verified project modules; no external dependencies
- Architecture: HIGH — every pattern has a direct precedent in the existing codebase read directly
- Pitfalls: HIGH — identified from source analysis of the exact code being modified
- Shell injection prevention: HIGH — argument array vs shell string is well-established; validation regex is conservative

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable; Node.js built-ins do not change; project modules are version-pinned)
