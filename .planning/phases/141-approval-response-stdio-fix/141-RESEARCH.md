# Phase 141: Approval Response Stdio Fix — Research

**Researched:** 2026-03-26
**Domain:** Node.js child_process stdio configuration, relay daemon spawning, file-based IPC
**Confidence:** HIGH

## Summary

Phase 141 is a two-part surgical fix. The confirmed bug is in `hooks/start-relay.cjs` line 79-83:
the relay daemon is spawned with `stdio: 'ignore'`, which discards all stdout. The relay daemon
(`bin/lib/relay.cjs`) writes approval responses to `process.stdout` as NDJSON lines — but since
stdout is `/dev/null`, those lines disappear immediately.

The fix has two required parts:

**Part 1 — Fix the spawn:** Change `stdio: 'ignore'` to `stdio: ['ignore', fd, 'ignore']` where
`fd` is a `fs.openSync` file descriptor for a named response file at
`/tmp/pde-relay-responses-{sessionId}.ndjson`. This is the standard Node.js pattern for
redirecting a detached child process's stdout to a file without keeping the parent alive.
The `fs.openSync` call happens before `spawn`, the fd is passed into `stdio`, and `fs.closeSync`
is called immediately after `spawn` — the child holds the fd open independently.

**Part 2 — Add PDE reader:** No PDE-side reader exists yet. `pde-tools.cjs` has no
`approval-response` or `approval-gate` subcommand. The relay writes approval responses to
stdout (now redirected to a file), but nothing reads that file. A new `pde-tools.cjs`
subcommand (e.g., `poll-approval`) must tail the response file and return the first matching
`approval_response` line for a given `approval_id`, blocking until found or timeout.

This is a complete integration gap requiring both ends to be wired together in one phase.

**Primary recommendation:** (1) Patch `start-relay.cjs` to use a named response file fd as
stdout. (2) Add `poll-approval` subcommand to `pde-tools.cjs` that reads
`/tmp/pde-relay-responses-{sessionId}.ndjson` and returns the matching approval_response.
The file path convention matches the existing PID file pattern
(`/tmp/pde-relay-{sessionId}.pid`).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APR-04 | Approval responses flow back to PDE via relay polling Upstash for pending responses | Fix 1: start-relay.cjs stdio must capture relay stdout. Fix 2: PDE must read the captured response file. Both ends required to close the loop. |
</phase_requirements>

## Standard Stack

### Core (all already installed — zero new deps)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:child_process` | Node 20 built-in | `spawn` with stdio array | The only way to configure relay daemon stdio |
| `node:fs` | Node 20 built-in | `openSync` / `closeSync` for fd-based spawn stdio | Established pattern in start-relay.cjs already |
| `node:os` | Node 20 built-in | `tmpdir()` for consistent temp file path | Already used for PID file (`os.tmpdir()`) |
| `node:path` | Node 20 built-in | File path construction | Already used throughout hooks |
| `vitest` | latest | Test runner | Established — `vitest.config.ts` at project root, `globals: true` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:readline` | Node 20 built-in | Optional: NDJSON line-by-line reading | Use if polling via readline is cleaner than manual split |

**Installation:** None required. All built-ins.

## Architecture Patterns

### Confirmed Bug Location

```
hooks/start-relay.cjs line 75-89 — CURRENT (broken)
```

```javascript
// hooks/start-relay.cjs:75-89 (line numbers from source read)
const child = spawn(
  process.execPath,
  [relayScript, sessionId, ingestUrl, bearerToken],
  {
    detached: true,
    stdio:    'ignore',    // BUG: discards relay stdout — approval responses go to /dev/null
    env:      { ...process.env },
  }
);
```

### Part 1 Fix: Named Response File as Stdout

**Pattern:** Open a named file as a file descriptor before spawning, pass the fd as stdout
in the stdio array. Close the fd immediately after spawn — the child process holds it open
independently. This is the canonical Node.js way to redirect a detached child's stdout to a
file without keeping the parent process alive.

**Verified working** (tested locally): Node 20, detached+unref, fd-based stdout redirect — file
receives content written by child after parent has unref'd and continued.

```javascript
// hooks/start-relay.cjs — FIXED
const responseFile = path.join(os.tmpdir(), `pde-relay-responses-${sessionId}.ndjson`);

// Open the response file for appending before spawn
// O_WRONLY|O_CREAT|O_APPEND — safe for appending even if file exists
const responseFd = fs.openSync(responseFile, 'a');

const child = spawn(
  process.execPath,
  [relayScript, sessionId, ingestUrl, bearerToken],
  {
    detached: true,
    stdio:    ['ignore', responseFd, 'ignore'],  // FIX: stdout → named file
    env:      { ...process.env },
  }
);

// Close the fd in the parent — child holds it open independently
fs.closeSync(responseFd);

// Write PID file so stop-relay.cjs can kill the daemon later
fs.writeFileSync(pidFile, String(child.pid), 'utf-8');
child.unref();
```

**Why 'a' (append) not 'w' (write):** If a relay restarts mid-session (e.g., stale PID killed),
appending preserves any approval responses written before the restart. Write would truncate them.

**File naming convention:** `pde-relay-responses-{sessionId}.ndjson` — matches the existing PID
file convention `pde-relay-{sessionId}.pid` and session NDJSON `pde-session-{sessionId}.ndjson`.

### Part 2 Fix: PDE-Side Reader in pde-tools.cjs

**Problem:** No code in PDE reads the response file. `relay.cjs` writes NDJSON lines but
nothing consumes them.

**Pattern:** Add a new `poll-approval` subcommand to `pde-tools.cjs` that:
1. Reads the response file at `/tmp/pde-relay-responses-{sessionId}.ndjson`
2. Searches for a line where `type === 'approval_response'` and `approval_id === <target_id>`
3. If found, writes the JSON to stdout and exits 0
4. If not found, polls on a short interval until found or timeout
5. On timeout, writes `{"timed_out": true}` to stdout and exits 0

```javascript
// bin/pde-tools.cjs — new case block
case 'poll-approval': {
  // Usage: pde-tools poll-approval <approval_id> [timeout_ms]
  const approvalId = args[1];
  const timeoutMs  = Number(args[2] ?? '600000'); // 10 min default
  if (!approvalId) {
    process.stdout.write(JSON.stringify({ error: 'missing approval_id' }));
    break;
  }

  const configPath = path.join(cwd, '.planning', 'config.json');
  let sessionId = '';
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    sessionId = (cfg.monitoring && cfg.monitoring.session_id) || '';
  } catch { /* config unreadable — exit silently */ }

  if (!sessionId) {
    process.stdout.write(JSON.stringify({ error: 'no session_id' }));
    break;
  }

  const responseFile = path.join(require('os').tmpdir(), `pde-relay-responses-${sessionId}.ndjson`);
  const deadline = Date.now() + timeoutMs;
  const POLL_INTERVAL = 1000; // 1 second

  const findResponse = () => {
    try {
      const lines = fs.readFileSync(responseFile, 'utf-8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.type === 'approval_response' && obj.approval_id === approvalId) {
            return obj;
          }
        } catch { /* skip malformed lines */ }
      }
    } catch { /* file not yet created — normal */ }
    return null;
  };

  const poll = () => {
    const result = findResponse();
    if (result) {
      process.stdout.write(JSON.stringify(result));
      process.exit(0);
      return;
    }
    if (Date.now() >= deadline) {
      process.stdout.write(JSON.stringify({ timed_out: true, approval_id: approvalId }));
      process.exit(0);
      return;
    }
    setTimeout(poll, POLL_INTERVAL);
  };

  poll();
  break;
}
```

**Important:** This subcommand does NOT exit synchronously — it polls until found or timeout.
Callers must handle the async nature. Claude Code workflows call `pde-tools poll-approval` via
`spawnSync` with a timeout cap, or via `Bash` tool with sufficient wall-clock time.

### Pattern 3: Cleanup — stop-relay.cjs

`stop-relay.cjs` currently only removes the PID file. After the fix, a response file also
exists. Add cleanup so the response file is removed when the relay stops:

```javascript
// hooks/stop-relay.cjs — add after PID cleanup
const responseFile = path.join(os.tmpdir(), `pde-relay-responses-${sessionId}.ndjson`);
try { fs.unlinkSync(responseFile); } catch { /* ignore if not found */ }
```

**Why:** Prevents stale approval responses from a previous session being picked up by a new
session if session IDs ever collide (extremely unlikely with UUIDs, but defensive).

### Recommended Project Structure (no structural changes required)

```
hooks/
  start-relay.cjs     MODIFY — change stdio:'ignore' to stdio array with fd
  stop-relay.cjs      MODIFY — add response file cleanup
bin/
  pde-tools.cjs       MODIFY — add 'poll-approval' subcommand
  lib/
    relay.cjs         NO CHANGE — stdout write already correct
tests/
  relay-stdio.test.cjs  CREATE — test that start-relay.cjs spawns with file-based stdout
```

### Anti-Patterns to Avoid

- **Do not use `stdio: 'pipe'`** with `detached: true` + `child.unref()`: Pipe requires both
  ends to be open. After `unref()`, the parent's event loop can exit, destroying the pipe.
  The child's stdout write will then raise EPIPE. File-based fd avoids this entirely.
- **Do not use `stdio: 'inherit'`** (relay inherits hook's stdout): The hook's stdout is
  Claude Code's stdin/stdout pipeline. Inheriting would mix relay output into the hook
  response, corrupting the hook protocol.
- **Do not read the response file in relay.cjs itself**: relay.cjs already writes to stdout
  correctly. The problem is purely in the spawner (`start-relay.cjs`). Changing relay.cjs to
  write directly to a file instead of stdout would require changing its internal logic AND
  break the test suite. Keep relay.cjs unchanged — redirect its stdout externally.
- **Do not poll the response file in the relay daemon**: The relay is already in the right
  architecture. PDE polling the file is the cleanest separation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redirect detached child stdout | Custom socket/IPC protocol | `fs.openSync` + fd in stdio array | One-line fix; no new moving parts; proven Node.js pattern |
| Read NDJSON line by line | Custom stream parser | Split by `\n` + `JSON.parse` per line | Already used in TailCursor; NDJSON is newline-delimited |
| Approval response polling | Upstash direct read from PDE | Read local response file | Response file IS the message from relay to PDE; no network needed |

**Key insight:** The relay daemon is already doing the network polling (Upstash). PDE just needs
to read the relay's output. The communication channel is file-based (relay writes → file → PDE
reads), which is simpler than a second network hop from PDE.

## Common Pitfalls

### Pitfall 1: Forgetting to close the fd in the parent
**What goes wrong:** `fs.openSync` returns a fd. If `fs.closeSync(fd)` is never called in the
parent, the parent leaks the fd. On macOS/Linux the process limit is ~1024 open fds.
**Why it happens:** The fd is passed to spawn and developers assume spawn "takes ownership."
Node.js does NOT automatically close parent-side fds passed to child stdio.
**How to avoid:** Always call `fs.closeSync(responseFd)` immediately after `spawn(...)`. The
child already has its own copy of the fd after fork. Verified in test above.
**Warning signs:** `Error: EMFILE: too many open files` after many relay restarts.

### Pitfall 2: Opening file with 'w' flag instead of 'a'
**What goes wrong:** If the relay is restarted (stop + start due to duplicate guard), the 'w'
flag truncates the existing file, discarding any approval responses already written.
**Why it happens:** Default mental model is "write a new file."
**How to avoid:** Use 'a' (append) — safe whether the file exists or not, and preserves
responses across restarts.

### Pitfall 3: poll-approval hangs indefinitely in spawnSync context
**What goes wrong:** If `poll-approval` is called via `spawnSync` without a `timeout` option,
the caller blocks forever waiting for the approval.
**Why it happens:** `spawnSync` is blocking by design; no timeout means no way to escape.
**How to avoid:** Always call `spawnSync(node, [pdeTools, 'poll-approval', approvalId], { timeout: 610000 })`.
Set slightly longer than the internal 10-minute timeout so the child always exits first. Or
use `spawn` + event handlers for non-blocking behavior.
**Warning signs:** Claude Code workflow appears stuck with no output.

### Pitfall 4: Response file path mismatch between writer and reader
**What goes wrong:** `start-relay.cjs` uses `pde-relay-responses-{sessionId}.ndjson` but
`pde-tools.cjs` uses a different filename — they miss each other.
**Why it happens:** Two files changed independently; naming not centralized.
**How to avoid:** Define the path in one place, or verify both files use the same exact template:
`path.join(os.tmpdir(), 'pde-relay-responses-' + sessionId + '.ndjson')`. The research
explicitly uses this string; the planner should verify both file modifications use it verbatim.

### Pitfall 5: relay.cjs stdout write raises EPIPE before fix
**What goes wrong:** After the fix, if the response file fd is closed on the relay side (e.g.,
relay receives SIGTERM and exits before writing), subsequent writes may raise EPIPE. The relay
already wraps `process.stdout.write` in a try/catch — this is fine.
**Why it happens:** The relay's error swallowing is already correct.
**How to avoid:** No action needed — relay.cjs already has `try { process.stdout.write(...) } catch {}`.

### Pitfall 6: stop-relay.cjs runs before PDE reads the response
**What goes wrong:** If the relay stops (SessionEnd hook) before `poll-approval` finds the
response, the response file may be deleted by `stop-relay.cjs` cleanup.
**Why it happens:** SessionEnd fires when the session ends, which may happen before the user
responds to a pending approval.
**How to avoid:** In `stop-relay.cjs`, only delete the response file if it's empty (no pending
responses), OR delay deletion. Simpler: don't delete the file in stop-relay at all — files in
`/tmp` are cleaned by the OS on reboot. Only add cleanup as a "belt and suspenders" safety for
the current session (PID file is cleaned; response file can be left for OS cleanup).
**Recommendation:** Skip response file deletion in `stop-relay.cjs` for v0.17. The OS tmpdir
handles cleanup. Adding deletion risks the race condition described above.

## Code Examples

### Verified: fd-based spawn (confirmed working on Node 20 + macOS)

```javascript
// Source: verified locally — detached+unref with file fd stdout
const responseFile = path.join(os.tmpdir(), `pde-relay-responses-${sessionId}.ndjson`);
const responseFd   = fs.openSync(responseFile, 'a');

const child = spawn(process.execPath, [relayScript, sessionId, ingestUrl, bearerToken], {
  detached: true,
  stdio:    ['ignore', responseFd, 'ignore'],
  env:      { ...process.env },
});

fs.closeSync(responseFd);  // CRITICAL: close parent's copy of fd
child.unref();
```

### Verified: child writes to file, parent reads after unref

```
// Local test result: child PID spawned with detached:true + stdio fd
// child writes {type:'approval_response', action:'approved'} after 300ms
// parent reads file after 600ms — content confirmed present
// This is the exact pattern needed in start-relay.cjs
```

### poll-approval response file reading

```javascript
// Source: design pattern — reads NDJSON file scanning for matching approval_id
const lines = fs.readFileSync(responseFile, 'utf-8').split('\n').filter(Boolean);
for (const line of lines) {
  const obj = JSON.parse(line);
  if (obj.type === 'approval_response' && obj.approval_id === targetApprovalId) {
    return obj;  // Found — return immediately
  }
}
return null; // Not yet written
```

### relay.cjs write (already correct — DO NOT CHANGE)

```javascript
// Source: bin/lib/relay.cjs lines 437-445 (confirmed in source read)
// This code is CORRECT — it writes NDJSON to stdout
// The bug is in the spawner, not here
process.stdout.write(JSON.stringify({
  type: 'approval_response',
  approval_id: aid,
  action: resp.action,
  responded_at: resp.responded_at,
}) + '\n');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `stdio: 'ignore'` for pure daemon isolation | `stdio: ['ignore', fd, 'ignore']` for relay-to-PDE IPC | Phase 141 (this fix) | Enables approval response delivery without breaking isolation |

**The design intent from Phase 134 was correct** — `detached: true` with `stdio: 'ignore'`
ensures the hook exits immediately (RLY-05). The oversight was that Phase 137 added stdout
writing without updating the spawner. Phase 141 retroactively aligns the spawner with the
relay's output contract.

## Open Questions

1. **Where does Claude Code's approval gate actually block?**
   - What we know: relay.cjs writes approval_response to stdout. There is no existing
     `poll-approval` command in pde-tools.cjs. No code in PDE blocks waiting for a response.
   - What's unclear: How the GSD workflow (e.g., `/gsd:plan-phase`) is supposed to emit an
     `approval_request` event and then wait. This is an APR-04 gap — the relay transport is
     fixed in Phase 141, but the workflow-level "emit + wait" is not yet wired.
   - Recommendation for Phase 141 scope: Focus on the transport fix (start-relay.cjs) and
     the `poll-approval` reader (pde-tools.cjs). The caller that invokes `poll-approval` from
     a workflow is the next layer — Phase 141 makes the IPC mechanism functional; callers
     can wire it in subsequent work.

2. **Should relay.cjs write to a file directly instead of stdout?**
   - What we know: Changing relay.cjs to write to a file directly would mean no spawner
     change needed. But it would also change relay.cjs internals and break existing tests.
   - What's unclear: Whether future uses (e.g., test harness) need relay.cjs to write to stdout.
   - Recommendation: Keep relay.cjs writing to stdout (clean, testable). Let the spawner
     redirect stdout to the file. This preserves the clean separation: relay doesn't know
     where its output goes; start-relay.cjs decides.

3. **Should stop-relay.cjs delete the response file?**
   - What we know: Race condition risk (response written after stop). /tmp is OS-managed.
   - What's unclear: Whether accumulated response files across sessions cause disk pressure.
   - Recommendation: Skip response file deletion in Phase 141. Each file is at most a few KB
     (one NDJSON line per approval). OS tmpdir cleanup handles it.

## Environment Availability

Step 2.6: SKIPPED — this phase is a code-only change within existing Node.js built-ins. No new
external tools, services, CLIs, databases, or runtimes are required. All changes are within
`hooks/` and `bin/` using only `node:child_process`, `node:fs`, `node:os`, and `node:path`,
which are Node 20 built-ins already in use.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run tests/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APR-04 (SC-1) | start-relay.cjs spawns relay with file-based stdout, not 'ignore' | unit | `npx vitest run tests/relay-stdio.test.cjs` | Wave 0 |
| APR-04 (SC-2) | approval response written by relay daemon reaches /tmp response file | integration | `npx vitest run tests/relay-stdio.test.cjs` | Wave 0 |
| APR-04 (SC-3) | pde-tools poll-approval returns response when file contains matching line | unit | `npx vitest run tests/relay-stdio.test.cjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/relay-stdio.test.cjs --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/relay-stdio.test.cjs` — covers APR-04 (SC-1, SC-2, SC-3); test IDs RS-01, RS-02, RS-03
- [ ] No framework install needed — vitest already installed at project root

## Sources

### Primary (HIGH confidence)
- Direct file read: `hooks/start-relay.cjs` — confirmed `stdio: 'ignore'` at lines 79-83
- Direct file read: `bin/lib/relay.cjs` — confirmed `process.stdout.write(...)` at lines 437-445
- Direct file read: `.planning/v0.17-MILESTONE-AUDIT.md` — APR-04 integration gap evidence
- Direct file read: `bin/pde-tools.cjs` — confirmed no `poll-approval` or approval gate command exists
- Local Node.js verification (node --version v20.20.0): fd-based spawn stdio with detached+unref confirmed working
- Direct file read: `vitest.config.ts` — confirmed test include glob and globals:true setting

### Secondary (MEDIUM confidence)
- Project STATE.md decision log: `[Phase 134]: Relay daemon spawned with detached:true + stdio:ignore + child.unref() so hook exits immediately` — confirms original design intent
- Phase 137 CONTEXT.md D-04/D-05: relay polls Upstash and writes response to stdout — confirms intended IPC channel

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all built-ins, all already in use, directly verified
- Architecture: HIGH — bug confirmed via source read + local test; fix pattern verified working
- Pitfalls: HIGH — derived from reading actual spawn semantics (Node 20 docs + local test)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (Node.js spawn stdio is a stable API; no version changes expected)
