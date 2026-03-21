# Pitfalls Research

**Domain:** Adding intelligent idle time productivity to an existing AI-assisted development platform (PDE v0.10)
**Researched:** 2026-03-20
**Confidence:** HIGH for UX and flow-interruption pitfalls (grounded in published developer cognition research and PDE codebase inspection); HIGH for Claude Code hook integration pitfalls (official Claude Code hooks documentation); MEDIUM for suggestion relevance and content generation pitfalls (pattern inference from adjacent domains)

---

## The Fundamental Tension

Idle time productivity is the wrong frame. The real question is: "What can a developer do during a PDE wait that makes the next PDE cycle better?" The moment the feature optimizes for "keeping the user busy" rather than "shortening the feedback loop between human and PDE," it becomes a distraction engine masquerading as productivity tooling.

PDE phases (research, plan, execute) can take 2-10 minutes. During that time, a developer who was in deep flow does not want task interruption — they want a safe place to mentally discharge or pre-load the next cycle. The feature succeeds if users say "I did something useful while PDE was running." It fails if users say "PDE kept bothering me."

Every architectural decision in v0.10 must be measured against this tension.

---

## Critical Pitfalls

### Pitfall 1: Interrupting Flow to Announce Idle Time

**What goes wrong:**
The suggestion system fires at the moment Claude Code becomes idle — immediately after a subagent stops or a tool completes — and presents a list of productive activities the user "could" do. The user was mentally tracking the PDE process, possibly planning their next instruction, and the suggestion pane flashes or refreshes with new content. This is an interruption, not a suggestion. It costs the user the same cognitive recovery time as any other notification: 23 minutes of lost deep focus for a complex coding task, 15 minutes minimum before flow is re-established.

**Why it happens:**
The `Notification` hook with `idle_prompt` matcher is the natural integration point for detecting Claude Code idle state. Developers building the feature wire this hook to immediately surface suggestions, conflating "technically idle" with "needs input." The system is optimized for zero latency between PDE idle and suggestion display, when the correct optimization is "suggestions are visible when the user looks for them, not when PDE becomes idle."

**How to avoid:**
- Suggestions belong in the persistent tmux dashboard (pane 6 or a dedicated pane), not in a notification or Claude Code conversation output. The user consults the pane when they want it — the pane does not demand attention.
- If the `Notification`/`idle_prompt` hook is used at all, it should update a file or pane silently. It must not produce stdout that Claude Code injects into the conversation, and must not ring, flash, or produce visible terminal output in the main Claude Code pane.
- The hook handler must be `async: true` with no stdout output (only silent file writes). Any output from a hook handler is shown to the user by Claude Code — this is a feature of the hook system, not a side effect to ignore.
- Design rule: suggestions are pull, not push. The user pulls suggestions from the dashboard pane when they choose. PDE never pushes suggestions into the user's primary workflow.

**Warning signs:**
- The `idle_prompt` hook handler produces stdout or writes to the conversation transcript.
- Suggestion content appears in the main Claude Code terminal pane.
- The dashboard pane refreshes visibly (flickers, scrolls) at the moment of PDE idle state, rather than updating quietly.
- A test that validates "suggestions appear within N seconds of idle state" — timing to idle onset is the wrong metric.

**Phase to address:** Phase 1 (hook integration and delivery mechanism) — the delivery architecture must be established before any suggestion content is generated. Getting the delivery wrong here poisons all downstream content work.

---

### Pitfall 2: Suggestions That Don't Connect to the Current PDE Phase

**What goes wrong:**
The suggestion engine generates a generic list of "things to do while waiting" — write tests, review the README, check GitHub issues — without knowing what PDE is currently doing. A user running `/pde:wireframe` gets suggestions to "externalize domain knowledge" (relevant for brief phase) or "set up test fixtures" (relevant for execute phase). The suggestions feel irrelevant, the user dismisses them once, and then ignores the entire pane for the rest of the session. The feature has effectively zero adoption after the first irrelevant suggestion.

**Why it happens:**
Phase context is available in the NDJSON event stream and in `.planning/` state files, but the suggestion generator is written as a static template engine rather than a context reader. The NDJSON events (`phase_start`, `plan_wave_start`, workflow semantic events) contain exactly the information needed to select phase-appropriate suggestions — but reading this stream requires a small runtime that parses the session log, which feels like "over-engineering" during implementation.

**How to avoid:**
- The suggestion engine must read the current PDE phase from the NDJSON event stream before generating any suggestions. The session-scoped NDJSON file at `/tmp/pde-session-{id}.ndjson` already contains `phase_start` events with phase name. Reading the last `phase_start` event gives the current phase.
- Define a suggestion taxonomy keyed by PDE phase: `brief` phase → user story externalization, domain knowledge, business rules; `wireframe` phase → taste decisions (typography, color palette reference), visual inspiration; `execute` phase → test data preparation, environment setup, bug triage; `research` phase → competitor screenshots, product screenshots, reference material curation.
- A suggestion shown with a phase label ("During wireframe phase, this is productive:") is valued; a suggestion shown without context is noise.
- If the current phase cannot be determined from the event stream, default to generic "parallel work" suggestions (unrelated bug fixes, docs, git housekeeping) and label them as "no active PDE phase detected."

**Warning signs:**
- Suggestion content is hardcoded without reading the NDJSON event stream.
- The same suggestion list appears regardless of whether PDE is in brief, wireframe, or execute phase.
- No `phase_start` event parsing in the suggestion generator.
- Users in the execute phase see design-focused suggestions (or vice versa).

**Phase to address:** Phase 2 (phase-aware suggestion taxonomy) — the taxonomy and phase-reading logic must be built as part of the first suggestion generation implementation, not added as a follow-up enhancement.

---

### Pitfall 3: The Suggestion Engine Becomes a Mini-AI Feature (Over-Engineering)

**What goes wrong:**
The suggestion engine expands beyond static phase-keyed suggestions into a dynamic LLM-powered activity recommender that analyzes `.planning/` state files, reads the current task in `workflow-status.md`, and generates personalized suggestions for this specific project, this specific phase, and this specific user. This requires spawning a subagent, reading multiple state files, and producing natural-language output — turning a "while you wait" feature into a feature that itself requires waiting. The suggestion generation takes 30-60 seconds. The user asks PDE a question, waits for PDE's answer, then waits for PDE to generate suggestions about what to do while they were waiting.

**Why it happens:**
The highest-value suggestions are project-specific ("the acceptance criteria for task-007 need clarification — do that now"). Reaching that specificity requires reading project state. The temptation is to add one more file read, one more context dimension, until the feature is a full context-aware recommendation engine. Each addition feels like a marginal improvement; the cumulative result is a feature that contradicts its own premise.

**How to avoid:**
- Hard constraint: suggestion generation must complete within 2 seconds. If it requires an LLM call or reads more than 3 files, it violates this constraint.
- Use a tiered approach: static phase-keyed templates (zero latency) as the base layer; optional one-liner contextual hints derived from single-file reads (e.g., reading the current task name from `workflow-status.md` to personalize the suggestion label) as the enhancement layer. The enhancement layer must degrade gracefully if the file does not exist.
- The suggestion pane in the tmux dashboard displays pre-computed markdown content written by a hook handler. The hook handler reads phase from the NDJSON stream (one file read, no LLM) and selects from the static taxonomy. This is the entire suggestion engine.
- Reserve LLM-powered suggestion generation for a future milestone (AutoResearch pattern). v0.10 must work offline with zero LLM calls for the suggestion generation itself.

**Warning signs:**
- The suggestion generator spawns a subagent or calls `pde-tools.cjs` with an LLM-backed command.
- Suggestion generation reads more than 3 files.
- The tmux suggestion pane shows "Generating suggestions..." before displaying content.
- v0.10 planning documents describe "intelligent suggestion engine" or "AI-powered recommendations" without a latency constraint.

**Phase to address:** Phase 1 (design constraint definition) — the 2-second constraint and static-taxonomy approach must be the design contract before any implementation begins. Define the constraint explicitly in the phase requirements so it cannot drift during implementation.

---

### Pitfall 4: Treating the `idle_prompt` Hook as a Reliable Idle State Signal

**What goes wrong:**
The implementation uses the `Notification`/`idle_prompt` hook as the primary signal for "PDE is idle, show suggestions now." In practice, `idle_prompt` fires when Claude Code is waiting for the user to type a message — not necessarily when a PDE phase has completed. It fires after every response, including short one-sentence answers where the user is mid-workflow and does not want suggestion prompts. It fires multiple times in a session, potentially hundreds of times. A suggestions pane that refreshes on every `idle_prompt` fires constantly, and a hook handler that performs file writes on every `idle_prompt` generates significant I/O.

**Why it happens:**
`idle_prompt` is the most visible "idle" signal available in the Claude Code hook system. The v0.8 event infrastructure hooks use `SubagentStop` and `SessionEnd` for meaningful state transitions. The `idle_prompt` notification seems analogous — "Claude is idle, so PDE is idle." But `idle_prompt` fires on every turn boundary, not just after long-running PDE phases.

**How to avoid:**
- Use PDE's own semantic event stream as the primary signal for "a meaningful PDE operation completed." The NDJSON events `subagent_stop`, `phase_start`, and workflow semantic events (`plan_wave_complete`) are better signals for "suggest something now" than `idle_prompt`.
- If `idle_prompt` is used, gate suggestion updates on whether the last PDE event in the NDJSON stream represents a meaningful completion (a subagent stopped, a phase completed). An `idle_prompt` that fires without a preceding meaningful PDE event should not trigger a suggestion refresh.
- The suggestion pane should update at most once per completed PDE phase, not once per idle_prompt fire.
- The hook handler for `Notification`/`idle_prompt` must be `async: true` and must do nothing if the PDE session has not recently completed a meaningful operation. The check is a single stat() call on the NDJSON file followed by a tail-read — fast enough to not block.

**Warning signs:**
- The tmux suggestion pane visibly refreshes more than once per PDE operation.
- The `idle_prompt` hook handler does not check the NDJSON stream before writing new suggestions.
- `/tmp/pde-session-{id}.ndjson` grows unusually fast (many small hook-triggered writes per session).
- The suggestion pane shows the same content repeated many times in the session log.

**Phase to address:** Phase 1 (hook integration architecture) — the event-gating logic for `idle_prompt` must be in the hook handler from the first implementation.

---

### Pitfall 5: The Suggestion Pane Competes with Monitoring Dashboard Panes for Attention

**What goes wrong:**
A new "suggestions" pane is added to the tmux dashboard as a 7th pane. On small terminals (the common case — the tmux adaptive layout already degrades from 6 to 2 panes), the suggestion pane gets priority assigned incorrectly: it either replaces a high-value monitoring pane (pipeline progress, token meter) or causes all panes to shrink below readable size. The dashboard's TMUX-09 adaptive layout logic, which handles degradation from 6 panes to 2 panes at minimum terminal sizes, has to be updated for 7 panes — introducing regression risk for existing pane layout tests.

Additionally, a suggestions pane that shows content permanently occupies screen real estate even when PDE is actively running and the user is watching agent activity. The pane competes visually with the agent activity pane, drawing the user's attention to suggestions when they want to monitor execution.

**How to avoid:**
- The suggestion pane should share space with an existing low-priority pane rather than requiring a new 7th pane. The most natural integration is into pane 6 (log stream or an under-used pane during active phases), with the pane content switching between "log stream" during active PDE operations and "suggestions" during idle periods.
- Alternatively, surface suggestions in a standalone tmux pane that is only opened when PDE has been idle for >30 seconds (not a permanent pane), and closed automatically when a new PDE operation starts.
- The adaptive layout logic must treat the suggestion display as optional — if terminal is below 6-pane threshold, suggestions are not shown (they can be accessed via a separate command).
- Add a `/pde:suggestions` command that dumps the current suggestion set to stdout — this provides the content without requiring the tmux pane to be visible.

**Warning signs:**
- The v0.10 dashboard implementation adds a 7th pane unconditionally.
- Existing pane layout tests fail after adding suggestion pane support.
- The suggestion pane is visible (and updated) while a PDE subagent is actively running.
- No `/pde:suggestions` fallback command exists for users without tmux.

**Phase to address:** Phase 3 (tmux dashboard integration) — pane placement and adaptive layout impact must be assessed before implementing the pane, not retrofitted after the layout breaks.

---

### Pitfall 6: Suggestion Content That Creates Context Switching Cost at Resumption

**What goes wrong:**
A suggestion prompts the user to open a new Claude Code session for "parallel work" (a parallel bug fix, docs update, git housekeeping). The user follows the suggestion, opens a parallel session, starts working on a different task. PDE completes in the primary session. The user now has two active cognitive contexts — the PDE task they were waiting on and the parallel task they started. Re-entering the PDE session requires rebuilding the mental model they had before the suggestion, plus managing the parallel session's state. The suggestion successfully "kept the user busy" and created a net negative productivity outcome.

This is the fundamental UX trap: suggestions that maximize activity during idle time systematically undermine the post-idle context restoration. The research baseline is clear: it takes 23 minutes to recover from an interruption for standard tasks, and 45 minutes for complex coding tasks. A well-intentioned suggestion can impose this cost at exactly the wrong moment.

**Why it happens:**
"Parallel Claude Code sessions for unrelated work" is listed as a valid idle activity category in the project memory for this milestone. The suggestion is technically correct — users can and do run parallel sessions. But a suggestion to start parallel work is functionally an instruction to context-switch, which is the primary developer productivity antipattern.

**How to avoid:**
- Restrict default suggestions to activities that: (a) require no new cognitive context to begin, and (b) produce artifacts that feed the current PDE cycle. Examples that pass: annotate a screenshot, write one acceptance criterion, make a taste decision (choose a typeface), review the last PDE output. Examples that fail: start a parallel bug fix, open a new issue, write documentation.
- "Low-interruption" suggestions are ones the user can start and stop within 2 minutes without losing their place. The session memory file for this milestone already identifies good categories: source material curation, human-taste decisions, review/critique queue. These are the right defaults.
- Suggestions for parallel work (parallel sessions, unrelated tasks) must be explicitly opt-in, not in the default suggestion set. If offered, they must be labeled "Context-switching activity — consider your return to this PDE session."
- Never suggest starting a new Claude Code session as an idle activity. The user already has one open.

**Warning signs:**
- Suggestion content includes "open a parallel session" or "work on an unrelated bug" as a default (unlabeled) suggestion.
- No distinction in suggestion content between "feeds the current PDE cycle" activities and "unrelated work" activities.
- Suggestions are not labeled with expected time-to-complete or resumption cost.

**Phase to address:** Phase 2 (suggestion taxonomy design) — the taxonomy must explicitly categorize suggestions by resumption cost before any content is written. Activities with high resumption cost are either excluded or labeled.

---

### Pitfall 7: State File Pollution From Idle Suggestion Infrastructure

**What goes wrong:**
The suggestion system writes a suggestion state file to `.planning/` on every idle event — `suggestions.md` or `idle-state.json` — to persist the current suggestion set for the pane reader. Over a multi-hour session with many PDE operations, this file is written dozens of times. Because suggestions are keyed to PDE phases, and PDE phases rotate through research → plan → execute → reconcile repeatedly, the suggestion file represents stale context the moment the next phase starts. Over multiple sessions, the file accumulates; `.planning/` fills with idle-state artifacts that are meaningless outside their originating session.

Additionally, the suggestion state file may be accidentally committed to git if the developer runs `git add .` during an execute phase.

**Why it happens:**
The v0.8 event infrastructure uses `/tmp/pde-session-{id}.ndjson` for session-scoped data (ephemeral, auto-cleaned on reboot) and `.planning/logs/` for persistent session summaries. The idle suggestion feature needs a writable location for the pane to read suggestion content. `.planning/` feels like the right place (it's where all PDE state lives), but suggestion state is ephemeral session data, not project state.

**How to avoid:**
- All suggestion state belongs in `/tmp/`, not `.planning/`. The suggestion pane script reads from `/tmp/pde-suggestions-{sessionId}.md` — session-scoped, auto-cleaned, never committed.
- If suggestion content needs to persist across sessions (e.g., a "review queue" the user has built up), it belongs in `.planning/logs/` with a session archive summary, not in a live state file.
- The suggestion file must not be written to `.planning/` or any directory that could be included in a `git add .`. Verify this constraint in the phase that implements the file write path.
- `hooks.json` modifications for the idle suggestion hook must not create a new persistent file type in `.planning/`.

**Warning signs:**
- `idle-state.json` or `suggestions.md` appears in `.planning/` root.
- Running `git status` after a PDE session shows modified suggestion state files as unstaged changes.
- The suggestion file path hardcoded to `.planning/` in the hook handler.
- Multiple suggestion state files accumulating in `.planning/` across sessions.

**Phase to address:** Phase 1 (hook handler implementation) — the file write path must be `/tmp/` from the first implementation. Changing this later requires finding all readers of the wrong path.

---

### Pitfall 8: Zero-Suggestions State Not Designed

**What goes wrong:**
On first install, before any PDE phase has run, the suggestion pane shows either an error ("Could not read suggestion file"), an empty pane, or a stale file from a previous session. The user opens the dashboard for the first time and the suggestion pane appears broken. This is a first-impression failure that creates lasting distrust of the feature.

Similarly, when no PDE session is active (the user launched the dashboard without running any PDE command), the pane has no phase context and no NDJSON event stream to read. The suggestion logic that checks "last completed phase" finds nothing.

**Why it happens:**
Suggestion generation is designed for the happy path: PDE is running, a phase just completed, the NDJSON stream has recent events. The edge cases (no session, first run, session between PDE operations) are not considered during implementation.

**How to avoid:**
- The suggestion pane script must have an explicit "no active session" state that renders useful content: a short description of what the pane does when PDE is running, plus a list of universally applicable activities (source material curation, writing acceptance criteria ahead of time, human taste decisions) that are phase-agnostic.
- The suggestion file at `/tmp/pde-suggestions-{sessionId}.md` must have a well-defined initial state that the pane writer creates on `SessionStart`, before any phase has completed.
- The "no session" fallback (no NDJSON file found) must render a specific message, not an empty pane. Suggested text: "Waiting for PDE to start a phase. Suggestions will appear when a phase completes."
- Test the zero-state explicitly: start the dashboard without running any PDE command and verify the pane renders sensible fallback content.

**Warning signs:**
- The suggestion pane shows an empty box or error text when no PDE session is active.
- No `SessionStart` hook handler initializes the suggestion file.
- The pane script crashes when the suggestion file does not exist.
- No test covers the "dashboard open, no PDE session" scenario.

**Phase to address:** Phase 3 (tmux pane implementation) — the zero-state must be specified in the pane script requirements and tested before the phase is marked complete.

---

### Pitfall 9: Suggestion Content Becomes Stale Across PDE Versions

**What goes wrong:**
The suggestion taxonomy references PDE phase names, workflow steps, and artifact paths that match v0.10. When PDE is updated in v0.11+ (new phase names, new workflow structure, new artifact types), the suggestion content refers to outdated steps. A suggestion that says "annotate your wireframe in `.planning/design/ux/`" is wrong if v0.11 changes the wireframe output path. A suggestion that says "complete the `brief` phase first" is wrong if a future milestone refactors phase naming.

**Why it happens:**
Suggestion content is typically written as prose strings embedded in JavaScript or as markdown files — neither form has a test that validates the referenced paths, commands, or phase names exist in the current PDE version.

**How to avoid:**
- Suggestion content must not reference specific file paths or PDE command names directly. Use abstract descriptions: "review your wireframe outputs" rather than "review `.planning/design/ux/WFR-*.html`."
- Where PDE command names must be referenced (e.g., "run `/pde:flows` to prepare"), use a constant or reference table so updates require a single change, not a content audit.
- Add at least one Nyquist regression test that validates suggestion taxonomy keys match the current set of PDE phase names in the event schema. A taxonomy entry that references a non-existent phase name should fail a test.
- Keep suggestion content at the level of user intent ("externalize acceptance criteria"), not implementation specifics ("edit `task-003.md`").

**Warning signs:**
- Suggestion strings contain hardcoded file paths matching `.planning/design/ux/WFR-*.html` or similar.
- No test validates suggestion taxonomy keys against the PDE event schema.
- Suggestion content refers to PDE command names that have changed in recent milestones.

**Phase to address:** Phase 2 (suggestion taxonomy) — content must be written at the right abstraction level from the start. The Nyquist test for taxonomy key validity belongs in Phase 2 or Phase 3.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Writing suggestion state to `.planning/` instead of `/tmp/` | Simpler path resolution (already know `.planning/` path) | State files committed to git accidentally; pollutes project state; accumulates across sessions | Never — suggestion state is ephemeral session data, not project state |
| Using `idle_prompt` hook without NDJSON event-gating | Single hook fires on every idle, simple to wire | Suggestion pane refreshes constantly during normal Claude Code use, not just PDE phase completions | Never — gate on meaningful PDE events only |
| Static suggestion content without phase-keying | Faster to implement; no NDJSON reads | Suggestions feel irrelevant; user trains themselves to ignore the pane; adoption collapses after first session | Never for the default suggestion set; acceptable only for the "no active session" fallback |
| Adding a 7th tmux pane unconditionally | Simplest architecture | Breaks existing adaptive layout for terminals below 6-pane threshold; regression risk for TMUX-09 | Never — either share an existing pane or make the suggestion pane conditional |
| LLM-powered suggestion generation | Highest-quality, most personalized suggestions | Generates a wait before the thing that reduces wait; violates the premise of the feature | Acceptable only as an explicit opt-in future enhancement (v0.13 AutoResearch milestone), never as the default path |
| Stdout output from the idle_prompt hook handler | Easiest way to surface content to the user | Claude Code displays hook stdout to the user in the main conversation pane — this is an interruption, not a suggestion | Never — suggestion delivery must be via pane file update only |

---

## Integration Gotchas

### Claude Code Hook System (`hooks.json`)

| Common Mistake | Correct Approach |
|----------------|------------------|
| Adding `Notification`/`idle_prompt` hook with synchronous execution | Use `async: true` — the notification hook must not block Claude Code's notification delivery pipeline |
| Producing stdout from the hook handler | The hook handler writes to `/tmp/pde-suggestions-{sessionId}.md` only — zero stdout. Claude Code displays hook stdout to the user. |
| Assuming `idle_prompt` maps 1:1 with "PDE phase completed" | Check the NDJSON event stream; only update suggestions when the last event is a meaningful PDE completion (subagent_stop after a phase, not just any idle_prompt) |
| Registering the suggestion hook globally without a phase-awareness gate | Add phase-detection logic inside the handler; the hook itself cannot filter by PDE context |

### NDJSON Event Stream

| Common Mistake | Correct Approach |
|----------------|------------------|
| Reading the full NDJSON session file on every `idle_prompt` | Tail the last N lines (last 20 events) — the phase context is always in recent events; reading the full file grows costly over long sessions |
| Assuming session ID is available in the `idle_prompt` hook payload | The `idle_prompt` notification payload contains `session_id` from Claude Code's perspective, but PDE's session ID (written by `session-start` in `emit-event.cjs`) is stored separately; resolve via the PDE session ID file in `/tmp/` |
| Reading `.planning/STATE.md` or `workflow-status.md` for phase context | These files reflect workflow-level state, not event-level state; reading them requires file stat + read for every suggestion update. The NDJSON tail is sufficient and cheaper. |

### tmux Dashboard

| Common Mistake | Correct Approach |
|----------------|------------------|
| Hardcoding the suggestion pane as pane 6 (0-indexed) | The adaptive layout can drop to 2 panes; the suggestion pane must be conditional on terminal size, or integrated into an existing pane |
| Using `tmux send-keys` to update suggestion pane content | Write to a temp file and use `watch cat` or a polling script in the pane — consistent with how existing dashboard panes (pane-log-stream.sh, pane-pipeline-progress.sh) work |
| Starting the suggestion pane script before the PDE session has a session ID | The suggestion pane script must wait for the PDE session NDJSON file to appear in `/tmp/` before starting its read loop |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling the NDJSON event file on every pane refresh interval (e.g., every 2 seconds) | CPU usage visible in activity monitor during active PDE sessions; NDJSON file has high inotify pressure | Increase poll interval for suggestion pane to 10-15 seconds (suggestions don't need second-level freshness); use `inotifywait` or `fswatch` on macOS as a file-change trigger instead of interval polling | Immediately on active sessions with high event volume (execute phase, many subagents) |
| Writing the suggestion file on every `idle_prompt` hook (100+ times per session) | High I/O on `/tmp/`; hook latency increases over session lifetime | Gate suggestion file writes on meaningful PDE events only (see Pitfall 4) | Any session with 50+ Claude Code turns |
| Reading all suggestion categories on every pane refresh | Memory and parse time grows if taxonomy is large | Load taxonomy once at pane script startup, store in shell variables; re-read only when NDJSON shows a new phase | If taxonomy grows to 50+ entries per phase |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Suggestions that require reading to understand (long text) | User skims or dismisses; cognitive load during idle period should be lower than during active work | Each suggestion is one sentence, action-oriented, starting with a verb: "Write one acceptance criterion for the next planned task." |
| More than 3 suggestions visible at once | User treats the list as a task queue; feels pressure rather than option; ignores the list after first overwhelm | Show exactly 2-3 suggestions maximum; rotate if more are available; never show a scrollable list |
| Suggestions that require knowing PDE internals ("annotate WFR artifacts") | User unfamiliar with PDE internals ignores the suggestion | Suggestions describe the human activity, not the PDE artifact: "Make a typography choice for your product" not "set a typeface in assets/tokens.css" |
| No way to dismiss or mark suggestions complete | Suggestion pane shows the same items repeatedly; completed suggestions feel like undone tasks | Add a simple completed-today list to the suggestion state; hide suggestions marked completed in this session; reset at session start |
| Suggestions during the first 60 seconds of a PDE phase | User is still reading the phase output, tracking agent progress, or planning their next instruction — this is the highest-cost interruption window | Apply a 60-second minimum cool-down after phase start before surfacing suggestions; suggestions are for the middle of waiting, not the start |

---

## "Looks Done But Isn't" Checklist

- [ ] **Zero-state renders correctly:** Open the tmux dashboard without running any PDE command and verify the suggestion pane shows fallback content, not an error or empty box.
- [ ] **Async hook execution:** Verify `async: true` is set on the `idle_prompt` hook handler in `hooks.json` — blocking notification hooks delay Claude Code's UI response.
- [ ] **No stdout from hook handler:** Confirm the `idle_prompt` handler produces zero stdout (only file writes) — any stdout appears in the main Claude Code conversation pane as an interruption.
- [ ] **Suggestion file in `/tmp/`, not `.planning/`:** Run `git status` after a full PDE session and verify no suggestion state files appear as unstaged changes.
- [ ] **Phase-keyed suggestions differ by phase:** Run PDE through brief phase, then wireframe phase — verify the suggestion pane shows distinct content for each phase, not the same list.
- [ ] **Pane does not break adaptive layout:** Resize terminal to below 6-pane threshold; verify existing dashboard panes still display correctly and the suggestion pane degrades gracefully.
- [ ] **Suggestion refresh rate is bounded:** Over a 30-minute PDE session with 5 phases, verify the suggestion file is written no more than once per phase completion, not once per `idle_prompt` fire.
- [ ] **2-second generation constraint met:** Time the suggestion generation from phase-completion event to file write; verify it completes under 2 seconds without LLM calls.
- [ ] **No parallel-session suggestions in default set:** Review all default suggestion content; confirm "open a parallel session" or equivalent is not in the default taxonomy (may be in an opt-in extended set).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Suggestion state written to `.planning/` (wrong path) | LOW | Move file write path to `/tmp/` in hook handler; delete existing `.planning/` suggestion files; add to `.gitignore` |
| `idle_prompt` hook producing stdout (polluting conversation) | LOW | Remove stdout from handler; ensure only file writes; redeploy hooks.json |
| Suggestion pane breaking adaptive layout | MEDIUM | Revert to 6-pane layout; integrate suggestions into existing pane; update adaptive layout tests |
| LLM-powered suggestion engine shipping by mistake | HIGH | Remove LLM call; replace with static taxonomy; rewrite suggestion generator to respect 2-second constraint; update Nyquist tests |
| Suggestions irrelevant to current phase (no NDJSON reading) | MEDIUM | Add NDJSON tail read to handler; map phase events to taxonomy keys; test with each PDE phase |
| Stale suggestion content after PDE version upgrade | LOW | Audit taxonomy content against current phase names; update abstract descriptions; add taxonomy key validation test |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Flow interruption from push-delivery (Pitfall 1) | Phase 1: Hook integration | Verify hook handler has zero stdout; suggestion content only in tmux pane; pane does not flash on idle_prompt fire |
| Phase-irrelevant suggestions (Pitfall 2) | Phase 2: Suggestion taxonomy | Run PDE through 3 distinct phases; verify suggestion pane shows different content for each phase |
| Over-engineering the suggestion engine (Pitfall 3) | Phase 1: Design constraint definition | Measure suggestion generation time; must complete under 2 seconds; no LLM calls in the critical path |
| `idle_prompt` over-firing (Pitfall 4) | Phase 1: Hook integration | Count suggestion file writes over a 20-turn PDE session; must not exceed phase-completion count |
| Suggestion pane breaking dashboard layout (Pitfall 5) | Phase 3: tmux dashboard integration | Run layout tests at 6-pane and degraded terminal sizes; verify no regressions in existing pane behavior |
| High-resumption-cost suggestions (Pitfall 6) | Phase 2: Suggestion taxonomy | Audit all default suggestions against resumption-cost criteria; reject any requiring parallel context |
| State file pollution in `.planning/` (Pitfall 7) | Phase 1: File write path | `git status` after a full session shows zero untracked/modified suggestion files |
| Zero-state not designed (Pitfall 8) | Phase 3: tmux pane implementation | Start dashboard without PDE session; verify fallback content renders; no errors or empty pane |
| Stale content across PDE versions (Pitfall 9) | Phase 2: Taxonomy + test | Nyquist test validates taxonomy keys against current PDE phase name constants |

---

## Sources

- PDE PROJECT.md v0.10 milestone goal and target features — HIGH confidence
- PDE codebase inspection: `hooks/hooks.json` (current hook registrations, async flags), `hooks/emit-event.cjs` (HOOK_TO_EVENT_TYPE map, stdout behavior), `bin/lib/event-bus.cjs` (NDJSON session file path pattern `/tmp/pde-session-{sessionId}.ndjson`), `bin/monitor-dashboard.sh` (adaptive layout, SESSION name, MIN_COLS/MIN_ROWS), `bin/pane-log-stream.sh` and related pane scripts (pane pattern: watch a file, no LLM calls) — HIGH confidence
- PDE agent memory: `project_idle_time_productivity.md` (idle activity category taxonomy, feedback loop framing) — HIGH confidence
- Claude Code official hooks documentation: `https://code.claude.com/docs/en/hooks` — `Notification`/`idle_prompt` hook event, payload schema, `additionalContext` return, async execution behavior — HIGH confidence
- UC Irvine / Gloria Mark research on interruption recovery: 23 minutes 15 seconds average recovery time; 45 minutes for complex coding tasks; flow requires 15 uninterrupted minutes to enter — HIGH confidence (widely cited, multiple independent sources)
- arxiv.org: "Developer Interaction Patterns with Proactive AI: A Five-Day Field Study" (2601.10253) — workflow boundary interventions well-received; mid-task interventions frequently dismissed — MEDIUM confidence (academic, specific study conditions)
- arxiv.org: "Optimizing LLM Code Suggestions: Feedback-Driven Timing with Lightweight State" (2511.18842) — timing is the critical UX variable for developer suggestion tools; mistimed suggestions degrade both UX and ROI — MEDIUM confidence
- tmux GitHub issues: pane-died hook inconsistencies (#2483), pane-exited scope bugs (#2882), focus-events requirement for focus hooks (#2808) — relevant to why hook-based idle detection needs event-gating — HIGH confidence (official issue tracker)
- Notification fatigue in developer tooling: Courier.com "Notification Fatigue Is Real and Getting Worse" (Jan 2026); Icinga alert fatigue analysis — pattern applies to suggestion noise — MEDIUM confidence (industry analysis, not developer tool-specific study)
- Stack Overflow blog: "Developer Flow State and Its Impact on Productivity" (2018) — foundational flow state entry time and interruption impact — HIGH confidence (widely replicated finding)

---

*Pitfalls research for: Adding intelligent idle time productivity to PDE (v0.10 Idle Time Productivity milestone)*
*Researched: 2026-03-20*
