# Phase 23: Fix Wireframe Filename Convention & Final Tech Debt — Research

**Researched:** 2026-03-15
**Domain:** Markdown workflow files (PDE skills) + planning artifact metadata
**Confidence:** HIGH — all findings come from direct inspection of the live files in this repository

---

## Summary

Phase 23 is a pure fix-and-cleanup phase with no new libraries, no new infrastructure, and no architectural decisions to make. Every change target is fully mapped by the v1.1 milestone audit (`v1.1-MILESTONE-AUDIT.md`). There are two categories of work: (1) one HIGH-severity integration bug in `workflows/wireframe.md` that breaks the full pipeline, and (2) four LOW-severity metadata items in planning artifacts.

The integration bug (WIRE-01) is a filename prefix mismatch. `wireframe.md` Step 5b writes screen files as `{slug}.html` (e.g., `login.html`). `iterate.md` Globs exclusively for `WFR-{slug}*.html` (e.g., `WFR-login*.html`). Because the prefix never matches, `/pde:iterate` always halts with a "no wireframe found" error when run after `/pde:wireframe`. The fix is to add the `WFR-` prefix to all filename references in `wireframe.md`. The iterate.md file is already correct — do not touch it.

The four metadata items are documentation-only edits: updating two VALIDATION.md `status` fields from `draft` to `complete`, updating one SUMMARY frontmatter `requirements-completed` array, and updating one VALIDATION.md `nyquist_compliant` field. None of these require code changes.

**Primary recommendation:** Fix wireframe.md first (it is the blocking integration gap). Fix metadata items in a single follow-on task. Produce the Phase 23 VALIDATION.md as the final deliverable.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ITR-01 | /pde:iterate applies critique findings to revise design artifacts | WIRE-01 fix enables iterate to find wireframe files via WFR- prefix Glob |
| ITR-02 | Iteration includes convergence signal — stops when issues are resolved | WIRE-01 fix unblocks the full pipeline execution path that convergence depends on |
</phase_requirements>

---

## Standard Stack

This is a PDE project. There are no npm packages, build tools, or external libraries. The entire "stack" is:

### Core
| Component | Location | Purpose |
|-----------|----------|---------|
| `workflows/wireframe.md` | `workflows/wireframe.md` | The workflow instruction file Claude follows to run `/pde:wireframe` |
| `workflows/iterate.md` | `workflows/iterate.md` | The workflow instruction file Claude follows to run `/pde:iterate` |
| Planning artifact metadata | `.planning/phases/*/` | VALIDATION.md and SUMMARY.md files that track phase compliance |

### Supporting
| Component | Location | Purpose |
|-----------|----------|---------|
| `v1.1-MILESTONE-AUDIT.md` | `.planning/v1.1-MILESTONE-AUDIT.md` | Authoritative record of all gaps and tech debt items this phase resolves |
| `bin/lib/design.cjs --self-test` | Existing | Self-test suite for pde-tools (no changes needed — no code is being modified) |

**Installation:** None required.

---

## Architecture Patterns

This project's "architecture" for workflow files is: markdown instruction documents that Claude follows as step-by-step procedures. Edits to these files change what Claude does at runtime. There is no compilation, no transpilation, no test runner beyond grep assertions on file content.

### Pattern 1: Filename Reference Consistency

**What:** All references to a generated artifact use the same filename template string throughout the workflow file. In `wireframe.md`, the filename template `{slug}.html` appears in 7 locations across dry-run output (line 153), in-screen nav links (line 374), the write step (line 477), the display log (line 479), the index.html list items (line 513), the `<output>` section (line 699), and the `<purpose>` section (line 2 implicitly via "one self-contained HTML file per screen"). All must change consistently.

**When to use:** Every time a generated filename is referenced more than once in a workflow, update all instances atomically. Partial updates leave the workflow in a self-contradictory state.

**Exact lines to change in wireframe.md:**
- Line 153: `{slug}.html` → `WFR-{slug}.html` (dry-run output)
- Line 374: `<a href="{slug}.html">` → `<a href="WFR-{slug}.html">` (in-screen nav)
- Line 477: `.planning/design/ux/wireframes/{slug}.html` → `.planning/design/ux/wireframes/WFR-{slug}.html` (write target)
- Line 479: display log `{slug}.html` → `WFR-{slug}.html`
- Line 513: `<a href="{slug}.html">` → `<a href="WFR-{slug}.html">` (index.html list item)
- Line 699: `{slug}.html` → `WFR-{slug}.html` (output section)

**Lines that do NOT need changing in wireframe.md:**
- Line 110: Glob pattern `*.html` (excluding index.html) — this is a wildcard; it matches both old and new naming
- Line 114: directory reference only — no filename
- Line 624: manifest-update path `.planning/design/ux/wireframes/` — this is a directory path, intentionally not a file path
- Lines 562, 614: DESIGN-STATE table entries use `WFR-wireframes/` (directory entry code, not a filename) — already correct

**Pattern 2: Metadata-Only Edit Pattern**

**What:** VALIDATION.md and SUMMARY.md files use YAML frontmatter with specific field names. Editing a field value is a one-line change using the Edit tool with exact string match on the field line.

**When to use:** All 4 tech debt metadata items.

**Exact changes required:**

1. `.planning/phases/13.2-manifest-top-level-nyquist-cleanup/13.2-01-SUMMARY.md`
   - Current: `requirements-completed: []`
   - Target: `requirements-completed: [INFRA-04, BRF-02]`
   - Evidence: SUMMARY body at line 23 says "Requirements Closed: INFRA-04, BRF-02" — the frontmatter was never synced

2. `.planning/phases/14-design-system-pde-system/14-VALIDATION.md`
   - Current: `status: draft` (line 3)
   - Target: `status: complete`
   - Evidence: `nyquist_compliant: true` already set; `wave_0_complete: true` already set; "Approval: complete (Phase 15.1-02)" is in the file — only `status` field was not updated

3. `.planning/phases/15.1-fix-integration-gaps-tech-debt/15.1-VALIDATION.md`
   - Current: `status: draft` (line 3)
   - Target: `status: complete`
   - Evidence: same as Phase 14 — `nyquist_compliant: true`, `wave_0_complete: true`, "Approval: complete (Phase 15.1-02)" already present

4. `.planning/phases/22-nyquist-compliance-tech-debt-cleanup/22-VALIDATION.md`
   - Current: `nyquist_compliant: false` (line 5), `status: draft` (line 3), `wave_0_complete: false` (line 6)
   - Target: `nyquist_compliant: true`, `status: complete`, `wave_0_complete: true`
   - Also required: all checklist items `[ ]` → `[x]`, `**Approval:** pending` → `**Approval:** complete -- 2026-03-15`
   - Evidence: Phase 22 executed successfully (13/13 compliance achieved, 5 VALIDATION.md files updated, handoff.md corrected) — the VALIDATION.md was simply never self-signed-off

### Recommended Project Structure (no changes)

The directory layout is unchanged — this phase only edits existing files.

### Anti-Patterns to Avoid

- **Changing iterate.md:** It is already correct. Its WFR- prefix Globs are the authoritative convention. Only wireframe.md needs to change to match.
- **Changing the manifest path in wireframe.md Step 7c:** The manifest registers the wireframes directory (`.planning/design/ux/wireframes/`), not individual files. The directory path is already correct.
- **Changing the Glob in wireframe.md Step 2d:** `*.html` (excluding index.html) is a wildcard that will correctly detect `WFR-login.html` without modification.
- **Touching the `<output>` section of iterate.md:** The output section already correctly shows `WFR-{screen}-v{N}.html` and `WFR-{screen}.html`. Leave it.
- **Adding a Validation Audit appendix without all checklist items green first:** The Nyquist sign-off pattern requires all sign-off checklist items `[x]` before setting `nyquist_compliant: true`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Finding all {slug}.html occurrences | Don't grep-and-sed manually | Use the Read tool to load the full file, identify line numbers, use Edit tool for exact-string replacements |
| Verifying changes after edit | Don't re-read the whole file | Use grep bash commands as acceptance criteria per task |
| Nyquist sign-off on Phase 23 itself | Don't create a bespoke sign-off | Follow the established Nyquist pattern: frontmatter flags + checklist all [x] + Approval line + Validation Audit appendix |

**Key insight:** Every fix in this phase is a targeted string replacement in a known file at a known location. The research has pre-identified every line that needs changing. No discovery work is needed during planning or execution.

---

## Common Pitfalls

### Pitfall 1: Partial Filename Update in wireframe.md

**What goes wrong:** The `{slug}.html` template string appears in 6 distinct locations across wireframe.md. Updating only the write step (line 477) but missing the index.html list items (line 513) or the in-screen nav links (line 374) leaves inconsistent behavior: files are written as `WFR-login.html` but index.html links to `login.html`, breaking navigation.

**Why it happens:** Different sections of the workflow serve different functions (dry-run display, generation, navigation, index, output docs) and are visually separated by many lines. Easy to miss sections.

**How to avoid:** Use the complete list of 6 locations from the Architecture Patterns section above. After editing, grep for remaining `{slug}.html` occurrences (excluding lines that are already correct wildcards) as a verification step.

**Warning signs:** `grep '{slug}\.html' workflows/wireframe.md` returns any hits after the fix is complete.

### Pitfall 2: Incomplete Phase 22 VALIDATION.md Sign-Off

**What goes wrong:** Setting only `nyquist_compliant: true` in the frontmatter without also completing the checklist `[ ]` items and the Approval line. The Nyquist pattern requires all three components.

**Why it happens:** The sign-off pattern has three parts (frontmatter, checklist, approval) and it's easy to update the frontmatter flag while leaving the body stale.

**How to avoid:** Apply the full sign-off pattern established in Phase 22:
1. Frontmatter: `status: complete`, `nyquist_compliant: true`, `wave_0_complete: true`
2. Checklist: all `[ ]` → `[x]` (6 items)
3. Approval line: `**Approval:** complete -- 2026-03-15`
4. Append Validation Audit appendix section

The Phase 22 tasks that sign-off on phases 16–21 are the canonical examples of this pattern.

### Pitfall 3: Wrong File for 13.2 Metadata Fix

**What goes wrong:** Editing `13.2-VALIDATION.md` instead of `13.2-01-SUMMARY.md`. The tech debt item is in the SUMMARY frontmatter, not the VALIDATION file. The VALIDATION.md for Phase 13.2 is already `status: complete` and `nyquist_compliant: true` — it does not need touching.

**Why it happens:** The audit entry says "Phase 13.2" which has both a VALIDATION.md and a SUMMARY.md. The specific field `requirements-completed` only exists in SUMMARY files.

**How to avoid:** The target file is specifically `.planning/phases/13.2-manifest-top-level-nyquist-cleanup/13.2-01-SUMMARY.md` (the plan 01 summary, not the validation strategy).

### Pitfall 4: Breaking Existing Wireframe Files

**What goes wrong:** If any wireframe HTML files were generated by the old convention (e.g., `login.html`), they will be orphaned. The phase description does not mention renaming existing files — only fixing the workflow for future runs.

**Why it happens:** The fix is prospective. The audit notes the pipeline is broken, not that old files need migration.

**How to avoid:** This phase only edits the workflow markdown file. Do not rename or delete any `.html` files that may exist in `.planning/design/ux/wireframes/`. If the user has existing wireframe artifacts, they will need to re-run `/pde:wireframe --force` after this fix to regenerate with the correct naming. This is expected and acceptable behavior (documented in output summary for the phase).

---

## Code Examples

All changes in this phase are string replacements in markdown files. The "code" is markdown text.

### wireframe.md Step 5b (write target) — Current vs Fixed

Current (line 477):
```
`.planning/design/ux/wireframes/{slug}.html`
```

Fixed:
```
`.planning/design/ux/wireframes/WFR-{slug}.html`
```

### wireframe.md Step 4c nav links — Current vs Fixed

Current (line 374):
```html
{  <a href="{slug}.html">{Screen Label}</a> for each existing screen}
```

Fixed:
```html
{  <a href="WFR-{slug}.html">{Screen Label}</a> for each existing screen}
```

### wireframe.md index.html list items — Current vs Fixed

Current (line 513):
```html
{  <li><a href="{slug}.html">{Screen Label}</a> <span class="fidelity-tag">{FIDELITY}</span> <span class="badge">{journeyName} — {persona}</span></li>}
```

Fixed:
```html
{  <li><a href="WFR-{slug}.html">{Screen Label}</a> <span class="fidelity-tag">{FIDELITY}</span> <span class="badge">{journeyName} — {persona}</span></li>}
```

### 13.2-01-SUMMARY.md frontmatter — Current vs Fixed

Current (line 23):
```yaml
requirements-completed: []
```

Fixed:
```yaml
requirements-completed: [INFRA-04, BRF-02]
```

### Phase 14 VALIDATION.md frontmatter — Current vs Fixed

Current:
```yaml
status: draft
```

Fixed:
```yaml
status: complete
```

### Phase 22 VALIDATION.md — Full sign-off pattern

Frontmatter changes:
```yaml
status: complete
nyquist_compliant: true
wave_0_complete: true
```

Checklist (body):
```markdown
- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter
```

Approval line:
```markdown
**Approval:** complete -- 2026-03-15
```

Validation Audit appendix (append after approval):
```markdown
---

## Validation Audit 2026-03-15

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 5 tasks have automated grep verification. Phase executed successfully: 5 VALIDATION.md files updated to Nyquist compliant, handoff.md Step 2b corrected. No gaps to fill.
```

---

## State of the Art

This phase has no evolving technology considerations. All changes are against static markdown files in a stable codebase.

| Item | Current State | Required State |
|------|---------------|---------------|
| wireframe.md filename convention | `{slug}.html` (6 locations) | `WFR-{slug}.html` (same 6 locations) |
| 13.2-01-SUMMARY `requirements-completed` | `[]` | `[INFRA-04, BRF-02]` |
| Phase 14 VALIDATION `status` | `draft` | `complete` |
| Phase 15.1 VALIDATION `status` | `draft` | `complete` |
| Phase 22 VALIDATION `nyquist_compliant` | `false` | `true` |
| Phase 22 VALIDATION `status` | `draft` | `complete` |
| Phase 22 VALIDATION sign-off checklist | all `[ ]` | all `[x]` |

---

## Open Questions

None. All change targets are fully identified with exact file paths and line numbers. No ambiguity remains.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bash grep assertions (no test runner — documentation-only changes) |
| Config file | none |
| Quick run command | `grep 'WFR-{slug}' workflows/wireframe.md \| wc -l` (expect 6) |
| Full suite command | `grep '{slug}\.html' workflows/wireframe.md \| wc -l` (expect 0 after fix) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ITR-01 | iterate finds wireframe files via WFR-{slug}*.html Glob | structural | `grep 'WFR-{slug}' workflows/wireframe.md` (expect 6+ hits) | ✅ existing |
| ITR-02 | convergence signal unblocked (depends on ITR-01) | structural | same as ITR-01 | ✅ existing |
| SC-meta-1 | 13.2 SUMMARY requirements-completed populated | structural | `grep 'INFRA-04' .planning/phases/13.2-manifest-top-level-nyquist-cleanup/13.2-01-SUMMARY.md` | ✅ existing |
| SC-meta-2 | Phase 14 VALIDATION status complete | structural | `grep 'status: complete' .planning/phases/14-design-system-pde-system/14-VALIDATION.md` | ✅ existing |
| SC-meta-3 | Phase 15.1 VALIDATION status complete | structural | `grep 'status: complete' .planning/phases/15.1-fix-integration-gaps-tech-debt/15.1-VALIDATION.md` | ✅ existing |
| SC-meta-4 | Phase 22 VALIDATION nyquist_compliant true | structural | `grep 'nyquist_compliant: true' .planning/phases/22-nyquist-compliance-tech-debt-cleanup/22-VALIDATION.md` | ✅ existing |

### Sampling Rate

- **Per task commit:** Run the task's specific grep verification (< 2 seconds)
- **Per wave merge:** Run full verification suite: all 6 grep commands above
- **Phase gate:** All 6 grep commands green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure (bash grep assertions on file content) covers all phase requirements. No new test files, frameworks, or fixtures are needed.

---

## Sources

### Primary (HIGH confidence)

All findings from direct file inspection in this repository:

- `workflows/wireframe.md` — inspected all 8 occurrences of `{slug}.html`; 6 need prefix added, 2 are directory references or wildcards that are already correct
- `workflows/iterate.md` — confirmed WFR- prefix Glob pattern at lines 111, 138, 143, 145, 293; confirmed no changes needed
- `.planning/v1.1-MILESTONE-AUDIT.md` — authoritative source for all 4 tech debt items and WIRE-01 description
- `.planning/phases/13.2-manifest-top-level-nyquist-cleanup/13.2-01-SUMMARY.md` — confirmed `requirements-completed: []` in frontmatter; body lists INFRA-04, BRF-02 as closed
- `.planning/phases/14-design-system-pde-system/14-VALIDATION.md` — confirmed `status: draft`, `nyquist_compliant: true`, approval line present
- `.planning/phases/15.1-fix-integration-gaps-tech-debt/15.1-VALIDATION.md` — confirmed `status: draft`, `nyquist_compliant: true`, approval line present
- `.planning/phases/22-nyquist-compliance-tech-debt-cleanup/22-VALIDATION.md` — confirmed `nyquist_compliant: false`, `status: draft`, checklist all `[ ]`
- `.planning/phases/22-nyquist-compliance-tech-debt-cleanup/22-01-SUMMARY.md` — confirmed Phase 22 executed fully and successfully

### Secondary (MEDIUM confidence)

None applicable — this is a closed-system fix with no external dependencies.

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Change targets: HIGH — every file and line is identified from direct inspection
- Fix correctness: HIGH — iterate.md is the authoritative convention; wireframe.md must match it
- Scope completeness: HIGH — v1.1-MILESTONE-AUDIT.md is the definitive gap list; all 5 items are accounted for (1 WIRE-01 + 4 tech debt)

**Research date:** 2026-03-15
**Valid until:** Indefinite — static markdown files, no external dependencies
