# Feature Research

**Domain:** AI visual design generation — Google Stitch as PDE's primary design engine (v0.9)
**Researched:** 2026-03-20
**Confidence:** MEDIUM (Stitch capabilities verified across multiple independent sources including official Google blog, official docs attempts, GitHub MCP repos, and several independent reviews; some claims from single sources flagged inline)

---

> **Scope note:** This file covers ONLY what Google Stitch adds to PDE's v0.9 milestone. Existing PDE design capabilities (13-stage pipeline, Claude HTML/CSS generation, Figma DTCG token sync, Pencil canvas, OKLCH design tokens) are stable dependencies — not rebuilt here. Every feature described is either additive or a replacement for Claude's HTML/CSS generation path within existing pipeline stages.

---

## Baseline: What Claude HTML/CSS Generation Provides (Stable Dependency)

```
Existing design generation (pre-v0.9):
  /pde:wireframe       — lofi/midfi/hifi HTML/CSS wireframes via Claude code generation
  /pde:mockup          — full visual polish, interactions, state transitions via Claude
  /pde:ideate          — multi-phase diverge→converge (text-based concept descriptions)
  /pde:critique        — multi-perspective critique with severity-rated findings
  /pde:handoff         — synthesizes design artifacts into component APIs + TypeScript interfaces
  /pde:iterate         — applies critique/HIG feedback to revise design artifacts
  Figma MCP            — DTCG token import/export, wireframe context, Code Connect handoff
  Design tokens        — DTCG 2025.10 + OKLCH + dual dark mode

Strengths of Claude-generated HTML/CSS:
  - Full design system token compliance (DTCG, OKLCH, custom properties)
  - Motion tokens, spring physics, APCA contrast enforcement
  - Interactions and state transitions (hover, focus, active states)
  - Arbitrary fidelity: lofi placeholder blocks → hifi pixel-perfect layouts
  - Component API generation alongside visual output
  - Zero external API dependency or generation limits
  - HIG audit integration (reads its own output)
  - Awwwards-level quality bar with self-improvement fleet

What Claude-generated HTML/CSS lacks vs Stitch:
  - Multi-direction visual exploration (Claude generates one direction, not 5 variants)
  - Image-grounded generation from sketch/screenshot inputs
  - Non-designer accessibility: requires detailed prompts for good output
  - Visual fidelity from initial generation (requires iteration to reach hifi)
  - "Vibe" generation from emotional/feeling descriptions vs functional specs
```

---

## Google Stitch Capability Matrix (Confirmed Capabilities)

> Sources: official Google Developers Blog, GitHub davideast/stitch-mcp (official-affiliated), Kargatharaakash/stitch-mcp, Google Codelabs design-to-code codelab, index.dev review, nxcode.io guide, almcorp.com guide.

### What Stitch Actually Generates

| Output Type | Confirmed | Quality Assessment | Notes |
|-------------|-----------|-------------------|-------|
| HTML + Tailwind CSS screens | YES | Reasonable for prototyping; needs refinement for production | Not semantic HTML or component-structured by default |
| Multiple layout variants per prompt | YES | 3-5 variants typical; visual divergence is the primary value | Allows broad exploration before committing |
| Multi-screen flows (mobile + web) | YES | Cinema app example: registration, profile, listings, booking, payment | Full-app screen sets from single project |
| Figma export with Auto Layout | YES | Named, grouped layers with Auto Layout structure | Official Figma plugin; primary handoff path |
| Screen screenshots (base64) | YES (via MCP) | `get_screen_image` tool returns base64 PNG | Used for critique comparator workflows |
| React component scaffolding | PARTIAL | Via Antigravity IDE workflow; not native Stitch output | Downstream from Stitch HTML via coding agent |
| Figma-format token exports | NO | Stitch does not output DTCG tokens or design system artifacts | Critical gap for PDE's DTCG pipeline |
| Animations / micro-interactions | NO | Static screens only; no motion support | Confirmed in multiple reviews |
| ARIA / accessibility attributes | NO | No accessibility output; no contrast checking | Must be added downstream |
| Backend code / state management | NO | Frontend scaffolding only; no click handlers that function | Confirmed: "form submit had no effect" |

### What Stitch Accepts as Input

| Input Type | Confirmed | Caveats |
|------------|-----------|---------|
| Natural language text prompts | YES — primary input | Quality of output depends heavily on prompt specificity |
| Image upload (screenshot, mockup) | YES — Experimental Mode only | Requires Gemini 2.5 Pro; uses more generation credits |
| Hand-drawn sketch upload | CLAIMED but DISPUTED | One review: "Stitch simply asks you to describe the content in text instead — the image input is effectively useless for generating UI layouts" (LOW confidence this works reliably) |
| Voice descriptions (Voice Canvas) | YES — March 2026 update | Speaks directly to canvas; agent asks clarifying questions, makes live updates |
| Design reference for redesign | YES | Upload existing screenshot; Stitch rebuilds as structured design |
| DESIGN.md / brand guidelines document | YES (workaround) | Not native token import; users paste brand context as text to get closer to brand consistency |

### MCP Server Tools (Confirmed — from GitHub repos)

The `@_davideast/stitch-mcp` package (official-affiliated, maintained by davideast) exposes these tools via MCP:

| Tool | What It Does | Input | Output |
|------|-------------|-------|--------|
| `list_projects` | Lists Stitch projects in account | none | Project list with IDs |
| `list_screens` | Lists screens within a project | `projectId` | Screen list with IDs |
| `get_project` | Gets project metadata | `projectId` | Project metadata |
| `get_screen` | Gets screen metadata | `screenId` | Screen info |
| `get_screen_code` | Retrieves screen HTML/CSS | `screenId` | Raw HTML string |
| `get_screen_image` | Gets screen screenshot | `screenId` | Base64 PNG |
| `build_site` | Maps screens to routes, returns all HTML | `projectId`, `routes[]` | `{ route: html }` per route |
| `generate_screen_from_text` | Creates new screen from prompt | text prompt | New screen in project |
| `extract_design_context` | "Design DNA" — fonts, colors, layouts | `screenId` | Design tokens as markdown |
| `create_project` | Creates new Stitch project | project name | Project ID |

Authentication: API Key (`STITCH_API_KEY` env var) or Google Cloud ADC. API Key is simpler. Requires Google Cloud project with billing enabled and Stitch API enabled.

**Note:** `davideast/stitch-mcp` is labeled "NOT affiliated with, endorsed by, or sponsored by Google LLC — provided AS-IS." A separate `Kargatharaakash/stitch-mcp` also exists and duplicates most tools. The `davideast` package is more widely referenced and has npm publication.

---

## Feature Landscape

### Table Stakes (Users Expect These from Stitch-as-Primary-Engine)

These are required for "Stitch as primary engine" to be a credible claim. Missing any of these means PDE's existing Claude-generated pipeline is still doing the real work and Stitch is cosmetic.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **`--use-stitch` flag on `/pde:wireframe`** | Users need an explicit opt-in to Stitch rendering path; no flag = no choice between Claude and Stitch | LOW | Flag routes to Stitch MCP `generate_screen_from_text`; returns HTML for downstream pipeline stages |
| **`--use-stitch` flag on `/pde:mockup`** | Mockup is the hifi generation stage; Stitch's strong suit is visual polish from prompts | LOW | Same flag pattern; calls Stitch with brief + wireframe context as prompt |
| **Stitch MCP server integration** | Without MCP registration in mcp-bridge.cjs, no tool calls possible | MEDIUM | 6th approved server; needs `assertApproved()` entry, TOOL_MAP entries for all Stitch tools, probe/degrade contract |
| **Screen HTML retrieval for pipeline stages** | PDE's critique, iterate, handoff stages need to read Stitch's output | LOW | `get_screen_code` MCP tool; HTML stored in `.planning/design/` alongside existing artifacts |
| **Screen image retrieval for critique** | `/pde:critique` visual comparison requires image, not just HTML | LOW | `get_screen_image` returns base64 PNG; critique skill reads it for visual analysis |
| **Design DNA extraction into handoff** | `/pde:handoff` needs Stitch's color/font/layout data to produce implementation specs | MEDIUM | `extract_design_context` output → handoff skill → component token mapping |
| **Graceful degradation when Stitch unavailable** | MCP probe/degrade contract pattern already established for all 5 existing integrations | LOW | Same `probeConnection()` pattern as Figma, Pencil integrations |
| **Write-back confirmation gates** | PDE policy: every external write requires explicit user consent | LOW | Stitch `generate_screen_from_text` and `create_project` are writes; need confirmation gates (VAL-03 pattern) |
| **Authentication path via API Key** | API Key (`STITCH_API_KEY`) is simpler than ADC; must be the documented path | LOW | Env var; document in Getting Started alongside existing MCP credential patterns |

### Differentiators (What Stitch Enables That Claude HTML/CSS Cannot)

These are the reasons to integrate Stitch. Each maps to a capability gap in the existing pipeline.

| Feature | Value Proposition | Complexity | Pipeline Stage | Notes |
|---------|-------------------|------------|----------------|-------|
| **Multi-direction visual exploration during ideation** | Stitch generates 3-5 visually distinct layout variants from a single prompt; Claude generates one direction. For `/pde:ideate --diverge`, showing 5 visual directions vs 5 text descriptions is qualitatively different. | MEDIUM | `/pde:ideate` | Calls `generate_screen_from_text` N times with divergent prompt variants; stores all screens in one Stitch project; retrieves all screen images for display |
| **"Vibe Design" mode — emotional/feeling-based generation** | Stitch's Vibe Design accepts business objectives or desired user feelings ("calming", "energetic startup", "enterprise trust") and generates matching directions. Claude requires functional specs. This opens PDE to non-designer users who struggle with component-level prompting. | MEDIUM | `/pde:ideate`, `/pde:wireframe` | Prompt engineering: translate PDE brief emotional sections into Stitch vibe prompts; requires brief to have "desired user feeling" field populated |
| **Image-grounded generation from screenshots** | Upload a competitor's screenshot or an existing design; Stitch rebuilds it as an editable structured design. Enables competitive redesign workflows that Claude cannot do reliably. | MEDIUM | `/pde:wireframe` with `--from-image` | Experimental Mode only (50/month vs 350/month credits); image upload path through MCP (if supported — MEDIUM confidence the `generate_screen_from_text` tool also accepts image context) |
| **Voice-described design variants** | Voice Canvas allows speaking design intent; Stitch agents clarify and update live. For PDE's analyst persona interview workflow, voice input lowers the barrier for brief creation. | HIGH | `/pde:ideate`, analyst persona | Requires voice input path through MCP or Stitch web UI; MCP tools are text-only as of research date — voice may only be available through Stitch's browser canvas (LOW confidence MCP exposes voice) |
| **Design DNA extraction for token seeding** | `extract_design_context` returns structured color palette, typography, and layout rules from any Stitch screen. For PDE's design system stage, this provides a starting point for DTCG token generation from visual output rather than from scratch. | MEDIUM | `/pde:system` | Design DNA output → seed OKLCH palette from Stitch colors → DTCG token generation; creates visual-first design system path |
| **Stitch output comparison in critique** | `/pde:critique` can compare Claude-generated vs Stitch-generated versions of the same screen. Side-by-side critique with different rendering engines surfaces visual tradeoffs before committing to one direction. | MEDIUM | `/pde:critique` | `get_screen_image` for Stitch version; existing critique skill receives both images + design brief; multi-perspective critique applied to both |
| **Pattern extraction from Stitch visuals for handoff** | `extract_design_context` Design DNA feeds into `/pde:handoff` alongside existing brief + token data. Stitch-sourced patterns (confirmed visual colors, confirmed typefaces) reduce ambiguity in component specs. | MEDIUM | `/pde:handoff` | Design DNA markdown → handoff skill context; maps Stitch colors to DTCG OKLCH equivalents |
| **Figma-format export path from Stitch** | Stitch exports directly to Figma with Auto Layout and grouped layers. For PDE's Figma integration, this provides a higher-fidelity starting point than the existing wireframe → Figma token export path. | LOW | Figma MCP | Stitch → Figma export is user-initiated in Stitch web UI; MCP does not expose this directly (LOW confidence). The value is in the recommended workflow documentation, not PDE automation. |

### Anti-Features (Avoid These in v0.9)

These seem like natural extensions but create problems for PDE's architecture or constraints.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Replacing Claude HTML/CSS generation entirely** | "Stitch is the primary engine now" implies Claude generation is deprecated | Stitch produces HTML + Tailwind CSS with no motion tokens, no OKLCH custom properties, no APCA contrast, no ARIA, no state transitions. The Awwwards-quality bar requires all of these. Stitch output is a starting point, not a finished artifact. | Keep Claude generation as the quality path; Stitch is the ideation/exploration path. `--use-stitch` flag makes Stitch an alternative, not a replacement. |
| **Automatic Stitch screen sync on every pipeline run** | Convenience: always have latest Stitch designs synced without explicit command | Stitch has 350 free monthly generations. Automatic generation on every pipeline run would exhaust limits rapidly. Each Stitch API call creates a generation credit deduction. | Explicit `--use-stitch` flag or explicit sync command. Users control when Stitch credits are consumed. |
| **Stitch as design system source of truth** | Design DNA output contains colors and typography; seems like it could replace DTCG tokens | Stitch cannot enforce brand guidelines across projects. Each generation starts fresh. Design DNA is a point-in-time extraction, not a maintained token system. DTCG 2025.10 is PDE's established token standard; Stitch colors must be translated to OKLCH DTCG format, not the other way around. | Use Design DNA to seed DTCG tokens, not replace them. Extract → convert to OKLCH → merge into existing token file. |
| **Storing Stitch HTML in `.planning/` long-term** | Stitch HTML is an artifact, should live with other design artifacts | Stitch HTML uses Tailwind CDN classes, not PDE's DTCG custom properties. Stored raw, it diverges from the design system immediately. Using it as-is in implementation creates a parallel styling system. | Treat Stitch HTML as ephemeral reference. Extract Design DNA. Use Claude's implementation path for production-quality component generation with DTCG tokens. |
| **Exposing all 9 Stitch MCP tools to all PDE subagents** | More tools = more capability for agents | PROJECT.md explicitly rules out "MCP tool passthrough to all subagents — destroys 85% context savings from Tool Search." PDE's TOOL_MAP pattern insulates agents from raw MCP tools. | Route Stitch calls through mcp-bridge.cjs TOOL_MAP with canonical names. Agents call PDE canonical names; bridge calls Stitch. Same pattern as all other integrations. |
| **Voice Canvas integration via MCP** | Voice input is a differentiator; PDE's analyst persona could use it | MCP tools for Stitch are text-only as of March 2026. Voice Canvas is a Stitch browser UI feature. Attempting to route voice through MCP would require screen-scraping or unofficial APIs — contrary to PDE's verified-sources-only security policy. | Document Voice Canvas as a user workflow that precedes PDE: user explores in Stitch voice canvas → exports project → PDE retrieves via MCP. Separation of concerns. |
| **Real-time Stitch canvas watching** | "Observe as users iterate in Stitch canvas" for live critique | No webhook or streaming API exists for Stitch canvas events. Polling would require repeated `list_screens` calls. Same architectural impossibility as real-time Figma sync, which is already ruled out in PROJECT.md. | Explicit sync: user triggers `/pde:critique --from-stitch {projectId}` when they want PDE to fetch current state. |

---

## Feature Dependencies

```
[Stitch MCP Server Registration in mcp-bridge.cjs]
    └──required-by──> ALL Stitch features (no MCP = no tool calls)
    └──follows-pattern-of──> [EXISTING: Figma MCP integration]
    └──requires──> assertApproved() entry for stitch.withgoogle.com
    └──requires──> TOOL_MAP entries: list_projects, list_screens, get_screen, get_screen_code,
                   get_screen_image, build_site, generate_screen_from_text,
                   extract_design_context, create_project
    └──requires──> probeConnection() / degradeGracefully() contract
    └──requires──> STITCH_API_KEY in user environment

[--use-stitch flag on /pde:wireframe]
    └──depends-on──> [Stitch MCP Server Registration]
    └──calls──> generate_screen_from_text (write — needs confirmation gate)
    └──calls──> get_screen_code (read)
    └──stores-output-in──> .planning/design/wireframe/ (same as existing path)
    └──conflicts-with──> Claude HTML/CSS generation (mutual exclusion; one path per invocation)

[--use-stitch flag on /pde:mockup]
    └──depends-on──> [Stitch MCP Server Registration]
    └──depends-on──> [--use-stitch flag on /pde:wireframe] (wireframe context feeds mockup prompt)
    └──calls──> generate_screen_from_text with hifi brief
    └──calls──> get_screen_code
    └──stores-output-in──> .planning/design/mockup/

[Visual Divergence during /pde:ideate --diverge via Stitch]
    └──depends-on──> [Stitch MCP Server Registration]
    └──calls──> generate_screen_from_text N times (N = diverge count, default 3)
    └──calls──> get_screen_image for each screen (for display/critique)
    └──requires──> create_project (write — confirmation gate)
    └──enhances──> [EXISTING: /pde:ideate diverge phase] (adds visual artifacts to text concepts)

[Stitch Output Comparison in /pde:critique]
    └──depends-on──> [--use-stitch flag on /pde:wireframe OR /pde:mockup]
    └──calls──> get_screen_image (read — no confirmation gate needed)
    └──feeds-into──> [EXISTING: multi-perspective critique workflow]
    └──enhances──> [EXISTING: /pde:critique] (adds visual comparison capability)

[Design DNA Extraction feeding /pde:handoff]
    └──depends-on──> [Stitch MCP Server Registration]
    └──calls──> extract_design_context (read)
    └──output-feeds-into──> [EXISTING: /pde:handoff component spec generation]
    └──enhances──> [EXISTING: /pde:handoff] (visual-sourced token seeds)
    └──NOTE──> Design DNA colors must be converted to OKLCH DTCG format — raw Stitch hex values
               are not compatible with PDE's DTCG 2025.10 pipeline

[Design DNA Token Seeding for /pde:system]
    └──depends-on──> [Design DNA Extraction]
    └──converts──> hex palette → OKLCH equivalents
    └──merges-into──> [EXISTING: DTCG token file] (additive, non-destructive)
    └──enhances──> [EXISTING: /pde:system] (visual-first design system path)

[Graceful Degradation when Stitch unavailable]
    └──depends-on──> [Stitch MCP Server Registration]
    └──follows-pattern-of──> [EXISTING: Pencil, Figma degradation contracts]
    └──fallback-to──> Claude HTML/CSS generation (existing path)
    └──required-by──> ALL Stitch features (no degradation = hard failure on auth/network issues)

[Write-Back Confirmation Gates for Stitch]
    └──required-by──> generate_screen_from_text (creates Stitch content)
    └──required-by──> create_project (creates Stitch project)
    └──follows-pattern-of──> [EXISTING: VAL-03 confirmation gate pattern]
    └──NOT required by──> read-only tools: get_screen_code, get_screen_image,
                           extract_design_context, list_projects, list_screens
```

### Dependency Notes

- **MCP registration is the critical path:** Every Stitch feature is blocked until `mcp-bridge.cjs` registers Stitch as the 6th approved server. This must be Phase 1 of the milestone.
- **Design DNA requires OKLCH conversion:** Stitch outputs hex colors. PDE's design token pipeline uses OKLCH. A conversion function (similar to `figmaColorToCss` in the existing Figma integration) must be embedded inline — no npm dependencies.
- **Write operations require confirmation gates:** `generate_screen_from_text` and `create_project` modify external state in Google's Stitch platform. These are writes that follow PDE's VAL-03 pattern. Read operations (get, list, extract) do not need confirmation.
- **Stitch HTML is Tailwind CSS, not DTCG custom properties:** PDE must not treat Stitch HTML as a design system artifact. It is reference material for visual pattern extraction, not implementation source.
- **Generation credit budget awareness:** 350 Standard Mode / 50 Experimental Mode per month. PDE workflows that loop (e.g., critique-iterate loops) must not automatically call `generate_screen_from_text` without user confirmation.

---

## MVP Definition (for v0.9 Milestone)

### Launch With (v0.9 core — minimum to satisfy "Stitch as primary engine" claim)

- [ ] **Stitch MCP server registration** — 6th entry in mcp-bridge.cjs APPROVED_SERVERS and TOOL_MAP; `assertApproved()` enforcement; probe/degrade contract; STITCH_API_KEY authentication — *required before any other Stitch feature*
- [ ] **`--use-stitch` on `/pde:wireframe`** — calls `generate_screen_from_text` (with confirmation gate), retrieves HTML via `get_screen_code`, stores in `.planning/design/wireframe/stitch-{screenId}.html`
- [ ] **`--use-stitch` on `/pde:mockup`** — same pattern; richer prompt incorporating brief visual targets and fidelity level; hifi variant
- [ ] **Stitch screen image retrieval for `/pde:critique`** — `get_screen_image` returns base64 PNG; critique skill receives Stitch visual alongside existing HTML artifact for comparison critique
- [ ] **Design DNA extraction for `/pde:handoff`** — `extract_design_context` output fed into handoff skill context; hex-to-OKLCH conversion embedded inline; additive merge into DTCG token file
- [ ] **Graceful degradation on Stitch unavailable** — auth failure or network error falls back to Claude HTML/CSS generation with clear user message; no hard failure

### Add After Validation (v0.9.x — extend once core is working)

- [ ] **Visual divergence during `/pde:ideate --diverge`** — Stitch generates visual variants for each text concept; `get_screen_image` for each; images stored in `.planning/design/ideate/`; add when core `--use-stitch` flag is stable and credit budget behavior is confirmed
- [ ] **Design DNA token seeding for `/pde:system`** — feed Design DNA into design system generation as a starting palette; add once handoff integration confirms the OKLCH conversion function is correct
- [ ] **Wave-aware Stitch generation** — if `/pde:ideate --diverge` runs multiple parallel Stitch calls via agent waves, add wave tracking for Stitch API calls in the event bus

### Future Consideration (v1.0+)

- [ ] **Vibe Design mode** — explicit "vibe" prompt path in wireframe/ideate that translates PDE brief emotional sections into Stitch vibe prompts; defer until core generation paths are validated
- [ ] **Stitch project as persistent design workspace** — maintain one Stitch project per PDE project across sessions; track project ID in DESIGN-STATE.md; adds complexity but enables iterative refinement sessions

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Stitch MCP server registration | HIGH — foundational blocker for all Stitch features | MEDIUM | P1 |
| `--use-stitch` on `/pde:wireframe` | HIGH — core claim of milestone; validates Stitch as rendering engine | MEDIUM | P1 |
| `--use-stitch` on `/pde:mockup` | HIGH — hifi generation is Stitch's strongest capability | MEDIUM | P1 |
| Graceful degradation | HIGH — without fallback, any auth/network issue breaks pipeline | LOW | P1 |
| Write-back confirmation gates | HIGH — PDE policy; confirmed by 315 tests in v0.5 | LOW | P1 |
| Screen image retrieval for critique | MEDIUM — enables visual comparison; straightforward tool call | LOW | P1 |
| Design DNA extraction for handoff | MEDIUM — high value for token seeding; needs OKLCH conversion | MEDIUM | P1 |
| Visual divergence in ideation | HIGH — strongest Stitch differentiator; transforms ideation output | MEDIUM | P2 |
| Design DNA seeding for system stage | MEDIUM — visual-first design system path; add after handoff validated | MEDIUM | P2 |
| Vibe Design prompt mode | MEDIUM — opens tool to non-designers; requires brief field additions | MEDIUM | P3 |
| Persistent Stitch project per PDE project | LOW — adds state management complexity; marginal user value vs fresh project per run | HIGH | P3 |

**Priority key:**
- P1: Must have for v0.9 milestone to close
- P2: Include if implementation permits; strong v0.9.x candidates
- P3: Future milestone consideration

---

## Capability Gap Analysis: Stitch vs Claude HTML/CSS

This is the key question for the downstream roadmap: where does Stitch win, where does Claude win, and where does neither win alone?

| Dimension | Stitch | Claude HTML/CSS | Winner | PDE Strategy |
|-----------|--------|----------------|--------|---------------|
| **Visual exploration breadth** | 3-5 layout variants per prompt | 1 direction per prompt | Stitch | Use Stitch for ideation/diverge phases |
| **Design quality (initial generation)** | HIGH — Gemini 3 trained on vast visual corpus | MEDIUM — requires iteration to reach hifi | Stitch | Use Stitch for initial visual direction |
| **Design system token compliance** | NONE — no DTCG, no OKLCH, no custom properties | HIGH — DTCG 2025.10 + OKLCH + dual dark mode | Claude | Always run Claude refinement after Stitch for production |
| **Motion and interactions** | NONE — static screens only | HIGH — motion tokens, spring physics, state transitions | Claude | Stitch screens are always static; Claude adds motion layer |
| **Accessibility** | NONE — no ARIA, no contrast checking | MEDIUM — APCA contrast enforced; ARIA in templates | Claude | Stitch output always needs accessibility pass |
| **Component API generation** | NONE | HIGH — TypeScript interfaces, component specs | Claude | Handoff always uses Claude; Stitch feeds context only |
| **Non-designer usability** | HIGH — "describe a feeling" works | LOW — requires component-level prompt detail | Stitch | Stitch is the entry point for non-designer users |
| **Image-based generation** | YES (Experimental Mode) | PARTIAL — can describe layouts from images | Stitch | Use Stitch for sketch-to-UI; confirm sketch upload actually works (LOW confidence) |
| **Generation limits** | 350/month Standard, 50/month Experimental | Unlimited (Claude API) | Claude | Stitch is premium; Claude is baseline |
| **Figma export quality** | HIGH — Auto Layout, grouped named layers | MEDIUM — token export only, no screen export | Stitch | Use Stitch Figma path for screen handoff; keep Claude for token sync |
| **Iteration speed** | HIGH — regenerate in seconds | MEDIUM — full HTML regeneration per iteration | Stitch | Stitch for visual iteration; Claude for code refinement |
| **Design token extraction** | PARTIAL — hex colors, fonts, layouts | N/A (generates tokens, doesn't extract) | Neither | Design DNA → OKLCH conversion is the bridge |
| **Voice interaction** | YES (browser only) | NO | Stitch (browser) | Document as pre-PDE workflow; MCP cannot expose this |

**Synthesis:** Stitch is strongest at visual ideation and initial direction-setting. Claude is strongest at quality, compliance, interactivity, and code production. The right architecture is sequential: Stitch generates options → user selects direction → Claude refines to production quality. Neither replaces the other.

---

## Confirmed Limitations (Not Speculation)

These limitations are confirmed across multiple independent sources and affect how PDE can use Stitch:

1. **No design system enforcement** — Stitch cannot maintain consistent brand guidelines across projects or generations. Every generation starts fresh. PDE's DTCG tokens cannot be imported into Stitch to constrain output. (MEDIUM-HIGH confidence; confirmed in multiple reviews)

2. **Static screens only** — No animations, no micro-interactions, no state transitions in generated output. (HIGH confidence; confirmed across all reviews)

3. **No semantic HTML structure** — Generated HTML does not follow component naming conventions, semantic element choices, or accessibility patterns. (HIGH confidence; multiple sources)

4. **Tailwind CDN classes, not DTCG custom properties** — Stitch uses Tailwind's utility classes. PDE's design system uses DTCG OKLCH custom properties. These are architecturally incompatible as drop-in replacements. (HIGH confidence; confirmed from output samples)

5. **350/month generation limit** — Standard Mode caps at 350 generations. Experimental Mode (image input) caps at 50. Iterative pipeline runs will exhaust credits. (HIGH confidence; official pricing page)

6. **Single-user tool** — No real-time multiplayer. No team collaboration. For PDE's single-user Claude Code plugin model, this is fine — but relevant for team workflows. (HIGH confidence)

7. **Sketch upload reliability questionable** — Documented capability; one credible review found it falls back to text prompts when sketch is uploaded. (LOW confidence on the capability actually working; MEDIUM confidence on the limitation existing)

8. **Voice Canvas is browser-only** — Voice Canvas is a Stitch web UI feature. MCP tools as of March 2026 do not expose voice input. Confirmed by inspecting `@_davideast/stitch-mcp` tool definitions, which are all text-based. (MEDIUM confidence)

9. **Google Cloud project required** — Authentication requires either a STITCH_API_KEY (simpler) or Google Cloud ADC with billing enabled. The API Key path is straightforward but adds a setup step for PDE users. (HIGH confidence)

10. **`davideast/stitch-mcp` is community-maintained, not official Google** — The npm package is labeled "NOT affiliated with, endorsed by, or sponsored by Google LLC." API compatibility or availability could change without notice. (HIGH confidence on the disclaimer; implications for PDE's verified-sources-only policy need architectural decision)

---

## Critical Architecture Decision: Official vs Community MCP

PDE's `mcp-bridge.cjs` enforces a verified-sources-only security policy: "Only official MCP servers from approved vendors." This creates a conflict:

- **Official Stitch MCP server** (`stitch.withgoogle.com/docs/mcp/setup`): Exists and is documented by Google. The docs page requires authentication to read, but the MCP setup URL is official. However, the npm package `@_davideast/stitch-mcp` explicitly disclaims Google affiliation.
- **Community packages**: `davideast/stitch-mcp` and `Kargatharaakash/stitch-mcp` are community implementations.

**Resolution needed in milestone planning:** Confirm whether Google's official Stitch MCP server (if it exists at stitch.withgoogle.com) satisfies PDE's verified-sources-only policy. If the official docs page at `stitch.withgoogle.com/docs/mcp/setup` describes an official server configuration (not the davideast community package), that is the approved path. If Google's "MCP server" is actually the davideast community package, a policy exception or policy clarification is needed.

---

## Sources

- **Google Developers Blog — "From idea to app: Introducing Stitch, a new way to design UIs"** (HIGH confidence): `https://developers.googleblog.com/stitch-a-new-way-to-design-uis/` — official announcement; input formats, output formats, Figma integration, Gemini 2.5 Pro foundation
- **Google blog — "Design UI using AI with Stitch from Google Labs"** (HIGH confidence): `https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/` — official; March 2026 Voice Canvas, Vibe Design, canvas, SDK, MCP server announcement
- **Stitch official docs — MCP setup** (MEDIUM confidence — page rendered JS, content not extractable): `https://stitch.withgoogle.com/docs/mcp/setup` — official MCP setup page; confirmed exists; content gated behind auth
- **davideast/stitch-mcp on GitHub** (HIGH confidence for tool definitions): `https://github.com/davideast/stitch-mcp` — 9 tool definitions confirmed; `build_site`, `get_screen_code`, `get_screen_image` higher-level tools; authentication methods; known limitations documented inline
- **Kargatharaakash/stitch-mcp on GitHub** (MEDIUM confidence — cross-validation): `https://github.com/Kargatharaakash/stitch-mcp` — Design DNA extraction feature; 9 overlapping tool definitions; confirms MCP tool landscape
- **Google Codelabs — "Design-to-Code with Antigravity and Stitch MCP"** (HIGH confidence — official Google codelab): `https://codelabs.developers.google.com/design-to-code-with-antigravity-stitch?hl=en` — confirmed 4-phase workflow; Design DNA extraction → React/Tailwind scaffolding; input/output chain
- **index.dev — "Google Stitch Review 2026"** (MEDIUM confidence — independent review): `https://www.index.dev/blog/google-stitch-ai-review-for-ui-designers` — cinema app walkthrough; confirmed no animations; form submit non-functional; lacks component naming by default
- **nxcode.io — "Google Stitch Complete Guide: Vibe Design, Voice Canvas & Free AI UI Tool (2026)"** (MEDIUM confidence): `https://www.nxcode.io/resources/news/google-stitch-complete-guide-vibe-design-2026` — Vibe Design details; Voice Canvas; infinite canvas; Design Agent; 350/50 generation limits; output format details
- **nxcode.io — "Google Stitch vs Figma 2026"** (MEDIUM confidence): `https://www.nxcode.io/resources/news/google-stitch-vs-figma-ai-design-comparison-2026` — Figma advantages (design systems, multiplayer, dev mode); Stitch advantages (speed, code output, voice); recommended hybrid workflow
- **nxcode.io — "Google Stitch vs v0 vs Lovable 2026"** (MEDIUM confidence): `https://www.nxcode.io/resources/news/google-stitch-vs-v0-vs-lovable-ai-app-builder-2026` — confirmed "no interactivity, no state management, no click handlers"; "Stitch gives best design, v0 gives best code, Lovable gives most complete product"
- **winbuzzer.com — "Google Revamps Stitch AI with Voice, Canvas, Dev Tools"** (MEDIUM confidence — news coverage): `https://winbuzzer.com/2026/03/20/google-redesigns-stitch-ai-voice-canvas-developer-integrations-xcxwbn/` — March 2026 update; SDK; MCP server; Figma stock drop context
- **PDE PROJECT.md** (HIGH confidence — authoritative): existing architecture, constraints, zero-npm policy, verified-sources-only, mcp-bridge.cjs patterns, MCP integration model

---

*Feature research for: PDE v0.9 — Google Stitch Integration as Primary Visual Design Engine*
*Researched: 2026-03-20*
