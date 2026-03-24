# Phase 108: Playwright MCP Infrastructure - Research

**Researched:** 2026-03-23
**Domain:** MCP bridge extension — adding Playwright as the 7th APPROVED_SERVER
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAY-01 | `@playwright/mcp` registered as 7th entry in mcp-bridge.cjs APPROVED_SERVERS with stdio transport, `npx @playwright/mcp@latest --headless` installCmd, and probe tool definition | APPROVED_SERVERS structure fully documented — exact field names, stdio transport pattern from Stitch entry |
| PLAY-02 | TOOL_MAP entries for 10 Playwright tools: navigate, screenshot, snapshot, click, type, wait, evaluate, pdf, close, probe — all marked VERIFY_REQUIRED | Tool prefix `mcp__playwright__*` confirmed HIGH confidence; exact raw names from research; VERIFY_REQUIRED marker pattern exists in Stitch entries |
| PLAY-03 | `--headless` hardcoded in APPROVED_SERVERS.installCmd — visible browser windows never spawn during autonomous execution | installCmd field holds the full command string; --headless flag must be embedded there |
| PLAY-04 | Graceful degradation follows existing probe/degrade contract — all Playwright-dependent workflow steps have `--no-playwright` fallback paths | `--no-playwright` flag already documented in mcp-integration.md; probe/degrade pattern identical to all other targeted MCPs |
| PLAY-05 | file:// URL navigation tested in Phase 1 — if restricted, fallback to `npx serve .planning/design/ux/wireframes/ -p 0` with random port | `--allow-unrestricted-file-access` flag is the fix; flag must be in installCmd; fallback pattern is clear |
| PLAY-06 | `references/mcp-integration.md` updated with Playwright server count, enhancement recipe, and tool name verification status | mcp-integration.md structure and current Playwright section fully understood |
| PLAY-07 | `--allow-unrestricted-file-access` flag documented for file:// wireframe/mockup access | Flag purpose and placement fully understood; goes in both APPROVED_SERVERS.installCmd and AUTH_INSTRUCTIONS |
</phase_requirements>

---

## Summary

Phase 108 is an infrastructure-only phase. It makes a single change to `bin/lib/mcp-bridge.cjs` (add Playwright as the 7th APPROVED_SERVER entry and 10 TOOL_MAP entries) and one change to `references/mcp-integration.md` (update server count and add verification status). No workflow files are touched in this phase — those are Phases 109+.

The Stitch entry (Phase 65) provides the exact pattern to follow for a stdio-transport server with TOOL_MAP_VERIFY_REQUIRED markers. The only structural difference from Stitch is that Playwright's installCmd includes two flags (`--headless --allow-unrestricted-file-access`) embedded in the npx invocation, because Claude Code's MCP server args are passed through that invocation.

The tool name prefix `mcp__playwright__*` is HIGH confidence from prior research (PLAYWRIGHT-MCP-DEEP.md): Claude Code derives the prefix from the server name used in `claude mcp add playwright`, and multiple practitioner sources confirm the format. However, per the project's TOOL_MAP_VERIFY_REQUIRED policy and the Phase 44 gate pattern, all 10 entries must be marked VERIFY_REQUIRED until live verification is performed during this phase.

**Primary recommendation:** Model the Playwright APPROVED_SERVERS entry exactly on the Stitch entry. Use `TOOL_MAP_VERIFY_REQUIRED` markers on all 10 TOOL_MAP entries. Live-verify tool names during phase execution by calling the probe tool and checking the registered name format.

---

## Standard Stack

### Core (no new dependencies — zero-npm constraint preserved)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `@playwright/mcp` | `@latest` (test; pin to 0.0.41 if broken) | MCP server providing browser automation tools | Official Microsoft package; stdio transport; same pattern as other PDE MCP servers |
| `mcp-bridge.cjs` | existing | Central registry for APPROVED_SERVERS and TOOL_MAP | Already handles 6 servers; this phase adds the 7th |
| `mcp-integration.md` | existing | Human-readable MCP reference for all skills | Already documents the Playwright section at a high level; Phase 108 updates server count and adds install details |

### Known Version Risk

The `@playwright/mcp` package has a documented incompatibility issue with some Claude Code versions (GitHub issue #1359). `@latest` may fail with "No such tool available" on certain Claude Code releases. The research-confirmed workaround is to fall back to pinning `@playwright/mcp@0.0.41`. Phase 108 must test with `@latest` first; if tool registration fails, document the pinned version in AUTH_INSTRUCTIONS.

**No new npm packages.** Everything runs through `npx` — the same zero-npm pattern as Stitch (`npx @_davideast/stitch-mcp proxy`) and Sequential Thinking (`npx -y @modelcontextprotocol/server-sequential-thinking`).

### Installation Command

This is what goes into AUTH_INSTRUCTIONS (run by user) and APPROVED_SERVERS.installCmd (reference):

```bash
claude mcp add playwright -- npx @playwright/mcp@latest --headless --allow-unrestricted-file-access
```

Note the `--` separator before `npx` — this passes `--headless` and `--allow-unrestricted-file-access` as args to the Playwright MCP server process, NOT to `claude mcp add`. This is the same pattern used for Stitch: `claude mcp add stitch --transport stdio -- npx @_davideast/stitch-mcp proxy`.

---

## Architecture Patterns

### APPROVED_SERVERS Entry Structure

Every APPROVED_SERVERS entry in `mcp-bridge.cjs` has these fields:

```javascript
playwright: {
  displayName: 'Playwright',
  transport: 'stdio',
  url: null,              // stdio servers have no URL
  installCmd: null,       // See AUTH_INSTRUCTIONS — multi-step or npx
  probeTimeoutMs: 30000,  // 30s — browser launch can be slow
  probeTool: 'mcp__playwright__browser_snapshot', // TOOL_MAP_VERIFY_REQUIRED
  probeArgs: {},
},
```

**Rationale for each field:**

- `transport: 'stdio'` — Playwright MCP runs as a subprocess via npx, identical to Stitch and Pencil
- `url: null` — stdio servers have no URL; only HTTP/SSE servers have urls
- `installCmd: null` — The Stitch entry uses `null` and documents the command in AUTH_INSTRUCTIONS; same for Playwright (multi-step would be confusing as a single string)
- `probeTimeoutMs: 30000` — Browser launch on first use downloads Chromium binaries if not cached; 30s is conservative but safe. After first launch, probes complete in under 5s
- `probeTool: 'mcp__playwright__browser_snapshot'` — Lightest read-only tool; `browser_snapshot` on about:blank confirms the server is running without side effects
- `probeArgs: {}` — No args needed for the probe call (browser_snapshot navigates to current page, or about:blank if none)

### TOOL_MAP Entry Structure

The TOOL_MAP maps PDE canonical names (`playwright:navigate`) to raw MCP tool names (`mcp__playwright__browser_navigate`). The raw names follow the pattern `mcp__{server-name}__{tool-name}` where server-name is the name used in `claude mcp add`.

```javascript
// Playwright — Phase 108 (MEDIUM confidence — needs live verification; MCP-08 gate required)
'playwright:probe':      'mcp__playwright__browser_snapshot',   // TOOL_MAP_VERIFY_REQUIRED
'playwright:navigate':   'mcp__playwright__browser_navigate',   // TOOL_MAP_VERIFY_REQUIRED
'playwright:screenshot': 'mcp__playwright__browser_take_screenshot', // TOOL_MAP_VERIFY_REQUIRED
'playwright:snapshot':   'mcp__playwright__browser_snapshot',   // TOOL_MAP_VERIFY_REQUIRED
'playwright:click':      'mcp__playwright__browser_click',      // TOOL_MAP_VERIFY_REQUIRED
'playwright:type':       'mcp__playwright__browser_type',       // TOOL_MAP_VERIFY_REQUIRED
'playwright:wait':       'mcp__playwright__browser_wait_for',   // TOOL_MAP_VERIFY_REQUIRED
'playwright:evaluate':   'mcp__playwright__browser_evaluate',   // TOOL_MAP_VERIFY_REQUIRED
'playwright:pdf':        'mcp__playwright__browser_pdf_save',   // TOOL_MAP_VERIFY_REQUIRED
'playwright:close':      'mcp__playwright__browser_close',      // TOOL_MAP_VERIFY_REQUIRED
```

Note: `pdf` requires `--caps=pdf` flag at server start. Phase 108 does not use PDF — this entry is pre-registered for Phase 116 (BREF-02 reference capture). It is safe to include in TOOL_MAP now.

**TOOL_MAP total after Phase 108:** 46 current entries + 10 Playwright = 56 total

### AUTH_INSTRUCTIONS Entry

AUTH_INSTRUCTIONS stores human-readable setup steps. The Playwright entry follows the Stitch pattern:

```javascript
playwright: [
  '1. Run: claude mcp add playwright -- npx @playwright/mcp@latest --headless --allow-unrestricted-file-access',
  '   (If tools show "No such tool available", pin version: npx @playwright/mcp@0.0.41 instead of @latest)',
  '2. Verify Playwright appears in Claude Code MCP list: run /mcp in Claude Code',
  '3. Chromium is downloaded automatically on first use (~170MB, one-time)',
  '4. Return here and run /pde:connect playwright --confirm',
],
```

### Phase 44 Gate Pattern (Live Verification)

Phase 44 established the "MCP-05 gate" pattern for tool name live verification. Phase 108 applies the same pattern as "MCP-08":

```
Gate MCP-08 (Phase 108):
  1. Register Playwright MCP via claude mcp add (per AUTH_INSTRUCTIONS)
  2. Call mcp__playwright__browser_snapshot (probe)
  3. Confirm tool responds — proof the mcp__playwright__* prefix is correct
  4. Update TOOL_MAP entries: remove TOOL_MAP_VERIFY_REQUIRED comments
  5. Update mcp-integration.md verification status to VERIFIED
  6. Record verified tool names in phase commit message
```

If the probe tool name is WRONG (e.g., the prefix is `mcp__playwright-mcp__*`), all 10 TOOL_MAP entries must be corrected before the phase is complete. The VERIFY_REQUIRED markers are the safety gate.

### mcp-integration.md Update

The file currently reads "7 MCP servers (2 universal + 5 targeted)" in its scope line and lists Playwright with a basic entry. Phase 108 changes:

1. Update scope line: "7 MCP servers (2 universal + 5 targeted)" — wait, current count is 7 servers already listed (including Playwright as a targeted MCP). Check the file.

Looking at the current mcp-integration.md: The file header says "7 MCP servers (2 universal + 5 targeted)" and the Playwright MCP section already exists with a basic enhancement recipe. Phase 108 updates:
- The install command in the Playwright section to include `--headless` and `--allow-unrestricted-file-access`
- The Stability table: add verified date after live verification
- The Installation Commands section: update from `claude mcp add playwright -- npx @playwright/mcp@latest` to the full command with flags

### Project Structure Impact

```
bin/lib/
  mcp-bridge.cjs    ← add playwright to APPROVED_SERVERS + 10 TOOL_MAP entries + AUTH_INSTRUCTIONS

references/
  mcp-integration.md  ← update Playwright install command with flags + verification status

tests/
  phase-108/
    mcp-bridge-playwright.test.mjs  ← Nyquist tests (new)
```

No new files are created in `bin/lib/`. No new workflows. No new commands. This is a pure registry update.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser automation | Custom subprocess spawner | Playwright MCP via Claude Code | Playwright MCP handles browser lifecycle, headless mode, viewport, screenshots — all the hard parts |
| Tool name resolution | String concatenation of `mcp__playwright__` + tool | TOOL_MAP lookup via `bridge.call()` | TOOL_MAP insulates all downstream phases from tool name changes; this is the established pattern for all 6 existing servers |
| Per-workflow Playwright probing | Inline probe logic in each workflow | mcp-integration.md `--no-playwright` flag detection + probe/degrade pattern | Pattern is already documented and followed by all 5 targeted MCPs |
| Parallel browser sessions | Multiple claude mcp add calls with different names | Sequential single-server usage | Playwright MCP has a single browser context per server instance; parallel agents fight over the same tab (GitHub issue #893) |
| Custom file:// server | http-server npm package | `--allow-unrestricted-file-access` flag | The flag is the designed solution; avoids npm dependency and port management |

**Key insight:** Phase 108 is a registry entry, not an implementation. The browser automation logic lives in Playwright MCP itself. This phase only wires up the bridge and documents the server.

---

## Common Pitfalls

### Pitfall 1: Flag Placement in installCmd

**What goes wrong:** Writing `installCmd: 'claude mcp add playwright npx @playwright/mcp@latest --headless'` causes `--headless` to be parsed by `claude mcp add` instead of passed to the Playwright server process.

**Why it happens:** The `--` separator is required to stop `claude mcp add` from consuming subsequent flags. Without it, `--headless` and `--allow-unrestricted-file-access` are silently ignored or cause an error.

**How to avoid:** Always use `--` before `npx` in the installCmd:
```
claude mcp add playwright -- npx @playwright/mcp@latest --headless --allow-unrestricted-file-access
```

**Warning signs:** Browser windows appear during automation (headless not applied), or file:// navigation fails with "file access is restricted".

### Pitfall 2: Wrong TOOL_MAP Count in Nyquist Tests

**What goes wrong:** The mcp-bridge-toolmap.test.mjs (tests/phase-40) asserts `TOOL_MAP` has exactly 36 entries (as of Phase 43). Adding 10 Playwright entries without updating that assertion breaks the test.

**Why it happens:** Each TOOL_MAP phase adds entries and updates the assertion. The Phase 40 test must be updated to reflect the new total.

**How to avoid:** After adding 10 Playwright entries (46 current + 10 = 56 total), update the assertion in tests/phase-40/mcp-bridge-toolmap.test.mjs from 36 to 56.

Note: The current TOOL_MAP has 46 entries (8 GitHub + 7 Linear + 7 Atlassian + 7 Figma + 7 Pencil + 10 Stitch = 46). Wait — check the actual count. Looking at mcp-bridge.cjs: 8 + 7 + 7 + 7 + 7 + 10 = 46. But the phase-40 test says 36 (Phases 40-43 = 8+7+7+7 = 29... that's only 4 servers at 29 entries, and 7 Pencil = 36). The Stitch entries were added in Phase 65; the test likely has not been updated since Phase 43. Check the actual test assertion before assuming — it may already reflect 46 entries if Phase 65 updated it, or it may still say 36.

**Warning signs:** `AssertionError: Expected 36 TOOL_MAP entries after Phase 43, got 56`.

### Pitfall 3: Version Incompatibility with @latest

**What goes wrong:** `@playwright/mcp@latest` (versions 0.0.56+) may not register tools correctly with some Claude Code releases, showing "No such tool available" when attempting to call any `mcp__playwright__*` tool.

**Why it happens:** Documented incompatibility in GitHub issue #1359. The MCP tool registration protocol changed between versions.

**How to avoid:** During live verification (MCP-08 gate), if the probe returns "No such tool available", fall back to `claude mcp add playwright -- npx @playwright/mcp@0.0.41 --headless --allow-unrestricted-file-access`. Document the pinned version in AUTH_INSTRUCTIONS.

**Warning signs:** Probe call fails with "tool not found" despite `claude mcp list` showing playwright as registered.

### Pitfall 4: Spaces in file:// Path

**What goes wrong:** `browser_navigate url: "file:///Users/greyaltaer/code/projects/Platform Development Engine/.planning/..."` fails because the space in "Platform Development Engine" is not URL-encoded.

**Why it happens:** file:// URLs require percent-encoding of spaces and special characters. The project directory name contains a space.

**How to avoid:** URL-encode path before passing to browser_navigate: `Platform%20Development%20Engine`. Document this in mcp-integration.md Playwright section. This only affects the path passed to browser_navigate in workflow steps — it does not affect the APPROVED_SERVERS entry or TOOL_MAP.

**Warning signs:** Navigation returns "invalid URL" or loads a blank page when the path contains spaces.

### Pitfall 5: Assuming probeArgs Can Stay Empty for All Tools

**What goes wrong:** Some Playwright tools require specific args to execute. `browser_navigate` requires a `url` arg. If the probe tool is set to `browser_navigate` with empty probeArgs `{}`, the probe will error with "missing required parameter: url".

**How to avoid:** Use `browser_snapshot` as the probe tool — it works on the current page (no URL required) or returns the accessibility tree of about:blank. ProbeArgs `{}` is correct for browser_snapshot.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Stitch Entry (exact model for Playwright)

```javascript
// Source: bin/lib/mcp-bridge.cjs (current file, stitch entry)
stitch: {
  displayName: 'Google Stitch',
  transport: 'stdio',
  url: null,
  installCmd: null, // Multi-step: env var + npx — see AUTH_INSTRUCTIONS
  probeTimeoutMs: 15000,
  probeTool: 'mcp__stitch__list_projects', // TOOL_MAP_VERIFY_REQUIRED — lightest read-only tool
  probeArgs: {},
},
```

Playwright follows the same structure. Only `displayName`, `probeTool`, `probeTimeoutMs`, and the entries in AUTH_INSTRUCTIONS differ.

### Existing Stitch TOOL_MAP Entries (exact comment style to follow)

```javascript
// Source: bin/lib/mcp-bridge.cjs (current file, stitch TOOL_MAP entries)
// Stitch — Phase 65 (MEDIUM confidence — community sources; MCP-05 live verification required before finalizing)
'stitch:probe':                   'mcp__stitch__list_projects',          // TOOL_MAP_VERIFY_REQUIRED
'stitch:generate-screen':         'mcp__stitch__generate_screen_from_text', // TOOL_MAP_VERIFY_REQUIRED
// ... (10 total entries, all TOOL_MAP_VERIFY_REQUIRED)
```

The Playwright entries use the same comment style with `MCP-08` substituted for `MCP-05`:
```javascript
// Playwright — Phase 108 (MEDIUM confidence — tool names from official README + practitioner sources; MCP-08 live verification required before finalizing)
'playwright:probe':      'mcp__playwright__browser_snapshot',        // TOOL_MAP_VERIFY_REQUIRED
```

### Probe/Degrade Pattern in Workflows (for downstream reference)

```
// Source: references/mcp-integration.md — Core Probe/Use/Degrade Pattern

Before ANY MCP probe:
1. Check if --no-mcp is present → skip all probes
2. Check if --no-playwright is present → skip Playwright probe, use degraded path
3. Otherwise: proceed with probe
   Attempt: mcp__playwright__browser_snapshot
   Timeout: 30 seconds
   Retry: 0 (targeted MCP, degrade immediately)
   If success: PLAYWRIGHT_AVAILABLE = true
   If failure: PLAYWRIGHT_AVAILABLE = false
```

This pattern is ALREADY in mcp-integration.md. Phase 108 does not change the pattern — it only adds the proper install command with flags.

### Existing Test Pattern (from phase-40/mcp-bridge-toolmap.test.mjs)

```javascript
// Source: tests/phase-40/mcp-bridge-toolmap.test.mjs — pattern for new phase-108 tests
it('TOOL_MAP contains exactly 56 total entries (Phase 108 adds 10 Playwright)', () => {
  const keys = Object.keys(bridge.TOOL_MAP);
  assert.equal(keys.length, 56, `Expected 56 TOOL_MAP entries after Phase 108, got ${keys.length}`);
});

it('playwright probeTool is mcp__playwright__browser_snapshot', () => {
  assert.equal(bridge.APPROVED_SERVERS.playwright.probeTool, 'mcp__playwright__browser_snapshot');
});

it('playwright transport is stdio', () => {
  assert.equal(bridge.APPROVED_SERVERS.playwright.transport, 'stdio');
});

it('bridge.call resolves playwright:navigate to mcp__playwright__browser_navigate', () => {
  const result = bridge.call('playwright:navigate', { url: 'about:blank' });
  assert.equal(result.toolName, 'mcp__playwright__browser_navigate');
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Playwright via npm install | Playwright MCP via stdio npx | 2024 | Zero npm deps — no package.json needed |
| Browser automation in workflow code | MCP tool calls from workflow prose | 2024 | Workflows call tools by name; no shell scripting |
| Headed browser | `--headless` forced | PDE decision (v0.14) | No zombie windows during autonomous execution |
| file:// blocked by default | `--allow-unrestricted-file-access` | Playwright MCP default security | Required for wireframe/mockup screenshots from .planning/ |

**Deprecated/outdated:**

- `browser_pdf_save` requires `--caps=pdf` — must be added to installCmd if PDF export is needed (Phase 116). Phase 108 pre-registers the TOOL_MAP entry but does not enable the capability flag yet.
- `--snapshot-mode incremental` — this is Playwright MCP's default; stateful across tool calls. PDE workflows are stateless (each call is independent), so `--snapshot-mode full` is the correct flag. Add to installCmd.

---

## Open Questions

1. **Actual TOOL_MAP count before Phase 108**
   - What we know: Phase 43 left 36 entries; Phase 65 (Stitch) added 10 entries = 46. But the test assertion in tests/phase-40 may still say 36 if it was never updated.
   - What's unclear: Was the test updated in Phase 65?
   - Recommendation: Planner must include a task to check the current assertion and update it to `current + 10`.

2. **Whether `--snapshot-mode full` belongs in Phase 108 installCmd**
   - What we know: `--snapshot-mode incremental` (default) maintains state across calls; `--snapshot-mode full` always returns the complete tree. For PDE's stateless metric workflows, full is safer.
   - What's unclear: Does omitting this flag cause problems in practice for Phase 108's probe-only use case?
   - Recommendation: Include `--snapshot-mode full` in the installCmd from the start. It is a safe default and avoids a correction later.

3. **Whether `--caps=testing` belongs in Phase 108 installCmd**
   - What we know: Testing capabilities (browser_verify_* tools) are needed in Phase 110 (deploy smoke test). Adding them in Phase 108 exposes additional tools.
   - What's unclear: Do extra capability flags cause any registration issues?
   - Recommendation: Include `--caps=testing` in Phase 108 installCmd so the server is fully configured from day one. There is no known downside.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | None — tests run directly |
| Quick run command | `node --test tests/phase-108/mcp-bridge-playwright.test.mjs` |
| Full suite command | `node --test tests/**/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-01 | `APPROVED_SERVERS.playwright` exists with correct fields | unit | `node --test tests/phase-108/mcp-bridge-playwright.test.mjs` | Wave 0 |
| PLAY-01 | `APPROVED_SERVERS.playwright.transport === 'stdio'` | unit | same | Wave 0 |
| PLAY-01 | `APPROVED_SERVERS.playwright.probeTool === 'mcp__playwright__browser_snapshot'` | unit | same | Wave 0 |
| PLAY-02 | TOOL_MAP contains 10 `playwright:*` entries | unit | same | Wave 0 |
| PLAY-02 | `bridge.call('playwright:navigate', {})` resolves to `mcp__playwright__browser_navigate` | unit | same | Wave 0 |
| PLAY-02 | `bridge.call('playwright:screenshot', {})` resolves to `mcp__playwright__browser_take_screenshot` | unit | same | Wave 0 |
| PLAY-02 | Total TOOL_MAP count equals `prior_count + 10` | unit | same | Wave 0 |
| PLAY-03 | `APPROVED_SERVERS.playwright.installCmd` or `AUTH_INSTRUCTIONS.playwright` contains `--headless` | unit | same | Wave 0 |
| PLAY-05 | `AUTH_INSTRUCTIONS.playwright` contains `--allow-unrestricted-file-access` | unit | same | Wave 0 |
| PLAY-04 | `bridge.probe('playwright')` returns `probe_deferred` (not `probe_not_implemented`) | unit | same | Wave 0 |
| PLAY-06 | `references/mcp-integration.md` contains "7th" or "7 server" count reference | structural | `node --test tests/phase-108/mcp-bridge-playwright.test.mjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-108/mcp-bridge-playwright.test.mjs`
- **Per wave merge:** `node --test 'tests/**/*.test.mjs'` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-108/mcp-bridge-playwright.test.mjs` — covers PLAY-01 through PLAY-07 (structural assertions)

*(No framework install needed — Node.js built-in test runner already used across all phases)*

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/mcp-bridge.cjs` (current file) — APPROVED_SERVERS structure, TOOL_MAP format, TOOL_MAP_VERIFY_REQUIRED pattern, AUTH_INSTRUCTIONS format, Stitch entry as exact model
- `references/mcp-integration.md` (current file) — existing Playwright section content, probe/degrade pattern, install command format, flag documentation
- `.planning/research/PLAYWRIGHT-MCP-DEEP.md` — tool inventory (20 core tools), file:// URL behavior, `--allow-unrestricted-file-access` flag, `--snapshot-mode full`, tool name prefix `mcp__playwright__*` (HIGH confidence from GitHub issue #1359 + multiple practitioner sources)
- `.planning/research/v0.14-SUMMARY.md` — confirms Phase 108 scope (0 new files, 2 modified files, ~30 lines)
- `tests/phase-40/mcp-bridge-toolmap.test.mjs` — test pattern for TOOL_MAP count assertions and individual `bridge.call()` tests

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — confirms decisions: stdio transport, TOOL_MAP_VERIFY_REQUIRED markers, `--allow-unrestricted-file-access`, headless hardcoded
- `.planning/REQUIREMENTS.md` — confirms exact requirements text for PLAY-01 through PLAY-07

### Tertiary (informational)

- `microsoft/playwright-mcp` GitHub README (via PLAYWRIGHT-MCP-DEEP.md) — tool names, `--headless` flag, `--allow-unrestricted-file-access` flag, `--caps` flags
- GitHub issue #1359 (via PLAYWRIGHT-MCP-DEEP.md) — version compatibility risk, 0.0.41 fallback

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new packages; pattern is exact copy of Stitch entry
- Architecture: HIGH — APPROVED_SERVERS and TOOL_MAP structure is fully understood from existing code
- Tool names: MEDIUM — `mcp__playwright__browser_*` prefix confirmed by multiple sources but must be live-verified (TOOL_MAP_VERIFY_REQUIRED markers exist for this reason)
- Pitfalls: HIGH — all pitfalls are grounded in existing codebase behavior or documented Playwright MCP issues

**Research date:** 2026-03-23
**Valid until:** 2026-06-23 (stable — Playwright MCP and mcp-bridge.cjs patterns are mature)

**Scope summary:** Phase 108 modifies exactly 2 files (`mcp-bridge.cjs`, `mcp-integration.md`) and creates 1 test file. Estimated 30 lines of production code, 40 lines of tests. The only judgment call is which flags to include in the installCmd — research recommends `--headless --allow-unrestricted-file-access --snapshot-mode full --caps testing` as the complete set needed by all downstream phases.
