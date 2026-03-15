# Phase 3: Workflow Commands — Research

**Researched:** 2026-03-14
**Domain:** Claude Code plugin command registration, workflow file portability, CLAUDE_PLUGIN_ROOT path resolution
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CMD-01 | All ~29 /gsd: slash commands operational as /pde: equivalents | 34 PDE workflow files exist at `~/.claude/pde/workflows/` — all already contain `/pde:` references internally; zero GSD strings remain. Plugin repo needs a `commands/` directory that registers them. |
| CMD-02 | /pde:new-project initializes a project with questioning, research, requirements, roadmap | `new-project.md` workflow is complete and correct. Needs path portability fix: replace `$HOME/.claude/pde/bin/pde-tools.cjs` with `${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs` (9 call sites + 5 inline text refs). |
| CMD-03 | /pde:plan-phase creates detailed phase plans with verification | `plan-phase.md` workflow complete. Needs 7 pde-tools.cjs path fixes, 10 render.cjs path fixes, 1 `@` reference fix, 2 inline text refs. |
| CMD-04 | /pde:execute-phase runs plans with wave-based parallelization | `execute-phase.md` workflow complete. Needs 11 pde-tools.cjs path fixes, 1 render.cjs fix, 4 `@` refs, 5 inline text refs. |
| CMD-05 | /pde:progress shows current project state and next actions | `progress.md` workflow complete. Needs 6 pde-tools.cjs path fixes. |
| CMD-06 | /pde:quick executes single tasks without full planning overhead | `quick.md` workflow complete. Needs 2 pde-tools.cjs path fixes, 6 render.cjs fixes. |
| CMD-07 | /pde:help displays all available PDE commands with descriptions | `help.md` workflow complete. Already references `/pde:` commands throughout; no hardcoded paths found. |
| CMD-08 | /pde:discuss-phase gathers context through adaptive questioning | `discuss-phase.md` workflow complete. Needs 8 pde-tools.cjs path fixes, 2 render.cjs fixes. |
| CMD-09 | /pde:verify-work validates built features against requirements | `verify-work.md` workflow complete. Needs 2 pde-tools.cjs fixes, 8 render.cjs fixes, 2 `@` refs (UAT.md, diagnose-issues.md). |
| CMD-10 | /pde:map-codebase analyzes existing codebases with parallel agents | `map-codebase.md` workflow complete. Needs 2 pde-tools.cjs fixes. |
| CMD-11 | /pde:new-milestone starts new milestone cycles | `new-milestone.md` workflow complete. Needs 6 pde-tools.cjs fixes, 5 render.cjs fixes, 2 inline text refs. |
| CMD-12 | /pde:complete-milestone archives completed milestones | `complete-milestone.md` workflow complete. Needs 6 pde-tools.cjs fixes, 1 inline text ref. |
| CMD-13 | /pde:audit-milestone audits milestone completion against intent | `audit-milestone.md` workflow complete. Needs 6 pde-tools.cjs fixes, 7 render.cjs fixes. |
</phase_requirements>

---

## Summary

Phase 3 has two distinct workstreams: (1) copy the 34 workflow files from the PDE reference installation into the plugin repo and fix all hardcoded absolute paths, and (2) create a `commands/` directory in the plugin repo with command stub files that register the 29 `/pde:` slash commands in Claude Code's command palette.

The PDE reference at `~/.claude/pde/workflows/` already has zero GSD strings — all internal command references use `/pde:` prefix and `pde-tools.cjs` throughout. The problem is portability: every workflow file contains hardcoded paths to either `"$HOME/.claude/pde/bin/pde-tools.cjs"` (119 call sites across 30 workflow files) or `"$HOME/.claude/pde/lib/ui/render.cjs"` (53 call sites across 14 workflow files). Additionally, 14 `@`-prefixed file references use `/Users/greyaltaer/.claude/pde/` absolute paths, and numerous inline text mentions of that path appear in instructional prose. All of these must be replaced with `${CLAUDE_PLUGIN_ROOT}` equivalents before the workflows are copied into the plugin repo.

For command registration, Claude Code discovers slash commands by scanning a `commands/` directory at the plugin root. Each `.md` file becomes a slash command. The `name` field in the YAML frontmatter determines the command's fully qualified name (e.g., `pde:new-project` → `/pde:new-project`). The PDE personal installation at `~/.claude/pde/commands/` currently uses a three-tier delegation chain (command → skill → workflow) that only works on the developer's machine because the skill files reference `~/.claude/pde/workflows/` with hardcoded paths. The plugin repo commands must use `@${CLAUDE_PLUGIN_ROOT}/workflows/filename.md` to reference workflow files portably.

A third copy task is needed: `~/.claude/pde/lib/ui/` (5 files: colors.cjs, components.cjs, layout.cjs, render.cjs, splash.cjs) must be copied into the plugin repo at `lib/ui/` — this directory was not included in Phase 2 (which only copied `bin/`).

**Primary recommendation:** Copy workflows/, commands/ stubs, lib/ui/ from the PDE reference installation, apply the path substitution in one sed pass per file, then run `claude plugin validate .` and smoke-test the 13 required commands.

---

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `commands/` directory | Plugin auto-discovery | Register slash commands in Claude Code | Official plugin structure; Claude Code scans this dir automatically |
| `${CLAUDE_PLUGIN_ROOT}` | Runtime env var | Portable intra-plugin path references | Injected by Claude Code runtime; works on any install |
| YAML frontmatter `name:` field | Claude Code spec | Set fully qualified command name (`pde:command-name`) | Frontmatter `name` overrides file-based name; enables `pde:` prefix |
| `sed` / `perl` | System | Mass path replacement in workflow files | Single-pass regex substitution across 34 files |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `claude plugin validate .` | Validate plugin loads after adding commands/ | After each structural change |
| `grep -rn "greyaltaer\|\.claude/pde/"` | Verify no absolute paths survive | After path replacement pass |
| `@${CLAUDE_PLUGIN_ROOT}/workflows/name.md` | Reference workflow from command stub | In every command stub's process section |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `${CLAUDE_PLUGIN_ROOT}` in workflows | Embed full workflow content in each command file | Embedding creates 34 large command files (30–1000 lines each) — maintenance nightmare, duplication; `${CLAUDE_PLUGIN_ROOT}` keeps commands thin |
| sed path replacement | Manual editing of 34 files | Manual editing is error-prone with 119+ replacement sites; sed is deterministic and verifiable |
| `@${CLAUDE_PLUGIN_ROOT}/workflows/` in command stubs | Direct CLAUDE_PLUGIN_ROOT in workflow bash blocks | Both are needed; commands use `@` to include workflow as instructions; workflows use bash syntax for pde-tools calls |

---

## Architecture Patterns

### Recommended Plugin Structure After Phase 3

```
<repo-root>/
├── .claude-plugin/
│   └── plugin.json          # Phase 1: Plugin manifest
├── bin/
│   ├── pde-tools.cjs        # Phase 2: Main CLI binary
│   └── lib/                 # Phase 2: 11 CLI modules
│       └── ...
├── commands/                # Phase 3 (NEW): Slash command stubs
│   ├── new-project.md       # /pde:new-project
│   ├── plan-phase.md        # /pde:plan-phase
│   ├── execute-phase.md     # /pde:execute-phase
│   ├── verify-work.md       # /pde:verify-work
│   ├── progress.md          # /pde:progress
│   ├── quick.md             # /pde:quick
│   ├── help.md              # /pde:help
│   ├── discuss-phase.md     # /pde:discuss-phase
│   ├── map-codebase.md      # /pde:map-codebase
│   ├── new-milestone.md     # /pde:new-milestone
│   ├── complete-milestone.md # /pde:complete-milestone
│   ├── audit-milestone.md   # /pde:audit-milestone
│   └── ... (all 34 workflow command stubs)
├── workflows/               # Phase 3 (NEW): Workflow implementations
│   ├── new-project.md       # Full workflow logic
│   ├── plan-phase.md
│   └── ... (all 34 workflow files, paths fixed)
├── lib/                     # Phase 3 (NEW): UI rendering scripts
│   └── ui/
│       ├── colors.cjs
│       ├── components.cjs
│       ├── layout.cjs
│       ├── render.cjs
│       └── splash.cjs
├── references/              # Phase 3 (NEW): Referenced by workflows
├── templates/               # Phase 3 (NEW): Referenced by workflows
└── VERSION                  # Phase 1: Version file
```

### Pattern 1: Command Stub File (commands/name.md)

**What:** Thin command files in `commands/` that register the slash command and delegate to the workflow file.
**When to use:** For every command — commands must be thin; workflow logic lives in `workflows/`.

```markdown
---
name: pde:plan-phase
description: Create detailed phase plans with integrated research and verification
argument-hint: "<phase-number> [--research|--skip-research|--gaps|--prd <file>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---
<objective>
Execute the /pde:plan-phase workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/plan-phase.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/plan-phase.md.
Pass any $ARGUMENTS to the workflow process.
</process>
```

### Pattern 2: Workflow File Path Replacement

**What:** Replace three categories of hardcoded paths in workflow `.md` files.
**When to use:** Applied to all 34 workflow files before copying into the plugin repo.

**Category A — pde-tools.cjs bash calls (119 sites across 30 files):**
```bash
# Before (hardcoded)
INIT=$(node "$HOME/.claude/pde/bin/pde-tools.cjs" init plan-phase "$PHASE")

# After (portable)
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" init plan-phase "$PHASE")
```

**Category B — render.cjs bash calls (53 sites across 14 files):**
```bash
# Before (hardcoded)
node "$HOME/.claude/pde/lib/ui/render.cjs" divider

# After (portable)
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" divider
```

**Category C — @ file references (14 sites across 8 files):**
```markdown
<!-- Before (hardcoded) -->
@/Users/greyaltaer/.claude/pde/references/ui-brand.md

<!-- After (portable) -->
@${CLAUDE_PLUGIN_ROOT}/references/ui-brand.md
```

**Category D — Inline text prose mentions (varies across ~11 files):**
```
# Before
Use template: /Users/greyaltaer/.claude/pde/templates/discovery.md

# After
Use template: ${CLAUDE_PLUGIN_ROOT}/templates/discovery.md
```

**Sed one-liner for categories A and B:**
```bash
# Run from repo root, applied to each workflow file
sed -i '' \
  's|"$HOME/.claude/pde/bin/pde-tools.cjs"|"${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs"|g;
   s|"$HOME/.claude/pde/lib/ui/render.cjs"|"${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs"|g;
   s|@/Users/greyaltaer/.claude/pde/|@${CLAUDE_PLUGIN_ROOT}/|g;
   s|/Users/greyaltaer/.claude/pde/|${CLAUDE_PLUGIN_ROOT}/|g' \
  workflows/FILENAME.md
```

### Anti-Patterns to Avoid

- **Hardcoded `$HOME` in workflow bash blocks:** `$HOME` expands to the current user's home directory, not the plugin install path. Only `${CLAUDE_PLUGIN_ROOT}` is portable.
- **Relative paths in `@` references:** `@./workflows/foo.md` resolves relative to the current working directory (the user's project), not the plugin directory. Always use `@${CLAUDE_PLUGIN_ROOT}/` for plugin-internal refs.
- **Copying `lib/launcher.cjs` or `lib/telemetry.cjs`:** These belong to the pde-os project (separate from the plugin). Only `lib/ui/` (5 files) is needed.
- **Skipping the grep audit after path replacement:** Inline text prose can reference the hardcoded path in non-bash contexts. A grep for `greyaltaer` or `.claude/pde/` after replacement catches these.
- **Using `~/.claude/pde/skills/` delegation chain:** The personal installation uses a command → skill → workflow chain. The plugin repo does NOT need skills/ — commands delegate directly to `@${CLAUDE_PLUGIN_ROOT}/workflows/`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path portability | Custom path resolver script | `${CLAUDE_PLUGIN_ROOT}` env var | Runtime-injected by Claude Code; works on any install without additional code |
| Command registration | Plugin.json `commands` array | Auto-discovery from `commands/` directory | `commands/` is auto-scanned; no registration needed |
| Workflow delegation chain | skills/ → workflows/ two-hop system | Command stubs with `@${CLAUDE_PLUGIN_ROOT}/workflows/` | Direct reference is one hop, no intermediate skill files needed |
| Mass path replacement | Manual editing of 34 files | `sed -i` with regex across all files | Deterministic, auditable, reversible |
| Verification that paths are clean | Eye inspection | `grep -rn "greyaltaer\|\.claude/pde\|HOME.*claude"` | Shell grep catches all occurrences instantly |

---

## Common Pitfalls

### Pitfall 1: `$HOME` vs `${CLAUDE_PLUGIN_ROOT}` Confusion

**What goes wrong:** Workflow bash blocks use `"$HOME/.claude/pde/bin/pde-tools.cjs"`. After rename, the developer uses `"$HOME/.claude/get-shit-done/bin/pde-tools.cjs"` instead — still wrong. The correct replacement is `"${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs"`.

**Why it happens:** `$HOME` expands correctly on the developer's machine because the plugin happens to be installed there. It breaks on any other machine or any non-default install location.

**How to avoid:** The replacement pattern must use `${CLAUDE_PLUGIN_ROOT}`, not any `$HOME/.claude/...` path.

**Warning signs:** `grep -rn 'HOME.*pde\|HOME.*get-shit-done' workflows/` returns results after the replacement pass.

### Pitfall 2: Missing lib/ui/ Directory

**What goes wrong:** Workflows that call `node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs"` fail because `lib/ui/` was not copied to the plugin repo (Phase 2 only copied `bin/`).

**Why it happens:** The `lib/ui/` directory is outside `bin/` and was not in the GSD fork's original structure. It's a PDE-specific addition.

**How to avoid:** Copy `~/.claude/pde/lib/ui/` into the plugin repo at `lib/ui/` as part of Plan 03-01. Run `test -f lib/ui/render.cjs` to verify presence.

**Warning signs:** Any workflow smoke test that involves banner display (new-project, plan-phase, execute-phase, etc.) throws `Cannot find module ... render.cjs`.

### Pitfall 3: Wrong `name:` Prefix in Command Frontmatter

**What goes wrong:** Command file `commands/plan-phase.md` has `name: plan-phase` instead of `name: pde:plan-phase`. The command registers as `/plan-phase` instead of `/pde:plan-phase` in the palette.

**Why it happens:** The auto-discovery name defaults to the filename. The `pde:` prefix must be set explicitly in the `name:` frontmatter field.

**How to avoid:** Every command stub MUST have `name: pde:command-name` in its YAML frontmatter. Verify with `grep "^name:" commands/*.md`.

**Warning signs:** `/pde:plan-phase` does not appear in the command palette; `/plan-phase` does instead.

### Pitfall 4: References and Templates Not Copied

**What goes wrong:** Workflows reference `@${CLAUDE_PLUGIN_ROOT}/references/ui-brand.md` or `@${CLAUDE_PLUGIN_ROOT}/templates/UAT.md` — but those directories were not copied to the plugin repo, so Claude gets file-not-found errors when loading workflow context.

**Why it happens:** Phase 3 plan lists workflows, commands, and lib/ui/ — but `references/` and `templates/` are also required by the workflow files.

**How to avoid:** Copy `~/.claude/pde/references/` and `~/.claude/pde/templates/` to the plugin repo as well. The scope is all files that workflows `@`-reference.

**Referenced references (by workflows):** ui-brand.md, model-profile-resolution.md, phase-argument-parsing.md, continuation-format.md, git-integration.md, verification-patterns.md, checkpoints.md, tdd.md.

**Referenced templates (by workflows):** UAT.md, verification-report.md, summary.md, discovery.md, research-project/, user-setup.md, retrospective.md, VALIDATION.md, SUMMARY.md.

**Warning signs:** `grep -rn "PLUGIN_ROOT/references\|PLUGIN_ROOT/templates" workflows/` returns paths that don't exist as files in the plugin repo.

### Pitfall 5: CLAUDE_PLUGIN_ROOT Not Available in Bash Blocks at Runtime

**What goes wrong:** `${CLAUDE_PLUGIN_ROOT}` is used in bash blocks but only works in the frontmatter/text context of command files — not necessarily inside bash sub-shells spawned by the workflow.

**Why it happens:** STATE.md records this as a confirmed blocker-to-investigate: "Verify `${CLAUDE_PLUGIN_ROOT}` is available in bash blocks inside .md workflow files."

**What we know:** The plugin-dev SKILL.md confirms `${CLAUDE_PLUGIN_ROOT}` is "available as environment variable in executed scripts." The command-development SKILL.md shows `!`node ${CLAUDE_PLUGIN_ROOT}/scripts/analyze.js $1`` as a working pattern. This strongly suggests it works in bash-executed contexts, but empirical verification in Phase 3 is required.

**How to avoid:** After copying and path-fixing, run a smoke test: invoke `/pde:progress` (simplest workflow) and confirm the pde-tools.cjs call succeeds. If `${CLAUDE_PLUGIN_ROOT}` does not expand in bash blocks, the fallback is to use `PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"` at the top of each bash block and use `$PLUGIN_ROOT` in subsequent calls.

**Warning signs:** pde-tools.cjs invocations fail with "cannot find module" or the path contains literal `${CLAUDE_PLUGIN_ROOT}` text instead of the expanded path.

### Pitfall 6: Inline Prose Paths Missed by Sed

**What goes wrong:** The sed replacement fixes bash call sites and `@`-references, but prose instructions inside the workflow that say "Use template: /Users/greyaltaer/.claude/pde/templates/discovery.md" are not updated. These are not executed as code but Claude reads them as instructions and may attempt to use them as file paths.

**Why it happens:** The inline text refs use `/Users/greyaltaer/` (full absolute path) not `$HOME` or `$HOME/.claude/`, so they need a separate grep-and-replace targeting the full username path.

**How to avoid:** Include the full path pattern `/Users/greyaltaer/.claude/pde/` in the sed replacement (Category D) to catch prose mentions.

**Warning signs:** `grep -rn "greyaltaer" workflows/` returns any results after the replacement pass.

---

## Code Examples

### Command Stub Template (verified pattern)

```markdown
---
name: pde:new-project
description: Initialize new project through unified flow — questioning, research, requirements, roadmap
argument-hint: "[--auto] [@idea-doc.md]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/new-project.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/new-project.md end-to-end.
Pass any $ARGUMENTS to the workflow.
</process>
```

### Path Replacement Verification After Copy

```bash
# Verify zero hardcoded paths in workflows/ after replacement
grep -rn "greyaltaer\|\.claude/pde\|HOME.*pde\|HOME.*get-shit-done" workflows/
# Expected: no output (exit code 1)

# Verify zero hardcoded paths in commands/ stubs
grep -rn "greyaltaer\|\.claude/pde\|HOME.*pde" commands/
# Expected: no output (exit code 1)

# Verify all 34 command stubs have correct pde: prefix
grep "^name:" commands/*.md | grep -v "pde:"
# Expected: no output (all names have pde: prefix)

# Verify commands/ count matches expected
ls commands/*.md | wc -l
# Expected: 34 (or exact count matching PDE reference installation)
```

### Plugin Validates After Adding commands/

```bash
# Run from repo root
claude plugin validate .
# Expected: Validation passed (exit 0)
```

### Smoke Test: Simplest Command (progress)

```bash
# In Claude Code: invoke /pde:progress in a project directory
# Expected: Init call to pde-tools.cjs succeeds, displays project state
# If CLAUDE_PLUGIN_ROOT is not available in bash blocks, pde-tools.cjs path fails
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Personal `~/.claude/commands/gsd/` directory | Plugin `commands/` directory at plugin root | GSD → PDE plugin refactor | Commands are bundled with the plugin, not installed separately to `~/.claude/commands/` |
| `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs` hardcoded | `${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs` | Phase 3 | Path is portable; plugin works on any machine with any install location |
| Three-tier delegation (command → skill → workflow) | Two-tier (command stub → workflow) | Phase 3 | Simpler; skills dir not needed in plugin repo; less indirection |
| GSD personal install model | Claude Code plugin install model | Phase 3 | Users install via `claude plugin install`; no manual directory management |

---

## Open Questions

1. **`${CLAUDE_PLUGIN_ROOT}` expansion in bash blocks**
   - What we know: Plugin-dev SKILL.md says it's available "as environment variable in executed scripts." Command examples show `!`node ${CLAUDE_PLUGIN_ROOT}/scripts/analyze.js`` working. STATE.md flagged this as needing empirical verification.
   - What's unclear: Whether it expands correctly inside bash blocks that are multi-line (as opposed to inline `!`cmd`` blocks).
   - Recommendation: Make it the first thing verified in Plan 03-02 smoke testing. If it fails in multi-line bash blocks, use `PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"` as the first line of each bash block.

2. **Exact count of required commands (29 vs 34)**
   - What we know: CMD-01 says "~29 /gsd: slash commands"; the PDE reference has 34 workflow files. Success criterion 5 says "All 29 /pde: commands appear in Claude Code's command palette."
   - What's unclear: Which 5 workflow files are excluded from the 29 (if any). Candidates: `execute-plan.md` (called internally by execute-phase, not directly invoked), `discovery-phase.md`, `update.md`, `transition.md`, `cleanup.md`.
   - Recommendation: Copy all 34 as command stubs; the count check in validation should confirm which appear in the palette. If internal-only workflows should not appear as commands, exclude them from `commands/` but still copy to `workflows/`.

3. **Whether references/ and templates/ need filtering before copy**
   - What we know: `~/.claude/pde/references/` has 22+ files; `~/.claude/pde/templates/` has 40+ files including design-specific content. Workflows only reference a subset.
   - What's unclear: Whether to copy all files (simpler, no risk of missing) or only files actually referenced (cleaner, smaller repo).
   - Recommendation: Copy all — Phase 7 will do a full brand audit and can remove extraneous files then. Phase 3 should not risk missing a referenced file.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — shell grep checks + claude plugin validate + live invocation |
| Config file | None — no test runner needed |
| Quick run command | `grep -rn "greyaltaer" workflows/ commands/ && echo FAIL \|\| echo PASS` |
| Full suite command | See Phase Requirements → Test Map below |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CMD-01 | All 29+ /pde: commands appear in plugin | smoke | `ls commands/*.md \| wc -l` (expect 29+) | Wave 0 |
| CMD-01 | commands/ dir exists in plugin repo | smoke | `test -d commands && echo PASS \|\| echo FAIL` | Wave 0 |
| CMD-01 | All command stubs have pde: name prefix | unit | `grep "^name:" commands/*.md \| grep -v "pde:" && echo FAIL \|\| echo PASS` | Wave 0 |
| CMD-01 | Plugin validates after adding commands/ | integration | `claude plugin validate .` | Wave 0 |
| CMD-02..13 | No hardcoded absolute paths in workflows | regression | `grep -rn "greyaltaer\|\.claude/pde\|HOME.*pde" workflows/ && echo FAIL \|\| echo PASS` | Wave 0 |
| CMD-02..13 | No hardcoded paths in command stubs | regression | `grep -rn "greyaltaer\|\.claude/pde" commands/ && echo FAIL \|\| echo PASS` | Wave 0 |
| CMD-02..13 | lib/ui/render.cjs exists in plugin repo | smoke | `test -f lib/ui/render.cjs && echo PASS \|\| echo FAIL` | Wave 0 |
| CMD-02 | /pde:new-project initializes project | manual | Invoke `/pde:new-project` in Claude Code session | N/A |
| CMD-03 | /pde:plan-phase creates PLAN.md | manual | Invoke `/pde:plan-phase 1` in Claude Code session | N/A |
| CMD-04 | /pde:execute-phase runs plans | manual | Invoke `/pde:execute-phase 1` in Claude Code session | N/A |
| CMD-05 | /pde:progress shows state | smoke | Invoke `/pde:progress` — must call pde-tools.cjs without path errors | N/A |
| CMD-07 | /pde:help lists commands | smoke | Invoke `/pde:help` — must render PDE command reference | N/A |

### Sampling Rate

- **Per task commit:** `grep -rn "greyaltaer\|\.claude/pde\|HOME.*pde" workflows/ commands/ && echo FAIL || echo PASS`
- **Per wave merge:** Full suite — all automated checks above
- **Phase gate:** All automated checks PASS + `/pde:progress` live smoke test before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `workflows/` directory — copy all 34 workflow files from `~/.claude/pde/workflows/` and apply path replacement
- [ ] `commands/` directory — create 34 (or 29) command stub files
- [ ] `lib/ui/` directory — copy 5 files from `~/.claude/pde/lib/ui/`
- [ ] `references/` directory — copy from `~/.claude/pde/references/`
- [ ] `templates/` directory — copy from `~/.claude/pde/templates/`

*(No test framework install needed — all verification is grep + claude CLI + live invocation)*

---

## Sources

### Primary (HIGH confidence)

- Direct inspection of `~/.claude/pde/workflows/` — all 34 files read; path patterns catalogued
- Direct inspection of `~/.claude/pde/commands/` — confirmed command stub structure, `name:` field, delegation pattern
- `plugin-dev` plugin SKILL.md at `~/.claude/plugins/cache/.../plugin-structure/SKILL.md` — confirmed `commands/` auto-discovery, `${CLAUDE_PLUGIN_ROOT}` semantics
- `plugin-dev` plugin SKILL.md at `~/.claude/plugins/cache/.../command-development/SKILL.md` — confirmed `@${CLAUDE_PLUGIN_ROOT}/templates/foo.md` pattern works in commands
- `plugin-dev` plugin at `.../command-development/references/plugin-features-reference.md` — confirmed `${CLAUDE_PLUGIN_ROOT}` expands in bash blocks and `@` references
- Phase 2 RESEARCH.md — confirmed `${CLAUDE_PLUGIN_ROOT}` is injected by Claude Code runtime; safe to use in bin scripts and command files

### Secondary (MEDIUM confidence)

- `grep` audit of `~/.claude/pde/workflows/` — 119 pde-tools.cjs call sites, 53 render.cjs call sites, 14 `@`-prefixed absolute refs, additional inline text refs enumerated per-file
- Inspection of `~/.claude/commands/gsd/new-project.md` — confirmed original GSD command pattern used `@/Users/greyaltaer/.claude/get-shit-done/workflows/` delegation
- Inspection of `~/.claude/pde/lib/ui/` — confirmed 5 UI files; confirmed `launcher.cjs` and `telemetry.cjs` are pde-os project files (not plugin scope)

### Tertiary (LOW confidence — needs empirical validation)

- CLAUDE_PLUGIN_ROOT expansion in multi-line bash blocks inside `.md` workflow files — documented as available in scripts; Phase 3 smoke test must confirm empirically

---

## Metadata

**Confidence breakdown:**
- Plugin command registration mechanism: HIGH — confirmed via plugin-dev SKILL.md + live plugin inspection
- Path portability with ${CLAUDE_PLUGIN_ROOT}: HIGH — official docs confirm, command examples demonstrate
- Scope of files to copy (workflows, lib/ui, references, templates): HIGH — confirmed via grep audit of all workflow @-references and bash calls
- CLAUDE_PLUGIN_ROOT in multi-line bash blocks: MEDIUM — docs say available; empirical confirmation needed in Phase 3

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable Claude Code plugin spec; path patterns unlikely to change)
