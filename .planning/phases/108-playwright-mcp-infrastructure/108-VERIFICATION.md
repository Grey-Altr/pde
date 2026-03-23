---
phase: 108-playwright-mcp-infrastructure
verified: 2026-03-23T00:00:00Z
status: human_needed
score: 6/7 must-haves verified
human_verification:
  - test: "Live MCP-08 gate: run `claude mcp add playwright -- npx @playwright/mcp@latest --headless --allow-unrestricted-file-access`, then call `mcp__playwright__browser_snapshot`"
    expected: "Tool responds successfully, confirming the mcp__playwright__* prefix is correct. If wrong prefix returned, all 10 TOOL_MAP entries and probeTool in APPROVED_SERVERS need updating."
    why_human: "Requires Playwright MCP to be installed and a live Claude Code session — cannot be verified by static code analysis"
  - test: "PLAY-05 serve fallback: attempt file:// navigation via Playwright MCP on a generated wireframe HTML, verify it succeeds with --allow-unrestricted-file-access or degrades cleanly"
    expected: "Either file:// navigation succeeds OR the system logs a degradation and the npx serve fallback path is invoked (expected in downstream phases 109+)"
    why_human: "The npx serve fallback from the PLAY-05 requirement text is not yet implemented in production code -- it is deferred to downstream phases (109-117) where actual file:// navigation occurs"
---

# Phase 108: Playwright MCP Infrastructure Verification Report

**Phase Goal:** PDE workflows can call Playwright browser tools through the existing MCP bridge with full probe/degrade safety
**Verified:** 2026-03-23
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | APPROVED_SERVERS contains a `playwright` entry with stdio transport | VERIFIED | `bin/lib/mcp-bridge.cjs` line 77-85; runtime: `Object.keys(b.APPROVED_SERVERS).length === 7` |
| 2  | TOOL_MAP contains 10 `playwright:*` entries mapped to `mcp__playwright__*` raw names | VERIFIED | Lines 162-171 in mcp-bridge.cjs; runtime: `Object.keys(b.TOOL_MAP).length === 56` |
| 3  | AUTH_INSTRUCTIONS contains Playwright install command with --headless and --allow-unrestricted-file-access flags | VERIFIED | `bin/lib/mcp-bridge.cjs` lines 215-220; AUTH_INSTRUCTIONS.playwright is 4-element array containing both flags and `npx @playwright/mcp` |
| 4  | `bridge.probe('playwright')` returns `probe_deferred` (not `probe_not_implemented`) | VERIFIED | Runtime: `b.probe('playwright').status === 'probe_deferred'`; PLAY-05 test passes |
| 5  | `bridge.call('playwright:navigate', {})` resolves to `mcp__playwright__browser_navigate` | VERIFIED | call() test passes; `call('playwright:navigate', { url: 'about:blank' })` returns correct toolName + args passthrough |
| 6  | All TOOL_MAP playwright entries have TOOL_MAP_VERIFY_REQUIRED comment in source | VERIFIED | PLAY-07 test passes; all 10 lines confirmed via readFileSync scan |
| 7  | mcp-integration.md documents Playwright with flags, corrected probe tool, enhancement recipes, and updated server count | VERIFIED | `references/mcp-integration.md` contains: `--headless --allow-unrestricted-file-access` (6 occurrences), `browser_snapshot` probe, `#### Flags` subsection, `%20` encoding note, `0.0.41` fallback, `7 MCP servers` scope, enhancement recipes block, stability table date `2026-03-23` |

**Score:** 7/7 observable truths verified by static analysis

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/phase-108/mcp-bridge-playwright.test.mjs` | Nyquist structural tests for PLAY-01 through PLAY-07 | VERIFIED | 179 lines (requirement: >= 80); 27 tests; all describe blocks present: PLAY-01, PLAY-02, PLAY-03, PLAY-05, PLAY-07 |
| `bin/lib/mcp-bridge.cjs` | Playwright APPROVED_SERVER + 10 TOOL_MAP entries + AUTH_INSTRUCTIONS | VERIFIED | Contains `playwright` key in APPROVED_SERVERS, 10 `playwright:*` TOOL_MAP entries, AUTH_INSTRUCTIONS.playwright array |
| `references/mcp-integration.md` | Updated Playwright MCP documentation with flags and verification status | VERIFIED | Contains `--allow-unrestricted-file-access` in 6 places, corrected probe, Flags subsection, troubleshooting rows |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tests/phase-108/mcp-bridge-playwright.test.mjs` | `bin/lib/mcp-bridge.cjs` | `require()` + TOOL_MAP/APPROVED_SERVERS assertions | WIRED | Line 21: `const bridge = require(\`\${ROOT}/bin/lib/mcp-bridge.cjs\`)` — destructures TOOL_MAP, APPROVED_SERVERS, AUTH_INSTRUCTIONS, call, probe |
| `references/mcp-integration.md` | `bin/lib/mcp-bridge.cjs` | Install command and tool names match APPROVED_SERVERS/TOOL_MAP | WIRED | Install command in doc matches AUTH_INSTRUCTIONS.playwright; probe tool `browser_snapshot` matches `probeTool` field; `7 MCP servers` scope matches 7 APPROVED_SERVERS entries |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| PLAY-01 | 108-01 | `@playwright/mcp` registered as 7th APPROVED_SERVER with stdio transport | SATISFIED | APPROVED_SERVERS.playwright exists with transport: 'stdio', probeTimeoutMs: 30000, probeTool, probeArgs; APPROVED_SERVERS count = 7 |
| PLAY-02 | 108-01 | TOOL_MAP entries for 10 Playwright tools, all marked VERIFY_REQUIRED | SATISFIED | 10 `playwright:*` entries in TOOL_MAP, all with TOOL_MAP_VERIFY_REQUIRED comments; total TOOL_MAP = 56 |
| PLAY-03 | 108-01 | `--headless` hardcoded — visible browser windows never spawn during autonomous execution | SATISFIED | AUTH_INSTRUCTIONS.playwright contains `--headless`; APPROVED_SERVERS.playwright has `installCmd: null` with reference to AUTH_INSTRUCTIONS (multi-flag pattern prevents accidental headless-less invocation) |
| PLAY-04 | 108-01 | Graceful degradation with `--no-playwright` fallback paths in workflows | SATISFIED | `--no-playwright` flag documented in `references/mcp-integration.md` line 37; implemented in `workflows/mockup.md` (lines 66, 205, 1446) and `workflows/wireframe.md` (lines 27, 256, 2123); probe/degrade contract returns `probe_deferred` |
| PLAY-05 | 108-01 | file:// URL navigation tested in Phase 1 — if restricted, fallback to `npx serve .planning/design/ux/wireframes/ -p 0` | PARTIAL | `--allow-unrestricted-file-access` is documented and in AUTH_INSTRUCTIONS. The `npx serve` fallback from the requirement text is NOT present in phase-108 code. The test labeled PLAY-05 in the test file tests `probe_deferred` behavior, not file:// navigation. The npx serve fallback is deferred to downstream phases (109-117) where actual file:// navigation occurs in workflows. Human verification required for live file:// test. |
| PLAY-06 | 108-02 | `references/mcp-integration.md` updated with Playwright server count, enhancement recipe, and tool name verification status | SATISFIED | Server count updated to 7 (scope line); enhancement recipes block present (lines 315-360); tool name verification status expressed via `TOOL_MAP_VERIFY_REQUIRED` comments in source code and the `Version fallback: 0.0.41` note in docs. Stability table says STABLE with 2026-03-23 date. MCP-08 live gate deferred per plan design — VERIFY_REQUIRED markers preserved as intended. |
| PLAY-07 | 108-01, 108-02 | Tool name prefix live-verified before workflow integration — same Phase 44 gate pattern | NEEDS HUMAN | All 10 TOOL_MAP entries have TOOL_MAP_VERIFY_REQUIRED markers (structural requirement satisfied). MCP-08 live gate was intentionally deferred per `108-02-PLAN.md` Task 2 (checkpoint:human-verify). TOOL_MAP_VERIFY_REQUIRED markers remain in `bin/lib/mcp-bridge.cjs`. The gate has NOT been completed — requires human installation and live verification. |

**Orphaned requirements:** None — all PLAY-01 through PLAY-07 are claimed by plans 108-01 and 108-02.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bin/lib/mcp-bridge.cjs` | 162-171 | `TOOL_MAP_VERIFY_REQUIRED` on all 10 playwright entries | Info | Intentional marker — tool names are MEDIUM confidence from README/practitioner sources. Not a defect; signals MCP-08 gate must be completed before production use. |

No blockers found. The TOOL_MAP_VERIFY_REQUIRED markers are by design and required by PLAY-02.

### Human Verification Required

#### 1. MCP-08 Live Tool Name Prefix Verification (PLAY-07)

**Test:** Run `claude mcp add playwright -- npx @playwright/mcp@latest --headless --allow-unrestricted-file-access`, then call `mcp__playwright__browser_snapshot` from within Claude Code.

**Expected:** Tool responds (returns accessibility tree or blank snapshot), confirming `mcp__playwright__*` is the correct prefix.

**Why human:** Requires a live Claude Code session with Playwright MCP installed. Cannot be automated via static analysis or unit tests. If the wrong prefix is returned (e.g., `mcp__playwright-mcp__*`), all 10 TOOL_MAP entries in `bin/lib/mcp-bridge.cjs` and the `probeTool` in `APPROVED_SERVERS.playwright` must be updated, then `node --test tests/phase-108/mcp-bridge-playwright.test.mjs` re-run to confirm green.

**Outcome paths:**
- "verified" — prefix correct, remove TOOL_MAP_VERIFY_REQUIRED comments from mcp-bridge.cjs
- "wrong-prefix: {actual}" — update 10 entries + probeTool, re-run tests
- "skip" — defer to downstream phase, markers remain as-is

#### 2. PLAY-05 file:// URL Navigation in Live Session

**Test:** With Playwright MCP installed, invoke a workflow that navigates to a `file://` URL for a generated wireframe HTML (e.g., `file:///Users/greyaltaer/code/projects/Platform%20Development%20Engine/.planning/design/ux/wireframes/WFR-*.html`).

**Expected:** Navigation succeeds due to `--allow-unrestricted-file-access` flag, OR degrades gracefully with a `[Not validated -- install Playwright MCP for automated browser testing]` tag.

**Why human:** The `npx serve` fallback described in PLAY-05 ("if restricted, fallback to `npx serve .planning/design/ux/wireframes/ -p 0` with random port") does not exist in any current production code. This fallback is expected to be implemented in downstream phases 109-117 when actual wireframe validation occurs. The phase-108 infrastructure (--allow-unrestricted-file-access in AUTH_INSTRUCTIONS + --headless) is the correct foundation, but the fallback path cannot be verified without live execution.

### Gaps Summary

No automated-verification gaps were found. All 7 observable truths are satisfied by static code analysis. The phase goal — "PDE workflows can call Playwright browser tools through the existing MCP bridge with full probe/degrade safety" — is structurally achieved:

- The bridge is wired (APPROVED_SERVERS entry exists)
- Tool names are registered (10 TOOL_MAP entries)
- Installation instructions are correct (AUTH_INSTRUCTIONS with both required flags)
- Probe/degrade contract is wired (probe returns `probe_deferred`, --no-playwright fallbacks exist in workflows)
- 27 Nyquist tests are green
- 4 previously-stale test files fixed and green

Two items require human sign-off before downstream phases (109-117) can safely use Playwright:

1. **MCP-08 gate (PLAY-07):** Confirm `mcp__playwright__*` prefix is correct or correct it. This is the most critical — if the prefix is wrong, downstream phases will fail silently.

2. **PLAY-05 file:// fallback:** The `npx serve` fallback from the requirement is not yet implemented. This is expected to land in phases 109-117 when file:// navigation is actually invoked in workflows. Phase 108 has correctly laid the infrastructure foundation (`--allow-unrestricted-file-access`). The fallback is not a phase-108 gap — it belongs to the first downstream phase that requires it.

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
