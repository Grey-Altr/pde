---
phase: 161-auto-generated-competitor-tools
verified: 2026-03-28T22:50:02Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 161: Auto-Generated Competitor Tools Verification Report

**Phase Goal:** The competitive analysis workflow can optionally generate WebMCP tool stubs from competitor data, with mandatory human review before any tool becomes active
**Verified:** 2026-03-28T22:50:02Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Derived from ROADMAP.md Success Criteria (4 criteria) and Plan frontmatter must_haves (8 truths across 2 plans).

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Running /pde:competitive --webmcp generates competitor tool stubs as a post-processing Step 8 | VERIFIED | `workflows/competitive.md` line 734: `### Step 8/8: Generate competitor tool stubs (--webmcp only)`. Zero occurrences of `/7:` remain (all renumbered). |
| 2  | Generated tool descriptions have injection patterns stripped and are capped at 512 characters | VERIFIED | `competitive.md` line 754 strips `<system>`, `IMPORTANT:`, `You must`, `Ignore previous`, `Ignore all previous`. Line 756: truncate at last `.` before position 512. |
| 3  | Registry entries are written to .webmcp/competitor-tools-registry.json with status: pending | VERIFIED | `competitive.md` lines 795-797 specify merge-safe read-merge-write to `.webmcp/competitor-tools-registry.json`. Registry entry template contains `"status": "pending"`. |
| 4  | Each competitor gets a gate file in .planning/gates/ for human review | VERIFIED | `competitive.md` specifies gate file write to `.planning/gates/{gate_id}.json` per competitor with `"status": "pending"`. Gate ID format: `competitor-tool-{sanitized_name}-{YYYYMMDD}-{4_HEX}`. |
| 5  | No auto-generated competitor tool can be called until a human approves it through the review gate | VERIFIED | `route.ts` line 24-26: filters registry to `status === 'approved'` only before returning data. Non-approved competitors return 404. `useCompetitorTools` hook errors on non-200 responses from API. |
| 6  | Browser AI agents can query approved competitor data via the query_competitor_data WebMCP tool | VERIFIED | `use-competitor-tools.ts`: registers `query_competitor_data` via `useWebMCP`, fetches `/api/planning/competitor-tools?name=` with `encodeURIComponent`. Tool listed in `competitive.md` WebMCP Context table line 843. |
| 7  | The useCompetitorTools hook is registered via the composite useWebMcpTools hook | VERIFIED | `use-webmcp-tools.ts` line 14: `useCompetitorTools()` called. Import on line 2. `index.ts` line 5 re-exports from `./use-competitor-tools`. |
| 8  | Approved competitor tools persist in .webmcp/competitor-tools-registry.json and are served via API route | VERIFIED | `route.ts` reads `path.join(process.cwd(), '.webmcp', 'competitor-tools-registry.json')`, filters approved entries, serves via GET with optional `?name=` query param. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `workflows/competitive.md` | Step 8/8 competitor tool stub generation block | VERIFIED | Contains `### Step 8/8`, 2 occurrences of `Step 8/8`, zero `/7:` occurrences, full sanitization pipeline, registry write, gate file instructions, `query_competitor_data` in WebMCP Context table |
| `dashboard/app/api/planning/competitor-tools/route.ts` | GET route serving approved competitor tools from registry | VERIFIED | 37 lines, `force-dynamic`, GET handler, 404/500 error paths, `status === 'approved'` filter, `?name=` param support |
| `dashboard/lib/mcp/browser-tools/use-competitor-tools.ts` | useCompetitorTools hook registering query_competitor_data | VERIFIED | `'use client'`, module-level `inputSchema`, `name: 'query_competitor_data'`, fetch to `/api/planning/competitor-tools?name=`, `encodeURIComponent` |
| `dashboard/lib/mcp/browser-tools/index.ts` | Barrel export including useCompetitorTools (5 exports) | VERIFIED | 5 export lines; line 5: `export { useCompetitorTools } from './use-competitor-tools'` |
| `dashboard/hooks/use-webmcp-tools.ts` | Composite hook calling useCompetitorTools() | VERIFIED | `useCompetitorTools` in import line 2, `useCompetitorTools()` on line 14 |
| `dashboard/lib/__tests__/competitor-tools.test.ts` | Source inspection tests for competitor tools hook | VERIFIED | 9 tests across 3 describe blocks: tool file structure, composite wiring, barrel export |
| `dashboard/__tests__/webmcp-browser-tools.test.ts` | Updated barrel export count assertion (5, was 4) | VERIFIED | Line 90: `expect(exportLines.length).toBe(5)`, `useCompetitorTools` assertions in barrel and composite tests |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `workflows/competitive.md` Step 8 | `.webmcp/competitor-tools-registry.json` | File write after sanitization | WIRED | 4 occurrences of `competitor-tools-registry.json` in workflow; merge-safe read-merge-write specified |
| `workflows/competitive.md` Step 8 | `.planning/gates/{gate_id}.json` | Gate file write per competitor | WIRED | 3 matches for `planning/gates` and `competitor-tool-*.json` in workflow |
| `dashboard/app/api/planning/competitor-tools/route.ts` | `.webmcp/competitor-tools-registry.json` | `fs.readFileSync` registry read | WIRED | `registryPath = path.join(process.cwd(), '.webmcp', 'competitor-tools-registry.json')` directly in GET handler |
| `dashboard/lib/mcp/browser-tools/use-competitor-tools.ts` | `/api/planning/competitor-tools` | fetch in handler | WIRED | `/api/planning/competitor-tools?name=${encodeURIComponent(competitor_name)}` in handler body |
| `dashboard/hooks/use-webmcp-tools.ts` | `use-competitor-tools.ts` | import + call useCompetitorTools() | WIRED | Both import and `useCompetitorTools()` call present |
| `dashboard/lib/mcp/browser-tools/index.ts` | `use-competitor-tools.ts` | barrel re-export | WIRED | `export { useCompetitorTools } from './use-competitor-tools'` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `route.ts` | `registry` / `approved` | `fs.readFileSync(registryPath)` + `JSON.parse` | Yes — reads real registry file, filters by `status === 'approved'` | FLOWING |
| `use-competitor-tools.ts` | handler return value | `fetch(/api/planning/competitor-tools?name=...)` + `res.json()` | Yes — live fetch to API route, returns parsed JSON | FLOWING |

Note: `.webmcp/competitor-tools-registry.json` is a runtime artifact created by the workflow execution. It does not exist at code-time; this is by design (the registry is populated when `/pde:competitive --webmcp` runs). The API route correctly handles the absent-file case with a 404.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| competitor-tools test suite (9 tests) | `npx vitest run lib/__tests__/competitor-tools.test.ts` | 9 passed | PASS |
| webmcp-browser-tools test suite (updated) | `npx vitest run __tests__/webmcp-browser-tools.test.ts` | 21 passed | PASS |
| Full test suite regression | `npx vitest run` | 43 files, 356 tests, 0 failures | PASS |
| route.ts exports GET + force-dynamic | `grep "force-dynamic\|export async function GET"` | Both present | PASS |
| barrel has exactly 5 exports | source inspection test line 90: `toBe(5)` | Green | PASS |
| No `/7:` step numbering remains | `grep -c "Step.*\/7" competitive.md` | 0 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ADV-01 | 161-01 | competitive.md generates optional WebMCP tool stubs from competitor analysis | SATISFIED | Step 8/8 in `workflows/competitive.md` with `IF USE_WEBMCP is false ... Skip silently` guard |
| ADV-02 | 161-01 | Auto-generated tools pass through sanitization pipeline (strip instruction syntax, 512-char limit, source: "auto-generated") | SATISFIED | Strip list (line 754), 512-char sentence-aware truncation (line 756), `"source": "auto-generated"` in registry entry template |
| ADV-03 | 161-02 | Auto-generated competitor tools require mandatory human review gate before activation | SATISFIED | `route.ts` filters to `status === 'approved'` only; pending entries return 404; gate file created per competitor in `.planning/gates/` |
| ADV-04 | 161-01, 161-02 | Competitor tool registry stored in .webmcp/competitor-tools-registry.json | SATISFIED | Registry path hardcoded in both `competitive.md` (Step 8 write) and `route.ts` (read); merge-safe write prevents duplicate entries |

All 4 ADV requirements satisfied. No orphaned requirements found — REQUIREMENTS.md lines 112-115 confirm all four mapped to Phase 161 with status Complete.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `workflows/competitive.md` | 386-391, 412, 585 | `[YOUR_TAM_SIZE]`, `[YOUR_TCO_VENDOR_X]`, `placeholder` | Info | Domain placeholders for user-supplied market sizing data — required by `business-financial-disclaimer.md`, not code stubs |

No blockers or warnings. The placeholder hits in `competitive.md` are intentional TAM/SAM/SOM user-data templates mandated by project financial disclaimer rules, not implementation gaps.

### Human Verification Required

#### 1. Step 8 Workflow Execution

**Test:** Run `/pde:competitive --webmcp` against a real project with competitors identified.
**Expected:** Step 8/8 executes, sanitized tool stubs appear in `.webmcp/competitor-tools-registry.json` with `status: pending`, and gate files appear in `.planning/gates/competitor-tool-*.json`.
**Why human:** The workflow is a Claude instruction document, not executable code. Actual execution depends on Claude following the natural language instructions at runtime.

#### 2. Sanitization Correctness at Runtime

**Test:** Run the workflow on a competitor whose name/description contains `<system>`, `IMPORTANT:`, or text exceeding 512 characters.
**Expected:** Stripped patterns absent from the registry entry; description truncated at a sentence boundary before 512 chars with `...` appended.
**Why human:** Sanitization logic is specified as prose instructions for Claude to execute — cannot be exercised without a live workflow run.

#### 3. Gate Approval → queryable by browser agent

**Test:** Approve a generated gate via `pde_approval_gate` tool, then invoke `query_competitor_data` with that competitor's name in a browser session.
**Expected:** `query_competitor_data` returns the competitor's analysis data. Non-approved competitor returns an error.
**Why human:** Requires a live browser session with WebMCP active, a populated registry with a real approved entry, and the dashboard running.

---

## Gaps Summary

No gaps. All 8 must-have truths verified. All 4 requirement IDs (ADV-01 through ADV-04) satisfied. All 6 key links wired. Full test suite passes (356 tests, 0 failures). ROADMAP status for Phase 161 shows 1/2 plans complete — Plan 02 (useCompetitorTools hook) is documented in ROADMAP as pending, but the actual code artifacts for Plan 02 ARE present and passing tests in the main branch. The ROADMAP checkbox state is a documentation lag, not a code gap.

---

_Verified: 2026-03-28T22:50:02Z_
_Verifier: Claude (gsd-verifier)_
