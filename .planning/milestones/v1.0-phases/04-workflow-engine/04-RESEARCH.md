# Phase 4: Workflow Engine — Research

**Researched:** 2026-03-14
**Domain:** PDE state persistence, ROADMAP.md round-trip editing, STATE.md lifecycle, requirements traceability, git commit integration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WORK-01 | Phase-based workflow (discuss → plan → execute → verify) operates end-to-end | All four workflow files exist (discuss-phase.md, plan-phase.md, execute-phase.md, verify-work.md). Each calls `pde-tools init` to load context from .planning/. Phase 4 validates the full cycle runs without state loss. |
| WORK-02 | .planning/ file state persists across context resets | STATE.md frontmatter is rebuilt from body fields on every write via `writeStateMd()` in state.cjs. `pde-tools state json` reads frontmatter for fast machine access. Files are plain Markdown — persist as long as git tracks them. |
| WORK-03 | Roadmap (ROADMAP.md) serves as editable source of truth for phases | `cmdRoadmapAnalyze` in roadmap.cjs reads ROADMAP.md to determine phase status, plan counts, and disk/roadmap sync. `cmdPhaseComplete` writes back to ROADMAP.md checkboxes and progress table. Round-trip read-edit-write is the verified pattern. |
| WORK-04 | STATE.md tracks current phase, progress, and project memory | state.cjs implements a full CRUD API: load, get, patch, update, advance-plan, record-metric, update-progress, add-decision, add-blocker, resolve-blocker, record-session, snapshot, json. `writeStateMd()` syncs YAML frontmatter from body on every write. |
| WORK-05 | Requirements traceability maps every requirement to a phase | `cmdPhaseComplete` in phase.cjs extracts `**Requirements:**` from ROADMAP.md for the completed phase, then ticks checkboxes and updates the traceability table in REQUIREMENTS.md. This is triggered automatically at phase completion. |
| WORK-06 | Atomic git commits created per completed task with PDE co-author attribution | `cmdCommit` in commands.cjs stages specified files and calls `git commit -m <message>`. Task-level commits use `{type}({phase}-{plan}): {description}` format per git-integration.md. No Co-Authored-By trailer is inserted by the tool — it is added by the executing Claude session. The WORK-06 "PDE co-author attribution" is currently NOT implemented in cmdCommit. |
</phase_requirements>

---

## Summary

Phase 4 is a **verification phase**, not an implementation phase. The workflow engine code — state.cjs, roadmap.cjs, phase.cjs, commands.cjs, and all four workflow files — already exists and was carried forward from the GSD reference implementation in Phase 3. Phase 4 must confirm that these components behave correctly as an integrated system with PDE naming and paths.

The core state persistence mechanism works by dual-representation: STATE.md carries human-readable Markdown in its body AND machine-readable YAML frontmatter in its header. Every write goes through `writeStateMd()` which calls `syncStateFrontmatter()`, rebuilding the YAML from the body fields. This means the frontmatter is always up-to-date even after a user edits the body directly. The key risk is that if STATE.md body format drifts (fields renamed, sections removed), `stateExtractField()` regex matching breaks silently.

ROADMAP.md serves as the authoritative phase registry. `cmdRoadmapAnalyze` cross-references the file against `.planning/phases/` on disk to compute completion status. `cmdPhaseComplete` writes back to ROADMAP.md (checkboxes, progress table, plan count text) and REQUIREMENTS.md (requirement checkbox ticks and traceability status). The round-trip "user edits ROADMAP.md, workflow reads the edit, reflects in next step" is tested through this analyze → complete cycle.

The atomic git commit requirement (WORK-06) has a gap: `cmdCommit` in commands.cjs does NOT add a `Co-Authored-By` trailer. Per the requirements, commits should carry "PDE co-author attribution." The git-integration.md reference file documents the commit format but does not mention a Co-Authored-By trailer. Phase 4 verification plan 04-04 must either confirm the current behavior satisfies WORK-06 as written, or surface this as a gap requiring a WORK-06 re-read to determine intent.

**Primary recommendation:** Phase 4 plans are smoke tests and gap-closure tasks. Each plan in the four verification areas (state persistence, STATE.md lifecycle, traceability, git commits) should invoke the actual pde-tools commands in a live project, compare output against expected values, and declare pass/fail. If a gap is found (e.g., WORK-06 attribution), the plan adds a fix and re-verifies.

---

## Standard Stack

### Core
| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| `bin/lib/state.cjs` | Plugin repo | STATE.md CRUD + frontmatter sync | Central implementation for all state operations |
| `bin/lib/roadmap.cjs` | Plugin repo | ROADMAP.md parse and write-back | All roadmap interactions go through this |
| `bin/lib/phase.cjs` | Plugin repo | Phase lifecycle (complete, remove, add) | Handles ROADMAP.md + REQUIREMENTS.md + STATE.md updates atomically |
| `bin/lib/commands.cjs` (cmdCommit) | Plugin repo | Git commit wrapper respecting commit_docs config | Canonical commit path for all workflow stages |
| `bin/pde-tools.cjs` | Plugin repo | CLI router calling the above libs | Single entrypoint used by all workflow .md files |
| `workflows/execute-plan.md` | Plugin repo | Defines task-commit and plan-commit protocols | Authoritative commit format reference |
| `references/git-integration.md` | Plugin repo | Git commit format specification | Referenced by execute-plan.md |

### File Conventions
| File | Format | Written by | Read by |
|------|--------|-----------|---------|
| `.planning/STATE.md` | YAML frontmatter + Markdown body | `writeStateMd()` | `cmdStateJson`, `cmdStateSnapshot`, workflow `@` references |
| `.planning/ROADMAP.md` | Markdown with checkboxes and tables | `cmdPhaseComplete`, `cmdPhaseAdd`, user edits | `cmdRoadmapAnalyze`, `cmdRoadmapGetPhase` |
| `.planning/REQUIREMENTS.md` | Markdown with checkboxes and traceability table | `cmdPhaseComplete` | Workflows, users |
| `.planning/phases/NN-name/NN-PP-PLAN.md` | YAML frontmatter + Markdown tasks | planner agent | execute-plan.md workflow |
| `.planning/phases/NN-name/NN-PP-SUMMARY.md` | YAML frontmatter + Markdown body | execute-plan.md workflow | state.cjs progress counts, history-digest |

---

## Architecture Patterns

### Pattern 1: STATE.md Dual-Representation
**What:** STATE.md has a YAML frontmatter block (for machine readers) and a Markdown body (for human readers and for canonical truth). On every write, `syncStateFrontmatter()` strips the old frontmatter and rebuilds it from the body.
**When to use:** Every STATE.md write uses `writeStateMd()`. Never use `fs.writeFileSync` directly on STATE.md.
**Key fields in frontmatter:**

```
pde_state_version: "1.0"   # NOT gsd_state_version
milestone: v1.0
status: executing | planning | discussing | verifying | paused | completed | unknown
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 83
```

### Pattern 2: ROADMAP.md as Authoritative Phase Registry
**What:** ROADMAP.md has two formats for each phase: a checkbox in the summary list (`- [ ] **Phase N: Name**`) and a detail section (`### Phase N: Name` with Goal, Requirements, Plans). `cmdRoadmapAnalyze` reads both and cross-references against `.planning/phases/` on disk.
**When to use:** Phase status is always determined by reading ROADMAP.md + disk together, never one alone.
**Key regex patterns:**
- Phase header: `#{2,4}\s*Phase\s+(\d+[A-Z]?(?:\.\d+)*)\s*:\s*([^\n]+)`
- Checkbox: `-\s*\[[ x]\]\s*.*Phase\s+N`
- Requirements: `\*\*Requirements\*\*:[^\S\n]*([^\n]*)$`

### Pattern 3: Atomic Task Commit Protocol
**What:** Each task within a plan gets its own git commit immediately after completion and verification. Plan metadata (SUMMARY.md, STATE.md, ROADMAP.md) gets a separate docs commit at the end.
**Format:**
```
{type}({phase}-{plan}): {description}

- Key change 1
- Key change 2
```
**The `cmdCommit` tool gates on `commit_docs: true` in config.json and also skips if `.planning/` is gitignored.**

### Pattern 4: Requirements Traceability Auto-Population
**What:** When `pde-tools phase complete <N>` runs, it reads the `**Requirements:**` line from ROADMAP.md for that phase, splits by comma, and updates each requirement in REQUIREMENTS.md: ticks the `- [ ]` checkbox to `- [x]` and changes `Pending` to `Complete` in the traceability table.
**Trigger:** `phase complete` command called at end of each phase, either manually or by verify-work workflow.

### Anti-Patterns to Avoid
- **Direct `fs.writeFileSync` on STATE.md:** Bypasses frontmatter sync, leaves stale machine-readable data.
- **Manual regex editing of ROADMAP.md progress table:** Use `cmdRoadmapUpdatePlanProgress` or `cmdPhaseComplete` to avoid regex mismatches.
- **`git add -A` or `git add .`:** All git commits in PDE use explicit file staging per execute-plan.md protocol.
- **Assuming gsd_state_version key:** The frontmatter key is `pde_state_version` (set in state.cjs line 640). Any script checking `gsd_state_version` in frontmatter will fail silently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| STATE.md field updates | Custom regex replace | `pde-tools state update <field> <value>` or `state patch` | state.cjs handles bold `**Field:**` and plain `Field:` formats, plus frontmatter sync |
| STATE.md read | Bash grep | `pde-tools state get <field>` or `state json` | json output is structured and safe for parsing; grep breaks on format variations |
| Phase status calculation | Walk filesystem manually | `pde-tools roadmap analyze` | Handles disk/roadmap cross-reference, decimal phases, archived phases |
| REQUIREMENTS.md traceability update | Manual sed | `pde-tools phase complete <N>` or `pde-tools requirements mark-complete <ids>` | Handles both checkbox ticks and traceability table status |
| Progress bar rendering | Print █ chars directly | `pde-tools state update-progress` | Scans all phase dirs for PLAN/SUMMARY counts, computes percent, renders bar |
| Git commits | Raw `git commit` | `pde-tools commit "<message>" --files f1 f2` | Respects `commit_docs` config flag and `.planning/` gitignore check |

---

## Common Pitfalls

### Pitfall 1: STATE.md Stale After Context Reset
**What goes wrong:** A workflow reads STATE.md to get Current Phase, but the value reflects an old session. User has been working in the project and the body was updated manually, but the frontmatter wasn't synced.
**Why it happens:** User edits STATE.md body directly without going through pde-tools, so `writeStateMd()` never ran to rebuild frontmatter.
**How to avoid:** After any direct STATE.md edit, run `pde-tools state json` and verify the frontmatter reflects the body. Better: always use `pde-tools state patch` for updates.
**Warning signs:** `pde-tools state json` output differs from what you see in the Markdown body.

### Pitfall 2: ROADMAP.md Phase Detail Section Missing
**What goes wrong:** `cmdRoadmapGetPhase` returns `{found: false, error: 'malformed_roadmap'}` with message about detail section.
**Why it happens:** User added a phase to the checklist (`- [ ] **Phase N:**`) but didn't add a `### Phase N:` detail section with Goal, Requirements, Plans.
**How to avoid:** Use `pde-tools phase add <description>` which creates both the directory and the ROADMAP.md entry in the correct format.
**Warning signs:** `roadmap analyze` result has a non-null `missing_phase_details` array.

### Pitfall 3: Requirements Traceability Not Populating
**What goes wrong:** After completing a phase, REQUIREMENTS.md still shows `Pending` for that phase's requirements.
**Why it happens:** Either (a) `pde-tools phase complete <N>` was not called, or (b) the ROADMAP.md `**Requirements:**` line for that phase uses a non-standard format that the regex misses.
**How to avoid:** Ensure ROADMAP.md Requirements line uses standard format: `**Requirements**: WORK-01, WORK-02, WORK-03`. Run `phase complete` explicitly after verify-work.
**Warning signs:** `grep "Pending" .planning/REQUIREMENTS.md` returns rows for phases known to be complete.

### Pitfall 4: WORK-06 Co-Author Attribution Gap
**What goes wrong:** Commits pass `commit_docs` check and are created, but lack "PDE co-author attribution."
**Why it happens:** `cmdCommit` (commands.cjs) does not inject a `Co-Authored-By:` trailer. The git-integration.md reference also does not document one. WORK-06 says "with PDE co-author attribution" but the implementation does not deliver this.
**How to avoid:** Phase 4 plan 04-04 must clarify: does WORK-06 mean Co-Authored-By trailers (standard practice in Claude Code commits), or something else? If trailers are required, `cmdCommit` needs a `--co-author` flag or hardcoded `Co-Authored-By: Claude <noreply@anthropic.com>` appended to every message.
**Warning signs:** Running `git log --format="%B" | grep Co-Authored-By` returns no results on commits created by PDE.

### Pitfall 5: commit_docs: false Silently Skips All Commits
**What goes wrong:** Plans appear complete (SUMMARY.md written, STATE.md updated) but no git history exists.
**Why it happens:** `commit_docs: false` in `.planning/config.json` causes `cmdCommit` to return `{reason: "skipped_commit_docs_false"}` without error.
**How to avoid:** Check `commit_docs` value before running any phase. For WORK-06 verification, ensure `commit_docs: true`.
**Warning signs:** `pde-tools commit "test" --raw` returns `skipped` instead of a hash.

### Pitfall 6: Duplicate stateExtractField Declaration
**What goes wrong:** state.cjs defines `stateExtractField` twice (lines ~12 and ~184). Both have the same logic, so behavior is correct, but the duplicate is a code smell.
**Why it happens:** Legacy copy-paste during module consolidation.
**How to avoid:** This does not affect Phase 4 verification, but should be logged as a code quality finding.

---

## Code Examples

### STATE.md Lifecycle Operations

```bash
# Load full state context (config + file existence flags)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state load

# Read machine-readable state (from frontmatter)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state json

# Update a specific field (supports both **Bold:** and plain: formats)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state update "Status" "Executing Phase 4"

# Batch update multiple fields
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state patch --Status "Ready to plan" --"Last Activity" "2026-03-14"

# Advance plan counter (handles last-plan edge case, sets status to ready_for_verification)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state advance-plan

# Recalculate progress bar from disk (counts PLAN vs SUMMARY files)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state update-progress

# Record session continuity info
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state record-session \
  --stopped-at "Completed 04-01-PLAN.md" --resume-file "None"
```

### ROADMAP.md Round-Trip Editing

```bash
# Read a phase section from ROADMAP.md
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" roadmap get-phase 4

# Full analysis: all phases with disk status cross-referenced
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" roadmap analyze

# Mark a phase complete (updates ROADMAP.md + REQUIREMENTS.md + STATE.md)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" phase complete 4

# Update progress table row from disk counts (without full completion)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" roadmap update-plan-progress 4
```

### Requirements Traceability

```bash
# Mark specific requirement IDs complete (checkbox + traceability table)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" requirements mark-complete WORK-01,WORK-02,WORK-03

# Verify current traceability state
grep "WORK-0[1-6]" .planning/REQUIREMENTS.md
```

### Git Commit Protocol

```bash
# Task commit (called after each task in execute-plan.md)
git add src/specific-file.ts
git commit -m "feat(04-01): verify .planning state persistence

- Confirmed STATE.md frontmatter syncs on every write
- Verified pde-tools state json reads correct values
- ROADMAP.md round-trip edit test passed
"

# Plan metadata commit via pde-tools (respects commit_docs flag)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit \
  "docs(04-01): complete state persistence verification plan" \
  --files .planning/phases/04-workflow-engine/04-01-PLAN.md \
          .planning/phases/04-workflow-engine/04-01-SUMMARY.md \
          .planning/STATE.md .planning/ROADMAP.md .planning/REQUIREMENTS.md
```

---

## State of the Art

| Old Behavior | Current Behavior | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `gsd_state_version` frontmatter key | `pde_state_version: "1.0"` | Phase 2 (state.cjs rebranded) | Any script reading the old key gets null |
| `~/.gsd/` config paths | `~/.pde/` config paths | Phase 2 | Config isolation between GSD and PDE installs |
| `gsd-tools.cjs` binary | `pde-tools.cjs` binary | Phase 2 | All workflow files must reference the new name |
| `${CLAUDE_PLUGIN_ROOT}` unavailable in .md bash blocks | Confirmed available (Phase 3 P03 decision) | Phase 3 | No fallback pattern needed in workflows |
| ~29 GSD commands | 34 /pde: commands registered | Phase 3 | CMD-01 satisfied; ~29 was approximate |

**Current STATE.md frontmatter schema (state.cjs line 640+):**
```yaml
pde_state_version: "1.0"
milestone: v1.0
milestone_name: milestone
current_phase: "4"
status: executing
stopped_at: "..."
last_updated: "2026-03-15T02:59:34Z"
last_activity: "..."
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 83
```

---

## Open Questions

1. **Does WORK-06 "PDE co-author attribution" require Co-Authored-By git trailers?**
   - What we know: `cmdCommit` does not insert any Co-Authored-By trailer. The reference file git-integration.md does not document trailers. Claude Code's own GSD commit helper (`get-shit-done/bin/gsd-tools.cjs commit`) also does not add trailers.
   - What's unclear: The WORK-06 requirement says "Atomic git commits created per completed task with PDE co-author attribution" — "PDE co-author attribution" could mean (a) the commit message scope `(04-01)` indicating the PDE phase/plan, or (b) an explicit `Co-Authored-By: Claude <noreply@anthropic.com>` trailer per Claude Code best practices.
   - Recommendation: Plan 04-04 should read WORK-06 literally against the commit format in git-integration.md. If trailers are needed, add them to `cmdCommit` as a `--co-author "Name <email>"` option defaulting to the Claude co-author string. This is a small change.

2. **Is Phase 3 truly complete (ROADMAP.md says Plan 3 is checked off)?**
   - What we know: STATE.md shows `stopped_at: "Completed 03-03-PLAN.md"` and Phase 3's three summaries exist on disk. ROADMAP.md progress table shows `2/3` for Phase 3, not `3/3`.
   - What's unclear: Was `pde-tools phase complete 3` ever run? The ROADMAP.md entry for Phase 3 checkbox is `- [ ]` (not checked). STATE.md still says "Current focus: Phase 2" in the body.
   - Recommendation: Plan 04-01 should verify Phase 3 is marked complete in ROADMAP.md and STATE.md before beginning Phase 4 work. If not, run `pde-tools phase complete 3` as part of setup.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — no test framework detected in project |
| Config file | none |
| Quick run command | `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state json` (smoke test) |
| Full suite command | Manual verification script per plan (see below) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORK-01 | Full discuss→plan→execute→verify cycle completes without state loss | smoke | `node bin/pde-tools.cjs state json` after each step → verify fields updated | ❌ Wave 0 |
| WORK-02 | .planning/ state persists across context resets | smoke | Write STATE.md, simulate reset (new bash session), read with `state json` → compare | ❌ Wave 0 |
| WORK-03 | ROADMAP.md edits reflected in subsequent workflow steps | smoke | Edit ROADMAP.md manually, run `roadmap analyze` → verify edit is read | ❌ Wave 0 |
| WORK-04 | STATE.md tracks phase/progress/memory after each step | smoke | `state advance-plan`, `state update-progress`, `state record-metric` → verify frontmatter | ❌ Wave 0 |
| WORK-05 | Traceability table populated after roadmap creation | smoke | `phase complete 4` → grep REQUIREMENTS.md for WORK-0[1-6] Complete | ❌ Wave 0 |
| WORK-06 | Atomic git commits per task with PDE attribution | smoke | `git log --oneline --all --grep="04-0"` → verify commits exist; check format | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state json` — verify frontmatter is current
- **Per wave merge:** Full manual checklist: state json, roadmap analyze, git log --oneline
- **Phase gate:** All 6 WORK requirements have green smoke tests before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `scripts/smoke-test-state.sh` — covers WORK-01 through WORK-04: writes, reads, resets, and verifies STATE.md round-trip
- [ ] `scripts/smoke-test-roadmap.sh` — covers WORK-03: edits ROADMAP.md, runs analyze, checks output
- [ ] `scripts/smoke-test-commits.sh` — covers WORK-06: creates a task commit, checks format and attribution

*(If the team prefers inline verification steps in each PLAN.md over standalone scripts, Wave 0 scripts are optional — all verification can be embedded in the plan task definitions.)*

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/state.cjs` — Full STATE.md CRUD and frontmatter sync implementation, read directly
- `bin/lib/roadmap.cjs` — ROADMAP.md parse and write-back implementation, read directly
- `bin/lib/phase.cjs` — phase lifecycle including `cmdPhaseComplete` with REQUIREMENTS.md traceability update
- `bin/lib/commands.cjs` (`cmdCommit`) — git commit wrapper with commit_docs gating
- `references/git-integration.md` — Authoritative commit format documentation, read directly
- `workflows/execute-plan.md` — Task commit protocol (task_commit section), read directly
- `.planning/STATE.md` — Live state file showing current frontmatter schema
- `.planning/ROADMAP.md` — Live roadmap confirming Phase 3 not yet marked complete

### Secondary (MEDIUM confidence)
- `.planning/phases/03-workflow-commands/03-03-SUMMARY.md` — Phase 3 completion decisions (CLAUDE_PLUGIN_ROOT confirmed, 34 commands operational)
- `.planning/REQUIREMENTS.md` — WORK-01 through WORK-06 definitions + traceability table

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all components read directly from source files
- Architecture: HIGH — implementation code verified, not inferred
- Pitfalls: HIGH — most derived from reading actual implementation (duplicate function, no co-author, frontmatter sync logic)
- WORK-06 gap: MEDIUM — interpretation of "PDE co-author attribution" is ambiguous; needs clarification in planning

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (code is stable; risk is only new commits to the bin/lib files)
