# Phase 203: Change Tracking + Event Bus - Research

**Researched:** 2026-03-30
**Domain:** Firecrawl changeTracking API + NDJSON event bus integration
**Confidence:** HIGH

## Summary

Phase 203 adds two orthogonal capabilities to the Firecrawl layer: (1) a `watch` subcommand that uses Firecrawl's `changeTracking` format to produce markdown diffs against stored snapshots, and (2) NDJSON event emission from every Firecrawl subcommand so that operations appear in the session log stream and cloud dashboard.

Both capabilities are additive overlays on existing infrastructure. The `firecrawl-cache.cjs` module already has `writeSnapshot` / `readSnapshot` functions with a `snapshots/` directory — no new cache primitives are needed. The `event-bus.cjs` module's `safeAppendEvent()` is already the correct write path; the `pde-tools.cjs` `event-emit` command is the external dispatch interface that workflows call via bash. The web dashboard EventLog (Pane 2) and the tmux `pane-log-stream.sh` both tail the same NDJSON file, so a single `safeAppendEvent()` call feeds both surfaces.

The critical Firecrawl API constraint is that `changeTracking` requires `markdown` to be co-requested in the same `formats` array — omitting markdown produces silent empty diffs. Git-diff mode is free; JSON mode costs 5 credits/page. Default must be git-diff; JSON mode is opt-in only.

**Primary recommendation:** Implement Phase 203 as two plans — Plan 01: `watch` subcommand + snapshot diff logic; Plan 02: event emission hooks in all existing subcommands + event type registration in `pane-log-stream.sh`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md and ROADMAP:
- Depends on Phase 199 (firecrawl-cache.cjs)
- changeTracking format requires markdown to be co-requested in the same call as changeTracking; omitting it produces silent empty diffs — verify before writing watch subcommand prose
- git-diff mode (free) vs JSON mode (5 credits/page) cost difference must be enforced in workflow prose — default to git-diff, JSON mode explicit opt-in only
- /pde:firecrawl watch <url> produces markdown diff showing what changed since baseline snapshot
- Diffs written to .planning/research/firecrawl-cache/snapshots/ — not injected inline
- Every Firecrawl operation (scrape, search, crawl, agent, watch) emits NDJSON event to event bus
- Events must include url, slug, word_count, and operation fields
- Dashboard Pane 5 displays change summary when monitored page diff is non-empty

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHG-01 | User can track changes on competitor/dependency sites via changeTracking format with semantic markdown diffs | Firecrawl changeTracking API verified: `formats: ["markdown", "changeTracking"]` — `writeSnapshot`/`readSnapshot` already in firecrawl-cache.cjs — diff text from `response.changeTracking.diff.text` |
| CHG-02 | Firecrawl operations emit structured NDJSON events to the event bus for dashboard display and session archival | `safeAppendEvent()` in event-bus.cjs is the correct write path — same NDJSON file feeds both `pane-log-stream.sh` (tmux) and the web EventLog via relay — `event-emit` subcommand in pde-tools.cjs is the external dispatch interface |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firecrawl-cache.cjs | local | Snapshot read/write, slug generation | Already used by all Firecrawl subcommands; `writeSnapshot`/`readSnapshot` already implemented |
| event-bus.cjs | local | `safeAppendEvent()` for NDJSON append | Existing singleton used by all PDE monitoring; relay tails the same file |
| mcp__firecrawl__firecrawl_scrape | MCP tool | changeTracking scrape | The only Firecrawl tool that supports `changeTracking` format |
| pde-tools.cjs event-emit | local CLI | External event dispatch from workflow markdown | Established pattern: `node bin/pde-tools.cjs event-emit <type> <json>` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pane-log-stream.sh | local | tmux log stream display | Automatically receives events via `tail -F` on the NDJSON file — no changes required if event types are added to the case block |
| relay.cjs + ingest route | local+cloud | Relays NDJSON to cloud dashboard | Already running; `firecrawl_operation` events pass through automatically via `WireEnvelopeSchema.passthrough()` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `safeAppendEvent()` | `bus.dispatch()` | `bus.dispatch()` is in-process only; `safeAppendEvent()` writes to the NDJSON file that the relay tails — must use `safeAppendEvent` for cross-process visibility |
| Git-diff mode (default) | JSON mode | JSON mode = 5 credits/page extra vs free; JSON mode requires schema and is LLM-powered — not appropriate as default |

**Installation:** No new dependencies. All required modules are local.

## Architecture Patterns

### Recommended Project Structure
```
workflows/firecrawl.md         # Add: watch subcommand, event emission in all subcommands
bin/lib/firecrawl-cache.cjs    # Add: writeDiff() helper (write diff text to snapshots/{slug}-diff.md)
bin/pane-log-stream.sh         # Add: firecrawl_operation case block for colored display
tests/phase-203/               # New: test-watch-diff.cjs, test-event-emission.cjs
```

### Pattern 1: changeTracking Scrape Call
**What:** Co-request `markdown` + `changeTracking` in the same `formats` array. Firecrawl compares against the last stored snapshot server-side for git-diff mode.
**When to use:** `watch` subcommand — second and subsequent calls on the same URL.
**Example:**
```javascript
// Source: https://docs.firecrawl.dev/features/change-tracking (verified 2026-03-30)
mcp__firecrawl__firecrawl_scrape({
  url: URL,
  formats: ["markdown", "changeTracking"],
  // For explicit git-diff mode (free, default):
  // formats: ["markdown", { type: "changeTracking", modes: ["git-diff"] }]
})
```

Response shape (git-diff mode):
```javascript
{
  markdown: "# Page content...",
  changeTracking: {
    changeStatus: "new" | "same" | "changed" | "removed",
    previousScrapeAt: "2026-03-30T00:00:00Z",  // null on first call
    diff: {
      text: "@@ -1,3 +1,3 @@\n # Pricing\n-Starter: $9/mo\n+Starter: $12/mo",
      json: { files: [...], chunks: [...], changes: [...] }
    }
  }
}
```

### Pattern 2: Event Emission from Workflow Markdown
**What:** Each Firecrawl subcommand emits a `firecrawl_operation` NDJSON event after completing its core operation. The event carries `url`, `slug`, `word_count`, and `operation` as required by CHG-02.
**When to use:** After every successful Firecrawl MCP call, before displaying the result to the user.
**Example:**
```bash
# Source: pde-tools.cjs event-emit case block (verified)
node -e "
const { safeAppendEvent } = require('./bin/lib/event-bus.cjs');
const configPath = './\.planning/config.json';
let sessionId = 'unknown';
try {
  const cfg = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
  if (cfg.monitoring && cfg.monitoring.session_id) sessionId = cfg.monitoring.session_id;
} catch {}
safeAppendEvent(sessionId, {
  schema_version: '1.0',
  ts: new Date().toISOString(),
  event_type: 'firecrawl_operation',
  session_id: sessionId,
  url: 'THE_URL',
  slug: 'THE_SLUG',
  word_count: WORD_COUNT,
  operation: 'scrape',  // or 'search', 'crawl', 'agent', 'watch', etc.
  extensions: {}
});
"
```

### Pattern 3: Snapshot Baseline + Diff Write
**What:** On first `watch` call: scrape with `formats: ["markdown"]` only, write result to `snapshots/` via `writeSnapshot`. On subsequent calls: scrape with `formats: ["markdown", "changeTracking"]`, write diff text to a separate diff file in `snapshots/`.
**When to use:** `watch` subcommand logic — detect baseline existence via `readSnapshot(slug)`.

```javascript
// Source: firecrawl-cache.cjs readSnapshot/writeSnapshot (verified)
const slug = cache.slugifyUrl(URL);
const baseline = cache.readSnapshot(slug);  // null = first call

if (!baseline) {
  // First call: establish baseline — scrape markdown only, no changeTracking
  // Write to snapshots/{slug}.md via writeSnapshot()
} else {
  // Subsequent call: scrape with changeTracking
  // If changeStatus === "changed": write diff to snapshots/{slug}-diff.md
  // Display diff text to user (not inline in workflow context)
}
```

### Pattern 4: Diff File Write Convention
**What:** Diff output written to `snapshots/{slug}-diff.md` with timestamp header.
**When to use:** Any time a non-empty diff is produced.

```markdown
# Change Diff: {url}
**Detected:** {timestamp}
**Lines changed:** {N}
**Previous snapshot:** {previousScrapeAt}

```diff
{diff.text}
```
```

### Anti-Patterns to Avoid
- **changeTracking without markdown**: Produces silent empty diffs. `formats` array MUST contain both `"markdown"` and `"changeTracking"` in the same call.
- **JSON mode as default**: Costs 5 credits/page. Git-diff mode is free and sufficient for line-level change detection. JSON mode must be explicit opt-in only.
- **Inlining diff in workflow output**: Success criteria specify diffs written to `snapshots/` directory, not injected inline into the conversation.
- **Using `bus.dispatch()` for cross-process events**: The in-process EventEmitter (`bus`) is only visible within a single Node.js process invocation. For events emitted from workflow bash blocks, `safeAppendEvent()` writes to the NDJSON file that the relay daemon tails.
- **Calling `safeAppendEvent` without reading session_id from config.json**: Using `'unknown'` as session_id makes events invisible on the dashboard. Always read `cfg.monitoring.session_id`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL-to-slug for snapshot file naming | Custom hash function | `slugifyUrl()` from firecrawl-cache.cjs | Already deterministic, tested, 200-char truncated |
| Snapshot read/write | Direct `fs.writeFileSync` to snapshots/ | `writeSnapshot()` / `readSnapshot()` | Handles `ensureCacheDir()`, consistent path resolution |
| Event file append | Direct `fs.appendFileSync` | `safeAppendEvent()` | Swallows ALL errors silently — event log failure must never crash a workflow |
| Diff line count | Manual string split | `diff.text.split('\n').filter(l => l.startsWith('+') || l.startsWith('-')).length` | Standard unified diff counting pattern |
| Session ID lookup | Hardcode 'unknown' | Read from `.planning/config.json` → `cfg.monitoring.session_id` | Required for dashboard routing; 'unknown' events never appear in dashboard |

**Key insight:** firecrawl-cache.cjs and event-bus.cjs already provide all required primitives. Phase 203 is workflow prose additions + a new `watch` subcommand definition.

## Clarification: "Dashboard Pane 5" in Success Criteria

The success criteria mentions "dashboard Pane 5 log stream" for CHG-02 and CHG-03. This refers to the **tmux `pane-log-stream.sh` display** (the local session log pane), NOT the web dashboard's "Pane 5" (which is currently FailureCards at index 4).

Evidence:
- `pane-log-stream.sh` is the log stream in the tmux monitoring setup; it tails the NDJSON file directly
- The web `EventLog` component (Next.js dashboard, Pane 2 in page.tsx) receives all events via the relay → Redis → SSE path — no code changes needed for Firecrawl events to appear there
- `pane-log-stream.sh` currently has no `firecrawl_operation` case block — it falls through to the default gray handler
- Adding a `firecrawl_operation` case to `pane-log-stream.sh` gives colored display with change summaries

The web dashboard EventLog will automatically receive `firecrawl_operation` events if they are emitted via `safeAppendEvent()` — no EventLog component changes needed because `WireEnvelopeSchema` uses `.passthrough()` and the EventLog renders any event_type.

## Common Pitfalls

### Pitfall 1: Silent Empty Diffs (changeTracking without markdown)
**What goes wrong:** `firecrawl_scrape` called with `formats: ["changeTracking"]` only — the `changeTracking` object in the response contains empty diff and `changeStatus: "new"` on every call.
**Why it happens:** Firecrawl requires markdown content to generate the diff. Without it, there is nothing to compare.
**How to avoid:** Always pass `formats: ["markdown", "changeTracking"]` together. Document this constraint prominently in the `watch` subcommand prose.
**Warning signs:** `changeStatus` is always `"new"` even on second and subsequent calls.

### Pitfall 2: JSON Mode Cost Surprise
**What goes wrong:** Using `{ type: "changeTracking", modes: ["json"] }` without realizing it triggers LLM extraction at 5 credits/page extra.
**How to avoid:** Default to `formats: ["markdown", "changeTracking"]` (git-diff, free). Only pass `modes: ["json"]` when user explicitly opts in with a `--json-diff` flag.
**Warning signs:** Credit balance drops 6x faster than expected (5 extra credits per watch call).

### Pitfall 3: Baseline Missing on First Watch Call
**What goes wrong:** If `watch` is called with `changeTracking` on the first scrape of a URL, Firecrawl returns `changeStatus: "new"` and `previousScrapeAt: null` with an empty diff — correct behavior, but the user gets no feedback.
**How to avoid:** Check `readSnapshot(slug)` before scraping. If null (no baseline exists), scrape with `formats: ["markdown"]` only to establish baseline, then inform user: "Baseline snapshot saved. Run again to see diff."
**Warning signs:** User reports "watch always says new, never shows diff."

### Pitfall 4: Diff Written to Wrong Directory
**What goes wrong:** Diff content written to `scrapes/` instead of `snapshots/`, or to a separate directory outside the cache.
**How to avoid:** Always write snapshot and diff files under `snapshots/` via `writeSnapshot()` or a `writeDiff()` wrapper that targets the same path.
**Warning signs:** Diff files not found at expected path in verification step.

### Pitfall 5: Event Session ID = 'unknown'
**What goes wrong:** Events emitted with `session_id: 'unknown'` are stored in Redis under `pde:default:events:unknown` — they never appear on the web dashboard for the current session.
**Why it happens:** config.json not read before calling `safeAppendEvent`.
**How to avoid:** Always read `cfg.monitoring.session_id` from `.planning/config.json` before emitting.
**Warning signs:** Events missing from dashboard even though pane-log-stream shows them (pane-log-stream reads NDJSON file directly; relay filters by session ID).

### Pitfall 6: word_count for search/agent operations
**What goes wrong:** `word_count` field is undefined or 0 for operations that don't cache markdown content (e.g., `search`, `agent`, `crawl`).
**How to avoid:** For search: count words across result descriptions. For agent: use `result.data` word count if available, else 0. For crawl: use the `total_word_count` from `writeCrawl()` return value. Document per-operation word_count derivation in the `watch` subcommand.
**Warning signs:** Events have `word_count: 0` for all non-scrape operations.

## Code Examples

Verified patterns from official sources:

### Watch Subcommand: First Call (Baseline Establishment)
```bash
# Source: firecrawl-cache.cjs verified; changeTracking API verified 2026-03-30
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const slug = c.slugifyUrl('THE_URL');
const baseline = c.readSnapshot(slug);
console.log(JSON.stringify({ hasBaseline: !!baseline, slug }));
"
# If hasBaseline = false: scrape with markdown only, writeSnapshot()
# If hasBaseline = true: scrape with ["markdown", "changeTracking"], writeDiff()
```

### Watch Subcommand: Diff Detection
```javascript
// After scrape with changeTracking:
const ct = response.changeTracking;
if (ct.changeStatus === 'changed') {
  const diffText = ct.diff.text;
  const linesChanged = diffText.split('\n')
    .filter(l => l.startsWith('+') || l.startsWith('-'))
    .filter(l => !l.startsWith('+++') && !l.startsWith('---'))
    .length;
  // Write to snapshots/{slug}-diff.md
  // Display summary: URL, linesChanged, timestamp
}
```

### Event Emission (inline bash in workflow step)
```bash
# Source: pde-tools.cjs event-emit pattern (verified)
node -e "
const { safeAppendEvent } = require('./bin/lib/event-bus.cjs');
const fs = require('fs');
let sessionId = 'unknown';
try {
  const cfg = JSON.parse(fs.readFileSync('.planning/config.json', 'utf-8'));
  if (cfg.monitoring && cfg.monitoring.session_id) sessionId = cfg.monitoring.session_id;
} catch {}
safeAppendEvent(sessionId, {
  schema_version: '1.0',
  ts: new Date().toISOString(),
  event_type: 'firecrawl_operation',
  session_id: sessionId,
  url: 'URL',
  slug: 'SLUG',
  word_count: WORD_COUNT,
  operation: 'OPERATION_NAME',
  extensions: {}
});
"
```

### pane-log-stream.sh Addition
```bash
# Add to the case block in bin/pane-log-stream.sh
firecrawl_operation)
  # Cyan — Firecrawl operation events
  op=$(echo "$line" | jq -r '.operation // ""' 2>/dev/null)
  wc=$(echo "$line" | jq -r '.word_count // 0' 2>/dev/null)
  url_short=$(echo "$line" | jq -r '.url // ""' 2>/dev/null | sed 's|https\?://||' | cut -c1-40)
  printf "${prefix}\033[36m[%s] %-20s %-8s %s (%s words)\033[0m\n" "$ts" "$event_type" "$op" "$url_short" "$wc"
  ;;
```

### Diff File Write Pattern
```bash
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const path = require('path');
const fs = require('fs');
const slug = c.slugifyUrl('THE_URL');
const cacheDir = c.resolveCacheDir();
const diffPath = path.join(cacheDir, 'snapshots', slug + '-diff.md');
const content = [
  '# Change Diff: THE_URL',
  '**Detected:** ' + new Date().toISOString(),
  '**Lines changed:** ' + LINES_CHANGED,
  '**Previous snapshot:** ' + PREVIOUS_SCRAPE_AT,
  '',
  '\`\`\`diff',
  DIFF_TEXT,
  '\`\`\`'
].join('\n');
fs.writeFileSync(diffPath, content, 'utf-8');
console.log(JSON.stringify({ diffPath }));
"
```

## Runtime State Inventory

> This is a greenfield addition phase, not a rename/refactor. No runtime state migration required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `snapshots/` dir in firecrawl-cache — already created by `ensureCacheDir()` | none — dir already exists |
| Live service config | None | none |
| OS-registered state | None | none |
| Secrets/env vars | `FIRECRAWL_API_KEY` — already in use, no new keys needed | none |
| Build artifacts | None | none |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node (bin/lib/*.cjs) | event emission + cache | ✓ | macOS system node | — |
| firecrawl MCP tool | watch subcommand | ✓ (configured Phase 198) | npx firecrawl-mcp | Credit guard halts, fallback to no-watch |
| jq | pane-log-stream.sh new case block | ✓ (system) | macOS brew jq | omit word_count display if jq fails |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` + custom test runner (no Jest/Mocha — project convention) |
| Config file | none — run directly with `node tests/phase-203/test-*.cjs` |
| Quick run command | `node tests/phase-203/test-watch-diff.cjs && node tests/phase-203/test-event-emission.cjs` |
| Full suite command | `node tests/phase-203/test-watch-diff.cjs && node tests/phase-203/test-event-emission.cjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHG-01 | `readSnapshot` returns null on first watch call | unit | `node tests/phase-203/test-watch-diff.cjs` | ❌ Wave 0 |
| CHG-01 | `writeDiff` writes `{slug}-diff.md` to snapshots/ | unit | `node tests/phase-203/test-watch-diff.cjs` | ❌ Wave 0 |
| CHG-01 | diff line count computed correctly from unified diff text | unit | `node tests/phase-203/test-watch-diff.cjs` | ❌ Wave 0 |
| CHG-02 | `safeAppendEvent` writes event with required fields (url, slug, word_count, operation) | unit | `node tests/phase-203/test-event-emission.cjs` | ❌ Wave 0 |
| CHG-02 | event_type is `firecrawl_operation` | unit | `node tests/phase-203/test-event-emission.cjs` | ❌ Wave 0 |
| CHG-02 | session_id read from config.json, not hardcoded | unit | `node tests/phase-203/test-event-emission.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node tests/phase-203/test-watch-diff.cjs && node tests/phase-203/test-event-emission.cjs`
- **Per wave merge:** same (only 2 test files)
- **Phase gate:** Both test files green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-203/test-watch-diff.cjs` — covers CHG-01 (snapshot/diff logic)
- [ ] `tests/phase-203/test-event-emission.cjs` — covers CHG-02 (NDJSON field validation)

## Sources

### Primary (HIGH confidence)
- `bin/lib/firecrawl-cache.cjs` — `writeSnapshot`, `readSnapshot`, `slugifyUrl`, `ensureCacheDir` verified by direct read
- `bin/lib/event-bus.cjs` — `safeAppendEvent` implementation verified by direct read
- `bin/lib/relay.cjs` + `bin/lib/relay-protocol.cjs` — NDJSON tail → HTTP relay mechanism verified
- `dashboard/app/api/ingest/route.ts` — Redis ingest pipeline verified
- `dashboard/app/api/events/route.ts` — SSE delivery to EventLog verified
- `dashboard/lib/wire-schema.ts` — `WireEnvelopeSchema.passthrough()` confirmed — any event_type passes
- `dashboard/lib/event-types.ts` — EVENT_FILTER_GROUPS — `firecrawl_operation` not yet registered (needs addition)
- `bin/pane-log-stream.sh` — tmux log stream; `firecrawl_operation` case block absent (falls through to default gray)
- `dashboard/app/page.tsx` — Pane layout confirmed; Pane 2 = EventLog, Pane 5 = FailureCards
- `workflows/firecrawl.md` — all existing subcommands read; no event emission or watch subcommand present
- Firecrawl changeTracking docs (https://docs.firecrawl.dev/features/change-tracking) — verified 2026-03-30

### Secondary (MEDIUM confidence)
- STATE.md blockers section — changeTracking format requirement cited and confirmed against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules verified by direct code read
- Architecture: HIGH — `safeAppendEvent` + `writeSnapshot`/`readSnapshot` patterns are established and tested
- Firecrawl changeTracking API: HIGH — official docs fetched and confirmed
- Pitfalls: HIGH — "markdown required with changeTracking" confirmed by both STATE.md and official docs
- Dashboard pane mapping: HIGH — code read of page.tsx and pane-log-stream.sh resolves "Pane 5" ambiguity

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (Firecrawl changeTracking API is stable; local module APIs won't change)
