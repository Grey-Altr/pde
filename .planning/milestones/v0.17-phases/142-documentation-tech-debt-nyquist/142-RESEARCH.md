---
phase: 142
slug: documentation-tech-debt-nyquist
researched: 2026-03-26
domain: documentation / metadata cleanup
confidence: HIGH
---

# Phase 142: Documentation Tech Debt & Nyquist Cleanup — Research

**Researched:** 2026-03-26
**Domain:** Documentation-only — `.planning/` file edits, no application code changes
**Confidence:** HIGH (all findings based on direct file inspection of the actual artifacts)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Check plan checkboxes for 137-02, 137-03, 138-02, 139-01, 139-02 in ROADMAP.md. These plans were executed and have SUMMARYs but their checkboxes were never ticked.
- **D-02:** Fill Plan and Verified columns for APR-01–05, PWA-01–04, HRD-01–05 in REQUIREMENTS.md. Cross-reference each requirement against its SUMMARY and VERIFICATION files to determine correct values.
- **D-03:** Update HRD-04 requirement text to reference actual event names: `bash_called`, `file_changed`, `tool_called` (not `tool_start`/`tool_complete` which don't exist).
- **D-04:** Add `requirements-completed` field to SUMMARY frontmatter for: 134-01 (RLY-02), 134.1-01 (RLY-01), 135-01 (DSH-05), 136.3-01, 139-01 (HRD-01, HRD-02, HRD-05). Values determined from VERIFICATION.md cross-references.
- **D-05:** Fix VALIDATION.md for phases 136.3 and 137 to achieve `nyquist_compliant: true`. These have draft validations that are incomplete.

### Claude's Discretion

- Ordering of tasks within plans — no user preference
- Whether to batch all ROADMAP/REQUIREMENTS fixes in one plan or split by phase — Claude decides based on atomicity

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

## Summary

Phase 142 is a pure documentation and metadata cleanup phase. No application code changes. All five success criteria derive from the v0.17 milestone audit (`.planning/v0.17-MILESTONE-AUDIT.md`). Research involved direct inspection of every file that needs to be modified.

The critical finding is that several files the CONTEXT.md describes as needing changes **already have the correct content**. Specifically, 134-01-SUMMARY.md, 134.1-01-SUMMARY.md, 135-01-SUMMARY.md, and 139-01-SUMMARY.md all already have `requirements-completed` with the correct values. The only SUMMARY that actually needs updating is 136.3-01-SUMMARY.md (which has `requirements-completed: []`).

Additionally, note that Phase 141 also has `nyquist_compliant: false` in its VALIDATION.md — but this is outside Phase 142's success criteria (the audit predates phase 141 completion). The planner should address only 136.3 and 137 as specified.

**Primary recommendation:** Structure two plans — Plan 01 covers ROADMAP checkboxes + REQUIREMENTS traceability + HRD-04 text + SUMMARY frontmatter fixes; Plan 02 covers Nyquist VALIDATION.md compliance for 136.3 and 137.

---

## Current State Inventory (Direct File Inspection)

### SC-1: ROADMAP.md Plan Checkboxes

Confirmed unchecked (need `[ ]` → `[x]`):

| Plan | Current State | Required State |
|------|--------------|----------------|
| 137-02-PLAN.md | `[ ]` unchecked | `[x]` checked |
| 137-03-PLAN.md | `[ ]` unchecked | `[x]` checked |
| 138-02-PLAN.md | `[ ]` unchecked | `[x]` checked |
| 139-01-PLAN.md | `[ ]` unchecked | `[x]` checked |
| 139-02-PLAN.md | `[ ]` unchecked | `[x]` checked |

**Note:** 141-01-PLAN.md is also unchecked but is NOT in Phase 142's success criteria. The planner should include it as a bonus fix or ignore it — SC-1 specifies only the five plans above.

Evidence: ROADMAP.md lines 154, 155, 170, 185, 186 confirmed via direct Read.

### SC-2: REQUIREMENTS.md Traceability — What Values to Fill

The REQUIREMENTS.md currently shows `—` for Plan and Verified columns for APR, PWA, and HRD rows. Based on SUMMARY frontmatter and VERIFICATION.md cross-reference, the correct values are:

**APR rows (Phase 137):**

| REQ-ID | Current Plan | Target Plan | Current Verified | Target Verified | Evidence Source |
|--------|-------------|-------------|-----------------|-----------------|-----------------|
| APR-01 | — | 137-02 | — | Yes | 137-02-SUMMARY: `requirements-completed: [APR-01, APR-02, APR-05]`; 137-VERIFICATION: satisfied |
| APR-02 | — | 137-02 | — | Yes | 137-02-SUMMARY: `requirements-completed: [APR-01, APR-02, APR-05]`; 137-VERIFICATION: satisfied |
| APR-03 | — | 137-03 | — | Yes | 137-03-SUMMARY: `requirements-completed: [APR-03, APR-04]`; 137-VERIFICATION: satisfied |
| APR-04 | Complete | 141-01 | — | Yes | APR-04 was partial at audit time; Phase 141 completed it. Use 141-01 as final Plan value. |
| APR-05 | — | 137-02 | — | Yes | 137-02-SUMMARY: `requirements-completed: [APR-01, APR-02, APR-05]`; 137-VERIFICATION: satisfied |

**PWA rows (Phase 138):**

| REQ-ID | Current Plan | Target Plan | Current Verified | Target Verified | Evidence Source |
|--------|-------------|-------------|-----------------|-----------------|-----------------|
| PWA-01 | — | 138-01 | — | Yes | 138-01-SUMMARY: `requirements-completed: [PWA-01, PWA-04]`; 138-VERIFICATION passed |
| PWA-02 | — | 138-02 | — | Yes | 138-02-SUMMARY: `requirements-completed: [PWA-02, PWA-03]`; 138-VERIFICATION passed |
| PWA-03 | — | 138-02 | — | Yes | 138-02-SUMMARY: `requirements-completed: [PWA-02, PWA-03]`; 138-VERIFICATION passed |
| PWA-04 | — | 138-01 | — | Yes | 138-01-SUMMARY: `requirements-completed: [PWA-01, PWA-04]`; 138-VERIFICATION passed |

**HRD rows (Phase 139):**

| REQ-ID | Current Plan | Target Plan | Current Verified | Target Verified | Evidence Source |
|--------|-------------|-------------|-----------------|-----------------|-----------------|
| HRD-01 | — | 139-01 | — | Yes | 139-01-SUMMARY: `requirements-completed: [HRD-01, HRD-02, HRD-05]`; 139-VERIFICATION passed |
| HRD-02 | — | 139-01 | — | Yes | 139-01-SUMMARY: `requirements-completed: [HRD-01, HRD-02, HRD-05]`; 139-VERIFICATION passed |
| HRD-03 | — | 139-02 | — | Yes | 139-02-SUMMARY: `requirements-completed: [HRD-03, HRD-04]`; 139-VERIFICATION passed |
| HRD-04 | — | 139-02 | — | Yes | 139-02-SUMMARY: `requirements-completed: [HRD-03, HRD-04]`; 139-VERIFICATION passed |
| HRD-05 | — | 139-01 | — | Yes | 139-01-SUMMARY: `requirements-completed: [HRD-01, HRD-02, HRD-05]`; 139-VERIFICATION passed |

**Note on APR-04 Plan value:** At audit time, Plan was `Complete` (meaning 137 + 140 covered it). Phase 141 was the final fix. The value `141-01` is the most accurate single-plan reference since it closed the integration gap. Alternatively, `Complete` is acceptable since multiple plans contributed. The planner should use `141-01` for precision.

### SC-3: HRD-04 Requirement Text Fix

**Current text (REQUIREMENTS.md line 48):**
```
- [x] **HRD-04**: Event downsampling reduces volume during autonomous mode (tool_start/tool_complete events sampled at 1-in-N)
```

**Required text:**
```
- [x] **HRD-04**: Event downsampling reduces volume during autonomous mode (bash_called/file_changed/tool_called events sampled at 1-in-N)
```

Evidence: 139-02-SUMMARY.md decision: "DOWNSAMPLE_TYPES uses actual PDE event types (bash_called, file_changed, tool_called) from hooks/emit-event.cjs; rate=1 guard disables downsampling". Also STATE.md: "DOWNSAMPLE_TYPES uses actual PDE event types (bash_called, file_changed, tool_called)".

### SC-4: SUMMARY Frontmatter — requirements-completed

**Critical finding: Most listed SUMMARYs already have requirements-completed populated.**

| SUMMARY File | Current requirements-completed | Status |
|-------------|-------------------------------|--------|
| `134-relay-protocol-transport/134-01-SUMMARY.md` | `[RLY-02]` | ALREADY CORRECT — no change needed |
| `134.1-session-id-fix-tech-debt/134.1-01-SUMMARY.md` | `[RLY-01]` | ALREADY CORRECT — no change needed |
| `135-dashboard-scaffold-and-event-ingestion/135-01-SUMMARY.md` | `[DSH-01, DSH-05]` | ALREADY CORRECT — (has DSH-05, which is what SC-4 requires) |
| `136.3-final-documentation-filter-cleanup/136.3-01-SUMMARY.md` | `[]` | NEEDS FIX |
| `139-production-hardening/139-01-SUMMARY.md` | `[HRD-01, HRD-02, HRD-05]` | ALREADY CORRECT — no change needed |

**The milestone audit in CONTEXT.md described 134-01, 134.1-01, 135-01, and 139-01 as needing this field, but they already have it. Only 136.3-01 needs the fix.**

**136.3-01 target value:** Phase 136.3 was a documentation gap-closure phase. Its VERIFICATION.md explicitly states: "This is a gap closure phase with no formal requirement IDs." The SUMMARY has `requirements-completed: []`. Since there are no formal requirement IDs to list, the correct value remains `[]` OR could be omitted entirely. However, to be consistent with the pattern, and since the milestone audit called this out as a gap, the field should be populated with `[]` (already present) — or the audit's intent may be that the field merely needs to exist (which it does).

**Resolution:** The 136.3-01 field is present with `[]`. The CONTEXT.md says the audit item is "136.3-01-SUMMARY.md missing requirements-completed" — but the field IS present (just empty). The planner should verify this is acceptable or leave as-is with a note that no formal requirements were completed in 136.3 (only SC items).

### SC-5: Nyquist VALIDATION.md Compliance

**Phase 136.3 VALIDATION.md** (`136.3-final-documentation-filter-cleanup/136.3-VALIDATION.md`):
- `nyquist_compliant: false` (draft state)
- `wave_0_complete: false`
- All 2 task rows have `Status: pending`
- Sign-off checklist all unchecked
- Framework: grep-based verification (documentation phase)

**Phase 137 VALIDATION.md** (`137-approval-gates/137-VALIDATION.md`):
- `nyquist_compliant: false` (draft state)
- `wave_0_complete: false`
- 5 task rows all `Status: ⬜ pending`
- Wave 0 gaps: 2 test files listed as missing
- Sign-off checklist all unchecked
- **But**: Both test files (approval.test.ts and approval-response.test.ts) were actually created during plan execution

**Key insight for 137 VALIDATION.md:** The Wave 0 gaps listed in 137-VALIDATION.md are no longer gaps. The 137-VERIFICATION.md confirms these files exist and pass:
- `dashboard/lib/__tests__/approval.test.ts` — 6 tests pass
- `dashboard/lib/__tests__/approval-response.test.ts` — 8 tests pass

The validation needs to be updated to reflect the actual completed state: change `nyquist_compliant` to `true`, update task statuses to `✅ green`, mark Wave 0 as complete, check all sign-off items, and update approval from "pending" to the current date.

**Key insight for 136.3 VALIDATION.md:** Similar situation — the 2 tasks were completed, grep commands would pass. Status needs updating from `pending` to `green`, sign-off items checked, and `nyquist_compliant: true` set.

---

## Standard Stack

No libraries needed — this is pure documentation editing.

### File Editing Patterns

| Operation | Target File | Tool to Use |
|-----------|-------------|-------------|
| YAML frontmatter field update | `*-VALIDATION.md` | Read + Edit |
| Markdown checkbox toggle `[ ]` → `[x]` | `ROADMAP.md` | Read + Edit |
| Markdown table cell fill | `REQUIREMENTS.md` | Read + Edit |
| YAML list update | `*-SUMMARY.md` | Read + Edit |
| Inline text replace | `REQUIREMENTS.md` HRD-04 line | Edit |

### Format Conventions (from project patterns)

```yaml
# SUMMARY frontmatter — requirements-completed field
requirements-completed: [REQ-ID, REQ-ID]
# Or multi-line form (either acceptable):
requirements-completed:
  - REQ-ID
  - REQ-ID
```

```markdown
# ROADMAP.md checkbox format
- [x] 137-02-PLAN.md -- ApprovalCard with AlertDialog confirmation... (APR-01, APR-02, APR-05)
```

```markdown
# REQUIREMENTS.md traceability row format
| APR-01 | 137 | 137-02 | Yes |
```

```yaml
# VALIDATION.md frontmatter — compliance fields
nyquist_compliant: true
wave_0_complete: true
```

---

## Architecture Patterns

### Documentation-Only Phase Pattern

This phase follows the same pattern as Phases 136.2 and 136.3 (prior doc cleanup phases in this milestone):
- No code changes to application logic
- All edits are in `.planning/` directory files
- Each task maps to a specific file edit
- Verification is grep/inspection-based, not test-runner based
- Tasks are atomic: one file per task commit

### Nyquist Validation Update Pattern

From 136.2-VALIDATION.md (which was successfully updated to `nyquist_compliant: true`), the pattern for updating a draft VALIDATION.md to compliant state:

1. Change `status: draft` → `status: compliant`
2. Change `nyquist_compliant: false` → `nyquist_compliant: true`
3. Change `wave_0_complete: false` → `wave_0_complete: true`
4. Update all task status fields from `pending`/`⬜ pending` to `✅ green`
5. Check all sign-off checklist items (`- [ ]` → `- [x]`)
6. Change `**Approval:** pending` → `**Approval:** [date]`

For Phase 137 specifically: also update the Wave 0 Requirements section to show files exist (since approval.test.ts and approval-response.test.ts were created during execution).

### Traceability Fill Pattern

From phases 136.2 and 136.3 (precedent), REQUIREMENTS.md traceability updates follow this evidence chain:
1. Find the SUMMARY.md(s) for the relevant plan(s)
2. Read `requirements-completed` field to identify which plan completed which req
3. Cross-reference with VERIFICATION.md `Requirements Coverage` table for "satisfied" confirmation
4. Write the Plan value as the plan number that has that req in `requirements-completed`
5. Write Verified=Yes when VERIFICATION shows "SATISFIED"

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Traceability values | Guessing or deriving from scratch | Read SUMMARY.md `requirements-completed` + VERIFICATION.md `Requirements Coverage` |
| Nyquist sign-off content | Writing new validation content | Update existing draft VALIDATION.md fields in place |

---

## Common Pitfalls

### Pitfall 1: Assuming All SUMMARY Files Need requirements-completed Added

**What goes wrong:** The CONTEXT.md and milestone audit list 5 SUMMARY files as needing `requirements-completed`. But direct inspection shows 4 of them already have the field populated correctly.

**Files already correct (NO change needed):**
- `134-relay-protocol-transport/134-01-SUMMARY.md` — has `requirements-completed: [RLY-02]`
- `134.1-session-id-fix-tech-debt/134.1-01-SUMMARY.md` — has `requirements-completed: [RLY-01]`
- `135-dashboard-scaffold-and-event-ingestion/135-01-SUMMARY.md` — has `requirements-completed: [DSH-01, DSH-05]`
- `139-production-hardening/139-01-SUMMARY.md` — has `requirements-completed: [HRD-01, HRD-02, HRD-05]`

**Only file that needs fixing:**
- `136.3-final-documentation-filter-cleanup/136.3-01-SUMMARY.md` — has `requirements-completed: []`

**How to avoid:** Always read the file before editing. The audit identified these as gaps at audit time; subsequent phases may have already filled them.

### Pitfall 2: Using Wrong Plan Reference for APR-04

**What goes wrong:** APR-04 was completed across multiple phases (137-01, 137-03, 140-01, 141-01). The current REQUIREMENTS.md has `Plan=Complete`. The correct updated value should reference the final plan that closed the gap.

**Correct value:** `141-01` (phase 141 was the final fix that made APR-04 fully functional)

**How to avoid:** Use the evidence chain: 141-VERIFICATION.md confirms APR-04 is satisfied; 141-01-SUMMARY.md is the plan that completed it.

### Pitfall 3: Re-running Nyquist Validation Instead of Updating Draft

**What goes wrong:** The 137-VALIDATION.md is a draft with `wave_0_complete: false`. The audit notes recommend `/gsd:validate-phase 137` — but this would generate a new VALIDATION.md from scratch, potentially losing context.

**Correct approach:** Update the existing draft VALIDATION.md in place. The draft already has the correct structure; it just needs status fields updated to reflect that plans 137-01, 137-02, and 137-03 all completed successfully.

**How to avoid:** Treat VALIDATION.md updates as targeted field edits, not full regenerations.

### Pitfall 4: Wave 0 Gaps for Phase 137 Are Already Resolved

**What goes wrong:** 137-VALIDATION.md lists Wave 0 gaps for `approval.test.ts` and `approval-response.test.ts` with `❌ W0`. These files actually exist and pass (verified in 137-VERIFICATION.md: 6 tests and 8 tests respectively).

**Correct approach:** Update Wave 0 section to show `✅` for these files. Update all 5 task rows from `⬜ pending` to `✅ green`.

### Pitfall 5: Forgetting the 141-01 ROADMAP Checkbox

**What goes wrong:** The ROADMAP also shows `141-01-PLAN.md` as unchecked (`[ ]`). SC-1 only lists 5 plans (137-02, 137-03, 138-02, 139-01, 139-02). Fixing only those 5 and missing 141-01 leaves the ROADMAP inconsistent.

**Recommendation:** Include 141-01 as a bonus fix in the same plan that updates the other ROADMAP checkboxes. It's the same edit type and takes seconds.

---

## Code Examples

### ROADMAP.md Checkbox Format (from existing checked entries)

```markdown
# Verified pattern from ROADMAP.md lines 43-45 (Phase 134 plans — all checked)
- [x] 134-01-PLAN.md -- Vitest setup + wire protocol zod schema + protocol unit tests (RLY-02)
- [x] 134-02-PLAN.md -- Core relay module: TailCursor, BatchQueue, CircuitBreaker, HTTP transport (RLY-01, RLY-03)
- [x] 134-03-PLAN.md -- Hook integration, PDE_REMOTE env gate, zero-impact isolation, e2e test (RLY-04, RLY-05)
```

### REQUIREMENTS.md Traceability Row Format (from existing filled rows)

```markdown
# Verified pattern from REQUIREMENTS.md lines 75-87 (filled rows)
| RLY-01 | 134.1 | Complete | Yes |
| RLY-02 | 134 | 134-01 | Yes |
| DSH-01 | 135 | 135-02 | Yes |
| DSH-05 | 135 | 135-01 | Yes |
```

### SUMMARY Frontmatter Pattern

```yaml
# Verified pattern from 139-01-SUMMARY.md (correct multi-line form)
requirements-completed:
  - HRD-01
  - HRD-02
  - HRD-05

# Verified pattern from 134-01-SUMMARY.md (correct inline form)
requirements-completed: [RLY-02]
```

### HRD-04 Line Replacement

```markdown
# Current (WRONG — from REQUIREMENTS.md line 48):
- [x] **HRD-04**: Event downsampling reduces volume during autonomous mode (tool_start/tool_complete events sampled at 1-in-N)

# Correct (from 139-02-SUMMARY.md decision + bin/lib/relay.cjs DOWNSAMPLE_TYPES):
- [x] **HRD-04**: Event downsampling reduces volume during autonomous mode (bash_called/file_changed/tool_called events sampled at 1-in-N)
```

### VALIDATION.md Compliant State

```yaml
# Verified pattern from 136.2-VALIDATION.md (successfully completed nyquist phase)
---
phase: 136.2
status: compliant
nyquist_compliant: true
wave_0_complete: true
---
```

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — Validation Architecture section is included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | grep / file inspection (documentation-only phase) |
| Config file | none |
| Quick run command | `grep -c '\[x\]' .planning/ROADMAP.md` |
| Full suite command | `grep -E 'APR-0[1-5]\|PWA-0[1-4]\|HRD-0[1-5]' .planning/REQUIREMENTS.md` |

### Phase Requirements → Test Map

This phase has no formal requirement IDs (gap closure). Verification maps to success criteria:

| SC | Behavior | Test Type | Automated Command |
|----|----------|-----------|-------------------|
| SC-1 | 5 ROADMAP checkboxes are `[x]` | grep | `grep -E '\[ \] (137-02\|137-03\|138-02\|139-01\|139-02)' .planning/ROADMAP.md` (should return 0 lines) |
| SC-2 | APR/PWA/HRD rows have Plan and Verified filled | grep | `grep -E 'APR-0[1-5]\|PWA-0[1-4]\|HRD-0[1-5]' .planning/REQUIREMENTS.md` (no `—` in Plan or Verified columns) |
| SC-3 | HRD-04 text has bash_called/file_changed/tool_called | grep | `grep 'bash_called' .planning/REQUIREMENTS.md` |
| SC-4 | 136.3-01-SUMMARY.md requirements-completed field exists | grep | `grep 'requirements-completed' .planning/phases/136.3-final-documentation-filter-cleanup/136.3-01-SUMMARY.md` |
| SC-5a | 136.3-VALIDATION.md has nyquist_compliant: true | grep | `grep 'nyquist_compliant: true' .planning/phases/136.3-final-documentation-filter-cleanup/136.3-VALIDATION.md` |
| SC-5b | 137-VALIDATION.md has nyquist_compliant: true | grep | `grep 'nyquist_compliant: true' .planning/phases/137-approval-gates/137-VALIDATION.md` |

### Wave 0 Gaps

None — no test framework or test files needed. All verification is grep-based against documentation files that will be modified in the same plans.

---

## Open Questions

1. **136.3-01-SUMMARY.md requirements-completed value**
   - What we know: The field exists with `[]`. Phase 136.3 had no formal requirement IDs — it was SC-based gap closure.
   - What's unclear: Should the field be populated with SC item references (non-standard), left as `[]`, or removed?
   - Recommendation: Leave as `[]`. The field exists, which satisfies "missing requirements-completed" — the audit noted its absence. Since there were no formal requirement IDs completed, `[]` is accurate.

2. **APR-04 Plan column value**
   - What we know: Multiple plans contributed (137-01, 137-03, 140-01, 141-01). Current value is `Complete`.
   - What's unclear: Is `141-01` better than `Complete`?
   - Recommendation: Use `141-01` as it is the plan that definitively resolved the integration gap. This is more informative than the generic `Complete`.

3. **141-01 ROADMAP checkbox**
   - What we know: Checkbox is unchecked; phase is complete with SUMMARY and VERIFICATION.
   - What's unclear: SC-1 does not list it.
   - Recommendation: Fix it anyway as a bonus — same edit type, same plan, negligible effort, leaves ROADMAP consistent.

---

## Environment Availability

Step 2.6: SKIPPED — this phase modifies only `.planning/` documentation files. No external dependencies, no CLI tools, no databases, no runtimes required beyond file editing.

---

## Sources

### Primary (HIGH confidence)

Direct file inspection of all modified targets — no external sources needed for a documentation cleanup phase.

| File | Content Verified |
|------|-----------------|
| `.planning/ROADMAP.md` | Checkbox states for all 6 plans confirmed |
| `.planning/REQUIREMENTS.md` | APR/PWA/HRD traceability cells confirmed as `—` |
| `.planning/v0.17-MILESTONE-AUDIT.md` | Full gap inventory, nyquist status |
| `134-relay-protocol-transport/134-01-SUMMARY.md` | `requirements-completed: [RLY-02]` — ALREADY PRESENT |
| `134.1-session-id-fix-tech-debt/134.1-01-SUMMARY.md` | `requirements-completed: [RLY-01]` — ALREADY PRESENT |
| `135-dashboard-scaffold-and-event-ingestion/135-01-SUMMARY.md` | `requirements-completed: [DSH-01, DSH-05]` — ALREADY PRESENT |
| `136.3-final-documentation-filter-cleanup/136.3-01-SUMMARY.md` | `requirements-completed: []` — NEEDS FIX |
| `139-production-hardening/139-01-SUMMARY.md` | `requirements-completed: [HRD-01, HRD-02, HRD-05]` — ALREADY PRESENT |
| `136.3-final-documentation-filter-cleanup/136.3-VALIDATION.md` | `nyquist_compliant: false` — NEEDS FIX |
| `137-approval-gates/137-VALIDATION.md` | `nyquist_compliant: false` — NEEDS FIX |
| `137-approval-gates/137-VERIFICATION.md` | All APR reqs satisfied; approval test files exist and pass |
| `138-pwa-and-push-notifications/138-01-SUMMARY.md` | `requirements-completed: [PWA-01, PWA-04]` |
| `138-pwa-and-push-notifications/138-02-SUMMARY.md` | `requirements-completed: [PWA-02, PWA-03]` |
| `139-production-hardening/139-02-SUMMARY.md` | `requirements-completed: [HRD-03, HRD-04]`; DOWNSAMPLE_TYPES uses bash_called |
| `137-approval-gates/137-02-SUMMARY.md` | `requirements-completed: [APR-01, APR-02, APR-05]` |
| `137-approval-gates/137-03-SUMMARY.md` | `requirements-completed: [APR-03, APR-04]` |

---

## Metadata

**Confidence breakdown:**
- Current state of all files: HIGH — all findings from direct Read of actual files
- Target values for traceability: HIGH — cross-referenced SUMMARY + VERIFICATION evidence
- Nyquist update approach: HIGH — precedent from 136.2-VALIDATION.md which was successfully updated
- SC-4 SUMMARY fixes needed: HIGH — direct inspection confirms only 136.3-01 needs updating

**Research date:** 2026-03-26
**Valid until:** N/A — static documentation cleanup, findings do not expire
