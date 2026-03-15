# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — PDE v1.0 MVP

**Shipped:** 2026-03-15
**Phases:** 11 | **Plans:** 23 | **Commits:** 127

### What Was Built
- Complete GSD → PDE rebrand with zero residual GSD strings
- 34 `/pde:` slash commands with full Claude Code palette integration
- Workflow engine with persistent `.planning/` state management
- 12 PDE agent types with parallel wave orchestration
- Public distribution package: README, Getting Started guide, marketplace.json
- Telemetry module, consent panel, and UI rendering chain
- 21 command stubs closing all dangling reference gaps

### What Worked
- **Order-dependent rename sequence** — doing plugin identity first, then binaries, then commands, etc. meant each layer was clean before the next built on it
- **Gap closure phases (9-11)** — the milestone audit caught real issues (runtime crash, STATE.md regressions, dangling references) that would have shipped broken
- **File-based state model** — `.planning/` directory survives context resets perfectly; no database needed
- **Atomic commits per task** — clean git history made debugging and verification easy

### What Was Inefficient
- **STATE.md body drift** — the body narrative fell out of sync with frontmatter multiple times, requiring dedicated fix phases
- **Summary format mismatch** — SUMMARY.md files use tech-tracking format (dependency graphs, key-files) instead of prose one-liners, making automated accomplishment extraction fail
- **Version bumping timing** — started at 0.1.0, bumped to 1.0.0 at Phase 8; could have been cleaner to set final version earlier
- **gsd_state_version regression** — the GSD layer re-wrote the old key on state updates, requiring a targeted patch

### Patterns Established
- Plugin manifest at `.claude-plugin/plugin.json` with VERSION file as single source of truth
- Two-tier delegation: command stubs → workflow files (skills layer omitted in plugin)
- `${CLAUDE_PLUGIN_ROOT}` for all path references in workflow files
- Tech-tracking SUMMARY format with dependency graphs, provides/affects, key-files
- Command stubs with `planned: true` status for v2 features

### Key Lessons
1. **Audit before shipping** — the milestone audit caught 4 categories of issues that would have broken user experience. Always run `/pde:audit-milestone` before completion.
2. **GSD layer writes back** — when forking a system, the upstream layer can regress your changes on subsequent writes. Patch the write path, not just the current state.
3. **grep-clean is not functionally-clean** — zero GSD strings doesn't mean everything works. Integration testing (render chain, state persistence) catches what grep misses.
4. **Stubs beat dangling references** — a command that says "planned for v2" is better than a reference that leads nowhere.

### Cost Observations
- Model mix: primarily sonnet for execution agents, opus for orchestration
- Timeline: 2 days (2026-03-14 → 2026-03-15)
- Notable: 127 commits in 2 days — high velocity enabled by automated planning and execution pipeline

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 127 | 11 | Initial release — fork-and-rebrand with gap closure |

### Cumulative Quality

| Milestone | Requirements | Coverage | Gap Phases |
|-----------|-------------|----------|------------|
| v1.0 | 40/40 | 100% | 3 (phases 9-11) |
