---
phase: 171
slug: security-architecture-discovery-foundation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-29
validated: 2026-03-29
---

# Phase 171 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run tests/phase-171/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~130ms |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-171/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** <1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 171-01-01 | 01 | 1 | DISC-01, DISC-03, DISC-04, DISC-05 | unit | `npx vitest run tests/phase-171/app-discovery.test.mjs tests/phase-171/col-preprocess.test.mjs` | ✅ | ✅ green |
| 171-01-02 | 01 | 1 | DISC-01, DISC-03, DISC-04, DISC-05 | unit | `npx vitest run tests/phase-171/app-discovery.test.mjs tests/phase-171/col-preprocess.test.mjs` | ✅ | ✅ green |
| 171-02-01 | 02 | 1 | DISC-02 | unit | `npx vitest run tests/phase-171/app-registry.test.mjs` | ✅ | ✅ green |
| 171-02-02 | 02 | 1 | DISC-02 | unit | `npx vitest run tests/phase-171/app-registry.test.mjs` | ✅ | ✅ green |
| 171-03-01 | 03 | 2 | DISC-06 | smoke | `node bin/pde-tools.cjs app list --raw; echo "EXIT:$?"` | ✅ | ✅ green |
| 171-03-02 | 03 | 2 | DISC-06 | smoke | `test -f references/app-integrations.md && grep -c "org.blenderfoundation.blender" references/app-integrations.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement Coverage Detail

| Requirement | Tests | Test File | Status |
|-------------|-------|-----------|--------|
| DISC-01 (Five-tier probe) | 6 tests: Tier 1 env, Tier 2 which, Tier 3 pip, Tier 4 mdfind, Tier 5 well-known, null when all fail | app-discovery.test.mjs | ✅ COVERED |
| DISC-02 (Approval registry) | 14 tests: loadRegistry (2), addPendingEntry (2), approveEntry (2), rejectEntry (1), checkApproved (5), verifyBinaryHash (2) | app-registry.test.mjs | ✅ COVERED |
| DISC-03 (executionMode) | 2 tests: mock when null, headless from catalog | app-discovery.test.mjs | ✅ COVERED |
| DISC-04 (col -b preprocessing) | 4 tests: clean text, col -b succeeds, ENOENT fallback, bold decode | col-preprocess.test.mjs | ✅ COVERED |
| DISC-05 (Display probe) | 5 tests: macOS with/without WindowServer, Linux with/without DISPLAY, win32 always true | app-discovery.test.mjs | ✅ COVERED |
| DISC-06 (App catalog) | Smoke: file exists, contains bundle IDs for all 3 apps | references/app-integrations.md | ✅ COVERED |

---

## Wave 0 Requirements

- [x] `tests/phase-171/app-discovery.test.mjs` — 13 tests for DISC-01, DISC-03, DISC-05
- [x] `tests/phase-171/app-registry.test.mjs` — 14 tests for DISC-02
- [x] `tests/phase-171/col-preprocess.test.mjs` — 4 tests for DISC-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live binary discovery with real apps | DISC-01 | Requires actual Blender/GIMP/Inkscape installed | Run `node bin/pde-tools.cjs app discover` on machine with apps installed |
| Cross-platform testing | DISC-05 | Requires Linux/Windows machines | Run probeDisplay tests on each platform |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ validated 2026-03-29

---

## Validation Audit 2026-03-29

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 31 |
| Test files | 3 |
| Requirements covered | 6/6 |
| Runtime | 130ms |
