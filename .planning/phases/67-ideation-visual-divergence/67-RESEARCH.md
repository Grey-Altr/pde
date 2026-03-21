# Phase 67: Ideation Visual Divergence — Research

**Researched:** 2026-03-21
**Domain:** Stitch MCP experimental-quota generation, ideation workflow extension, batch visual divergence
**Confidence:** HIGH (all infrastructure from Phases 65-66 is directly readable; ideate.md fully documented; patterns established in wireframe.md are the reference implementation)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IDT-01 | `/pde:ideate --diverge` feeds concept descriptions to Stitch to generate 3-5 visual interpretations per concept | `--diverge` flag added to ideate.md flags table; Stitch branch mirrors wireframe.md 4-STITCH-A through 4-STITCH-D pattern; `stitch:generate-screen` with `modelId: "GEMINI_3_PRO"` for each direction |
| IDT-02 | Stitch-generated variant images stored alongside text-based concept descriptions in ideation artifacts | STH-ideate-direction-N.png files in `.planning/design/strategy/`; IDT artifact updated with `## Visual Variants` section referencing each PNG path |
| IDT-03 | Visual variants feed into convergence/scoring phase for comparison | Converge phase step (Step 6/7 of ideate.md) reads STH-ideate-direction-N.png paths from IDT artifact frontmatter and presents visual references alongside scoring table |
| IDT-04 | Quota-aware: checks remaining Experimental generations before batch, falls back to text-only diverge if insufficient | `checkStitchQuota('experimental')` before batch; partial-batch fallback if remaining < variants requested; does NOT abort run |
| EFF-03 | Batch MCP calls for multi-screen generation rather than sequential one-at-a-time | Batch architecture: collect all direction prompts first, then issue `stitch:generate-screen` calls — per-direction loop with immediate per-screen fetch (not wait-for-all-then-fetch); annotation NOT required for ideation PNGs (PNG only, no HTML) |
</phase_requirements>

---

## Summary

Phase 67 extends `workflows/ideate.md` to add a `--diverge` flag that triggers Stitch visual variant generation during the Diverge pass (Step 4/7). The design mirrors the Phase 66 wireframe pattern almost exactly, but with three key differences: (1) it uses Experimental quota (`modelId: "GEMINI_3_PRO"`, 50/month) instead of Standard, (2) it produces PNG images only — no HTML fetch, no annotation injection, because the ideation stage only needs visual divergence thumbnails, and (3) the fallback is partial-batch (remaining directions get text-only treatment, not the whole run is aborted).

The EFF-03 requirement for batch MCP calls applies here: the architecture must collect all direction prompts upfront, then issue `stitch:generate-screen` calls in a per-direction loop rather than deferring until later. Each variant must be generated from its own isolated prompt — no shared project_id, no Design DNA cross-contamination — to satisfy IDT-01's "visually distinct from each other" requirement.

The convergence phase (Step 6/7) must be updated to read the Visual Variants section from the IDT artifact and render a visual comparison row in the scoring table when PNG files exist. This is a purely additive change to the converge step — if no `--diverge` run happened, the visual variants section is absent and the convergence step runs unchanged.

**Primary recommendation:** Implement as a single workflow-modification plan (ideate.md `--diverge` branch + Step 6/7 converge update) plus a Nyquist test plan covering all 5 requirements.

---

## Standard Stack

### Core (all from Phases 65-66 — already shipped)

| Module | Version | Purpose | Why Standard |
|--------|---------|---------|--------------|
| `bin/lib/mcp-bridge.cjs` | Phase 65 | `checkStitchQuota('experimental')`, `incrementStitchQuota('experimental')`, TOOL_MAP lookup | Only authorised entry point for Stitch tool names and quota functions |
| `bin/pde-tools.cjs` | Phase 65 | `design manifest-add-artifact`, `manifest-update`, `coverage-check`, `manifest-set-top-level`, `lock-acquire`, `lock-release` | Canonical design manifest API; write lock prevents concurrent-write clobber |
| `workflows/ideate.md` | Phase 27 | The workflow file being extended | All existing Step 1-7 logic is unchanged; `--diverge` inserts a new Step 4-STITCH branch |
| Node.js built-in test runner | Built-in | Nyquist tests for Phase 67 | Established project pattern: `node --test tests/phase-67/*.test.mjs` |

### Supporting

| Module | Version | Purpose | When to Use |
|--------|---------|---------|-------------|
| `stitch:generate-screen` (TOOL_MAP) | Phase 65 | Trigger Stitch Experimental generation per direction | Called per direction in the `--diverge` batch loop |
| `stitch:fetch-screen-image` (TOOL_MAP) | Phase 65 | Fetch generated PNG screenshot | Called immediately after `generate-screen` returns screenId — PNG only, no HTML |
| `checkStitchQuota('experimental')` | Phase 65 | Pre-batch Experimental quota gate | First check in `--diverge` Stitch branch, before batch consent prompt |
| `incrementStitchQuota('experimental')` | Phase 65 | Debit Experimental quota per successful generation | After each persisted PNG |

### No New npm Dependencies

Zero-npm constraint is project policy (REQUIREMENTS.md Out of Scope). No new libraries needed.

### Installation

No installation required. All infrastructure is from Phase 65. Verify quota functions are still exported:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const bridge = req('./bin/lib/mcp-bridge.cjs');
console.log('checkStitchQuota:', typeof bridge.checkStitchQuota);
console.log('incrementStitchQuota:', typeof bridge.incrementStitchQuota);
EOF
```

---

## Architecture Patterns

### Recommended Workflow Branch Structure

The `--diverge` flag creates a Stitch sub-pass inside Step 4/7 (DIVERGE) of ideate.md. The existing diverge logic (text generation of directions) runs FIRST, producing direction blocks. Then the `--diverge` Stitch batch runs on the completed direction list. This ordering ensures text generation is never gated on Stitch availability.

```
/pde:ideate --diverge [other flags]

Step 1/7: Initialize design directories         ← unchanged
Step 2/7: Prerequisites + version check         ← add --diverge to flags table
Step 3/7: Probe MCP (Sequential Thinking)       ← add Stitch probe when --diverge present
Step 4/7: DIVERGE — text directions             ← unchanged text generation
Step 4-STITCH: Visual variants (--diverge only) ← NEW: entire Stitch batch sub-pass
  4-STITCH-A: Pre-flight Experimental quota check
  4-STITCH-B: Compute how many variants fit in remaining quota (partial-batch logic)
  4-STITCH-C: Batch outbound consent (CONSENT-04)
  4-STITCH-D: Per-direction visual generation loop (batch MCP calls — EFF-03)
  4-STITCH-E: Partial-batch fallback for under-quota directions
  4-STITCH-F: Update IDT artifact with ## Visual Variants section
Step 5/7: Recommend checkpoint                  ← unchanged
Step 6/7: CONVERGE — scoring + visual compare   ← add Visual Variants row when PNGs exist
Step 7/7: DESIGN-STATE + manifest update        ← unchanged
```

**Critical ordering constraint:** The text diverge (Step 4/7) MUST complete before the Stitch batch (Step 4-STITCH) begins. The Stitch prompts are built from the text direction blocks, not the other way around. This also means Stitch failure cannot abort the text diverge — the text run always completes.

### Pattern 1: Experimental Quota Pre-Flight (IDT-04)

**What:** Check `experimental` quota before building consent prompt. Compute how many generations fit in remaining quota. If fewer than the number of directions, prepare a partial-batch plan.
**When to use:** Immediately when `--diverge` flag is detected and text directions are complete.

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { checkStitchQuota } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = checkStitchQuota('experimental');
process.stdout.write(JSON.stringify(result));
EOF
```

Parse result. Three scenarios:

- `allowed: false` (reason: `quota_exhausted`): Display:
  ```
  Stitch Experimental quota exhausted (Experimental: {used}/{limit} used this month).
  Visual divergence unavailable. Proceeding with text-only ideation.
  ```
  SET DIVERGE_STITCH = false. Skip 4-STITCH-B through 4-STITCH-F entirely.

- `allowed: true` AND `remaining < DIRECTION_COUNT`: Partial batch mode.
  SET `STITCH_BATCH_SIZE = remaining`. Directions beyond that count get text-only treatment.
  Display: `Warning: {remaining} Experimental generation(s) remaining of {limit}. Generating visuals for first {remaining} direction(s) only.`

- `allowed: true` AND `remaining >= DIRECTION_COUNT`: Full batch. SET `STITCH_BATCH_SIZE = DIRECTION_COUNT`.

### Pattern 2: Prompt Isolation for Visual Distinctiveness (IDT-01, IDT-03)

**What:** Each direction prompt sent to Stitch must be constructed from that direction's text alone, with no reference to other directions and no shared project_id that would inherit Design DNA.
**When to use:** Per-direction prompt construction in 4-STITCH-D loop.

The isolation rules:
1. **No shared project_id across directions.** Each direction generates into its own isolated call or uses a fresh project. If `generate_screen_from_text` requires a project_id, create one per direction — do NOT reuse a single project for all 5+ directions (Design DNA would be shared).
2. **Prompt includes only the direction's own attributes**: direction name, core concept, target user, tech approach. Does NOT include other directions' names or design intent.
3. **modelId must be `"GEMINI_3_PRO"`** to count as Experimental quota. This is how quota type is determined (see Phase 65 Deep Dive Area 3 — Standard vs Experimental is a caller-controlled parameter).

```markdown
# Stitch prompt template per direction (in ideate.md 4-STITCH-D)

Build prompt for Direction {N}:
"UI concept for: {direction_name}
Core concept: {direction_core_concept}
Target users: {direction_target_user}
Technology approach: {direction_tech_approach}
Generate a single screen visual showing the core UI proposition.
Style: clean product UI, no decorative illustration."

Call stitch:generate-screen:
- prompt: {built prompt above}
- modelId: "GEMINI_3_PRO"  ← REQUIRED for Experimental quota

Do NOT include: other direction names, comparison language, design system tokens, PDE-internal identifiers.
```

**OPEN QUESTION:** Whether `generate_screen_from_text` requires a `project_id` parameter. If it does, and a shared project accumulates Design DNA, that would violate IDT-01. See Open Questions section.

### Pattern 3: PNG-Only Fetch (EFF-03 — ideation does not need HTML)

**What:** Unlike wireframe/mockup, the ideation visual variants only need the PNG screenshot. Skip `stitch:fetch-screen-code` entirely.
**When to use:** After `stitch:generate-screen` returns screenId for each direction.

```markdown
# In 4-STITCH-D per-direction loop:

1. Generate: call stitch:generate-screen with prompt + modelId:"GEMINI_3_PRO"
2. Capture screenId from response
3. Fetch PNG: call stitch:fetch-screen-image with screenId
   Store as VARIANT_PNG_{N} (held in memory)
4. Skip HTML fetch — no stitch:fetch-screen-code for ideation variants
5. Skip annotation injection — annotation only for wireframe/mockup HTML
6. Proceed directly to inbound consent + persist
```

This satisfies EFF-03 by keeping the loop tight: generate → fetch-image → consent → persist. No HTML detour.

### Pattern 4: Artifact Storage and Naming (IDT-02)

**What:** PNG files stored in `.planning/design/strategy/` alongside IDT artifact. Naming: `STH-ideate-direction-{N}.png`.
**When to use:** After inbound consent per variant.

```
.planning/design/strategy/
├── IDT-ideation-v{N}.md          ← existing IDT artifact (updated with ## Visual Variants)
├── STH-ideate-direction-1.png    ← new: Stitch visual variant for Direction 1
├── STH-ideate-direction-2.png    ← new: Stitch visual variant for Direction 2
├── STH-ideate-direction-3.png    ← ...
```

**Naming rationale:** `STH-` prefix maintains namespace consistency with Phase 66 STH- artifacts. `ideate-direction-{N}` distinguishes from wireframe/mockup STH artifacts. `{N}` is the 1-based direction number (matches direction numbering in the IDT artifact diverge section).

**IDT artifact update:** After the Stitch batch completes, append a `## Visual Variants` section to the IDT artifact (between `## Diverge Phase` and `## Recommend Checkpoint`):

```markdown
## Visual Variants

> Generated by /pde:ideate --diverge using Google Stitch (Experimental model)

| Direction | Visual | Path |
|-----------|--------|------|
| Direction 1: {name} | ![STH-ideate-direction-1](.../STH-ideate-direction-1.png) | `.planning/design/strategy/STH-ideate-direction-1.png` |
| Direction 2: {name} | ![STH-ideate-direction-2](.../STH-ideate-direction-2.png) | `.planning/design/strategy/STH-ideate-direction-2.png` |
| Direction {N} (text-only) | — | Stitch fallback: Experimental quota insufficient |
```

Directions that fell back to text-only show "—" in the Visual column with a fallback note.

### Pattern 5: Convergence Visual Surfacing (IDT-03)

**What:** Step 6/7 (CONVERGE) checks for the `## Visual Variants` section in the IDT artifact and adds a Visual column to the scoring table when PNGs exist.
**When to use:** In Step 6/7, when writing the converge scoring table.

When `## Visual Variants` is present in the intermediate IDT artifact (Status: `diverge-complete`):

```markdown
## Converge Phase

| Direction | Goal Alignment (0-3) | Feasibility (0-3) | Distinctiveness (0-3) | Total (/9) | Visual | Recommended |
|-----------|---------------------|-------------------|----------------------|------------|--------|-------------|
| Direction 1: {name} | {score} | {score} | {score} | {total} | [View](STH-ideate-direction-1.png) | {* if recommended} |
| Direction 2: {name} | {score} | {score} | {score} | {total} | [View](STH-ideate-direction-2.png) | |
| Direction 3 (text-only) | {score} | {score} | {score} | {total} | text-only | |
```

When `## Visual Variants` is absent (no `--diverge` run, or all Stitch fallback): scoring table runs unchanged without Visual column. This is backwards-compatible with existing ideation runs.

### Pattern 6: Partial-Batch Fallback (IDT-04)

**What:** When `STITCH_BATCH_SIZE < DIRECTION_COUNT`, generate visuals for the first N directions and use text-only for the remainder.
**When to use:** In 4-STITCH-D loop when `direction_index > STITCH_BATCH_SIZE`.

```markdown
For each direction at index {i} (1-based):
  IF {i} <= STITCH_BATCH_SIZE:
    Proceed with Stitch generation (4-STITCH-D steps 1-6)
  ELSE:
    Log: "Direction {i} ({name}): text-only (Experimental quota insufficient)."
    Mark direction as STITCH_FALLBACK_TEXT_ONLY
    Continue to next direction — do NOT abort
```

After loop, display summary:
```
Visual divergence complete: {STITCH_BATCH_SIZE} visual(s) generated, {text_only_count} text-only direction(s).
```

The run NEVER aborts due to partial quota. The user gets partial visual divergence + partial text-only, not a failure.

### Pattern 7: Batch Consent Gate (CONSENT-04 — already satisfied in Phase 66)

CONSENT-04 was already marked Complete in Phase 66. The batch consent pattern for ideation follows the exact same form as wireframe batch consent:

```markdown
# 4-STITCH-C: Batch outbound consent

Collect all direction names + generated prompts (up to STITCH_BATCH_SIZE directions).

AskUserQuestion:
"About to send concept descriptions to Google Stitch (stitch.withgoogle.com):

  Directions ({STITCH_BATCH_SIZE}):
  {for each direction up to batch size: "  - Direction {N}: {direction_name}"}

  What will be sent: A text description of each direction's UI concept and target user.
  Model: Gemini Pro (Experimental — counts against 50/month limit)
  Quota: {remaining} Experimental generation(s) remaining after this batch.
  Service: Google Stitch MCP (stitch.withgoogle.com)

Approve sending these prompts to Stitch? (yes / no)"
```

If "no": SET DIVERGE_STITCH = false. Display: `Visual divergence cancelled by user. Proceeding with text-only ideation.` Skip 4-STITCH-D through 4-STITCH-F.

### Pattern 8: ESM createRequire Pattern (Project Convention)

**Critical:** All `node --input-type=module` blocks that call mcp-bridge.cjs must use the `createRequire` pattern. The project validator rejects inline `require()` in workflow sandbox scope (Phase 66 decision, confirmed in STATE.md).

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { checkStitchQuota } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = checkStitchQuota('experimental');
process.stdout.write(JSON.stringify(result));
EOF
```

This applies to every quota check and increment call in ideate.md.

### Anti-Patterns to Avoid

- **Running Stitch before text directions complete:** Text diverge MUST finish first. Stitch prompts are built from text direction content. Never interleave text generation and Stitch generation.
- **Using `stitch:list-screens` to discover generated screens:** Confirmed list_screens state-sync bug (early 2026). Always use screenId directly from `generate_screen_from_text` response.
- **Fetching HTML for ideation variants:** Ideation only needs PNG screenshots. Adding `stitch:fetch-screen-code` is unnecessary MCP overhead and wastes generation time.
- **Sharing project_id across directions:** If the Stitch API accumulates Design DNA per project, sharing a project across all directions would make variants visually similar. Each direction must be generated in isolation.
- **Aborting the run on partial quota:** The entire run must never abort due to Experimental quota. Text-only fallback for under-quota directions is the correct behavior (IDT-04).
- **Applying annotation injection to ideation PNGs:** Annotation (`<!-- @component: -->`) is for HTML artifacts consumed by handoff. PNGs have no HTML to annotate.
- **Inline `require()` in ESM blocks:** Project validator rejects this. Always use `createRequire` pattern.
- **Writing a 13-field designCoverage without reading current values first:** The 14-field pass-through-all pattern is mandatory. Reading coverage-check before writing is non-negotiable.
- **Using `modelId: "GEMINI_3_FLASH"` for ideation:** Wireframe uses Flash (Standard quota). Ideation must use Pro (`"GEMINI_3_PRO"`, Experimental quota). Using Flash would debit Standard quota when it should debit Experimental.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Experimental quota check before batch | Custom counter logic | `checkStitchQuota('experimental')` from mcp-bridge.cjs | Already handles exhaustion, 80% threshold, lazy reset, no-quota-configured |
| Quota increment after each generation | Custom file write | `incrementStitchQuota('experimental')` from mcp-bridge.cjs | UTC reset, auto-init on first use, atomic read-modify-write |
| How many variants fit in quota | Custom arithmetic | `remaining` field from `checkStitchQuota` result | `remaining = quota.limit - quota.used` is already computed; use it directly |
| Stitch tool name lookup | Hardcode `mcp__stitch__generate_screen_from_text` | TOOL_MAP from mcp-bridge.cjs | TOOL_MAP entries may be TOOL_MAP_VERIFY_REQUIRED until MCP-05 gate runs |
| Manifest coverage flag update | Partial JSON write | `coverage-check` + `manifest-set-top-level` 14-field object | Prevents clobbering hasIdeation and all other 13 flags |
| PNG inbound consent | Custom prompt | Same AskUserQuestion pattern as wireframe.md 4-STITCH-C step 7 | Consistent consent UX; pattern already verified to work |
| Visual comparison in converge table | New scoring logic | Additive Visual column when `## Visual Variants` exists | Converge scoring logic unchanged; Visual column is cosmetic addition only |

**Key insight:** Phases 65-66 built all the infrastructure this phase needs. The entire Phase 67 implementation is a workflow-modification task (ideate.md only) plus Nyquist tests. No new modules, no new exports, no new pde-tools.cjs commands.

---

## Common Pitfalls

### Pitfall 1: Stitch Before Text Directions
**What goes wrong:** The `--diverge` branch fires before text directions are generated. Stitch has nothing to build prompts from. Either prompts are empty or the step errors out.
**Why it happens:** Mistakenly treating `--diverge` as a flag that replaces text diverge, rather than extending it.
**How to avoid:** The `--diverge` Stitch batch is step `4-STITCH`, which runs AFTER step 4 (text diverge). Step 4 always runs. Only the 4-STITCH sub-pass is conditional on `--diverge`. Make this explicit in the step header: "Skip this section if `--diverge` is not present. Jump directly to Step 5."
**Warning signs:** `DIRECTIONS` array is empty when 4-STITCH runs; Stitch prompts contain no direction-specific content.

### Pitfall 2: Shared Project DNA Across Directions
**What goes wrong:** All directions are generated in the same Stitch project. Stitch accumulates Design DNA (color palette, layout patterns) from the first generation and applies it to subsequent ones. All variants look similar.
**Why it happens:** `generate_screen_from_text` may accept or require a `project_id` parameter. If the same project_id is reused across directions, Design DNA propagates.
**How to avoid:** Use no project_id (if the tool allows anonymous generation), or create a new project per direction via `stitch:create-project`. Document which approach is correct in the workflow based on the actual tool schema.
**Warning signs:** IDT-01 failure — color extraction on 3 variant images shows nearly identical palettes; all variants use the same background color.

### Pitfall 3: Full-Batch Abort on Partial Quota
**What goes wrong:** The workflow throws an error or stops entirely when there are fewer Experimental generations remaining than directions. User gets no IDT artifact at all.
**Why it happens:** Quota check returns `allowed: false` and the workflow treats this as a fatal error.
**How to avoid:** The quota check MUST use the `remaining` field to compute partial-batch size, NOT use `allowed: false` as a stop signal. Only total exhaustion (`remaining: 0`) should completely skip Stitch. Any `remaining > 0` should generate visuals for that many directions and fall back for the rest.
**Warning signs:** IDT-04 failure — a run with 2 remaining and 5 directions produces no IDT artifact at all instead of a partial visual IDT.

### Pitfall 4: modelId Quota Type Mismatch
**What goes wrong:** `generate_screen_from_text` called with `modelId: "GEMINI_3_FLASH"` instead of `"GEMINI_3_PRO"`. Local quota tracks as Experimental but actual generation used Standard quota. Quota drift.
**Why it happens:** Copy-paste from wireframe.md which uses `'standard'` quota type; wireframe uses Flash model.
**How to avoid:** All ideation `generate_screen_from_text` calls MUST pass `modelId: "GEMINI_3_PRO"`. Quota increment MUST use `incrementStitchQuota('experimental')`. Two explicit references in the test suite: one verifying the modelId value, one verifying the quota type.
**Warning signs:** Standard quota counter depletes faster than expected; Experimental counter never increments.

### Pitfall 5: TOOL_MAP_VERIFY_REQUIRED Not Checked
**What goes wrong:** TOOL_MAP entries for `stitch:generate-screen` and `stitch:fetch-screen-image` are still marked `TOOL_MAP_VERIFY_REQUIRED` (MCP-05 live gate not run). Workflow proceeds and calls fail silently.
**Why it happens:** STITCH_API_KEY was set but `/pde:connect stitch --confirm` was not run. TOOL_MAP markers remain unverified.
**How to avoid:** The `--diverge` Stitch branch should check for `TOOL_MAP_VERIFY_REQUIRED` markers at the start of 4-STITCH-A (same pattern as wireframe.md Step 3 Stitch probe section). If still unverified: warn user to run `/pde:connect stitch --confirm`, but continue as non-blocking warning (same treatment as wireframe.md).
**Warning signs:** MCP call fails with tool-not-found; MCP-05 gate note in connect.md has not been run.

### Pitfall 6: ESM `require()` Rejection
**What goes wrong:** Workflow bash block uses `node -e "const {checkStitchQuota} = require('...')"` instead of the `createRequire` pattern. Project validator rejects the plan.
**Why it happens:** Natural reflex to use inline `require()`. The project validator flags this pattern in workflow sandbox scope (Phase 66 confirmed decision, STATE.md line 49-50).
**How to avoid:** All mcp-bridge.cjs calls in workflow bash blocks must use `node --input-type=module <<'EOF'` with `import { createRequire } from 'module'`. See Architecture Pattern 8 above. Verify by checking wireframe.md 4-STITCH-A as the reference.
**Warning signs:** Plan fails validation with "inline require() in workflow sandbox scope" error.

### Pitfall 7: Annotation Injection Applied to PNG
**What goes wrong:** The workflow copies the wireframe 4-STITCH sub-pass verbatim and includes the annotation injection step (step 6 in wireframe 4-STITCH-C). The injection runs on a PNG binary buffer and produces garbage or crashes.
**Why it happens:** Template copying without adapting for PNG-only workflow.
**How to avoid:** The ideation 4-STITCH-D loop explicitly does NOT have an annotation step. After fetching the PNG, go directly to inbound consent and persist. No HTML, no annotation.
**Warning signs:** Test for annotation presence in ideate.md would incorrectly pass; PNG file is corrupted.

---

## Code Examples

### 4-STITCH-A: Experimental Quota Check

```bash
# Source: wireframe.md 4-STITCH-A pattern + 'experimental' type substitution
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { checkStitchQuota } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = checkStitchQuota('experimental');
process.stdout.write(JSON.stringify(result));
EOF
```

Parse `{allowed, remaining, reason, pct}`. Compute `STITCH_BATCH_SIZE`:
- `remaining === 0` → `STITCH_BATCH_SIZE = 0`, SET DIVERGE_STITCH = false
- `remaining < DIRECTION_COUNT` → `STITCH_BATCH_SIZE = remaining` (partial batch)
- `remaining >= DIRECTION_COUNT` → `STITCH_BATCH_SIZE = DIRECTION_COUNT`

### 4-STITCH-D: Per-Direction Generation Loop

```markdown
# In ideate.md 4-STITCH-D

For each direction at index {i} from 1 to DIRECTION_COUNT:

  IF {i} > STITCH_BATCH_SIZE:
    Mark direction as STITCH_FALLBACK_TEXT_ONLY. Continue.

  1. Build isolated Stitch prompt:
     "UI concept for: {direction_name}
     Core concept: {direction_core_concept}
     Target users: {direction_target_user}
     Technology approach: {direction_tech_approach}
     Generate a single screen visual showing the core UI proposition."

  2. Call stitch:generate-screen:
     - prompt: {above}
     - modelId: "GEMINI_3_PRO"
     - (NO project_id shared with other directions — isolation required)
     If call fails or times out: Mark as STITCH_FAILED. Log warning. Continue.

  3. Capture screenId from response. Use DIRECTLY for next call.
     Do NOT call stitch:list-screens.

  4. Call stitch:fetch-screen-image using screenId.
     Store as VARIANT_PNG (held in memory).
     Handle base64: Buffer.from(content, 'base64') if string format.

  5. Inbound consent (CONSENT-02, CONSENT-03):
     AskUserQuestion:
     "Received from Google Stitch:
       Direction {i}: {direction_name}
       Image: STH-ideate-direction-{i}.png (~{size}KB)
       Target: .planning/design/strategy/

     Persist this image? (yes / no)"

     If "no": Skip persist for this direction. Log. Continue.

  6. Persist:
     Write VARIANT_PNG to .planning/design/strategy/STH-ideate-direction-{i}.png

  7. Increment quota:
     node --input-type=module <<'EOF'
     import { createRequire } from 'module';
     const req = createRequire(import.meta.url);
     const { incrementStitchQuota } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
     process.stdout.write(JSON.stringify(incrementStitchQuota('experimental')));
     EOF

End loop.
```

### 4-STITCH-F: Update IDT Artifact with Visual Variants Section

```markdown
# Append ## Visual Variants section to intermediate IDT artifact
# (between ## Diverge Phase and ## Recommend Checkpoint)

## Visual Variants

> Generated by /pde:ideate --diverge using Google Stitch (Experimental — Gemini Pro)
> Generated: {ISO 8601 date}

| Direction | Visual | Path |
|-----------|--------|------|
{for each direction 1..DIRECTION_COUNT:
  if STITCH_FALLBACK_TEXT_ONLY or STITCH_FAILED:
    "| Direction {i}: {name} | — | {reason: quota-insufficient / stitch-error / user-declined} |"
  else:
    "| Direction {i}: {name} | [View](STH-ideate-direction-{i}.png) | `.planning/design/strategy/STH-ideate-direction-{i}.png` |"
}
```

### Step 6/7 Converge — Visual Column (IDT-03)

```markdown
# In ideate.md Step 6/7 CONVERGE — detecting Visual Variants

After loading the intermediate IDT artifact (Status: diverge-complete):
  IF artifact contains "## Visual Variants" section:
    SET HAS_VISUAL_VARIANTS = true
    Parse variant paths from the table (direction index → path)
  ELSE:
    SET HAS_VISUAL_VARIANTS = false

When writing the converge scoring table:
  IF HAS_VISUAL_VARIANTS:
    Add "Visual" column between "Total (/9)" and "Recommended"
    For each direction: link to STH-ideate-direction-{i}.png if available, else "text-only"
  ELSE:
    Scoring table has no Visual column (backwards-compatible)
```

### Test: Verify modelId and Quota Type

```javascript
// Source: Phase 67 Nyquist test — tests/phase-67/diverge-stitch-flag.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ideateMd = readFileSync(resolve('workflows', 'ideate.md'), 'utf8');

describe('IDT-04: Experimental quota type', () => {
  test('ideate.md references checkStitchQuota with experimental type', () => {
    assert.ok(
      ideateMd.includes("checkStitchQuota('experimental')"),
      'ideate.md missing checkStitchQuota experimental type'
    );
  });

  test('ideate.md references incrementStitchQuota with experimental type', () => {
    assert.ok(
      ideateMd.includes("incrementStitchQuota('experimental')"),
      'ideate.md missing incrementStitchQuota experimental type'
    );
  });
});

describe('IDT-01: Gemini Pro model for visual divergence', () => {
  test('ideate.md stitch:generate-screen call uses GEMINI_3_PRO modelId', () => {
    assert.ok(
      ideateMd.includes('GEMINI_3_PRO'),
      'ideate.md missing GEMINI_3_PRO modelId for Experimental generation'
    );
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Text-only ideation diverge | Text + visual diverge via Stitch (`--diverge` flag) | Phase 67 | Users see visual UI concepts alongside text direction blocks; convergence comparison has a visual dimension |
| Single quota type (`standard`) for Stitch | Two quota types (`standard` Flash, `experimental` Pro) | Phase 65 research / Phase 67 implementation | Ideation variants cost against the 50/month Experimental budget, not the 350/month Standard budget |
| Batch consent established in Phase 66 (wireframe) | Same batch consent pattern reused in ideation | Phase 67 | CONSENT-04 is already marked Complete; ideation just applies the same AskUserQuestion template |
| Sequential generation with annotation loop (wireframe) | PNG-only generation loop without annotation (ideation) | Phase 67 | Ideation variants are thumbnails; no HTML means no annotation; lighter, faster loop |

**Deprecated/outdated for this phase:**
- `incrementStitchQuota('standard')` for ideation: wrong quota type. Always use `'experimental'` in ideate.md.
- Annotation injection step copied from wireframe: not applicable. PNGs have no DOM to annotate.

---

## Open Questions

1. **Does `generate_screen_from_text` require a `project_id` parameter, and does Stitch accumulate Design DNA per project?**
   - What we know: `create_project` exists in TOOL_MAP (`stitch:create-project`). `generate_screen_from_text` may or may not require a project. If it does, a shared project would accumulate Design DNA, violating IDT-01 visual distinctiveness.
   - What's unclear: Whether anonymous (project-less) generation is supported. Whether creating one project per direction vs one shared project changes visual output.
   - Recommendation: At implementation time, check the `generate_screen_from_text` tool schema (via `npx @_davideast/stitch-mcp tool -s generate_screen_from_text`). If `project_id` is required, create a fresh project per direction. Document the schema check result in the implementation plan. This is the highest-priority open question for Phase 67.

2. **MAX_STITCH_SCREENS: what is the practical upper bound for a single `--diverge` batch?**
   - What we know: IDT-01 says "3-5 visual interpretations per concept"; Experimental limit is 50/month; generation takes 2-10 minutes each.
   - What's unclear: Whether there is an API-level cap on number of generates per project/session, and whether Stitch imposes a timeout on the generation pipeline that makes >5 synchronous generates impractical.
   - Recommendation: Default `MAX_STITCH_SCREENS = 5` (matching the 5 minimum text directions). Let this be overridable. For quota awareness, use `STITCH_BATCH_SIZE = min(DIRECTION_COUNT, MAX_STITCH_SCREENS, remaining_experimental)`.

3. **`stitch:fetch-screen-image` return format: base64 string or binary?**
   - What we know: Phase 66 wireframe research (Open Question 3) identified this as uncertain (MEDIUM confidence). The wireframe.md implementation handles both: "If string starting with data: or looks like base64: decode with Buffer.from(content, 'base64')."
   - What's unclear: Whether the ideation PNG fetch behaves identically to the wireframe PNG fetch.
   - Recommendation: Use the same dual-format handler from wireframe.md. The code pattern is already established.

4. **Tool name verification status at Phase 67 implementation time**
   - What we know: All 10 TOOL_MAP entries were `TOOL_MAP_VERIFY_REQUIRED` at Phase 65 ship time (STATE.md Pending Todos). MCP-05 live gate was pending.
   - What's unclear: Whether MCP-05 has been run between Phase 65 shipment and Phase 67 implementation, upgrading TOOL_MAP entries to `TOOL_MAP_VERIFIED`.
   - Recommendation: The workflow should check for `TOOL_MAP_VERIFY_REQUIRED` and warn if unverified. Non-blocking warning (same as wireframe.md). The live gate can be run anytime with `/pde:connect stitch --confirm`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — tests run directly with `node --test` |
| Quick run command | `node --test tests/phase-67/*.test.mjs` |
| Full suite command | `node --test tests/phase-65/*.test.mjs tests/phase-66/*.test.mjs tests/phase-67/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IDT-01 | ideate.md contains `--diverge` in flags table + 4-STITCH branch + stitch:generate-screen call | unit (file parse) | `node --test tests/phase-67/diverge-stitch-flag.test.mjs` | Wave 0 |
| IDT-01 | GEMINI_3_PRO modelId present in 4-STITCH-D call | unit (string match) | `node --test tests/phase-67/diverge-stitch-flag.test.mjs` | Wave 0 |
| IDT-02 | STH-ideate-direction-{N}.png file path in ideate.md + ## Visual Variants section in IDT artifact format | unit (file parse) | `node --test tests/phase-67/diverge-stitch-flag.test.mjs` | Wave 0 |
| IDT-03 | Converge step includes Visual column logic when HAS_VISUAL_VARIANTS = true | unit (file parse) | `node --test tests/phase-67/visual-convergence.test.mjs` | Wave 0 |
| IDT-04 | checkStitchQuota('experimental') and incrementStitchQuota('experimental') in ideate.md | unit (string match) | `node --test tests/phase-67/diverge-stitch-flag.test.mjs` | Wave 0 |
| IDT-04 | Partial-batch fallback: STITCH_BATCH_SIZE computed from `remaining` field, not just `allowed` boolean | unit (file parse) | `node --test tests/phase-67/quota-partial-batch.test.mjs` | Wave 0 |
| IDT-04 | Text-only fallback for under-quota directions does NOT abort run | unit (file parse — no abort/halt in 4-STITCH-E) | `node --test tests/phase-67/quota-partial-batch.test.mjs` | Wave 0 |
| EFF-03 | Batch: all prompts built before generation loop starts (no lazy prompt construction mid-loop) | unit (file parse — ordering check) | `node --test tests/phase-67/batch-efficiency.test.mjs` | Wave 0 |
| EFF-03 | No HTML fetch in ideation loop (stitch:fetch-screen-code absent from 4-STITCH section) | unit (file parse — absence check) | `node --test tests/phase-67/batch-efficiency.test.mjs` | Wave 0 |
| EFF-03 | No annotation injection in ideation loop | unit (file parse — injectComponentAnnotations absent from 4-STITCH section) | `node --test tests/phase-67/batch-efficiency.test.mjs` | Wave 0 |
| CONSENT-04 | Batch outbound consent present (single AskUserQuestion before per-direction loop) | unit (file parse + indexOf ordering) | `node --test tests/phase-67/consent-batch.test.mjs` | Wave 0 |
| CONSENT-04 | Batch consent mentions Experimental model and quota cost | unit (string match) | `node --test tests/phase-67/consent-batch.test.mjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-67/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-65/*.test.mjs tests/phase-66/*.test.mjs tests/phase-67/*.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-67/diverge-stitch-flag.test.mjs` — covers IDT-01, IDT-02, IDT-04 (flag presence, artifact naming, quota type, modelId)
- [ ] `tests/phase-67/quota-partial-batch.test.mjs` — covers IDT-04 partial-batch logic (STITCH_BATCH_SIZE from remaining, no abort on partial)
- [ ] `tests/phase-67/visual-convergence.test.mjs` — covers IDT-03 (HAS_VISUAL_VARIANTS detection in converge step, Visual column in scoring table)
- [ ] `tests/phase-67/batch-efficiency.test.mjs` — covers EFF-03 (no HTML fetch, no annotation, batch prompt construction)
- [ ] `tests/phase-67/consent-batch.test.mjs` — covers CONSENT-04 (single batch consent before loop, Experimental model mention, quota display)

---

## Sources

### Primary (HIGH confidence)

- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/ideate.md` — Full ideation workflow: Step 1-7 structure, flag table, IDT artifact format, 14-field coverage pass-through-all pattern, anti-patterns list
- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/wireframe.md` (lines 264-436) — Complete 4-STITCH pattern as reference implementation: 4-STITCH-A through 4-STITCH-D, ESM createRequire pattern, per-screen loop structure, inbound/outbound consent templates, quota increment location
- `/Users/greyaltaer/code/projects/Platform Development Engine/bin/lib/mcp-bridge.cjs` (lines 381-497) — `readStitchQuota`, `incrementStitchQuota`, `checkStitchQuota` function signatures, `'experimental'` quota type path, `limits = { standard: 350, experimental: 50 }`
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/REQUIREMENTS.md` — IDT-01, IDT-02, IDT-03, IDT-04, EFF-03 success criteria (verbatim)
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/ROADMAP.md` — Phase 67 success criteria and plans-to-be-planned status
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/STATE.md` — ESM createRequire requirement (Phase 66 decision), TOOL_MAP_VERIFY_REQUIRED pending status, Experimental quota limits (50/month, MEDIUM confidence)
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/phases/65-mcp-bridge-quota-infrastructure/65-RESEARCH.md` — modelId parameter (GEMINI_3_FLASH / GEMINI_3_PRO), quota type determination, deep dive Area 3 (quota mechanics)
- `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/phases/66-wireframe-mockup-stitch-integration/66-RESEARCH.md` — Pattern 2 (annotation injection), Pattern 3 (fallback chain), Pattern 4 (manifest registration for STH artifacts), CONSENT-04 batch consent template

### Secondary (MEDIUM confidence)

- `google-labs-code/stitch-sdk` README — GEMINI_3_FLASH and GEMINI_3_PRO model IDs confirmed (from Phase 65 deep dive)
- `nxcode.io/resources/news/google-stitch-complete-guide-vibe-design-2026` — Experimental limit 50/month (single community source — LOW for the exact number, treated as MEDIUM given no contradicting sources)

### Tertiary (LOW confidence)

- Phase 65 research footnote: Experimental quota (50/month) cited from single community source. Design quota tracking defensively (STATE.md Blockers/Concerns).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all infrastructure from Phase 65-66, directly read from source files
- Architecture (workflow branch structure): HIGH — wireframe.md 4-STITCH is the reference implementation; ideation variant is simpler (PNG-only, no annotation)
- Quota type mapping (Experimental = Pro): MEDIUM — stitch-sdk README confirms model IDs; Experimental = 50/month from single community source
- Partial-batch fallback pattern: HIGH — derived from IDT-04 success criteria (verbatim) and existing checkStitchQuota `remaining` field
- Visual convergence surfacing: HIGH — additive change to existing converge step; pattern is purely additive conditional logic
- Design DNA isolation via project_id: LOW confidence — open question; requires live tool schema check at implementation time
- Test strategy: HIGH — follows exact Phase 66 Nyquist pattern; all test file names and assertion patterns established

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (30 days — infrastructure stable; open question on project_id isolation should be resolved at plan time via tool schema check)
