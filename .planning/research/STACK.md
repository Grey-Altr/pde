# Stack Research

**Domain:** Distributed execution — git worktree orchestration, Claude CLI subprocess management, Agent SDK integration, SSH remote dispatch
**Researched:** 2026-03-26
**Confidence:** HIGH (Agent SDK verified against official docs; Node.js built-ins verified against Node.js docs; all package names confirmed on npm)

---

## Context: What Already Exists (Do Not Re-Add)

The PDE root plugin is zero-npm-dependency by design. The following are already validated and must not be changed:

- Node.js CJS plugin architecture at root (`lib/`, `hooks/`, `bin/`) — zero npm deps
- NDJSON event bus (`hooks/emit-event.cjs`, session-scoped `/tmp/` files)
- Relay daemon (`hooks/start-relay.cjs`, circuit breaker, batching, approval polling)
- Upstash Redis transport (sorted sets, pub/sub) — in `dashboard/`
- Next.js 16 PWA dashboard with Clerk auth, SSE/polling — in `dashboard/`
- `packages/pde-mcp-server/` — ESM TypeScript, `@modelcontextprotocol/sdk ^1.26.0`, `zod ^3.25.0`

The new `packages/dispatcher/` package is the ONLY new package. Everything else is either unchanged or a dashboard UI addition.

---

## Recommended Stack

### packages/dispatcher/ — New Package

This is a CJS Node.js package (matching plugin root conventions) with minimal external dependencies. Agent SDK is its only non-trivial dependency.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@anthropic-ai/claude-agent-sdk` | `^0.2.84` | Lightweight reasoning tier: dependency analysis, routing decisions, merge conflict analysis, progress summarization | Official Anthropic SDK for in-process Claude reasoning without spawning a full interactive session. Verified: `query()` async generator API, `cwd` option for directory scoping, `permissionMode: 'bypassPermissions'` for headless use, `persistSession: false` for stateless calls. Parity with Claude Code CLI 2.1.84. |
| `node:child_process` | Node.js built-in | Spawn `claude --print` subprocesses in worktrees; git and SSH CLI calls | `spawn()` with `detached: true` + `stdio: ['ignore', 'pipe', 'pipe']` + `.unref()` is the correct pattern for fire-and-forget CLI sessions. Use `execFile()` (not `exec()`) for all git/ssh calls to prevent shell injection — arguments passed as array, no shell interpolation. |
| `node:fs` / `node:fs/promises` | Node.js built-in | Lock files, worktree registry, session state files | Sufficient for all file I/O: lock file creation, registry reads/writes, NDJSON event file creation. |
| `node:path` | Node.js built-in | Worktree path construction, `.sessions/` directory management | No dep needed. |
| `node:os` | Node.js built-in | `os.tmpdir()` for session NDJSON paths | No dep needed. |
| `node:test` | Node.js built-in (18.x+) | Unit tests for session manager, worktree manager, merge strategies | Matches existing Nyquist test pattern in plugin root. No vitest needed for dispatcher. |

### packages/dispatcher/ — Agent SDK Integration Pattern

The Agent SDK is used for **reasoning only** (read-only analysis, routing decisions). It never writes files. This keeps it clearly separated from CLI sessions that do real work.

```javascript
// packages/dispatcher/lib/orchestrator.cjs
const { query } = require('@anthropic-ai/claude-agent-sdk');

async function analyzeDependencies(roadmapContent) {
  const results = [];
  for await (const message of query({
    prompt: `Analyze this ROADMAP.md and identify independent phases that can run in parallel.
Return JSON: { parallelizable: [[phaseA, phaseB], ...], sequential: [phaseC, ...] }

${roadmapContent}`,
    options: {
      cwd: process.cwd(),
      allowedTools: [],                          // read-only: no tools needed for analysis
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,     // required pair for bypassPermissions
      persistSession: false,                     // stateless — no session files written
      maxTurns: 3,                               // bounded: routing decision, not open-ended
    }
  })) {
    if (message.type === 'result' && message.subtype === 'success') {
      results.push(message.result);
    }
  }
  return results;
}
```

Key `Options` fields used by the dispatcher (all verified against official TypeScript SDK reference):

| Option | Value | Why |
|--------|-------|-----|
| `cwd` | project root or worktree path | Scopes session to correct directory |
| `allowedTools` | `[]` for analysis; `['Read', 'Glob', 'Grep']` for merge analysis | Read-only; no writes from orchestrator |
| `permissionMode` | `'bypassPermissions'` | Headless, no interactive prompts |
| `allowDangerouslySkipPermissions` | `true` | Required alongside `bypassPermissions` per official docs |
| `persistSession` | `false` | Stateless calls; no session accumulation |
| `maxTurns` | `3-5` | Bounded reasoning, not open-ended |
| `systemPrompt` | Custom per task | Override default Claude Code system prompt for focused tasks |

### Node.js Built-ins Sufficient for Each Feature

| Feature | Built-ins Used | External Dep Needed? |
|---------|---------------|----------------------|
| CLI subprocess spawn (claude --print) | `node:child_process` spawn | NO |
| Worktree creation/removal | `node:child_process` execFile (git binary) | NO |
| Session registry (in-memory + file) | `node:fs`, `node:path` | NO |
| Lock file (dispatcher singleton) | `node:fs` O_EXCL flag | NO |
| NDJSON event emission | `node:fs` appendFileSync | NO |
| SSH remote dispatch | `node:child_process` execFile (ssh binary) | NO |
| Git push/pull for remote sync | `node:child_process` execFile (git binary) | NO |
| Session timeout (hung process detection) | `node:timers` setTimeout | NO |
| Orphan detection on startup | `node:fs` readdir + process.kill(pid, 0) | NO |
| Merge strategy (STATE.md, REQUIREMENTS.md) | `node:fs` read/write | NO |
| Agent SDK reasoning | `@anthropic-ai/claude-agent-sdk` | YES — the only external dep |

### Dashboard Additions (Existing Next.js App)

The dashboard already uses Next.js 16, Tailwind CSS, Clerk, Upstash Redis, and SSE. The additions for v0.18 are UI-only — no new infrastructure dependencies.

| Addition | Mechanism | New Dep? |
|----------|-----------|----------|
| Multi-session cards with chevron progress | Tailwind CSS + existing component patterns | NO |
| Session filter pill | React state + existing UI primitives | NO |
| Striped animated progress bars | CSS `@keyframes` + Tailwind arbitrary values | NO |
| Session-tagged event log | Filter existing SSE stream by `session_id` field | NO |
| Action buttons (Retry, Stop, Merge, Abandon) | Existing API route pattern + Upstash | NO |
| Dispatch event types in ingest API | Wire envelope `extensions` field (already supported) | NO |

---

## Installation

```bash
# Create packages/dispatcher as isolated CJS package
mkdir packages/dispatcher && cd packages/dispatcher
npm init -y
# Edit package.json: set "type": "commonjs", add @anthropic-ai/claude-agent-sdk dep
npm install @anthropic-ai/claude-agent-sdk@^0.2.84
```

The dispatcher has exactly one external dependency. No TypeScript compilation step — CJS throughout, matching the relay.cjs and other plugin infrastructure.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@anthropic-ai/claude-agent-sdk` for reasoning | `@anthropic-ai/sdk` (raw API) | Agent SDK wraps the full Claude Code tool loop with session management, worktree awareness, and tool execution. Raw API would require reimplementing all of that. Agent SDK is the correct abstraction for orchestrating Claude Code work. |
| `node:child_process` spawn for CLI sessions | Agent SDK for all sessions | Agent SDK is in-process and lightweight. Heavyweight sessions that need filesystem access, git, and Claude's full tool suite must use CLI subprocesses in isolated worktrees. Mixing would lose isolation guarantees. |
| CJS throughout dispatcher | ESM / TypeScript | Plugin root is CJS. Dispatcher integrates with existing CJS infrastructure (relay.cjs, emit-event.cjs). Adding a build step would complicate the zero-friction install story. pde-mcp-server uses TypeScript because it ships as an npm package; dispatcher is internal infrastructure. |
| `node:test` for dispatcher tests | vitest | Built-in test runner is sufficient for file parse assertions and session lifecycle tests. Using `node:test` in dispatcher avoids cross-package dev dep coupling with root vitest. |
| SSH via `execFile('ssh', [...])` | `node-ssh` or `ssh2` npm package | Two additional npm deps for what is fundamentally `execFile('ssh', [...])`. SSH dispatch protocol is simple (push branch, run command, pull). Node.js built-in is sufficient. |
| Git operations via `execFile('git', [...])` | `simple-git` or `isomorphic-git` | Same reasoning. Git worktree add/remove, push, pull, merge — all straightforward CLI calls. `simple-git` adds a dep for an abstraction over the CLI it calls anyway. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@anthropic-ai/sdk` (raw Anthropic API) for orchestration | Bypasses Claude Code's tool infrastructure; reimplements what Agent SDK provides | `@anthropic-ai/claude-agent-sdk` |
| Any npm package for git operations | Adds deps; all git operations are 1-3 CLI calls | `node:child_process` execFile with `git` binary |
| Agent SDK for heavyweight plan/phase execution | In-process; plan execution needs isolated filesystem, real git history, full tool suite | `claude --print` CLI subprocess in a dedicated worktree |
| Adding deps to plugin root | Root must stay zero-dep (installable without npm install) | Keep all new deps inside `packages/dispatcher/` |
| TypeScript for packages/dispatcher | No build step needed; dispatcher is internal CJS infrastructure | Plain `.cjs` files matching relay.cjs pattern |
| `exec()` for subprocess calls | Shell interpolation creates injection risk | `execFile()` with args as array — no shell, no injection |
| `node-ssh` or `ssh2` | Extra deps for `execFile('ssh', [...args])` | `node:child_process` execFile with ssh binary |
| `simple-git` | Obscures which git commands run; extra dep | `node:child_process` execFile with explicit git args |

---

## Stack Patterns by Variant

**For dependency DAG analysis (read-only reasoning):**
- Use Agent SDK with `allowedTools: ['Read', 'Glob']`, `persistSession: false`, `maxTurns: 3`
- Because: bounded, stateless, read-only — exactly what Agent SDK is optimized for

**For plan/phase execution (heavyweight):**
- Use `claude --print --prompt "..." --cwd <worktree>` via `child_process.spawn()`
- Because: needs full filesystem access, git history, all Claude Code tools, long-running

**For SSH remote dispatch:**
- Sequence: execFile git push, then execFile ssh with command array, then execFile git pull
- All via `node:child_process` execFile — no ssh library needed, no shell injection risk

**For merge conflict analysis (hybrid):**
- Use Agent SDK with `allowedTools: ['Read', 'Grep']`, pass diff content in prompt
- Because: lightweight reasoning task; no file writes needed from orchestrator

**For session monitoring (polling):**
- Poll session NDJSON files via `node:fs` readFileSync; check process liveness via `process.kill(pid, 0)`
- Because: relay.cjs already handles event streaming; dispatcher just needs liveness checks

---

## Version Compatibility

| Package | Version | Node.js Requirement | Notes |
|---------|---------|---------------------|-------|
| `@anthropic-ai/claude-agent-sdk` | `^0.2.84` | 18.0.0+ | Parity with Claude Code CLI 2.1.84. `persistSession: false` confirmed. `bypassPermissions` + `allowDangerouslySkipPermissions: true` pair required for headless. |
| `node:test` | Built-in | 18.x+ (stable in 20.x) | Use `node --test` flag. Fully stable in Node 20+; avoid nested `describe` if targeting Node 18. |
| `node:child_process` | Built-in | Any | `spawn` with `detached: true` + `.unref()` for fire-and-forget. `execFile()` not `exec()` for git/ssh. |
| Existing `zod ^3.25.0` (pde-mcp-server) | zod v3 | — | Agent SDK `tool()` accepts both Zod 3 and Zod 4 per official docs. No version conflict if dispatcher uses Agent SDK tool definitions. |

---

## Critical Integration Points

### 1. Dispatcher as CJS Module Called by Plugin Root

The plugin root calls dispatcher via `require()`. Since dispatcher is CJS, this works directly:

```javascript
// lib/execute-phase.cjs (existing — integration point)
const dispatcher = require('../packages/dispatcher/index.cjs');

if (config.dispatch?.enabled && flags.parallel) {
  await dispatcher.dispatch({ phase: phaseNum, config });
} else {
  // existing sequential execution path — unchanged
}
```

### 2. Agent SDK `cwd` Must Match Worktree Path

Sessions are stored at `~/.claude/projects/<encoded-cwd>/` where `<encoded-cwd>` replaces non-alphanumeric chars with `-`. If dispatcher calls Agent SDK to analyze a session from a specific worktree, `cwd` in the options must match that worktree's path exactly — otherwise the SDK looks in the wrong location.

### 3. ANTHROPIC_API_KEY Required for Agent SDK

The Agent SDK requires `ANTHROPIC_API_KEY`. This is the same key used by Claude Code CLI — no additional auth setup. Dispatcher should fail fast with a clear error if the key is absent rather than proceeding to a confusing auth error later.

### 4. Dispatcher Lock File Pattern (Atomic, No Library)

```javascript
// packages/dispatcher/lib/lock.cjs
const fs = require('node:fs');
const path = require('node:path');

const LOCK_PATH = path.join(process.cwd(), '.planning', 'dispatcher.lock');

function acquireLock() {
  try {
    fs.writeFileSync(LOCK_PATH, String(process.pid), { flag: 'wx' }); // O_EXCL: atomic
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const existingPid = parseInt(fs.readFileSync(LOCK_PATH, 'utf8'), 10);
    try {
      process.kill(existingPid, 0); // throws if process not running
      throw new Error(`Dispatcher already running (PID ${existingPid})`);
    } catch (killErr) {
      if (killErr.code === 'ESRCH') {
        fs.unlinkSync(LOCK_PATH); // stale lock, clean and retry
        return acquireLock();
      }
      throw killErr;
    }
  }
}

function releaseLock() {
  try { fs.unlinkSync(LOCK_PATH); } catch { /* already gone */ }
}

module.exports = { acquireLock, releaseLock };
```

### 5. CLI Subprocess Fire-and-Forget Pattern

```javascript
// packages/dispatcher/lib/session.cjs
const { spawn } = require('node:child_process');

function spawnSession({ worktreePath, prompt, sessionId }) {
  const child = spawn('claude', ['--print', '--prompt', prompt], {
    cwd: worktreePath,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PDE_SESSION_ID: sessionId }
  });
  child.unref(); // parent can exit independently
  return { pid: child.pid, sessionId, worktreePath };
}
```

Note: `spawn()` is appropriate here (not `execFile`) because the prompt is passed as a separate `--prompt` argument (no shell interpolation). `spawn` with an args array is already injection-safe.

---

## Sources

- `https://platform.claude.com/docs/en/agent-sdk/quickstart` — Agent SDK installation, `query()` API, `Options` fields, permission modes (HIGH confidence — official Anthropic docs, verified 2026-03-26)
- `https://platform.claude.com/docs/en/agent-sdk/typescript` — Full TypeScript SDK reference: all `Options` fields including `cwd`, `persistSession`, `maxTurns`, `permissionMode`, `allowDangerouslySkipPermissions`, `systemPrompt`, `allowedTools`; `Query` object methods (HIGH confidence — official Anthropic docs, verified 2026-03-26)
- `https://platform.claude.com/docs/en/agent-sdk/sessions` — Session management: `continue`, `resume`, `forkSession`, `persistSession`, session ID capture, cwd encoding for session file paths (HIGH confidence — official Anthropic docs, verified 2026-03-26)
- `https://deepwiki.com/anthropics/claude-agent-sdk-typescript` — Version 0.2.84, Node.js 18+ requirement (MEDIUM confidence — third-party documentation)
- `https://nodejs.org/api/child_process.html` — `spawn()` with `detached` + `unref()` pattern; `execFile()` vs `exec()` for injection safety (HIGH confidence — official Node.js docs)
- `/packages/pde-mcp-server/package.json` — Existing `zod ^3.25.0` and `@modelcontextprotocol/sdk ^1.26.0` versions confirmed by direct file read

---
*Stack research for: PDE v0.18 Distributed Execution (Layers 2-3)*
*Researched: 2026-03-26*
