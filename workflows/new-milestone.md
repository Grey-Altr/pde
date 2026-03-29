<purpose>

Start a new milestone cycle for an existing project. Loads project context, gathers milestone goals (from MILESTONE-CONTEXT.md or conversation), updates PROJECT.md and STATE.md, optionally runs parallel research, defines scoped requirements with REQ-IDs, spawns the roadmapper to create phased execution plan, and commits all artifacts. Brownfield equivalent of new-project.

</purpose>

<required_reading>

Read all files referenced by the invoking prompt's execution_context before starting.

</required_reading>

<available_agent_types>
Valid GSD subagent types (use exact names — do not fall back to 'general-purpose'):
- gsd-project-researcher — Researches project-level technical decisions
- gsd-research-synthesizer — Synthesizes findings from parallel research agents
- gsd-roadmapper — Creates phased execution roadmaps
</available_agent_types>


If the flag is absent, keep the current behavior of continuing phase numbering from the previous milestone.

- Read PROJECT.md (existing project, validated requirements, decisions)
- Read MILESTONES.md (what shipped previously)
- Read STATE.md (pending todos, blockers)
- Check for MILESTONE-CONTEXT.md (from /pde:discuss-milestone)

## 2. Gather Milestone Goals

**If MILESTONE-CONTEXT.md exists:**
- Use features and scope from discuss-milestone
- Present summary for confirmation

**If no context file:**
- Present what shipped in last milestone
- Ask inline (freeform, NOT AskUserQuestion): "What do you want to build next?"
- Wait for their response, then use AskUserQuestion to probe specifics
- If user selects "Other" at any point to provide freeform input, ask follow-up as plain text — not another AskUserQuestion

## 3. Determine Milestone Version

- Parse last version from MILESTONES.md
- Suggest next version (v1.0 -> v1.1, or v2.0 for major)
- Confirm with user

## 3.5. Verify Milestone Understanding

Before writing any files, present a summary of what was gathered and ask for confirmation.

```
Milestone v[X.Y]: [Name]

Goal: [One sentence]

Target features:
- [Feature 1]
- [Feature 2]
- [Feature 3]

Key context: [Any important constraints, decisions, or notes from questioning]
```

AskUserQuestion:
- header: "Confirm?"
- question: "Does this capture what you want to build in this milestone?"
- options:
  - "Looks good" — Proceed to write PROJECT.md
  - "Adjust" — Let me correct or add details

**If "Adjust":** Ask what needs changing (plain text, NOT AskUserQuestion). Incorporate changes, re-present the summary. Loop until "Looks good" is selected.

**If "Looks good":** Proceed to Step 4.

## 4. Update PROJECT.md

Add/update:

```markdown
## Current Milestone: v[X.Y] [Name]

**Goal:** [One sentence describing milestone focus]

**Target features:**
- [Feature 1]
- [Feature 2]
- [Feature 3]
```

Update Active requirements section and "Last updated" footer.

Ensure the `## Evolution` section exists in PROJECT.md. If missing (projects created before this feature), add it before the footer:

```markdown
## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via transition workflow):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/pde:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
```

## 5. Update STATE.md

```markdown
## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: [today] — Milestone v[X.Y] started
```

Keep Accumulated Context section from previous milestone.

## 6. Cleanup and Commit

Delete MILESTONE-CONTEXT.md if exists (consumed).

```bash
node "$HOME/.claude/pde-os/engines/gsd/bin/gsd-tools.cjs" commit "docs: start milestone v[X.Y] [Name]" --files .planning/PROJECT.md .planning/STATE.md
```

## 7. Load Context and Resolve Models

```bash
INIT=$(node "$HOME/.claude/pde-os/engines/gsd/bin/gsd-tools.cjs" init new-milestone)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_RESEARCHER=$(node "$HOME/.claude/pde-os/engines/gsd/bin/gsd-tools.cjs" agent-skills gsd-project-researcher 2>/dev/null)
AGENT_SKILLS_SYNTHESIZER=$(node "$HOME/.claude/pde-os/engines/gsd/bin/gsd-tools.cjs" agent-skills gsd-synthesizer 2>/dev/null)
AGENT_SKILLS_ROADMAPPER=$(node "$HOME/.claude/pde-os/engines/gsd/bin/gsd-tools.cjs" agent-skills gsd-roadmapper 2>/dev/null)
mkdir -p "${phase_archive_path}"
find .planning/phases -mindepth 1 -maxdepth 1 -type d -exec mv {} "${phase_archive_path}/" \;
```

Then verify `.planning/phases/` no longer contains old milestone directories before continuing.

If `phase_dir_count > 0` but `phase_archive_path` is missing:
- Stop and explain that reset numbering is unsafe without a completed milestone archive target.
- Tell the user to complete/archive the previous milestone first, then rerun `/pde:new-milestone --reset-phase-numbers`.

## 8. Research Decision

Check `research_enabled` from init JSON (loaded from config).

**If `research_enabled` is `true`:**

AskUserQuestion: "Research the domain ecosystem for new features before defining requirements?"
- "Research first (Recommended)" — Discover patterns, features, architecture for NEW capabilities
- "Skip research for this milestone" — Go straight to requirements (does not change your default)

**If `research_enabled` is `false`:**

AskUserQuestion: "Research the domain ecosystem for new features before defining requirements?"
- "Skip research (current default)" — Go straight to requirements
- "Research first" — Discover patterns, features, architecture for NEW capabilities

**IMPORTANT:** Do NOT persist this choice to config.json. The `workflow.research` setting is a persistent user preference that controls plan-phase behavior across the project. Changing it here would silently alter future `/pde:plan-phase` behavior. To change the default, use `/pde:settings`.

**If user chose "Research first":**

```bash
node "$HOME/.claude/pde-os/lib/ui/render.cjs" banner "RESEARCHING"
```
Spawning 4 researchers in parallel...
  -> Stack, Features, Architecture, Pitfalls

```bash
mkdir -p .planning/research
```

Spawn 4 parallel pde-project-researcher agents. Each uses this template with dimension-specific fields:

**Common structure for all 4 researchers:**
```
Task(prompt="
<research_type>Project Research — {DIMENSION} for [new features].</research_type>

<milestone_context>
SUBSEQUENT MILESTONE — Adding [target features] to existing app.
{EXISTING_CONTEXT}
Focus ONLY on what's needed for the NEW features.
</milestone_context>

<question>{QUESTION}</question>

<files_to_read>
- .planning/PROJECT.md (Project context)
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

| FILE | STACK.md | FEATURES.md | ARCHITECTURE.md | PITFALLS.md |

After all 4 complete, spawn synthesizer:

```
Task(prompt="
Synthesize research outputs into SUMMARY.md.

<files_to_read>
- .planning/research/STACK.md
- .planning/research/FEATURES.md
- .planning/research/ARCHITECTURE.md
- .planning/research/PITFALLS.md
</files_to_read>

${AGENT_SKILLS_SYNTHESIZER}

Write to: .planning/research/SUMMARY.md
Use template: /Users/greyaltaer/.claude/pde-os/engines/gsd/templates/research-project/SUMMARY.md
Commit after writing.
", subagent_type="pde-research-synthesizer", model="{synthesizer_model}", description="Synthesize research")
```

Display key findings from SUMMARY.md:
```bash
node "$HOME/.claude/pde-os/lib/ui/render.cjs" banner "RESEARCH COMPLETE"
```
**Stack additions:** [from SUMMARY.md]
**Feature table stakes:** [from SUMMARY.md]
**Watch Out For:** [from SUMMARY.md]

**If "Skip research":** Continue to Step 9.

## 9. Define Requirements

```bash
node "$HOME/.claude/pde-os/lib/ui/render.cjs" banner "DEFINING REQUIREMENTS"
```

Read PROJECT.md: core value, current milestone goals, validated requirements (what exists).

**If research exists:** Read FEATURES.md, extract feature categories.

Present features by category:
```
## [Category 1]
**Table stakes:** Feature A, Feature B
**Differentiators:** Feature C, Feature D
**Research notes:** [any relevant notes]
```

**If no research:** Gather requirements through conversation. Ask: "What are the main things users need to do with [new features]?" Clarify, probe for related capabilities, group into categories.

**Scope each category** via AskUserQuestion (multiSelect: true, header max 12 chars):
- "[Feature 1]" — [brief description]
- "[Feature 2]" — [brief description]
- "None for this milestone" — Defer entire category

Track: Selected -> this milestone. Unselected table stakes -> future. Unselected differentiators -> out of scope.

**Identify gaps** via AskUserQuestion:
- "No, research covered it" — Proceed
- "Yes, let me add some" — Capture additions

**Generate REQUIREMENTS.md:**
- v1 Requirements grouped by category (checkboxes, REQ-IDs)
- Future Requirements (deferred)
- Out of Scope (explicit exclusions with reasoning)
- Traceability section (empty, filled by roadmap)

**REQ-ID format:** `[CATEGORY]-[NUMBER]` (AUTH-01, NOTIF-02). Continue numbering from existing.

**Requirement quality criteria:**

Good requirements are:
- **Specific and testable:** "User can reset password via email link" (not "Handle password reset")
- **User-centric:** "User can X" (not "System does Y")
- **Atomic:** One capability per requirement (not "User can login and manage profile")
- **Independent:** Minimal dependencies on other requirements

Present FULL requirements list for confirmation:

```
## Milestone v[X.Y] Requirements

### [Category 1]
- [ ] **CAT1-01**: User can do X
- [ ] **CAT1-02**: User can do Y

### [Category 2]
- [ ] **CAT2-01**: User can do Z

Does this capture what you're building? (yes / adjust)
```

If "adjust": Return to scoping.

**Commit requirements:**
```bash
node "$HOME/.claude/pde-os/engines/gsd/bin/gsd-tools.cjs" commit "docs: define milestone v[X.Y] requirements" --files .planning/REQUIREMENTS.md
```

## 10. Create Roadmap

```bash
node "$HOME/.claude/pde-os/lib/ui/render.cjs" banner "CREATING ROADMAP"
```
Spawning roadmapper...

**Starting phase number:**
- If `--reset-phase-numbers` is active, start at **Phase 1**
- Otherwise, continue from the previous milestone's last phase number (v1.0 ended at phase 5 -> v1.1 starts at phase 6)

```
Task(prompt="
<planning_context>
<files_to_read>
- .planning/PROJECT.md
- .planning/REQUIREMENTS.md
- .planning/research/SUMMARY.md (if exists)
- .planning/config.json
- .planning/MILESTONES.md
</files_to_read>

${AGENT_SKILLS_ROADMAPPER}


### Phase Details

**Phase [N]: [Name]**
Goal: [goal]
Requirements: [REQ-IDs]
Success criteria:
1. [criterion]
2. [criterion]
```

**Ask for approval** via AskUserQuestion:
- "Approve" — Commit and continue
- "Adjust phases" — Tell me what to change
- "Review full file" — Show raw ROADMAP.md

**If "Adjust":** Get notes, re-spawn roadmapper with revision context, loop until approved.
**If "Review":** Display raw ROADMAP.md, re-ask.

**Commit roadmap** (after approval):
```bash
node "$HOME/.claude/pde-os/engines/gsd/bin/gsd-tools.cjs" commit "docs: create milestone v[X.Y] roadmap ([N] phases)" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md
```

## 11. Done

```bash
node "$HOME/.claude/pde-os/lib/ui/render.cjs" banner "MILESTONE INITIALIZED"
```
**Milestone v[X.Y]: [Name]**

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | `.planning/PROJECT.md`      |
| Research       | `.planning/research/`       |
| Requirements   | `.planning/REQUIREMENTS.md` |
| Roadmap        | `.planning/ROADMAP.md`      |

**[N] phases** | **[X] requirements** | Ready to build

## Next Up

**Phase [N]: [Phase Name]** — [Goal]

`/pde:discuss-phase [N]` — gather context and clarify approach

<sub>`/clear` first -> fresh context window</sub>

Also: `/pde:plan-phase [N]` — skip discussion, plan directly

</process>

<success_criteria>
- [ ] PROJECT.md updated with Current Milestone section
- [ ] STATE.md reset for new milestone
- [ ] MILESTONE-CONTEXT.md consumed and deleted (if existed)
- [ ] Research completed (if selected) — 4 parallel agents, milestone-aware
- [ ] Requirements gathered and scoped per category
- [ ] REQUIREMENTS.md created with REQ-IDs
- [ ] pde-roadmapper spawned with phase numbering context
- [ ] Roadmap files written immediately (not draft)
- [ ] User feedback incorporated (if any)
- [ ] Phase numbering mode respected (continued or reset)
- [ ] All commits made (if planning docs committed)
- [ ] User knows next step: `/pde:discuss-phase [N]`

**Atomic commits:** Each phase commits its artifacts immediately.
</success_criteria>
</output>
