---
phase: 183
slug: auto-generation
status: complete
nyquist_compliant: true
verified: 2026-03-29T21:15:00Z
---

# Phase 183 — Nyquist Validation

> Post-execution validation assertions. Each assertion below can be run against the codebase to confirm the phase goal is still met.

## Assertions

### Truth 1: Completing a phase triggers background presentation generation without blocking Claude Code execution

**Command:** `grep -c 'auto_generate_presentations' workflows/execute-phase.md`
**Expected:** Returns `>= 1`
**Meaningful because:** Confirms the auto-generation step exists in the phase completion workflow; absence would mean phase completion never triggers presentation generation

### Truth 2: Running /gsd:complete-milestone triggers presentation generation for all default personas

**Command:** `grep -c 'auto_generate_presentations' workflows/complete-milestone.md`
**Expected:** Returns `>= 1`
**Meaningful because:** Confirms the auto-generation step exists in the milestone completion workflow; absence would mean milestone archival never triggers presentation generation

### Truth 3: Auto-generation only fires when phase completion is confirmed — not on mid-execution file writes

**Command:** `node -e "const fs = require('fs'); const ep = fs.readFileSync('workflows/execute-phase.md', 'utf8'); const lines = ep.split('\n'); const autoIdx = lines.findIndex(l => l.includes('auto_generate_presentations')); const updateIdx = lines.findIndex(l => l.includes('update_project_md')); console.log(autoIdx > updateIdx ? 'ORDERING OK' : 'ORDERING FAIL')"`
**Expected:** `ORDERING OK`
**Meaningful because:** Confirms auto-generation step is positioned after `update_project_md` (the phase completion marker), ensuring it fires at the end of the workflow, not mid-execution

### Truth 4: The default persona set is configurable via presentations.auto_generate_personas in config.json

**Command:** `grep -c 'presentations.auto_generate' bin/lib/config.cjs`
**Expected:** Returns `>= 1`
**Meaningful because:** Confirms the config key is registered in VALID_CONFIG_KEYS; if absent, `pde-tools config-set presentations.auto_generate true` would be rejected as an unknown key

### Truth 5: Setting presentations.auto_generate to false disables auto-generation without affecting on-demand /pde:present

**Command:** `npx vitest run tests/phase-183/ --reporter=verbose`
**Expected:** `9 passed` with no failures
**Meaningful because:** 9 tests cover config-set/get round-trip for `presentations.auto_generate`, fallback behavior when key is not set, rejection of invalid keys, and gate logic — confirming the disable mechanism works end-to-end without requiring a live workflow run
