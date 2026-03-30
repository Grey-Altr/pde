# jscpd Duplication Report Triage — Phase 189

**Date:** 2026-03-30
**jscpd version:** 4.0.8 (via npx)
**Config:** `.jscpd.json` (project root)
**Command:** `npx jscpd`

## Summary

| Metric | Value |
|--------|-------|
| Files analyzed | 168 (139 JS, 26 TS, 2 TSX, 1 Python) |
| Total lines | 27,740 |
| Clones found | 5 |
| Duplicated lines | 131 (0.47%) |
| Duplicated tokens | 1,353 (0.61%) |

**Assessment:** Very low duplication rate at 0.47%. Only 5 clone blocks in the entire codebase. The metric CLI files share expected boilerplate patterns (MCP bridge initialization).

## Triage Table

| Clone | File A | File B | Lines | Classification | Reason |
|-------|--------|--------|-------|---------------|--------|
| 1 | `bin/lib/commands.cjs:46-63` | `bin/lib/init.cjs:352-364` | 18 | accept | Both files iterate pending todos directory using the same directory-walk pattern. This is idiomatic Node.js directory traversal boilerplate; extracting to a shared util would add complexity without clear benefit at this size. |
| 2 | `bin/lib/commands.cjs:549-580` | `bin/lib/commands.cjs:394-425` | 32 | refactor-candidate | Two blocks within the same file that both iterate phase/plan structures with similar counting patterns. Same-file duplication with 32 lines is worth extracting to a local helper. Defer to a future cleanup task. |
| 3 | `bin/contrast-metric.cjs:20-50` | `bin/dom-metric.cjs:18-48` | 31 | accept | Both metric CLI files begin with identical MCP bridge initialization boilerplate (`createRequire`, `req(mcp-bridge.cjs)`, `req(metric-runner.cjs)`). This is shared CLI entry-point scaffold — expected structural similarity between metric scripts. |
| 4 | `bin/contrast-metric.cjs:188-211` | `bin/dom-metric.cjs:151-174` | 24 | accept | Both metric files contain a similar result-reporting block (format metrics, write output, report status). Metric scripts have a shared output contract; this similarity is intentional and expected. |
| 5 | `bin/a11y-metric.cjs:22-52` | `bin/dom-metric.cjs:18-48` | 31 | accept | Same MCP bridge initialization boilerplate as Clone 3 — `a11y-metric.cjs` and `dom-metric.cjs` share identical CLI scaffold. All three metric files (a11y, contrast, dom) share this initialization pattern by design. |

## Notes

- **Metric CLI boilerplate (Clones 3, 4, 5):** The three metric CLI files (`a11y-metric.cjs`, `contrast-metric.cjs`, `dom-metric.cjs`) share initialization and result-reporting structure. This is intentional — each metric is a standalone CLI script with the same entry-point contract. Extracting the boilerplate to a shared init module could be done (refactor-candidate) but is low priority given it's only 3 files and the pattern is clear.
- **Clone 2 (same-file duplication):** The only refactor-candidate is within `bin/lib/commands.cjs` itself — two phase/plan iteration blocks that could share a local helper function. This is the highest-priority finding but still low urgency given the 0.47% overall rate.
- **No architectural duplication:** There are no cross-module API duplications, no duplicated business logic, no copy-pasted service layers. The duplication is limited to CLI script boilerplate and local iteration patterns.
