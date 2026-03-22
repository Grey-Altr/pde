# Business Track Reference

> Shared reference loaded by all business-mode workflows.
> Loaded via `@references/business-track.md` from workflow files.
> Defines the single source of truth for track-specific vocabulary, depth thresholds, and artifact format differences.

---

**Version:** 1.0
**Scope:** Track detection signals, vocabulary substitutions, depth thresholds, artifact format differences
**Ownership:** Shared (all business-mode workflows)
**Boundary:** This file defines HOW track branching works. It does NOT contain artifact templates (see launch-frameworks.md) or financial guardrails (see business-financial-disclaimer.md).

---

## Track Definitions

Three tracks are supported: `solo_founder`, `startup_team`, and `product_leader`. Each track controls vocabulary, depth thresholds, and artifact format. Detect the active track from signals in the user's brief, then apply consistently across all workflow output.

### solo_founder

**Description:** An individual builder, indie maker, or bootstrapped entrepreneur creating a product independently or with minimal help. Output is skimmable, action-first, and avoids unnecessary jargon.

**Detection signals:** "solo", "indie", "solo founder", "one person", "bootstrapped", "side project", "just me"

**Default:** solo_founder is the default track when no signals are detected or signals are ambiguous.

---

### startup_team

**Description:** A co-founding team or early-stage startup seeking product-market fit, often with external funding context. Output uses investor-ready framing and startup terminology.

**Detection signals:** "startup", "seed", "early stage", "founding team", "co-founder", "pre-seed", "Series A"

---

### product_leader

**Description:** A PM, head of product, or product director operating within an existing organization. Output uses executive summary framing, OKR vocabulary, and board-ready formatting.

**Detection signals:** "product leader", "PM", "head of product", "enterprise", "director", "VP", "product manager"

---

## Depth Thresholds

| Dimension | solo_founder | startup_team | product_leader |
|-----------|-------------|--------------|----------------|
| Brief section length | < 60 lines per section | 60-120 lines per section | 120+ lines per section |
| Competitive depth | 3 competitors, 1-2 paragraphs each | 5-8 competitors, scoring matrix | 8+ competitors, full positioning matrix |
| Market landscape format | 1-page summary | Competitive deep-dive | Build-vs-buy analysis |
| Pitch deck format | YC 10-slide | YC 10-slide, expandable to Sequoia 13 | Internal business case format |
| Service blueprint | Single-product flow | Multi-channel flow | Cross-functional flow |
| Email sequence depth | 5 onboarding emails | 5-7 onboarding + 3 investor outreach | 7 onboarding + 3 investor + executive summary |

---

## Vocabulary Substitutions

| Concept | solo_founder | startup_team | product_leader |
|---------|-------------|--------------|----------------|
| Revenue target | "revenue goal" | "ARR target" | "P&L impact" |
| Customers | "customers" | "ICP" | "key accounts" / "target segments" |
| Launch | "going live" | "launch" / "ship" | "go-to-market" |
| Competitors | "competing tools" | "competitive landscape" | "market alternatives" / "build-vs-buy" |
| Pricing | "what you charge" | "pricing tiers" / "pricing model" | "monetization strategy" / "packaging" |
| Team | "you" | "your team" / "co-founders" | "your organization" / "stakeholders" |

---

## Artifact Format Differences

**solo_founder:** Markdown, skimmable bullets, action-first language, plain English with no jargon. Every artifact section starts with what to do, not why. Avoid investor terminology — use plain descriptions of the same concept (e.g., "customers who will pay" instead of "ICP"). Length is kept minimal: only what the founder needs to act now.

**startup_team:** Structured documents in investor-presentation-ready format. Startup terminology is permitted and expected: ARR, MRR, CAC, LTV, churn, burn rate, runway, ICP, PMF. Artifacts are formatted for sharing with co-founders, advisors, and investors. Section headers use conventional investor-facing labels. Pitch decks follow YC or Sequoia format (see launch-frameworks.md).

**product_leader:** Executive summary at top followed by detail sections. Board-ready formatting throughout — no casual language. OKR framing for goals and success metrics. P&L vocabulary for financial sections (P&L impact, ROI, NPV, payback period). Build-vs-buy framing for competitive and opportunity analysis. Pitch deck uses internal business case format (see launch-frameworks.md). Stakeholder map included in service blueprint.

---

## Consumers

- `workflows/brief.md` — Phase 85: track detection and vocabulary
- `workflows/competitive.md` — Phase 86: market landscape depth
- `workflows/opportunity.md` — Phase 86: RICE scoring framing
- `workflows/flows.md` — Phase 87: service blueprint depth
- `workflows/system.md` — Phase 88: brand system vocabulary
- `workflows/wireframe.md` — Phase 89: pitch deck format selection
- `workflows/critique.md` — Phase 90: critique perspective depth
- `workflows/handoff.md` — Phase 91: launch kit assembly depth
