# Phase 22: Nyquist Compliance & Tech Debt Cleanup — Research

**Researched:** 2026-03-15
**Domain:** Planning documentation compliance — VALIDATION.md frontmatter, SUMMARY frontmatter, workflow documentation corrections
**Confidence:** HIGH

---

## Summary

Phase 22 is a pure documentation and metadata cleanup phase. There is no new code to write, no new tests to design, and no runtime behavior to implement. The phase consists of exactly four categories of surgical file edits, each with a known target file, a known before-state, and a known after-state.

The Nyquist compliance issue in phases 16, 17, 18, and 20 is purely a frontmatter flag and sign-off checklist problem. All four phases completed their work correctly — the skills work, the tests exist and pass, the files are in place. What was never done is the final sign-off audit: updating `nyquist_compliant: false` to `true`, `wave_0_complete: false` to `true`, `status: draft` to `status: complete`, and checking off the Validation Sign-Off checklist items.

Phase 17 has an additional wrinkle: its VALIDATION.md test commands reference `.claude/skills/critique.md` and `.claude/commands/critique.md`, but the actual files are `workflows/critique.md` and `commands/critique.md`. These paths must be corrected as part of achieving compliance. Similarly, Phase 16 lists Wave 0 requirements that were delivered as part of Phase 16 execution and now need to be marked `[x]`.

The Phase 13.2 SUMMARY frontmatter gap is a one-field fix: the `requirements_completed` key contains `[]` but should contain `[INFRA-04, BRF-02]`. The handoff.md GAP-01 is a one-line prose fix: Step 2b lists 6 coverage fields but omits `hasHandoff`, making the documentation inconsistent with Step 7c which correctly uses all 7.

**Primary recommendation:** One plan (`22-01-PLAN.md`) with 5 tasks — one per non-compliant VALIDATION.md update (phases 16, 17, 18, 20), one for the metadata/documentation fixes (13.2 SUMMARY + handoff.md Step 2b). All changes are file edits only. No code changes, no test changes, no new files.

---

## User Constraints

No CONTEXT.md exists for this phase. Constraints are derived entirely from the phase definition and the v1.1-MILESTONE-AUDIT.md.

---

## What Each Fix Requires

### Fix 1: Phase 16 VALIDATION.md — nyquist_compliant: true

**File:** `.planning/phases/16-wireframing-pde-wireframe/16-VALIDATION.md`

**Current state (frontmatter):**
```yaml
status: draft
nyquist_compliant: false
wave_0_complete: false
```

**Required state:**
```yaml
status: complete
nyquist_compliant: true
wave_0_complete: true
```

**Wave 0 items to check off:**
Both Wave 0 checklist items reference files that were created during Phase 16 execution:
- `workflows/wireframe.md` — exists, confirmed (commands/wireframe.md has `@workflows/wireframe.md` delegation)
- `commands/wireframe.md` — exists, confirmed (`@workflows/wireframe.md` delegation present)
- No new test file needed (explicitly noted in original VALIDATION.md)
- Manual smoke test procedure — documented in the VALIDATION.md already

Wave 0 items should be changed from `[ ]` to `[x]`.

**Per-task status column** — all rows currently show `⬜ pending`. Because phases 16 was completed and verified (VERIFICATION.md shows 7/7 truths verified), all task status entries should be updated. However, the smoke tests reference runtime artifact files (`login.html`, `index.html`) that only exist after a live skill run — these remain `⬜ pending` as manual-only. The structural/delegation checks that ARE verifiable via file existence can be updated to `✅ green`.

**Sign-off checklist** — all 6 items need `[ ]` changed to `[x]`. The key evidence:
- All tasks have automated verify or Wave 0 — true (smoke + manual)
- Sampling continuity — true (every task has a command)
- Wave 0 covers MISSING references — true (both files now exist)
- No watch-mode flags — true (no `--watch` in any command)
- Feedback latency < 2s — true (node -e calls are near-instant)
- nyquist_compliant: true set — this IS the action being taken

**Approval line:** Change from `pending` to `complete -- 2026-03-15`

**Verification command for this fix:**
```bash
grep 'nyquist_compliant: true' .planning/phases/16-wireframing-pde-wireframe/16-VALIDATION.md
```

---

### Fix 2: Phase 17 VALIDATION.md — nyquist_compliant: true + path corrections

**File:** `.planning/phases/17-design-critique-pde-critique/17-VALIDATION.md`

**Current state (frontmatter):** same as 16 — `draft`, `false`, `false`

**Required state:** `complete`, `true`, `true`

**Critical path correction required:** The VALIDATION.md test commands reference a non-existent directory:

| What the VALIDATION.md says | What exists |
|-----------------------------|-------------|
| `.claude/skills/critique.md` | `workflows/critique.md` |
| `.claude/commands/critique.md` | `commands/critique.md` |

Every automated command and full suite command must be updated to use the correct paths.

**Corrected test infrastructure:**
```
Quick run command: grep -c "severity:" workflows/critique.md
Full suite command: bash -c 'test -f workflows/critique.md && test -f commands/critique.md && echo PASS || echo FAIL'
```

**Corrected per-task verification map:**
```
17-01-01: grep -c "perspectives\|perspective" workflows/critique.md
17-01-02: grep -c "blocked\|Blocked" workflows/critique.md (note: case-insensitive, "BLOCKED" as word not present but concept is)
17-01-03: grep -c "severity" workflows/critique.md
17-01-04: grep -c "What Works" workflows/critique.md
```

**Actual values from current files (HIGH confidence):**
- `grep -c "perspective" workflows/critique.md` → 11 (passes — contains multi-perspective review)
- `grep -c "severity" workflows/critique.md` → 12 (passes)
- `grep -c "What Works" workflows/critique.md` → 7 (passes)
- CRT-02 block behavior: expressed as "Hard-block check (CRT-02)" at line 72, `HALT` instruction present — grep for "Hard-block" or "halt" is the correct check
- `test -f workflows/critique.md` → passes
- `test -f commands/critique.md` → passes

The planner should write updated test commands that use these corrected paths and patterns. The `File Exists` column for all rows should change from `❌ W0` to `✅`.

**Wave 0 items:** Both reference validating skill/template file structure against existing patterns. Since this was done during Phase 17 execution, both should be marked `[x]`.

---

### Fix 3: Phase 18 VALIDATION.md — nyquist_compliant: true

**File:** `.planning/phases/18-critique-driven-iteration-pde-iterate/18-VALIDATION.md`

**Current state (frontmatter):** same — `draft`, `false`, `false`

**Required state:** `complete`, `true`, `true`

**Test command paths:** Phase 18 already references the correct paths (`workflows/iterate.md`, `commands/iterate.md`). No path corrections needed.

**All 4 per-task checks pass against current file:**
```
grep -c "WFR-.*-v" workflows/iterate.md         → 9 (passes, > 0)
grep -c "ITR-changelog" workflows/iterate.md     → 12 (passes, > 0)
grep -c "convergence" workflows/iterate.md       → 4 (passes, > 0)
grep -c "handoff" workflows/iterate.md           → 3 (passes, > 0)
```

**Full suite check:** `bash -c 'test -f workflows/iterate.md && test -f commands/iterate.md && echo PASS || echo FAIL'` → PASS

The `File Exists` column for all 4 rows should change from `❌ W0` to `✅`. Status column should change from `⬜ pending` to `✅ green`.

Wave 0 items reference validating skill file structure — already done. Both should be marked `[x]`.

---

### Fix 4: Phase 20 VALIDATION.md — nyquist_compliant: true

**File:** `.planning/phases/20-pipeline-orchestrator-pde-build/20-VALIDATION.md`

**Current state (frontmatter):** same — `draft`, `false`, `false`

**Required state:** `complete`, `true`, `true`

**The test script already passes 34/34:** Running `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` from the project root produces "ALL TESTS PASSED" (verified in research). This means the Wave 0 gap (the script file itself) was already created and the tests pass.

**Wave 0 item to check:** `test_orc_gaps.sh` exists and is the full test suite. This should be changed from `[ ]` to `[x]`.

**Per-task status column:** Both rows reference `test_orc_gaps.sh`. The `File Exists` column should change from `❌ W0` to `✅`. Status should change from `⬜ pending` to `✅ green`.

**Note for planner:** The VALIDATION.md references task 20-01-02 as testing both ORC-02 and ORC-03, but the current test script also covers ORC-01. This is fine — the planner does not need to change the requirement mapping.

---

### Fix 5: Phase 13.2 SUMMARY frontmatter + handoff.md Step 2b

These two are documentation-only fixes with no test implications.

#### 5a. Phase 13.2 SUMMARY frontmatter

**File:** `.planning/phases/13.2-manifest-top-level-nyquist-cleanup/13.2-01-SUMMARY.md`

**Current value on line 23:**
```yaml
requirements_completed: [INFRA-04, BRF-02]
```

Wait — re-reading the actual file: line 23 reads `requirements_completed: [INFRA-04, BRF-02]`. But the milestone audit says it is empty `[]`. Let me note the discrepancy: the file currently shows the correct value already. The audit was written at a point when this was not yet correct.

**Actual current state (verified by file read):** Line 23 shows `requirements_completed: [INFRA-04, BRF-02]` — this is already correct.

**Audit claim from v1.1-MILESTONE-AUDIT.md:** "SUMMARY frontmatter requirements-completed is empty [] — should list INFRA-04, BRF-02"

**Resolution:** This tech debt item may already be resolved. The planner should verify the current file state before treating this as requiring a change. If it already reads `[INFRA-04, BRF-02]`, the success criterion is already met and this task is a verification-only step.

#### 5b. handoff.md Step 2b coverage field list

**File:** `workflows/handoff.md`

**Current text at line 87:**
```
Parse JSON from COV_RAW. Store all current flag values: `hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasIterate`, `hasHardwareSpec`. If coverage-check fails or returns invalid JSON, default all to `false` and continue.
```

**Missing field:** `hasHandoff` is not listed (6 fields only, missing the 7th).

**Required text (success criterion 3):** Must list all 7 fields — the canonical order from the codebase is:
`hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasHardwareSpec`

**Corrected text:**
```
Parse JSON from COV_RAW. Store all current flag values: `hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasHardwareSpec`. If coverage-check fails or returns invalid JSON, default all to `false` and continue.
```

**Note:** This is a documentation fix only. Step 7c (the actual coverage write) already correctly uses all 7 fields. No functional behavior changes.

**Verification command:**
```bash
grep "hasHandoff" workflows/handoff.md | grep "Step 2b\|COV_RAW\|Store all"
```
Or more precisely: confirm line 87 now lists all 7 fields.

---

## Architecture Patterns

### Nyquist Compliance Sign-Off Pattern

Based on examining compliant phases (12, 13.1, 13.2, 14, 15, 15.1, 19), the complete sign-off pattern for a VALIDATION.md is:

1. **Frontmatter:** `status: complete`, `nyquist_compliant: true`, `wave_0_complete: true`
2. **Per-task map:** All `File Exists` columns updated from `❌ W0` to `✅`, all `Status` columns updated from `⬜ pending` to `✅ green`
3. **Wave 0 checklist:** All items changed from `[ ]` to `[x]`
4. **Validation Sign-Off checklist:** All 6 items changed from `[ ]` to `[x]`
5. **Approval line:** Changed from `pending` to `complete -- {date}`
6. **Optional Validation Audit appendix:** A table at the bottom showing gaps found/resolved (seen in 13.2 — not required but consistent with the pattern)

Reference: `13.2-VALIDATION.md` (complete example with audit appendix) and `12-VALIDATION.md` (clean complete example).

### File Edit Targeting

All edits in this phase are in `.planning/` documentation files or `workflows/handoff.md`. No changes to:
- `bin/` — no code changes
- `commands/` — no command changes
- `templates/` — no template changes
- Any runtime artifact

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Verifying nyquist_compliant was set | Manual grep in PLAN task | `grep 'nyquist_compliant: true' {file}` automated verify in plan |
| Checking all 7 coverage fields in handoff.md | Visual inspection | `grep "hasDesignSystem.*hasFlows.*hasWireframes.*hasCritique.*hasIterate.*hasHandoff.*hasHardwareSpec" workflows/handoff.md` |
| Checking Phase 13.2 requirements_completed | Assuming it's still empty | Read the file first — it may already be correct |

---

## Common Pitfalls

### Pitfall 1: Correcting VALIDATION.md Without Verifying Underlying Artifacts

**What goes wrong:** Setting `wave_0_complete: true` without confirming the Wave 0 artifacts (test scripts, workflow files) exist and work.
**Why it happens:** The sign-off looks like a documentation update but it's actually a compliance assertion.
**How to avoid:** Run each automated command before checking its box. For Phase 20, run `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` and confirm 34/34 pass before marking complete.
**Warning signs:** If any test command fails, the Wave 0 item cannot be marked `[x]`.

### Pitfall 2: Phase 17 Path Mismatch Causing Test Failures

**What goes wrong:** Leaving the `.claude/skills/critique.md` path in Phase 17 VALIDATION.md — those files do not exist and the tests will always fail.
**Why it happens:** The VALIDATION.md was generated from a template that assumed a different project structure.
**How to avoid:** Update all 4 test commands in Phase 17 VALIDATION.md to use `workflows/critique.md` and `commands/critique.md`.
**Warning signs:** `test -f .claude/skills/critique.md` returns false (no such file or directory).

### Pitfall 3: Phase 13.2 Fix Already Landed

**What goes wrong:** Writing a task to "fix" the `requirements_completed` field in 13.2 SUMMARY when it's already correct.
**Why it happens:** The audit was written at a point in time; the file was later corrected as part of that same phase's work.
**How to avoid:** Read the file at plan-time before prescribing a change. Current line 23: `requirements_completed: [INFRA-04, BRF-02]`.
**Warning signs:** Task verification `grep "INFRA-04" 13.2-01-SUMMARY.md` already returns a match before the task runs.

### Pitfall 4: Confusing Wave 0 Completion with Task Status

**What goes wrong:** Marking tasks `✅ green` in the per-task verification map when those tasks refer to runtime smoke tests that require a live skill invocation.
**Why it happens:** All documentation is being "completed" in bulk but some tests are inherently manual-only.
**How to avoid:** Only mark `✅ green` for tests whose automated command can be run right now and produces a passing result. Tests requiring live `/pde:` invocations remain `⬜ pending` (manual-only) or get a manual-only annotation.

### Pitfall 5: Missing the Validation Audit Appendix

**What goes wrong:** Updating the VALIDATION.md sign-off without adding the Validation Audit appendix table seen in compliant phases.
**Why it happens:** The appendix is optional but it makes the sign-off audit-traceable.
**How to avoid:** Add a "Validation Audit {date}" section at the bottom following the Phase 13.2 pattern (gaps found, resolved, escalated).

---

## Code Examples

### Complete Nyquist Sign-Off (frontmatter pattern)

```yaml
---
phase: 16
slug: wireframing-pde-wireframe
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-15
---
```

### Validation Sign-Off Checklist (completed state)

```markdown
## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete -- 2026-03-15
```

### Validation Audit Appendix (pattern from 13.2)

```markdown
## Validation Audit 2026-03-15

| Metric | Count |
|--------|-------|
| Gaps found | N |
| Resolved | N |
| Escalated | 0 |

[One-sentence summary of what was audited and what changed.]
```

### handoff.md Step 2b Corrected Prose

```markdown
Parse JSON from COV_RAW. Store all current flag values: `hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasHardwareSpec`. If coverage-check fails or returns invalid JSON, default all to `false` and continue.
```

### Phase 17 Corrected Test Infrastructure Table

```markdown
| Property | Value |
|----------|-------|
| **Framework** | grep / bash assertions (skill file validation) |
| **Config file** | none — skill files are markdown, validated structurally |
| **Quick run command** | `grep -c "severity:" workflows/critique.md` |
| **Full suite command** | `bash -c 'test -f workflows/critique.md && test -f commands/critique.md && echo PASS || echo FAIL'` |
| **Estimated runtime** | ~2 seconds |
```

### Phase 17 Corrected Per-Task Verification Map

```markdown
| 17-01-01 | 01 | 1 | CRT-01 | structural | `grep -c "perspective" workflows/critique.md` | ✅ | ✅ green |
| 17-01-02 | 01 | 1 | CRT-02 | structural | `grep -c "Hard-block\|HALT" workflows/critique.md` | ✅ | ✅ green |
| 17-01-03 | 01 | 1 | CRT-03 | structural | `grep -c "severity" workflows/critique.md` | ✅ | ✅ green |
| 17-01-04 | 01 | 1 | CRT-03 | structural | `grep -c "What Works" workflows/critique.md` | ✅ | ✅ green |
```

---

## Pre-Flight Verification Commands

The planner can embed these as task verification actions:

```bash
# Phase 16 sign-off verification
grep 'nyquist_compliant: true' .planning/phases/16-wireframing-pde-wireframe/16-VALIDATION.md

# Phase 17 sign-off + path correction verification
grep 'nyquist_compliant: true' .planning/phases/17-design-critique-pde-critique/17-VALIDATION.md
grep 'workflows/critique.md' .planning/phases/17-design-critique-pde-critique/17-VALIDATION.md

# Phase 18 sign-off verification
grep 'nyquist_compliant: true' .planning/phases/18-critique-driven-iteration-pde-iterate/18-VALIDATION.md

# Phase 20 sign-off + full test suite
bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh
grep 'nyquist_compliant: true' .planning/phases/20-pipeline-orchestrator-pde-build/20-VALIDATION.md

# Phase 13.2 requirements_completed verification (may already be correct)
grep 'requirements_completed' .planning/phases/13.2-manifest-top-level-nyquist-cleanup/13.2-01-SUMMARY.md

# handoff.md Step 2b all-7-fields verification
grep 'hasHandoff' workflows/handoff.md | head -5

# Overall Nyquist compliance count
grep -l 'nyquist_compliant: true' .planning/phases/*/??*-VALIDATION.md | wc -l
```

---

## State of the Art

| Old State | Target State | Notes |
|-----------|-------------|-------|
| 8/12 phases Nyquist compliant | 12/12 phases compliant | Phases 16, 17, 18, 20 to be fixed |
| Phase 17 VALIDATION points to `.claude/skills/` | Updated to `workflows/` | Path correction required |
| handoff.md Step 2b lists 6 coverage fields | Lists all 7 fields | `hasHandoff` missing from prose |
| Phase 13.2 SUMMARY `requirements_completed: []` | `[INFRA-04, BRF-02]` | Likely already correct — verify first |

---

## Open Questions

1. **Is Phase 13.2 SUMMARY already correct?**
   - What we know: The file currently reads `requirements_completed: [INFRA-04, BRF-02]` on line 23 (verified by Read tool)
   - What's unclear: The milestone audit records it as `[]` — written at an earlier point in time
   - Recommendation: Planner should read the file at plan time and make the SC-2 task a verification-only task if the value is already correct; if it somehow still reads `[]`, apply the fix.

2. **Should per-task Status cells be updated for runtime smoke tests?**
   - What we know: Phase 16 smoke tests check for `login.html` and `index.html` which require a live skill run to exist
   - What's unclear: Whether "Nyquist compliant" requires these to be `✅ green` or whether `⬜ pending` is acceptable for manual-only tests
   - Recommendation: Mark manual-only tests as `⬜ pending (manual)` or add a note; mark all structurally-verifiable tests as `✅ green`. Precedent from Phase 19 VALIDATION.md: manual behavioral tests are expected to remain pending until a live run is executed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bash grep assertions + Phase 20 test script (existing) |
| Config file | None — no test runner |
| Quick run command | `grep 'nyquist_compliant: true' .planning/phases/16-*/16-VALIDATION.md` |
| Full suite command | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh && grep -l 'nyquist_compliant: true' .planning/phases/*/??*-VALIDATION.md \| wc -l` |

### Phase Requirements → Test Map

This phase has no new requirements (tech debt cleanup only). The success criteria are:

| SC | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| SC-1a | Phase 16 VALIDATION has `nyquist_compliant: true` | structural | `grep 'nyquist_compliant: true' .planning/phases/16-wireframing-pde-wireframe/16-VALIDATION.md` | ✅ (file exists, flag to change) |
| SC-1b | Phase 17 VALIDATION has `nyquist_compliant: true` | structural | `grep 'nyquist_compliant: true' .planning/phases/17-design-critique-pde-critique/17-VALIDATION.md` | ✅ |
| SC-1c | Phase 18 VALIDATION has `nyquist_compliant: true` | structural | `grep 'nyquist_compliant: true' .planning/phases/18-critique-driven-iteration-pde-iterate/18-VALIDATION.md` | ✅ |
| SC-1d | Phase 20 VALIDATION has `nyquist_compliant: true` | structural | `grep 'nyquist_compliant: true' .planning/phases/20-pipeline-orchestrator-pde-build/20-VALIDATION.md` | ✅ |
| SC-2 | 13.2 SUMMARY lists INFRA-04, BRF-02 | structural | `grep 'INFRA-04.*BRF-02\|BRF-02.*INFRA-04' .planning/phases/13.2-*/13.2-01-SUMMARY.md` | ✅ (likely already correct) |
| SC-3 | handoff.md Step 2b includes hasHandoff | structural | `grep 'hasHandoff' workflows/handoff.md \| grep -v "Step 7\|7c\|ENTIRE\|clobber\|hasHandoff: true\|hasHandoff:true"` | ✅ |
| SC-4 | 12/12 phases Nyquist compliant | structural | `grep -l 'nyquist_compliant: true' .planning/phases/*/??*-VALIDATION.md \| wc -l` (expect 12) | ✅ |

### Sampling Rate

- **Per task commit:** Run the task's specific `grep` verification
- **Per wave merge:** Run the full compliance count: `grep -rl 'nyquist_compliant: true' .planning/phases/`
- **Phase gate:** All 4 SCs verified before `/gsd:verify-work`

### Wave 0 Gaps

None — all infrastructure exists. This phase edits existing files only.

---

## Sources

### Primary (HIGH confidence)

- Direct file reads of all 4 VALIDATION.md files (phases 16, 17, 18, 20) — current frontmatter and checklist state
- Direct file read of `.planning/v1.1-MILESTONE-AUDIT.md` — source of truth for all tech debt items
- Direct file read of `workflows/handoff.md` line 87 — Step 2b current field list
- Direct file read of `.planning/phases/13.2-manifest-top-level-nyquist-cleanup/13.2-01-SUMMARY.md` line 23 — current requirements_completed value
- Live execution of `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` — 34/34 tests pass
- Live execution of `node bin/lib/design.cjs --self-test` — 20/20 tests pass
- Live grep of `workflows/critique.md`, `workflows/iterate.md`, `workflows/wireframe.md` — content verification for Phase 17/18/16

### Secondary (MEDIUM confidence)

- Pattern comparison against compliant phases 12-VALIDATION.md and 13.2-VALIDATION.md — sign-off format precedents

---

## Metadata

**Confidence breakdown:**
- What needs to change: HIGH — all files read directly, before/after states confirmed
- Phase 17 path correction: HIGH — `.claude/skills/` does not exist, `workflows/critique.md` does
- Phase 13.2 SUMMARY status: HIGH — file currently reads `[INFRA-04, BRF-02]`, success criterion likely already met
- handoff.md GAP-01 fix: HIGH — line 87 confirmed, `hasHandoff` confirmed absent from prose

**Research date:** 2026-03-15
**Valid until:** Indefinite — this research is based entirely on the current state of project files, not external ecosystem knowledge. Valid as long as the files read here are not changed before Phase 22 begins.
