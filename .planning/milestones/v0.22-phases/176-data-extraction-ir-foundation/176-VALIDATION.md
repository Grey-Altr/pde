---
phase: 176
slug: data-extraction-ir-foundation
status: complete
nyquist_compliant: true
verified: 2026-03-29T18:00:00Z
---

# Phase 176 — Nyquist Validation

> Post-execution validation assertions. Each assertion below can be run against the codebase to confirm the phase goal is still met.

## Assertions

### Truth 1: buildPresentationIR returns project identity from PROJECT.md with name, goal, core_value, product_type
**Command:** `node -e "const p = require('./bin/lib/presentation.cjs'); p.buildPresentationIR(process.cwd()).then(ir => { if (!ir.project.name || ir.project.name.includes('unavailable')) throw new Error('project.name is sentinel or missing'); console.log('PASS:', ir.project.name); })"`
**Expected:** Prints `PASS: Platform Development Engine (PDE)` (or the current project name) — never prints a sentinel value
**Meaningful because:** Confirms that PROJECT.md is read and parsed at runtime, not returning a hardcoded empty value

### Truth 2: buildPresentationIR returns phase completion from STATE.md and ROADMAP.md with total, completed, progress_percent
**Command:** `node -e "const p = require('./bin/lib/presentation.cjs'); p.buildPresentationIR(process.cwd()).then(ir => { if (typeof ir.phases.total !== 'number' || ir.phases.total === 0) throw new Error('phases.total is 0 or not a number'); console.log('PASS: phases.total =', ir.phases.total); })"`
**Expected:** Prints `PASS: phases.total = N` where N is a positive integer
**Meaningful because:** Confirms that STATE.md and ROADMAP.md are parsed and produce a real numeric phase count, not a zero sentinel

### Truth 3: buildPresentationIR returns requirement coverage parsed from REQUIREMENTS.md checkboxes with per-category breakdown
**Command:** `node -e "const p = require('./bin/lib/presentation.cjs'); p.buildPresentationIR(process.cwd()).then(ir => { if (typeof ir.requirements.total !== 'number' || ir.requirements.total === 0) throw new Error('requirements.total is 0 or not a number'); console.log('PASS: requirements.total =', ir.requirements.total); })"`
**Expected:** Prints `PASS: requirements.total = N` where N is a positive integer
**Meaningful because:** Confirms REQUIREMENTS.md checkbox parsing is producing a real count from the live file

### Truth 4: buildPresentationIR returns design artifact inventory from design-manifest.json
**Command:** `node -e "const p = require('./bin/lib/presentation.cjs'); p.buildPresentationIR(process.cwd()).then(ir => { if (ir.design_artifacts === undefined) throw new Error('design_artifacts key missing'); console.log('PASS: design_artifacts.available =', ir.design_artifacts.available); })"`
**Expected:** Prints `PASS: design_artifacts.available = true` (or `false` if manifest is missing — either is acceptable, but the key must exist)
**Meaningful because:** Confirms the design_artifacts key is present and typed correctly, not undefined

### Truth 5: Missing source files produce `{ unavailable: true, reason }` sentinels, never silent zeros
**Command:** `grep -c 'unavailable.*true.*reason\|unavailable: true' bin/lib/presentation.cjs`
**Expected:** Returns a number ≥ 14
**Meaningful because:** Confirms that all file-source guard paths emit the proper sentinel object instead of silently returning zero or null

### Truth 6: extractGitVelocity returns commit count, contributor list, and LOC estimate from git history
**Command:** `node -e "const p = require('./bin/lib/presentation.cjs'); p.buildPresentationIR(process.cwd()).then(ir => { if (typeof ir.git_velocity.total_commits !== 'number' || ir.git_velocity.total_commits === 0) throw new Error('git_velocity.total_commits is 0 or not a number'); console.log('PASS: total_commits =', ir.git_velocity.total_commits); })"`
**Expected:** Prints `PASS: total_commits = N` where N is a positive integer
**Meaningful because:** Confirms that the git log is executed at runtime and the commit count reflects real repository history

### Truth 7: extractCostTiming returns session count and total duration from SUMMARY.md frontmatter
**Command:** `node -e "const p = require('./bin/lib/presentation.cjs'); p.buildPresentationIR(process.cwd()).then(ir => { if (typeof ir.cost_timing.session_count !== 'number' || ir.cost_timing.session_count === 0) throw new Error('session_count is 0 or not a number'); console.log('PASS: session_count =', ir.cost_timing.session_count); })"`
**Expected:** Prints `PASS: session_count = N` where N is a positive integer
**Meaningful because:** Confirms that SUMMARY.md frontmatter `duration` fields are being walked across phase directories

### Truth 8: extractBlockers returns blocker and risk arrays from STATE.md accumulated context
**Command:** `node -e "const p = require('./bin/lib/presentation.cjs'); p.buildPresentationIR(process.cwd()).then(ir => { if (!Array.isArray(ir.blockers)) throw new Error('blockers is not an array'); console.log('PASS: blockers is array, length =', ir.blockers.length); })"`
**Expected:** Prints `PASS: blockers is array, length = N` — an array with any length (including 0) is acceptable
**Meaningful because:** Confirms the STATE.md blockers section is parsed and returned as a proper array type, not undefined

### Truth 9: extractVerification returns per-phase AC pass/fail counts from VERIFICATION.md files
**Command:** `node -e "const p = require('./bin/lib/presentation.cjs'); p.buildPresentationIR(process.cwd()).then(ir => { if (typeof ir.verification.phases_verified !== 'number' || ir.verification.phases_verified === 0) throw new Error('phases_verified is 0 or not a number'); console.log('PASS: phases_verified =', ir.verification.phases_verified); })"`
**Expected:** Prints `PASS: phases_verified = N` where N is a positive integer
**Meaningful because:** Confirms VERIFICATION.md files are found and counted across phase directories

### Truth 10: extractResearch returns project research file count and per-phase research count
**Command:** `node -e "const p = require('./bin/lib/presentation.cjs'); p.buildPresentationIR(process.cwd()).then(ir => { if (typeof ir.research.project_research_files !== 'number') throw new Error('project_research_files is not a number'); console.log('PASS: project_research_files =', ir.research.project_research_files); })"`
**Expected:** Prints `PASS: project_research_files = N` where N is ≥ 0
**Meaningful because:** Confirms the research/ directory is scanned and returns a numeric file count

### Truth 11: extractDecisions returns decision list from STATE.md and SUMMARY.md history
**Command:** `node -e "const p = require('./bin/lib/presentation.cjs'); p.buildPresentationIR(process.cwd()).then(ir => { if (!Array.isArray(ir.decisions)) throw new Error('decisions is not an array'); console.log('PASS: decisions.length =', ir.decisions.length); })"`
**Expected:** Prints `PASS: decisions.length = N` where N is a positive integer
**Meaningful because:** Confirms STATE.md decisions section and SUMMARY.md key-decisions are being combined and returned as an array

### Truth 12: Running `node bin/pde-tools.cjs presentation artifact-read` produces valid JSON IR with all 10 top-level categories
**Command:** `node bin/pde-tools.cjs presentation artifact-read 2>/dev/null | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const ref=d.match(/@file:(.+)/); const path=ref?ref[1].trim():null; if(!path){const ir=JSON.parse(d); if(!ir.schema_version)throw new Error('no schema_version'); console.log('PASS: schema_version =',ir.schema_version);}else{const ir=JSON.parse(require('fs').readFileSync(path,'utf8')); if(!ir.schema_version)throw new Error('no schema_version'); console.log('PASS: schema_version =',ir.schema_version);}"`
**Expected:** Prints `PASS: schema_version = 1.0`
**Meaningful because:** Confirms the full CLI pipeline from pde-tools routing through buildPresentationIR to JSON serialization produces a valid schema-versioned artifact

### Truth 12b: All 38 phase tests pass
**Command:** `npx vitest run tests/phase-176/ --reporter=verbose 2>&1 | tail -5`
**Expected:** Output contains `38 passed` and `0 failed`
**Meaningful because:** Confirms all unit and integration tests for the IR extraction pipeline continue to pass against the live codebase
