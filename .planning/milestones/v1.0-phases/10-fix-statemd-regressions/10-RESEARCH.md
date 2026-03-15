# Phase 10: Fix STATE.md Regressions - Research

**Researched:** 2026-03-15
**Domain:** Node.js file mutation, YAML frontmatter, STATE.md structure
**Confidence:** HIGH

## Summary

Phase 10 is a targeted bug-fix phase with three distinct problems, all confined to a single file (`.planning/STATE.md`) and a narrow set of code paths. The regression root cause is fully understood: the GSD orchestration layer (`~/.claude/get-shit-done/bin/gsd-tools.cjs`) calls its own `state record-session` subcommand, which invokes GSD's `buildStateFrontmatter` (line 640: `const fm = { gsd_state_version: '1.0' }`), overwriting PDE's `pde_state_version` every time a session is recorded. PDE's own toolchain (`bin/lib/state.cjs`) is already correct — `pde_state_version` is written at line 640.

The body narrative is stale because STATE.md was last substantially updated during Phase 4 work. The "Phase 4 of 8" text and "Total plans completed: 0" performance metrics are direct file content that must be updated with targeted edits. The `progress.percent` field (83%) is taken verbatim from a `Progress: [████████░░] 83%` line in the body — `buildStateFrontmatter` regex-extracts it (line 616-618) and stores it in frontmatter; it does NOT compute percent from the disk-counted plans/summaries ratio.

**Primary recommendation:** Fix STATE.md in one targeted pass: (1) correct frontmatter key, (2) update body narrative, (3) fix progress bar and percent, then patch `gsd-tools.cjs` `buildStateFrontmatter` at line 640 to write `pde_state_version` instead of `gsd_state_version` so the fix survives subsequent GSD-layer writes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Root cause: GSD orchestration layer (`$HOME/.claude/get-shit-done/bin/gsd-tools.cjs`) writes `gsd_state_version` when it updates STATE.md, overwriting Phase 7's fix to `pde_state_version`
- PDE's own `bin/lib/state.cjs` line 640 already writes `pde_state_version: '1.0'` — PDE toolchain is correct
- Fix: correct STATE.md frontmatter AND ensure subsequent state writes from GSD-layer workflows don't regress it
- State-writing code (`writeStateMd` → `buildStateFrontmatter`) always builds fresh frontmatter with `pde_state_version` — the regression comes from the GSD orchestration layer, not PDE code
- STATE.md body currently says "Phase 4 of 8 (Workflow Engine) — COMPLETE" and has stale performance metrics
- Update body to reflect actual current state: 9 phases complete, Phases 10-11 are gap closure
- Targeted edits to fix obviously wrong parts — not a full regeneration
- `progress.percent` shows 83% but all 21 completed plans are done
- ROADMAP shows 0/0 plans for Phases 10-11 (not yet planned)
- Progress should reflect completed plans vs total plans (21/21 = 100% of planned work)
- Phases 10-11 having 0 plans is expected — they'll get plans when `/pde:plan-phase` runs

### Claude's Discretion
- Exact mechanism for preventing GSD-layer regression (post-write hook, pre-read sanitizer, or direct GSD-layer patch)
- Exact body narrative wording
- Whether to update performance metrics table or leave it as historical record

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLUG-04 | Zero GSD references in any user-visible output or error message | `gsd_state_version` in STATE.md frontmatter is machine-readable state, but the key name itself is a GSD reference; correcting it closes this gap for the state layer |
| BRAND-01 | Zero occurrences of "gsd" or "GSD" in any source file (case-insensitive grep clean) | `gsd-tools.cjs` line 640 has `gsd_state_version` — patching it closes the last known live GSD string in the GSD layer that touches this project |
| WORK-04 | STATE.md tracks current phase, progress, and project memory | STATE.md body is stale (Phase 4 text, zero metrics), and percent is wrong (83% vs 100%) — fixing body narrative and progress fields directly satisfies this requirement |
</phase_requirements>

## Standard Stack

### Core
| Tool | Source | Purpose | Why Standard |
|------|--------|---------|--------------|
| Node.js `fs.readFileSync` / `fs.writeFileSync` | Already used in codebase | Read and write STATE.md | All existing state operations use this pattern |
| Regex string replacement | Already used in `stateReplaceField` | Targeted body field edits | Existing helper already handles bold and plain formats |
| `reconstructFrontmatter` (bin/lib/frontmatter.cjs) | Already used | Serialize corrected frontmatter to YAML | The canonical serializer for all STATE.md frontmatter |

### No New Dependencies
This phase introduces zero new libraries or packages. All tools are in place.

## Architecture Patterns

### Two-Layer Write Architecture
The project has two independent state-writing code paths:

**Layer 1 — PDE toolchain** (`bin/lib/state.cjs` → `writeStateMd` → `syncStateFrontmatter` → `buildStateFrontmatter`)
- Called by: `pde-tools.cjs` subcommands, invoked from PDE workflows
- Already correct: writes `pde_state_version: '1.0'` at line 640
- No changes needed

**Layer 2 — GSD orchestration layer** (`~/.claude/get-shit-done/bin/gsd-tools.cjs` → GSD `lib/state.cjs` → GSD `buildStateFrontmatter`)
- Called by: GSD framework when managing this project (session recording between phases)
- Regression source: writes `gsd_state_version: '1.0'` at GSD lib/state.cjs line 640
- Requires patching to write `pde_state_version` instead

### Pattern 1: Direct File Patch for Regression Prevention
**What:** Edit one line in `~/.claude/get-shit-done/bin/lib/state.cjs` — change `gsd_state_version` to `pde_state_version` at line 640.
**When to use:** Preferred approach. Surgical, permanent, zero risk of re-regression. Affects all future GSD-layer writes to any PDE project.
**Tradeoff:** Modifies the GSD installation's shared lib file. Appropriate since this is the developer's own GSD installation used only for PDE development.

### Pattern 2: Post-Write Sanitizer Hook
**What:** A wrapper function or script that reads STATE.md after any write and replaces `gsd_state_version` with `pde_state_version` in the frontmatter.
**When to use:** If patching gsd-tools directly is not acceptable (e.g., shared GSD installation used across many projects).
**Tradeoff:** More complex, requires hook integration; not recommended given the single-developer context.

### Pattern 3: Targeted Body Edit via stateReplaceField
**What:** Use existing `stateReplaceField(content, fieldName, value)` helper for body text mutations. For lines without the expected field format, use direct regex replacement.
**When to use:** Updating "Current focus:", "Phase:", "Progress:", and other structured body fields.

### STATE.md Body Structure (Verified)
```
---
[frontmatter YAML]
---

# Project State

## Project Reference
See: .planning/PROJECT.md (updated 2026-03-14)
**Core value:** ...
**Current focus:** Phase 4 — Workflow Engine          ← STALE, fix to Phase 10 → 11 gap closure

## Current Position
Phase: 4 of 8 (Workflow Engine) — COMPLETE           ← STALE
Current Plan: 3
Total Plans in Phase: 3
Status: Phase 4 complete — ...                        ← STALE
Last activity: 2026-03-15

Progress: [████████░░] 83%                            ← STALE, fix to 100%

## Performance Metrics
**Velocity:**
- Total plans completed: 0                            ← STALE (21 completed)
...

## Accumulated Context
### Decisions
[decision log — preserve as-is, append new decisions]

### Pending Todos
None yet.

### Blockers/Concerns
[existing entries — preserve]

## Session Continuity
Last session: ...
Stopped at: ...
Resume file: ...
```

### Progress Percent Computation (Critical)
`buildStateFrontmatter` extracts `progress.percent` from the body's `Progress:` field via regex `(\d+)%`. It does NOT compute it from `completedPlans / totalPlans`. Therefore:
- Setting `progress.percent = 100` requires editing the body's progress bar line: `Progress: [████████████] 100%`
- The frontmatter `progress.total_plans: 21` and `progress.completed_plans: 21` are computed from disk (count of PLAN.md vs SUMMARY.md files in phases/) — these will be correct automatically once the body is updated and `writeStateMd` is called

### Anti-Patterns to Avoid
- **Full STATE.md regeneration:** Wipes accumulated decisions, blockers, and session history. Use targeted edits, not full overwrite.
- **Editing frontmatter directly without going through `syncStateFrontmatter`:** The frontmatter is rebuilt from body content on every write; direct frontmatter edits will be overwritten on next write.
- **Computing percent from plans/summaries ratio without updating the body:** The body's `Progress:` line is the authoritative source for `percent` in frontmatter; the frontmatter value follows the body, not the other way around.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter serialization | Custom YAML writer | `reconstructFrontmatter` (bin/lib/frontmatter.cjs) | Already tested, handles quoting edge cases |
| State field replacement | Ad-hoc regex per field | `stateReplaceField(content, field, value)` | Handles bold and plain format; already in scope |
| Progress bar string | Manual ASCII art | Simple template: `[████████████] 100%` | Consistent with existing style in STATE.md |

**Key insight:** Both write paths (`pde-tools.cjs` and `gsd-tools.cjs`) call `writeStateMd` which calls `syncStateFrontmatter`, which always rebuilds frontmatter from the body. The body is the ground truth — fix the body, and the frontmatter follows automatically on any subsequent write. Fix the GSD layer's key name, and the fix survives.

## Common Pitfalls

### Pitfall 1: Frontmatter Edited Directly Gets Overwritten
**What goes wrong:** Editor or script patches `gsd_state_version` to `pde_state_version` directly in the YAML block. On next `writeStateMd` call (from any layer), `syncStateFrontmatter` rebuilds frontmatter from scratch — the body never stored this value, so if the GSD layer's `buildStateFrontmatter` still writes `gsd_state_version`, it comes back.
**Why it happens:** `syncStateFrontmatter` always overwrites frontmatter from body-parsed values.
**How to avoid:** Patch the GSD layer's `buildStateFrontmatter` (line 640 in `~/.claude/get-shit-done/bin/lib/state.cjs`) in addition to fixing the current STATE.md content.
**Warning signs:** After `/gsd:plan-phase` runs, `gsd_state_version` reappears in STATE.md frontmatter.

### Pitfall 2: Progress Percent Not Updating
**What goes wrong:** `progress.percent` stays at 83 in frontmatter even after body edits.
**Why it happens:** The regex `(\d+)%` in `buildStateFrontmatter` (line 616-618) reads percent from the body's `Progress:` field. If the body still has `83%`, the frontmatter percent stays 83.
**How to avoid:** Edit the body's `Progress:` line to read `Progress: [████████████] 100%` before calling `writeStateMd`.
**Warning signs:** `node bin/pde-tools.cjs state json` shows `percent: 83` after edit.

### Pitfall 3: Stale Body Fields That Don't Match Body Format
**What goes wrong:** "Phase: 4 of 8" is not a `stateExtractField`-compatible format with a colon-separated key. Regex targets `Phase:` as both a section header and a field value, causing confusion.
**Why it happens:** The body uses a narrative-style section "## Current Position" with prose-like lines, not strict `Key: Value` pairs for every line.
**How to avoid:** For lines like "Phase: 4 of 8 (Workflow Engine) — COMPLETE", use direct string replacement targeting the full line, not `stateReplaceField`.
**Warning signs:** Replacement affects wrong part of document.

### Pitfall 4: Decisions and History Wiped
**What goes wrong:** STATE.md rewritten from template — 130+ lines of accumulated decisions, blockers, and session history are lost.
**Why it happens:** Temptation to regenerate STATE.md cleanly rather than do targeted edits.
**How to avoid:** Use surgical replacements of only the stale sections (Current Position block, Current focus line, Progress line, Performance Metrics velocity numbers).

## Code Examples

### Verified: GSD Layer Regression Source
```javascript
// ~/.claude/get-shit-done/bin/lib/state.cjs line 640
// THIS is what overwrites pde_state_version with gsd_state_version:
const fm = { gsd_state_version: '1.0' };

// Fix: change to:
const fm = { pde_state_version: '1.0' };
```

### Verified: PDE buildStateFrontmatter (already correct)
```javascript
// bin/lib/state.cjs line 640
const fm = { pde_state_version: '1.0' };
```

### Verified: Progress Percent Extraction
```javascript
// bin/lib/state.cjs lines 615-618
let progressPercent = null;
if (progressRaw) {
  const pctMatch = progressRaw.match(/(\d+)%/);
  if (pctMatch) progressPercent = parseInt(pctMatch[1], 10);
}
// progressRaw comes from: stateExtractField(bodyContent, 'Progress')
// which matches: "Progress: [████████░░] 83%"
```

### Verified: syncStateFrontmatter rebuilds from body every time
```javascript
// bin/lib/state.cjs lines 668-673
function syncStateFrontmatter(content, cwd) {
  const body = stripFrontmatter(content);
  const fm = buildStateFrontmatter(body, cwd);  // always fresh from body
  const yamlStr = reconstructFrontmatter(fm);
  return `---\n${yamlStr}\n---\n\n${body}`;
}
```

### Disk Plan/Summary Counting (automatic after body fix)
```javascript
// bin/lib/state.cjs lines 585-613
// Counts /-PLAN\.md$/i and /-SUMMARY\.md$/i files in each phase dir
// Current state: 21 plans, 21 summaries across phases 01-09
// Phases 10 and 11 have 0 plans/summaries — correctly excluded from count
// totalPlans = 21, completedPlans = 21 (computed automatically, no body change needed)
```

### Correct STATE.md Body Section After Fix
```markdown
**Current focus:** Phases 10-11 — Gap closure (STATE.md regressions, command reference cleanup)

## Current Position

Phase: 10 of 11 (Fix STATE.md Regressions) — IN PROGRESS
Current Plan: 1
Total Plans in Phase: 1
Status: Phase 10 executing — gap closure phases active
Last activity: 2026-03-15

Progress: [████████████] 100%
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| STATE.md frontmatter written by GSD layer with `gsd_state_version` | After patch: GSD layer writes `pde_state_version` | Regression eliminated permanently |
| Body narrative frozen at Phase 4 state | Updated to reflect 9 phases complete, gap closure active | WORK-04 satisfied |
| progress.percent: 83 (extracted from stale body) | progress.percent: 100 (body updated to reflect 21/21 plans done) | WORK-04 satisfied |

## Open Questions

1. **Should Performance Metrics velocity table be updated?**
   - What we know: Table shows "Total plans completed: 0" which is wrong; the row-by-row execution data below it is accurate history
   - What's unclear: Whether "Total plans completed" should be updated to 21, or left as historical artifact
   - Recommendation: Update "Total plans completed: 21" to correct the obvious error; leave per-phase timing rows as-is (they are historical record)

2. **Which GSD layer commands trigger the regression?**
   - What we know: `gsd-tools.cjs state record-session` is confirmed to call `writeStateMd` → GSD `buildStateFrontmatter`
   - What's unclear: Whether any other GSD-layer subcommands (e.g., `state patch`, `state update`) also write STATE.md and could re-introduce the regression
   - Recommendation: Patch GSD lib/state.cjs `buildStateFrontmatter` at line 640 (single change point) to fix all GSD-layer write paths at once

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual verification via node CLI commands |
| Config file | none (no automated test framework configured) |
| Quick run command | `node bin/pde-tools.cjs state json` |
| Full suite command | `grep -n "gsd_state_version" ~/.claude/get-shit-done/bin/lib/state.cjs .planning/STATE.md` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLUG-04 | No `gsd_state_version` key in STATE.md frontmatter | smoke | `node bin/pde-tools.cjs state json \| grep -c gsd_state_version` (expect 0) | ✅ STATE.md exists |
| BRAND-01 | Zero "gsd" strings in GSD lib/state.cjs `buildStateFrontmatter` | smoke | `grep -n "gsd_state_version" ~/.claude/get-shit-done/bin/lib/state.cjs` (expect 0) | ✅ file exists |
| WORK-04 | progress.percent = 100 in STATE.md frontmatter | smoke | `node bin/pde-tools.cjs state json \| grep percent` (expect 100) | ✅ STATE.md exists |
| WORK-04 | Body narrative reflects Phase 10 not Phase 4 | smoke | `grep "Phase: 4 of 8" .planning/STATE.md` (expect no match) | ✅ STATE.md exists |

### Sampling Rate
- **Per task commit:** `node bin/pde-tools.cjs state json`
- **Per wave merge:** `node bin/pde-tools.cjs state json && grep -c "gsd_state_version" .planning/STATE.md`
- **Phase gate:** All four smoke checks pass before `/pde:verify-work`

### Wave 0 Gaps
None — existing files cover all verification. No new test infrastructure needed.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `/Users/greyaltaer/code/projects/Platform Development Engine/bin/lib/state.cjs` — buildStateFrontmatter, syncStateFrontmatter, writeStateMd, cmdStateRecordSession
- Direct code inspection of `~/.claude/get-shit-done/bin/lib/state.cjs` — confirmed `gsd_state_version` at line 640
- Direct inspection of `.planning/STATE.md` — confirmed frontmatter key regression and stale body content

### Secondary (MEDIUM confidence)
- CONTEXT.md Phase 10 — decision log confirming root cause analysis (matches code inspection)
- ROADMAP.md progress table — confirms 9/11 phases complete, 21/21 plans complete

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Root cause: HIGH — confirmed by direct code inspection of both GSD and PDE state.cjs files
- Fix mechanism: HIGH — single-line patch to GSD lib/state.cjs line 640 is verified and sufficient
- Body edits: HIGH — STATE.md structure confirmed, fields identified precisely
- Progress percent fix: HIGH — extraction mechanism verified in code (line 616-618)

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable code, no external dependencies)
