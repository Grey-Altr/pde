# Phase 126: Sync Foundation - Research

**Researched:** 2026-03-24
**Domain:** Node.js bidirectional file sync state tracking — atomic writes, hash comparison, IR snapshots, loop prevention
**Confidence:** HIGH (codebase verified against live source, all patterns confirmed in existing code)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `.planning/` is always canonical; editor files are derived views, never inputs
- Loop prevention (hash comparison) must be active before any watcher is live — Phase 126 delivers this gate
- Value-only DTCG write-back: update `$value` only, preserve all other DTCG metadata
- MCP server stays read-only by default; --enable-writes flag required for write tools
- chokidar v4 (not v5 ESM-only, not fs.watch macOS-unreliable) — isolated in packages/reverse-sync/

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
Phase 126 scope is limited to SYN-01, SYN-02, SYN-03 only. SYN-04 (session reconciliation), SYN-05 (--ingest CLI), all CUR-* and AGR-* requirements are out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYN-01 | State file written atomically by emitAll(), recording lastEmittedAt, source hash, writable IR snapshot; git-ignored; excluded from computeSourceHash() | write-rename atomic pattern; SOURCE_FILES array modification; .gitignore append |
| SYN-02 | Loop-break via PDE-GENERATED hash comparison — match = skip reverse sync, differ = proceed to parse | Existing PDE-GENERATED marker format confirmed; regex pattern confirmed from requirements research |
| SYN-03 | IR snapshot stored as 3-way merge base — captures techStack, constraints, componentCatalog, designTokens | buildContextIR() field inventory confirmed; snapshot scope defined in requirements research |
</phase_requirements>

## Summary

Phase 126 adds three tightly-coupled primitives to `context-sync.cjs` that every subsequent v0.16 phase depends on: an atomic state file writer, a loop-break hash comparator, and an IR snapshot strategy. None of these require new npm packages — all are built from Node.js built-ins already used in the codebase.

The existing `emitAll()` function in `bin/lib/context-sync.cjs` is the single integration point. Phase 126 modifies `emitAll()` to write `.planning/.context-sync-state.json` atomically after every emission, adds a `computeLoopBreak()` utility for hash comparison, and defines the exact IR snapshot schema captured in the state file. `computeSourceHash()` must be modified to explicitly exclude `.context-sync-state.json` from the hashed file set.

The hook infrastructure, test framework (node:test, no config file), and zero-dependency constraint are all established from Phase 123. This phase follows exactly the same patterns as Phase 123's context-sync-hook.cjs work, extended to write a persistent state file rather than a tmpdir marker.

**Primary recommendation:** Modify `bin/lib/context-sync.cjs` to write the state file and export `computeLoopBreak()`. Add tests at `tests/phase-126/test-sync-foundation.cjs`. No new files outside these two.

## Existing Architecture (Ground Truth)

This section documents the exact current state of `context-sync.cjs` that Phase 126 modifies — read the source before implementing.

### emitAll() call chain

```
emitAll(cwd)
  → buildContextIR(planningDir)       // reads PROJECT.md, STATE.md, design files → IR object
  → computeSourceHash(planningDir)    // SHA-256 of SOURCE_FILES (called inside buildContextIR)
  → emitAgentsMd(ir, projectRoot)     // writes AGENTS.md
  → emitCursorRules(ir, projectRoot)  // writes .cursor/rules/pde-*.mdc (5 files)
  → emitCursorrules(ir, projectRoot)  // writes .cursorrules
  → emitGeminiMd(ir, projectRoot, planningDir)  // writes GEMINI.md hierarchy
  → emitAntigravitySkill(ir, projectRoot)       // writes .agent/skills/pde-design/SKILL.md
  → emitDesignMd(ir, projectRoot, planningDir)  // writes DESIGN.md
  → returns summary object
```

Phase 126 inserts a `writeStatFile(ir, planningDir)` call at the END of `emitAll()`, after all emitters succeed.

### SOURCE_FILES (current — must not change behavior)

```javascript
const SOURCE_FILES = [
  'PROJECT.md',
  'STATE.md',
  'design/DESIGN-STATE.md',
  'design/design-manifest.json',
];
```

`.context-sync-state.json` is not in this array. It must never be added. When the state file is written, `computeSourceHash()` naturally ignores it because it only reads files in `SOURCE_FILES`. No code change to `computeSourceHash()` is needed to satisfy the "excluded from computeSourceHash()" requirement — the exclusion is already implicit by omission.

### PDE-GENERATED marker format (existing)

```
<!-- PDE-GENERATED | hash:<64-char-sha256> | generated:<ISO-8601> -->
```

This is the write-origin fingerprint embedded at the top of every emitted file body. The `hash:` field in this comment IS the current source hash at time of emission. Loop-break comparison reads this field from a changed editor file and compares it to `computeSourceHash()` current output.

### IR fields from buildContextIR() (current)

| Field | Writable by editor? | Include in lastIR snapshot? |
|-------|--------------------|-----------------------------|
| `projectName` | No | No |
| `productType` | No | No |
| `techStack` | Yes (Cursor) | Yes |
| `projectSummary` | No | No |
| `designTokens` | Yes (Antigravity) | Yes |
| `componentCatalog` | Yes (Cursor) | Yes |
| `pipelineStatus` | No | No |
| `constraints` | Yes (Cursor) | Yes |
| `sourceHash` | No (computed) | No |
| `generatedAt` | No (computed) | No |

The snapshot stores only the 4 writable fields — this is the 3-way merge base scope for Phase 128.

### Hook idempotency pattern (existing — for contrast with new state file)

The current `context-sync-hook.cjs` uses a **tmpdir marker file** (`pde-context-sync-<sessionId>.last-hash`) for per-session idempotency. This is session-scoped and resets each session. Phase 126's state file is different: it is **persistent across sessions** and lives in `.planning/`. These serve different purposes and coexist.

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Node.js `fs` (built-in) | Node 20 | Atomic write-rename, file I/O | Zero-dep constraint at plugin root |
| Node.js `crypto` (built-in) | Node 20 | SHA-256 hash extraction via regex | Already used in computeSourceHash() |
| Node.js `path` (built-in) | Node 20 | Path construction | Already used throughout |
| `bin/lib/context-sync.cjs` | v0.15 (Phase 119) | emitAll(), buildContextIR(), computeSourceHash() | Single integration point for all sync operations |
| `bin/lib/core.cjs` | v0.8 | safeReadFile(), output(), error() | Established project utility layer |
| `node:test` (built-in) | Node 20 | Test framework | Confirmed working: `node --test tests/phase-123/test-context-sync-hook.cjs` — no config needed |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `fs.renameSync()` | Node built-in | Atomic file rename (write-rename pattern) | Write state to `.tmp` file then rename to final name |
| `JSON.stringify(obj, null, 2)` | Node built-in | Serialize state file with human-readable formatting | Use for state file — aids debugging, file is small |
| `JSON.parse()` with try/catch | Node built-in | Safe state file read with corrupt-file recovery | If state file is malformed, emitAll() creates fresh snapshot |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| write-rename atomic pattern | `fs.writeFileSync()` direct | Direct write can produce torn reads if process crashes mid-write; write-rename is atomic on POSIX |
| SHA-256 (existing, 64-char) | MD5 or shorter hash | SHA-256 already chosen by computeSourceHash(); consistency required for hash comparison to work |
| Storing only 4 writable IR fields | Storing full IR | Full IR stores `sourceHash`, `generatedAt`, `projectName` etc which can never conflict — wasteful; 4-field snapshot is the correct 3-way merge base |

**Installation:**
No new npm packages. Zero-dep constraint maintained throughout.

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
├── context-sync.cjs    # MODIFY — add writeStateFile(), computeLoopBreak(), update emitAll()
tests/
└── phase-126/
    └── test-sync-foundation.cjs  # NEW — Nyquist tests for SYN-01, SYN-02, SYN-03
.planning/
└── .context-sync-state.json      # NEW ARTIFACT — written by emitAll(), git-ignored
.gitignore                        # MODIFY — append .planning/.context-sync-state.json
```

### Pattern 1: Atomic JSON State File Write (write-rename)

**What:** Write state file to a `.tmp` sibling first, then atomically rename to the final path. On POSIX systems (macOS, Linux), `fs.renameSync` is atomic when source and destination are on the same filesystem. This prevents torn reads if the process crashes or is killed during the write.

**When to use:** Any time a JSON file must be consistent on read — partial JSON is unparseable and would corrupt state.

**Example:**
```javascript
// Source: Node.js fs docs + POSIX rename(2) atomicity guarantee
function writeStateFile(ir, planningDir) {
  const statePath = path.join(planningDir, '.context-sync-state.json');
  const tmpPath = statePath + '.tmp';
  const state = {
    schemaVersion: '1.0',
    lastEmittedAt: ir.generatedAt,
    lastSourceHash: ir.sourceHash,
    lastIR: {
      techStack: ir.techStack,
      constraints: ir.constraints,
      componentCatalog: ir.componentCatalog,
      designTokens: ir.designTokens,
    },
  };
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpPath, statePath);
  } catch {
    // State file write failure must never surface — emitAll() contract requires silent resilience
  }
}
```

**Why write-rename over fs.writeFileSync direct:** On APFS (macOS) and ext4 (Linux), `rename(2)` is a single syscall that is atomic. A direct `writeFileSync` can leave a partial file if the process is interrupted. The `.tmp` intermediate is cleaned up automatically by subsequent writes even if the rename never happened.

### Pattern 2: Loop-Break Hash Comparison

**What:** Extract the `hash:` field from an editor file's PDE-GENERATED comment and compare it to the current source hash. If they match, PDE wrote that file (no user edit occurred) — skip. If they differ (or no marker exists), an external edit occurred — proceed to parse.

**When to use:** Before any reverse parse operation on a PDE-monitored editor file.

**Example:**
```javascript
// Source: REQUIREMENTS-RESEARCH.md SYN-02 + existing makeHeader() format
const PDE_HASH_RE = /<!-- PDE-GENERATED \| hash:([a-f0-9]{64}) \| generated:([^>]+) -->/;

/**
 * Determine whether a changed editor file was written by PDE or by a human/external tool.
 * @param {string} fileContent - Full content of the changed editor file
 * @param {string} planningDir - Absolute path to .planning/
 * @returns {'skip'|'proceed'} 'skip' = PDE-written, no loop; 'proceed' = external edit
 */
function computeLoopBreak(fileContent, planningDir) {
  if (!fileContent) return 'skip'; // Empty file — skip, not actionable
  const match = fileContent.match(PDE_HASH_RE);
  if (!match) return 'skip'; // No PDE-GENERATED marker — user-authored file, skip unconditionally
  const embeddedHash = match[1];
  const currentHash = computeSourceHash(planningDir);
  return embeddedHash === currentHash ? 'skip' : 'proceed';
}
```

**Critical note:** The regex pattern `/<!-- PDE-GENERATED \| hash:([a-f0-9]{64}) \| generated:([^>]+) -->/` is consistent with `makeHeader()` in context-sync.cjs. The `\|` literal pipe characters must be escaped in the regex because `|` has special meaning. Verified against the existing `makeHeader()` output format.

### Pattern 3: IR Snapshot for 3-Way Merge Base

**What:** Capture only the 4 writable IR fields (techStack, constraints, componentCatalog, designTokens) into `lastIR` in the state file after each emission. These are the exact values written into editor files, establishing the "base" for the 3-way merge in Phase 128.

**When to use:** Inside `writeStateFile()`, called at the end of every successful `emitAll()`.

**Why these 4 fields only:** `projectName`, `productType`, `pipelineStatus`, `projectSummary` are computed/derived fields that editors cannot meaningfully modify. `sourceHash` and `generatedAt` are metadata, not content. Storing only the 4 writable fields keeps the snapshot compact and unambiguous — the merge engine in Phase 128 only needs to compare these fields.

### State File Schema (canonical)

```json
{
  "schemaVersion": "1.0",
  "lastEmittedAt": "2026-03-24T12:00:00.000Z",
  "lastSourceHash": "a1b2c3d4e5f6...64-hex-chars",
  "lastIR": {
    "techStack": "string — exact value written to editor files",
    "constraints": "string — exact value written to editor files",
    "componentCatalog": "string — exact value written to editor files",
    "designTokens": "string — exact value written to editor files"
  }
}
```

**schemaVersion** is a forward compatibility guard. When Phase 128 reads this file, it checks `schemaVersion` and can handle future schema changes gracefully. Start at `"1.0"`.

**pendingIngest** field (for Phase 129): The state file schema MUST reserve space for a `pendingIngest: []` array (CUR-03: "queue in state file pendingIngest"). Phase 126 writes it as an empty array so Phase 129 can append to it without schema changes.

Updated canonical schema:

```json
{
  "schemaVersion": "1.0",
  "lastEmittedAt": "2026-03-24T12:00:00.000Z",
  "lastSourceHash": "a1b2c3d4e5f6...64-hex-chars",
  "lastIR": {
    "techStack": "...",
    "constraints": "...",
    "componentCatalog": "...",
    "designTokens": "..."
  },
  "pendingIngest": []
}
```

### Anti-Patterns to Avoid

- **Storing the state file path in SOURCE_FILES:** Would cause the state file write to invalidate the hash, triggering another emission, creating an infinite loop. The exclusion is implicit — do not add `.context-sync-state.json` to the SOURCE_FILES array.
- **Using fs.writeFileSync() directly for the state file:** Produces torn reads on process interruption. Always use write-rename.
- **Blocking emitAll() on state file failure:** State file write is best-effort. A failure must be caught and swallowed — emitAll() continues and returns normally.
- **Comparing mtime instead of content hash for loop detection:** macOS APFS has 1-second mtime granularity in some cases, and files written within the same second cannot be distinguished by mtime alone. Hash comparison is the reliable gate (confirmed in SYN-02 constraints).
- **Reading the state file inside computeSourceHash():** Would add a circular dependency — computeSourceHash() is called during emitAll() to produce the hash that gets written to the state file.
- **Importing gray-matter or js-yaml:** Zero-dep constraint at plugin root is absolute. Use regex for all YAML and JSON parsing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON state serialization | Custom serializer | `JSON.stringify(obj, null, 2)` | Standard library handles all edge cases; `null, 2` gives readable output for debugging |
| Atomic file write | Custom locking mechanism | write-rename pattern (`writeFileSync` to `.tmp` then `renameSync`) | POSIX rename is atomic at OS level; no locking needed on single-writer systems |
| SHA-256 hash computation | Custom hash | `crypto.createHash('sha256')` (already in computeSourceHash()) | Already correct and tested; just reuse computeSourceHash() |
| YAML frontmatter parsing | Manual string splitting | Regex patterns per field (as specified in CUR-01) | Zero-dep constraint; regex is sufficient for the known fixed frontmatter structure |
| Deep clone for IR snapshot | lodash.cloneDeep, structuredClone | Direct field assignment: `{ techStack: ir.techStack, ... }` | IR fields are strings — primitives do not need deep clone; direct assignment is correct and zero-overhead |

**Key insight:** Every problem in this phase has a built-in Node.js solution. The zero-dependency constraint is not a limitation here — it is the correct design. The entire state file infrastructure is < 30 lines of code.

## Common Pitfalls

### Pitfall 1: State File Triggers Its Own Emission (Loop)
**What goes wrong:** If `.context-sync-state.json` is written inside `.planning/` and the PostToolUse hook fires on Write operations to `.planning/`, the hook would detect the state file write, call emitAll(), which writes the state file again, ad infinitum.
**Why it happens:** The context-sync-hook.cjs fires on any `.planning/` file write. The state file IS in `.planning/`.
**How to avoid:** Two independent gates:
  1. `computeSourceHash()` naturally excludes the state file (it's not in SOURCE_FILES), so the hash does not change when the state file is written. The hook's hash gate prevents re-triggering.
  2. emitAll() is called by the hook, and writeStateFile() is called at the END of emitAll(). The hook fires on the state file write, computes the same hash (unchanged), exits early.
**Warning signs:** If you see emitAll() called more than once per planning file change during testing, this loop is happening.

### Pitfall 2: Regex Escape for Pipe Characters in PDE-GENERATED Pattern
**What goes wrong:** The PDE-GENERATED marker contains literal `|` pipe characters: `<!-- PDE-GENERATED | hash:... | generated:... -->`. In a regex pattern, `|` is an alternation operator unless escaped as `\|`.
**Why it happens:** Forgetting to escape `|` causes the regex to match any content before or after the pipes, producing incorrect hash extraction.
**How to avoid:** Use the exact pattern from REQUIREMENTS-RESEARCH.md: `/<!-- PDE-GENERATED \| hash:([a-f0-9]{64}) \| generated:([^>]+) -->/`
**Warning signs:** Loop-break check returns 'proceed' for PDE-written files, causing phantom reverse sync cycles.

### Pitfall 3: State File Schema Missing pendingIngest
**What goes wrong:** Phase 129 (CUR-03) requires `pendingIngest: []` in the state file. If Phase 126 writes the state file without this field, Phase 129 must add schema migration logic.
**Why it happens:** Phase 126 researcher/planner scopes too narrowly to SYN-01/02/03 without reading Phase 129 requirements.
**How to avoid:** Write `pendingIngest: []` in the initial schema. It costs nothing and prevents a schema migration.
**Warning signs:** Phase 129 plan includes a "migrate state file schema" task.

### Pitfall 4: Crash During write-rename Leaves .tmp File
**What goes wrong:** If the process crashes after `writeFileSync(tmpPath, ...)` but before `renameSync(tmpPath, statePath)`, a `.context-sync-state.json.tmp` file remains. On the next run, if this `.tmp` file is not cleaned up, it accumulates.
**Why it happens:** Crash-in-window is a real scenario in a hook that runs during active Claude Code session.
**How to avoid:** The next `emitAll()` call overwrites the `.tmp` file before renaming — this is automatic because the path is deterministic. No explicit cleanup needed.
**Warning signs:** Not a problem in practice — the `.tmp` is overwritten on next write. No cleanup code needed.

### Pitfall 5: computeLoopBreak() Called on File That Wasn't Read Yet
**What goes wrong:** Phase 129 (CUR-03) detects changes via mtime, not by reading file content. If `computeLoopBreak()` requires content to be passed in, the caller must read the file — if the file is large, this adds overhead to the hook path.
**Why it happens:** The loop-break function signature takes full file content. But Phase 129 detects via mtime-only to stay under 10ms overhead.
**How to avoid:** In Phase 129, only read file content for the loop-break check AFTER mtime indicates a change. The mtime check is O(1) stat; the content read + hash compare only happens for files that pass the mtime gate. This is already the intended design per SYN-04/CUR-03.

### Pitfall 6: .gitignore Not Appended — State File Committed
**What goes wrong:** `.planning/.context-sync-state.json` contains session-specific timestamps and will create noisy git diffs on every emitAll() call.
**Why it happens:** Developer forgets to add the gitignore entry.
**How to avoid:** Phase 126 explicitly modifies `.gitignore` as part of SYN-01 delivery.
**Warning signs:** `git status` shows `.planning/.context-sync-state.json` as modified after every context sync.

## Code Examples

Verified patterns from codebase and Node.js built-ins:

### Full writeStateFile() Implementation
```javascript
// Source: Pattern derived from existing context-sync.cjs + POSIX rename atomicity
function writeStateFile(ir, planningDir) {
  const statePath = path.join(planningDir, '.context-sync-state.json');
  const tmpPath = statePath + '.tmp';
  const state = {
    schemaVersion: '1.0',
    lastEmittedAt: ir.generatedAt,
    lastSourceHash: ir.sourceHash,
    lastIR: {
      techStack: ir.techStack,
      constraints: ir.constraints,
      componentCatalog: ir.componentCatalog,
      designTokens: ir.designTokens,
    },
    pendingIngest: [],
  };
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpPath, statePath);
  } catch {
    // State file write failure is non-fatal — emitAll() must never throw for this
  }
}
```

### Full computeLoopBreak() Implementation
```javascript
// Source: REQUIREMENTS-RESEARCH.md SYN-02 + makeHeader() format in context-sync.cjs line 69
const PDE_HASH_RE = /<!-- PDE-GENERATED \| hash:([a-f0-9]{64}) \| generated:([^>]+) -->/;

function computeLoopBreak(fileContent, planningDir) {
  if (!fileContent) return 'skip';
  const match = fileContent.match(PDE_HASH_RE);
  if (!match) return 'skip'; // User-authored — no PDE marker
  const embeddedHash = match[1];
  const currentHash = computeSourceHash(planningDir);
  return embeddedHash === currentHash ? 'skip' : 'proceed';
}
```

### emitAll() Modification (integration point)
```javascript
// Source: context-sync.cjs lines 809-832 — add writeStateFile() at end
function emitAll(cwd) {
  const planningDir = path.join(cwd, '.planning');
  const projectRoot = cwd;

  const ir = buildContextIR(planningDir);

  const agentsMd = emitAgentsMd(ir, projectRoot);
  const cursorRules = emitCursorRules(ir, projectRoot);
  const cursorrules = emitCursorrules(ir, projectRoot);
  const geminiMd = emitGeminiMd(ir, projectRoot, planningDir);
  const antigravitySkill = emitAntigravitySkill(ir, projectRoot);
  const designMd = emitDesignMd(ir, projectRoot, planningDir);

  // Phase 126: Write persistent state file for 3-way merge base
  writeStateFile(ir, planningDir);

  return {
    agentsMd,
    cursorRules,
    cursorrules,
    geminiMd,
    antigravitySkill,
    designMd,
    sourceHash: ir.sourceHash,
    generatedAt: ir.generatedAt,
  };
}
```

### readStateFile() for Phase 128+ Consumers
```javascript
// Safe reader — returns null if file missing or malformed
function readStateFile(planningDir) {
  const statePath = path.join(planningDir, '.context-sync-state.json');
  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const parsed = JSON.parse(raw);
    // Schema version guard for future compatibility
    if (!parsed || parsed.schemaVersion !== '1.0') return null;
    return parsed;
  } catch {
    return null;
  }
}
```

### Test Pattern (node:test, dependency injection)
```javascript
// Source: tests/phase-123/test-context-sync-hook.cjs — established project pattern
const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
}

function makePlanningDir(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  // Write minimal source files so computeSourceHash works
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), '# Test Project\n', 'utf-8');
  return planningDir;
}

test('writeStateFile writes .context-sync-state.json atomically', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);
  const { emitAll, computeSourceHash } = require('../../bin/lib/context-sync.cjs');

  emitAll(baseDir);

  const statePath = path.join(planningDir, '.context-sync-state.json');
  assert.ok(fs.existsSync(statePath), 'state file must exist after emitAll');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  assert.equal(state.schemaVersion, '1.0');
  assert.ok(typeof state.lastEmittedAt === 'string');
  assert.equal(state.lastSourceHash, computeSourceHash(planningDir));
  assert.ok(state.lastIR.techStack !== undefined);
  assert.ok(state.lastIR.constraints !== undefined);
  assert.ok(state.lastIR.componentCatalog !== undefined);
  assert.ok(state.lastIR.designTokens !== undefined);
  assert.deepEqual(state.pendingIngest, []);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-session tmpdir marker (context-sync-hook.cjs) | Persistent state file in .planning/ | Phase 126 (new) | Enables cross-session 3-way merge base; tmpdir marker remains for hook idempotency (different purpose) |
| Unidirectional hash (embedded in emitted files) | Bidirectional hash comparison (embedded hash vs current hash) | Phase 126 (new) | Enables loop-break without file watching; comparison is O(1) |
| emitAll() returns summary but writes no metadata | emitAll() writes persistent state after emission | Phase 126 (new) | State file is the foundation for all v0.16 reverse sync phases |

**No deprecated patterns in this phase** — all changes are additive modifications to `emitAll()` and `context-sync.cjs`.

## Environment Availability

Step 2.6: This phase is purely code modifications to `bin/lib/context-sync.cjs` and a new test file. No external tools, services, CLIs, runtimes, databases, or package managers beyond the project's own code are needed.

**SKIPPED** (no external dependencies identified — all dependencies are Node.js built-ins already confirmed available at Node 20.20.0).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node 20) |
| Config file | none — no jest.config, no vitest.config |
| Quick run command | `node --test tests/phase-126/test-sync-foundation.cjs` |
| Full suite command | `node --test tests/phase-126/test-sync-foundation.cjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYN-01 | emitAll() writes .context-sync-state.json with correct schema | unit | `node --test tests/phase-126/test-sync-foundation.cjs` | Wave 0 |
| SYN-01 | State file written atomically (no torn reads) | unit | `node --test tests/phase-126/test-sync-foundation.cjs` | Wave 0 |
| SYN-01 | State file excluded from computeSourceHash() (writing it does not change hash) | unit | `node --test tests/phase-126/test-sync-foundation.cjs` | Wave 0 |
| SYN-02 | computeLoopBreak() returns 'skip' when embedded hash matches current hash | unit | `node --test tests/phase-126/test-sync-foundation.cjs` | Wave 0 |
| SYN-02 | computeLoopBreak() returns 'proceed' when embedded hash differs from current hash | unit | `node --test tests/phase-126/test-sync-foundation.cjs` | Wave 0 |
| SYN-02 | computeLoopBreak() returns 'skip' when no PDE-GENERATED marker present | unit | `node --test tests/phase-126/test-sync-foundation.cjs` | Wave 0 |
| SYN-03 | lastIR snapshot contains exactly techStack, constraints, componentCatalog, designTokens | unit | `node --test tests/phase-126/test-sync-foundation.cjs` | Wave 0 |
| SYN-03 | lastIR snapshot updated on second emitAll() call | unit | `node --test tests/phase-126/test-sync-foundation.cjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-126/test-sync-foundation.cjs`
- **Per wave merge:** `node --test tests/phase-126/test-sync-foundation.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-126/test-sync-foundation.cjs` — covers all SYN-01, SYN-02, SYN-03 behaviors listed above

## Open Questions

1. **pendingIngest field in state file schema**
   - What we know: CUR-03 (Phase 129) requires `pendingIngest: []` in the state file for queuing detected changes
   - What's unclear: Whether Phase 129 will also add other top-level fields (e.g., `lastReconciledAt`, `monitoredFiles`) that Phase 126 should stub
   - Recommendation: Write `pendingIngest: []` now. Do not pre-stub additional Phase 129 fields — add them when Phase 129 is planned.

2. **readStateFile() export**
   - What we know: Phase 128 (merge engine) will need to read the state file; Phase 129 will also need it
   - What's unclear: Should `readStateFile()` be exported now in Phase 126 as a consumer API, or deferred to Phase 128?
   - Recommendation: Export it in Phase 126. It is a natural companion to `writeStateFile()` and avoids Phase 128 having to add a function to a module it should otherwise treat as opaque.

## Sources

### Primary (HIGH confidence)
- `bin/lib/context-sync.cjs` (lines 1-898) — complete source audit performed; all function signatures, data flows, SOURCE_FILES array, makeHeader() format, and emitAll() call chain verified
- `hooks/context-sync-hook.cjs` (lines 1-103) — hook contract, idempotency pattern, and zero-stdout requirement confirmed
- `tests/phase-123/test-context-sync-hook.cjs` (lines 1-199) — test framework (node:test), dependency injection pattern, and makeTmpDir/makePlanningDir helpers confirmed
- `.planning/research/REQUIREMENTS-RESEARCH.md` (SYN-01, SYN-02, SYN-03 sections) — atomic write spec, loop-break regex, IR snapshot field scope confirmed
- `Node.js 20 fs.renameSync docs` — POSIX rename(2) atomicity on same-filesystem confirmed
- `.planning/milestones/v0.15-phases/123-context-sync-engine/123-VALIDATION.md` — Nyquist validation format confirmed

### Secondary (MEDIUM confidence)
- POSIX rename(2) man page behavior on APFS: rename is atomic when source and destination are on the same volume. Confirmed by macOS documentation and standard UNIX behavior — HIGH confidence for same-filesystem writes.

### Tertiary (LOW confidence)
- None. All claims in this document are verified against live source files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified in existing codebase (no new dependencies)
- Architecture: HIGH — integration point (emitAll) identified precisely; write-rename pattern is POSIX standard
- Pitfalls: HIGH — loop scenario verified against actual hook logic; regex escape verified against makeHeader() format
- Test patterns: HIGH — existing test files read and runner confirmed working

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable — no external dependencies that could change)
