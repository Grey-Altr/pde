# Phase 132: Conflict UX and Generation Enhancements — Research

**Researched:** 2026-03-24
**Domain:** Node.js CJS append logging, atomic snapshot writes, PDE CLI skill commands, Cursor .mdc glob patterns, Antigravity SKILL.md generation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INF-06 | Sync audit trail — .planning/logs/SYNC-LOG.md append-only markdown per sync operation; git-committed; trimmed at 500 entries | `appendFileSync` pattern established in `appendConflictLog`; `sync-reconciliation.log` in context-sync.cjs shows exact hook point to add the call |
| INF-07 | Sync rollback — pre-write snapshots in .planning/sync-snapshots/; 30-day auto-cleanup; git-ignored; /pde:sync-rollback restores then calls emitAll() | Write-rename pattern established in writeStateFile; snapshot naming uses ISO timestamp; cleanup is ctime-based fs loop |
| INF-08 | Conflict UX commands — /pde:sync-status: last sync time, monitored files, unresolved conflicts, pending ingest from state file only; /pde:sync-rollback: list + restore + confirm | Both read-only from readStateFile; follow `/pde:context-sync` CLI pattern in cmdContextSync |
| CUR-06 | Enhanced .mdc generation — PDE:BEGIN/PDE:END section markers in each .mdc body; user content below PDE:END preserved across regeneration; improved globs | `writeMdcRule` in emitCursorRules already handles body; read-before-write pattern established by AGR-05 agent additions |
| AGR-06 | Enhanced SKILL.md generation — Workflows section with pipeline completion status from DESIGN-STATE.md; full Constraints from PROJECT.md; exact DTCG token path; pde-skill-version: 1.0 | `emitAntigravitySkill` in context-sync.cjs is the only file to modify; extractPipelineStatus() already parses DESIGN-STATE.md; ir.constraints already available |
</phase_requirements>

---

## Summary

Phase 132 is the final phase of v0.16 Multi-Editor Context Sync. It adds five capabilities to the already-built sync engine: an auditable markdown sync log (INF-06), pre-write file snapshots with rollback (INF-07), two CLI status/rollback commands as PDE skills (INF-08), improved Cursor .mdc generation with PDE:BEGIN/PDE:END markers and better glob patterns (CUR-06), and a richer Antigravity SKILL.md with a Workflows section and exact token paths (AGR-06).

All changes live in `bin/lib/context-sync.cjs` (the single source of truth for sync logic) and the PDE skill command dispatcher. There are no new npm dependencies. The implementation follows patterns already established across phases 126-131: write-rename atomicity (writeStateFile pattern), NDJSON/markdown append (appendConflictLog/sync-reconciliation.log pattern), read-before-write for user content preservation (AGR-05 agent additions pattern), and state-file-only reads for status commands (readStateFile pattern). The DESIGN-STATE.md pipeline status extraction function already exists in context-sync.cjs as `extractPipelineStatus()`.

The only structurally new concept is the snapshot subsystem: before each write-back batch in `reconcileOnStart()` and `ingestAll()`, serialize the files about to be overwritten into `.planning/sync-snapshots/<ISO-timestamp>-<filename>.md`. The snapshot directory is git-ignored and auto-cleaned after 30 days.

**Primary recommendation:** Implement all five requirements in context-sync.cjs, add two new CLI subcommands to `cmdContextSync()`, add `.planning/sync-snapshots/` to `.gitignore`, and add `<!-- pde-skill-version: 1.0 -->` to SKILL.md alongside the new Workflows section.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins (`fs`, `path`, `crypto`, `os`) | Node.js 20+ | File I/O, snapshot writes, cleanup, append logging | Zero-dependency constraint already established in context-sync.cjs |
| `node:test` + `node:assert/strict` | Node.js built-in | Nyquist test framework | Used in all phases 126-131 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fs.appendFileSync` | built-in | Append to SYNC-LOG.md and snapshot file listing | Non-atomic append is acceptable for append-only log |
| `fs.writeFileSync` + `fs.renameSync` | built-in | Atomic snapshot writes | Prevents half-written files on crash |
| `fs.readdirSync` + `fs.statSync` | built-in | Snapshot listing and 30-day cleanup | ctime-based age check |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown SYNC-LOG.md | NDJSON log | Markdown is git-committed and human-readable per INF-06 spec; NDJSON is used for machine-read logs (.sync-conflicts.log) |
| Timestamped flat files in sync-snapshots/ | Single JSON snapshot file | Flat files per batch are easier to list, select, and restore individually |
| PDE skill commands as separate .cjs scripts | Add to cmdContextSync | cmdContextSync already dispatches pde subcommands; consistent pattern, no new files |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended File Structure (additions only)

```
bin/lib/context-sync.cjs          MODIFIED — appendSyncLog, snapshotFilesBeforeBatch,
                                              cleanupOldSnapshots, cmdSyncStatus,
                                              cmdSyncRollback, writeMdcRule (PDE:BEGIN/END),
                                              emitAntigravitySkill (Workflows section)
.gitignore                        MODIFIED — add .planning/sync-snapshots/
.planning/logs/SYNC-LOG.md        NEW (runtime) — append-only per-operation log
.planning/sync-snapshots/         NEW (runtime) — per-batch file backups
tests/phase-132/
└── test-conflict-ux.cjs          NEW — Nyquist tests for INF-06, INF-07, INF-08, CUR-06, AGR-06
```

### Pattern 1: appendSyncLog — Markdown Append (INF-06)

**What:** After every sync operation (reconcileOnStart, ingestAll, and MCP write tools), append a structured markdown entry to `.planning/logs/SYNC-LOG.md`. Trim to 500 entries when the count exceeds 500.

**When to use:** Called at the end of every function that produces a write-back or conflict outcome.

**Insertion points in context-sync.cjs:**
- End of `reconcileOnStart()` — after the existing `sync-reconciliation.log` append
- End of `ingestAll()` — after `emitAll(cwd)` returns
- Optionally exposed for handlers.cjs to call from MCP write tools

**Entry format (markdown, not NDJSON — git-committed and human-readable):**

```javascript
// Source: bin/lib/context-sync.cjs — new appendSyncLog() function
function appendSyncLog(planningDir, entry) {
  try {
    var logsDir = path.join(planningDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    var logPath = path.join(logsDir, 'SYNC-LOG.md');

    // Build markdown entry
    var lines = [
      '',
      '## ' + entry.timestamp,
      '',
      '- **Trigger:** ' + entry.trigger,
      '- **Files scanned:** ' + entry.filesScanned,
      '- **Changes:** ' + entry.changes,
      '- **Write-backs:** ' + entry.writeBacks,
      '- **Conflicts:** ' + entry.conflicts,
      '',
    ];
    fs.appendFileSync(logPath, lines.join('\n'), 'utf-8');

    // Trim to 500 entries: count ## headings, rewrite if over limit
    trimSyncLog(logPath, 500);
  } catch (err) {
    process.stderr.write('[context-sync] sync log write error: ' + err.message + '\n');
  }
}
```

**Trim implementation:** Read the file, split on `\n## `, keep the last 500 blocks, rejoin and rewrite atomically. A `## ` heading count proxy avoids full markdown parsing.

```javascript
function trimSyncLog(logPath, maxEntries) {
  try {
    var content = fs.readFileSync(logPath, 'utf-8');
    // Split on entry boundary (## followed by timestamp)
    var parts = content.split(/\n(?=## )/);
    if (parts.length <= maxEntries) return;
    var trimmed = parts.slice(parts.length - maxEntries).join('\n');
    // Add header if needed
    if (!trimmed.startsWith('# ')) {
      trimmed = '# Sync Log\n' + trimmed;
    }
    var tmpPath = logPath + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmpPath, trimmed, 'utf-8');
    fs.renameSync(tmpPath, logPath);
  } catch { /* non-fatal */ }
}
```

### Pattern 2: snapshotFilesBeforeBatch (INF-07)

**What:** Before any write-back to PROJECT.md or design-manifest.json in a sync batch, read the current file content and write it to `.planning/sync-snapshots/<ISO>-<safe-filename>`.

**When to use:** Called at the start of each write-back loop in `reconcileOnStart()` and `ingestAll()`, before `replaceSectionInFile()` or `writeBackDesignTokens()` executes.

**Naming convention:** `<ISO-timestamp-safe>-<relative-path-safe>` where path slashes become dashes.
- Example: `2026-03-24T21-00-00-000Z-planning-PROJECT.md`

```javascript
// Source: new snapshotFilesBeforeBatch() in context-sync.cjs
function snapshotFilesBeforeBatch(cwd, filePaths) {
  var snapshotDir = path.join(cwd, '.planning', 'sync-snapshots');
  try {
    fs.mkdirSync(snapshotDir, { recursive: true });
    var ts = new Date().toISOString().replace(/[:.]/g, '-');
    for (var i = 0; i < filePaths.length; i++) {
      var absPath = path.join(cwd, filePaths[i]);
      var content;
      try { content = fs.readFileSync(absPath, 'utf-8'); } catch { continue; }
      var safeName = filePaths[i].replace(/[/\\]/g, '-').replace(/^-/, '');
      var snapshotPath = path.join(snapshotDir, ts + '-' + safeName);
      fs.writeFileSync(snapshotPath, content, 'utf-8');
    }
    // Auto-cleanup old snapshots (30 days)
    cleanupOldSnapshots(snapshotDir, 30);
  } catch { /* non-fatal — snapshot failure must not block write-back */ }
}

function cleanupOldSnapshots(snapshotDir, maxDays) {
  try {
    var files = fs.readdirSync(snapshotDir);
    var cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
    for (var i = 0; i < files.length; i++) {
      var fp = path.join(snapshotDir, files[i]);
      var stat = fs.statSync(fp);
      if (stat.ctimeMs < cutoff) {
        fs.unlinkSync(fp);
      }
    }
  } catch { /* non-fatal */ }
}
```

**Files to snapshot before each batch:**
- `.planning/PROJECT.md` — always (techStack, constraints write-back target)
- `.planning/design/design-manifest.json` — when DESIGN.md write-back triggers

### Pattern 3: cmdSyncStatus (INF-08) — State-File-Only Read

**What:** `/pde:sync-status` subcommand. Reads `readStateFile()` only — no file scanning, no fs.statSync calls. Displays: last sync time, monitored files list, unresolved conflicts count, pending ingest queue.

**Unresolved conflicts count:** Read `.planning/.sync-conflicts.log` lines, count entries where `pendingResolution === true`. This is the only file read beyond the state file — needed because the state file does not currently store conflict count. Alternative: add `unresolvedConflicts` counter to the state file in writeStateFile(). The simpler approach is reading the conflicts log line count.

**Simplest correct implementation:** Count all NDJSON lines in `.sync-conflicts.log` that have `"pendingResolution":true`. If the file does not exist, count is 0.

```javascript
// Source: new cmdSyncStatus() in context-sync.cjs
function cmdSyncStatus(cwd) {
  var planningDir = path.join(cwd, '.planning');
  var state = readStateFile(planningDir);

  if (!state) {
    process.stdout.write('No sync state found. Run emitAll() first.\n');
    return;
  }

  // Count unresolved conflicts from .sync-conflicts.log
  var unresolvedCount = 0;
  try {
    var logContent = fs.readFileSync(path.join(planningDir, '.sync-conflicts.log'), 'utf-8');
    logContent.split('\n').forEach(function(line) {
      if (!line.trim()) return;
      try {
        var entry = JSON.parse(line);
        if (entry.pendingResolution) unresolvedCount++;
      } catch { /* skip malformed lines */ }
    });
  } catch { /* file may not exist */ }

  var lines = [
    '=== PDE Sync Status ===',
    'Last sync:          ' + (state.lastEmittedAt || 'never'),
    'Source hash:        ' + (state.lastSourceHash ? state.lastSourceHash.slice(0, 12) + '...' : 'none'),
    'Unresolved conflicts: ' + unresolvedCount,
    'Pending ingest:     ' + ((state.pendingIngest || []).length) + ' file(s)',
    '',
    'Monitored files (' + MONITORED_FILES.length + '):',
  ];
  MONITORED_FILES.forEach(function(entry) {
    lines.push('  - ' + entry.path);
  });
  if ((state.pendingIngest || []).length > 0) {
    lines.push('');
    lines.push('Pending ingest queue:');
    state.pendingIngest.forEach(function(item) {
      lines.push('  - ' + item.path + ' (detected: ' + item.detectedAt + ')');
    });
  }
  process.stdout.write(lines.join('\n') + '\n');
}
```

### Pattern 4: cmdSyncRollback (INF-08) — List + Restore

**What:** `/pde:sync-rollback` subcommand. Lists snapshots in `.planning/sync-snapshots/` sorted newest-first. With `--restore <filename>`, restores that snapshot file to its original path and calls emitAll().

**Restore logic:** Parse the original path from the snapshot filename by reversing the safe-name encoding (dashes back to slashes). Write snapshot content to original path, then call emitAll(cwd).

```javascript
// Source: new cmdSyncRollback() in context-sync.cjs
function cmdSyncRollback(cwd, args) {
  var snapshotDir = path.join(cwd, '.planning', 'sync-snapshots');
  var restoreIdx = args.indexOf('--restore');

  // List mode (no --restore)
  if (restoreIdx === -1) {
    var files;
    try { files = fs.readdirSync(snapshotDir).sort().reverse(); } catch {
      process.stdout.write('No snapshots found (directory does not exist).\n');
      return;
    }
    if (files.length === 0) {
      process.stdout.write('No snapshots available.\n');
      return;
    }
    process.stdout.write('Available snapshots (' + files.length + '):\n');
    files.slice(0, 20).forEach(function(f) { process.stdout.write('  ' + f + '\n'); });
    if (files.length > 20) process.stdout.write('  ... and ' + (files.length - 20) + ' more\n');
    process.stdout.write('\nRestore with: pde sync-rollback --restore <filename>\n');
    return;
  }

  // Restore mode
  var snapshotName = args[restoreIdx + 1];
  if (!snapshotName) {
    process.stdout.write('Usage: pde sync-rollback --restore <filename>\n');
    return;
  }
  var snapshotPath = path.join(snapshotDir, snapshotName);
  var content;
  try { content = fs.readFileSync(snapshotPath, 'utf-8'); } catch {
    process.stdout.write('Snapshot not found: ' + snapshotName + '\n');
    return;
  }

  // Decode original path: strip timestamp prefix (first field), restore slashes
  // Format: <ISO-safe-ts>-<safe-path> where safe-path has / replaced by -
  // Strategy: find first match in WRITE_BACK_TARGETS by suffix comparison
  var originalPath = decodeSnapshotPath(cwd, snapshotName);
  if (!originalPath) {
    process.stdout.write('Could not decode original path from snapshot name: ' + snapshotName + '\n');
    return;
  }

  fs.writeFileSync(originalPath, content, 'utf-8');
  process.stdout.write('Restored: ' + snapshotName + ' -> ' + originalPath + '\n');
  emitAll(cwd);
  process.stdout.write('emitAll() completed after rollback.\n');
}
```

**Path decoding:** The snapshot naming scheme must be designed so the original path can be recovered. The cleanest approach is to store the relative path as a suffix after the timestamp, with a separator that cannot appear in paths. Use a double-dash `--` as separator: `<ts>--<relative-path-with-dashes>`. Since relative paths use `/`, replace `/` with `+` (not `-`) in the encoded name to allow unambiguous decode.

Revised naming: `<ISO-safe>--<path-with-plus-for-slashes>` → decode: strip timestamp prefix up to `--`, replace `+` with `/`.

Example: `2026-03-24T21-00-00-000Z--.planning+PROJECT.md`

### Pattern 5: PDE:BEGIN/PDE:END in writeMdcRule (CUR-06)

**What:** Wrap PDE-generated body content with `<!-- PDE:BEGIN -->` and `<!-- PDE:END -->` markers. Before writing, read the existing .mdc file and extract any content below PDE:END to preserve it.

**Existing behavior (current writeMdcRule):** Writes frontmatter + header + body. No section markers. No user content preservation.

**New behavior:**
1. Before write: read existing .mdc file, extract content after `<!-- PDE:END -->` as `userContent`
2. Write: frontmatter + header + `<!-- PDE:BEGIN -->\n` + body + `\n<!-- PDE:END -->\n` + userContent

This exactly mirrors the AGR-05 agent additions pattern already implemented in `emitAntigravitySkill()`.

```javascript
// Source: modified writeMdcRule() in context-sync.cjs
function writeMdcRule(rulesDir, filename, opts) {
  var filePath = path.join(rulesDir, filename);

  // CUR-06: Preserve user content below PDE:END
  var userContent = '';
  try {
    var existing = fs.readFileSync(filePath, 'utf-8');
    var endIdx = existing.indexOf('<!-- PDE:END -->');
    if (endIdx !== -1) {
      userContent = existing.slice(endIdx + '<!-- PDE:END -->'.length);
    }
  } catch { /* file does not exist yet */ }

  var parts = ['---'];
  parts.push('description: ' + opts.description);
  if (opts.globs) parts.push('globs: ' + opts.globs);
  parts.push('alwaysApply: ' + opts.alwaysApply);
  parts.push('---');
  parts.push('');
  parts.push(opts.header);
  parts.push('');
  parts.push('<!-- PDE:BEGIN -->');
  parts.push(opts.body);
  parts.push('<!-- PDE:END -->');

  var content = parts.join('\n');
  if (userContent) {
    content += userContent;  // preserve exactly, no trim (mirrors AGENT_MARKER pattern)
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}
```

**Improved globs (CUR-06):**

| File | Current glob | New glob |
|------|-------------|---------|
| `pde-design-tokens.mdc` | `*.css,*.scss,*.tsx,*.jsx` | `**.{css,scss,tsx,jsx,ts}` |
| `pde-components.mdc` | `src/components/**` | `**.{tsx,jsx,stories.tsx,test.tsx}` |
| `pde-architecture.mdc` | `src/**` | `src/**` (no change) |

The `**.{ext,ext}` brace expansion syntax is valid in Cursor's glob engine (same as glob standard). The double-star matches nested directories.

### Pattern 6: Enhanced SKILL.md (AGR-06)

**What:** Add to `emitAntigravitySkill()`:
1. `<!-- pde-skill-version: 1.0 -->` format marker after the PDE-GENERATED header
2. A `## Workflows` section listing pipeline stages with completion status from DESIGN-STATE.md
3. Replace hardcoded Constraints placeholder with `ir.constraints` (full constraints from PROJECT.md)
4. Replace `'2. Design tokens are in DTCG format at .planning/design/SYS-tokens.json'` with exact path `'.planning/design/design-manifest.json'` (the canonical DTCG source per AGR-04)

**Workflows section generation:** Call a new `extractWorkflows(designState)` function that parses the `## Domain Files` and `## System Status` tables from DESIGN-STATE.md into a completion list. The DESIGN-STATE.md template has `## Domain Files` and `## Decision Log` sections that indicate pipeline stage activity.

```javascript
// Source: new extractWorkflows() in context-sync.cjs
function extractWorkflows(designState) {
  if (!designState) return 'Design pipeline not yet initialized.';

  // Parse Domain Files table for active stages
  var domainSection = extractSection(designState, 'Domain Files');
  var systemSection = extractSection(designState, 'System Status');

  var stages = [];

  // Pipeline stages in order
  var PIPELINE_STAGES = [
    { name: 'System Tokens (/pde:system)', marker: 'SYS' },
    { name: 'Wireframes (/pde:wireframe)', marker: 'WFR' },
    { name: 'Mockups (/pde:mockup)', marker: 'MCK' },
    { name: 'Handoff Specs (/pde:handoff)', marker: 'HND' },
    { name: 'Visual Regression (/pde:visual-regression)', marker: 'VRG' },
  ];

  // Determine completion from Domain Files table rows
  for (var i = 0; i < PIPELINE_STAGES.length; i++) {
    var stage = PIPELINE_STAGES[i];
    var active = domainSection && domainSection.includes(stage.marker);
    stages.push('- ' + (active ? '[x]' : '[ ]') + ' ' + stage.name);
  }

  return stages.join('\n');
}
```

**Full emitAntigravitySkill() update:**

```javascript
// Source: modified emitAntigravitySkill() in context-sync.cjs — AGR-06 additions
var SKILL_VERSION_MARKER = '<!-- pde-skill-version: 1.0 -->';

// In the content array, after makeHeader() line, insert SKILL_VERSION_MARKER.
// In ## Instructions, replace SYS-tokens.json reference with design-manifest.json.
// In ## Constraints, replace hardcoded lines with ir.constraints.
// Add ## Workflows section before ## Constraints.

content = [
  header,
  SKILL_VERSION_MARKER,             // AGR-06: format version marker
  '---',
  'name: pde-design',
  'description: PDE design system context ...',
  '---',
  '',
  '# PDE Design System',
  '',
  '## Goal',
  '',
  'Provide design system context for ' + ir.projectName + ' ...',
  '',
  '## Instructions',
  '',
  '1. Check DESIGN.md at project root for full design DNA (palette, typography, spacing)',
  '2. Design tokens are in DTCG format at .planning/design/design-manifest.json',  // AGR-06: exact path
  '3. Component patterns are documented in handoff specs at .planning/design/handoff/',
  '',
  '## Design Tokens Available',
  '',
  ir.designTokens,
  '',
  '## Component Catalog',
  '',
  ir.componentCatalog,
  '',
  '## Workflows',           // AGR-06: new section
  '',
  extractWorkflows(designState),
  '',
  '## Constraints',
  '',
  ir.constraints,           // AGR-06: full constraints from PROJECT.md (not hardcoded)
  '',
].join('\n');
```

Note: `emitAntigravitySkill()` currently receives `ir` and `projectRoot` only. It calls `extractPipelineStatus(designState)` internally but does not receive `designState` directly. The solution is either:
- Pass `planningDir` to `emitAntigravitySkill()` (preferred — consistent with `emitGeminiMd` signature)
- Or re-read DESIGN-STATE.md inside the function

Since `emitAll()` already passes `planningDir` to other emitters, extending `emitAntigravitySkill(ir, projectRoot, planningDir)` is the correct pattern. `emitAll()` already computes `planningDir`, so passing it through is zero-cost.

### Anti-Patterns to Avoid

- **Scanning files inside cmdSyncStatus:** INF-08 spec says "all from state file, no file scanning required." Do not call `fs.statSync` or read monitored files for status display.
- **Using `--` as separator in snapshot filenames on Windows:** Windows allows `--` in filenames but test coverage is macOS-only here. Use `--` as separator since it cannot appear in ISO timestamps (they use `-`).
- **Trimming SYNC-LOG.md on every append:** Expensive for large files. Only trim when line count exceeds limit. Count `## ` headings as entry proxy instead of full parse.
- **Blocking write-back on snapshot failure:** `snapshotFilesBeforeBatch` must be wrapped in try/catch and never throw. Snapshot failure must not prevent the sync operation.
- **Overwriting PDE:END-terminated user content:** The user content slice must be extracted BEFORE writing. The existing file read must happen before `fs.writeFileSync`.
- **Hardcoding SYS-tokens.json path in SKILL.md:** The canonical DTCG source is `design-manifest.json` per AGR-04 decision. SYS-tokens.json is a Tailwind artifact, not the DTCG source.
- **Calling emitAll() with planningDir instead of cwd:** `emitAll(cwd)` not `emitAll(planningDir)`. Derive `cwd = path.dirname(planningDir)` if needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown section extraction | Custom regex parser | `extractSection(content, sectionName)` already exported from context-sync.cjs | Handles heading detection, next-heading boundary, EOF edge cases |
| State file reading | Direct JSON parse | `readStateFile(planningDir)` already exported | Includes schema version guard, returns null safely |
| emitAll after rollback | Custom multi-emitter call | `emitAll(cwd)` already exported | Handles all 6 emitters + writeStateFile atomically |
| Append-only log | Custom write | `fs.appendFileSync(path, content, 'utf-8')` — exact pattern from `appendConflictLog` (line 1087) | Single-call, non-atomic append is correct for append-only logs |
| Atomic file write for trim | Direct overwrite | `writeFileSync(tmp) + renameSync(tmp, dest)` — from writeStateFile pattern | Prevents corrupt state if process crashes mid-write |
| Pipeline stage detection | String parsing DESIGN-STATE.md | Read the `## Domain Files` table for artifact codes (`SYS`, `WFR`, etc.) | DESIGN-STATE.md is a template; active stages appear as table rows |

**Key insight:** This phase is deliberately "last mile" — the infrastructure is all built. Every new function is a thin wrapper around existing exported functions in context-sync.cjs.

---

## Runtime State Inventory

This is not a rename/refactor phase. Runtime state section is omitted.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | Yes | System node 20+ | — |
| `.planning/logs/` | INF-06 SYNC-LOG.md | Yes (directory exists) | — | mkdirSync fallback if missing |
| `.planning/sync-snapshots/` | INF-07 | No (not yet created) | — | Handler creates on first snapshot write |
| `.planning/.sync-conflicts.log` | INF-08 conflict count | May not exist | — | cmdSyncStatus handles gracefully (count = 0) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- `.planning/sync-snapshots/` — created on first snapshot write via `fs.mkdirSync(..., { recursive: true })`

---

## Common Pitfalls

### Pitfall 1: Snapshot Directory Not Git-Ignored

**What goes wrong:** `.planning/sync-snapshots/` fills with backup files and gets committed to git.
**Why it happens:** New directory without a corresponding `.gitignore` entry.
**How to avoid:** Add `.planning/sync-snapshots/` to `.gitignore` as part of the first task. The current `.gitignore` has exactly two entries — this is the third.
**Warning signs:** `git status` shows many untracked `.planning/sync-snapshots/*.md` files.

### Pitfall 2: SYNC-LOG.md Must Be Git-Committed (Not Git-Ignored)

**What goes wrong:** Adding SYNC-LOG.md to `.gitignore` in the same wave as sync-snapshots.
**Why it happens:** INF-07 says snapshots are git-ignored; INF-06 says SYNC-LOG.md is git-committed. Easy to conflate.
**How to avoid:** The gitignore entry covers only the `sync-snapshots/` directory. SYNC-LOG.md is committed to git.
**Warning signs:** `git status` shows SYNC-LOG.md as untracked rather than modified.

### Pitfall 3: User Content Below PDE:END Includes Trailing Newline from Previous Generation

**What goes wrong:** User content extraction includes a leading newline from the `<!-- PDE:END -->` marker line, causing double-newlines between PDE:END and user content.
**Why it happens:** `existing.slice(endIdx + '<!-- PDE:END -->'.length)` includes the `\n` after the closing marker.
**How to avoid:** Mirror the AGENT_MARKER pattern exactly: `existing.slice(markerIdx + AGENT_MARKER.length)` in `emitAntigravitySkill` never trims — the same applies here. The extracted userContent already starts with `\n`. The `parts.push('<!-- PDE:END -->')` provides the last newline before userContent, so the concatenation is correct.
**Warning signs:** Extra blank line between PDE:END and user content on second generation.

### Pitfall 4: emitAntigravitySkill Signature Change Breaks emitAll

**What goes wrong:** Adding `planningDir` parameter to `emitAntigravitySkill(ir, projectRoot, planningDir)` without updating the call in `emitAll()`.
**Why it happens:** Function signature change requires call site update — the call in `emitAll()` at line 1155 passes only `(ir, projectRoot)`.
**How to avoid:** Update `emitAll()` to pass `planningDir` as the third argument. `planningDir` is computed at the top of `emitAll()` and already passed to `emitGeminiMd` and `emitDesignMd`.
**Warning signs:** Workflows section shows "Design pipeline not yet initialized." even when DESIGN-STATE.md has content.

### Pitfall 5: Snapshot Path Decode Fails for Nested Paths

**What goes wrong:** `.planning/design/design-manifest.json` encoded as `planning-design-design-manifest.json` — ambiguous (dashes in path vs. separator dashes).
**Why it happens:** Simple `/` → `-` substitution creates collisions.
**How to avoid:** Use `+` (not `-`) as the path separator in snapshot filenames: `.planning/design/design-manifest.json` → `.planning+design+design-manifest.json`. The double-dash `--` separates timestamp from path: `2026-03-24T21-00-00Z--.planning+PROJECT.md`.
**Warning signs:** Rollback restores to wrong file path.

### Pitfall 6: SYNC-LOG.md Trim Corrupts File If Entry Spans Multiple Lines

**What goes wrong:** Splitting on `\n## ` breaks if a sync log entry body contains `\n## ` (e.g., a conflict value containing a markdown heading).
**Why it happens:** Conflict values are user-provided strings that may contain any content.
**How to avoid:** Log entries must not echo user-provided values verbatim. Log only counts (filesScanned, changes, conflicts) and the trigger name — never raw field values.
**Warning signs:** trimSyncLog produces a corrupted file with entries split mid-way.

---

## Code Examples

### appendSyncLog — Full Implementation

```javascript
// Source: new function in bin/lib/context-sync.cjs
function appendSyncLog(planningDir, entry) {
  // entry: { trigger, filesScanned, changes, writeBacks, conflicts }
  try {
    var logsDir = path.join(planningDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    var logPath = path.join(logsDir, 'SYNC-LOG.md');

    var ts = new Date().toISOString();
    var block = [
      '',
      '## ' + ts,
      '',
      '- **Trigger:** ' + (entry.trigger || 'unknown'),
      '- **Files scanned:** ' + (entry.filesScanned || 0),
      '- **Changes detected:** ' + (entry.changes || 0),
      '- **Write-backs:** ' + (entry.writeBacks || 0),
      '- **Conflicts:** ' + (entry.conflicts || 0),
      '',
    ].join('\n');

    fs.appendFileSync(logPath, block, 'utf-8');
    trimSyncLog(logPath, 500);
  } catch (err) {
    process.stderr.write('[context-sync] sync log error: ' + String(err.message) + '\n');
  }
}

function trimSyncLog(logPath, maxEntries) {
  try {
    var content = fs.readFileSync(logPath, 'utf-8');
    var entries = content.split(/\n(?=## )/);
    if (entries.length <= maxEntries) return;
    var kept = entries.slice(entries.length - maxEntries);
    var trimmed = kept.join('\n');
    if (!trimmed.startsWith('# ')) {
      trimmed = '# Sync Log\n\n' + trimmed;
    }
    var tmpPath = logPath + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmpPath, trimmed, 'utf-8');
    fs.renameSync(tmpPath, logPath);
  } catch { /* non-fatal */ }
}
```

### snapshotFilesBeforeBatch — Full Implementation

```javascript
// Source: new function in bin/lib/context-sync.cjs
// WRITE_BACK_FILES: relative paths from cwd that are write-back targets
var WRITE_BACK_FILES = [
  '.planning/PROJECT.md',
  '.planning/design/design-manifest.json',
];

function snapshotFilesBeforeBatch(cwd) {
  var snapshotDir = path.join(cwd, '.planning', 'sync-snapshots');
  try {
    fs.mkdirSync(snapshotDir, { recursive: true });
    var ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    for (var i = 0; i < WRITE_BACK_FILES.length; i++) {
      var relPath = WRITE_BACK_FILES[i];
      var absPath = path.join(cwd, relPath);
      var content;
      try { content = fs.readFileSync(absPath, 'utf-8'); } catch { continue; }
      // Encode path: replace / with +, use -- as separator after timestamp
      var encoded = relPath.replace(/\//g, '+');
      var snapshotName = ts + '--' + encoded;
      var snapshotPath = path.join(snapshotDir, snapshotName);
      fs.writeFileSync(snapshotPath, content, 'utf-8');
    }
    cleanupOldSnapshots(snapshotDir, 30);
  } catch { /* snapshot failure must never block write-back */ }
}

function cleanupOldSnapshots(snapshotDir, maxDays) {
  try {
    var cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
    var files = fs.readdirSync(snapshotDir);
    files.forEach(function(f) {
      var fp = path.join(snapshotDir, f);
      try {
        if (fs.statSync(fp).ctimeMs < cutoff) fs.unlinkSync(fp);
      } catch { /* skip */ }
    });
  } catch { /* non-fatal */ }
}
```

### cmdContextSync routing additions (INF-08)

```javascript
// Source: modified cmdContextSync() in bin/lib/context-sync.cjs
// Add before the existing --ingest check:
if (args[0] === 'sync-status') {
  cmdSyncStatus(cwd);
  return;
}
if (args[0] === 'sync-rollback') {
  cmdSyncRollback(cwd, args.slice(1));
  return;
}
```

These are invoked via PDE skill commands:
- `/pde:sync-status` → `pde context-sync sync-status`
- `/pde:sync-rollback` → `pde context-sync sync-rollback [--restore <name>]`

### Improved globs in emitCursorRules (CUR-06)

```javascript
// Source: modified emitCursorRules() in bin/lib/context-sync.cjs
{
  filename: 'pde-design-tokens.mdc',
  description: 'PDE design token reference',
  globs: '**.{css,scss,tsx,jsx,ts}',  // was: *.css,*.scss,*.tsx,*.jsx
  alwaysApply: false,
  body: [ /* unchanged */ ],
},
{
  filename: 'pde-components.mdc',
  description: 'PDE component catalog',
  globs: '**.{tsx,jsx,stories.tsx,test.tsx}',  // was: src/components/**
  alwaysApply: false,
  body: [ /* unchanged */ ],
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No sync audit trail | SYNC-LOG.md append per operation | Phase 132 | Sync operations become auditable and git-trackable |
| No pre-write backup | Snapshot to .planning/sync-snapshots/ | Phase 132 | Write-back can be rolled back in 30-day window |
| No status command | /pde:sync-status from state file | Phase 132 | Instant sync health check without file scanning |
| .mdc without section markers | PDE:BEGIN/PDE:END in every .mdc | Phase 132 | Enables user customization of editor rules below PDE:END |
| Hardcoded SKILL.md constraints | Full ir.constraints from PROJECT.md | Phase 132 | SKILL.md always reflects current project constraints |

---

## Validation Architecture

nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` + `node:assert/strict` (Node.js built-in) |
| Config file | None — run directly with `node --test` |
| Quick run command | `node --test tests/phase-132/test-conflict-ux.cjs` |
| Full suite command | `node --test tests/phase-132/test-conflict-ux.cjs && node --test tests/phase-131/test-mcp-write-tools.cjs && node --test tests/phase-130/test-antigravity-writeback.cjs` |

Tests import `bin/lib/context-sync.cjs` directly via `require()` — same pattern as all prior phases.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INF-06 | appendSyncLog writes markdown entry to SYNC-LOG.md | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| INF-06 | SYNC-LOG.md trimmed to 500 entries when exceeded | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| INF-06 | appendSyncLog is non-fatal (silently handles write failure) | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| INF-07 | snapshotFilesBeforeBatch writes files to sync-snapshots/ | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| INF-07 | cleanupOldSnapshots removes files older than 30 days | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| INF-07 | snapshotFilesBeforeBatch is non-fatal on missing source file | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| INF-08 | cmdSyncStatus reads state file and outputs last sync time, monitored files, pending ingest | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| INF-08 | cmdSyncStatus outputs unresolved conflict count from .sync-conflicts.log | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| INF-08 | cmdSyncRollback with no args lists available snapshots | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| INF-08 | cmdSyncRollback --restore restores file and calls emitAll | unit (DI) | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| CUR-06 | writeMdcRule wraps body with PDE:BEGIN / PDE:END markers | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| CUR-06 | writeMdcRule preserves user content below PDE:END on regeneration | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| CUR-06 | pde-design-tokens.mdc glob uses **.{css,scss,tsx,jsx,ts} | unit (emitCursorRules DI) | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| AGR-06 | emitAntigravitySkill includes pde-skill-version: 1.0 marker | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| AGR-06 | emitAntigravitySkill Workflows section lists pipeline stages | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |
| AGR-06 | emitAntigravitySkill Constraints section uses ir.constraints (not hardcoded) | unit | `node --test tests/phase-132/test-conflict-ux.cjs` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-132/test-conflict-ux.cjs`
- **Per wave merge:** Full suite (132 + 131 + 130)
- **Phase gate:** All tests green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-132/test-conflict-ux.cjs` — covers INF-06, INF-07, INF-08, CUR-06, AGR-06 (16 tests minimum)

---

## Open Questions

1. **Should appendSyncLog be called from MCP write tool handlers (handlers.cjs) in addition to reconcileOnStart / ingestAll?**
   - What we know: INF-06 says "every sync operation." MCP write tools (INF-02/03/04) trigger emitAll which is a sync-triggering event.
   - What's unclear: Whether the spec intends MCP writes as "sync operations" in the INF-06 sense.
   - Recommendation: Call appendSyncLog only from reconcileOnStart and ingestAll. MCP writes already log to `mcp-writes.ndjson` (INF-02/03 audit log). Adding SYNC-LOG.md entries for MCP writes is a nice-to-have but not required by the spec wording "per sync operation."

2. **Does cmdSyncRollback need user confirmation before restoring?**
   - What we know: INF-07 spec says "/pde:sync-rollback lists snapshots and restores selected one with confirmation."
   - What's unclear: How confirmation works in a non-interactive CLI context (Claude Code skill commands don't support stdin prompts).
   - Recommendation: Skip interactive confirmation. Log a clear "Restoring snapshot X → original path Y" message before restoring, making the action auditable without blocking on input. The `--restore <filename>` explicit flag acts as implicit confirmation.

3. **Should the write-back field count in SYNC-LOG.md include both techStack and constraints writes, or only count files written?**
   - What we know: The spec says "write-backs" as a count.
   - Recommendation: Count file-level write-backs (number of files written to), not field-level (which would count techStack + constraints as 2 writes to the same file). This is cleaner and less surprising.

---

## Sources

### Primary (HIGH confidence)

- Direct source code reading: `bin/lib/context-sync.cjs` lines 483-592 — `writeMdcRule()`, `emitCursorRules()` current implementation
- Direct source code reading: `bin/lib/context-sync.cjs` lines 724-795 — `emitAntigravitySkill()` current implementation with AGENT_MARKER pattern
- Direct source code reading: `bin/lib/context-sync.cjs` lines 1085-1092 — `appendConflictLog()` append pattern
- Direct source code reading: `bin/lib/context-sync.cjs` lines 1224-1321 — `reconcileOnStart()` hook points for appendSyncLog call
- Direct source code reading: `bin/lib/context-sync.cjs` lines 1331-1407 — `ingestAll()` hook points for snapshot + log calls
- Direct source code reading: `bin/lib/context-sync.cjs` lines 1417-end — `cmdContextSync()` subcommand dispatch pattern
- Direct source code reading: `bin/lib/context-sync.cjs` lines 942-965 — `writeStateFile()` atomic write-rename pattern
- Direct source code reading: `.planning/REQUIREMENTS.md` INF-06, INF-07, INF-08, CUR-06, AGR-06 — authoritative spec
- Direct source code reading: `.cursor/rules/pde-design-tokens.mdc` — current glob confirmed as `*.css,*.scss,*.tsx,*.jsx`
- Direct source code reading: `.agent/skills/pde-design/SKILL.md` — current SKILL.md confirmed as hardcoded constraints
- Direct source code reading: `.gitignore` — current 2-entry gitignore; sync-snapshots not yet excluded
- Direct source code reading: `.planning/logs/` — directory exists; SYNC-LOG.md does not yet exist
- Direct source code reading: `.planning/sync-snapshots/` — does not yet exist

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` Accumulated Context — confirms "D-07 backward compat: absent PDE:BEGIN/END markers treat entire body as PDE-owned" (Phase 127 decision); confirms write-rename atomic pattern for state files
- `.planning/phases/131-mcp-write-tools/131-RESEARCH.md` — NDJSON append, handler patterns, `cwd = path.dirname(planningDir)` derivation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns read from actual source files
- Architecture: HIGH — all patterns derived from reading existing code; no assumptions
- Pitfalls: HIGH — derived from code analysis (snapshot path encoding, trim edge cases, emitAll signature change)

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable — Node.js built-ins only, no external library churn)
