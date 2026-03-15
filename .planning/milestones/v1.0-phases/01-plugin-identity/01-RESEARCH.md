# Phase 1: Plugin Identity - Research

**Researched:** 2026-03-14
**Domain:** Claude Code Plugin Manifest / Plugin Identity
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Plugin metadata:**
- Display name: "Platform Development Engine" (full name, not acronym)
- Description: "Full lifecycle platform: from raw idea to shipped product with research, planning, execution, and verification"
- Author: GreyA <grey.altaer@gmail.com> (from git config)
- Homepage/repository: https://github.com/Grey-Altr/pde.git

**Repository structure:**
- Copy GSD directory structure to repo root (bin/, workflows/, templates/, references/, VERSION) — fast clone, same layout as GSD
- Manifest lives at `.claude-plugin/plugin.json` — standard Claude Code plugin discovery path
- Phase 1 scope: manifest only — do NOT copy GSD source files yet. Just create the plugin shell and validate it loads. Source copy happens in Phase 2+ as files get rebranded.

**Version strategy:**
- Start at 0.1.0 (not 1.0.0) — signals work in progress until all phases complete
- VERSION file is the single source of truth; plugin.json mirrors it
- Bump to 1.0.0: Claude's discretion based on completion state (after Phase 7 or 8)

**Distribution model:**
- Git-based install: users run `claude plugin install` pointing to https://github.com/Grey-Altr/pde.git
- User scope installation — available in all projects, matches GSD's current behavior
- No marketplace listing for v1 — git-based is sufficient

### Claude's Discretion

- License choice (MIT is standard for plugins)
- Keywords for discoverability
- Exact 1.0.0 bump timing (after Phase 7 or Phase 8)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLUG-01 | PDE installable as Claude Code plugin via standard mechanism | Confirmed: `claude plugin install <git-url>` is the standard git-based install mechanism; user scope is the default |
| PLUG-02 | plugin.json manifest with PDE name, description, and version 1.0.0 | Confirmed: manifest schema verified from plugin-dev skill and live plugin inspection; name must be kebab-case, version must be semver |
| PLUG-03 | Plugin passes Claude Code validation and loads without errors | Confirmed: `claude plugin validate <plugin-root>` is the validation command; tested a candidate manifest and it passes cleanly |
</phase_requirements>

---

## Summary

Claude Code plugins use a well-documented, consistent structure. The manifest lives at `.claude-plugin/plugin.json` at the repo root. Only one field is strictly required: `name` (kebab-case). All other fields — version, description, author, homepage, repository, license, keywords — are recommended metadata. Validation is a first-class CLI command: `claude plugin validate <path-to-plugin-root>`.

The `name` field in plugin.json is the machine identifier (kebab-case, e.g., `platform-development-engine`), not the display name. The description field carries the human-readable name implicitly. This means PLUG-02's "PDE name" is expressed through the description, not a separate "displayName" field — the schema has no displayName field.

Git-based install (`claude plugin install <git-url>`) is confirmed as a supported pattern — the `claude plugin install` CLI accepts a plugin specifier and the `--scope user` flag. The exact git-URL syntax needs one task to verify empirically, but the mechanism is production-grade (multiple official plugins use commit-SHA versioning, confirming git install is how they landed).

**Primary recommendation:** Create `.claude-plugin/plugin.json` with `name: "platform-development-engine"`, `version: "0.1.0"`, and the locked description/author/homepage/repository/license/keywords. Then run `claude plugin validate` from the repo root to confirm. Two tasks cover this phase completely.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `claude plugin validate` | CLI (current) | Validate plugin manifest before install | First-class CLI command; exits 0 on success, 1 on failure |
| `claude plugin install` | CLI (current) | Install plugin into Claude Code | The standard mechanism; supports `--scope user` |
| `.claude-plugin/plugin.json` | Schema v2 (current) | Plugin manifest | Required file; Claude Code reads this path on install |

### Supporting
| Item | Purpose | When to Use |
|------|---------|-------------|
| `VERSION` file | Single source of truth for version string | Locked decision — plugin.json mirrors this file |
| `installed_plugins.json` | Inspect installed plugin registry | Useful for verifying install succeeded |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `.claude-plugin/plugin.json` | Root-level `plugin.json` | Root-level is NOT discovered; `.claude-plugin/` is required |
| kebab-case `name` field | Full display name | Validation rejects spaces/uppercase in `name`; description carries the display label |
| Semver `version` | Omitting version | Omitting version triggers a warning from validator; 0.1.0 is clean |

**No installation command needed for this phase** — the manifest and directory structure are plain files. No npm packages required.

## Architecture Patterns

### Required Plugin Structure for Phase 1

```
<repo-root>/
├── .claude-plugin/
│   └── plugin.json          # Required: Plugin manifest (ONLY deliverable in Phase 1)
└── VERSION                  # Single source of truth for version string
```

Phase 1 adds no other content. Commands, agents, skills, hooks, and bin/ arrive in later phases. Claude Code's auto-discovery will find nothing to load beyond the manifest — that is intentional and valid. An empty plugin shell loads without errors.

### Pattern 1: Minimal Shell Plugin

**What:** A plugin with only a manifest and no components. Claude Code loads it, registers the identity, and exposes no commands yet.
**When to use:** Phase 1 only — establishing identity before source is copied.

```json
// Source: plugin-dev plugin-structure SKILL.md (installed at ~/.claude/plugins/...)
// Tested live with: claude plugin validate (exit 0)
{
  "name": "platform-development-engine",
  "version": "0.1.0",
  "description": "Full lifecycle platform: from raw idea to shipped product with research, planning, execution, and verification",
  "author": {
    "name": "GreyA",
    "email": "grey.altaer@gmail.com"
  },
  "homepage": "https://github.com/Grey-Altr/pde.git",
  "repository": "https://github.com/Grey-Altr/pde.git",
  "license": "MIT",
  "keywords": ["platform", "development-lifecycle", "planning", "research", "execution", "verification", "workflow", "claude-code"]
}
```

### Pattern 2: VERSION File as Source of Truth

**What:** A plain-text file at repo root containing only the version string (no newline noise).
**When to use:** Every version bump — edit VERSION, then copy the value into plugin.json.

```
0.1.0
```

The GSD fork source uses exactly this pattern (`~/.claude/get-shit-done/VERSION` contains `1.22.4`). PDE starts at `0.1.0`.

### Anti-Patterns to Avoid

- **Putting plugin.json at repo root:** Claude Code will not discover it. The `.claude-plugin/` directory is required.
- **Using a display name in the `name` field:** `"name": "Platform Development Engine"` fails validation. Name must be kebab-case.
- **Omitting version:** Passes validation with a warning. Include `0.1.0` to validate cleanly.
- **Using an absolute path anywhere in the manifest:** Component path fields (commands, agents, hooks) must use relative `./` paths. Phase 1 has no component paths, so this is not yet a risk — but do not add any.
- **Nesting component directories inside `.claude-plugin/`:** The `.claude-plugin/` directory holds only `plugin.json`. Commands, agents, skills, and hooks go at the plugin root level.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manifest validation | Custom JSON schema checker | `claude plugin validate <root>` | Built-in CLI; exits 0/1; prints specific field errors |
| Plugin name regex | Manual kebab-case check | Let `claude plugin validate` catch it | Validator enforces `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` |
| Install mechanism | Custom file-copy script | `claude plugin install` | Standard mechanism; handles cache, scope, tracking |

**Key insight:** The Claude Code CLI handles all plugin lifecycle operations. There is nothing to build for validation or install — only the manifest file needs to be created.

## Common Pitfalls

### Pitfall 1: Wrong Manifest Location

**What goes wrong:** Plugin is not discovered by `claude plugin install` or `claude plugin validate`.
**Why it happens:** Developer places `plugin.json` at repo root instead of `.claude-plugin/plugin.json`.
**How to avoid:** Always create the `.claude-plugin/` directory and place `plugin.json` inside it.
**Warning signs:** `claude plugin validate <root>` returns "No manifest found in directory. Expected .claude-plugin/marketplace.json or .claude-plugin/plugin.json".

### Pitfall 2: Invalid `name` Field Format

**What goes wrong:** Validation fails immediately.
**Why it happens:** Using "Platform Development Engine" or "pde" starting with a number or containing underscores.
**How to avoid:** Use `platform-development-engine` (all lowercase, hyphens only, starts with a letter).
**Warning signs:** `claude plugin validate` returns "Plugin name cannot contain spaces. Use kebab-case".

### Pitfall 3: Non-Semver Version

**What goes wrong:** Validation warning (not error), but poor hygiene.
**Why it happens:** Using `1` or `1.0` instead of `1.0.0`.
**How to avoid:** Always use MAJOR.MINOR.PATCH format. `0.1.0` is correct for this phase.
**Warning signs:** `claude plugin validate` returns "No version specified. Consider adding a version following semver".

### Pitfall 4: VERSION File and plugin.json Out of Sync

**What goes wrong:** `claude plugin list` shows wrong version after manual edits.
**Why it happens:** VERSION file updated but plugin.json not updated (or vice versa).
**How to avoid:** Treat VERSION as source of truth; after editing it, immediately update plugin.json `version` field. The planner should make these a single atomic task.

### Pitfall 5: CLAUDE_PLUGIN_ROOT Confusion

**What goes wrong:** Attempting to use `${CLAUDE_PLUGIN_ROOT}` in plugin.json metadata fields.
**Why it happens:** Misunderstanding — `${CLAUDE_PLUGIN_ROOT}` is for hook command strings and MCP server paths, not for metadata fields like `homepage` or `repository`.
**How to avoid:** In Phase 1, do not reference `${CLAUDE_PLUGIN_ROOT}` at all. The manifest has no scripts or hooks yet.
**Confirmation on STATE.md blocker:** `${CLAUDE_PLUGIN_ROOT}` IS injected by the Claude Code runtime — confirmed by the plugin-structure SKILL.md ("Use `${CLAUDE_PLUGIN_ROOT}` environment variable for all intra-plugin path references... Available as environment variable in executed scripts"). This resolves the research flag in STATE.md. Relevant for Phase 2+ when bin scripts are added.

## Code Examples

Verified patterns from official sources (plugin-dev SKILL.md + live `claude plugin validate` testing):

### Complete PDE plugin.json

```json
// Tested: claude plugin validate passes with exit 0 on this exact content
{
  "name": "platform-development-engine",
  "version": "0.1.0",
  "description": "Full lifecycle platform: from raw idea to shipped product with research, planning, execution, and verification",
  "author": {
    "name": "GreyA",
    "email": "grey.altaer@gmail.com"
  },
  "homepage": "https://github.com/Grey-Altr/pde.git",
  "repository": "https://github.com/Grey-Altr/pde.git",
  "license": "MIT",
  "keywords": ["platform", "development-lifecycle", "planning", "research", "execution", "verification", "workflow", "claude-code"]
}
```

### Validation Command

```bash
# Run from the repo root (where .claude-plugin/ lives)
claude plugin validate .

# Expected success output:
# Validating plugin manifest: ./.claude-plugin/plugin.json
# ✔ Validation passed

# Expected failure output (wrong name):
# ✘ Found 1 error:
#   ❯ name: Plugin name cannot contain spaces. Use kebab-case (e.g., "my-plugin")
# ✘ Validation failed
```

### Install Command (git-based)

```bash
# User scope (default) — available in all projects
claude plugin install https://github.com/Grey-Altr/pde.git

# Or explicitly scoped
claude plugin install https://github.com/Grey-Altr/pde.git --scope user
```

### List Installed Plugins

```bash
# Verify install succeeded
claude plugin list
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual file copy for install | `claude plugin install <url>` | Git-tracked, scope-managed, cached in `~/.claude/plugins/cache/` |
| No validation tooling | `claude plugin validate <path>` | Catches format errors before users encounter them |
| Root-level manifest | `.claude-plugin/plugin.json` | Standardized discovery path; non-negotiable |

**Confirmed current:** The `installed_plugins.json` schema is version 2, with `gitCommitSha` tracked per install. This means git-based installs record the exact commit — useful context for Phase 2+ updates.

## Open Questions

1. **Git URL install syntax**
   - What we know: `claude plugin install` accepts a plugin name (for marketplace) or a git URL. Git-based plugins appear in the cache with commit SHAs (confirmed from `installed_plugins.json`). The `--scope user` flag is confirmed.
   - What's unclear: The exact syntax — `claude plugin install https://github.com/Grey-Altr/pde.git` vs `claude plugin install git+https://...` vs a local path first.
   - Recommendation: Plan 01-02 should include a task to test `claude plugin install` from the local repo path first (before the remote exists), then document the git URL syntax once the remote is live. Local install: `claude plugin install /path/to/local/repo`.

2. **Plugin name uniqueness constraint**
   - What we know: The spec says "Must be unique across installed plugins".
   - What's unclear: Whether `platform-development-engine` conflicts with any existing installed plugin (none in `installed_plugins.json` match).
   - Recommendation: No action needed — the name is unique. Confirmed by inspecting `~/.claude/plugins/installed_plugins.json`.

## Validation Architecture

> nyquist_validation is true in .planning/config.json — section is included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — shell-based validation only |
| Config file | None — Wave 0 must establish approach |
| Quick run command | `claude plugin validate . && echo "PASS"` |
| Full suite command | `claude plugin validate . && claude plugin list \| grep platform-development-engine` |

**Rationale:** This phase produces one file (plugin.json) and one directory (`.claude-plugin/`). The authoritative test is `claude plugin validate` — it is the Claude Code validation tool. There is no application code to unit test. A shell-based smoke test is sufficient and appropriate.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLUG-01 | Plugin installs via `claude plugin install` | smoke | `claude plugin install . --scope user && claude plugin list \| grep platform-development-engine` | Wave 0 — no test file needed (CLI command IS the test) |
| PLUG-02 | plugin.json has correct name, description, version | smoke | `claude plugin validate .` | Wave 0 — test is the validate command |
| PLUG-03 | Plugin passes validation and loads without errors | smoke | `claude plugin validate . && claude --version` (confirms Claude Code starts without error) | Wave 0 — same as PLUG-02 |

### Sampling Rate

- **Per task commit:** `claude plugin validate .`
- **Per wave merge:** `claude plugin validate . && claude plugin list`
- **Phase gate:** `claude plugin validate` exits 0 before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No test framework install needed — `claude plugin validate` is the test runner for this phase
- [ ] No test files needed — validation is a CLI operation against the manifest file
- [ ] Verify `claude plugin install .` (local path) works before remote repo exists

*(All phase requirements are covered by the `claude plugin validate` CLI command. No test file scaffolding needed.)*

## Sources

### Primary (HIGH confidence)

- `~/.claude/plugins/cache/claude-plugins-official/plugin-dev/d5c15b861cd2/skills/plugin-structure/SKILL.md` — complete plugin structure, manifest schema, `${CLAUDE_PLUGIN_ROOT}` confirmation
- `~/.claude/plugins/cache/claude-plugins-official/plugin-dev/d5c15b861cd2/skills/plugin-structure/references/manifest-reference.md` — complete field reference, validation rules, name regex
- Live `claude plugin validate` testing — tested candidate PDE plugin.json; confirmed exit 0 / "Validation passed"
- Live `claude plugin validate` error testing — confirmed error messages for invalid name, missing manifest location
- `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.2/.claude-plugin/plugin.json` — canonical reference for object-style author field
- `~/.claude/plugins/cache/claude-plugins-official/code-simplifier/1.0.0/.claude-plugin/plugin.json` — Anthropic-authored minimal manifest at version 1.0.0

### Secondary (MEDIUM confidence)

- `~/.claude/plugins/installed_plugins.json` — confirms git-SHA install tracking, user scope, cache path pattern
- `claude plugin --help` / `claude plugin install --help` / `claude plugin validate --help` — confirmed CLI subcommand availability and flags

### Tertiary (LOW confidence)

- Exact git URL syntax for `claude plugin install` (e.g., bare URL vs `git+https://`) — not tested empirically; remote repo does not yet exist

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — directly verified from installed plugin-dev toolkit and live CLI testing
- Architecture: HIGH — manifest schema confirmed from multiple installed plugins + live validation runs
- Pitfalls: HIGH — pitfalls confirmed by triggering actual validation errors with the CLI
- Git URL install syntax: LOW — mechanism confirmed, exact URL format not tested (remote doesn't exist yet)

**Research date:** 2026-03-14
**Valid until:** 2026-09-14 (180 days — plugin manifest schema is stable; Claude Code plugin system is actively maintained but schema changes are versioned)
