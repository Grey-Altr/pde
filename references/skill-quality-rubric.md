# Skill Quality Rubric

> Evaluation rubric for PDE skill files. Adapts the Awwwards 4-dimension framework for skill quality assessment (not visual design quality).
>
> **Version:** 1.0
> **Scope:** Skill file quality evaluation — adapted Awwwards 4-dimension scoring
> **Ownership:** pde-design-quality-evaluator (Phase 31)
> **Boundary:** This file covers skill file structural and content quality only. Visual design quality is in quality-standards.md. Lint rule validation is in tooling-patterns.md.

---

## Dimensions

### Design (40% weight)

Structural quality of the skill file itself.

| Score | Criteria |
|-------|----------|
| 1-3 | Missing required XML sections; no step numbering; frontmatter invalid |
| 4-6 | All 7 anatomy sections present but sparse; step numbering inconsistent; some flags missing |
| 7-8 | Complete 7-step anatomy; all 4 universal flags (--dry-run, --quick, --verbose, --no-mcp); proper XML nesting; step labels match "Step N/7:" format |
| 9-10 | Exemplary structure matching elevated skills; context_routing handles all input modes; process steps have clear preconditions and postconditions |

### Usability (30% weight)

Developer experience when using the skill.

| Score | Criteria |
|-------|----------|
| 1-3 | No flag documentation; error messages absent; no prerequisite checks |
| 4-6 | Flags table present but incomplete; some prerequisite checks; generic error messages |
| 7-8 | All flags documented with Type and Behavior; Step 2 checks prerequisites with soft/hard dependency distinction; error messages name the missing item |
| 9-10 | Flag descriptions include examples; prerequisite errors suggest fix commands; edge cases handled (empty input, missing files, partial state) |

### Creativity (20% weight)

Domain sophistication beyond a naive implementation.

| Score | Criteria |
|-------|----------|
| 1-3 | Skill is a thin wrapper with no domain logic; no MCP integration |
| 4-6 | Basic domain logic in Step 4; MCP probe exists but unused in enrichment |
| 7-8 | Step 3 probes relevant MCPs; Step 5 uses MCP results for meaningful enrichment; domain-specific heuristics in core generation |
| 9-10 | Novel domain patterns; multiple enrichment strategies per MCP availability; context_routing adapts generation to input state |

### Content (10% weight)

Reference quality and purpose precision.

| Score | Criteria |
|-------|----------|
| 1-3 | No required_reading; purpose is vague or missing |
| 4-6 | required_reading lists skill-style-guide.md; purpose exists but generic |
| 7-8 | required_reading includes skill-style-guide.md, mcp-integration.md, and domain-specific references; purpose is one dense paragraph naming output format and downstream consumers |
| 9-10 | All references current and relevant; purpose names exact file paths and formats; skill_domain matches required_reading references |

---

## Scoring

Overall score = (Design * 0.40) + (Usability * 0.30) + (Creativity * 0.20) + (Content * 0.10)

### Score Bands

| Overall Score | Band | Interpretation |
|---------------|------|----------------|
| 9.0–10.0 | Exemplary | Exceeds all structural and content requirements; no improvements needed |
| 7.0–8.9 | Strong | Meets all requirements with clear craft investment; minor improvements only |
| 5.0–6.9 | Adequate | All required sections present but missing polish; several improvements recommended |
| 3.0–4.9 | Weak | Missing required sections or flags; significant structural work needed |
| 1.0–2.9 | Failing | Critical structural defects; rebuild recommended |

---

## Return Format

Evaluator agents MUST return JSON matching this schema:

```json
{
  "skill_path": "path/to/skill.md",
  "overall_score": 7.2,
  "dimensions": {
    "design": { "score": 7.5, "weight": 0.40, "findings": ["specific finding text"] },
    "usability": { "score": 8.0, "weight": 0.30, "findings": [] },
    "creativity": { "score": 6.0, "weight": 0.20, "findings": ["specific finding text"] },
    "content": { "score": 7.0, "weight": 0.10, "findings": ["specific finding text"] }
  },
  "lint_errors": [],
  "lint_warnings": [],
  "recommendations": [
    { "priority": "HIGH|MEDIUM|LOW", "action": "specific remediation instruction" }
  ]
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `skill_path` | string | Relative path to the evaluated skill file |
| `overall_score` | number | Weighted sum: (design * 0.40) + (usability * 0.30) + (creativity * 0.20) + (content * 0.10) |
| `dimensions[*].score` | number | Per-dimension score 1–10 |
| `dimensions[*].weight` | number | Fixed dimension weight (do not change) |
| `dimensions[*].findings` | string[] | Specific observations (empty array if no issues) |
| `lint_errors` | string[] | LINT rule violations from tooling-patterns.md |
| `lint_warnings` | string[] | LINT warnings (lower severity) |
| `recommendations` | object[] | Actionable improvements sorted by priority |
| `recommendations[*].priority` | "HIGH"\|"MEDIUM"\|"LOW" | Impact level |
| `recommendations[*].action` | string | Specific remediation instruction (not generic) |

---

*Version: 1.0*
*Last updated: 2026-03-18*
*Loaded by: pde-design-quality-evaluator via @ reference during skill evaluation*
