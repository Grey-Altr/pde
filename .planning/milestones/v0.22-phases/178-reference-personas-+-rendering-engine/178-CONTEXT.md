# Phase 178: Reference Personas + Rendering Engine - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous — rendering engine with ROADMAP-locked constraints)

<domain>
## Phase Boundary

Build two reference persona implementations (executive-summary CLU-01 and case-study CLR-01) with a shared dual-format rendering engine. Self-contained HTML under 500KB with embedded CSS using PDE design tokens, auto-generated TOC, no external URLs or JavaScript. Markdown companion alongside. Design artifact screenshots embedded as base64. These two reference implementations prove the rendering pipeline before any other persona is built.

</domain>

<decisions>
## Implementation Decisions

### HTML Constraints (locked by ROADMAP)
- Self-contained HTML file under 500KB
- Embedded CSS using PDE design tokens
- Auto-generated table of contents with anchor links
- No external URLs or JavaScript
- Design artifact screenshots from .planning/design/ embedded as inline base64

### Output Convention (locked by ROADMAP)
- Files written to .planning/presentations/
- Naming: [persona]-[date].html and [persona]-[date].md
- Regenerating overwrites prior output with current state

### Executive Summary (CLU-01) Structure
- High-level project overview for C-suite/executive audience
- Key metrics, progress, timeline, decisions
- Visual evidence from design artifacts where available

### Case Study (CLR-01) Structure
- Problem-approach-outcome-lessons narrative (locked by ROADMAP)
- Deeper technical detail for peer audience
- Includes methodology and technical decisions

### Claude's Discretion
- HTML template structure and CSS design
- How to structure EJS templates or inline template strings
- Markdown formatting choices
- Which IR fields to highlight per persona
- Base64 image selection logic
- TOC generation approach

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond ROADMAP success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
