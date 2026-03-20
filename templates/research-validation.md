# Research Validation Template

Template for `.planning/phases/XX-name/{phase_num}-RESEARCH-VALIDATION.md` — research claim validation results produced by pde-research-validator agent.

---

## File Template

```markdown
---
phase: XX-name
research_file: .planning/phases/XX-name/XX-RESEARCH.md
validated_at_phase: {phase_number}
validated_at: YYYY-MM-DDTHH:MM:SSZ
total_claims: N
verified_count: N
unverifiable_count: N
contradicted_count: N
result: PASS | CONCERNS | FAIL
---

# Phase {X}: {Name} Research Validation

**Research file:** `{research_file_path}`
**Validated at phase:** {phase_number}
**Validated:** {timestamp}
**Result:** {PASS | CONCERNS | FAIL}

## Claims

| # | Claim | Tier | Status | Evidence |
|---|-------|------|--------|----------|
| 1 | {claim text} | T1 | VERIFIED | {file exists at path X} |
| 2 | {claim text} | T2 | CONTRADICTED | {grep found no match for pattern X in file Y} |
| 3 | {claim text} | T3 | UNVERIFIABLE | {behavioral claim requires runtime; no codebase evidence} |

## Detail

### Claim 1: {short label}
**Full claim:** {verbatim extracted text}
**Tier:** T1 -- Structural
**Status:** VERIFIED
**Verification method:** `glob("path/to/file.md")` -> 1 match
**Evidence:** File exists at expected path

### Claim 2: {short label}
**Full claim:** {verbatim extracted text}
**Tier:** T2 -- Content
**Status:** CONTRADICTED
**Verification method:** `grep("pattern", "file.cjs")` -> 0 matches
**Evidence:** Expected pattern not found in file. Research claims X but codebase shows Y.

## Summary

| Metric | Count |
|--------|-------|
| Total claims extracted | N |
| VERIFIED | N |
| UNVERIFIABLE | N |
| CONTRADICTED | N |

**Result:** PASS (no contradictions) | CONCERNS (unverifiable > 0) | FAIL (contradicted > 0)

---
*Validated: {timestamp}*
*Validator: pde-research-validator*
```

---

## Usage Notes

- The agent (`pde-research-validator`) returns `artifact_content` as a string matching this template structure. The agent does NOT write the file directly.
- The orchestrating workflow writes the string to disk at `{phase_dir}/{padded_phase}-RESEARCH-VALIDATION.md`:
  ```bash
  echo "$AGENT_RETURN" | jq -r '.artifact_content' > "${PHASE_DIR}/${PADDED_PHASE}-RESEARCH-VALIDATION.md"
  ```
- `validated_at_phase` in YAML frontmatter is the critical field for staleness tracking — downstream consumers parse frontmatter, not body prose.
- Result aggregation logic:
  - `contradicted_count > 0` → `result: FAIL`
  - `unverifiable_count > 0` (and contradicted = 0) → `result: CONCERNS`
  - All verified, no contradictions, no unverifiable → `result: PASS`
