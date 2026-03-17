---
phase: 29
slug: quality-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert + bash verification scripts |
| **Config file** | none — Phase 29 is reference file authoring + config registration |
| **Quick run command** | `node bin/pde-tools.cjs validate-phase 29` |
| **Full suite command** | `bash .planning/phases/29-quality-infrastructure/verify.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node bin/pde-tools.cjs validate-phase 29`
- **After every plan wave:** Run full verification script
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | QUAL-01 | file-exists + content | `grep "Design.*40%" references/quality-standards.md` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | QUAL-02 | file-exists + content | `grep "easing" references/motion-design.md` | ❌ W0 | ⬜ pending |
| 29-01-03 | 01 | 1 | QUAL-03 | file-exists + content | `grep "APCA" references/composition-typography.md` | ❌ W0 | ⬜ pending |
| 29-02-01 | 02 | 1 | QUAL-04 | file-exists + json-valid | `node -e "JSON.parse(require('fs').readFileSync('protected-files.json'))"` | ❌ W0 | ⬜ pending |
| 29-02-02 | 02 | 1 | QUAL-05 | grep | `grep "pde-output-quality-auditor" bin/lib/model-profiles.cjs` | ❌ W0 | ⬜ pending |
| 29-02-03 | 02 | 1 | QUAL-06 | grep | `grep "AUD" skill-registry.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `references/quality-standards.md` — Awwwards rubric reference (QUAL-01)
- [ ] `references/motion-design.md` — Motion design patterns (QUAL-02)
- [ ] `references/composition-typography.md` — Composition and type guidance (QUAL-03)

*These ARE the deliverables — Phase 29 is primarily reference file creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quality rubric covers all 4 Awwwards dimensions with measurable criteria | QUAL-01 | Content quality requires human judgment | Read quality-standards.md, verify each dimension has criteria at score levels 1-10 |
| Motion design patterns are copy-paste-ready for LLM consumption | QUAL-02 | LLM usability requires human assessment | Verify code examples are complete, not truncated, with CDN URLs |
| Protected-files list is complete and includes all critical paths | QUAL-04 | Completeness requires domain knowledge | Review list against known critical files in bin/, references/, workflows/ |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
