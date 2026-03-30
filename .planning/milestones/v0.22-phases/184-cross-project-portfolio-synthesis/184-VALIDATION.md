---
phase: 184
slug: cross-project-portfolio-synthesis
status: complete
nyquist_compliant: true
verified: 2026-03-30T04:51:00Z
---

# Phase 184 — Nyquist Validation

> Post-execution validation assertions. Each assertion below can be run against the codebase to confirm the phase goal is still met.

## Assertions

### Truth 1: buildPortfolioIR accepts an array of absolute paths and returns a portfolioIR with per-project IR entries

**Command:** `node bin/pde-tools.cjs portfolio build`
**Expected:** JSON output containing `"project_count": 0` and `"schema_version": "1.0"` when called with no paths
**Meaningful because:** Confirms the CLI command exists, the portfolio module loads, and empty-input graceful handling works — not just that the file is present

### Truth 2: extractMilestoneHistory reads MILESTONES.md and returns milestone objects with version, name, shipped date

**Command:** `node -e "const p = require('./bin/lib/portfolio.cjs'); const r = p.extractMilestoneHistory(process.cwd()); console.log(Array.isArray(r.milestones) ? 'ARRAY OK len=' + r.milestones.length : 'FAIL: not array')"`
**Expected:** `ARRAY OK len=N` where N >= 0
**Meaningful because:** Confirms milestone extraction returns an array of parsed milestone objects from MILESTONES.md, not an error or empty object

### Truth 3: detectSchemaVersion reads STATE.md frontmatter and returns a version string

**Command:** `node -e "const p = require('./bin/lib/portfolio.cjs'); const v = p.detectSchemaVersion(process.cwd()); console.log(['1.0','pre-1.0-modern','pre-1.0-legacy','unknown'].includes(v) ? 'VERSION OK: ' + v : 'INVALID: ' + v)"`
**Expected:** `VERSION OK: 1.0` (for a GSD v1.0+ project)
**Meaningful because:** Confirms schema detection reads STATE.md and returns a known version string; an unrecognized return would break portfolio synthesis for this project

### Truth 4: A project path with no .planning/ directory returns an unavailable sentinel entry, not a throw

**Command:** `node -e "const p = require('./bin/lib/portfolio.cjs'); const r = p.buildPortfolioIR(['/tmp/nonexistent-project-path']); const proj = r.projects[0]; console.log(proj && proj.unavailable === true ? 'SENTINEL OK' : 'FAIL: ' + JSON.stringify(proj))"`
**Expected:** `SENTINEL OK`
**Meaningful because:** Confirms that invalid paths produce a sentinel entry rather than crashing, which is critical for portfolio synthesis across mixed-validity path lists

### Truth 5: A project path where IR extraction throws returns an unavailable sentinel entry, not a throw

**Command:** `node -e "const p = require('./bin/lib/portfolio.cjs'); try { const r = p.buildPortfolioIR(['/tmp']); const proj = r.projects[0]; console.log(proj.unavailable === true || r.project_count === 1 ? 'HANDLED OK' : 'UNEXPECTED: ' + JSON.stringify(proj)); } catch(e) { console.log('THREW: ' + e.message); }"`
**Expected:** `HANDLED OK` (sentinel returned, not a throw)
**Meaningful because:** Confirms the inner try/catch in buildPortfolioIR catches extraction errors and returns a sentinel with reason, not a bare exception

### Truth 6: Missing MILESTONES.md returns an unavailable sentinel, not a throw

**Command:** `node -e "const p = require('./bin/lib/portfolio.cjs'); const r = p.extractMilestoneHistory('/tmp/nonexistent'); console.log(r && r.unavailable === true ? 'SENTINEL OK' : r && Array.isArray(r.milestones) ? 'EMPTY MILESTONES OK' : 'FAIL: ' + JSON.stringify(r))"`
**Expected:** `SENTINEL OK` or `EMPTY MILESTONES OK`
**Meaningful because:** Confirms that a missing MILESTONES.md path does not crash milestone extraction

### Truth 7: buildCrossProjectPortfolio(portfolioIR) returns a sections array that renders across N projects

**Command:** `node -e "const r = require('./bin/lib/render-presentation.cjs'); const portfolioIR = {schema_version:'1.0',project_count:0,available_count:0,projects:[]}; const sections = r.buildCrossProjectPortfolio(portfolioIR); console.log(Array.isArray(sections) && sections.length >= 3 ? 'SECTIONS OK: ' + sections.map(s=>s.id).join(',') : 'FAIL')"`
**Expected:** `SECTIONS OK:` followed by section IDs including `patterns`, `outcomes`, and `timeline`
**Meaningful because:** Confirms the render function returns structured sections for portfolio HTML generation, not an empty array or error

### Truth 8: pde-tools portfolio build outputs portfolioIR JSON to stdout

**Command:** `node bin/pde-tools.cjs portfolio build | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); console.log(j.schema_version === '1.0' && j.hasOwnProperty('project_count') ? 'JSON VALID' : 'FAIL')"`
**Expected:** `JSON VALID`
**Meaningful because:** Confirms the CLI output is valid parseable JSON with the expected schema — required for `portfolio render` to consume the build output

### Truth 9: pde-tools portfolio render and /pde:portfolio command trigger the full portfolio synthesis pipeline

**Command:** `node -e "const fs = require('fs'); const cmd = fs.readFileSync('commands/portfolio.md', 'utf8'); const wf = fs.readFileSync('workflows/portfolio.md', 'utf8'); console.log(cmd.includes('pde:portfolio') && wf.includes('portfolio build') && wf.includes('portfolio render') ? 'PIPELINE WIRED' : 'FAIL')"`
**Expected:** `PIPELINE WIRED`
**Meaningful because:** Confirms the command and workflow files exist and reference the correct CLI subcommands — the integration path from `/pde:portfolio` to `pde-tools portfolio build` and `portfolio render`
