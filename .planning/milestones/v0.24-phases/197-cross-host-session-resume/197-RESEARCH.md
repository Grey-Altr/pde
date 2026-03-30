# Phase 197: Cross-Host Session Resume - Research

**Researched:** 2026-03-30
**Domain:** Claude Agent SDK session persistence, cwd normalization, cross-host session portability
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYN-05 | Agent SDK session .jsonl files can be persisted to shared storage for cross-host resume | SDK `session_id` in `SDKResultSuccess`, file location pattern `~/.claude/projects/<sanitized-cwd>/<uuid>.jsonl`, copy-on-completion to shared path |
| SYN-06 | Session resume on different host uses matching cwd encoding for session portability | `resume` option in `query()` options; host-specific `~/.claude/projects/` path resolved by cwd sanitization; portability requires placing .jsonl at correct path before resuming |
</phase_requirements>

---

## Summary

Claude Agent SDK sessions are stored as `.jsonl` files under `~/.claude/projects/<sanitized-cwd>/<uuid>.jsonl`. The sanitization function replaces all non-alphanumeric characters (slashes, spaces) with dashes: `/Users/alice/project` becomes `-Users-alice-project`. This means the same session file must live in a different `~/.claude/projects/` subdirectory on each host.

Cross-host resume requires: (1) capturing the session UUID from `SDKResultSuccess.session_id` at the end of a session, (2) copying the `.jsonl` file to shared storage (e.g., the existing git branch or a configurable path), and (3) on the resuming host, placing the `.jsonl` at the correct host-local path derived by applying the same sanitization to the resuming host's cwd, then invoking `query()` with `resume: sessionUuid`.

The cwd portability requirement (SYN-06) means the JSONL entries embed the source host's cwd. The `resume` option in the SDK re-loads conversation history without caring about the embedded cwd value — the session just needs to be locatable by the SDK's file resolver. Therefore portability is achieved by normalization at the directory-placement level, not by rewriting entries inside the file.

**Primary recommendation:** Implement `session-persist.cjs` that captures `session_id` from the result message, locates the `.jsonl` using the cwd-sanitization formula, copies to shared storage, and provides a `restoreSession(sessionId, sharedStoragePath, localCwd)` that places the file at the host-correct location before resume.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | 0.2.85 (installed) | Session resume via `query({ resume })` option | Only official API for session continuity |
| `node:fs`, `node:path`, `node:os` | Node built-ins | JSONL file copy, path sanitization | Zero-dependency, matches rest of dispatcher |
| `simple-git` | ^3.33.0 (installed in dispatcher) | Optional: push JSONL via git to shared branch | Already used in sync.cjs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:crypto` | Node built-in | UUID validation before resume | Validate session UUID format before attempting file lookup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| File copy to shared git branch | S3/GCS bucket | git is already the shared storage mechanism in this milestone; no new infra |
| File copy to shared git branch | NFS/shared volume | Requires infrastructure coordination outside PDE scope |

**Installation:** No new packages required. All dependencies already present in `packages/dispatcher/`.

---

## Architecture Patterns

### Recommended Project Structure
```
packages/dispatcher/lib/
├── session-persist.cjs      # NEW: session JSONL persistence + restore for cross-host resume
├── coordinator.cjs          # EXTEND: call persistSession in _handleExit on success
├── spawn.cjs                # READ: captures session_id from SDKResultSuccess events (already emitted)
sync.cjs                     # REFERENCE: model for shared git storage pattern
```

Config keys to register in `bin/lib/config.cjs`:
```
dispatch.session_persist.enabled        # bool: enable JSONL persistence to shared storage
dispatch.session_persist.storage_path   # string: absolute path or git-based shared path
```

### Pattern 1: Session UUID Capture from NDJSON Stream

**What:** `SDKResultSuccess` carries `session_id` (UUID string). This flows through the existing `onLine` callback in `spawnSession` as a parsed NDJSON event.

**When to use:** Capture at the `result` + `success` subtype event during `_runSession`.

**Example:**
```javascript
// In _runSession onLine callback (already called per NDJSON line):
onLine: (sid, event) => {
  if (event.type === 'result' && event.subtype === 'success' && event.session_id) {
    // Store for use in _handleExit
    this._sessionIds.set(sessionId, event.session_id);
  }
  this._aggregator.emit('event', sid, event);
},
```

Source: `packages/dispatcher/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` lines 2259–2276 (SDKResultSuccess type).

### Pattern 2: JSONL File Location Formula

**What:** Claude Code stores session files at `~/.claude/projects/<sanitized-cwd>/<uuid>.jsonl`. The sanitization function in the SDK source (`vJ()`) replaces all non-alphanumeric characters with dashes.

**When to use:** To locate a session JSONL after it completes, to copy it to shared storage or restore from shared storage.

**Example:**
```javascript
// Source: sdk.mjs vJ() function — verified by inspecting actual directory names
function sanitizeCwdForProjectDir(cwd) {
  // Replace all non-alphanumeric characters (including / and spaces) with -
  return cwd.replace(/[^a-zA-Z0-9]/g, '-');
}

function getSessionJsonlPath(cwd, sessionUuid) {
  const homeDir = os.homedir();
  const sanitized = sanitizeCwdForProjectDir(cwd);
  return path.join(homeDir, '.claude', 'projects', sanitized, sessionUuid + '.jsonl');
}
```

Note: The SDK also supports truncated names with a hash suffix when the sanitized path exceeds 200 characters. Implementation must handle this edge case (see Pitfall 1).

Source: Verified by inspecting `~/.claude/projects/` directory: `/Users/greyaltaer/code/projects/Platform Development Engine` → `-Users-greyaltaer-code-projects-Platform-Development-Engine`.

### Pattern 3: cwd Normalization for Cross-Host Portability

**What:** The `resume` SDK option only requires the JSONL file to be locatable at the correct `~/.claude/projects/<sanitized-cwd>/` path on the resuming host. The SDK does not rewrite embedded `cwd` entries inside the file. Portability is achieved by computing the resuming host's cwd-sanitized path and placing the JSONL there.

**When to use:** When restoring a session from shared storage on a different host.

**Example:**
```javascript
// session-persist.cjs
async function restoreSession(sessionUuid, sharedStoragePath, resumingCwd) {
  const targetDir = path.join(
    os.homedir(), '.claude', 'projects',
    sanitizeCwdForProjectDir(resumingCwd)
  );
  fs.mkdirSync(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, sessionUuid + '.jsonl');
  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(
      path.join(sharedStoragePath, sessionUuid + '.jsonl'),
      targetPath
    );
  }
  return targetPath;
}
```

### Pattern 4: SDK Resume via query() Options

**What:** `query({ prompt, options: { resume: sessionUuid, cwd: worktreePath } })` resumes from the session history. The v1 `query()` API is the stable path. The v2 `unstable_v2_resumeSession()` is alpha and must not be used in production code.

**When to use:** When spawning a session that should continue from a previous host's context.

**Example:**
```javascript
// In sdkQuery (sdk-bridge.cjs) or spawnSession args via --resume flag:
for await (const message of sdk.query({
  prompt: continuePrompt,
  options: {
    resume: sessionUuid,
    cwd: worktreePath,
    persistSession: true,
  }
})) { ... }
```

Source: `sdk.d.ts` lines 1159–1161, 874–876.

### Pattern 5: Shared Storage via Git Branch (Aligned with sync.cjs)

**What:** Push the `.jsonl` file to the same session branch that already carries `.planning/` state (Phase 192 pattern). On resume, the file is fetched alongside the planning state.

**When to use:** When `dispatch.session_persist.storage_path` is not configured (default: use git).

**Example:**
```javascript
// After JSONL copy to worktree:
// session-persist.cjs
async function persistSessionToGit(projectRoot, branch, sessionUuid, jsonlContent) {
  const dest = path.join(projectRoot, '.sessions-archive', sessionUuid + '.jsonl');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, jsonlContent);
  // Uses simple-git, same as sync.cjs pushPlanningState
  const git = simpleGit(projectRoot);
  await git.add(dest);
  await git.commit(`chore: persist session ${sessionUuid} for cross-host resume`);
  await git.push('origin', branch);
}
```

### Anti-Patterns to Avoid
- **Do not rewrite cwd inside the JSONL file:** The SDK rebuilds conversation chains using `parentUuid` links; rewriting entries corrupts the chain. Portability comes from file placement, not content mutation.
- **Do not use `unstable_v2_resumeSession` in production:** Marked `@alpha` in sdk.d.ts line 4125. Use `query({ options: { resume } })` instead.
- **Do not assume the JSONL path is always `<sanitized-cwd>/<uuid>.jsonl`:** The SDK truncates at 200 chars and appends a hash. Always implement the full formula.
- **Do not block _handleExit on slow file copy:** The existing pattern for non-fatal sync (Phase 192) is the model — copy failures are logged but do not abort the exit handler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session UUID detection | Custom NDJSON parser | Read `event.session_id` from the existing `onLine` callback | Already parsed — `SDKResultSuccess.session_id` is present in the stream |
| JSONL file location | Custom directory scanner | Apply `sanitizeCwdForProjectDir(cwd)` formula | SDK uses deterministic formula; scanner is fragile |
| cwd rewriting | Content rewrite logic | File placement at host-correct path | SDK does not require matching cwd in content for resume |
| Multi-host coordination | Custom sync protocol | git push/fetch (already implemented in sync.cjs) | Reuse existing shared storage mechanism |

**Key insight:** All the hard parts (git sync, session streaming, NDJSON parsing) are already built. This phase is primarily a persistence bookend: capture UUID at session end, copy file to shared storage, restore file before resume.

---

## Runtime State Inventory

> This is a new capability, not a rename/refactor. No runtime state migration required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no existing session persistence infrastructure | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None — new config keys are optional | None |
| Build artifacts | None | None |

**Nothing found in any category** — this is a greenfield addition to an existing module.

---

## Common Pitfalls

### Pitfall 1: SDK Path Truncation at 200 Characters
**What goes wrong:** The SDK's `vJ()` function truncates sanitized cwd names longer than 200 characters and appends a hash suffix. If `session-persist.cjs` uses only the simple replace formula, it will compute the wrong directory for long paths.
**Why it happens:** The full formula in `sdk.mjs` is: if `sanitized.length > 200`, append `-<hash>` where hash is derived from the full cwd string.
**How to avoid:** Implement the full formula including the truncation case. The SDK source (`sdk.mjs`, `vJ()` function) is the authoritative reference.
**Warning signs:** JSONL file not found at expected path when cwd is deep (e.g., home dir with spaces + long project name).

### Pitfall 2: Session UUID Not Available Until result Message
**What goes wrong:** Code attempts to access session UUID before the query stream produces a `result` message (e.g., captures it from the first `system:init` message which has `session_id`).
**Why it happens:** The `SDKSystemMessage` (init) does carry `session_id`, but the result message is the canonical "session complete" signal. The init message arrives earlier.
**How to avoid:** Capture `session_id` from the init message (`type: 'system', subtype: 'init'`) or the result message. Either works — the UUID is consistent across the session. Capturing from init is safer (available earlier, before potential crashes).
**Warning signs:** UUID is null in _handleExit if only looking at result messages when sessions fail.

### Pitfall 3: JSONL File May Not Exist If persistSession=false
**What goes wrong:** When sessions run with `persistSession: false` (could be set in downstream opts), no file is written. Persistence logic silently does nothing.
**Why it happens:** The SDK supports disabling session persistence for ephemeral workflows (sdk.d.ts lines 994–1001).
**How to avoid:** The existing PDE spawn path does not set `persistSession: false`, so this should not occur. But the persistence module should check for file existence before attempting copy and log a warning if the file is missing.
**Warning signs:** File not found at expected `~/.claude/projects/` path after session completes.

### Pitfall 4: Concurrent Resume Race Condition
**What goes wrong:** Two hosts attempt to restore and resume the same session UUID from shared storage simultaneously — both write the same JSONL locally, and the SDK appends to the same file during the second resume, corrupting the transcript.
**Why it happens:** Sessions are designed to be resumed linearly. The SDK appends new entries to the JSONL file on each resume.
**How to avoid:** PDE's existing phase/plan uniqueness enforcement (registry.hasPhase check) prevents two coordinators from running the same phase simultaneously. Session UUIDs are per-run, so cross-host resume of the exact same UUID is an explicit user action, not automatic. Document this as a constraint (one-active-resume-per-session-uuid).
**Warning signs:** JSONL file grows on both machines after a supposed "cross-host" resume.

### Pitfall 5: Worktree cwd vs Project Root cwd
**What goes wrong:** The session JSONL is stored under the worktree path sanitization (`~/.claude/projects/<sanitized-worktreePath>/`) but resume is attempted with the project root cwd.
**Why it happens:** `spawn.cjs` sets `cwd: worktreePath` when spawning Claude. The SDK uses `process.cwd()` (which is the worktree path) as the key for the projects directory.
**How to avoid:** Always use `worktreePath` (not `projectRoot`) when computing the JSONL location. The `_handleExit` receives `worktreePath` — pass it through to the persistence module.
**Warning signs:** JSONL not found at expected path despite session completing successfully.

---

## Code Examples

Verified patterns from official sources:

### Capture session_id from NDJSON stream
```javascript
// Source: sdk.d.ts SDKResultSuccess (lines 2259–2276) + SDKSystemMessage (lines 2422–2451)
// Both carry session_id. Capture from system:init for robustness (available before crashes).
onLine: (sid, event) => {
  if (event.type === 'system' && event.subtype === 'init' && event.session_id) {
    this._claudeSessionIds.set(sessionId, event.session_id);
  }
  this._aggregator.emit('event', sid, event);
},
```

### Compute JSONL path (full formula)
```javascript
// Source: sdk.mjs vJ() function — verified by inspecting ~/.claude/projects/ naming
const MAX_LEN = 200;
function sanitizeCwdForProjectDir(cwd) {
  const s = cwd.replace(/[^a-zA-Z0-9]/g, '-');
  if (s.length <= MAX_LEN) return s;
  // Hash suffix for long paths (matches SDK behavior)
  const hash = require('node:crypto')
    .createHash('sha256').update(cwd).digest('base64url').slice(0, 8);
  return s.slice(0, MAX_LEN) + '-' + hash;
}

function getSessionJsonlPath(cwd, sessionUuid) {
  return path.join(
    os.homedir(), '.claude', 'projects',
    sanitizeCwdForProjectDir(cwd),
    sessionUuid + '.jsonl'
  );
}
```

Note: The SDK uses a base-36 hash from `Math.abs(ZK($)).toString(36)` — not SHA256. The exact hash algorithm should be taken from the SDK source (`qI()` function in sdk.mjs) for perfect compatibility, or use `listSessions({ dir: cwd })` from the SDK which handles the lookup internally.

### Resume session using query() API
```javascript
// Source: sdk.d.ts lines 1159–1161, 874–876
const sdk = await import('@anthropic-ai/claude-agent-sdk');
for await (const message of sdk.query({
  prompt: 'Continue from where you left off.',
  options: {
    resume: sessionUuid,     // session UUID from SDKResultSuccess.session_id
    cwd: worktreePath,       // worktree path on the new host
    persistSession: true,    // continue persisting on the new host
  }
})) {
  if (message.type === 'result') { /* handle */ }
}
```

### listSessions SDK API for session lookup (alternative to manual path construction)
```javascript
// Source: sdk.d.ts lines 580–621
const { listSessions, getSessionInfo } = await import('@anthropic-ai/claude-agent-sdk');

// Find session by UUID across all project directories
const info = await getSessionInfo(sessionUuid);
// OR: find sessions for a specific project cwd
const sessions = await listSessions({ dir: worktreePath });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual JSONL path construction | `listSessions`/`getSessionInfo` SDK APIs | SDK 0.2.x | SDK now provides built-in session lookup; manual path construction is a valid alternative for performance |
| v2 `unstable_v2_resumeSession` | v1 `query({ resume })` option | Current | v2 API is alpha; v1 `resume` option is stable and production-ready |

**Deprecated/outdated:**
- `unstable_v2_resumeSession()`: Alpha API, must not be used in production (sdk.d.ts line 4125 marks it `@alpha`).

---

## Open Questions

1. **Hash algorithm compatibility in path truncation**
   - What we know: The SDK's `vJ()` truncates at 200 chars with a hash suffix. The hash is computed from `Math.abs(ZK($)).toString(36)` where `ZK` is an internal hash function in sdk.mjs.
   - What's unclear: Whether the hash is compatible with a simpler Node.js implementation.
   - Recommendation: Use `getSessionInfo(uuid)` SDK API for lookup (handles all path resolution internally) rather than re-implementing the formula. Only use the formula for writing (placing) files on the resuming host.

2. **Where to store session UUIDs durably**
   - What we know: The PDE registry (`dispatcher.pids`) tracks session metadata. `_handleExit` receives `sessionId` (PDE ID) and the Claude session UUID is captured from the NDJSON stream.
   - What's unclear: Whether the registry should store the Claude session UUID alongside the PDE session ID, or if a separate mapping file is better.
   - Recommendation: Extend `registry.register/update` to accept a `claudeSessionId` field, stored in `dispatcher.pids`. This keeps the mapping durable across process restarts.

3. **Shared storage path for cross-host scenarios**
   - What we know: The existing git branch (sync.cjs) is the shared storage mechanism in v0.24.
   - What's unclear: Whether committing large JSONL files to git branches is acceptable (JSONL files can be MB-scale for long sessions).
   - Recommendation: Use the session git branch for JSONL transport (same as `.planning/` state). Add a `.gitattributes` entry to exclude `.sessions-archive/*.jsonl` from diffs. Cap at configurable max file size (e.g., 50MB) with a skip-and-warn fallback.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|---------|
| `@anthropic-ai/claude-agent-sdk` | Session resume | ✓ | 0.2.85 | — |
| `simple-git` | Git-based shared storage | ✓ | ^3.33.0 | File-based copy to `dispatch.session_persist.storage_path` |
| `~/.claude/projects/` | JSONL source files | ✓ | (macOS default) | Log warning if missing; skip persistence |
| Node.js `fs` | File copy | ✓ | Node 20+ | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** simple-git is optional — if git push is unavailable, fall back to file-based storage path.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/dispatcher/session-persist.test.cjs` |
| Full suite command | `npx vitest run tests/dispatcher/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYN-05 | JSONL file copied to shared storage on session completion | unit | `npx vitest run tests/dispatcher/session-persist.test.cjs` | ❌ Wave 0 |
| SYN-05 | Storage path is configurable via `dispatch.session_persist.*` config keys | unit | `npx vitest run tests/dispatcher/session-persist.test.cjs` | ❌ Wave 0 |
| SYN-06 | `sanitizeCwdForProjectDir` produces host-portable paths | unit | `npx vitest run tests/dispatcher/session-persist.test.cjs` | ❌ Wave 0 |
| SYN-06 | `restoreSession` places JSONL at correct host-local path | unit | `npx vitest run tests/dispatcher/session-persist.test.cjs` | ❌ Wave 0 |
| SYN-06 | Resume with `query({ resume: uuid })` uses restored file | integration (manual) | manual | manual-only |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/dispatcher/session-persist.test.cjs`
- **Per wave merge:** `npx vitest run tests/dispatcher/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dispatcher/session-persist.test.cjs` — covers SYN-05, SYN-06
- [ ] `packages/dispatcher/lib/session-persist.cjs` — new module

*(Existing test infrastructure covers all other dispatcher tests; no changes to vitest.config.ts needed.)*

---

## Sources

### Primary (HIGH confidence)
- `packages/dispatcher/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` — `SDKResultSuccess.session_id`, `SDKSystemMessage.session_id`, `query()` `resume` option, `persistSession` option, `listSessions`, `getSessionInfo`, `unstable_v2_resumeSession`
- `packages/dispatcher/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs` — `vJ()` sanitization formula (verified by inspecting actual directory: spaces + slashes replaced with dashes)
- `~/.claude/projects/-Users-greyaltaer-code-projects-Platform-Development-Engine/` — empirically verified directory naming convention
- `packages/dispatcher/lib/coordinator.cjs` — `_handleExit`, `_runSession`, session lifecycle
- `packages/dispatcher/lib/spawn.cjs` — `onLine` callback, env vars, NDJSON stream
- `packages/dispatcher/lib/sync.cjs` — shared git storage pattern (model for phase 197)
- `packages/dispatcher/lib/registry.cjs` — session metadata storage schema
- `bin/lib/config.cjs` — config key registration pattern and `VALID_CONFIG_KEYS`

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` Phase 197 entry — success criteria for SYN-05/SYN-06
- `.planning/REQUIREMENTS.md` — SYN-05, SYN-06 requirement text

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified installed in `packages/dispatcher/package.json`
- Architecture: HIGH — SDK types and file system layout verified empirically
- Pitfalls: HIGH — SDK source inspected; cwd sanitization formula verified against real directory names

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (SDK 0.2.85 API surface stable; v2 API still alpha)
