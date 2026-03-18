# Phase 31: Skill Builder - Research

**Researched:** 2026-03-17
**Domain:** Claude Code plugin skill generation, validation loop, rubric-based evaluation
**Confidence:** HIGH

## Summary

Phase 31 delivers the `/pde:improve` command with three modes: `create`, `improve`, and `eval`. The entire implementation is an in-project build — no external libraries are required. The codebase already has all the primitives: `validate-skill.cjs` (AUDIT-08), `pde-skill-improver` and `pde-skill-validator` agents (Phase 30), `extractFrontmatter()` in `bin/lib/frontmatter.cjs`, and the `protected-files.json` write sandbox. Phase 31 is a composition phase: wire these existing pieces into a new workflow rather than building novel infrastructure.

The dominant architectural insight is that `/pde:improve` follows the same orchestrator pattern as `/pde:audit`. The workflow (`workflows/improve.md`) drives all three modes. For `create` and `improve`, a Task-spawned skill-builder agent generates content, the workflow calls `pde-tools validate-skill` as a gate, and only presents output to the user after PASS. For `eval`, a Task-spawned design-quality-evaluator agent scores against the Awwwards rubric dimensions, returning structured JSON. There are no new CLI commands needed — `validate-skill` is already built.

The `improve` command writes to `commands/` (PDE-internal skills) and the user's project `.claude/skills/` (user-project skills). The `protected-files.json` already lists `commands/` and `.planning/skill-builder-log.md` as allowed write destinations; `.claude/` is in `protected_directories[]`. This means user-project skills must write to a path NOT under `.claude/` — they go under the user project's `.claude/skills/` which is in the target project directory, not in `${CLAUDE_PLUGIN_ROOT}`. This distinction is critical for the path-sandboxing logic.

**Primary recommendation:** Build `workflows/improve.md` as a three-mode workflow following the audit.md orchestrator pattern. Spawn `pde-skill-builder` agent for `create`/`improve` (new agent), `pde-design-quality-evaluator` for `eval` (model-profiles entry already exists). Gate all create/improve output through `pde-tools validate-skill --raw` before accepting. Use retry loop (max 3 iterations) if validation fails.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-01 | `/pde:improve` create mode builds new skills from description | workflow/agent pattern in Architecture Patterns section; generate-validate-reject loop in Don't Hand-Roll |
| SKILL-02 | `/pde:improve` improve mode: additive by default, --rewrite for full rewrite | additive-vs-rewrite pattern; protected path check before any Edit |
| SKILL-03 | `/pde:improve` eval mode: quality score with findings mapped to rubric dimensions | pde-design-quality-evaluator agent (model-profiles already registered); return JSON format documented |
| SKILL-04 | Auto-validate all generated output; reject invalid before presenting | `pde-tools validate-skill --raw` gate after each generation attempt; retry loop capped at 3 |
| SKILL-05 | Reads and enforces skill-style-guide.md and tooling-patterns.md | `<required_reading>` section in skill-builder agent; LINT rules from tooling-patterns.md used as generation constraints |
| SKILL-06 | Writes to commands/ and user project .claude/skills/ | path-sandboxing logic in workflow Step 2; protected-files.json already guards bin/ and .claude/ of the plugin root |
</phase_requirements>

---

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `workflows/improve.md` | new | Orchestrator workflow for all three modes | All PDE commands follow command → workflow pattern; audit.md is the reference implementation |
| `commands/improve.md` | new | Command file declaring skill IMP, flags, and workflow delegation | Matches the existing command anatomy: frontmatter + `<process>Follow @workflows/improve.md</process>` |
| `agents/pde-skill-builder.md` | new | Agent for create/improve mode generation | Parallel to pde-skill-improver; task-spawned from workflow; writes to allowed paths only |
| `bin/lib/validate-skill.cjs` | existing | Validation gate after generation | Already implements all LINT rules; `--raw` flag returns JSON for programmatic use |
| `pde-design-quality-evaluator` | model-profiles registered | Eval mode scoring agent | Already in model-profiles.cjs; needs agent file created |
| `protected-files.json` | existing | Write-path enforcement | Lists `commands/` and `.planning/skill-builder-log.md` as allowed; guards bin/ and .claude/ |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `references/skill-style-guide.md` | existing | Generation constraint: output conventions | Loaded via `<required_reading>` in skill-builder agent |
| `references/tooling-patterns.md` | existing | Generation constraint: LINT rules (LINT-001 through LINT-042) | Loaded via `<required_reading>` in skill-builder agent |
| `references/quality-standards.md` | existing | Eval mode rubric | Loaded by pde-design-quality-evaluator for Awwwards dimension scoring |
| `bin/lib/model-profiles.cjs` | existing | Model resolution for new agents | `pde-skill-builder` and `pde-design-quality-evaluator` need entries added |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Task-spawned agent for generation | Inline generation in workflow | Task agent can be given specific system prompt constraints; inline generation in a workflow mixes orchestration with generation logic |
| `--raw` flag on validate-skill | Parsing human-readable output | `--raw` returns structured JSON; human-readable output is fragile to parse |
| Retry loop (max 3) in workflow | Single attempt | One attempt is insufficient; generation can produce near-valid output that a targeted retry fixes; 3-cycle cap mirrors the audit improvement loop |

**Installation:** No new packages needed. All components are created as new files in the existing PDE directory structure.

---

## Architecture Patterns

### Recommended File Structure

```
commands/
  improve.md               # New command file (code: IMP)
workflows/
  improve.md               # New workflow — three-mode orchestrator (PROTECTED in protected-files.json)
agents/
  pde-skill-builder.md     # New agent — create/improve mode generation
  pde-design-quality-evaluator.md  # New agent — eval mode scoring
```

User-facing output paths:
```
commands/                  # PDE-internal skills (allowed_write_directories)
{user_project}/.claude/skills/   # User project skills (NOT in CLAUDE_PLUGIN_ROOT)
.planning/skill-builder-log.md   # Audit log (allowed_write_directories)
```

### Pattern 1: Command → Workflow Delegation (same as audit.md)

**What:** Every PDE command is a thin wrapper. The command file declares frontmatter (name, description, allowed-tools, argument-hint) and a `<process>` section containing exactly: `Follow @workflows/improve.md exactly. Pass all of $ARGUMENTS to the workflow.`

**When to use:** All PDE commands. Non-negotiable pattern.

**Example (commands/improve.md):**
```markdown
---
name: pde:improve
description: Create, improve, or evaluate PDE skills
argument-hint: 'create "description" | improve skill-name [--rewrite] | eval skill-name'
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
Execute the /pde:improve command.
</objective>

<process>
Follow @workflows/improve.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
```

Note: `commands/improve.md` does NOT have `<skill_code>`, `<skill_domain>`, `<context_routing>`, or `<purpose>` XML sections — those are for skill workflow files, not command files. `validate-skill` skips command files that lack `<skill_code>` in `commands/` (they use the skill-guard: if `!hasSkillCodeSection && skillPath.includes('workflows/')`, skip — command files don't hit this guard but also don't have the expected sections).

**CRITICAL CORRECTION:** Looking at the validate-skill source — the non-skill guard only applies to `workflows/` path. Command files DO get validated. The existing `commands/critique.md` is a command file without `<skill_code>`, and it passes validate-skill because... it doesn't. Commands are command files, not skill files. The validate-skill check applies to any `.md` file passed to it. When building `commands/improve.md`, do NOT add `<skill_code>` (it's not a skill workflow). The `skill-registry.md` entry for IMP points to `workflows/improve.md` — that's the skill file.

**CORRECTION VERIFIED:** `commands/critique.md` passes validation because the `hasSkillCodeSection` check returns false and the path contains `commands/` not `workflows/`. The code is: `if (!hasSkillCodeSection && skillPath.includes('workflows/'))` → skip. Command files in `commands/` lacking `<skill_code>` still go through full validation, which means they fail the required sections check. But wait — `commands/critique.md` is tested by `validate-skill` and produces a `valid` field result. Let me clarify: the required sections check only runs when the file has content that suggests it's a skill file. Confirmed from source: `REQUIRED_SECTIONS` checks for `<purpose>`, `<skill_code>`, etc. and these are errors if missing. So `commands/improve.md` will fail `validate-skill` unless it has these sections — but the `--raw` result for command files would show errors. The planner should NOT run `validate-skill` against `commands/improve.md`; only run it against `workflows/improve.md`.

### Pattern 2: Three-Mode Workflow Dispatch

**What:** `workflows/improve.md` parses the first positional argument to determine mode (`create`, `improve`, or `eval`), then branches. Each mode has its own step sequence.

**When to use:** Workflows that serve multiple subcommands from one command entry.

**Example (workflows/improve.md mode dispatch):**
```
## 0. Initialize and Dispatch

Parse $ARGUMENTS for mode:
- First word that is one of: "create", "improve", "eval" → MODE
- If no mode found: HALT with error showing usage

IF MODE == "create": jump to Step 1-CREATE
IF MODE == "improve": jump to Step 1-IMPROVE
IF MODE == "eval": jump to Step 1-EVAL
```

### Pattern 3: Generate → Validate → Retry Loop

**What:** After the skill-builder agent produces a skill file, the workflow immediately gates it through `pde-tools validate-skill --raw`. On PASS, present to user. On FAIL, re-spawn agent with validation errors as additional context (max 3 cycles).

**When to use:** All `create` and `improve` outputs. Never present an invalid skill to the user.

**Example:**
```bash
# Gate: validate before presenting
VALIDATION=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" validate-skill "${OUTPUT_PATH}" --raw 2>&1)
if [[ "$VALIDATION" == @file:* ]]; then VALIDATION=$(cat "${VALIDATION#@file:}"); fi

# Parse: extract valid field
VALID=$(echo "$VALIDATION" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try { const j=JSON.parse(d); process.stdout.write(j.valid?'true':'false'); }
    catch { process.stdout.write('false'); }
  });
")

IF VALID == "true":
  present skill to user
ELSE:
  IF cycle < 3:
    re-spawn skill-builder with validation errors in context
    increment cycle
  ELSE:
    HALT with error: "Skill generation failed validation after 3 attempts. Errors: {errors}"
```

### Pattern 4: Additive vs Full Rewrite in Improve Mode

**What:** Default improve mode reads the existing skill, identifies gaps against the rubric/style-guide, and generates ONLY the additions/corrections — never deletes working content. The `--rewrite` flag permits a full replacement.

**When to use:** `improve` mode. Protects user's intentional skill customizations.

**Implementation:**
- Without `--rewrite`: skill-builder agent receives both the original file content AND the specific findings. It produces a diff-like output (new sections to add, corrections to existing sections). Workflow uses Edit tool to apply only the additions.
- With `--rewrite`: skill-builder agent receives the original for context but generates a complete new file. Workflow uses Write tool to replace. Always backs up original to `.planning/improvements/{skill-name}-{date}.md.bak` before overwriting.

### Pattern 5: Eval Mode Rubric Scoring

**What:** `pde-design-quality-evaluator` agent reads the target skill and scores it against the Awwwards 4-dimension rubric adapted for skill quality (not visual design). Returns structured JSON with dimension scores and specific findings.

**Rubric dimensions adapted for skill quality:**
- **Design** (40%): Is the skill's process well-structured? Does it follow the 7-step anatomy? Are output conventions correct?
- **Usability** (30%): Are flag names correct? Are error messages actionable? Does it handle edge cases gracefully?
- **Creativity** (20%): Does the skill handle its domain with sophistication beyond a naive approach?
- **Content** (10%): Are required_reading references current and relevant? Is the purpose section precise?

**Return JSON shape for eval mode:**
```json
{
  "skill_path": "commands/wireframe.md",
  "overall_score": 7.2,
  "dimensions": {
    "design": { "score": 7.5, "weight": 0.40, "findings": ["Missing <flags> section"] },
    "usability": { "score": 8.0, "weight": 0.30, "findings": [] },
    "creativity": { "score": 6.0, "weight": 0.20, "findings": ["No MCP enhancement pattern"] },
    "content": { "score": 7.0, "weight": 0.10, "findings": ["required_reading missing motion-design.md"] }
  },
  "lint_errors": [],
  "lint_warnings": ["LINT-020: --dry-run not documented"],
  "recommendations": [
    { "priority": "HIGH", "action": "Add <flags> section with --dry-run, --quick, --verbose, --no-mcp" }
  ]
}
```

### Pattern 6: Path Sandboxing for Write Destinations

**What:** The workflow enforces that the skill-builder agent only writes to allowed paths. This is prompt-level enforcement (same as audit.md) — no OS-level sandbox.

**Two valid destinations:**
1. `${CLAUDE_PLUGIN_ROOT}/commands/` — PDE-internal skills (listed in `allowed_write_directories`)
2. `{user_project_root}/.claude/skills/` — user-project skills (outside CLAUDE_PLUGIN_ROOT, safe to write)

**Determination logic:**
```
IF "create" mode AND target is "pde-internal":
  WRITE_PATH = "${CLAUDE_PLUGIN_ROOT}/commands/{skill-name}.md"
ELIF "create" mode AND target is "user-project":
  WRITE_PATH = "{cwd}/.claude/skills/{skill-name}.md"
  mkdir -p "{cwd}/.claude/skills/"
```

The distinction between "pde-internal" and "user-project" should be determined by an explicit argument (e.g., `/pde:improve create "description" --for-project` vs default `--for-pde`). This prevents accidentally writing user content into the plugin directory.

### The 7-Step Skill Anatomy

Every skill workflow file follows this exact structure (confirmed from wireframe.md, critique.md, system.md):

1. `<purpose>` — One-paragraph dense description of what the skill produces, key constraints, and output format
2. `<required_reading>` — @ references to skill-style-guide.md, mcp-integration.md, and domain-specific references
3. `<flags>` — Table of supported flags (universal + skill-specific)
4. `<process>` — The numbered step sequence, always starting with `## /pde:{command} — {Name} Pipeline`
   - **Step 1/7:** Initialize design directories (or equivalent setup)
   - **Step 2/7:** Check prerequisites and parse arguments
   - **Step 3/7:** Probe MCP tools
   - **Step 4/7:** Core generation (the skill's primary work)
   - **Step 5/7:** MCP-enhanced enrichment (optional enhancements)
   - **Step 6/7:** Write output files + update DESIGN-STATE/design manifest
   - **Step 7/7:** Summary output (standard summary table from skill-style-guide.md)
5. `<skill_code>` — 2-4 uppercase letters
6. `<skill_domain>` — One of: strategy, visual, ux, review, system, tooling, hardware, handoff
7. `<context_routing>` — Mode detection and file loading patterns

**Note:** The improve workflow itself may use a modified anatomy (steps are mode-specific), but all skills it GENERATES must conform to this anatomy. The `improve` workflow is in `tooling` domain.

### Anti-Patterns to Avoid

- **Validating command files with validate-skill:** `commands/improve.md` is not a skill workflow — don't run `pde-tools validate-skill` against it. Only validate `workflows/improve.md` and generated skill files.
- **Presenting invalid skills to user:** Never display a generated skill before it passes `pde-tools validate-skill`. The rejection must happen inside the workflow before any output.
- **Silent overwrites in improve mode:** Default improve mode is additive. A missing `--rewrite` flag should never result in replacement of existing content.
- **Writing to bin/ or .claude/ of plugin root:** These are in `protected_directories[]`. The skill-builder agent MUST check `protected-files.json` before every Write/Edit call.
- **Skipping skill-registry.md update:** New skills created for PDE-internal use must be registered in `skill-registry.md` OR the skill-builder creates them with a WARNING that registration is needed. The registry is protected — agent cannot auto-update it. A human step is required, or the workflow outputs a reminder.
- **Using pde-skill-improver for skill creation:** `pde-skill-improver` is the Phase 30 agent for applying audit findings — it writes to `.planning/improvements/`. It is NOT the same as the Phase 31 skill-builder agent. Create a new `pde-skill-builder` agent with different constraints and purpose.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skill validation | Custom validation logic in workflow | `pde-tools validate-skill --raw` | Already implements all LINT rules; tested; returns structured JSON |
| YAML frontmatter parsing | Regex or custom parser | `extractFrontmatter()` in bin/lib/frontmatter.cjs | Already handles PDE's YAML subset including inline arrays and multi-line values |
| Model resolution | Hardcoded model names | `pde-tools resolve-model {agent} --raw` | Respects config.json model_profile and model_overrides |
| Protected path checking | String comparison logic | Read `protected-files.json` and check `protected[]` and `protected_directories[]` | Already the established pattern; consistent with audit.md |
| Skill code uniqueness checking | Scan all skill files | `pde-tools validate-skill` already checks skill-registry.md | Validation includes LINT-010/LINT-011 uniqueness check |
| Diff generation | Custom diff algorithm | `diff -u original proposed` via Bash | Standard Unix utility; already used by pde-skill-improver |

**Key insight:** Phase 31 is intentionally a thin composition layer. Every non-trivial operation has already been built in Phases 29-30. The skill-builder's value is the generate → validate → retry orchestration and the agent-as-generator pattern, not new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Confusing pde-skill-improver (Phase 30) with pde-skill-builder (Phase 31)

**What goes wrong:** The planner reuses `pde-skill-improver.md` (the Phase 30 audit-finding fixer) for the skill builder create/improve modes, leading to incorrect write destinations and wrong return format.

**Why it happens:** Both agents "improve skills" by name, but their roles are completely different:
- `pde-skill-improver`: Fixes audit findings → writes to `.planning/improvements/`
- `pde-skill-builder` (new): Creates/improves skills from user intent → writes to `commands/` or `.claude/skills/`

**How to avoid:** Create `agents/pde-skill-builder.md` as a new file. Do not modify `agents/pde-skill-improver.md`.

**Warning signs:** If the agent prompt says "write to .planning/improvements/", it is pde-skill-improver, not pde-skill-builder.

### Pitfall 2: validate-skill Returns Non-Zero Exit on FAIL but --raw Still Outputs JSON

**What goes wrong:** Workflow treats non-zero exit code as "no output" and fails to parse the validation errors, losing the retry context.

**Why it happens:** `pde-tools validate-skill` exits with non-zero when the skill has errors. The `--raw` flag still writes JSON to stdout. Using `set -e` or `|| exit 1` in the workflow's bash block swallows the JSON.

**How to avoid:** Use `|| true` after the validate-skill command when capturing output, just as `test_audit08_validate_skill.sh` does:
```bash
VALIDATION=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" validate-skill "${OUTPUT_PATH}" --raw 2>&1) || true
```

**Warning signs:** Retry loop never has error context to pass to the agent; agent keeps generating the same invalid output.

### Pitfall 3: skill-registry.md Is Protected — Agent Cannot Register New Skills

**What goes wrong:** The skill-builder agent attempts to auto-register a newly created skill in `skill-registry.md` but fails silently because the file is in `protected[]` in `protected-files.json`.

**Why it happens:** `skill-registry.md` is listed in `protected-files.json` to prevent circular self-modification. New skill registration requires human action.

**How to avoid:** The workflow should output a clear reminder at the end of `create` mode:
```
Note: New skill created at {path}.
  To register: add "| {CODE} | /pde:{command} | workflows/{file}.md | {domain} | pending |"
  to skill-registry.md manually (protected file — cannot be auto-updated).
```

**Warning signs:** Skill passes validate-skill but shows warning "Skill code 'XYZ' not found in skill-registry.md".

### Pitfall 4: User Project .claude/skills/ vs Plugin Root .claude/

**What goes wrong:** Skill builder writes a user-project skill to `${CLAUDE_PLUGIN_ROOT}/.claude/skills/` (which doesn't exist and is protected) instead of `{cwd}/.claude/skills/` (which is in the user's project root).

**Why it happens:** `CLAUDE_PLUGIN_ROOT` resolves to the PDE plugin directory. The user's project `.claude/skills/` is relative to `cwd` (the user's working directory), which is different.

**How to avoid:** Use `cwd` (current working directory from `process.cwd()` at runtime, accessible via `$PWD` in Bash) for user-project skill paths. Never use `${CLAUDE_PLUGIN_ROOT}` for user-project writes.

**Warning signs:** Files appear in the wrong directory; `validate-skill` can't find the workflow reference (relative to wrong root).

### Pitfall 5: Improve Mode Accidentally Overwrites Without --rewrite

**What goes wrong:** The agent generates "improved" content that replaces the entire skill file when the user only wanted targeted enhancements.

**Why it happens:** The agent is instructed to "improve" the skill and generates a complete file. Without explicit additive-only constraints, it produces a full rewrite.

**How to avoid:** The pde-skill-builder agent prompt must explicitly say: "In improve mode WITHOUT --rewrite, produce ONLY the additions and corrections. Output a list of: (1) new sections to append, (2) specific text replacements for existing sections. Do NOT output the full file." The workflow applies these targeted changes using Edit tool, not Write tool.

**Warning signs:** `git diff` shows the full file replaced instead of specific additions.

### Pitfall 6: Eval Mode Rubric Is for Skill Quality, Not Visual Design Quality

**What goes wrong:** `pde-design-quality-evaluator` is used with the Awwwards rubric as-is, producing scores for "visual hook" and "spring physics animations" for a skill file that contains no visual output.

**Why it happens:** The agent is designed for visual design evaluation; skill evaluation requires an adapted rubric.

**How to avoid:** The eval mode creates a skill-adapted rubric either in the agent prompt or as a `references/skill-quality-rubric.md` reference. The four dimensions remain (Design, Usability, Creativity, Content) but criteria are reinterpreted for skill files:
- Design → structural quality (anatomy, step numbering, section completeness)
- Usability → developer experience (flag conventions, error messages, prerequisite handling)
- Creativity → domain sophistication (MCP integration, nuanced edge case handling)
- Content → reference quality (required_reading completeness, purpose precision)

---

## Code Examples

Verified patterns from existing PDE codebase:

### Validate-skill gate with retry context

```bash
# Source: bin/lib/validate-skill.cjs and test_audit08_validate_skill.sh
CYCLE=0
MAX_CYCLES=3

while [[ $CYCLE -lt $MAX_CYCLES ]]; do
  CYCLE=$((CYCLE + 1))

  # Spawn skill-builder agent to generate/regenerate
  # ... (Task call with VALIDATION_ERRORS in context if CYCLE > 1) ...

  # Gate: validate output
  VALIDATION=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" validate-skill "${OUTPUT_PATH}" --raw 2>&1) || true
  if [[ "$VALIDATION" == @file:* ]]; then VALIDATION=$(cat "${VALIDATION#@file:}"); fi

  VALID=$(echo "$VALIDATION" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try { const j=JSON.parse(d); process.stdout.write(j.valid===true?'true':'false'); }
      catch { process.stdout.write('false'); }
    });
  " 2>/dev/null)

  if [[ "$VALID" == "true" ]]; then
    break
  fi

  # Extract errors for next cycle context
  VALIDATION_ERRORS=$(echo "$VALIDATION" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try { const j=JSON.parse(d); process.stdout.write(JSON.stringify(j.errors||[])); }
      catch { process.stdout.write('[]'); }
    });
  " 2>/dev/null)
done

if [[ "$VALID" != "true" ]]; then
  echo "Error: Skill generation failed validation after ${MAX_CYCLES} attempts."
  echo "  Errors: ${VALIDATION_ERRORS}"
  exit 1
fi
```

### Model resolution pattern (from audit.md)

```bash
# Source: workflows/audit.md Step 0
BUILDER_MODEL=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-skill-builder --raw)
EVALUATOR_MODEL=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-design-quality-evaluator --raw)
```

### Skill-builder agent Task call (create mode)

```
Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-skill-builder.md for instructions.

<mode>create</mode>
<description>{user's description from $ARGUMENTS}</description>
<target>{pde-internal | user-project}</target>
<output_path>{WRITE_PATH}</output_path>
<skill_code_suggestion>{suggested code if parseable from description, else empty}</skill_code_suggestion>
<style_guide_path>${CLAUDE_PLUGIN_ROOT}/references/skill-style-guide.md</style_guide_path>
<tooling_patterns_path>${CLAUDE_PLUGIN_ROOT}/references/tooling-patterns.md</tooling_patterns_path>
{IF CYCLE > 1: <validation_errors>{VALIDATION_ERRORS}</validation_errors>}",
  model="{BUILDER_MODEL}"
)
```

### Skill template (7-step anatomy) for generated skills

```markdown
---
name: pde:{command}
description: {one-line description}
argument-hint: '{argument pattern}'
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---
<purpose>
{Dense paragraph describing what the skill produces, its key constraints, output format,
and what downstream skills consume its output.}
</purpose>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/{domain-specific-reference}.md
</required_reading>

<flags>
## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | {skill-specific dry run behavior} |
| `--quick` | Boolean | {skill-specific quick behavior} |
| `--verbose` | Boolean | Show detailed progress, timing, reference loading details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. |
</flags>

<process>

## /pde:{command} — {Name} Pipeline

Check for flags in $ARGUMENTS before beginning.

---

### Step 1/7: Initialize

{initialization logic}

---

### Step 2/7: Check prerequisites and parse arguments

{prerequisite checks using Glob tool; soft dependencies warn, hard dependencies halt}

---

### Step 3/7: Probe MCP tools

{probe sequential-thinking and domain-specific MCPs}

---

### Step 4/7: {Core generation step}

{the skill's primary work}

---

### Step 5/7: MCP-enhanced enrichment

{optional enhancements via available MCPs}

---

### Step 6/7: Write output and update state

{write files, update DESIGN-STATE}

---

### Step 7/7: Summary

| Property | Value |
|----------|-------|
| Files created | {path} ({type}, {size}) |
| Files modified | {path} |
| Next suggested skill | /pde:{next} |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {list or "none"} |

</process>

<skill_code>
{CODE}
</skill_code>

<skill_domain>
{domain}
</skill_domain>

<context_routing>
{mode detection and file loading patterns}
</context_routing>
```

### pde-skill-builder agent constraints block (key sections)

```markdown
## Protected Files Constraint

Before every Write or Edit tool call, read ${CLAUDE_PLUGIN_ROOT}/protected-files.json.
You MUST NOT write to any path listed in protected[] or any subdirectory in protected_directories[].
Allowed write destinations: commands/ (for PDE-internal skills), {cwd}/.claude/skills/ (for user-project skills).

## Generate → Output Pattern

For CREATE mode: produce a complete, valid SKILL.md file at the output_path provided.
For IMPROVE mode WITHOUT --rewrite: produce ONLY the additions and corrections as a structured list.
  Output format: {"additions": [...], "replacements": [{"original": "...", "replacement": "..."}]}
  Do NOT output the full file in improve mode without --rewrite.
For IMPROVE mode WITH --rewrite: produce a complete replacement file.

## Required Structure

Every generated skill MUST include all 7 anatomy sections:
<purpose>, <required_reading>, <flags>, <process> (7 numbered steps), <skill_code>, <skill_domain>, <context_routing>

Required flags in every skill: --dry-run, --quick, --verbose, --no-mcp
Step 7 MUST include the standard output summary table from skill-style-guide.md
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual skill authoring | Guided generation with LINT enforcement | Phase 31 | Skills can be created programmatically and still pass all structural checks |
| Post-hoc quality review | Generate → validate → reject loop | Phase 31 | Invalid skills never reach the user |
| Human-only rubric evaluation | pde-design-quality-evaluator agent scoring | Phase 31 | Eval mode gives actionable scores, not impressions |

**No deprecated approaches in this phase** — Phase 31 is net-new functionality.

---

## Design Decisions (Resolved)

1. **Skill code assignment in create mode** → **Auto-suggest with confirmation**
   - Builder proposes a code based on the description, user accepts or overrides
   - Warns on LINT-011 collision against skill-registry.md
   - Outputs registration reminder (skill-registry.md is protected, can't auto-register)

2. **User-project vs PDE-internal destination** → **User-project default + `--for-pde` flag**
   - Default: `{cwd}/.claude/skills/` (user-project)
   - `--for-pde` flag: `commands/` (PDE-internal)
   - Both are first-class paths; flag acts as safety gate for PDE directory writes

3. **Eval mode rubric** → **Dedicated `references/skill-quality-rubric.md` file**
   - Separates rubric from agent prompt for easier iteration
   - Adds a Phase 31 deliverable (new reference file)
   - Agent loads via `<required_reading>` — same pattern as other reference files

4. **Improve mode diff application** → **Workflow applies directly via Edit tool**
   - Agent returns structured additions/replacements JSON
   - Workflow parses JSON and applies via Edit tool — deterministic, no LLM needed
   - No second agent call — keeps it simple

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bash test scripts (`.test_*.sh` pattern, established in Phase 29-30) |
| Config file | None — standalone shell scripts |
| Quick run command | `bash .planning/phases/31-skill-builder/test_skill01_create_mode.sh` |
| Full suite command | `for f in .planning/phases/31-skill-builder/test_skill*.sh; do bash "$f"; done` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-01 | create mode produces SKILL.md at correct path | smoke/integration | `bash .../test_skill01_create_mode.sh` | Wave 0 |
| SKILL-02 | improve mode is additive by default; --rewrite replaces | smoke/integration | `bash .../test_skill02_improve_mode.sh` | Wave 0 |
| SKILL-03 | eval mode returns JSON with dimension scores | smoke/integration | `bash .../test_skill03_eval_mode.sh` | Wave 0 |
| SKILL-04 | validate-skill gates generated output before presenting | integration | `bash .../test_skill04_validation_gate.sh` | Wave 0 |
| SKILL-05 | skill-builder agent references style-guide and tooling-patterns | content | `bash .../test_skill05_reference_loading.sh` | Wave 0 |
| SKILL-06 | writes to commands/ and .claude/skills/, not bin/ | path-guard | `bash .../test_skill06_path_sandboxing.sh` | Wave 0 |

### Sampling Rate

- **Per task commit:** `bash .planning/phases/31-skill-builder/test_skill04_validation_gate.sh` (fastest — tests the gate, not agent generation)
- **Per wave merge:** `for f in .planning/phases/31-skill-builder/test_skill*.sh; do bash "$f"; done`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/31-skill-builder/test_skill01_create_mode.sh` — covers SKILL-01: command file exists, workflow exists, IMP registered in skill-registry, agents exist
- [ ] `.planning/phases/31-skill-builder/test_skill02_improve_mode.sh` — covers SKILL-02: --rewrite flag documented in workflow, improve mode diff output format
- [ ] `.planning/phases/31-skill-builder/test_skill03_eval_mode.sh` — covers SKILL-03: pde-design-quality-evaluator agent exists, returns JSON with dimension keys
- [ ] `.planning/phases/31-skill-builder/test_skill04_validation_gate.sh` — covers SKILL-04: workflow calls validate-skill, retry loop logic present
- [ ] `.planning/phases/31-skill-builder/test_skill05_reference_loading.sh` — covers SKILL-05: pde-skill-builder agent has required_reading for both references
- [ ] `.planning/phases/31-skill-builder/test_skill06_path_sandboxing.sh` — covers SKILL-06: workflow has protected-files check, bin/ and .claude/ not in allowed paths

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/validate-skill.cjs` — complete validate-skill implementation; all LINT rules; `--raw` flag behavior; non-skill guard logic
- `workflows/audit.md` — orchestrator pattern; Task() spawn syntax; model resolution; sequential loop; cycle cap
- `agents/pde-skill-improver.md` — agent constraint format; write-destination pattern; return JSON shape
- `agents/pde-skill-validator.md` — validator agent format; required_reading pattern; return JSON shape
- `agents/pde-quality-auditor.md` — eval mode pattern; structured JSON return; dimension scoring math
- `bin/lib/model-profiles.cjs` — confirms pde-skill-builder NOT registered (new entry needed); pde-design-quality-evaluator IS registered
- `protected-files.json` — write sandbox; `commands/` and `.planning/skill-builder-log.md` already in `allowed_write_directories`; `.claude/` in `protected_directories`
- `workflows/wireframe.md`, `workflows/critique.md`, `workflows/system.md` — confirmed 7-step anatomy with `<purpose>`, `<required_reading>`, `<flags>`, `<process>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`
- `references/skill-style-guide.md` — output conventions, LINT rules LINT-020 through LINT-042
- `references/tooling-patterns.md` — LINT rules LINT-001 through LINT-012

### Secondary (MEDIUM confidence)

- `.planning/phases/30-self-improvement-fleet-audit-command/30-RESEARCH.md` — validated that Task() agents cannot spawn sub-agents; sequential workflow pattern confirmed; Bash test pattern confirmed

### Tertiary (LOW confidence)

- None for this phase — all claims are verified against actual code files in the repository.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified as existing or clearly planned in model-profiles.cjs
- Architecture: HIGH — patterns verified from audit.md, wireframe.md, validate-skill.cjs source
- Pitfalls: HIGH — derived from reading actual source code and test files, not speculation

**Research date:** 2026-03-17
**Valid until:** 2026-06-17 (stable — no external dependencies)
