---
phase: 99-safety-boundaries
generated: "2026-03-23T00:00:00.000Z"
finding_count: 4
high_count: 1
has_bdd_candidates: true
---

# Phase 99: Edge Cases

**Generated:** 2026-03-23
**Findings:** 4 (cap: 8)
**HIGH severity:** 1
**BDD candidates:** yes

## Findings

### 1. [HIGH] protected-files.json superset check has no explicit validation step

**Plan element:** `protected-files.json`
**Category:** boundary_condition

Plan 01 Task 1's acceptance criteria state "Every entry from current protected-files.json protected array appears in protected_files" but the `<verify>` command for Task 1 checks only a subset (references/quality-standards.md and a few known entries). If a new entry was added to protected-files.json between research time and execution, it could be silently absent from experiment-boundaries.md's protected_files array and the automated verify would still pass. The read_first instruction for Task 1 includes protected-files.json which mitigates this, but a superset assertion is not automated.

**BDD Acceptance Criteria Candidate:**
```
Given protected-files.json has N entries in its protected array
When Task 1 creates references/experiment-boundaries.md
Then the protected_files array in experiment-boundaries.md contains all N entries from protected-files.json
```

### 2. [MEDIUM] Nyquist regression run not included in Plan 02 Task 1 verify

**Plan element:** `workflows/critique.md`
**Category:** error_path

Plan 02 Task 2's acceptance_criteria includes `node --test tests/**/*.test.mjs exits 0` but Task 1 (the first 7 workflows including critique.md) has no Nyquist regression run in its `<verify>` block. The per-task verify only checks marker pairing, not that annotated strings weren't accidentally moved into OPTIMIZABLE regions. A critique.md annotation error (placing "Design 40" inside OPTIMIZABLE) would pass Task 1's verify but fail the Nyquist suite — only caught after Task 2.

### 3. [MEDIUM] No guard against adding markers inside existing HTML comments or code blocks

**Plan element:** `workflows/brief.md`
**Category:** boundary_condition

The annotation action specifies wrapping "entire named sections (## headings)" but workflow files may contain fenced code blocks (```bash) or existing HTML comment structures. Inserting `<!-- LOCKED -->` inside a fenced code block would not be parsed correctly by the experiment runner's string-match approach. The verify command only checks marker count parity, not placement validity.

### 4. [LOW] infrastructure_workflows list in experiment-boundaries.md could omit newly added workflows

**Plan element:** `references/experiment-boundaries.md`
**Category:** boundary_condition

The infrastructure_workflows list in Plan 01 Task 1 action enumerates ~50 workflow files explicitly. If a new infrastructure workflow is added to the project between Phase 99 execution and Phase 102 consumption, it would be absent from the list and potentially treated as experiment-eligible by default. The document's "Default Policy" (unannotated = LOCKED) partially mitigates this for files lacking markers, but the infrastructure_workflows enumeration would be stale.

