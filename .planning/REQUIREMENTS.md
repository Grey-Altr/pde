# Requirements: Platform Development Engine

**Defined:** 2026-03-23
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.14 Requirements

Requirements for v0.14 Visual AutoResearch. Each maps to roadmap phases.

### Playwright Infrastructure (PLAY)

- [x] **PLAY-01**: Playwright registered as 7th APPROVED_SERVER in mcp-bridge.cjs with stdio transport and headless mode
- [x] **PLAY-02**: ~10 TOOL_MAP entries for canonical Playwright tool names (VERIFY_REQUIRED markers)
- [x] **PLAY-03**: AUTH_INSTRUCTIONS entry with `claude mcp add playwright` install command including `--headless` and `--allow-unrestricted-file-access` flags
- [x] **PLAY-04**: Live tool name verification confirms mcp__playwright__* prefix matches actual registered names
- [x] **PLAY-05**: Probe/degrade contract — graceful fallback when Playwright MCP not installed
- [ ] **PLAY-06**: mcp-integration.md updated with Playwright enhancement recipe and 7-server probe/degrade table
- [x] **PLAY-07**: `--allow-unrestricted-file-access` flag documented for file:// wireframe/mockup access

### Wireframe Screenshots (WFR)

- [x] **WFR-01**: wireframe.md Step 5d wired to capture screenshots of each wireframe HTML via Playwright MCP
- [x] **WFR-02**: Screenshots saved to `.planning/design/ux/wireframes/screenshots/`
- [x] **WFR-03**: Multi-page wireframes handled (index.html + screen-*.html each screenshotted)
- [x] **WFR-04**: `--no-playwright` flag preserves existing degradation path (no screenshots, no error)
- [x] **WFR-05**: Viewport configured for consistent wireframe dimensions (1280x800 default)

### Mockup Screenshots (MOK)

- [x] **MOK-01**: mockup.md captures screenshots of generated mockup HTML files via Playwright MCP
- [x] **MOK-02**: Screenshots saved to `.planning/design/ux/mockups/screenshots/`
- [x] **MOK-03**: `--no-playwright` degradation path (mockup workflow completes without screenshots)

### Critique A11y Integration (A11Y)

- [x] **A11Y-01**: critique.md accessibility perspective uses browser_snapshot for AOM tree when Playwright available
- [x] **A11Y-02**: AOM tree analyzed for missing landmarks, unlabeled controls, heading hierarchy issues
- [x] **A11Y-03**: Browser a11y data merges with Axe MCP results when both available
- [x] **A11Y-04**: Falls back to manual WCAG checklist when neither Playwright nor Axe available

### Deploy Smoke Test (DEP)

- [x] **DEP-01**: deploy.md adds post-deploy smoke test after Gate 4/4 success
- [x] **DEP-02**: Navigates to $DEPLOY_URL, captures screenshot and accessibility snapshot
- [x] **DEP-03**: Verifies expected sections present (hero, pricing, CTA from LDP spec)
- [x] **DEP-04**: Retry with exponential backoff (3 attempts, 10s/20s/40s) for builds still in progress
- [x] **DEP-05**: Pass/fail results logged to deploy-manifest.json with screenshot path

### Visual Metric Scripts (VIS)

- [x] **VIS-01**: DOM structure metric script — counts semantic elements (nav, main, article, section, header, footer), penalizes div-soup, follows _evalMetric contract (exit 0, stdout = numeric score)
- [x] **VIS-02**: A11y violations metric script — runs browser_snapshot AOM tree through rule checks (missing alt, unlabeled inputs, heading skip, missing landmarks), score = inverse violation count
- [x] **VIS-03**: WCAG contrast metric script — evaluates text/background contrast ratios via browser_evaluate, score based on AA pass rate
- [x] **VIS-04**: Responsive compliance metric script — screenshots at 3 breakpoints (mobile 375px, tablet 768px, desktop 1280px), measures layout shift/overflow/element visibility
- [x] **VIS-05**: Mermaid readability metric script — validates Mermaid syntax renders without error, measures node count, edge count, diagram dimensions
- [x] **VIS-06**: All 5 metric scripts follow _evalMetric contract (exit 0 always, stdout = numeric score, timeout-safe)
- [x] **VIS-07**: All metrics return 0 (not crash) when Playwright MCP is unavailable — graceful degradation

### Experiment Templates (EXP)

- [x] **EXP-01**: experiment.md templates for wireframe skill optimization (mutate wireframe.md prose → measure DOM structure + a11y + contrast)
- [x] **EXP-02**: experiment.md templates for mockup skill optimization (mutate mockup.md prose → measure visual quality metrics)
- [x] **EXP-03**: experiment.md templates for critique skill optimization (mutate critique.md → measure finding quality against known-defective wireframes)
- [x] **EXP-04**: experiment.md templates for system skill optimization (mutate system.md → measure token WCAG contrast compliance in rendered output)
- [x] **EXP-05**: experiment.md templates for brief skill optimization (mutate brief.md → measure downstream wireframe quality as proxy metric)
- [x] **EXP-06**: experiment.md templates for flows skill optimization (mutate flows.md → measure Mermaid readability + diagram completeness)
- [x] **EXP-07**: experiment.md templates for iterate skill optimization (mutate iterate.md → measure before/after visual delta improvement)
- [x] **EXP-08**: experiment.md templates for hig skill optimization (mutate hig.md → measure a11y finding detection rate)
- [x] **EXP-09**: experiment.md templates for handoff skill optimization (mutate handoff.md → measure TypeScript interface completeness vs rendered component count)
- [x] **EXP-10**: experiment.md templates for recommend/competitive/opportunity/ideate skills (text-metric experiments using existing Nyquist, no browser required)
- [x] **EXP-11**: Each template specifies mutable_files, verify_command, target_metric, search_space, iteration_budget per experiment-schema.cjs contract
- [x] **EXP-12**: All 14 eligible design skills have at least one experiment template

### Cross-Skill Pipeline Experiments (PIPE)

- [x] **PIPE-01**: Pipeline experiment measures upstream prose change impact on downstream visual output (e.g., brief.md change → wireframe visual delta)
- [x] **PIPE-02**: Pipeline experiment runs full skill chain (brief → system → wireframe) with browser metrics at terminal stage
- [x] **PIPE-03**: Pipeline experiment isolates which upstream skill change produced the largest downstream improvement
- [x] **PIPE-04**: Pipeline experiment templates define multi-stage verify commands chaining skill invocations

### Iterate Effectiveness (ITER)

- [x] **ITER-01**: Before/after screenshot capture around /pde:iterate invocations
- [x] **ITER-02**: Visual delta measurement between pre-iterate and post-iterate wireframes
- [x] **ITER-03**: Iterate experiment template mutates iterate.md prose → measures improvement magnitude per iteration cycle
- [x] **ITER-04**: Iterate effectiveness metric tracks convergence speed (iterations-to-stable)

### Visual Regression Circuit Breaker (VRCB)

- [x] **VRCB-01**: Visual regression circuit breaker prevents cosmetic regressions during optimization
- [x] **VRCB-02**: Before each experiment iteration, baseline screenshots captured
- [x] **VRCB-03**: After mutation, screenshots compared — if visual regression detected, mutation is rejected (git reset)
- [x] **VRCB-04**: Regression threshold configurable in experiment.md (default: any new a11y violation = regression)
- [x] **VRCB-05**: Integrates with existing circuit breaker infrastructure (consecutive_failure_limit, no_progress_limit)

### Multi-Candidate Experiments (MULTI)

- [ ] **MULTI-01**: Multi-candidate experiment mode generates N variants per iteration (A/B testing)
- [ ] **MULTI-02**: Each candidate evaluated independently against same metric
- [ ] **MULTI-03**: Best candidate selected and promoted (git commit), others discarded
- [ ] **MULTI-04**: Candidate count configurable in experiment.md (default: 3)
- [ ] **MULTI-05**: Multi-candidate mode integrates with existing orchestrator loop (Phase 103 infrastructure)

### Pressure Test Visual Dimension (PRES)

- [ ] **PRES-01**: Pressure test gains visual quality dimension alongside existing Awwwards text rubric
- [ ] **PRES-02**: Browser renders pressure test output artifacts and scores DOM structure, a11y, contrast
- [ ] **PRES-03**: Combined score formula weights text rubric (existing) + visual metrics (new)
- [ ] **PRES-04**: Visual dimension degrades gracefully when Playwright unavailable (text-only scoring)

### Meta-Optimization (META)

- [ ] **META-01**: Experiment runner self-calibrates mutation strategies based on historical improvement data
- [ ] **META-02**: Mutation strategy effectiveness tracked across experiment runs (which strategies produce improvements)
- [ ] **META-03**: Meta-optimization reads experiment JSONL history to derive strategy weights
- [ ] **META-04**: Strategy weights influence mutation agent's approach selection in subsequent experiments

### Ideation Visual Scoring (IDT)

- [ ] **IDT-01**: Ideation divergence scored by measuring screenshot variance across generated concepts
- [ ] **IDT-02**: Visual similarity metric compares screenshots pairwise (structural hash or pixel-level)
- [ ] **IDT-03**: Higher visual diversity = higher ideation quality score
- [ ] **IDT-04**: Ideation visual scoring degrades gracefully (text-only diversity when Playwright unavailable)

### Brief Reference Capture (BREF)

- [ ] **BREF-01**: Brief workflow can capture live product screenshots as reference material
- [ ] **BREF-02**: User provides URL → Playwright navigates, screenshots, saves to `.planning/design/references/`
- [ ] **BREF-03**: Reference screenshots available to downstream skills (wireframe, mockup, critique)
- [ ] **BREF-04**: Reference capture is opt-in (not automatic — requires user-provided URLs)

### Integration & Nyquist (INTG)

- [ ] **INTG-01**: Nyquist structural regression tests for all new v0.14 requirements
- [ ] **INTG-02**: No regressions across existing v0.13 Nyquist test suite (1216 assertions)

## Future Requirements

### PDE-as-MCP-Server (deferred from v0.14)

- **SRV-01**: Read-only MCP server exposing planning state via JSON-RPC over stdio
- **SRV-02**: Tools for project info, roadmap, state, requirements, design artifacts
- **SRV-03**: Registered in .mcp.json for auto-discovery

### W3C WebMCP Adapter (deferred from v0.14)

- **WEB-01**: navigator.modelContext adapter registering PDE tools for browser-based AI consumers
- **WEB-02**: Minimal localhost frontend displaying PDE state
- **WEB-03**: WebMCP consumer mode via Playwright + Chrome flag

## Out of Scope

| Feature | Reason |
|---------|--------|
| PDE-as-MCP-server | Moved to future milestone — focus v0.14 on visual metrics exploitation |
| W3C WebMCP adapter | Spec unstable (Chrome Canary only), deferred until spec stabilizes |
| Pixel-perfect image comparison | Requires npm deps (pixelmatch/resemblejs) — violates zero-dep constraint |
| Persistent browser sessions | Security risk, scope creep — ephemeral sessions sufficient for all use cases |
| Headed browser in autonomous mode | Focus-stealing, zombie processes — always headless for autonomous execution |
| Cookie/session persistence in .planning/ | Security risk — browser state is ephemeral |
| Full web scraping capabilities | Scope creep — Playwright only for PDE artifacts + deploy verification + reference capture |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAY-01 | Phase 108 | Complete |
| PLAY-02 | Phase 108 | Complete |
| PLAY-03 | Phase 108 | Complete |
| PLAY-04 | Phase 108 | Complete |
| PLAY-05 | Phase 108 | Complete |
| PLAY-06 | Phase 108 | Pending |
| PLAY-07 | Phase 108 | Complete |
| WFR-01 | Phase 109 | Complete |
| WFR-02 | Phase 109 | Complete |
| WFR-03 | Phase 109 | Complete |
| WFR-04 | Phase 109 | Complete |
| WFR-05 | Phase 109 | Complete |
| MOK-01 | Phase 109 | Complete |
| MOK-02 | Phase 109 | Complete |
| MOK-03 | Phase 109 | Complete |
| A11Y-01 | Phase 110 | Complete |
| A11Y-02 | Phase 110 | Complete |
| A11Y-03 | Phase 110 | Complete |
| A11Y-04 | Phase 110 | Complete |
| DEP-01 | Phase 110 | Complete |
| DEP-02 | Phase 110 | Complete |
| DEP-03 | Phase 110 | Complete |
| DEP-04 | Phase 110 | Complete |
| DEP-05 | Phase 110 | Complete |
| VIS-01 | Phase 111 | Complete |
| VIS-02 | Phase 111 | Complete |
| VIS-03 | Phase 111 | Complete |
| VIS-04 | Phase 111 | Complete |
| VIS-05 | Phase 111 | Complete |
| VIS-06 | Phase 111 | Complete |
| VIS-07 | Phase 111 | Complete |
| EXP-01 | Phase 112 | Complete |
| EXP-02 | Phase 112 | Complete |
| EXP-03 | Phase 112 | Complete |
| EXP-04 | Phase 112 | Complete |
| EXP-05 | Phase 112 | Complete |
| EXP-06 | Phase 112 | Complete |
| EXP-07 | Phase 112 | Complete |
| EXP-08 | Phase 112 | Complete |
| EXP-09 | Phase 112 | Complete |
| EXP-10 | Phase 112 | Complete |
| EXP-11 | Phase 112 | Complete |
| EXP-12 | Phase 112 | Complete |
| PIPE-01 | Phase 113 | Complete |
| PIPE-02 | Phase 113 | Complete |
| PIPE-03 | Phase 113 | Complete |
| PIPE-04 | Phase 113 | Complete |
| ITER-01 | Phase 113 | Complete |
| ITER-02 | Phase 113 | Complete |
| ITER-03 | Phase 113 | Complete |
| ITER-04 | Phase 113 | Complete |
| VRCB-01 | Phase 114 | Complete |
| VRCB-02 | Phase 114 | Complete |
| VRCB-03 | Phase 114 | Complete |
| VRCB-04 | Phase 114 | Complete |
| VRCB-05 | Phase 114 | Complete |
| MULTI-01 | Phase 115 | Pending |
| MULTI-02 | Phase 115 | Pending |
| MULTI-03 | Phase 115 | Pending |
| MULTI-04 | Phase 115 | Pending |
| MULTI-05 | Phase 115 | Pending |
| PRES-01 | Phase 116 | Pending |
| PRES-02 | Phase 116 | Pending |
| PRES-03 | Phase 116 | Pending |
| PRES-04 | Phase 116 | Pending |
| META-01 | Phase 116 | Pending |
| META-02 | Phase 116 | Pending |
| META-03 | Phase 116 | Pending |
| META-04 | Phase 116 | Pending |
| IDT-01 | Phase 116 | Pending |
| IDT-02 | Phase 116 | Pending |
| IDT-03 | Phase 116 | Pending |
| IDT-04 | Phase 116 | Pending |
| BREF-01 | Phase 116 | Pending |
| BREF-02 | Phase 116 | Pending |
| BREF-03 | Phase 116 | Pending |
| BREF-04 | Phase 116 | Pending |
| INTG-01 | Phase 117 | Pending |
| INTG-02 | Phase 117 | Pending |

**Coverage:**
- v0.14 requirements: 76 total
- Mapped to phases: 76
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after initial definition*
