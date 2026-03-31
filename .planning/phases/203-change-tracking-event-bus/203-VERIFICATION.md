---
phase: 203-change-tracking-event-bus
verified: 2026-03-30T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Dashboard Pane 5 log stream displays a change summary when a monitored page diff is non-empty — entry includes URL, number of lines changed, and timestamp"
    status: failed
    reason: "ROADMAP Success Criterion #3 requires the dashboard EventLog to show firecrawl_operation events with url and linesChanged. The EventLog component only renders ev.event_type, ev.relay_ts, and the first key of ev.extensions. The url, word_count, operation, and slug fields are emitted as top-level envelope fields (not nested in extensions), so they are invisible in the dashboard display."
    artifacts:
      - path: "dashboard/components/event-log.tsx"
        issue: "Renders extensions keys only — top-level firecrawl-specific fields (url, word_count, operation) are not surfaced in the event row"
    missing:
      - "Either move url/word_count/operation into extensions in firecrawl emission blocks so they appear via the existing extensions renderer, OR add a firecrawl_operation-specific row renderer in EventLog that shows operation, url (truncated), and word_count"
human_verification:
  - test: "Run /pde:firecrawl watch <url> twice on a live page and confirm the diff file appears in .planning/research/firecrawl-cache/snapshots/ and the dashboard Event Log shows the firecrawl_operation event"
    expected: "Second run produces a {slug}-diff.md file; the dashboard EventLog (firecrawl tab) shows an entry for the operation with url and lines-changed visible"
    why_human: "Requires a live Firecrawl API key and a real competitor URL — cannot verify network round-trips or actual diff content programmatically"
  - test: "Open dashboard in browser, select the 'firecrawl' filter tab in the Event Log, confirm entries show operation context (url/word_count) not just the event_type"
    expected: "Each firecrawl_operation row shows the URL or operation type alongside the timestamp"
    why_human: "UI rendering of non-extensions top-level fields requires browser inspection to confirm the gap is user-visible"
---

# Phase 203: Change Tracking + Event Bus Verification Report

**Phase Goal:** Users can monitor competitor or dependency pages for content changes, with semantic diffs surfaced in the dashboard and every Firecrawl operation producing a structured NDJSON event for session archival
**Verified:** 2026-03-30
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                              | Status      | Evidence                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Running `/pde:firecrawl watch <url>` twice produces a markdown diff written to snapshots/{slug}-diff.md           | VERIFIED | `writeDiff()` in firecrawl-cache.cjs writes `snapshots/{slug}-diff.md`; 12 unit tests pass                 |
| 2   | Diff is not injected inline — written to file, path surfaced to user                                              | VERIFIED | watch subcommand Step 6 in firecrawl.md explicitly states "Do NOT inject diff content inline"               |
| 3   | Every Firecrawl operation emits a structured NDJSON event with url, slug, word_count, operation fields            | VERIFIED | 18 `safeAppendEvent` calls across 9 emission blocks (8 subcommands + watch baseline path); 24 tests pass   |
| 4   | Events appear in tmux pane-log-stream with colored firecrawl_operation display                                    | VERIFIED | `firecrawl_operation` case block in pane-log-stream.sh with cyan (`\033[36m`) and operation/url/wc display |
| 5   | Dashboard EventLog shows a change summary (URL, lines changed, timestamp) for firecrawl_operation events          | FAILED  | EventLog renders only event_type + relay_ts + first extensions key; url/word_count/operation are top-level, not rendered |

**Score:** 4/5 truths verified

---

### Required Artifacts

| Artifact                                     | Expected                                               | Status      | Details                                                                                          |
| -------------------------------------------- | ------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------ |
| `bin/lib/firecrawl-cache.cjs`                | writeDiff() helper for writing diff files              | VERIFIED | writeDiff at line 273; exported in module.exports at line 309; returns {slug, path, linesChanged} |
| `workflows/firecrawl.md`                     | watch subcommand + safeAppendEvent in every subcommand | VERIFIED | watch at line 937; 18 safeAppendEvent occurrences across scrape/search/map/extract/crawl/agent/interact/watch |
| `tests/phase-203/test-watch-diff.cjs`        | Unit tests for writeDiff and snapshot logic            | VERIFIED | 12 tests, all pass; covers export, return shape, file path, content structure, dir creation      |
| `bin/pane-log-stream.sh`                     | firecrawl_operation case block with cyan display       | VERIFIED | Case block at line 66 with \033[36m, extracts operation/word_count/url via jq                   |
| `dashboard/lib/event-types.ts`               | firecrawl filter group in EVENT_FILTER_GROUPS          | VERIFIED | `firecrawl: ['firecrawl_operation']` at line 11                                                  |
| `tests/phase-203/test-event-emission.cjs`    | Unit tests for event field validation                  | VERIFIED | 24 tests, all pass; validates all required fields, session_id logic, safeAppendEvent integration |
| `dashboard/components/event-log.tsx`         | Renders firecrawl event details (url, lines, ts)       | PARTIAL  | Renders event_type + relay_ts; firecrawl-specific fields (url, word_count) are top-level, not in extensions, so not rendered |

---

### Key Link Verification

| From                          | To                           | Via                                          | Status   | Details                                                                   |
| ----------------------------- | ---------------------------- | -------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| workflows/firecrawl.md        | bin/lib/firecrawl-cache.cjs  | readSnapshot, writeSnapshot, writeDiff, slugifyUrl | WIRED | All 4 functions referenced in watch subcommand bash blocks                |
| workflows/firecrawl.md        | mcp__firecrawl__firecrawl_scrape | changeTracking format                    | WIRED | formats: ["markdown", "changeTracking"] in Step 4b; pitfall 1 documented  |
| workflows/firecrawl.md        | bin/lib/event-bus.cjs        | safeAppendEvent in bash blocks               | WIRED | 18 occurrences; require('./bin/lib/event-bus.cjs') in every block         |
| bin/pane-log-stream.sh        | NDJSON file                  | tail -F with firecrawl_operation case        | WIRED | Case block present; tail -F at line 29                                    |
| dashboard EventLog            | firecrawl_operation fields   | rendered row display                         | PARTIAL | event_type and relay_ts shown; url/word_count/operation not rendered (not in extensions) |

---

### Data-Flow Trace (Level 4)

| Artifact                          | Data Variable          | Source                                      | Produces Real Data | Status       |
| --------------------------------- | ---------------------- | ------------------------------------------- | ------------------ | ------------ |
| dashboard/components/event-log.tsx | filteredEvents        | useEventStream hook -> SSE -> relay         | Yes (live events)  | FLOWING      |
| bin/pane-log-stream.sh            | firecrawl event fields | NDJSON file tailed from /tmp/pde-session-*  | Yes (real-time)    | FLOWING      |
| bin/lib/firecrawl-cache.cjs (writeDiff) | diff file content | diffText param from changeTracking response | Yes (runtime)      | FLOWING      |
| dashboard EventLog (firecrawl row) | url, word_count, operation | ev.url, ev.word_count — top-level        | Present but unrendered | HOLLOW — fields present in envelope but EventLog component does not display them |

---

### Behavioral Spot-Checks

| Behavior                              | Command                                                                                              | Result          | Status |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------- | ------ |
| writeDiff unit tests pass             | `node tests/phase-203/test-watch-diff.cjs`                                                          | 12/12 passed    | PASS   |
| Event emission unit tests pass        | `node tests/phase-203/test-event-emission.cjs`                                                      | 24/24 passed    | PASS   |
| watch subcommand present in routing   | `grep -c "Subcommand: watch" workflows/firecrawl.md`                                                | 1               | PASS   |
| safeAppendEvent in all subcommands    | `grep -c "safeAppendEvent" workflows/firecrawl.md`                                                  | 18              | PASS   |
| firecrawl_operation in pane-log-stream | `grep -q "firecrawl_operation" bin/pane-log-stream.sh`                                             | Match found     | PASS   |
| firecrawl filter group in dashboard   | `grep -q "firecrawl" dashboard/lib/event-types.ts`                                                  | Match found     | PASS   |
| Dashboard renders firecrawl url/wc    | Inspect EventLog row renderer for top-level url/word_count fields                                   | Not rendered    | FAIL   |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                           | Status    | Evidence                                                                                                       |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| CHG-01      | 203-01      | User can track changes on competitor/dependency sites via changeTracking format with semantic markdown diffs | SATISFIED | writeDiff() in firecrawl-cache.cjs; watch subcommand in firecrawl.md with baseline-first pattern; 12 tests pass |
| CHG-02      | 203-02      | Firecrawl operations emit structured NDJSON events to event bus for dashboard display and session archival | PARTIAL   | Events emitted (18 blocks, 24 tests pass); pane-log-stream and filter group registered; but dashboard display does not surface url/linesChanged per ROADMAP SC#3 |

**Orphaned requirements:** None — CHG-01 and CHG-02 are the only requirements mapped to Phase 203 in REQUIREMENTS.md, and both are claimed by a plan.

---

### Anti-Patterns Found

| File                               | Line | Pattern                              | Severity | Impact                                                                   |
| ---------------------------------- | ---- | ------------------------------------ | -------- | ------------------------------------------------------------------------ |
| workflows/firecrawl.md             | 1029 | `'MARKDOWN_CONTENT_FROM_RESPONSE'`   | Warning  | Placeholder string in emission block template — Claude must replace at runtime; not a code stub, expected workflow pattern |
| workflows/firecrawl.md             | 1036 | `'URL_FROM_ARGS'`, `'SLUG_FROM_STEP4'` | Warning | Same as above — template placeholders requiring runtime substitution; documented inline |
| dashboard/components/event-log.tsx | 109–112 | extensions-only renderer for extra fields | Warning | Firecrawl event's url/word_count/operation are top-level; only extensions keys are rendered — firecrawl detail is invisible |

Note: The workflow template placeholders (MARKDOWN_CONTENT_FROM_RESPONSE, URL_FROM_ARGS, etc.) are NOT blockers — they are the expected authoring style for Claude-executed workflows. The executor replaces them at runtime. They are documented inline in the workflow with "Replace X with Y" instructions.

The dashboard rendering gap IS a functional gap against ROADMAP SC#3.

---

### Human Verification Required

#### 1. Live Watch Cycle End-to-End

**Test:** Configure a Firecrawl API key and run `/pde:firecrawl watch https://example.com` twice (with a content change between calls if possible, or use a page that updates frequently).
**Expected:** First call creates `.planning/research/firecrawl-cache/snapshots/{slug}.md`. Second call produces `.planning/research/firecrawl-cache/snapshots/{slug}-diff.md` with a header and fenced diff block. The diff is NOT printed inline in the conversation.
**Why human:** Requires a live Firecrawl API key and network access — cannot be verified programmatically without calling the live API.

#### 2. Dashboard EventLog Firecrawl Tab

**Test:** With the dashboard running and a session active, trigger a `/pde:firecrawl scrape` operation and open the dashboard. Click the "firecrawl" filter tab in the Event Log.
**Expected:** A row appears for the firecrawl_operation event. Currently the row shows only event_type and timestamp — per the gap found, url and word_count are NOT displayed. Verify this matches expected behavior, then decide whether the missing field display is acceptable or requires a fix.
**Why human:** Requires a running dashboard with a live session connected — cannot verify visual rendering programmatically.

---

### Gaps Summary

One gap blocks full goal achievement: the ROADMAP Success Criterion #3 requires the dashboard to display a change summary that includes URL and lines-changed for firecrawl_operation events. The EventLog component renders events generically — it shows `event_type` and `relay_ts`, and displays the first key of `ev.extensions` as label text. The firecrawl emission blocks place `url`, `word_count`, `operation`, and `slug` as top-level envelope fields (not nested under `extensions`), so these fields pass through the WireEnvelopeSchema but are never rendered by the EventLog row renderer.

Fix path (two options):
1. **Move firecrawl metadata into extensions in the emission blocks** — change each `safeAppendEvent` call so url/slug/word_count/operation are nested under `extensions: { url, slug, word_count, operation }`. The existing EventLog renderer will then display `url` as the first extensions key (partial improvement — still only shows one key).
2. **Add a firecrawl-specific row renderer** — in EventLog, add a conditional branch for `ev.event_type === 'firecrawl_operation'` that renders `{operation} {url} ({word_count} words)` alongside the timestamp.

Option 2 fully satisfies SC#3. Option 1 is a minimal partial fix.

The remaining four truths are fully verified with passing unit tests, confirmed commits, and implementation evidence.

---

_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
