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

<step name="report_result">
Display the result to the user based on the final result in READINESS.md:

- If **PASS**: "Readiness gate: PASS — all checks passed. Phase ready to execute."
- If **CONCERNS**: "Readiness gate: CONCERNS — {N} non-blocking issues found. Review READINESS.md before executing." Then display the READINESS.md contents for the user.
- If **FAIL**: "Readiness gate: FAIL — {N} blocking issues found. Fix before executing." Then display the READINESS.md contents for the user.
</step>

</process>
