# Phase 104: Self-Improvement Presets — Research

**Researched:** 2026-03-23
**Domain:** Experiment preset infrastructure, auto-discovery, self/skill optimization
**Confidence:** HIGH

## Summary

Phase 104 closes the last user-facing gap in the experiment system: preset invocation modes. Today `workflows/optimize.md` explicitly detects `--self` and `--skill` flags but immediately aborts with "Preset mode is not yet implemented." This phase makes those two modes functional.

The core work is: (1) extend the orchestrator's Step 1 to handle preset paths by generating an experiment.md on-the-fly from a preset configuration, then (2) wire that generated file into the existing 9-step loop unmodified. No new loop logic is needed — the preset just populates the required frontmatter fields that Step 1 already knows how to process.

The Nyquist pass count metric requires a dedicated extraction script because `node --test` output ends with `# pass N` on stdout (verified: `# tests 46\n# pass 46\n# fail 0`). The verify command must parse that line and print a single integer as the last line of stdout, which is exactly what `_evalMetric` requires. This script must live outside the protected `tests/` and `bin/` directories — a shell script in the project root or a small wrapper in `bin/lib/` would work, but the latter is protected. A `bin/nyquist-metric.cjs` helper is the cleanest option, though `bin/` is locked for experiments; it is not locked for Phase 104 itself (which is human-authored implementation, not a running experiment).

**Primary recommendation:** Implement preset resolution in the orchestrator workflow only — generate experiment.md on-the-fly in Step 1, then fall through to the existing loop. Add a `bin/nyquist-metric.cjs` extraction helper. No changes needed to pde-tools.cjs, experiment.cjs, or any module with a 300-line ceiling.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

None — all implementation choices are at Claude's discretion.

### Claude's Discretion

All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)

None — infrastructure phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SELF-01 | Self-improvement preset: pre-configured experiment targeting PDE's own workflow files with Nyquist assertion pass count as regression guard | Preset config object in orchestrator generates experiment.md with `verify` pointing to `bin/nyquist-metric.cjs` and `mutable_files` from auto-discovered OPTIMIZABLE workflows |
| SELF-02 | `/pde:optimize --self` mode auto-discovers PDE workflow files eligible for optimization based on OPTIMIZABLE markers | `grep -rl '<!-- OPTIMIZABLE -->' workflows/` returns the 14 eligible files enumerated in experiment-boundaries.md; orchestrator scans at runtime and populates `mutable_files` |
| SELF-03 | Skill optimization mode: `/pde:optimize --skill {name}` targets a specific skill's SKILL.md and workflow files with skill-specific eval | Skills directory does not yet exist in the project — Phase 104 must define what "skill" means in the optimization context and either create the directory structure or document an alternative target strategy |
</phase_requirements>

---

## Standard Stack

### Core

| Asset | Location | Purpose | Status |
|-------|----------|---------|--------|
| `workflows/optimize.md` | `workflows/optimize.md` | 9-step orchestrator — preset resolution goes in Step 1 | Exists (Phase 103) |
| `bin/lib/experiment-schema.cjs` | `bin/lib/experiment-schema.cjs` | `parseExperimentFile` validates generated experiment.md | Exists (Phase 101) |
| `templates/experiment.md` | `templates/experiment.md` | Template for the expected frontmatter structure | Exists |
| `references/experiment-boundaries.md` | `references/experiment-boundaries.md` | Authoritative list of 14 OPTIMIZABLE workflow files | Exists (Phase 99) |
| `bin/nyquist-metric.cjs` | `bin/nyquist-metric.cjs` | **NEW** — metric extraction helper for Nyquist pass count | Needs creation |

### Supporting

| Asset | Version | Purpose | When to Use |
|-------|---------|---------|-------------|
| `node --test tests/` | Node.js built-in | Full Nyquist suite runner | Used as subprocess in verify command |
| `grep -rl '<!-- OPTIMIZABLE -->'` | shell builtin | Auto-discover annotated workflow files | Used in Step 1 preset resolution |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `bin/nyquist-metric.cjs` | Inline shell in `verify` field | Shell one-liner fragile across platforms; CJS file is testable |
| Generating experiment.md in Step 1 | New `experiment preset` pde-tools subcommand | Subcommand adds complexity; orchestrator-only is simpler and within Phase scope |
| `grep` for OPTIMIZABLE discovery | Hardcoded list from boundaries.md | grep is authoritative at runtime; hardcoded list can drift |

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes touch:

```
workflows/
  optimize.md             # Step 1 extension — preset resolution branch
bin/
  nyquist-metric.cjs      # NEW: metric extraction helper
.planning/
  experiments/
    pde-self-improve/     # Generated slug dir (at runtime, not at build time)
      experiment.md       # Generated from preset config
tests/
  phase-104/              # NEW: Nyquist tests for SELF-01, SELF-02, SELF-03
```

### Pattern 1: Preset Resolution in Orchestrator Step 1

**What:** When `--self` or `--skill <name>` is detected in Step 1, the orchestrator constructs an experiment.md on-the-fly using a preset configuration object, writes it to a temp path, then proceeds exactly as if the user had provided an explicit experiment.md path.

**When to use:** Any preset invocation — `--self` or `--skill {name}`.

**How it works in workflows/optimize.md Step 1:**

```
If `--self` flag is present:
  1. Run auto-discovery:
       node bin/pde-tools.cjs experiment list-optimizable
     (new pde-tools subcommand that greps for OPTIMIZABLE markers)
     OR inline Bash:
       grep -rl '<!-- OPTIMIZABLE -->' workflows/ | sort
  2. Construct preset config:
       slug: pde-self-improve
       metric: nyquist_pass_count
       direction: max
       verify: node bin/nyquist-metric.cjs
       mutable_files: [... discovered list ...]
       iteration_budget: 20   (conservative for self-improvement)
       time_budget_minutes: 60
  3. Write to a temp path: /tmp/pde-self-improve-experiment.md
  4. Set experimentMdPath = /tmp/pde-self-improve-experiment.md
  5. Continue to validation as normal (Step 1 remainder unchanged)

If `--skill <name>` flag is present:
  1. Check that .claude/skills/{name}/ exists (or skills/{name}/ once that dir is created)
  2. Identify target files: SKILL.md for the named skill
  3. Identify skill-specific verify command (skill pressure-test score, or Nyquist subset)
  4. Construct preset config with skill-scoped mutable_files
  5. Write to temp path, continue as above
```

### Pattern 2: Nyquist Pass Count Extraction

**What:** `_evalMetric` parses the LAST LINE of stdout as a float. `node --test` emits `# pass N` as a TAP-format comment, not as the last line. A wrapper script must run the suite and emit the integer pass count as its final stdout line.

**Verified output format from `node --test`:**
```
# tests 1083
# suites 164
# pass 1075
# fail 8
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3452.482708
```

The metric extraction script must:
1. Run `node --test tests/` (or a subset)
2. Capture stdout
3. Parse the `# pass N` line
4. Print just the integer N as the last line to stdout
5. Exit 0 if the suite ran (even with failures — pass count IS the metric)

```javascript
// bin/nyquist-metric.cjs
'use strict';
const { spawnSync } = require('child_process');
const result = spawnSync('node', ['--test', 'tests/'], {
  encoding: 'utf-8',
  stdio: 'pipe',
  cwd: process.cwd(),
});
const match = (result.stdout || '').match(/^# pass (\d+)/m);
const passCount = match ? parseInt(match[1], 10) : 0;
process.stdout.write(String(passCount) + '\n');
process.exit(0);  // always exit 0 — pass count is the metric, failures are accounted for
```

**Critical:** Must exit 0. `_evalMetric` treats non-zero exit as CRASH. A decrease in pass count is the regression signal (direction: max, so DISCARD fires when metric drops).

### Pattern 3: Skill Optimization Target Resolution

**What:** `--skill {name}` needs to resolve to concrete files. No `skills/` directory exists in the project yet (confirmed: `ls .claude/skills/` returns not found).

**Recommendation for Phase 104:** Treat skill optimization as targeting named agent files (`agents/pde-{name}.md`) or named workflow files rather than a skills directory. The skill name maps to a workflow or agent by convention:
- `--skill brief` → `workflows/brief.md` (if OPTIMIZABLE-annotated)
- `--skill system` → `workflows/system.md`
- Unknown skill names → abort with clear error listing known skills

This avoids blocking on a missing skills infrastructure while still satisfying SELF-03's success criterion. The success criterion says "targets the named skill's SKILL.md and associated workflow files" — if SKILL.md doesn't exist, the workflow file is the appropriate proxy.

An alternative: create a minimal `skills/` stub directory in this phase to enable the SKILL.md target path. This is a viable option if the planner wants to future-proof toward Phase 105+.

### Anti-Patterns to Avoid

- **Adding new loop logic:** Do not touch the iteration loop (Step 7). Presets are resolved entirely in Step 1 before any loop state is initialized.
- **Modifying experiment-schema.cjs or experiment-report.cjs:** These modules are near or at the 300-line ceiling. Phase 104 adds zero Node.js module changes to them.
- **Pointing verify command at protected `tests/` directly:** `_evalMetric` runs with `shell:false` by default but `_evalMetric`'s spawnSync uses `shell:true`. The real risk is that `node --test tests/` must exit 0 from the metric wrapper even when tests fail — otherwise CRASH fires and wastes iterations.
- **Hardcoding mutable_files in the preset:** Auto-discovery via grep is more robust. The 14 annotated files in experiment-boundaries.md are ground truth but could change; grep reads markers at runtime.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Experiment file validation | Custom frontmatter parser | `parseExperimentFile` from `experiment-schema.cjs` | Already validates required fields, normalizes arrays, handles budget defaults |
| Metric eval plumbing | Custom subprocess management | `experiment eval-metric` pde-tools subcommand | Handles CRASH/timeout/nonzero-exit, reads EXPERIMENT-BEST.json for comparison |
| Pass count parsing | grep/awk in shell | Dedicated `nyquist-metric.cjs` | Testable, cross-platform, handles edge cases (no match → 0) |
| Boundary validation | Manual file-list checking | `experiment check-boundaries` pde-tools subcommand | Enforces experiment-boundaries.md rules |

---

## Common Pitfalls

### Pitfall 1: nyquist-metric.cjs exits non-zero

**What goes wrong:** If `nyquist-metric.cjs` exits 1 when tests fail, every metric evaluation CASHes. The CRASH counter increments, eventually firing BREAK-03, and the experiment ends with no data.

**Why it happens:** Natural instinct is to mirror test runner exit code. But the experiment system measures pass count as a continuous metric — we want to know if count went up or down, not binary pass/fail.

**How to avoid:** Always `process.exit(0)`. The pass count number carries the regression signal.

**Warning signs:** Experiment terminates immediately with `status: CRASH, reason: nonzero_exit` on iteration 1.

### Pitfall 2: Auto-discovery includes infrastructure workflows

**What goes wrong:** `grep -rl '<!-- OPTIMIZABLE -->' workflows/` might match a workflow that was incorrectly annotated or a future workflow not yet in the boundaries list.

**Why it happens:** grep doesn't know about experiment-boundaries.md; it finds any file with the marker.

**How to avoid:** Cross-reference grep output against the experiment-boundaries.md `infrastructure_workflows` list. Only files in the explicit "Experiment-Eligible Workflow Files" section are valid targets. The safest implementation: use the boundaries.md list as the authoritative source, not grep alone.

**Warning signs:** Experiment targets `workflows/execute-phase.md` or other infrastructure workflows, causing boundary validation failure in check-boundaries.

### Pitfall 3: Skill name resolves to nothing

**What goes wrong:** User runs `/pde:optimize --skill foo` where `foo` doesn't map to a known workflow. The preset generates an experiment.md with empty `mutable_files`, which fails schema validation ("mutable_files must be a non-empty list").

**Why it happens:** No skill registry exists yet for the optimization system.

**How to avoid:** The `--skill` preset resolver must validate the name against a known set before constructing the config. Abort with a clear message: "Unknown skill 'foo'. Known skills: brief, system, flows, ..." listing all 14 eligible workflow names.

### Pitfall 4: Generated experiment.md written to a path that persists across runs

**What goes wrong:** Writing the generated file to a fixed path like `.planning/experiments/pde-self-improve/experiment.md` before `experiment init` runs means the init step gets confused if the directory already exists from a prior run.

**Why it happens:** The orchestrator writes the file before calling `experiment init`.

**How to avoid:** The copy step in Step 5 (`cp {experiment-md-path} .planning/experiments/{slug}/experiment.md`) handles placement into the slug dir. Write the generated file to a neutral location first (`/tmp/` or the slug dir directly), then let Step 5 do the copy as designed.

### Pitfall 5: Nyquist subset vs full suite — timeout risk

**What goes wrong:** Full Nyquist suite takes ~3.5 seconds per run. With 20 iterations, that's 70 seconds of eval time, comfortably within 60-minute budget. However if the suite grows or test infra changes, timeout could fire.

**Why it matters:** Default `_evalMetric` timeout is 30 seconds (per pde-tools.cjs). The full suite runs in ~3.5s so this is safe. But the preset should document this assumption.

**How to avoid:** Set explicit `time_budget_minutes: 60` and keep the default 30s timeout in the verify command. Document the observed baseline (~3.5s) in the preset's search space prose.

---

## Code Examples

### Verified Nyquist Output Format

```
# Source: Observed from `node --test tests/phase-103/` 2026-03-23

# tests 46
# suites 5
# pass 46
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 214.58775
```

Full suite (`node --test tests/`):
```
# tests 1083
# suites 164
# pass 1075
# fail 8   (pre-existing failures in older phases — baseline captures this)
# duration_ms 3452.482708
```

The pass count is NOT the last line of stdout. The metric wrapper must grep for `# pass N`.

### Verified Experiment Frontmatter Schema

```yaml
# Source: experiment-schema.cjs REQUIRED_FIELDS + template/experiment.md
slug: pde-self-improve
metric: nyquist_pass_count
direction: max
verify: node bin/nyquist-metric.cjs
mutable_files:
  - workflows/brief.md
  - workflows/system.md
  - workflows/flows.md
  - workflows/ideate.md
  - workflows/wireframe.md
  - workflows/critique.md
  - workflows/hig.md
  - workflows/iterate.md
  - workflows/recommend.md
  - workflows/mockup.md
  - workflows/competitive.md
  - workflows/opportunity.md
  - workflows/handoff.md
  - workflows/deploy.md
iteration_budget: 20
time_budget_minutes: 60
```

### Verified Eligible Workflow Files (from experiment-boundaries.md)

```
# Source: references/experiment-boundaries.md — "Experiment-Eligible Workflow Files" section
workflows/brief.md
workflows/system.md
workflows/flows.md
workflows/ideate.md
workflows/wireframe.md
workflows/critique.md
workflows/hig.md
workflows/iterate.md
workflows/recommend.md
workflows/mockup.md
workflows/competitive.md
workflows/opportunity.md
workflows/handoff.md
workflows/deploy.md
```

All 14 confirmed annotated with `<!-- OPTIMIZABLE -->` markers (verified sample: brief.md line 308, system.md line 1240).

### Verified pde-tools Experiment Subcommand Set

```
# Source: pde-tools.cjs lines 835-928
init, commit, reset, promote, status, cleanup,
ensure-dirs, patch-config, check-boundaries,
eval-metric, write-row, generate-report, diff-summary
```

### optimize.md Step 1 Preset Branch (prescribed pattern)

```markdown
# In Step 1 of workflows/optimize.md, BEFORE validation:

If `--self` flag is present AND no explicit experiment.md path was provided:
  1. Discover mutable_files:
     ```bash
     grep -rl '<!-- OPTIMIZABLE -->' workflows/ | sort
     ```
     Cross-check against the 14 authorized files in experiment-boundaries.md.
     Use the intersection only.

  2. Write preset experiment.md to a temp path:
     Write file to: /tmp/pde-self-improve-experiment.md
     Contents: [see frontmatter schema above]

  3. Set experimentMdPath = /tmp/pde-self-improve-experiment.md
  4. Set slug = "pde-self-improve"
  5. Continue to Step 1 field validation with this path.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| --self/--skill aborts immediately | --self/--skill resolves to generated experiment.md | Phase 104 | Users can invoke self-improvement with one flag |
| Manual mutable_files specification | Auto-discovery via OPTIMIZABLE marker grep | Phase 104 | No manual file enumeration required |
| No Nyquist metric command | `bin/nyquist-metric.cjs` wrapper | Phase 104 | Nyquist pass count usable as a continuous optimization metric |

**In place since Phase 103:**
- Orchestrator fully implements 9-step loop including circuit breakers, cost estimate gate, promotion approval
- `--self` and `--skill` are already parsed and detected — they just hit an abort stub today

---

## Open Questions

1. **Skills directory structure for SELF-03**
   - What we know: `.claude/skills/` does not exist. No `skills/` directory anywhere in the project.
   - What's unclear: Should Phase 104 create a minimal `skills/` scaffold to enable the SKILL.md target path, or should `--skill` map to the 14 workflow names as a proxy?
   - Recommendation: Map `--skill {name}` to `workflows/{name}.md` as the initial implementation. Document this as a stepping stone toward a full skills directory if needed in v0.14. This satisfies SELF-03's success criterion ("targets the named skill's SKILL.md and associated workflow files") by treating the workflow file as the skill's primary optimization target.

2. **Single-file vs multi-file --skill targeting**
   - What we know: SELF-03 says "SKILL.md and associated workflow files" (plural) but skills dir doesn't exist.
   - What's unclear: For `--skill brief`, does this mean just `workflows/brief.md`, or also related agent files?
   - Recommendation: Target a single workflow file per skill invocation. This keeps the experiment atomic (one change per iteration correlates clearly to one file). Multi-file is ADV-02 territory.

3. **nyquist-metric.cjs subset vs full suite**
   - What we know: Full suite has 8 pre-existing failures in older phases (phase-83 wiring-fixes). Baseline will capture this accurately.
   - What's unclear: Should the self-improvement preset use the full suite (1083 tests) or a curated subset targeting only the 14 design workflows?
   - Recommendation: Use the full suite. Pre-existing failures are captured in baseline; any regression fires DISCARD. This is the most conservative and correct regression guard.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` |
| Config file | none — discovered via `node --test tests/` |
| Quick run command | `node --test tests/phase-104/` |
| Full suite command | `node --test tests/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SELF-01 | `--self` generates valid experiment.md with nyquist_pass_count metric and all 14 mutable_files | unit | `node --test tests/phase-104/experiment-self-preset.test.mjs` | Wave 0 |
| SELF-01 | `bin/nyquist-metric.cjs` outputs integer pass count as last line, exits 0 | unit | `node --test tests/phase-104/nyquist-metric.test.mjs` | Wave 0 |
| SELF-02 | Auto-discovery returns exactly the 14 authorized OPTIMIZABLE workflow files | unit | `node --test tests/phase-104/experiment-self-preset.test.mjs` | Wave 0 |
| SELF-02 | Auto-discovery excludes infrastructure workflows even if they have OPTIMIZABLE markers | unit | `node --test tests/phase-104/experiment-self-preset.test.mjs` | Wave 0 |
| SELF-03 | `--skill {name}` with a known skill name generates valid experiment.md targeting that workflow | unit | `node --test tests/phase-104/experiment-skill-preset.test.mjs` | Wave 0 |
| SELF-03 | `--skill unknown` aborts with clear error listing known skills | unit | `node --test tests/phase-104/experiment-skill-preset.test.mjs` | Wave 0 |
| SELF-01 | `workflows/optimize.md` Step 1 contains `--self` preset resolution logic (structural check) | structural | `node --test tests/phase-104/experiment-self-preset.test.mjs` | Wave 0 |
| SELF-03 | `workflows/optimize.md` Step 1 contains `--skill` preset resolution logic (structural check) | structural | `node --test tests/phase-104/experiment-skill-preset.test.mjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-104/`
- **Per wave merge:** `node --test tests/`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-104/experiment-self-preset.test.mjs` — covers SELF-01, SELF-02
- [ ] `tests/phase-104/experiment-skill-preset.test.mjs` — covers SELF-03
- [ ] `tests/phase-104/nyquist-metric.test.mjs` — covers the bin/nyquist-metric.cjs helper

---

## Sources

### Primary (HIGH confidence)

- `workflows/optimize.md` (lines 14-22) — confirmed --self/--skill detection and abort stub
- `bin/lib/experiment-runner.cjs` (lines 69-106) — confirmed _evalMetric contract: last line of stdout as float, exit 0 required
- `references/experiment-boundaries.md` (lines 244-261) — authoritative list of 14 OPTIMIZABLE workflow files
- `bin/lib/experiment-schema.cjs` (lines 35-44) — confirmed REQUIRED_FIELDS: metric, direction, verify, mutable_files
- `bin/pde-tools.cjs` (lines 835-928) — confirmed full experiment subcommand set
- Live test run — `node --test tests/phase-103/` → `# pass 46 # fail 0`; full suite `# pass 1075 # fail 8`

### Secondary (MEDIUM confidence)

- `agents/pde-experiment-runner.md` — confirms minimal context contract (SELF-06), Bash restricted to pde-tools subcommands
- `workflows/brief.md` lines 308, `workflows/system.md` lines 1240 — OPTIMIZABLE markers verified present

### Tertiary (LOW confidence)

- None — all findings verified from source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules read directly, no inference
- Architecture: HIGH — preset pattern is a direct extension of existing Step 1 logic
- Pitfalls: HIGH — derived from verified contract behavior of `_evalMetric` and boundary enforcement

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable — all referenced files are locked infrastructure)
