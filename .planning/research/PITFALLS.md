# Pitfalls Research: Quality & Reliability Hardening

**Domain:** Adding quality hardening to a rapidly-built Claude Code plugin (PDE) with 22 milestones and 184 phases of accumulated artifacts and code
**Researched:** 2026-03-29
**Confidence:** HIGH — patterns derived from PDE's own retrospectives (v0.18–v0.22), recurring defects documented across milestone audits, and established practice on quality-hardening legacy codebases

---

## Context: Why Quality Hardening Is Different From Feature Work

Every prior PDE milestone added new capability. Quality hardening is the first milestone where the product under development *is the existing codebase* — not a new feature. This inverts the failure modes: feature work risks "built the wrong thing," while hardening risks "broke the right thing," "missed the real rot," or "enforced the wrong contract." The pitfalls below are ordered by the damage they cause: some produce false confidence (most dangerous), some waste phase budget (moderate), and some create regressions (recoverable but painful).

---

## Critical Pitfalls

### Pitfall 1: Treating Checkbox Audits as Proof of Correctness

**What goes wrong:**
A phase audits ROADMAP.md plan checkboxes, finds 47 unchecked, marks them all checked, and reports "audit complete." The next milestone generates a status report showing 100% plan completion. But the checkboxes were unchecked because plans completed in worktrees and the roadmap wasn't updated — not because the work wasn't done. The fix made the state *look* consistent without verifying the underlying code reality. Confidence in the tracking system increases, but the system now silently asserts facts that were never verified against source.

**Why it happens:**
The worktree-based execution model (introduced v0.18) completes plans inside isolated branches and merges back to main, but does not atomically update ROADMAP.md checkboxes at merge time. This has been documented in every retrospective from v0.18 through v0.21 as "plan completion markers not updated in ROADMAP.md." The natural hardening response — "fix the checkboxes" — addresses the symptom without addressing whether the checkbox value corresponds to any verifiable state.

**How to avoid:**
- For each unchecked plan box: run a concrete verification step (grep for a key artifact, check git log for a commit, confirm a test passes) before marking it checked.
- "Checkbox matches code state" must be the pass condition, not "checkbox is now checked."
- Build a lightweight reconciliation script (`bin/tools/reconcile-checkboxes.cjs`) that, given a plan ID, finds the corresponding phase directory and checks for the presence of a SUMMARY.md with a non-empty completion timestamp. This provides a ground-truth proxy for plan completion without manual inspection of every plan.
- Separate two sub-tasks: (a) verify historical plans against their artifacts, and (b) fix the worktree merge workflow so future plans update the checkbox atomically. Only (b) prevents recurrence.

**Warning signs:**
- Phase produces a high checkbox-fix count (20+) in a single commit without corresponding grep assertions in the phase plan.
- Phase plan says "mark plans complete" without a verification sub-step for each plan.
- ROADMAP.md shows 100% completion immediately after the hardening phase, with no corresponding test evidence.

**Phase to address:**
State integrity audit phase (early milestone). Must include explicit verifier script, not manual checkbox review. The script's output is the phase artifact, not the updated ROADMAP.md.

---

### Pitfall 2: Writing Validators That Pass Against the Current State, Not the Invariant

**What goes wrong:**
A hardening phase adds a validator for one-liner fields in SUMMARY.md files. The validator is built by examining the existing SUMMARY.md files, identifying what they contain, and writing rules that match what exists. Since 40 SUMMARY.md files already have empty "One-liner:" fields, the validator's "acceptable" threshold is tuned to pass the current corpus. The validator passes, the phase completes, and the codebase now has a "validated" one-liner policy that treats empty one-liners as acceptable.

**Why it happens:**
When writing validators for legacy content, the path of least resistance is to make the validator match the existing data. This eliminates failing tests immediately and produces a passing state. But the validator is now encoding rot as a standard, not enforcing the intended quality level.

**How to avoid:**
- Before writing any validator, specify the intended invariant in prose first: "Every SUMMARY.md in a completed phase must have a non-empty one-liner that describes the phase in one sentence." This becomes the acceptance criterion. The validator is then built to enforce that AC, not to match the current state.
- When existing files violate the invariant, the phase must either: (a) fix the violations to meet the invariant, or (b) explicitly document grandfathered exceptions with a `# legacy-exception: [reason]` comment in the file — not (c) relax the invariant to match the violations.
- Seed test fixtures with intentionally bad data (empty one-liner, placeholder "TODO" one-liner, one-liner that is actually three sentences) and verify the validator rejects each case.

**Warning signs:**
- Validator test fixtures only contain valid examples — no intentionally bad examples that are expected to fail.
- Validator parameters like `min_length` or `required` are set to values that happen to match the worst offenders in the existing corpus.
- Phase claims "validator complete" without any description of how violations were resolved.

**Phase to address:**
Artifact integrity validation phase. Invariant specification must precede validator implementation.

---

### Pitfall 3: Hardening Tests Test the Harness, Not the Contract

**What goes wrong:**
A hardening phase adds Nyquist-style structural regression tests for quality invariants. The tests use the existing `describe()`/`it()` pattern and check that validator functions exist, that config keys are present, and that output files are written. All tests pass. But none of the tests actually assert the quality contract: they verify the scaffolding is present, not that the scaffolding does anything correct. A future regression that empties the config or no-ops the validator continues to pass all tests.

**Why it happens:**
Tests written alongside new code drift toward testing that the code was written (functions exist, objects have keys) rather than that the code is correct (functions return the right value, objects enforce the right constraints). This drift is especially common when the test author writes the code and the tests in the same session — the mental model of "what the code does" substitutes for "what the code should guarantee."

**How to avoid:**
- Every hardening test must have a corresponding failure case: a test that demonstrates what happens when the contract is violated. If the test suite for a SUMMARY.md validator doesn't include a test that *fails* when given an empty one-liner, the test suite doesn't prove the validator works.
- Name tests by what they enforce, not what they call: `it('rejects empty one-liner')` not `it('calls validateOneLiner()')`.
- For each new quality constraint, write the failing test first (red), then implement the enforcement, then confirm the test passes (green). This is especially important in a codebase that has drifted toward "tests as documentation" rather than "tests as constraints."
- Reserve 30% of phase test count for negative cases (inputs that should fail the validator/check).

**Warning signs:**
- All test descriptions use words like "creates", "writes", "calls", "exists" — none use "rejects", "fails", "blocks", "prevents".
- A test suite has 100% pass rate when run against a completely empty/stubbed implementation of the module under test.
- Test fixtures for validators contain only valid examples.

**Phase to address:**
Every hardening phase. Enforce at planning time by requiring each plan to specify both positive and negative test cases in its acceptance criteria before execution begins.

---

### Pitfall 4: Fixing Symptoms in Place Without Addressing Root Cause

**What goes wrong:**
The hardening milestone finds 12 stale `progress` fields in STATE.md (the frontmatter `percent` field showing 0% after a completed milestone). A phase manually sets all 12 to their correct values via sed/write operations. The phase is marked complete. Three months later, STATE.md shows 0% again for the new milestone, because the root cause — the `progress.percent` field is never updated by the workflow automation that runs at phase completion — was not fixed.

This pattern is documented in PDE's own retrospectives: v0.21 noted that SUMMARY.md MILESTONES.md noise was "the same issue as v0.18," and v0.20 noted ROADMAP.md checkbox sync was a "recurring issue" from v0.18. The issues recurred because they were patched in place rather than fixed at the source.

**How to avoid:**
- For every fix, ask: "What process generated this incorrect state? Is that process still running?" If yes, the fix is incomplete until the process is corrected.
- Structure fixes in two parts: (a) a remediation script that corrects the historical data, and (b) a source fix or validation gate that prevents future recurrence. Only (b) prevents the issue from appearing in v0.24.
- In the phase plan, explicitly label each fix as "remediation only" (no recurrence prevention) or "root cause fix" (process corrected). The phase completion report must account for both.
- For issues that cannot be root-cause-fixed in the current phase (because the fix is in a different subsystem), create a concrete PITFALLS.md entry and a `[ ]` item in FUTURE-MILESTONES.md rather than marking it resolved.

**Warning signs:**
- Phase plan contains "update X to reflect current state" without "fix Y to generate correct state."
- The same category of defect appears in multiple milestone audit tech_debt sections.
- Fix commit message says "correct stale value" without "prevent stale value."

**Phase to address:**
Root cause analysis phase (before any remediation phases). Categorize all found issues as "symptom-only fixable" vs "root cause fixable" before writing fix phases.

---

### Pitfall 5: CJS Constraint Violations Introduced by Hardening Code

**What goes wrong:**
A hardening phase adds a new validation utility that uses ESM `import` syntax because the developer's mental model of the toolchain slipped during writing. Or a new validator uses `require('some-package')` that is not listed in the zero-npm-deps constraint. Or a test file adds `import { something } from '@vitest/coverage-v8'` which triggers a new package installation. The hardening tool that was meant to improve reliability introduces a new constraint violation. The violation is subtle enough to pass code review and only surfaces when a user installs the plugin on a clean system.

**Why it happens:**
CJS vs ESM discipline degrades under context pressure. A developer writing their 12th file in a session defaults to whatever syntax they used last — which in a mixed environment may be ESM if they were recently working on test files using vitest. The zero-npm-deps constraint is enforced manually (no package.json at root, packages installed only in subdirectories), and a single `npm install` or `pnpm add` at the wrong level silently adds a dependency.

**How to avoid:**
- Every new `.cjs` file added in the hardening milestone must be verified: (a) uses `require()` not `import`, (b) exports via `module.exports` not `export`, (c) does not `require()` any package not already in the project dependency tree.
- Add a structural test in the Nyquist suite: `readFileSync` each new `.cjs` file and assert it does not contain the string `import ` (with a space, to avoid false positives on variable names). This catches the most common slip.
- Check root `package.json` before and after each phase commit. If `package.json` doesn't exist at root (zero-deps constraint), verify it wasn't created during the phase.
- New test files must declare their import style explicitly in the phase plan: "test file uses ESM with `createRequire` bridge" or "test file is pure CJS with `require()`."

**Warning signs:**
- Phase plan does not specify CJS/ESM module format for each new file.
- A commit adds a `package.json` or `package-lock.json` in a directory that didn't previously have one.
- A `.cjs` file opens with `import {` rather than `'use strict'; const x = require(`.

**Phase to address:**
Every phase that adds new code. Add a Nyquist-level assertion template: "all new CJS files use require syntax, all new ESM test files use createRequire bridge."

---

### Pitfall 6: Hardening Introduces Breaking Changes to Existing Workflows

**What goes wrong:**
A hardening phase refactors a utility function to add input validation. The validation correctly rejects `null` inputs, which were previously passed through silently. Three workflow files (wireframe.md, critique.md, mockup.md) pass `null` to this utility under specific product type combinations (hardware + no design manifest). The hardening phase didn't test these product type combinations because they're not in the core happy-path test suite. After the hardening milestone ships, users running hardware product pipelines get an unhandled exception from the newly strict utility.

**Why it happens:**
Quality hardening is fundamentally about adding constraints to code that previously had none. Every new constraint is a potential breaking change for a code path that relied on the absence of that constraint. With 184 phases of accumulated code and 5+ product types (software, hardware, hybrid, experience, business), the interaction space is too large to enumerate manually.

**How to avoid:**
- Before adding any input validation to a shared utility, run a static grep across all callers to identify every call site and the values they can pass. Document caller-call site-input combinations before writing validation logic.
- For any utility that is called from workflow markdown files (not just CJS modules), test the most divergent product types: hardware (no Stitch, no design manifest, physical tokens), experience (temporal/spatial flows, floor plan wireframes), business (service blueprint, launch kit). These edge cases are the ones most likely to break under new constraints.
- Treat hardening changes to shared utilities as API changes: bump a version comment at the top of the file, list what changed, and record which callers were audited.
- New input validation must be additive-safe: validate new inputs without changing behavior for inputs that were previously accepted. Reject only what was never valid; don't tighten "was loosely accepted" to "now strictly rejected" without explicit caller audit.

**Warning signs:**
- Phase plan adds validation to a function without listing the callers that will be affected.
- Test coverage for the changed function only covers the happy path (valid inputs) and the newly rejected case.
- No product-type-specific integration test exists for any shared utility.

**Phase to address:**
Any phase touching shared utilities or workflow markdown. Pre-condition: caller audit must be the first sub-task of any plan that modifies a shared function.

---

### Pitfall 7: Progress Field Stagnation — Hardening Phases Not Counted in STATE.md

**What goes wrong:**
The hardening milestone executes 6 phases. After each phase, STATE.md frontmatter shows `completed_phases: 0` because the hardening milestone's phases don't follow the `total_phases` count set at milestone start, or the post-phase recalculation hook isn't updating the progress fields. The milestone ends with STATE.md showing 0/6 phases despite all being complete. The next roadmap phase reads STATE.md to verify readiness and sees `percent: 0`, triggering a false FAIL on the readiness gate.

**Why it happens:**
STATE.md progress fields are updated by `recalculateFromArtifacts()` which reads ROADMAP.md plan checkboxes to infer completion. If the hardening milestone's ROADMAP.md section isn't properly formatted with the expected checkbox pattern, the recalculation produces 0. This is the same root cause as the recurring one-liner noise issue: the automation assumes a specific format that quality-hardening phases may not exactly follow.

**How to avoid:**
- Before the first hardening phase executes, verify that the ROADMAP.md section for this milestone uses the exact checkbox pattern that `recalculateFromArtifacts()` reads.
- Add a post-phase-1 check: after Phase 1 completes, manually verify that `progress.completed_phases` in STATE.md incremented from 0 to 1. If it didn't, diagnose the recalculation path before Phase 2 starts.
- In the milestone planning phase, explicitly set `total_phases` in STATE.md frontmatter to the planned phase count so `percent` calculations are accurate from the start.

**Warning signs:**
- After a completed phase, STATE.md frontmatter still shows `completed_phases: 0`.
- `progress.percent` remains at 0 after multiple phases complete.
- Readiness gate (`/pde:check-readiness`) produces unexpected FAIL results citing low completion metrics.

**Phase to address:**
Phase 1 of the hardening milestone. Verify the recalculation path as an explicit step in the Phase 1 plan before proceeding.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Mark all unchecked plan boxes as checked without verification | Clean ROADMAP.md quickly | False completion signal; obscures which work was actually verified | Never — always verify against artifacts |
| Write validators that pass against existing (possibly rotten) data | Zero failing tests immediately | Encodes rot as standard; future changes inherit the lowered bar | Never — invariant must precede validator |
| Fix stale data in-place without addressing the process that created it | Quick wins on data integrity | Issue recurs in next milestone (documented pattern in v0.18, v0.20, v0.21) | Only if process fix is explicitly tracked in FUTURE-MILESTONES.md |
| Hardening phases only cover happy-path product type (software) | Simpler test setup | Breaking changes for hardware/experience/business product types | Never for shared utilities; acceptable for persona-specific new code |
| Add inline ESM `import` syntax to a new CJS utility for "cleaner syntax" | Easier to write | Plugin fails silently on clean installs without the ESM module available | Never |
| Skip negative test cases to hit Nyquist count faster | More tests written per unit time | Validators pass against broken implementations; no regression protection | Never for validators; acceptable for pure data transformation tests |
| Use grep/sed to patch markdown files rather than schema-aware tools | Fast one-off fixes | Pattern-matching produces false positives, corrupts adjacent content | Only for one-off manual fixes, never in automation scripts |

## Integration Gotchas

Common mistakes when adding quality hardening to the existing PDE system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| ROADMAP.md checkbox automation | Grepping for `[ ]` patterns and bulk-replacing without checking worktree merge history | Run `git log --all --grep="plan" --oneline` per phase to determine if the plan completed in a worktree branch before touching its checkbox |
| STATE.md frontmatter updates | Writing `progress.percent: 100` directly when a milestone completes | Always invoke `recalculateFromArtifacts()` path rather than writing frontmatter manually — direct writes produce inconsistency with MILESTONES.md derived data |
| SUMMARY.md one-liner extraction | Assuming "One-liner:" field content is the one-liner | The extraction reads the line *after* "One-liner:"; an empty line after "One-liner:" produces a blank extraction. Fix requires content on the same line or the line immediately after, not just the header |
| Nyquist test count assertions | Adding hardening tests to existing test files and re-counting total | Nyquist assertions use per-phase counts; adding tests to Phase 176's test file while in a Phase 185 context will inflate Phase 176's count, not Phase 185's |
| Workflow markdown validators | Testing workflow files by running the workflow | Workflows invoke Claude Code agents; test by static structural analysis (regex, line count, required section headers) to remain deterministic |
| hooks.json modifications | Adding a new hook entry and assuming it fires | Hook entries require both the correct `event` value and the correct `matcher` pattern; test hook firing with a synthetic `.planning/` write before relying on it in automated hardening flows |
| MILESTONES.md data extraction | Reading MILESTONES.md to verify completion | MILESTONES.md is auto-generated from SUMMARY.md files; if SUMMARY.md files are stale, MILESTONES.md is stale. Always verify against phase VERIFICATION.md files, not MILESTONES.md |

## Performance Traps

Patterns that work at small scale but fail as the artifact corpus grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Scanning all `.planning/` files on every validator run | Validator takes 15+ seconds to run as project grows | Scope validators to a specific subdirectory per phase; never glob the entire `.planning/` tree | Projects with 500+ planning files (PDE is already at ~300) |
| Reading ROADMAP.md line-by-line for completion metrics | Slow on a 2000+ line ROADMAP.md; regex matches wrong sections | Parse ROADMAP.md once per validator run, cache the result, operate on the in-memory representation | ROADMAP.md exceeds 2000 lines (currently ~1800) |
| Running all hardening validators as a pre-commit hook | Commit latency grows to 30+ seconds | Use hooks only for fast (<2s) validators; run comprehensive validators as explicit commands, not hooks | Any commit touching `.planning/` files |
| Loading full NDJSON event logs to extract session summaries | Memory spike for large sessions with 500+ events | Stream NDJSON line-by-line with an early-exit once the needed fields are found | Sessions with > 200 events |

## Security Mistakes

Domain-specific security issues for quality hardening in a plugin codebase.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Hardening scripts that execute content from `.planning/` files as code to "understand" plan structure | Arbitrary code execution if a plan file contains crafted content | Never execute markdown content as code; parse structurally with string operations and JSON.parse() only |
| Validator scripts that write their own output back to `.planning/` without a dry-run mode | Accidental corruption of planning state during validation | All validators default to dry-run; `--write` flag required for any actual writes |
| Adding hardening commands to hooks.json without the zero-stdout contract | Hook output appears in Claude Code's response stream, polluting tool output | All hook scripts must suppress stdout; write only to NDJSON event bus |

## UX Pitfalls

Common experience mistakes when adding quality hardening to a developer tool.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Quality gate failures produce no actionable output | User sees "FAIL" with no indication of what to fix | Every gate failure must include: which file failed, which invariant was violated, what the actual value was, what the expected value is |
| Hardening adds mandatory gates that block common workflows | Users find `/pde:plan-phase` slower or more interruptive | Gates belong in `/pde:check-readiness` (opt-in), not in every workflow command |
| Validator output mixes warnings and blocking errors | Users can't distinguish "should fix" from "must fix" | Strict two-level output: `ERROR` (blocks) and `WARN` (advisory); exit code 1 only on ERROR |
| Quality dashboard shows metrics that users can't improve | Users see "47 one-liner violations" with no path to fix | Every metric in a quality dashboard must link to a remediation command or explain how to fix manually |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Plan checkbox audit:** Often missing verification — confirm that each box marked complete has a corresponding SUMMARY.md with a completion timestamp, not just that the box is now checked
- [ ] **Validator implementation:** Often missing negative test cases — verify each validator rejects intentionally bad input (empty fields, placeholder text, over-length one-liners)
- [ ] **Root cause fix:** Often missing process correction — verify that the process that generated stale/incorrect state is also fixed, not only the stale data itself
- [ ] **CJS compliance:** Often missing syntax check — verify new `.cjs` files use `require()` and `module.exports`, not ESM `import`/`export` syntax
- [ ] **Caller audit:** Often missing before shared-utility changes — verify that every call site of a modified shared utility was checked for compatibility with new constraints
- [ ] **Progress field wiring:** Often missing post-phase check — verify STATE.md `completed_phases` incremented correctly after Phase 1 completes
- [ ] **Cross-product-type testing:** Often missing — verify that any changed shared utility was tested against hardware, experience, and business product type inputs, not only software
- [ ] **Invariant-first validation:** Often missing — verify that the invariant each validator enforces was written down as an AC before the validator was built

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Validator encodes rot as standard (passes rotten data) | MEDIUM | Rewrite validator with correct invariant; treat all currently passing files as untested; re-run against full corpus; fix violations or document exceptions |
| Hardening introduced breaking change to hardware/experience product type | MEDIUM | Identify the narrowed constraint; add a compatibility shim for the legacy input pattern; add product-type-specific test fixtures so the regression is caught in future |
| Progress fields stagnated at 0 throughout milestone | LOW | Manually recalculate from VERIFICATION.md files; fix ROADMAP.md section format to match `recalculateFromArtifacts()` expectations; re-run recalculation |
| CJS violation introduced via ESM import syntax in new file | LOW | Convert file to `require()` syntax; remove any transitively introduced package from relevant package.json; verify clean install passes |
| Root-cause-only fix produced no lasting improvement | HIGH | Document issue in FUTURE-MILESTONES.md with root cause analysis; plan a focused automation phase; do not re-fix data in place again without the process fix |
| Checkbox bulk-audit produced false completion signal | MEDIUM | Revert bulk checkbox changes; run reconciliation script against phase artifacts; mark only verified-complete plans as checked |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Checkbox-as-proof fallacy | Root cause analysis phase (Phase 1 of milestone) | Assertion: reconciliation script output matches checkbox states; each checked box has a SUMMARY.md with completion timestamp |
| Validators encoding rot | Invariant-specification step within each validator phase | Assertion: each validator test suite contains at least one negative case per invariant; validator rejects seeded-bad fixture |
| Tests that test the harness | Acceptance criteria for every hardening phase | Assertion: test suite fails when run against a stub implementation that returns always-valid; recover only after real implementation is wired |
| Symptom-only fixes | Root cause analysis phase | Assertion: each fix is labeled "remediation" or "root cause"; "root cause" fixes include a changed process, not only changed data |
| CJS constraint violations | Every phase that adds new code | Assertion: `grep -r "^import " bin/ --include="*.cjs"` returns empty; no new package.json created at root |
| Breaking changes to shared utilities | Any phase modifying shared utilities | Assertion: integration test passes for all five product types (software, hardware, hybrid, experience, business) against modified utility |
| Progress field stagnation | Phase 1 of milestone | Assertion: STATE.md `completed_phases` shows 1 after Phase 1 commit |

## Sources

- PDE Retrospective v0.18: "Plan completion markers in ROADMAP.md — some plans show `[ ]` unchecked despite phase being complete (145-02, 146-03, 147-04, 149-03)"
- PDE Retrospective v0.20: "ROADMAP plan checkbox sync is a recurring issue — same as v0.18; worktree-based execution completes plans but doesn't reliably update ROADMAP.md checkboxes"
- PDE Retrospective v0.21: "SUMMARY.md files not generated — v0.21 phases shipped without SUMMARY.md files, making summary-extract data noisy in MILESTONES.md"
- PDE Retrospective v0.18: "SUMMARY.md one-liner extraction — many summaries had empty 'One-liner:' fields, causing noisy MILESTONES.md auto-extraction; manual cleanup needed" (same issue noted in v0.20 retrospective)
- PDE v0.22 Milestone Audit: "4 stale persona slugs in workflows/present.md" — symptom of prose drift when code changes but cross-references aren't updated
- PDE v0.18 Milestone Audit: INT-RETRY-STUB and INT-PDE-REMOTE-DOC — documented limitations carried as tech_debt rather than fixed at root
- Empirical software engineering: symptom-patching recurrence rate is substantially higher than root-cause fixes in rapidly-developed systems
- PDE project constraint: zero-npm-deps-at-root + CJS module system — enforced manually, no automated tooling prevents violations

---
*Pitfalls research for: Quality & Reliability Hardening (PDE v0.23)*
*Researched: 2026-03-29*
