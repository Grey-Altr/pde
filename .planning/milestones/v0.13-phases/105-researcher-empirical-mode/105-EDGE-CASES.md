---
phase: researcher-empirical-mode
generated: "2026-03-23T00:00:00Z"
finding_count: 4
high_count: 2
has_bdd_candidates: true
---

# Phase 105: Edge Cases

**Generated:** 2026-03-23
**Findings:** 4 (cap: 8)
**HIGH severity:** 2
**BDD candidates:** yes

## Findings

### 1. [HIGH] Fallback to desk research when verify command cannot be determined has no documented acceptance signal

**Plan element:** `~/.claude/agents/pde-phase-researcher.md` Step E1 (fallback path)
**Category:** error_path

The plan action for step E1 describes falling back to desk research when no verify command can be found, but the test `researcher-empirical-flag.test.mjs` only checks that the "fallback to desk research" string is present in the file. There is no acceptance criterion that verifies the RESEARCH.md produced during a fallback run is distinguishable from a standard desk research run (i.e., no misleading "Experiments Attempted" header appears when no experiments ran).

**BDD Acceptance Criteria Candidate:**
```
Given the researcher is in empirical mode
When no verify command can be determined from phase context
Then RESEARCH.md does not contain an "Experiments Attempted" section
And a log line containing "falling back to desk research" is present in the output
```

### 2. [HIGH] Cleanup step E7 has no verification it actually ran

**Plan element:** `~/.claude/agents/pde-phase-researcher.md` Step E7 (cleanup)
**Category:** error_path

The plan states "Always run regardless of outcome" and "Verify no experiment branches remain", but neither the `<verify>` block nor the `<acceptance_criteria>` for Task 2 checks that the experiment branch is cleaned up. A crash during E5 could leave a live `experiment/research-105` branch. The `<done>` criteria for Task 2 say nothing about branch cleanup validation.

**BDD Acceptance Criteria Candidate:**
```
Given the researcher empirical mode completes (or crashes) during iterations
When the researcher agent returns its structured result
Then `git branch --list 'experiment/research-*'` returns no matching branches
```

### 3. [MEDIUM] Wave 0 test file names differ between VALIDATION.md and the plan

**Plan element:** `tests/phase-105/researcher-empirical-flag.test.mjs`
**Category:** boundary_condition

VALIDATION.md Wave 0 Requirements list three test file names:
- `researcher-empirical-agent.test.mjs`
- `researcher-empirical-routing.test.mjs`
- `researcher-empirical-output.test.mjs`

But the plan's Task 1 creates:
- `researcher-empirical-flag.test.mjs`
- `empirical-routing.test.mjs`
- `experiments-attempted-section.test.mjs`

These filenames do not match. The VALIDATION.md Wave 0 checklist will remain unchecked for the wrong file names, creating confusion during execution.

### 4. [LOW] Task 2 `<verify>` runs full test glob without `--test-only` scope hint

**Plan element:** Task 2 `<verify>` automated command `node --test tests/phase-105/*.test.mjs`
**Category:** boundary_condition

Task 1 creates tests that are explicitly designed to fail RED initially. Task 2's `<verify>` runs the same glob, so its first run will fail if run before Task 1's tests have had their implementations complete. This is expected behavior for TDD but the `<done>` criteria for Task 2 should explicitly note that ALL three tests must be GREEN (not just that they run). The current `<done>` says "All three structural tests pass GREEN" which is sufficient, but the `<verify>` command has no way to confirm all three pass vs. one passing and two failing.

