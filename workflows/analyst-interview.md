<purpose>
Run a structured product analyst interview to surface unstated requirements, hidden assumptions, and edge cases. Produces ANL-analyst-brief-v{N}.md in .planning/design/strategy/. Invoked as optional step in new-project and new-milestone workflows.
</purpose>

<process>

## 1. Load Context

Read available project context:
- .planning/PROJECT.md (if exists — project description, requirements)
- .planning/REQUIREMENTS.md (if exists — known requirements)
- .planning/STATE.md (if exists — current position, decisions)

Also read any interview_context passed in from the calling workflow (new-project or new-milestone).

## 2. Determine Version

```bash
ls .planning/design/strategy/ANL-analyst-brief-v*.md 2>/dev/null | sort -V | tail -1
```

If prior versions exist, increment N. Otherwise N = 1.

Ensure directory exists:
```bash
mkdir -p .planning/design/strategy
```

## 3. Conduct Interview

Follow the pde-analyst agent instructions (MECE framework, 3-5 rounds).

For each round, use AskUserQuestion:
- header: "Analyst Interview — Round {N}/{total}"
- question: {2-3 focused questions about current MECE dimension}
- options:
  - Freeform response expected — ask as open-ended question
  - Include "Skip remaining questions" option to let user exit early

After each round, summarize what was learned and what gaps remain.

If user selects "Skip remaining questions": proceed to Step 4 with what has been gathered.

## 4. Generate Brief

Write `.planning/design/strategy/ANL-analyst-brief-v{N}.md` following the output format specified in the pde-analyst agent instructions.

Each section must contain substantive findings from the interview, not placeholders. If a dimension was not covered (user skipped), note: "Not explored — user skipped remaining questions."

## 5. Report

Display summary:
```
Analyst brief generated: .planning/design/strategy/ANL-analyst-brief-v{N}.md
- Unstated requirements found: {count}
- Assumption risks identified: {count}
- Edge cases documented: {count}

This brief will automatically enrich /pde:brief when run.
```

</process>

<success_criteria>
- ANL-analyst-brief-v{N}.md exists in .planning/design/strategy/
- Brief contains all 5 required sections (Unstated Requirements, Assumption Risks, Edge Cases, User Segment Analysis, Priority Assessment)
- Each section has substantive content (not just headers)
</success_criteria>
