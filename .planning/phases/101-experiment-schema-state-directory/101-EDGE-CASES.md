---
phase: 101-experiment-schema-state-directory
generated: "2026-03-23T00:00:00Z"
finding_count: 4
high_count: 2
has_bdd_candidates: true
---

# Phase 101: Edge Cases

**Generated:** 2026-03-23
**Findings:** 4 (cap: 8)
**HIGH severity:** 2
**BDD candidates:** yes

## Findings

### 1. [HIGH] results.jsonl placeholder not created by ensureExperimentDirs

**Plan element:** `bin/lib/experiment-schema.cjs` (`_ensureExperimentDirs`)
**Category:** empty_state

The plan documents that `_ensureExperimentDirs` creates only `.planning/experiments/` parent directory. EXEC-06 and ROADMAP success criterion 2 require that the slug directory "contains" results.jsonl — but the plan explicitly defers per-slug directory creation (including results.jsonl placeholder) to Phase 102. The RESEARCH.md Open Question 2 recommends creating an empty placeholder but the task action does not include this.

**BDD Acceptance Criteria Candidate:**
```
Given ensureExperimentDirs has been called with a slug
When the caller inspects .planning/experiments/{slug}/
Then results.jsonl exists (may be zero bytes, valid as empty JSONL)
```

### 2. [HIGH] EXEC-05 schema not documented in any artifact

**Plan element:** `tests/phase-101/experiment-schema.test.mjs`
**Category:** empty_state

EXEC-05 requires "JSONL results log at .planning/experiments/{slug}/results.jsonl — each row: {id, iteration, ts, commit, metric_value, metric_delta, status, description}". The plan lists EXEC-05 in plan 01's requirements, and the VALIDATION.md maps EXEC-05 to experiment-dirs.test.mjs. However, no task action writes or validates the JSONL row schema contract for Phase 102 consumers. The schema is only documented in REQUIREMENTS.md — not in experiment-schema.cjs, not in templates, not in any verifiable artifact.

**BDD Acceptance Criteria Candidate:**
```
Given the experiment-schema.cjs module is loaded
When a consumer inspects the exported RESULTS_ROW_SCHEMA or JSDoc
Then the schema fields (id, iteration, ts, commit, metric_value, metric_delta, status, description) are machine-readable
```

### 3. [MEDIUM] mutable_files validation against empty array vs undefined

**Plan element:** `parseExperimentFile` in `bin/lib/experiment-schema.cjs`
**Category:** boundary_condition

The behavior spec says `mutable_files` is a required field. The validation check uses `!fm[f] || (Array.isArray(fm[f]) && fm[f].length === 0)`. If a user writes `mutable_files: []` (explicitly empty), this correctly rejects. However, if `extractFrontmatter` returns `mutable_files: ""` (empty string from YAML quirk), the `Array.isArray` check would not match and the error message might be confusing.

### 4. [LOW] patchExperimentConfig does not handle malformed config.json

**Plan element:** `_patchExperimentConfig` in `bin/lib/experiment-schema.cjs`
**Category:** error_path

The action specifies `try { config = JSON.parse(...) } catch { /* create from scratch */ }`. This silently treats any malformed config.json (invalid JSON) identically to a missing file — it overwrites the file with only `experiment_defaults`. This could cause data loss if config.json has hand-edited content that is temporarily invalid.

EDGE-CASES.md: written
