<purpose>
Generate audience-specific stakeholder presentations from the deterministic IR extraction pipeline. Reads structured IR from pde-tools (never raw .planning/ files), dispatches to persona-specific generation prompts, and writes dual HTML+Markdown output to .planning/presentations/.
</purpose>

<skill_code>PRS</skill_code>

<skill_domain>tooling</skill_domain>

<context_routing>

## Context Detection

Before beginning, load available context:

**Hard requirement (HALT if missing):**
- `.planning/PROJECT.md` — product description, target users, core value, and market context

**Soft dependencies (enriches output):**
- `.planning/presentations/` — output directory (created by IR pipeline if missing)

**Routing logic:**

```
IF PROJECT.md missing:
  HALT with error (hard requirement):
    Error: PROJECT.md not found at .planning/PROJECT.md
      /pde:present requires a project description.
      Run /pde:new-project first to initialize your project, then re-run /pde:present.

IF .planning/presentations/ missing:
  mkdir -p .planning/presentations/ (IR pipeline creates it; workflow may also ensure it)
```

</context_routing>

<process>

## /pde:present — Stakeholder Presentation Generation Pipeline

## Persona Registry

The following 15 personas are available. Use this table for LIST MODE and validation.

| Slug | Display Name | Audience | Description |
|------|--------------|----------|-------------|
| `executive-summary` | Executive Summary | Executives, sponsors | Progress, blockers, timeline confidence in one page |
| `investor-update` | Investor Update | Investors, board | Milestone velocity, technical moat, market positioning |
| `sprint-review` | Sprint Review | Development team | What shipped, demo screenshots, what's next |
| `client-deliverable` | Client Deliverable Report | Clients | Feature specs, acceptance criteria met, screenshots |
| `stakeholder-status` | Stakeholder Status Update | Project stakeholders | RAG status, decisions needed, risks |
| `product-manager` | Product Manager View | Product managers | Feature prioritization, requirement coverage, roadmap health |
| `project-manager` | Project Manager View | Project managers | Timeline tracking, dependency analysis, risk register |
| `case-study` | Case Study / Portfolio Piece | Prospective clients, recruiters | Problem, approach, outcome, lessons learned |
| `agile-report` | Agile Project Report | Agile coaches, retrospectives | Retro narrative with burndown and velocity metrics |
| `design-persona` | Design Persona Report | Design reviewers, design teams | Design decisions, system tokens, wireframe evolution |
| `research-persona` | Research Persona Report | Technical reviewers | Findings summary, tech evaluations, competitive landscape |
| `post-mortem` | Technical Post-Mortem | Engineering teams | What broke, root cause, prevention strategies |
| `adr-summary` | ADR Summary | Architects, technical leads | Context, options considered, decisions, consequences |
| `launch-announcement` | Launch Announcement | Public, press, community | What it is, who it's for, how to get started |
| `portfolio-overview` | Portfolio Overview | Hiring managers, clients | Cross-project patterns, skills demonstrated |

---

### Step 0/7: Initialize

Display banner:

```
PDE > PRESENT
```

Parse $ARGUMENTS:
- Extract the first non-flag token as PERSONA_SLUG (e.g., `executive-summary`)
- Detect flags: `--dry-run`, `--verbose`

---

### Step 1/7: Detect invocation mode

Inspect PERSONA_SLUG:

```
IF PERSONA_SLUG is empty (no argument provided):
  → LIST MODE: proceed to Step 2

IF PERSONA_SLUG matches one of the 15 known persona slugs in the registry above:
  → GENERATE MODE: proceed to Step 4

OTHERWISE:
  → ERROR MODE: proceed to Step 3
```

---

### Step 2/7: LIST MODE — Display persona registry

Display the full persona table from the Persona Registry section above.

Print a formatted table with columns: Slug, Display Name, Audience, Description.

Show usage hint:

```
Usage: /pde:present <persona-slug>
Example: /pde:present executive-summary
```

HALT — do not proceed to generation.

---

### Step 3/7: ERROR MODE — Invalid persona

Display a clear error using What/Why/What-to-do format:

```
Error: Unknown persona "$PERSONA_SLUG".
  /pde:present requires a valid persona slug.
  Valid personas:
    executive-summary, investor-update, sprint-review, client-deliverable,
    stakeholder-status, product-manager, project-manager, case-study,
    agile-report, design-persona, research-persona, post-mortem,
    adr-summary, launch-announcement, portfolio-overview
  Usage: /pde:present executive-summary
```

HALT — do not proceed to generation.

---

### Step 4/7: GENERATE MODE — Acquire IR

Run the pde-tools command to get the presentation IR:

```bash
IR=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation artifact-read)
if [[ "$IR" == @file:* ]]; then IR=$(cat "${IR#@file:}"); fi
```

Parse the IR JSON. If the command fails, returns empty output, or the JSON is invalid:

```
Error: Failed to acquire presentation IR.
  The pde-tools presentation artifact-read command did not return valid JSON.
  Ensure .planning/ directory exists and the project is initialized.
  Re-run /pde:present after resolving any extraction errors.
```

HALT on error.

If `--verbose` flag is set, display IR metadata:
```
IR acquired: schema_version={schema_version}, extracted_at={extracted_at}
```

---

### Step 5/7: GENERATE MODE — Set output paths

Compute output filenames:

```bash
DATE=$(date +%Y-%m-%d)
HTML_PATH=".planning/presentations/${PERSONA_SLUG}-${DATE}.html"
MD_PATH=".planning/presentations/${PERSONA_SLUG}-${DATE}.md"
mkdir -p .planning/presentations/
```

If `--dry-run` flag is set, display planned output and HALT:

```
Dry run mode. No files will be written.

Planned output:
  HTML: .planning/presentations/${PERSONA_SLUG}-${DATE}.html
  Markdown: .planning/presentations/${PERSONA_SLUG}-${DATE}.md

IR: schema_version={schema_version}, extracted_at={extracted_at}
Persona: ${PERSONA_SLUG} ({display_name})
```

---

### Step 6/7: GENERATE MODE — Dispatch to persona generator

This step is the generation stub. Phase 178 will replace this with actual rendering logic.

Log the persona being generated:

```
Generating presentation: {PERSONA_SLUG} ({display_name})
  IR metadata: schema_version={schema_version}, extracted_at={extracted_at}
  Output paths:
    HTML: {HTML_PATH}
    Markdown: {MD_PATH}
```

Look up the display name, audience, and description for PERSONA_SLUG from the Persona Registry table above.

Write a placeholder HTML file at HTML_PATH:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{display_name}</title>
</head>
<body>
  <h1>{display_name}</h1>
  <p><strong>Audience:</strong> {audience}</p>
  <p><strong>Description:</strong> {description}</p>
  <hr>
  <p><em>Generation stub — Phase 178 will implement the full rendering engine.</em></p>
  <p><strong>IR extracted at:</strong> {extracted_at}</p>
  <p><strong>Generated:</strong> {DATE}</p>
</body>
</html>
```

Write a placeholder Markdown file at MD_PATH:

```markdown
# {display_name}

**Audience:** {audience}
**Description:** {description}

---

*Generation stub — Phase 178 will implement the full rendering engine.*

**IR extracted at:** {extracted_at}
**Generated:** {DATE}
```

Log both output paths:

```
Output written:
  HTML: {HTML_PATH}
  Markdown: {MD_PATH}
```

---

### Step 7/7: Complete

Display completion banner:

```
PDE > PRESENT > DONE

Persona:  {display_name} ({PERSONA_SLUG})
HTML:     {HTML_PATH}
Markdown: {MD_PATH}
```

</process>
