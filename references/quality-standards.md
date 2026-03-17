# Quality Standards — Awwwards Evaluation Rubric

> Scoring rubric for evaluating design output quality across 4 dimensions.
> Loaded via `@` reference from critique.md, hig.md, and pressure-test.md during quality evaluation.
>
> **Scope boundary:** This file covers Awwwards-style quality evaluation criteria only.
> Contrast accessibility rules belong in wcag-baseline.md. Motion accessibility belongs in hig.md skill.

---

**Version:** 1.0
**Scope:** Design quality evaluation — Awwwards 4-dimension scoring framework
**Ownership:** CRT, HIG, PRT (Phase 34, Phase 37)
**Boundary:** Does NOT cover WCAG/APCA contrast rules, motion accessibility, or implementation guidance

---

## Section 1 — Dimension Overview

| Dimension | Weight | What It Measures | Key Question |
|-----------|--------|-----------------|--------------|
| Design | 40% | Visual language, typography mastery, color harmony, spatial sophistication | Does the visual execution show advanced craft or generic defaults? |
| Usability | 30% | Navigation clarity, interaction feedback, information hierarchy, accessibility | Can a user accomplish their goal without friction or confusion? |
| Creativity | 20% | Conceptual originality, unexpected solutions, non-template interactions | Is there a distinct creative vision, or does it feel assembled from existing patterns? |
| Content | 10% | Content-design integration, information density, typographic quality, writing | Does the content enhance the visual design or merely occupy space? |

---

## Section 2 — Score Level Definitions (1–10 Scale)

> Levels 8.0+ (SOTD) and 6.5+ (Honorable Mention) are confirmed Awwwards award thresholds. Per-score criteria below are inferred from SOTD winner analysis — not published by Awwwards.

| Score Range | Band | What This Looks Like |
|-------------|------|---------------------|
| 9.0–10.0 | SOTD Elite | Redefines expectations for the category. Execution is flawless. Creative concept is original and fully realized. Typography is bespoke or distinctively chosen. Motion is choreographed with narrative intent. Content and visual design are inseparable. |
| 8.0–8.9 | SOTD | Measurably above average. At least one dimension pushes a creative boundary. No rough edges. Judges would stop and spend time on this. Score ≥ 8.0 required for Site of the Day. |
| 6.5–7.9 | Honorable Mention | Professionally executed with clear craft investment. May have one weak dimension (e.g., strong Design + Creativity but basic Content). Score ≥ 6.5 required for Honorable Mention. |
| 5.0–6.4 | Professional | Competent, follows conventions, no obvious errors. Looks like a good agency website but makes no distinctive choices. Most professional work lands here. |
| 3.0–4.9 | Functional | Technically functional but generic defaults visible. Uses stock-like typography, symmetric layouts, templated interactions. AI aesthetic patterns likely present. |
| 1.0–2.9 | Poor | Significant quality problems: unresolved visual hierarchy, inaccessible contrast, broken interactions, or content that undermines the design. |

---

## Section 3 — Per-Dimension Scoring Criteria

### Design (40%)

> All per-score criteria below are inferred from SOTD winner analysis — not published by Awwwards.

| Score Band | Observable Criteria | AI Aesthetic Flags |
|------------|--------------------|--------------------|
| SOTD Elite (9–10) | Bespoke typographic system with at least 2 documented pairing decisions; OKLCH or LAB-space color palette with perceptual harmony rationale; spatial composition breaks symmetry intentionally on ≥1 axis; every interactive element has kinetically distinct states | — |
| SOTD (8.0–8.9) | Custom color palette not from a generator default; named typeface pairing with contrast rationale (not just size); asymmetry present; motion choreography visible | — |
| Honorable Mention (6.5–7.9) | Typeface pairing with some contrast differentiation; consistent spacing scale; hover states present; color beyond pure neutrals | — |
| Professional (5.0–6.4) | Single typeface family or basic serif+sans pair; mostly symmetric; standard hover opacity/color changes; neutral palette with one accent | — |
| Functional (3.0–4.9) | System font or untuned Google Font; symmetric grid; no motion; generic blue or brand color | — |
| AI Aesthetic Flags | — | Generic gradients (indigo-to-purple, teal-to-blue); Poppins or Inter with no second font; perfectly symmetric 3-column grid; border-radius: 8px everywhere; box-shadow copy-pasted from Tailwind defaults |

### Usability (30%)

> All per-score criteria below are inferred from SOTD winner analysis — not published by Awwwards.

| Score Band | Observable Criteria | AI Aesthetic Flags |
|------------|--------------------|--------------------|
| SOTD Elite (9–10) | Navigation state is always apparent; keyboard navigation is designed (not afterthought); empty/error/loading states are designed; information hierarchy is deducible without reading | — |
| SOTD (8.0–8.9) | Focus states visible and designed; form validation is contextual; loading feedback exists; mobile layout is distinct (not shrunk desktop) | — |
| Honorable Mention (6.5–7.9) | Readable line length (45–75 chars); contrast passes WCAG AA; navigation is predictable; mobile functional | — |
| Professional (5.0–6.4) | Passes WCAG AA on main content; navigation works; no broken interactions | — |
| Functional (3.0–4.9) | Core flows work but friction exists; contrast may fail on secondary text; mobile works but is not designed | — |
| AI Aesthetic Flags | — | Placeholder text that never clears; missing focus styles; contrast failure on colored backgrounds; mobile that is just the desktop layout reflowed |

### Creativity (20%)

> All per-score criteria below are inferred from SOTD winner analysis — not published by Awwwards.

| Score Band | Observable Criteria | AI Aesthetic Flags |
|------------|--------------------|--------------------|
| SOTD Elite (9–10) | Visual hook — one interaction or element that is unmistakably concept-specific and would not appear in any other project. Concept and execution are indivisible. | — |
| SOTD (8.0–8.9) | At least one non-templated interaction or composition choice. The concept influences visual decisions (not just the copy). | — |
| Honorable Mention (6.5–7.9) | Some concept-influenced choices visible. Not purely template-filling. | — |
| Professional (5.0–6.4) | Competent execution of common patterns. Generic but polished. | — |
| Functional (3.0–4.9) | Template patterns assembled. No concept-specific choices. | — |
| AI Aesthetic Flags | — | Hero section with centered heading + subheading + CTA button + gradient background (pattern #1 AI output); feature section with 3 equal columns + icon + heading + text (pattern #2); scroll animation on every element equally (no hierarchy) |

### Content (10%)

> All per-score criteria below are inferred from SOTD winner analysis — not published by Awwwards.

| Score Band | Observable Criteria | AI Aesthetic Flags |
|------------|--------------------|--------------------|
| SOTD Elite (9–10) | Content and design are co-created — removing either degrades the other. Copy has personality. Typography serves reading, not just aesthetics. | — |
| SOTD (8.0–8.9) | Content is purposeful. Type scale serves the reading experience. No lorem ipsum or placeholder copy in visible sections. | — |
| Honorable Mention (6.5–7.9) | Readable, appropriate line lengths. Type scale has hierarchy. No obvious filler. | — |
| Professional (5.0–6.4) | Content present and readable. Type hierarchy exists. Filler acceptable in non-primary sections. | — |
| Functional (3.0–4.9) | Content present but disconnected from design. Type hierarchy minimal. | — |
| AI Aesthetic Flags | — | Generic value proposition copy ("Transform your workflow"); lorem ipsum in visible sections; same type size used for hierarchy differentiation instead of weight/style/scale |

---

## Section 4 — Evaluation Process

### How to Apply This Rubric

1. Evaluate each dimension independently — do not let overall impression bias per-dimension scores
2. Score 1–10 per dimension, then compute weighted total: (Design × 0.40) + (Usability × 0.30) + (Creativity × 0.20) + (Content × 0.10)
3. For each dimension score below 7.0, record the specific observation and the AI aesthetic flag matched (if any)
4. Map every finding to one dimension — "this gradient" → Design, "this symmetric grid" → Creativity, "this contrast failure" → Usability

### Scoring Formula

```
Weighted Score = (Design × 0.40) + (Usability × 0.30) + (Creativity × 0.20) + (Content × 0.10)

Example:
  Design:    7.5 × 0.40 = 3.00
  Usability: 8.0 × 0.30 = 2.40
  Creativity: 6.0 × 0.20 = 1.20
  Content:   7.0 × 0.10 = 0.70
  Total: 7.30 — Honorable Mention territory
```

### Award Threshold Reference

| Award | Minimum Weighted Score | Source |
|-------|----------------------|--------|
| Site of the Day (SOTD) | ≥ 8.0 | Confirmed Awwwards threshold |
| Honorable Mention | ≥ 6.5 | Confirmed Awwwards threshold |
| No award | < 6.5 | Below Honorable Mention cutoff |

---

## Citations

| Source | URL | Used In |
|--------|-----|---------|
| Awwwards official evaluation dimensions | awwwards.com/awwwards/terms-and-conditions.html | All sections |
| SOTD/Honorable Mention thresholds | awwwards.com/criteria | Score band definitions |
| Per-score criteria | Inferred from SOTD winner analysis — NOT published by Awwwards | Score band detail rows |

---

*Version: 1.0*
*Last updated: 2026-03-17*
*Loaded by: critique.md, hig.md, pressure-test.md via @ reference*
