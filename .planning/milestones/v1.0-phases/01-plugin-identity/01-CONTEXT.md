# Phase 1: Plugin Identity - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish PDE as a valid, installable Claude Code plugin with a correct manifest that does not reference GSD. This phase creates the plugin identity only — no source code is copied or rebranded yet.

</domain>

<decisions>
## Implementation Decisions

### Plugin metadata
- Display name: "Platform Development Engine" (full name, not acronym)
- Description: "Full lifecycle platform: from raw idea to shipped product with research, planning, execution, and verification"
- Author: GreyA <grey.altaer@gmail.com> (from git config)
- Homepage/repository: https://github.com/Grey-Altr/pde.git
- License, keywords: Claude's discretion

### Repository structure
- Copy GSD directory structure to repo root (bin/, workflows/, templates/, references/, VERSION) — fast clone, same layout as GSD
- Manifest lives at `.claude-plugin/plugin.json` — standard Claude Code plugin discovery path
- Phase 1 scope: manifest only — do NOT copy GSD source files yet. Just create the plugin shell and validate it loads. Source copy happens in Phase 2+ as files get rebranded.

### Version strategy
- Start at 0.1.0 (not 1.0.0) — signals work in progress until all phases complete
- VERSION file is the single source of truth; plugin.json mirrors it
- Bump to 1.0.0: Claude's discretion based on completion state (after Phase 7 or 8)

### Distribution model
- Git-based install: users run `claude plugin install` pointing to https://github.com/Grey-Altr/pde.git
- User scope installation — available in all projects, matches GSD's current behavior
- No marketplace listing for v1 — git-based is sufficient

### Claude's Discretion
- License choice (MIT is standard for plugins)
- Keywords for discoverability
- Exact 1.0.0 bump timing (after Phase 7 or Phase 8)

</decisions>

<specifics>
## Specific Ideas

- Plugin manifest modeled after superpowers plugin structure (`.claude-plugin/plugin.json` with name, description, version, author, homepage, repository, license, keywords)
- GSD source at `~/.claude/get-shit-done/` is the fork source — version 1.22.4

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- GSD plugin structure: bin/gsd-tools.cjs, bin/lib/, workflows/ (36 files), templates/ (28 files), references/ (15 files), VERSION
- Superpowers plugin.json as canonical manifest reference

### Established Patterns
- Claude Code plugin discovery: `.claude-plugin/plugin.json` at repo root
- Plugin manifest schema: { name, description, version, author, homepage, repository, license, keywords }
- Installed plugins tracked in `~/.claude/plugins/installed_plugins.json`

### Integration Points
- `claude plugin install <git-url>` — the install mechanism
- Plugin cache at `~/.claude/plugins/cache/` — where installed plugins live
- GSD tools referenced via `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs` — will need path updates in Phase 2

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-plugin-identity*
*Context gathered: 2026-03-14*
