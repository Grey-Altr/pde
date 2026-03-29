# Feature Research

**Domain:** Stakeholder Presentation & Portfolio Synthesis Engine — PDE synthesis milestone
**Researched:** 2026-03-29
**Confidence:** MEDIUM (ecosystem patterns verified via web search; no single authoritative spec source for this domain)

---

## Context: What Already Exists in PDE

The synthesis engine reads existing PDE artifacts — it does not generate them. All of the following are already built:

| Already Shipped | Where It Lives | Relevance to Synthesis |
|----------------|---------------|----------------------|
| PROJECT.md — vision, goals, requirements | `.planning/PROJECT.md` | Core input: project identity |
| ROADMAP.md — phase breakdown | `.planning/ROADMAP.md` | Phase timeline source |
| Phase plans — task details, ACs | `.planning/phases/` | Task completion evidence |
| VERIFICATION.md — test results, goal achievement | `.planning/phases/*/VERIFICATION.md` | Proof of work |
| Design artifacts — wireframes, flows, mockups | `.planning/design/` | Visual evidence |
| Git history integration | PDE git tooling | Commit velocity, contributor data |
| NDJSON event bus + session archival | `.planning/events/` | Phase timing, cost metering |
| Token/cost metering per session | Event bus extensions field | Budget narrative |
| Research validation with claim extraction | v0.7 research-validation agent | Credibility layer |
| tmux dashboard with 7 panes | `/pde:monitor` | Live status source |
| Context sync (AGENTS.md, .mdc, GEMINI.md, SKILL.md) | v0.15 context-sync | Editor file sources |
| Idle-time suggestion engine | v0.10 suggestion catalog | Opportunity surface |
| All 5 product types (software/hardware/hybrid/experience/business) | v0.11–v0.12 | Type-conditional output |

**Implication:** The synthesis engine is a reader + narrator, not a generator. It transforms structured artifacts into audience-appropriate communication documents. No new data collection infrastructure is needed.

---

## Persona Types: Logic Sharing Analysis

The 10 output personas break into two clusters with heavy shared logic:

### Cluster A: Internal / Forward-Looking (Status-Oriented)

| Persona | Audience | Timing | Primary Arc |
|---------|----------|--------|-------------|
| Executive Summary | C-suite, founders | During project | Problem → Progress → Blockers → Timeline confidence |
| Investor Update | Angels, VCs, board | During project | Milestone velocity → Technical moat → Market positioning |
| Sprint Review Deck | Team, PM, stakeholders | End of sprint | What shipped → Demos → What's next |
| Client Deliverable Report | External client | Sprint or milestone | Feature specs → ACs met → Screenshots |
| Stakeholder Status Update | Mixed internal | Weekly/biweekly | RAG status → Decisions needed → Risks |

**Shared logic in Cluster A:** Phase completion % calculation, blocker extraction, timeline confidence scoring, next-phase preview, cost/budget narrative from token metering.

### Cluster B: External / Retrospective (Proof-Oriented)

| Persona | Audience | Timing | Primary Arc |
|---------|----------|--------|-------------|
| Case Study / Portfolio Piece | Prospects, community, hiring managers | Post-completion | Problem → Approach → Outcome → Lessons |
| Technical Post-Mortem | Engineering community | Post-completion | What broke → Root cause → Prevention |
| Architecture Decision Record (ADR) Summary | New team members, future engineers | Evergreen | Context → Options → Decision → Consequences |
| Portfolio Overview | Recruiters, investors | Evergreen | Cross-project pattern → Skills demonstrated |
| Launch Announcement | Public / press | At launch | What it is → Who it's for → How to start |

**Shared logic in Cluster B:** Retrospective framing, outcome measurement (actual vs planned), lessons synthesis, artifact linking (screenshots, design files), before/after narrative.

### Cross-Cluster Shared Logic (~70%)

Both clusters share: artifact inventory scan, design artifact embedding, Git commit stats, phase summary extraction, cost/timeline extraction from event bus, PDE product-type detection.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist for the synthesis engine to feel useful at all. Missing these = the output is a toy.

| Feature | Why Expected | Complexity | PDE Artifact Source | Notes |
|---------|--------------|------------|--------------------|----|
| Per-persona document generation | Each persona has different information needs | MEDIUM | PROJECT.md + ROADMAP.md + phase plans | Core command: `/pde:present [persona]` |
| Dual HTML + Markdown output | HTML for sharing/presentation, Markdown for editing/version control | LOW | All text outputs | HTML rendered from Markdown; not a separate generation step |
| Phase completion status summary | Every stakeholder report needs progress at a glance | LOW | VERIFICATION.md + phase plans | Count tasks completed vs planned |
| Key metrics extraction | Dates, cost, task counts — the numbers that matter | LOW | Event bus sessions + phase plans | Token metering already captures cost |
| Design artifact embedding | Wireframes and mockups are worth more than prose descriptions | MEDIUM | `.planning/design/` files | Reference screenshots already captured via Playwright |
| Git commit velocity summary | Proves engineering cadence, not just claims | LOW | Git history (already integrated) | Commits per phase, contributors |
| Blocker and risk callouts | Stakeholders need to know what's at risk | MEDIUM | Phase plans, RECONCILIATION.md files | Unresolved tasks + overdue phases |
| Output file persistence | Reports must be saved, not ephemeral | LOW | `.planning/presentations/` directory | Filename includes persona + date |
| Regeneration / refresh | Project state changes; reports must stay current | LOW | Re-run command, overwrite with timestamp | Not streaming — snapshot semantics |
| Table of contents / navigation | Long reports need navigation, especially HTML | LOW | Auto-generated from section headers | Anchor links in HTML |

### Differentiators (Competitive Advantage)

What makes PDE's synthesis engine meaningfully better than Notion AI summaries, Jira release notes, or Linear updates.

| Feature | Value Proposition | Complexity | PDE Advantage | Notes |
|---------|-------------------|------------|---------------|-------|
| Persona-driven narrative arc | Same data, fundamentally different story structure per audience | HIGH | No existing tool does problem→approach→outcome arc from structured dev artifacts | Two arc templates: forward-looking (status) and retrospective (proof) |
| Design artifact integration | Wireframes and mockups embedded as evidence, not just linked | MEDIUM | PDE already owns `.planning/design/` | GitHub Insights, Linear, Jira have no design artifact awareness |
| Research validation sourcing | Claims are backed by verified research, not just asserted | MEDIUM | v0.7 research-validation agent provides three-tier claim classification | Unique to PDE — no competitor has this |
| Cost transparency narrative | "We built X for $Y in token costs" is a genuine differentiator | LOW | Event bus + token metering already exists | Novel in this domain — no tool reports LLM cost per deliverable |
| Cross-project portfolio synthesis | Single command generates portfolio-level case study from multiple `.planning/` directories | HIGH | Multi-project reading + pattern synthesis across projects | Requires scanning sibling directories; most tools are per-project only |
| Product-type-aware framing | Experience products get venue/production narrative; business products get GTM/revenue narrative | MEDIUM | PDE product type detection already exists | No competitor has domain-specific stakeholder framing |
| Auto-generation on phase completion | Reports triggered by phase verification gate passing, not manual request | MEDIUM | Claude Code hooks infrastructure already exists (v0.10) | Notion AI requires manual trigger; Linear updates are manually written |
| Acceptance-criteria proof table | "Here are the ACs we committed to; here's the verification result" | LOW | AC-first planning (v0.6) + VERIFICATION.md already produces this data | Unique to PDE's methodology — most tools don't have AC→verification traceability |
| Timeline confidence scoring | "We're 73% through planned phases; estimated completion based on velocity" | MEDIUM | Phase event timestamps + task completion rates | Derived from existing event data; no new instrumentation needed |

### Anti-Features (Commonly Requested, Often Problematic)

Scope traps to explicitly avoid in this milestone.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Interactive slide deck editor | "Make it look like Pitch or Google Slides" | Requires a full UI framework, drag-and-drop, layout engine — months of work orthogonal to PDE's value | Ship HTML with clean CSS; Markdown can be imported into any slide tool |
| Real-time collaborative editing | "Multiple people should edit the report" | Requires auth, presence, CRDT, websockets — none of which PDE has | Markdown output is editable in any editor; HTML is a shareable artifact |
| PDF export with pixel-perfect layout | "I need to attach this to an email" | Headless PDF generation (Puppeteer/wkhtmltopdf) has endless CSS quirks and viewport issues | Deliver HTML; browser print-to-PDF is sufficient for stakeholder use |
| AI-generated charts from raw data | "Auto-generate Gantt charts and pie charts" | Chart generation from unstructured data is unreliable and produces misleading visuals | Use Mermaid for structural charts (already used in PDE); link to existing design artifacts for visuals |
| Email delivery / Slack posting | "Send the report to the team automatically" | Outbound email/Slack requires auth, delivery confirmation, formatting per platform — separate project | Output the file; user pastes or attaches. Integrate in a later milestone. |
| NPS / stakeholder feedback collection | "Include a way for stakeholders to respond" | Requires a web service, form handling, response storage | Not a document feature; build separately if needed |
| Version control for reports | "Show me what changed between last week's report and this week's" | Diff-ing generated prose is unreliable — context changes, sentences shift | Reports are snapshots with date-stamped filenames; diff the source artifacts instead |
| Full narrative prose for every section | "Write me a complete 2000-word case study automatically" | LLM-generated long-form prose requires heavy prompt engineering and produces inconsistent quality | Use structured templates with prose fills for key sections; keep data tables for factual content |
| Burndown chart image generation | "I want a burndown chart image embedded in the report" | Image generation from data requires a charting library with browser rendering or canvas — significant dependency | Use Mermaid gantt or xychart syntax; renders in markdown, embeds cleanly in HTML |

---

## Feature Dependencies

```
[Phase completion % calculation]
    └──requires──> [VERIFICATION.md exists per phase]
                       └──requires──> [AC-first planning — already shipped v0.6]

[Design artifact embedding]
    └──requires──> [Playwright screenshot capture — already shipped v0.14]

[Cost transparency narrative]
    └──requires──> [Event bus token metering — already shipped v0.8]

[Timeline confidence scoring]
    └──requires──> [Phase event timestamps — already shipped v0.8]
    └──requires──> [Phase completion % calculation]

[Cross-project portfolio synthesis]
    └──requires──> [Single-project synthesis working] (must come first)
    └──requires──> [Multi-directory artifact scan]

[Auto-generation on phase completion]
    └──requires──> [Claude Code hooks infrastructure — already shipped v0.10]
    └──requires──> [Single-project synthesis working]

[Product-type-aware framing]
    └──requires──> [Product type detection — already shipped v0.11–v0.12]

[Research validation sourcing]
    └──requires──> [Research validation agent — already shipped v0.7]
    └──enhances──> [Case study / portfolio piece persona]

[Dual HTML + Markdown output]
    └──requires──> [Markdown generation] (Markdown is primary; HTML derived)
```

### Dependency Notes

- **All persona output requires phase completion % calculation:** This is the shared kernel. Build it first.
- **Cross-project portfolio synthesis requires single-project synthesis:** Do not build portfolio synthesis in the same phase as core synthesis — too much risk.
- **Auto-generation requires synthesis to be stable:** Hook-triggered generation on flaky synthesis creates noise. Gate auto-generation behind validated synthesis output.
- **HTML output is derived from Markdown:** Generate Markdown first, convert to HTML with a templating pass. Do not maintain two separate generation paths.
- **Product-type-aware framing enhances all personas:** It is a conditional enrichment layer, not a separate pipeline. Apply it after base persona template is rendered.

---

## Persona Complexity and "Good Enough" vs Gold-Plated

The key question for scoping: what does "good enough" look like per persona before gold-plating it?

| Persona | Good Enough (v1) | Gold-Plated (v2+) | Shared Logic % |
|---------|-----------------|-------------------|---------------|
| Executive Summary | 1-page: status RAG, key metrics, top 3 blockers, timeline confidence | Trend lines, risk heat map, board-ready formatting | 80% shared |
| Sprint Review Deck | What shipped (task list + ACs), what's next (next phase preview) | Demo screenshots embedded, animated progress bars | 75% shared |
| Client Deliverable Report | Feature list with AC verification status, design artifacts linked | Annotated screenshots, change log per sprint | 70% shared |
| Investor Update | Milestone velocity, technical moat paragraph, cost efficiency | Comparable metrics to competitors, traction graphs | 65% shared |
| Stakeholder Status Update | RAG status, decisions needed, risks table | Trend analysis, historical comparison | 85% shared |
| Case Study | Problem → approach → outcome → lessons, key artifacts embedded | SEO-optimized HTML, metrics graphs, social share card | 60% shared |
| Technical Post-Mortem | What broke, root cause, prevention — extracted from RECONCILIATION.md | Timeline replay, impact analysis | 55% shared |
| ADR Summary | Design decisions from brief + design artifacts, rationale | Links to rejected alternatives, consequence tracking | 50% shared |
| Portfolio Overview | Project list with product type, key metrics, tech stack | Visual timeline, skill frequency analysis | 40% shared (cross-project) |
| Launch Announcement | What it is, who it's for, key features, how to start | Press kit, media assets, embargoed preview | 45% shared |

**Implication for phase ordering:** Build Executive Summary + Sprint Review + Client Deliverable Report in Phase 1 (they share 75–85% of logic). Build Case Study + Post-Mortem in Phase 2 (retrospective arc differs). Portfolio Overview and Launch Announcement in Phase 3 (distinct inputs: cross-project scan and launch artifact set).

---

## Competitor Feature Analysis: What Works and What Doesn't

### Notion AI

**What works:** Autonomous multi-step agent can synthesize across hundreds of pages simultaneously. Research Mode generates detailed reports with minimal input. Meeting summaries are genuinely useful. Consistent tone and structure.

**What works poorly:** Requires manual trigger — no lifecycle awareness (doesn't know a phase just completed). No structured artifact awareness — it reads prose, not structured verification tables. No persona differentiation — same output structure regardless of audience. No cost transparency. No design artifact integration.

**PDE advantage:** Lifecycle-aware (hooks trigger on phase completion), structured artifact awareness (reads VERIFICATION.md tables, not prose), persona differentiation is the core design.

### Linear Project Updates

**What works:** Initiative updates with cross-project health monitoring. Slack cross-posting with bidirectional sync. Cycle (sprint) tracking with automated rollover. Changelog-style release notes.

**What works poorly:** Report depth is shallow for enterprise use. Analytics lack granular performance metrics. No AI narration — updates are written by humans. Single hierarchy limits cross-team portfolio views. No design artifact awareness.

**PDE advantage:** AI-narrated updates with structured data backing. Design artifact embedding. Cross-project portfolio synthesis with no hierarchy constraints.

### GitHub Project Insights

**What works:** Burnup chart for overall project progress. Custom fields for advanced chart creation (via third-party tools like Screenful). Milestone-based velocity via Zenhub integration.

**What works poorly:** No native burndown chart (highly requested, still missing as of 2025). Insights charts are considered "almost useless" by power users. Requires third-party plugins for standard agile metrics. No narrative generation — only raw charts.

**PDE advantage:** Mermaid-based charts embedded in narrative context (not just raw data). Git commit velocity as proof of engineering cadence, not just issue closure rates.

### Jira / ARNR

**What works:** AI-powered release notes generation with persona-based prompt gallery. Grouping issues by Jira field for structured views. Good issue-type taxonomy for categorizing what shipped.

**What works poorly:** Release pages grow large and hard to scan as releases accumulate. Reporting is issue-centric — no design artifact awareness, no cost/velocity narrative, no forward-looking confidence scoring. Stakeholder accessibility requires separate export step.

**PDE advantage:** Phase-centric (not issue-centric) narrative that includes design artifacts, verification results, and timeline confidence in a single document.

---

## MVP Definition

### Launch With (v1) — Phase 1 of Milestone

Core synthesis engine with Cluster A personas.

- [ ] Artifact scanner: reads PROJECT.md, ROADMAP.md, phase plans, VERIFICATION.md, event bus sessions — builds in-memory project state object
- [ ] Phase completion % calculator: tasks completed vs planned per phase, overall project %
- [ ] Metric extractor: dates, cost (from token metering), task counts, blocker count
- [ ] Base narrative templates for 5 Cluster A personas (Executive Summary, Sprint Review, Client Deliverable, Investor Update, Stakeholder Status)
- [ ] Dual Markdown + HTML output with CSS template
- [ ] `/pde:present [persona]` slash command
- [ ] Output persistence in `.planning/presentations/[persona]-[date].md` and `.html`
- [ ] Product-type-aware framing applied as enrichment layer

### Add After Validation (v1.x) — Phase 2

Retrospective personas and design artifact embedding.

- [ ] Case Study persona with retrospective arc — trigger: when project marked complete
- [ ] Technical Post-Mortem persona — reads RECONCILIATION.md files
- [ ] ADR Summary persona — reads design artifact briefs and decision rationale
- [ ] Design artifact embedding (screenshots from `.planning/design/`) in HTML output
- [ ] Research validation sourcing — pulls verified claims from v0.7 validation agent output
- [ ] Auto-generation hook: trigger synthesis on phase VERIFICATION.md completion

### Future Consideration (v2+) — Phase 3

Cross-project synthesis and external-facing personas.

- [ ] Cross-project portfolio synthesis: multi-directory scan, portfolio-level narrative
- [ ] Launch Announcement persona — reads launch artifacts (LDP, LKT, CNT from v0.12)
- [ ] Timeline confidence scoring with velocity-based projection
- [ ] Mermaid-based burndown/velocity chart generation from event timestamps
- [ ] Portfolio Overview persona (requires cross-project scan to be working)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Artifact scanner + project state object | HIGH | MEDIUM | P1 |
| Phase completion % + metric extractor | HIGH | LOW | P1 |
| Cluster A persona templates (5 personas) | HIGH | MEDIUM | P1 |
| Dual Markdown + HTML output | HIGH | LOW | P1 |
| `/pde:present` slash command | HIGH | LOW | P1 |
| Product-type-aware framing | MEDIUM | LOW | P1 |
| Design artifact embedding | HIGH | MEDIUM | P2 |
| Case Study persona | HIGH | MEDIUM | P2 |
| Post-Mortem persona | MEDIUM | LOW | P2 |
| Auto-generation hook on phase completion | MEDIUM | MEDIUM | P2 |
| Research validation sourcing | MEDIUM | LOW | P2 |
| Timeline confidence scoring | MEDIUM | HIGH | P3 |
| Cross-project portfolio synthesis | HIGH | HIGH | P3 |
| Mermaid chart generation | LOW | MEDIUM | P3 |
| Launch Announcement persona | MEDIUM | LOW | P3 |

**Priority key:**
- P1: Must have for milestone launch — these validate the core concept
- P2: Should have — adds significant value once core is working
- P3: Defer — high complexity or dependent on P2 being stable

---

## Sources

- Notion AI review and Notion 3.0 autonomous agent features: [Notion AI Review 2026](https://max-productive.ai/ai-tools/notion-ai/), [Notion product page](https://www.notion.com/product/ai)
- Linear project updates and initiative health: [Linear Changelog — Initiative Updates](https://linear.app/changelog/2025-02-13-initiative-updates), [Linear reviews analysis](https://thedigitalprojectmanager.com/tools/linear-review/)
- GitHub Projects Insights burndown limitations: [GitHub community discussion #38840](https://github.com/orgs/community/discussions/38840), [Screenful advanced charts](https://screenful.com/blog/create-advanced-charts-with-github-projects-custom-fields)
- Jira ARNR release notes automation: [ARNR Atlassian Marketplace](https://marketplace.atlassian.com/apps/1215431/ai-powered-automated-release-notes-reports-for-jira), [Q4 2025 updates](https://amoeboids.com/blog/quarterly-update-q4-2025-arnr/)
- AI project status reporting best practices: [Digital Project Manager AI reporting guide](https://thedigitalprojectmanager.com/project-management/ai-in-project-status-reporting/), [Agile Seekers automation guide](https://agileseekers.com/blog/how-project-managers-can-automate-status-reporting-with-ai)
- Burndown chart generation from git history: [Zenhub burndown + velocity](https://www.zenhub.com/blog-posts/burndown-charts-in-github), [DEV community burndown guide 2025](https://dev.to/naik_sejal/free-burndown-chart-generator-the-developers-guide-to-agile-sprint-tracking-in-2025-2hbm)
- PDE stakeholder presentations concept: `.claude/projects/memory/project_stakeholder_presentations.md`
- PDE existing artifact inventory: `.planning/PROJECT.md`

---
*Feature research for: Stakeholder Presentation & Portfolio Synthesis Engine*
*Researched: 2026-03-29*
