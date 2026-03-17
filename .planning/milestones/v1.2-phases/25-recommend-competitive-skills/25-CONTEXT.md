# Phase 25: Recommend & Competitive Skills - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Build two new standalone design skills — `/pde:recommend` (MCP/tool discovery) and `/pde:competitive` (competitive landscape analysis) — replacing existing stub commands with full workflow implementations. Both follow the established v1.1 skill pattern (command stub → workflow file → template artifact). No new Node.js code, no new packages.

</domain>

<decisions>
## Implementation Decisions

### Recommend Skill
- Inline curated catalog embedded directly in workflow file (ecosystem-catalog.json does not exist — don't create it)
- Catalog covers 7 MCP categories from mcp-integration.md: design, code quality, data, deployment, research, AI, collaboration
- Probe mcp-compass first, degrade to inline catalog if absent
- Probe WebSearch MCP for live tool discovery, degrade to catalog if absent
- Read PROJECT.md, REQUIREMENTS.md, package.json, and any STACK.md for context-tailored recommendations
- Output to `.planning/design/strategy/REC-recommendations-v{N}.md`
- Write `hasRecommendations` coverage flag via 13-field pass-through-all pattern

### Competitive Skill
- Default scope: `--standard` (3-5 competitors)
- Support `--quick` (3 competitors, no Porter's), `--standard` (3-5 with Porter's), `--deep` (5-8+ with extra maps)
- Confidence labeling: training knowledge claims default to `[inferred]`, WebSearch-verified claims get `[confirmed]`, unverifiable claims get `[unverified]`
- Gap analysis uses structured format from template (`## Opportunity Highlights` with numbered list) — machine-readable for `/pde:opportunity`
- SVG positioning maps use template from strategy-frameworks.md
- Output to `.planning/design/strategy/CMP-competitive-v{N}.md`
- Write `hasCompetitive` coverage flag via 13-field pass-through-all pattern

### Claude's Discretion
- Exact MCP catalog entries — Claude picks the most relevant tools per category based on current ecosystem knowledge
- Positioning map axis selection — Claude picks meaningful axis pairs based on the product domain
- Porter's Five Forces emphasis — Claude focuses on forces most relevant to the product space

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `templates/recommendations.md` — Full recommendations artifact structure with machine-readable format
- `templates/competitive-landscape.md` — Full competitive artifact structure including gap analysis and opportunity highlights
- `references/mcp-integration.md` — Probe/use/degrade patterns for all MCPs; recommendation engine section
- `references/strategy-frameworks.md` — RICE, Porter's Five Forces, positioning map SVG template
- `references/skill-style-guide.md` — Output formatting, lint rules, error patterns
- `references/tooling-patterns.md` — LINT-001 through LINT-042 rules; skill registry requirements

### Established Patterns
- Workflow file structure: `<purpose>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`, `<process>`, `<output>` (lint-required sections)
- Command file: thin YAML frontmatter stub delegating to `@workflows/{name}.md`
- Design directory init: `pde-tools.cjs design ensure-dirs`
- Write lock: `lock-acquire` → update DESIGN-STATE → `lock-release`
- Versioned artifacts: never overwrite, always increment version
- Coverage flags: 13-field pass-through-all pattern (Phase 24)

### Integration Points
- Both skills register in `skill-registry.md` with codes REC and CMP
- Competitive `## Opportunity Highlights` section is consumed by `/pde:opportunity` (Phase 26)
- Recommend skill is callable via `Skill()` from `/pde:ideate` (Phase 27)
- Both write coverage flags to design-manifest.json via `manifest-set-top-level designCoverage`

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond what's in ROADMAP.md and REQUIREMENTS.md — open to standard approaches following established v1.1 skill patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 25-recommend-competitive-skills*
*Context gathered: 2026-03-16*
