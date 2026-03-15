# Phase 8: Onboarding & Distribution - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Make PDE publicly distributable with documentation that enables a naive user to succeed on their first session. Deliverables: README, Getting Started guide, install validation (manual + automated), and version bump to 1.0.0. No new features or capabilities — documentation and release readiness only.

</domain>

<decisions>
## Implementation Decisions

### Getting Started guide
- Format: walk-through tutorial + command cheat sheet at the end
- Scope: full end-to-end lifecycle — install through discuss → plan → execute → verify and beyond
- Sample project: offer 2-3 project ideas (user picks one, or brings their own idea)
- Location: GETTING-STARTED.md at repo root, linked from README
- Structure: numbered sections per stage (1. Install, 2. Create Project, 3. Discuss, 4. Plan, 5. Execute, 6. Verify)
- Philosophy: brief philosophy section upfront (2-3 paragraphs on the workflow loop) AND contextual explanations woven into each stage
- Terminal output examples shown as code blocks — no screenshots
- Show key .planning/ file snippets at milestones (PROJECT.md after new-project, PLAN.md after plan-phase, etc.)
- Cheat sheet: all commands grouped by workflow stage (setup, planning, execution, maintenance)
- Short prerequisites section upfront (Claude Code, active subscription, git)
- Explain /clear between stages — why and when to use it for fresh context
- Brief "What's Next" section at the end: milestones, adding phases, auto-advance (--auto), /pde:settings, /pde:set-profile
- /pde:quick mentioned in cheat sheet only, not in tutorial
- No troubleshooting section — point to GitHub issues
- No time estimates
- No mention of GSD — PDE stands on its own
- Tone: professional but approachable (Stripe/Vercel docs style)

### README
- Purpose: sell the value + link to guide (GitHub landing page that convinces people to try it)
- ASCII or Mermaid workflow diagram showing discuss → plan → execute → verify loop
- Short bullet list of 6-8 key capabilities (scannable, one-liner each)
- 2-3 sentence "How it works" summary + link to GETTING-STARTED.md
- Version badge showing 1.0.0
- No GSD references

### Install validation
- Dual approach: manual checklist + lightweight automated validation script
- Success bar: plugin installs, /pde: commands visible in palette, /pde:help runs and returns expected output
- Test environment: ask a friend/collaborator to install from GitHub URL and report back
- Validation script: grep for hardcoded usernames (belt-and-suspenders on top of Phase 7's BRAND-03 verification)
- Manual checklist documents the full verification flow

### Version bump & release
- Bump 0.1.0 → 1.0.0 when PDE is feature-complete (all Phase 8 deliverables done)
- Files to update: VERSION, plugin.json, README (version badge/mention)
- Git tag v1.0.0 — no full GitHub Release with notes for now
- Manual push after review — user reviews the commit before pushing to make the release public

### Claude's Discretion
- Exact sample project suggestions (2-3 ideas that demonstrate PDE well)
- Mermaid vs ASCII for the workflow diagram
- Exact feature bullet points in README
- Validation script implementation details
- README section ordering

</decisions>

<specifics>
## Specific Ideas

- Tone reference: Stripe docs and Vercel docs — professional but approachable, no jargon
- Guide should show what .planning/ files look like after each milestone stage so users can verify they're on track
- Cheat sheet groups commands by when you'd use them, not alphabetically
- Version bump is the "final act" — signals readiness

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- VERSION file at repo root: currently "0.1.0" — single source of truth for version
- .claude-plugin/plugin.json: mirrors version, has metadata (name, description, author, homepage, license, keywords)
- 34 /pde: commands registered in commands/ directory
- workflows/ directory with 34 workflow files
- /pde:help command already generates command listing — cheat sheet can reference its output

### Established Patterns
- Plugin structure: .claude-plugin/plugin.json for manifest, commands/ for slash commands, workflows/ for implementations
- Git-based install: `claude plugin install` pointing to GitHub repo (https://github.com/Grey-Altr/pde.git)
- No README.md exists yet — confirmed in Phase 7

### Integration Points
- GitHub repo: https://github.com/Grey-Altr/pde.git — where users install from
- VERSION file read by plugin.json — both need synchronized update
- GETTING-STARTED.md linked from README.md — cross-reference between the two docs

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-onboarding-distribution*
*Context gathered: 2026-03-14*
