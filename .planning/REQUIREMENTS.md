# Requirements: Platform Development Engine

**Defined:** 2026-03-17
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v1.3 Requirements

Requirements for Self-Improvement & Design Excellence milestone. Each maps to roadmap phases.

### Quality Infrastructure

- [x] **QUAL-01**: Awwwards rubric reference file with 4-dimension scoring (Design 40%, Usability 30%, Creativity 20%, Content 10%) and concrete measurable criteria per score level (1-10)
- [x] **QUAL-02**: Motion design reference file with animation timing scales, easing curves (cubic-bezier + spring physics), scroll-driven effect techniques, GSAP 3.14 CDN patterns, and variable font axis animation
- [x] **QUAL-03**: Composition and typography reference file with grid systems (golden ratio, rule of thirds, modular), visual weight analysis, type pairing rationale with contrast documentation, spatial asymmetry principles, and APCA contrast checking
- [x] **QUAL-04**: Protected files mechanism (protected-files.json) prevents self-improvement agents from modifying quality rubric, core workflow logic, and bin/ scripts — with explicit allowed-write-directories list
- [x] **QUAL-05**: Model profile entries registered for all new agent types in bin/lib/model-profiles.cjs
- [x] **QUAL-06**: Skill registry entries (AUD, IMP, PRT) added to skill-registry.md

### Audit & Self-Improvement

- [x] **AUDIT-01**: `/pde:audit` command scans PDE commands, agents, templates, references, and agent prompts for quality gaps and produces structured report with severity levels (CRITICAL/HIGH/MEDIUM/LOW)
- [x] **AUDIT-02**: Auditor agent evaluates PDE artifacts against quality rubric in read-only mode, producing gap list with specific findings per artifact
- [x] **AUDIT-03**: Improver agent generates targeted fixes for audit findings — writes proposed changes to staging area (.planning/improvements/) with diff-style before/after
- [x] **AUDIT-04**: Validator agent checks proposed changes for format correctness, style-guide compliance, quality rubric coverage, and no regressions — returns structured PASS/FAIL with reasons
- [x] **AUDIT-05**: Self-improvement loop orchestration: Auditor → Improver → Validator → (if FAIL: Improver revises) → (if PASS: apply or queue for human review)
- [x] **AUDIT-06**: Apply mode: validated improvements can be applied directly to PDE files (with protected-files guard preventing writes to protected paths)
- [x] **AUDIT-07**: Tool effectiveness testing executes representative queries against Context7, evaluates agent prompt quality by sampling output, and tests template completeness — measuring actual output quality, not just availability
- [x] **AUDIT-08**: `pde-tools validate-skill` CLI command checks SKILL.md frontmatter YAML validity, allowed-tools list correctness, workflow path existence, skill code uniqueness, and required sections presence
- [ ] **AUDIT-09**: Audit produces before/after baseline measurements so improvement delta is quantifiable across audit runs
- [ ] **AUDIT-10**: Self-improvement fleet can identify skills that need new reference files and create them through the skill builder
- [ ] **AUDIT-11**: Fleet produces "PDE Health Report" — single-page summary of overall system health (tool availability, reference currency, skill quality scores) runnable as periodic quick check
- [x] **AUDIT-12**: Audit evaluates agent system prompts for specificity and quality — flags vague prompts that produce vague output with concrete improvement suggestions

### Skill Builder

- [ ] **SKILL-01**: `/pde:improve` create mode builds new skills from description — produces conforming SKILL.md with correct frontmatter, markdown content, and optional supporting files directory
- [ ] **SKILL-02**: `/pde:improve` improve mode evaluates existing skills against quality rubric, identifies specific deficiencies, and generates targeted enhancements (additive by default, full rewrite via --rewrite flag)
- [ ] **SKILL-03**: `/pde:improve` eval mode runs evaluation test cases against a skill's behavior, comparing output against rubric expectations and producing quality score with specific findings
- [ ] **SKILL-04**: Skill builder automatically runs validate-skill on all generated output and rejects invalid skills before presenting to user
- [ ] **SKILL-05**: Skill builder reads and enforces skill-style-guide.md and tooling-patterns.md as constraint references
- [ ] **SKILL-06**: Skill builder can create skills for PDE internals (commands/) AND for user projects (.claude/skills/)

### Design Quality Elevation — System Skill

- [ ] **SYS-01**: System skill produces motion tokens in DTCG transition format: duration scale (5+ steps from micro to dramatic), easing curves (ease-in, ease-out, ease-in-out, spring, bounce), delay tokens for choreography sequencing
- [ ] **SYS-02**: System skill generates variable font axis animation tokens: weight range, width range, optical size, and custom axes with recommended animation parameters
- [ ] **SYS-03**: System skill produces advanced OKLCH color palettes with perceptual harmony (analogous, complementary, split-complementary, triadic) — not random color selection
- [ ] **SYS-04**: System skill includes APCA-aware contrast checking guidance with Lc values for text readability at each type scale step
- [ ] **SYS-05**: System skill generates advanced spacing scale with optical spacing adjustments for different content density contexts (hero, content, dense UI)
- [ ] **SYS-06**: System skill produces type pairing recommendations with documented contrast rationale (serif + sans, geometric + humanist, etc.) — not just size contrast

### Design Quality Elevation — Wireframe Skill

- [ ] **WIRE-01**: Wireframe skill applies named grid systems (12-column, modular, golden ratio, asymmetric) with explicit rationale for grid choice per layout
- [ ] **WIRE-02**: Wireframe skill annotates visual weight distribution across each layout — showing where the eye is drawn and why
- [ ] **WIRE-03**: Wireframe skill uses spatial asymmetry intentionally: at least one axis breaks symmetry per page with documented purpose
- [ ] **WIRE-04**: Wireframe skill includes viewport-aware composition: distinct layout strategies for mobile (375), tablet (768), and desktop (1440) — not just fluid scaling
- [ ] **WIRE-05**: Wireframe skill documents content hierarchy with numbered visual priority (what users see 1st, 2nd, 3rd) per viewport

### Design Quality Elevation — Mockup Skill

- [ ] **MOCK-01**: Mockup skill produces CSS spring physics animations (using cubic-bezier approximations or GSAP CDN) for interactive elements — not linear/ease-only transitions
- [ ] **MOCK-02**: Mockup skill generates scroll-driven animations using @scroll-timeline with progressive enhancement fallback via @supports
- [ ] **MOCK-03**: Mockup skill includes micro-interaction states for every interactive element: default, hover, focus, active, loading, disabled, error — with distinct visual and motion treatment per state
- [ ] **MOCK-04**: Mockup skill choreographs entrance animations tied to content meaning — elements appear in narrative order, not all-at-once or random stagger
- [ ] **MOCK-05**: Mockup skill uses variable font features: weight animation on hover, optical size adjustment by context, width shifts for emphasis
- [ ] **MOCK-06**: Mockup skill includes at least one concept-specific "visual hook" — a distinctive interaction or visual element unique to the project concept, not a generic pattern
- [ ] **MOCK-07**: Mockup skill produces 60fps-capable animations: no layout thrashing, GPU-composited transforms and opacity, will-change hints where appropriate

### Design Quality Elevation — Critique & HIG Skills

- [ ] **CRIT-01**: Critique skill evaluates against Awwwards 4-dimension rubric with specific findings per dimension (Design, Usability, Creativity, Content) — not a generic checklist
- [ ] **CRIT-02**: Critique skill flags "AI aesthetic" patterns: generic gradients, symmetric grids, template-like interactions, stock typography — with specific remediation guidance
- [ ] **CRIT-03**: Critique skill assesses motion choreography quality: is motion purposeful and narrative, or decorative and random?
- [ ] **CRIT-04**: Critique skill evaluates typography pairing quality: is there documented contrast rationale, or just size differentiation?
- [ ] **HIG-01**: HIG skill audits motion accessibility: prefers-reduced-motion compliance, vestibular-safe alternatives for parallax/scroll effects
- [ ] **HIG-02**: HIG skill validates animation performance: identifies animations that cause layout reflow, checks for GPU-composited properties, flags jank risks
- [ ] **HIG-03**: HIG skill checks touch target sizing against motion state (expanded hit areas during transitions, no tapping during animation)

### Design Quality Elevation — Pipeline Order

- [ ] **ORDER-01**: Design elevation follows strict dependency order: system → wireframe → critique/iterate → mockup (upstream quality sets downstream ceiling)

### Design Quality Elevation — Handoff Skill

- [ ] **HAND-01**: Handoff skill includes motion specifications in component API output — each component's TypeScript interface documents expected animation behavior (duration, easing, trigger), not just static props
- [ ] **HAND-02**: Handoff skill generates implementation notes for concept-specific interactions (e.g., "this hero uses scroll-driven parallax — recommend GSAP ScrollTrigger or CSS @scroll-timeline")

### Design Quality Elevation — Flows Skill

- [ ] **FLOW-01**: Flows skill annotates transition animations between screens/states — not just what the next screen is, but how the user gets there visually (slide, fade, morph, shared-element)

### Cross-Cutting Elevation

- [ ] **CROSS-01**: All elevated design skills load new quality references via @ includes in required_reading — no structural changes to the 7-step skill anatomy
- [ ] **CROSS-02**: Elevation changes verified by running /pde:audit before and after each elevation phase to confirm measurable quality delta

### Pressure Test

- [ ] **PRES-01**: `/pde:pressure-test` command runs full 13-stage pipeline on a real product concept (not synthetic or PDE itself)
- [ ] **PRES-02**: Process compliance tier validates artifact existence, coverage flags, design-manifest.json completeness, and pipeline completion for all 13 stages
- [ ] **PRES-03**: Quality rubric tier evaluates each artifact against Awwwards criteria producing specific design findings per artifact — not just numeric scores
- [ ] **PRES-04**: Pressure test supports multiple entry-state fixtures: greenfield, partially-complete (5-8 stages done), and re-run of completed stage
- [ ] **PRES-05**: Pressure test produces structured report at .planning/pressure-test-report.md with pass/fail per tier, per-artifact findings, and actionable improvement recommendations
- [ ] **PRES-06**: Pressure test evaluates whether generated output avoids "AI aesthetic" tells: tests for concept-specific interactions, non-generic color choices, intentional asymmetry, and custom motion choreography

## Future Requirements

Deferred to v1.3.x or later. Tracked but not in current roadmap.

### Pipeline Quality Gates

- **GATE-01**: Per-stage quality gate hooks into each design pipeline stage (not just critique)
- **GATE-02**: Skill discovery scan identifies missing skills the audit recommends but don't exist
- **GATE-03**: Self-auditing pipeline with automated per-stage quality evaluation

### Distribution & CI

- **DIST-01**: CI/CD integration for automated skill quality checks on commit
- **DIST-02**: Cross-project skill registry for shared PDE-built skills

### Observability & Monitoring

- **OBS-01**: Optional tmux-based monitoring dashboard showing agent activity, pipeline progress, audit status, and system health in real-time split panes during PDE usage

## Out of Scope

| Feature | Reason |
|---------|--------|
| Fully autonomous self-modification without safeguards | Protected-files mechanism provides guardrails; fleet CAN apply improvements but cannot touch protected paths |
| Generic LLM quality metrics (BLEU, ROUGE) | Measure text similarity, not design quality — Awwwards rubric is domain-specific |
| Three.js/WebGL in mockup output | Mockups are handoff references — document as handoff implementation recommendations instead |
| Automated Awwwards submission | Judges detect automated submissions; goal is output quality, not submission |
| Continuous background self-improvement loop | Claude Code is session-based; explicit invocations (/pde:audit, /pde:improve) are the correct pattern |
| Skill versioning/rollback system | Git history already serves this function; unnecessary infrastructure |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| QUAL-01 | Phase 29 | Complete |
| QUAL-02 | Phase 29 | Complete |
| QUAL-03 | Phase 29 | Complete |
| QUAL-04 | Phase 29 | Complete |
| QUAL-05 | Phase 29 | Complete |
| QUAL-06 | Phase 29 | Complete |
| AUDIT-01 | Phase 30 | Complete |
| AUDIT-02 | Phase 30 | Complete |
| AUDIT-03 | Phase 30 | Complete |
| AUDIT-04 | Phase 30 | Complete |
| AUDIT-05 | Phase 30 | Complete |
| AUDIT-06 | Phase 30 | Complete |
| AUDIT-07 | Phase 30 | Complete |
| AUDIT-08 | Phase 30 | Complete |
| AUDIT-09 | Phase 30 | Pending |
| AUDIT-10 | Phase 30 | Pending |
| AUDIT-11 | Phase 30 | Pending |
| AUDIT-12 | Phase 30 | Complete |
| SKILL-01 | Phase 31 | Pending |
| SKILL-02 | Phase 31 | Pending |
| SKILL-03 | Phase 31 | Pending |
| SKILL-04 | Phase 31 | Pending |
| SKILL-05 | Phase 31 | Pending |
| SKILL-06 | Phase 31 | Pending |
| SYS-01 | Phase 32 | Pending |
| SYS-02 | Phase 32 | Pending |
| SYS-03 | Phase 32 | Pending |
| SYS-04 | Phase 32 | Pending |
| SYS-05 | Phase 32 | Pending |
| SYS-06 | Phase 32 | Pending |
| WIRE-01 | Phase 33 | Pending |
| WIRE-02 | Phase 33 | Pending |
| WIRE-03 | Phase 33 | Pending |
| WIRE-04 | Phase 33 | Pending |
| WIRE-05 | Phase 33 | Pending |
| MOCK-01 | Phase 35 | Pending |
| MOCK-02 | Phase 35 | Pending |
| MOCK-03 | Phase 35 | Pending |
| MOCK-04 | Phase 35 | Pending |
| MOCK-05 | Phase 35 | Pending |
| MOCK-06 | Phase 35 | Pending |
| MOCK-07 | Phase 35 | Pending |
| CRIT-01 | Phase 34 | Pending |
| CRIT-02 | Phase 34 | Pending |
| CRIT-03 | Phase 34 | Pending |
| CRIT-04 | Phase 34 | Pending |
| HIG-01 | Phase 34 | Pending |
| HIG-02 | Phase 34 | Pending |
| HIG-03 | Phase 34 | Pending |
| ORDER-01 | Phase 36 | Pending |
| HAND-01 | Phase 36 | Pending |
| HAND-02 | Phase 36 | Pending |
| FLOW-01 | Phase 36 | Pending |
| CROSS-01 | Phase 36 | Pending |
| CROSS-02 | Phase 36 | Pending |
| PRES-01 | Phase 37 | Pending |
| PRES-02 | Phase 37 | Pending |
| PRES-03 | Phase 37 | Pending |
| PRES-04 | Phase 37 | Pending |
| PRES-05 | Phase 37 | Pending |
| PRES-06 | Phase 37 | Pending |

**Coverage:**
- v1.3 requirements: 61 total
- Mapped to phases: 61
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after roadmap creation — all 61 requirements mapped*
