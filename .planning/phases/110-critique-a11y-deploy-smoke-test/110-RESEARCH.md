# Phase 110: Critique A11y + Deploy Smoke Test — Research

**Researched:** 2026-03-23
**Domain:** Playwright AOM accessibility extraction + post-deploy smoke verification
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| A11Y-01 | critique.md accessibility perspective uses browser_snapshot for AOM tree when Playwright available | Playwright MCP `browser_snapshot` returns YAML AOM tree with landmark roles, heading levels, ARIA attributes — see Architecture Patterns §AOM Extraction |
| A11Y-02 | AOM tree analyzed for missing landmarks, unlabeled controls, heading hierarchy issues | YAML tree includes `banner`, `main`, `navigation`, `heading [level=N]` — parse algorithm documented in Code Examples |
| A11Y-03 | Browser a11y data merges with Axe MCP results when both available | `a11y-mcp` returns structured violations; merge strategy: union of findings deduplicated by type — see Architecture Patterns §Merge Strategy |
| A11Y-04 | Falls back to manual WCAG checklist when neither Playwright nor Axe available | Existing pattern in wcag-baseline.md + `[Manual accessibility review -- install ...]` tag — zero changes to degradation path |
| DEP-01 | deploy.md adds post-deploy smoke test after Gate 4/4 success | New Step 5 inserted between current Step 4 (deploy) and Step 5 (manifest write) — see Architecture Patterns §Smoke Test Position |
| DEP-02 | Navigates to $DEPLOY_URL, captures screenshot and accessibility snapshot | `browser_navigate` → `browser_take_screenshot` → `browser_snapshot` pattern — same pattern as wireframe Step 5d |
| DEP-03 | Verifies expected sections present (hero, pricing, CTA from LDP spec) | Parse `$LDP_SECTIONS` already loaded in Step 2; check AOM tree for section landmarks matching LDP component names |
| DEP-04 | Retry with exponential backoff (3 attempts, 10s/20s/40s) for builds still in progress | Vercel `--no-wait` returns URL immediately; page may 404/502 until build ready — bash sleep loop with probe |
| DEP-05 | Pass/fail results logged to deploy-manifest.json with screenshot path | Augment existing manifest JSON: add `smoke_test` key to `vercel_deployment` object |
</phase_requirements>

---

## Summary

Phase 110 has two distinct but parallel tracks. The accessibility track integrates real browser Accessibility Object Model data into the critique skill's accessibility perspective, which currently delegates entirely to `/pde:hig --light` with Axe MCP. The new work adds a Playwright `browser_snapshot` call before or after the Axe probe, extracts landmarks/headings/unlabeled-controls from the YAML AOM tree, and merges those findings with any Axe violations into a unified accessibility report.

The deploy smoke test track adds a new step inside `deploy.md` that fires after the Vercel deployment is queued (Gate 4/4 success). Because Vercel `--no-wait` returns immediately before the build completes, the smoke test must poll with exponential backoff until the page responds. Once live, it navigates to `$DEPLOY_URL`, takes a screenshot, captures the AOM snapshot, and verifies that expected LDP sections appear in the tree. Results are appended to `deploy-manifest.json`.

Both tracks share the same Playwright MCP bridge pattern established in Phase 108/109. Tool names are resolved via `mcp-bridge.cjs` using the `playwright:navigate`, `playwright:screenshot`, and `playwright:snapshot` bridge keys. The `a11y-mcp` probe pattern is already defined in `hig.md` using `mcp__a11y__*` namespace. No new dependencies are required.

**Primary recommendation:** Follow the Phase 109 wireframe screenshot loop as the implementation template for both tracks. Probe Playwright once, resolve tool names via bridge, then use navigate/screenshot/snapshot in sequence. For the AOM analysis, parse the YAML text returned by `browser_snapshot` directly — no external parser needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright MCP (`@playwright/mcp`) | latest (pin `@0.0.41` fallback) | Browser automation, AOM snapshot capture | Already registered as 7th APPROVED_SERVER in mcp-bridge.cjs (Phase 108) |
| a11y-mcp | latest (`npx -y a11y-mcp`) | Axe-core WCAG violation scanning | Already integrated in hig.md; `mcp__a11y__*` probe pattern defined |
| mcp-bridge.cjs | internal (PDE) | Resolves live tool names for all Playwright bridge keys | Established pattern from Phase 109; `playwright:snapshot` key needs verification |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| wcag-baseline.md | PDE reference | Manual WCAG checklist for fallback path | When neither Playwright nor Axe available (A11Y-04) |
| pde-tools.cjs manifest commands | internal | Read/write deploy-manifest.json entries | DEP-05: appending smoke test results |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| browser_snapshot YAML parsing | Separate axe audit | Playwright AOM covers structural issues (landmarks, hierarchy) that axe-core misses; both needed |
| Simple page load check | curl/wget probe for backoff | Playwright MCP probe gives richer signal (page content visible, not just HTTP 200) |

**Installation:** No new packages. Playwright MCP and a11y-mcp are already installed or available via existing PDE setup commands.

---

## Architecture Patterns

### Domain 1: AOM Extraction in critique.md

#### Where in the critique pipeline

Critique currently delegates Perspective 3 (Accessibility) to `/pde:hig --light`. The AOM integration goes into the **accessibility perspective step inside critique.md** — specifically, the section that currently calls hig with `--no-axe` or delegates Axe handling. The Playwright `browser_snapshot` probe runs alongside the Axe probe in Step 3 (MCP probes), and the AOM tree is parsed and stored so Perspective 3 can use it.

#### AOM Extraction Pattern
**What:** Call `browser_snapshot` after navigating to the wireframe/mockup HTML, extract the YAML output, parse for landmarks, headings, and unlabeled interactive controls.
**When to use:** When PLAYWRIGHT_AVAILABLE is true AND artifact is an HTML file (wireframe or mockup).

```
Step 3 (MCP Probes) additions in critique.md:

IF PLAYWRIGHT_AVAILABLE:
  SET AOM_DATA = result of mcp__playwright__browser_snapshot (or bridge-resolved tool)
  Parse AOM_DATA YAML for:
    LANDMARKS    = all roles: banner, main, navigation, complementary, contentinfo, region, search
    HEADINGS     = all "heading [level=N]" entries with their text and level number
    UNLABELED    = interactive roles (button, link, textbox, combobox, checkbox, radio) with empty/missing name
  SET PLAYWRIGHT_A11Y_AVAILABLE = true
ELSE:
  SET PLAYWRIGHT_A11Y_AVAILABLE = false
```

#### YAML AOM Tree Structure (HIGH confidence — verified via official Playwright docs)

```yaml
# Typical browser_snapshot output:
- generic [ref=e1]:
  - banner [ref=e6]:
    - heading "Page Title" [level=1] [ref=e7]
    - navigation "Global" [ref=e14]:
      - list [ref=e15]:
        - listitem [ref=e16]:
          - link "Home" [ref=e17]
  - main [ref=e20]:
    - heading "Features" [level=2] [ref=e21]
    - section "Pricing" [ref=e30]:
      - button "" [ref=e31]          # <-- unlabeled button
  - contentinfo [ref=e40]:
    - link "Privacy" [ref=e41]
```

#### AOM Analysis Algorithm
```
MISSING LANDMARKS check:
  Required set = {banner, main, contentinfo}
  Recommended = {navigation}
  Missing = Required set MINUS found landmark roles

HEADING HIERARCHY check:
  Extract all heading[level=N] in tree order
  Violations:
    - First heading is not level=1
    - Level jumps more than 1 (e.g., h1 -> h3, skipping h2)
    - Multiple h1 elements
    - No headings present at all

UNLABELED CONTROLS check:
  Find all: button, link, textbox, combobox, checkbox, radio, switch
  Flag any with empty name "" or no name attribute
  Note: role=img with no name is also flagged
```

#### Merge Strategy (A11Y-03)
**What:** When both PLAYWRIGHT_A11Y_AVAILABLE and AXE_AVAILABLE are true, merge findings without duplication.
**How:** Playwright AOM detects structural/semantic issues (missing landmarks, heading hierarchy, unlabeled controls). Axe detects WCAG criterion violations (contrast, ARIA misuse, focus management). These are complementary, not overlapping — merge as a combined table with source column.

```
IF PLAYWRIGHT_A11Y_AVAILABLE AND AXE_AVAILABLE:
  section: "Accessibility Findings (AOM + Axe)"
  table:
    | Source | Severity | Issue | Criterion |
    | AOM    | ...      | ...   | ...       |
    | Axe    | ...      | ...   | ...       |
  tag: "[Enhanced by Playwright AOM + Axe MCP]"

IF PLAYWRIGHT_A11Y_AVAILABLE AND NOT AXE_AVAILABLE:
  section: "Accessibility Findings (AOM)"
  tag: "[Enhanced by Playwright AOM — install a11y MCP for WCAG violation scan]"

IF NOT PLAYWRIGHT_A11Y_AVAILABLE AND AXE_AVAILABLE:
  section: "Accessibility Findings (Axe)"
  tag: "[Enhanced by Axe MCP — install Playwright MCP for AOM structural analysis]"

IF neither:
  Manual WCAG checklist from wcag-baseline.md
  tag: "[Manual accessibility review -- install Playwright MCP + a11y MCP for automated analysis]"
```

#### Playwright Bridge Tool for Snapshot

The mcp-bridge.cjs defines canonical Playwright bridge keys. Phase 108/109 established: `playwright:navigate`, `playwright:screenshot`, `playwright:resize`, `playwright:close`. For AOM work, the relevant key is `playwright:snapshot` — this maps to `browser_snapshot` in the official @playwright/mcp tool namespace.

**CRITICAL:** Verify `playwright:snapshot` exists in TOOL_MAP before writing critque.md step. Pattern: resolve via bridge, check for empty string, degrade if missing (same as Phase 109 pattern).

```javascript
// Bridge resolution (same pattern as wireframe.md Step 5d)
const b = require(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
snapshotToolName = b.call('playwright:snapshot', {}).toolName;
// If empty string: skip AOM, degrade to manual
```

---

### Domain 2: Deploy Smoke Test

#### Smoke Test Position in deploy.md

Current deploy.md flow:
- Step 4/6: Gate 4/4 Vercel deploy → stores `$DEPLOY_URL`
- Step 5/6: Write deploy-manifest.json
- Step 6/6: Output summary

New flow inserts smoke test as **Step 5/6** (shifting old steps):
- Step 4/6: Gate 4/4 Vercel deploy → stores `$DEPLOY_URL`
- **NEW Step 5/6: Post-deploy smoke test** (DEP-01 through DEP-04)
- Step 6/7: Write deploy-manifest.json (updated with smoke results — DEP-05)
- Step 7/7: Output summary

**Why after Gate 4, not concurrent:** The smoke test needs `$DEPLOY_URL` which is only available after `$DEPLOY_EXIT == 0`. The manifest write needs the smoke test results to include them.

#### Exponential Backoff Pattern (DEP-04)

Vercel `--no-wait` returns the deployment URL immediately while the build is still in progress. The deployed page will return HTTP 404, 502, or Vercel's "building" page until the build completes. Requirement specifies: 3 attempts, delays 10s/20s/40s.

```
Smoke test retry loop (pseudocode for critique.md step):

SMOKE_PASS = false
SMOKE_ATTEMPTS = 0
BACKOFF_DELAYS = [10, 20, 40]  # seconds

FOR attempt = 1 to 3:
  SMOKE_ATTEMPTS = attempt

  IF PLAYWRIGHT_AVAILABLE:
    Navigate to $DEPLOY_URL
    IF page loads (no network error, no Vercel "building" indicator):
      Capture screenshot → .planning/deploy-staging/smoke-screenshot.png
      Capture browser_snapshot (AOM)
      Verify expected sections (see below)
      SET SMOKE_PASS = true
      BREAK
    ELSE:
      IF attempt < 3:
        Log: "  -> Smoke test attempt {attempt} — deploy not ready. Retrying in {BACKOFF_DELAYS[attempt-1]}s..."
        Sleep {BACKOFF_DELAYS[attempt-1]} seconds
      ELSE:
        Log: "  -> Smoke test failed after 3 attempts — deploy URL not responding."
  ELSE:
    Log: "[Smoke test skipped — Playwright MCP unavailable]"
    BREAK

Store SMOKE_PASS, SMOKE_ATTEMPTS, SMOKE_SCREENSHOT_PATH for manifest.
```

**Detecting "build in progress" state:** Vercel serves a specific page when build is not ready. Check AOM for absence of expected content OR use `browser_snapshot` to detect Vercel's "deployment in progress" text. Simpler: check if ANY of the expected LDP sections are missing.

#### Expected Sections Verification (DEP-03)

LDP sections are already loaded in deploy.md Step 2 as `$LDP_SECTIONS` (extracted from `LDP-landing-page-v{N}.md` Section Map table). The smoke test uses these sections as the expected content checklist.

```
Section verification algorithm:
  Parse $LDP_SECTIONS (already available in step context)
  Key sections to always verify: hero, pricing, CTA
    (These are the canonical LDP sections per requirements)

  For each expected section name in $LDP_SECTIONS:
    Check if AOM tree contains:
      - A landmark or heading with matching text (case-insensitive)
      - OR a section/region with matching accessible name

  SECTION_RESULTS = [{section: name, found: true/false}, ...]
  ALL_SECTIONS_FOUND = all(found) for SECTION_RESULTS
```

#### Screenshot Capture Pattern

Reuse the exact wireframe Step 5d pattern (navigate → screenshot) adapted for live URLs:

```
1. Resolve tool names via bridge:
   navigateToolName   = b.call('playwright:navigate',   {}).toolName
   screenshotToolName = b.call('playwright:screenshot', {}).toolName
   snapshotToolName   = b.call('playwright:snapshot',   {}).toolName

2. Navigate: {navigateToolName} with { url: $DEPLOY_URL }
3. Screenshot: {screenshotToolName} with {
     filename: '.planning/deploy-staging/smoke-screenshot.png',
     type: 'png'
   }
4. Snapshot: {snapshotToolName} → parse for section verification

No file:// encoding needed (live HTTPS URL, no spaces issue).
No --allow-unrestricted-file-access needed for HTTPS URLs.
```

#### Manifest Update for Smoke Test (DEP-05)

The existing `vercel_deployment` object in deploy-manifest.json gets a new `smoke_test` key:

```json
"vercel_deployment": {
  "status": "queued",
  "deployment_url": "${DEPLOY_URL}",
  "review_required": true,
  "reviewed": false,
  "notes": "...",
  "smoke_test": {
    "status": "pass|fail|skipped",
    "attempts": 2,
    "screenshot_path": ".planning/deploy-staging/smoke-screenshot.png",
    "sections_found": ["hero", "pricing", "cta"],
    "sections_missing": [],
    "timestamp": "2026-03-23T19:08:00Z"
  }
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessibility tree extraction | Custom DOM parser, regex on HTML | `browser_snapshot` via Playwright MCP | AOM reflects actual browser interpretation, not static HTML; catches ARIA misuse, dynamic content, CSS-hidden elements |
| WCAG violation detection | Manual WCAG rule checklist | a11y-mcp (axe-core engine) | axe-core covers ~56 WCAG criteria with proven rule implementations; manual checks miss edge cases |
| Deployment readiness polling | Custom HTTP status check loop | Playwright MCP navigation + AOM check | HTTP 200 doesn't mean content is rendered; AOM check confirms page is actually serving expected content |
| Screenshot path management | Custom file naming scheme | Follow `.planning/deploy-staging/` convention already in deploy.md | Keeps all deploy artifacts co-located; gitignore already covers this directory |
| LDP section names | Re-parsing the LDP file | `$LDP_SECTIONS` variable already loaded in deploy.md Step 2 | Avoids double-read; consistent with how scaffold generation already uses section names |

**Key insight:** The Playwright AOM approach is fundamentally more reliable than static HTML analysis for accessibility — it reflects what assistive technologies actually see, including dynamic ARIA, JavaScript-generated content, and CSS visibility states.

---

## Common Pitfalls

### Pitfall 1: browser_snapshot vs browser_take_screenshot — different tools, different purpose
**What goes wrong:** Using screenshot when AOM data is needed, or calling snapshot and expecting an image.
**Why it happens:** Both tools probe the page after navigation; easy to conflate.
**How to avoid:** `browser_snapshot` → YAML text (AOM). `browser_take_screenshot` → PNG file. Both are needed for the smoke test (screenshot for human review, snapshot for section verification).
**Warning signs:** Smoke test reports sections as missing even when page loads correctly.

### Pitfall 2: bridge key `playwright:snapshot` may not exist in TOOL_MAP
**What goes wrong:** Bridge lookup returns empty string, causing AOM step to silently skip.
**Why it happens:** Phase 108 added keys for `navigate`, `screenshot`, `resize`, `close`. The `snapshot` key presence is unconfirmed.
**How to avoid:** Wave 0 of the plan MUST verify TOOL_MAP contains `playwright:snapshot`. If missing, add it to mcp-bridge.cjs before critique.md references it.
**Warning signs:** All AOM analysis silently degrades even when Playwright is available.

### Pitfall 3: Vercel --no-wait URL is a deployment subdomain, not necessarily the production domain
**What goes wrong:** Smoke test navigates to the deployment preview URL (e.g., `https://my-project-abc123.vercel.app`) which may have different content or redirect behavior than `my-project.vercel.app`.
**Why it happens:** `vercel --prod --no-wait` outputs the deployment URL, not the aliased production domain.
**How to avoid:** This is acceptable for smoke testing — the deployment subdomain is exactly what was just deployed. Document in manifest that smoke test ran against deployment URL, not production alias.
**Warning signs:** None — this is expected behavior.

### Pitfall 4: Exponential backoff total time (70s) must not block critique pipeline
**What goes wrong:** Smoke test blocks deploy.md for 70 seconds if all 3 attempts fail.
**Why it happens:** Vercel builds can take 2-5+ minutes for Next.js projects with complex builds.
**How to avoid:** After 3 failed attempts, mark smoke_test.status as "fail" and continue — do NOT halt the deploy workflow. The deploy already succeeded; smoke test is informational.
**Warning signs:** User reports `/pde:deploy` hanging or timing out.

### Pitfall 5: AOM YAML parsing is string-based, not structured
**What goes wrong:** Heading hierarchy analysis produces false positives if AOM text contains "heading" in content (e.g., a button labeled "See pricing heading").
**Why it happens:** The YAML is a text representation; there's no formal parser.
**How to avoid:** Match YAML patterns with line-level heuristics: lines beginning with `- heading "` (role=heading), `- banner:` (role=banner landmark), `- button ""` (empty name). The YAML structure is consistent enough for these pattern checks.
**Warning signs:** False "missing heading" findings on pages that clearly have headings.

### Pitfall 6: critique.md Playwright probe is already set up for wireframe HTML, not deployed URLs
**What goes wrong:** AOM extraction for critique uses `--allow-unrestricted-file-access` file:// URLs; smoke test uses HTTPS — different navigation context.
**Why it happens:** Two different use cases for the same Playwright MCP instance.
**How to avoid:** The Playwright MCP registered with `--allow-unrestricted-file-access` handles both file:// and https:// — no conflict. Navigate with the URL as-is; file:// encoding only needed for local files.
**Warning signs:** None — this is not actually a conflict.

---

## Code Examples

Verified patterns from official sources and existing PDE codebase:

### Bridge Tool Name Resolution (from wireframe.md Step 5d — EXISTING PATTERN)
```javascript
// Source: workflows/wireframe.md Step 5d (Phase 109 established pattern)
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
let snapshotToolName = '', navigateToolName = '', screenshotToolName = '';
try {
  snapshotToolName   = b.call('playwright:snapshot',   {}).toolName;
  navigateToolName   = b.call('playwright:navigate',   { url: 'about:blank' }).toolName;
  screenshotToolName = b.call('playwright:screenshot', {}).toolName;
} catch (err) {
  snapshotToolName = navigateToolName = screenshotToolName = '';
}
process.stdout.write(JSON.stringify({ snapshotToolName, navigateToolName, screenshotToolName }) + '\n');
EOF
// If any toolName is empty string → skip AOM/screenshot, degrade gracefully
```

### Playwright AOM YAML Output Format (HIGH confidence — official Playwright docs)
```yaml
# Source: https://playwright.dev/docs/aria-snapshots
# Example AOM tree from browser_snapshot:
- generic [ref=e1]:
  - banner [ref=e6]:
    - heading "Site Title" [level=1] [ref=e7]
    - navigation "Main" [ref=e14]:
      - link "Home" [ref=e15]
  - main [ref=e20]:
    - heading "Hero Section" [level=2] [ref=e21]
    - button "Get Started" [ref=e25]
    - heading "Pricing" [level=2] [ref=e30]
    - button "" [ref=e31]   # <-- unlabeled: no accessible name
  - contentinfo [ref=e50]:
    - link "Privacy" [ref=e51]
```

### AOM Analysis (pseudocode for critique.md Perspective 3 step)
```
# Source: derived from Playwright ARIA snapshots documentation
# Step: analyze AOM_DATA YAML text

LANDMARKS = []
HEADINGS = []     # list of {level: N, text: "..."}
UNLABELED = []    # list of {role: "...", name: ""}

FOR EACH LINE in AOM_DATA:
  IF line matches "- banner" OR "- main" OR "- navigation" OR "- complementary"
      OR "- contentinfo" OR "- region" OR "- search":
    ADD matched role to LANDMARKS

  IF line matches '- heading "{text}" [level={N}]':
    ADD {level: N, text: text} to HEADINGS

  IF line matches '- (button|link|textbox|combobox|checkbox|radio) ""':
    ADD {role: matched_role} to UNLABELED

# Missing landmarks check:
MISSING = {banner, main, contentinfo} MINUS set(LANDMARKS)

# Heading hierarchy check:
HIERARCHY_ISSUES = []
FOR i = 0 to len(HEADINGS)-1:
  IF i == 0 AND HEADINGS[0].level != 1:
    ADD "First heading is not h1 (found h{HEADINGS[0].level})"
  IF i > 0 AND HEADINGS[i].level > HEADINGS[i-1].level + 1:
    ADD "Heading level jump: h{HEADINGS[i-1].level} → h{HEADINGS[i].level}"
IF count(h1 in HEADINGS) > 1:
  ADD "Multiple h1 headings ({count})"
```

### Smoke Test Exponential Backoff (pseudocode for deploy.md Step 5)
```bash
# Source: AWS prescriptive guidance + DEP-04 requirement
# Delays: 10s / 20s / 40s for attempts 1/2/3

SMOKE_PASS=false
SMOKE_ATTEMPTS=0
BACKOFF_DELAYS=(10 20 40)

for attempt in 1 2 3; do
  SMOKE_ATTEMPTS=$attempt

  # Navigate to deploy URL via Playwright MCP
  # {navigateToolName} with { url: "$DEPLOY_URL" }

  # Check if page loaded vs "build in progress" indicator
  # Run {snapshotToolName} → check AOM for expected sections

  if [[ page has content AND sections verified ]]; then
    # {screenshotToolName} → .planning/deploy-staging/smoke-screenshot.png
    SMOKE_PASS=true
    break
  fi

  if [[ $attempt -lt 3 ]]; then
    echo "  -> Smoke test attempt ${attempt} — not ready. Retrying in ${BACKOFF_DELAYS[$attempt-1]}s..."
    sleep ${BACKOFF_DELAYS[$attempt-1]}
  fi
done
```

### Manifest Smoke Test Augmentation (for deploy.md Step 6/manifest write)
```json
// Source: extended from existing deploy-manifest.json schema (deploy.md Step 5/6)
"vercel_deployment": {
  "status": "queued",
  "deployment_url": "${DEPLOY_URL}",
  "review_required": true,
  "reviewed": false,
  "notes": "Deployment in progress...",
  "smoke_test": {
    "status": "pass",
    "attempts": 2,
    "screenshot_path": ".planning/deploy-staging/smoke-screenshot.png",
    "sections_found": ["hero", "pricing", "cta"],
    "sections_missing": [],
    "timestamp": "${ISO8601_TIMESTAMP}"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static HTML regex for accessibility | Browser AOM via Playwright (page.accessibility.snapshot) | Playwright v1.8+ (2021); MCP integration 2025 | Catches dynamic ARIA, CSS-hidden content, computed roles |
| Manual WCAG checklist only | Axe-core automated scan + AOM structural check | axe-core since 2016; combination approach 2024+ | ~40% more WCAG issues detected automatically |
| Wait for deployment then test | --no-wait + polling with backoff | Standard CI/CD pattern 2022+ | Non-blocking deployments; tests run in parallel |
| Pixel-based screenshot comparison | AOM tree structural verification | Playwright MCP default mode 2025 | Stable, token-efficient, no image comparison needed |

**Deprecated/outdated:**
- `page.accessibility.snapshot()` direct API: Still valid in Playwright SDK but not available via MCP tool call. The MCP uses `browser_snapshot` which returns the same ARIA tree in YAML.
- `mcp__a11y__audit_webpage` with URL parameter: a11y-mcp requires a live URL, not a file path. For local HTML files, AOM via Playwright is the correct approach.

---

## Open Questions

1. **Does `playwright:snapshot` exist as a bridge key in mcp-bridge.cjs?**
   - What we know: Phase 108 added `navigate`, `screenshot`, `resize`, `close`. Snapshot was not in the Phase 108 scope.
   - What's unclear: Whether `browser_snapshot` in the @playwright/mcp tool maps to a `playwright:snapshot` TOOL_MAP entry, or a different key.
   - Recommendation: Wave 0 task MUST read mcp-bridge.cjs TOOL_MAP and either confirm the key or add it. If absent, add `playwright:snapshot` → `browser_snapshot` to TOOL_MAP.

2. **Where exactly in critique.md does the Playwright probe get added?**
   - What we know: Critique Step 3 has Sequential Thinking probe. Axe probe is "handled inside HIG skill" per line 189 of critique.md. A11Y-01 says "accessibility perspective" uses AOM.
   - What's unclear: Whether the Playwright probe goes into critique.md Step 3 (alongside ST probe), or into the Perspective 3 execution step, or into hig.md's light mode.
   - Recommendation: Add Playwright probe to critique.md Step 3 (alongside existing probes). Perspective 3 then has access to PLAYWRIGHT_A11Y_AVAILABLE flag and AOM_DATA. This keeps probe/degrade consistent with other MCP patterns and doesn't touch hig.md's locked sections.

3. **Does the smoke test step in deploy.md need Playwright MCP separately available?**
   - What we know: deploy.md doesn't currently probe Playwright at all. The smoke test needs it.
   - What's unclear: Should the smoke test be silently skipped if Playwright unavailable, or should deploy.md add a probe step?
   - Recommendation: Add Playwright probe at the start of the new smoke test step (Step 5). If unavailable, set smoke_test.status = "skipped" and continue. Same graceful degradation pattern as every other PDE skill.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — run directly |
| Quick run command | `node --test tests/phase-110/*.test.mjs` |
| Full suite command | `node --test tests/**/*.test.mjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| A11Y-01 | critique.md contains `playwright:snapshot` bridge call in accessibility step | structural | `node --test tests/phase-110/critique-a11y-aom.test.mjs` | ❌ Wave 0 |
| A11Y-02 | critique.md contains AOM analysis for landmarks/headings/unlabeled controls | structural | `node --test tests/phase-110/critique-a11y-aom.test.mjs` | ❌ Wave 0 |
| A11Y-03 | critique.md contains merge logic for both Playwright+Axe available | structural | `node --test tests/phase-110/critique-a11y-aom.test.mjs` | ❌ Wave 0 |
| A11Y-04 | critique.md references wcag-baseline.md fallback when neither MCP available | structural | `node --test tests/phase-110/critique-a11y-aom.test.mjs` | ❌ Wave 0 |
| DEP-01 | deploy.md contains smoke test step after Gate 4 success | structural | `node --test tests/phase-110/deploy-smoke-test.test.mjs` | ❌ Wave 0 |
| DEP-02 | deploy.md contains browser_navigate + browser_take_screenshot + browser_snapshot sequence | structural | `node --test tests/phase-110/deploy-smoke-test.test.mjs` | ❌ Wave 0 |
| DEP-03 | deploy.md references $LDP_SECTIONS and section verification logic | structural | `node --test tests/phase-110/deploy-smoke-test.test.mjs` | ❌ Wave 0 |
| DEP-04 | deploy.md contains exponential backoff with delays 10/20/40 | structural | `node --test tests/phase-110/deploy-smoke-test.test.mjs` | ❌ Wave 0 |
| DEP-05 | deploy.md writes smoke_test key to deploy-manifest.json | structural | `node --test tests/phase-110/deploy-smoke-test.test.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-110/*.test.mjs`
- **Per wave merge:** `node --test tests/**/*.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-110/critique-a11y-aom.test.mjs` — covers A11Y-01 through A11Y-04
- [ ] `tests/phase-110/deploy-smoke-test.test.mjs` — covers DEP-01 through DEP-05
- [ ] Verify `playwright:snapshot` key in `bin/lib/mcp-bridge.cjs` TOOL_MAP (add if missing)

---

## Sources

### Primary (HIGH confidence)
- [Playwright ARIA Snapshots official docs](https://playwright.dev/docs/aria-snapshots) — YAML format, role/heading/landmark structure, partial matching
- `workflows/wireframe.md` Step 5d — existing bridge pattern for navigate/screenshot/resize (established Phase 109)
- `references/mcp-integration.md` — Playwright MCP probe pattern, a11y-mcp probe, tool names, degradation
- `workflows/deploy.md` — existing deploy flow, deploy-manifest.json schema, $LDP_SECTIONS loading
- `workflows/critique.md` + `workflows/hig.md` — existing Axe probe (`mcp__a11y__*` namespace), degradation paths
- [Vercel CLI deploy docs](https://vercel.com/docs/cli/deploy) — `--no-wait` behavior, stdout = deployment URL

### Secondary (MEDIUM confidence)
- [Playwright MCP GitHub (microsoft/playwright-mcp)](https://github.com/microsoft/playwright-mcp) — confirms `browser_snapshot` returns YAML accessibility tree
- [zstack-cloud Playwright-MCP deep dive](https://www.zstack-cloud.com/blog/playwright-mcp-deep-dive-the-perfect-combination-of-large-language-models-and-browser-automation/) — real YAML snapshot example with banner/navigation/heading roles
- [a11y-mcp GitHub (priyankark/a11y-mcp)](https://github.com/priyankark/a11y-mcp) — `audit_webpage` tool name, axe-core violations format

### Tertiary (LOW confidence)
- Exponential backoff pattern (10s/20s/40s) — per-requirement spec; matches standard 2x backoff pattern documented widely; no single authoritative source needed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both MCPs already integrated in PDE; no new dependencies
- Architecture: HIGH — patterns directly derived from existing Phase 108/109 implementation + official Playwright docs
- Pitfalls: HIGH — based on existing codebase knowledge (bridge key verification, tool name resolution)
- Open questions: MEDIUM — bridge key presence requires code verification in Wave 0

**Research date:** 2026-03-23
**Valid until:** 2026-06-23 (stable APIs; Playwright MCP tool names are stable per Phase 108 verification)
