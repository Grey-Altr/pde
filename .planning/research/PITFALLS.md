# Pitfalls Research

**Domain:** AI-powered development platform — fork-based rebrand and evolution
**Researched:** 2026-03-14
**Confidence:** HIGH (findings grounded in direct GSD codebase inspection + Claude Code plugin documentation)

---

## Critical Pitfalls

### Pitfall 1: Hardcoded Install Paths Breaking Every User Except the Developer

**What goes wrong:**
GSD has 119 occurrences of `$HOME/.claude/get-shit-done/` hardcoded as absolute paths in workflow files. Workflows use these paths for `@`-includes (e.g., `@/Users/greyaltaer/.claude/get-shit-done/references/ui-brand.md`), inline `node` CLI invocations (e.g., `node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs"`), and template references. If PDE copies these paths verbatim — or substitutes a new hardcoded PDE path — any user whose tool is installed at a different location (different username, Linux system, custom `$CLAUDE_PLUGINS_DIR`) will see silent failures or broken commands.

**Why it happens:**
During a fast fork, search-and-replace of "get-shit-done" → "platform-development-engine" (or similar) replaces the string in text but preserves the path structure assumption. The developer who forks tests from their own machine — where the path resolves — and everything works. Users on other machines hit broken `@`-references that Claude silently ignores or fails to load.

**How to avoid:**
Replace all hardcoded install-path references with the `${CLAUDE_PLUGIN_ROOT}` environment variable that Claude Code injects for installed plugins, or use relative `@`-include paths from the plugin root. The `node` invocations for `pde-tools.cjs` must use a relative path resolution mechanism (e.g., `node "$(dirname "$0")/../bin/pde-tools.cjs"`) rather than any absolute path. Audit with: `grep -rn "get-shit-done\|greyaltaer\|/Users/" .` before any public release.

**Warning signs:**
- Any workflow file containing `/Users/` or a literal username
- Any `@`-include path that is not relative (does not start with `./` or `../`)
- Test on a machine with a different username — if any command fails to load references, paths are broken

**Phase to address:** Phase 1 (Rebrand clone) — must be fully resolved before any user testing or public release. This is a distribution-blocking defect.

---

### Pitfall 2: Incomplete Agent-Type Rename Breaking Model Resolution

**What goes wrong:**
GSD uses agent-type strings as lookup keys throughout the stack: workflow files spawn subagents with `subagent_type="gsd-planner"`, `gsd-executor`, `gsd-debugger`, etc. (68 occurrences in workflow files). The `core.cjs` library maps these exact strings to model tier overrides. The `model-profiles.md` reference documents them. The `config.json` in user projects overrides them by name (e.g., `"gsd-executor": "opus"`). If PDE renames agent types to `pde-planner`, `pde-executor`, etc. but leaves any one of these four surfaces out of sync, model resolution silently falls back to defaults — no error, wrong model, degraded quality with no visible cause.

**Why it happens:**
The agent type string appears in four separate, loosely-coupled places: workflow markdown files, a Node.js library (`core.cjs`), a reference documentation file (`model-profiles.md`), and user project config files. A rename pass that hits three of four produces a runtime system that appears to work but uses incorrect models.

**How to avoid:**
Treat agent-type strings as a schema. Define a canonical list once (in `core.cjs`) and derive all other references from it. During rebrand, create a checklist: for each agent type, verify it is updated in (1) workflow `subagent_type=` calls, (2) `core.cjs` model registry, (3) `model-profiles.md` reference, and (4) any example configs. After rename, run `grep -rn "gsd-" .` — zero results should be the acceptance criterion.

**Warning signs:**
- `resolve-model` returning unexpected model tier (add a smoke test that calls `pde-tools.cjs resolve-model pde-planner` and asserts a non-default result)
- Users reporting plan quality inconsistency across commands
- `gsd-` strings surviving a post-rename grep

**Phase to address:** Phase 1 (Rebrand clone) — agent type rename must be verified with an explicit smoke test before declaring Phase 1 complete.

---

### Pitfall 3: `/gsd:` Command References Surviving in User-Visible Text

**What goes wrong:**
GSD embeds 305 occurrences of `/gsd:` in workflow files, reference docs, templates, and compiled-in Node.js strings (e.g., `verify.cjs` error messages referencing `/gsd:health --repair`). After rebrand to `/pde:`, any surviving `/gsd:` reference that reaches the user creates confusion: the user is told to run `/gsd:health` but that command no longer exists, or they're running PDE and reading help text that references a different product. Error recovery paths are especially dangerous — users hit an error, are told to run a command that doesn't exist, and have no path forward.

**Why it happens:**
A simple search-and-replace misses references embedded in: JavaScript string literals (Node.js lib files), markdown templates, frontmatter templates generated by `commands.cjs` and `phase.cjs`, and `@`-reference files. The rename is perceived as complete when the commands directory is renamed, but user-visible strings remain.

**How to avoid:**
After any rename pass, run: `grep -rn "/gsd:" .` with zero expected results as a hard gate. Include the `bin/lib/` directory explicitly — JavaScript files are often excluded from text-based audits of markdown projects. Create a post-rename verification script that checks all four asset layers (workflows, references, templates, lib/*.cjs) in one pass.

**Warning signs:**
- Error messages shown to users containing `/gsd:` prefix
- Template-generated files (CONTEXT.md, phase entries, VALIDATION.md) containing `/gsd:` references
- Phase roadmap entries containing "run /gsd:plan-phase" text

**Phase to address:** Phase 1 (Rebrand clone). The `bin/lib/` JavaScript files (verify.cjs, commands.cjs, phase.cjs) require code changes, not just markdown edits. Plan for this explicitly — it is not a pure text substitution.

---

### Pitfall 4: Hidden GSD State Pollution — `~/.gsd/` User Directory

**What goes wrong:**
GSD reads configuration from `~/.gsd/brave_api_key` and `~/.gsd/defaults.json` (hardcoded in `config.cjs` and `init.cjs`). After rebrand, if PDE is not updated to use `~/.pde/` (or a neutral path), PDE will silently read GSD user config — or, worse, silently fail to find config for users who never installed GSD. Users who have both GSD and PDE installed will share config state they did not intend to share. Users migrating from GSD to PDE will not know their old `~/.gsd/brave_api_key` is being read by PDE.

**Why it happens:**
User-level config directories are infrastructure-level concerns that live outside the workflow files. During a fast fork focused on renaming visible assets, hidden-directory names are easily overlooked since they are not part of the plugin's installed files.

**How to avoid:**
Update `config.cjs` and `init.cjs` to use `~/.pde/` as the user config directory. Document the migration path for users who had `~/.gsd/` set up. If PDE and GSD can coexist on a machine, the config paths must be completely isolated.

**Warning signs:**
- Brave search working unexpectedly for users who only configured GSD, not PDE
- Users reporting that PDE reads unexpected defaults
- `grep -rn '\.gsd' bin/lib/` returning results after rename

**Phase to address:** Phase 1 (Rebrand clone). Small code change, high impact for any user who has both tools or migrates between them.

---

### Pitfall 5: Git Branch Templates Retaining GSD Branding in User Repos

**What goes wrong:**
`core.cjs` and `config.cjs` set default branch name templates to `gsd/phase-{phase}-{slug}` and `gsd/{milestone}-{slug}`. When users enable branching strategy, PDE creates branches like `gsd/phase-03-authentication` in their repositories — permanently stamping GSD branding into their git history, even though they installed PDE. This is especially embarrassing for public repositories.

**Why it happens:**
Default values in configuration code are not part of the documentation or workflow text, so they survive text-based rename sweeps. The branching strategy is off by default, so this only manifests for users who explicitly enable it — meaning it may not be caught in basic testing.

**How to avoid:**
Update default branch templates in `core.cjs` and `config.cjs` to `pde/phase-{phase}-{slug}` and `pde/{milestone}-{slug}`. Add this to the rebrand checklist. Test the branching strategy explicitly during Phase 1 acceptance testing.

**Warning signs:**
- Branch names in test repos containing `gsd/` prefix after PDE clone
- `grep -rn "gsd/phase\|gsd/{" bin/lib/` returning results

**Phase to address:** Phase 1 (Rebrand clone). Low effort fix, high user-visibility consequence.

---

### Pitfall 6: Version Number Not Bumped — Users Can't Tell PDE from GSD

**What goes wrong:**
GSD is at version `1.22.4`. If PDE ships as `1.22.4` or without a clear versioning scheme, users with both tools installed cannot distinguish versions in debug output, can't report issues accurately ("which version?"), and the Claude Code plugin system uses version numbers to determine whether to update plugins. If PDE and GSD share version numbers, Claude Code may treat them as equivalent and skip updates.

**Why it happens:**
The VERSION file is infrastructure. During a fast fork, the developer knows which version they forked from but may defer setting up a clean versioning scheme under time pressure.

**How to avoid:**
Set PDE to `1.0.0` (clean start, indicating a new product) in `VERSION` and `plugin.json`. Document in CHANGELOG.md: "Forked from GSD 1.22.4." The version namespace is now independent and can be managed separately.

**Warning signs:**
- VERSION file still reads `1.22.4` after rebrand
- `plugin.json` version unchanged
- Users unable to distinguish PDE from GSD in `claude --debug` output

**Phase to address:** Phase 1 (Rebrand clone). Required before any distribution.

---

### Pitfall 7: Post-v1 Scope Creep into Architecture That Was Deferred

**What goes wrong:**
PROJECT.md explicitly defers architecture restructuring to post-v1. In practice, post-v1 milestones (design pipeline, MCP integrations, multi-provider support) each require architectural changes that become progressively harder to retrofit onto the fast-clone structure. Teams frequently rationalize "one small architecture change" per milestone until the system has accumulated ad-hoc structural decisions that no one owns. The result is a system that is harder to extend for the standalone CLI transition than if architecture had been addressed deliberately.

**Why it happens:**
"Ship fast, refactor later" is a legitimate MVP strategy. The failure is not using it — it is failing to schedule the refactor before the debt compounds. Post-v1 milestones are planned individually against their feature goals, and the architecture milestone gets continuously deferred as each feature milestone seems more urgent.

**How to avoid:**
Schedule an explicit Architecture Refactor milestone immediately after v1 and before any feature milestones. This milestone has one goal: address the fast-clone technical debt (absolute paths, GSD-pattern assumptions, plugin structure) so that subsequent feature milestones build on a stable foundation. Treat architecture debt the same way you treat security: non-negotiable, scheduled, not optional.

**Warning signs:**
- Post-v1 planning documents contain "we'll need to restructure X later" comments
- Architecture concerns are raised in feature milestones and deferred
- The standalone CLI transition is being planned without an architecture milestone preceding it

**Phase to address:** Post-v1 Milestone 2 (Architecture Refactor) — must be planned as an explicit milestone before any feature milestones are added to the roadmap.

---

### Pitfall 8: Plugin-to-Standalone CLI Transition Without Capability Abstraction

**What goes wrong:**
PDE v1 is tightly coupled to Claude Code as its runtime — workflows assume `subagent_type=` is available, tools are invoked via Claude's tool-use interface, and `@`-includes are a Claude Code feature. When evolving to a standalone CLI with multi-provider support, all of these assumptions break. If the plugin version was built without abstraction layers, the standalone CLI becomes a rewrite rather than a port, negating the benefit of the fast-clone strategy.

**Why it happens:**
Plugin-first is the right starting strategy. The mistake is not designing the plugin version with an abstraction boundary between "what the CLI runtime does" (Claude Code) and "what PDE does" (workflow orchestration, planning logic). Without that boundary explicitly drawn, the plugin and the platform become inseparable.

**How to avoid:**
In the Architecture Refactor milestone (post-v1), draw explicit boundaries: PDE's core logic (planning, state management, roadmap operations) lives in `pde-tools.cjs` and is runtime-agnostic. Claude Code-specific behavior (subagent spawning, `@`-includes, tool calls) is isolated in adapter layers. The standalone CLI milestone then replaces the Claude Code adapter, not the entire system.

**Warning signs:**
- `subagent_type=` calls are spread throughout workflow files with no central registry
- Planning documents for the standalone CLI describe "rewriting workflows"
- The architecture diagram has no layer boundary between plugin runtime and platform logic

**Phase to address:** Post-v1 Milestone 2 (Architecture Refactor) — define the abstraction boundary before any feature milestones add more Claude Code-coupled logic.

---

### Pitfall 9: Public Distribution Without Onboarding Documentation Freezing Users

**What goes wrong:**
When PDE is distributed publicly as a Claude Code plugin, users who are not the original developer encounter the system cold. GSD's documentation is written for a developer who understands the internals. Public users need: what commands exist and what they do, what the workflow is from zero to working, what files are created and why, and what to do when things go wrong. Without this documentation, the first wave of public users abandons PDE within the first session and the plugin gets poor reviews or no adoption.

**Why it happens:**
The developer who builds the tool understands it completely. Documentation feels unnecessary because "it's obvious." The test of public documentation is whether someone who has never seen the tool can complete the first workflow without asking a question — and this is rarely tested before release.

**How to avoid:**
Before any public distribution, write and test a Getting Started guide with a user who has not seen PDE. The guide must cover: installation, first command, what files are created, and the full new-project → plan-phase → execute-phase loop. Test it by having someone run through it cold. Only distribute after the guide produces a successful first session for a naive user.

**Warning signs:**
- No `README.md` or getting-started documentation exists at distribution time
- The only documentation is workflow files written for Claude to read, not humans
- First-session success rate (can a new user complete new-project?) is untested

**Phase to address:** Phase 1 (Rebrand clone) — at minimum, a public-facing README. Full onboarding documentation should be a named deliverable, not an afterthought.

---

### Pitfall 10: Claude Code Plugin Version Caching Preventing Updates from Reaching Users

**What goes wrong:**
Per Claude Code plugin documentation: "Claude Code uses the version to determine whether to update your plugin. If you change your plugin's code but don't bump the version in `plugin.json`, your plugin's existing users won't see your changes due to caching." In practice, this means a bug fix shipped without a version bump is silently invisible to all existing users. Users report bugs that have already been fixed, leading to support confusion and loss of trust.

**Why it happens:**
During active development, version bumping feels like overhead. Developers ship many small iterations and lose track of which ones were distributed. The caching mechanism is not visible in development (where plugins are loaded with `--plugin-dir`, not from cache).

**How to avoid:**
Establish a release process before public distribution: every change to distributed files requires a version bump in `plugin.json`. Treat version bumps as a required step, not optional hygiene. Consider automated version enforcement (pre-commit hook that checks if distributed files changed without a version bump).

**Warning signs:**
- Bug fixes deployed without version bumps
- Users reporting issues that were resolved in a recent commit
- No CHANGELOG.md tracking what changed in each version

**Phase to address:** Phase 1 (Rebrand clone) — establish the release process as part of initial distribution setup.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Fast clone without path abstraction | v1 ships quickly | Every user on a different machine path breaks; standalone CLI requires full rewrite of path handling | v1 only — must be addressed in Architecture Refactor milestone |
| Keep GSD agent type names for now | No rename work in JS code | Model resolution silently broken for any config override referencing `pde-` names; users confused by GSD branding in config | Never — must be renamed in Phase 1 |
| Skip Getting Started docs for v1 | Faster initial release | First-wave users abandon product; no second chance at first impression | Never for a public release |
| `gsd_state_version` key in STATE.md frontmatter | Zero migration work | Users' STATE.md files contain GSD internal identifiers; confusing if ever documented; breaks any tooling that keys on this field | Acceptable to defer to Architecture Refactor if not user-visible; unacceptable if exposed in docs |
| Skip version bump on patch releases | Ship faster | Cached plugin users receive no updates; support burden increases | Never once publicly distributed |
| Architecture restructuring deferred indefinitely | All time goes to features | Each feature milestone adds coupling that makes standalone CLI harder; eventually requires partial rewrite | Acceptable for one milestone cycle; must be scheduled |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code plugin install | Keeping absolute `@`-include paths from development | Use `${CLAUDE_PLUGIN_ROOT}` variable or relative paths; test by installing via `claude plugin install` not `--plugin-dir` |
| Claude Code agent spawning | Mixing old `gsd-` subagent types with new `pde-` names in the same workflows | Rename all agent types atomically; never have both namespaces active simultaneously |
| Claude Code version caching | Not bumping `plugin.json` version on every distributed change | Enforce version bumps with a release checklist; never distribute without incrementing |
| `~/.gsd/` user config | Not migrating Brave API key path to `~/.pde/` | Update config.cjs and init.cjs; document migration for users who already configured GSD |
| Git branching strategy | Default branch templates creating `gsd/` branches | Update default templates in core.cjs before any user enables branching strategy |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Spawning too many parallel subagents in research workflows | Claude Code session timeout; incomplete research results | Cap parallel agent count; use sequential fallback for large phase sets | At ~5+ parallel research agents on large codebases |
| Large `.planning/` directory slowing `rg` searches | Health checks and validation become slow | Use targeted path searches; avoid broad `rg "pattern"` across entire repo | When planning directory exceeds ~100 files |
| `gsd-tools.cjs` loaded on every command invocation | Cold-start latency on each workflow step | No mitigation needed at current scale; watch if tool grows significantly | Not a current concern at v1 scale |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Brave API key stored in `~/.gsd/brave_api_key` (plain text) | Key exposed if home directory is readable by other processes | Ensure file permissions are `600`; document this in setup instructions; consider moving to OS keychain in future milestone |
| Plugin scripts distributed with execute permissions pre-set | Hook scripts run automatically on plugin events without explicit user consent | Document exactly which scripts are executable and what they do; do not make scripts executable unless they are hook scripts |
| Absolute paths exposing developer username in distributed files | Username visible in distributed source; breaks for all other users | Zero absolute paths in distributed files — enforce with pre-release audit script |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Error messages referencing `/gsd:` commands that don't exist | User hits an error and is told to run a command that doesn't exist; no recovery path | Rename all error message command references; test error recovery paths explicitly |
| No differentiation from GSD in plugin name or description | Users who know GSD see PDE as a clone with no added value; no reason to switch | Clear differentiation in plugin.json description and onboarding docs; articulate what PDE adds |
| Onboarding assumes internal knowledge of GSD architecture | New users cannot get started without reading source code | Write a human-readable Getting Started guide that requires no prior GSD knowledge |
| Missing or stale version in plugin.json | Users can't report which version they're on; bug reports untraceable | Strict version management; every release has a clear version number and CHANGELOG entry |

---

## "Looks Done But Isn't" Checklist

- [ ] **Command rename:** Every workflow file shows `/pde:` — verify no `/gsd:` survives with `grep -rn "/gsd:" .` returning zero results across workflows, references, templates, AND `bin/lib/*.cjs`
- [ ] **Agent types renamed:** `pde-planner`, `pde-executor`, etc. resolve correctly in `resolve-model` — verify with `node bin/pde-tools.cjs resolve-model pde-planner` on a clean install
- [ ] **Absolute paths removed:** No `/Users/` or `$HOME/.claude/get-shit-done` in any file — verify with `grep -rn "get-shit-done\|/Users/" .`
- [ ] **Branch templates updated:** Creating a branch in a test repo produces `pde/phase-01-test`, not `gsd/phase-01-test`
- [ ] **User config directory migrated:** `~/.pde/` is the config directory; `~/.gsd/` is not referenced — verify with `grep -rn '\.gsd' bin/lib/`
- [ ] **Version set:** `VERSION` and `plugin.json` show `1.0.0`, not GSD's version
- [ ] **Plugin installs for a new user:** Install via `claude plugin install` on a machine with a different username than the developer — all commands load without errors
- [ ] **STATE.md frontmatter key:** `gsd_state_version` key renamed to `pde_state_version` (or neutral `state_version`)
- [ ] **Getting Started guide tested:** A person unfamiliar with the tool can complete `new-project` → `plan-phase` → `execute-phase` using only the documentation

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Absolute paths shipped to users | HIGH | Release a patch version immediately; instruct users to reinstall; publish known-broken version notice |
| Agent types half-renamed | MEDIUM | Release a patch; provide a migration script that updates existing user config.json files |
| `/gsd:` in error messages | LOW | Release a patch version with corrected messages; version bump required for cache invalidation |
| `~/.gsd/` config path not migrated | LOW | Release a patch that reads both paths with deprecation warning; document manual migration |
| Version not bumped on update | MEDIUM | Instruct users to uninstall and reinstall to force cache refresh; add version bump to release checklist going forward |
| No Getting Started docs at launch | MEDIUM | Write and publish immediately; send update to any early distribution channels |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hardcoded install paths | Phase 1 (Rebrand) | `grep -rn "/Users/\|get-shit-done" .` returns zero results; install on a different-username machine succeeds |
| Incomplete agent-type rename | Phase 1 (Rebrand) | `grep -rn "gsd-" .` returns zero results; `resolve-model pde-planner` returns correct model |
| `/gsd:` in user-visible text | Phase 1 (Rebrand) | `grep -rn "/gsd:" .` returns zero results across all file types including `.cjs` |
| Hidden `~/.gsd/` directory | Phase 1 (Rebrand) | `grep -rn "\.gsd" bin/lib/` returns zero results |
| Git branch templates | Phase 1 (Rebrand) | Test with `branching_strategy: phase`; branch name starts with `pde/` |
| Version not set | Phase 1 (Rebrand) | `VERSION` and `plugin.json` show `1.0.0` |
| Post-v1 scope creep | Milestone 2 (Architecture) | Architecture Refactor milestone is planned and scheduled before any feature milestone |
| Plugin-to-CLI abstraction gap | Milestone 2 (Architecture) | Abstraction boundary document exists; no `subagent_type=` references outside a designated adapter layer |
| Public onboarding gap | Phase 1 (Rebrand) | Getting Started guide tested with naive user before any public distribution |
| Plugin version caching | Phase 1 (Rebrand) | Release process documented; version bumped with every distribution |

---

## Sources

- Direct inspection of GSD codebase at `~/.claude/get-shit-done/` (version 1.22.4)
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) — plugin manifest schema, caching behavior, common errors (HIGH confidence, official docs)
- [Packaging Pitfalls: Hardcoded Paths Inside Scripts, Shortcuts and Installers](https://apptimized.com/en/news/hardcoded-paths-inside-scripts-shortcuts-and-installers/) — hardcoded path distribution failures (MEDIUM confidence)
- [How to Beat AI Feature Creep](https://builtin.com/articles/beat-ai-feature-creep) — scope management in AI product development (MEDIUM confidence, general)
- [Migration guide for extension and fork maintainers — OpenRefine](https://github.com/OpenRefine/OpenRefine/wiki/Migration-guide-for-extension-and-fork-maintainers) — fork migration best practices (MEDIUM confidence)
- Empirical research on "quick remedy commits" following incomplete rename refactoring — Springer Empirical Software Engineering (HIGH confidence, peer-reviewed, aligns with direct GSD observations)

---

*Pitfalls research for: AI-powered development platform (PDE) — fork-based rebrand*
*Researched: 2026-03-14*
