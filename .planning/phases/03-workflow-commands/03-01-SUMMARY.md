---
phase: 03-workflow-commands
plan: 01
subsystem: workflows
tags: [workflows, lib-ui, references, templates, CLAUDE_PLUGIN_ROOT, portability]

# Dependency graph
requires:
  - phase: 02-tooling-binary-rebrand
    provides: bin/pde-tools.cjs and lib modules that workflows call
provides:
  - workflows/ (34 files) with all hardcoded paths replaced by CLAUDE_PLUGIN_ROOT
  - lib/ui/ (5 files) for workflow banner/display rendering
  - references/ (33 files) for workflow context and agent instructions
  - templates/ (52 files) for project and planning artifacts
affects: [03-02-command-stubs, 04-agents-rebrand, 05-templates-rebrand]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All tool calls in workflow files use ${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs"
    - "All render.cjs calls use ${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs"
    - "All @ file references use ${CLAUDE_PLUGIN_ROOT}/ prefix"
    - "splash.cjs VERSION path uses CLAUDE_PLUGIN_ROOT with HOME fallback for graceful degradation"

key-files:
  created:
    - lib/ui/colors.cjs
    - lib/ui/components.cjs
    - lib/ui/layout.cjs
    - lib/ui/render.cjs
    - lib/ui/splash.cjs
    - workflows/ (34 workflow files)
    - references/ (33 reference files)
    - templates/ (52 template files)
  modified: []

key-decisions:
  - "update.md runtime $HOME/$dir/pde/ patterns retained — these are dynamic discovery across AI editor runtimes (.claude, .config/opencode, .opencode, .gemini), not hardcoded absolute paths"
  - "splash.cjs VERSION path uses CLAUDE_PLUGIN_ROOT with HOME/.claude/pde as fallback — graceful degradation pattern, not hardcoded path"
  - "lib/ui, references, templates also needed path fixups despite plan saying they did not — grep confirmed hardcoded paths in render.cjs, splash.cjs, references/git-integration.md, references/ui-brand.md, templates/codebase/structure.md"

patterns-established:
  - "Path portability pattern: ${CLAUDE_PLUGIN_ROOT}/ prefix for all plugin-internal @-references and bash tool calls"
  - "Runtime discovery pattern: $HOME/$dir/pde/ loop over multiple AI editor directories (update.md) is correct and portable"

requirements-completed: [CMD-01, CMD-02, CMD-03, CMD-04, CMD-05, CMD-06, CMD-07, CMD-08, CMD-09, CMD-10, CMD-11, CMD-12, CMD-13]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 03 Plan 01: Workflow Commands - Copy and Portabilize Content Summary

**34 workflow files, 5 lib/ui modules, 33 references, and 52 templates copied from PDE reference and fully ported to use ${CLAUDE_PLUGIN_ROOT} instead of hardcoded absolute paths**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T02:35:34Z
- **Completed:** 2026-03-15T02:37:57Z
- **Tasks:** 2
- **Files modified:** 134 files (5 lib/ui + 34 workflows + 33 references + 52 templates + 10 template subdirectory files)

## Accomplishments

- lib/ui/ (5 .cjs files) copied and path-fixed — provides UI rendering for workflow banners and displays
- workflows/ (34 .md files) copied and all hardcoded paths replaced with ${CLAUDE_PLUGIN_ROOT}
- references/ (33 files) and templates/ (52 files) copied and path-fixed
- Zero user-specific absolute paths remain in any workflow, reference, or template file

## Task Commits

Each task was committed atomically:

1. **Task 1: Copy lib/ui, references, and templates** - `6770589` (feat)
2. **Task 2: Copy workflows and fix hardcoded paths** - `46e3e2d` (feat)

## Files Created/Modified

- `lib/ui/colors.cjs` - Terminal color utilities for workflow output
- `lib/ui/components.cjs` - Reusable UI components (badges, tables, etc.)
- `lib/ui/layout.cjs` - Layout helpers for structured output
- `lib/ui/render.cjs` - Main render entry point for workflow banners
- `lib/ui/splash.cjs` - Splash screen; VERSION path now uses CLAUDE_PLUGIN_ROOT with fallback
- `workflows/*.md` (34 files) - All workflow logic with portable CLAUDE_PLUGIN_ROOT paths
- `references/*.md` (33 files) - All reference documentation with portable paths
- `templates/*.md` (52 files) - All templates with portable paths

## Decisions Made

- **update.md runtime patterns retained:** The `$HOME/$dir/pde/` patterns in update.md are runtime dynamic detection code iterating over multiple AI editor directories (`.claude`, `.config/opencode`, `.opencode`, `.gemini`). These are NOT hardcoded to any user's path — they're portable cross-runtime discovery patterns that should remain as-is.
- **splash.cjs VERSION fallback:** splash.cjs now uses `process.env.CLAUDE_PLUGIN_ROOT || path.join(process.env.HOME, '.claude', 'pde')` — primary path uses the runtime variable, HOME path serves as graceful degradation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Applied path fixups to lib/ui, references, templates**
- **Found during:** Task 1 (Copy lib/ui, references, and templates)
- **Issue:** Plan stated these files "do NOT need path fixups" but grep found hardcoded paths in render.cjs (prose mention), splash.cjs (programmatic path), references/git-integration.md, references/ui-brand.md, references/techniques/index.md, templates/codebase/structure.md
- **Fix:** Applied same sed substitution patterns to lib/ui, references, and templates as applied to workflows; additionally fixed render.cjs prose mention, splash.cjs to use CLAUDE_PLUGIN_ROOT env var, and manually fixed technique index and structure template
- **Files modified:** lib/ui/splash.cjs, lib/ui/render.cjs, references/git-integration.md, references/ui-brand.md, references/techniques/index.md, references/tooling-patterns.md, templates/codebase/structure.md
- **Verification:** grep -rn "greyaltaer|\.claude/pde|HOME.*pde" lib/ui/ references/ templates/ returns only the acceptable splash.cjs fallback
- **Committed in:** 6770589 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical path fixup)
**Impact on plan:** Auto-fix was necessary for portability correctness. No scope creep.

## Issues Encountered

- Plan stated lib/ui/references/templates don't need path fixups — grep contradicted this. Applied fixes proactively. All 4 files contained various hardcoded path formats that were cleaned up.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All workflow content is in place with portable paths
- Plan 02 (command stubs) can now delegate to workflows/ using CLAUDE_PLUGIN_ROOT
- The CLAUDE_PLUGIN_ROOT concern from STATE.md (whether it's available in bash blocks in .md files) remains a Phase 3 validation concern — Plan 02 testing will confirm

---
*Phase: 03-workflow-commands*
*Completed: 2026-03-15*
