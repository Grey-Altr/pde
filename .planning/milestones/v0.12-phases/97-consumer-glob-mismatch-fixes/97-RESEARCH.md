# Phase 97: Consumer Glob Mismatch Fixes — Research

**Researched:** 2026-03-22
**Domain:** Workflow glob patterns — producer/consumer filename consistency
**Confidence:** HIGH — all findings verified by direct file inspection at exact line numbers

---

## Summary

Phase 97 closes the 5 remaining glob mismatches between producer and consumer workflows in PDE v0.12. All gaps were discovered by the v0.12 milestone audit after Phase 96 and documented in `v0.12-MILESTONE-AUDIT.md` as GAP-1 through GAP-5. The root cause is consistent: artifact filenames were finalized in producer workflows (wireframe.md, flows.md) but the consumers (deploy.md, handoff.md, critique.md) each independently guessed wrong filenames. The fix is always on the consumer side — producers are correct.

The most critical gap is GAP-1: `deploy.md` globs `STR-stripe-pricing-v*.md` (wrong extension — `.md` instead of `.json`), which causes the entire Deploy E2E flow to HALT at Step 2/6 before any scaffold is written. This makes LAUNCH-02 and DEPLOY-03 unsatisfied despite the STR artifact being correctly written by `wireframe.md`. The remaining 4 gaps cause degraded (not halted) behavior: LKT manifest shows 3 artifacts as "missing", investor OTR is silently skipped, CNT calendar loses GTM channel priorities, and BIZ-3 pricing perspective reads no STR data.

The fix pattern is identical to Phase 95's OTR and BTH glob fixes: edit the consumer file at the exact line, change only the glob pattern string, update the companion error message if present. No new functions, no new blocks, no schema changes. The current Nyquist test suite (235/235 PASS) has no assertions that lock in the wrong glob strings — the tests check structural behavior (presence of artifact codes, section headers, logic gates) not the glob strings themselves. One test (`test-handoff-launch-kit.cjs` line 119-122) checks `DPD_AVAILABLE` or `DPD-pitch-deck` which remains satisfied after the fix.

**Primary recommendation:** Fix all 5 globs in a single plan (97-01-PLAN.md). All 5 are line-level edits across 3 files and are independent of each other.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAUNCH-02 | STR artifact consumed by deploy.md correctly (Stripe preflight reaches Gate 2) | Fix GAP-1: deploy.md line 114 — change `.md` to `.json` extension |
| DEPLOY-03 | Stripe config scaffold generated (Gate 2 reachable) | Depends directly on LAUNCH-02 fix; no other change needed |
| KIT-01 | LKT manifest shows STR/DPD/GTM as "generated" not "missing" | Fix GAP-2 (handoff.md:607) and GAP-3 (handoff.md:608) and GAP-4 (handoff.md:604) |
| KIT-02 | CNT calendar gets GTM channel priorities | Fix GAP-4: handoff.md line 604 — wrong GTM stem corrected |
| KIT-03 | Investor OTR sequence includes pitch deck gate | Fix GAP-3: handoff.md line 608 — DPD stem missing -outline suffix |
| OPS-02 | GTM artifact discoverable by handoff.md | Fix GAP-4: handoff.md line 604 — GTM-gtm-flow → GTM-channel-flow |
| QUAL-01 | BIZ-3 pricing perspective reads STR data in critique.md | Fix GAP-5: critique.md line 765 — extra -config removed from stem |
</phase_requirements>

---

## Affected Files

Exact files and lines requiring modification:

| File | Line | Current (wrong) | Correct | Gap |
|------|------|-----------------|---------|-----|
| `workflows/deploy.md` | 114 | `STR-stripe-pricing-v*.md` | `STR-stripe-pricing-v*.json` | GAP-1 |
| `workflows/deploy.md` | 139 | `STR-stripe-pricing-v{N}.md` (error msg) | `STR-stripe-pricing-v{N}.json` | GAP-1 |
| `workflows/handoff.md` | 604 | `GTM-gtm-flow-v*.md` | `GTM-channel-flow-v*.md` | GAP-4 |
| `workflows/handoff.md` | 607 | `STR-stripe-config-v*.md` | `STR-stripe-pricing-v*.json` | GAP-2 |
| `workflows/handoff.md` | 608 | `DPD-pitch-deck-v*.md` | `DPD-pitch-deck-outline-v*.md` | GAP-3 |
| `workflows/critique.md` | 765 | `STR-stripe-pricing-config-v*.md` | `STR-stripe-pricing-v*.json` | GAP-5 |

**Total: 6 line edits across 3 files.** No new blocks, no schema changes, no new tests.

---

## Standard Stack

No library changes. This phase edits existing workflow markdown files (`.md`) using the Edit tool. The same file editing approach used in Phase 95 applies.

**Tool used:** Edit tool (line-level string replacement)
**Pattern:** Read file context around the line, verify exact current string, replace with correct string

---

## Architecture Patterns

### Producer → Consumer Glob Convention

The canonical PDE artifact naming convention (verified from producers):

| Artifact | Producer | Correct Glob Pattern |
|----------|----------|---------------------|
| STR | `workflows/wireframe.md` | `STR-stripe-pricing-v${N}.json` |
| DPD | `workflows/wireframe.md` | `DPD-pitch-deck-outline-v${N}.md` |
| GTM | `workflows/flows.md` | `GTM-channel-flow-v${N}.md` |

**Evidence from producers (wireframe.md):**
- Line 561: `Write .planning/design/launch/STR-stripe-pricing-v${N}.json`
- Line 658: `Write .planning/design/launch/DPD-pitch-deck-outline-v${N}.md`
- Line 2313: `manifest-update STR path ".planning/design/launch/STR-stripe-pricing-v${N}.json"`
- Line 2322: `manifest-update DPD path ".planning/design/launch/DPD-pitch-deck-outline-v${N}.md"`

**Evidence from producer (flows.md):**
- Line 772: `Write GTM artifact to .planning/design/strategy/GTM-channel-flow-v{N}.md`
- Line 798: `manifest-update GTM path ".planning/design/strategy/GTM-channel-flow-v${N}.md"`

### Fix Pattern (from Phase 95)

Phase 95 used this pattern for OTR and BTH fixes:

1. Read the consumer file around the wrong glob line
2. Identify exact current string (with extension and full stem)
3. Replace with the correct string matching producer output
4. Update companion error message if the glob string appears there too
5. Verify with grep that the old string no longer appears

The same pattern applies to all 5 gaps in Phase 97.

### handoff.md Glob Context

The handoff.md globs are in a "business artifact discovery" block at lines 597-609. All artifact globs in this block follow the same format: `Glob .planning/design/{dir}/{CODE}-{stem}-v*.{ext}`. After fix, line 604/607/608 will match the producer-written filenames exactly.

Note: handoff.md line 1573 contains a prose reference `DPD-pitch-deck` (not a glob) — this is in the anti-patterns section and does NOT need changing. The test at `test-handoff-launch-kit.cjs:121` checks for `DPD_AVAILABLE` or `DPD-pitch-deck`, which remains satisfied by the glob variable `DPD_PATH, DPD_AVAILABLE` on the fixed line 608.

### critique.md BIZ-3 Context

The wrong glob at `critique.md:765` is in a prose "Evaluation sources" list under BIZ-3 Pricing Psychology, not inside a bash code block. The text reads:

```
- STR artifact (`.planning/design/launch/STR-stripe-pricing-config-v*.md`) — pricing tier structure
```

The correct value is:

```
- STR artifact (`.planning/design/launch/STR-stripe-pricing-v*.json`) — pricing tier structure
```

Two fixes on this line: remove `-config` from the stem and change `.md` to `.json`.

### deploy.md STR Extension Context

The wrong glob at `deploy.md:114` is in a bash code block:

```bash
STR_FILE=$(ls .planning/design/launch/STR-stripe-pricing-v*.md 2>/dev/null | sort -V | tail -1)
```

The correct value:

```bash
STR_FILE=$(ls .planning/design/launch/STR-stripe-pricing-v*.json 2>/dev/null | sort -V | tail -1)
```

The companion error message at line 139 also says `.md` and must be updated to `.json`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Verifying fix is complete | Custom validation script | `grep -n "STR-stripe-pricing-v\*\.md" workflows/deploy.md` returns 0 lines |
| Running all tests | New test | `node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` (existing) |

---

## Common Pitfalls

### Pitfall 1: Fixing the Glob But Not the Error Message
**What goes wrong:** deploy.md line 114 is fixed to `.json` but line 139 (error message) still says `.md`. User sees the HALT message with wrong expected path.
**How to avoid:** Search for ALL occurrences of `STR-stripe-pricing-v` in deploy.md and fix every instance. Two fixes on this file.

### Pitfall 2: Fixing handoff.md STR Glob to .md Instead of .json
**What goes wrong:** handoff.md line 607 is changed to `STR-stripe-pricing-v*.md` (correct stem, wrong extension) — LKT manifest still shows STR as "missing" because the file is `.json`.
**How to avoid:** The STR artifact extension is `.json` (not `.md`) in ALL consumers: deploy.md, handoff.md, and critique.md.

### Pitfall 3: Breaking the Existing DPD Gate Test
**What goes wrong:** handoff.md line 608 is changed to `DPD-pitch-deck-outline-v*.md` but the anti-patterns section at line 1573 is also edited, breaking the test at `test-handoff-launch-kit.cjs:121` which checks for `DPD-pitch-deck`.
**How to avoid:** Do NOT edit line 1573. Only edit line 608. The test checks `DPD_AVAILABLE || DPD-pitch-deck` — the glob line at 608 still contains `DPD-pitch-deck-outline` which satisfies `DPD-pitch-deck` substring check.

### Pitfall 4: Editing Wrong deploy.md File
**What goes wrong:** There are multiple `deploy.md` files in worktree directories under `.claude/worktrees/`. Editing the worktree copy does nothing.
**How to avoid:** Always edit `workflows/deploy.md` at the project root, confirmed by glob: the canonical file is at `.../Platform Development Engine/workflows/deploy.md`.

---

## Code Examples

### GAP-1 Fix — deploy.md line 114

**Current (wrong):**
```bash
STR_FILE=$(ls .planning/design/launch/STR-stripe-pricing-v*.md 2>/dev/null | sort -V | tail -1)
```

**Fixed:**
```bash
STR_FILE=$(ls .planning/design/launch/STR-stripe-pricing-v*.json 2>/dev/null | sort -V | tail -1)
```

### GAP-1 Companion Fix — deploy.md line 139

**Current (wrong):**
```
Expected: .planning/design/launch/STR-stripe-pricing-v{N}.md
```

**Fixed:**
```
Expected: .planning/design/launch/STR-stripe-pricing-v{N}.json
```

### GAP-4 Fix — handoff.md line 604

**Current (wrong):**
```
- GTM: Glob `.planning/design/strategy/GTM-gtm-flow-v*.md` -> GTM_PATH, GTM_AVAILABLE
```

**Fixed:**
```
- GTM: Glob `.planning/design/strategy/GTM-channel-flow-v*.md` -> GTM_PATH, GTM_AVAILABLE
```

### GAP-2 Fix — handoff.md line 607

**Current (wrong):**
```
- STR: Glob `.planning/design/launch/STR-stripe-config-v*.md` -> STR_PATH, STR_AVAILABLE
```

**Fixed:**
```
- STR: Glob `.planning/design/launch/STR-stripe-pricing-v*.json` -> STR_PATH, STR_AVAILABLE
```

### GAP-3 Fix — handoff.md line 608

**Current (wrong):**
```
- DPD: Glob `.planning/design/launch/DPD-pitch-deck-v*.md` -> DPD_PATH, DPD_AVAILABLE
```

**Fixed:**
```
- DPD: Glob `.planning/design/launch/DPD-pitch-deck-outline-v*.md` -> DPD_PATH, DPD_AVAILABLE
```

### GAP-5 Fix — critique.md line 765

**Current (wrong):**
```
- STR artifact (`.planning/design/launch/STR-stripe-pricing-config-v*.md`) — pricing tier structure
```

**Fixed:**
```
- STR artifact (`.planning/design/launch/STR-stripe-pricing-v*.json`) — pricing tier structure
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (no additional install needed) |
| Config file | none — tests run directly via `node --test` |
| Quick run command | `node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` |
| Full suite command | `node --test .planning/phases/84-foundation/tests/test-foundation.cjs .planning/phases/85-brief-extensions-detection/tests/test-brief-detection.cjs .planning/phases/85-brief-extensions-detection/tests/test-brief-artifacts.cjs .planning/phases/86-competitive-opportunity-extensions/tests/test-competitive-mls.cjs .planning/phases/86-competitive-opportunity-extensions/tests/test-opportunity-rice.cjs .planning/phases/87-flows-stage/tests/test-flows-sbp.cjs .planning/phases/88-brand-system/tests/test-brand-system.cjs .planning/phases/89-wireframe-stage-launch-artifacts/tests/test-wireframe-launch.cjs .planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs .planning/phases/91-handoff-launch-kit-assembly/tests/test-handoff-launch-kit.cjs .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs .planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAUNCH-02 | STR glob matches .json producer output | structural | `node --test .planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` | ✅ (existing) |
| DEPLOY-03 | Gate 2 reachable after STR glob fix | structural | same as above | ✅ (existing) |
| KIT-01 | LKT discovery globs match producer filenames | structural | `node --test .planning/phases/91-handoff-launch-kit-assembly/tests/test-handoff-launch-kit.cjs` | ✅ (existing) |
| KIT-02 | GTM glob in handoff.md corrected | structural | same as KIT-01 | ✅ (existing) |
| KIT-03 | DPD glob includes -outline suffix | structural | same as KIT-01 | ✅ (existing) |
| OPS-02 | GTM-channel-flow stem correct in consumer | structural | same as KIT-01 | ✅ (existing) |
| QUAL-01 | critique.md BIZ-3 STR glob corrected | structural | `node --test .planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs` | ✅ (existing) |

**Important:** Existing tests do NOT assert the wrong glob strings. All 235 tests pass today and will continue to pass after the fix. No new tests are required unless the planner chooses to add cross-file glob consistency assertions as new Nyquist tests (optional extension).

### Sampling Rate

- **Per task commit:** `node --test .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs`
- **Per wave merge:** Full suite (all 13 test files, 235 tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. No new test files needed.

---

## Open Questions

1. **Should new cross-file glob consistency tests be added?**
   - What we know: Current tests pass because they check structural behavior (artifact codes, section headers) not glob string literals
   - What's unclear: Whether a new test asserting e.g. `handoff.md must contain 'STR-stripe-pricing-v*.json'` adds value or is redundant with E2E verification
   - Recommendation: Skip new tests for this phase — the existing coverage is sufficient and the milestone audit confirmed the issue. A future "glob consistency" test suite could be a Phase 98 initiative if desired.

2. **Should the handoff.md prose reference at line 1573 (`DPD-pitch-deck`) also be updated?**
   - What we know: Line 1573 is the anti-patterns section: `If DPD-pitch-deck is not found via Glob` — this is documentation, not a glob
   - What's unclear: Whether updating to `DPD-pitch-deck-outline` is more accurate
   - Recommendation: Update line 1573 for documentation accuracy (low-risk cosmetic fix), but the test at line 121 of `test-handoff-launch-kit.cjs` checks for `DPD-pitch-deck` (substring), not the full stem — so it passes regardless.

---

## Sources

### Primary (HIGH confidence)

- Direct file inspection: `workflows/deploy.md` lines 114, 139 — exact current wrong glob and error message
- Direct file inspection: `workflows/handoff.md` lines 604, 607, 608 — exact current wrong globs
- Direct file inspection: `workflows/critique.md` line 765 — exact current wrong glob
- Direct file inspection: `workflows/wireframe.md` lines 561, 658, 2313, 2324 — exact producer output filenames
- Direct file inspection: `workflows/flows.md` lines 772, 798 — exact GTM producer output filename
- Direct file inspection: `.planning/v0.12-MILESTONE-AUDIT.md` — gap definitions, line number references, requirement mappings

### Secondary (MEDIUM confidence)

- `.planning/phases/95-integration-wiring-fixes/95-RESEARCH.md` — establishes fix pattern for glob corrections (OTR and BTH precedents)
- `.planning/STATE.md` decisions — `[Phase 95-01]: OTR artifact filename is OTR-outreach-sequences-v*.md matching handoff.md producer output` confirms consumer-must-match-producer convention

---

## Metadata

**Confidence breakdown:**
- Exact wrong lines: HIGH — verified by direct grep and Read at exact line numbers
- Correct replacement strings: HIGH — verified from producer workflow file writes and manifest-update calls
- Test impact: HIGH — all 235 tests read and checked for assertions on the affected strings
- Fix completeness: HIGH — 6 edits across 3 files fully enumerated

**Research date:** 2026-03-22
**Valid until:** Indefinite — workflow files are stable; no library versions involved
