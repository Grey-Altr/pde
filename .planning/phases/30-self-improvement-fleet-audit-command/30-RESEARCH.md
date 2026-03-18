# Phase 30: Self-Improvement Fleet & Audit Command — Research

**Researched:** 2026-03-17
**Domain:** Self-auditing CLI tools, fleet agent orchestration, YAML frontmatter validation, markdown structural analysis, diff generation, protected-files guards, health score delta tracking
**Confidence:** HIGH (PDE internals confirmed from source; agent patterns confirmed from Claude Code docs; tooling confirmed from Node.js probe)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUDIT-01 | `/pde:audit` command scans PDE artifacts and produces structured report with severity levels | Workflow anatomy confirmed from existing `/pde:hig`, `/pde:critique` patterns; severity system (CRITICAL/HIGH/MEDIUM/LOW) maps cleanly to existing pattern |
| AUDIT-02 | Auditor agent evaluates PDE artifacts in read-only mode against quality rubric | `pde-output-quality-auditor` and `pde-design-quality-evaluator` already in model-profiles.cjs; agents/ dir does NOT exist yet — Phase 30 creates it |
| AUDIT-03 | Improver agent generates fixes with before/after diff, writes to .planning/improvements/ | `diff -u` via execSync is available; .planning/improvements/ is listed in protected-files.json allowed_write_directories |
| AUDIT-04 | Validator agent checks proposed changes for correctness and compliance | Validator follows same Task() spawn pattern as pde-integration-checker; PASS/FAIL structured return pattern documented |
| AUDIT-05 | Auditor → Improver → Validator loop orchestration | Confirmed: subagents cannot spawn subagents. Orchestrator (workflow) must drive the loop sequentially via Task() calls |
| AUDIT-06 | Apply mode: validated improvements applied with protected-files guard | protected-files.json exists at repo root; enforcement is prompt-level only (confirmed in Phase 29); guard logic must be embedded in improver agent prompt |
| AUDIT-07 | Tool effectiveness testing: Context7, agent prompt quality, template completeness | Read-only evaluation task; auditor agent reads skill files and evaluates against rubric |
| AUDIT-08 | `pde-tools validate-skill` CLI command | extractFrontmatter() already available; hand-rolled YAML parser handles nested objects and arrays; new `validate skill` subcommand added to pde-tools.cjs |
| AUDIT-09 | Before/after baseline measurements so improvement delta is quantifiable | Baseline stored as JSON in .planning/; delta = current score minus previous baseline |
| AUDIT-10 | Fleet can identify skills needing new reference files and create them | Read-only audit task; creates entries in .planning/improvements/ only |
| AUDIT-11 | PDE Health Report — single-page summary of system health | Produces .planning/audit-report.md; structured JSON baseline enables delta reporting |
| AUDIT-12 | Agent system prompt quality evaluation — flags vague prompts | Auditor agent task within audit.md workflow |
</phase_requirements>

---

## Summary

Phase 30 builds PDE's self-auditing capability: a `/pde:audit` workflow that orchestrates a three-agent fleet (auditor → improver → validator), a `pde-tools validate-skill` CLI command, and a health report with quantifiable delta tracking. It also creates the `agents/` directory that holds PDE's subagent definition files — currently referenced by workflows but not yet populated.

The dominant architectural insight is that **all three fleet agents are orchestrated by the workflow, not by each other.** Claude Code subagents cannot spawn other subagents (confirmed in official docs). The audit.md workflow is the orchestrator: it spawns the auditor Task, receives findings, optionally spawns improver Task for each finding, then spawns validator Task for each proposal. This sequential loop pattern is already used in validate-phase.md (pde-nyquist-auditor) and audit-milestone.md (pde-integration-checker).

The most important dependency confirmation: `protected-files.json` is already at repo root with `.planning/improvements/` in `allowed_write_directories`. The `agents/` directory does not exist yet — Phase 30 creates it and populates the first three agent definition files (`pde-quality-auditor.md`, `pde-skill-improver.md`, `pde-skill-validator.md`). The `validate-skill` CLI command extends `bin/pde-tools.cjs` using the existing `extractFrontmatter()` from `bin/lib/frontmatter.cjs` — no new parsing library needed.

**Primary recommendation:** Model the audit fleet on the existing pde-nyquist-auditor pattern (agents/ dir + Task() invocation from workflow + structured return), extend frontmatter.cjs with a `skill` schema for validate-skill, use `diff -u` via execSync for before/after diffs (no npm dependencies), and store baselines as JSON files in .planning/ for delta computation.

---

## Standard Stack

### Core

| Component | Version/Format | Purpose | Why Standard |
|-----------|----------------|---------|--------------|
| Node.js `fs`, `path` | v20.20.0 (LTS, confirmed) | File traversal, reading, writing | Already used throughout bin/lib/; no new dependencies |
| `extractFrontmatter()` | bin/lib/frontmatter.cjs (existing) | YAML frontmatter parsing for validate-skill | Already handles nested objects, inline arrays, quoted values; proven in production |
| `diff -u` via `execSync` | POSIX (macOS/Linux standard) | Before/after diff generation in improvements/ | No npm package needed; available on all target platforms; produces standard unified diff |
| `JSON.parse()` / `JSON.stringify()` | Node.js built-in | Baseline storage and delta computation | Zero dependencies; structured JSON enables numeric comparison across audit runs |
| Bash test scripts (`test_*.sh`) | Same as Phase 29 pattern | Nyquist validation tests | Phase 29 established this as the PDE test pattern; consistent with existing 97-assertion suite |
| `protected-files.json` | Already at repo root | Guard for improver agent write scope | Already defines allowed_write_directories; enforcement via prompt (confirmed Phase 29 decision) |
| `agents/` directory | To be created at repo root | Agent definition files for Task() spawning | validate-phase.md and ui-review.md reference `${CLAUDE_PLUGIN_ROOT}/agents/*.md` — path is committed to |

### Supporting

| Component | Format | Purpose | When to Use |
|-----------|--------|---------|-------------|
| `skill-registry.md` | Markdown table (existing) | Skill code uniqueness check in validate-skill | LINT-010/LINT-011 already enforce this; validate-skill CLI queries the same source |
| `references/quality-standards.md` | Markdown (Phase 29 output) | Rubric for auditor agent evaluation | Already exists; auditor agent reads it as required_reading |
| `references/tooling-patterns.md` | Markdown (existing) | Lint rules (LINT-001 through LINT-042) | Already defines the structural rules validate-skill must check |
| `references/skill-style-guide.md` | Markdown (existing) | Flag naming, output format standards | Protected file; auditor reads but never writes |
| `bin/lib/model-profiles.cjs` | CommonJS | Model resolution for new agent types | Already has `pde-output-quality-auditor`, `pde-skill-linter`, `pde-design-quality-evaluator`, `pde-template-auditor` registered |

### Alternatives Considered

| Standard | Alternative | Why Standard Wins |
|----------|-------------|-------------------|
| `diff -u` via execSync | `diff` npm package (jsdiff) | No dependencies; platform-available; standard unified format; jsdiff not installed globally |
| `extractFrontmatter()` (existing) | `js-yaml` or `gray-matter` npm | Neither installed globally; hand-rolled parser already handles PDE's YAML subset correctly |
| Sequential Task() loop in workflow | Parallel Task() with run_in_background | Audit findings must be known before improvement; validator must see specific proposal; pipeline is inherently sequential |
| Bash test scripts | pytest or jest | PDE established Bash pattern in Phase 29; no test framework installed; consistent toolchain |

**Installation:** No new npm packages. All tooling is Node.js built-ins + existing bin/lib/ code.

---

## Architecture Patterns

### Recommended Project Structure

```
agents/                           # NEW — created in Phase 30
├── pde-quality-auditor.md        # Read-only auditor agent definition
├── pde-skill-improver.md         # Improver agent (writes to .planning/improvements/ only)
└── pde-skill-validator.md        # Validator agent (read-only + .planning/improvements/)

commands/
└── audit.md                      # NEW — /pde:audit command invoker

workflows/
└── audit.md                      # NEW — main audit workflow

bin/lib/
└── validate-skill.cjs            # NEW — validate-skill logic, imported by pde-tools.cjs

.planning/
├── audit-report.md               # Audit output (in allowed_write_directories)
├── audit-baseline.json           # NEW — numeric baseline for delta tracking
└── improvements/                 # Improvement proposals (in allowed_write_directories)
    └── {artifact-slug}-{date}.md # Before/after diff proposals
```

### Pattern 1: Three-Agent Fleet Orchestrated by Workflow

**What:** The audit.md workflow drives the full pipeline sequentially. It spawns auditor → receives findings → for each finding spawns improver → receives proposal → spawns validator → if PASS applies or queues. Agents never spawn each other.

**When to use:** Any multi-step quality pipeline where later steps depend on prior step outputs.

**Example:**
```
// Source: Claude Code official docs (code.claude.com/docs/en/sub-agents)
// + existing validate-phase.md and audit-milestone.md patterns

// Step 1: Spawn auditor (read-only)
AUDITOR_MODEL=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" resolve-model pde-output-quality-auditor --raw)

Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-quality-auditor.md for instructions.\n\n
<artifacts_to_audit>
{list of workflow files, agent files, command files, template files}
</artifacts_to_audit>
<rubric_path>${CLAUDE_PLUGIN_ROOT}/references/quality-standards.md</rubric_path>
<constraint>READ-ONLY. Never write to any file. Return findings as structured JSON.</constraint>",
  subagent_type="pde-output-quality-auditor",
  model="{AUDITOR_MODEL}",
  description="Audit PDE artifacts against quality rubric"
)

// Step 2: For each finding, spawn improver
Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-skill-improver.md for instructions.\n\n
<finding>{finding_json}</finding>
<staging_path>.planning/improvements/</staging_path>
<protected_files_path>${CLAUDE_PLUGIN_ROOT}/protected-files.json</protected_files_path>",
  subagent_type="pde-skill-improver",
  model="{IMPROVER_MODEL}",
  description="Generate improvement for {artifact_name}"
)

// Step 3: Validator
Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-skill-validator.md for instructions.\n\n
<proposal_path>{path_to_proposal}</proposal_path>
<original_path>{path_to_original}</original_path>",
  subagent_type="pde-skill-linter",
  model="{VALIDATOR_MODEL}",
  description="Validate improvement proposal for {artifact_name}"
)
```

### Pattern 2: Agent Definition File Anatomy

**What:** Agent definition files in `agents/` are plain Markdown files that provide system prompt instructions. They are read via `@`-include in Task() prompt strings. They are NOT Claude Code `.claude/agents/` subagent config files.

**Evidence from existing patterns:**
```
// Source: workflows/validate-phase.md line 89
Task(
  prompt="Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-nyquist-auditor.md for instructions.\n\n..."
)

// Source: workflows/ui-review.md line 8
"Read ${CLAUDE_PLUGIN_ROOT}/agents/pde-ui-auditor.md for instructions."
```

Agent definition file structure (from existing validate-phase.md reference):
```markdown
# pde-quality-auditor

You are PDE's quality auditor agent. [role description]

## Your Constraints

**READ-ONLY.** You MUST NOT write to any file.

Before every Write or Edit tool call, check protected-files.json. You MUST NOT
write to any path listed in protected[] or any subdirectory in protected_directories[].

## Required Reading

Load before evaluating any artifact:
- @references/quality-standards.md
- @references/tooling-patterns.md
- @references/skill-style-guide.md

## Return Format

Return a JSON block with findings array and summary counts.
```

### Pattern 3: validate-skill CLI Command

**What:** `pde-tools validate-skill <path>` checks a skill file's frontmatter YAML validity, allowed-tools list correctness, workflow path existence, skill code uniqueness, and required sections.

**When to use:** Called by `/pde:test --lint` and Skill Builder (Phase 31).

**Example (bin/lib/validate-skill.cjs):**
```javascript
// Source: extends bin/lib/frontmatter.cjs FRONTMATTER_SCHEMAS pattern

const VALID_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'Task', 'WebSearch', 'WebFetch'];

// Required XML sections — from tooling-patterns.md LINT-001 through LINT-005
const REQUIRED_SECTIONS = [
  { tag: '<purpose>', rule: 'LINT-001', severity: 'error' },
  { tag: '<skill_code>', rule: 'LINT-002', severity: 'error' },
  { tag: '<skill_domain>', rule: 'LINT-003', severity: 'error' },
  { tag: '<context_routing>', rule: 'LINT-004', severity: 'error' },
  { tag: '<process>', rule: 'LINT-005', severity: 'error' },
];

function validateSkill(cwd, skillPath, raw) {
  const content = fs.readFileSync(fullPath, 'utf-8');
  const fm = extractFrontmatter(content);  // reuse existing parser
  const errors = [];
  const warnings = [];

  // 1. allowed-tools correctness
  for (const tool of (fm['allowed-tools'] || [])) {
    if (!VALID_TOOLS.includes(tool)) errors.push(`Unknown tool: ${tool} — LINT-024`);
  }

  // 2. Skill code format (2-4 uppercase letters)
  const codeMatch = content.match(/<skill_code>\s*([A-Z]{2,4})\s*<\/skill_code>/);
  if (!codeMatch) errors.push('Missing or invalid <skill_code> — LINT-002');

  // 3. Skill code uniqueness via skill-registry.md
  if (codeMatch) {
    const registry = fs.readFileSync(path.join(cwd, 'skill-registry.md'), 'utf-8');
    const occurrences = (registry.match(new RegExp(`\\| ${codeMatch[1]} \\|`, 'g')) || []).length;
    if (occurrences === 0) warnings.push(`Skill code ${codeMatch[1]} not in skill-registry.md — LINT-010`);
    if (occurrences > 1) errors.push(`Skill code ${codeMatch[1]} appears ${occurrences} times — LINT-011`);
  }

  // 4. Required sections
  for (const { tag, rule } of REQUIRED_SECTIONS) {
    if (!content.includes(tag)) errors.push(`Missing ${tag} — ${rule}`);
  }

  // 5. Workflow path existence
  const wfRef = content.match(/@\$\{CLAUDE_PLUGIN_ROOT\}\/workflows\/([a-z\-]+\.md)/);
  if (wfRef && !fs.existsSync(path.join(cwd, 'workflows', wfRef[1]))) {
    errors.push(`Referenced workflow not found: workflows/${wfRef[1]}`);
  }

  return { valid: errors.length === 0, errors, warnings, path: skillPath };
}
```

### Pattern 4: Baseline + Delta Health Report

**What:** First audit run writes `.planning/audit-baseline.json`. Subsequent runs compute delta by comparing new scores against baseline.

**Example:**
```javascript
// Source: Node.js JSON file pattern — consistent with .planning/STATE.md approach

// .planning/audit-baseline.json structure
{
  "timestamp": "2026-03-17T00:00:00.000Z",
  "version": 1,
  "finding_count": 145,
  "scores": {
    "commands": { "total": 50, "critical": 2, "high": 5, "score_pct": 46.0 },
    "agents": { "total": 3, "critical": 0, "high": 1, "score_pct": 66.7 },
    "workflows": { "total": 48, "critical": 1, "high": 8, "score_pct": 43.8 },
    "templates": { "total": 8, "critical": 0, "high": 2, "score_pct": 62.5 },
    "references": { "total": 36, "critical": 0, "high": 0, "score_pct": 82.0 },
    "overall_health_pct": 58.4
  }
}

// Delta calculation pattern
function computeDelta(previous, current) {
  if (!previous) return { available: false, reason: "no baseline" };
  return {
    available: true,
    baseline_date: previous.timestamp,
    overall_delta: +(current.overall_health_pct - previous.scores.overall_health_pct).toFixed(1),
    finding_count_delta: current.finding_count - previous.finding_count,
    improved: current.overall_health_pct > previous.scores.overall_health_pct
  };
}
```

### Pattern 5: Improvement Proposal File Format

**What:** Each improvement proposal is a Markdown file in `.planning/improvements/` containing original content, proposed changes as unified diff, and reasoning.

**Example:**
```markdown
# Improvement Proposal: workflows/critique.md

**Finding:** LINT-020 (warning) — --dry-run flag not documented in process section
**Severity:** MEDIUM
**Proposed by:** pde-skill-improver
**Date:** 2026-03-17

## Before

[original section shown verbatim]

## After

[proposed section shown verbatim]

## Unified Diff

[output of: diff -u original_file tmp_proposed_file]

## Validator Result

PASS — no regressions, style-guide compliant, rubric coverage maintained.
```

### Pattern 6: Artifact Scan Scope

**What:** The auditor agent scans these artifact categories:

| Category | Glob Pattern | Evaluation Criteria |
|----------|-------------|---------------------|
| Commands | `commands/*.md` | Frontmatter validity, workflow reference exists, allowed-tools defined |
| Workflows | `workflows/*.md` | Required XML sections, step numbering, MCP integration, flag docs |
| Agent prompts | `agents/*.md` | Role specificity, constraint clauses, protected-files check, return format |
| Templates | `templates/**/*.md` | Placeholder coverage, structural completeness |
| References | `references/*.md` | Version/Scope/Ownership/Boundary header, LLM-consumable format |

Explicitly EXCLUDED from scan: `.planning/`, `bin/`, `.claude/`, `protected-files.json` (protected files cannot be audited for modification).

### Anti-Patterns to Avoid

- **Circular self-validation:** Auditor evaluating quality-standards.md against the rubric it contains. Mitigate: auditor skips all paths in `protected-files.json protected[]`.
- **Write-outside-staging:** Improver writing directly to workflow/command files. Mitigate: improver agent prompt must include explicit protected-files check before every Write/Edit call. `.planning/improvements/` is the ONLY allowed write target.
- **Infinite validation loops:** Validator rejecting, improver revising, validator rejecting again indefinitely. Mitigate: cap at 3 revision cycles; on 3rd FAIL, mark as `needs-human-review`.
- **Stale baseline producing false zero delta:** Baseline only updated when `--save-baseline` flag passed; report always shows baseline date.
- **Over-broad artifact scanning:** Scanning `.planning/` finds planning docs, not PDE artifacts. Scope is explicit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parsing | Custom YAML parser | `extractFrontmatter()` in bin/lib/frontmatter.cjs | Already implemented, handles PDE's YAML subset, tested in production |
| Diff generation | Character-level diff algorithm | `diff -u file_a file_b` via execSync | POSIX standard; produces standard unified diff; no npm dependency |
| Model resolution for new agents | Inline model lookup | `pde-tools.cjs resolve-model {agent-type} --raw` | Already handles profile + override logic |
| Skill code uniqueness check | In-memory registry | Read skill-registry.md and check | File is authoritative source; matches LINT-010/LINT-011 already defined |
| Protected files check | Hardcoded path list | Read `protected-files.json` at runtime | File is authoritative and designed to be read by agents |
| Baseline persistence | Custom database | `.planning/audit-baseline.json` | Consistent with PDE's file-based state model; zero dependencies |
| Severity categorization | ML-based scoring | Rule-to-severity table (LINT rules already have severity) | LINT rules already have error/warning/info levels; map to CRITICAL/HIGH/MEDIUM/LOW |

**Key insight:** The validate-skill command is essentially the existing `frontmatter validate` command extended with a `skill` schema in `FRONTMATTER_SCHEMAS` plus XML section presence checks. No new architecture required.

---

## Common Pitfalls

### Pitfall 1: agents/ Directory Not Created Before Workflow References It

**What goes wrong:** `audit.md` workflow tries to read `${CLAUDE_PLUGIN_ROOT}/agents/pde-quality-auditor.md` but the directory doesn't exist. validate-phase.md and ui-review.md ALSO reference this path — both are currently broken.

**Why it happens:** The directory is referenced in multiple workflows but was never created. Phase 30 must create it.

**How to avoid:** Phase 30 Wave 0 creates `agents/` directory and the first three agent files before any workflow testing.

**Warning signs:** `${CLAUDE_PLUGIN_ROOT}/agents/pde-nyquist-auditor.md` read fails during validate-phase.md execution.

### Pitfall 2: Protected-Files Guard Missing from Agent Prompt

**What goes wrong:** Improver agent receives a finding about `references/quality-standards.md` and attempts to modify it, corrupting Phase 29 infrastructure.

**Why it happens:** protected-files.json enforcement is prompt-level only (Phase 29 confirmed: bwrap does not protect Write/Edit tools).

**How to avoid:** Every agent definition file in `agents/` must contain the explicit protected-files guard clause verbatim (see Phase 29 note field in protected-files.json for canonical wording).

**Warning signs:** Agent writes to `references/`, `bin/`, `.claude/`, or `protected-files.json` itself.

### Pitfall 3: validate-skill Errors on Non-Skill Workflow Files

**What goes wrong:** Running validate-skill against workflow files (which share XML section anatomy but lack `<skill_code>`) produces false errors.

**Why it happens:** validate-skill designed for SKILL.md files; workflows use similar but different section set.

**How to avoid:** Add pre-check: if `<skill_code>` absent AND file is in `workflows/` directory, skip skill-specific checks and emit "not a skill file" message.

**Warning signs:** validate-skill reports errors on `workflows/critique.md`.

### Pitfall 4: Audit Loop Too Slow for Large Artifact Sets

**What goes wrong:** Spawning one improver Task per finding across 50 workflow files creates an unmanageable number of sequential Task() calls.

**How to avoid:** Group findings by artifact file. One improver Task handles all findings for a single file. Default: only auto-improve CRITICAL and HIGH findings; MEDIUM/LOW are logged but require `--deep` flag.

**Warning signs:** Audit run exceeds 30 minutes.

### Pitfall 5: extractFrontmatter Fails on Block Scalar YAML

**What goes wrong:** The hand-rolled parser does not handle YAML multi-line block scalars (`|` or `>` style). Skill files with multi-line descriptions fail silently (parser returns empty field).

**How to avoid:** In validate-skill, add pre-check: if frontmatter contains `|` or `>` block indicators, emit a warning and skip that field rather than silently returning empty.

**Warning signs:** `extractFrontmatter()` returns `{}` for a file with valid but complex YAML.

### Pitfall 6: pde-skill-improver and pde-skill-validator Not in model-profiles.cjs

**What goes wrong:** `pde-tools.cjs resolve-model pde-skill-improver --raw` returns an error because the agent type is not registered.

**Why it happens:** Phase 29 registered AUD/IMP/PRT skill codes but did NOT add model profiles for the corresponding agent types. model-profiles.cjs currently has no entry for `pde-skill-improver` or `pde-skill-validator`.

**How to avoid:** Phase 30 Wave 0 adds both entries to model-profiles.cjs (protected file — requires explicit authorization) AND to references/model-profiles.md.

**Warning signs:** `resolve-model pde-skill-improver` returns error or empty string.

---

## Code Examples

### diff -u Generation for Improvement Proposals

```javascript
// Source: Node.js execSync (built-in child_process) — no npm packages needed
// Confirmed available on macOS Darwin 25.3.0 via Node.js probe

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function generateUnifiedDiff(originalPath, proposedContent, label) {
  const tmpFile = path.join(os.tmpdir(), `pde_proposal_${Date.now()}.tmp`);
  fs.writeFileSync(tmpFile, proposedContent, 'utf-8');

  try {
    // diff exits 1 when files differ (normal), 0 if identical, 2 on error
    // Use "|| true" to prevent execSync from throwing on exit code 1
    const result = execSync(
      `diff -u "${originalPath}" "${tmpFile}" 2>&1 || true`,
      { encoding: 'utf-8', shell: true }
    );
    // Replace tmp path with semantic label in unified diff header
    return result
      .replace(new RegExp(tmpFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `b/${label}`)
      .replace(new RegExp(originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `a/${label}`);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}
```

### Baseline Load / Save / Delta

```javascript
// Source: Node.js JSON file pattern — consistent with .planning/STATE.md approach

function loadBaseline(cwd) {
  const baselinePath = path.join(cwd, '.planning', 'audit-baseline.json');
  if (!fs.existsSync(baselinePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  } catch { return null; }
}

function saveBaseline(cwd, scores, findingCount) {
  const baselinePath = path.join(cwd, '.planning', 'audit-baseline.json');
  fs.writeFileSync(baselinePath, JSON.stringify({
    timestamp: new Date().toISOString(),
    version: 1,
    finding_count: findingCount,
    scores
  }, null, 2), 'utf-8');
}

function computeDelta(previous, currentHealth, currentFindingCount) {
  if (!previous) return { available: false, reason: 'no baseline' };
  return {
    available: true,
    baseline_date: previous.timestamp,
    overall_delta: +(currentHealth - previous.scores.overall_health_pct).toFixed(1),
    finding_count_delta: currentFindingCount - previous.finding_count,
    improved: currentHealth > previous.scores.overall_health_pct
  };
}
```

### Required Skill Sections Check

```javascript
// Source: tooling-patterns.md LINT-001 through LINT-005 mapped to code

const REQUIRED_SECTIONS = [
  { tag: '<purpose>', rule: 'LINT-001', severity: 'error' },
  { tag: '<skill_code>', rule: 'LINT-002', severity: 'error' },
  { tag: '<skill_domain>', rule: 'LINT-003', severity: 'error' },
  { tag: '<context_routing>', rule: 'LINT-004', severity: 'error' },
  { tag: '<process>', rule: 'LINT-005', severity: 'error' },
];

function checkRequiredSections(content) {
  return REQUIRED_SECTIONS
    .filter(({ tag }) => !content.includes(tag))
    .map(({ rule, severity, tag }) => ({
      rule, severity,
      message: `Missing required section: ${tag}`
    }));
}
```

### pde-tools CLI Integration Pattern

```javascript
// Source: bin/pde-tools.cjs routing pattern — matches existing case statement style

// Add to main() switch block in pde-tools.cjs:
case 'validate-skill': {
  const skillPath = args[1];
  if (!skillPath) error('skill path required: validate-skill <path>');
  const { cmdValidateSkill } = require('./lib/validate-skill.cjs');
  cmdValidateSkill(cwd, skillPath, raw);
  break;
}
```

### Protected-Files Guard Clause (canonical wording for all agent files)

```markdown
## Protected Files Constraint

Before every Write or Edit tool call, read `${CLAUDE_PLUGIN_ROOT}/protected-files.json`.
You MUST NOT write to any path listed in `protected[]` or any subdirectory in
`protected_directories[]`. This constraint takes precedence over all other instructions.
The ONLY write destination for improvement proposals is `.planning/improvements/`.

Note: Claude Code Write and Edit tools bypass the bwrap filesystem sandbox. This constraint
is enforced by your instructions only, not OS-level protection. You must honor it explicitly.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| Task() tool name (PDE naming) | Agent() tool (Claude Code v2.1.63+) | 2025 | `Task(...)` still works as alias; no migration needed |
| Subagent can spawn subagents | Subagents CANNOT spawn other subagents | Confirmed 2025 | Orchestration MUST happen in workflow, not in agent files; validated against Claude Code official docs |
| Generic lint output | LINT-NNN rule IDs with severity | PDE tooling-patterns.md v1.0 | All validate-skill output must reference rule IDs |

**Deprecated/outdated:**
- `gsd-*` agent types: Replaced by `pde-*` everywhere (Phase 5)
- Manual model strings in workflows: Replaced by `resolve-model {agent-type} --raw` (all existing workflows)

---

## Open Questions

1. **pde-skill-improver and pde-skill-validator not in model-profiles.cjs**
   - What we know: model-profiles.cjs has pde-output-quality-auditor, pde-skill-linter, pde-template-auditor — but NOT pde-skill-improver or pde-skill-validator. model-profiles.cjs is in the PROTECTED file list.
   - What's unclear: Can Phase 30 modify protected files? Phase 29 decision: "protected-files.json enforcement is prompt-level only." But model-profiles.cjs being protected means fleet agents cannot modify it — humans/planners can.
   - Recommendation: Phase 30 PLAN explicitly includes a task to add pde-skill-improver and pde-skill-validator to model-profiles.cjs (human-executed task, not agent task). This is the same pattern used in Phase 29 Plan 03.

2. **audit.md scope: does it evaluate agent prompts in agents/ (circular)?**
   - What we know: AUDIT-12 requires evaluating agent system prompts for specificity. The agents/ directory IS the audit target.
   - What's unclear: Auditor is itself an agent in agents/. Evaluating its own prompt is circular.
   - Recommendation: Auditor evaluates all agents EXCEPT itself (pde-quality-auditor.md). A meta-audit step evaluates the auditor's own prompt as the LAST step and writes findings to audit-report.md for human review only (never auto-improved).

3. **Tool effectiveness testing (AUDIT-07): live MCP probe vs structural check**
   - Recommendation: Structural evaluation only (does the skill's `<required_reading>` reference Context7? does it have MCP degradation per LINT-040/041?). Do NOT invoke live MCP during audit.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bash test scripts (`test_*.sh` pattern, same as Phase 29) |
| Config file | none — standalone bash scripts with exit codes |
| Quick run command | `bash .planning/phases/30-self-improvement-fleet-audit-command/test_audit08_validate_skill.sh` |
| Full suite command | `for f in .planning/phases/30-self-improvement-fleet-audit-command/test_audit*.sh; do bash "$f"; done` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIT-01 | audit.md workflow file exists with correct frontmatter and required sections | smoke | `bash .../test_audit01_audit_command.sh` | Wave 0 |
| AUDIT-02 | pde-quality-auditor.md exists in agents/ with read-only constraint clause | smoke/content | `bash .../test_audit02_auditor_agent.sh` | Wave 0 |
| AUDIT-03 | pde-skill-improver.md exists; diff generation produces unified diff output | smoke/integration | `bash .../test_audit03_improver_agent.sh` | Wave 0 |
| AUDIT-04 | pde-skill-validator.md exists with PASS/FAIL return format documented | smoke/content | `bash .../test_audit04_validator_agent.sh` | Wave 0 |
| AUDIT-05 | Workflow drives sequential loop — no agent-spawns-agent pattern present | content | Manual review of audit.md source (manual-only) | N/A |
| AUDIT-06 | Apply mode: protected-files.json checked before any write in improver | integration | `bash .../test_audit06_protected_files_guard.sh` | Wave 0 |
| AUDIT-07 | Tool effectiveness check logic exists in audit workflow steps | content | `bash .../test_audit07_tool_effectiveness.sh` | Wave 0 |
| AUDIT-08 | `pde-tools validate-skill` returns errors for invalid skill, passes for valid | integration | `bash .../test_audit08_validate_skill.sh` | Wave 0 |
| AUDIT-09 | audit-baseline.json written on first run; delta computed on second run | integration | `bash .../test_audit09_baseline_delta.sh` | Wave 0 |
| AUDIT-10 | Auditor identifies missing reference files in findings output | content | Included in test_audit02 | Wave 0 |
| AUDIT-11 | audit-report.md produced with health score section and delta | smoke | `bash .../test_audit11_health_report.sh` | Wave 0 |
| AUDIT-12 | Agent prompt quality evaluation present in auditor agent definition | content | Included in test_audit02 | Wave 0 |

### Sampling Rate

- **Per task commit:** Run the specific test for that task's requirement
- **Per wave merge:** Run full suite (all test_audit*.sh scripts)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test_audit01_audit_command.sh` — covers AUDIT-01
- [ ] `test_audit02_auditor_agent.sh` — covers AUDIT-02, AUDIT-10, AUDIT-12
- [ ] `test_audit03_improver_agent.sh` — covers AUDIT-03
- [ ] `test_audit04_validator_agent.sh` — covers AUDIT-04
- [ ] `test_audit06_protected_files_guard.sh` — covers AUDIT-06
- [ ] `test_audit07_tool_effectiveness.sh` — covers AUDIT-07
- [ ] `test_audit08_validate_skill.sh` — covers AUDIT-08 (PRIMARY deliverable — AUDIT-08 is the most testable requirement)
- [ ] `test_audit09_baseline_delta.sh` — covers AUDIT-09
- [ ] `test_audit11_health_report.sh` — covers AUDIT-11
- [ ] Framework install: none required — same Bash pattern as Phase 29, Node.js v20.20.0 confirmed

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/frontmatter.cjs` — extractFrontmatter(), FRONTMATTER_SCHEMAS confirmed via source read + Node.js module probe
- `bin/lib/model-profiles.cjs` — All currently registered agent types confirmed; pde-skill-improver and pde-skill-validator NOT present (gap)
- `protected-files.json` — exact contents confirmed: enforcement: "prompt", .planning/improvements/ in allowed_write_directories
- `references/tooling-patterns.md` — LINT-001 through LINT-042 rules confirmed verbatim
- `bin/pde-tools.cjs` — CLI router patterns, existing `validate` subcommand pattern
- Claude Code official docs — https://code.claude.com/docs/en/sub-agents — Task() alias confirmed; subagents cannot spawn subagents confirmed; agent definition file format confirmed
- Node.js probe — `diff -u` available via execSync confirmed; js-yaml, gray-matter, diff npm packages NOT globally available

### Secondary (MEDIUM confidence)

- `workflows/validate-phase.md` + `workflows/ui-review.md` — Confirmed `agents/` dir pattern: Task() prompt reads agent .md file as instruction source; agents/ directory does NOT currently exist
- `workflows/audit-milestone.md` — Confirmed Task() invocation pattern with structured prompt and return
- `.planning/phases/05-agent-system/05-RESEARCH.md` — Agent type registry, MODEL_PROFILES structure, subagent_type as role hint

### Tertiary (LOW confidence)

- WebSearch on fleet agent patterns — confirms Generator-Critic-Refiner (auditor-improver-validator) is production pattern in 2025; no PDE-specific sources
- WebSearch on self-auditing CLIs — no directly applicable installed-tool patterns; PDE hand-rolled approach is correct given zero-dependency constraint

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed via Node.js probe; no npm dependencies required; diff -u probed and working
- Architecture: HIGH — agent patterns confirmed from Claude Code docs + existing PDE workflow source; Task() is the confirmed invocation method
- Pitfalls: MEDIUM — Pitfalls 1-4 confirmed from code structure; Pitfall 6 (model-profiles gap) confirmed via probe; Pitfall 5 (YAML block scalars) is inferred from parser source review
- validate-skill CLI: HIGH — directly extends existing frontmatter.cjs schema mechanism; no novel code required

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (30 days; Claude Code agent API stable; LINT rules are internal PDE definitions)
