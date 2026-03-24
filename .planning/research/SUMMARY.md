# Project Research Summary

**Project:** PDE v0.15 Multi-Editor Integration
**Domain:** Multi-editor AI tool integration (MCP server, context generation, design bridge)
**Researched:** 2026-03-23
**Confidence:** MEDIUM-HIGH

## Executive Summary

PDE v0.15 extends the existing Claude Code plugin to expose its design pipeline state to three additional AI editors: Cursor, Google Antigravity, and Gemini CLI. The integration has two distinct tracks: (1) generating static context files that editors consume natively (`.cursor/rules/*.mdc`, `GEMINI.md`, `AGENTS.md`), and (2) a standalone MCP server (`npx pde-mcp-server`) that exposes PDE workflows as read-only query tools over stdio transport. Both tracks feed from the same `.planning/` state files through an intermediate representation pattern that decouples state reading from editor-specific formatting. The zero-npm-dependency constraint at the plugin root is preserved by isolating the MCP server in its own subdirectory with independent `package.json`.

The recommended approach is to build context generation first (zero dependencies, immediate value), then Antigravity-specific context plus Stitch bridge (extends Phase 1 patterns with bidirectional design flow), then the MCP server (requires npm packaging), and finally divergence detection (independent, requires handoff artifacts). This ordering follows the dependency chain: context files prove the state-reading layer; the Stitch bridge extends Antigravity's context; the MCP server reuses the proven layer via subprocess delegation; divergence detection is independently scoped.

The primary risks are: (1) accidentally exposing write tools in the MCP server, which would create a second write path bypassing PDE's validation infrastructure -- this must be enforced as a hard architectural constraint from Phase 1 design; (2) context file staleness, where generated files drift from PDE state within a single pipeline run -- mitigated by embedding source hashes and hook-driven regeneration; (3) dual Stitch integration paths (PDE's existing v0.9 path and Antigravity's native path) producing incompatible artifact representations -- mitigated by defining a canonical format both paths must produce. All three risks have clear prevention strategies documented in the pitfalls research.

## Key Findings

### Recommended Stack

The stack splits cleanly: context generators are zero-dependency CJS modules in `bin/lib/` using Node.js built-ins only, while the MCP server is an isolated TypeScript package using `@modelcontextprotocol/sdk` v1.27.1 and `zod` v3.25+. All editor context files are plain markdown with minimal formatting conventions (YAML frontmatter for Cursor `.mdc` only).

**Core technologies:**
- **@modelcontextprotocol/sdk ^1.27.1**: MCP server implementation -- official TypeScript SDK, stdio transport, 12ms latency
- **zod ^3.25.0**: MCP tool input validation -- required peer dependency of SDK
- **TypeScript ^5.5**: MCP server compilation only -- ESM-only SDK requirement, does not affect plugin root
- **Node.js built-ins (fs, path, crypto)**: Context generators, divergence detection, Stitch bridge -- zero npm deps

**Critical version notes:** SDK uses zod/v4 compat layer, requiring zod 3.25+ (not older 3.x). Node 18+ required for ESM. MCP SDK v2 anticipated but v1.x is production-recommended with 6+ month support window.

### Expected Features

**Must have (table stakes):**
- `.cursor/rules/*.mdc` generation (Cursor is dominant AI IDE; multiple `.mdc` files with YAML frontmatter)
- `GEMINI.md` generation (shared by Antigravity and Gemini CLI; hierarchical, plain markdown)
- `AGENTS.md` generation (cross-tool standard read by all four editors)
- MCP server with read-only PDE state tools (10 tools, well under Cursor's 40-tool cap)
- Design token output as Tailwind v4 `@theme` config (editors need consumable tokens)
- Handoff spec as `@file` annotations (component specs as inline references)

**Should have (differentiators):**
- Stitch design bridge (bidirectional PDE-to-Antigravity artifact flow via existing v0.9 infrastructure)
- Divergence detection (three-tier handoff spec vs code drift analysis)
- Context sync engine with hook-driven auto-regeneration
- Antigravity agent skills export (PDE workflows as invocable Antigravity skills)
- Pipeline progress as MCP resource (passive context, not action)

**Defer (v2+):**
- Multi-format artifact export beyond React+Tailwind (wait for demand signal)
- Full TypeScript AST parsing for divergence detection (regex MVP first)
- T3 behavioral divergence detection (runtime analysis, diminishing returns)
- Individual pipeline stage skills for Antigravity (complexity exceeds initial value)
- Bidirectional code-to-design sync (architecturally intractable)

### Architecture Approach

The architecture follows a layered emitter pattern: a shared context-sync engine reads `.planning/` state into an editor-agnostic intermediate representation (IR), which editor-specific emitters transform into target formats. The MCP server is a separate process that delegates to `pde-tools.cjs` via subprocess spawning (not direct module imports), preserving the single-entry-point pattern. The Stitch bridge reuses `mcp-bridge.cjs` probe/degrade contracts for graceful degradation when Stitch MCP is unavailable.

**Major components:**
1. **`bin/lib/context-sync.cjs`** -- IR builder reading `.planning/` state (foundation for all editors)
2. **`bin/lib/context-emitters/{cursor,antigravity,gemini-cli}.cjs`** -- Format-specific file generators
3. **`pde-mcp-server/`** -- Isolated npm package exposing 9-10 read-only MCP tools via stdio
4. **`bin/lib/stitch-bridge.cjs`** -- Bidirectional artifact flow between PDE and Antigravity Stitch canvas
5. **`bin/lib/divergence.cjs`** -- Heuristic handoff-vs-code drift detection (AST-free, ~85% accuracy)

### Critical Pitfalls

1. **Write tools in MCP server** -- Enforce read-only contract from Phase 1; grep all tool handlers for `fs.write*`; mark every tool description as "read-only" to prevent LLM hallucination of write capability. Recovery cost is HIGH (rewrite + breaking change).

2. **Context file staleness** -- Embed generation timestamp and SHA-256 source hash in every generated file; hook-driven regeneration after pipeline skills; provide `/pde:sync-context` manual command. Ship hash tracking alongside initial generation, not after.

3. **Dual Stitch path divergence** -- Define canonical artifact format (PDE's `STH-{slug}.html` convention); Antigravity bridge converts to canonical format before manifest registration; unify quota tracking across both paths. Design in Phase 1, build in Phase 2.

4. **npx distribution breaking zero-dep constraint** -- MCP server must live in isolated subdirectory with own `package.json`; never reference from plugin root; pin SDK version explicitly; document Windows `cmd /c npx` workaround.

5. **Divergence detection false positives** -- Start with high-confidence checks only (token values, interface signatures); report as CONCERNS severity, never FAIL; ship `.pde-divergence-ignore` mechanism alongside the detector; include confidence scores per finding.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Context Sync Core
**Rationale:** Zero dependencies, immediate value, foundation for all subsequent phases. The IR builder must exist before any editor-specific work begins. Cursor and Gemini CLI formats are well-documented (HIGH confidence).
**Delivers:** `/pde:context-sync` command generating `.cursor/rules/*.mdc`, `GEMINI.md`, and `AGENTS.md` from PDE state; design token Tailwind v4 conversion; generation timestamp and source hash in every file.
**Addresses:** All 6 table-stakes features from FEATURES.md (context files, token conversion, annotation format).
**Avoids:** Context staleness pitfall (build hash tracking from day one). Anti-pattern of writing to user's AGENTS.md (write to GEMINI.md + `.agent/rules/pde-*` instead).

### Phase 2: Antigravity Context + Stitch Bridge
**Rationale:** Antigravity emitter depends on the shared GEMINI.md format proven in Phase 1. Stitch bridge depends on existing mcp-bridge.cjs patterns and is Antigravity-specific. Grouping these delivers the full Antigravity experience.
**Delivers:** Antigravity-specific `.agent/rules/` files, `DESIGN.md` generator (DTCG to Design DNA), bidirectional Stitch artifact flow, `.agent/skills/pde-design/` skill export.
**Uses:** context-sync IR (Phase 1), mcp-bridge.cjs probe/degrade pattern (v0.9), Stitch MCP tools.
**Avoids:** Dual Stitch path divergence (canonical format enforcement); quota tracking split (single shared counter).

### Phase 3: Standalone MCP Server
**Rationale:** MCP server depends on `pde-tools.cjs` commands being stable. Building after context sync proves the state-reading layer. The server is independently testable via MCP Inspector. Requires npm packaging/publishing infrastructure.
**Delivers:** `npx pde-mcp-server` with 9-10 read-only tools, stdio transport, editor registration configs for Cursor/Antigravity/Gemini CLI.
**Implements:** Subdirectory package isolation pattern; subprocess delegation to `pde-tools.cjs --raw`.
**Avoids:** Write tool exposure (read-only contract enforced at tool definition layer); npx dependency pollution (isolated subdirectory); tool count explosion (budget of 10 tools, under Cursor's 40-tool cap).

### Phase 4: Divergence Detection
**Rationale:** Most independent feature -- no other v0.15 component depends on it. Requires handoff artifacts to exist. Heuristic approach is well-scoped but needs calibration against real codebases.
**Delivers:** `/pde:divergence` command, three-tier detection (structural + content for MVP), `DIVERGENCE-REPORT.md`, `.pde-divergence-ignore` mechanism, confidence scores per finding.
**Addresses:** Differentiator feature from FEATURES.md (catches spec-vs-code drift).
**Avoids:** False positive trap (CONCERNS severity, confidence scores, ignore mechanism shipped alongside detector).

### Phase 5: Integration Testing + Cross-Editor Validation
**Rationale:** End-to-end validation across all three target editors. Cannot run until all components exist. Validates the assumptions made in earlier phases about editor behavior.
**Delivers:** Verified context consumption in Cursor, Antigravity, Gemini CLI; MCP server query validation; Stitch bridge round-trip; divergence accuracy calibration (<5 findings on a known-good codebase).

### Phase Ordering Rationale

- **Dependency chain drives order:** Context sync IR is the foundation (Phase 1) consumed by all downstream phases. Antigravity needs the GEMINI.md format proven first (Phase 2 after 1). MCP server needs stable `pde-tools.cjs` commands (Phase 3 after 1-2). Divergence is independent (Phase 4 can parallel Phase 3).
- **Risk front-loading:** The two highest-risk pitfalls (write tool exposure, staleness) are addressed in Phases 1-3. The Stitch dual-path risk is contained in Phase 2 before the MCP server exposes Stitch state.
- **Value delivery cadence:** Phase 1 delivers usable context files immediately. Each subsequent phase adds a distinct capability layer. Users get incremental value at each phase boundary.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Antigravity + Stitch Bridge):** Antigravity's official docs are JS-rendered and partially unavailable; `DESIGN.md` format is reconstructed from community guides. The bidirectional Stitch flow has limited community post-mortem data. Recommend `/gsd:research-phase` before planning.
- **Phase 3 (MCP Server):** npm publishing and npx distribution has platform-specific edge cases (Windows, NVM). The 73% failure rate for local MCP installations cited in distribution guides warrants investigation. Recommend targeted research on distribution strategy.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Context Sync Core):** Cursor `.mdc` format is thoroughly documented. GEMINI.md spec is official. IR builder is a standard read-transform-write pattern. HIGH confidence, no additional research needed.
- **Phase 4 (Divergence Detection):** Architecture drift detection literature is well-established (absence/divergence/convergence model). Heuristic approach is straightforward. Calibration happens during execution, not research.
- **Phase 5 (Integration Testing):** Standard end-to-end validation. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | MCP SDK is official, well-documented. Zod version constraint verified. Cursor .mdc format from official docs. |
| Features | MEDIUM-HIGH | Table stakes well-defined. Antigravity features partially based on community guides (official docs JS-rendered). Stitch bridge data model inferred from codelab, not official API docs. |
| Architecture | MEDIUM | IR pattern and emitter separation are sound. MCP server subprocess delegation is proven (matches Playwright MCP). Stitch bridge bidirectional flow is the least proven component. |
| Pitfalls | HIGH | Grounded in MCP security specification, real exploit post-mortems, and PDE's own bug history (coverage flag corruption fixed 3 times in v0.11/v0.12/v0.14). |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Antigravity DESIGN.md format:** Reconstructed from community guides and Google Codelabs, not official specification. Validate during Phase 2 execution by testing against actual Antigravity workspace.
- **Stitch quota unification:** Both PDE direct path and Antigravity bridge path consume the same Google Labs monthly quota, but the exact API call counting mechanism is not documented. May need empirical testing.
- **Divergence detection calibration:** No PDE-specific drift detection data exists. The ~85% accuracy estimate for heuristic matching is extrapolated from similar tools, not measured. Phase 4 must include a calibration gate against real handoff specs.
- **MCP SDK v2 migration path:** v2 is anticipated but not shipped. The research assumes v1.x stability for 6+ months. If v2 ships during v0.15 development, migration should be deferred to v0.16 unless v1.x is deprecated.
- **Cursor 40-tool limit behavior:** Confirmed via community reports that exceeding the limit silently drops tools. The exact drop algorithm (FIFO, random, by server) is undocumented. PDE's 10-tool budget provides ample headroom but the behavior should be verified during Phase 5.
- **AGENTS.md write policy conflict:** FEATURES.md recommends generating AGENTS.md; ARCHITECTURE.md says never touch it (user-authored). Recommendation: generate AGENTS.md only if it does not already exist, with a `<!-- PDE-GENERATED -->` marker. If user has their own AGENTS.md, PDE writes only to GEMINI.md and `.agent/rules/pde-*`.

## Sources

### Primary (HIGH confidence)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) -- server patterns, StdioServerTransport, version compatibility
- [Cursor Rules Documentation](https://cursor.com/docs/context/rules) -- .mdc format, YAML frontmatter, rule types, AGENTS.md support
- [Gemini CLI GEMINI.md Docs](https://geminicli.com/docs/cli/gemini-md/) -- hierarchical loading, @file imports, configurable filename
- [MCP Security Best Practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices) -- read/write separation, least privilege
- [Architecture Drift Detection (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S0920548923000557) -- absence/divergence/convergence model
- [Design-to-Code Antigravity+Stitch Codelab](https://codelabs.developers.google.com/design-to-code-with-antigravity-stitch) -- official Google workflow

### Secondary (MEDIUM confidence)
- [Antigravity Rules Guide](https://antigravity.codes/blog/user-rules) -- AGENTS.md + GEMINI.md hierarchy, Skills format
- [AGENTS.md Standard](https://agents.md/) -- cross-tool specification, 60K+ projects
- [Cursor 40-Tool MCP Limit](https://forum.cursor.com/t/mcp-server-40-tool-limit-in-cursor-is-this-frustrating-your-workflow/81627) -- confirmed tool cap
- [stitch-mcp GitHub](https://github.com/davideast/stitch-mcp) -- tool list, Stitch API patterns
- [MCP Server Distribution Guide](https://www.speakeasy.com/mcp/distributing-mcp-servers) -- npx packaging best practices
- [MCP Confused Deputy Analysis](https://securityboulevard.com/2026/03/mcp-servers-and-the-return-of-the-service-account-problem/) -- write tool exposure risks

### Tertiary (LOW confidence)
- [Antigravity AgentKit 2.0](https://www.geeky-gadgets.com/google-antigravity-agentkit-2026/) -- 16 agents, 40+ skills (third-party report, unverified)
- Divergence detection accuracy estimates -- extrapolated from similar tools, no PDE-specific measurement

---
*Research completed: 2026-03-23*
*Ready for roadmap: yes*
