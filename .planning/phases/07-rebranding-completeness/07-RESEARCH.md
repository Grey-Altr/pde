# Phase 7: Rebranding Completeness - Research

**Researched:** 2026-03-14
**Domain:** GSD brand string elimination — codebase grep audit and scope definition
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BRAND-01 | Zero occurrences of "gsd" or "GSD" in any source file (case-insensitive grep clean) | Source code already clean; scope must exclude .planning/ artifacts |
| BRAND-02 | Zero occurrences of "get-shit-done" in any path reference | Source code already clean; zero occurrences confirmed |
| BRAND-03 | Zero hardcoded absolute paths containing specific usernames | Source code already clean; only example paths remain (placeholder names, not greyaltaer) |
| BRAND-04 | All UI banners display "PDE ►" instead of "GSD ►" | Already met — all banner() calls use PDE stage names; zero GSD-branded banner calls |
| BRAND-05 | All stage names, status symbols, and progress displays use PDE branding | Already met — workflows pass PDE stage names (RESEARCHING, PLANNING PHASE X, etc.) |
| BRAND-06 | README and any documentation reference PDE, not GSD | SCOPE CONFLICT: ROADMAP Phase 7 header lists this but ROADMAP Phase 8 details assign it; no README exists yet |
| PLUG-04 | Zero GSD references in any user-visible output or error message | Source code already clean; bin/, lib/, commands/, workflows/ all have zero GSD references |
</phase_requirements>

## Summary

Phase 7 is primarily a **verification phase**, not a remediation phase. Prior phases (1–6) successfully eliminated all GSD references from the plugin's source code. A comprehensive grep audit run across all source directories (bin/, lib/, commands/, workflows/, templates/, references/) returns **zero matches** for every success criterion pattern. The source code is grep-clean.

The key planning challenge is **scope definition**: the project root contains a `.planning/` directory with ~542 historical GSD references. These files are project tracking artifacts for PDE's own development process — they document the fork from GSD and record decisions about renaming GSD to PDE. Running `grep -rni "gsd" .` from the project root without excluding `.planning/` will show these references. The planner must scope the audit to plugin source files (`--exclude-dir=.planning`) and establish this as the correct interpretation of "source files" in BRAND-01.

One concrete fix remains: `.planning/STATE.md` has a frontmatter key `gsd_state_version: 1.0` — a legacy artifact from before Phase 2 rebranded `state.cjs`. New STATE.md files written by the PDE toolchain use `pde_state_version: 1.0`, but this project's live STATE.md still carries the old key. This should be corrected.

**Primary recommendation:** The three plans (07-01 grep audit, 07-02 absolute paths, 07-03 banner verification) are all verification tasks against already-clean source. The planner should add a scope clarification task and the STATE.md frontmatter fix, then produce grep audit evidence for each success criterion.

## Standard Stack

No new libraries are introduced. This phase uses only the tools already present in the project.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| grep | system | String pattern search across files | The success criteria are defined as grep commands |
| Node.js | 20.x LTS | Running pde-tools.cjs for verification helpers | Already the project runtime |

### Verification Pattern
All verification in this phase is **bash grep-based** — the same pattern used in all previous PLAN.md files. Each verification task runs a grep command and checks the exit code or line count.

```bash
# Standard verification pattern (from prior plan files)
count=$(grep -rni "gsd\|get-shit-done" \
  bin/ lib/ commands/ workflows/ templates/ references/ \
  2>/dev/null | wc -l | tr -d ' ')
if [ "$count" = "0" ]; then echo "PASS"; else echo "FAIL: $count occurrences"; fi
```

## Architecture Patterns

### Scope Definition (Critical)

The project has two distinct file categories:

| Category | Directories | GSD Status | Action |
|----------|-------------|-----------|--------|
| Plugin source (ships to users) | `bin/`, `lib/`, `commands/`, `workflows/`, `templates/`, `references/`, `.claude-plugin/` | ZERO GSD references | Verify and document |
| Project artifacts (development tracking) | `.planning/` | ~542 GSD references (historical) | Exclude from audit scope |

The success criterion `grep -rni "gsd|get-shit-done" .` run naively from the project root will match `.planning/` files. The planner must establish the audit scope as **plugin source files only**, consistent with the BRAND-01 wording "any source file." `.planning/` files are not source files shipped to users — they are this project's own development notes.

**Correct audit command:**
```bash
grep -rni "gsd\|get-shit-done" \
  bin/ lib/ commands/ workflows/ templates/ references/ .claude-plugin/ \
  2>/dev/null
```

### BRAND-06 Scope Conflict

The ROADMAP Phase 7 header lists BRAND-06 in its Requirements field, but the ROADMAP Phase 8 detailed section correctly assigns BRAND-06 ("README and any documentation reference PDE, not GSD"). No README.md exists in the project yet — README creation is Phase 8 scope. The planner should note this inconsistency and treat BRAND-06 as Phase 8 scope. Phase 7 does not create a README.

### One Concrete Fix: STATE.md Frontmatter Key

`.planning/STATE.md` line 2 contains:
```
gsd_state_version: 1.0
```

This should be:
```
pde_state_version: 1.0
```

`bin/lib/state.cjs` already writes `pde_state_version` for new STATE.md files (confirmed at line 640). The live `.planning/STATE.md` was created before Phase 2 rebranded state.cjs and still carries the legacy key. This is a one-line fix.

### Current Brand Status (Verified)

| Audit | Command | Result | Verified |
|-------|---------|--------|---------|
| GSD/get-shit-done in source | `grep -rni "gsd\|get-shit-done" bin/ lib/ commands/ workflows/ templates/ references/` | 0 matches | YES |
| /gsd: command prefix in source | `grep -rn "/gsd:" bin/ lib/ commands/ workflows/ templates/ references/` | 0 matches | YES |
| .gsd config paths in source | `grep -rn "\.gsd\|/\.gsd" bin/ lib/ commands/ workflows/ templates/ references/` | 0 matches | YES |
| Username-specific absolute paths | `grep -rni "greyaltaer" bin/ lib/ commands/ workflows/ templates/ references/` | 0 matches | YES |
| plugin.json GSD references | `grep -i "gsd" .claude-plugin/plugin.json` | 0 matches | YES |
| Banner calls with GSD branding | `grep -rn "GSD ►\|\"GSD" workflows/` | 0 matches | YES |
| PDE stage names in banner calls | `grep -rn "render.cjs.*banner" workflows/` | All use PDE names | YES |
| splash.cjs PDE branding | `grep "Platform Development Engine" lib/ui/splash.cjs` | Line 89 confirmed | YES |

### /Users/ in Source Files

Three files contain `/Users/` strings — none are hardcoded developer paths:

| File | Line | Content | Type |
|------|------|---------|------|
| `references/skill-style-guide.md` | 153–155 | `/Users/name/project/ux/wireframes/...` | Generic placeholder (not a real username) |
| `templates/phase-prompt.md` | 335 | `GET /users (list), GET /users/:id` | REST API endpoint example |
| `templates/codebase/concerns.md` | 166 | `app/admin/users/page.tsx` | File path example in template |

None of these are real username references. Success criterion 4 ("No hardcoded absolute paths containing specific usernames") is satisfied.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Brand audit | Custom Node.js script | `grep -rni` shell commands | The success criteria are defined as grep commands; match the format exactly |
| File editing | sed inline | Read + Write with explicit content | Safer, auditable, matches project conventions from prior plans |

## Common Pitfalls

### Pitfall 1: Including .planning/ in the Grep Audit
**What goes wrong:** Running `grep -rni "gsd" .` from project root finds 542+ matches in `.planning/` historical docs and declares the phase failed.
**Why it happens:** The success criterion as written does not use `--exclude-dir`.
**How to avoid:** Define audit scope explicitly. Run grep against the six source directories only. Document the scope decision in the phase summary.
**Warning signs:** Grep output showing matches in `.planning/phases/` or `.planning/research/`.

### Pitfall 2: Trying to Clean .planning/ Historical Docs
**What goes wrong:** Executor edits `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md`, and phase plan files to remove GSD text — destroying historical accuracy and breaking references to what prior phases actually did.
**Why it happens:** Misreading the scope of "grep clean."
**How to avoid:** Treat `.planning/` as immutable historical record. Only edit `.planning/STATE.md` frontmatter (`gsd_state_version` → `pde_state_version`).

### Pitfall 3: Treating /Users/name/ as a Violation
**What goes wrong:** Executor flags `references/skill-style-guide.md` lines 153–155 (which use `/Users/name/...`) as username violations and attempts to modify them.
**Why it happens:** Surface-level pattern match on `/Users/`.
**How to avoid:** The criterion says "paths containing specific usernames." `/Users/name/` is a generic placeholder. The real check is for `/Users/greyaltaer/` or similar — and zero such references exist in source.

### Pitfall 4: Confusing Banner Content with Banner Format
**What goes wrong:** Executor looks for literal "PDE ►" text in workflow files and flags the phase as failing because no file contains that exact Unicode string.
**Why it happens:** The ROADMAP success criterion uses "PDE ►" as a visual indicator, not as literal required text.
**How to avoid:** The actual requirement (BRAND-04, BRAND-05) is that banners use PDE stage names, not GSD stage names. The `banner()` function renders `████████ STAGE NAME ████████` — the stage name content comes from workflow callers. All workflow callers already pass PDE-branded stage names (RESEARCHING, PLANNING PHASE X, etc.).

### Pitfall 5: Including BRAND-06 (README) in Phase 7
**What goes wrong:** Executor attempts to create a README.md as part of Phase 7.
**Why it happens:** ROADMAP Phase 7 header line lists BRAND-06 in its Requirements field.
**How to avoid:** The ROADMAP Phase 8 detailed section correctly assigns BRAND-06 ("README and any documentation reference PDE, not GSD"). BRAND-06 requires README creation, which is Phase 8 scope. Phase 7 has no README deliverable.

## Code Examples

### Correct Audit Command (scoped to source)
```bash
# Run from project root
# BRAND-01 + BRAND-02: GSD/get-shit-done in source
grep -rni "gsd\|get-shit-done" \
  bin/ lib/ commands/ workflows/ templates/ references/ .claude-plugin/ \
  2>/dev/null | wc -l

# PLUG-04: /gsd: command prefix
grep -rn "/gsd:" \
  bin/ lib/ commands/ workflows/ templates/ references/ \
  2>/dev/null | wc -l

# BRAND-03: .gsd config paths
grep -rn "\.gsd\|/\.gsd" \
  bin/ lib/ commands/ workflows/ templates/ references/ \
  2>/dev/null | wc -l

# BRAND-03: Username-specific absolute paths
grep -rni "greyaltaer\|/Users/[a-zA-Z0-9_-]*/" \
  bin/ lib/ commands/ workflows/ templates/ references/ \
  2>/dev/null | grep -v "/Users/name/" | grep -v "/users/" | wc -l
```

### STATE.md Frontmatter Fix
```
# Before (line 2 of .planning/STATE.md)
gsd_state_version: 1.0

# After
pde_state_version: 1.0
```

### Banner Verification Command
```bash
# Verify zero GSD-branded banner calls in workflows
grep -rn "banner.*GSD\|banner.*gsd\|\"GSD" workflows/ 2>/dev/null | wc -l

# Verify splash.cjs shows Platform Development Engine
grep "Platform Development Engine" lib/ui/splash.cjs
```

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in config.json).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — grep-based bash validation (no test runner) |
| Config file | none |
| Quick run command | `grep -rni "gsd" bin/ lib/ commands/ workflows/ templates/ references/ 2>/dev/null \| wc -l` (expect: `0`) |
| Full suite command | Run all four audit greps from Code Examples section; all must return `0` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAND-01 | Zero gsd/GSD in source files | smoke | `grep -rni "gsd\|get-shit-done" bin/ lib/ commands/ workflows/ templates/ references/ .claude-plugin/ 2>/dev/null \| wc -l` (expect: `0`) | N/A — bash command |
| BRAND-02 | Zero get-shit-done in path references | smoke | Covered by BRAND-01 command above | N/A |
| BRAND-03 | Zero username-specific absolute paths | smoke | `grep -rni "greyaltaer" bin/ lib/ commands/ workflows/ templates/ references/ 2>/dev/null \| wc -l` (expect: `0`) | N/A |
| BRAND-04 | UI banners use PDE branding not GSD | smoke | `grep -rn "banner.*GSD" workflows/ 2>/dev/null \| wc -l` (expect: `0`) | N/A |
| BRAND-05 | Stage names use PDE branding | smoke | `grep "Platform Development Engine" lib/ui/splash.cjs` (expect: match found) | N/A |
| PLUG-04 | Zero GSD in user-visible output | smoke | `grep -rn "/gsd:" bin/ lib/ commands/ workflows/ 2>/dev/null \| wc -l` (expect: `0`) | N/A |

### Sampling Rate
- **Per task commit:** `grep -rni "gsd" bin/ lib/ commands/ workflows/ templates/ references/ 2>/dev/null | wc -l` (expect: `0`)
- **Per wave merge:** All six audit commands from the Phase Requirements Test Map
- **Phase gate:** All audit commands return `0` before `/pde:verify-work`

### Wave 0 Gaps
None — no test files needed. All validation is bash grep commands, runnable immediately from the project root.

## State of the Art

| Old Status | Current Status | When Changed | Impact |
|------------|----------------|--------------|--------|
| GSD strings throughout source | Zero GSD strings in source | Phases 2–6 (completed 2026-03-15) | Phase 7 is verification, not remediation |
| `gsd_state_version` in STATE.md frontmatter | `pde_state_version` in new STATE.md files | Phase 2 (state.cjs rebranded) | One manual fix needed for live STATE.md |
| `gsd-tools.cjs` binary | `pde-tools.cjs` binary | Phase 2 | Complete |
| `/gsd:` command prefix | `/pde:` command prefix | Phase 3 | Complete |
| GSD agent types (`gsd-planner`, etc.) | PDE agent types (`pde-planner`, etc.) | Phase 5 | Complete |
| GSD strings in templates and references | Zero GSD strings | Phase 6 | Complete |

## Open Questions

1. **BRAND-06 Phase Assignment**
   - What we know: ROADMAP Phase 7 header lists BRAND-06; ROADMAP Phase 8 detailed section also lists BRAND-06; traceability table maps BRAND-06 to Phase 8; no README exists
   - What's unclear: Whether Phase 7 should partially address BRAND-06 (e.g., verify no documentation has GSD references) or fully defer to Phase 8
   - Recommendation: Treat BRAND-06 as Phase 8 scope. Phase 7 does not create a README. The ROADMAP Phase 7 header listing appears to be an error (copy from the Requirements list that was later updated).

2. **Audit Scope for Success Criterion #1**
   - What we know: The success criterion says `grep -rni "gsd|get-shit-done" .` returns zero; running this naively from the project root matches ~542 `.planning/` historical documents
   - What's unclear: Whether the planner intended `.planning/` to be in scope
   - Recommendation: Define "source files" as plugin source code shipped to users. Use `--exclude-dir=.planning --exclude-dir=.git` in the audit. Document this scope decision explicitly. The `.planning/` historical docs are immutable development records.

## Sources

### Primary (HIGH confidence)
- Direct filesystem inspection of `/Users/greyaltaer/code/projects/Platform Development Engine/` — all source directories grep-audited with live bash commands; results are ground truth for this project
- `.planning/STATE.md` — confirmed `gsd_state_version: 1.0` frontmatter on line 2
- `.planning/ROADMAP.md` — phase requirements lists and success criteria read directly
- `bin/lib/state.cjs` line 640 — confirmed `pde_state_version: '1.0'` in new STATE.md creation
- `lib/ui/splash.cjs` line 89 — confirmed `Platform Development Engine` branding
- `.planning/phases/06-templates-references/06-VERIFICATION.md` — Phase 6 verification confirms templates and references are clean

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` — original pitfall documentation for the rebrand project, confirms expected problem areas (all resolved by prior phases)
- `.planning/phases/06-templates-references/06-RESEARCH.md` — Phase 6 research confirmed banner() function is generic (no hardcoded GSD branding); stage names are workflow caller responsibility (Phase 3 scope)

## Metadata

**Confidence breakdown:**
- Source code GSD status: HIGH — direct grep audit confirmed zero occurrences across all source directories
- Scope definition (.planning exclusion): HIGH — based on direct file inspection showing historical docs vs. plugin source files
- Banner/stage name compliance: HIGH — confirmed via Phase 6 verification and direct grep of workflow files
- BRAND-06 scope conflict: HIGH confidence that it belongs in Phase 8; the ROADMAP Phase 7 header listing is an error

**Research date:** 2026-03-14
**Valid until:** 2026-03-21 (stable — source code is not changing between phases)
