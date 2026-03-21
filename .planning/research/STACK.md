# Stack Research

**Domain:** Intelligent idle time productivity system — additions to existing PDE platform (v0.10)
**Researched:** 2026-03-20
**Confidence:** HIGH — all key claims verified against official Claude Code documentation and the existing PDE codebase directly.

---

## Scope

This document covers ONLY the net-new stack additions required for the v0.10 Idle Time Productivity milestone. The existing PDE stack (Node.js CommonJS, zero npm deps at plugin root, event bus, tmux 6-pane dashboard, `hooks/hooks.json` + `emit-event.cjs`) is validated, stable, and out of scope.

**Core verdict:** No new npm packages are required. The entire idle time productivity feature can be built from Claude Code's existing hook primitives, Node.js built-ins, and the existing `pde-tools.cjs` / tmux infrastructure.

---

## Recommended Stack

### Core Technologies: New Additions

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Claude Code `Notification` hook with `idle_prompt` matcher | Current (verified 2026-03) | Detect when Claude finishes responding and is waiting for user input | The only correct primitive for detecting user-facing idle state. Fires when the agent is genuinely done and waiting — not during agent processing pauses. Hooks into `hooks/hooks.json` using the same `emit-event.cjs` pattern already established in v0.8. No polling, no timing heuristics. |
| `messageIdleNotifThresholdMs` setting | Current (verified 2026-03, configurable since ~early 2026) | Control how quickly the idle_prompt notification fires | Defaults to 60,000ms (60s); set lower (e.g., 5000ms) in `~/.CLAUDE.json` for near-immediate suggestion display. Without this, the 60s default makes suggestions feel stale. PDE's Getting Started doc should recommend `5000` as the default. |
| `tmux display-popup` command | tmux 3.2+ | Display suggestion overlay in the monitoring dashboard terminal | Built-in tmux command, zero install overhead. Fires a centered, dismissible overlay in the active tmux session. This is how PDE surfaces suggestions without interrupting the dashboard panes. Requires tmux 3.2+ — same version already guarded by `monitor-dashboard.sh`. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `fs.appendFileSync` | Built-in (Node 18+) | Append suggestion interaction records to `.planning/idle-log.ndjson` | Every time user acknowledges or dismisses a suggestion. Same pattern as `event-bus.cjs` / `safeAppendEvent()` — atomic append, never crashes on failure. |
| Node.js `fs.readFileSync` | Built-in (Node 18+) | Read `.planning/STATE.md`, `.planning/ROADMAP.md`, `workflow-status.md`, `design-manifest.json` for context-aware suggestion selection | Every idle event: project state determines which suggestion category is relevant (e.g., design phase → collect references; execute phase → prepare test fixtures). Already used pervasively in `pde-tools.cjs`. |
| Node.js `child_process.spawnSync` | Built-in (Node 18+) | Call `pde-tools.cjs` subcommands from the new `hooks/idle-suggestions.cjs` hook handler | Same pattern used in `emit-event.cjs` already. `state-snapshot`, `roadmap analyze`, and `phase-plan-index` provide all needed project context with no extra file-reading logic. |
| `jq` CLI | System package (already required by dashboard panes) | Parse NDJSON suggestion log in bash pane scripts | All 6 existing dashboard panes use `jq` via `tail -F | jq`. The idle pane (7th pane) follows the same pattern. Already required; not new. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Existing `hooks/emit-event.cjs` pattern | Reference implementation for new `hooks/idle-suggestions.cjs` | Copy the stdin-read → JSON parse → pde-tools.cjs spawnSync → exit 0 structure exactly. The idle hook adds suggestion selection logic before the emit call. |
| Existing `bin/pane-*.sh` scripts | Reference implementation for new `bin/pane-idle-suggestions.sh` | The 7th dashboard pane follows the `tail -F ndjson | jq` pattern from `pane-pipeline-progress.sh` and `pane-log-stream.sh`. |
| `tmux display-popup` | Overlay UI for suggestions | Syntax: `tmux display-popup -E "cat /tmp/pde-idle-suggestion.txt; read"`. The `-E` flag closes the popup when the command exits. Available since tmux 3.2. |

---

## Integration Architecture (No New Deps)

The idle time productivity system layers cleanly on existing PDE infrastructure:

```
Claude Code fires Notification(idle_prompt)
        │
        ▼
hooks/idle-suggestions.cjs          ← NEW: ~100 LOC Node.js CommonJS
  1. Reads hook JSON from stdin (cwd, session_id)
  2. Calls: node pde-tools.cjs state-snapshot --cwd <cwd>
  3. Calls: node pde-tools.cjs phase-plan-index <current_phase> --cwd <cwd>
  4. Selects suggestion category from .planning/idle-catalog.md
  5. Writes suggestion to /tmp/pde-idle-suggestion-<session_id>.txt
  6. Calls: node pde-tools.cjs event-emit idle_suggestion --cwd <cwd>
     (appends idle_suggestion event to session NDJSON)
  7. Fires: tmux display-popup -E "cat /tmp/pde-idle-suggestion-<session_id>.txt; read"
  8. Appends to .planning/idle-log.ndjson (acknowledged/dismissed + suggestion_id)
        │
        ▼
bin/pane-idle-suggestions.sh        ← NEW: ~40 LOC bash
  tail -F session.ndjson | jq       (displays idle_suggestion events in 7th tmux pane)
        │
        ▼
.planning/idle-catalog.md           ← NEW: human-editable suggestion catalog
  Organized by PDE phase/context    (plain markdown, no parser needed)
```

**Key property:** If Claude Code's `Notification` hook is unavailable or the popup fails, nothing breaks. The hook exits 0 and the workflow continues. Idle suggestions are a zero-regression additive feature.

---

## Installation

No installation steps for end users. All components are:
- Built-in Node.js APIs
- System tmux (already required)
- System jq (already required)

One optional user-side configuration (recommended in Getting Started doc):

```json
// Add to ~/.CLAUDE.json to get near-immediate idle suggestions (5 seconds vs 60 seconds default)
{
  "messageIdleNotifThresholdMs": 5000
}
```

One addition to `hooks/hooks.json` (PDE ships this — no user action needed):

```json
"Notification": [
  {
    "matcher": "idle_prompt",
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/idle-suggestions.cjs",
        "async": true
      }
    ]
  }
]
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `Notification` hook (`idle_prompt` matcher) | `Stop` hook | Stop fires immediately after every Claude response regardless of whether the user is idle. This creates suggestion spam during long automated phases (plan → execute → verify). `idle_prompt` fires only when Claude is genuinely waiting for user input, which is the correct signal. |
| `tmux display-popup` | Writing to a new tmux pane only | The popup creates a clear, dismissible UI for multi-line suggestion text. A pane alone scrolls continuously and requires users to look at it. Use pane for history (7th pane), popup for active notification. Both together is the right pattern. |
| `tmux display-popup` | `osascript` / `notify-send` / desktop notifications | PDE users are already in the terminal; the tmux popup meets them where they are. Desktop notification libs are platform-specific and add external dependencies. PDE's existing pattern is tmux-native. |
| `.planning/idle-catalog.md` (plain markdown) | JSON rule engine / ML suggestion selection | This is a plugin used by developers. Plain markdown is editable by users, readable by the agent during context loading, and requires no parser. The selection logic (match current phase to catalog section) is 20 lines of Node.js string matching. |
| `appendFileSync` to `.planning/idle-log.ndjson` | No tracking | Tracking which suggestions were acknowledged vs dismissed enables future improvement. Logs are human-readable NDJSON, consistent with the event bus. Cost: near-zero. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Polling the NDJSON event log to detect idle state | False positive rate is high: gaps in the event log happen during LLM inference (no tool calls), not just user idle time. The `idle_prompt` hook is authoritative. | `Notification` hook with `idle_prompt` matcher |
| `SubagentStop` hook for idle detection | Fires after every subagent completes, including within active phases. This is the wrong signal — it fires when agents finish individual tasks, not when the whole interaction is waiting for user input. | `Notification` hook with `idle_prompt` matcher |
| Any npm package for suggestion presentation | Violates zero-npm-deps-at-plugin-root constraint. `tmux display-popup` provides equivalent UI. | `tmux display-popup` (built-in shell command) |
| AI-generated suggestions at idle time (calling Claude API) | Creates a recursive agent loop where idle time generates API calls that reset the idle timer. Suggestions should come from a static, human-editable catalog, not from a live model call. | `.planning/idle-catalog.md` (pre-authored, phase-matched suggestions) |
| Separate background daemon / watcher process | PDE has zero background processes by design. The `Notification` hook is event-driven — no polling loop, no daemon. | `Notification` hook (fires on demand, exits immediately) |
| `tmux display-message` (status bar) | Status bar has ~40 character limit; suggestion text needs 2-5 lines. Status bar is ephemeral (disappears after N seconds). | `tmux display-popup` for active suggestions, 7th pane for history |

---

## Stack Patterns by Variant

**If tmux is not running (user did not launch `/pde:monitor`):**
- Write suggestion to `/tmp/pde-idle-suggestion-<session_id>.txt` only
- Print one-line summary to stdout (visible in Claude Code's terminal)
- Skip `tmux display-popup` call (check `$TMUX` env var — empty means no tmux session)
- Suggestion is still logged to `.planning/idle-log.ndjson`

**If the current PDE phase is an active agent execution (not user-interactive):**
- Suppress popup during wave/plan execution: check `.planning/phases/<N>/workflow-status.md` for in-progress status before firing
- Rationale: suggestions during agent execution phases are disruptive, not helpful — the user genuinely can't act on them until the wave completes

**If the project has no active phase (e.g., between milestones, defining requirements):**
- Use generic "horizon prep" suggestions from the catalog (review ROADMAP.md, update requirements, gather inspiration)
- These are always relevant and require no phase-specific context

---

## Version Compatibility

| Component | Compatible With | Notes |
|-----------|-----------------|-------|
| `Notification` hook (`idle_prompt`) | Claude Code (current, verified March 2026) | `idle_prompt` matcher confirmed present. `messageIdleNotifThresholdMs` confirmed configurable as of early 2026. |
| `tmux display-popup` | tmux 3.2+ | `monitor-dashboard.sh` already requires tmux and installs it if missing. No additional version check needed beyond what v0.8 established. |
| `hooks/idle-suggestions.cjs` | Node.js 18+ | Uses only `fs`, `path`, `child_process`, `os` — same as all existing PDE hook handlers. |
| `messageIdleNotifThresholdMs` in `~/.CLAUDE.json` | Claude Code (current) | Not in `settings.json` — confirmed it lives in `~/.CLAUDE.json` (separate from hooks config). |

---

## Sources

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — `Notification` hook, `idle_prompt` matcher, hook input JSON schema, Stop hook fields (HIGH confidence — official docs, fetched 2026-03-20)
- [GitHub Issue #13922 — Configurable idle_prompt timeout](https://github.com/anthropics/claude-code/issues/13922) — `messageIdleNotifThresholdMs` confirmed implemented, March 6 2026 comment with working config (HIGH confidence — primary source)
- [GitHub Issue #12048 — idle_prompt false positive behavior](https://github.com/anthropics/claude-code/issues/12048) — fires after every response pattern vs true idle state; timing nuances (MEDIUM confidence — issue thread, not official docs)
- [Alexandre Quemy — Notification System for Tmux and Claude Code](https://quemy.info/2025-08-04-notification-system-tmux-claude.html) — Stop vs Notification hook distinction, tmux display-popup integration pattern (MEDIUM confidence — community blog)
- `hooks/hooks.json` (read directly from repo) — Existing hook structure: SubagentStart/Stop, PostToolUse, SessionStart/End, `async: true` pattern, `${CLAUDE_PLUGIN_ROOT}` variable expansion (HIGH confidence — primary source)
- `hooks/emit-event.cjs` (read directly from repo) — stdin-read → parse → spawnSync → exit 0 pattern to replicate in `idle-suggestions.cjs` (HIGH confidence — primary source)
- `bin/pane-pipeline-progress.sh` (read directly from repo) — `tail -F ndjson | jq` pane pattern to replicate in 7th idle pane (HIGH confidence — primary source)
- `bin/lib/event-bus.cjs` (read directly from repo) — NDJSON append, session ID, event envelope schema (HIGH confidence — primary source)
- [tmux man page — display-popup](https://man7.org/linux/man-pages/man1/tmux.1.html) — `display-popup -E` syntax, tmux 3.2+ requirement (HIGH confidence — official documentation)

---

*Stack research for: PDE v0.10 Idle Time Productivity — stack additions only*
*Researched: 2026-03-20*
