---
phase: 25-recommend-competitive-skills
verified: 2026-03-16T22:30:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 25: Recommend & Competitive Skills Verification Report

**Phase Goal:** Users can discover relevant MCP tools for their project and run a structured competitive landscape analysis, each as standalone commands
**Verified:** 2026-03-16T22:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can run /pde:recommend and receive a ranked list of MCP servers and tools with installation instructions | VERIFIED | `commands/recommend.md` delegates to `workflows/recommend.md`; workflow has 7-step pipeline producing `REC-recommendations-v{N}.md` with ranked tools and install commands |
| 2 | Recommend reads PROJECT.md and project context to tailor suggestions to the user's stack | VERIFIED | Step 2/7 hard-requires `PROJECT.md`; Step 4/7 extracts product type, language, framework, database, feature areas, already-installed tools from PROJECT.md, REQUIREMENTS.md, package.json, STACK.md |
| 3 | Recommend degrades gracefully when mcp-compass and WebSearch MCP are unavailable (inline catalog fallback, no crash) | VERIFIED | Step 3/7 has explicit probe-fail paths setting `MCP_COMPASS_AVAILABLE=false` and `WEBSEARCH_AVAILABLE=false` with degradation tags; inline 7-category catalog in Step 4c always available |
| 4 | Recommend is callable as a standalone skill that Phase 27 ideation can invoke via Skill() | VERIFIED | `<purpose>` states "callable as a standalone command (/pde:recommend) and as a subroutine from /pde:ideate (Phase 27) via Skill() invocation" |
| 5 | User can run /pde:competitive and receive a feature comparison matrix, positioning map, and gap list covering 3+ competitors | VERIFIED | `commands/competitive.md` delegates to `workflows/competitive.md`; workflow produces feature comparison matrix (Step 4c), SVG positioning maps (Step 4d), gap analysis (Step 4g), and structured Opportunity Highlights |
| 6 | Every claim in competitive output carries a confidence label (confirmed / inferred / unverified) | VERIFIED | Step 4/7 defines confidence label block; instructions require labels on every factual competitor claim; anti-patterns section explicitly forbids unlabeled claims |
| 7 | Competitive gaps are written to a structured Opportunity Highlights section that /pde:opportunity can parse as candidate input | VERIFIED | Step 5/7 specifies exact numbered-list format with Source, Estimated reach, Competitive advantage sub-fields; anti-patterns forbid prose alternative |
| 8 | Competitive skill degrades gracefully when WebSearch MCP is unavailable (training knowledge fallback with inferred/unverified labels) | VERIFIED | Step 3/7 probe fails gracefully, sets `WEBSEARCH_AVAILABLE=false`; Step 4/7 defines rule that all training-knowledge claims default to `[inferred]` when WebSearch unavailable |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `commands/recommend.md` | Thin command stub delegating to @workflows/recommend.md | VERIFIED | File exists; `<process>` contains `@workflows/recommend.md` and `@references/skill-style-guide.md`; YAML frontmatter preserved |
| `workflows/recommend.md` | Full recommend skill workflow with inline MCP catalog, probe/degrade logic, context-tailored ranking, coverage flag write | VERIFIED | 634 lines; substantive 7-step pipeline; inline 7-category catalog covering ~25 tools; all 5 lint-required sections present |
| `commands/competitive.md` | Thin command stub delegating to @workflows/competitive.md | VERIFIED | File exists; `<process>` contains `@workflows/competitive.md` and `@references/skill-style-guide.md`; YAML frontmatter preserved |
| `workflows/competitive.md` | Full competitive skill workflow with confidence labeling, structured gap analysis, SVG positioning map, Porter's Five Forces, coverage flag write | VERIFIED | 599 lines; substantive 7-step pipeline; confidence label framework defined; Opportunity Highlights contract specified; Porter's Five Forces included |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `commands/recommend.md` | `workflows/recommend.md` | `@workflows/recommend.md` in `<process>` | WIRED | `grep` confirms `@workflows/recommend.md` present at line 19 |
| `workflows/recommend.md` | `templates/recommendations.md` | Artifact structure reference for output | WIRED | Pattern `REC-recommendations-v` present at lines 92, 97, 98, 101, 103, 330, 450, 463 |
| `workflows/recommend.md` | `design-manifest.json` | coverage-check read then manifest-set-top-level with hasRecommendations: true | WIRED | `coverage-check` at line 560; `hasRecommendations":true` in 13-field JSON at line 586 |
| `commands/competitive.md` | `workflows/competitive.md` | `@workflows/competitive.md` in `<process>` | WIRED | `grep` confirms `@workflows/competitive.md` present at line 19 |
| `workflows/competitive.md` | `templates/competitive-landscape.md` | Artifact structure reference for output | WIRED | Pattern `CMP-competitive-v` present at lines 135, 140, 141, 144, 146, 154, 359, 443, 515, 531 |
| `workflows/competitive.md` | `templates/opportunity-evaluation.md` | Opportunity Highlights section contract | WIRED | Pattern `Opportunity Highlights` present at lines 390, 393, 398, 426 |
| `workflows/competitive.md` | `design-manifest.json` | coverage-check read then manifest-set-top-level with hasCompetitive: true | WIRED | `coverage-check` at line 541; `"hasCompetitive":true` in 13-field JSON at line 552 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REC-01 | 25-01-PLAN.md | User can discover relevant MCP servers and tools via /pde:recommend | SATISFIED | Command and workflow both exist and produce ranked, install-ready MCP/tool list |
| REC-02 | 25-01-PLAN.md | Recommend reads project context to tailor suggestions | SATISFIED | Step 2/7 reads PROJECT.md (hard), REQUIREMENTS.md, package.json, STACK.md (soft); Step 4/7 derives full project profile for scoring |
| REC-03 | 25-01-PLAN.md | Recommend integrates into ideation workflow when called from /pde:ideate | SATISFIED | `<purpose>` explicitly documents Skill() invocation contract; Phase 27 integration note in SUMMARY |
| COMP-01 | 25-02-PLAN.md | User can run structured competitive landscape analysis via /pde:competitive | SATISFIED | Command and workflow both exist; 7-step pipeline produces structured CMP artifact |
| COMP-02 | 25-02-PLAN.md | Competitive output includes feature comparison matrix and positioning map | SATISFIED | Feature matrix in Step 4c with per-cell confidence labels; SVG positioning maps in Step 4d (1/2/3 maps by scope) |
| COMP-03 | 25-02-PLAN.md | Competitive gaps feed into opportunity scoring as candidate input | SATISFIED | Opportunity Highlights section in Step 5/7 uses structured numbered-list format with Source/Estimated reach/Competitive advantage sub-fields that /pde:opportunity parses |

**No orphaned requirements found.** REQUIREMENTS.md maps exactly REC-01, REC-02, REC-03, COMP-01, COMP-02, COMP-03 to Phase 25 — all six claimed in plan frontmatter and all six verified.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `workflows/recommend.md` | 589 | Text "placeholder" in instruction prose | INFO | Not a stub — instructs executor to replace `{current_*}` template variables at runtime; this is correct workflow authoring |
| `workflows/competitive.md` | 555 | Text "placeholder" in instruction prose | INFO | Same pattern — instructs executor to replace `{current}` template variables at runtime; correct and expected |

No blockers. No warnings. The two "placeholder" hits are in executor instruction text (`Replace each {current_*} placeholder with the actual value...`) — they are workflow authoring conventions, not stub implementations.

---

### Human Verification Required

The following items cannot be verified by static analysis of the workflow files:

#### 1. Recommend output quality at runtime

**Test:** Run `/pde:recommend` in a project with a `PROJECT.md` present.
**Expected:** Produces `.planning/design/strategy/REC-recommendations-v1.md` with ranked tools, install commands, category coverage map, and no reference to ecosystem-catalog.json.
**Why human:** Workflow is instruction-to-executor; actual output quality depends on LLM execution, not static analysis.

#### 2. Competitive confidence label enforcement at runtime

**Test:** Run `/pde:competitive --no-websearch` (or without WebSearch MCP installed).
**Expected:** All competitor claims in the output carry `[confirmed]`, `[inferred]`, or `[unverified]` labels; no unlabeled factual claims appear.
**Why human:** The instruction "apply confidence labels to EVERY factual claim" is enforced at runtime by the executor, not by static file structure.

#### 3. Opportunity Highlights parseability by /pde:opportunity

**Test:** Run `/pde:competitive` then `/pde:opportunity` in the same project.
**Expected:** /pde:opportunity successfully ingests the CMP artifact's Opportunity Highlights section as candidate input without manual reformatting.
**Why human:** The downstream contract between competitive and opportunity skills is exercised only when both are run sequentially — integration behavior.

#### 4. REC-03 Skill() invocation from /pde:ideate

**Test:** Run `/pde:ideate` in a project (Phase 27 when built).
**Expected:** Ideation skill invokes recommend via `Skill()` and incorporates the REC artifact recommendations into ideation output.
**Why human:** Phase 27 does not exist yet; this integration contract cannot be verified until /pde:ideate is built.

---

### Gaps Summary

No gaps. All 8 observable truths verified, all 4 artifacts pass all three levels (exists, substantive, wired), all 7 key links confirmed wired, all 6 requirements satisfied. Both commits (08cde84, 04287fd) verified in git history.

---

## Commit Verification

| Commit | Plan | Files | Status |
|--------|------|-------|--------|
| `08cde84` | 25-01 | `commands/recommend.md`, `workflows/recommend.md` | VERIFIED — exists in git history |
| `04287fd` | 25-02 | `commands/competitive.md`, `workflows/competitive.md` | VERIFIED — exists in git history |

---

_Verified: 2026-03-16T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
