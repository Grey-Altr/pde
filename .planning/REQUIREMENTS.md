# Requirements: Platform Development Engine

**Defined:** 2026-03-19
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.7 Requirements

Requirements for Pipeline Reliability & Validation milestone. Each maps to roadmap phases.

### Research Validation

- [ ] **RVAL-01**: Research validator agent extracts verifiable claims from RESEARCH.md using LLM pass
- [ ] **RVAL-02**: Research validator verifies each extracted claim against actual codebase using tool calls (Read, Grep, Glob)
- [ ] **RVAL-03**: Research validator produces RESEARCH-VALIDATION.md with three-state output per claim (VERIFIED / UNVERIFIABLE / CONTRADICTED)
- [ ] **RVAL-04**: Claims are classified by tier — Tier 1 (structural: file exists), Tier 2 (content: function exported, parameter shape), Tier 3 (behavioral: logic claim) — and verification method matches tier
- [ ] **RVAL-05**: Research validator agent is strictly read-only (no Write, no Edit in allowed_tools)
- [ ] **RVAL-06**: RESEARCH-VALIDATION.md includes `validated_at_phase` field for staleness tracking across phases
- [ ] **RVAL-07**: Research validation is wired into plan-phase.md as automatic step — runs when research exists and no validation artifact is present
- [ ] **RVAL-08**: Plan-phase blocks on `contradicted_count > 0` with user choice prompt; surfaces `unverifiable_count > 0` as non-blocking CONCERNS

### Cross-Phase Dependencies

- [ ] **DEPS-01**: Pre-execution dependency checker reads ROADMAP.md phase graph and PLAN.md task declarations to detect dependencies on unbuilt work
- [ ] **DEPS-02**: Dependency checker produces DEPENDENCY-GAPS.md with gap table (phase, task, dependency type, resolution options)
- [ ] **DEPS-03**: Each detected gap includes structured fix proposals (reorder phases, add stub task, add prerequisite task)
- [ ] **DEPS-04**: Dependency checker completes in under 10 seconds regardless of milestone size
- [ ] **DEPS-05**: Dependency findings integrate into readiness gate as CONCERNS (missing but non-critical) or FAIL (missing and blocking)
- [ ] **DEPS-06**: Scope is bounded to current phase + 1 upstream phase to prevent scope explosion

### Plan Edge Cases

- [ ] **EDGE-01**: Edge case analyzer reads PLAN.md and task shards to surface uncovered error paths, empty states, and boundary conditions
- [ ] **EDGE-02**: Edge cases are categorized by severity (HIGH / MEDIUM / LOW) with each referencing a specific plan element (file, function, state field)
- [ ] **EDGE-03**: Output is capped at 5-8 high-relevance findings per plan — no generic noise
- [ ] **EDGE-04**: Edge case findings are always CONCERNS in readiness gate, never FAIL
- [ ] **EDGE-05**: For HIGH severity edge cases, analyzer generates BDD-format acceptance criteria candidates
- [ ] **EDGE-06**: User approves which generated ACs to append to PLAN.md before they are added

### Integration Verification

- [ ] **INTG-01**: Declaration-time verification (Mode A) in plan-checker detects orphan exports, name mismatches, and @-reference file existence in plan declarations
- [ ] **INTG-02**: Codebase-time verification (Mode B) in readiness gate verifies function signatures, module exports, and pde-tools.cjs command availability for files named in plan @-references
- [ ] **INTG-03**: TOOL_MAP pre-registration allowlist (`# TOOL_MAP_PREREGISTERED` annotation) prevents false positives on intentionally pre-registered entries
- [ ] **INTG-04**: Readiness gate gains B4 (file existence) and B5 (orphan export) check IDs — additive to existing A1-A11, B1-B3
- [ ] **INTG-05**: Integration check scope is strictly bounded to files named in plan `<context>` @-references — never a full codebase scan
- [ ] **INTG-06**: INTEGRATION-CHECK.md produced with check table (task, reference, check type, result)

### Tech Debt Closure

- [ ] **DEBT-01**: PLUG-01 — test `claude plugin install` from GitHub and document results (working path or blocked-by-marketplace note)
- [ ] **DEBT-02**: TRACKING-PLAN.md — create file or remove broken reference from consent panel
- [ ] **DEBT-03**: Historical commits (e067974, efe3af0) — document as known exception in MILESTONES.md (cannot retroactively fix)
- [ ] **DEBT-04**: lock-release trailing arguments — normalize call sites across all workflow files
- [ ] **DEBT-05**: SUMMARY.md `one_liner` field — add field to template and backfill recent phase SUMMARY.md files
- [ ] **DEBT-06**: TOOL_MAP pre-registered entries (github:update-pr, github:search-issues) — add `# TOOL_MAP_PREREGISTERED` annotation or add consumers
- [ ] **DEBT-07**: pde-tools.cjs help text — update usage help to include v0.6 commands (manifest, shard-plan, readiness, tracking)

### Workflow Integration

- [ ] **WIRE-01**: plan-phase.md enhanced with research validation step between research detection and planner spawn
- [ ] **WIRE-02**: check-readiness.md enhanced with `run_integration_checks` step after semantic checks (Mode B codebase-time verification)
- [ ] **WIRE-03**: readiness.cjs enhanced with B4 and B5 check IDs — additive to existing check system
- [ ] **WIRE-04**: All new verification artifacts (RESEARCH-VALIDATION.md, DEPENDENCY-GAPS.md, EDGE-CASES.md, INTEGRATION-CHECK.md) consumed by readiness gate in unified READINESS.md output

## Future Requirements

### v0.7.x Extensions

- **RVAL-EXT-01**: Claim confidence scoring — graduated HIGH/MEDIUM/LOW per claim (add when validation reports feel too binary)
- **RVAL-EXT-02**: Research validation as standing gate — auto-wire into every plan-phase run (add after standalone validation is stable)

### v0.8+ Candidates

- **INTG-EXT-01**: Integration verification with type awareness — argument shape checking beyond name matching
- **PRES-01**: Stakeholder presentation generator (`/pde:present`) — generate reports from project artifacts
- **OBS-01**: tmux monitoring dashboard — real-time agent activity visibility
- **EXP-01**: Experience product type — events/festivals/installations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic plan rewriting on edge case detection | Silent plan mutation destroys trust — report and let user approve changes |
| Full AST parsing for type verification (beyond acorn vendoring) | Zero-npm-deps constraint; acorn is vendored for specific use, not a general type system |
| Continuous background validation | PDE is session-based; validation runs at pipeline transition points, not continuously |
| Re-validation of external library claims | Scope to codebase-verifiable claims only; external claims marked UNVERIFIABLE |
| Git history-based dependency inference | Too many false positives from PDE's non-1:1 commit-to-phase relationship |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBT-01 | Phase 54 | Pending |
| DEBT-02 | Phase 54 | Pending |
| DEBT-03 | Phase 54 | Pending |
| DEBT-04 | Phase 54 | Pending |
| DEBT-05 | Phase 54 | Pending |
| DEBT-06 | Phase 54 | Pending |
| DEBT-07 | Phase 54 | Pending |
| RVAL-01 | Phase 55 | Pending |
| RVAL-02 | Phase 55 | Pending |
| RVAL-03 | Phase 55 | Pending |
| RVAL-04 | Phase 55 | Pending |
| RVAL-05 | Phase 55 | Pending |
| RVAL-06 | Phase 55 | Pending |
| RVAL-07 | Phase 57 | Pending |
| RVAL-08 | Phase 57 | Pending |
| DEPS-01 | Phase 56 | Pending |
| DEPS-02 | Phase 56 | Pending |
| DEPS-03 | Phase 56 | Pending |
| DEPS-04 | Phase 56 | Pending |
| DEPS-05 | Phase 56 | Pending |
| DEPS-06 | Phase 56 | Pending |
| EDGE-01 | Phase 56 | Pending |
| EDGE-02 | Phase 56 | Pending |
| EDGE-03 | Phase 56 | Pending |
| EDGE-04 | Phase 56 | Pending |
| EDGE-05 | Phase 56 | Pending |
| EDGE-06 | Phase 56 | Pending |
| INTG-01 | Phase 56 | Pending |
| INTG-02 | Phase 57 | Pending |
| INTG-03 | Phase 56 | Pending |
| INTG-04 | Phase 57 | Pending |
| INTG-05 | Phase 56 | Pending |
| INTG-06 | Phase 56 | Pending |
| WIRE-01 | Phase 57 | Pending |
| WIRE-02 | Phase 57 | Pending |
| WIRE-03 | Phase 57 | Pending |
| WIRE-04 | Phase 57 | Pending |

**Coverage:**
- v0.7 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation — all 37 requirements mapped to phases 54-57*
