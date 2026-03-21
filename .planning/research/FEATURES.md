# Feature Research

**Domain:** Intelligent idle time productivity — context-aware activity suggestions during AI agent processing in PDE
**Researched:** 2026-03-20
**Confidence:** MEDIUM (core UX patterns verified against multiple sources; PDE-specific integration design inferred from existing infrastructure with HIGH confidence; no direct competitor product exists — this is a novel feature space)

---

> **Scope note:** This file covers ONLY what v0.10 adds to PDE. Existing infrastructure (tmux dashboard, event bus, STATE.md, ROADMAP.md, per-agent memory, session archival) is a stable dependency — not rebuilt here. Every feature described is either additive to the existing dashboard or a new command surfaced during processing wait time.

---

## What "Idle Time" Means in PDE Context

PDE phases — research, plan, execute — each take minutes of wall-clock time while agents run. The user is currently passive: watching the tmux dashboard but unable to usefully contribute. Context switching to unrelated work is expensive (Gloria Mark/UC Irvine: 23 minutes to regain full focus after an interruption). The design goal is to find work that is:

1. **Low enough cognitive load** to pick up and put down without a 23-minute re-ramp
2. **Valuable to PDE's next cycle** — produces artifacts the next phase can consume directly
3. **Non-intrusive** — does not interrupt flow if the user is in deep work; visible but ignorable

Research confirms this category exists and is under-served. CHI 2025 research on proactive AI assistants found suggestions land best "at subtask boundaries" and must be "attention-aware." CI/CD tooling research shows that the longer code waits in review, the bigger the context switch — meaning the problem PDE faces (human waiting on machine) is symmetric to the problem tools like LinearB try to solve (machine waiting on human).

---

## Feature Landscape

### Table Stakes (Users Expect These)

These are non-negotiable for the milestone to feel complete. Missing any makes the feature feel like a status display, not a productivity tool.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Phase-aware suggestion list** | Without phase context, suggestions are generic ("go do something else"). Users expect suggestions relevant to *what PDE is currently doing* — brief phase vs execute phase demand different human activities. | MEDIUM | Reads current phase from STATE.md and DESIGN-STATE.md. Different suggestion banks per phase. Surfaces in dedicated tmux pane (Pane 7 or overlay on Pane 1). |
| **Actionable prompts, not status updates** | "Here's what you could work on" not "here's what PDE is doing." The tmux dashboard already shows progress; this feature must show a call-to-action. | LOW | Wording matters: "Review the wireframe critique at `.planning/design/critique.md` and annotate disagreements" beats "Critique stage is running." |
| **Artifact review queue** | When PDE produces artifacts, users expect to be told they exist and can be reviewed now. This is the lowest-friction pull-based feedback loop. | LOW | Watches `.planning/design/` and `.planning/` for new files after phase completion. Surfaces "new artifact ready for review" immediately. |
| **Activity categories appropriate to project state** | Suggestions must match where the project actually is. Suggesting "finalize acceptance criteria" when execution is 80% complete is wrong and breaks trust. | MEDIUM | Categories: pre-planning (externalize knowledge), mid-plan (validate ACs), during-execution (review outputs, run verifications), post-execution (handoff prep). All driven by STATE.md fields. |
| **Dismissable / ignorable** | A feature that demands attention breaks the non-intrusive contract. User in flow state must be able to ignore suggestions entirely without penalty. | LOW | Suggestions displayed passively in tmux pane. No modal, no alert, no beep. Pane can be hidden with standard tmux commands. |
| **Integration with existing tmux dashboard** | Users already have `/pde:monitor` open. A new tool requires a new habit. Suggestions must appear in the existing dashboard surface. | MEDIUM | Either new pane (Pane 7) added to dashboard layout, or suggestion content injected into existing Pane 1 (activity log) when idle period detected. Adaptive layout already degrades from 6 to 2 panes — new pane must fit the same degradation model. |

### Differentiators (Competitive Advantage)

These make the feature genuinely intelligent vs a generic "while you wait" checklist. Each maps to a PDE-specific capability gap that no existing CI/CD tool or IDE feature addresses.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Artifact-fed suggestion targeting** | Suggestions reference specific artifacts by path. "Review the wireframe at `.planning/design/wireframe/WFR-homepage.html` — the critique found 3 HIGH severity findings at lines 47-89" is 10x more actionable than "review design artifacts." | MEDIUM | Reads design-manifest.json and latest critique/plan artifacts. Extracts severity, file paths, open findings. Surfaces as pre-formatted review prompts. |
| **Domain knowledge externalization prompts** | The most valuable idle activity for PDE's next cycle is writing down what only the user knows: business rules, edge cases, user stories, acceptance criteria that PDE cannot infer. Phase-specific prompts surface the right questions at the right time. | MEDIUM | Prompt bank keyed by project phase. Example during ideation: "What are the 3 non-obvious constraints on this product that a designer wouldn't know?" During planning: "List the edge cases in the payment flow that break happy-path assumptions." Outputs stored in `.planning/context-notes/` (new directory). |
| **Human-taste decision queue** | Design decisions that require human aesthetic judgment (color palette preference, typography choices, brand tone) are low-urgency but block PDE from producing brand-aligned output. Surfacing these as a queue during idle time completes them without blocking PDE's critical path. | MEDIUM | Reads DESIGN-STATE.md for incomplete design system choices. Generates short decision prompts: "Choose between warm or cool neutrals for the primary background — this affects token generation in the next phase." Responses stored in `.planning/design/taste-decisions.md`. |
| **Parallel session templates** | For unrelated work that doesn't touch the current PDE project, suggesting a pre-configured Claude Code window with a specific task (bug fix, documentation, git housekeeping) lets users context-switch safely without losing place in PDE. | HIGH | Requires generating a tmux split command or `/pde:parallel-task` shortcut. HIGH complexity because it crosses session boundaries. Value is real but implementation touches tmux session management, which is outside the event bus. |
| **Upcoming phase preview** | Showing what PDE will need from the user in the next phase lets users prepare mentally and gather materials ahead of time. "The next phase is wireframe — have reference screenshots ready" reduces the start-of-phase lag. | LOW | Reads ROADMAP.md for next phase. Filters for human-input requirements in that phase's success criteria. Surfaces as "preparing for next phase" suggestions. Already available in STATE.md (pending_todos field). |
| **Blockers-first prioritization** | ROADMAP.md and STATE.md already track blockers. Surfacing open blockers as the highest-priority idle-time activity ensures the most impactful work happens during wait time. | LOW | Reads `blockers` field from STATE.md. If non-empty, blockers appear before any other suggestion. "Resolve this blocker first — it will unblock the next phase." This is a direct use of existing infrastructure. |
| **Time-bounded micro-tasks** | Suggestions calibrated to the expected remaining processing time. If a phase is 90% complete, suggest a 2-minute task (add a note to the brief). If a phase just started and will take 8 minutes, suggest a 5-minute structured activity. | HIGH | Requires phase duration estimation from past session archives. HIGH complexity because duration data must be learned. Could start with fixed heuristics (research phase: 5-10 minutes; execute phase: 10-30 minutes per task) and refine. |

### Anti-Features (Avoid These in v0.10)

These seem natural extensions but create architectural conflicts or user experience problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Interrupting the user when a phase completes** | "Alert me when done so I can get back to work immediately" — sounds good for responsiveness | Gloria Mark research: 23-minute recovery from interruptions. A notification that fires at arbitrary times destroys the focus session the user is in. The tmux dashboard is already a passive, always-on status surface — anything beyond that becomes an interruption. | User watches the dashboard pane passively. Phase completion is already visible in Pane 1 (agent activity) and Pane 4 (pipeline progress). No additional alert needed. |
| **Automatic generation of context notes** | "PDE should write the domain knowledge prompts and fill them in by inferring from existing artifacts" | If PDE can infer it, it doesn't need the user to write it — this is not an idle-time problem. The value of domain knowledge externalization is surfacing what PDE *cannot* infer: unwritten business rules, team conventions, user context the codebase doesn't contain. Auto-generation defeats the purpose. | Prompt the user with specific questions. Write the user's answers to structured files. Not the other way around. |
| **Gamification (streaks, points, badges for completing idle tasks)** | "Make it engaging; reward productive idle time" | Gamification in developer tooling is consistently rejected by senior developers and creates perverse incentives (completing tasks for points rather than value). PDE's user base is professional developers who want signal, not dopamine mechanics. | Clear progress indicators: "You've provided 3 domain knowledge notes in this session — all will be available to the planning phase." Outcome-oriented, not game-oriented. |
| **A dedicated idle-time command (`/pde:idle`)** | "Give users a command to explicitly enter idle mode with a structured activity list" | Requires the user to change behavior (explicitly invoke a mode). The value of idle-time productivity is *ambient* — suggestions available without the user having to decide to seek them. A separate command adds friction and will be forgotten. | Suggestions appear automatically in the tmux dashboard when a phase is running. No mode, no command, no new habit to build. |
| **Full pre-phase briefing document generation** | "While waiting, generate a rich summary of what's coming next in the pipeline" | The planning phase already produces HANDOFF.md, ROADMAP.md entries, and task-NNN.md files. A separate "upcoming briefing" document duplicates this content with a different audience framing and creates a second source of truth. | Surface existing ROADMAP.md next-phase content in the suggestions pane. Link to the actual planning artifacts. Don't generate new documents that duplicate state already tracked. |
| **Suggestions that require internet access or external tools** | "Suggest checking competitors while waiting" — sounds productive | PDE's constraint model (file-based, no server, zero npm deps at plugin root) means internet-dependent suggestions cannot be acted on within PDE's tooling. Suggestions that require leaving the terminal (browser, Figma, etc.) create a different context switch problem. | Suggest file-based activities: reviewing existing artifacts, writing notes to `.planning/`, running `/pde:check-readiness`, running tests. External-tool suggestions can appear as explicit "if you have time for longer tasks" category, clearly labeled as out-of-PDE-scope. |
| **Persistent idle-task history across sessions** | "Track what I did during idle time across all sessions" | Per-agent memory has a 50-entry cap specifically to prevent context bloat. A separate idle-task history adds another storage file that session archival must track. Marginal value: users rarely need to audit what they did during a 5-minute wait 3 weeks ago. | Context notes produced during idle time are already persisted in `.planning/context-notes/`. The *outputs* of idle activity are tracked; the activity history itself is not needed. |

---

## Feature Dependencies

```
[Phase Event (phase_started, phase_complete from event bus)]
    └──required-by──> [Phase-Aware Suggestion Engine]
                          └──reads──> STATE.md (current_phase, blockers, pending_todos)
                          └──reads──> ROADMAP.md (next phase requirements)
                          └──reads──> design-manifest.json (artifact inventory)
                          └──outputs──> [Suggestion List (ranked)]
                                            └──displayed-in──> [tmux Pane: Suggestion Display]
                                            └──stores-to──> .planning/context-notes/ (user-written notes)

[Artifact-Fed Suggestion Targeting]
    └──depends-on──> [Phase-Aware Suggestion Engine]
    └──reads──> .planning/design/ (latest artifacts)
    └──reads──> critique output files (severity + findings)
    └──enhances──> [Suggestion List] with specific file paths and finding summaries

[Domain Knowledge Externalization Prompts]
    └──depends-on──> [Phase-Aware Suggestion Engine]
    └──reads──> .planning/project-context.md (existing context)
    └──reads──> current phase from STATE.md
    └──outputs──> .planning/context-notes/{timestamp}-context.md (user answers)
    └──consumed-by──> [EXISTING: /pde:plan] and [EXISTING: /pde:brief] in subsequent phases

[Human-Taste Decision Queue]
    └──depends-on──> [Phase-Aware Suggestion Engine]
    └──reads──> DESIGN-STATE.md (incomplete design system choices)
    └──outputs──> .planning/design/taste-decisions.md (user choices)
    └──consumed-by──> [EXISTING: /pde:system] in design token generation phase

[Blockers-First Prioritization]
    └──depends-on──> [Phase-Aware Suggestion Engine]
    └──reads──> STATE.md blockers field (already exists)
    └──enhances──> [Suggestion List] by promoting blockers to top
    └──NOTE──> zero new infrastructure needed; pure logic over existing data

[Upcoming Phase Preview]
    └──depends-on──> [Phase-Aware Suggestion Engine]
    └──reads──> ROADMAP.md next phase entry (already exists)
    └──enhances──> [Suggestion List] with preparation prompts
    └──NOTE──> zero new infrastructure needed; pure logic over existing data

[tmux Pane: Suggestion Display]
    └──depends-on──> [EXISTING: tmux dashboard (/pde:monitor)]
    └──requires──> adaptive layout extension (existing pane count: 6 → 7, or overlay mode)
    └──reads-from──> [Phase-Aware Suggestion Engine] output
    └──NOTE──> must fit within existing adaptive layout (6→4→3→2 pane degradation model)

[Time-Bounded Micro-Task Calibration]
    └──depends-on──> [Phase-Aware Suggestion Engine]
    └──reads──> .planning/logs/ session archives (for phase duration history)
    └──enhances──> [Suggestion List] by filtering to tasks matching remaining time budget
    └──NOTE──> HIGH complexity; requires duration estimation; defer to v0.10.x or start with fixed heuristics
```

### Dependency Notes

- **Event bus is the trigger, not polling:** The suggestion engine does not poll STATE.md on a timer. `phase_started` events (already emitted by existing workflow instrumentation from v0.8) trigger suggestion refresh. This is already wired — no new event infrastructure needed.
- **STATE.md is the single source of truth:** Phase, blockers, pending_todos are already maintained by PDE workflows. The suggestion engine is a reader, not a writer, of this state. This is a clean consumer relationship.
- **`.planning/context-notes/` is the one new directory:** All other reads are from existing files. The only new write path is user-authored context notes stored in this new directory. It should be read by planning and brief workflows in subsequent phases.
- **tmux pane layout is the hardest dependency:** The existing adaptive layout is carefully engineered (6→4→3→2 pane degradation). Adding Pane 7 requires either extending the degradation table or implementing an overlay/rotation strategy for small terminals. This is the primary implementation risk.
- **Domain knowledge prompts require a prompt bank:** A curated bank of phase-specific questions must be authored as part of the milestone. This is content work, not code work, but it is on the critical path.

---

## MVP Definition (for v0.10 Milestone)

### Launch With (v0.10 core — minimum to satisfy "intelligent idle time productivity" claim)

- [ ] **Phase-aware suggestion engine** — reads STATE.md + DESIGN-STATE.md on `phase_started` event; generates ranked suggestion list; core logic that all other features build on
- [ ] **Blockers-first prioritization** — if STATE.md has blockers, they appear first; zero new infrastructure; highest ROI per line of code
- [ ] **Artifact review queue** — on `phase_complete` event, scan `.planning/design/` for new artifacts; surface "new artifact ready for review" with specific file paths from design-manifest.json
- [ ] **Domain knowledge externalization prompts** — phase-specific question bank (6 phases × 3-5 questions); prompts displayed in suggestion pane; user-written answers stored in `.planning/context-notes/`
- [ ] **Upcoming phase preview** — reads ROADMAP.md next-phase entry; surfaces 2-3 preparation prompts; requires zero new infrastructure
- [ ] **tmux suggestion pane** — new Pane 7 in dashboard layout; fits adaptive degradation model; displays ranked suggestion list; passive, ignorable

### Add After Validation (v0.10.x — extend once core is working)

- [ ] **Artifact-fed suggestion targeting** — add specific file paths and finding summaries to suggestions; add when core suggestion display is confirmed working and design-manifest.json structure is stable
- [ ] **Human-taste decision queue** — add when DESIGN-STATE.md incomplete-choices tracking is confirmed; depends on users actually encountering incomplete design choices in practice
- [ ] **Time-bounded micro-task calibration** — add when session archive data is sufficient to estimate phase durations reliably; start with fixed heuristics (research: 5-10 min, execute: 10-30 min per task)

### Future Consideration (v1.0+)

- [ ] **Parallel session templates** — pre-configured tmux splits for unrelated work; defer because it crosses session boundaries and requires tmux session management beyond the current event infrastructure
- [ ] **Suggestion effectiveness feedback loop** — track which suggestions users act on (via context-notes creation timestamps vs suggestion display timestamps); use to refine prompt bank and ordering; defer until basic usage patterns are established

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Phase-aware suggestion engine (core logic) | HIGH — foundational; all other features depend on it | MEDIUM — reads existing files, wires to existing events | P1 |
| Blockers-first prioritization | HIGH — directly surfaces the most impactful work | LOW — pure logic over STATE.md blockers field | P1 |
| Upcoming phase preview | HIGH — reduces start-of-phase lag for users | LOW — reads existing ROADMAP.md; no new infrastructure | P1 |
| Artifact review queue | HIGH — closes the feedback loop; user knows when to look | LOW — scans existing directories on phase_complete event | P1 |
| Domain knowledge externalization prompts | HIGH — produces artifacts PDE can consume in next cycle | MEDIUM — requires authored question bank + new context-notes directory | P1 |
| tmux suggestion pane (display) | HIGH — without display surface, no feature is visible | MEDIUM — must extend adaptive layout without breaking existing 6-pane model | P1 |
| Artifact-fed suggestion targeting | MEDIUM — makes suggestions dramatically more specific and useful | MEDIUM — reads design-manifest.json + critique outputs; parsing required | P2 |
| Human-taste decision queue | MEDIUM — eliminates the "I forgot to pick colors" delay | MEDIUM — reads DESIGN-STATE.md incomplete choices; requires DESIGN-STATE.md to track this consistently | P2 |
| Time-bounded micro-task calibration | MEDIUM — right-sized tasks feel achievable; oversized tasks get skipped | HIGH — requires phase duration history from session archives | P3 |
| Parallel session templates | MEDIUM — enables safe context switching for unrelated work | HIGH — crosses session boundary; touches tmux session management | P3 |

**Priority key:**
- P1: Must have for v0.10 milestone to close
- P2: Include if implementation permits; strong v0.10.x candidates
- P3: Future milestone consideration

---

## Competitor / Analog Analysis

No direct competitor exists for this exact feature in developer tooling. The closest analogs inform the design:

| Feature Dimension | Analog | How They Do It | PDE Approach |
|-------------------|--------|----------------|--------------|
| Idle time activity suggestions | CI/CD tools (GitHub Actions, CircleCI) | Show build status only; no activity suggestions | Active suggestions keyed to project state, not just progress display |
| Context-aware task recommendations | JetBrains Mylar (research prototype) | Task context filters IDE elements to relevant files | PDE surfaces relevant ROADMAP/STATE content during waiting rather than filtering code view |
| Proactive AI suggestions at subtask boundaries | CHI 2025 proactive assistant research | Reduce wait time from 20s to 5s; show 3-5 suggestions; frequency tunable | Show suggestions on `phase_started`; passive display; ignorable |
| "What should I work on next" | LinearB gitStream | Routes PRs, surfaces blockers in engineering workflow | Surfaces STATE.md blockers + next-phase prep; same problem, different layer |
| Non-intrusive ambient display | tmux status bars, terminal prompt tools | System metrics in status bar; visible without interrupting | tmux pane that user can ignore; no alerts/beeps; passive pull not active push |
| Domain knowledge capture during pauses | Pomodoro break structuring (developer variant) | 50/10 cycle: productive break maximizes next work block | Structure the wait with specific questions that produce PDE-usable outputs |

**Key differentiation:** All existing tools either display status (what the machine is doing) or recommend code-level work (next PR to review, next bug to fix). PDE's suggestion system is unique in that it recommends work that *feeds back into the AI agent's next cycle* — making the human-machine loop tighter, not just making the human more productive in isolation.

---

## Activity Categories by PDE Phase

This is the core content model. Each phase requires a different category of human activity:

| PDE Phase | Best Idle Activities | Why Now | Output Consumed By |
|-----------|---------------------|---------|-------------------|
| Research (research phase running) | Domain knowledge externalization; edge case brainstorm; competitor reference gathering (file-based) | Research agent is working with what it knows; user's domain expertise is not in the codebase | `/pde:plan` uses context-notes for planning context |
| Plan (plan phase running) | Review and annotate acceptance criteria; validate task ordering; identify missing requirements | Plan is being generated; user can pre-approve or flag concerns before readiness gate | Readiness gate (`/pde:check-readiness`) consumes annotations |
| Execute (execute phase running) | Review completed task outputs; run manual verification steps; prepare test data/fixtures | Tasks complete incrementally; early review catches drift before reconciliation | RECONCILIATION.md captures discrepancies user noticed |
| Design pipeline (wireframe/mockup/critique running) | Human-taste decisions (color, typography); review previous design artifacts; prepare reference screenshots | Design generation is happening; user's aesthetic preferences are needed for iteration | `/pde:iterate` uses taste-decisions.md; critique takes user annotations |
| Validation/verification running | Write edge case notes; review BDD acceptance criteria; flag assumptions | Verification is checking known cases; user knows unknown cases | Plan checker Dimension 10 (edge cases) can consume edge-case notes |
| Any phase | Review blockers; prepare for next phase; git housekeeping in separate terminal | Universal activities appropriate regardless of phase | STATE.md blockers cleared; ROADMAP.md next phase ready |

---

## Sources

- **UC Irvine / Gloria Mark — "The Cost of Interrupted Work"** (HIGH confidence — widely cited, replicated): 23-minute recovery time after interruption; complexity correlates with longer recovery; https://codezero.io/blog/context-switching-costs-for-devs
- **CHI 2025 — "Need Help? Designing Proactive AI Assistants for Programming"** (MEDIUM confidence — conference paper, limited access): proactive suggestions best at subtask boundaries; must be attention-aware; frequency tunable; https://dl.acm.org/doi/10.1145/3706598.3714002
- **arXiv 2601.10253 — "Developer Interaction Patterns with Proactive AI: A Five-Day Field Study"** (MEDIUM confidence — preprint): AI interactions during implementation (38.2%) and debugging (26.4%); https://arxiv.org/html/2601.10253v1
- **LinearB / engineering metrics research** (MEDIUM confidence): PR pickup time and review wait times as productivity proxies; context switching at review boundaries costs developer time; https://linearb.io/blog/engineering-metrics-benchmarks-what-makes-elite-teams
- **JetBrains State of Developer Ecosystem 2025** (HIGH confidence — annual survey, n=23K+): context switching is primary productivity killer; non-technical factors (clarity, collaboration) as important as tooling; https://blog.jetbrains.com/research/2025/10/state-of-developer-ecosystem-2025/
- **Graphite.dev — "How long should your CI take?"** (MEDIUM confidence): 5-minute increase in CI time increases time-to-merge by 1+ hour; feedback loop delay compounds; https://graphite.dev/blog/how-long-should-ci-take
- **Speakwise context switching statistics 2026** (LOW confidence — aggregated stats): 1,200 app switches/day average; 275 interruptions/day; https://speakwiseapp.com/blog/context-switching-statistics
- **NN/g — Indicators, Validations, and Notifications** (HIGH confidence — authoritative UX research): passive notifications are informational, non-urgent, non-modal; badge/corner placement for low-intrusiveness; https://www.nngroup.com/articles/indicators-validations-notifications/
- **super-productivity.com — "Context Switching Costs for Developers"** (MEDIUM confidence): 10 IQ point temporary drop from heavy multitasking; twice as many errors in interrupted tasks; https://super-productivity.com/blog/context-switching-costs-for-developers/
- **Pomodoro 50/10 for developers** (MEDIUM confidence — practitioner evidence): 50/10 cycle matches ultradian focus rhythms better than 25/5 for complex coding tasks; structured break quality determines next block quality; https://pomodo.io/blog/developers-50-10-pomodoro-timer/
- **PDE PROJECT.md, STATE.md, ROADMAP.md, project_idle_time_productivity.md** (HIGH confidence — authoritative): existing infrastructure, constraints, activity categories user previously identified, architectural patterns

---

*Feature research for: PDE v0.10 — Intelligent Idle Time Productivity System*
*Researched: 2026-03-20*
