# Phase 173: MCP Bridge Dynamic Registration - Research

**Researched:** 2026-03-29 (maxdepth update)
**Domain:** mcp-bridge.cjs extension, dynamic server registration, pde-tools app CLI surface, server-gen.cjs pip module handler, Node.js file I/O patterns
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REG-01 | `mcp-bridge.cjs` gains `loadDynamicServers(registryPath)` reading registry.json at module init, populating APPROVED_SERVERS + TOOL_MAP for `approved` entries only | Verified: mcp-bridge.cjs (593 lines, read 2026-03-29) has no `loadDynamicServers` or `registerDynamicServer` — these functions do not exist yet. `loadConnections()` at lines 325-332 is the exact template: uses `safeReadFile`, wraps JSON.parse in try/catch, returns silently on failure. |
| REG-02 | `pde-tools app discover\|wrap\|register\|list\|probe` subcommand as user-facing CLI entry point | Verified: `case 'app':` at line 1515 of pde-tools.cjs already handles `discover`, `probe`, `list`, `approve`, `wrap`. The `register` subcommand is ABSENT — this is the only missing piece for REG-02. |
| REG-03 | `server-gen.cjs` gains `generatePythonModuleHandler()` for pip CLIs using `python -m {tool}` spawn pattern | Verified: server-gen.cjs exports `generateServerSource`, `generateAsyncToolHandler`, `writeServer`. `generateToolHandler` is internal (not exported). `generatePythonModuleHandler` does not exist yet — this is a net-new function. |
| REG-04 | Dynamic registration uses `registerDynamicServer(slug, serverPath, caps)` for single-app registration path | Verified: Neither `registerDynamicServer` nor any dynamic registration path exists in mcp-bridge.cjs. APPROVED_SERVERS and TOOL_MAP are entirely static at present. |
</phase_requirements>

---

## Summary

Phase 173 is smaller than the prior research implied. Phase 171 and Phase 172 have shipped. The `case 'app':` router, all Phase 171 modules (`app-discovery.cjs`, `app-registry.cjs`), and the `app-wrappers/generate.cjs` orchestrator all exist and are working. The capability model files are written to `.planning/app-wrappers/{slug}/capability-model.json` by `generateAppWrapper()`.

**What actually remains:**

1. **mcp-bridge.cjs**: Add `loadDynamicServers(registryPath)` and `registerDynamicServer(slug, serverPath, caps, opts)` — two new functions, ~60 lines total.
2. **pde-tools.cjs app router**: Add `case 'register':` to the existing switch at line 1578 (after `case 'approve':`). The other four subcommands already exist.
3. **server-gen.cjs**: Add `validateModuleName(moduleName)` and `generatePythonModuleHandler(moduleName, cap)` — two new functions, ~40 lines total.
4. **Tests**: Three new test files covering the above.

**Critical correction from prior research:** The prior research assumed Phase 171 modules did not exist and used hypothetical export names (`cmdDiscover`, `cmdRegister`, etc.). The actual pde-tools.cjs uses inline switch logic with direct `require()` and module function calls — not named command functions. The `register` subcommand must follow this exact pattern.

**Primary recommendation:** Implement changes in order: (1) server-gen.cjs pip handler, (2) mcp-bridge.cjs dynamic loader, (3) pde-tools register subcommand. Each is independent. Write tests first.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs | built-in (v20.x) | Read app-registry.json at module init | Already used by mcp-bridge.cjs via `safeReadFile` from core.cjs |
| Node.js path | built-in (v20.x) | Resolve registry path and capability model paths | Already used throughout mcp-bridge.cjs |
| Node.js child_process spawnSync | built-in (v20.x) | pip module subprocess in generated handlers | Already used in server-gen.cjs; spawnSync with argument arrays is the established pattern |
| Node.js crypto | built-in (v20.x) | SHA-256 verification (Phase 171, no new work) | Phase 171 pattern; not new in Phase 173 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bin/lib/core.cjs (project) | Phase 163 | `safeReadFile()` — returns null on ENOENT instead of throwing | Use for all registry reads in mcp-bridge.cjs to maintain existing error-handling contract |
| bin/lib/app-registry.cjs (Phase 171) | **SHIPPED** | `loadRegistry()`, `approveEntry()`, `listEntries()`, `getEntry()` | Called directly from pde-tools.cjs `case 'app':` switch — Phase 173 `register` subcommand calls `approveEntry` then `getEntry` |
| bin/lib/app-discovery.cjs (Phase 171) | **SHIPPED** | `discoverApp()`, `APP_CATALOG`, `probeBinary()` | Already routed via `case 'discover':` and `case 'probe':` — no Phase 173 changes needed |
| bin/lib/app-wrappers/generate.cjs (Phase 172) | **SHIPPED** | `generateAppWrapper(slug, registryPath, projectRoot)` — writes capability-model.json, server.cjs, SKILL.md | Already routed via `case 'wrap':` — Phase 173 `loadDynamicServers` reads capability-model.json from its output directory |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mutating APPROVED_SERVERS + TOOL_MAP at module scope | Re-reading registry on every `call()` invocation | Module-scope mutation happens once per session — correct semantics; per-call reads add fs I/O to every tool lookup |
| `safeReadFile` for registry read | `fs.readFileSync` with try/catch inline | `safeReadFile` is the established pattern — see `loadConnections()` lines 325-332; consistent null-on-ENOENT behavior |
| `spawnSync('python3', ['-m', module, ...])` | Template-string shell command | spawnSync with argument arrays prevents shell injection; template strings are prohibited |
| Separate `DYNAMIC_SERVERS` object | Merging into APPROVED_SERVERS directly | Using a separate map avoids collision with static entries; `call()` checks TOOL_MAP (shared) without touching assertApproved's APPROVED_SERVERS lookup path |

**Installation:** No new npm dependencies. All built on Node.js built-ins and existing project modules.

---

## Architecture Patterns

### Actual Project Structure After Phase 173

Phase 173 modifies three existing files and adds no new lib modules. All Phase 171/172 dependency modules already exist.

```
bin/lib/
  mcp-bridge.cjs              # MODIFIED: +loadDynamicServers(), +registerDynamicServer(), +DYNAMIC_SERVERS
  cli-anything/
    server-gen.cjs            # MODIFIED: +validateModuleName(), +generatePythonModuleHandler()
  app-registry.cjs            # EXISTING (Phase 171) — READ-ONLY from Phase 173 perspective
  app-discovery.cjs           # EXISTING (Phase 171) — READ-ONLY from Phase 173 perspective
  app-wrappers/
    generate.cjs              # EXISTING (Phase 172) — produces capability-model.json
    index.cjs                 # EXISTING (Phase 172)
    blender-wrapper.cjs       # EXISTING (Phase 172)
    gimp-wrapper.cjs          # EXISTING (Phase 172)
    inkscape-wrapper.cjs      # EXISTING (Phase 172)

bin/
  pde-tools.cjs               # MODIFIED: +case 'register': in existing case 'app': switch

.planning/
  app-registry.json           # Phase 171 output; loadDynamicServers() reads this at module init
  app-wrappers/{slug}/
    capability-model.json     # Phase 172 output; loadDynamicServers() reads this for TOOL_MAP population
    wrapper-metadata.json     # Phase 172 output; contains startupMs, asyncRequired
    server/server.cjs         # Phase 172 output; serverPath stored in APPROVED_SERVERS entry

tests/phase-173/
  mcp-bridge-dynamic.test.mjs    # REG-01, REG-04
  server-gen-python.test.mjs     # REG-03
  pde-tools-app-register.test.mjs # REG-02 (register subcommand only)
```

### Pattern 1: loadDynamicServers — Module-Scope Registration

**What:** Called once at module require-time; reads registry.json, merges approved entries into DYNAMIC_SERVERS and TOOL_MAP. Uses a separate `DYNAMIC_SERVERS` object (not APPROVED_SERVERS) to avoid collisions with static entries.

**When to use:** Called at the bottom of mcp-bridge.cjs module scope, guarded by registry file existence check.

**Critical detail on DYNAMIC_SERVERS vs APPROVED_SERVERS:**
`assertApproved()` checks `APPROVED_SERVERS[serverKey]`. For dynamic apps, the security check is already performed by Phase 171's `checkApproved()` (which verifies `status === 'approved'` and `executionMode !== 'mock'`). Dynamic apps do not need to pass through `assertApproved()` — they have their own security boundary. Therefore, use a separate `DYNAMIC_SERVERS` object and update `call()` to check both TOOL_MAP sources.

```javascript
// Source: derived from mcp-bridge.cjs loadConnections() lines 325-332 + app-registry.cjs schema
// Verified against actual source 2026-03-29

// Add after APPROVED_SERVERS and TOOL_MAP declarations:
const DYNAMIC_SERVERS = {};  // keyed by slug; populated by loadDynamicServers()

const APP_REGISTRY_PATH = path.join(process.cwd(), '.planning', 'app-registry.json');

/**
 * Load approved app-registry entries into DYNAMIC_SERVERS and TOOL_MAP.
 * Called at module scope — runs once per Node.js process lifetime.
 * Safe to call when registry file does not exist (no-op, never throws).
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
    if (entry.status !== 'approved') continue; // pending + rejected entries excluded

    // Load wrapper-metadata.json for startupMs
    const metaPath = path.join(
      process.cwd(), '.planning', 'app-wrappers', entry.slug, 'wrapper-metadata.json'
    );
    let startupMs = 5000;
    const metaRaw = safeReadFile(metaPath);
    if (metaRaw) {
      try { startupMs = JSON.parse(metaRaw).startupMs || 5000; } catch { /* skip */ }
    }

    // Server entry: path to the generated server.cjs
    const serverPath = path.join(
      process.cwd(), '.planning', 'app-wrappers', entry.slug, 'server', 'server.cjs'
    );
    DYNAMIC_SERVERS[entry.slug] = {
      displayName: entry.displayName || entry.slug,
      transport: 'stdio',
      serverPath,
      probeTimeoutMs: startupMs,
      probeTool: `mcp__app_${entry.slug}__probe`,
      probeArgs: {},
    };

    // Load capabilities from capability-model.json (Phase 172 output)
    const modelPath = path.join(
      process.cwd(), '.planning', 'app-wrappers', entry.slug, 'capability-model.json'
    );
    const modelRaw = safeReadFile(modelPath);
    if (!modelRaw) continue; // No cap model — skip TOOL_MAP entries for this app

    let caps = [];
    try {
      const model = JSON.parse(modelRaw);
      caps = model.capabilities || [];
    } catch { continue; }

    // TOOL_MAP entries: one per capability, using app_ prefix to prevent collision
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

**Export additions:** `DYNAMIC_SERVERS` and `loadDynamicServers` must be added to `module.exports`.

### Pattern 2: registerDynamicServer — Single-App Runtime Registration

**What:** Interactive path used by `pde-tools app register <slug>` — adds a single approved entry to DYNAMIC_SERVERS and TOOL_MAP without re-reading the whole registry.

**When to use:** After a user approves an app mid-session and wants bridge registration without waiting for next session. Also callable by tests.

```javascript
// Source: derived from APPROVED_SERVERS + TOOL_MAP structure, verified 2026-03-29

/**
 * Register a single approved app into DYNAMIC_SERVERS and TOOL_MAP.
 * Idempotent — re-registering an already-registered slug overwrites silently.
 *
 * @param {string} slug - Registry slug (e.g. 'rembg', 'blender')
 * @param {string} serverPath - Absolute path to generated server.cjs
 * @param {Array<{name: string, description: string}>} caps - Capability list from capability-model.json
 * @param {object} [opts] - { displayName, startupMs }
 */
function registerDynamicServer(slug, serverPath, caps, opts = {}) {
  if (!slug || typeof slug !== 'string') throw new Error('slug is required');
  if (!serverPath || typeof serverPath !== 'string') throw new Error('serverPath is required');
  if (!Array.isArray(caps)) throw new Error('caps must be an array');

  DYNAMIC_SERVERS[slug] = {
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

### Pattern 3: pde-tools app register Subcommand

**What:** New `case 'register':` in the existing `case 'app':` switch in pde-tools.cjs, added after the `case 'approve':` block.

**Critical context from actual source reading:**
- The existing app switch at line 1521 handles: `discover`, `probe`, `list`, `approve`, `wrap`
- `register` is entirely absent — it is NOT the same as `approve`
- The existing pattern uses direct inline `require()` + function calls, NOT named cmd functions
- `register` should: (1) call `approveEntry`, (2) call `getEntry` to retrieve serverPath + caps, (3) call `registerDynamicServer` from mcp-bridge.cjs

```javascript
// Source: pde-tools.cjs case 'app': structure, lines 1577-1591, verified 2026-03-29
// Insert AFTER case 'approve': block, BEFORE default: case

case 'register': {
  const slug = args[2];
  if (!slug) { console.error('Usage: pde-tools app register <slug>'); process.exit(1); }
  try {
    // Approve the entry (sets status='approved', computes SHA-256)
    registry.approveEntry(registryPath, slug);
    const entry = registry.getEntry(registryPath, slug);

    // Load capability model for TOOL_MAP population
    const modelPath = path.join(cwd, '.planning', 'app-wrappers', slug, 'capability-model.json');
    let caps = [];
    try {
      const modelRaw = fs.readFileSync(modelPath, 'utf8');
      caps = JSON.parse(modelRaw).capabilities || [];
    } catch (_) {
      console.log('  Warning: no capability-model found. Run: pde-tools app wrap ' + slug + ' first.');
    }

    const serverPath = path.join(cwd, '.planning', 'app-wrappers', slug, 'server', 'server.cjs');
    const { registerDynamicServer } = require('./lib/mcp-bridge.cjs');
    registerDynamicServer(slug, serverPath, caps, {
      displayName: entry.displayName,
      startupMs: 5000,
    });

    console.log('Registered: ' + slug);
    console.log('  server: ' + serverPath);
    console.log('  tools: ' + caps.length + ' capabilities loaded into TOOL_MAP');
    console.log('  Note: Registration is in-process only. Restart session for mcp-bridge auto-load.');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  break;
}
```

**Also update the default error message** at line 1614 to include `register`:
```javascript
console.error('Unknown app subcommand: ' + sub + '. Available: discover, probe, list, approve, wrap, register');
```

### Pattern 4: generatePythonModuleHandler — pip CLI Handler Body

**What:** Variant of the internal `generateToolHandler()` in server-gen.cjs that uses `spawnSync('python3', ['-m', moduleName, ...])` instead of `spawnSync(BINARY, ...)`.

**Note on exports:** `generateToolHandler` is currently internal to server-gen.cjs (not exported). `generatePythonModuleHandler` follows the same pattern — add it as a new export alongside the existing three exports.

Module name validation function:

```javascript
// Source: derived from server-gen.cjs + Python PEP 508 naming rules, verified 2026-03-29

/**
 * Validate a pip module name before embedding it in generated source code.
 * Accepts only [a-zA-Z0-9_-]. Dots excluded even though PyPI allows them
 * because Python's -m flag normalizes dots to submodule traversal.
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

Handler body generation (mirrors `generateToolHandler` exactly, replacing `BINARY` with `'python3', '-m', {safeModuleLiteral}`):

```javascript
/**
 * Generate a tool handler body for a pip CLI module.
 * spawnSync argument array — NOT a shell string.
 * moduleName validated before this function is called.
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

  // JSON.stringify is safe here because validateModuleName rejected all non-[a-zA-Z0-9_-] chars
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

**Export:** Add `validateModuleName` and `generatePythonModuleHandler` to `module.exports` in server-gen.cjs. Current exports are `{ generateServerSource, generateAsyncToolHandler, writeServer }`.

### Pattern 5: Dynamic Naming Convention

```
Server slug:     blender
Capability name: blender_render          (from capability-model.json)
Raw tool name:   mcp__app_blender__blender_render
Canonical name:  blender:blender-render  (underscores become hyphens)
```

The `app_` prefix in raw names prevents collision with static entries (e.g., a slug named `github` generates `mcp__app_github__...` not `mcp__github__...`). Canonical names do NOT use the `app_` prefix — users write `blender:blender-render`, not `app_blender:blender-render`.

### Anti-Patterns to Avoid

- **Shell string construction for python invocation:** Never use template strings to build subprocess commands. Always pass an argument array: `spawnSync('python3', ['-m', moduleName, ...args])`.
- **Throwing in loadDynamicServers:** If the registry file is missing or corrupt, return silently. Never throw from module scope — it crashes any module that requires mcp-bridge.cjs.
- **Adding dynamic apps to APPROVED_SERVERS:** Use the separate `DYNAMIC_SERVERS` object to avoid shadowing static entries that pass through `assertApproved()`.
- **Omitting `app_` prefix in raw MCP tool names:** Without the prefix, a slug like `playwright` would generate raw names colliding with the existing static Playwright entries.
- **Writing `case 'register':` to call `approveEntry` only:** `register` = approve + bridge-load. `approve` = approve only. Both must exist with distinct semantics.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Registry file read with ENOENT safety | Custom try/catch around fs.readFileSync | `safeReadFile` from `bin/lib/core.cjs` | Already exists; consistent error handling across all mcp-bridge.cjs reads (see loadConnections() lines 325-332) |
| MCP server file generation for pip tools | Custom codegen string builder from scratch | `generatePythonModuleHandler()` + existing `generateServerSource()` scaffold from server-gen.cjs | server-gen.cjs already handles tool registration, header/footer boilerplate; only the handler body is new |
| Capability model loading for dynamic registration | Parse server.cjs source to recover caps | Load `capability-model.json` from `.planning/app-wrappers/{slug}/` (Phase 172 output) | capability-model.json is the canonical source; source-file parsing is fragile and unnecessary |
| Approving an entry in pde-tools register | Duplicate the approve logic inline | Call `registry.approveEntry(registryPath, slug)` then `registry.getEntry(registryPath, slug)` | `approveEntry` already exists in app-registry.cjs; re-use the existing function |

---

## Security: Shell Injection Prevention for python -m Invocations

**Threat model:** `moduleName` originates from user input (`pde-tools app discover` or direct registry edit) and is stored in app-registry.json. A value containing shell metacharacters could cause harm if handled naively in generated code.

**Defense layers (both required):**

1. **Input validation at discovery time** (Phase 171 responsibility, already implemented): `probeBinary()` in app-discovery.cjs uses the tier-3 pip probe to find modules. The `pipModule` field in APP_CATALOG is hardcoded — no user input at discovery time for catalog apps.

2. **Input validation at codegen time** (Phase 173 responsibility): `validateModuleName(moduleName)` called as the first line of `generatePythonModuleHandler()`. This is the defense for future non-catalog pip registrations.

**Why spawnSync with argument array is correct:** `spawnSync('python3', ['-m', moduleName, ...args])` passes the module name as a literal argument to the Python interpreter — the OS never invokes a shell. The argument array approach prevents shell injection by design.

**Why validation is still required:** The module name is embedded as a string literal in the generated `server.cjs` source file. Validation prevents polluted source artifacts and provides defense in depth.

**Valid pip module name examples:** `rembg`, `imageio-ffmpeg`, `whisper_transcribe`
**Invalid (rejected):** `rembg; echo pwned`, `../etc/passwd`, `$(whoami)`

---

## Common Pitfalls

### Pitfall 1: loadDynamicServers Crashing the Entire Bridge

**What goes wrong:** `loadDynamicServers()` throws on a corrupt or partially-written registry file. Because it runs at module scope, the `require('mcp-bridge.cjs')` call fails, crashing any workflow that uses mcp-bridge.
**Why it happens:** JSON.parse throws on syntax errors; unguarded fs.readFileSync throws on ENOENT.
**How to avoid:** Use `safeReadFile` (handles ENOENT, returns null). Wrap JSON.parse in try/catch. Return without throwing on all error paths. Mirror `loadConnections()` exactly (lines 325-332).
**Warning signs:** Unit test for `loadDynamicServers` with a non-existent registry path must return without error — not throw.

### Pitfall 2: Dynamic App Shadowing Static Server Entry

**What goes wrong:** A discovered app slug matches an existing APPROVED_SERVERS key (e.g., user approves an app called `playwright`). If dynamic entries go into APPROVED_SERVERS, the dynamic entry overwrites the static Playwright entry.
**Why it happens:** Direct mutation of APPROVED_SERVERS without checking existing keys.
**How to avoid:** Use `DYNAMIC_SERVERS` as a separate object. `call()` uses TOOL_MAP (shared between static and dynamic entries); `assertApproved()` remains unchanged and checks APPROVED_SERVERS only.
**Warning signs:** After `loadDynamicServers()`, `assertApproved('playwright')` should still find the static Playwright server, not a dynamic one.

### Pitfall 3: register Subcommand vs approve Subcommand

**What goes wrong:** Developer implements `register` as just another name for `approve`, or implements `approve` to call `registerDynamicServer`. These are different operations with different effects.
**Why it happens:** Conceptual conflation: both involve "approving" an app.
**How to avoid:**
  - `pde-tools app approve <slug>` — updates registry JSON status to `approved`, computes SHA-256. Does NOT load into bridge.
  - `pde-tools app register <slug>` — calls `approveEntry` AND then calls `registerDynamicServer`. Combines approval + in-process bridge loading in one command.
**Warning signs:** After `pde-tools app approve blender`, calling `call('blender:blender-render')` in mcp-bridge still throws "Tool not found". This is correct — only `register` loads tools into the bridge.

### Pitfall 4: Missing serverPath in DYNAMIC_SERVERS Entry

**What goes wrong:** `loadDynamicServers()` registers an entry in DYNAMIC_SERVERS but the `serverPath` field points to a file that does not exist (Phase 172 `pde-tools app wrap` has not been run yet).
**Why it happens:** Registry can have approved entries before `wrap` has been run.
**How to avoid:** `loadDynamicServers()` should NOT check if serverPath exists — the server path is deterministic and the MCP runtime will report a clear error if the file is missing at invocation time. However, a logged warning is appropriate.
**Warning signs:** After `pde-tools app approve blender` (no wrap), `loadDynamicServers()` registers blender in DYNAMIC_SERVERS with a non-existent serverPath. Tool calls will fail at MCP invocation time with MODULE_NOT_FOUND — not at bridge load time.

### Pitfall 5: generatePythonModuleHandler Shares BINARY Constant With Host Server

**What goes wrong:** If `generatePythonModuleHandler` tries to reference a `BINARY` constant in the generated server, the generated code breaks because pip module servers have no `BINARY` constant (the binary is always `python3` and the module is baked in).
**Why it happens:** Copy-pasting from `generateToolHandler` without adapting the BINARY reference.
**How to avoid:** Generated pip server code has no `BINARY` constant. The spawnSync line is literally `spawnSync('python3', ['-m', 'rembg', ...args])` with both values baked in as string literals.

### Pitfall 6: Registry Concurrent Read/Write Race

**What goes wrong:** `loadDynamicServers()` reads app-registry.json while `pde-tools app register` is writing it in another process. Bridge gets partial JSON, JSON.parse fails silently.
**Why it happens:** Node.js has no built-in cross-process file locking.
**How to avoid:** Phase 173's exposure is low — `loadDynamicServers()` runs once at session start, not on a timer. This is a future concern not a Phase 173 blocker.
**If it becomes a concern:** Write-then-rename pattern (atomic on Linux/macOS same filesystem).

---

## Code Examples

Verified patterns from project source:

### safeReadFile Usage — Established Template

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

### Existing pde-tools app Case Structure (Verified)

```javascript
// Source: pde-tools.cjs lines 1515-1618 (read 2026-03-29)
// Pattern: inline require() + function calls in switch/case, NOT named cmd functions
case 'app': {
  const sub = args[1];
  const discovery = require('./lib/app-discovery.cjs');
  const registry = require('./lib/app-registry.cjs');
  const registryPath = path.join(cwd, '.planning', 'app-registry.json');

  switch (sub) {
    case 'discover': {
      // ... calls discovery.discoverApp(slug), registry.addPendingEntry(registryPath, result)
    }
    case 'probe': { /* ... calls registry.getEntry(), registry.verifyBinaryHash() */ }
    case 'list': { /* ... calls registry.listEntries() */ }
    case 'approve': { /* ... calls registry.approveEntry(), registry.getEntry() */ }
    case 'wrap': { /* ... calls generateAppWrapper(slug, registryPath, cwd) */ }
    // MISSING: case 'register': — Phase 173 adds this
    default:
      console.error('Unknown app subcommand: ' + sub + '...');
  }
  break;
}
```

### server-gen.cjs Current Exports (Verified)

```javascript
// Source: server-gen.cjs line 203 (read 2026-03-29)
module.exports = { generateServerSource, generateAsyncToolHandler, writeServer };
// Phase 173 adds: validateModuleName, generatePythonModuleHandler
```

### app-registry.cjs Actual Exports (Verified)

```javascript
// Source: app-registry.cjs lines 258-268 (read 2026-03-29)
module.exports = {
  loadRegistry, saveRegistry, addPendingEntry, approveEntry, rejectEntry,
  checkApproved, verifyBinaryHash, getEntry, listEntries,
};
// NOTE: The prior research assumed 'cmdDiscover', 'cmdWrap' etc — these do NOT exist.
// app-registry.cjs is a data layer module, not a command router.
```

### Capability Model Structure (Phase 172 Output — Verified by generate.cjs)

```javascript
// Source: app-wrappers/generate.cjs line 56 + wrapper modules (read 2026-03-29)
// capability-model.json written to: .planning/app-wrappers/{slug}/capability-model.json
// Structure (from buildCapabilityModel in blender-wrapper.cjs):
{
  "meta": { "source": "/path/to/blender", "type": "cli", "version": "Blender 4.2.0", ... },
  "capabilities": [
    {
      "name": "blender_render",           // underscore form; TOOL_MAP converts to hyphens
      "description": "...",
      "path": "blender --background ...",
      "extensions": { "subcommandPath": ["--background"] },
      "inputSchema": { ... }
    }
    // ...
  ]
}
```

---

## State of the Art

| Old Approach | Current Approach (After Phase 173) | When Changed | Impact |
|---|---|---|---|
| Static APPROVED_SERVERS only (hardcoded) | Static APPROVED_SERVERS + dynamic DYNAMIC_SERVERS merged via `loadDynamicServers()` | Phase 173 | Any approved+wrapped app in registry.json appears in TOOL_MAP on next session start |
| pde-tools app has: discover, probe, list, approve, wrap | Adds: register (approve + bridge-load in one command) | Phase 173 | User can approve AND load an app into the bridge in one command, without waiting for next session |
| server-gen.cjs only generates subprocess-of-binary servers | Adds pip module variant with `python3 -m` pattern | Phase 173 | pip CLIs (rembg, whisper, etc.) can be wrapped as MCP servers |

**Deprecated after Phase 173:**
- Manual APPROVED_SERVERS edits in mcp-bridge.cjs for app-registry apps: use `pde-tools app register` instead.

---

## Open Questions

1. **startupMs for pip module servers**
   - What we know: `wrapper-metadata.json` has `startupMs` (e.g., 5000 for Blender). Pip module servers are different — `rembg` starts in milliseconds.
   - What's unclear: Should `generatePythonModuleHandler()` accept a `startupMs` override, or should pip servers default to a lower value (e.g., 2000)?
   - Recommendation: Default to 2000ms for pip module handlers. The planner should encode this as the default `probeTimeoutMs` in `registerDynamicServer` when `opts.startupMs` is not provided and `meta.type === 'pip-module'`. This is a minor implementation detail — default of 5000ms is safe even if suboptimal.

2. **writePythonModuleServer — is a new write helper needed?**
   - What we know: `writeServer()` in server-gen.cjs calls `generateServerSource(caps, meta, sdkBasePath, {asyncMode})`. For pip module servers, the handler is different, but the server scaffold (header, footer, McpServer registration) is the same.
   - What's unclear: Can `generateServerSource` be extended to accept a `handlerFn` option, or should Phase 173 add a `writePythonModuleServer(outputDir, moduleName, caps, meta, projectRoot)` wrapper?
   - Recommendation: Add `writePythonModuleServer()` as a thin wrapper over `generateServerSource` that passes `generatePythonModuleHandler` as the handler. This keeps `generateServerSource` unchanged and avoids conditional logic inside the core generator.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All modules | Yes | v20.x | — |
| vitest | Test runner | Yes | ^4.1.1 | — |
| bin/lib/app-discovery.cjs | pde-tools app discover, probe | **YES (Phase 171 shipped)** | Phase 171 | — |
| bin/lib/app-registry.cjs | pde-tools app approve, register, list | **YES (Phase 171 shipped)** | Phase 171 | — |
| bin/lib/app-wrappers/generate.cjs | pde-tools app wrap | **YES (Phase 172 shipped)** | Phase 172 | — |
| .planning/app-registry.json | loadDynamicServers() | Created by first `pde-tools app discover` run | — | loadDynamicServers() is a no-op when absent — safe |
| .planning/app-wrappers/{slug}/capability-model.json | loadDynamicServers() cap loading | Created by `pde-tools app wrap` | — | loadDynamicServers() registers server in DYNAMIC_SERVERS but skips TOOL_MAP entries when cap model absent |
| python3 | generatePythonModuleHandler generated servers | macOS system Python | 3.x | — |

**Missing dependencies with no fallback:**
- None. All Phase 171/172 dependencies are confirmed present.

**Missing dependencies with fallback:**
- `app-registry.json` — `loadDynamicServers()` is a no-op when absent. Static servers continue to work.
- `capability-model.json` — `loadDynamicServers()` registers the server in DYNAMIC_SERVERS but skips TOOL_MAP. App is visible as a server but has no callable tools until `pde-tools app wrap` is run.

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
| REG-01 | `loadDynamicServers()` populates DYNAMIC_SERVERS + TOOL_MAP for approved entries only | unit | `npx vitest run tests/phase-173/mcp-bridge-dynamic.test.mjs` | No — Wave 0 |
| REG-01 | `loadDynamicServers()` is a no-op when registry file does not exist | unit | same | No — Wave 0 |
| REG-01 | `pending` and `rejected` entries are NOT loaded | unit | same | No — Wave 0 |
| REG-01 | `loadDynamicServers()` does not throw when registry JSON is corrupt | unit | same | No — Wave 0 |
| REG-04 | `registerDynamicServer(slug, serverPath, caps)` populates DYNAMIC_SERVERS + TOOL_MAP | unit | same | No — Wave 0 |
| REG-04 | `registerDynamicServer` is idempotent on re-registration | unit | same | No — Wave 0 |
| REG-04 | `call('blender:blender-render')` resolves after `registerDynamicServer` call | unit | same | No — Wave 0 |
| REG-02 | `pde-tools app register <slug>` calls approveEntry + registerDynamicServer | unit | `npx vitest run tests/phase-173/pde-tools-app-register.test.mjs` | No — Wave 0 |
| REG-02 | `pde-tools app register` errors with usage message when slug omitted | unit | same | No — Wave 0 |
| REG-03 | `generatePythonModuleHandler('rembg', cap)` produces spawnSync handler with argument array | unit | `npx vitest run tests/phase-173/server-gen-python.test.mjs` | No — Wave 0 |
| REG-03 | `validateModuleName` rejects names with shell metacharacters | unit | same | No — Wave 0 |
| REG-03 | Generated handler uses `spawnSync('python3', ['-m', 'rembg', ...args])` not a shell string | unit | same | No — Wave 0 |
| REG-03 | `validateModuleName` accepts valid pip names: `rembg`, `imageio-ffmpeg`, `torch_utils` | unit | same | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-173/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-173/mcp-bridge-dynamic.test.mjs` — covers REG-01, REG-04
- [ ] `tests/phase-173/server-gen-python.test.mjs` — covers REG-03
- [ ] `tests/phase-173/pde-tools-app-register.test.mjs` — covers REG-02 (register subcommand only; other subcommands already tested in prior phases)

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/mcp-bridge.cjs` — Full source read (593 lines, 2026-03-29): APPROVED_SERVERS, TOOL_MAP, `safeReadFile` pattern, `loadConnections()` template, module.exports — all verified directly
- `bin/lib/cli-anything/server-gen.cjs` — Full source read (203 lines, 2026-03-29): `generateToolHandler`, `generateAsyncToolHandler`, `generateServerSource`, `writeServer`, current exports — all verified
- `bin/pde-tools.cjs` lines 1515-1618 — `case 'app':` switch fully verified: discover, probe, list, approve, wrap exist; register is absent; actual inline require() pattern confirmed (not named cmd functions)
- `bin/lib/app-registry.cjs` — Full source read (268 lines, 2026-03-29): all exports confirmed (`loadRegistry`, `saveRegistry`, `addPendingEntry`, `approveEntry`, `rejectEntry`, `checkApproved`, `verifyBinaryHash`, `getEntry`, `listEntries`)
- `bin/lib/app-discovery.cjs` — Full source read (340 lines, 2026-03-29): `discoverApp`, `probeBinary`, `APP_CATALOG`, `preprocessHelpText`, `probeDisplay` confirmed
- `bin/lib/app-wrappers/generate.cjs` — Full source read (94 lines, 2026-03-29): `generateAppWrapper` output paths confirmed (`.planning/app-wrappers/{slug}/capability-model.json`, `.planning/app-wrappers/{slug}/server/server.cjs`)
- `bin/lib/core.cjs` lines 44-50 — `safeReadFile` implementation confirmed: try/catch returns null on all errors including ENOENT

### Secondary (MEDIUM confidence)
- Python subprocess security: spawnSync argument array vs shell string — verified by Node.js child_process documentation convention and project-internal precedent (spawnSync argument arrays throughout app-discovery.cjs)
- pip module name character set: PyPI naming convention (PEP 508) — dots excluded from validation regex because Python `-m` treats dots as submodule separators

### Tertiary (LOW confidence)
- MCP tool name prefix convention `mcp__app_{slug}__{toolName}`: inferred from Claude Code MCP tool naming patterns observed in TOOL_MAP (`mcp__github__list_issues`, `mcp__plugin_playwright_playwright__browser_snapshot`). The `app_` disambiguation prefix is a Phase 173 design decision, not an MCP SDK requirement — it is a project convention.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules read from source
- Architecture: HIGH — all existing patterns verified from actual source; prior research corrections documented
- Pitfalls: HIGH — derived from actual source reading and established project patterns

**Research date:** 2026-03-29 (maxdepth pass)
**Valid until:** 2026-04-28 (stable codebase; prior phase 173 research was from 2026-03-29 initial pass)

---

## Corrections to Prior Research (Important for Planner)

The initial 173-RESEARCH.md contained several assumptions that are now invalidated by reading the actual shipped code. The planner MUST use this updated research, not the prior version.

| Prior Assumption | Actual State | Impact |
|---|---|---|
| Phase 171 modules `app-discovery.cjs` + `app-registry.cjs` do not exist yet | **Both exist and are fully implemented** | No Phase 171 dependency blocker |
| pde-tools.cjs has no `case 'app':` router | **case 'app': exists at line 1515 with 5 subcommands** | Phase 173 only adds `register`; do not rewrite the existing router |
| app-registry.cjs exports `cmdDiscover`, `cmdWrap`, `cmdRegister`, `cmdList` | **No cmd* functions exist**; the module is a pure data layer | pde-tools.cjs uses inline logic with direct function calls |
| Phase 173 adds the full pde-tools app router (all 5 subcommands) | **Only `register` is missing** | Smaller scope; be careful not to overwrite the working router |
| APPROVED_SERVERS should receive dynamic entries | **Use separate DYNAMIC_SERVERS** | `assertApproved()` must remain unchanged; static entries must not be shadowed |
| generateToolHandler is exported from server-gen.cjs | **Not exported** (internal function only) | generatePythonModuleHandler must be added as a new export |
