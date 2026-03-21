# Phase 66: Wireframe + Mockup Stitch Integration - Research

**Researched:** 2026-03-20
**Domain:** Stitch MCP integration, consent-gated pipeline, local artifact persistence, annotation injection
**Confidence:** HIGH (project codebase is the authoritative source; all findings grounded in existing files)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Stitch Artifact Storage**
- STH-{slug}.html files stored in `.planning/design/ux/wireframes/` alongside WFR- artifacts (same directory, different prefix)
- STH-{slug}.png screenshots stored in same directory as their HTML — critique needs PNG for multimodal analysis
- Mockup Stitch artifacts named STH-{slug}-hifi.html in `.planning/design/ux/mockups/` (mirrors mockup-{slug}.html pattern)
- `hasStitchWireframes: true` set in designCoverage when first STH artifact is persisted (Phase 64 prepared this field)
- Manifest entries use `source: "stitch"` metadata field to distinguish from Claude-generated artifacts

**Consent UX Flow**
- Outbound consent: AskUserQuestion before each Stitch call showing the prompt text being sent (CONSENT-01/03)
- Inbound consent: show artifact type, size, and target path; persist only after user approval (CONSENT-02)
- Multi-screen wireframe runs use a single batch-consent prompt showing all screens before generation starts (CONSENT-04)
- Consent is NOT remembered across pipeline stages — each command (wireframe, mockup, critique) re-consents independently

**Annotation Injection**
- DOM-level comment injection using regex pattern matching on semantic HTML elements (`<nav>`, `<header>`, `<main>`, `<section>`, `<form>`)
- Format: `<!-- @component: ComponentName -->` injected before each identified structural element
- Injection happens immediately after fetch, before manifest registration (EFF-05)
- `stitch_annotated: true` set in manifest entry alongside artifact registration
- Partial annotations accepted — inject what's identifiable, log warning about unidentified sections, still set stitch_annotated: true

**Fallback Behavior**
- Three fallback triggers: MCP unavailable (connection probe fails), Stitch error response, quota exhausted (checkStitchQuota returns allowed:false) — all checked within 10-second timeout budget (EFF-04/WFR-06)
- User-visible warning message explains why Stitch was skipped, then proceeds with Claude HTML/CSS generation
- Fallback artifacts use standard WFR- prefix (not STH-) — they are Claude-generated, manifest `source` field reflects origin
- No retry loops — single attempt, then fallback

**Pipeline Efficiency**
- Fetched Stitch HTML and PNG cached locally — critique, handoff, iterate reuse cached files without re-fetching (EFF-01)
- Stitch artifact reuse across pipeline stages: wireframe output flows to mockup/critique/handoff via manifest paths (EFF-02)
- Annotation injection begins as soon as first screen arrives, not after all screens complete (EFF-05)

### Claude's Discretion
- Exact regex patterns for component annotation matching
- Error message wording for consent prompts and fallback warnings
- Whether to include Stitch artifacts in index.html navigation alongside Claude wireframes
- Order of operations within the generate-fetch-persist-annotate pipeline steps

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WFR-01 | `--use-stitch` flag on `/pde:wireframe` routes generation through Stitch MCP instead of Claude HTML/CSS | Flag parsing pattern exists in wireframe.md flags table; add branch after Step 1.5 |
| WFR-02 | Stitch-generated HTML fetched, persisted as STH-{slug}.html in `.planning/design/` | `stitch:fetch-screen-code` in TOOL_MAP; Write tool to local path; `stitch:fetch-screen-image` for PNG |
| WFR-03 | Annotation injection adds `<!-- @component: -->` comments to Stitch HTML before manifest registration | Regex on `<nav>`, `<header>`, `<main>`, `<section>`, `<form>` tags; inject before manifest-add-artifact call |
| WFR-04 | design-manifest.json registers Stitch artifacts with `source: "stitch"` metadata | `manifest-add-artifact` extended with source field; pde-tools.cjs manifest-update pattern |
| WFR-05 | `/pde:mockup` supports `--use-stitch` flag with same pipeline | Parallel branch in mockup.md Step 4; STH-{slug}-hifi.html target path |
| WFR-06 | Graceful degradation when Stitch MCP unavailable or quota exhausted | `checkStitchQuota` returns `{allowed:false}`; 10-second timeout budget; fallback to Claude generation |
| CONSENT-01 | Every outbound Stitch call requires explicit user approval before transmission | AskUserQuestion before `stitch:generate-screen` call; display prompt text being sent |
| CONSENT-02 | Every inbound Stitch artifact requires user approval before persisting to local files | AskUserQuestion showing artifact type + size + target path before Write tool |
| CONSENT-03 | Consent prompts show what data is being sent/received and to/from where | Prompt template: "Sending to Google Stitch: [prompt text]" / "Received from Stitch: [type, size, path]" |
| CONSENT-04 | Batch operations present single batch-consent prompt rather than per-item consent | Collect all screens first; single AskUserQuestion with list of all screens + prompts |
| EFF-01 | Cached STH artifacts reused by downstream stages without re-fetching | Manifest path field holds local STH- path; critique/handoff reads from manifest |
| EFF-02 | Stitch artifact reuse across pipeline stages | `source: "stitch"` + local path in manifest; downstream reads manifest, not Stitch |
| EFF-04 | 10-second timeout budget with immediate fallback (no retry loops) | Single attempt; timeout measured from probe start; fallback path follows Claude generation |
| EFF-05 | Annotation injection begins as soon as first screen arrives | Per-screen annotation loop; don't accumulate all screens before annotating |
</phase_requirements>

---

## Summary

Phase 66 adds `--use-stitch` flags to the existing `/pde:wireframe` and `/pde:mockup` workflow files. The phase is almost entirely a **workflow modification** task — no new CLI modules need to be written, because all infrastructure was built in Phase 65 (mcp-bridge.cjs with `checkStitchQuota`, `incrementStitchQuota`, and all Stitch TOOL_MAP entries). The work splits cleanly into three areas: (1) inserting a consent-gated Stitch pipeline branch into wireframe.md and mockup.md, (2) writing annotation injection logic, and (3) writing Nyquist tests that verify each requirement.

The key challenge is correctness at the boundaries: consent must fire before any data leaves the machine, annotation injection must complete before manifest registration, and fallback must be invisible to the rest of the pipeline (downstream steps should work identically whether artifacts came from Stitch or Claude). The `list_screens` state-sync bug (confirmed early 2026) makes screen listing unreliable immediately after generation; the mitigation is to use the `screenId` returned directly by `stitch:generate-screen` for all subsequent tool calls rather than querying `stitch:list-screens`.

The Nyquist test strategy is unit-level: tests verify the shape of workflow modifications (flag parsing branches present, consent prompt templates correct, fallback triggers correctly wired) by reading and asserting on the workflow markdown files and on the mcp-bridge.cjs exports. This is the same pattern used in Phase 65.

**Primary recommendation:** Implement as two workflow-modification plans (wireframe first, mockup second) with a shared annotation utility block, plus a single Nyquist test plan covering all 14 requirements.

---

## Standard Stack

### Core (all from Phase 65 — already shipped)

| Module | Version | Purpose | Why Standard |
|--------|---------|---------|--------------|
| `bin/lib/mcp-bridge.cjs` | Phase 65 | Quota check, TOOL_MAP lookup, Stitch APPROVED_SERVERS entry | Only authorised entry point for Stitch tool names |
| `bin/pde-tools.cjs` | Phase 65 | `design manifest-add-artifact`, `manifest-set-top-level`, `coverage-check`, `lock-acquire/release` | Canonical design manifest API |
| Node.js `fs` (CJS) | Built-in | Write STH- HTML/PNG files to `.planning/design/` | Already used throughout PDE scripts |

### Supporting

| Module | Version | Purpose | When to Use |
|--------|---------|---------|-------------|
| `stitch:generate-screen` (TOOL_MAP) | Phase 65 | Trigger Stitch HTML generation | Main generation call |
| `stitch:fetch-screen-code` (TOOL_MAP) | Phase 65 | Fetch generated HTML from Stitch | After `generate-screen` returns screenId |
| `stitch:fetch-screen-image` (TOOL_MAP) | Phase 65 | Fetch generated PNG screenshot | After HTML fetched, before manifest registration |
| `checkStitchQuota('standard', configPath)` | Phase 65 | Pre-generation quota gate | First check in Stitch branch, before consent prompt |
| `incrementStitchQuota('standard', configPath)` | Phase 65 | Debit quota after successful generation | Immediately after confirmed successful Stitch generation |

### No New npm Dependencies

Zero-npm constraint is project policy (confirmed in REQUIREMENTS.md Out of Scope). All libraries used here are already in the project or are Node.js built-ins.

---

## Architecture Patterns

### Recommended Workflow Branch Structure

The `--use-stitch` flag creates a branch at a specific point in each workflow. The rest of the workflow (Steps 5-7 for wireframe, Steps 5-7 for mockup) runs identically regardless of source.

```
/pde:wireframe --use-stitch lofi [screen-slugs]

Step 1/7: Initialize design directories       ← unchanged
Step 1.5/7: Figma context                     ← unchanged
Step 2/7: Prerequisites + flag parsing        ← parse --use-stitch flag here
Step 3/7: MCP probes                          ← add stitch probe
Step 4/7: Generate wireframe HTML             ← BRANCH on --use-stitch
  └─ Stitch branch:
     4A. Pre-flight: checkStitchQuota
     4B. Outbound consent: AskUserQuestion
     4C. Call stitch:generate-screen (per screen or batch)
     4D. Inbound consent: AskUserQuestion per screen
     4E. Fetch HTML (stitch:fetch-screen-code)
     4F. Fetch PNG (stitch:fetch-screen-image)
     4G. Persist STH-{slug}.html + STH-{slug}.png
     4H. Annotation injection (per-screen, immediately after persist)
     4I. Fallback path (on any failure in 4A-4H)
  └─ Claude branch: (unchanged Step 4 logic)
Step 5/7: Write output files                  ← unchanged structure
Step 6/7: Update ux DESIGN-STATE              ← add STH artifact row
Step 7/7: Update root DESIGN-STATE + manifest ← add source:"stitch" + stitch_annotated:true
```

### Pattern 1: Pre-flight Consent Gate

The consent gate fires in two stages — outbound (before sending) and inbound (before saving). Each uses AskUserQuestion with the workflow paused until approval.

```markdown
<!-- In wireframe.md Step 4 (Stitch branch), outbound consent: -->

Display to user:
"Sending to Google Stitch:
  Screens: {screen-slug-list}
  Prompt text for each screen:
    {slug}: '{generated-prompt}'
  Service: Google Stitch (stitch.withgoogle.com)

Proceed? (yes / no)"

Wait for user response. If "no": fall back to Claude generation with message:
"Stitch generation skipped by user. Generating with Claude HTML/CSS."
```

```markdown
<!-- Inbound consent, per-screen after fetch: -->

"Received from Google Stitch:
  Screen: {slug}
  Artifact type: HTML (STH-{slug}.html, ~{size}KB)
  PNG screenshot: STH-{slug}.png
  Target path: .planning/design/ux/wireframes/

Persist these files? (yes / no)"

If "no": skip this screen's STH artifacts; log warning; continue other screens.
```

### Pattern 2: Annotation Injection

Runs immediately on the raw HTML string before Write tool is called. Uses JavaScript regex (inline Node.js) to detect semantic elements and prepend `<!-- @component: ComponentName -->`.

```javascript
// Annotation injection — runs on raw HTML string after fetch
// Source: CONTEXT.md Annotation Injection decision
function injectComponentAnnotations(html) {
  const componentMap = {
    '<nav':     '<!-- @component: Navigation -->',
    '<header':  '<!-- @component: Header -->',
    '<main':    '<!-- @component: MainContent -->',
    '<section': '<!-- @component: Section -->',
    '<form':    '<!-- @component: Form -->',
  };
  let annotated = html;
  let injectedCount = 0;
  for (const [tag, comment] of Object.entries(componentMap)) {
    const regex = new RegExp(`(${tag}[\\s>])`, 'g');
    const before = annotated;
    annotated = annotated.replace(regex, `${comment}\n$1`);
    if (annotated !== before) injectedCount++;
  }
  return { html: annotated, count: injectedCount };
}
```

Partial annotations are accepted — if only 2 of 5 element types are found, inject those 2, log a warning about the missing 3, and still set `stitch_annotated: true` in the manifest entry.

### Pattern 3: Fallback Chain

Three triggers all lead to the same fallback path. The fallback path is the existing Claude HTML/CSS generation step.

```
checkStitchQuota returns {allowed: false}  ──┐
                                              ├──> User-visible warning
MCP probe timeout (>10s)               ──────┤   "Stitch unavailable: {reason}.
                                              │    Generating with Claude HTML/CSS."
stitch:generate-screen returns error   ──────┘   → proceed with Claude generation
                                                  → artifact gets WFR- prefix
                                                  → manifest source: "claude"
```

The 10-second budget applies to the connection probe (Step 3), not the generation itself. Generation timeouts (MCP call taking too long) are treated as errors and trigger fallback.

### Pattern 4: Manifest Registration for STH Artifacts

Stitch artifacts require two extra fields beyond the standard WFR manifest entry:

```bash
# Per-artifact registration — called once per STH-{slug}.html
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-add-artifact STH-{slug}
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} code "STH-{slug}"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} name "{Screen Label} (Stitch Wireframe)"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} type wireframe
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} path ".planning/design/ux/wireframes/STH-{slug}.html"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} version 1
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} source stitch
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} stitch_annotated true

# After all STH artifacts are registered: set coverage flag (read-before-set pattern)
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
# ... extract all 14 flags, set hasStitchWireframes: true, write full 14-field object
```

### Pattern 5: Mockup STH Path (mirrors wireframe)

The mockup Stitch branch is structurally identical to the wireframe branch with two differences:
1. Target path is `.planning/design/ux/mockups/STH-{slug}-hifi.html` (not wireframes/)
2. No PNG fetch for mockups (the mockup HTML is already hi-fi)

### Anti-Patterns to Avoid

- **Calling `stitch:list-screens` to get screenId:** `list_screens` has a confirmed state-sync bug (early 2026) where newly generated screens may not appear. Always use the `screenId` returned directly by `stitch:generate-screen`.
- **Writing files before inbound consent:** Consent must fire before the Write tool. The HTML/PNG strings are held in memory until approval.
- **Setting `stitch_annotated: true` before injection runs:** Injection must complete (even partially) before the manifest entry is written.
- **Using dotted path notation with `manifest-set-top-level`:** Always pass full JSON object. `manifest-set-top-level designCoverage.hasStitchWireframes true` is wrong.
- **Skipping `coverage-check` before writing `designCoverage`:** The read-before-set pattern is mandatory — overwriting with only one field resets all 13 others.
- **Retry loops on Stitch failure:** Single attempt then fallback. No retries (EFF-04).
- **Per-item consent for batch runs:** Multi-screen runs must use a single batch-consent prompt (CONSENT-04).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quota check before generation | Custom counter logic | `checkStitchQuota('standard')` from mcp-bridge.cjs | Already handles 80% threshold, exhaustion, no-quota-configured, lazy reset |
| Quota increment after generation | Custom file write | `incrementStitchQuota('standard')` from mcp-bridge.cjs | UTC reset, auto-init, atomic read-modify-write |
| Manifest field persistence | Direct JSON writes | `pde-tools.cjs design manifest-update` | Write lock, schema validation, consistent format |
| Coverage flag update | Partial JSON write | `coverage-check` + `manifest-set-top-level` 14-field object | Prevents clobbering other skills' flags |
| Stitch tool name lookup | Hardcode `mcp__stitch__*` | TOOL_MAP from mcp-bridge.cjs | TOOL_MAP_VERIFY_REQUIRED entries get updated to TOOL_MAP_VERIFIED by MCP-05 gate |

---

## Common Pitfalls

### Pitfall 1: list_screens State-Sync Bug
**What goes wrong:** Calling `stitch:list-screens` immediately after `stitch:generate-screen` returns empty or stale results — newly generated screens may be invisible until the project is opened in a browser.
**Why it happens:** Confirmed Stitch MCP bug (early 2026); server-side state not immediately consistent.
**How to avoid:** Use the `screenId` (or equivalent ID field) returned directly from `stitch:generate-screen` for all subsequent calls (`stitch:get-screen`, `stitch:fetch-screen-code`, `stitch:fetch-screen-image`). Never use `list-screens` to look up just-generated screens.
**Warning signs:** Fetch returning 404 or empty content after successful generation.

### Pitfall 2: Tool Names are MEDIUM Confidence
**What goes wrong:** `stitch:generate-screen` maps to `mcp__stitch__generate_screen_from_text` — if this is wrong, the MCP call silently fails or throws a tool-not-found error.
**Why it happens:** Official Stitch MCP docs returned minified JS; all 10 TOOL_MAP entries are from community sources (MEDIUM confidence). MCP-05 live gate in connect.md Step 3.10 is supposed to resolve this, but it requires a valid STITCH_API_KEY to run.
**How to avoid:** The workflow should check `TOOL_MAP_VERIFY_REQUIRED` vs `TOOL_MAP_VERIFIED` markers before using stitch: tools. If markers are still `TOOL_MAP_VERIFY_REQUIRED`, warn user to run `/pde:connect stitch --confirm` first.
**Warning signs:** MCP call returns tool-not-found; connect.md Step 3.10 has not been run.

### Pitfall 3: Consent Prompt Design
**What goes wrong:** User sees a raw JSON blob or internal prompt text in the consent dialog, not human-readable text.
**Why it happens:** The prompt sent to Stitch is a structured instruction; it must be formatted before display.
**How to avoid:** Separate the machine-readable prompt (sent to Stitch) from the human-readable summary (shown in AskUserQuestion). Show: screen name, key design intent, and destination service.

### Pitfall 4: Coverage Flag Clobber
**What goes wrong:** `hasStitchWireframes: true` is written but all other 13 flags are reset to false.
**Why it happens:** `manifest-set-top-level` replaces the entire `designCoverage` object.
**How to avoid:** Always run `coverage-check` first, extract all 14 values, merge `hasStitchWireframes: true`, write the full 14-field object. This pattern is documented in wireframe.md Step 7d and mockup.md Step 7e.

### Pitfall 5: Annotation Before Manifest
**What goes wrong:** Manifest entry is written with `stitch_annotated: false` (or absent) even after injection ran successfully.
**Why it happens:** Annotation and manifest registration steps run out of order.
**How to avoid:** The strict order is: fetch → annotate → persist → manifest-add-artifact. Manifest registration is always the last step per screen.

### Pitfall 6: AskUserQuestion Placement
**What goes wrong:** Consent prompt fires after the Stitch call has already been made (outbound data already sent).
**Why it happens:** Workflow steps execute in sequence and the tool call is placed before the consent check.
**How to avoid:** `checkStitchQuota` and `AskUserQuestion` (outbound consent) must both complete before any Stitch MCP tool call is made. This is the fundamental ordering constraint for CONSENT-01.

---

## Code Examples

### Wireframe.md Step 2 Flag Parsing Addition

```markdown
#### 2g. Parse --use-stitch flag

Check $ARGUMENTS for `--use-stitch`:
- If present: SET USE_STITCH = true. Log: `  -> --use-stitch detected: Stitch generation mode enabled.`
- If absent: SET USE_STITCH = false. Proceed with standard Claude HTML/CSS generation.
```

### Wireframe.md Step 4 Stitch Branch (outline)

```markdown
#### 4-STITCH. Stitch generation pipeline (when USE_STITCH is true)

Skip this section entirely when USE_STITCH is false.

**4-STITCH-A: Pre-flight quota check**

```bash
node -e "
  const {checkStitchQuota} = require('${CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs');
  const result = checkStitchQuota('standard');
  process.stdout.write(JSON.stringify(result));
"
```
Parse result. If `allowed: false`:
  Display: "Stitch quota exhausted ({reason}). Falling back to Claude HTML/CSS generation."
  SET USE_STITCH = false. Proceed with Claude generation (Step 4 standard path).

If `reason === 'quota_warning'`: display warning but continue.

**4-STITCH-B: Batch outbound consent**

Collect all screen slugs in SCREENS. Build human-readable list of screen names + design intents.
AskUserQuestion:
"About to send to Google Stitch:
  Screens ({count}): {slug-list}
  Service: Google Stitch (stitch.withgoogle.com)
  What's sent: screen description prompts for each screen listed above

Approve? (yes / no)"

If "no": SET USE_STITCH = false. Display: "Stitch generation cancelled. Proceeding with Claude HTML/CSS."
Proceed with Claude generation.

**4-STITCH-C through 4-STITCH-I** (see Architecture Patterns above)
```

### Annotation Injection (inline Node.js in workflow)

```bash
ANNOTATED=$(node -e "
  const fs = require('fs');
  const html = process.argv[1];
  const componentMap = [
    ['<nav',     '<!-- @component: Navigation -->'],
    ['<header',  '<!-- @component: Header -->'],
    ['<main',    '<!-- @component: MainContent -->'],
    ['<section', '<!-- @component: Section -->'],
    ['<form',    '<!-- @component: Form -->'],
  ];
  let out = html;
  let count = 0;
  for (const [tag, comment] of componentMap) {
    const re = new RegExp('(' + tag + '[\\\\s>])', 'g');
    const before = out;
    out = out.replace(re, comment + '\n\$1');
    if (out !== before) count++;
  }
  process.stdout.write(JSON.stringify({html: out, count}));
" "$STH_HTML_CONTENT")
```

Note: In workflow context, the HTML content is held as a shell variable after the fetch step. The annotation runs in-memory before the Write tool is called.

### Quota Increment After Successful Generation

```bash
node -e "
  const {incrementStitchQuota} = require('${CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs');
  const result = incrementStitchQuota('standard');
  process.stdout.write(JSON.stringify(result));
"
```

Call once per successful Stitch generation (after user approves inbound artifact), not per screen if batch.

---

## Existing Code Integration Points

### wireframe.md

The `--use-stitch` branch inserts into Step 4 (Generate wireframe HTML per screen). All other steps (1-3, 5-7) run unchanged. The Stitch branch produces STH- prefixed files; Steps 5-7 must accept both WFR- and STH- artifacts.

Step 7d (coverage flag) already passes `hasStitchWireframes` through via the 14-field pass-through-all pattern. Phase 66 is the first phase to set this flag to `true`.

### mockup.md

Same `--use-stitch` branch pattern inserts into Step 4. Target directory is `ux/mockups/` and filename pattern is `STH-{slug}-hifi.html`. The mockup Stitch branch does not need PNG (mockup-level hi-fi HTML is sufficient). `hasMockup` coverage flag is set by the mockup skill regardless of source.

### mcp-bridge.cjs (read-only in Phase 66)

No modifications needed. Phase 65 already provides all required exports:
- `checkStitchQuota(generationType, configPath?)` — returns `{allowed, reason, remaining, pct?}`
- `incrementStitchQuota(generationType, configPath?)` — writes and returns updated quota
- `TOOL_MAP['stitch:generate-screen']` etc. — canonical → raw tool name lookup
- `APPROVED_SERVERS.stitch.probeTool` — `'mcp__stitch__list_projects'` for connection probe

### pde-tools.cjs

Uses the existing `manifest-add-artifact`, `manifest-update`, `coverage-check`, `manifest-set-top-level`, `lock-acquire`, `lock-release` commands. No new pde-tools.cjs commands needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — tests run directly with `node --test` |
| Quick run command | `node --test tests/phase-66/*.test.mjs` |
| Full suite command | `node --test tests/phase-65/*.test.mjs tests/phase-66/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WFR-01 | wireframe.md contains `--use-stitch` in flags table + Step 4 branch | unit (file parse) | `node --test tests/phase-66/wireframe-stitch-flag.test.mjs` | ❌ Wave 0 |
| WFR-02 | STH-{slug}.html + STH-{slug}.png artifact paths documented in workflow | unit (file parse) | `node --test tests/phase-66/wireframe-stitch-flag.test.mjs` | ❌ Wave 0 |
| WFR-03 | Annotation injection produces `<!-- @component: -->` comments in HTML | unit (regex logic) | `node --test tests/phase-66/annotation-injection.test.mjs` | ❌ Wave 0 |
| WFR-04 | Manifest registration includes `source: "stitch"` and `stitch_annotated: true` fields | unit (file parse) | `node --test tests/phase-66/wireframe-stitch-flag.test.mjs` | ❌ Wave 0 |
| WFR-05 | mockup.md contains `--use-stitch` in flags table + Step 4 branch | unit (file parse) | `node --test tests/phase-66/mockup-stitch-flag.test.mjs` | ❌ Wave 0 |
| WFR-06 | Fallback path present in wireframe.md + mockup.md Stitch branch | unit (file parse) | `node --test tests/phase-66/wireframe-stitch-flag.test.mjs` | ❌ Wave 0 |
| CONSENT-01 | Outbound consent (AskUserQuestion) before `stitch:generate-screen` in workflow | unit (file parse) | `node --test tests/phase-66/consent-gates.test.mjs` | ❌ Wave 0 |
| CONSENT-02 | Inbound consent before Write tool in workflow | unit (file parse) | `node --test tests/phase-66/consent-gates.test.mjs` | ❌ Wave 0 |
| CONSENT-03 | Consent prompt template shows data being sent/received | unit (string match) | `node --test tests/phase-66/consent-gates.test.mjs` | ❌ Wave 0 |
| CONSENT-04 | Batch consent prompt (single AskUserQuestion for multi-screen runs) | unit (file parse) | `node --test tests/phase-66/consent-gates.test.mjs` | ❌ Wave 0 |
| EFF-01 | critique.md + handoff.md read `source: "stitch"` from manifest, no re-fetch | manual-only (downstream phases 68-69 not yet built) | n/a | n/a |
| EFF-02 | Manifest path field holds local STH- path (not Stitch URL) | unit (file parse) | `node --test tests/phase-66/wireframe-stitch-flag.test.mjs` | ❌ Wave 0 |
| EFF-04 | 10-second timeout budget + single-attempt fallback in Stitch branch | unit (file parse) | `node --test tests/phase-66/fallback-behavior.test.mjs` | ❌ Wave 0 |
| EFF-05 | Annotation injection per-screen immediately after fetch (not after batch) | unit (order check in file) | `node --test tests/phase-66/annotation-injection.test.mjs` | ❌ Wave 0 |

Note: EFF-01 is marked manual-only because critique.md (Phase 68) and handoff.md (Phase 69) are the consumers; they are out of scope for Phase 66. The Phase 66 side of EFF-01 (writing local paths to manifest instead of URLs) is covered by the WFR-02 and EFF-02 tests.

### Sampling Rate

- **Per task commit:** `node --test tests/phase-66/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-65/*.test.mjs tests/phase-66/*.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-66/wireframe-stitch-flag.test.mjs` — covers WFR-01, WFR-02, WFR-04, WFR-06, EFF-02
- [ ] `tests/phase-66/mockup-stitch-flag.test.mjs` — covers WFR-05
- [ ] `tests/phase-66/annotation-injection.test.mjs` — covers WFR-03, EFF-05
- [ ] `tests/phase-66/consent-gates.test.mjs` — covers CONSENT-01, CONSENT-02, CONSENT-03, CONSENT-04
- [ ] `tests/phase-66/fallback-behavior.test.mjs` — covers WFR-06, EFF-04

---

## Open Questions

1. **TOOL_MAP verification status at implementation time**
   - What we know: All 10 Stitch TOOL_MAP entries are `TOOL_MAP_VERIFY_REQUIRED` (Phase 65 decision). The live gate requires a valid `STITCH_API_KEY` and running `/pde:connect stitch --confirm`.
   - What's unclear: Whether the live gate has been run and TOOL_MAP entries are now `TOOL_MAP_VERIFIED`.
   - Recommendation: Workflows should check for `TOOL_MAP_VERIFY_REQUIRED` markers at the start of the Stitch branch and warn the user to run the live gate if markers are still unverified. This is a guard, not a hard block.

2. **AskUserQuestion tool availability in workflow context**
   - What we know: Consent requires user approval before data transmission. CONTEXT.md specifies `AskUserQuestion` as the mechanism.
   - What's unclear: The exact tool invocation syntax for `AskUserQuestion` within markdown workflow files vs. other confirmation patterns used in existing PDE workflows.
   - Recommendation: Examine how existing workflows prompt for user confirmation (wireframe.md 2d version gate already has a prompt pattern). Follow that exact pattern for consent prompts.

3. **PNG screenshot fetch: base64 or binary?**
   - What we know: `stitch:fetch-screen-image` returns the PNG. The returned format (base64 string vs binary) affects how it's persisted.
   - What's unclear: The exact return format of `fetch-screen-image` (MEDIUM confidence on tool behavior).
   - Recommendation: Treat it as base64; use `Buffer.from(base64, 'base64')` before writing. If binary, write directly. The workflow should handle both and log a warning if format detection fails.

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/mcp-bridge.cjs` (Phase 65) — TOOL_MAP, checkStitchQuota, incrementStitchQuota, readStitchQuota function signatures and behavior
- `workflows/wireframe.md` — Step structure, manifest registration pattern (Step 7c-7d), flag parsing pattern (Step 2), coverage-check read-before-set
- `workflows/mockup.md` — Step structure, manifest registration pattern (Step 7d-7e), flag parsing
- `templates/design-manifest.json` — Manifest schema: 14 designCoverage fields, artifact entry structure
- `.planning/REQUIREMENTS.md` — WFR-01 through WFR-06, CONSENT-01 through CONSENT-04, EFF-01/02/04/05 success criteria
- `.planning/phases/66-wireframe-mockup-stitch-integration/66-CONTEXT.md` — All locked decisions

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — list_screens state-sync bug (confirmed early 2026, single source)
- `.planning/phases/65-mcp-bridge-quota-infrastructure/65-01-SUMMARY.md` — Phase 65 bridge decisions (stdio transport, TOOL_MAP_VERIFY_REQUIRED pattern)
- `.planning/phases/65-mcp-bridge-quota-infrastructure/65-02-SUMMARY.md` — Phase 65 quota decisions (configPath injection, UTC reset, null vs default)

### Tertiary (LOW confidence)

- Stitch TOOL_MAP tool names: `mcp__stitch__generate_screen_from_text`, `mcp__stitch__fetch_screen_code`, `mcp__stitch__fetch_screen_image` — MEDIUM confidence from community sources, requiring live MCP-05 gate verification.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all infrastructure from Phase 65, fully verified
- Architecture: HIGH — workflow modification patterns directly readable from wireframe.md and mockup.md
- Pitfalls: HIGH (list_screens bug confirmed) / MEDIUM (tool name confidence)
- Test strategy: HIGH — follows exact Phase 65 Nyquist pattern (node:test, file parse assertions)

**Research date:** 2026-03-20
**Valid until:** 2026-06-20 (stable — depends on Phase 65 artifacts which are already shipped; Stitch TOOL_MAP confidence depends on MCP-05 live gate being run)
