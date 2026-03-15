# Feature Research

**Domain:** AI-powered product development platform (Claude Code plugin → lifecycle tool)
**Researched:** 2026-03-14
**Confidence:** HIGH (core GSD features), MEDIUM (competitive landscape), MEDIUM (post-v1 roadmap features)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Slash command interface | Claude Code is the host; users navigate via /commands | LOW | GSD provides ~29 commands; PDE inherits these via fork |
| Phase-based workflow (discuss → plan → execute → verify) | Every mature AI dev workflow uses phases; ad-hoc is amateur | MEDIUM | Core GSD loop; must work identically in PDE |
| Project initialization with requirements capture | Users expect structured onboarding, not blank-canvas prompts | MEDIUM | /pde:new-project equivalent of /gsd:new-project |
| Persistent state across context resets | Context rot is the #1 complaint about raw Claude usage | HIGH | .planning/ file-based state is the entire GSD insight |
| Atomic git commits per task | Developers expect traceable, revertable history | LOW | GSD enforces one commit per task |
| Milestone management (start, complete, archive) | Product work has releases; tool must match mental model | MEDIUM | /pde:new-milestone, complete-milestone, audit-milestone |
| Roadmap file as source of truth | Users expect to see and modify the plan in plain text | LOW | ROADMAP.md pattern; editing it must actually affect execution |
| Quick task mode | Not all work needs full planning; fast path required | LOW | /pde:quick equivalent |
| Progress visibility | "Where am I?" is always the first question | LOW | /pde:progress |
| Help command | Discovery of capabilities without docs | LOW | /pde:help |
| Codebase mapping for existing projects | Most users have existing code; cold-start only is a dealbreaker | HIGH | Parallel agents analyze stack, architecture, conventions |
| Parallel agent orchestration | Single-agent sequential work is slow and fragile | HIGH | Wave execution; independent tasks run concurrently |
| Human verification gate | Autonomous AI that ships without review is a liability | LOW | Verify step before moving to next phase |
| Requirements traceability | Enterprise and semi-serious users expect to validate against goals | MEDIUM | Plan validates against REQUIREMENTS.md |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Design pipeline integration | Cursor/Windsurf/Cline stop at code; PDE can own idea→wireframe→code | HIGH | Post-v1; wireframing, design systems, user flows |
| MCP server integrations (Jira, Linear, GitHub, Figma) | Connects AI execution to real toolchains developers already use | HIGH | Post-v1; MCP is now the standard protocol for AI tool bridges |
| Multi-product-type support (hardware, content, non-software) | Nobody else serves hardware or content workflows in an AI dev tool | HIGH | Post-v1; requires domain-specific agent types |
| Multi-AI-provider support (Gemini CLI, OpenCode, Codex) | Avoids Anthropic lock-in; portability is increasingly valued | MEDIUM | GSD already partially supports this; PDE can formalize it |
| Idea-to-shipped lifecycle continuity | Competitors handle coding; nobody handles the full arc from napkin to v1 to post-launch iteration | HIGH | The end-state differentiator; requires all other capabilities |
| Context rot prevention via structured file state | Raw Claude users suffer degrading quality; GSD/PDE users don't | MEDIUM | This is the core architectural insight GSD proved; PDE inherits it |
| Spec-driven development enforcement | Forces requirements before building; reduces rework | MEDIUM | Requirements must exist before planning is allowed |
| Phase-aware research (per-phase domain investigation) | Generic coding tools don't do domain research per task; PDE spawns researchers | HIGH | Research agents per phase are unusual; most tools just code |
| Public distribution as installable plugin | Cursor/Windsurf are installed apps; PDE can be npx-installed anywhere Claude Code runs | LOW | Distribution advantage over IDE-locked competitors |
| Plan mode with editable Markdown plans | Cursor 2.0 has this; it's becoming expected but not yet universal | MEDIUM | GSD has discussion + plan steps; surfacing editable plans is the next step |
| Audit and gap-filling commands | After a milestone, automatically detect what was missed | MEDIUM | /pde:audit-milestone, plan-milestone-gaps; no competitor has this |
| Community plugin ecosystem (discord, updater) | Tool evolves in public; community contributes skills | LOW | /pde:update with changelog, /pde:join-discord; network effect |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time collaborative editing (multi-user) | Feels modern; appeals to teams | Requires persistent server infrastructure; makes plugin into a SaaS; conflicts with file-based state model | Async handoff via git; each user runs their own PDE instance |
| In-tool UI dashboard / web app | Feels polished; visual progress is appealing | Requires a web server, auth, hosting; bloats plugin into an app; diverges from Claude Code paradigm | Markdown files ARE the dashboard; rich terminal output covers the gap |
| Automatic AI-chosen model routing | "Just pick the best model" sounds great | Model quality and cost tradeoffs are user-specific; auto-routing gets it wrong often; hides costs | Explicit model configuration; document tradeoffs; let users choose |
| Full autonomous ship-without-review mode | Sounds like the dream; zero-human-in-loop | Autonomous shipping without verification causes trust erosion after first bad deploy; users abandon the tool | Verification gate always present; make it fast and low-friction, not absent |
| Feature-complete IDE replacement | Cursor/Windsurf territory; full editor | PDE runs inside Claude Code; building an IDE means competing with the host; loses the plugin advantage | Stay a plugin; let Claude Code be the IDE; PDE handles workflow on top |
| Proprietary agent runtime / custom execution engine | Sounds powerful; could be faster | Kills portability; requires users to run PDE's server; breaks the "markdown files + Claude" simplicity that makes GSD work | Bash scripts for deterministic logic; Markdown agents for AI logic; no proprietary runtime |
| LLM-as-workflow-engine (pure prompt-based state) | Simplifies architecture; "just ask Claude" | LLMs make poor state machines; they hallucinate state transitions; "deterministic logic belongs in code, not prompts" (GSD principle) | File-based state + bash scripts for queries; LLM for reasoning, not bookkeeping |
| Subscription-gated features / credits system | Monetization | Adds billing complexity; alienates community users; creates variable cost exposure on fixed pricing | Open-source plugin; monetize via premium support, consulting, or enterprise tier later |

---

## Feature Dependencies

```
[Persistent file state (.planning/)]
    └──required by──> [Phase workflow]
                          └──required by──> [Parallel agent orchestration]
                          └──required by──> [Milestone management]
                          └──required by──> [Requirements traceability]

[Slash command interface]
    └──required by──> [All user-facing commands]

[Project initialization]
    └──required by──> [Codebase mapping]
    └──required by──> [Phase workflow]

[Phase workflow (discuss → plan → execute → verify)]
    └──required by──> [Spec-driven development enforcement]
    └──required by──> [Audit and gap-filling]
    └──required by──> [Phase-aware research]

[Multi-AI-provider support]
    └──enhances──> [Parallel agent orchestration]

[MCP server integrations]
    └──enhances──> [Phase workflow]
    └──enhances──> [Project initialization]

[Design pipeline]
    └──requires──> [Phase workflow]
    └──enhances──> [Idea-to-shipped lifecycle continuity]

[Idea-to-shipped lifecycle continuity]
    └──requires──> [Design pipeline]
    └──requires──> [MCP integrations]
    └──requires──> [Multi-product-type support]
    └──requires──> [Phase workflow]
```

### Dependency Notes

- **Persistent file state requires nothing**: It is the foundation. Everything else builds on .planning/ as external memory.
- **Phase workflow requires persistent state**: Without files surviving context resets, the 4-step loop breaks on any long-running project.
- **Audit and gap-filling requires milestone management**: You can't audit what wasn't tracked.
- **Design pipeline requires phase workflow**: Design phases are just phases with different agent types; the workflow engine is the primitive.
- **Idea-to-shipped lifecycle requires design pipeline, MCP, and multi-product support**: The end-state differentiator is a function of all post-v1 additions. None of these can be skipped and still claim the full lifecycle.
- **MCP integrations enhance but do not require phase workflow**: MCP servers surface data; the workflow consumes it. Either works without the other, but together they're more powerful.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — the 1:1 GSD clone rebranded as PDE.

- [ ] All ~29 /gsd: commands working as /pde: equivalents — core value delivery
- [ ] Persistent .planning/ file state with same structure as GSD — everything depends on this
- [ ] Phase workflow (discuss, plan, execute, verify) — the primary user loop
- [ ] Parallel agent orchestration with wave execution — what makes PDE faster than raw Claude
- [ ] Project initialization (/pde:new-project) — first thing users run
- [ ] Codebase mapping (/pde:map-codebase) — required for existing project users
- [ ] Milestone management (new, complete, audit) — users need release cycles
- [ ] Quick task mode (/pde:quick) — small work must have a fast path
- [ ] Progress visibility (/pde:progress) — users ask "where am I?" constantly
- [ ] Plugin installable via Claude Code plugin mechanism — distribution prerequisite

### Add After Validation (v1.x)

Features to add once the clone is stable and in users' hands.

- [ ] Design pipeline (wireframing, design systems, user flows) — add when workflow engine is proven stable; design agents are just new agent types
- [ ] MCP server integrations (GitHub, Linear, Figma, Jira) — add when users report integration friction; MCP is mature enough in 2026
- [ ] Multi-AI-provider formalization (Gemini CLI, OpenCode, Codex support) — GSD partially has this; make it first-class after v1 stability

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Multi-product-type support (hardware, content) — niche until core dev workflow is proven; requires domain-specific agent types
- [ ] Standalone CLI distribution (multi-provider, not Claude Code plugin) — significant distribution infrastructure; defer until plugin model hits limits
- [ ] Maintenance/analytics/feedback loops — post-ship lifecycle; build when users are shipping things with PDE
- [ ] Enterprise tier or monetization model — defer until community traction proves demand

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| All /pde: command parity with /gsd: | HIGH | LOW (rename + rebrand) | P1 |
| Persistent .planning/ file state | HIGH | LOW (inherited from fork) | P1 |
| Phase workflow | HIGH | LOW (inherited from fork) | P1 |
| Plugin installability | HIGH | LOW (same mechanism as GSD) | P1 |
| Codebase mapping | HIGH | LOW (inherited from fork) | P1 |
| Parallel agent orchestration | HIGH | LOW (inherited from fork) | P1 |
| MCP server integrations | HIGH | HIGH (new capability) | P2 |
| Design pipeline | HIGH | HIGH (new agent types) | P2 |
| Multi-AI-provider formalization | MEDIUM | MEDIUM | P2 |
| Multi-product-type support | MEDIUM | HIGH | P3 |
| Standalone CLI distribution | MEDIUM | HIGH | P3 |
| Post-ship maintenance/analytics | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for v1 launch
- P2: Should have, add in v1.x milestones
- P3: Nice to have, v2+ consideration

---

## Competitor Feature Analysis

| Feature | GSD (fork base) | Cursor/Windsurf | Cline/Aider | v0/Bolt/Lovable | PDE Approach |
|---------|-----------------|-----------------|-------------|------------------|--------------|
| Phase-based workflow | Yes — core design | No — freeform agent | No — freeform | No — generate + ship | Inherit from GSD; table stakes |
| Persistent file state | Yes — .planning/ | No — in-session only | No — in-session only | No | Inherit; primary differentiator |
| Context rot prevention | Yes — fresh contexts per phase | No | No | N/A (stateless gen) | Inherit; actively market this |
| Parallel agent orchestration | Yes — wave execution | Limited (Cursor: 8 agents) | No | No | Inherit; expand post-v1 |
| Spec-driven / requirements | Yes — REQUIREMENTS.md | No | No | No | Inherit; formalize further |
| Multi-file editing | Yes (via Claude Code) | Yes | Yes | Limited | Inherited from host (Claude Code) |
| Design pipeline | No | No | No | Yes (UI gen only) | Post-v1 differentiator |
| MCP integrations | Limited | Growing | Growing | No | Post-v1 priority |
| Deployment | No | No | No | Yes (Bolt/Lovable) | Post-v2; not a priority |
| Multi-product support | No | No | No | No | Post-v1 differentiator |
| Open-source / free | Yes (MIT) | No ($20/mo) | Yes (open-source) | No ($20/mo) | Yes — community distribution model |
| Audit and gap-filling | Yes | No | No | No | Inherit; rare differentiator |
| Context window monitoring | Yes (health checks) | No | No | No | Inherit; rare differentiator |

---

## Sources

- [GSD GitHub repository](https://github.com/gsd-build/get-shit-done) — feature enumeration, command list, architecture (HIGH confidence)
- [GSD for Claude Code: A Deep Dive](https://www.codecentric.de/en/knowledge-hub/blog/the-anatomy-of-claude-code-workflows-turning-slash-commands-into-an-ai-development-system) — workflow analysis (HIGH confidence)
- [AI Dev Tool Power Rankings, March 2026 — LogRocket](https://blog.logrocket.com/ai-dev-tool-power-rankings/) — table stakes analysis (MEDIUM confidence)
- [Windsurf vs Cursor comparison — Builder.io](https://www.builder.io/blog/windsurf-vs-cursor) — competitor feature comparison (MEDIUM confidence)
- [Cursor vs Windsurf vs Cline — UI Bakery](https://uibakery.io/blog/cursor-vs-windsurf-vs-cline) — agent capability comparison (MEDIUM confidence)
- [v0 vs Bolt vs Lovable 2026 — NxCode](https://www.nxcode.io/resources/news/v0-vs-bolt-vs-lovable-ai-app-builder-comparison-2025) — app builder feature comparison (MEDIUM confidence)
- [Agentic Coding Trends Report 2026 — Anthropic](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf) — multi-agent workflow patterns (MEDIUM confidence)
- [MCP ecosystem 2026 — Golden Eagle AI](https://goldeneagle.ai/blog/artificial-intelligence/mcp-servers-cross-platform-ai-2026/) — MCP integration landscape (MEDIUM confidence)
- [How to Beat AI Feature Creep — Built In](https://builtin.com/articles/beat-ai-feature-creep) — anti-feature rationale (MEDIUM confidence)

---

*Feature research for: AI-powered product development platform (Platform Development Engine)*
*Researched: 2026-03-14*
