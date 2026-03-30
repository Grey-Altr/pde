# Requirements: PDE v0.23 Quality & Reliability Hardening

**Defined:** 2026-03-29
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.23 Requirements

Requirements for Quality & Reliability Hardening. Each maps to roadmap phases.

### Data Integrity

- [x] **INT-01**: ROADMAP.md milestone status for v0.22 shows "shipped" (not "in progress") and all completed phase entries have checked plan boxes
- [x] **INT-02**: MILESTONES.md has accurate one-liner descriptions (not placeholder text) for every plan entry across v0.19–v0.22 milestones
- [x] **INT-03**: REQUIREMENTS.md checkboxes for EXT-01 through EXT-10 are checked with phase references matching their VERIFICATION.md evidence
- [x] **INT-04**: Phase 180 VERIFICATION.md frontmatter shows `status: complete` (not `gaps_found`) reflecting the resolved admin checkbox issue
- [x] **INT-05**: `buildCrossPatterns` in render-presentation.cjs reads the correct IR field names (`topics`/`project_research_files` instead of `research.findings`) and produces non-empty cross-patterns sections for real PDE projects
- [x] **INT-06**: Test mocks for Phase 184 portfolio tests use the real IR shape (matching `buildPresentationIR` output) rather than diverged mock structures

### Verification Coverage

- [x] **VER-01**: All 9 v0.22 phases (176–184) have VALIDATION.md files with `nyquist_compliant: true` frontmatter, derived from their existing VERIFICATION.md observable truths
- [ ] **VER-02**: All 5 v0.7 SUMMARY.md files include the `one-liner` frontmatter field with accurate descriptions
- [ ] **VER-03**: A `pde-tools health consistency` subcommand reports mismatches between requirements files, roadmap entries, and milestone entries for any given milestone version

### Test Infrastructure

- [ ] **TST-01**: Vitest configuration excludes node:test-based test files so that `npx vitest run` reports zero false "No test suite found" failures
- [ ] **TST-02**: Running `npx vitest run --coverage` produces a coverage baseline report via @vitest/coverage-v8 for all vitest-compatible test files

### Technical Debt

- [ ] **DEB-01**: Workflow files `execute-phase.md` and `complete-milestone.md` reference the correct `$CLAUDE_PLUGIN_ROOT/bin/pde-tools.cjs` path (not stale `$HOME/.claude/pde-os/engines/gsd/bin/pde-tools.cjs`)
- [ ] **DEB-02**: Running `npx knip` produces a dead code report identifying unused files, exports, and dependencies with a documented triage of each finding
- [ ] **DEB-03**: Running `npx jscpd` produces a duplication report identifying copy-paste code blocks above a configurable threshold
- [ ] **DEB-04**: ESLint 10 with eslint-plugin-n is configured for the CJS codebase and `npx eslint .` produces a clean pass (or documented exceptions)

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Full Historical Backfill

- **FUT-01**: All 184 phases across v0.1–v0.22 have Nyquist-compliant VALIDATION.md files
- **FUT-02**: All MILESTONES.md entries across v0.1–v0.18 have accurate one-liner descriptions

### Advanced Static Analysis

- **FUT-03**: Oxlint integration for fast supplemental linting (blocked on JS plugin alpha status)
- **FUT-04**: Test coverage percentage targets per module

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full Nyquist backfill for all 184 phases | Scope explosion — retroactive compliance for shipped work has diminishing returns |
| LLM-automated one-liner generation | Risk of hallucinated descriptions; must read actual SUMMARY.md files |
| Aggressive dead-code elimination | Plugin spans 22 milestones; aggressive removal risks breaking edge-case code paths |
| Test coverage percentage targets | PDE uses behavioral Nyquist testing, not coverage-percent methodology |
| Style rewrites of accurate documentation | Content drift risk; quality pass adds accuracy, not style changes |
| Human verification items (Phases 56, 58, 59, 61) | Require live tmux session; correctly deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INT-01 | Phase 185 | Complete |
| INT-02 | Phase 185 | Complete |
| INT-03 | Phase 185 | Complete |
| INT-04 | Phase 185 | Complete |
| INT-05 | Phase 187 | Complete |
| INT-06 | Phase 187 | Complete |
| VER-01 | Phase 188 | Complete |
| VER-02 | Phase 188 | Pending |
| VER-03 | Phase 188 | Pending |
| TST-01 | Phase 186 | Pending |
| TST-02 | Phase 186 | Pending |
| DEB-01 | Phase 189 | Pending |
| DEB-02 | Phase 189 | Pending |
| DEB-03 | Phase 189 | Pending |
| DEB-04 | Phase 189 | Pending |

**Coverage:**
- v0.23 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after initial definition*
