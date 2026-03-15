# Tooling Patterns Reference Library

> Patterns for the tooling domain: lint rules, test strategies, health check criteria, and update migration.
> Loaded via `@` reference from `/pde:setup`, `/pde:test`, and `/pde:update` skill files.
>
> **Version:** 1.0
> **Scope:** Tooling domain patterns (STP, TST, UPD skills)
> **Ownership:** Tooling domain
> **Boundary:** This file owns operational patterns for setup, testing, and updates. Skill-specific logic lives in individual skill files. Output conventions live in `skill-style-guide.md`. MCP integration patterns live in `mcp-integration.md`.

---

<!-- TIER: essentials -->

## Lint Rules

`/pde:test --lint` validates all skill files against these rules. Each rule has an ID, severity, and check description.

### Required Skill File Sections

Every skill file MUST contain these XML-style sections. Missing sections fail lint.

| Rule ID | Section | Check | Severity |
|---------|---------|-------|----------|
| LINT-001 | `<purpose>` | Section exists and is non-empty | error |
| LINT-002 | `<skill_code>` | Section exists and contains valid 2-4 letter uppercase code | error |
| LINT-003 | `<skill_domain>` | Section exists and contains valid domain (strategy, visual, ux, review, system, tooling, hardware, handoff) | error |
| LINT-004 | `<context_routing>` | Section exists with mode detection and file loading patterns | error |
| LINT-005 | `<process>` | Section exists with numbered steps | error |

### Skill Code Validation

| Rule ID | Check | Severity |
|---------|-------|----------|
| LINT-010 | skill_code in file matches entry in skill-registry.md | error |
| LINT-011 | skill_code is unique across all skill files | error |
| LINT-012 | skill_code follows pattern: 2-4 uppercase letters | error |

### Flag Convention Compliance

| Rule ID | Check | Severity |
|---------|-------|----------|
| LINT-020 | `--dry-run` flag documented in process section | warning |
| LINT-021 | `--quick` flag documented in process section | warning |
| LINT-022 | `--verbose` flag documented in process section | warning |
| LINT-023 | `--no-mcp` flag documented in process section or MCP section | warning |
| LINT-024 | All flag names use kebab-case | error |
| LINT-025 | No duplicate flag names within a skill | error |

### Output Standards Compliance

| Rule ID | Check | Severity |
|---------|-------|----------|
| LINT-030 | Standard output summary table pattern present in process section | warning |
| LINT-031 | Prerequisite check pattern present ("Missing X -- run /pde:Y first") | warning |
| LINT-032 | Error message follows What/Why/What-to-do structure | info |

### MCP Integration Compliance

| Rule ID | Check | Severity |
|---------|-------|----------|
| LINT-040 | MCP integration section present (probe/use/degrade pattern) or explicit "No MCP integration" note | warning |
| LINT-041 | If MCP section exists: references mcp-integration.md via @ include | info |
| LINT-042 | Source tag patterns present ("[Enhanced by" or "[Manual check") | info |

### Lint Output Format

```
LINT RESULTS: {skill_code} ({skill_file})
  [error] LINT-001: Missing <purpose> section
  [warning] LINT-020: --dry-run flag not documented
  [info] LINT-042: No MCP source tag patterns found

Summary: 1 error, 1 warning, 1 info
Status: FAIL (errors present)
```

**Severity interpretation:**
- `error`: Skill file is structurally invalid. MUST fix before release
- `warning`: Skill file is missing recommended pattern. SHOULD fix for consistency
- `info`: Suggestion for improvement. MAY fix

**Overall lint status:**
- `PASS`: No errors (warnings and info are OK)
- `FAIL`: One or more errors present

## Test Strategies

`/pde:test` uses these strategies to validate skill correctness.

### Smoke Test Definition

A smoke test verifies a skill's basic operation. Every skill gets at least one smoke test.

**Smoke test protocol:**
1. Invoke skill with minimal valid input
2. Verify: output file(s) created at expected path
3. Verify: output file(s) are non-empty and well-formed (valid HTML, valid Markdown, valid JSON)
4. Verify: DESIGN-STATE updated (new artifact entry or status change)
5. Verify: standard output summary table present in skill output
6. Verify: no unhandled errors during execution

**Minimal inputs per skill type:**

| Skill Type | Minimal Input | Expected Output |
|-----------|---------------|-----------------|
| Brief (BRF) | "A simple todo app" | brief.md in strategy/ |
| Flows (FLW) | (uses existing brief) | flows.md with Mermaid diagrams in ux/ |
| System (SYS) | (uses existing brief) | tokens.css, components in visual/ |
| Wireframe (WFR) | "login" (single screen) | wireframe-login.html in ux/ |
| Mockup (MCK) | "login" (single screen, needs wireframe) | mockup-login.html in ux/mockups/ |
| Critique (CRT) | (uses existing artifacts) | critique-report.md in review/ |
| HIG (HIG) | (uses existing HTML) | hig-audit.md in review/ |
| Iterate (ITR) | (uses existing critique) | Updated artifact file |
| Handoff (HND) | (uses all prior artifacts) | handoff-spec.md in handoff/ |
| Hardware (HDW) | "bluetooth speaker" | hardware-spec.md in hardware/ |
| Competitive (CMP) | "todo apps" | competitive-analysis.md in strategy/ |
| Opportunity (OPP) | (uses existing competitive) | opportunity-scores.md in strategy/ |
| Help (HLP) | (no input) | Help text output |
| Migrate (MIG) | (standalone project exists) | Migrated project structure |
| Setup (STP) | --health | setup-report.md |
| Test (TST) | --lint | test-report.md |
| Update (UPD) | --check | Version check output |

### Dual-Path Testing

Every skill MUST be tested in two modes:

**Path 1: With MCPs** (enhanced mode)
```
/pde:test {skill}
```
- All available MCPs are probed and used
- Verify MCP source tags present in output ("[Enhanced by X MCP]")
- Verify MCP log entries written to mcp-debug.log

**Path 2: Without MCPs** (baseline mode)
```
/pde:test {skill} --no-mcp
```
- All MCPs disabled via --no-mcp flag
- Verify skill completes successfully without MCPs
- Verify degraded source tags present ("[Manual check -- install X MCP]")
- Verify structural output is equivalent (same files, same sections, same key fields)

**Structural equivalence criteria:**
- Same number of output files
- Same file names and locations
- Same section headers in Markdown/HTML output
- Same DESIGN-STATE artifact entries
- Content may differ (MCP-enhanced sections have richer content)

### Golden Output Comparison

Golden tests compare output against a known-good structural baseline.

**What's compared (structural):**
- File list: names, paths, types
- Section headers: exact match for top-level sections
- Key fields: specific fields that must be present (e.g., "Primary 500" in tokens, "product_type" in brief)
- DESIGN-STATE entries: artifact codes, statuses, dependencies

**What's NOT compared (content):**
- Exact text content (varies with training knowledge updates)
- Token values (colors, sizes -- algorithmically generated but may shift)
- MCP-enhanced sections (vary with MCP availability)
- Timestamps, file sizes

**Golden baseline location:** `${CLAUDE_PLUGIN_ROOT}/tests/golden/`

**Golden baseline format:**
```json
{
  "skill": "WFR",
  "input": "login",
  "expected_files": [
    { "path": "ux/wireframes/wireframe-login.html", "type": "html", "min_size_bytes": 1000 },
    { "path": "ux/wireframes/index.html", "type": "html" }
  ],
  "expected_sections": ["Navigation", "Main Content", "Footer"],
  "expected_state_entries": ["WFR-login-lofi", "WFR-login-hifi"],
  "expected_summary_fields": ["Files created", "Next suggested skill"]
}
```

### Per-Skill Filter

`/pde:test` accepts comma-separated skill codes:

```
/pde:test wireframe,system       # Test specific skills
/pde:test --all                  # Test all skills
/pde:test --lint                 # Lint only (no smoke tests)
/pde:test --e2e                  # E2E pipeline test (separate from --all)
```

**Skill resolution:**
- Accept both command names and skill codes: `wireframe` or `WFR`
- Case-insensitive: `wireframe`, `Wireframe`, `WIREFRAME` all work
- Unknown skill name: error with suggestion

---

<!-- TIER: standard -->

## Health Check Criteria

`/pde:setup --health` validates system state against these criteria.

### System Prerequisites

| Check ID | What | Pass Criteria | Severity |
|----------|------|---------------|----------|
| SYS-001 | Node.js version | >= 20.0.0 | error |
| SYS-002 | npm available | `npm --version` succeeds | error |
| SYS-003 | npx available | `npx --version` succeeds | error |
| SYS-004 | Disk space | >= 100MB free in home directory | warning |
| SYS-005 | OS compatibility | macOS, Linux, or WSL | info |

### PDE Installation Integrity

| Check ID | What | Pass Criteria | Severity |
|----------|------|---------------|----------|
| PDE-001 | Skills directory | `${CLAUDE_PLUGIN_ROOT}/skills/` exists with expected skill files | error |
| PDE-002 | References directory | `${CLAUDE_PLUGIN_ROOT}/references/` exists with expected reference files | error |
| PDE-003 | Templates directory | `${CLAUDE_PLUGIN_ROOT}/templates/` exists with expected template files | error |
| PDE-004 | Skill registry | `${CLAUDE_PLUGIN_ROOT}/skill-registry.md` exists and parseable | error |
| PDE-005 | Skill count | Number of skill files matches registry entries | warning |
| PDE-006 | Reference count | Number of reference files matches expected (15 for v1.0) | warning |
| PDE-007 | Template count | Number of template files matches expected | warning |
| PDE-008 | Agent definitions | `~/.claude/agents/pde-*.md` files exist for registered agents | warning |

### Expected File Lists (v1.0)

**Skills (17 files):**
brief.md, flows.md, system.md, wireframe.md, mockup.md, critique.md, hig.md, iterate.md, handoff.md, hardware.md, competitive.md, opportunity.md, help.md, migrate.md, setup.md, test.md, update.md

**References (15 files):**
color-systems.md, typography.md, web-modern-css.md, responsive-patterns.md, interaction-patterns.md, design-principles.md, wcag-baseline.md, strategy-frameworks.md, consumer-electronics.md, enclosures.md, iot-embedded.md, wearables.md, mcp-integration.md, skill-style-guide.md, tooling-patterns.md

### MCP Server Availability

| Check ID | MCP | Probe Method | Severity |
|----------|-----|-------------|----------|
| MCP-001 | Superpowers | Attempt browser preview tool | info |
| MCP-002 | Sequential Thinking | Attempt think tool | info |
| MCP-003 | Figma MCP | Attempt read operation | info |
| MCP-004 | Playwright MCP | Navigate to about:blank | info |
| MCP-005 | Axe a11y MCP | Attempt accessibility audit | info |
| MCP-006 | Context7 | Resolve known library ID | info |
| MCP-007 | Reference MCP (PDE) | List references | warning |

**MCP severity rationale:**
- All MCPs are info-level except Reference MCP (warning) because Reference MCP is bundled with PDE and should always be available
- No MCP is error-level because all skills work without MCPs

### DESIGN-STATE Format Check

| Check ID | What | Pass Criteria | Severity |
|----------|------|---------------|----------|
| DS-001 | Schema version | "Schema: 1.0" present in root DESIGN-STATE | info |
| DS-002 | Split format | Per-domain DESIGN-STATE files exist (if project has artifacts) | info |
| DS-003 | Migration needed | Old single-file format detected -> suggest running migration | warning |

### Health Report Output

```
PDE HEALTH CHECK

System Prerequisites:
  [pass] SYS-001: Node.js v22.1.0 (>= 20.0.0)
  [pass] SYS-002: npm v10.2.0
  [pass] SYS-003: npx v10.2.0
  [warn] SYS-004: 89MB free (>= 100MB recommended)

PDE Installation:
  [pass] PDE-001: Skills directory (17/17 files)
  [pass] PDE-002: References directory (15/15 files)
  [pass] PDE-003: Templates directory (15/15 files)
  [pass] PDE-004: Skill registry valid
  [pass] PDE-005: Skill count matches (17)
  [pass] PDE-006: Reference count matches (15)

MCP Servers:
  [pass] MCP-001: Superpowers available
  [pass] MCP-002: Sequential Thinking available
  [skip] MCP-003: Figma MCP not installed (optional)
  [pass] MCP-004: Playwright available
  [skip] MCP-005: Axe a11y not installed (optional)
  [pass] MCP-006: Context7 available
  [pass] MCP-007: Reference MCP available

Summary: 14 pass, 1 warning, 0 errors, 2 skipped
Status: HEALTHY
```

## Update Migration Patterns

`/pde:update` uses these patterns for safe version transitions.

### Schema Version Detection

Every DESIGN-STATE file starts with:
```
Schema: 1.0
```

**Migration trigger:** `/pde:update` (or any skill on first run) detects schema version mismatch:

```
Current schema: {detected_version}
Expected schema: {current_pde_version_schema}

IF detected < expected:
  RUN auto-migration
  REPORT: "Migrated DESIGN-STATE from v{old} to v{new}"

IF detected > expected:
  WARNING: "DESIGN-STATE schema v{detected} is newer than PDE v{expected}. Run /pde:update."
  CONTINUE without migration (forward-compatible reading)

IF detected == expected:
  No migration needed
```

### Non-Destructive Migration Principles

1. **Add, never delete:** New sections added with sensible defaults. Existing sections preserved unchanged
2. **Copy, never move:** File splits create new files alongside originals. Originals preserved until user deletes
3. **Preserve user data:** Custom notes, manual entries, user-added fields are never modified
4. **Backup before migration:** Copy original file to `{filename}.pre-migration.bak`
5. **Verify after migration:** Re-read migrated files, verify all original artifact entries present
6. **Report changes:** Log every modification made during migration

### Migration Step Template

```
Migration: v{old} -> v{new}

Step 1: Backup
  Copy {file} to {file}.pre-migration.bak

Step 2: Read current state
  Parse all artifact entries, notes, custom fields

Step 3: Transform
  {specific transformation steps for this version bump}

Step 4: Write new format
  Write transformed data to new file(s)

Step 5: Verify
  Re-read new file(s)
  Compare artifact count: {old_count} -> {new_count} (must match)
  Compare field coverage: all original fields present

Step 6: Report
  "Migrated {file}: {N} artifacts preserved, {M} new fields added"
```

### Changelog Format

PDE uses semver with a CHANGELOG.md at `${CLAUDE_PLUGIN_ROOT}/CHANGELOG.md`:

```markdown
# PDE-OS Changelog

## [1.1.0] - 2026-04-XX

### Added
- New feature description

### Changed
- Changed behavior description

### Fixed
- Bug fix description

### Deprecated
- Deprecated feature (will be removed in vX.0.0)

## [1.0.0] - 2026-03-XX

### Added
- Initial release: 17 skills, 15 references, MCP integration
```

### Rollback Strategy

PDE does not implement a custom rollback mechanism. Rollback uses git:

```bash
# View available versions
git log --oneline ${CLAUDE_PLUGIN_ROOT}/

# Rollback to specific version
git checkout {hash} -- ${CLAUDE_PLUGIN_ROOT}/

# Full rollback
git revert {hash}
```

**Documented in `/pde:update` help text:**
- "To rollback: use git to revert to a previous commit"
- "PDE stores all files in git-trackable locations for this reason"

---

<!-- TIER: comprehensive -->

## Test History Tracking

`/pde:test` maintains historical test data for trend analysis and regression detection.

### Test History File

**Location:** `${CLAUDE_PLUGIN_ROOT}/test-history.json`

### Schema

```json
{
  "version": "1.0",
  "runs": [
    {
      "id": "run-2026-03-11T14:30:00Z",
      "timestamp": "2026-03-11T14:30:00Z",
      "type": "smoke|lint|e2e|full",
      "skills_tested": ["WFR", "SYS", "CRT"],
      "mcp_mode": "enhanced|baseline",
      "results": {
        "WFR": {
          "status": "pass|fail|skip",
          "duration_ms": 12340,
          "errors": [],
          "warnings": ["LINT-020: --dry-run not documented"],
          "files_created": 3,
          "mcp_used": ["playwright", "axe"]
        },
        "SYS": {
          "status": "pass",
          "duration_ms": 8920,
          "errors": [],
          "warnings": [],
          "files_created": 5,
          "mcp_used": ["figma", "context7"]
        }
      },
      "mcp_availability": {
        "superpowers": { "available": true, "probe_ms": 120 },
        "sequential-thinking": { "available": true, "probe_ms": 340 },
        "figma": { "available": false, "probe_ms": 0, "reason": "not installed" },
        "playwright": { "available": true, "probe_ms": 890 },
        "axe": { "available": true, "probe_ms": 450 },
        "context7": { "available": true, "probe_ms": 210 },
        "reference-mcp": { "available": true, "probe_ms": 45 }
      },
      "summary": {
        "total": 3,
        "passed": 3,
        "failed": 0,
        "skipped": 0,
        "duration_ms": 21260
      }
    }
  ]
}
```

### Per-MCP Reliability Tracking

Aggregate from test history to track MCP reliability over time:

```
MCP Reliability (last 10 runs):

| MCP | Success | Failure | Timeout | Rate | Status |
|-----|---------|---------|---------|------|--------|
| superpowers | 10 | 0 | 0 | 100% | healthy |
| playwright | 9 | 1 | 0 | 90% | healthy |
| axe | 7 | 2 | 1 | 70% | degraded |
| context7 | 10 | 0 | 0 | 100% | healthy |
```

**Status thresholds:**
- `healthy`: >= 80% success rate
- `degraded`: >= 60% and < 80% success rate (show warning)
- `unreliable`: < 60% success rate (flag for investigation)

**Alert threshold:** Any MCP failing > 20% of probes across last 10 runs triggers:
```
Warning: {MCP_NAME} MCP failing {rate}% of probes.
  Consider: reinstalling ({install_command}), checking network, or disabling (--no-{name}).
```

### Regression Detection

Compare current run against previous runs to detect regressions:

**Regression indicators:**
- Skill that previously passed now fails
- Duration increased by > 50% (may indicate infinite loop or excessive MCP retries)
- New lint errors in previously clean skill
- File count decreased (missing output files)

**Regression report format:**
```
REGRESSION DETECTED:

/pde:wireframe:
  Previous: pass (12.3s, 3 files)
  Current: fail (timeout, 0 files)
  Likely cause: Playwright MCP timeout during validation

/pde:system:
  Previous: pass (8.9s)
  Current: pass (18.4s) -- 107% slower
  Likely cause: Context7 MCP slow responses
```

### CI Output Format

`/pde:test --ci` produces machine-readable JSON:

```json
{
  "timestamp": "2026-03-11T14:30:00Z",
  "status": "pass",
  "total": 17,
  "passed": 17,
  "failed": 0,
  "skipped": 0,
  "duration_ms": 45000,
  "results": {
    "BRF": { "status": "pass", "duration_ms": 2100 },
    "FLW": { "status": "pass", "duration_ms": 3200 }
  }
}
```

Exit codes:
- `0`: All tests passed
- `1`: One or more tests failed
- `2`: Test infrastructure error (cannot run tests)

### E2E Pipeline Test

The E2E test runs the full PDE pipeline on a fixed sample project.

**Sample project:** Digital hardware granular synthesizer with AU plugin companion
- Exercises BOTH hardware and software pipelines
- Minimal fixture: product name + one-sentence description only
- All other content generated by skills

**E2E test steps:**
1. Create fresh output directory
2. Run: brief -> flows -> system -> wireframe -> mockup -> critique -> hig -> handoff
3. Also run: hardware (branching from brief)
4. Verify: all expected files created
5. Verify: DESIGN-STATE has complete artifact chain
6. Verify: cross-references between artifacts resolve
7. Compare against golden structural baseline

**E2E is separate:** Only runs with `--e2e` flag, NOT part of `--all`:
```
/pde:test --e2e          # E2E only
/pde:test --all --e2e    # Full suite including E2E
```

### Test Watch Mode

`/pde:test --watch` monitors file changes and auto-runs relevant tests:

**Watched paths:**
- `${CLAUDE_PLUGIN_ROOT}/skills/*.md` -- run lint + smoke for changed skill
- `${CLAUDE_PLUGIN_ROOT}/references/*.md` -- run lint for skills that reference the changed file
- `${CLAUDE_PLUGIN_ROOT}/templates/*.md` -- run smoke for skills that use the changed template

**Watch behavior:**
- Debounce: 500ms after last change before running tests
- Only run tests relevant to changed files (not full suite)
- Show results inline, clear screen between runs
- Exit with Ctrl+C

### Performance Benchmarks

`/pde:test` tracks per-skill execution time:

```
PERFORMANCE BENCHMARKS:

| Skill | Current | Previous | Delta | Status |
|-------|---------|----------|-------|--------|
| BRF | 2.1s | 2.0s | +5% | ok |
| FLW | 3.2s | 3.1s | +3% | ok |
| SYS | 8.9s | 5.2s | +71% | regression |
| WFR | 12.3s | 12.0s | +2% | ok |
```

**Regression threshold:** > 50% increase flags as regression.

---

*Version: 1.0.0*
*Last updated: 2026-03-11*
*Loaded by: /pde:setup, /pde:test, /pde:update via @ reference for tooling domain patterns*
