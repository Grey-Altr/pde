<purpose>
Audit PDE's own artifacts against quality rubric and structural rules. Optionally generate and apply improvements via a three-agent fleet (auditor -> improver -> validator).
</purpose>

<required_reading>
@${CLAUDE_PLUGIN_ROOT}/references/quality-standards.md
@${CLAUDE_PLUGIN_ROOT}/references/tooling-patterns.md
@${CLAUDE_PLUGIN_ROOT}/protected-files.json
</required_reading>

<process>

## 0. Initialize

Parse $ARGUMENTS for flags:
- `--fix`: enable improvement loop (default: false, audit-only)
- `--deep`: include MEDIUM/LOW findings in improvement loop (default: false, CRITICAL/HIGH only)
- `--save-baseline`: save scores as new baseline after audit (default: false)
- `--category "X,Y"`: comma-separated category filter (default: all)

Set boolean variables from parsed flags:
- FIX_MODE: true if --fix present, false otherwise
- DEEP_MODE: true if --deep present, false otherwise
- SAVE_BASELINE: true if --save-baseline present, false otherwise
- CATEGORY_FILTER: value after --category, empty string if not present

Resolve agent models:

```bash
AUDITOR_MODEL=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-output-quality-auditor --raw)
IMPROVER_MODEL=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-skill-improver --raw)
VALIDATOR_MODEL=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-skill-validator --raw)
```

Display banner: `PDE > AUDIT`

Ensure staging directory exists:
```bash
mkdir -p .planning/improvements
```

## 1. Spawn Auditor Agent

Build the artifact list by scanning the PDE directory:

```bash
COMMANDS=$(ls "${CLAUDE_PLUGIN_ROOT}"/commands/*.md 2>/dev/null | tr '\n' ',')
WORKFLOWS=$(ls "${CLAUDE_PLUGIN_ROOT}"/workflows/*.md 2>/dev/null | tr '\n' ',')
AGENTS=$(ls "${CLAUDE_PLUGIN_ROOT}"/agents/*.md 2>/dev/null | tr '\n' ',')
TEMPLATES=$(find "${CLAUDE_PLUGIN_ROOT}"/templates -name "*.md" 2>/dev/null | tr '\n' ',')
REFERENCES=$(ls "${CLAUDE_PLUGIN_ROOT}"/references/*.md 2>/dev/null | tr '\n' ',')
```

If `--category` flag is set, filter to only the specified categories. For example, `--category "commands,workflows"` means set AGENTS, TEMPLATES, REFERENCES to empty.

Spawn the auditor Task (sequential — wait for return before proceeding):

```
Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-quality-auditor.md for instructions.

<artifacts_to_audit>
Commands: {COMMANDS}
Workflows: {WORKFLOWS}
Agents: {AGENTS}
Templates: {TEMPLATES}
References: {REFERENCES}
</artifacts_to_audit>

<rubric_path>${CLAUDE_PLUGIN_ROOT}/references/quality-standards.md</rubric_path>
<rules_path>${CLAUDE_PLUGIN_ROOT}/references/tooling-patterns.md</rules_path>

<constraint>READ-ONLY. Never write to any file. Return findings as structured JSON.</constraint>",
  model="{AUDITOR_MODEL}"
)
```

Parse the auditor's returned JSON. Extract: findings[], summary{}, scores{}, missing_references[].

## 2. Generate Audit Report

Write `.planning/audit-report.md` with:

```markdown
# PDE Audit Report

**Generated:** {timestamp}
**Categories scanned:** {list}
**Total findings:** {count}

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | {n} |
| HIGH | {n} |
| MEDIUM | {n} |
| LOW | {n} |

## PDE Health Report

**Overall Health:** {overall_health_pct}%
**Trend:** {improved/declined/unchanged} ({delta}% since {baseline_date}) | "N/A (no baseline)"

### Category Breakdown

| Category | Health | Findings | Critical | High | Medium | Low |
|----------|--------|----------|----------|------|--------|-----|
| Commands | {pct}% | {n} | {n} | {n} | {n} | {n} |
| Workflows | {pct}% | {n} | {n} | {n} | {n} | {n} |
| Agents | {pct}% | {n} | {n} | {n} | {n} | {n} |
| Templates | {pct}% | {n} | {n} | {n} | {n} | {n} |
| References | {pct}% | {n} | {n} | {n} | {n} | {n} |
| **Overall** | **{overall_health_pct}%** | | | | | |

### Quick Health Check

- Tool availability: {N}/{M} referenced tools accessible
- Reference currency: {N}/{M} reference files exist and have content
- Skill quality: {average score_pct across categories}%

## Delta from Baseline

{If .planning/audit-baseline.json exists: compute and show delta}
- `overall_delta = current overall_health_pct - baseline.scores.overall_health_pct`
- `finding_count_delta = current_finding_count - baseline.finding_count`
- Display format: `+3.2% from baseline (2026-03-17)` or `-1.5% from baseline (2026-03-17)`

{If no baseline: "Delta: N/A (no baseline — run with --save-baseline to establish one)"}

## Findings

### CRITICAL

{list each finding with artifact, rule, description, suggestion}

### HIGH

{...}

### MEDIUM

{...}

### LOW

{...}

## Missing References

Skills that reference files which do not exist. These are candidates for creation via /pde:improve create.

{If missing_references[] is non-empty:}

| Skill | Missing Reference | Impact |
|-------|-------------------|--------|
| {skill_path} | {missing_ref_path} | {why it matters} |

{If missing_references[] is empty: "All referenced files exist. No missing references detected."}

## Agent Prompt Quality (AUDIT-12)

{extract agent-related findings from findings[] where category is "agents"}
```

## 3. Baseline Handling

If `--save-baseline` flag is set:
- Write `.planning/audit-baseline.json` with the scores object from the auditor, plus timestamp and finding_count:

```json
{
  "timestamp": "{ISO8601}",
  "version": 1,
  "finding_count": {n},
  "scores": {scores object from auditor}
}
```

The `scores` object from the auditor has this exact structure:
```json
{
  "commands": { "total": {n}, "critical": {n}, "high": {n}, "score_pct": {n} },
  "workflows": { "total": {n}, "critical": {n}, "high": {n}, "score_pct": {n} },
  "agents": { "total": {n}, "critical": {n}, "high": {n}, "score_pct": {n} },
  "templates": { "total": {n}, "critical": {n}, "high": {n}, "score_pct": {n} },
  "references": { "total": {n}, "critical": {n}, "high": {n}, "score_pct": {n} },
  "overall_health_pct": {n}
}
```

If `.planning/audit-baseline.json` exists (regardless of flag):
- Load the baseline
- Compute delta: overall_delta = current overall_health_pct - baseline overall_health_pct
- Include delta in the audit report's "Delta from Baseline" section in the format: `+N.N% from baseline (YYYY-MM-DD)` or `-N.N% from baseline (YYYY-MM-DD)`

## 4. Improvement Loop (only if --fix flag)

If FIX_MODE is false: skip to Step 5.

Filter findings by severity:
- Default: include CRITICAL and HIGH only
- If DEEP_MODE is true: include CRITICAL, HIGH, MEDIUM, and LOW

Group filtered findings by artifact file path. For each artifact group, process sequentially (up to 10 artifact groups max per run — stop after 10 to prevent context exhaustion):

### 4a. Spawn Improver

For each artifact group, spawn one improver Task (sequential — wait for return):

```
Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-skill-improver.md for instructions.

<findings>
{JSON array of findings for this artifact}
</findings>

<original_artifact_path>{artifact_path}</original_artifact_path>
<staging_path>.planning/improvements/</staging_path>
<protected_files_path>${CLAUDE_PLUGIN_ROOT}/protected-files.json</protected_files_path>",
  model="{IMPROVER_MODEL}"
)
```

Parse the improver's return JSON. Record: status, proposal_path, artifact, finding_count, protected_target.

### 4b. Spawn Validator

For each proposal produced by the improver, spawn one validator Task (sequential — wait for return):

```
Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-skill-validator.md for instructions.

<proposal_path>{proposal_path}</proposal_path>
<original_artifact_path>{artifact_path}</original_artifact_path>",
  model="{VALIDATOR_MODEL}"
)
```

Parse the validator's return JSON. Record: status, recommendation, checks, issues.

### 4c. Handle Validation Result

Track cycle count per artifact (starts at 1). Max 3 total cycles per artifact.

**If `status: "PASS"` and `recommendation: "apply"`:**
- Read `.planning/improvements/{proposal}` to get the "Proposed Section"
- Check if the target artifact path is listed in protected-files.json `protected[]` array OR starts with any path in `protected_directories[]`
- If protected: log `SKIPPED (protected file): {artifact} ({rule})` — do NOT apply
- If protected_target was flagged by improver (protected_target: true): log `SKIPPED (protected file): {artifact} ({rule})` — do NOT apply
- If not protected: apply the proposed change to the original artifact file using Edit tool — replace the "Original Section" content with the "Proposed Section" content
- Log: `APPLIED: {artifact} ({rule})`

**If `status: "FAIL"` and `recommendation: "revise"`:**
- If cycle count < 3: re-spawn improver with validator's issues as additional context in the prompt, increment cycle count, re-validate (go back to 4a)
- If cycle count reaches 3 (3rd FAIL): log `NEEDS HUMAN REVIEW: {artifact} ({rule})` and move to next artifact

**If `recommendation: "reject"`:**
- Log `REJECTED: {artifact} ({rule}) — {reason from issues[0]}` and move to next artifact

### 4d. Update Audit Report

After processing all artifacts, append an "## Improvements Applied" section to `.planning/audit-report.md` listing:
- Applied changes: `- APPLIED: {artifact} ({rule})`
- Skipped (protected): `- SKIPPED (protected): {artifact} ({rule})`
- Rejected: `- REJECTED: {artifact} ({rule}) — {reason}`
- Human review needed: `- NEEDS HUMAN REVIEW: {artifact} ({rule})`

## 5. Display Summary

Print to stdout:

```
PDE Audit Complete
  Findings: {total} ({critical} critical, {high} high, {medium} medium, {low} low)
  Health:   {overall_pct}%
  Delta:    {+/-N.N}% from baseline ({baseline_date}) | "no baseline"
  Applied:  {N} improvements | "audit-only mode (use --fix to apply)"
  Report:   .planning/audit-report.md
```

</process>

<success_criteria>
- [ ] Arguments parsed for all four flags (--fix, --deep, --save-baseline, --category)
- [ ] Model resolved via pde-tools.cjs for all three agents
- [ ] .planning/improvements/ directory created before auditor spawn
- [ ] Auditor spawned as sequential Task() — workflow drives the loop
- [ ] Findings JSON parsed: findings[], summary{}, scores{}, missing_references[]
- [ ] audit-report.md written with all sections
- [ ] Baseline loaded and delta computed if audit-baseline.json exists
- [ ] audit-baseline.json written if --save-baseline flag is set
- [ ] Improvement loop executes only when --fix is set
- [ ] Findings filtered by severity (CRITICAL/HIGH only unless --deep)
- [ ] Findings grouped by artifact — one improver Task per artifact group
- [ ] Improver spawned as sequential Task() per artifact
- [ ] Validator spawned as sequential Task() per proposal
- [ ] Validation PASS + apply: protected-files guard checked before writing
- [ ] Validation FAIL + revise: retry loop with 3-cycle cap per artifact
- [ ] 10 artifact limit per run enforced
- [ ] Improvements Applied section appended to audit-report.md
- [ ] Summary printed to stdout with all five fields
</success_criteria>
