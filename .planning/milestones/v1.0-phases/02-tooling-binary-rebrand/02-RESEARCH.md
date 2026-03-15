# Phase 2: Tooling & Binary Rebrand — Research

**Researched:** 2026-03-14
**Domain:** Node.js CLI tooling, file-system rebrand, Claude Code plugin bin structure
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TOOL-01 | gsd-tools.cjs rebranded as pde-tools.cjs and fully functional | A renamed, clean copy already exists at `~/.claude/pde/bin/pde-tools.cjs`. Phase 2 copies it into the project repo at `bin/pde-tools.cjs`. |
| TOOL-02 | All bin scripts reference PDE paths (~/.pde/ instead of ~/.gsd/) | All lib files in `~/.claude/pde/bin/lib/` already use `.pde` paths. Zero GSD references remain. Phase 2 copies these files into the repo. |
| TOOL-05 | Config system uses ~/.pde/ for global defaults | `config.cjs` and `init.cjs` already read `~/.pde/defaults.json` and `~/.pde/brave_api_key`. Confirmed clean. |
| TOOL-06 | Git branch templates use pde/ prefix instead of gsd/ | `core.cjs` and `config.cjs` both default `phase_branch_template` to `pde/phase-{phase}-{slug}` and `milestone_branch_template` to `pde/{milestone}-{slug}`. Confirmed clean. |
</phase_requirements>

---

## Summary

Phase 2 adds the `bin/` directory to the PDE project repository. The GSD equivalent (`gsd-tools.cjs` + `bin/lib/`) was already forked and fully renamed in a companion PDE installation at `~/.claude/pde/bin/`. All four TOOL requirements are already satisfied in that reference copy — zero GSD strings remain. Phase 2's work is to pull those files into the project repo at `bin/` and run a verification pass to confirm the success criteria hold.

The binary is a self-contained CommonJS Node.js script (`pde-tools.cjs`) that dispatches ~50 subcommands to modules in `bin/lib/`. All `require()` paths are relative (`./lib/core.cjs` etc.), so the script works correctly wherever it is installed. The only external side-effect paths are the global config lookups: `~/.pde/defaults.json` and `~/.pde/brave_api_key` — both already rebranded. Git branch templates default to `pde/` prefix in two places (the hardcoded defaults in `core.cjs` and the `config.cjs` config-ensure defaults).

Phase 3 will update the workflow `.md` files that call `gsd-tools.cjs` with a hardcoded `$HOME/.claude/get-shit-done/bin/` path. Phase 2 does NOT touch workflows — that is explicitly out of scope.

**Primary recommendation:** Copy `~/.claude/pde/bin/` into the project repo as `bin/`, excluding the `pde` launcher script (which belongs to a different project). Then grep-verify the copied files are clean of GSD references.

---

## Key Discoveries

### The Reference Copy Is Already Done

`~/.claude/pde/bin/` contains a complete, fully-rebranded copy of the tooling:

| File | Status |
|------|--------|
| `bin/pde-tools.cjs` | Clean — all `gsd` references updated to `pde` |
| `bin/lib/core.cjs` | Clean — MODEL_PROFILES use `pde-*` keys; branch templates use `pde/` prefix; tmp file prefix is `pde-` |
| `bin/lib/config.cjs` | Clean — reads `~/.pde/defaults.json` and `~/.pde/brave_api_key` |
| `bin/lib/init.cjs` | Clean — all `resolveModelInternal` calls use `pde-*` agent names; Brave key path is `~/.pde/brave_api_key` |
| `bin/lib/commands.cjs` | Clean — only reads `BRAVE_API_KEY` env var (no file path) |
| `bin/lib/state.cjs` | Clean (no gsd path references) |
| `bin/lib/phase.cjs` | Clean |
| `bin/lib/roadmap.cjs` | Clean |
| `bin/lib/milestone.cjs` | Clean |
| `bin/lib/template.cjs` | Clean |
| `bin/lib/verify.cjs` | Clean |
| `bin/lib/frontmatter.cjs` | Clean |

Confirmed with `grep -rni "gsd\|get-shit-done" ~/.claude/pde/bin/` — exits with no output (exit code 1 = no matches).

### The 'pde' Launcher Script Is Not Part of This Plugin

`~/.claude/pde/bin/pde` is a bash launcher pointing to `~/.claude/pde/lib/launcher.cjs`. This belongs to a separate pde-os project and must NOT be copied into the PDE plugin repo. The GSD plugin only ever had `gsd-tools.cjs` + `lib/` — match that structure.

### What the Project Repo Currently Contains

The project repo at `Platform Development Engine/` currently has only:
- `.claude-plugin/plugin.json` (Phase 1)
- `VERSION`
- `.planning/`

Phase 2 adds `bin/` for the first time. This matches the decision from Phase 1 research: "Copy GSD directory structure to repo root (bin/, workflows/, templates/, references/, VERSION) — fast clone, same layout as GSD. Phase 1 scope: manifest only — do NOT copy GSD source files yet. Source copy happens in Phase 2+ as files get rebranded."

### CLAUDE_PLUGIN_ROOT Is the Right Path Mechanism

STATE.md records this decision: "RESOLVED: CLAUDE_PLUGIN_ROOT IS injected by Claude Code runtime — safe to use in Phase 2+ bin scripts." When Claude Code loads the plugin, it injects `CLAUDE_PLUGIN_ROOT` pointing to the plugin installation directory. Workflows in Phase 3 will reference `${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs` instead of the GSD hardcoded path. Phase 2 only needs to ensure the file exists at `bin/pde-tools.cjs` inside the repo — the path resolution comes later.

### GSD Reference Audit Results

All GSD-string locations relevant to Phase 2:

| File | Line | Content | Action |
|------|------|---------|--------|
| `gsd-tools.cjs` (GSD source) | 4 | `GSD Tools — CLI utility...` | Not copied; use `pde-tools.cjs` instead |
| `core.cjs` (GSD source) | 19-31 | `gsd-*` MODEL_PROFILES keys | Not copied; PDE version uses `pde-*` |
| `core.cjs` (GSD source) | 75-76 | `gsd/phase-{...}` branch templates | Not copied; PDE version uses `pde/` |
| `config.cjs` (GSD source) | 31, 35 | `~/.gsd/brave_api_key`, `~/.gsd/defaults.json` | Not copied; PDE version uses `~/.pde/` |
| `init.cjs` (GSD source) | 167 | `~/.gsd/brave_api_key` | Not copied; PDE version uses `~/.pde/` |

---

## Architecture Patterns

### Plugin Bin Directory Structure

```
bin/
├── pde-tools.cjs       # Main CLI entry point (executable)
└── lib/
    ├── commands.cjs    # Atomic commands (slug, timestamp, todos, websearch, etc.)
    ├── config.cjs      # .planning/config.json CRUD + global defaults
    ├── core.cjs        # Shared utilities, MODEL_PROFILES, git helpers, path utils
    ├── frontmatter.cjs # YAML frontmatter get/set/merge/validate
    ├── init.cjs        # Compound init commands for workflow bootstrapping
    ├── milestone.cjs   # Milestone completion and requirements marking
    ├── phase.cjs       # Phase CRUD operations (add/insert/remove/complete)
    ├── roadmap.cjs     # ROADMAP.md parsing and analysis
    ├── state.cjs       # STATE.md read/write operations
    ├── template.cjs    # Template selection and filling
    └── verify.cjs      # Verification suite (plan-structure, phase-completeness, etc.)
```

This matches the GSD bin structure exactly (minus the `pde` launcher).

### Config System: Two Levels

The config system has two scopes that must NOT share state between GSD and PDE:

| Level | GSD Path | PDE Path | Purpose |
|-------|----------|----------|---------|
| Global (user defaults) | `~/.gsd/defaults.json` | `~/.pde/defaults.json` | Persists user preferences across all projects |
| Global (Brave key) | `~/.gsd/brave_api_key` | `~/.pde/brave_api_key` | API key for web search |
| Project | `.planning/config.json` | `.planning/config.json` | Per-project overrides |

The global defaults are read-merged over hardcoded defaults when `config-ensure-section` creates a new `.planning/config.json`. If a user has both GSD and PDE installed, they will have separate `~/.gsd/` and `~/.pde/` directories — this is the isolation TOOL-05 requires.

### Git Branch Templates: Two Locations

The `pde/` branch prefix is hardcoded in two places. Both must be correct:

1. **`lib/core.cjs` `loadConfig()` defaults** (line ~75): used when no `config.json` exists
2. **`lib/config.cjs` `cmdConfigEnsureSection()` hardcoded defaults** (line ~58): used when writing the initial config file

Both are already set to `pde/phase-{phase}-{slug}` and `pde/{milestone}-{slug}` in the PDE reference copy. No additional changes needed.

### MODEL_PROFILES Agent Name Registry

`core.cjs` contains a `MODEL_PROFILES` table that maps agent type names to model tiers. All keys were changed from `gsd-*` to `pde-*` in the reference copy:

```javascript
// PDE version (confirmed clean)
const MODEL_PROFILES = {
  'pde-planner':              { quality: 'opus', balanced: 'opus',   budget: 'sonnet' },
  'pde-roadmapper':           { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  // ... 10 more pde-* entries
};
```

`resolveModelInternal()` lookups in `init.cjs` all pass `pde-*` agent types. If a caller passes a `gsd-*` name that is not in the table, the fallback is `'sonnet'` — no error, just silently wrong. Phase 5 (Agent System) will ensure callers use PDE names; Phase 2 only verifies the table keys are correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rebranding the bin files | Manually edit GSD files | Copy from `~/.claude/pde/bin/` | Reference copy is already clean and verified |
| Detecting remaining GSD strings | Custom script | `grep -rni "gsd\|get-shit-done" bin/` | One-liner is sufficient; grep exits 1 on no matches |
| Validating plugin still loads | Manual test | `claude plugin validate .` from repo root | Built-in CLI validator; confirmed working in Phase 1 |
| Deep diffing lib files | Manual review | `diff -r ~/.claude/get-shit-done/bin/lib/ bin/lib/` after copy | Shows exactly what changed |

---

## Common Pitfalls

### Pitfall 1: Copying the 'pde' Launcher Script

**What goes wrong:** The `~/.claude/pde/bin/pde` bash script is copied into the project repo along with `pde-tools.cjs`. This script references `~/.claude/pde/lib/launcher.cjs` which belongs to a separate pde-os project — it is NOT part of the GSD-equivalent plugin tooling and will not work correctly when the PDE plugin is installed by other users.

**Why it happens:** `~/.claude/pde/bin/` contains one extra file beyond what GSD had — easy to copy everything without noticing the extra file.

**How to avoid:** Only copy files that have a GSD equivalent. GSD bin had: `gsd-tools.cjs` + `lib/`. PDE bin should have: `pde-tools.cjs` + `lib/`. The `pde` launcher is extra.

**Warning signs:** `bin/pde` file exists in the project repo; it contains `exec node "$HOME/.claude/pde/lib/launcher.cjs"`.

### Pitfall 2: Forgetting to Make pde-tools.cjs Executable

**What goes wrong:** The file is copied but the executable permission bit is not set, causing `node` invocations from workflow bash blocks to fail with permission errors on some systems.

**Why it happens:** `cp` without `-p` does not preserve permissions; `git` does not always preserve executable bits on macOS.

**How to avoid:** Run `chmod +x bin/pde-tools.cjs` and verify `git ls-files --stage bin/pde-tools.cjs` shows mode `100755` (not `100644`).

**Warning signs:** `ls -la bin/pde-tools.cjs` shows `-rw-r--r--` instead of `-rwxr-xr-x`.

### Pitfall 3: Two-Installs Sharing Config State

**What goes wrong:** A user who has both GSD and PDE installed expects them to be independent, but PDE is still reading `~/.gsd/defaults.json` — either because config.cjs wasn't updated or because the user manually created `~/.pde/` linking to `~/.gsd/`.

**Why it happens:** The reference copy has already fixed this in code, but if a developer manually tests by copying `~/.gsd/defaults.json` to `~/.pde/defaults.json`, it works accidentally. The true test is running both installs simultaneously and confirming different settings in each.

**How to avoid:** TOOL-05 success criterion is clear: "two installs (GSD and PDE) do not share config state." Verify that changing `~/.pde/defaults.json` does NOT change GSD behavior.

**Warning signs:** `grep "\.gsd" bin/lib/config.cjs` returns any results.

### Pitfall 4: Skipping the Post-Copy Grep Audit

**What goes wrong:** A file was edited manually after the reference copy was made, re-introducing a GSD string. The planner assumes the reference copy is the ground truth without re-verifying the files as they land in the repo.

**Why it happens:** The reference copy at `~/.claude/pde/bin/` is clean NOW, but file contents should be re-verified after copy to the repo (not assumed clean transitively).

**How to avoid:** Run `grep -rni "gsd\|get-shit-done" bin/` immediately after the copy step. Treat zero-output as the pass condition.

---

## Code Examples

### Verification: Zero GSD Strings in bin/

```bash
# Run from project repo root — must return no output (exit code 1 = no matches)
grep -rni "gsd\|get-shit-done" bin/
echo "Exit code: $?"
# Expected: no output, exit code 1
```

### Verification: Correct File Permissions

```bash
# pde-tools.cjs must be executable
ls -la bin/pde-tools.cjs
# Expected: -rwxr-xr-x (or -rwxr--r-- at minimum)

# Git must track it as executable
git ls-files --stage bin/pde-tools.cjs
# Expected: 100755 ... bin/pde-tools.cjs
```

### Verification: Config Path Uses .pde

```bash
# These lines must appear in bin/lib/config.cjs
grep "\.pde" bin/lib/config.cjs
# Expected: ~/.pde/brave_api_key and ~/.pde/defaults.json
```

### Verification: Branch Templates Use pde/ Prefix

```bash
# In core.cjs — default branch templates
grep "branch_template" bin/lib/core.cjs
# Expected: 'pde/phase-{phase}-{slug}' and 'pde/{milestone}-{slug}'

# In config.cjs — config-ensure-section defaults
grep "branch_template" bin/lib/config.cjs
# Expected: same pde/ prefixed strings
```

### Verification: MODEL_PROFILES Use pde- Keys

```bash
grep "gsd-\|pde-" bin/lib/core.cjs
# Expected: all pde-* (no gsd-*)
```

### Verification: Plugin Still Validates After Adding bin/

```bash
# From project repo root
claude plugin validate .
# Expected: exits 0 with no errors
```

### Functional Test: pde-tools.cjs Runs

```bash
# From project repo root — should print usage and exit 1
node bin/pde-tools.cjs 2>&1 | head -3
# Expected: "Error: Usage: pde-tools <command> [args]..."
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — shell-based grep and node invocation |
| Config file | None — no test runner needed for this phase |
| Quick run command | `grep -rni "gsd\|get-shit-done" bin/ && echo FAIL \|\| echo PASS` |
| Full suite command | See "Phase Requirements → Test Map" below |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOOL-01 | `bin/pde-tools.cjs` exists in project repo | smoke | `test -f bin/pde-tools.cjs && echo PASS \|\| echo FAIL` | Wave 0 |
| TOOL-01 | pde-tools.cjs runs without crashing | smoke | `node bin/pde-tools.cjs 2>&1 \| grep -q "pde-tools" && echo PASS \|\| echo FAIL` | Wave 0 |
| TOOL-02 | All bin scripts reference `~/.pde/` not `~/.gsd/` | unit | `grep -rn "\.gsd" bin/ && echo FAIL \|\| echo PASS` | Wave 0 |
| TOOL-05 | Config reads from `~/.pde/defaults.json` | unit | `grep -q "\.pde/defaults.json" bin/lib/config.cjs && echo PASS \|\| echo FAIL` | Wave 0 |
| TOOL-05 | Config reads from `~/.pde/brave_api_key` | unit | `grep -q "\.pde/brave_api_key" bin/lib/config.cjs && echo PASS \|\| echo FAIL` | Wave 0 |
| TOOL-06 | Branch template uses `pde/` prefix (core.cjs) | unit | `grep -q "pde/phase-" bin/lib/core.cjs && echo PASS \|\| echo FAIL` | Wave 0 |
| TOOL-06 | Branch template uses `pde/` prefix (config.cjs) | unit | `grep -q "pde/phase-" bin/lib/config.cjs && echo PASS \|\| echo FAIL` | Wave 0 |
| All | No GSD strings anywhere in bin/ | regression | `grep -rni "gsd\|get-shit-done" bin/ && echo FAIL \|\| echo PASS` | Wave 0 |
| All | Plugin still validates after adding bin/ | integration | `claude plugin validate .` | Wave 0 |

### Sampling Rate

- **Per task commit:** `grep -rni "gsd\|get-shit-done" bin/ && echo FAIL || echo PASS`
- **Per wave merge:** Full suite — all commands in the test map above
- **Phase gate:** All PASS before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `bin/pde-tools.cjs` — the file itself must be created by copying from `~/.claude/pde/bin/pde-tools.cjs`
- [ ] `bin/lib/` directory — all 11 lib files must be copied from `~/.claude/pde/bin/lib/`

*(No test framework install needed — tests are pure shell one-liners)*

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Hardcoded `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs` in workflows | `${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs` (Phase 3) | Plugin-agnostic path; works for any install location |
| `~/.gsd/` global config | `~/.pde/` global config | Two installs don't share state |
| `gsd/phase-N-slug` branch names | `pde/phase-N-slug` branch names | No legacy branches created after rebrand |

---

## Open Questions

1. **gsd_state_version frontmatter key in STATE.md**
   - What we know: STATE.md has `gsd_state_version: 1.0` in its frontmatter
   - What's unclear: Whether this key is user-visible in any output (progress displays, verification reports, etc.)
   - Recommendation: Investigate in Phase 2 via `grep "gsd_state_version" bin/lib/state.cjs`. If state.cjs exposes it in output, fix in Phase 2. If it is purely internal (not rendered), defer to Phase 7 per existing decision in STATE.md.

2. **CLAUDE_PLUGIN_ROOT injection verification**
   - What we know: STATE.md says "RESOLVED: CLAUDE_PLUGIN_ROOT IS injected by Claude Code runtime"
   - What's unclear: Whether this injection makes it available in the bash blocks inside `.md` workflow files (not just in the plugin process itself)
   - Recommendation: Phase 2 does not depend on this for bin/ files. Phase 3 will need to validate it when updating workflow files. Leave as Phase 3 blocker.

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection of `~/.claude/pde/bin/` — confirmed clean with grep audit
- Direct file inspection of `~/.claude/get-shit-done/bin/` — confirmed GSD reference locations
- `.planning/STATE.md` Accumulated Context section — confirmed decisions about CLAUDE_PLUGIN_ROOT and plugin structure
- `.planning/phases/01-plugin-identity/01-RESEARCH.md` — confirmed Phase 1 decision to add bin/ in Phase 2+

### Secondary (MEDIUM confidence)
- Phase 1 verification report confirming `claude plugin validate .` is the validation command
- Phase 1 plan files confirming `@/Users/greyaltaer/.claude/get-shit-done/workflows/` path pattern used in current workflow files

---

## Metadata

**Confidence breakdown:**
- File inventory and copy scope: HIGH — direct inspection of both source and reference copy
- GSD string audit: HIGH — grep confirmed zero remaining references in reference copy
- Copy procedure and pitfalls: HIGH — based on actual file diffs and direct observation
- CLAUDE_PLUGIN_ROOT behavior in workflow bash blocks: MEDIUM — flagged as Phase 3 concern

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable tooling, no fast-moving dependencies)
