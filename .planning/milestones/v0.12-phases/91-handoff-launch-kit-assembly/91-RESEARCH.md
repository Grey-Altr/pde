# Phase 91: Handoff — Launch Kit Assembly - Research

**Researched:** 2026-03-22
**Domain:** Workflow extension (handoff.md), business artifact assembly, email sequence spec, content calendar
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KIT-01 | `handoff.md` assembles LKT manifest artifact listing all business artifacts with paths, statuses, and deployment readiness flags | Artifact catalogue pattern established; status vocabulary and readiness flag structure defined below |
| KIT-02 | CNT artifact = 30-day pre-launch/launch/post-launch skeleton with slots from GTM channel priorities | Content calendar structure and slot taxonomy documented; GTM channel mapping defined |
| KIT-03 | OTR artifact = onboarding sequence (5-7 emails, trigger/delay/CTA, Resend-compatible) + investor outreach (3 emails, gated on pitch deck) | Resend JSON schema documented; onboarding and investor sequence structures defined |
| KIT-04 | Domain strategy notes consolidated from brief into launch kit | BRF artifact contains domain strategy section (Phase 85 BRIEF-05); extraction pattern defined |
| KIT-05 | `hasLaunchKit` coverage flag set in designCoverage after LKT creation — gates deploy stage | 20-field coverage write pattern established; insertion point in Step 7c identified |
| KIT-06 | Email sequences use structural placeholders — never specific company names or partner references | Placeholder taxonomy defined; aligns with `business-financial-disclaimer.md` pattern |
</phase_requirements>

---

## Summary

Phase 91 extends `workflows/handoff.md` with six independent IF blocks gated on `$BM == "true"`. The existing handoff workflow is a 7-step pipeline currently at 1,309 lines. Business mode steps are inserted as sub-steps using the established pattern from Phases 85–90: independent conditional blocks that compose correctly with experience mode (e.g., `business:experience` runs both BIB generation AND LKT assembly).

The critical design insight is that `handoff.md` already has a well-established coverage-flag write at Step 7c — but it currently writes only 16 fields. This phase must upgrade the Step 7c write from 16 fields to all 20 fields AND set `hasLaunchKit: true` for business mode runs. The `<purpose>` tag and Anti-Patterns section also need updating to reference the new 20-field count.

"Resend-compatible" in the context of a design handoff document (not runtime code) means: a structured spec table with fields matching the Resend API send payload schema (`from`, `to`, `subject`, `html` content, `scheduled_at` for delay timing). It is NOT React Email JSX — that is Phase 92 territory (DEPLOY-04). Phase 91 produces a human-readable spec that Phase 92 can use to scaffold actual React Email components.

**Primary recommendation:** Insert business mode as Steps 4k through 4m (sub-steps of Step 4) plus Step 5e (business LKT write) plus Steps 7b-lkt and updated 7c — independent IF blocks, never ELSE IF from experience/hardware branches. Upgrade Step 7c from 16-field to 20-field designCoverage write throughout.

---

## Standard Stack

### Core

| Component | Version/Format | Purpose | Why Standard |
|-----------|----------------|---------|--------------|
| `workflows/handoff.md` | Existing 1,309-line file | Primary workflow being extended | Established 7-step pipeline; all business phases extend existing workflows |
| `pde-tools.cjs manifest-get-top-level` | Existing CLI | Read `businessMode` and `businessTrack` from manifest | All business phases use this exact pattern |
| `pde-tools.cjs design manifest-update` | Existing CLI | Register LKT/CNT/OTR artifacts in manifest | 7-call pattern established in all prior phases |
| `pde-tools.cjs design manifest-set-top-level` | Existing CLI | Write full 20-field designCoverage object | Read-before-set pattern mandatory |
| Resend API payload schema | v1 JSON spec | Define OTR email sequence fields | Phase 92 consumes OTR spec to scaffold React Email stubs |
| Mermaid / Markdown tables | n/a | LKT manifest, CNT calendar, OTR sequence | All PDE artifacts use structured Markdown |

### Supporting

| Component | Version/Format | Purpose | When to Use |
|-----------|----------------|---------|-------------|
| `references/business-track.md` | v1.0 | Track depth thresholds for email sequence length | Email sequence depth varies by track (solo: 5, startup: 5-7+investor, leader: 7+investor+exec) |
| `references/business-financial-disclaimer.md` | v1.0 | Structural placeholder enforcement in OTR | Any OTR email content with pricing refs uses `[YOUR_X]` format |
| `references/launch-frameworks.md` | v1.0 | Lean canvas schema, GTM channel structure | CNT derives channel slots from GTM; LKT references launch frameworks |
| Glob tool | existing | Find upstream business artifacts by path pattern | All discovery steps use Glob for version-sorted artifact discovery |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate Step 4k-4m sub-steps | New Step 8 | New step would change step count from 7 to 8 — all prior phases locked at 7 steps. Sub-step pattern is the established convention |
| React Email JSX in OTR artifact | HTML spec table | React Email JSX belongs in Phase 92 (DEPLOY-04). Phase 91 OTR is a spec document, not executable code |
| 30-day calendar with specific dates | 30-day relative offsets (Day 1, Day 3, etc.) | Specific dates require knowing launch date; relative offsets are reusable and placeholder-safe |

**Installation:** No new packages. Phase 91 modifies `workflows/handoff.md` only. Tests require the existing Node.js test runner (`node --test`).

---

## Architecture Patterns

### Recommended Project Structure

```
workflows/
└── handoff.md           # Existing 1309-line file — extend in-place

.planning/design/launch/
├── LKT-launch-kit-v{N}.md    # KIT-01: manifest artifact
├── CNT-content-calendar-v{N}.md  # KIT-02: 30-day calendar
└── OTR-outreach-sequences-v{N}.md # KIT-03: email sequences + domain strategy

.planning/phases/91-handoff-launch-kit-assembly/
└── tests/
    └── test-handoff-launch-kit.cjs  # Nyquist structural tests
```

### Pattern 1: Business Mode Detection (Cache at Step 4 entry)

Use exactly the same pattern as flows.md, wireframe.md, and critique.md. Detection is cached once at the start of the synthesis step for reuse in all sub-steps.

```bash
# Business mode detection (cached for Steps 4k, 4l, 4m, 5e, 7b-lkt, and 7c)
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
if [[ "$BM" == @file:* ]]; then BM=$(cat "${BM#@file:}"); fi
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
if [[ "$BT" == @file:* ]]; then BT=$(cat "${BT#@file:}"); fi
```

Cache `$BM` and `$BT` for use in Steps 4k, 4l, 4m, 5e, 7b-lkt, and 7c.

### Pattern 2: Independent IF Block (Not ELSE IF)

All business mode steps are INDEPENDENT IF checks. They must NOT be ELSE IF branches from experience or hardware gates. This allows `business:experience` and `business:hardware` compositions to run both paths.

```
IF `$BM != "true"`: skip Step 4k entirely. Set LKT_GENERATED=false.
IF `$BM == "true"`:
  ... generate LKT content ...
  Set LKT_GENERATED=true.
```

Correct placement: Step 4k follows Step 4j (pitch deck) at the end of the synthesis step, before Step 5. The existing `#### 4i. Apply productType conditional for hardware sections` runs for all products — business sub-steps come AFTER all product-type conditionals have run.

### Pattern 3: LKT Manifest Artifact Structure

The LKT manifest is a catalogue document. It reads all upstream business artifact paths (by Glob), records their generation status, and flags deployment readiness.

```markdown
---
artifact: LKT-launch-kit
version: v{N}
skill: /pde:handoff (LKT)
businessTrack: {$BT}
generatedAt: {ISO date}
---

# Launch Kit Manifest: {project_name}

## Artifact Registry

| Code | Artifact Name | Path | Status | Deployment Ready |
|------|--------------|------|--------|-----------------|
| BTH | Business Thesis | .planning/design/strategy/BTH-business-thesis-v{N}.md | generated | yes |
| LCV | Lean Canvas | .planning/design/strategy/LCV-lean-canvas-v{N}.md | generated | yes |
| CMP | Competitive Analysis | .planning/design/strategy/CMP-competitive-v{N}.md | generated | yes |
| MLS | Market Landscape | .planning/design/strategy/MLS-market-landscape-v{N}.md | generated | yes |
| OPP | Opportunity Scoring | .planning/design/strategy/OPP-opportunity-v{N}.md | generated | yes |
| SBP | Service Blueprint | .planning/design/strategy/SBP-service-blueprint-v{N}.md | generated | yes |
| GTM | Go-to-Market | .planning/design/strategy/GTM-gtm-flow-v{N}.md | generated | yes |
| MKT | Brand System | .planning/design/strategy/MKT-brand-system-v{N}.md | generated | yes |
| LDP | Landing Page Spec | .planning/design/launch/LDP-landing-page-v{N}.md | generated | yes |
| STR | Stripe Config | .planning/design/launch/STR-stripe-config-v{N}.md | generated | yes |
| DPD | Pitch Deck | .planning/design/launch/DPD-pitch-deck-v{N}.md | generated | yes |

## Deployment Readiness Summary

| Check | Status | Notes |
|-------|--------|-------|
| Landing page spec present | yes/no | Consumed by /pde:deploy Phase 92 |
| Stripe config present | yes/no | Approval gate required before write |
| Domain strategy captured | yes/no | From BRF domain section |

## Domain Strategy

{Extracted verbatim from BRF brief domain strategy section — Phase 85 BRIEF-05}
```

**Status vocabulary:** Use `generated` (artifact file exists), `missing` (Glob found no file), `pending` (expected but not yet run). Deployment Ready: `yes` if status is `generated`, `no` otherwise.

### Pattern 4: CNT Content Calendar Structure

The 30-day calendar uses relative day offsets (not specific dates), organized in three phases. Channel slots derive from the GTM artifact's channel priority annotations.

```markdown
## Content Calendar: 30-Day Launch Framework

### Phase 1: Pre-Launch (Days 1-14)

| Day | Channel | Content Type | Topic/Theme | CTA | Linked Artifact |
|-----|---------|-------------|-------------|-----|-----------------|
| Day 1 | [YOUR_CHANNEL_1] | Teaser post | Problem statement | Waitlist signup | GTM, BTH |
| Day 3 | [YOUR_CHANNEL_1] | Behind-the-scenes | Build story | Email capture | MKT |
| Day 7 | [YOUR_CHANNEL_2] | Educational content | Problem domain | Subscribe | LCV box 1 |
| Day 10 | [YOUR_CHANNEL_1] | Social proof | Early user quote | Sign up | LDP |
| Day 14 | Email | Launch announcement | Product preview | Reserve spot | OTR email 1 |

### Phase 2: Launch Week (Days 15-21)

| Day | Channel | Content Type | Topic/Theme | CTA | Linked Artifact |
|-----|---------|-------------|-------------|-----|-----------------|
| Day 15 | All | Launch day | Product live | Try it now | LDP, STR |
| ...

### Phase 3: Post-Launch (Days 22-30)

| Day | Channel | Content Type | Topic/Theme | CTA | Linked Artifact |
|-----|---------|-------------|-------------|-----|-----------------|
| Day 22 | Email | Onboarding nudge | Feature highlight | Complete setup | OTR email 3 |
| ...
```

**Channel slot derivation:** If GTM artifact is available, read its channel priority annotations and use the top 2-3 channels as `[YOUR_CHANNEL_1]`, `[YOUR_CHANNEL_2]`, `[YOUR_CHANNEL_3]` slots. If GTM is missing, use generic `[YOUR_PRIMARY_CHANNEL]` and `[YOUR_SECONDARY_CHANNEL]` placeholders.

### Pattern 5: OTR Email Sequence Structure (Resend-Compatible Spec)

"Resend-compatible" for a spec document means: each email row contains all fields matching the Resend send API payload schema, expressed as a structured table. Phase 92 uses this spec to scaffold actual React Email components. The spec does NOT contain JSX or HTML.

```markdown
## Onboarding Sequence (5 emails — solo_founder track)

> Resend-compatible spec. Trigger: user signup event.
> Replace all `[YOUR_X]` placeholders before production use.

| # | Trigger | Delay | From | Subject | Body Summary | Primary CTA | Resend `tags` |
|---|---------|-------|------|---------|-------------|------------|---------------|
| 1 | signup | immediate | [YOUR_FROM_ADDRESS] | Welcome to [YOUR_PRODUCT_NAME] | Welcome + what to do first | [YOUR_FIRST_CTA] | {sequence: "onboarding", step: "1"} |
| 2 | signup | +2 days | [YOUR_FROM_ADDRESS] | Did you try [YOUR_KEY_FEATURE]? | Feature spotlight #1 | [YOUR_FEATURE_URL] | {sequence: "onboarding", step: "2"} |
| 3 | signup | +5 days | [YOUR_FROM_ADDRESS] | Quick win: [YOUR_QUICK_WIN] | Value milestone guidance | [YOUR_CTA_2] | {sequence: "onboarding", step: "3"} |
| 4 | inactivity (7 days) | conditional | [YOUR_FROM_ADDRESS] | We noticed you haven't [YOUR_ACTION] | Re-engagement offer | [YOUR_REENGAGEMENT_CTA] | {sequence: "onboarding", step: "4-reengagement"} |
| 5 | signup | +14 days | [YOUR_FROM_ADDRESS] | [YOUR_PRODUCT_NAME] check-in | Progress summary + next step | [YOUR_UPGRADE_OR_SHARE_CTA] | {sequence: "onboarding", step: "5"} |
```

Track depth table for email count:
- `solo_founder`: 5 onboarding emails
- `startup_team`: 5-7 onboarding emails + 3 investor outreach emails
- `product_leader`: 7 onboarding emails + 3 investor outreach emails + executive summary note

```markdown
## Investor Outreach Sequence (3 emails — gated on DPD completion)

> Gate: Only generated if DPD pitch deck artifact is present in launch/ directory.
> If DPD is absent: note "Investor sequence requires pitch deck (DPD) — run /pde:wireframe first."

| # | Trigger | Delay | From | Subject | Body Summary | Primary CTA |
|---|---------|-------|------|---------|-------------|------------|
| 1 | manual send | day of outreach | [YOUR_FROM_ADDRESS] | [YOUR_PRODUCT_NAME] — solving [YOUR_PROBLEM_STATEMENT] | Problem + solution + traction signal | Deck review request |
| 2 | email 1 sent | +5 days | [YOUR_FROM_ADDRESS] | Following up on [YOUR_PRODUCT_NAME] | Brief re-pitch + new signal | Intro call request |
| 3 | email 2 sent | +7 days | [YOUR_FROM_ADDRESS] | Last note on [YOUR_PRODUCT_NAME] | Final follow-up, stay in touch | Connect on [YOUR_NETWORK] |
```

### Pattern 6: Artifact Write and Manifest Registration

LKT, CNT, and OTR all write to `.planning/design/launch/` (the 10th DOMAIN_DIRS element established in Phase 84). Each follows the standard 7-call manifest registration pattern.

```bash
# Version discovery pattern (same as all other launch artifacts)
LKT_VERSION computed from Glob of .planning/design/launch/LKT-launch-kit-v*.md

# After Write tool creates the file:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LKT code LKT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LKT name "Launch Kit Manifest"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LKT type launch-kit
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LKT domain launch
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LKT path ".planning/design/launch/"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LKT status complete
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update LKT version ${LKT_VERSION}
```

Repeat 7-call pattern for CNT and OTR with appropriate code/name/type values.

### Pattern 7: 20-Field Coverage Write Upgrade

**Critical:** handoff.md's Step 7c currently writes only 16 fields (confirmed by reading the file). Phase 91 MUST upgrade Step 7c to write all 20 fields AND set `hasLaunchKit: true` for business mode. The `<purpose>` tag at line 2 also still says "14 designCoverage fields" — this must be updated to 20.

```bash
# Step 7c upgrade — read all 20 current flags first
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse ALL 20 current flag values: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`, `hasPrintCollateral`, `hasProductionBible`, `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit`.

For business mode:
```bash
# hasHandoff: true always, hasLaunchKit: true for business mode
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":true,"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":true}'
```

For non-business mode (sets `hasHandoff: true` only, passes `hasLaunchKit` through as current):
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},...,"hasLaunchKit":{current}}'
```

### Pattern 8: DESIGN-STATE Rows for Business Artifacts

Following the pattern from Phase 87 (SBP rows under IF SBP_WRITTEN guard, GTM rows in separate block), add LKT/CNT/OTR rows to the handoff DESIGN-STATE under `IF LKT_GENERATED == true` guard.

```markdown
| LKT | Launch Kit Manifest | /pde:handoff | complete | v{LKT_VERSION} | none | BTH,LCV,CMP,MLS,OPP,SBP,GTM,MKT,LDP,STR,DPD | {YYYY-MM-DD} |
| CNT | Content Calendar | /pde:handoff | complete | v{CNT_VERSION} | none | GTM | {YYYY-MM-DD} |
| OTR | Outreach Sequences | /pde:handoff | complete | v{OTR_VERSION} | none | BTH,MKT,DPD | {YYYY-MM-DD} |
```

### Recommended Insertion Points in handoff.md

| New Content | Location | Why |
|-------------|----------|-----|
| BM/BT detection + cache | Start of Step 4 (before Step 4a) | Consistent with flows.md, critique.md pattern |
| Step 4k: Discover business artifacts | After Step 4i (product type conditionals) | All product-type conditionals must complete first |
| Step 4l: Synthesize LKT + CNT + OTR content | After Step 4k | Depends on discovery in 4k |
| Step 4m: Domain strategy extraction | After Step 4l | Extracts from BRIEF_CONTENT already loaded in 4a |
| Step 5e: Write LKT/CNT/OTR files (under lock) | After Step 5c (HND-types write), before Step 5d (lock release) | Must occur before lock release |
| Step 7b-lkt: Register LKT/CNT/OTR in manifest | After Step 7b (HND registration) | Follows established registration ordering |
| Step 7c upgrade: 16-field → 20-field + hasLaunchKit | Replace existing Step 7c | Mandatory 20-field upgrade |

### Anti-Patterns to Avoid

- **ELSE IF from experience gate:** Business blocks are NEVER ELSE IF from `IF PRODUCT_TYPE == "experience"`. They are always independent checks so `business:experience` compositions run both paths.
- **Specific company names in OTR:** The OTR artifact must use `[YOUR_PRODUCT_NAME]`, `[YOUR_COMPANY_NAME]`, `[YOUR_FROM_ADDRESS]` — never actual names from the brief. KIT-06 is a hard requirement.
- **Dollar amounts in email copy:** OTR email body summaries referencing pricing must use `[YOUR_PRICE]`, not specific values. Financial disclaimer applies.
- **React Email JSX in OTR:** The OTR spec is a structured table document, not code. JSX stubs belong in Phase 92 deploy skill.
- **Writing outside `.planning/design/launch/`:** LKT, CNT, OTR artifacts go to `launch/` directory (LAUNCH-06 rule), not `ux/` or `strategy/`.
- **16-field designCoverage write:** Phase 91 must upgrade the Step 7c write from 16 to 20 fields. Leaving it at 16 will clobber the four business flags set by Phases 85-88.
- **Investor sequence without DPD gate:** The investor outreach sequence (3 emails) must only generate if `DPD_AVAILABLE` — Glob finds a `.planning/design/launch/DPD-pitch-deck-v*.md`. Absent DPD = note-and-skip.
- **Counting fields wrong in `<purpose>` tag:** The `<purpose>` tag at line 2 of handoff.md currently says "14 designCoverage fields". Anti-patterns section says "13 fields". The actual current write is 16 fields. Phase 91 must update ALL three references to 20.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Artifact version discovery | Custom path-parsing logic | Glob tool + parse `v{N}` suffix (same as all other skills) | Established pattern; handles versioning consistently |
| Business mode detection | Parsing manifest JSON directly | `pde-tools.cjs manifest-get-top-level businessMode` | CLI abstracts manifest location; consistent with all 6 prior business phases |
| Coverage read-before-set | Tracking coverage in memory | `pde-tools.cjs design coverage-check` + read JSON | `manifest-set-top-level` replaces entire object; must read current before writing |
| Email sequence delay calculator | Date arithmetic | Relative day offsets as strings ("+2 days", "+5 days") | OTR is a spec, not executable — relative offsets are simpler and provider-agnostic |
| Channel slot mapping | Hard-coded channel names | GTM artifact channel priority annotations | Channel names come from the user's GTM; use their `[YOUR_CHANNEL_N]` vocabulary |
| Write-lock acquisition | Custom file locking | `pde-tools.cjs design lock-acquire pde-handoff` | Phase 91 runs inside the existing handoff lock window (Step 5 is already locked) |

**Key insight:** Every infrastructure concern in this phase (versioning, manifest registration, lock management, coverage flags) already has a CLI tool. The only new content is the three markdown artifact templates (LKT, CNT, OTR) and the structural upgrade to Step 7c.

---

## Common Pitfalls

### Pitfall 1: Clobbering the 4 Business Coverage Flags with 16-Field Write

**What goes wrong:** If Step 7c is left at 16 fields (current state), running `/pde:handoff` after Phase 91 will overwrite `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit` with `false` (absent = default false). This silently breaks all downstream Phase 92 gates.

**Why it happens:** `manifest-set-top-level` replaces the ENTIRE designCoverage object. The existing 16-field write template simply doesn't know about the 4 new fields.

**How to avoid:** Phase 91 Plan 01 task MUST update Step 7c (and Step 2b's coverage-check parse) from 16 fields to 20 fields. The Anti-Patterns section at the bottom of handoff.md must also be updated.

**Warning signs:** After running `/pde:handoff`, checking `design coverage-check` shows `hasBusinessThesis: false` even though Phase 85 ran successfully.

### Pitfall 2: Investor Sequence Generating Without DPD

**What goes wrong:** The investor outreach sequence (KIT-03) references the pitch deck. If DPD is missing and the sequence generates anyway, it will contain references to slides that don't exist, producing unusable output.

**Why it happens:** Missing the DPD availability gate in Step 4l.

**How to avoid:** Always Glob for `.planning/design/launch/DPD-pitch-deck-v*.md` before generating investor outreach. If absent: emit "Investor outreach sequence requires pitch deck (DPD artifact). Run /pde:wireframe first." Set `INVESTOR_SEQUENCE_GENERATED=false`. Continue to generate onboarding sequence only.

**Warning signs:** OTR artifact references "slide 2" or "solution slide" but DPD path is null.

### Pitfall 3: Specific Names Leaking into OTR Email Bodies

**What goes wrong:** The brief contains a real product name and company name. When synthesizing email body summaries, it's tempting to use the actual names for readability. This violates KIT-06 and the structural placeholder pattern.

**Why it happens:** The AI has access to the brief content and naturalistically generates readable email copy with real names.

**How to avoid:** All OTR email bodies MUST use `[YOUR_PRODUCT_NAME]`, `[YOUR_COMPANY_NAME]`, `[YOUR_FROM_ADDRESS]`. The OTR artifact intro must include the same disclaimer block as `business-financial-disclaimer.md` (structural format, replace-before-use notice). The Nyquist test for KIT-06 should verify `[YOUR_PRODUCT_NAME]` appears in OTR content.

**Warning signs:** Grep for a specific word from the project brief appearing in OTR — if found, the placeholder requirement was violated.

### Pitfall 4: GTM Not Available When Generating CNT

**What goes wrong:** If `/pde:flows` hasn't run yet (GTM artifact missing), the CNT calendar has no channel slots to populate.

**Why it happens:** Handoff can run in `--force` mode with missing upstream artifacts. CNT generation will fail silently or produce an empty calendar.

**How to avoid:** Before generating CNT in Step 4l, check `GTM_AVAILABLE` flag. If false: generate CNT with generic `[YOUR_PRIMARY_CHANNEL]` placeholders and emit a warning: "GTM artifact not found — content calendar uses placeholder channel slots. Run /pde:flows for channel-specific calendar."

**Warning signs:** CNT calendar shows `[YOUR_PRIMARY_CHANNEL]` throughout with no channel-specific entries.

### Pitfall 5: LKT Artifact Discovery Failing Silently

**What goes wrong:** If an upstream business artifact was never generated (e.g., user skipped `/pde:competitive`), the LKT manifest will show `missing` for that artifact. This is correct behavior — but if the Glob error causes a bash failure that's not caught, the whole Step 4k aborts.

**Why it happens:** Bash Glob returning empty results is not an error — but if the script structure has `set -e` semantics or the tool command fails on empty match, it can abort.

**How to avoid:** For each Glob in Step 4k, handle empty result gracefully: "If Glob returns no results, set artifact status to `missing` and continue." Never halt Step 4k on missing upstream artifacts — the LKT manifest is specifically designed to surface what's missing.

**Warning signs:** LKT artifact is shorter than expected (3-4 rows instead of 11-12) with no missing/pending rows.

### Pitfall 6: Write-Lock Re-acquisition in Step 5e

**What goes wrong:** Step 5e (writing LKT/CNT/OTR) runs inside the existing handoff write-lock window (acquired at Step 5a, released at Step 5d). Attempting to acquire the lock again in Step 5e would deadlock.

**Why it happens:** Copy-pasting the lock acquire pattern from Step 5a into 5e.

**How to avoid:** Step 5e must NOT call `lock-acquire`. The existing lock from Step 5a covers all writes in Steps 5b through 5e. Lock release in Step 5d ALWAYS runs last after all writes complete. The step ordering should be: 5a (acquire), 5b (HND spec), 5c (HND types), 5e (LKT/CNT/OTR), 5d (release).

---

## Code Examples

### Example 1: BM/BT Detection Block (Insert at Start of Step 4)

```
**Business mode detection (cached for Steps 4k, 4l, 4m, 5e, 7b-lkt, and 7c):**

```bash
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
if [[ "$BM" == @file:* ]]; then BM=$(cat "${BM#@file:}"); fi
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
if [[ "$BT" == @file:* ]]; then BT=$(cat "${BT#@file:}"); fi
```

Cache `$BM` and `$BT` for use in Steps 4k, 4l, 4m, 5e, 7b-lkt, and 7c.
```

### Example 2: Step 4k — Business Artifact Discovery

```markdown
#### 4k. Discover upstream business artifacts (business mode only)

IF `$BM != "true"`: skip Step 4k entirely. Set all business artifact discovery flags to false.

IF `$BM == "true"`:

Use Glob to discover each upstream business artifact. For each, find the highest versioned file:

- BTH: Glob `.planning/design/strategy/BTH-business-thesis-v*.md` → BTH_PATH, BTH_AVAILABLE
- LCV: Glob `.planning/design/strategy/LCV-lean-canvas-v*.md` → LCV_PATH, LCV_AVAILABLE
- CMP: Glob `.planning/design/strategy/CMP-competitive-v*.md` → CMP_PATH, CMP_AVAILABLE
- MLS: Glob `.planning/design/strategy/MLS-market-landscape-v*.md` → MLS_PATH, MLS_AVAILABLE
- OPP: Glob `.planning/design/strategy/OPP-opportunity-v*.md` → OPP_PATH, OPP_AVAILABLE
- SBP: Glob `.planning/design/strategy/SBP-service-blueprint-v*.md` → SBP_PATH, SBP_AVAILABLE
- GTM: Glob `.planning/design/strategy/GTM-gtm-flow-v*.md` → GTM_PATH, GTM_AVAILABLE
- MKT: Glob `.planning/design/strategy/MKT-brand-system-v*.md` → MKT_PATH, MKT_AVAILABLE
- LDP: Glob `.planning/design/launch/LDP-landing-page-v*.md` → LDP_LAUNCH_PATH, LDP_LAUNCH_AVAILABLE
- STR: Glob `.planning/design/launch/STR-stripe-config-v*.md` → STR_PATH, STR_AVAILABLE
- DPD: Glob `.planning/design/launch/DPD-pitch-deck-v*.md` → DPD_PATH, DPD_AVAILABLE

For each, status = "generated" if file found, "missing" if not.

Display: `Step 4/7 (4k): Business artifact discovery complete. {N}/11 artifacts found.`
```

### Example 3: Step 5e — Write LKT/CNT/OTR (Under Existing Lock)

```markdown
#### 5e. Write launch kit artifacts (business mode only — under existing lock from Step 5a)

IF `LKT_GENERATED != true`: skip Step 5e entirely.

IF `LKT_GENERATED == true`:

Determine versions via Glob (max N + 1 pattern):
- LKT_VERSION from `.planning/design/launch/LKT-launch-kit-v*.md`
- CNT_VERSION from `.planning/design/launch/CNT-content-calendar-v*.md`
- OTR_VERSION from `.planning/design/launch/OTR-outreach-sequences-v*.md`

Use the Write tool three times:
1. `.planning/design/launch/LKT-launch-kit-v{LKT_VERSION}.md` — full launch kit manifest from 4l
2. `.planning/design/launch/CNT-content-calendar-v{CNT_VERSION}.md` — 30-day calendar from 4l
3. `.planning/design/launch/OTR-outreach-sequences-v{OTR_VERSION}.md` — email sequences from 4l

Display:
`Step 5/7 (5e): LKT-launch-kit-v{LKT_VERSION}.md written.`
`Step 5/7 (5e): CNT-content-calendar-v{CNT_VERSION}.md written.`
`Step 5/7 (5e): OTR-outreach-sequences-v{OTR_VERSION}.md written.`

IMPORTANT: Step 5e runs BEFORE Step 5d (lock release). The lock acquired in Step 5a covers all writes.
```

### Example 4: Step 7c Upgrade (20-Field Write)

```markdown
#### 7c. Set coverage flag (CRITICAL — read-before-set to prevent clobber)

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON output from coverage-check. Extract ALL twenty current flag values: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`, `hasPrintCollateral`, `hasProductionBible`, `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit`. Default any absent field to `false`.

IF `$BM == "true"`: merge `hasHandoff: true` AND `hasLaunchKit: true`, preserve all other eighteen values.

IF `$BM != "true"`: merge `hasHandoff: true` only, preserve all other nineteen values including passing `hasLaunchKit` as current.

Write the full merged twenty-field object:
```bash
# For business mode runs:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":true,"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":true}'

# For non-business mode runs:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":true,"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```
```

### Example 5: Nyquist Test Structure (test-handoff-launch-kit.cjs)

```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const handoffContent = fs.readFileSync(path.join(ROOT, 'workflows', 'handoff.md'), 'utf-8');

describe('KIT-01: LKT manifest generation', () => {
  it('handoff.md contains "manifest-get-top-level businessMode" (business detection)', () => {
    assert.ok(handoffContent.includes('manifest-get-top-level businessMode'));
  });
  it('handoff.md contains "LKT-launch-kit" artifact code', () => {
    assert.ok(handoffContent.includes('LKT-launch-kit'));
  });
  it('handoff.md contains "Deployment Ready" column in LKT manifest', () => {
    assert.ok(handoffContent.includes('Deployment Ready'));
  });
});

describe('KIT-02: CNT content calendar', () => {
  it('handoff.md contains "CNT-content-calendar" artifact code', () => {
    assert.ok(handoffContent.includes('CNT-content-calendar'));
  });
  it('handoff.md references 30-day calendar structure', () => {
    assert.ok(handoffContent.includes('30-day') || handoffContent.includes('30 day'));
  });
});

describe('KIT-03: OTR outreach sequences', () => {
  it('handoff.md contains "OTR-outreach-sequences" artifact code', () => {
    assert.ok(handoffContent.includes('OTR-outreach-sequences'));
  });
  it('handoff.md contains onboarding sequence Resend-compatible reference', () => {
    assert.ok(handoffContent.toLowerCase().includes('resend-compatible'));
  });
  it('handoff.md gates investor sequence on DPD availability', () => {
    assert.ok(handoffContent.includes('DPD_AVAILABLE') || handoffContent.includes('DPD-pitch-deck'));
  });
});

describe('KIT-05: hasLaunchKit coverage flag', () => {
  it('handoff.md designCoverage write contains "hasLaunchKit"', () => {
    assert.ok(handoffContent.includes('hasLaunchKit'));
  });
  it('handoff.md designCoverage write contains all 20 fields including "hasBusinessThesis"', () => {
    assert.ok(handoffContent.includes('hasBusinessThesis'));
  });
  it('handoff.md designCoverage write contains "hasServiceBlueprint"', () => {
    assert.ok(handoffContent.includes('hasServiceBlueprint'));
  });
});

describe('KIT-06: structural placeholders in OTR', () => {
  it('handoff.md OTR section contains [YOUR_PRODUCT_NAME] placeholder', () => {
    assert.ok(handoffContent.includes('[YOUR_PRODUCT_NAME]'));
  });
  it('handoff.md OTR section contains [YOUR_FROM_ADDRESS] placeholder', () => {
    assert.ok(handoffContent.includes('[YOUR_FROM_ADDRESS]'));
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 16-field designCoverage in handoff.md | Must upgrade to 20-field with hasLaunchKit | Phase 91 (this phase) | Step 7c will clobber business flags if not upgraded |
| `<purpose>` tag says "14 fields" | Must update to 20 fields | Phase 91 (this phase) | Documentation accuracy; affects Anti-Patterns section count reference too |
| Resend email sequences as JSX stubs | Spec table only in Phase 91; JSX in Phase 92 | Phase boundary 91/92 | Phase 91 is design spec, Phase 92 is scaffold generation |
| Content calendar with specific dates | Relative day offsets (Day 1, Day 3...) | v0.12 design decision | Avoids launch-date dependency; reusable across projects |

**Deprecated/outdated in handoff.md that this phase fixes:**
- `<purpose>` tag: "14 designCoverage fields" — was accurate before v0.12; must become 20
- Step 2b coverage parse: "Extract all sixteen current flag values" — must become twenty
- Step 7c coverage comment: references 13 fields in Anti-Patterns — all three references must be updated
- Anti-Patterns section: "preserving all 13 fields (hasDesignSystem...hasRecommendations)" — outdated list

---

## Open Questions

1. **Experience+business composition: where does LKT appear in the Step 4i routing block?**
   - What we know: Experience products skip Steps 4a-4e and jump to Step 4-EXP. Business steps are independent IF blocks after 4i.
   - What's unclear: Does Step 4k need to explicitly note it applies to experience+business compositions, or does the independent IF pattern handle this automatically?
   - Recommendation: The independent IF pattern handles it automatically — `$BM == "true"` fires regardless of productType. Step 4k should add a comment: "Applies to all productTypes when businessMode is true, including experience+business compositions."

2. **Step 5e lock-ordering: should it be 5b → 5c → 5e → 5d or 5b → 5c → 5d → 5e(separate lock)?**
   - What we know: Step 5d says "ALWAYS release, even if an error occurred." This means 5d must run last.
   - What's unclear: Whether experience product BIB assembly (which has its own write section) changes this ordering for hybrid-event+business compositions.
   - Recommendation: For non-experience products: 5a → 5b → 5c → 5e → 5d. For experience: 5a → 5-bib → 5e → 5d. Step 5e always runs before 5d.

3. **CNT calendar: should it be stored in `launch/` or a new `content/` subdirectory?**
   - What we know: LAUNCH-06 says all launch artifacts go to `launch/`. CNT is a launch artifact.
   - What's unclear: Whether content calendar belongs semantically in `launch/` alongside LDP/STR/DPD.
   - Recommendation: `launch/` directory per LAUNCH-06 pattern and Phase 84 FOUND-03 which set up `launch/` for exactly this purpose.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — invoked directly |
| Quick run command | `node --test .planning/phases/91-handoff-launch-kit-assembly/tests/test-handoff-launch-kit.cjs` |
| Full suite command | `node --test .planning/phases/91-handoff-launch-kit-assembly/tests/test-handoff-launch-kit.cjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KIT-01 | handoff.md contains LKT manifest generation logic with businessMode detection | structural | `node --test .../test-handoff-launch-kit.cjs` | ❌ Wave 0 |
| KIT-02 | handoff.md contains CNT content calendar generation with 30-day structure | structural | `node --test .../test-handoff-launch-kit.cjs` | ❌ Wave 0 |
| KIT-03 | handoff.md contains OTR onboarding + investor sequences, Resend-compatible, DPD-gated | structural | `node --test .../test-handoff-launch-kit.cjs` | ❌ Wave 0 |
| KIT-05 | handoff.md designCoverage write includes hasLaunchKit and all 20 fields | structural | `node --test .../test-handoff-launch-kit.cjs` | ❌ Wave 0 |
| KIT-06 | OTR section contains [YOUR_PRODUCT_NAME] and [YOUR_FROM_ADDRESS] placeholders | structural | `node --test .../test-handoff-launch-kit.cjs` | ❌ Wave 0 |
| KIT-04 | Domain strategy section present in LKT or OTR artifact | structural | `node --test .../test-handoff-launch-kit.cjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test .planning/phases/91-handoff-launch-kit-assembly/tests/test-handoff-launch-kit.cjs 2>&1 | tail -10`
- **Per wave merge:** `node --test .planning/phases/91-handoff-launch-kit-assembly/tests/test-handoff-launch-kit.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/91-handoff-launch-kit-assembly/tests/test-handoff-launch-kit.cjs` — covers KIT-01 through KIT-06

*(Test file must be created in Wave 0 / Plan 01 before handoff.md is modified, so tests start RED and go GREEN after modification)*

---

## Sources

### Primary (HIGH confidence)

- `workflows/handoff.md` (read in full) — 7-step pipeline structure, Step 4i product-type branching, Step 5 write/lock pattern, Step 7c coverage flag, Anti-Patterns section — all insertion points confirmed by direct reading
- `workflows/flows.md` lines 154-165 — businessMode detection and cache pattern (confirmed exact bash block)
- `workflows/wireframe.md` lines 2379-2389 — 20-field designCoverage write pattern with all field names (confirmed exact command)
- `.planning/REQUIREMENTS.md` lines 67-74 — KIT-01 through KIT-06 requirements (definitive)
- `references/business-track.md` — depth thresholds for email sequence count by track (confirmed)
- `references/business-financial-disclaimer.md` — placeholder format patterns (confirmed)
- `references/launch-frameworks.md` — artifact codes, paths, and consumer list (confirmed)
- `.planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs` — Nyquist test pattern (confirmed node:test structure)
- Resend API docs (https://resend.com/docs/api-reference/emails/send-email) — send payload schema confirmed (from, to, subject, html, scheduled_at, tags fields)

### Secondary (MEDIUM confidence)

- SaaS onboarding email sequence research (WebSearch + multiple sources): 5-7 email structure, trigger types (signup, inactivity), delay timing (2 days, 5 days, 14 days), one-CTA-per-email rule — consistent across multiple 2024-2025 sources
- Investor outreach sequence 3-email structure: day-of send + 5-day follow-up + 7-day final — standard cold outreach pattern confirmed by multiple sources

### Tertiary (LOW confidence)

- None — all critical claims verified from project source files or official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools/patterns exist in project; verified by reading source files
- Architecture: HIGH — all insertion points confirmed by reading handoff.md in full; patterns confirmed from 6 prior business phases
- Pitfalls: HIGH — the 16→20 field upgrade pitfall verified by reading current Step 7c; all other pitfalls derive from established project patterns
- Email sequence structure: MEDIUM — verified against official Resend API docs and multiple 2024-2025 SaaS sources

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable domain — workflow extension patterns don't change between sessions)
