# Skill Style Guide Reference Library

> Output conventions and consistency standards for all PDE skills.
> Defines what users see: flag naming, output formatting, error messaging, terminal presentation.
> Loaded via `@` reference from skills during output generation and by `/pde:test` for lint validation.
>
> **Version:** 1.0
> **Scope:** Output conventions for all PDE skills
> **Ownership:** Shared (all skills)
> **Boundary:** This file owns what users see (output formatting, flags, errors, help text). Internal implementation patterns live in individual skill files. Lint validation rules are defined here but executed by `/pde:test`. MCP integration patterns live in `mcp-integration.md`.

---

<!-- TIER: essentials -->

## Flag Naming Conventions

All PDE skills support a standard set of flags. Skills MAY add skill-specific flags beyond these.

### Universal Flags (Required on Every Skill)

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Show what the skill WOULD do without executing. Output: planned files, estimated token usage, MCP dependencies, prerequisites check |
| `--quick` | Boolean | Skip non-essential enhancements for faster execution. Skill-specific: each skill defines what "quick" means (e.g., fewer breakpoints, skip interactions, skip MCP validation) |
| `--verbose` | Boolean | Show detailed progress, MCP probe results, timing per step, reference loading details |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode using training knowledge and local files only |
| `--no-{name}` | Boolean | Skip a specific MCP. See mcp-integration.md for supported names |

### Flag Naming Rules

| Rule | Pattern | Example |
|------|---------|---------|
| Case | `--kebab-case` | `--dry-run`, not `--dryRun` or `--dry_run` |
| Boolean flags | No value needed | `--verbose`, not `--verbose=true` |
| Value flags | Use `=` separator | `--format=json`, not `--format json` |
| Negation | `--no-` prefix | `--no-mcp`, not `--disable-mcp` |
| Abbreviations | Avoid. Spell out | `--verbose`, not `-v` |

### Per-Item Filtering

Skills that produce multiple outputs support comma-separated filtering:

```
/pde:wireframe "login, dashboard, settings"
/pde:mockup "login, dashboard"
/pde:critique "login"
/pde:test "wireframe,system,critique"
```

- Comma-separated, optional spaces after commas
- Items are skill-specific (screen names, skill codes, etc.)
- No filtering = process all items

### Skill-Specific Flags

Skills may add their own flags. When doing so:
- Follow kebab-case naming
- Document in skill's `<process>` section
- Register in help text (see Help Text Standards below)
- Examples: `--push-figma` (system), `--stubs` (handoff), `--fix` (setup), `--ci` (test), `--e2e` (test), `--watch` (test)

## Output Formatting Standards

Every skill MUST produce consistent, readable output following these conventions.

### Standard Output Summary Table

Every skill MUST end with this summary table:

```
## Summary

| Property | Value |
|----------|-------|
| Files created | {path1} ({type}, {size}), {path2} ({type}, {size}) |
| Files modified | {path1}, {path2} |
| Next suggested skill | /pde:{next_skill} |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {MCP1}, {MCP2} (or "none") |
```

**Rules:**
- File paths are always absolute
- File types: HTML, CSS, JSON, Markdown, SVG
- Size in human-readable format (1.2KB, 45KB)
- Next suggested skill based on pipeline position and what exists
- Token estimate is rough (order of magnitude)
- MCP enhancements list only MCPs actually used in this run (not attempted-and-failed)

### Section Headers

```
## Major Section Title
### Subsection Title
#### Detail Point
```

- Use bold markdown `##` format
- Title case for section names
- No emoji in headers
- Clear, descriptive names (not clever or abbreviated)

### Progress Indicators

Text-based progress for multi-step operations:

```
Step 1/7: Detecting product type...
Step 2/7: Loading design tokens...
Step 3/7: Generating color palette...
  -> Primary: oklch(0.65 0.22 250) (#3B82F6)
  -> Generated 11-step scale (50-950)
Step 4/7: Building typography scale...
```

**Rules:**
- Format: `Step N/M: Description...`
- Indent sub-progress with `  -> `
- Show meaningful intermediate results
- Do NOT use spinner characters or animation
- Do NOT use emoji as progress markers

### Success and Failure Indicators

```
# Success:
Created wireframe: /absolute/path/to/wireframe-login.html (12.4KB)

# Warning:
Warning: Design system not found. Using default tokens. Run /pde:system first for branded output.

# Error:
Error: Cannot create mockup -- no wireframe found for "login" screen.
  Run /pde:wireframe first, then retry /pde:mockup.
```

**Rules:**
- Success: State what was created with path and size
- Warning: State what's sub-optimal and how to fix
- Error: State what failed, why, and what to do (see Error Messaging Standards)

### File Path Display

- Always absolute paths
- Underlined in terminal-capable environments
- Quoted if path contains spaces
- Group related files:

```
Created 3 files:
  /Users/name/project/ux/wireframes/wireframe-login.html (8.2KB)
  /Users/name/project/ux/wireframes/wireframe-dashboard.html (14.1KB)
  /Users/name/project/ux/wireframes/index.html (3.4KB)
```

## Error Messaging Standards

All PDE skills follow the same error message structure.

### Error Structure

Every error message has three parts:

```
Error: {What failed}
  {Why it failed}
  {What to do about it}
```

### Standard Error Patterns

**Missing input (no argument provided):**

```
Error: No product description provided.
  /pde:brief needs a product description to generate a design brief.
  Usage: /pde:brief "A mobile app for tracking daily habits"
```

**MCP unavailable (used in degraded output tag, not as error):**

```
[Manual accessibility review -- install a11y MCP for automated WCAG scanning]
```

Note: MCP unavailability is NOT an error. Skills always work without MCPs.

**DESIGN-STATE not found:**

```
Warning: No DESIGN-STATE found in {output_root}.
  This is normal for a new project. A DESIGN-STATE will be created when you run your first skill.
  Recommended: start with /pde:brief to establish project context.
```

**Missing prerequisite artifact:**

```
Warning: No design brief found.
  /pde:flows produces richer output when a brief exists.
  Run /pde:brief first for better results, or continue without it.
```

This is the standard prerequisite check pattern. Key principles:
- Always a WARNING, never an ERROR (skills work without prerequisites)
- Name the missing artifact and which skill creates it
- Offer to continue: "or continue without it"
- Only mention the immediate prerequisite, not the full pipeline

**Invalid flag or argument:**

```
Error: Unknown flag "--verboze".
  Did you mean --verbose?
  Run /pde:help {skill} for available flags.
```

**File write failure:**

```
Error: Cannot write to /path/to/output/file.html
  Permission denied or directory does not exist.
  Check that {output_root} is writable. Current output root: /path/to/output/
```

### Error Severity Levels

| Level | When | User Action |
|-------|------|-------------|
| Error | Skill cannot produce output | Must fix before retrying |
| Warning | Skill can continue but output is degraded | Fix for better results, or accept |
| Info | Helpful context | No action needed |

---

<!-- TIER: standard -->

## Terminal Accessibility

PDE output is consumed in terminal environments. All output MUST be accessible.

### Text-First Indicators

```
# Good: meaningful text with optional visual enhancement
Step 3/7: Generating color palette... done
Warning: No design brief found. Run /pde:brief first.
Error: File write failed. Check permissions.

# Bad: emoji-only or visual-only indicators
[checkmark emoji] Color palette
[warning emoji]
[x emoji]
```

**Rules:**
- NEVER use emoji as the sole indicator of status
- ALWAYS include meaningful text alongside any visual marker
- Progress, success, warning, error MUST be conveyed in text
- Screen reader users must get full information from text alone

### Section Boundaries

```
---

## New Section Title

Content here...

---
```

- Use horizontal rules (`---`) between major sections
- Use blank lines generously for visual separation
- Indent nested content consistently (2 spaces)

### Semantic Terminal Formatting

When terminal supports it, use semantic colors:

| Semantic | Color | Usage |
|----------|-------|-------|
| Success | Green | "Created file", "All tests passed" |
| Warning | Yellow | "Missing prerequisite", "Degraded output" |
| Error | Red | "Cannot write file", "Invalid input" |
| Info | Blue | "Probing MCPs...", "Loading references..." |
| File path | Underlined | All file paths |
| Header | Bold | Section headers, skill name |

**Rules:**
- Colors are enhancement, not information carrier
- Same text must be meaningful without color
- Do not combine multiple colors on same text
- Keep colored text short (one line, not paragraphs)

## Help Text Standards

Every skill supports `/pde:help {skill}` for detailed information.

### Per-Skill Help Format

```
## /pde:{command} -- {short description}

{One-paragraph description of what the skill does, when to use it, and what it produces.}

### Usage

  /pde:{command} [{arguments}] [flags]

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| {name} | Yes/No | {description} |

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| --dry-run | off | Show planned output without executing |
| --quick | off | {skill-specific quick behavior} |
| --verbose | off | Show detailed progress and MCP probe results |
| --no-mcp | off | Skip all MCP enhancements |
| {skill-specific flags} | | |

### Examples

  /pde:{command} "input text"
  /pde:{command} "input" --quick
  /pde:{command} "item1, item2" --verbose

### MCP Dependencies

| MCP | Enhancement | Required |
|-----|-------------|----------|
| {name} | {what it adds} | No (enhances output) |

### Prerequisites

| Artifact | Created By | Required |
|----------|-----------|----------|
| {name} | /pde:{skill} | Recommended (not required) |

### Output

| File | Location | Description |
|------|----------|-------------|
| {filename} | {path pattern} | {what it contains} |
```

### Help Text Principles

- Description is user-facing (what does this do for me?), not technical
- Examples use realistic inputs, not "foo" or "test"
- MCP dependencies all say "No (enhances output)" -- none are required
- Prerequisites say "Recommended" not "Required" (soft dependencies)
- Output section shows file patterns with {placeholders} for dynamic parts

## MCP Source Tags

Source tags indicate which MCPs contributed to output sections.

### Tag Placement Rules

1. Tags appear at the END of the section they annotate
2. Tags are inline (not in a separate "MCP Status" section)
3. One tag per MCP contribution per section
4. Tags use consistent square bracket format

### Tag Formats

**MCP was used:**
```
[Enhanced by {MCP_NAME} MCP]
[Enhanced by {MCP_NAME} MCP -- {specific detail}]
[Validated by {MCP_NAME} MCP]
[{Specific action} via {MCP_NAME} MCP]
```

**MCP was unavailable:**
```
[Manual check -- install {MCP_NAME} MCP for {specific benefit}]
```

**All MCPs disabled:**
```
[Baseline mode -- MCPs disabled via --no-mcp]
```

### Tag Examples in Context

```markdown
## Color Tokens

### Primary Palette
- Primary 500: oklch(0.65 0.22 250)
- Primary 400: oklch(0.72 0.19 250)
...

[Enhanced by Figma MCP -- tokens imported from Figma file "Brand System v3"]

## Accessibility Audit

### WCAG 2.2 Level AA Compliance
- 2.5.8 Target Size: All touch targets meet 24x24 CSS pixel minimum
- 1.4.3 Contrast: All text meets 4.5:1 ratio (large text 3:1)
...

[Enhanced by Axe MCP -- automated WCAG 2.2 scan]
```

### Multiple MCPs in One Skill Run

When multiple MCPs contribute to a single skill's output, each enhanced section gets its own tag. The summary table lists all MCPs used:

```
| MCP enhancements | Figma MCP, Axe MCP, Playwright MCP |
```

---

<!-- TIER: comprehensive -->

## Deprecation Warnings

When flag names or behaviors change between versions, provide soft migration.

### Deprecation Format

```
Warning: --old-flag is deprecated, use --new-flag instead.
  --old-flag will be removed in v{version}.
  Your command has been executed using --new-flag.
```

### Deprecation Rules

- Old flag names continue to work (never break existing usage)
- Show deprecation warning on first use per session
- Do NOT show deprecation warning when using the new flag
- Provide version number when old flag will be removed
- Execute the command as if the new flag was used
- Document deprecated flags in help text with `(deprecated)` label:

```
| --old-flag | off | (deprecated) Use --new-flag instead |
```

### Soft Migration Principles

- Never break existing muscle memory
- Warn once, then execute normally
- Give users time to migrate (at least one minor version)
- Remove deprecated flags only in major version bumps
- Keep a deprecation changelog in `/pde:update` release notes

## Output Ordering Convention

When a skill produces multiple types of content, follow this order:

1. **Header:** Skill name, input summary, mode indicators
2. **Prerequisites check:** What was found, what's missing (warnings)
3. **Progress:** Step-by-step execution with intermediate results
4. **Primary output:** The main deliverable (files created, analysis results)
5. **MCP enhancements:** Additional findings from MCPs (tagged)
6. **Recommendations:** Next steps, related skills, improvement suggestions
7. **Summary table:** Standard summary (see Output Formatting Standards)

### Ordering Rationale

- Prerequisites first so user can abort early if important context is missing
- Primary output before MCP enhancements because skill works without MCPs
- Recommendations after output so user knows what they have before deciding next steps
- Summary always last as a consistent end-of-skill landmark

## Skill Output Versioning

When skill output format changes, note the version:

```
<!-- PDE Output: /pde:wireframe v1.0 | 2026-03-11 -->
```

- Embed in HTML output as comment
- Embed in Markdown output as comment
- Version tracks output FORMAT, not skill code version
- Useful for `/pde:test` golden output comparison

## Internationalization Considerations

PDE v1.0 is English-only, but output conventions are designed for future i18n:

- Error messages use complete sentences (not string concatenation)
- No hardcoded English in format strings (use template patterns)
- Date/time in ISO 8601 format throughout
- Number formatting avoids locale-dependent separators (use plain digits)
- File paths use forward slashes consistently

## Consistency Checklist for Skill Authors

When creating or updating a skill, verify output compliance:

- [ ] All universal flags supported (--dry-run, --quick, --verbose, --no-mcp)
- [ ] Standard output summary table at end of every run
- [ ] Error messages follow What/Why/What-to-do structure
- [ ] Prerequisite warnings use standard pattern ("Missing X -- run /pde:Y first for better results")
- [ ] File paths are absolute
- [ ] Progress uses "Step N/M: Description" format
- [ ] No emoji-only indicators
- [ ] MCP source tags placed at end of enhanced sections
- [ ] Help text follows standard format
- [ ] Deprecated flags show warning but still work
- [ ] --dry-run produces meaningful preview without executing

---

*Version: 1.0.0*
*Last updated: 2026-03-11*
*Loaded by: all skills via @ reference for output conventions; /pde:test for lint validation*
