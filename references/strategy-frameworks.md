# Strategy Frameworks Reference Library

> Shared reference loaded by `/pde:competitive` and `/pde:opportunity` skills.
> Loaded via `@` reference from skill files during analysis and scoring.

---

**Version:** 1.0
**Scope:** RICE scoring, Porter's Five Forces, competitive positioning, market sizing
**Ownership:** Shared (CMP, OPP)
**Boundary:** This file provides strategy evaluation frameworks. It does NOT own competitive data collection (that belongs to the competitive skill) or feature prioritization logic (that belongs to the opportunity skill).

---

<!-- ESSENTIALS START -->

## RICE Scoring Framework

### Standard RICE Formula

**RICE Score = (Reach x Impact x Confidence) / Effort**

Each variable is scored on a defined scale to ensure consistency across evaluations.

### Scale Definitions

#### Reach

Number of users/customers affected in a defined time period (typically one quarter).

| Value | Description | Example |
|-------|-------------|---------|
| 10000+ | Affects all or nearly all users | Login flow change |
| 5000 | Affects majority of users | Dashboard redesign |
| 1000 | Affects a significant segment | Admin panel feature |
| 500 | Affects a moderate segment | Power user tool |
| 100 | Affects a small segment | Niche integration |

Reach should be estimated using real data when available. When estimating, document the assumption basis (e.g., "based on 50K MAU, estimated 20% use this feature daily").

#### Impact

How much does this move the needle for each affected user?

| Score | Level | Description |
|-------|-------|-------------|
| 3 | Massive | Transforms the experience; users would be upset if removed |
| 2 | High | Significant improvement; users would notice and appreciate |
| 1 | Medium | Moderate improvement; users would find it helpful |
| 0.5 | Low | Minor improvement; nice to have |
| 0.25 | Minimal | Barely noticeable; polish-level change |

#### Confidence

How sure are we about the Reach, Impact, and Effort estimates?

| Score | Level | When to use |
|-------|-------|-------------|
| 1.0 (100%) | High | User research data, A/B test results, validated prototypes |
| 0.8 (80%) | Medium | Some data, strong analogies, expert consensus |
| 0.5 (50%) | Low | Gut feeling, no data, novel territory |

**Rule:** If you cannot justify at least 50% confidence, the item needs research before scoring.

#### Effort

Estimated person-months of work. Use T-shirt sizing mapped to numeric values.

| T-Shirt | Person-Months | Description |
|---------|---------------|-------------|
| XS | 0.5 | A few days, single person |
| S | 1 | About a week, single person |
| M | 2 | 2-4 weeks, small team |
| L | 4 | 1-2 months, cross-functional |
| XL | 8 | Quarter-long initiative, multiple teams |

### Design-Aware RICE Extensions

Standard RICE captures business value but misses design differentiation. These three extensions add design-specific scoring dimensions.

#### UX Differentiation (0-3, weight 0.5x)

How much does this create a design advantage over competitors?

| Score | Level | Description |
|-------|-------|-------------|
| 3 | Breakthrough | Novel interaction pattern; sets new industry standard |
| 2 | Strong | Meaningfully better than competitors; noticeable in comparisons |
| 1 | Moderate | On par with best competitors; meets expectations well |
| 0 | None | Standard implementation; no design differentiation |

#### Accessibility Impact (0-3, weight 0.3x)

How much does this improve accessibility for users with disabilities?

| Score | Level | Description |
|-------|-------|-------------|
| 3 | Critical | Removes a complete barrier to access (e.g., keyboard-only navigation) |
| 2 | Significant | Substantially improves experience for assistive technology users |
| 1 | Moderate | Improves compliance or usability for some disability categories |
| 0 | None | No meaningful accessibility impact |

#### Design System Leverage (0-3, weight 0.2x)

How much does this benefit from or contribute to the design system?

| Score | Level | Description |
|-------|-------|-------------|
| 3 | High | Creates reusable components used across 5+ screens |
| 2 | Moderate | Uses existing components; adds 1-2 reusable patterns |
| 1 | Low | Uses existing components; no new reusable patterns |
| 0 | None | Custom one-off implementation; no design system interaction |

### Composite Formula

```
Design_bonus = (UX_diff * 0.5) + (A11y_impact * 0.3) + (DS_leverage * 0.2)
RICE_base = (Reach * Impact * Confidence) / Effort
Final_score = RICE_base * (1 + Design_bonus / 10)
```

The design bonus acts as a multiplier capped at 1.3x (when all design scores are 3). This ensures design quality improves rankings without overwhelming business fundamentals.

### Scoring Calibration Guidance

**Calibration steps:**
1. Score 2-3 well-understood items first to establish baselines
2. Use those as anchors: "Is this higher or lower impact than X?"
3. Score remaining items relative to anchors
4. Review the full ranked list for face validity
5. Adjust outliers with documented rationale

**Common pitfalls:**
- Inflating Impact because you like the idea (use data, not enthusiasm)
- Underestimating Effort for "simple" changes (account for testing, edge cases, rollout)
- Defaulting to 80% Confidence when you have no data (be honest about uncertainty)

### Scoring Example

| Item | Reach | Impact | Conf | Effort | RICE Base | UX Diff | A11y | DS Lev | Design Bonus | Final |
|------|-------|--------|------|--------|-----------|---------|------|--------|-------------|-------|
| Search redesign | 5000 | 2 | 0.8 | 2 | 4000 | 2 | 1 | 2 | 1.7 | 4680 |
| Dark mode | 3000 | 1 | 0.8 | 4 | 600 | 1 | 2 | 3 | 1.7 | 702 |
| Export to CSV | 500 | 0.5 | 1.0 | 0.5 | 500 | 0 | 0 | 0 | 0 | 500 |

<!-- ESSENTIALS END -->

<!-- STANDARD START -->

## Porter's Five Forces

### Framework Overview

Michael Porter's Five Forces model (1979) analyzes industry attractiveness and competitive dynamics. Each force is rated Low/Medium/High based on specific indicators.

```
                    Threat of
                   New Entrants
                       |
                       v
Supplier  -----> Competitive <----- Buyer
 Power           Rivalry            Power
                       ^
                       |
                  Threat of
                 Substitution
```

### Force 1: Competitive Rivalry

**Definition:** Intensity of competition among existing firms in the market.

**Rating indicators:**

| Rating | Indicators |
|--------|------------|
| Low | Few competitors, differentiated products, high switching costs, growing market |
| Medium | Moderate competitors, some differentiation, moderate switching costs |
| High | Many competitors, commodity products, low switching costs, slow/declining market |

**Design implications:**
- High rivalry = design differentiation is a competitive weapon; invest in UX quality
- Low rivalry = functional adequacy may suffice; focus on feature completeness
- Rivalry affects pricing pressure, which constrains design investment budgets

### Force 2: Supplier Power

**Definition:** Bargaining power of input suppliers (for software: APIs, cloud providers, talent; for hardware: component manufacturers, material suppliers).

**Rating indicators:**

| Rating | Indicators |
|--------|------------|
| Low | Many alternative suppliers, standard inputs, low switching costs |
| Medium | Some alternatives, moderate specialization, moderate switching costs |
| High | Few suppliers, unique inputs, high switching costs, supplier can forward-integrate |

**Design implications:**
- High supplier power in APIs/platforms = design around constraints; plan for platform changes
- High supplier power in components = design for alternative parts; avoid single-source dependencies
- Supplier limitations may constrain design decisions (e.g., available display sizes, chip capabilities)

### Force 3: Buyer Power

**Definition:** Bargaining power of customers.

**Rating indicators:**

| Rating | Indicators |
|--------|------------|
| Low | Many small buyers, differentiated product, high switching costs, no substitutes |
| Medium | Moderate buyer concentration, some alternatives, moderate switching costs |
| High | Few large buyers, commodity product, low switching costs, price-sensitive buyers |

**Design implications:**
- High buyer power = design for retention; switching cost through superior UX and data lock-in
- Enterprise buyers = design for procurement (security, compliance, SSO, admin dashboards)
- Consumer buyers = design for delight and habit formation

### Force 4: Threat of Substitution

**Definition:** Likelihood that customers switch to alternative solutions (different product categories solving the same problem).

**Rating indicators:**

| Rating | Indicators |
|--------|------------|
| Low | No viable alternatives, product is essential, high switching costs |
| Medium | Some alternatives exist but with trade-offs, moderate switching costs |
| High | Many alternatives, low switching costs, substitutes improving rapidly |

**Design implications:**
- High substitution threat = design for the job-to-be-done, not the product category
- Focus on unique value that substitutes cannot replicate (e.g., integration depth, workflow fit)
- Monitor substitute UX quality -- if substitutes are catching up, differentiation must accelerate

### Force 5: Threat of New Entry

**Definition:** Ease with which new competitors can enter the market.

**Rating indicators:**

| Rating | Indicators |
|--------|------------|
| Low | High capital requirements, strong network effects, regulatory barriers, brand loyalty |
| Medium | Moderate barriers, some capital needed, some brand advantage |
| High | Low barriers, easy to build, no network effects, commoditized technology |

**Design implications:**
- Low entry barriers = design system investment creates moats through consistency and speed
- Network effects = design for growth loops and viral mechanics
- High entry barriers = design for depth over breadth; serve existing users exceptionally well

### Five Forces Summary Template

| Force | Rating | Key Indicators | Design Impact |
|-------|--------|---------------|---------------|
| Competitive Rivalry | {Low/Med/High} | {top 2-3 indicators} | {primary design implication} |
| Supplier Power | {Low/Med/High} | {top 2-3 indicators} | {primary design implication} |
| Buyer Power | {Low/Med/High} | {top 2-3 indicators} | {primary design implication} |
| Threat of Substitution | {Low/Med/High} | {top 2-3 indicators} | {primary design implication} |
| Threat of New Entry | {Low/Med/High} | {top 2-3 indicators} | {primary design implication} |

**Overall Industry Attractiveness:** {Low/Medium/High} -- {1-sentence summary}

## Competitive Positioning Theory

### 2x2 Positioning Matrix

A positioning matrix plots competitors on two key dimensions to reveal market gaps and clusters.

### Axis Selection Guidance

Choose axes that represent the most meaningful differentiation dimensions for your market. Common pairs:

| Axis Pair | Best For | Example Markets |
|-----------|----------|-----------------|
| Price / Quality | Consumer products, SaaS tiers | E-commerce, project management |
| Features / Simplicity | Software products, tools | Note-taking, design tools |
| Enterprise / Consumer | B2B/B2C spectrum | Communication, analytics |
| Breadth / Depth | Platform vs specialist | Marketing suites, dev tools |
| Speed / Accuracy | Data/analytics products | Search, ML tools |
| Self-serve / High-touch | Service delivery model | CRM, hosting |

**Selection criteria:**
1. Axes should be independent (not correlated)
2. Axes should matter to buyers (validate with user research or market data)
3. Competitors should spread across quadrants (if all cluster, choose different axes)

### Positioning Map SVG Template

```svg
<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <!-- Grid -->
  <line x1="250" y1="50" x2="250" y2="450" stroke="#ccc" stroke-width="1"/>
  <line x1="50" y1="250" x2="450" y2="250" stroke="#ccc" stroke-width="1"/>

  <!-- Axes -->
  <line x1="50" y1="450" x2="450" y2="450" stroke="#333" stroke-width="2"/>
  <line x1="50" y1="450" x2="50" y2="50" stroke="#333" stroke-width="2"/>

  <!-- Axis Labels -->
  <text x="250" y="490" text-anchor="middle" font-size="14" font-weight="bold">{X-Axis Label}</text>
  <text x="20" y="250" text-anchor="middle" font-size="14" font-weight="bold"
        transform="rotate(-90, 20, 250)">{Y-Axis Label}</text>

  <!-- Quadrant Labels -->
  <text x="150" y="150" text-anchor="middle" font-size="11" fill="#666">{Q1 Label}</text>
  <text x="350" y="150" text-anchor="middle" font-size="11" fill="#666">{Q2 Label}</text>
  <text x="150" y="350" text-anchor="middle" font-size="11" fill="#666">{Q3 Label}</text>
  <text x="350" y="350" text-anchor="middle" font-size="11" fill="#666">{Q4 Label}</text>

  <!-- Competitor Dots (positioned by score) -->
  <!-- cx = 50 + (x_score/10 * 400), cy = 450 - (y_score/10 * 400) -->
  <circle cx="{x}" cy="{y}" r="12" fill="{color}" opacity="0.8"/>
  <text x="{x}" y="{y+20}" text-anchor="middle" font-size="10">{Competitor Name}</text>

  <!-- Our Product (highlighted) -->
  <circle cx="{x}" cy="{y}" r="14" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
  <text x="{x}" y="{y+22}" text-anchor="middle" font-size="10" font-weight="bold">{Our Product}</text>
</svg>
```

### Perceptual vs Objective Positioning

| Aspect | Perceptual | Objective |
|--------|-----------|-----------|
| Data source | User surveys, brand perception studies | Feature specs, benchmark data |
| Measures | How users *perceive* the product | What the product *actually does* |
| Use case | Brand strategy, marketing positioning | Feature gap analysis, competitive advantage |
| Accuracy | Subject to bias, varies by segment | Measurable but may miss user perception |
| When to use | Brand differentiation, messaging strategy | Technical differentiation, feature planning |

**Best practice:** Create both maps. Gaps between perceptual and objective positioning reveal messaging problems (product is better than perceived) or over-promise risks (product is perceived as better than it is).

<!-- STANDARD END -->

<!-- COMPREHENSIVE START -->

## Market Sizing Approaches

### TAM / SAM / SOM

| Metric | Definition | Question Answered |
|--------|-----------|------------------|
| **TAM** (Total Addressable Market) | Total market demand for the product category | "How big is the universe?" |
| **SAM** (Serviceable Addressable Market) | Portion of TAM reachable with current product/channels | "How much could we theoretically capture?" |
| **SOM** (Serviceable Obtainable Market) | Realistic portion of SAM capturable in 1-3 years | "How much will we actually capture?" |

### Top-Down Estimation

Start with total market data and narrow down.

```
TAM: Industry reports (Gartner, Statista, IBISWorld)
  -> SAM: Filter by geography, segment, product fit
    -> SOM: Apply realistic market share % based on competitors, resources, timeline
```

**Strengths:** Uses published data; quick to estimate; good for investor presentations.
**Weaknesses:** Often inflated; hard to validate assumptions; assumes market data is accurate.

### Bottom-Up Estimation

Start with unit economics and scale up.

```
Price per unit: ${X}/month
  x Addressable customers in target segment: {N}
    x Realistic conversion rate: {Y}%
      x Expected retention: {Z}%
        = SOM (annual revenue)
```

**Strengths:** Grounded in real economics; validates pricing assumptions; more credible.
**Weaknesses:** Harder to estimate customer counts; may miss market expansion; underestimates TAM.

### Assumption Documentation

Every market size estimate must document:

1. **Data sources** -- where numbers come from (report name, date, URL)
2. **Key assumptions** -- what you assumed and why
3. **Sensitivity** -- which assumptions matter most (if X is wrong by 2x, what happens?)
4. **Confidence level** -- how confident you are in each number (High/Medium/Low)
5. **Date currency** -- when the underlying data was collected

### Growth Rate Estimation

| Method | Approach | Best For |
|--------|----------|----------|
| Historical CAGR | Compound annual growth from past data | Mature markets |
| Analogous markets | Growth rate of similar markets at similar stage | New markets |
| Driver-based | Model individual growth drivers (adoption, pricing, expansion) | Emerging markets |
| Cohort analysis | Measure growth within customer cohorts over time | SaaS, subscription |

**Growth rate formula (CAGR):**
```
CAGR = (End Value / Start Value)^(1 / Years) - 1
```

**Guidance:**
- Use 3-5 year projections; beyond that, accuracy drops sharply
- Always provide a range (bear/base/bull scenarios)
- Market growth rate does NOT equal your growth rate -- apply a capture multiplier

### Market Sizing Template

```markdown
## Market Size Estimates

### TAM
- **Value:** ${X}B ({year})
- **Source:** {report/analysis}
- **Growth:** {X}% CAGR ({year range})
- **Confidence:** {High/Medium/Low}

### SAM
- **Value:** ${X}M
- **Filters applied:** {geography}, {segment}, {product fit criteria}
- **Assumptions:** {key assumptions}
- **Confidence:** {High/Medium/Low}

### SOM (Year 1-3)
- **Year 1:** ${X}M ({X}% of SAM)
- **Year 2:** ${X}M ({X}% of SAM)
- **Year 3:** ${X}M ({X}% of SAM)
- **Basis:** {bottom-up model / market share assumption}
- **Key risks:** {what could make this wrong}
```

## Advanced RICE Techniques

### Score Normalization Across Teams

When multiple teams score independently, normalize to prevent inflation:

1. Calculate each team's mean and standard deviation
2. Convert to z-scores: `z = (score - mean) / stdev`
3. Map z-scores back to a common scale
4. Re-rank on normalized scores

### Decay Functions

For time-sensitive opportunities, apply a decay multiplier:

```
Time_decay = e^(-lambda * months_until_stale)
Adjusted_score = Final_score * Time_decay
```

Where `lambda` controls decay speed (0.1 = gradual, 0.5 = aggressive).

### Portfolio Balance Constraints

After scoring, check portfolio balance:
- No more than 30% of planned work should be Low Confidence
- At least 20% should be quick wins (Effort = XS or S)
- At least one item should score high on Accessibility Impact
- Maintain a mix of improvements (existing features) and innovations (new features)

### Scenario Modeling

Test ranking robustness by adjusting one variable at a time:

```markdown
### Scenario: "What if Effort doubles?"
| Item | Original Score | Adjusted Score | Rank Change |
|------|---------------|----------------|-------------|
| {item} | {score} | {new_score} | {+N/-N/--} |

**Finding:** {which items are fragile vs robust}
```

Items that drop significantly under small perturbations are "fragile priorities" -- flag for closer scrutiny.

<!-- COMPREHENSIVE END -->

---

*Strategy Frameworks Reference v1.0 -- Shared by /pde:competitive and /pde:opportunity*
