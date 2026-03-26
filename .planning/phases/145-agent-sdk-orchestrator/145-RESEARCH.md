# Phase 145: Agent SDK Orchestrator - Research

**Researched:** 2026-03-26
**Domain:** Claude Agent SDK (TypeScript), ESM/CJS interop, DAG analysis, NDJSON failure summarization, merge conflict triage
**Confidence:** HIGH

## Summary

Phase 145 adds four distinct capabilities to the DispatchCoordinator: (1) DAG analysis of ROADMAP.md to identify parallelizable phases, (2) file-overlap detection to flag unsafe concurrent pairs, (3) human-readable failure summaries from session NDJSON tails, and (4) merge conflict triage assistance when auto-resolve fails. All four use the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) for reasoning, installed **only** in `packages/dispatcher/package.json`.

The critical architectural finding: `@anthropic-ai/claude-agent-sdk` is **ESM-only** (`"type": "module"`, exports `sdk.mjs` with no CJS build). The dispatcher package is `"type": "commonjs"`. Node 20 does not support `require()` of ESM modules (that landed in Node 22). The correct solution is a thin async wrapper file (`packages/dispatcher/lib/sdk-bridge.cjs`) that uses dynamic `import()` to load the ESM SDK at runtime. All SDK calls are async by nature, so this does not require architectural changes.

The SDK is essentially a subprocess wrapper around the Claude Code CLI — it spawns a child `claude --print --output-format stream-json` process and wraps it in an async iterator. This is the same pattern already proven in `spawn.cjs`. SDK calls therefore require `ANTHROPIC_API_KEY` to be set in the environment, which is already present in the parent process.

**Primary recommendation:** Create `packages/dispatcher/lib/sdk-bridge.cjs` (ESM import wrapper + typed result extractors), then create `packages/dispatcher/lib/orchestrator.cjs` containing the four high-level functions: `analyzeDag()`, `checkFileOverlap()`, `summarizeFailure()`, and `triageConflicts()`. Wire into `DispatchCoordinator` via `_deps` injection (same pattern as spawn/worktree/merge).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SDK-01 | Agent SDK installed in packages/dispatcher/package.json (plugin root bin/ stays zero-dep) | Verified: `npm install @anthropic-ai/claude-agent-sdk` adds to packages/dispatcher only; bin/ unchanged |
| SDK-02 | Agent SDK analyzes ROADMAP.md to build dependency DAG and identify parallelizable phases | Pattern: `query()` with Read+Glob tools, structured system prompt, extract `type: "result"` message's `result` field |
| SDK-03 | Agent SDK performs static file-overlap analysis on PLAN.md to prevent source code conflicts | Pattern: same `query()` call, pass list of phases+their files_modified from PLAN.md frontmatter |
| SDK-04 | Agent SDK generates failure summaries from session NDJSON tail | Pattern: pass last N lines of NDJSON as string in prompt, `permissionMode: 'dontAsk'`, no tools needed — pure text reasoning |
| SDK-05 | Agent SDK assists with merge conflict resolution when auto-resolve fails | Pattern: pass conflicting file list + context, structured output with suggested resolution strategy |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | 0.2.84 | Agent SDK for reasoning tasks | Official Anthropic SDK; wraps claude CLI as async iterator |
| `node:fs` | built-in | Read ROADMAP.md, PLAN.md files, NDJSON tail | Already used throughout dispatcher |
| `node:path` | built-in | Path construction for phase files | Already used |
| `node:os` | built-in | Temp dir for NDJSON session files | Already used |

### Already Present

| Library | Version | Purpose | Location |
|---------|---------|---------|----------|
| `vitest` | 4.1.1 | Test runner | root devDependencies |

### Packages to ADD to `packages/dispatcher/package.json`

One package: `@anthropic-ai/claude-agent-sdk@^0.2.84`. No other new dependencies.

```bash
cd packages/dispatcher && npm install @anthropic-ai/claude-agent-sdk
```

**Version verification (run date: 2026-03-26):**
```bash
npm view @anthropic-ai/claude-agent-sdk version   # → 0.2.84
npm view @anthropic-ai/claude-agent-sdk dist-tags  # → { latest: '0.2.84', next: '0.2.85' }
```

**CRITICAL: ESM-only package.** The package exports are:
```json
{
  ".": { "types": "./sdk.d.ts", "default": "./sdk.mjs" },
  "type": "module"
}
```
No CJS build exists. Dynamic `import()` is mandatory in the CJS bridge file.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@anthropic-ai/claude-agent-sdk` | `@anthropic-ai/sdk` (client SDK) | Agent SDK handles the tool loop automatically; client SDK requires hand-rolling tool execution — not appropriate when the task is "analyze ROADMAP.md" which benefits from the full agent loop |
| `@anthropic-ai/claude-agent-sdk` | Direct `claude --print` subprocess | Already what SDK does internally; using SDK gives typed API + proper error handling + auto-retry |
| Structured SDK output | Parse assistant message text | `SDKResultMessage.result` field contains final answer as string; no JSON parsing of internal messages needed |

## Architecture Patterns

### Recommended Project Structure

```
packages/dispatcher/
├── package.json              (add @anthropic-ai/claude-agent-sdk)
├── index.cjs                 (add orchestrator exports)
└── lib/
    ├── sdk-bridge.cjs        (NEW: dynamic import() wrapper for ESM SDK)
    ├── orchestrator.cjs      (NEW: analyzeDag, checkFileOverlap, summarizeFailure, triageConflicts)
    ├── coordinator.cjs       (MODIFY: wire orchestrator via _deps injection)
    └── [all existing modules unchanged]

tests/dispatcher/
    ├── sdk-bridge.test.cjs   (NEW: verify dynamic import resolves, result extractor works)
    ├── orchestrator.test.cjs (NEW: unit tests with mocked sdkQuery function)
    └── [all existing tests unchanged]
```

### Pattern 1: ESM Bridge with Dynamic Import (MANDATORY)

**What:** CJS module that lazy-loads the ESM SDK using `import()` and exports async helper functions.
**When to use:** Any time a CJS module needs to call an ESM-only package. Node 20 does not support synchronous `require()` of ESM.

```javascript
// Source: Node.js ESM interop spec + official docs
// packages/dispatcher/lib/sdk-bridge.cjs
'use strict';

let _queryFn = null;

/**
 * Lazy-load the ESM SDK. Cached after first call.
 * @returns {Promise<function>} the query function
 */
async function loadSdkQuery() {
  if (_queryFn) return _queryFn;
  const sdk = await import('@anthropic-ai/claude-agent-sdk');
  _queryFn = sdk.query;
  return _queryFn;
}

/**
 * Run a single SDK query and return the result string.
 * Consumes the full async iterator, extracts SDKResultMessage.result.
 *
 * @param {string} prompt
 * @param {object} options - SDK Options object
 * @returns {Promise<string>} final result text
 */
async function sdkQuery(prompt, options) {
  const query = await loadSdkQuery();
  let result = '';
  for await (const message of query({ prompt, options })) {
    if (message.type === 'result' && message.subtype === 'success') {
      result = message.result;
    }
  }
  return result;
}

module.exports = { sdkQuery, loadSdkQuery };
```

### Pattern 2: Orchestrator Functions — Read-Only Analysis

**What:** All four orchestrator functions use `permissionMode: 'dontAsk'` (TypeScript-only but supported in the Node SDK) or `allowedTools: ['Read', 'Glob', 'Grep']` for read-only analysis. No file editing.
**When to use:** Whenever the SDK is being used for analysis only, not acting on the filesystem.

```javascript
// Source: platform.claude.com/docs/en/agent-sdk/typescript (Options.permissionMode)
// packages/dispatcher/lib/orchestrator.cjs
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { sdkQuery } = require('./sdk-bridge.cjs');

/**
 * Analyze ROADMAP.md to identify which phases are safe to run in parallel.
 * Uses Agent SDK with Read tool — one-time analysis at dispatch time.
 *
 * @param {string} projectRoot
 * @param {function} [_sdkQuery] - Injectable for tests (defaults to real sdkQuery)
 * @returns {Promise<{ parallelizable: number[][], unsafe: Array<{phases: number[], reason: string}> }>}
 */
async function analyzeDag(projectRoot, _sdkQuery) {
  const q = _sdkQuery || sdkQuery;
  const roadmapPath = path.join(projectRoot, '.planning', 'ROADMAP.md');

  const result = await q(
    `Read ${roadmapPath} and analyze the dependency graph of the phases listed.
Return a JSON object with two fields:
- "parallelizable": array of arrays, each inner array is a set of phase numbers that can run concurrently
- "unsafe": array of objects with "phases" (array of phase numbers) and "reason" (string) explaining why they cannot run in parallel

Phases can run in parallel when they have no dependency relationship between them (neither direct nor transitive).
A phase with "Depends on: Phase X" cannot run concurrently with Phase X or any of its prerequisites.
Return only the JSON, no other text.`,
    {
      allowedTools: ['Read'],
      permissionMode: 'dontAsk',
      maxTurns: 5,
      cwd: projectRoot,
    }
  );

  try {
    return JSON.parse(result);
  } catch (_) {
    return { parallelizable: [], unsafe: [] };
  }
}

module.exports = { analyzeDag, checkFileOverlap, summarizeFailure, triageConflicts };
```

### Pattern 3: File Overlap Analysis Without SDK (Preferred for SDK-03)

**What:** Parse PLAN.md YAML frontmatter for `files_modified` field. Compare sets. No SDK call needed.
**When to use:** SDK-03 says "static file-overlap analysis" — the word "static" is the hint. This is deterministic regex-based parsing, not reasoning.

The PLAN.md format shows `files_modified:` as a YAML frontmatter list. Extract with regex, compare sets:

```javascript
// Source: inspection of 144-01-PLAN.md, 144-03-PLAN.md
// packages/dispatcher/lib/orchestrator.cjs

/**
 * Check file overlap between phase PLAN.md files.
 * Parses files_modified from YAML frontmatter — no SDK needed.
 *
 * @param {string} projectRoot
 * @param {number[]} phases - Phase numbers to check
 * @returns {{ overlapping: Array<{phases: number[], files: string[]}> }}
 */
function checkFileOverlap(projectRoot, phases) {
  const phaseFiles = new Map();

  for (const phase of phases) {
    const planDir = _findPlanDir(projectRoot, phase);
    if (!planDir) continue;
    const files = _extractFilesModified(planDir, phase);
    phaseFiles.set(phase, files);
  }

  const overlapping = [];
  const phaseNums = [...phaseFiles.keys()];
  for (let i = 0; i < phaseNums.length; i++) {
    for (let j = i + 1; j < phaseNums.length; j++) {
      const a = phaseNums[i], b = phaseNums[j];
      const filesA = phaseFiles.get(a) || [];
      const filesB = phaseFiles.get(b) || [];
      const shared = filesA.filter(f => filesB.includes(f));
      if (shared.length > 0) {
        overlapping.push({ phases: [a, b], files: shared });
      }
    }
  }

  return { overlapping };
}

// YAML frontmatter parser for files_modified list
function _extractFilesModified(planDir, phase) {
  const files = [];
  const planFiles = fs.readdirSync(planDir)
    .filter(f => f.startsWith(`${String(phase).padStart(3, '0')}-`) && f.endsWith('-PLAN.md'));
  for (const pf of planFiles) {
    const content = fs.readFileSync(path.join(planDir, pf), 'utf8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) continue;
    const frontmatter = match[1];
    const filesBlock = frontmatter.match(/files_modified:\s*\n((?:\s+-\s+.+\n?)*)/);
    if (!filesBlock) continue;
    const lines = filesBlock[1].split('\n').filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^\s+-\s+(.+)$/);
      if (m) files.push(m[1].trim());
    }
  }
  return files;
}
```

**Note:** The SDK is only needed when file-overlap cannot be determined statically (e.g., phases with no PLAN.md yet). In that case, fall back to `analyzeDag()` SDK call.

### Pattern 4: Failure Summary — SDK Without Tools

**What:** Pass NDJSON tail as text in prompt. No tools needed — pure reasoning.
**When to use:** SDK-04. The session NDJSON file is already in `/tmp/pde-session-{sessionId}.ndjson`. Read the tail, pass as string.

```javascript
// Source: platform.claude.com/docs/en/agent-sdk/overview (permissionMode: dontAsk)
async function summarizeFailure(sessionId, _sdkQuery) {
  const q = _sdkQuery || sdkQuery;
  const ndjsonPath = path.join(require('node:os').tmpdir(), `pde-session-${sessionId}.ndjson`);

  let tail = '';
  try {
    const content = fs.readFileSync(ndjsonPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    // Last 50 lines captures the error + surrounding context
    tail = lines.slice(-50).join('\n');
  } catch (_) {
    return 'No session log available.';
  }

  return q(
    `These are the last events from a failed Claude Code session (NDJSON format):
\`\`\`
${tail}
\`\`\`

Write a 2-3 sentence human-readable summary of what failed and why.
Focus on the error message, the last action taken, and the likely root cause.
Be specific — name the file, tool, or command that failed if visible.`,
    {
      allowedTools: [],   // no tools needed — pure text reasoning
      permissionMode: 'dontAsk',
      maxTurns: 1,        // single turn, no tool use
    }
  );
}
```

### Pattern 5: Merge Conflict Triage — SDK as Advisor

**What:** Pass conflicting file list and diff context. SDK returns structured strategy.
**When to use:** SDK-05. Called from `_handleExit` when `mergeSession` returns `{ ok: false, needsHuman: true }`.

```javascript
async function triageConflicts(conflictFiles, projectRoot, _sdkQuery) {
  const q = _sdkQuery || sdkQuery;

  // Read up to 100 lines of each conflict file for context
  const fileContexts = conflictFiles.map(f => {
    try {
      const content = fs.readFileSync(path.join(projectRoot, f), 'utf8');
      return `### ${f}\n${content.slice(0, 3000)}`;
    } catch (_) {
      return `### ${f}\n(could not read)`;
    }
  }).join('\n\n');

  return q(
    `These files have unresolved merge conflicts after an automated merge:
${conflictFiles.map(f => `- ${f}`).join('\n')}

File contents (with conflict markers):
${fileContexts}

Suggest a specific resolution strategy for each file. For each:
1. Identify which version (incoming vs current) is likely correct
2. Explain the reasoning
3. Give the exact manual steps to resolve

Keep it concise — this will be shown to the developer in the event log.`,
    {
      allowedTools: [],
      permissionMode: 'dontAsk',
      maxTurns: 1,
    }
  );
}
```

### Pattern 6: Dependency Injection for SDK (Testability)

**What:** Pass `_sdkQuery` as an optional parameter to each orchestrator function. Tests inject a `vi.fn()`. Production code uses `sdkQuery` from `sdk-bridge.cjs`.
**Why not use `_deps` object:** The orchestrator functions are module-level exports (not a class), so parameter injection is cleaner than a class with `opts._deps`. Consistent with coordinator pattern but adapted for functional style.

```javascript
// Test pattern (mirrors coordinator test approach):
it('analyzeDag returns parsed JSON from SDK result', async () => {
  const mockQuery = vi.fn().mockResolvedValue('{"parallelizable":[[143,144]],"unsafe":[]}');
  const result = await analyzeDag('/fake/root', mockQuery);
  expect(result.parallelizable).toEqual([[143, 144]]);
  expect(mockQuery).toHaveBeenCalledOnce();
});
```

### Anti-Patterns to Avoid

- **Calling SDK synchronously**: `require('@anthropic-ai/claude-agent-sdk')` throws `ERR_REQUIRE_ESM` on Node 20. Always use `import()` inside an async function.
- **Iterating internal SDK messages**: Only the final `type: "result", subtype: "success"` message contains the answer. Do not parse `assistant` message content blocks for the answer — use `SDKResultMessage.result`.
- **Using `settingSources`**: Do not set `settingSources: ['project']` for orchestrator calls. This would load CLAUDE.md and settings.json, adding noise to the analysis. Leave it unset (defaults to `[]`).
- **Passing `systemPrompt: { type: 'preset', preset: 'claude_code' }`**: This loads the full Claude Code system prompt with coding instructions. The orchestrator is doing pure analysis; use a minimal custom `systemPrompt` or no system prompt.
- **maxTurns > 5 for analysis tasks**: DAG analysis and conflict triage are single-shot tasks. Cap at `maxTurns: 5` to prevent runaway agent loops.
- **Blocking the coordinator during SDK call**: `analyzeDag` should be called once before the dispatch wave, not inline during `dispatch()`. Store the result on `DispatchCoordinator` as `this._dag`. Wiring happens in `dispatchWave()`, not `dispatch()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ROADMAP.md dependency graph parsing | Custom graph parser | Agent SDK `query()` with Read tool | ROADMAP.md is prose + markdown; LLM parses it more reliably than regex |
| NDJSON failure root-cause analysis | String matching heuristics | Agent SDK `query()` without tools | Error messages vary; LLM produces readable summaries regardless of error format |
| Merge conflict resolution guidance | Decision tree | Agent SDK `query()` without tools | Conflict context varies; LLM handles all cases |
| YAML frontmatter parsing | YAML library (js-yaml) | Regex extraction | File-overlap check only needs `files_modified` list — full YAML parser is unnecessary overhead and would add a dependency |

**Key insight:** The Agent SDK is already spawning a Claude subprocess for reasoning tasks. The three use cases (DAG, failures, conflicts) are exactly what LLMs are good at. The only case where the SDK is NOT needed is file-overlap detection (SDK-03) — that's static PLAN.md parsing with a regex.

## Common Pitfalls

### Pitfall 1: ERR_REQUIRE_ESM on Node 20

**What goes wrong:** `require('@anthropic-ai/claude-agent-sdk')` throws `Error [ERR_REQUIRE_ESM]: require() of ES Module` when called from a CJS module on Node 20.
**Why it happens:** The package exports only `sdk.mjs` with `"type": "module"` — no CJS build exists. Node 22 added `require()` of ESM, but Node 20 (used in this project) does not have it.
**How to avoid:** Always use `const sdk = await import('@anthropic-ai/claude-agent-sdk')` inside an async function. Cache the result to avoid re-importing on every call.
**Warning signs:** `require('@anthropic-ai/claude-agent-sdk')` anywhere in a `.cjs` file.

### Pitfall 2: Iterating All Messages vs Reading Result

**What goes wrong:** Code iterates all SDK messages and tries to parse `assistant` content blocks — misses the actual result which is in `SDKResultMessage`.
**Why it happens:** The SDK emits many message types (system/init, assistant, user/tool_result, etc.) before the final result. Training data shows examples that filter for `result` type.
**How to avoid:** Always filter for `message.type === 'result' && message.subtype === 'success'` and use `message.result` (a plain string).
**Warning signs:** Code that parses `message.message.content[0].text` instead of `message.result`.

### Pitfall 3: ANTHROPIC_API_KEY Not Present

**What goes wrong:** SDK calls fail with `API key not found` or `authentication_failed` error in SDKResultMessage.
**Why it happens:** The SDK subprocess inherits the env from the Node process. If `ANTHROPIC_API_KEY` is not set, the SDK fails. In production PDE execution, the key is always set. In tests, it is not — and tests must mock `sdkQuery` rather than calling the real SDK.
**How to avoid:** All test doubles must mock `sdkQuery` (or the injectable `_sdkQuery` parameter). Never call the real SDK in tests. If running integration tests manually, ensure `ANTHROPIC_API_KEY` is set.
**Warning signs:** Tests that call `analyzeDag(root)` without passing a mock `_sdkQuery`.

### Pitfall 4: SDK Call During Dispatch Lock Window

**What goes wrong:** SDK analysis is called inside the `acquireLock`/`releaseLock` window, blocking the lock for seconds while the SDK subprocess starts.
**Why it happens:** Temptation to put `analyzeDag` inside `dispatch()` to check each phase before creating its worktree.
**How to avoid:** Call `analyzeDag` once in `dispatchWave()` **before** the lock is acquired. Cache result on `this._dag`. Individual `dispatch()` calls read from cache, no SDK call in the lock window.
**Warning signs:** `analyzeDag()` call inside `dispatch()` body, especially inside the `try { ... acquireLock ... }` block.

### Pitfall 5: SDK `cwd` Not Set to Project Root

**What goes wrong:** SDK spawns in `process.cwd()` (the GSD tools directory), so `Read` tool cannot find `.planning/ROADMAP.md`.
**Why it happens:** `cwd` defaults to `process.cwd()` per SDK docs.
**How to avoid:** Always pass `cwd: projectRoot` in the SDK options for any call that reads project files.
**Warning signs:** SDK returning "file not found" errors or empty results for ROADMAP.md analysis.

### Pitfall 6: SDK settingSources Loading User Credentials

**What goes wrong:** Setting `settingSources: ['user']` causes the SDK to read `~/.claude/settings.json`, which may override the `ANTHROPIC_API_KEY` or load global skills that interfere with analysis.
**Why it happens:** Documentation shows `settingSources` as optional and some examples include `'user'`.
**How to avoid:** Leave `settingSources` unset (defaults to `[]`). The orchestrator is a headless tool — no filesystem settings needed.
**Warning signs:** Unexpected skills or settings appearing in SDK call behavior.

## Code Examples

### ESM Bridge — The Critical File

```javascript
// Source: Node.js ESM spec (nodejs.org/api/esm.html) + verified against @anthropic-ai/claude-agent-sdk@0.2.84
// packages/dispatcher/lib/sdk-bridge.cjs
'use strict';

let _sdkModule = null;

async function _loadSdk() {
  if (!_sdkModule) {
    _sdkModule = await import('@anthropic-ai/claude-agent-sdk');
  }
  return _sdkModule;
}

/**
 * Run a single SDK query. Returns the final result string.
 * Handles SDKResultMessage extraction.
 *
 * @param {string} prompt
 * @param {object} [options] - SDK Options (allowedTools, permissionMode, cwd, maxTurns, etc.)
 * @returns {Promise<string>}
 */
async function sdkQuery(prompt, options) {
  const sdk = await _loadSdk();
  let result = null;
  let errorMsg = null;

  for await (const message of sdk.query({ prompt, options: options || {} })) {
    if (message.type === 'result') {
      if (message.subtype === 'success') {
        result = message.result;
      } else {
        // error_max_turns, error_during_execution, etc.
        errorMsg = (message.errors || []).join('; ') || message.subtype;
      }
    }
  }

  if (errorMsg) throw new Error(`SDK query failed: ${errorMsg}`);
  return result || '';
}

module.exports = { sdkQuery };
```

### Integration into DispatchCoordinator

```javascript
// packages/dispatcher/lib/coordinator.cjs — additions only
// _deps injection for orchestrator (matches existing pattern)

const { analyzeDag, checkFileOverlap, summarizeFailure, triageConflicts } = require('./orchestrator.cjs');

class DispatchCoordinator {
  constructor(projectRoot, opts) {
    // ... existing code ...
    const deps = options._deps || {};
    // New deps for Phase 145:
    this._analyzeDag = deps.analyzeDag || analyzeDag;
    this._checkFileOverlap = deps.checkFileOverlap || checkFileOverlap;
    this._summarizeFailure = deps.summarizeFailure || summarizeFailure;
    this._triageConflicts = deps.triageConflicts || triageConflicts;
    this._dag = null;  // cached from analyzeDag, set before dispatchWave
  }

  async dispatchWave(plans) {
    // Run DAG analysis once before dispatching
    if (!this._dag) {
      this._dag = await this._analyzeDag(this._root);
    }
    // Validate file overlap
    const phases = plans.map(p => p.phase);
    const overlap = this._checkFileOverlap(this._root, phases);
    if (overlap.overlapping.length > 0) {
      // Emit warning events for each overlapping pair (don't block — user may override)
      for (const pair of overlap.overlapping) {
        this._aggregator.emit('event', 'system', {
          type: 'system', subtype: 'overlap_warning',
          phases: pair.phases, files: pair.files,
        });
      }
    }
    // ... existing dispatchWave logic ...
  }

  async _handleExit(sessionId, exitCode, worktreePath, branch) {
    // ... existing code ...
    if (exitCode !== 0) {
      // Generate failure summary
      const summary = await this._summarizeFailure(sessionId);
      this._aggregator.emit('event', sessionId, {
        type: 'system', subtype: 'failure_summary',
        sessionId, summary,
      });
      // ... existing FAILED.json write + registry.update ...
    }
    // In merge_failed case:
    if (result && !result.ok) {
      const triage = await this._triageConflicts(result.conflicts || [], this._root);
      this._registry.update(sessionId, {
        status: 'merge_failed',
        conflicts: result.conflicts || [],
        conflictTriage: triage,
      });
    }
  }
}
```

### Reading NDJSON Tail (for summarizeFailure)

```javascript
// Source: verified NDJSON format from spawn.cjs + relay.cjs
function readNdjsonTail(sessionId, lineCount = 50) {
  const ndjsonPath = path.join(require('node:os').tmpdir(), `pde-session-${sessionId}.ndjson`);
  try {
    const content = fs.readFileSync(ndjsonPath, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    return lines.slice(-lineCount).join('\n');
  } catch (_) {
    return '';
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` | Renamed to v0.1.0 (Agent SDK) | Import path changed; no API changes |
| Auto-loads filesystem settings | No settings by default (v0.1.0+) | v0.1.0 breaking change | Must explicitly pass `settingSources` if needed |
| `ClaudeCodeOptions` (Python only) | `ClaudeAgentOptions` | v0.1.0 | TypeScript API unchanged |
| Claude Code system prompt by default | Minimal system prompt by default | v0.1.0 | Pass `systemPrompt: { type: 'preset', preset: 'claude_code' }` to restore |

**Deprecated/outdated:**
- `@anthropic-ai/claude-code`: use `@anthropic-ai/claude-agent-sdk` instead (renamed, same API)
- `maxThinkingTokens` option: deprecated in favor of `thinking` option

## Open Questions

1. **SDK cold-start latency for DAG analysis**
   - What we know: SDK spawns a claude subprocess internally; first call may take 2-5 seconds
   - What's unclear: Whether this latency is acceptable before dispatching a wave, or if DAG analysis should be done lazily/async
   - Recommendation: Call `analyzeDag` eagerly when `--parallel` flag is detected in `pde-tools.cjs`, before any dispatch. Cache result. Latency is acceptable because the user is about to wait for multiple phase executions anyway.

2. **SDK-03 static vs reasoned analysis**
   - What we know: PLAN.md frontmatter has `files_modified` — pure regex extraction works; SDK-03 says "static file-overlap analysis"
   - What's unclear: Are there cases where PLAN.md doesn't exist yet and reasoning is needed?
   - Recommendation: Default to static regex parsing (fast, no API cost, zero latency). Fall back to SDK analysis only if PLAN.md is absent for a requested phase.

3. **SDK failures when ANTHROPIC_API_KEY absent**
   - What we know: SDK throws or returns error if key missing; CI may not have key
   - What's unclear: Should orchestrator functions be fail-safe (return empty result) or throw?
   - Recommendation: Wrap all SDK calls in try/catch; return sensible defaults on failure (empty DAG = no parallelism analysis, no failure summary). Log warning but never block dispatch.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >= 20 | Dynamic `import()` | ✓ | 20.20.0 | — |
| `@anthropic-ai/claude-agent-sdk` | SDK-02, SDK-04, SDK-05 | Not yet (to be installed) | 0.2.84 | — |
| `ANTHROPIC_API_KEY` env var | All SDK calls | ✓ (production) / ✗ (tests) | — | Mock `sdkQuery` in tests |
| `.planning/ROADMAP.md` | SDK-02, SDK-03 | ✓ | — | Return empty DAG |
| Phase PLAN.md frontmatter | SDK-03 | ✓ (for phases 143-144) | — | SDK fallback for phases without PLAN.md |
| Session NDJSON file in `/tmp/` | SDK-04 | ✓ (written by relay.cjs) | — | Return "No session log available." |

**Missing dependencies with no fallback:**
- None — all have fallbacks or are installable.

**Missing dependencies with fallback:**
- `@anthropic-ai/claude-agent-sdk` — must be installed before Phase 145 runs; Wave 0 task is `npm install`.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run tests/dispatcher/ --reporter=verbose` |
| Full suite command | `npx vitest run tests/ --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SDK-01 | `packages/dispatcher/package.json` has `@anthropic-ai/claude-agent-sdk` dependency | smoke | `node -e "require('./packages/dispatcher/lib/sdk-bridge.cjs')"` | ❌ Wave 0 |
| SDK-02 | `analyzeDag()` calls sdkQuery with ROADMAP.md path, returns parsed object | unit | `npx vitest run tests/dispatcher/orchestrator.test.cjs` | ❌ Wave 0 |
| SDK-03 | `checkFileOverlap()` correctly detects shared files from PLAN.md frontmatter | unit | `npx vitest run tests/dispatcher/orchestrator.test.cjs` | ❌ Wave 0 |
| SDK-04 | `summarizeFailure()` reads NDJSON tail, calls sdkQuery, returns string | unit | `npx vitest run tests/dispatcher/orchestrator.test.cjs` | ❌ Wave 0 |
| SDK-05 | `triageConflicts()` calls sdkQuery with file list, returns strategy string | unit | `npx vitest run tests/dispatcher/orchestrator.test.cjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/dispatcher/ --reporter=verbose`
- **Per wave merge:** `npx vitest run tests/ --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/dispatcher/sdk-bridge.test.cjs` — covers dynamic import isolation, sdkQuery result extraction, error handling
- [ ] `tests/dispatcher/orchestrator.test.cjs` — covers SDK-02 through SDK-05 with mocked sdkQuery
- [ ] `packages/dispatcher/lib/sdk-bridge.cjs` — the ESM bridge (prerequisite for all other files)
- [ ] Package install: `cd packages/dispatcher && npm install @anthropic-ai/claude-agent-sdk` — required before any import

## Sources

### Primary (HIGH confidence)

- Official Agent SDK docs — `platform.claude.com/docs/en/agent-sdk/overview` — overview, capabilities, installation
- Official TypeScript API reference — `platform.claude.com/docs/en/agent-sdk/typescript` — full `query()` signature, `Options` type, all message types
- Official quickstart — `platform.claude.com/docs/en/agent-sdk/quickstart` — verified code patterns
- Migration guide — `platform.claude.com/docs/en/agent-sdk/migration-guide` — breaking changes from claude-code SDK
- npm registry — `@anthropic-ai/claude-agent-sdk@0.2.84` verified (run 2026-03-26, published 22 hours ago)
- npm exports field inspection — confirmed ESM-only: `".": { "default": "./sdk.mjs" }`, `"type": "module"` — no CJS entry point
- Node.js ESM docs — `nodejs.org/api/esm.html` — `import()` works in CJS on Node 20; `require()` of ESM does not

### Secondary (MEDIUM confidence)

- WebSearch result: common pitfalls article — `liruifengv.com/posts/claude-agent-sdk-pitfalls-en/` — path resolution, Node runtime, API key conflicts
- Prior art in project: `spawn.cjs` CLAUDECODE env var deletion pattern; `coordinator.cjs` `_deps` injection pattern — HIGH confidence for project conventions

### Tertiary (LOW confidence)

- SDK `permissionMode: 'dontAsk'` for analysis-only calls — documented in TypeScript reference, confirmed available in Node SDK

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm version verified 2026-03-26, ESM/CJS nature confirmed by exports field inspection
- Architecture: HIGH — ESM bridge pattern is standard Node.js interop; _deps injection mirrors existing coordinator.cjs pattern
- Pitfalls: HIGH — ERR_REQUIRE_ESM verified by inspecting package.json exports; other pitfalls from official docs
- SDK API: HIGH — full `Options` type and message types from official TypeScript reference

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (SDK is active-development; pin to 0.2.84 and check CHANGELOG before upgrade)
