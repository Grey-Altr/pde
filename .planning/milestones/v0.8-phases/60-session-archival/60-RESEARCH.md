# Phase 60: Session Archival — Research

**Researched:** 2026-03-20
**Domain:** Node.js NDJSON aggregation, Claude Code SessionEnd hooks, file system operations (cross-platform macOS/Linux)
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HIST-01 | SessionEnd triggers generation of structured markdown summary in `.planning/logs/` | SessionEnd hook already fires synchronously (async: false); add second hook entry or extend emit-event.cjs to call archiver — see Architecture Patterns §Pattern 1 |
| HIST-02 | Session summaries include duration, event count, agents spawned, commits made, phase/plan progress | NDJSON aggregation via Node.js fs.readFileSync loop; session_start_ts stored in config.json for duration; git log --since for commits — see §Code Examples |
| HIST-03 | Raw NDJSON stored in /tmp with 7-day cleanup at SessionStart | Node.js fs.statSync-based age check at SessionStart; os.tmpdir() for cross-platform path — see §Architecture Patterns §Pattern 3 |
| HIST-04 | Session log files named with ISO timestamp and session ID | `YYYY-MM-DDTHH-MM-SS-{session_id}.md` format — colons not safe in filenames; see §Architecture Patterns §Pattern 2 |
</phase_requirements>

---

## Summary

Phase 60 adds session archival to the PDE event infrastructure. At SessionEnd, a Node.js script reads the session's NDJSON file from `os.tmpdir()`, aggregates metrics (event count, agent count, commit count, duration), and writes a markdown summary to `.planning/logs/`. At SessionStart, NDJSON files older than 7 days are deleted. Both hooks run synchronously (`async: false`) so the archiver completes before the Claude Code process exits.

The core implementation is a new Node.js hook script (`hooks/archive-session.cjs`) added as a second hook handler on SessionEnd in `hooks/hooks.json`. This script reads `config.json` for the session ID and start timestamp, reads the NDJSON file, aggregates metrics, counts git commits via `child_process.spawnSync`, and writes the markdown. A second new script (`hooks/cleanup-old-sessions.cjs`) runs at SessionStart to delete stale NDJSON files using `fs.statSync().mtimeMs` comparison (cross-platform, no `find` dependency).

**Primary recommendation:** Implement as two new `.cjs` hook scripts registered in `hooks/hooks.json`. No new commands or workflows needed. The `.planning/logs/` directory is created on first write using `fs.mkdirSync({ recursive: true })`. Session start timestamp is stored in `config.json` alongside `session_id` in the existing `session-start` case in `pde-tools.cjs`.

---

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Node.js | 18+ (project standard) | NDJSON aggregation, markdown generation, file system ops | Already project runtime; zero-dep; CJS modules match existing pattern |
| fs module (Node.js built-in) | built-in | Read NDJSON, write markdown, mkdirSync for `.planning/logs/` | No external deps; synchronous API matches hook requirement |
| child_process.spawnSync | built-in | Count git commits made during session | Same pattern used in emit-event.cjs for pde-tools.cjs calls |
| os.tmpdir() | built-in | Cross-platform temp directory resolution | Phase 58 established: macOS returns `/var/folders/...`, NOT `/tmp` |
| crypto.randomUUID | built-in | Not needed here — session ID already in config.json | — |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| path.join | built-in | Construct NDJSON path and log output path | Always — never string concatenate paths |
| Date.toISOString() | built-in | Generate ISO timestamp for filename and summary | Standard; produces UTC time string |
| JSON.parse | built-in | Parse each NDJSON line in the aggregation loop | With try/catch per line — corrupt lines must not abort summary |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node.js for aggregation | bash awk/sed | awk cannot reliably parse JSON; bash loop with jq invocation per line is too slow for large sessions |
| fs.statSync for age check | `find -mtime +7` | `find` behavior differs between BSD (macOS) and GNU (Linux); Node.js `statSync().mtimeMs` is identical on both platforms |
| Adding to hooks/hooks.json | Modifying emit-event.cjs | Adding a separate hook script keeps archival concerns isolated; emit-event.cjs stays focused on event writing |
| Storing session_start_ts in config.json | Reading from NDJSON first event | NDJSON may not have a `session_start` event type in the current schema; config.json is authoritative session state |

**Installation:** No new packages. Pure Node.js built-ins only. Zero-npm constraint honored.

---

## Architecture Patterns

### Recommended File Structure

```
hooks/
├── emit-event.cjs               # EXISTING — do not modify
├── archive-session.cjs          # NEW: SessionEnd archiver
└── cleanup-old-sessions.cjs     # NEW: SessionStart cleanup

.planning/
└── logs/                        # NEW: created by archive-session.cjs on first write
    └── {ISO-timestamp}-{session-id}.md  # NEW: generated at each SessionEnd

bin/pde-tools.cjs                # MODIFY: session-start case adds session_start_ts to config.json

hooks/hooks.json                 # MODIFY: add archive-session.cjs to SessionEnd, cleanup to SessionStart
```

### Pattern 1: hooks.json Registration

**What:** Two new hooks registered — one on SessionStart (cleanup), one on SessionEnd (archiver). Both `async: false` so they complete before the process exits.

**When to use:** Always — both hooks must be synchronous.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs", "async": false },
          { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/cleanup-old-sessions.cjs", "async": false }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs", "async": false },
          { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/archive-session.cjs", "async": false }
        ]
      }
    ]
  }
}
```

**Verified:** Claude Code hooks.json allows multiple hooks within a single matcher group. All hooks in a group run. Source: Claude Code official docs (code.claude.com/docs/en/hooks).

### Pattern 2: File Naming (HIST-04)

**What:** ISO timestamp with colons replaced by hyphens (colons are invalid in macOS/Windows filenames), followed by session ID.

**Format:** `YYYY-MM-DDTHH-MM-SS-{session-id}.md`

**Example:** `2026-03-20T11-16-27-170d5f22-5afd-44ed-ab9d-870594588b11.md`

```javascript
// Source: Node.js built-ins, macOS filename constraints
const ts = new Date().toISOString()
  .replace(/:/g, '-')   // colons invalid in macOS/Windows filenames
  .replace(/\..+$/, ''); // strip milliseconds: 2026-03-20T11-16-27
const filename = `${ts}-${sessionId}.md`;
const logDir = path.join(projectRoot, '.planning', 'logs');
fs.mkdirSync(logDir, { recursive: true }); // idempotent; no-op if exists
const logPath = path.join(logDir, filename);
```

**Why colons are unsafe:** POSIX allows colons in filenames, but macOS HFS+/APFS uses `:` as the path separator internally and replaces it with `/` in Finder — producing corrupted paths. Safe to replace with `-` for cross-platform compatibility.

### Pattern 3: NDJSON Aggregation (HIST-02)

**What:** Read the session's NDJSON file line by line, parse each event, accumulate metrics. Corrupt lines are skipped without aborting.

**When to use:** In archive-session.cjs at SessionEnd.

```javascript
// Source: Node.js fs built-in — proven pattern from validate-events.sh (Phase 58)
const os = require('os');
const fs = require('fs');
const path = require('path');

function aggregateSession(sessionId) {
  const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);

  let eventCount = 0;
  let agentCount = 0;
  let sessionStartTs = null;
  let sessionEndTs = null;
  const changedFiles = new Set();

  if (!fs.existsSync(ndjsonPath)) {
    return { eventCount: 0, agentCount: 0, changedFiles: 0, sessionStartTs: null, sessionEndTs: null };
  }

  const content = fs.readFileSync(ndjsonPath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    let ev;
    try { ev = JSON.parse(line); } catch { continue; } // skip corrupt lines

    eventCount++;

    if (ev.event_type === 'session_start' && !sessionStartTs) sessionStartTs = ev.ts;
    if (ev.event_type === 'session_end') sessionEndTs = ev.ts;
    if (ev.event_type === 'subagent_start') agentCount++;
    if (ev.event_type === 'file_changed' && ev.file_path) changedFiles.add(ev.file_path);
  }

  return { eventCount, agentCount, changedFiles: changedFiles.size, sessionStartTs, sessionEndTs };
}
```

**Important note:** The `session_start` event may not always be in the NDJSON file if the SessionStart hook runs before the NDJSON file is created, or if the session_id hasn't been written to config.json yet. Use `config.json monitoring.session_start_ts` as the authoritative source for session start time (see Pattern 5).

### Pattern 4: NDJSON Cleanup at SessionStart (HIST-03)

**What:** At SessionStart, delete NDJSON files in `os.tmpdir()` that are older than 7 days. Uses `fs.statSync().mtimeMs` — cross-platform, no `find` dependency.

**When to use:** In cleanup-old-sessions.cjs, registered as SessionStart hook.

```javascript
// Source: Node.js fs built-in — cross-platform (macOS + Linux verified)
const os = require('os');
const fs = require('fs');
const path = require('path');

function cleanupOldSessions() {
  const tmpdir = os.tmpdir();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - sevenDaysMs;

  let deleted = 0;
  try {
    const files = fs.readdirSync(tmpdir)
      .filter(f => f.startsWith('pde-session-') && f.endsWith('.ndjson'));

    for (const file of files) {
      const fullPath = path.join(tmpdir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(fullPath);
          deleted++;
        }
      } catch { /* file may have been deleted by another process — ignore */ }
    }
  } catch { /* tmpdir not readable — ignore */ }

  return deleted;
}
```

### Pattern 5: Session Duration via config.json Timestamp

**What:** Store `session_start_ts` in `config.json` at SessionStart time. Read it at SessionEnd to compute duration.

**Why:** The session_start event in NDJSON may not align with the actual Claude Code session start. The config.json is written synchronously at SessionStart (pde-tools session-start is `async: false`).

**Modification to `pde-tools.cjs` session-start case:**

```javascript
case 'session-start': {
  const { randomUUID } = require('crypto');
  const newSessionId = randomUUID();
  const startTs = new Date().toISOString(); // ADD THIS
  const configPath = path.join(cwd, '.planning', 'config.json');
  try {
    let cfg = {};
    try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch {}
    if (!cfg.monitoring) cfg.monitoring = {};
    cfg.monitoring.session_id = newSessionId;
    cfg.monitoring.session_start_ts = startTs; // ADD THIS
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch { /* swallow */ }
  break;
}
```

**Duration computation in archive-session.cjs:**

```javascript
function computeDuration(startTs, endTs) {
  if (!startTs || !endTs) return 'unknown';
  const ms = new Date(endTs) - new Date(startTs);
  if (ms < 0) return 'unknown';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
```

### Pattern 6: Git Commit Count for Session

**What:** Count commits made during a session using `git log --since=<session_start_ts>`.

**When to use:** In archive-session.cjs after reading session_start_ts from config.json.

```javascript
// Source: git documentation — --since accepts ISO 8601 format
const { spawnSync } = require('child_process');

function countSessionCommits(projectRoot, sessionStartTs) {
  if (!sessionStartTs) return 0;
  try {
    const result = spawnSync('git', [
      'log',
      `--since=${sessionStartTs}`,
      '--oneline',
      '--no-walk=sorted', // prevent traversal beyond date boundary
    ], {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 3000,
    });
    if (result.status !== 0) return 0;
    return result.stdout.trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}
```

**Note:** `git log --since` accepts ISO 8601 timestamps (e.g., `2026-03-20T11:16:27.000Z`). Tested: returns correct count on this project.

### Pattern 7: Markdown Summary Template (HIST-02)

**What:** The generated markdown structure. Must be human-readable and machine-parseable via the existing `history-digest` command in pde-tools.cjs.

```markdown
# PDE Session Summary

**Session ID:** {session_id}
**Date:** {YYYY-MM-DD}
**Duration:** {Xm Ys}

## Metrics

| Metric | Value |
|--------|-------|
| Total events | {N} |
| Agents spawned | {N} |
| Files changed | {N} |
| Commits made | {N} |

## Phase / Plan Progress

{phase_progress_text or "No phase/plan events recorded this session."}

## Notes

*Raw NDJSON: {ndjson_path}*
*Generated: {ISO_timestamp}*
```

**Why this structure:** Matches the existing `summary-extract` command's frontmatter-based extraction pattern. The table format is consistent with SUMMARY.md files throughout the project.

### Anti-Patterns to Avoid

- **Blocking on NDJSON write before reading:** The SessionEnd hook fires before the `session_end` event is fully flushed. The archiver should read what's in the NDJSON file and not wait for additional events — the `session_end` event is written by emit-event.cjs which runs BEFORE archive-session.cjs in the hooks array.
- **Using `/tmp` directly:** Must use `os.tmpdir()` — macOS returns `/var/folders/...` not `/tmp`. Phase 58 established this as a hard invariant.
- **Blocking on git failure:** `git log` can fail if the project is not a git repo, if git is not installed, or if the project root is wrong. Always wrap in try/catch and default to 0 commits.
- **Failing loudly:** Like all PDE hooks, archive-session.cjs must always `process.exit(0)` — never throw unhandled errors that could affect Claude Code's exit.
- **Using ISO timestamp with colons in filenames:** Replace `:` with `-`. Colons cause path ambiguity on macOS (HFS+ path separator) and are invalid on Windows (FAT/NTFS).
- **Assuming `.planning/logs/` exists:** Use `fs.mkdirSync(logDir, { recursive: true })` — this is idempotent and creates the directory tree if needed.
- **Reading NDJSON before the session_end event is appended:** The hook order in hooks.json matters. emit-event.cjs (which writes session_end to NDJSON) is listed first, archive-session.cjs second. Both are synchronous spawnSync calls in series, so emit-event.cjs completes before archive-session.cjs starts. The NDJSON will contain session_end when the archiver reads it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform file age check | `find -mtime +7` or platform-specific stat calls | `fs.statSync().mtimeMs` compared to `Date.now() - 7*24*60*60*1000` | BSD find and GNU find have different `-mtime` rounding behaviors; Node.js stat is identical on macOS and Linux |
| JSON line parsing with error recovery | Regex-based JSON extraction | `try { JSON.parse(line) } catch { continue }` loop | Regex cannot handle all valid JSON; try/catch per line is the correct NDJSON reading pattern |
| Duration formatting | moment.js or date-fns | Simple arithmetic: `Math.floor(ms/60000)` + `Math.floor((ms%60000)/1000)` | No npm; millisecond arithmetic is trivial |
| Directory creation | Manual `fs.mkdirSync` chain | `fs.mkdirSync(path, { recursive: true })` | The `recursive` option is idempotent, creates all parent dirs, available since Node.js 10 |
| Session start time tracking | Reading first NDJSON line timestamp | `config.json monitoring.session_start_ts` written at SessionStart | NDJSON first event may be a test event, not a true session_start; config.json is the authoritative session state store |

**Key insight:** The entire archiver is `readFileSync` + JSON.parse loop + spawnSync git + writeFileSync. Under 100 lines of Node.js. The complexity is in error handling and hook ordering, not the aggregation logic.

---

## Common Pitfalls

### Pitfall 1: Hook Execution Order Within SessionEnd

**What goes wrong:** archive-session.cjs tries to read the NDJSON file before the session_end event has been written to it by emit-event.cjs.

**Why it happens:** If archive-session.cjs were listed BEFORE emit-event.cjs in the SessionEnd hook array, it would read a NDJSON file missing the final session_end event.

**How to avoid:** In hooks.json, list emit-event.cjs first, archive-session.cjs second in the hooks array. Both are synchronous (`async: false` meaning `spawnSync` from emit-event.cjs). The Claude Code documentation confirms hooks within a group run sequentially. Verify by checking that the generated markdown shows `session_end` event in the count.

**Warning signs:** Session summary event count is unexpectedly low (no session_end event counted).

### Pitfall 2: Session Start Time Not Available

**What goes wrong:** archive-session.cjs cannot compute session duration because `monitoring.session_start_ts` is not in config.json (the existing session-start case only stores session_id).

**Why it happens:** This field needs to be added to pde-tools.cjs session-start case as part of this phase.

**How to avoid:** Modify the session-start case in pde-tools.cjs to write `session_start_ts` to config.json alongside session_id. Use `new Date().toISOString()` at the moment session-start is called (not the SessionStart hook fire time, which is slightly later).

**Warning signs:** Summary shows `Duration: unknown` even when session clearly ran for several minutes.

### Pitfall 3: Missing NDJSON File at SessionEnd

**What goes wrong:** archive-session.cjs tries to read the NDJSON file but it doesn't exist (session was too short, event-bus failed silently, or os.tmpdir() path mismatch).

**Why it happens:** safeAppendEvent swallows all errors silently (Phase 58 design). If the first write failed, the file never exists.

**How to avoid:** Always check `fs.existsSync(ndjsonPath)` before reading. If missing, write a minimal summary with `event_count: 0` and a note "NDJSON file not found — event bus may have failed silently." Never abort summary generation because of a missing NDJSON.

**Warning signs:** No `.planning/logs/` file produced despite a session running.

### Pitfall 4: Git Not Available or Project Not a Git Repo

**What goes wrong:** `spawnSync('git', ['log', ...])` exits non-zero or throws ENOENT.

**Why it happens:** CI environments, Docker containers, or non-git project directories.

**How to avoid:** Wrap in try/catch, check `result.status === 0` and `result.error === null` before parsing output. Default to `0 commits` with no error logged.

**Warning signs:** Summary shows `Commits made: 0` even when commits were clearly made.

### Pitfall 5: cleanup-old-sessions.cjs Deletes the Current Session's File

**What goes wrong:** At SessionStart, the cleanup runs and deletes NDJSON files older than 7 days — but by coincidence (or due to a clock skew), deletes the just-created current session's file.

**Why it happens:** Won't happen if we skip the current session_id's file. The cleanup runs at SessionStart; the NDJSON file for the current session is created by the first event-emit call (which is the session_start event written by emit-event.cjs). Since emit-event.cjs runs first, the current file exists but was just created seconds ago — `mtimeMs < cutoff` will be false.

**How to avoid:** The age check (`mtimeMs < cutoff` for 7 days ago) naturally protects current session files. No additional exclusion logic needed.

**Warning signs:** First session after a gap of 7+ days produces no NDJSON events (file was deleted).

### Pitfall 6: Transcript Path from SessionEnd Payload

**What goes wrong:** The SessionEnd hookData includes `transcript_path` (the Claude Code `.jsonl` conversation file). This could be used to extract session duration or other data, but it is an internal Claude Code file and its schema is undocumented and subject to change.

**Why it happens:** The `transcript_path` field is available in the SessionEnd payload (confirmed: `cwd`, `session_id`, `transcript_path`, `hook_event_name`, `reason` are the documented fields).

**How to avoid:** Do NOT parse `transcript_path`. Use `config.json monitoring.session_start_ts` for duration. The transcript file schema is internal to Claude Code and reading it creates a brittle dependency on undocumented internals.

---

## Code Examples

Verified patterns from Node.js built-ins and project conventions:

### Full archive-session.cjs Structure

```javascript
#!/usr/bin/env node
'use strict';
/**
 * PDE Hook — Session Archiver
 * Triggered by SessionEnd (async: false)
 * Reads NDJSON, aggregates metrics, writes .planning/logs/{ts}-{sid}.md
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  let hookData;
  try { hookData = JSON.parse(raw); } catch { process.exit(0); }

  // Resolve project root from cwd provided by hook
  const projectRoot = hookData.cwd || process.cwd();
  const configPath = path.join(projectRoot, '.planning', 'config.json');

  let sessionId = 'unknown';
  let sessionStartTs = null;
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (cfg.monitoring) {
      sessionId = cfg.monitoring.session_id || 'unknown';
      sessionStartTs = cfg.monitoring.session_start_ts || null;
    }
  } catch { /* config unreadable — use defaults */ }

  // Aggregate NDJSON
  const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
  const metrics = aggregateNdjson(ndjsonPath);

  // Count commits
  const commitCount = countCommits(projectRoot, sessionStartTs);

  // Compute duration
  const sessionEndTs = new Date().toISOString();
  const duration = computeDuration(sessionStartTs, sessionEndTs);

  // Write summary
  writeSummary(projectRoot, sessionId, sessionEndTs, duration, metrics, commitCount, ndjsonPath);

  process.exit(0);
});

// ... (aggregateNdjson, countCommits, computeDuration, writeSummary implementations)
```

### Full cleanup-old-sessions.cjs Structure

```javascript
#!/usr/bin/env node
'use strict';
/**
 * PDE Hook — Old Session Cleanup
 * Triggered by SessionStart (async: false)
 * Deletes NDJSON files older than 7 days from os.tmpdir()
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

process.stdin.resume(); // drain stdin (hooks always pipe in payload)
process.stdin.on('end', () => {
  const tmpdir = os.tmpdir();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - sevenDaysMs;

  try {
    const files = fs.readdirSync(tmpdir)
      .filter(f => f.startsWith('pde-session-') && f.endsWith('.ndjson'));

    for (const file of files) {
      const fullPath = path.join(tmpdir, file);
      try {
        if (fs.statSync(fullPath).mtimeMs < cutoff) {
          fs.unlinkSync(fullPath);
        }
      } catch { /* ignore — file may already be gone */ }
    }
  } catch { /* ignore — tmpdir read failure is non-fatal */ }

  process.exit(0);
});
```

### ISO Filename Generation (HIST-04)

```javascript
// Source: Node.js Date API + macOS filename constraint analysis
function makeLogFilename(sessionId) {
  const ts = new Date().toISOString()
    .replace(/:/g, '-')     // colons are invalid in macOS filenames
    .replace(/\..+$/, '');  // strip milliseconds: 2026-03-20T11-16-27
  return `${ts}-${sessionId}.md`;
}
// Example output: 2026-03-20T11-16-27-170d5f22-5afd-44ed-ab9d-870594588b11.md
```

### Cross-Platform Temp Dir (established in Phase 58)

```javascript
// Source: Phase 58 validate-events.sh — use os.tmpdir() not /tmp directly
const os = require('os');
const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
// macOS: /var/folders/kw/.../T/pde-session-{uuid}.ndjson
// Linux: /tmp/pde-session-{uuid}.ndjson
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Log rotation scripts (`logrotate`) | `fs.statSync().mtimeMs` comparison in hook | Always for this domain | logrotate is Linux-only, requires cron, and is massively over-engineered for "delete tmp files older than 7 days" |
| Session history in DB (SQLite/JSON store) | Flat markdown files in `.planning/logs/` | Project decision | Markdown files are human-readable, git-trackable, and work with existing `history-digest` command in pde-tools.cjs |
| Async log processing pipeline | Synchronous `readFileSync` + `writeFileSync` in hook | Hook constraint | SessionEnd hooks must complete before process exits; async processing would be killed mid-write |

**Deprecated/outdated:**
- `find /tmp -mtime +7 -delete`: BSD find on macOS rounds `-mtime` differently than GNU find; Node.js stat comparison is safer and cross-platform.
- Reading from Claude Code transcript path for session metadata: Transcript schema is undocumented and internal; config.json is the stable state store.

---

## Open Questions

1. **Phase/Plan progress extraction (HIST-02 partial)**
   - What we know: Phase 62 (EVNT-04) will emit semantic workflow events (phase_start/complete, plan_start/complete). Until then, no phase/plan events exist in the NDJSON.
   - What's unclear: Should HIST-02 "phase/plan progress" show N/A until Phase 62, or try to infer from file changes?
   - Recommendation: Write "No phase/plan events recorded this session" for the phase/plan section. The markdown structure should reserve the section for Phase 62's events. Do NOT infer from file changes — that's fragile and wrong.

2. **Hook execution order guarantee**
   - What we know: Claude Code docs say multiple hooks in a group run in parallel. The example shows `script1.sh` and `script2.sh` in the same hooks array.
   - What's unclear: Are hooks truly parallel (concurrent subprocess spawning) or sequential? If parallel, emit-event.cjs and archive-session.cjs could race.
   - Recommendation: **This is the single most important thing to verify at Wave 0.** If hooks run in parallel, the archiver must add a short `setImmediate`/`setTimeout` delay, OR the two hooks must be in separate matcher groups. Alternatively, archive-session.cjs can simply read whatever is in the NDJSON file and note "session_end event not in stream" if the last event is not session_end.
   - Fallback: Put emit-event.cjs and archive-session.cjs in SEPARATE hook groups under SessionEnd. Separate groups are guaranteed to run after each other? This needs empirical verification.

3. **`.planning/logs/` git tracking**
   - What we know: The directory doesn't exist yet and will be created on first SessionEnd.
   - What's unclear: Should session log files be git-tracked? They're generated artifacts, not authored files.
   - Recommendation: Check `.gitignore` for any `*.log` or `logs/` exclusion. If not excluded, logs will be git-tracked by default. Project commit pattern includes `commit_docs: true` which means git tracking of `.planning/` is intentional. Session logs are a form of history documentation — tracking them in git seems consistent. Add a `# Session history logs` comment to `.gitignore` noting they are intentionally NOT excluded.

---

## Validation Architecture

> nyquist_validation is enabled (workflow.nyquist_validation is true in config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bash + Node.js assert (zero deps, matches Phase 58/59 pattern) |
| Config file | none — inline validation via bash script |
| Quick run command | `bash .planning/phases/60-session-archival/validate-archival.sh --quick` |
| Full suite command | `bash .planning/phases/60-session-archival/validate-archival.sh` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | SessionEnd produces file in `.planning/logs/` | integration | Run `node hooks/archive-session.cjs` with fixture payload, check file exists | ❌ Wave 0 |
| HIST-02 | Summary includes duration, event count, agents, commits, phase/plan | unit | Feed fixture NDJSON (known counts) through aggregator, assert each metric | ❌ Wave 0 |
| HIST-03 | Files older than 7 days deleted at SessionStart, newer preserved | unit | Create fixture files with mocked mtimes, run cleanup, assert deleted vs preserved | ❌ Wave 0 |
| HIST-04 | Log filename matches ISO timestamp + session ID pattern | unit | Generate filename, assert regex match `^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-f0-9-]+\.md$` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bash .planning/phases/60-session-archival/validate-archival.sh --quick`
- **Per wave merge:** Full suite command
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `validate-archival.sh` — full validation script
- [ ] Fixture NDJSON file with known event counts (subagent_start x3, file_changed x5, session_start, session_end)
- [ ] Fixture config.json with `monitoring.session_start_ts` for duration computation testing
- [ ] Mocked `mtimeMs` approach for cleanup test (use Node.js to create files with backdated modification time via `fs.utimesSync`)

---

## Sources

### Primary (HIGH confidence)

- Claude Code hooks documentation (code.claude.com/docs/en/hooks) — SessionEnd payload fields (`session_id`, `transcript_path`, `cwd`, `hook_event_name`, `reason`), multiple hooks per event group support, hook execution model
- Phase 58 implementation (bin/lib/event-bus.cjs, hooks/emit-event.cjs, bin/pde-tools.cjs) — NDJSON format, os.tmpdir() pattern, safeAppendEvent pattern, session-start config.json write
- Node.js fs documentation (nodejs.org/api/fs.html) — `mkdirSync({ recursive: true })`, `statSync().mtimeMs`, `readdirSync`, `readFileSync`, `writeFileSync`
- Node.js os documentation — `os.tmpdir()` cross-platform behavior
- Live NDJSON files in `os.tmpdir()` — verified actual event schema: `{schema_version, ts, event_type, session_id, extensions}` plus optional `tool_name`, `file_path`, `agent_type`, `agent_id`
- Git documentation — `git log --since=<ISO timestamp>` accepts ISO 8601 format; verified with `git log --since="2026-03-20T11:16:00" --oneline` returning correct count

### Secondary (MEDIUM confidence)

- macOS filename constraint analysis — colons (`:`) are path separators on HFS+/APFS and produce invalid paths in Finder; replacing with `-` is the established convention
- Verified empirically: `os.tmpdir()` on this macOS machine returns `/var/folders/kw/zg2zqwsn1v5f2z0vg2jy0fzc0000gn/T` not `/tmp`

### Tertiary (LOW confidence — mark for validation)

- Hook execution order (parallel vs sequential within a group): Claude Code docs show multiple hooks in examples but do not explicitly state execution order guarantee. **Must verify empirically at Wave 0** by logging timestamps from two hooks in the same SessionEnd group.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure Node.js built-ins, no external dependencies, consistent with Phase 58/59 patterns
- Architecture: HIGH — based on direct analysis of existing hooks.json, emit-event.cjs, pde-tools.cjs; confirmed hook multi-registration from official docs
- NDJSON aggregation: HIGH — validated against real NDJSON files on disk; event schema confirmed
- Hook execution order: LOW — Claude Code docs do not explicitly specify parallel vs sequential for same-group hooks; empirical verification required
- Pitfalls: HIGH — derived from Phase 58/59 decisions and confirmed via live testing (os.tmpdir, git --since)

**Research date:** 2026-03-20
**Valid until:** 2026-06-20 (Node.js built-in APIs are stable; Claude Code hook schema may change)
