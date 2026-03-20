<purpose>
Surface Claude's assumptions about a phase before planning, enabling users to correct misconceptions early.

Key difference from discuss-phase: This is ANALYSIS of what Claude thinks, not INTAKE of what user knows. No file output - purely conversational to prompt discussion.
</purpose>

<process>

<step name="validate_phase" priority="first">
Phase number: $ARGUMENTS (required)

**If argument missing:**

```
Error: Phase number required.

Usage: /pde:list-phase-assumptions [phase-number]
Example: /pde:list-phase-assumptions 3
```

Exit workflow.

**If argument provided:**
Validate phase exists in roadmap:

```bash
cat .planning/ROADMAP.md | grep -i "Phase ${PHASE}"
```

**If phase not found:**

```
Error: Phase ${PHASE} not found in roadmap.

Available phases:
[list phases from roadmap]
```

Exit workflow.

**If phase found:**
Parse phase details from roadmap:

- Phase number
- Phase name
- Phase description/goal
- Any scope details mentioned

Continue to analyze_phase.
</step>

<step name="analyze_phase">
Based on roadmap description and project context, identify assumptions across five areas:

**1. Technical Approach:**
What libraries, frameworks, patterns, or tools would Claude use?
- "I'd use X library because..."
- "I'd follow Y pattern because..."
- "I'd structure this as Z because..."

**2. Implementation Order:**
What would Claude build first, second, third?
- "I'd start with X because it's foundational"
- "Then Y because it depends on X"
- "Finally Z because..."

**3. Scope Boundaries:**
What's included vs excluded in Claude's interpretation?
- "This phase includes: A, B, C"
- "This phase does NOT include: D, E, F"
- "Boundary ambiguities: G could go either way"

**4. Risk Areas:**
Where does Claude expect complexity or challenges?
- "The tricky part is X because..."
- "Potential issues: Y, Z"
- "I'd watch out for..."

**5. Dependencies:**
What does Claude assume exists or needs to be in place?
- "This assumes X from previous phases"
- "External dependencies: Y, Z"
- "This will be consumed by..."

Be honest about uncertainty. Prefix each assumption with a confidence marker:
- `[confident]` — clear from roadmap and project context
- `[assuming]` — reasonable inference, not explicitly stated
- `[unclear]` — could go multiple ways, needs clarification
</step>

<step name="present_assumptions">
Present assumptions in a clear, scannable format:

```
## Assumptions for Phase ${PHASE}: ${PHASE_NAME}

### Technical Approach
- [confident] [assumption about library/pattern/tool]
- [assuming] [assumption about approach]
- [unclear] [area of uncertainty]

### Implementation Order
- [confident] [what gets built first and why]
- [assuming] [sequencing inference]

### Scope Boundaries
**In scope:**
- [confident] [what's included]

**Out of scope:**
- [confident] [what's excluded]

**Ambiguous:**
- [unclear] [what could go either way]

### Risk Areas
- [assuming] [anticipated challenge]
- [unclear] [potential issue]

### Dependencies
**From prior phases:**
- [confident] [what's needed]

**External:**
- [assuming] [third-party needs]

**Feeds into:**
- [confident] [what future phases need from this]

---

**What do you think?**

Are these assumptions accurate? Let me know:
- What I got right
- What I got wrong
- What I'm missing
```

Wait for user response.
</step>

<step name="gather_feedback">
**If user provides corrections:**

Acknowledge the corrections:

```
Key corrections:
- [area]: [correction text]
- [area]: [correction text]

This changes my understanding significantly. [Summarize new understanding]
```

**If user confirms assumptions:**

```
Assumptions validated.
```

**If called with `--structured` flag (for plan-phase integration):**

After acknowledging corrections or confirmation, emit a machine-readable summary block:

```
<assumptions_result>
status: confirmed|corrected
corrections:
  - area: [Technical Approach|Implementation Order|Scope Boundaries|Risk Areas|Dependencies]
    original: [assumption text]
    correction: [user correction text]
</assumptions_result>
```

If no corrections, emit:
```
<assumptions_result>
status: confirmed
corrections: []
</assumptions_result>
```

Continue to offer_next.
</step>

<step name="offer_next">
Present next steps:

```
What's next?
1. Discuss context (/pde:discuss-phase ${PHASE}) - Let me ask you questions to build comprehensive context
2. Plan this phase (/pde:plan-phase ${PHASE}) - Create detailed execution plans
3. Re-examine assumptions (/pde:assumptions ${PHASE}) - I'll analyze again with your corrections
4. Done for now
```

Wait for user selection.

If "Discuss context": Note that CONTEXT.md will incorporate any corrections discussed here
If "Plan this phase": Proceed knowing assumptions are understood
If "Re-examine": Return to analyze_phase with updated understanding
</step>

</process>

<success_criteria>
- Phase number validated against roadmap
- Assumptions surfaced across five areas: technical approach, implementation order, scope, risks, dependencies
- Confidence levels marked where appropriate
- "What do you think?" prompt presented
- User feedback acknowledged
- Clear next steps offered
</success_criteria>
