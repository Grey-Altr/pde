---
phase: 158
slug: mcp-apps-rich-ui-design-artifact-preview
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 158 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x / vitest |
| **Config file** | TBD — Wave 0 installs if needed |
| **Quick run command** | `npm test -- --grep "mcp-apps"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --grep "mcp-apps"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 158-01-01 | 01 | 1 | RUI-01 | unit | `npm test -- --grep "rich-response"` | ❌ W0 | ⬜ pending |
| 158-01-02 | 01 | 1 | RUI-02 | unit | `npm test -- --grep "text-fallback"` | ❌ W0 | ⬜ pending |
| 158-02-01 | 02 | 2 | RUI-03 | unit | `npm test -- --grep "resource-uri"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for RUI-01 (rich HTML tool responses)
- [ ] Test stubs for RUI-02 (plain text fallback)
- [ ] Test stubs for RUI-03 (resource URI scheme)
- [ ] Shared test fixtures for MCP server mock

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HTML panel renders in MCP Apps client | RUI-01 | Requires MCP Apps-capable AI chat client | Open Claude desktop, invoke PDE tool, verify HTML panel appears |
| CSP callback works without errors | RUI-01 | Browser CSP enforcement is runtime-only | Trigger tool with connectDomains, verify no console CSP errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
