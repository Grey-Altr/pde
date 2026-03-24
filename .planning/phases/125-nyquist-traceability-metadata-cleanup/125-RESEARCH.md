# Phase 125: Nyquist Traceability & Metadata Cleanup — Research

**Researched:** 2026-03-24
**Domain:** Internal PDE Nyquist system — metadata cleanup, test traceability, workflow refactoring
**Confidence:** HIGH

## Summary

Phase 125 closes the 8 tech debt items identified by the v0.15 milestone audit. All 25 v0.15 requirements are functionally implemented and 572 tests pass. The gap is entirely in metadata artifacts (VALIDATION.md promotion, SUMMARY.md frontmatter) and one architectural cleanup (isStitchSource production consumer).

**Key discovery:** The two "missing" Nyquist describe blocks (DIV-05 and STH-02) already exist in the test files. Phase 124 created `describe('DIV-05: /pde:check-divergence command exists', ...)` in `tests/phase-124/test-integration-nyquist.cjs`. Phase 119 created `describe('STH-02: Antigravity Stitch detection via manifest metadata', ...)` in `tests/phase-119/test-antigravity-stitch.cjs`. REQUIREMENTS.md just needs the checkboxes updated — no new test code needed for traceability.

The remaining work is: (1) wire `isStitchSource()` as production consumer in `workflows/handoff.md` (replacing inline `=== "stitch"` comparison on line 245), (2) promote all 7 VALIDATION.md files from draft to compliant, (3) populate `requirements_completed` in 12 of 14 SUMMARY.md files, and (4) mark DIV-05 and STH-02 as complete in REQUIREMENTS.md.

**Primary recommendation:** Execute as a pure metadata/doc phase. No new test files needed. No test logic changes needed. Target: all 7 VALIDATION.md files promoted, all 14 SUMMARY.md files with requirements_completed, REQUIREMENTS.md fully checked, handoff.md calling isStitchSource() instead of inline comparison.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DIV-05 | /pde:check-divergence command triggers detection on demand | describe('DIV-05:...') block already exists in test-integration-nyquist.cjs; REQUIREMENTS.md checkbox needs update |
| STH-02 | Antigravity-originated Stitch projects detected via manifest metadata (source: "antigravity-stitch") | describe('STH-02:...') block exists in test-antigravity-stitch.cjs; isStitchSource() exported but not called from handoff.md workflow |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:test | built-in (Node 20) | Test framework for any new assertions | All v0.15 test files use node:test CJS pattern |
| node:fs | built-in | File reads for VALIDATION.md updates | No external deps at plugin root |

### No New Dependencies
This phase adds no new dependencies. All work is editing existing markdown files and one workflow file.

**Verification:** `node --version` → v20.20.0 (confirmed)

---

## Architecture Patterns

### Compliant VALIDATION.md Pattern

Compare draft vs compliant using Phase 94 as the reference:

**Draft (current state of all 7 v0.15 VALIDATION.md files):**
```yaml
---
phase: 118
slug: context-sync-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---
```
All sign-off checkboxes unchecked `[ ]`, Approval: pending, Per-Task map shows `❌ W0` and `⬜ pending`.

**Compliant (target — modeled on Phase 94):**
```yaml
---
phase: 118
slug: context-sync-core
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-23
completed: 2026-03-24
---
```
All sign-off checkboxes `[x]`, Approval: APPROVED, Per-Task map shows `yes` for File Exists and `GREEN` for Status.

### SUMMARY.md requirements_completed Pattern

The one existing populated example (118-01-SUMMARY.md) uses hyphen-separated YAML key with inline bracket array:
```yaml
requirements-completed: [CTX-01, CTX-02, CTX-03, CTX-04, CTX-08]
```

Note: The field name uses a hyphen (`requirements-completed`), NOT underscore. The audit uses "requirements_completed" (underscore) but the actual YAML uses hyphens. Use hyphens to match the existing populated files (118-01, 118-02, 122-01).

### Requirements-to-Phase Mapping

From REQUIREMENTS.md traceability table + phase execution records:

| Phase | Plans | Requirements Completed |
|-------|-------|----------------------|
| 118-context-sync-core | 01, 02 | CTX-01, CTX-02, CTX-03, CTX-04, CTX-08 |
| 119-antigravity-context-+-stitch-bridge | 01, 02 | CTX-05, STH-01, STH-02, STH-03 |
| 120-artifact-formatting | 01, 02 | FMT-01, FMT-02, FMT-03 |
| 121-mcp-server | 01, 02 | MCP-01, MCP-02, MCP-03, MCP-04, MCP-05 |
| 122-divergence-detection | 01, 02 | DIV-01, DIV-02, DIV-03, DIV-04, DIV-05, DIV-06 |
| 123-context-sync-engine | 01, 02 | CTX-06, CTX-07 |
| 124-integration-and-nyquist | 01, 02 | MCP-03 (structural gate), INTG-01 |

Note: 122-01-SUMMARY.md already has `requirements-completed: [DIV-01, DIV-02, DIV-03, DIV-04, DIV-06]` — missing DIV-05 (since it was pending). After Phase 125 closes DIV-05, 122-01-SUMMARY.md should be updated to include DIV-05.

### handoff.md isStitchSource() Refactor

**Location of inline comparison:**
- File: `workflows/handoff.md`
- Line 245: `- If \`manifest.artifacts[code].source === "stitch"\`: add code to STITCH_CANDIDATES`

**What needs changing:** The workflow currently uses inline string comparison `=== "stitch"` but `isStitchSource()` also accepts `"antigravity-stitch"`. The production consumer refactor means:
1. The workflow should call `isStitchSource(manifest.artifacts[code].source)` instead of `=== "stitch"` (inline comparison)
2. The workflow uses inline ESM (`node --input-type=module`) pattern from check-divergence.md to require CJS modules

**isStitchSource implementation** (from `bin/lib/context-sync.cjs` line 286):
```javascript
function isStitchSource(source) {
  return source === 'stitch' || source === 'antigravity-stitch';
}
```

The workflow is a markdown instruction document, not executable code. The "refactor" means updating the natural language instruction to say "call isStitchSource()" instead of checking `=== "stitch"` directly. This also needs a bash block in the workflow that loads context-sync.cjs and calls isStitchSource.

### VALIDATION.md Per-Task Status Updates

For each phase, the Per-Task Verification Map needs these updates:
- `❌ W0` → `yes` (file exists confirmed)
- `⬜ pending` → `✅ green` (tests pass confirmed)

The Wave 0 Requirements section needs checkbox items updated from `[ ]` to `[x]`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Determining which requirements a plan completed | A new tracking system | The existing requirements-completed YAML field | Pattern established in 118-01, 118-02, 122-01 |
| Verifying tests pass | A new test runner | `node --test tests/phase-XXX/*.cjs` | Existing node:test infrastructure |
| Nyquist compliance criteria | New rules | The Phase 94 VALIDATION.md pattern | Concrete reference exists |

**Key insight:** All patterns already exist in the codebase. Phase 125 is application of existing patterns to 7+14 files, not invention of new ones.

---

## Complete File Inventory

### 7 VALIDATION.md Files to Promote

All files are at `.planning/milestones/v0.15-phases/`:

1. `118-context-sync-core/118-VALIDATION.md`
   - Test file: `tests/phase-118/test-context-sync.cjs` (31 tests, 6 suites)
   - Quick run: `node --test tests/phase-118/test-context-sync.cjs`
   - Requirements: CTX-01, CTX-02, CTX-03, CTX-04, CTX-08

2. `119-antigravity-context-+-stitch-bridge/119-VALIDATION.md`
   - Test file: `tests/phase-119/test-antigravity-stitch.cjs` (32 tests)
   - Quick run: `node --test tests/phase-119/test-antigravity-stitch.cjs`
   - Requirements: CTX-05, STH-01, STH-02, STH-03

3. `120-artifact-formatting/120-VALIDATION.md`
   - Test file: `tests/phase-120/test-artifact-format.cjs` (41 tests)
   - Quick run: `node --test tests/phase-120/test-artifact-format.cjs`
   - Requirements: FMT-01, FMT-02, FMT-03

4. `121-mcp-server/121-VALIDATION.md`
   - Test file: `tests/phase-121/test-mcp-server.cjs` (27 tests)
   - Quick run: `node --test tests/phase-121/test-mcp-server.cjs`
   - Requirements: MCP-01, MCP-02, MCP-03, MCP-04, MCP-05

5. `122-divergence-detection/122-VALIDATION.md`
   - Test file: `tests/phase-122/test-divergence.cjs` (38 tests)
   - Quick run: `node --test tests/phase-122/test-divergence.cjs`
   - Requirements: DIV-01, DIV-02, DIV-03, DIV-04, DIV-05, DIV-06

6. `123-context-sync-engine/123-VALIDATION.md`
   - Test files: `tests/phase-123/test-context-sync-hook.cjs` (7 tests), `tests/phase-123/test-editor-sync-command.cjs` (9 tests)
   - Quick run: `node --test tests/phase-123/test-context-sync-hook.cjs tests/phase-123/test-editor-sync-command.cjs`
   - Requirements: CTX-06, CTX-07

7. `124-integration-and-nyquist/124-VALIDATION.md`
   - Test file: `tests/phase-124/test-integration-nyquist.cjs` (8 tests)
   - Quick run: `node --test tests/phase-124/test-integration-nyquist.cjs`
   - Requirements: MCP-03 (structural gate), INTG-01

### 14 SUMMARY.md Files to Update

Already have `requirements-completed`:
- `118-context-sync-core/118-01-SUMMARY.md` — [CTX-01, CTX-02, CTX-03, CTX-04, CTX-08] ✓
- `118-context-sync-core/118-02-SUMMARY.md` — [CTX-01, CTX-02, CTX-03, CTX-04, CTX-08] ✓
- `122-divergence-detection/122-01-SUMMARY.md` — [DIV-01, DIV-02, DIV-03, DIV-04, DIV-06] ✓ (needs DIV-05 added after checkbox update)

Need `requirements-completed` added:
1. `119-antigravity-context-+-stitch-bridge/119-01-SUMMARY.md` → [CTX-05, STH-01, STH-02, STH-03]
2. `119-antigravity-context-+-stitch-bridge/119-02-SUMMARY.md` → [CTX-05, STH-01, STH-02, STH-03] (verification plan — same reqs)
3. `120-artifact-formatting/120-01-SUMMARY.md` → [FMT-01, FMT-02, FMT-03]
4. `120-artifact-formatting/120-02-SUMMARY.md` → [FMT-01, FMT-02, FMT-03]
5. `121-mcp-server/121-01-SUMMARY.md` → [MCP-01, MCP-02, MCP-03, MCP-04, MCP-05]
6. `121-mcp-server/121-02-SUMMARY.md` → [MCP-03] (build pipeline plan — closes MCP-03 dist)
7. `122-divergence-detection/122-02-SUMMARY.md` → [DIV-05] (command wiring plan)
8. `123-context-sync-engine/123-01-SUMMARY.md` → [CTX-06]
9. `123-context-sync-engine/123-02-SUMMARY.md` → [CTX-07]
10. `124-integration-and-nyquist/124-01-SUMMARY.md` → [MCP-03, INTG-01]
11. `124-integration-and-nyquist/124-02-SUMMARY.md` → [] (regression sweep — no new reqs closed; can use empty list or omit)

Total: 11 new additions + 1 update (122-01 needs DIV-05 added) = 12 files modified.

Note on 124-02: This was a verification-only plan (no files modified). It makes sense to add `requirements-completed: []` or omit the field — the audit said "12 of 14 missing" counting from when only 118-01 had it (118-02 and 122-01 added it later). The planner should add `requirements-completed: []` for 124-02.

---

## Common Pitfalls

### Pitfall 1: YAML Field Name Inconsistency
**What goes wrong:** Using `requirements_completed` (underscore) instead of `requirements-completed` (hyphen)
**Why it happens:** The audit report uses underscore notation, but the actual YAML in populated files uses hyphens
**How to avoid:** Always match the existing populated files: `requirements-completed: [REQ-01, REQ-02]`
**Warning signs:** `requirements_completed` appearing in a new file — grep for it and fix

### Pitfall 2: VALIDATION.md Missing completed Field
**What goes wrong:** Adding `nyquist_compliant: true` but forgetting to add `completed: YYYY-MM-DD` and changing `status: draft` to `status: complete`
**Why it happens:** Phase 94 reference has 3 frontmatter changes from draft
**How to avoid:** When promoting, change ALL THREE: status, nyquist_compliant, wave_0_complete — and ADD completed date
**Warning signs:** Status still shows `draft` after promotion

### Pitfall 3: Partial Per-Task Map Updates
**What goes wrong:** Updating frontmatter but leaving Per-Task Verification Map with `❌ W0` and `⬜ pending`
**Why it happens:** The map is in the body, not the frontmatter — easy to forget
**How to avoid:** The sign-off checklist includes `[x] Wave 0 covers all MISSING references` — updating the map IS part of promotion
**Warning signs:** `nyquist_compliant: true` but map still shows pending

### Pitfall 4: 123-VALIDATION.md Wrong Test File Name
**What goes wrong:** The 123-VALIDATION.md draft references `test-context-sync-engine.cjs` but the actual test files are `test-context-sync-hook.cjs` and `test-editor-sync-command.cjs`
**Why it happens:** VALIDATION.md was created as a draft before the actual test files were named
**How to avoid:** When promoting 123-VALIDATION.md, verify the quick run command matches actual file names
**Warning signs:** `test-context-sync-engine.cjs` in the VALIDATION.md — file does not exist

### Pitfall 5: handoff.md Is a Large File
**What goes wrong:** Making edits to handoff.md without reading the surrounding context
**Why it happens:** The file is 27,494 tokens — easy to introduce formatting errors
**How to avoid:** Use the Edit tool with precise offsets; verify the change does not break workflow step numbering
**Warning signs:** Step numbering breaks after line 245 edit

### Pitfall 6: requirements-completed on Verification Plans
**What goes wrong:** Populating requirements for verification-only plans (e.g., 119-02, 122-02) with the same requirements as the implementation plan
**Why it happens:** 119-02 verified 119-01's requirements — it didn't implement new ones
**How to avoid:** Implementation plans get the full requirement list; verification plans get the same list (they verified those requirements) or empty `[]`
**Recommendation:** Both 119-01 and 119-02 list [CTX-05, STH-01, STH-02, STH-03] since 119-02 verified all of them

---

## Code Examples

### VALIDATION.md Promoted Frontmatter (modeled on Phase 94)
```yaml
---
phase: 118
slug: context-sync-core
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-23
completed: 2026-03-24
---
```

### VALIDATION.md Sign-Off Block (promoted)
```markdown
## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** APPROVED
```

### VALIDATION.md Per-Task Map (promoted — Phase 118 example)
```markdown
| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 118-01-01 | 01 | 1 | CTX-01 | structural | `node --test tests/phase-118/test-context-sync.cjs` | yes | ✅ green |
| 118-01-02 | 01 | 1 | CTX-02 | structural | `node --test tests/phase-118/test-context-sync.cjs` | yes | ✅ green |
| 118-01-03 | 01 | 1 | CTX-03 | structural | `node --test tests/phase-118/test-context-sync.cjs` | yes | ✅ green |
| 118-01-04 | 01 | 1 | CTX-04 | structural | `node --test tests/phase-118/test-context-sync.cjs` | yes | ✅ green |
| 118-01-05 | 01 | 1 | CTX-08 | structural | `node --test tests/phase-118/test-context-sync.cjs` | yes | ✅ green |
```

### SUMMARY.md requirements-completed Field (correct YAML key)
```yaml
requirements-completed: [CTX-05, STH-01, STH-02, STH-03]
```

### REQUIREMENTS.md Checkbox Promotion
```markdown
- [x] **STH-02**: Antigravity-originated Stitch projects detected via manifest metadata (source: "antigravity-stitch") — Nyquist describe block + production consumer needed
```
Change `[ ]` to `[x]` for both STH-02 and DIV-05.

Also update Traceability table status from `Pending` to `Complete` for STH-02 (Phase 125) and DIV-05 (Phase 125).

### handoff.md isStitchSource Refactor

**Before (line 245 in workflows/handoff.md):**
```
- If `manifest.artifacts[code].source === "stitch"`: add code to STITCH_CANDIDATES
```

**After:**
```
- If `isStitchSource(manifest.artifacts[code].source)` is true: add code to STITCH_CANDIDATES
```

The workflow also needs a note that `isStitchSource` is imported from `context-sync.cjs` via createRequire pattern. Check Step 2l context in handoff.md (around line 240) for where to add the import. The workflow is a markdown instruction document — the "call" means updating the prose instruction, plus adding a bash block that loads isStitchSource from context-sync.cjs.

Alternatively, since handoff.md is a workflow document (not executable code), the refactor may be as simple as: change the instruction text from `=== "stitch"` to `isStitchSource(source)` to match the function name, AND ensure the function is actually invoked in any bash blocks in that step. Look at Step 2l more carefully before editing.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, v20) |
| Config file | none — direct file invocation |
| Quick run command | `node --test tests/phase-{118,119,120,121,122,123,124}/*.cjs` |
| Full suite command | `for f in tests/phase-{118..124}/*.cjs; do node --test "$f"; done` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIV-05 | /pde:check-divergence command exists with correct wiring | structural | `node --test tests/phase-124/test-integration-nyquist.cjs` | ✅ exists |
| STH-02 | isStitchSource() returns true for "stitch"/"antigravity-stitch" | unit | `node --test tests/phase-119/test-antigravity-stitch.cjs` | ✅ exists |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-{118,119,120,121,122,123,124}/*.cjs`
- **Phase gate:** All 572 tests green before closing

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. No new test files needed.

---

## State of the Art

| Old State | Current State | Changed | Impact |
|-----------|---------------|---------|--------|
| describe('STH-02:...') missing | describe('STH-02:...') exists in test-antigravity-stitch.cjs (line 152) | Phase 119 execution | Only REQUIREMENTS.md checkbox needs update |
| describe('DIV-05:...') missing | describe('DIV-05:...') exists in test-integration-nyquist.cjs (line 47) | Phase 124 execution | Only REQUIREMENTS.md checkbox needs update |
| All 7 VALIDATION.md: draft | Need promotion to compliant | Phase 125 scope | Pure metadata edits |
| 12 SUMMARY.md missing requirements-completed | Need field added | Phase 125 scope | YAML frontmatter additions |

**Key divergence from objective statement:** The objective says "Adding Nyquist test blocks for DIV-05 and STH-02" but these blocks already exist. Phase 125 needs to VERIFY they satisfy the requirement and update REQUIREMENTS.md — not add new test code.

---

## Open Questions

1. **handoff.md Step 2l — bash block vs prose**
   - What we know: Line 245 uses inline prose `=== "stitch"` — no bash block at this step
   - What's unclear: Is the production consumer requirement satisfied by updating prose OR does it require adding an actual createRequire bash block?
   - Recommendation: The audit says "isStitchSource() exported but no production consumer (handoff.md uses inline comparison)". The fix is to change the workflow instruction to reference `isStitchSource()`. If Step 2l has no bash block (it's all prose), then adding a small bash block to run the check via context-sync.cjs createRequire satisfies the requirement more thoroughly. Read lines 230-270 of handoff.md before writing the plan.

2. **122-01-SUMMARY.md: Add DIV-05 or leave as-is**
   - What we know: It has `requirements-completed: [DIV-01, DIV-02, DIV-03, DIV-04, DIV-06]` — missing DIV-05
   - What's unclear: Plan 122-01 implemented the detection engine (DIV-01 through DIV-06 module), not the command. DIV-05 is technically Plan 122-02's work.
   - Recommendation: Leave 122-01 as-is (its requirements list is accurate). Add `requirements-completed: [DIV-05]` to 122-02-SUMMARY.md.

3. **124-02-SUMMARY.md: Requirements or empty**
   - What we know: Plan 124-02 was a verification-only plan (no files modified)
   - Recommendation: Add `requirements-completed: []` to be explicit, or omit. Either is fine; the audit counts this as "missing the field" so add `requirements-completed: []`.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this is a pure doc/markdown editing phase with node --test verification only)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all VALIDATION.md files read directly
- Direct codebase inspection — all SUMMARY.md files read directly
- `.planning/v0.15-MILESTONE-AUDIT.md` — authoritative gap list
- `tests/phase-119/test-antigravity-stitch.cjs` — STH-02 describe block confirmed at line 152
- `tests/phase-124/test-integration-nyquist.cjs` — DIV-05 describe block confirmed at line 47
- `bin/lib/context-sync.cjs` lines 283-288 — isStitchSource implementation
- `workflows/handoff.md` line 245 — inline comparison to refactor
- `.planning/milestones/v0.12-phases/94-nyquist-regression-tests/94-VALIDATION.md` — compliant reference

### Secondary (MEDIUM confidence)
- State.md Phase 119 decision: "isStitchSource uses exact equality per STH-02" — confirms implementation intent

---

## Metadata

**Confidence breakdown:**
- File inventory (7 VALIDATION.md, 14 SUMMARY.md paths): HIGH — all confirmed by direct read
- VALIDATION.md promotion criteria: HIGH — Phase 94 reference verified
- SUMMARY.md frontmatter schema: HIGH — 3 existing populated files confirm pattern
- isStitchSource location and handoff.md inline comparison: HIGH — confirmed by grep + file read
- STH-02 / DIV-05 describe blocks already exist: HIGH — confirmed by grep on test files
- requirements-to-phase mapping: HIGH — confirmed by REQUIREMENTS.md traceability table + SUMMARY.md reads

**Research date:** 2026-03-24
**Valid until:** Indefinitely (internal codebase, no external dependencies)
