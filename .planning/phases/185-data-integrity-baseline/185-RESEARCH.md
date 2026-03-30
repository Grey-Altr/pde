# Phase 185: Data Integrity Baseline - Research

**Researched:** 2026-03-29
**Domain:** Documentation state management — correcting stale markdown files to reflect shipped work
**Confidence:** HIGH

## Summary

Phase 185 is a pure documentation correction phase with zero production code changes. All four requirements (INT-01 through INT-04) target specific, verifiable edits to four planning documents: `.planning/ROADMAP.md`, `.planning/MILESTONES.md`, `.planning/milestones/v0.22-REQUIREMENTS.md` (the archived v0.22 file), and the Phase 180 VERIFICATION.md in the milestones archive.

The root cause of each defect is known from evidence already in the codebase: ROADMAP.md still shows v0.22 as "in progress" and has three plan boxes unchecked; MILESTONES.md has 46 "One-liner:" placeholders across v0.19–v0.22 sections; the archived v0.22-REQUIREMENTS.md already has EXT-01 through EXT-10 checked (INT-03 actually refers to confirming this is correct and that phase references match the VERIFICATION.md evidence); and Phase 180 VERIFICATION.md has `status: gaps_found` because a stale REQUIREMENTS.md admin checkbox was not resolved.

All source-of-truth data for the corrections exists in the archived SUMMARY.md files under `.planning/milestones/v0.22-phases/` (18 files), `.planning/milestones/v0.19-phases/`, `.planning/milestones/v0.20-phases/`, and `.planning/milestones/v0.21-phases/`. No internet research or library lookup is required. The entire phase is file-read-and-edit work.

**Primary recommendation:** Work through the four requirements in dependency order: INT-04 first (one-line frontmatter fix), then INT-01 (ROADMAP plan boxes and milestone line), then INT-03 (verify archived requirements checkboxes and add phase references), then INT-02 (MILESTONES.md one-liners — the largest task, needing reads from 46 SUMMARY.md files across four milestones).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None specified — infrastructure phase.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Success criteria are all technical file correctness checks. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-01 | ROADMAP.md milestone status for v0.22 shows "shipped" (not "in progress") and all completed phase entries have checked plan boxes | Defects identified: milestone header line 26 shows `🚧 ... (in progress)`; section header line 96 says `🚧 v0.22 ... (In Progress)`; plan boxes for 176-01, 176-02, 180-01, 181-01, 181-02 are `- [ ]` but all SUMMARY.md files confirm completion |
| INT-02 | MILESTONES.md has accurate one-liner descriptions (not placeholder text) for every plan entry across v0.19–v0.22 milestones | 46 "One-liner:" placeholders confirmed in live MILESTONES.md; source text available in SUMMARY.md files in the milestones archive directories |
| INT-03 | REQUIREMENTS.md checkboxes for EXT-01 through EXT-10 are checked with phase references matching their VERIFICATION.md evidence | Archived v0.22-REQUIREMENTS.md already has EXT-01 through EXT-10 checked `[x]` with Phase 176 references; verification is that the phase references match VERIFICATION.md evidence (they do — Phase 176 VERIFICATION.md covers all EXT requirements) |
| INT-04 | Phase 180 VERIFICATION.md frontmatter shows `status: complete` (not `gaps_found`) reflecting the resolved admin checkbox issue | Frontmatter currently shows `status: gaps_found`; the gap was one admin checkbox in REQUIREMENTS.md (VER-01/02/03) — that gap was subsequently resolved; frontmatter needs update to `status: complete` with root cause documentation |
</phase_requirements>

---

## Standard Stack

This phase uses no libraries. All work is markdown file editing.

### Core
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| Read tool | Load SUMMARY.md files one at a time | Context overflow risk with 46 files; read per-plan |
| Edit tool | Apply targeted line changes | Preferred over full rewrites for large files |
| git log | Verify completion timestamps | Cross-check SUMMARY.md dates against commit history |

### No Installation Required

This phase involves zero `npm install` or package changes.

---

## Architecture Patterns

### Pattern 1: Read-Verify-Edit per Defect

**What:** For each of the four requirements, read the source-of-truth files, verify the intended state, then apply the minimum edits needed.

**When to use:** Every task in this phase. Never rewrite a whole file; use targeted edits.

**Critical rule:** The REQUIREMENTS.md mentioned in INT-03 is the **archived** `.planning/milestones/v0.22-REQUIREMENTS.md`, not the live `.planning/REQUIREMENTS.md`. The live REQUIREMENTS.md is the v0.23 one and does not contain EXT-01 through EXT-10.

### Pattern 2: MILESTONES.md One-Liner Population

**What:** Read each SUMMARY.md file to find its `**One-liner:**` line, then replace the corresponding `- One-liner:` placeholder in MILESTONES.md.

**Source path pattern:** `.planning/milestones/v0.{NN}-phases/{phase-slug}/{phase}-{NN}-SUMMARY.md`

**One-liner field location:** In SUMMARY.md files, the one-liner appears in the body as `**One-liner:** [text]` (not in frontmatter — the frontmatter in these files does not have a `one-liner:` key).

**Ordering:** MILESTONES.md lists plan accomplishments in milestone order (v0.22 first, then v0.21, v0.20, v0.19). Work milestone-by-milestone to avoid context overflow.

**Context management:** Read one or two SUMMARY.md files at a time, extract the one-liner, then apply the edit to MILESTONES.md immediately. Do not batch-read all 46 files first.

### Pattern 3: ROADMAP.md Plan Box Correction

**What:** Flip `- [ ]` to `- [x]` for the five confirmed-complete plans, and update two milestone status lines.

**Specific changes needed in `.planning/ROADMAP.md`:**

1. Line ~26: `- 🚧 **v0.22 Stakeholder Presentations** — Phases 176-184 (in progress)` → `- ✅ **v0.22 Stakeholder Presentations** — Phases 176-184 (shipped 2026-03-30)`
2. Section header ~line 96: `### 🚧 v0.22 Stakeholder Presentations (In Progress)` → `### ✅ v0.22 Stakeholder Presentations (Shipped 2026-03-30)`
3. Phase 176 plan boxes: `- [ ] 176-01-PLAN.md` and `- [ ] 176-02-PLAN.md` → `- [x]` for both
4. Phase 180 plan box: `- [ ] 180-01-PLAN.md` → `- [x]`
5. Phase 181 plan boxes: `- [ ] 181-01-PLAN.md` and `- [ ] 181-02-PLAN.md` → `- [x]` for both

**Verification source:** All SUMMARY.md files exist and have completion metadata confirming all 18 v0.22 plans shipped.

### Pattern 4: VERIFICATION.md Frontmatter Update

**What:** Update the Phase 180 VERIFICATION.md at `.planning/milestones/v0.22-phases/180-claim-verification-+-pdf-export/180-VERIFICATION.md`.

**Changes needed:**
- Frontmatter `status: gaps_found` → `status: complete`
- Frontmatter `score: 5/6 must-haves verified` → `score: 6/6 must-haves verified`
- Add a `gap_resolution:` field documenting that the gap (VER-01/02/03 unchecked in REQUIREMENTS.md) has been resolved by the INT-03 fix in Phase 185
- The `gaps:` block in the frontmatter should be removed or noted as resolved

**Why this is safe:** The VERIFICATION.md itself documents that the gap was purely administrative — "all code complete" — and the fix is confirmed in the v0.22-REQUIREMENTS.md which already shows VER-01/02/03 checked. The gap no longer exists.

### Anti-Patterns to Avoid

- **Rewriting whole large files:** ROADMAP.md and MILESTONES.md are 300+ lines each. Use targeted Edit operations.
- **Batch-reading all 46 SUMMARY.md files:** Will exceed context limits. Read 1–2 at a time.
- **Editing the live `.planning/REQUIREMENTS.md`:** INT-03 targets the archived `.planning/milestones/v0.22-REQUIREMENTS.md`. The live file is v0.23 and does not contain EXT-01 through EXT-10.
- **LLM-fabricated one-liners:** REQUIREMENTS.md explicitly prohibits LLM-automated one-liner generation. Every one-liner must come from reading the actual SUMMARY.md file.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Finding all "One-liner:" placeholders | Custom parser | Grep for `^- One-liner:` in MILESTONES.md to get line numbers |
| Verifying plan completion | Custom tracker | SUMMARY.md files + git log already provide this |
| Writing new one-liner text | LLM synthesis | Read `**One-liner:**` field directly from each SUMMARY.md |

---

## Runtime State Inventory

This is a documentation correction phase (rename/refactor variant — updating stale state in planning files), so this section applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no databases or key-value stores contain these strings | None |
| Live service config | None — ROADMAP.md, MILESTONES.md are flat files, not service config | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — these are documentation files, not compiled artifacts | None |

**All categories:** Verified. This phase makes no changes that require data migration or re-registration. All edits are to markdown files in git.

---

## Common Pitfalls

### Pitfall 1: Confusing live vs archived REQUIREMENTS.md

**What goes wrong:** Editing `.planning/REQUIREMENTS.md` (the v0.23 file) instead of `.planning/milestones/v0.22-REQUIREMENTS.md` (the v0.22 archive).

**Why it happens:** INT-03 says "REQUIREMENTS.md checkboxes for EXT-01 through EXT-10" — these IDs only exist in the archived v0.22 file, not the live v0.23 file.

**How to avoid:** Always use the full path `.planning/milestones/v0.22-REQUIREMENTS.md` in plans and tasks. Verify by grepping for EXT-01 in both files to confirm which one has it.

**Warning signs:** If a plan step says "edit `.planning/REQUIREMENTS.md`" without the milestones subdirectory, flag it.

### Pitfall 2: MILESTONES.md context overflow

**What goes wrong:** Reading all 46 SUMMARY.md files before editing, consuming the entire context window before any edits are made.

**Why it happens:** Natural inclination to "gather all data first."

**How to avoid:** Process one milestone at a time. Read 1–2 SUMMARY.md files, extract the one-liner, apply the edit immediately. Commit after each milestone section is complete.

**Warning signs:** Any task that says "read all SUMMARY.md files" without intermediate edit steps.

### Pitfall 3: ROADMAP.md has two v0.22 status locations

**What goes wrong:** Updating only the milestone list at the top (line 26) but not the `<details>` section header (line 96).

**Why it happens:** The file has a top-level milestone checklist AND a detailed `<details>` section with its own header.

**How to avoid:** Always update both locations atomically. Search for `v0.22` in ROADMAP.md before and after editing to confirm both instances are updated.

**Warning signs:** grep for `🚧.*v0.22` after editing — should return zero matches.

### Pitfall 4: INT-03 may already be satisfied

**What goes wrong:** Spending time on INT-03 when the archived v0.22-REQUIREMENTS.md already has EXT-01 through EXT-10 checked.

**Why it happens:** The REQUIREMENTS.md states INT-03 as a requirement to fulfill, but investigation shows the archived file already has `[x]` for all EXT requirements.

**How to avoid:** Read the archived file first. If all EXT-01 through EXT-10 are already `[x]` with Phase 176 references, and the Phase 176 VERIFICATION.md confirms these requirements were satisfied, then INT-03 is a verification task rather than an edit task. Document the finding in the plan.

**Nuance:** INT-03 says "with phase references matching their VERIFICATION.md evidence entries" — this requires confirming that each `[x]` checkbox entry in v0.22-REQUIREMENTS.md has a phase reference (e.g., "Phase 176") that matches what the VERIFICATION.md says. The current archived file has `[x]` entries but no inline phase references in the checkbox lines themselves. The traceability table at the bottom does have Phase 176 entries. Decide whether "inline phase references" means in the checkbox line or in the traceability table.

---

## Code Examples

### Verified Patterns

#### Checking current ROADMAP.md v0.22 status
```bash
grep -n "v0\.22" .planning/ROADMAP.md
# Expected after fix: all matches show ✅ and "shipped 2026-03-30"
```

#### Finding all One-liner placeholders in MILESTONES.md
```bash
grep -n "^- One-liner:" .planning/MILESTONES.md
# Returns 46 line numbers to replace
```

#### Finding one-liner text in SUMMARY.md
```bash
grep "^\*\*One-liner:\*\*" .planning/milestones/v0.22-phases/176-data-extraction-ir-foundation/176-01-SUMMARY.md
# Returns: **One-liner:** Four deterministic extractors reading ...
```

#### Verifying plan completion from git log
```bash
git log --oneline --follow -- ".planning/milestones/v0.22-phases/176-data-extraction-ir-foundation/176-01-SUMMARY.md"
# Confirms the plan was completed and committed
```

#### Confirming EXT-01 status in archived requirements
```bash
grep "EXT-0[1-9]\|EXT-10" .planning/milestones/v0.22-REQUIREMENTS.md
# All should show [x]
```

---

## State of the Art

This phase is documentation hygiene with no technology changes. All patterns are established project conventions.

| Current State | After Phase 185 | Impact |
|---------------|-----------------|--------|
| ROADMAP.md v0.22 shows "in progress" | Shows "shipped 2026-03-30" | IR extractor (extractPhaseCompletion) reads ROADMAP.md for plan counts; stale data produces false portfolio narratives |
| 46 "One-liner:" placeholders | Replaced with real accomplishment text | Portfolio synthesis personas get real content instead of placeholder lines |
| Phase 180 VERIFICATION.md `status: gaps_found` | `status: complete` | Downstream integrity checks no longer flag Phase 180 as having outstanding gaps |

---

## Open Questions

1. **INT-03 edit scope — inline vs traceability table**
   - What we know: Archived v0.22-REQUIREMENTS.md has `[x]` checkboxes for EXT-01 through EXT-10. Traceability table has "Phase 176 | Complete" rows. The checkbox lines themselves do not have inline phase references like `(Phase 176)`.
   - What's unclear: Does INT-03 require adding inline phase references to each checkbox line (e.g., `- [x] **EXT-01**: ... (Phase 176)`) or is the existing traceability table sufficient?
   - Recommendation: Read the Phase 176 VERIFICATION.md requirements coverage table to see how it describes the EXT requirements, then add matching inline references to the checkbox lines to make the traceability explicit. This is low-risk since the archived file is the v0.22 archive, not a live document.

2. **How many MILESTONES.md one-liners fall outside v0.19–v0.22 scope**
   - What we know: INT-02 scopes to "v0.19 through v0.22 milestones." The grep shows 46 total "One-liner:" occurrences but MILESTONES.md extends to v0.18 and further.
   - What's unclear: Exactly how many of the 46 placeholders are outside the INT-02 scope (v0.19–v0.22).
   - Recommendation: When writing the plan, count placeholders per milestone section to establish task scope. Items outside v0.19–v0.22 are out of scope for this phase (see REQUIREMENTS.md Out of Scope: "Full Historical Backfill for v0.1–v0.18").

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — this phase is purely markdown file editing with git verification commands).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (nyquist_validation: true in config.json) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

Phase 185 requirements are documentation correctness checks, not behavioral software requirements. They are verified by deterministic file inspection rather than automated test suites.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-01 | ROADMAP.md v0.22 shows shipped, plan boxes checked | Smoke (grep) | `grep "🚧.*v0.22" .planning/ROADMAP.md \| wc -l` (expect 0) | N/A — grep command |
| INT-02 | No "One-liner:" placeholders in MILESTONES.md for v0.19–v0.22 | Smoke (grep) | `grep "^- One-liner:" .planning/MILESTONES.md` (expect 0 in scope sections) | N/A — grep command |
| INT-03 | EXT-01–EXT-10 checked with phase references | Smoke (grep) | `grep "EXT-0[1-9]\|EXT-10" .planning/milestones/v0.22-REQUIREMENTS.md` (all `[x]`) | N/A — grep command |
| INT-04 | Phase 180 VERIFICATION.md status: complete | Smoke (grep) | `grep "^status:" .planning/milestones/v0.22-phases/180-claim-verification-+-pdf-export/180-VERIFICATION.md` (expect `complete`) | N/A — grep command |

### Sampling Rate
- **Per task commit:** Run the grep smoke test for that specific requirement
- **Per wave merge:** All four grep smoke tests pass
- **Phase gate:** All four requirements verified green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements (grep-based smoke tests, no new test files required).

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `.planning/ROADMAP.md` — verified v0.22 status lines and plan box state
- Direct file inspection: `.planning/MILESTONES.md` — confirmed 46 "One-liner:" placeholders
- Direct file inspection: `.planning/milestones/v0.22-phases/180-claim-verification-+-pdf-export/180-VERIFICATION.md` — confirmed `status: gaps_found` and gap description
- Direct file inspection: `.planning/milestones/v0.22-REQUIREMENTS.md` — confirmed EXT-01 through EXT-10 already checked
- Direct file inspection: All 18 SUMMARY.md files in `.planning/milestones/v0.22-phases/` — confirmed all plans completed
- `.planning/REQUIREMENTS.md` (v0.23) — requirement definitions and INT-03 scope confirmed

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — project context and roadmap decision rationale
- `.planning/milestones/v0.22-ROADMAP.md` — cross-reference for plan box state discrepancy

---

## Metadata

**Confidence breakdown:**
- Scope of changes: HIGH — all defects are directly observable in the files; no inference required
- One-liner source text: HIGH — SUMMARY.md files exist for all 18 v0.22 plans; similar archives exist for v0.19–v0.21
- INT-03 edit scope: MEDIUM — ambiguity about "inline phase references" vs traceability table (see Open Questions)

**Research date:** 2026-03-29
**Valid until:** Indefinite — this is a static documentation correction phase with no external dependencies
