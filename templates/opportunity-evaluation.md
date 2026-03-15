---
Generated: "{date}"
Skill: /pde:opportunity (OPP)
Version: v{N}
Status: draft
Mode: "{feature|opportunity}"
Scoring Version: "RICE + Design Extensions v1.0"
Enhanced By: "{MCP list or none}"
---

# Opportunity Evaluation: {product_name}

---

## Evaluation Candidates

*Pre-populated from `/pde:competitive` gap analysis when available. Confirmed and adjusted by user before scoring.*

| # | Candidate | Source | Description |
|---|-----------|--------|-------------|
| 1 | {candidate name} | {competitive gap / user request / stakeholder input} | {1-sentence description} |
| 2 | {candidate name} | {source} | {description} |
| 3 | {candidate name} | {source} | {description} |

**Candidates confirmed:** {yes -- user reviewed / no -- auto-populated, pending review}

---

## Scoring Table

Ranked by composite score (highest first).

| Rank | Candidate | Reach | Impact | Conf | Effort | UX Diff | A11y | DS Lev | RICE Base | Design Bonus | Final Score |
|------|-----------|-------|--------|------|--------|---------|------|--------|-----------|-------------|-------------|
| 1 | {name} | {N} | {3/2/1/0.5/0.25} | {1.0/0.8/0.5} | {0.5-8} | {0-3} | {0-3} | {0-3} | {score} | {bonus} | {final} |
| 2 | {name} | {N} | {score} | {score} | {score} | {score} | {score} | {score} | {score} | {bonus} | {final} |
| 3 | {name} | {N} | {score} | {score} | {score} | {score} | {score} | {score} | {score} | {bonus} | {final} |

**Scoring formula:** `RICE_base = (Reach * Impact * Confidence) / Effort`
**Design bonus:** `(UX_diff * 0.5 + A11y * 0.3 + DS_leverage * 0.2)`
**Final score:** `RICE_base * (1 + Design_bonus / 10)`

---

## Per-Item Breakdowns

### 1. {Candidate Name} -- Final Score: {score}

**RICE Breakdown:**

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Reach | {N} | {who is affected, how estimated} |
| Impact | {score} | {why this level of impact} |
| Confidence | {score} | {data quality, assumptions} |
| Effort | {T-shirt} ({N}) | {what work is involved} |

**Design Extension Breakdown:**

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| UX Differentiation | {score} | {how this differentiates the experience} |
| Accessibility Impact | {score} | {accessibility improvements enabled} |
| Design System Leverage | {score} | {reusable components created/used} |

**Key considerations:**
- {notable factor affecting this score}
- {dependencies or prerequisites}
- {risks specific to this item}

---

*Repeat per-item breakdown for each candidate*

---

## Narrative Analysis

### Top Recommendations

1. **{Candidate name}** -- {why this should be prioritized}
2. **{Candidate name}** -- {why this should be prioritized}
3. **{Candidate name}** -- {why this should be prioritized}

### Surprising Findings

- {something unexpected in the scores -- e.g., a "pet project" scored lower than expected}
- {a low-profile item that scored surprisingly high}

### Risk Flags

- **{risk}** -- {which candidates are affected and how}
- **{risk}** -- {which candidates are affected and how}

---

## Score Distribution

*SVG chart showing score distribution across all candidates.*

```svg
<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
  <!-- Chart background -->
  <rect x="60" y="20" width="520" height="240" fill="#f9fafb" rx="4"/>

  <!-- Y-axis -->
  <line x1="60" y1="20" x2="60" y2="260" stroke="#333" stroke-width="1"/>
  <text x="30" y="140" text-anchor="middle" font-size="12" transform="rotate(-90, 30, 140)">Final Score</text>

  <!-- X-axis -->
  <line x1="60" y1="260" x2="580" y2="260" stroke="#333" stroke-width="1"/>

  <!-- Bars (one per candidate, width proportional to score) -->
  <!-- bar_height = (score / max_score) * 220 -->
  <rect x="{x}" y="{260-height}" width="{bar_width}" height="{height}" fill="#2563eb" rx="2"/>
  <text x="{x + bar_width/2}" y="275" text-anchor="middle" font-size="10">{name}</text>
  <text x="{x + bar_width/2}" y="{260-height-5}" text-anchor="middle" font-size="9">{score}</text>
</svg>
```

---

## Now / Next / Later Buckets

Based on scores, effort estimates, and dependencies.

### Now (Start Immediately)

| Candidate | Score | Effort | Rationale |
|-----------|-------|--------|-----------|
| {name} | {score} | {T-shirt} | {why now -- high score, low effort, no blockers} |

### Next (Start After Current Wave)

| Candidate | Score | Effort | Rationale |
|-----------|-------|--------|-----------|
| {name} | {score} | {T-shirt} | {why next -- high score but depends on Now items} |

### Later (Backlog / Re-evaluate)

| Candidate | Score | Effort | Rationale |
|-----------|-------|--------|-----------|
| {name} | {score} | {T-shirt} | {why later -- lower score, high effort, or low confidence} |

**Bucket criteria:**
- Now: Score in top 30% AND Effort <= M AND no unresolved blockers
- Next: Score in top 60% OR depends on Now items
- Later: Remaining items; re-evaluate quarterly

---

## Scenario Models

### Scenario: {scenario name}

*What if {variable} changes?*

| Candidate | Original Score | Adjusted Score | Rank Change |
|-----------|---------------|----------------|-------------|
| {name} | {score} | {new_score} | {+N/-N/--} |

**Finding:** {which items are fragile vs robust under this scenario}

### Scenario: {scenario name}

| Candidate | Original Score | Adjusted Score | Rank Change |
|-----------|---------------|----------------|-------------|
| {name} | {score} | {new_score} | {+N/-N/--} |

**Finding:** {interpretation}

---

## Version History

| Version | Date | Changes | Candidates |
|---------|------|---------|------------|
| v{N} | {date} | {initial evaluation / re-scored / added candidates} | {count} |

**Score Changes Since Last Version:**

| Candidate | Previous Score | Current Score | Delta | Reason |
|-----------|--------------|---------------|-------|--------|
| {name} | {prev} | {current} | {+/-N} | {what changed} |

---

*Generated by PDE-OS /pde:opportunity | {date} | Mode: {feature|opportunity}*
