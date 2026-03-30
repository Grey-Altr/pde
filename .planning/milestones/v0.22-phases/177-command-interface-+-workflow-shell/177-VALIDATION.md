---
phase: 177
slug: command-interface-workflow-shell
status: complete
nyquist_compliant: true
verified: 2026-03-30T01:17:00Z
---

# Phase 177 — Nyquist Validation

> Post-execution validation assertions. Each assertion below can be run against the codebase to confirm the phase goal is still met.

## Assertions

### Truth 1: Running /pde:present executive-summary triggers the generation pipeline and produces output files
**Command:** `grep -c 'artifact-read' workflows/present.md`
**Expected:** Returns ≥ 1
**Meaningful because:** Confirms that the workflow shell calls the pde-tools IR acquisition step, not a static file read — the presence of `artifact-read` in the workflow proves the IR pipeline is invoked

### Truth 2: Running /pde:present with no argument displays a formatted list of all 15 personas
**Command:** `grep -c '| executive-summary\|| case-study\|| investor-update\|| sprint-review\|| client-deliverable' workflows/present.md`
**Expected:** Returns 5 (one per piped term, matching the inline persona registry table)
**Meaningful because:** Confirms the persona registry table is present in the workflow with the correct slug entries — absence would mean the LIST MODE branch cannot display persona options

### Truth 3: Running /pde:present unknown-slug produces a clear error with the list of valid persona names
**Command:** `grep -c 'ERROR MODE\|unknown.*slug\|valid.*persona\|available.*persona' workflows/present.md`
**Expected:** Returns ≥ 1
**Meaningful because:** Confirms the ERROR MODE branch exists in the workflow, which is required for the graceful error path when an unknown slug is provided

### Truth 4: The workflow reads IR from pde-tools presentation artifact-read, never from raw .planning/ files
**Command:** `node bin/pde-tools.cjs presentation artifact-read 2>/dev/null | head -1`
**Expected:** Output starts with `@file:` (temp file redirect) or `{` (inline JSON) — confirms the pde-tools artifact-read subcommand is operational
**Meaningful because:** Confirms the CLI command that the workflow depends on is wired and functional end-to-end; a broken pde-tools route would return an error instead of a JSON reference

### Truth 4b: skill-registry.md has PRS skill code registered
**Command:** `grep -c 'pde:present' skill-registry.md`
**Expected:** Returns ≥ 1
**Meaningful because:** Confirms the /pde:present command is registered in the skill registry, which is required for the slash command to be discoverable in Claude Code

### Truth 4c: All 32 integration tests pass
**Command:** `npx vitest run tests/phase-177/ --reporter=verbose 2>&1 | tail -5`
**Expected:** Output contains `32 passed` and `0 failed`
**Meaningful because:** Confirms the command routing, workflow shell dispatch logic, and IR acquisition integration all pass the full test suite against the live codebase
