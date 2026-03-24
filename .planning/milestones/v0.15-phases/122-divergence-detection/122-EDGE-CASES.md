---
phase: 122-divergence-detection
generated: "2026-03-23T00:00:00Z"
finding_count: 4
high_count: 2
has_bdd_candidates: true
---

# Phase 122: Edge Cases

**Generated:** 2026-03-23
**Findings:** 4 (cap: 8)
**HIGH severity:** 2
**BDD candidates:** yes

## Findings

### 1. [HIGH] runDivergenceCheck missing error handling when handoff dir exists but all files are unreadable

**Plan element:** `bin/lib/divergence.cjs`
**Category:** error_path

The plan specifies returning `{ components: [], noSpecs: true }` when no handoff specs exist, but does not specify behavior when the `.planning/design/handoff/` directory exists with files that throw read errors (e.g., permission denied). The `loadHandoffSpecs` function could silently return zero specs rather than surfacing the error.

**BDD Acceptance Criteria Candidate:**
```
Given a handoff directory exists with unreadable spec files (permission denied)
When runDivergenceCheck is called
Then either return a structured error or log a warning and proceed with partial results rather than silently returning noSpecs: true
```

### 2. [HIGH] extractPropsFromFile prop regex captures comment-prefixed identifiers

**Plan element:** `extractPropsFromFile` in `bin/lib/divergence.cjs`
**Category:** error_path

The prop extraction regex `/^\s*(\w+)\??\s*:/gm` can match JSDoc comment fragments like `* @param name:` or `// deprecated:` inside the interface body. The RESEARCH.md regex guard `\/?\*?[^/]*\n?` is noted as experimental (confidence: MEDIUM). Captured false prop names cause DRIFTED status when the component is actually ALIGNED.

**BDD Acceptance Criteria Candidate:**
```
Given a component interface body containing JSDoc comment lines starting with * or //
When extractPropsFromFile is called on that file content
Then only actual TypeScript property names are returned (no comment-derived identifiers)
```

### 3. [MEDIUM] findComponentFile has no depth limit for deeply nested monorepo structures

**Plan element:** `findComponentFile` in `bin/lib/divergence.cjs`
**Category:** boundary_condition

The recursive `readdirSync` walk from `projectRoot` skips `node_modules` and dotdirs but has no maximum depth cap. In monorepos with 10+ nesting levels and thousands of files, this walk could be extremely slow or hit Node.js call stack limits, blocking the user-facing command.

### 4. [LOW] buildDivergenceReport does not specify behavior for components with null props and empty tokens

**Plan element:** `buildDivergenceReport` in `bin/lib/divergence.cjs`
**Category:** empty_state

When a component has `props: null` (no `@props:` annotation) and `tokens: []` (no `@tokens:` annotation), T2 and T3 cannot run. The plan does not specify whether the table row should show `--` or `N/A` for those columns, which could produce inconsistent output.

