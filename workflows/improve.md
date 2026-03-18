---
name: pde:improve
description: Create, improve, or evaluate PDE skills with validation gating
argument-hint: 'create "description" [--for-pde] | improve skill-name [--rewrite] [--for-pde] | eval skill-name'
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---
<purpose>
Create new skills from descriptions, improve existing skills with targeted enhancements (additive by default, full rewrite via --rewrite), or evaluate skill quality against the skill-quality-rubric. All generated output is gated through pde-tools validate-skill before presentation — invalid skills are rejected and retried (max 3 cycles). Default write destination is user-project (.claude/skills/); --for-pde flag writes to PDE-internal commands/. Protected-files.json is checked before every write.
</purpose>

<required_reading>
@${CLAUDE_PLUGIN_ROOT}/references/skill-style-guide.md
@${CLAUDE_PLUGIN_ROOT}/references/tooling-patterns.md
@${CLAUDE_PLUGIN_ROOT}/references/skill-quality-rubric.md
@${CLAUDE_PLUGIN_ROOT}/protected-files.json
</required_reading>

<flags>
## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--for-pde` | Boolean | Write to PDE-internal commands/ instead of user-project .claude/skills/ |
| `--rewrite` | Boolean | In improve mode, replace entire skill instead of additive changes |
| `--dry-run` | Boolean | Show what would be created/changed without writing files |
| `--verbose` | Boolean | Show detailed progress including validation output and retry context |
</flags>

<process>

## /pde:improve -- Skill Builder Pipeline

Check for flags in $ARGUMENTS before beginning.

---

### Step 0: Initialize and Dispatch

Parse $ARGUMENTS for mode:
- First word matching "create", "improve", or "eval" -> MODE
- If no mode found: HALT with usage message showing all three modes

Parse flags:
- FOR_PDE: true if --for-pde present
- REWRITE: true if --rewrite present
- DRY_RUN: true if --dry-run present
- VERBOSE: true if --verbose present

Resolve models:

```bash
BUILDER_MODEL=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-skill-builder --raw)
EVALUATOR_MODEL=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-design-quality-evaluator --raw)
```

Display banner: PDE > IMPROVE ({MODE})

IF MODE == "create": jump to Step 1-CREATE
IF MODE == "improve": jump to Step 1-IMPROVE
IF MODE == "eval": jump to Step 1-EVAL

---

### Step 1-CREATE: Determine Write Path and Skill Code

Extract description from remaining $ARGUMENTS (text after "create", excluding flags).

Determine write path:
- IF FOR_PDE is true:
    WRITE_DIR = "${CLAUDE_PLUGIN_ROOT}/commands/"
- ELSE:
    WRITE_DIR = "${PWD}/.claude/skills/"
    mkdir -p "${PWD}/.claude/skills/"

Read protected-files.json and verify WRITE_DIR is not in protected_directories[].
If WRITE_DIR is commands/, verify it is in allowed_write_directories[].

Auto-suggest a skill code from the description:
- Extract key domain words
- Propose 2-4 uppercase letters (e.g., "database migration" -> "DBM")
- Read skill-registry.md and check for LINT-011 collision
- If collision: warn and suggest alternative
- Present suggested code to user for confirmation

Set SKILL_NAME from confirmed code (lowercase for filename).
Set OUTPUT_PATH = "${WRITE_DIR}${SKILL_NAME}.md"

If DRY_RUN: display planned output path and skip to summary.

Jump to Step 2-GENERATE.

---

### Step 1-IMPROVE: Load Existing Skill

Extract skill-name from $ARGUMENTS (word after "improve").

Locate the skill file:
- Search ${CLAUDE_PLUGIN_ROOT}/commands/{skill-name}.md
- Search ${CLAUDE_PLUGIN_ROOT}/workflows/{skill-name}.md
- Search ${PWD}/.claude/skills/{skill-name}.md
- If not found: HALT with "Skill '{skill-name}' not found"

Set SKILL_PATH to found file.
Read the existing skill content.

Determine write path:
- IF FOR_PDE is true OR SKILL_PATH starts with ${CLAUDE_PLUGIN_ROOT}:
    WRITE_DIR = directory of SKILL_PATH
- ELSE:
    WRITE_DIR = "${PWD}/.claude/skills/"

Read protected-files.json and verify SKILL_PATH is not in protected[].

If DRY_RUN: display skill path, mode (additive vs rewrite), and skip to summary.

Jump to Step 2-GENERATE.

---

### Step 1-EVAL: Locate Skill and Spawn Evaluator

Extract skill-name from $ARGUMENTS (word after "eval").

Locate the skill file using same search pattern as Step 1-IMPROVE.
Set SKILL_PATH to found file.

Spawn evaluator agent:

```
Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-design-quality-evaluator.md for instructions.

<skill_to_evaluate>${SKILL_PATH}</skill_to_evaluate>
<rubric_path>${CLAUDE_PLUGIN_ROOT}/references/skill-quality-rubric.md</rubric_path>
<style_guide_path>${CLAUDE_PLUGIN_ROOT}/references/skill-style-guide.md</style_guide_path>
<tooling_patterns_path>${CLAUDE_PLUGIN_ROOT}/references/tooling-patterns.md</tooling_patterns_path>

<constraint>READ-ONLY. Never write to any file. Return structured JSON matching the skill-quality-rubric.md schema.</constraint>",
  model="{EVALUATOR_MODEL}"
)
```

Parse the evaluator's returned JSON. Extract: overall_score, dimensions, lint_errors, lint_warnings, recommendations.

Display formatted evaluation report:
- Overall score with letter grade (9-10: A, 7-8: B, 5-6: C, 3-4: D, 1-2: F)
- Per-dimension breakdown with findings
- LINT errors and warnings
- Prioritized recommendations

Log evaluation to .planning/skill-builder-log.md with timestamp, skill path, and overall score.

Jump to Step 4-SUMMARY.

---

### Step 2-GENERATE: Spawn Skill Builder Agent

Set CYCLE=0, MAX_CYCLES=3, VALIDATION_ERRORS=""

While CYCLE < MAX_CYCLES:
  CYCLE = CYCLE + 1

  IF MODE == "create":
    Task(
      prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-skill-builder.md for instructions.

<mode>create</mode>
<description>{extracted description from $ARGUMENTS}</description>
<target>{pde-internal if FOR_PDE else user-project}</target>
<output_path>${OUTPUT_PATH}</output_path>
<skill_code_suggestion>{confirmed skill code}</skill_code_suggestion>
<style_guide_path>${CLAUDE_PLUGIN_ROOT}/references/skill-style-guide.md</style_guide_path>
<tooling_patterns_path>${CLAUDE_PLUGIN_ROOT}/references/tooling-patterns.md</tooling_patterns_path>
{IF CYCLE > 1: <validation_errors>${VALIDATION_ERRORS}</validation_errors>}",
      model="{BUILDER_MODEL}"
    )

  ELIF MODE == "improve" AND REWRITE is false:
    Task(
      prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-skill-builder.md for instructions.

<mode>improve</mode>
<rewrite>false</rewrite>
<skill_path>${SKILL_PATH}</skill_path>
<existing_content>{content of SKILL_PATH}</existing_content>
<style_guide_path>${CLAUDE_PLUGIN_ROOT}/references/skill-style-guide.md</style_guide_path>
<tooling_patterns_path>${CLAUDE_PLUGIN_ROOT}/references/tooling-patterns.md</tooling_patterns_path>
{IF CYCLE > 1: <validation_errors>${VALIDATION_ERRORS}</validation_errors>}",
      model="{BUILDER_MODEL}"
    )

  ELIF MODE == "improve" AND REWRITE is true:
    # Backup original before rewrite
    BACKUP_PATH=".planning/improvements/$(basename ${SKILL_PATH} .md)-$(date +%Y-%m-%d).md.bak"
    cp "${SKILL_PATH}" "${BACKUP_PATH}"

    Task(
      prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-skill-builder.md for instructions.

<mode>improve</mode>
<rewrite>true</rewrite>
<skill_path>${SKILL_PATH}</skill_path>
<existing_content>{content of SKILL_PATH}</existing_content>
<output_path>${SKILL_PATH}</output_path>
<style_guide_path>${CLAUDE_PLUGIN_ROOT}/references/skill-style-guide.md</style_guide_path>
<tooling_patterns_path>${CLAUDE_PLUGIN_ROOT}/references/tooling-patterns.md</tooling_patterns_path>
{IF CYCLE > 1: <validation_errors>${VALIDATION_ERRORS}</validation_errors>}",
      model="{BUILDER_MODEL}"
    )

  Jump to Step 3-VALIDATE.

---

### Step 3-VALIDATE: Gate Through validate-skill

For create mode and improve --rewrite mode (which produce a full file):

```bash
VALIDATION=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" validate-skill "${OUTPUT_PATH}" --raw 2>&1) || true
if [[ "$VALIDATION" == @file:* ]]; then VALIDATION=$(cat "${VALIDATION#@file:}"); fi

VALID=$(echo "$VALIDATION" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try { const j=JSON.parse(d); process.stdout.write(j.valid===true?'true':'false'); }
    catch { process.stdout.write('false'); }
  });
" 2>/dev/null)
```

IF VALID == "true":
  IF VERBOSE: display "Validation passed on cycle {CYCLE}"
  Break out of retry loop
ELSE:
  VALIDATION_ERRORS=$(echo "$VALIDATION" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try { const j=JSON.parse(d); process.stdout.write(JSON.stringify(j.errors||[])); }
      catch { process.stdout.write('[]'); }
    });
  " 2>/dev/null)

  IF VERBOSE: display "Validation failed (cycle {CYCLE}/{MAX_CYCLES}): {VALIDATION_ERRORS}"

  IF CYCLE >= MAX_CYCLES:
    HALT with: "Skill generation failed validation after 3 attempts. Errors: {VALIDATION_ERRORS}"

  Continue to next cycle (loop back to Step 2-GENERATE)

For improve mode WITHOUT --rewrite (additive mode):
- Parse the agent's returned JSON (additions + replacements)
- Apply additions using Edit tool (append after specified sections)
- Apply replacements using Edit tool (find and replace exact strings)
- After applying, run validate-skill on the modified SKILL_PATH
- Same VALID/retry logic as above

---

### Step 4-SUMMARY: Present Results

For CREATE mode:
  Display:
  - Created skill at: {OUTPUT_PATH}
  - Skill code: {CODE}
  - Validation: PASSED
  - Note: "To register for PDE: add '| {CODE} | /pde:{command} | workflows/{file}.md | {domain} | pending |' to skill-registry.md manually (protected file)."

For IMPROVE mode:
  Display:
  - Improved skill at: {SKILL_PATH}
  - Mode: {additive | full rewrite}
  - If rewrite: "Backup saved at: {BACKUP_PATH}"
  - Validation: PASSED
  - Changes applied: {count of additions + replacements}

For EVAL mode:
  (Already displayed in Step 1-EVAL)

Log to .planning/skill-builder-log.md with timestamp, mode, skill path, and result.

</process>

<skill_code>
IMP
</skill_code>

<skill_domain>
tooling
</skill_domain>

<context_routing>
Mode detection from first positional argument:
- "create" -> CREATE mode: parse description, determine destination, generate new skill
- "improve" -> IMPROVE mode: locate existing skill, evaluate gaps, apply targeted fixes or rewrite
- "eval" -> EVAL mode: locate skill, spawn evaluator, display rubric scores

File loading by mode:
- CREATE: load style-guide, tooling-patterns, mcp-integration as generation constraints
- IMPROVE: load target skill file + style-guide + tooling-patterns
- EVAL: load target skill file + skill-quality-rubric

Flag interactions:
- --for-pde: changes write destination from .claude/skills/ to commands/
- --rewrite: only valid in improve mode; enables full replacement instead of additive
- --dry-run: valid in all modes; shows planned actions without execution
- --verbose: valid in all modes; shows validation output and retry context
</context_routing>
