# Phase 197: Cross-Host Session Resume - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase)

<domain>
## Phase Boundary

Agent SDK session .jsonl files are persisted to shared storage so a session started on one machine can be resumed on a different host with matching cwd encoding.

</domain>

<decisions>
## Implementation Decisions

All at Claude's discretion — pure infrastructure phase. Key constraints from research:
- JSONL files at ~/.claude/projects/<sanitized-cwd>/<uuid>.jsonl — sanitization replaces non-alphanumeric with dashes
- Session UUID from SDKSystemMessage.session_id (first event) — captures immediately, survives crashes
- Resume via v1 query({ options: { resume: uuid } }) — NOT unstable v2 API
- cwd portability is file-placement, not content-rewriting — place file in target host's cwd-sanitized dir
- Worktree path is the cwd key, not project root — spawn.cjs uses cwd: worktreePath
- Store claudeSessionId in dispatcher.pids registry for durable mapping
- Max-size guard (e.g., 10MB) with skip-and-warn for large JSONL files

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/dispatcher/lib/coordinator.cjs` — _handleExit receives worktreePath, session lifecycle
- `packages/dispatcher/lib/spawn.cjs` — Spawns claude with cwd: worktreePath, PDE_SESSION_ID env
- `packages/dispatcher/lib/registry.cjs` — Session registry (dispatcher.pids), backend/status fields
- `packages/dispatcher/lib/sync.cjs` — pushPlanningState/fetchPlanningState git sync patterns
- `packages/dispatcher/lib/worktree.cjs` — Worktree creation/removal

### Integration Points
- `coordinator.cjs _handleExit()` — persist JSONL after session completion, before worktree removal
- `coordinator.cjs dispatch()` — restore JSONL before spawn if resuming
- `registry.cjs` — add claudeSessionId field to registry entries
- `spawn.cjs` — capture session_id from first NDJSON event
- `bin/lib/config.cjs` — add shared storage config keys

</code_context>

<specifics>
## Specific Ideas

### cwd Sanitization Function
```javascript
function sanitizeCwd(cwdPath) {
  return cwdPath.replace(/[^a-zA-Z0-9]/g, '-');
}
```

### Session JSONL Persistence
```javascript
async function persistSessionJsonl(worktreePath, claudeSessionId, sharedStoragePath) {
  const sanitized = sanitizeCwd(worktreePath);
  const srcDir = path.join(os.homedir(), '.claude', 'projects', sanitized);
  const srcFile = path.join(srcDir, `${claudeSessionId}.jsonl`);
  if (!fs.existsSync(srcFile)) return { ok: false, reason: 'file_not_found' };
  const stat = fs.statSync(srcFile);
  if (stat.size > 10 * 1024 * 1024) return { ok: false, reason: 'too_large' };
  const destDir = path.join(sharedStoragePath, sanitized);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(srcFile, path.join(destDir, `${claudeSessionId}.jsonl`));
  return { ok: true };
}
```

</specifics>

<deferred>
## Deferred Ideas

- Cloud-based shared storage (S3, GCS) — v0.24 uses git branch or local shared dir
- Session JSONL compression — future optimization
- Automatic session cleanup/TTL for shared storage — future

</deferred>
