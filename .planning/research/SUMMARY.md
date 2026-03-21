# Project Research Summary

**Project:** PDE v0.10 — Intelligent Idle Time Productivity
**Domain:** Ambient developer productivity — context-aware suggestions during AI agent processing wait time
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

PDE v0.10 adds an intelligent idle time productivity system to an already-mature platform. The core design insight from research is that this feature must optimize for "shortening the human-machine feedback loop" — not for "keeping the user busy." Every architectural decision flows from this constraint. The right delivery mechanism is a persistent tmux pane (pull-based, passive) that shows context-aware suggestions while agents run. The wrong mechanism is any notification, push alert, or hook that produces stdout — all of which interrupt rather than assist. Research on developer cognition (Gloria Mark/UC Irvine) establishes a 23-minute recovery cost for interruptions to complex coding tasks; the design must never impose that cost in exchange for a suggestion the user could have pulled from a passive pane.

The implementation is deliberately conservative: no new npm dependencies, no LLM calls in the suggestion generation path, no new background processes. The entire feature is built from Claude Code's `Notification`/`idle_prompt` hook, the existing NDJSON event stream, Node.js built-ins, and `tmux display-popup`. A static phase-keyed suggestion catalog (`.planning/idle-catalog.md`, plain markdown, editable by users) covers 90% of contextual variation at zero latency cost. The catalog is the content work; the infrastructure is minimal. Research is unambiguous that LLM-powered personalization at suggestion-display time contradicts the feature's premise — it makes users wait for the thing that reduces waiting.

The critical risk is the delivery architecture, which must be established before any suggestion content is written. If the `idle_prompt` hook produces stdout, suggestions appear in the main Claude Code conversation pane as interruptions. If the pane refreshes on every `idle_prompt` fire instead of only on meaningful PDE phase completions, it becomes noise. Both failures are architectural, not content-level, and both are irreversible after suggestion content is written around them. Phase 1 must lock in the delivery contract — `async: true` hook, file writes to `/tmp/` only, pane reads passively — before Phase 2 authors any catalog content.

## Key Findings

### Recommended Stack

The entire idle time productivity feature is buildable from existing PDE infrastructure with zero new dependencies. The only new primitives are Claude Code's `Notification` hook with the `idle_prompt` matcher (for detecting genuine user-facing idle state, as distinct from agent processing pauses) and `tmux display-popup` for the suggestion overlay (tmux 3.2+, already guarded by the v0.8 dashboard). All other components follow established PDE patterns: `hooks/idle-suggestions.cjs` mirrors `hooks/emit-event.cjs`; `bin/pane-idle-suggestions.sh` mirrors `bin/pane-pipeline-progress.sh`; `.planning/idle-catalog.md` is plain markdown requiring no parser.

One user-side configuration is strongly recommended: `"messageIdleNotifThresholdMs": 5000` in `~/.CLAUDE.json`, reducing the idle detection threshold from the 60-second default to 5 seconds. Without this, suggestions feel stale by the time they appear. PDE's Getting Started documentation should include this setting.

**Core technologies:**
- `Notification` hook (`idle_prompt` matcher): idle state detection — the only authoritative signal for "Claude is genuinely waiting for user input"; fires on turn completion, not agent processing gaps
- `messageIdleNotifThresholdMs: 5000` in `~/.CLAUDE.json`: threshold configuration — required to make suggestions feel timely; 60s default makes the feature feel broken
- `tmux display-popup -E`: active suggestion overlay — built-in tmux command, no install, centered dismissible UI; available since tmux 3.2 (already required by v0.8)
- Node.js `fs` / `child_process` built-ins: all file I/O and subprocess calls — consistent with all existing PDE hook handlers
- `.planning/idle-catalog.md`: suggestion content store — plain markdown, human-editable, no parser needed; phase-keyed sections drive selection logic (~20 lines of Node.js string matching)

See `.planning/research/STACK.md` for full rationale, integration architecture diagram, alternatives considered, and version compatibility table.

### Expected Features

The MVP for v0.10 is six P1 features: phase-aware suggestion engine (core logic), blockers-first prioritization, artifact review queue, domain knowledge externalization prompts, upcoming phase preview, and the tmux suggestion pane. These are interdependent — without the suggestion engine, nothing else surfaces; without the pane, nothing is visible. The phase-specific question bank (6 phases × 3-5 questions) is content work on the critical path, not code work. Two P2 features (artifact-fed suggestion targeting, human-taste decision queue) extend the core after validation. P3 features require additional infrastructure and belong in future milestones.

**Must have (table stakes — v0.10 core):**
- Phase-aware suggestion engine — reads STATE.md + DESIGN-STATE.md on `phase_started` event; ranked suggestion list; without phase context, suggestions are generic noise
- Blockers-first prioritization — zero new infrastructure; promotes STATE.md `blockers` field to top of list; highest ROI per line of code
- Artifact review queue — on `phase_complete` event, scans `.planning/design/` for new artifacts; surfaces "new artifact ready for review" with specific file paths from design-manifest.json
- Domain knowledge externalization prompts — phase-specific question bank; stores user answers in `.planning/context-notes/`; consumed by planning phase in the next cycle
- Upcoming phase preview — reads ROADMAP.md next-phase entry; surfaces 2-3 preparation prompts; zero new infrastructure
- tmux suggestion pane (Pane 7, full-layout only) — full-width bottom banner; passive and ignorable; adaptive degradation: full layout only, `build_minimal_layout()` unchanged

**Should have (v0.10.x — extend after core validation):**
- Artifact-fed suggestion targeting — adds specific file paths and finding summaries from design-manifest.json + critique outputs
- Human-taste decision queue — reads DESIGN-STATE.md incomplete choices; outputs to `.planning/design/taste-decisions.md`

**Defer (v1.0+ / future milestones):**
- Parallel session templates — crosses session boundaries; touches tmux session management outside current event infrastructure
- Time-bounded micro-task calibration — requires phase duration history from session archives; start with fixed heuristics if ever prioritized

**Anti-features explicitly excluded from v0.10:**
- Interrupting users on phase completion (destroys the non-intrusive contract)
- LLM-generated suggestions (creates recursive wait; violates the feature's premise)
- Gamification — streaks, points, badges (rejected pattern in professional developer tooling)
- Dedicated `/pde:idle` command (requires behavior change; ambient display is the value)
- Persistent idle-task history across sessions (marginal value; per-agent memory has a 50-entry cap for context bloat reasons)

See `.planning/research/FEATURES.md` for full feature dependency graph, activity categories by PDE phase, and competitor/analog analysis.

### Architecture Approach

The idle time productivity system sits between the existing event bus (producer) and the tmux dashboard (consumer), adding one new consumer layer. The pane script (`pane-idle-suggestions.sh`) tails the NDJSON event stream and calls the suggestion engine (`idle-suggestions.cjs`) on `subagent_start`, `phase_started`, and `plan_started` events. The engine reads up to three files synchronously (STATE.md, first 30 lines of ROADMAP.md, first 80 lines of current PLAN.md), classifies the phase type by keyword matching, and returns a ranked suggestion list from the static catalog. Total latency budget: under 2 seconds, no LLM calls. Build order is strictly sequential: engine first, pane script second, dashboard integration third, optional `pde-tools.cjs idle` command fourth.

**Major components:**
1. `bin/lib/idle-suggestions.cjs` — suggestion engine: phase context reader, static catalog lookup, idle window detection (AGENT_COUNT tracking), ANSI output formatter; NEW; zero npm deps; CJS with no top-level side effects (follows `event-bus.cjs` convention)
2. `bin/pane-idle-suggestions.sh` — tmux pane script: tails NDJSON, tracks AGENT_COUNT, calls suggestion engine on state transitions, renders to terminal, handles zero-state gracefully; NEW; follows `pane-pipeline-progress.sh` pattern exactly
3. `bin/monitor-dashboard.sh` (`build_full_layout()` only) — add one `split-window -v -p 20` block after existing 6 panes; full-width bottom banner; MODIFIED (surgical, additive); `build_minimal_layout()` unchanged
4. `.planning/idle-catalog.md` — suggestion content: phase-keyed question bank; human-editable markdown; NEW; this is the content critical path
5. `.planning/context-notes/` — output directory for user-authored domain knowledge notes; NEW; consumed by `/pde:plan` and `/pde:brief` in subsequent phases

**Unchanged components:** `bin/lib/event-bus.cjs`, all 6 existing pane scripts, all workflow files, `mcp-bridge.cjs`, `hooks/emit-event.cjs`.

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams, component responsibility table, anti-patterns, build order with phase dependencies, and tmux layout options.

### Critical Pitfalls

1. **Push delivery via hook stdout (Pitfall 1)** — The `idle_prompt` hook handler must produce zero stdout. Claude Code displays hook stdout in the main conversation pane; any output is an interruption, not a suggestion. Hook must be `async: true`, write only to `/tmp/pde-suggestions-{sessionId}.md`, and exit silently. This must be verified before any suggestion content is authored — getting delivery wrong poisons all downstream content work.

2. **`idle_prompt` over-firing (Pitfall 4)** — `idle_prompt` fires on every turn boundary, not just PDE phase completions. Gate suggestion updates on meaningful PDE events in the NDJSON stream: update at most once per completed PDE phase (`subagent_stop` after a phase). Without this gate, the pane refreshes constantly and becomes noise the user trains themselves to ignore.

3. **Phase-irrelevant suggestions (Pitfall 2)** — A suggestion engine that does not read current phase from the NDJSON stream will show the same list regardless of whether PDE is in wireframe or execute phase. Users ignore the pane after the first irrelevant suggestion and never return. Phase-keyed taxonomy is non-negotiable for any v0.10 adoption.

4. **LLM-powered suggestion generation (Pitfall 3)** — Hard constraint: suggestion generation must complete within 2 seconds. Any LLM call violates this. The engine reads at most 3 files synchronously and selects from a pre-authored catalog. LLM personalization belongs in a future AutoResearch milestone, not the idle time productivity critical path.

5. **State file pollution in `.planning/` (Pitfall 7)** — All suggestion state belongs in `/tmp/`, not `.planning/`. Files written to `.planning/` can be accidentally committed, accumulate across sessions, and create a second source of truth. Verify file write paths before integration testing; run `git status` after a full session to confirm zero suggestion files appear as unstaged changes.

6. **Pane breaking adaptive layout (Pitfall 5)** — The 7th pane must be added to `build_full_layout()` only. Small terminals cannot handle 7 panes; adding to `build_minimal_layout()` defeats the degradation model. Add a `/pde:suggestions` fallback command for users without tmux. Test at degraded terminal sizes before marking dashboard integration complete.

See `.planning/research/PITFALLS.md` for 9 pitfalls total, including warning signs, a "looks done but isn't" checklist, phase-to-pitfall mapping, and recovery cost estimates.

## Implications for Roadmap

Three phases with strict dependency ordering. Delivery architecture before content; content before dashboard integration. Phase 4 (pde-tools.cjs command) is optional additive convenience.

### Phase 1: Hook Integration and Delivery Architecture

**Rationale:** The delivery contract must be locked in before any suggestion content is written. Hook stdout behavior is a binary constraint that cannot be retrofitted cleanly after the catalog is built around it. The `idle_prompt` over-firing problem and the `/tmp/` file path constraint are both Phase 1 decisions. This phase has the highest architectural risk and the lowest scope — it must close before Phase 2 begins.

**Delivers:**
- `hooks/idle-suggestions.cjs` hook handler: `async: true`, zero stdout, writes to `/tmp/pde-suggestions-{sessionId}.md`, event-gated on meaningful PDE phase completions (checks NDJSON tail before writing)
- `hooks.json` addition: `Notification` / `idle_prompt` matcher entry with `async: true`
- Getting Started doc update: `messageIdleNotifThresholdMs: 5000` recommendation in `~/.CLAUDE.json`
- Design constraint documented and enforced: 2-second generation budget, no LLM calls, max 3 file reads, all suggestion state in `/tmp/`
- Blockers-first prioritization logic: reads STATE.md `blockers` field; zero new infrastructure; can be tested in isolation before pane exists

**Addresses:** Non-intrusive delivery (table stakes), dismissable/ignorable (table stakes), blockers-first prioritization (P1)

**Avoids:** Pitfall 1 (push delivery via stdout), Pitfall 4 (idle_prompt over-firing), Pitfall 7 (state file pollution in `.planning/`)

---

### Phase 2: Suggestion Catalog and Phase-Aware Engine

**Rationale:** With delivery architecture confirmed and verified, Phase 2 authors the suggestion catalog (content work, critical path) and implements the phase-aware selection logic in `bin/lib/idle-suggestions.cjs`. The catalog must be written at the right abstraction level — user intent, not PDE artifact paths — to remain valid across future PDE version upgrades. The Nyquist test validating taxonomy keys against PDE phase name constants belongs in this phase.

**Delivers:**
- `.planning/idle-catalog.md`: phase-keyed question bank (6 phases × 3-5 suggestions each), generic fallback section for no-active-phase state, each suggestion labeled with expected time-to-complete and resumption cost category
- `bin/lib/idle-suggestions.cjs`: phase context reader (NDJSON tail, last 20 events), phase keyword classification (research/plan/execute/design/validation/_default), catalog lookup, ANSI output formatter, graceful fallbacks for missing state files; exports `getSuggestions(opts)` and `formatSuggestions(suggestions)` with no top-level side effects
- `.planning/context-notes/` directory with README: output path for user-authored domain knowledge notes; consumed by `/pde:plan` and `/pde:brief` in subsequent phases
- Nyquist test: validates suggestion taxonomy keys against current PDE phase name constants; catches stale catalog entries after version upgrades

**Addresses:** Phase-aware suggestion engine (P1), domain knowledge externalization prompts (P1), upcoming phase preview (P1), artifact review queue (P1)

**Avoids:** Pitfall 2 (phase-irrelevant suggestions), Pitfall 3 (over-engineering/LLM calls), Pitfall 6 (high-resumption-cost suggestions in default set), Pitfall 9 (stale content across PDE versions)

---

### Phase 3: tmux Dashboard Integration

**Rationale:** With both the hook handler and suggestion engine complete and independently testable, Phase 3 integrates the 7th pane into the dashboard. This is last because dashboard regression risk is the highest of the three phases — the adaptive layout (6→4→3→2 pane degradation) must not break. Pane placement (full-layout only, full-width bottom banner via `split-window -v -p 20`) is established by architecture research and should not be reconsidered here.

**Delivers:**
- `bin/pane-idle-suggestions.sh`: NDJSON tail loop, AGENT_COUNT tracking (increment on `subagent_start`, decrement on `subagent_stop`), calls `idle-suggestions.cjs` on first `subagent_start` transition (AGENT_COUNT == 1), renders output to terminal, explicit zero-state fallback ("Waiting for PDE to start a phase. Suggestions will appear when a phase completes.")
- `bin/monitor-dashboard.sh` modification: one `split-window -v -p 20` block in `build_full_layout()` after existing 6 panes, with `send-keys` for `pane-idle-suggestions.sh`; `build_minimal_layout()` unchanged
- `pde-tools.cjs idle suggest` command (optional but recommended): stdout fallback dumps current suggestion list for non-dashboard access
- `workflows/monitor.md` update: 7-pane layout description

**Addresses:** tmux suggestion pane (P1 — required for all other features to be visible), zero-state design, non-tmux fallback

**Avoids:** Pitfall 5 (pane breaking adaptive layout), Pitfall 8 (zero-state not designed), breaking `build_minimal_layout()` for small terminals

---

### Phase Ordering Rationale

- Delivery architecture before content: hook stdout behavior is a binary constraint verified in isolation; content built around wrong delivery is a full rewrite
- Engine before pane: `idle-suggestions.cjs` is unit-testable standalone (`node idle-suggestions.cjs --phase "execute-phase-70" --plan "1"`) without any dashboard changes; catalog iteration has no tmux dependency
- Pane integration last: dashboard regression risk is real; complete, tested engine means pane integration test is scoped to layout only
- Phase 4 (`pde-tools.cjs idle` command) is optional convenience; it can ship with Phase 3 or be deferred without blocking the milestone

### Research Flags

Phases needing deeper research during planning:
- None identified. The research corpus covers all three phases with HIGH confidence from direct codebase inspection and verified official documentation. No external APIs, no unknown tool surfaces.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Hook Integration):** Claude Code `Notification`/`idle_prompt` hook behavior verified against official docs; existing `hooks.json` pattern and `emit-event.cjs` handler inspected directly; no ambiguity.
- **Phase 2 (Suggestion Engine):** CJS module pattern, NDJSON tail read, STATE.md schema, and ROADMAP.md structure are all directly derived from existing PDE codebase. Catalog content authoring is editorial judgment, not a research question.
- **Phase 3 (Dashboard Integration):** `build_full_layout()` modification is additive; pane script follows `pane-pipeline-progress.sh` exactly; layout degradation behavior follows established `build_minimal_layout()` precedent.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All claims verified against official Claude Code docs (fetched 2026-03-20) and direct codebase inspection. `idle_prompt` matcher confirmed present. `messageIdleNotifThresholdMs` confirmed configurable via GitHub issue #13922 (March 6 2026 comment with working config). Zero new npm dependencies — consistent with existing plugin-root constraint. |
| Features | MEDIUM | Table stakes and anti-features are grounded in UX research (Gloria Mark, CHI 2025, NN/g, JetBrains survey n=23K+). Feature priorities and MVP scope are inferred from existing PDE infrastructure and stated milestone goals. No direct competitor product exists — this is a novel feature space. Content quality of the suggestion catalog is a subjective risk not resolvable by research alone. |
| Architecture | HIGH | Fully derivable from direct codebase inspection. Every new component has a named analog in the existing codebase. Build order and component boundaries are unambiguous. The 7-pane layout extension is the only implementation risk, and it is well-understood and mitigated by the "full layout only" constraint established in architecture research. |
| Pitfalls | HIGH | UX pitfalls grounded in published developer cognition research (Gloria Mark: 23-minute recovery, independently replicated; CHI 2025 proactive assistant study). Hook system pitfalls verified against official Claude Code documentation and direct inspection of existing hook behavior in `hooks.json` and `emit-event.cjs`. Technical debt patterns derived from direct PDE codebase inspection. |

**Overall confidence:** HIGH

### Gaps to Address

- **Suggestion catalog content quality:** The `.planning/idle-catalog.md` question bank must be authored as part of Phase 2. Research establishes the right abstraction level (user intent, not PDE artifact paths) and the right categories (6 phases × 3-5 suggestions), but actual question wording requires editorial judgment. Poorly worded suggestions feel like homework rather than productivity help. This is the primary subjective risk for v0.10 adoption.

- **DESIGN-STATE.md incomplete-choices tracking:** The human-taste decision queue (P2 feature) depends on DESIGN-STATE.md consistently tracking incomplete design system choices. Whether this field is reliably populated in the current v0.10 baseline is unconfirmed by research. Validate before committing to P2 feature scope during planning.

- **Phase duration estimation for time-bounded calibration:** Time-bounded micro-task calibration (P3/future feature) requires session archive data for phase duration history. Research recommends starting with fixed heuristics (research phase: 5-10 min, execute phase: 10-30 min per task) until real usage data accumulates. No gap for v0.10, but relevant to future milestone scoping.

## Sources

### Primary (HIGH confidence)

- `hooks/hooks.json`, `hooks/emit-event.cjs`, `bin/lib/event-bus.cjs`, `bin/pane-pipeline-progress.sh`, `bin/pane-agent-activity.sh`, `bin/pane-token-meter.sh`, `bin/monitor-dashboard.sh`, `bin/pde-tools.cjs`, `.planning/PROJECT.md` — direct PDE codebase inspection; integration patterns, NDJSON schema, event types, pane conventions, adaptive layout logic, zero-npm constraint
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — `Notification` hook, `idle_prompt` matcher, hook input JSON schema, `async` flag behavior, stdout-to-conversation-pane behavior
- [GitHub Issue #13922](https://github.com/anthropics/claude-code/issues/13922) — `messageIdleNotifThresholdMs` confirmed implemented, working config example, March 6 2026
- [tmux man page — display-popup](https://man7.org/linux/man-pages/man1/tmux.1.html) — `display-popup -E` syntax, tmux 3.2+ requirement
- UC Irvine / Gloria Mark — "The Cost of Interrupted Work" — 23-minute interruption recovery; 45-minute recovery for complex coding tasks; widely cited, independently replicated
- [NN/g — Indicators, Validations, and Notifications](https://www.nngroup.com/articles/indicators-validations-notifications/) — passive notification UX; non-modal, pull-not-push design pattern
- Stack Overflow Blog — "Developer Flow State and Its Impact on Productivity" (2018) — flow entry time and interruption impact
- tmux GitHub issues #2483, #2882, #2808 — pane-died hook inconsistencies, scope bugs; informs why hook-based idle detection requires NDJSON event-gating

### Secondary (MEDIUM confidence)

- [CHI 2025 — "Need Help? Designing Proactive AI Assistants for Programming"](https://dl.acm.org/doi/10.1145/3706598.3714002) — proactive suggestions best at subtask boundaries; attention-aware; frequency tunable
- [arXiv 2601.10253 — "Developer Interaction Patterns with Proactive AI: A Five-Day Field Study"](https://arxiv.org/html/2601.10253v1) — AI interactions during implementation (38.2%) and debugging (26.4%); workflow boundary interventions well-received
- [GitHub Issue #12048](https://github.com/anthropics/claude-code/issues/12048) — `idle_prompt` false positive behavior; timing nuances (issue thread, not official docs)
- [Alexandre Quemy — Notification System for Tmux and Claude Code](https://quemy.info/2025-08-04-notification-system-tmux-claude.html) — Stop vs Notification hook distinction; `tmux display-popup` integration pattern (community blog)
- [JetBrains State of Developer Ecosystem 2025](https://blog.jetbrains.com/research/2025/10/state-of-developer-ecosystem-2025/) — context switching as primary productivity killer; n=23K+ annual survey
- [Graphite.dev — "How long should your CI take?"](https://graphite.dev/blog/how-long-should-ci-take) — feedback loop delay compounds; 5-minute CI increase adds 1+ hour to time-to-merge
- arXiv 2511.18842 — "Optimizing LLM Code Suggestions: Feedback-Driven Timing with Lightweight State" — timing is the critical UX variable for developer suggestion tools; mistimed suggestions degrade both UX and ROI

### Tertiary (LOW confidence)

- [Speakwise context switching statistics 2026](https://speakwiseapp.com/blog/context-switching-statistics) — 1,200 app switches/day average; aggregated stats, methodology unclear
- Pomodoro 50/10 for developers — structured break quality determines next block quality; practitioner evidence, not controlled study

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
