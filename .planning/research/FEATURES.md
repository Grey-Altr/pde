# Feature Research

**Domain:** Quality hardening and reliability improvements for a large Claude Code plugin (PDE v0.23)
**Researched:** 2026-03-29
**Confidence:** HIGH — based on direct inspection of codebase artifacts, verification reports, and milestone audit files

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are already partially present in the codebase but are known to be incomplete or broken. Shipping v0.23 without these means the milestone audit trail is untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| ROADMAP.md milestone status accuracy | v0.22 still shows `🚧 In Progress` despite being shipped 2026-03-30; users reading the tracking doc see false state | LOW | Text replacement; confirmed by direct inspection of ROADMAP.md line 26 |
| MILESTONES.md one-liner completion | v0.22 has 10+ `- One-liner:` placeholder entries; v0.21, v0.20, v0.19 sections also contain placeholder entries; portfolio synthesis IR reads MILESTONES.md and gets literal placeholder text | MEDIUM | Must read each phase SUMMARY.md and extract the correct one-liner; some require judgment |
| REQUIREMENTS.md checkbox reconciliation | Phase 176 VERIFICATION.md explicitly flags EXT-01 through EXT-10 as unchecked despite full implementation; similar gaps likely in earlier milestones | MEDIUM | Systematic audit against VERIFICATION.md pass records; each checkbox needs evidence before checking |
| Phase 180 VERIFICATION.md status fix | Audit explicitly records `status: gaps_found` in frontmatter despite code being complete and admin checkbox issue resolved | LOW | Single frontmatter field; confirmed tech debt item in v0.22 MILESTONE-AUDIT.md |
| buildCrossPatterns IR field name fix | Phase 184 VERIFICATION.md flags that `buildCrossPatterns` reads `research.findings` but real IR uses `topics`/`project_research_files`; currently produces silently empty cross-patterns section | MEDIUM | Field name mismatch in `bin/lib/render-presentation.cjs`; test mocks must also update to real IR shape |

### Differentiators (Competitive Advantage)

Features beyond checkbox repair — systematic improvements that add ongoing value to the quality infrastructure.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| v0.22 Nyquist VALIDATION.md backfill | 6 phases (179–184) have MISSING VALIDATION.md; 3 phases (176–178) have PARTIAL (draft) status per MILESTONE-AUDIT.md; structural regression coverage protects future refactors | MEDIUM | 9 files; each derived from existing VERIFICATION.md observable truths tables; templated pattern |
| v0.7 SUMMARY.md frontmatter one-liner field | 5 v0.7 SUMMARY files missing `one-liner` frontmatter key (documented in PROJECT.md tech debt); affects extractDecisions/extractCostTiming IR extraction | LOW | Targeted fix; 5 files in `.planning/milestones/v0.7-phases/` |
| Cross-artifact consistency verification | Audit that every milestone's requirements file, roadmap entry, and MILESTONES.md entry agree on what shipped — detect class of drift before it accumulates into the next quality pass | MEDIUM | Could be a pde-tools health subcommand; walks all milestones and reports mismatches |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full Nyquist backfill for all 184 phases | "While we're fixing v0.22, let's do all phases" | Scope explosion — v0.1 through v0.21 have varying coverage; retroactive compliance for shipped work has diminishing returns; would consume entire milestone budget | Focus backfill on v0.22 (most recent, explicitly audited gap); establish going-forward policy |
| LLM-automated MILESTONES.md one-liner generation | "Just have the AI fill them all in automatically in one pass" | LLM will invent plausible-sounding descriptions rather than reading the actual SUMMARY.md files; the one-liners need to accurately describe what shipped | LLM-assisted per plan entry, verified against actual SUMMARY.md content |
| Global dead-code elimination sweep | Dead code is real debt | PDE is a plugin across 22 milestones; aggressive elimination risks removing code paths used only in specific product types or edge conditions not exercised in normal sessions | Scope to specific known-stale paths documented in PROJECT.md tech-debt section |
| Test coverage percentage targets | Tempting during hardening | PDE's test strategy is behavioral (Nyquist observable truths) not coverage-percent based; a coverage target adds tests that duplicate existing integration checks without improving actual regression detection | Ensure existing tests are green and VALIDATION.md assertions reflect current behavior |
| Rewriting stale docs sections for style | "These sections are wordy, let's clean them up" | Style rewrites introduce content drift risk; a quality pass should add missing accuracy, not change accurate content | Limit scope to known incorrect or missing data; never rewrite content that is factually correct |

---

## Feature Dependencies

```
[MILESTONES.md One-Liner Completion]
    └──read-from──> [Phase SUMMARY.md files in .planning/milestones/vX.X-phases/]

[Nyquist VALIDATION.md Backfill for v0.22]
    └──derives-from──> [Phase VERIFICATION.md observable truths tables]
                           └──all-complete-in──> [176–184 VERIFICATION.md files]

[REQUIREMENTS.md Checkbox Reconciliation]
    └──depends-on──> [Phase VERIFICATION.md pass/fail records]
    └──consumes──> [v0.22 MILESTONE-AUDIT.md requirements coverage table]

[buildCrossPatterns IR Field Fix]
    └──must-not-break──> [23 phase-184 tests (currently all passing)]
    └──updates──> [bin/lib/render-presentation.cjs buildCrossPatterns function]
    └──updates-mocks-in──> [tests/phase-184/portfolio-render.test.mjs]
    └──validates-against──> [actual IR shape from bin/lib/presentation.cjs buildPresentationIR]

[ROADMAP.md Status Update] ──standalone──> no dependencies
[Phase 180 VERIFICATION.md Status Fix] ──standalone──> single field change
```

### Dependency Notes

- **MILESTONES.md requires reading SUMMARY.md:** Each "One-liner:" entry must come from the actual plan SUMMARY.md; cannot be inferred from phase names alone. Source files are in `.planning/milestones/vX.X-phases/PHASE/PHASE-NN-SUMMARY.md`. Avoid reading all of them in a single pass — work milestone by milestone.
- **Nyquist backfill derives from VERIFICATION.md:** All v0.22 VERIFICATION.md files are complete (confirmed by MILESTONE-AUDIT.md). This makes v0.22 backfill tractable. Earlier milestone backfill is out of scope.
- **IR field fix must not regress 23 tests:** The `research.findings` → real field name fix must update both the implementation and the test mocks. The actual IR uses `research.topics` and `research.project_research_files` (confirmed from 176-VERIFICATION.md live IR output).

---

## MVP Definition

### Launch With (v0.23 milestone)

Minimum scope for the quality hardening milestone to deliver meaningful improvement.

- [ ] ROADMAP.md milestone status — mark v0.22 as shipped, update header from `🚧 In Progress` to `✅` with shipped date — why essential: the primary tracking document is factually wrong
- [ ] MILESTONES.md one-liner completion — fill all "One-liner:" placeholder entries with accurate summaries from SUMMARY.md files — why essential: MILESTONES.md feeds the portfolio synthesis IR; placeholder text corrupts `extractMilestoneHistory` output
- [ ] REQUIREMENTS.md checkbox reconciliation — check all boxes confirmed implemented by VERIFICATION.md — why essential: EXT-01 through EXT-10 explicitly flagged as tracking hygiene gap in 176-VERIFICATION.md
- [ ] Phase 180 VERIFICATION.md `status:` frontmatter fix — update from `gaps_found` to `passed` — why essential: explicitly listed in v0.22 MILESTONE-AUDIT.md tech debt section
- [ ] buildCrossPatterns research.findings field fix — align field name with actual IR shape; update tests — why essential: explicitly listed in v0.22 MILESTONE-AUDIT.md tech debt; silently produces empty output for all real PDE projects

### Add After Validation (v1.x)

- [ ] v0.22 Nyquist VALIDATION.md backfill — generate 6 missing + complete 3 draft files — trigger: after core data integrity fixes are merged and confirmed green
- [ ] v0.7 SUMMARY.md frontmatter one-liner field — add missing `one-liner:` key to 5 v0.7 summary files — trigger: during Nyquist pass, low effort addition

### Future Consideration (v2+)

- [ ] Cross-artifact consistency pde-tools health subcommand — defer: detection tooling is higher complexity and lower urgency than fixing known gaps
- [ ] Pre-v0.22 Nyquist backfill (v0.1–v0.21) — defer: diminishing returns for shipped work; v0.22 captures the highest-value gap

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| ROADMAP.md milestone status update | HIGH — primary tracking doc | LOW — text replacement | P1 |
| MILESTONES.md one-liner completion | HIGH — feeds portfolio IR | MEDIUM — ~40+ SUMMARY.md reads | P1 |
| REQUIREMENTS.md checkbox reconciliation | HIGH — compliance record | MEDIUM — systematic + judgment | P1 |
| Phase 180 VERIFICATION.md status fix | MEDIUM — audit accuracy | LOW — one field | P1 |
| buildCrossPatterns IR field fix | MEDIUM — output quality | MEDIUM — code + test update | P1 |
| v0.22 Nyquist VALIDATION.md backfill | MEDIUM — regression protection | MEDIUM — 9 files, templated | P2 |
| v0.7 SUMMARY.md frontmatter fix | LOW — graceful null exists | LOW — 5 files, one field each | P2 |
| Cross-artifact consistency tooling | LOW — automation of manual audit | MEDIUM | P3 |

---

## Issue Category Taxonomy for Quality Hardening

These categories emerged from direct inspection of the codebase; they are the recurring defect classes in large plugin codebases with rapid-iteration development.

### Category 1: Documentation State Drift

**What it is:** Tracking documents (ROADMAP.md, MILESTONES.md, STATE.md, REQUIREMENTS.md) fall out of sync with implementation during rapid shipping.

**How it happens:** Phases complete faster than tracking files get updated; VERIFICATION.md reports note the gap but the upstream tracking file is never amended.

**Examples in PDE:**
- ROADMAP.md v0.22 header still shows `🚧 In Progress`
- MILESTONES.md has 20+ "One-liner:" placeholders across v0.19–v0.22
- REQUIREMENTS.md EXT-01 through EXT-10 unchecked despite passing verification

**Detection method:** Grep for `One-liner:` in MILESTONES.md; check ROADMAP.md `🚧` markers against shipping dates; grep unchecked boxes in REQUIREMENTS.md files then cross-reference against VERIFICATION.md pass records.

**Complexity:** LOW to MEDIUM. Mechanical fix once located; MILESTONES.md requires reading source SUMMARY.md files.

### Category 2: Structural Verification Gaps (Nyquist Compliance)

**What it is:** Phases that shipped with complete code and passing VERIFICATION.md but without corresponding VALIDATION.md structural assertion files.

**How it happens:** Rapid shipping causes VALIDATION.md to be deferred or drafted only partially.

**Examples in PDE:**
- v0.22 MILESTONE-AUDIT.md documents: 6 phases (179–184) MISSING, 3 phases (176–178) PARTIAL
- Each VALIDATION.md requires extracting observable truths from VERIFICATION.md

**Detection method:** Walk phase directories; check for VALIDATION.md existence and `nyquist_compliant: true` frontmatter.

**Complexity:** MEDIUM. Each file is ~100–150 lines; pattern is mechanical once truths are extracted from VERIFICATION.md.

### Category 3: IR Shape Mismatches

**What it is:** Code written against a mock IR shape where the real IR evolved; runs without crashing due to graceful fallbacks but produces empty or wrong output silently.

**Examples in PDE:**
- `buildCrossPatterns` reads `research.findings` but real IR exposes `research.topics` and `research.project_research_files` — cross-patterns section always empty for real projects

**Detection method:** Compare field accesses in consumer modules (render-presentation.cjs, portfolio.cjs) against actual schema produced by presentation.cjs `buildPresentationIR`. Look for `|| []` or `|| {}` fallbacks on field accesses that suggest schema uncertainty.

**Complexity:** MEDIUM. Requires reading both producer schema and consumer code; test mock updates required alongside code fix.

### Category 4: Technical Debt Documented in PROJECT.md

**What it is:** Explicitly known issues listed in the "Known tech debt" section of PROJECT.md that have been deferred across multiple milestones.

**Current inventory:**
- 5 v0.7 SUMMARY files missing `one-liner` frontmatter field (non-breaking, graceful null)
- 3 human verification items for Phase 56 (live dependency detection, edge case quality, AC approval gate) — requires live session to verify
- 10 human verification items across Phases 58/59/61 (live hook auto-fire, dashboard E2E, real-time token display) — require active tmux session

**Note:** Human verification items requiring a live tmux session are out-of-scope for an automated hardening pass. The frontmatter field additions are in scope.

**Complexity:** LOW for frontmatter fixes; OUT OF SCOPE for live session verification items.

### Category 5: Integration Wiring Defects (Found and Fixed, Prevent Recurrence)

**What it is:** Producer→consumer slug/glob mismatches and missing registry entries that cause silent failures.

**Historical examples from v0.22 audit:**
- 4 stale persona slugs in present.md (`product-manager` → `pm-view`)
- Fallback auto-gen persona name wrong (`project-manager` → `project-manager-view`)
- PFL skill code missing from skill-registry.md

**These were fixed during v0.22 audit.** For v0.23 hardening, check for similar patterns in other workflows that handle persona/slug routing.

**Detection method:** Grep for slug literals in workflow files; cross-reference against the `personaDisplayName()` switch in render-presentation.cjs; cross-reference skill codes in commands/ against skill-registry.md.

**Complexity:** LOW per individual fix; MEDIUM for systematic detection across all workflow files.

---

## Sources

- Direct inspection: `.planning/ROADMAP.md` (v0.22 milestone status)
- Direct inspection: `.planning/MILESTONES.md` (One-liner placeholder count)
- Direct inspection: `.planning/STATE.md` (progress fields)
- Direct inspection: `.planning/PROJECT.md` (tech debt section, v0.23 target features)
- Direct inspection: `.planning/milestones/v0.22-MILESTONE-AUDIT.md` (Nyquist gaps, tech debt items)
- Direct inspection: `.planning/milestones/v0.22-phases/176-data-extraction-ir-foundation/176-VERIFICATION.md` (EXT checkbox gap)
- Direct inspection: `.planning/milestones/v0.22-phases/184-cross-project-portfolio-synthesis/184-VERIFICATION.md` (research.findings IR mismatch)
- WebSearch: "quality hardening pass large plugin codebase categories issues 2026" — [Code Quality in 2026: Best Practice, Metrics and Techniques](https://www.getpanto.ai/blog/code-quality) | [8 Code Quality Metrics Every Engineering Team Should Track](https://blog.codacy.com/code-quality-metrics)
- WebSearch: "technical debt cleanup categories plugin tooling dead code stale references 2025" — [What Is Dead Code? A Practical 2025 Guide for Engineering Leaders](https://axify.io/blog/dead-code) | [The Roadmap for Reducing Technical Debt in 2025](https://konghq.com/blog/learning-center/reducing-technical-debt)
- WebSearch: "code hardening milestone checklist user-facing polish error handling edge cases CLI tool 2025" — [Edge Cases and Error Handling: Where AI Code Falls Short](https://codefix.dev/2026/02/02/ai-coding-edge-case-fix/)

---

*Feature research for: PDE v0.23 Quality & Reliability Hardening*
*Researched: 2026-03-29*
