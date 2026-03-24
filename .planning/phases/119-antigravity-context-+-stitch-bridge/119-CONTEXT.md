# Phase 119: Antigravity Context + Stitch Bridge - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Extend context-sync.cjs with Antigravity emitter (.agent/skills/pde-design/SKILL.md) and DESIGN.md (Antigravity Design DNA format from DTCG tokens). Add Stitch bridge metadata for detecting Antigravity-originated projects and enabling bidirectional artifact flow through existing STH pipeline.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from research:
- DESIGN.md maps OKLCH palette to hex with semantic roles, typography from SYS-typography.json, spacing from tokens
- .agent/skills/pde-design/SKILL.md follows Antigravity skill format (directory-based with SKILL.md)
- Stitch bridge extends existing v0.9 manifest metadata pattern (source: "antigravity-stitch")
- Reverse flow (Stitch → PDE) already 80% built via v0.9 --use-stitch pipeline
- Zero npm deps — extend existing context-sync.cjs module

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- bin/lib/context-sync.cjs — IR builder and emitter framework from Phase 118
- bin/lib/mcp-bridge.cjs — Stitch MCP integration, TOOL_MAP entries, consent gates
- .planning/design/design-manifest.json — artifact registry with source field for Stitch detection
- bin/lib/manifest.cjs — manifest operations, SHA-256 hashing

### Established Patterns
- Emitter pattern: function takes IR, returns string, context-sync orchestrates writes
- Stitch artifacts: source: "stitch" in manifest for PDE-direct, extend with "antigravity-stitch"
- DTCG tokens: SYS-tokens.json with OKLCH values, groups (color, spacing, typography)

### Integration Points
- context-sync.cjs emitAll() calls new emitAntigravitySkill() and emitDesignMd()
- Stitch detection in critique.md and handoff.md already reads manifest source field
- mcp-bridge.cjs TOOL_MAP has Stitch entries for get_screen_code, get_screen_image, build_site

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
