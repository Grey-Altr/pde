# Phase 55: Research Validation Agent - Research

**Researched:** 2026-03-19
**Domain:** Agent authoring, claim extraction, read-only codebase verification
**Confidence:** HIGH

## Summary

Phase 55 builds `pde-research-validator` — a read-only agent that extracts verifiable claims from RESEARCH.md files, classifies them into three tiers, checks each against the codebase, and produces a RESEARCH-VALIDATION.md artifact with three-state labels (VERIFIED / UNVERIFIABLE / CONTRADICTED). The agent is strictly read-only: no Write, no Edit, no Bash writes. It returns structured content to its calling context, which handles file writing.

The core challenge is a write constraint conflict: RVAL-03 says the validator "produces" RESEARCH-VALIDATION.md, but RVAL-05 prohibits Write/Edit in allowed_tools. The resolution is the standard PDE read-only agent pattern: the agent returns the artifact content as a structured return block, and the invoking orchestrator (plan-phase or a dedicated wrapper) writes the file. This matches exactly how pde-quality-auditor, pde-design-quality-evaluator, and pde-pressure-test-evaluator work — they return JSON, never write files.

The agent architecture follows established PDE patterns precisely. Five read-only agents already exist in `agents/`. The constraint clause, tool verification step, and JSON return format are standardized. Claim extraction uses the LLM pass described in RVAL-01 — no regex parser needed. Tier classification maps directly to tool capabilities: Tier 1 uses Glob/Bash (file existence), Tier 2 uses Grep/Read (content presence), Tier 3 uses Read/Bash (behavioral inference).

**Primary recommendation:** Model `pde-research-validator` directly after `pde-quality-auditor` — same constraint clause, same tool set (Read, Glob, Grep, Bash read-only), JSON return with structured claim list and artifact content string that the orchestrator writes.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RVAL-01 | Research validator agent extracts verifiable claims from RESEARCH.md using LLM pass | LLM-based extraction is the only viable approach for natural-language research docs; no regex pattern can reliably identify "verifiable claims" across all research types. Agent reads RESEARCH.md and uses its reasoning to identify claims. |
| RVAL-02 | Research validator verifies each extracted claim against actual codebase using tool calls (Read, Grep, Glob) | Tier 1: Glob/Bash file existence; Tier 2: Grep for patterns/exports; Tier 3: Read for behavioral inference. All are read-only tool calls already in the PDE toolkit. |
| RVAL-03 | Research validator produces RESEARCH-VALIDATION.md with three-state output per claim (VERIFIED / UNVERIFIABLE / CONTRADICTED) | Agent returns document content as a string in its return block; the invoking workflow writes it. This resolves the RVAL-03/RVAL-05 write constraint conflict. |
| RVAL-04 | Claims classified by tier — Tier 1 (structural), Tier 2 (content), Tier 3 (behavioral) — verification method matches tier | Tier determines tool selection: T1=Glob/Bash, T2=Grep/Read, T3=Read+inference. Classification happens during LLM extraction pass. |
| RVAL-05 | Research validator agent is strictly read-only (no Write, no Edit in allowed_tools) | Established PDE pattern: return content string, let orchestrator write. No need for Write/Edit in allowed_tools. |
| RVAL-06 | RESEARCH-VALIDATION.md includes `validated_at_phase` field for staleness tracking | Goes in YAML frontmatter. Value sourced from the phase number passed to the agent at spawn time. |
</phase_requirements>

## Standard Stack

### Core

| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| `agents/pde-research-validator.md` | New file | Agent definition | PDE agents live in `agents/` by convention |
| Read, Glob, Grep, Bash (read-only) | Claude built-ins | Claim verification tools | Same tools used by all existing read-only agents |
| LLM reasoning | Claude model | Claim extraction pass | RVAL-01 explicitly specifies "LLM pass" — not regex |
| YAML frontmatter | RESEARCH-VALIDATION.md | Structured metadata | All PDE artifact files use YAML frontmatter |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `bin/pde-tools.cjs init` | existing | Phase context at spawn | Agent spawner uses init to get phase_dir, phase_number |
| `bin/pde-tools.cjs commit` | existing | Write RESEARCH-VALIDATION.md to git | After orchestrator writes the file |
| `templates/` (new template) | new | RESEARCH-VALIDATION.md structure | Orchestrator uses template to assemble final file |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LLM claim extraction | Regex/structural parsing | Regex cannot handle natural-language claims in prose sections; LLM handles all RESEARCH.md sections uniformly |
| Return content string | Agent writes via Bash heredoc | Bash heredoc technically avoids Write tool but violates spirit of RVAL-05 and creates output inconsistency |
| Per-claim verification | Batch scan | Per-claim preserves evidence linkage to specific claim; batch scan loses traceability |

**Installation:** None required. No new npm packages. All tools are Claude built-ins or existing PDE CLI.

## Architecture Patterns

### Recommended Agent Structure

```
agents/pde-research-validator.md
  ├── H1: agent name
  ├── ## Your Constraints (READ-ONLY clause)
  ├── ## Required Reading (none beyond what's passed in prompt)
  ├── ## Your Task (7-step process)
  │    Step 1: Parse phase context from prompt
  │    Step 2: Read RESEARCH.md
  │    Step 3: LLM extraction pass — identify verifiable claims
  │    Step 4: Classify each claim by tier (T1/T2/T3)
  │    Step 5: Verify each claim with appropriate tools
  │    Step 6: Classify result (VERIFIED/UNVERIFIABLE/CONTRADICTED)
  │    Step 7: Build return block (JSON + artifact content string)
  └── ## Return Format (structured JSON)
```

### Pattern 1: Read-Only Agent With Artifact Output

**What:** Agent returns both structured JSON metadata AND the full artifact content as a string. Orchestrator writes the string to disk.

**When to use:** When an agent must produce a file artifact but cannot have Write in allowed_tools.

**Established precedent:** All five existing read-only agents return JSON. `pde-research-validator` extends this by including an `artifact_content` field containing the RESEARCH-VALIDATION.md markdown text. The orchestrator does:

```bash
# After agent returns:
echo "$AGENT_RETURN" | jq -r '.artifact_content' > "${PHASE_DIR}/${PADDED_PHASE}-RESEARCH-VALIDATION.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit "docs(${PADDED_PHASE}): research validation results" \
  --files "${PHASE_DIR}/${PADDED_PHASE}-RESEARCH-VALIDATION.md"
```

### Pattern 2: Tier-Based Verification Dispatch

**What:** After classifying a claim's tier, the agent selects the appropriate tool strategy.

**Tier 1 — Structural (file/directory exists):**
```bash
# Glob for file patterns
# Bash: ls, test -f, test -d
glob_result=$(glob "agents/pde-research-validator.md")
bash_result=$(test -f "agents/pde-research-validator.md" && echo "EXISTS" || echo "MISSING")
```

**Tier 2 — Content (function exported, pattern present):**
```bash
# Grep for specific patterns in specific files
grep_result=$(grep "pde-research-validator" "agents/pde-research-validator.md")
grep_result=$(grep "TOOL_MAP_PREREGISTERED" "bin/lib/mcp-bridge.cjs")
```

**Tier 3 — Behavioral (logic claim, flow assertion):**
```bash
# Read file, reason about logic
# Read multiple files, trace execution path
# Bash read-only: grep -c, wc -l, head/tail/cat
```

### Pattern 3: Three-State Claim Classification

| State | When to Use | Evidence Required |
|-------|------------|-------------------|
| VERIFIED | Tool call returns positive match for the claim | Direct evidence: file exists, pattern found, logic confirmed |
| UNVERIFIABLE | Claim references external systems, runtime behavior, or human judgment | No codebase evidence possible; not wrong, just out of scope |
| CONTRADICTED | Tool call returns evidence that directly conflicts with the claim | Negative evidence: file missing when claimed present, pattern absent when claimed present, different value than claimed |

**Key distinction:** UNVERIFIABLE is NOT a negative verdict. It means "this claim cannot be checked against the codebase" — applies to claims about external APIs, version compatibility at runtime, LLM model behaviors, etc.

### Pattern 4: Claim Extraction Strategy

The LLM extraction pass reads RESEARCH.md and identifies claims meeting ALL of:
1. Makes an assertion about the codebase state (not a recommendation or opinion)
2. Is specific enough to check (references a file, function, pattern, or behavior)
3. Was placed in the research as a factual finding (not speculation)

**Sections that yield verifiable claims:**
- `## Standard Stack` — "library X at version Y is installed" → T2 (check package.json)
- `## Architecture Patterns` — "pattern X is used in file Y" → T2/T3
- `## Code Examples` — code block attributed to a source file → T2 (verify pattern exists)
- `## Don't Hand-Roll` — "library X handles Y" → may be T3 (verify it's actually used)
- `## Common Pitfalls` — "file X has behavior Y" → T2/T3

**Sections that rarely yield verifiable claims:**
- `## Summary` — executive narrative, mostly opinion/synthesis
- `## Open Questions` — explicitly uncertain, skip
- `## State of the Art` — historical assertions, often UNVERIFIABLE

### RESEARCH-VALIDATION.md Format

```markdown
---
phase: 55-research-validation-agent
research_file: .planning/phases/55-research-validation-agent/55-RESEARCH.md
validated_at_phase: 55
validated_at: 2026-03-19T14:30:00Z
total_claims: N
verified_count: N
unverifiable_count: N
contradicted_count: N
result: PASS | CONCERNS | FAIL
---

# Phase 55: Research Validation

**Research file:** `.planning/phases/55-research-validation-agent/55-RESEARCH.md`
**Validated at phase:** 55
**Validated:** 2026-03-19T14:30:00Z
**Result:** PASS | CONCERNS | FAIL

## Claims

| # | Claim | Tier | Status | Evidence |
|---|-------|------|--------|----------|
| 1 | {claim text} | T1 | VERIFIED | {file exists at path X} |
| 2 | {claim text} | T2 | CONTRADICTED | {grep found no match for pattern X in file Y} |
| 3 | {claim text} | T3 | UNVERIFIABLE | {behavioral claim requires runtime; no codebase evidence} |

## Detail

### Claim 1: {short label}
**Full claim:** {verbatim extracted text}
**Tier:** T1 — Structural
**Status:** VERIFIED
**Verification method:** `glob("path/to/file.md")` → 1 match
**Evidence:** File exists at expected path

### Claim 2: {short label}
**Full claim:** {verbatim extracted text}
**Tier:** T2 — Content
**Status:** CONTRADICTED
**Verification method:** `grep("pattern", "file.cjs")` → 0 matches
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

### Anti-Patterns to Avoid

- **Claiming CONTRADICTED when UNVERIFIABLE is correct:** If a claim is about runtime behavior or an external system, it is UNVERIFIABLE — not CONTRADICTED. CONTRADICTED requires positive evidence of conflict.
- **Skipping the extraction step:** Do not attempt to hardcode claim patterns. Every RESEARCH.md is different. The LLM extraction pass is mandatory per RVAL-01.
- **Reporting no claims:** If extraction returns zero claims, that is a validation failure in the extraction step — not a valid result. Minimum 3 claims expected from any substantive RESEARCH.md.
- **Verifying summary prose as claims:** "This phase will..." sentences in `## Summary` are narrative, not claims. Skip them.
- **Writing RESEARCH-VALIDATION.md from within the agent:** Violates RVAL-05. The agent returns the content string. The orchestrator writes it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File existence check | Custom bash function | `test -f <path>` or Glob | Built-in tools handle all edge cases including symlinks |
| Pattern matching in files | Custom string parser | Grep with regex | Grep handles encoding, binary files, line endings correctly |
| YAML frontmatter construction | String concatenation template | Literal YAML in return block | Frontmatter is simple; just build the string directly in the return |
| Phase number lookup | Parse ROADMAP.md | Read from prompt context | Orchestrator passes `validated_at_phase` value in the agent prompt |
| Claim confidence scoring | Custom scorer | Omit until RVAL-EXT-01 | Requirements explicitly defer graduated confidence to a future extension |

**Key insight:** This phase's hard problems are conceptual (claim extraction, tier classification), not infrastructural. The infrastructure (tools, file I/O, git) is already solved by PDE's existing patterns.

## Common Pitfalls

### Pitfall 1: Write Constraint Conflict (RVAL-03 vs RVAL-05)

**What goes wrong:** Agent tries to write RESEARCH-VALIDATION.md directly, violating the read-only constraint. OR the plan is written with the agent returning JSON but no orchestrator step to write the file, so the artifact never gets created.

**Why it happens:** RVAL-03 says the agent "produces" the file; developers assume that means Write tool. RVAL-05 explicitly prohibits Write.

**How to avoid:** The agent returns two things: (1) a JSON metadata block, and (2) an `artifact_content` field containing the full RESEARCH-VALIDATION.md text as a string. The plan's orchestration step (in plan-phase.md or a dedicated script) writes the string to disk. The `artifact_content` pattern is a new PDE convention introduced in this phase.

**Warning signs:** Agent file has `Write` in allowed-tools. OR agent spawn returns successfully but no RESEARCH-VALIDATION.md exists on disk.

### Pitfall 2: Confusing UNVERIFIABLE With CONTRADICTED

**What goes wrong:** Agent labels a claim CONTRADICTED because it cannot find supporting evidence. This is incorrect — absence of evidence is UNVERIFIABLE, not CONTRADICTED.

**Why it happens:** Intuitive mislabeling. "I checked and found nothing" feels like a contradiction.

**How to avoid:** CONTRADICTED requires POSITIVE evidence of conflict — the codebase shows X when the research claimed Y. UNVERIFIABLE means "I checked and there is no codebase evidence either way." The distinction matters: CONTRADICTED triggers a FAIL in the readiness gate; UNVERIFIABLE is a CONCERN.

**Warning signs:** High CONTRADICTED count on a research file that has valid claims about external systems (npm packages, Claude model behaviors, runtime behavior).

### Pitfall 3: Extracting Too Many Claims

**What goes wrong:** Agent extracts 40+ claims by treating every sentence as a claim. Verification becomes expensive and most claims are noise.

**Why it happens:** Overly liberal interpretation of "verifiable claim" — includes opinions, recommendations, and speculative text.

**How to avoid:** Claims must be assertions about current codebase state. "Consider using X" is not a claim. "X is used in file Y" is a claim. Apply the three-criteria filter: assertion, specific, factual finding.

**Cap:** Aim for 5–15 claims per RESEARCH.md. If extraction yields more than 20, apply the filter more strictly.

### Pitfall 4: Running Bash Write Commands

**What goes wrong:** Agent uses `Bash` tool to write a file (e.g., `echo "..." > file.md`, `cat <<EOF > file`), technically bypassing the Write tool restriction while violating the spirit of RVAL-05.

**Why it happens:** Claude can write files via Bash even without the Write tool.

**How to avoid:** The agent's constraint clause must explicitly state: "You MUST NOT write to any file through any mechanism — not via Write tool, not via Edit tool, not via Bash redirection. All output is returned to the orchestrating workflow."

**Warning signs:** Agent instructions mention Bash but do not explicitly prohibit file-writing via Bash redirection.

### Pitfall 5: validated_at_phase Not in Frontmatter

**What goes wrong:** Agent puts `validated_at_phase` in the body of the document but not in YAML frontmatter. Downstream staleness checks (RVAL-06 intent) parse frontmatter, not body.

**Why it happens:** RVAL-06 says "includes `validated_at_phase` field" without specifying location. Natural tendency is to put it in a prose summary.

**How to avoid:** The RESEARCH-VALIDATION.md template explicitly places `validated_at_phase:` in the YAML frontmatter block. The agent constructs frontmatter as part of the `artifact_content` string.

### Pitfall 6: Agent Invocation Without Phase Context

**What goes wrong:** The agent is spawned without the `validated_at_phase` value in its prompt, so the frontmatter field ends up empty or wrong.

**Why it happens:** The orchestrator (plan-phase.md) passes many variables; adding a new one is easy to forget.

**How to avoid:** The plan task for wiring the agent spawn (in Wave 1 of the PLAN.md) must explicitly include `validated_at_phase: {phase_number}` in the agent prompt template.

## Code Examples

### Read-Only Agent Constraint Clause (established pattern)

```markdown
## Your Constraints

**READ-ONLY.** You MUST NOT write to any file through any mechanism — not via Write tool,
not via Edit tool, not via Bash redirection or heredoc. Your sole output is structured
content returned in the return block below.

Before any tool call, verify you are only using Read, Glob, Grep, and Bash
(read-only commands: grep, ls, test, cat, wc, head, tail — no redirections).
```
Source: Synthesized from `agents/pde-quality-auditor.md` and `agents/pde-design-quality-evaluator.md` established patterns.

### Agent Allowed-Tools Frontmatter (RVAL-05 compliant)

```yaml
---
name: pde-research-validator
description: Validate research claims against codebase — produces RESEARCH-VALIDATION.md content
argument-hint: "[phase] [research-file-path]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---
```
Note: No Write, no Edit. Bash is included for read-only commands (grep, ls, test, wc, cat).

### JSON Return Block Structure

```json
{
  "status": "COMPLETE",
  "research_file": ".planning/phases/55-research-validation-agent/55-RESEARCH.md",
  "validated_at_phase": "55",
  "validated_at": "2026-03-19T14:30:00Z",
  "summary": {
    "total_claims": 8,
    "verified_count": 5,
    "unverifiable_count": 2,
    "contradicted_count": 1,
    "result": "FAIL"
  },
  "claims": [
    {
      "id": 1,
      "text": "pde-quality-auditor.md is READ-ONLY and contains no Write tool calls",
      "tier": "T2",
      "status": "VERIFIED",
      "method": "grep('Write', 'agents/pde-quality-auditor.md')",
      "evidence": "0 matches for Write tool in allowed-tools section"
    }
  ],
  "artifact_content": "---\nphase: 55-research-validation-agent\n..."
}
```

### Tier Classification Decision Logic

```
For each extracted claim:
  IF claim asserts file/directory EXISTS or COUNT of files:
    → Tier 1 (Structural)
    → Verify with: Glob, Bash (test -f / ls)

  ELIF claim asserts specific text/pattern EXISTS in a file:
    → Tier 2 (Content)
    → Verify with: Grep, Read

  ELIF claim asserts behavior/logic/flow/sequence:
    → Tier 3 (Behavioral)
    → Verify with: Read (inspect logic), Bash read-only
    → If runtime-dependent: classify as UNVERIFIABLE immediately

  IF claim references external system (npm registry, Claude model, GitHub API):
    → UNVERIFIABLE regardless of tier
```

### Result Aggregation Logic

```
IF contradicted_count > 0:
  result = "FAIL"
ELIF unverifiable_count > 0:
  result = "CONCERNS"
ELSE:
  result = "PASS"
```
Source: Derived from STATE.md v0.7 architectural decision: "Three-state validation output (VERIFIED / UNVERIFIABLE / CONTRADICTED) maps to readiness gate severity (PASS / CONCERNS / FAIL) — only CONTRADICTED is FAIL."

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Research claims go unverified until execution reveals gaps | Research claims validated against codebase before planning | Phase 55 (new) | Planner receives research that has been cross-checked against actual codebase state |
| Read-only agents return JSON with no artifact content | New: agents return `artifact_content` string for orchestrator to write | Phase 55 (new pattern) | Solves write-constraint conflict while keeping agent strictly read-only |
| No staleness tracking on research | `validated_at_phase` field enables phase-distance staleness detection | Phase 55 (new) | Phase 57 can auto-trigger re-validation when phase distance exceeds threshold |

## Open Questions

1. **Minimum claim count threshold**
   - What we know: RVAL-01 says extraction via LLM pass; no minimum specified
   - What's unclear: What to do if RESEARCH.md yields 0 verifiable claims (e.g., a purely external-facing research file)
   - Recommendation: Return `status: "NO_VERIFIABLE_CLAIMS"` with explanation; treat as PASS (not FAIL) since absence of claims is not a research defect

2. **Staleness threshold for RVAL-06**
   - What we know: STATE.md notes "N=2 inferred, not measured" — if validated_at_phase is more than 2 phases ago, research may be stale
   - What's unclear: Whether phase-distance or calendar time is the right staleness metric
   - Recommendation: Use phase-distance (N=2) as initial threshold; it aligns with how plan-phase already reasons about "recent" research. Calendar time requires parsing dates; phase distance only requires comparing integers.

3. **What to do when RESEARCH.md has no `## Code Examples` or `## Architecture Patterns`**
   - What we know: Not all RESEARCH.md files follow the standard template (e.g., Phase 54's research is codebase-internal with no external library claims)
   - What's unclear: Whether extraction should handle non-standard research formats gracefully
   - Recommendation: Agent must handle any research format. Extraction prompt should instruct: "Extract claims from any section of the document, not just standard sections."

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None (agent is a markdown file; no unit tests for agents) |
| Config file | none |
| Quick run command | `grep "MUST NOT write" agents/pde-research-validator.md` → must match |
| Full suite command | N/A — validation is manual invoke and inspect |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RVAL-01 | Agent extracts claims using LLM pass | smoke | `grep "LLM\|extract.*claim\|claim.*extract" agents/pde-research-validator.md` → match | ❌ Wave 0 |
| RVAL-02 | Agent verifies claims with Read/Grep/Glob tool calls | smoke | `grep "Tier 1\|Tier 2\|Tier 3\|T1\|T2\|T3" agents/pde-research-validator.md` → match | ❌ Wave 0 |
| RVAL-03 | Agent produces RESEARCH-VALIDATION.md content (via artifact_content) | smoke | Run agent against 54-RESEARCH.md; check output contains `artifact_content` key | ❌ Wave 0 |
| RVAL-04 | Claims classified by tier | smoke | `grep "Tier 1\|Tier 2\|Tier 3" agents/pde-research-validator.md` → 3 matches | ❌ Wave 0 |
| RVAL-05 | Agent has no Write/Edit in allowed-tools | smoke | `grep "allowed-tools" -A 10 agents/pde-research-validator.md \| grep -v "Write\|Edit"` → no Write/Edit | ❌ Wave 0 |
| RVAL-06 | RESEARCH-VALIDATION.md frontmatter has validated_at_phase | smoke | `grep "validated_at_phase" .planning/phases/55-research-validation-agent/55-RESEARCH-VALIDATION.md` → match | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Verify the specific file changed shows expected content via grep
- **Per wave merge:** N/A — single wave phase
- **Phase gate:** All 6 RVAL requirements TRUE before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `agents/pde-research-validator.md` — the agent itself; covers all RVAL requirements
- [ ] Template for RESEARCH-VALIDATION.md — needed for consistent output format
- [ ] Orchestration additions to `plan-phase.md` — covers RVAL-07/RVAL-08 (Phase 57 scope, not this phase)

*Note: No test framework needed — verification is grep-level inspection of artifact content.*

## Sources

### Primary (HIGH confidence)

- Direct file reads: `agents/pde-quality-auditor.md`, `agents/pde-design-quality-evaluator.md`, `agents/pde-pressure-test-evaluator.md` — established read-only agent patterns
- `workflows/plan-phase.md` — orchestration context, Task() spawn patterns, agent invocation
- `workflows/check-readiness.md` — artifact read/write patterns for verification outputs
- `.planning/REQUIREMENTS.md` — authoritative RVAL-01 through RVAL-06 definitions
- `.planning/STATE.md` — v0.7 architectural decision: three-state output maps to PASS/CONCERNS/FAIL
- `.planning/phases/54-tech-debt-closure/54-RESEARCH.md` — exemplar research file for claim extraction testing

### Secondary (MEDIUM confidence)

- `references/verification-patterns.md` — verification tool patterns (Grep patterns, Bash checks, VERIFIED/UNVERIFIABLE distinction)
- `references/tooling-patterns.md` — constraint clause and return format conventions
- `bin/lib/readiness.cjs` — existing PASS/CONCERNS/FAIL architecture; RESEARCH-VALIDATION.md result field mirrors this

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**
- Agent structure: HIGH — five existing read-only agents verified by direct read
- Write constraint resolution: HIGH — standard PDE pattern confirmed in pde-quality-auditor.md
- Tier classification: HIGH — derived directly from RVAL-04 requirement text; verified against tool capabilities
- RESEARCH-VALIDATION.md format: HIGH — designed to mirror existing artifact patterns (VERIFICATION.md, READINESS.md)
- Claim extraction approach: MEDIUM — LLM-based extraction is specified by RVAL-01 but has no prior example in PDE to reference

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable codebase, no external dependencies)
