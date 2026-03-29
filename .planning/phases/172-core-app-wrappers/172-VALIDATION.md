---
phase: 172
slug: core-app-wrappers
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-29
updated: 2026-03-29
---

# Phase 172 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run tests/phase-172/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~200ms |
| **Test files** | 5 |
| **Total assertions** | 78 |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/phase-172/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test File | Test Count | Status |
|---------|------|------|-------------|-----------|------------|--------|
| 172-01-T1 | 01 | 1 | WRAP-05 | server-gen-async.test.mjs | 10 | ✅ green |
| 172-01-T1 | 01 | 1 | WRAP-04 | skill-gen-integration.test.mjs | 9 (scaffolds) | ✅ green |
| 172-01-T2 | 01 | 1 | WRAP-04 | (index.cjs + generate.cjs node -e verify) | — | ✅ green |
| 172-02-T1 | 02 | 2 | WRAP-01, WRAP-06 | blender-wrapper.test.mjs | 17 | ✅ green |
| 172-02-T2 | 02 | 2 | WRAP-03, WRAP-06 | inkscape-wrapper.test.mjs | 18 | ✅ green |
| 172-03-T1 | 03 | 2 | WRAP-02, WRAP-06 | gimp-wrapper.test.mjs | 25 | ✅ green |
| 172-03-T2 | 03 | 2 | WRAP-04, WRAP-05 | skill-gen-integration.test.mjs | 9 | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement Coverage Matrix

| Requirement | Description | Test Files | Key Assertions | Status |
|-------------|-------------|------------|----------------|--------|
| WRAP-01 | Blender CLI wrapper, --background, version-aware, async | blender-wrapper.test.mjs | buildCapabilityModel, render/python-exec/export caps, startupMs=5000, asyncRequired=true, parseMajorVersion | ✅ COVERED |
| WRAP-02 | GIMP wrapper, Script-Fu 2.x vs 3.x | gimp-wrapper.test.mjs | buildCapabilityModel 2.x/3.x, buildGimpArgs, getScriptFuTemplates, --quit vs gimp-quit, file-load args, gimp-file-export vs file-png-save | ✅ COVERED |
| WRAP-03 | Inkscape CLI wrapper, --export-type | inkscape-wrapper.test.mjs | buildCapabilityModel, inkscape_export cap, --export-overwrite, no deprecated flags (--without-gui, --batch-process) | ✅ COVERED |
| WRAP-04 | SKILL.md auto-generation | skill-gen-integration.test.mjs | generateSkillMd output, path replacement cli-anything→app-wrappers, tools section present | ✅ COVERED |
| WRAP-05 | JSON structured output (asyncMode) | server-gen-async.test.mjs | generateServerSource with asyncMode=true uses spawn, Promise wrapper, backward compat with spawnSync | ✅ COVERED |
| WRAP-06 | Version-aware capability models | blender/gimp/inkscape tests | parseMajorVersion across all 3 apps, validateCapabilityModel passes, version in meta | ✅ COVERED |

---

## Wave 0 Requirements

- [x] `tests/phase-172/blender-wrapper.test.mjs` — covers WRAP-01, WRAP-06 (17 tests)
- [x] `tests/phase-172/gimp-wrapper.test.mjs` — covers WRAP-02, WRAP-06 (25 tests)
- [x] `tests/phase-172/inkscape-wrapper.test.mjs` — covers WRAP-03, WRAP-06 (18 tests)
- [x] `tests/phase-172/skill-gen-integration.test.mjs` — covers WRAP-04 (9 tests)
- [x] `tests/phase-172/server-gen-async.test.mjs` — covers WRAP-05 (10 tests)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Display server missing detected at probe time | WRAP-06 | Requires actual display-less environment | Run `pde-tools app wrap blender` on headless server; verify capability degradation in tool map |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-03-29

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests | 78 |
| Test files | 5 |
| Requirements covered | 6/6 |
