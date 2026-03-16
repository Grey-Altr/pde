# Project Research Summary

**Project:** Platform Development Engine (PDE) — v1.2 Advanced Design Skills
**Domain:** AI-powered product design pipeline (Claude Code plugin)
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

PDE v1.2 adds six new AI-driven design skills — ideation, competitive analysis, opportunity scoring, hi-fi mockup generation, HIG/WCAG audit, and tool discovery — to a 7-stage v1.1 design pipeline that is already proven and production-stable. The product is a Claude Code plugin implemented as zero-dependency CommonJS Node.js, and every architectural decision made for v1.1 carries forward unchanged. The critical strategic insight from research is that all six new skills add zero npm dependencies: Claude is the generator, pde-tools.cjs handles orchestration via Node built-ins, and the existing manifest/state architecture absorbs six new artifact codes, six new coverage flags, and two new directory paths without structural change.

The recommended implementation approach is a strict 5-phase build order derived from the dependency graph: schema migration first (the one blocking phase), then independent skills in parallel, then the compound ideation skill that calls recommend internally, then orchestrator expansion. This order isolates risk — each new skill can be validated standalone before being wired into the full `/pde:build` pipeline. The architectural pattern is identical for all six skills: a command stub delegates to a workflow, the workflow follows the established 7-step anatomy, and the final step updates designCoverage via read-before-set. No deviations from this pattern are warranted.

The highest-risk area in v1.2 is not technology — it is integration correctness. Three classes of bugs are "looks done but isn't": coverage flags being silently clobbered by existing skills that haven't been updated to the pass-through-all merge pattern; the `/pde:build` orchestrator reporting pipeline complete at the old 7-stage count while never invoking the 5 new stages; and the ideation skill collapsing its required two-phase diverge/converge structure into a single LLM pass. All three are silent failures. The schema migration phase (Phase 1) must close the coverage clobber risk before any new skill is implemented.

## Key Findings

### Recommended Stack

PDE v1.2 is deliberately zero-dependency. The entire new capability surface — six skills, a 12-command pde-tools.cjs expansion, three new reference files, five MCP integrations — is implemented using Node.js built-ins (fs, path, https, child_process) and Claude as the content generator. No npm packages are added in v1.2.

**Core technologies:**
- Node.js 20.x LTS + CommonJS (.cjs) — runtime and module format; required for Claude Code plugin compatibility; ESM is incompatible with the plugin invocation pattern
- Claude (LLM as generator) — writes Mermaid syntax, HTML wireframes/mockups, TypeScript interfaces, DTCG tokens directly as text; no template engine or rendering library needed
- DTCG 2025.10 JSON + inline dtcgToCss() — design token format (W3C stable spec) and zero-dependency CSS custom property emission in bin/lib/design.cjs
- MCP servers (user-installed, not bundled) — Sequential Thinking, Axe a11y-mcp, Playwright, Context7, Superpowers; probe/use/degrade pattern; skills function without them
- MCP Registry API v0/ at registry.modelcontextprotocol.io — public, unauthenticated REST endpoint for tool discovery in /pde:recommend; offline catalog fallback when unreachable

**Critical version constraints:**
- Commander 14.x only (not 15) — Commander 15 is ESM-only, requires Node 22.12+
- @modelcontextprotocol/sdk 1.x only (not 2.x) — v2 not yet stable as of March 2026
- a11y-mcp@1.0.4 (free, MPL-2.0) — not Deque's paid axe-mcp-server
- WCAG 2.2 AA as the audit standard — now ISO/IEC 40500:2025; WCAG 3.0 is working draft only
- Apple HIG Liquid Glass (iOS 26+) — gate Liquid Glass audit criteria on platform target being iOS/iPadOS/macOS 26+

### Expected Features

The six new skills extend the pipeline in two directions: pre-brief research (ideate, competitive, opportunity, recommend) and post-iterate quality gates (mockup, hig). The v1.1 skills (brief, system, flows, wireframe, critique, iterate, handoff) are stable dependencies that are not rewritten — only brief requires a soft update to accept upstream context injection.

**Must have (table stakes):**
- `/pde:ideate` — minimum 5 divergent directions, convergence scoring against stated goal, explicit recommended direction, assumption capture per direction, handoff to brief
- `/pde:competitive` — 3+ direct competitors, feature matrix, positioning map, explicit gap identification, evidence confidence labels on all claims
- `/pde:opportunity` — RICE score per opportunity, criteria definition before scoring, ranked output with component scores visible, rationale per score component, MVP recommendation
- `/pde:mockup` — design token application (tokens.css consumed), real CSS interactive states, all state variants per screen, self-contained HTML (no server), navigation index
- `/pde:hig` — color contrast check (WCAG 1.4.3), focus visibility (WCAG 2.4.11), touch targets (HIG + WCAG 2.5.8), form labels, heading hierarchy, severity-rated findings with remediation
- `/pde:recommend` — current MCP availability check, stack-matched tool recommendations, installation instructions per recommendation

**Should have (competitive differentiators):**
- Ideation: multi-phase two-round structure with hybrid synthesis, HMW reframes, analogous domain import — prevents anchoring bias inherent in single-pass generation
- Competitive: WebSearch MCP integration for live competitor verification (training data is 6-18 months stale); competitor weakness typology (hard-to-copy vs won't-fix vs known issue)
- Opportunity: interactive user input for RICE dimensions (never LLM-fabricated); sensitivity analysis showing which component drives each score
- Mockup: responsive layout at brief-defined breakpoints; Playwright screenshot validation when MCP available; component annotation comments linking to system.md component names
- HIG: dual-mode architecture (light in critique, full standalone); platform-aware audit scope; Axe MCP automated contrast/ARIA checks in full mode
- Recommend: ideation-integration mode with per-idea feasibility annotations (called during ideation diverge→converge checkpoint)

**Defer (v2+):**
- Figma push from mockup (requires Figma MCP; high complexity; out of scope per PROJECT.md)
- Full JavaScript application logic in mockups (mockup is a design artifact, not a prototype)
- WCAG 3.0 criterion coverage (working draft only; not normative)
- Exhaustive 10+ competitor analysis (anti-pattern; cap at 5)
- Standalone CLI wrapping pde-tools.cjs (post-v1 platform evolution; Commander 14 when needed)
- MCP server TypeScript implementation for post-v1 platform evolution

### Architecture Approach

The v1.2 architecture is additive to v1.1 without modification of any existing skill workflows. Six command stubs already exist at `commands/` with "Status: Planned" bodies — upgrading them means replacing only the `<process>` block with workflow delegation. The 7-step skill anatomy (init dirs → check prereqs → probe MCPs → generate output → write artifact with lock → update domain DESIGN-STATE → update root state + manifest + coverage flag) is the universal contract all six new skills follow without deviation.

**Major components and responsibilities:**
1. `/pde:build` orchestrator (workflows/build.md) — expanded from 7 to 13 stages; reads designCoverage once at Step 2; strictly read-only (never writes manifest); invokes all skills via Skill() not Task(); stage count must be derived from stage list, not hardcoded
2. pde-tools.cjs + bin/lib/design.cjs — three new commands: manifest-set-coverage, ensure-dirs-extended (adds ux/mockups/), mcp-registry-search; all Node built-ins only
3. design-manifest.json schema — extended from 7 to 13 designCoverage flags (additive); new flags: hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations
4. .planning/design/ file store — adds strategy/ artifacts (IDT, CMP, OPP, REC), ux/mockups/ subdirectory (MCK), review/ artifacts (HIG)
5. Five MCP servers — already documented in references/mcp-integration.md; user-installed via /pde:setup; probe/use/degrade pattern; no skill hard-requires any MCP

**Key pattern: Read-before-set (upgrade to pass-through-all)**
Every skill reads the full designCoverage blob before writing its own flag, merges only its specific flag, and writes the full blob back atomically. The existing 7 skills use field-by-field enumeration (v1.1 pattern) which silently clobbers any new flags added to the schema. All 7 existing skills must be updated to pass-through-all (Object.assign with parsed coverage blob) before any v1.2 skill is implemented.

### Critical Pitfalls

1. **Coverage flags clobbered by existing skills (Pitfall 10)** — The most insidious risk. Any existing skill (brief, system, flows, etc.) running after a new v1.2 skill writes back the 7-field coverage object, deleting the new flag. Silent failure — no error, flag just disappears. Prevention: migrate all 7 existing skills to pass-through-all merge pattern as the first action of v1.2 implementation, before any new skill writes a flag.

2. **Orchestrator stage count mismatch (Pitfall 1)** — build.md hardcodes "7 stages" in prose, display messages, and the completion check. When pipeline expands to 13 stages, the orchestrator reports "7/7 complete" and halts without ever running mockup or HIG. The bug is invisible without counting actual invocations. Prevention: derive stage count from the stage list; audit all numeric literals in build.md before wiring any new stage.

3. **Ideation single-pass collapse (Pitfall 3)** — If ideation's diverge→converge structure is implemented as one LLM prompt, the LLM produces a shallow list because the pressure to converge inhibits divergent generation. Prevention: implement as a two-pass workflow with an explicit checkpoint; IDT file written with status `diverge-complete` before converge begins; minimum 6 distinct ideas in diverge section with no evaluative language.

4. **RICE scores fabricated by LLM (Pitfall 8)** — Without interactive user input, the opportunity skill invents plausible RICE numbers with false quantitative authority. Prevention: opportunity workflow must prompt user for Reach and Effort values; confidence calibrated via a structured checklist against competitive evidence; never auto-compute all four dimensions from training data.

5. **HIG dual-mode divergence (Pitfall 5)** — If critique embeds inline HIG evaluation logic rather than delegating to hig.md with --light flag, the two code paths diverge over time and produce contradictory severity ratings for the same issue. Prevention: HIG logic lives exclusively in hig.md; critique calls Skill("pde:hig", "--light") — no inline HIG logic in critique.md; hig must be built before critique is updated.

## Implications for Roadmap

Based on the dependency graph and pitfall severity, the implementation must follow a strict 5-phase build order. Phases 2-4 can be partially parallelized but Phase 1 is a hard blocker for everything.

### Phase 1: Schema Migration and Infrastructure
**Rationale:** The coverage flag clobber bug (Pitfall 10) and the orchestrator stage count mismatch (Pitfall 1) are silent failures that corrupt all downstream work. Both must be fixed before a single new skill is implemented. This is the one phase with no parallelism options — it is a blocking dependency for all subsequent phases.
**Delivers:** Updated designCoverage schema with 13 flags in templates/design-manifest.json; all 7 existing skills updated to pass-through-all merge pattern; ux/mockups/ directory creation in bin/lib/design.cjs DOMAIN_DIRS; pde-tools.cjs manifest-set-coverage and ensure-dirs-extended commands added
**Addresses:** Critical Pitfall 10 (coverage clobber), Pitfall 2 (missing coverage flags for new skills)
**Avoids:** All six new skills destroying existing pipeline state when existing skills run after them

### Phase 2: Independent Pre-Pipeline Skills
**Rationale:** /pde:recommend and /pde:competitive have no dependencies on each other and no dependencies on any new v1.2 skills. They can be built and validated standalone. Recommend must ship before ideation because ideate calls recommend internally via Skill().
**Delivers:** /pde:recommend (standalone + ideation-integration interface; MCP Registry API via Node built-in https; offline catalog fallback); /pde:competitive (WebSearch MCP probe; staleness caveat in all output; gap analysis; strategy-frameworks.md integration); reference files references/ideation-techniques.md and references/mcp-registry-catalog.md; workflows/recommend.md and workflows/competitive.md
**Uses:** MCP Registry API v0/ for recommend; Sequential Thinking MCP + Brave Search for competitive; strategy-frameworks.md (Porter's Five Forces already complete)
**Implements:** Recommend's per-idea annotation interface that ideation will consume; competitive's confidence-labeled claim format consumed by opportunity

### Phase 3: Dependent Pre-Pipeline and Independent Post-Wireframe Skills
**Rationale:** /pde:opportunity depends on competitive output for candidate pre-population (soft dependency). /pde:mockup and /pde:hig are independent of pre-pipeline skills and of each other — they can be built in parallel with opportunity. HIG must be complete before critique is updated to delegate its HIG light checks, because critique calls Skill("pde:hig") — not inline logic.
**Delivers:** /pde:opportunity with interactive RICE input collection, sensitivity analysis, and OPP artifact; /pde:mockup with version-aware max-WFR discovery, token application, CSS interactive states, and MCK artifacts; /pde:hig with dual-mode architecture (--light and full), platform-conditional gating logic, Axe MCP probe/use/degrade, HIG-audit artifact; references/mockup-patterns.md; Liquid Glass section added to references/ios-hig.md
**Addresses:** Pitfall 6 (mockup using stale wireframe — max-version discovery required), Pitfall 5 (HIG dual-mode — hig.md is the only location for HIG logic), Pitfall 8 (RICE fabrication — interactive input required), Pitfall 9 (HIG blocking non-applicable platforms — platform-conditional gate)
**Note:** /pde:hig must be production-ready before /pde:critique is updated — critique's HIG section becomes a delegation call to hig.md

### Phase 4: Compound Skill and Brief Soft Update
**Rationale:** /pde:ideate is the most complex new skill — it calls recommend internally, requires strict two-pass diverge/converge structure with an explicit checkpoint, and reads competitive and opportunity artifacts as optional enrichment context. Brief requires a soft update to check for and inject CMP/OPP context — this is a surgical edit to an existing stable skill and should be isolated.
**Delivers:** /pde:ideate with two-pass diverge→converge structure, Skill("pde:recommend", "--quick") invocation at diverge→converge checkpoint, IDT artifact; templates/ideation-log.md; updated /pde:brief to soft-inject CMP and OPP context when present (with warning when absent); commands/ideate.md (new, no stub exists)
**Addresses:** Pitfall 3 (ideation single-pass collapse), Pitfall 4 (competitive output not wired into brief), Pitfall 7 (recommend not integrated into ideation)
**Avoids:** Task() invocation inside ideate (nested-agent freeze Issue #686 — use Skill() only); brief breaking for users who have not run competitive/opportunity (soft dependency, not hard block)

### Phase 5: Orchestrator Expansion and End-to-End Validation
**Rationale:** All 6 new skills proven standalone before wiring into the orchestrated pipeline. Orchestrator expansion touches the most-used workflow file. Validate with --dry-run before any live pipeline run; stage count in dry-run must match actual skills being invoked.
**Delivers:** /pde:build expanded to 13 stages (recommend → competitive → opportunity → ideate → brief → system → flows → wireframe → critique → iterate → mockup → hig → handoff); stage count derived dynamically from stage list (all hardcoded "7" literals removed); --dry-run shows 13-row stage table; end-to-end pipeline run from stage 1 through 13; brief confirmed to inject CMP/OPP context in-pipeline
**Addresses:** Pitfall 1 (orchestrator stage count mismatch — stage count now derived not hardcoded)
**Verification gate:** /pde:build --dry-run must show exactly 13 stages before any live run; after full pipeline run, coverage-check must show all 13 flags true with no clobbering

### Phase Ordering Rationale

- Phase 1 is a hard blocker because the coverage clobber bug (silent, no error) makes all five subsequent phases unverifiable — new skill flags are deleted by existing skills running after them, making it impossible to confirm any new skill completed correctly
- Phases 2 and 3 are largely parallelizable (recommend, competitive, opportunity, mockup, hig are independent of each other) but recommend must precede ideation; hig must precede the critique update
- Phase 4 is sequenced after Phases 2-3 because ideation calls recommend (must exist) and brief injection is simpler to validate once competitive and opportunity artifacts actually exist
- Phase 5 is always last — the orchestrator's value is integrating validated standalone skills; building it earlier forces integration against unvalidated components and increases the risk of baking in bugs at the orchestrator layer

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (/pde:mockup):** Version-aware artifact discovery (selecting max-version WFR file) needs a definitive implementation decision — either centralize in a new pde-tools.cjs `design latest-artifact` command or confirm the sorting pattern in critique.md is directly portable. Read critique.md's version-sort implementation before writing the mockup phase plan.
- **Phase 3 (/pde:hig platform gate):** Platform-conditional gating in handoff requires the brief to have an enforced platform field. Verify whether brief.md currently requires platform or only recommends it. If not required, a brief template update belongs in Phase 3, not Phase 4.
- **Phase 4 (brief soft update):** Confirm the exact `<required_reading>` injection pattern in brief.md before writing the CMP/OPP injection. If brief.md does not have a soft-dependency probe pattern, this becomes a more complex surgical edit than a standard stub upgrade.

Phases with standard patterns (skip research-phase):
- **Phase 1 (schema migration):** Pure mechanical update — read all 7 existing skill workflows, change manifest-set-top-level calls to Object.assign pass-through-all. No architecture unknowns.
- **Phase 2 (/pde:recommend):** MCP Registry API is documented, stable (v0.1 freeze since September 2025), no-auth. Node built-in https covers the integration. Standard 7-step skill anatomy.
- **Phase 2 (/pde:competitive):** Template and reference files already exist. Standard 7-step skill anatomy. WebSearch MCP integration is already documented in mcp-integration.md.
- **Phase 5 (orchestrator):** Stage table extension is mechanical. The anti-patterns (stage count, read coverage once, Skill() not Task()) are documented in build.md itself.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All decisions verified from source code direct inspection (bin/pde-tools.cjs, bin/lib/design.cjs, commands/, templates/). Zero-dep philosophy confirmed. ESM incompatibilities confirmed from GitHub issues and migration guides. DTCG spec verified at designtokens.org. MCP Registry API confirmed at registry.modelcontextprotocol.io. |
| Features | HIGH (WCAG/HIG/RICE), MEDIUM (ideation multi-phase, competitive dimensions) | WCAG 2.2, HIG patterns, RICE formula are authoritative specs. Multi-phase ideation patterns evidenced by research literature (arxiv 2601.00475) but ideation UX involves judgment calls on phase checkpoint design. |
| Architecture | HIGH | Derived entirely from direct inspection of PDE source. All templates, stubs, existing workflows, manifest schema inspected. Build.md orchestrator anti-patterns documented in-source. No speculation or training-data inference. |
| Pitfalls | HIGH | Pitfalls grounded in direct codebase inspection — orchestrator's hardcoded counts, the v1.1 read-before-set field enumeration pattern, write-lock protocol all visible in source. Coverage clobber risk confirmed by reading actual manifest-set-top-level calls in existing skill workflows. |

**Overall confidence:** HIGH

### Gaps to Address

- **MCP server npm versions:** a11y-mcp@1.0.4, @modelcontextprotocol/server-sequential-thinking@2025.12.18, @upstash/context7-mcp@2.1.4 sourced from WebSearch (MEDIUM confidence — npmjs.com returned 403 during research). Verify at install time; use `@latest` for MCP servers that auto-resolve unless version pinning is required for reproducibility.
- **Brief platform field enforcement status:** Whether the brief template currently requires or only soft-recommends a platform field is unconfirmed. Phase 3 must verify this before implementing the HIG platform-conditional gate in handoff — if platform is not enforced, a brief template update must be added to Phase 3 scope.
- **Critique HIG delegation window:** When hig.md ships and critique is updated to delegate HIG light checks, there is a window where both the old inline critique HIG logic and the new delegation exist simultaneously. Sequence strictly — complete hig.md full implementation and --light mode before modifying critique.md; do not ship a half-migrated critique.

## Sources

### Primary (HIGH confidence)
- PDE source code direct inspection: bin/pde-tools.cjs, bin/lib/design.cjs, workflows/build.md, workflows/critique.md, workflows/handoff.md, all 5 stub commands (competitive, mockup, hig, opportunity, recommend), all existing templates and references — architecture, anti-patterns, existing patterns
- designtokens.org/tr/drafts/format/ — DTCG 2025.10 stable spec, $value/$type format
- Official Claude Code docs (code.claude.com/docs/en/skills, /plugins, /sub-agents) — SKILL.md format, plugin.json, subagent frontmatter
- WCAG 2.2 (ISO/IEC 40500:2025) — authoritative accessibility standard; October 2025 ISO ratification
- MCP Registry API (registry.modelcontextprotocol.io) + Nordic APIs guide — /v0/servers endpoint, cursor pagination, v0.1 API freeze since September 2025
- Apple Liquid Glass announcement (apple.com/newsroom, June 2025) — iOS 26 design language, Liquid Glass material
- github.com/mermaid-js/mermaid issues #3590, #4148 — Mermaid 10+ ESM-only confirmed
- styledictionary.com/versions/v4/migration/ — Style Dictionary v4+ ESM-only confirmed
- a11y-mcp GitHub (github.com/priyankark/a11y-mcp) — free, MPL-2.0, wraps axe-core 4.11.1
- Playwright MCP GitHub (github.com/microsoft/playwright-mcp) — Microsoft official, accessibility tree audit

### Secondary (MEDIUM confidence)
- npm WebSearch (2026-03-16): a11y-mcp@1.0.4, @modelcontextprotocol/server-sequential-thinking@2025.12.18, @upstash/context7-mcp@2.1.4 — version numbers (npmjs.com direct fetch returned 403)
- arxiv 2601.00475 — multi-phase ideation frameworks produce higher-novelty concepts than single-pass; supports two-round diverge structure in /pde:ideate
- modelcontextprotocol.io/docs/sdk — MCP SDK v1.27.1 transport guidance; stdio for local, Streamable HTTP for remote

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
