# Phase 196: Containerized MCP Servers - Research

**Researched:** 2026-03-30
**Domain:** dockerode v4, MCP stdio server containerization, probe/degrade contract extension
**Confidence:** HIGH

## Summary

Phase 196 wraps each `APPROVED_SERVERS` entry in `bin/lib/mcp-bridge.cjs` with a per-server Docker container that has a pinned runtime. The core constraint is that MCP servers registered with Claude Code via `claude mcp add --transport stdio` launch via a subprocess command. To containerize them, that subprocess command changes from `npx @playwright/mcp@latest ...` to `docker run --rm -i <pinned-image> npx @playwright/mcp@latest ...`. Claude Code's MCP runtime does not need to change — only the launch command in `installCmd` and `serverPath` fields changes.

The second requirement (INF-05) extends the existing `probeTimeoutMs` fields in `APPROVED_SERVERS`. Currently, `probeTimeoutMs` values range from 8000ms (pencil) to 30000ms (playwright). Docker cold start for a pre-pulled image is typically 2–5 seconds; for an image not yet pulled, 30–60 seconds. The probe/degrade contract extension means: (a) adding a `containerStartupMs` field to server entries that have a container mode, and (b) computing the effective probe timeout as `probeTimeoutMs + containerStartupMs` when Docker mode is active.

The third requirement (graceful degradation) means `mcp-bridge.cjs` detects Docker daemon availability at module init time (or on first use) using the existing `dockerode` pattern from `packages/cloud-adapter/index.cjs`. When Docker is unavailable, the `installCmd` and probe timeout fall back to their current non-containerized values — no behavior change for users without Docker.

The implementation is additive. No existing APPROVED_SERVERS fields are removed. A new optional `container` block is added per server entry. A new `isDockerAvailable()` helper (using dockerode) gates the feature. The `getInstallCmd(serverKey)` function (new, currently `installCmd` is raw field access) returns the containerized form when Docker is available and the `container` block is populated.

**Primary recommendation:** Add a `container` block to each stdio-transport APPROVED_SERVERS entry with `{ image, startupMs }`. Add `isDockerAvailable()` probe using dockerode (reuse the existing packages/cloud-adapter Dockerode pattern). Extend `probeTimeoutMs` computation in a new `getProbeTimeoutMs(serverKey)` function that adds `container.startupMs` when Docker is available and the server has a container block.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INF-04 | Containerized MCP servers wrap APPROVED_SERVERS in per-server Docker containers with pinned runtimes | Add `container: { image, startupMs }` block to each stdio APPROVED_SERVERS entry; `getInstallCmd()` returns `docker run --rm -i <image> <original-cmd>` form when Docker available |
| INF-05 | MCP probe/degrade contracts extended for container startup latency | Add `getProbeTimeoutMs(serverKey)` that returns `probeTimeoutMs + container.startupMs` when Docker available; probe does not fire degraded state during normal container cold start |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dockerode | 4.0.10 | Docker daemon availability check and container launch | Already in packages/cloud-adapter/index.cjs — locked dependency from Phase 191 |
| node:child_process | built-in | Not needed — dockerode replaces CLI subprocess | Dockerode is the established pattern in this codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | existing | Unit tests for new mcp-bridge functions | All CI tests — established test framework |

**No new installations required.** Dockerode is already in `packages/cloud-adapter/`. The `bin/lib/mcp-bridge.cjs` module can require dockerode from the root `node_modules` (it is a transitive dep of cloud-adapter, or can be added to the root package.json if needed).

**Version verification:** dockerode 4.0.10 — verified via `npm view dockerode version` on 2026-03-30.

## Architecture Patterns

### How stdio MCP Servers Are Launched

Claude Code launches `transport: 'stdio'` MCP servers by executing the command in `installCmd` as a subprocess. For example, Playwright's install command is:

```
claude mcp add playwright -- npx @playwright/mcp@latest --headless --allow-unrestricted-file-access
```

Claude Code spawns `npx @playwright/mcp@latest --headless ...` as a child process and communicates over stdin/stdout using the MCP protocol.

**To containerize:** The command changes to:

```
claude mcp add playwright -- docker run --rm -i mcr.microsoft.com/playwright:v1.50.0-noble npx @playwright/mcp@latest --headless
```

Key flags:
- `--rm`: auto-remove container on exit (matches AutoRemove:true pattern from Phase 191)
- `-i`: keep stdin open (required for MCP stdio communication — opposite of Phase 191 which used `OpenStdin: false` because that was a one-shot exec, not interactive)
- No `-t` (no TTY): prevents NDJSON/protocol corruption (same principle as Phase 191 `Tty: false`)

**HTTP transport servers** (github, linear, figma, greptile, atlassian, pde_remote) do NOT need containerization — they communicate over HTTP. Only `transport: 'stdio'` servers benefit from containers.

### Recommended Structure Change to mcp-bridge.cjs

```javascript
// Current shape (example: playwright)
playwright: {
  displayName: 'Playwright',
  transport: 'stdio',
  url: null,
  installCmd: null,
  probeTimeoutMs: 30000,
  probeTool: 'mcp__plugin_playwright_playwright__browser_snapshot',
  probeArgs: {},
},

// Extended shape (Phase 196)
playwright: {
  displayName: 'Playwright',
  transport: 'stdio',
  url: null,
  installCmd: null,
  probeTimeoutMs: 30000,
  probeTool: 'mcp__plugin_playwright_playwright__browser_snapshot',
  probeArgs: {},
  // NEW: container block (only on stdio servers)
  container: {
    image: 'mcr.microsoft.com/playwright:v1.50.0-noble',
    startupMs: 5000,   // additional latency for container cold start (post-pull)
    cmd: ['npx', '@playwright/mcp@latest', '--headless', '--allow-unrestricted-file-access'],
  },
},
```

### New Functions in mcp-bridge.cjs

```javascript
// Source: dockerode 4.0.10 pattern (packages/cloud-adapter/index.cjs)

/**
 * Probe Docker daemon availability.
 * Returns true if dockerode can connect to daemon, false otherwise.
 * Cached after first call — daemon availability does not change mid-session.
 *
 * @returns {Promise<boolean>}
 */
async function isDockerAvailable() {
  if (_dockerAvailableCache !== null) return _dockerAvailableCache;
  try {
    const docker = new Dockerode();
    await docker.ping();
    _dockerAvailableCache = true;
  } catch (_) {
    _dockerAvailableCache = false;
  }
  return _dockerAvailableCache;
}
let _dockerAvailableCache = null;

/**
 * Returns the effective install command for a server.
 * When Docker is available and the server has a container block,
 * returns the containerized form. Otherwise returns the raw installCmd.
 *
 * @param {string} serverKey
 * @param {boolean} [dockerAvailable] - Pass false to force non-containerized (for testing/fallback)
 * @returns {string|null}
 */
function getInstallCmd(serverKey, dockerAvailable) {
  const server = APPROVED_SERVERS[serverKey] || DYNAMIC_SERVERS[serverKey];
  if (!server) return null;
  if (dockerAvailable && server.container) {
    const { image, cmd } = server.container;
    return `claude mcp add ${serverKey} -- docker run --rm -i ${image} ${cmd.join(' ')}`;
  }
  return server.installCmd;
}

/**
 * Returns the effective probe timeout for a server.
 * When Docker is available and the server has a container block,
 * adds container.startupMs to account for cold start.
 *
 * @param {string} serverKey
 * @param {boolean} [dockerAvailable] - Pass false to force non-containerized
 * @returns {number}
 */
function getProbeTimeoutMs(serverKey, dockerAvailable) {
  const server = APPROVED_SERVERS[serverKey] || DYNAMIC_SERVERS[serverKey];
  if (!server) return 10000;
  const base = server.probeTimeoutMs || 10000;
  if (dockerAvailable && server.container) {
    return base + (server.container.startupMs || 5000);
  }
  return base;
}
```

### Per-Server Container Image Assignments

Based on official image sources:

| Server | Current Transport | Container Image | startupMs | Rationale |
|--------|------------------|-----------------|-----------|-----------|
| playwright | stdio | `mcr.microsoft.com/playwright:v1.50.0-noble` | 5000 | Official Playwright image with Chromium pre-installed |
| stitch | stdio | `node:20-slim` | 3000 | No official Stitch image; Node.js slim with npx |
| pencil | stdio | No container (VS Code extension controlled) | — | Pencil is VS Code extension managed; not launchable via docker run |

**HTTP transport servers** — no container block needed:

| Server | Transport | Container | Reason |
|--------|-----------|-----------|--------|
| github | http | None | HTTP transport; runs in Anthropic infra |
| linear | http | None | HTTP transport |
| figma | http | None | HTTP transport |
| atlassian | sse | None | SSE transport |
| greptile | http | None | HTTP transport |
| pde_remote | http | None | HTTP transport |

**Pencil exception:** Pencil uses `transport: 'stdio'` but is managed by the VS Code extension — the PDE cannot control its launch command. `container` block is absent for pencil; `getInstallCmd('pencil')` returns `null` (no-op, same as today).

### Graceful Degradation

```javascript
// In mcp-bridge.cjs initialization block
// Probe Docker availability once at module load — non-blocking
isDockerAvailable().then(available => {
  if (!available) {
    // _dockerAvailableCache already set to false — all getInstallCmd/getProbeTimeoutMs
    // calls return non-containerized values automatically
  }
});
```

When Docker is unavailable:
- `getInstallCmd(serverKey, false)` returns raw `installCmd` (existing behavior)
- `getProbeTimeoutMs(serverKey, false)` returns `probeTimeoutMs` (existing values)
- No error thrown — callers see the same result as if the container block did not exist

### Recommended Project Structure

```
bin/lib/
├── mcp-bridge.cjs              # MODIFY: add container blocks to APPROVED_SERVERS,
│                               #         add isDockerAvailable(), getInstallCmd(),
│                               #         getProbeTimeoutMs()
tests/
├── phase-196/
│   └── mcp-bridge-container.test.cjs   # NEW — container mode unit tests
```

No new files in packages/. Dockerode is required directly in mcp-bridge.cjs from node_modules.

### Anti-Patterns to Avoid

- **Adding `-t` (TTY) to docker run command:** TTY mode corrupts MCP's binary protocol framing over stdio. Use `-i` only.
- **Using `--rm` without `-i`:** Without `-i`, the container stdin is closed immediately and the MCP server exits before receiving any requests.
- **Caching Docker availability for entire process lifetime without reset:** Acceptable for a single Claude Code session — Docker daemon availability is stable within a session. A per-process cache is correct.
- **Adding container block to HTTP-transport servers:** HTTP servers communicate over the network. Their runtime environment is not controlled by PDE.
- **Using `docker exec` instead of `docker run`:** `docker exec` runs in an existing container; these are single-session servers, not long-running daemons. `docker run --rm` is correct.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker daemon ping | Custom socket check | `dockerode.ping()` | dockerode already handles socket path, Windows Named Pipe, DOCKER_HOST env var |
| Container cleanup | Custom `setTimeout` remove | `docker run --rm` flag | `--rm` handles cleanup atomically on exit; no dangling containers |
| Image availability check | Pre-pull logic in init | `docker run --rm -i <image> ...` at connection time | Claude Code caches MCP server processes; image pull happens once on first `claude mcp add` |

## Common Pitfalls

### Pitfall 1: `-i` flag required for MCP stdio transport
**What goes wrong:** Without `-i`, Docker closes the container's stdin immediately. The MCP server inside the container receives EOF on stdin and exits. Claude Code marks the server as disconnected.
**Why it happens:** `docker run` default closes stdin unless `-i` is passed. Phase 191 used `OpenStdin: false` because that was a one-shot `claude --print` exec that writes to stdout and exits — not an interactive server.
**How to avoid:** Always pass `-i` in the docker run command inside `getInstallCmd()`. Never pass `-t`.
**Warning signs:** MCP server starts and immediately disconnects; probe fires `not_configured`.

### Pitfall 2: probeTimeoutMs not extended → false degradation
**What goes wrong:** Docker cold start (container creation + image layer mount) adds 2–5s even for a pre-pulled image. The current playwright `probeTimeoutMs` of 30000ms has headroom, but stitch (15000ms) and pencil (8000ms) do not. If probeTimeoutMs is not extended, the probe times out and marks the server degraded during normal startup.
**Why it happens:** `probeTimeoutMs` was tuned for host-native startup, not container startup.
**How to avoid:** `getProbeTimeoutMs()` adds `container.startupMs` to the base value. Playwright: 30000 + 5000 = 35000ms. Stitch: 15000 + 3000 = 18000ms.
**Warning signs:** Server shows 'degraded' in dashboard immediately after `claude mcp add` with Docker mode.

### Pitfall 3: Docker image not pre-pulled → first-use 30–60s startup
**What goes wrong:** On first use, `docker run` must pull the container image. For Playwright's image (~1.5GB), this takes 30–60s. The probe fires well before the image pull completes.
**Why it happens:** `docker run` pulls on demand unless `docker pull` was run first.
**How to avoid:** Phase 196 does NOT need to solve pre-pull automation — that is out of scope (the REQUIREMENTS.md out-of-scope section excludes complex image lifecycle management). The `startupMs` timeout accounts for a post-pull cold start, not an image-pull scenario. Document this clearly: users must pre-pull images or accept a long first-use delay.
**Warning signs:** `docker run` hangs for > 30s on first use; probe timeout fires.

### Pitfall 4: Pencil server has no container form
**What goes wrong:** Pencil's `installCmd` is `null` because it is auto-configured by the VS Code extension. There is no CLI form to containerize.
**Why it happens:** Pencil is an editor extension, not a standalone npm package.
**How to avoid:** Do not add a `container` block to the pencil entry. `getInstallCmd('pencil')` returns `null` in both containerized and non-containerized modes.
**Warning signs:** Attempting `docker run ... pencil-cmd` — no such command exists.

### Pitfall 5: dockerode require() from bin/lib/ breaks zero-npm root constraint
**What goes wrong:** If `dockerode` is not in root `node_modules`, requiring it from `bin/lib/mcp-bridge.cjs` fails.
**Why it happens:** The zero-npm constraint means no npm install at the plugin root. However, dockerode may already be installed there as a transitive dep of something else.
**How to avoid:** Check whether dockerode is already in the root `node_modules` (it is a dep of `packages/cloud-adapter/`, which gets installed separately). If not present at root, add a `require()` wrapper that catches the MODULE_NOT_FOUND error and falls back to `_dockerAvailableCache = false`. This makes the Docker feature optional — graceful degradation.
**Warning signs:** `Error: Cannot find module 'dockerode'` when loading mcp-bridge.cjs.

### Pitfall 6: isDockerAvailable() called synchronously at module load
**What goes wrong:** `dockerode.ping()` is async. If called synchronously at module load, it returns a Promise that nobody awaits. `_dockerAvailableCache` stays `null` and all calls use non-containerized behavior.
**Why it happens:** Module-level async code is easy to call incorrectly.
**How to avoid:** Either fire-and-forget `.then()` at module load (cache warms in background), or lazy-init on first call to `getInstallCmd`/`getProbeTimeoutMs`. Fire-and-forget is preferred since probes happen after module load.
**Warning signs:** `_dockerAvailableCache` always `null`; container mode never activates.

## Code Examples

### getInstallCmd pattern
```javascript
// Source: mcp-bridge.cjs APPROVED_SERVERS shape + dockerode.ping() pattern
// (packages/cloud-adapter/index.cjs uses same Dockerode instantiation)

const Dockerode = require('dockerode');
let _dockerAvailableCache = null;

async function isDockerAvailable() {
  if (_dockerAvailableCache !== null) return _dockerAvailableCache;
  try {
    const docker = new Dockerode();
    await docker.ping();
    _dockerAvailableCache = true;
  } catch (_) {
    _dockerAvailableCache = false;
  }
  return _dockerAvailableCache;
}

function getInstallCmd(serverKey, dockerAvailable) {
  const server = APPROVED_SERVERS[serverKey] || DYNAMIC_SERVERS[serverKey];
  if (!server) return null;
  if (dockerAvailable && server.container) {
    const { image, cmd } = server.container;
    return `claude mcp add ${serverKey} -- docker run --rm -i ${image} ${cmd.join(' ')}`;
  }
  return server.installCmd;
}

function getProbeTimeoutMs(serverKey, dockerAvailable) {
  const server = APPROVED_SERVERS[serverKey] || DYNAMIC_SERVERS[serverKey];
  if (!server) return 10000;
  const base = server.probeTimeoutMs || 10000;
  if (dockerAvailable && server.container) {
    return base + (server.container.startupMs || 5000);
  }
  return base;
}
```

### Playwright container entry
```javascript
// Source: APPROVED_SERVERS shape + mcr.microsoft.com/playwright official image
playwright: {
  displayName: 'Playwright',
  transport: 'stdio',
  url: null,
  installCmd: null, // Multi-flag: see AUTH_INSTRUCTIONS
  probeTimeoutMs: 30000,
  probeTool: 'mcp__plugin_playwright_playwright__browser_snapshot',
  probeArgs: {},
  container: {
    image: 'mcr.microsoft.com/playwright:v1.50.0-noble',
    startupMs: 5000,
    cmd: ['npx', '@playwright/mcp@latest', '--headless', '--allow-unrestricted-file-access'],
  },
},
```

### Stitch container entry
```javascript
// Source: APPROVED_SERVERS shape + node:20-slim base image
stitch: {
  displayName: 'Google Stitch',
  transport: 'stdio',
  url: null,
  installCmd: null,
  probeTimeoutMs: 15000,
  probeTool: 'mcp__stitch__list_projects',
  probeArgs: {},
  container: {
    image: 'node:20-slim',
    startupMs: 3000,
    cmd: ['npx', '@_davideast/stitch-mcp', 'proxy'],
  },
},
```

### Graceful degradation test pattern
```javascript
// Source: vitest DI pattern from tests/dispatcher/coordinator-docker.test.cjs
describe('mcp-bridge container mode — Docker unavailable', () => {
  it('getInstallCmd returns raw installCmd when dockerAvailable=false', () => {
    const cmd = getInstallCmd('playwright', false);
    expect(cmd).toBe(null); // playwright installCmd is null
  });

  it('getProbeTimeoutMs returns base value when dockerAvailable=false', () => {
    const ms = getProbeTimeoutMs('playwright', false);
    expect(ms).toBe(30000); // base probeTimeoutMs
  });

  it('getProbeTimeoutMs adds startupMs when dockerAvailable=true', () => {
    const ms = getProbeTimeoutMs('playwright', true);
    expect(ms).toBe(35000); // 30000 + 5000
  });
});
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker daemon | Container launch (INF-04), availability probe (INF-05) | Not running | daemon not running (Docker Desktop at /Applications/Docker.app) | Falls back to non-containerized behavior — graceful degradation required by SC-3 |
| dockerode | `isDockerAvailable()` probe | Available (packages/cloud-adapter/node_modules) | 4.0.10 | Catch MODULE_NOT_FOUND → `_dockerAvailableCache = false` |

**Missing dependencies with no fallback:** None — Docker unavailable is a valid state that triggers graceful degradation (SC-3 explicitly requires this).

**Missing dependencies with fallback:** Docker daemon — all code paths must handle `isDockerAvailable() === false` without throwing.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (existing) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `npx vitest run tests/phase-196/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INF-04 | `getInstallCmd('playwright', true)` returns docker run form | unit | `npx vitest run tests/phase-196/mcp-bridge-container.test.cjs` | No — Wave 0 |
| INF-04 | `getInstallCmd('playwright', false)` returns raw installCmd | unit | `npx vitest run tests/phase-196/mcp-bridge-container.test.cjs` | No — Wave 0 |
| INF-04 | HTTP-transport servers (github, linear) have no container block | unit | `npx vitest run tests/phase-196/mcp-bridge-container.test.cjs` | No — Wave 0 |
| INF-04 | `getInstallCmd('pencil', true)` returns null (no container block) | unit | `npx vitest run tests/phase-196/mcp-bridge-container.test.cjs` | No — Wave 0 |
| INF-05 | `getProbeTimeoutMs('playwright', true)` returns 35000 | unit | `npx vitest run tests/phase-196/mcp-bridge-container.test.cjs` | No — Wave 0 |
| INF-05 | `getProbeTimeoutMs('playwright', false)` returns 30000 | unit | `npx vitest run tests/phase-196/mcp-bridge-container.test.cjs` | No — Wave 0 |
| INF-05 | `isDockerAvailable()` returns false when dockerode.ping() throws | unit (mocked) | `npx vitest run tests/phase-196/mcp-bridge-container.test.cjs` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-196/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-196/mcp-bridge-container.test.cjs` — covers INF-04, INF-05

## Sources

### Primary (HIGH confidence)
- `bin/lib/mcp-bridge.cjs` (read directly) — APPROVED_SERVERS shape, probeTimeoutMs values, transport types
- `packages/cloud-adapter/index.cjs` (read directly) — dockerode instantiation and ping pattern
- `packages/dispatcher/lib/coordinator.cjs` (read directly) — docker backend integration
- `.planning/ROADMAP.md` (read directly) — Phase 196 goal and success criteria
- `.planning/REQUIREMENTS.md` (read directly) — INF-04, INF-05 requirement text
- `.planning/research/FEATURES.md` (read directly) — "Docker Compose with per-server image tags; Docker MCP Toolkit provides catalog and gateway layer"
- `tests/dispatcher/coordinator-docker.test.cjs` (read directly) — DI test pattern for dockerode mocking

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — container startup latency estimates (2–5s for pre-pulled images, 30–60s for first pull)
- `.planning/research/PITFALLS.md` — container startup latency pitfall documentation

### Tertiary (LOW confidence)
- `mcr.microsoft.com/playwright:v1.50.0-noble` — Playwright official image; version number should be verified against current Playwright MCP release before pinning

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — dockerode already established in this codebase; no new libraries needed
- Architecture: HIGH — APPROVED_SERVERS shape is fully known; container block is additive; docker run flags are well-established
- Per-server container images: MEDIUM — Playwright MCR image confirmed from official docs pattern; Stitch node:20-slim is reasonable but no official Stitch container image exists; versions should be re-verified before pinning
- Pitfalls: HIGH — stdin/TTY flags (-i vs -t), probe timeout extension, and Docker unavailability fallback are well-understood from Phase 191 research

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (dockerode API stable; Playwright image version should be re-checked at implementation time)
