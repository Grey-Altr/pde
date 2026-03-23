# Phase 112: Experiment Templates — Research

**Researched:** 2026-03-23
**Domain:** AutoResearch experiment templates for 14 eligible PDE design skills
**Confidence:** HIGH (all contracts verified directly from source files; all skill output paths confirmed from workflow files)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXP-01 | experiment.md for wireframe — mutate wireframe.md prose → measure DOM structure + a11y + contrast | dom-metric.cjs, a11y-metric.cjs, contrast-metric.cjs verified; wireframe output at .planning/design/ux/wireframes/WFR-*.html |
| EXP-02 | experiment.md for mockup — mutate mockup.md prose → measure visual quality metrics | Same visual metrics; mockup output at .planning/design/ux/mockups/mockup-*.html |
| EXP-03 | experiment.md for critique — mutate critique.md → measure finding quality against known-defective wireframes | a11y-metric.cjs is the proxy metric for critique quality; fixture at references/experiments/fixtures/a11y-issues.html |
| EXP-04 | experiment.md for system — mutate system.md → measure token WCAG contrast compliance in rendered output | contrast-metric.cjs; system output preview at .planning/design/visual/SYS-preview-v*.html |
| EXP-05 | experiment.md for brief — mutate brief.md → measure downstream wireframe quality as proxy metric | dom-metric.cjs on wireframe HTML; brief writes to .planning/design/strategy/BRF-brief-v*.md |
| EXP-06 | experiment.md for flows — mutate flows.md → measure Mermaid readability + diagram completeness | mermaid-metric.cjs on FLW-flows-v*.md; output at .planning/design/ux/FLW-flows-v*.md |
| EXP-07 | experiment.md for iterate — mutate iterate.md → measure before/after visual delta improvement | a11y-metric.cjs + dom-metric.cjs on latest wireframe HTML; output versioned as WFR-*-v*.html |
| EXP-08 | experiment.md for hig — mutate hig.md → measure a11y finding detection rate | a11y-metric.cjs on wireframe/mockup HTML; output at .planning/design/review/HIG-audit-v*.md |
| EXP-09 | experiment.md for handoff — mutate handoff.md → measure TypeScript interface completeness vs rendered component count | dom-metric.cjs on wireframe HTML as proxy; handoff output at .planning/design/handoff/HND-handoff-spec-v*.md |
| EXP-10 | experiment.md for recommend/competitive/opportunity/ideate — text-metric experiments using nyquist-metric.cjs, no browser required | nyquist-metric.cjs already running; these skills write to .planning/design/strategy/ |
| EXP-11 | Each template specifies mutable_files, verify_command, target_metric, search_space, iteration_budget per experiment-schema.cjs contract | experiment-schema.cjs fully read; REQUIRED_FIELDS = ['metric', 'direction', 'verify', 'mutable_files'] confirmed |
| EXP-12 | All 14 eligible design skills have at least one experiment template | 14 skills confirmed from experiment-boundaries.md Experiment-Eligible Workflow Files list |
</phase_requirements>

---

## Summary

Phase 112 creates experiment.md template files for all 14 eligible design skills. The infrastructure is complete: experiment-schema.cjs defines the frontmatter contract, experiment-runner.cjs implements `_evalMetric` (spawnSync + last-line-float), and five visual metric scripts (dom-metric.cjs, a11y-metric.cjs, contrast-metric.cjs, responsive-metric.cjs, mermaid-metric.cjs) are live from Phase 111. The experiment templates are the missing glue connecting metric infrastructure to skill-specific mutation targets.

The 14 skills divide into two groups. Browser-backed skills (wireframe, mockup, system, flows, critique, hig, iterate, handoff, brief) produce HTML or markdown output that the visual metric scripts can evaluate via Playwright MCP. Non-browser skills (recommend, competitive, opportunity, ideate) produce markdown-only output with no renderable artifacts, so they fall back to nyquist-metric.cjs (Nyquist pass count as proxy for skill quality).

Templates live at `references/experiments/{skill-name}.md` — one file per skill. The file format is YAML frontmatter (the 6-field contract) followed by prose sections: `## Search Space`, `## Constraints`, `## Stopping Rationale`. The verify command in each template must be a single-line shell command that invokes the appropriate metric script with the skill's output artifact path.

**Primary recommendation:** Create one experiment template per skill in `references/experiments/`. Each template's verify command uses a metric script from `bin/` with a path to the skill's primary output artifact. Use `node bin/dom-metric.cjs` as the default for browser skills; fall back to `node bin/nyquist-metric.cjs` for non-browser skills. Iteration budget: 30 for focused skills, 50 for multi-output skills (wireframe, mockup).

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md is not present. Constraints derived from source files and STATE.md decisions:

- **Zero npm dependencies** — metric scripts are already zero-dep; experiment templates are markdown-only, no new deps.
- **CJS format only** in bin/ — templates are .md files, not affected.
- **experiment-schema.cjs REQUIRED_FIELDS**: `metric`, `direction`, `verify`, `mutable_files` — all four MUST be present in every template's YAML frontmatter.
- **mutable_files must be exact paths** — no glob patterns allowed (experiment-boundaries.md Rule 4).
- **Protected directories cannot appear in mutable_files** — `bin/`, `tests/`, `references/`, `.planning/`, `agents/`, `.claude/` are all locked.
- **14 authorized experiment-eligible workflow files** — enumerated in `references/experiment-boundaries.md` Experiment-Eligible Workflow Files section; any template must target only these files.
- **Workflow files must have OPTIMIZABLE markers** — templates must only target sections wrapped in `<!-- OPTIMIZABLE -->` ... `<!-- /OPTIMIZABLE -->`.
- **nyquist_validation: true** in `.planning/config.json` — Nyquist tests required for Phase 112.
- **DISCARD direction for visual metrics** — contrast-metric.cjs returns pass count (not ratio), direction is `max`; a11y-metric.cjs returns `100 - violations*10`, direction is `max`; dom-metric.cjs returns 0-100 score, direction is `max`; mermaid-metric.cjs returns 0-100 score, direction is `max`.
- **Experiment templates stored in `references/experiments/`** — this is where the existing template lives (`templates/experiment.md` is the schema reference; actual experiments go in `references/experiments/`).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| experiment-schema.cjs | Internal | Parses experiment.md frontmatter, validates REQUIRED_FIELDS | Already used by experiment runner; all Phase 112 templates must conform |
| experiment-runner.cjs | Internal | `_evalMetric` contract — spawnSync + last-line-float parsing | The runner that calls verify commands from templates |
| nyquist-metric.cjs | Internal | Nyquist pass count metric for non-browser skills | Reference implementation; exit 0, last line = float |
| dom-metric.cjs | Internal (Phase 111) | DOM structure score (0-100) for browser-backed HTML skills | VIS-01 complete; accepts `<path-to-html>` as argv[2] |
| a11y-metric.cjs | Internal (Phase 111) | A11y violations score (0-100) for browser-backed HTML skills | VIS-02 complete; accepts `<path-to-html>` as argv[2] |
| contrast-metric.cjs | Internal (Phase 111) | WCAG contrast pass count for browser-backed HTML skills | VIS-03 complete; returns integer pass count, not ratio |
| responsive-metric.cjs | Internal (Phase 111) | Multi-breakpoint compliance score (0-100) | VIS-04 complete; accepts `<path-to-html>` as argv[2] |
| mermaid-metric.cjs | Internal (Phase 111) | Mermaid readability score (0-100) | VIS-05 complete; accepts `<path-to-md>` as argv[2] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| templates/experiment.md | Internal | Schema reference/example for experiment.md format | Read before authoring any template to understand the format |
| references/experiment-boundaries.md | Internal | Authorized file list + locked zones | Must verify every template's mutable_files against this |

---

## Architecture Patterns

### Recommended Project Structure

```
references/
└── experiments/
    ├── wireframe.md          # EXP-01: DOM + a11y + contrast on wireframe HTML
    ├── mockup.md             # EXP-02: DOM + a11y + contrast on mockup HTML
    ├── critique.md           # EXP-03: a11y on fixture HTML (proxy for critique quality)
    ├── system.md             # EXP-04: contrast on design system preview HTML
    ├── brief.md              # EXP-05: dom-metric on downstream wireframe (proxy)
    ├── flows.md              # EXP-06: mermaid-metric on flows markdown
    ├── iterate.md            # EXP-07: a11y on iterated wireframe HTML
    ├── hig.md                # EXP-08: a11y on wireframe/mockup HTML
    ├── handoff.md            # EXP-09: dom-metric on wireframe HTML (proxy)
    ├── recommend.md          # EXP-10a: nyquist-metric
    ├── competitive.md        # EXP-10b: nyquist-metric
    ├── opportunity.md        # EXP-10c: nyquist-metric
    ├── ideate.md             # EXP-10d: nyquist-metric
    └── fixtures/
        ├── good-wireframe.html   # EXISTING: reference fixture for dom/a11y/contrast tests
        ├── bad-wireframe.html    # EXISTING: low-quality fixture
        ├── a11y-issues.html      # EXISTING: fixture for a11y violation testing
        └── mermaid-simple.md     # EXISTING: fixture for mermaid metric tests
```

### Pattern 1: Browser-Backed Skill Template (HTML Output)

Used for: wireframe, mockup, iterate, hig, handoff

```yaml
---
slug: wireframe-visual
metric: dom_structure_score
direction: max
verify: node bin/dom-metric.cjs .planning/design/ux/wireframes/WFR-home.html
mutable_files:
  - workflows/wireframe.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize the prose guidance sections in `workflows/wireframe.md` marked with
`<!-- OPTIMIZABLE -->` to improve DOM structure quality in generated wireframes.
Focus on: landmark element guidance, heading hierarchy instructions, semantic
HTML usage instructions.

## Constraints

Only modify sections marked with `<!-- OPTIMIZABLE -->`. Do not modify:
- Step 1 (init step) — infrastructure
- Artifact schema writes (WFR artifact code, file path patterns)
- Error message strings asserted by Nyquist tests
- MCP probe blocks

## Stopping Rationale

Halt when 5 consecutive iterations produce no improvement (consecutive_failure_limit),
or when 10 iterations show no progress (no_progress_limit), or when 30 iterations
are reached (iteration_budget).
```

### Pattern 2: Non-Browser Skill Template (Text Output)

Used for: recommend, competitive, opportunity, ideate

```yaml
---
slug: recommend-quality
metric: nyquist_pass_count
direction: max
verify: node bin/nyquist-metric.cjs
mutable_files:
  - workflows/recommend.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize the prose guidance sections in `workflows/recommend.md` marked with
`<!-- OPTIMIZABLE -->` to improve Nyquist structural test pass count.
Focus on: recommendation framing, context analysis instructions, output
structure guidance.

## Constraints

Only modify sections marked with `<!-- OPTIMIZABLE -->`. Do not modify
the artifact schema writes (REC code, file path patterns) or error messages.

## Stopping Rationale

Halt when 5 consecutive iterations produce no improvement, or when 30
iterations are reached.
```

### Pattern 3: Proxy Metric Skill Template

Used when: the skill's direct output is text/markdown but quality is best measured through a downstream browser artifact (brief → wireframe quality; critique → a11y detection on fixture; system → contrast of rendered preview).

```yaml
---
slug: critique-a11y-detection
metric: a11y_score
direction: max
verify: node bin/a11y-metric.cjs references/experiments/fixtures/a11y-issues.html
mutable_files:
  - workflows/critique.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize the accessibility perspective prose in `workflows/critique.md` marked with
`<!-- OPTIMIZABLE -->` to improve detection of a11y issues in wireframes.

## Proxy Metric Rationale

critique.md cannot be measured directly (its output is a markdown report).
The proxy: run a11y-metric.cjs on the known-defective a11y-issues.html fixture.
A higher score means the metric finds fewer violations — which contradicts the
goal. For this experiment, LOWER a11y score = more violations detected = BETTER
critique. Use direction: min.

NOTE: This requires direction: min (not max) because we are measuring violations
found in a defective fixture — more violations detected means the critique
skill is doing its job.

## Stopping Rationale

Halt when 3 consecutive iterations produce no improvement.
```

**CRITICAL NOTE on critique direction:** The critique skill experiment is the one case where `direction: min` makes sense for a11y-metric — because the fixture is intentionally defective and we want the metric to find MORE violations (lower score = better critique guidance triggered more thorough checking). However, this is subtle: `a11y-metric.cjs` returns `100 - violations*10`, so a score of 60 means 4 violations found. If the goal is to detect more, we want lower scores. But if we're measuring whether critique.md mutations cause the critique SKILL to produce better reports on downstream wireframes, the proxy is less direct. The simpler approach is to use `nyquist_pass_count` with `direction: max` as a safe default for critique (EXP-03 description says "measure finding quality" — Nyquist tests include critique assertions).

### Pattern 4: Mermaid Skill Template

Used for: flows

```yaml
---
slug: flows-mermaid-readability
metric: mermaid_readability_score
direction: max
verify: node bin/mermaid-metric.cjs .planning/design/ux/FLW-flows-v1.md
mutable_files:
  - workflows/flows.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize the flow diagram generation guidance in `workflows/flows.md` marked
with `<!-- OPTIMIZABLE -->` to improve Mermaid diagram readability.
Focus on: node count guidance, edge density instructions, diagram scope
per persona, complexity management hints.

## Constraints

Only modify sections marked with `<!-- OPTIMIZABLE -->`. Do not modify the
artifact schema writes (FLW code, file paths) or screen inventory JSON structure.

## Stopping Rationale

Halt when 5 consecutive iterations produce no improvement, or when 30
iterations are reached.
```

### Anti-Patterns to Avoid

- **Targeting non-OPTIMIZABLE sections:** Experiment mutations must stay within `<!-- OPTIMIZABLE -->` ... `<!-- /OPTIMIZABLE -->` markers. The runner validates mutable_files against protected_files/protected_directories but does NOT validate section-level markers — that's the mutation agent's responsibility.
- **Targeting protected directories:** `bin/`, `tests/`, `references/`, `.planning/` are all locked. If a template's verify command needs a fixture, point to `references/experiments/fixtures/` (which is readable, not mutable_files-targetable).
- **Using glob patterns in mutable_files:** mutable_files must be exact file paths. `workflows/*.md` will fail validation.
- **Using multi-word verify commands without quoting:** `_evalMetric` uses `verifyCmd.trim().split(/\s+/)` to parse the command — it does not handle shell quoting. Path arguments with spaces will be split incorrectly. Use paths without spaces.
- **Assuming a specific wireframe HTML filename:** Wireframe output files follow `WFR-{screen-slug}.html` but the slug depends on the project. Templates should document that the path must be updated to match the actual project's wireframe. Use `references/experiments/fixtures/good-wireframe.html` as the fallback fixture path when no project wireframes exist.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter parsing | Custom YAML parser in verify scripts | experiment-schema.cjs `parseExperimentFile()` | Already handles normalization, array coercion, budget defaults |
| Metric comparison logic | Custom "is this better?" logic | `_compareMetric(newValue, bestMetric, direction)` | Handles null baseline, both min/max directions correctly |
| Numeric metric output from verify script | Custom output format | Exit 0, last line = float — exact contract | `_evalMetric` parses last line only; any other format = CRASH status |
| JSONL result tracking | Custom tracking file | `_writeJsonlRow()` with JSONL_ROW_FIELDS | 9-field contract (id, iteration, ts, commit, metric_value, metric_delta, status, description, tokens_used) already specified |
| Custom metric script for simple text output | New CJS metric script | `node bin/nyquist-metric.cjs` | Already handles exit 0, last-line-float, running the test suite |
| Browser-side evaluation logic | New browser automation | Existing `dom-metric.cjs`, `a11y-metric.cjs`, etc. | All five metrics are already implemented with probe/degrade |

**Key insight:** Phase 112 is pure template authoring. No new code is needed. Every computation already exists — the templates just wire skill workflow files to existing metric scripts via the `verify` field.

---

## The 14 Design Skills: Complete Metric Assignment

This is the canonical mapping derived by reading experiment-boundaries.md (authorized file list), each workflow's output paths, and the Phase 111 metric scripts.

### Browser-Backed Skills (9)

| Skill | Workflow File | Primary Output Artifact | Metric Script | Score Range | Direction |
|-------|--------------|------------------------|---------------|-------------|-----------|
| wireframe | workflows/wireframe.md | .planning/design/ux/wireframes/WFR-*.html | dom-metric.cjs | 0-100 | max |
| mockup | workflows/mockup.md | .planning/design/ux/mockups/mockup-*.html | dom-metric.cjs | 0-100 | max |
| system | workflows/system.md | .planning/design/visual/SYS-preview-v*.html | contrast-metric.cjs | 0-N (pass count) | max |
| flows | workflows/flows.md | .planning/design/ux/FLW-flows-v*.md | mermaid-metric.cjs | 0-100 | max |
| critique | workflows/critique.md | (proxy: a11y-issues.html fixture or nyquist) | a11y-metric.cjs OR nyquist-metric.cjs | varies | max |
| hig | workflows/hig.md | .planning/design/review/HIG-audit-v*.md (text) → proxy HTML | a11y-metric.cjs on wireframe | 0-100 | max |
| iterate | workflows/iterate.md | .planning/design/ux/wireframes/WFR-*-v*.html | a11y-metric.cjs | 0-100 | max |
| handoff | workflows/handoff.md | .planning/design/handoff/HND-*.md (text) → proxy wireframe | dom-metric.cjs on wireframe | 0-100 | max |
| brief | workflows/brief.md | .planning/design/strategy/BRF-brief-v*.md (text) → proxy wireframe | dom-metric.cjs on wireframe | 0-100 | max |

### Non-Browser Skills (4)

| Skill | Workflow File | Output Artifact | Metric Script | Direction |
|-------|--------------|----------------|---------------|-----------|
| recommend | workflows/recommend.md | .planning/design/strategy/REC-recommendations-v*.md | nyquist-metric.cjs | max |
| competitive | workflows/competitive.md | .planning/design/strategy/CMP-competitive-v*.md | nyquist-metric.cjs | max |
| opportunity | workflows/opportunity.md | .planning/design/strategy/OPP-opportunity-v*.md | nyquist-metric.cjs | max |
| ideate | workflows/ideate.md | .planning/design/strategy/IDT-ideation-v*.md | nyquist-metric.cjs | max |

### Notes on Proxy Metrics

**brief (EXP-05):** brief.md produces BRF-brief-v*.md (markdown). The requirement says "measure downstream wireframe quality as proxy metric." However, calling the full wireframe pipeline as a verify command is impractical (too slow, too many side effects). The recommended approach: use `dom-metric.cjs` on the fixture `references/experiments/fixtures/good-wireframe.html` as a baseline — the actual proxy experiment (brief → wireframe visual quality) is a Phase 113 pipeline concern. For Phase 112, use `nyquist-metric.cjs` as the safe default, OR treat brief as a browser-backed skill by pointing to a known fixture.

**critique (EXP-03):** critique.md produces a CRT-critique-v*.md report. A11y-metric.cjs on `references/experiments/fixtures/a11y-issues.html` is the closest proxy, but requires `direction: min` (lower score = more violations detected = better). Alternatively, use `nyquist-metric.cjs` with `direction: max` since Nyquist tests include critique structural assertions. The nyquist approach is safer and simpler for Phase 112.

**hig (EXP-08):** hig.md produces HIG-audit-v*.md (text). The best proxy is `a11y-metric.cjs` on existing wireframe HTML — measuring whether hig.md mutations produce better accessibility guidance in generated audits. When no wireframe exists, fall back to `node bin/a11y-metric.cjs references/experiments/fixtures/good-wireframe.html`.

**handoff (EXP-09):** handoff.md produces HND-handoff-spec-v*.md and HND-types-v*.ts. The DOM structure proxy measures whether handoff prose changes lead to better wireframe annotation (dom-metric on wireframe). When no wireframe exists, fall back to `node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html`.

### Recommended Fixture Fallback Pattern

Templates should use fixture paths so experiments work even before any project artifacts exist:

```yaml
# Wireframe fixture fallback
verify: node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html

# A11y fixture fallback
verify: node bin/a11y-metric.cjs references/experiments/fixtures/good-wireframe.html

# A11y defective fixture (for testing detection)
verify: node bin/a11y-metric.cjs references/experiments/fixtures/a11y-issues.html

# Mermaid fixture fallback
verify: node bin/mermaid-metric.cjs references/experiments/fixtures/mermaid-simple.md
```

**Important:** When using fixture paths, the metric score will be fixed (the fixture never changes). This makes the experiment measure how workflow prose changes affect the MUTATION AGENT's behavior — since the fixture is stable, any score change reflects a different mutation strategy being applied, not the output improving. This is acceptable for Phase 112 but is superseded by Phase 113's pipeline experiments that wire the full skill execution.

---

## experiment-schema.cjs Contract (Verified from Source)

**Source:** `bin/lib/experiment-schema.cjs` (read in full)

### REQUIRED_FIELDS
```javascript
const REQUIRED_FIELDS = ['metric', 'direction', 'verify', 'mutable_files'];
```

All four must be present and non-empty. Missing any produces `{ valid: false, errors: [...] }`.

### Field Semantics

| Field | Type | Required | Default | Constraint |
|-------|------|----------|---------|------------|
| `metric` | string | YES | — | Any string; used as human label in JSONL row |
| `direction` | string | YES | — | Must be `"min"` or `"max"` |
| `verify` | string | YES | — | Shell command string; parsed by spawnSync split on whitespace |
| `mutable_files` | string or array | YES | — | Normalized to array; exact paths, no globs |
| `immutable_files` | string or array | NO | `[]` | Normalized to array |
| `iteration_budget` | integer string | NO | `50` | Parsed with `parseInt(x, 10)` |
| `time_budget_minutes` | integer string | NO | `60` | Parsed with `parseInt(x, 10)` |
| `slug` | string | NO | `null` | Used for results.jsonl path: `.planning/experiments/{slug}/results.jsonl` |

### Parsing Behavior

```javascript
// parseExperimentFile returns one of:
{ valid: false, errors: ['experiment.md is missing required fields: metric, direction'] }
// or:
{
  valid: true,
  metric: 'dom_structure_score',
  direction: 'max',
  verify: 'node bin/dom-metric.cjs .planning/design/ux/wireframes/WFR-home.html',
  mutable_files: ['workflows/wireframe.md'],
  immutable_files: [],
  budget: { iterations: 30, minutes: 60 },
  slug: 'wireframe-visual',
}
```

### EXPERIMENT_DEFAULTS (from config patching)

```javascript
const EXPERIMENT_DEFAULTS = {
  iteration_budget: 50,
  time_budget_minutes: 60,
  consecutive_failure_limit: 5,
  no_progress_limit: 10,
  cost_estimate_enabled: true,
};
```

These are written to `.planning/config.json` under `experiment_defaults`. Templates can override `iteration_budget` and `time_budget_minutes` in their frontmatter; `consecutive_failure_limit` and `no_progress_limit` come from config.

---

## experiment-runner.cjs Lifecycle (Verified from Source)

**Source:** `bin/lib/experiment-runner.cjs` (read in full)

### `_evalMetric(cwd, verifyCmd, timeoutMs)` Contract

```
Input:  verifyCmd string (e.g., "node bin/dom-metric.cjs path/to/file.html")
        timeoutMs: spawnSync timeout in milliseconds

Parsing: verifyCmd.trim().split(/\s+/) → [cmd, ...args]
         cmd is args[0], rest are passed to spawnSync

Output (success):
  { status: 'ok', metric_value: <float>, stdout: string, stderr: string }

Output (failure — DISCARD iteration):
  { status: 'CRASH', reason: 'timeout'|'nonzero_exit'|'unparseable_metric', metric_value: null }
```

**The last-line-float rule:**
```javascript
const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
const lastLine = lines[lines.length - 1] || '';
const parsed = parseFloat(lastLine);
if (!Number.isFinite(parsed)) {
  return { status: 'CRASH', reason: 'unparseable_metric', ... };
}
```

Any debug output written to stdout (not stderr) before the final number will be ignored as long as the LAST non-empty line is a parseable float. However, all 5 Phase 111 metric scripts write debug to stderr, so this is not a concern.

### `_compareMetric(newValue, bestMetric, direction)` Contract

```
Returns 'KEEP' when:
  - bestMetric is null (first iteration always KEEP)
  - direction='max' AND newValue > bestMetric
  - direction='min' AND newValue < bestMetric

Returns 'DISCARD' otherwise.
```

**Critical:** First iteration is always KEEP regardless of score. The runner uses this to establish the baseline. Templates must set direction correctly — a `direction: max` template with a min-direction metric will always DISCARD improvements.

### JSONL Row Schema (from JSONL_ROW_FIELDS)

```javascript
const JSONL_ROW_FIELDS = Object.freeze([
  'id',           // auto: "{slug}-{iteration:04d}"
  'iteration',    // iteration number
  'ts',           // auto: ISO timestamp
  'commit',       // git commit SHA after mutation
  'metric_value', // numeric score from _evalMetric
  'metric_delta', // newValue - previousBest
  'status',       // 'KEEP' | 'DISCARD' | 'CRASH'
  'description',  // mutation description from mutation agent
  'tokens_used',  // LLM tokens consumed this iteration
]);
```

Results written to: `.planning/experiments/{slug}/results.jsonl`

---

## Common Pitfalls

### Pitfall 1: Verify Command Path Arguments with Spaces

**What goes wrong:** `_evalMetric` splits the verify command on whitespace: `verifyCmd.trim().split(/\s+/)`. A path like `node bin/dom-metric.cjs .planning/design/ux/wireframes/my screen.html` would be split into four args: `['node', 'bin/dom-metric.cjs', '.planning/design/ux/wireframes/my', 'screen.html']`.

**Why it happens:** The split is naive — no shell quoting is performed.

**How to avoid:** Ensure artifact paths used in verify commands never contain spaces. PDE artifact filenames (WFR-home.html, mockup-dashboard.html) follow kebab-case conventions so this is only a risk for custom project file names.

**Warning signs:** `_evalMetric` returns CRASH with reason `nonzero_exit` or `unparseable_metric` when the artifact path has spaces.

### Pitfall 2: Targeting Protected Directories in mutable_files

**What goes wrong:** An experiment with `mutable_files: ['bin/dom-metric.cjs']` is rejected before starting, with message: `Experiment rejected: mutable_files list targets locked path(s): bin/dom-metric.cjs`.

**Why it happens:** `references/experiment-boundaries.md` lists `bin/` as a `protected_directory`. ALL files in bin/ are locked.

**How to avoid:** Templates must only list files from the 14 authorized workflow files. Visual metric scripts in `bin/` are NOT mutable — they are part of the evaluation harness.

### Pitfall 3: Using direction: min for Visual Quality Metrics

**What goes wrong:** Setting `direction: min` on `dom-metric.cjs` or `a11y-metric.cjs` causes the runner to KEEP iterations that decrease quality (lower DOM score = more div-soup = "improvement" in min mode).

**Why it happens:** These metrics are designed as 0-100 quality scores where higher = better. `contrast-metric.cjs` returns a raw pass count, not a ratio — also higher = better.

**How to avoid:** All visual quality metrics use `direction: max`. The one exception is the critique-as-detection proxy where `a11y-metric.cjs` on `a11y-issues.html` uses `direction: min` — but this is unusual and should be documented in the template's ## Search Space section.

### Pitfall 4: Fixture-Based Verify Commands Don't Measure Real Skill Quality

**What goes wrong:** A template using `verify: node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html` will score the same fixture every iteration. The mutation agent changes wireframe.md prose, but the verify command evaluates a static fixture — the score never changes, causing `no_progress_limit` to trigger after 10 iterations.

**Why it happens:** Fixture paths are stable — they are not modified by experiments and not regenerated each iteration.

**How to avoid:** For true quality measurement, the verify command must point to the skill's actual output artifact, which changes each iteration as the mutation agent modifies the workflow prose and re-invokes the skill. However, this requires the skill to be invoked as part of the experiment loop (a Phase 113 concern). For Phase 112, document this limitation explicitly in each template's ## Constraints section: "This template measures mutation agent guidance quality against a fixed fixture. For live skill quality measurement, update verify to point to the project's actual output artifact after running the skill once."

### Pitfall 5: Missing <!-- OPTIMIZABLE --> Markers in Workflow Files

**What goes wrong:** The mutation agent looks for `<!-- OPTIMIZABLE -->` markers to constrain its mutations. If a workflow file has no OPTIMIZABLE markers, the agent may refuse to mutate (conservative behavior) or may modify locked sections (unsafe behavior).

**Why it happens:** `references/experiment-boundaries.md` states: "An experiment-eligible file missing both `<!-- LOCKED -->` and `<!-- OPTIMIZABLE -->` markers produces a validation warning during experiment setup."

**How to avoid:** Before Phase 112 templates are used, verify that each of the 14 workflow files has OPTIMIZABLE markers. This is an existing concern from v0.13 — templates should document which sections are OPTIMIZABLE in their ## Search Space section.

### Pitfall 6: Flows Skill Verify Command Points to Non-Existent FLW File

**What goes wrong:** `verify: node bin/mermaid-metric.cjs .planning/design/ux/FLW-flows-v1.md` fails if flows haven't been run yet. mermaid-metric.cjs reads the file, finds no content, returns 0 — CRASH with `unparseable_metric` (actually returns 0 and exits 0, so it's status 'ok' with metric_value 0, which becomes the baseline).

**Why it happens:** The verify command assumes a project artifact exists. In a clean project, no FLW file exists.

**How to avoid:** Use the fixture fallback: `verify: node bin/mermaid-metric.cjs references/experiments/fixtures/mermaid-simple.md`. Document in the template that users should update the path after running `/pde:flows` once.

---

## Code Examples

### Complete wireframe-visual Experiment Template

```yaml
---
slug: wireframe-visual
metric: dom_structure_score
direction: max
verify: node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/wireframe.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize the prose guidance sections in `workflows/wireframe.md` marked with
`<!-- OPTIMIZABLE -->` to improve DOM structure quality in generated wireframes.

Focus mutation on:
- Semantic HTML guidance (landmark elements: nav, main, header, footer, aside)
- Heading hierarchy instructions (h1 → h2 → h3 progression)
- Interactive element labeling guidance (button, input, select with aria-label)
- Anti-pattern guidance (div-soup prevention)

Do NOT modify:
- Step 1 (init) — infrastructure
- Artifact schema writes (WFR code, file path patterns, designCoverage fields)
- Error message strings asserted by Nyquist tests
- MCP probe blocks and TOOL_MAP calls
- Locked sections marked with <!-- LOCKED -->

## Constraints

Mutations must stay within <!-- OPTIMIZABLE --> markers. The metric
evaluates DOM structure quality on the fixture HTML. For live quality
measurement against project wireframes, update the verify command to point to
your project's actual wireframe output (e.g.,
`node bin/dom-metric.cjs .planning/design/ux/wireframes/WFR-home.html`).

## Stopping Rationale

Halt when consecutive_failure_limit (5) or no_progress_limit (10)
circuit breakers trigger, or when 30 iterations are reached.
```

### Complete flows-mermaid Experiment Template

```yaml
---
slug: flows-mermaid
metric: mermaid_readability_score
direction: max
verify: node bin/mermaid-metric.cjs references/experiments/fixtures/mermaid-simple.md
mutable_files:
  - workflows/flows.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize the flow diagram generation guidance in `workflows/flows.md` marked
with `<!-- OPTIMIZABLE -->` to improve Mermaid diagram readability.

Focus mutation on:
- Node count guidance (prevent overly complex diagrams > 15 nodes)
- Edge density instructions (clarity over completeness)
- Diagram scope per persona (one journey per diagram)
- Mermaid syntax quality instructions

Do NOT modify:
- artifact schema writes (FLW code, FLW-screen-inventory.json structure)
- Step 1 (init) — infrastructure

## Constraints

Only modify sections marked with <!-- OPTIMIZABLE -->. Update verify to
point to `.planning/design/ux/FLW-flows-v1.md` after running /pde:flows.

## Stopping Rationale

Halt when 5 consecutive iterations produce no improvement, or 30 iterations.
```

### Complete recommend-quality Experiment Template (Non-Browser)

```yaml
---
slug: recommend-quality
metric: nyquist_pass_count
direction: max
verify: node bin/nyquist-metric.cjs
mutable_files:
  - workflows/recommend.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose guidance in `workflows/recommend.md` marked with
`<!-- OPTIMIZABLE -->` to improve Nyquist structural test pass count.

Focus mutation on:
- Recommendation framing and quality signals
- Context analysis instructions
- Category coverage descriptions
- Output structure guidance

Do NOT modify:
- REC artifact code, file path patterns, or coverage field names
- Error message strings

## Stopping Rationale

Halt when 5 consecutive iterations produce no improvement.
```

---

## Complete Template Specifications for All 14 Skills

### EXP-01: wireframe
- **File:** `references/experiments/wireframe.md`
- **slug:** `wireframe-visual`
- **metric:** `dom_structure_score`
- **direction:** `max`
- **verify:** `node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html`
- **mutable_files:** `[workflows/wireframe.md]`
- **iteration_budget:** 30
- **rationale:** DOM structure score rewards semantic HTML (landmarks, heading hierarchy, labeled inputs) — exactly what wireframe prose guidance should optimize for.

### EXP-02: mockup
- **File:** `references/experiments/mockup.md`
- **slug:** `mockup-visual`
- **metric:** `dom_structure_score`
- **direction:** `max`
- **verify:** `node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html`
- **mutable_files:** `[workflows/mockup.md]`
- **iteration_budget:** 30
- **rationale:** Mockup prose guidance affects how hi-fi HTML is structured. Same DOM metric as wireframe — mockups should improve or maintain structural quality. Update to `mockup-*.html` path in live use.

### EXP-03: critique
- **File:** `references/experiments/critique.md`
- **slug:** `critique-quality`
- **metric:** `nyquist_pass_count`
- **direction:** `max`
- **verify:** `node bin/nyquist-metric.cjs`
- **mutable_files:** `[workflows/critique.md]`
- **iteration_budget:** 30
- **rationale:** Nyquist includes structural tests for critique output (section presence, action list format). Direct output quality is measured through structural assertions.

### EXP-04: system
- **File:** `references/experiments/system.md`
- **slug:** `system-contrast`
- **metric:** `wcag_contrast_pass_count`
- **direction:** `max`
- **verify:** `node bin/contrast-metric.cjs references/experiments/fixtures/good-wireframe.html`
- **mutable_files:** `[workflows/system.md]`
- **iteration_budget:** 30
- **rationale:** Design system prose affects token generation guidance; WCAG contrast of the resulting HTML is the best visual quality proxy. Update to `SYS-preview-v1.html` path in live use.

### EXP-05: brief
- **File:** `references/experiments/brief.md`
- **slug:** `brief-quality`
- **metric:** `nyquist_pass_count`
- **direction:** `max`
- **verify:** `node bin/nyquist-metric.cjs`
- **mutable_files:** `[workflows/brief.md]`
- **iteration_budget:** 30
- **rationale:** Brief prose quality is measured via Nyquist structural tests for brief output (section presence, persona format, JTBD format). Downstream visual proxy is a Phase 113 pipeline experiment.

### EXP-06: flows
- **File:** `references/experiments/flows.md`
- **slug:** `flows-mermaid`
- **metric:** `mermaid_readability_score`
- **direction:** `max`
- **verify:** `node bin/mermaid-metric.cjs references/experiments/fixtures/mermaid-simple.md`
- **mutable_files:** `[workflows/flows.md]`
- **iteration_budget:** 30
- **rationale:** flows.md generates Mermaid diagrams — mermaid-metric.cjs directly measures their readability. Update to `FLW-flows-v1.md` in live use.

### EXP-07: iterate
- **File:** `references/experiments/iterate.md`
- **slug:** `iterate-effectiveness`
- **metric:** `a11y_score`
- **direction:** `max`
- **verify:** `node bin/a11y-metric.cjs references/experiments/fixtures/good-wireframe.html`
- **mutable_files:** `[workflows/iterate.md]`
- **iteration_budget:** 30
- **rationale:** iterate.md applies critique findings to wireframes. A11y score on iterated wireframe HTML measures whether iteration prose guidance improves accessibility outcomes. Update to `WFR-*-v2.html` in live use.

### EXP-08: hig
- **File:** `references/experiments/hig.md`
- **slug:** `hig-a11y-detection`
- **metric:** `a11y_score`
- **direction:** `max`
- **verify:** `node bin/a11y-metric.cjs references/experiments/fixtures/good-wireframe.html`
- **mutable_files:** `[workflows/hig.md]`
- **iteration_budget:** 30
- **rationale:** HIG audit prose affects how thoroughly accessibility issues are found. A11y metric on a known-good fixture measures baseline detection quality.

### EXP-09: handoff
- **File:** `references/experiments/handoff.md`
- **slug:** `handoff-completeness`
- **metric:** `dom_structure_score`
- **direction:** `max`
- **verify:** `node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html`
- **mutable_files:** `[workflows/handoff.md]`
- **iteration_budget:** 30
- **rationale:** Handoff prose guidance affects how implementation specs describe component structure. DOM structure proxy measures whether handoff guidance leads to better-structured artifacts.

### EXP-10a: recommend
- **File:** `references/experiments/recommend.md`
- **slug:** `recommend-quality`
- **metric:** `nyquist_pass_count`
- **direction:** `max`
- **verify:** `node bin/nyquist-metric.cjs`
- **mutable_files:** `[workflows/recommend.md]`
- **iteration_budget:** 30

### EXP-10b: competitive
- **File:** `references/experiments/competitive.md`
- **slug:** `competitive-quality`
- **metric:** `nyquist_pass_count`
- **direction:** `max`
- **verify:** `node bin/nyquist-metric.cjs`
- **mutable_files:** `[workflows/competitive.md]`
- **iteration_budget:** 30

### EXP-10c: opportunity
- **File:** `references/experiments/opportunity.md`
- **slug:** `opportunity-quality`
- **metric:** `nyquist_pass_count`
- **direction:** `max`
- **verify:** `node bin/nyquist-metric.cjs`
- **mutable_files:** `[workflows/opportunity.md]`
- **iteration_budget:** 30

### EXP-10d: ideate
- **File:** `references/experiments/ideate.md`
- **slug:** `ideate-quality`
- **metric:** `nyquist_pass_count`
- **direction:** `max`
- **verify:** `node bin/nyquist-metric.cjs`
- **mutable_files:** `[workflows/ideate.md]`
- **iteration_budget:** 30

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | None — discovered by `node --test tests/` |
| Quick run command | `node --test tests/phase-112/` |
| Full suite command | `node --test tests/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-01 | wireframe template has correct frontmatter fields | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-02 | mockup template has correct frontmatter fields | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-03 | critique template uses nyquist verify command | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-04 | system template uses contrast-metric.cjs | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-05 | brief template has mutable_files=[workflows/brief.md] | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-06 | flows template uses mermaid-metric.cjs | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-07 | iterate template uses a11y-metric.cjs | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-08 | hig template uses a11y-metric.cjs | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-09 | handoff template uses dom-metric.cjs | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-10 | recommend/competitive/opportunity/ideate use nyquist | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-11 | each template parsed by parseExperimentFile returns valid:true | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |
| EXP-12 | all 14 templates exist as files in references/experiments/ | unit | `node --test tests/phase-112/experiment-templates.test.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-112/`
- **Per wave merge:** `node --test tests/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-112/experiment-templates.test.mjs` — covers EXP-01 through EXP-12
  - Tests should use `parseExperimentFile()` from `bin/lib/experiment-schema.cjs` to validate each template file
  - Test: each template parses with `valid: true`
  - Test: each template has the expected `verify` command prefix (`node bin/dom-metric.cjs`, `node bin/a11y-metric.cjs`, etc.)
  - Test: all 14 template files exist at `references/experiments/{skill}.md`
  - Test: each template's `mutable_files` array contains exactly one entry from the 14 authorized workflow files
  - Test: each template's `direction` is `"max"` (with critique being a documented exception if needed)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nyquist-only metric for all skills | Visual metrics (dom, a11y, contrast, responsive, mermaid) for browser-backed skills | v0.14 / Phase 111 | 9 of 14 skills now have browser-native quality measurement |
| No experiment templates for visual skills | 14 templates with specific verify commands | Phase 112 | Full AutoResearch coverage of design pipeline |
| awwwards_score as the default metric | Skill-specific metrics (dom score, a11y score, contrast count, mermaid score) | Phase 112 | Each skill optimized for its actual output quality, not a generic rubric |

---

## Open Questions

1. **Missing OPTIMIZABLE markers in workflow files**
   - What we know: experiment-boundaries.md says all 14 files should have both LOCKED and OPTIMIZABLE markers
   - What's unclear: Whether all 14 actually have these markers currently (not verified in this research)
   - Recommendation: Wave 0 of Phase 112 plan should include a task to verify marker presence in all 14 workflow files and add any missing markers

2. **SYS preview HTML path**
   - What we know: system.md produces SYS-system-v*.md and mentions a "standalone browser-viewable preview page"
   - What's unclear: Exact path of the preview HTML (likely `.planning/design/visual/SYS-preview-v*.html` or similar)
   - Recommendation: Read system.md Step 5/7 for exact output path before writing the system.md template's verify command

3. **deploy.md experiment eligibility**
   - What we know: deploy.md appears in the 14 authorized experiment-eligible workflow files in experiment-boundaries.md but is NOT in the 14 skills listed in Phase 112 success criteria
   - What's unclear: Is deploy.md supposed to have an experiment template in Phase 112?
   - Recommendation: Phase 112 requirements say "recommend through handoff" — deploy.md is not a design skill but an operational workflow. The 14 skills in Phase 112 are the design pipeline skills (recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, hig, iterate, mockup, handoff — that's 13). Flows, system, wireframe count as browser-backed... re-count: browser-backed = wireframe, mockup, system, flows, critique, hig, iterate, handoff, brief = 9; non-browser = recommend, competitive, opportunity, ideate = 4. Total = 13, not 14. The experiment-boundaries.md lists 14 authorized files including deploy.md. Phase 112 success criteria says "14 eligible design skills." **Resolution:** deploy.md is the 14th eligible file. EXP-10 should cover recommend + competitive + opportunity + ideate (4 non-browser skills) — but if deploy needs a template too, there must be a deploy.md experiment. However, Phase 112 requirements only mention EXP-10 as covering the 4 non-browser skills. The Phase 112 success criteria explicitly names the 13 design skills + deploy.md = 14. Include a deploy template using `nyquist-metric.cjs`.

4. **contrast-metric.cjs score range**
   - What we know: contrast-metric.cjs returns pass count (integer), not a ratio. STATE.md confirms: "contrast-metric.cjs score = pass count (elements passing AA) not a ratio — direction is max"
   - What's unclear: For a system preview HTML, the pass count depends on how many text elements the page has — could be 0 if the page is empty, or 50+ if the page has many tokens
   - Recommendation: Template documentation should note that the baseline (first iteration, always KEEP) will set the pass count target; improvements must beat that count.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All verify commands (node bin/*.cjs) | ✓ | (project runtime) | — |
| bin/dom-metric.cjs | EXP-01, EXP-02, EXP-05, EXP-07, EXP-09 | ✓ | Phase 111 complete | — |
| bin/a11y-metric.cjs | EXP-03, EXP-07, EXP-08 | ✓ | Phase 111 complete | — |
| bin/contrast-metric.cjs | EXP-04 | ✓ | Phase 111 complete | — |
| bin/mermaid-metric.cjs | EXP-06 | ✓ | Phase 111 complete | — |
| bin/nyquist-metric.cjs | EXP-03, EXP-05, EXP-10a-d | ✓ | v0.13 baseline | — |
| references/experiments/fixtures/ | All fixture-based verify commands | ✓ | Phase 111 created fixtures | — |
| Playwright MCP | Visual metrics at runtime | ✓ (conditional) | registered Phase 108 | metrics return 0 when unavailable |

**Missing dependencies with no fallback:** None — all required tooling is present.

**Missing dependencies with fallback:** Playwright MCP availability at runtime is not guaranteed. All 5 visual metric scripts degrade gracefully (return 0, exit 0) when Playwright is unavailable per VIS-07.

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/experiment-schema.cjs` — REQUIRED_FIELDS, parseExperimentFile, EXPERIMENT_DEFAULTS — read in full
- `bin/lib/experiment-runner.cjs` — _evalMetric, _compareMetric, _writeJsonlRow, JSONL_ROW_FIELDS — read in full
- `bin/dom-metric.cjs` — full implementation verified
- `bin/a11y-metric.cjs` — full implementation verified
- `bin/contrast-metric.cjs` — full implementation verified
- `bin/responsive-metric.cjs` — full implementation verified
- `bin/mermaid-metric.cjs` — full implementation verified
- `bin/nyquist-metric.cjs` — reference implementation verified
- `references/experiment-boundaries.md` — 14 authorized files, protected zones, OPTIMIZABLE marker rules — read in full
- `templates/experiment.md` — frontmatter format example verified
- `.planning/config.json` — nyquist_validation: true confirmed

### Secondary (MEDIUM confidence)
- `.planning/phases/111-visual-metric-scripts/111-RESEARCH.md` — metric script contracts, project constraints — read in full
- `.planning/REQUIREMENTS.md` — EXP-01 through EXP-12 descriptions — read in full
- `.planning/STATE.md` — decisions including "contrast-metric.cjs score = pass count" — read in full
- `.planning/research/v0.14-META-OPTIMIZATION.md` — meta-optimization patterns (Phase 116 context)
- `workflows/wireframe.md`, `mockup.md`, `flows.md`, `iterate.md`, `hig.md`, `handoff.md`, `brief.md`, `critique.md`, `recommend.md`, `competitive.md`, `opportunity.md`, `ideate.md`, `system.md` — output artifact paths confirmed

### Tertiary (LOW confidence)
- None needed — all critical claims verified from source.

---

## Metadata

**Confidence breakdown:**
- experiment-schema.cjs contract: HIGH — read from source
- experiment-runner.cjs lifecycle: HIGH — read from source
- 14 skill metric assignments: HIGH — verified from workflow files + experiment-boundaries.md
- Visual metric script contracts: HIGH — all 5 scripts read in full
- Fixture file locations: HIGH — directory listing confirmed
- OPTIMIZABLE marker presence in workflow files: LOW — not individually verified per workflow file

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (30 days — template format and metric scripts are stable infrastructure)
