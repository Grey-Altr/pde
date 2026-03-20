<purpose>
Validate plan readiness before phase execution. Produces READINESS.md with PASS, CONCERNS, or FAIL.
</purpose>

<required_reading>
Read STATE.md and project-context.md (if exists) before any operation.
</required_reading>

<process>

<step name="load_context">
Run init to find phase directory:

```bash
PHASE_ARG="${1:-$ARGUMENTS}"
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" init execute-phase "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse from INIT JSON: `phase_dir`, `phase_number`, `phase_name`, `plan_count`.

If `phase_found` is false: error "Phase not found — provide a valid phase number."
If `plan_count` is 0: error "No plans found in phase directory."
</step>

<step name="run_structural_checks">
Run the Node.js structural and consistency checker:

```bash
RESULT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" readiness check "${PHASE_NUMBER}")
```

Parse JSON result for: `result` (pass/concerns/fail), `file` (READINESS.md path), `checks_run`, `checks_failed`, `plan_count`.

If the command exits with an error, display the error message to the user and stop.
</step>

<step name="run_semantic_checks">
Read each PLAN.md in the phase directory. For each plan, evaluate:

- **C1**: Is the objective specific enough to be verifiable? (not just "improve the codebase")
- **C2**: Do file paths in task `<files>` tags reference real paths or paths being created? (check with ls/glob)
- **C3**: Are plan-level ACs in BDD Given/When/Then format?

Semantic checks are always CONCERNS severity (never FAIL). If any semantic check fails:

1. Read the READINESS.md just written by the structural checker
2. Append a `## Semantic Checks` section with a table of C1/C2/C3 results:

```markdown
## Semantic Checks

| Check | Description | Status | Details |
|-------|-------------|--------|---------|
| C1 | Objective is specific and verifiable | CONCERNS | ... |
```

3. If the structural result was 'pass' but semantic checks found issues, update the frontmatter `result:` to 'concerns' and increment `checks_failed`
4. Re-write the file using the Edit or Write tool
</step>

<step name="run_integration_checks">
Read the phase directory and consume all four verification artifacts (if present), then run Mode B codebase-time verification on @-referenced code files. Append findings to READINESS.md.

**1. Artifact detection:**

```bash
RV_FILE=$(ls "${PHASE_DIR}"/*-RESEARCH-VALIDATION.md 2>/dev/null | head -1)
DG_FILE=$(ls "${PHASE_DIR}"/*-DEPENDENCY-GAPS.md 2>/dev/null | head -1)
EC_FILE=$(ls "${PHASE_DIR}"/*-EDGE-CASES.md 2>/dev/null | head -1)
IC_FILE=$(ls "${PHASE_DIR}"/*-INTEGRATION-CHECK.md 2>/dev/null | head -1)
```

For each file that exists, read it and extract its frontmatter fields. If a file is absent, record "not present" — absent artifacts are normal (e.g., when pde-plan-checker has not run), not errors.

**Extract fields by artifact:**

- RESEARCH-VALIDATION.md (if present): `result`, `contradicted_count`, `unverifiable_count`
- DEPENDENCY-GAPS.md (if present): `result`, `gap_count`
- EDGE-CASES.md (if present): `finding_count`, `high_count`, `has_bdd_candidates`
- INTEGRATION-CHECK.md (if present): `result`, `issues_found`

**2. Read-modify-write to append Verification Artifacts table:**

1. Read the current READINESS.md (written/updated by prior steps)
2. Append the following section:

```markdown
## Verification Artifacts

| Artifact | Result | Key Metric | Notes |
|----------|--------|------------|-------|
| RESEARCH-VALIDATION.md | {result or n/a} | {contradicted_count}/{unverifiable_count} claims | {present or not present} |
| DEPENDENCY-GAPS.md | {result or n/a} | {gap_count} gaps | {present or not present} |
| EDGE-CASES.md | CONCERNS | {finding_count} findings ({high_count} HIGH) | {present or not present} |
| INTEGRATION-CHECK.md | {result or n/a} | {issues_found} issues | {present or not present} |
```

Fill in actual values from frontmatter for present artifacts. For absent artifacts, use `n/a` for result and `0` for counts.

**3. Mode B codebase-time verification:**

Read each PLAN.md in the phase directory. For each plan:
- Extract the `<context>...</context>` block
- Find @-references to code files (.cjs, .js, .mjs, .ts, .tsx, .jsx) that are relative paths
- For each existing code file:
  - Read the file
  - Extract function signatures: grep for `function\s+(\w+)` and `exports\.(\w+)\s*=\s*function`
  - Extract module exports: grep for `exports\.(\w+)` and `export\s+(?:function|const|class)\s+(\w+)`
  - Verify these names appear in the plan tasks (check `<action>` and `<files>` content)
  - Record as PASS if at least one export/function is referenced, CONCERNS if none are

Append to READINESS.md:

```markdown
## Mode B: Codebase-Time Verification

| File | Check | Status | Notes |
|------|-------|--------|-------|
| @{path} | function_signature | PASS/CONCERNS | {function} found/not found |
| @{path} | module_export | PASS/CONCERNS | {export} verified/missing |
```

If no code files in @-references, append: "No code file @-references found — Mode B checks skipped."

**4. Severity mapping and READINESS.md frontmatter update:**

Apply severity mapping to determine if the overall result needs updating:
- RESEARCH-VALIDATION.md with `result=FAIL` (contradicted_count > 0) → update READINESS.md frontmatter `result:` to `fail`
- DEPENDENCY-GAPS.md with `result=fail` → update to `concerns` (not fail — dependency gaps are actionable, not blocking)
- EDGE-CASES.md present → always CONCERNS (per EDGE-04 decision)
- INTEGRATION-CHECK.md with `issues_found > 0` → update to `concerns`
- Mode B findings with any CONCERNS → update to `concerns`
- **Never downgrade:** if current result is already `fail`, do not change it to `concerns`

Read-modify-write pattern (same as run_semantic_checks):
1. Read current READINESS.md
2. Append the two new sections (Verification Artifacts + Mode B)
3. If overall result needs updating, edit the frontmatter `result:` field
4. Update `checks_failed` count in frontmatter if new failures found
5. Re-write the file using the Edit or Write tool
</step>

<step name="report_result">
Display the result to the user based on the final result in READINESS.md:

- If **PASS**: "Readiness gate: PASS — all checks passed. Phase ready to execute."
- If **CONCERNS**: "Readiness gate: CONCERNS — {N} non-blocking issues found. Review READINESS.md before executing." Then display the READINESS.md contents for the user.
- If **FAIL**: "Readiness gate: FAIL — {N} blocking issues found. Fix before executing." Then display the READINESS.md contents for the user.
</step>

</process>
