# Phase 52: Agent Enhancements - Research

**Researched:** 2026-03-19
**Domain:** Agent workflow enhancement — assumptions capture, analyst persona, brief pipeline, persistent memory
**Confidence:** HIGH

## Summary

Phase 52 enhances PDE's agent system with four capabilities: (1) a structured assumptions command that surfaces planner thinking before plans are written, (2) a dedicated analyst persona agent that conducts probing interviews during project/milestone initialization, (3) integration of analyst output into the /pde:brief pipeline, and (4) per-agent persistent memory with cap enforcement. All four are markdown-based, zero-dependency additions following established PDE patterns.

The existing codebase already has partial coverage of AGNT-01 via `/pde:list-phase-assumptions` — a conversational workflow that surfaces assumptions across five areas. The requirement calls for a more structured, gate-enforced version that blocks plan generation until user confirms. For AGNT-02/03, the analyst persona follows the same agent-file + workflow pattern as every other PDE agent (markdown file in agents/, workflow in workflows/, command in commands/). For AGNT-04/05, the persistent memory system requires a new `bin/lib/memory.cjs` library module plus modifications to agent spawn prompts across all core workflows.

**Primary recommendation:** Build on existing patterns — the list-phase-assumptions workflow becomes the assumptions gate in plan-phase, the analyst agent mirrors the discuss-phase multi-round pattern, and agent memory uses the same markdown-with-structured-sections approach as workflow-status.md and HANDOFF.md.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGNT-01 | /pde:assumptions surfaces planner assumptions before plan generation; user confirms or corrects | Existing `/pde:list-phase-assumptions` workflow provides 80% of this. Need: (a) rename/alias to `/pde:assumptions`, (b) integrate as gate in plan-phase.md before planner spawn, (c) structured output format that feeds planner context |
| AGNT-02 | pde-analyst agent performs multi-round probing interview during new-project/new-milestone | New agent file `agents/pde-analyst.md` + workflow `workflows/analyst-interview.md` + command `commands/analyst.md`. Follows discuss-phase multi-round AskUserQuestion pattern |
| AGNT-03 | Analyst output feeds into /pde:brief as upstream context with graceful degradation | brief.md Sub-step 2c already has upstream context injection pattern (IDT_CONTEXT, CMP_CONTEXT, OPP_CONTEXT). Add ANALYST_CONTEXT following identical probe-and-inject pattern |
| AGNT-04 | Per-agent-type persistent memory in .planning/agent-memory/{agent-type}/memories.md | New `bin/lib/memory.cjs` with read/append/archive functions. Modify spawn prompts in execute-phase.md, plan-phase.md, diagnose-issues.md, verify-phase.md to load+save |
| AGNT-05 | 50-entry cap with automatic archival; entries include timestamp, phase context, relevance tags | Cap enforcement in memory.cjs: count entries, archive oldest to `archive-YYYYMMDD.md` when over 50. Entry format: `### [timestamp] Phase {N} | tags: {comma-separated}` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `fs` | N/A | File I/O for memory.cjs | Zero dependencies constraint — PDE uses no npm packages at plugin root |
| Node.js built-in `path` | N/A | Path resolution | Same |
| Node.js built-in `crypto` | N/A | Not needed for this phase | — |
| Node.js `node:test` | Built-in | Test framework | Matches existing test infrastructure (phase-51 uses `node:test`) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `core.cjs` (internal) | Current | `output()` and `error()` helpers | All pde-tools CLI command handlers |
| `config.cjs` (internal) | Current | Config get/set | If memory settings stored in config.json |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown memory file | JSON memory file | Markdown is human-readable and consistent with all other .planning/ state; JSON would need rendering |
| File-based archive | SQLite | Overkill — PDE is markdown-based, no database dependency, 50 entries is trivially manageable |

**Installation:**
```bash
# No installation needed — zero external dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
agents/
├── pde-analyst.md            # NEW: analyst persona agent
commands/
├── assumptions.md            # NEW: /pde:assumptions command
├── analyst.md                # NEW: /pde:analyst command (optional)
workflows/
├── analyst-interview.md      # NEW: multi-round analyst interview
├── list-phase-assumptions.md # MODIFIED: structured output format
├── plan-phase.md             # MODIFIED: assumptions gate before planner
├── new-project.md            # MODIFIED: analyst interview integration
├── new-milestone.md          # MODIFIED: analyst interview integration
├── brief.md                  # MODIFIED: analyst context injection
├── execute-phase.md          # MODIFIED: memory load/save in spawn prompts
├── diagnose-issues.md        # MODIFIED: memory load/save
bin/
├── lib/
│   ├── memory.cjs            # NEW: agent memory CRUD + archival
│   └── init.cjs              # MODIFIED: add memory paths to init JSON
.planning/
├── agent-memory/             # NEW: per-agent memory directory
│   ├── executor/
│   │   ├── memories.md       # Active entries (max 50)
│   │   └── archive-*.md      # Archived entries
│   ├── planner/
│   │   ├── memories.md
│   │   └── archive-*.md
│   ├── debugger/
│   │   ├── memories.md
│   │   └── archive-*.md
│   └── verifier/
│       ├── memories.md
│       └── archive-*.md
tests/
├── phase-52/
│   ├── memory.test.mjs       # memory.cjs unit tests
│   └── assumptions.test.mjs  # assumptions format tests (if applicable)
```

### Pattern 1: Assumptions Gate in plan-phase
**What:** Before spawning the planner agent, plan-phase.md runs the assumptions workflow (inline, not as a subagent) to surface and confirm assumptions. The confirmed/corrected assumptions become additional planner context.
**When to use:** Every plan-phase invocation (unless --skip-assumptions flag)
**Example:**
```markdown
## 7.5. Assumptions Gate (NEW STEP)

Skip if: `--skip-assumptions` flag OR `--auto` mode (auto-mode uses defaults)

Display banner:
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" banner "SURFACING ASSUMPTIONS"

Run the assumptions analysis inline (same session, not subagent):
1. Read ROADMAP.md phase section, REQUIREMENTS.md, CONTEXT.md (if exists)
2. Generate structured assumptions across 5 areas
3. Present to user via AskUserQuestion
4. Capture corrections
5. Store as ASSUMPTIONS.md or pass inline to planner prompt

If --auto: auto-accept default assumptions, log them, continue
```

### Pattern 2: Analyst Multi-Round Interview (discuss-phase model)
**What:** The pde-analyst agent conducts a structured probing interview that follows the discuss-phase multi-round AskUserQuestion pattern but focuses on surfacing unstated requirements rather than implementation decisions.
**When to use:** During /pde:new-project (after initial questioning) and /pde:new-milestone
**Example:**
```markdown
# In new-project.md, after Step 3 (Deep Questioning) and before Step 4 (Write PROJECT.md):

## 3.5. Analyst Interview (Optional)

AskUserQuestion:
- header: "Analysis"
- question: "Run a structured analysis to surface hidden assumptions and requirements?"
- options:
  - "Yes (Recommended)" — Multi-round interview surfaces what you haven't thought of
  - "Skip" — Proceed with what we have

If "Yes":
  Task(
    subagent_type="pde-analyst",
    model="{researcher_model}",
    prompt="<interview_context>
      Project description: [from questioning]
      Known requirements: [from discussion so far]
    </interview_context>
    <objective>
    Conduct a probing interview to surface unstated assumptions,
    hidden requirements, and edge cases. Produce a structured
    product brief artifact.
    </objective>"
  )
```

### Pattern 3: Upstream Context Injection (brief.md model)
**What:** The analyst's structured brief output is probed and injected as upstream context in /pde:brief, following the exact same pattern as IDT_CONTEXT, CMP_CONTEXT, and OPP_CONTEXT.
**When to use:** During brief.md Sub-step 2c
**Example:**
```markdown
## In brief.md Sub-step 2c:

**Analyst context (ANL):**
Use the Glob tool to find `.planning/design/strategy/ANL-analyst-brief-v*.md`.
- If found: Sort by version descending, read highest version. Parse:
  - `## Unstated Requirements` section
  - `## Assumption Risks` section
  - `## Edge Cases` section
  Store as ANL_CONTEXT.
  Log: "  -> Analyst artifact found: v{N} — enriching brief with analyst findings"
- If not found:
  Log: "  -> No analyst artifact — continuing without analyst enrichment"
  SET ANL_CONTEXT = null. Continue normally.
```

### Pattern 4: Agent Memory Load/Save Lifecycle
**What:** Every core agent spawn loads its memories.md at start and appends a new entry on completion. The memory.cjs library handles CRUD and archival.
**When to use:** In every Task() spawn prompt for executor, planner, debugger, verifier
**Example:**
```markdown
## In execute-phase.md Task() spawn for executor:

<files_to_read>
- .planning/project-context.md (Project context)
- .planning/agent-memory/executor/memories.md (Agent memory — operational patterns, if exists)
- {task_file_path} (Task instructions)
...
</files_to_read>

<memory_instructions>
After completing your task, append a memory entry:
Format: ### {ISO timestamp} | Phase {N} | tags: {relevant-tags}
Content: 1-3 sentences capturing the operational pattern learned.
Example patterns worth remembering:
- "This project uses X convention for Y"
- "Files in Z directory follow pattern W"
- "Encountered gotcha: [specific issue] resolved by [approach]"
Write to: .planning/agent-memory/executor/memories.md (append only)
</memory_instructions>
```

### Pattern 5: Memory Entry Format
**What:** Standardized markdown entry format for agent memories.
**When to use:** Every memory write operation
**Example:**
```markdown
### 2026-03-19T22:50:33Z | Phase 52 | tags: conventions, testing
This project uses `node:test` with `.test.mjs` extension. Test files import
from `../../bin/lib/` using createRequire. Always use `assert/strict`.

### 2026-03-19T23:15:00Z | Phase 52 | tags: state-management, markdown
STATE.md frontmatter uses YAML. Changes via pde-tools.cjs state commands,
never direct file edit. The `state record-session` command is mandatory
at workflow end.
```

### Anti-Patterns to Avoid
- **Spawning analyst as mandatory blocking step** — analyst interview should be optional in both new-project and new-milestone. Users may skip it. Brief.md must degrade gracefully.
- **Writing memory from orchestrator** — memory entries should be written by the subagent itself (it knows what it learned), not by the orchestrator (which doesn't have execution context).
- **Over-engineering memory search** — no semantic search, no embeddings, no vector DB. The 50-entry cap means the full file is always small enough to load in context.
- **Changing list-phase-assumptions behavior** — the existing workflow is conversational and useful. The assumptions gate in plan-phase should reuse its analysis logic but produce structured output, not replace the standalone command.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Memory entry parsing | Custom regex parser | Markdown heading pattern `### {timestamp} \| Phase {N} \| tags: {csv}` | Standard `### ` prefix is trivially parseable with split/regex, consistent with all other PDE markdown |
| Archival file naming | Complex versioning | `archive-YYYYMMDD.md` with date-based naming | Simple, sortable, no collision risk at single-archive-per-day granularity |
| Entry counting | Line counting heuristic | Count `### ` headings in memories.md | Exact, O(n) where n is small (max 50), no false positives |
| Analyst interview flow | Custom conversation engine | AskUserQuestion pattern from discuss-phase.md | Already battle-tested for multi-round user interaction with options and freeform fallback |
| Upstream context injection | New injection mechanism | brief.md Sub-step 2c pattern (Glob probe, parse, null fallback) | Four existing context types already follow this exact pattern |

**Key insight:** Every component in this phase has an existing analog in the codebase. The analyst mirrors discuss-phase, assumptions mirror list-phase-assumptions, memory mirrors tracking.cjs, and brief injection mirrors the IDT/CMP/OPP pattern. No novel architecture needed.

## Common Pitfalls

### Pitfall 1: Memory File Grows Without Bound
**What goes wrong:** If archival logic has a bug, memories.md grows past 50 entries and consumes excessive agent context.
**Why it happens:** Off-by-one errors in entry counting or archive trigger.
**How to avoid:** Unit test with exactly 50, 51, and 100 entries. Archival must happen BEFORE append, not after.
**Warning signs:** Agent prompts taking longer, context compaction happening earlier.

### Pitfall 2: Analyst Blocks Critical Path
**What goes wrong:** Making the analyst interview mandatory in new-project/new-milestone causes the workflow to take significantly longer.
**Why it happens:** Over-eager integration — treating analyst as a required step rather than optional enrichment.
**How to avoid:** Always offer skip option. In --auto mode, skip analyst entirely (auto mode prioritizes speed).
**Warning signs:** Users complaining about workflow duration, --auto not actually being fast.

### Pitfall 3: Assumptions Gate Creates Infinite Loop
**What goes wrong:** User corrects assumptions, planner generates plan reflecting corrections, but assumptions check runs again and finds new assumptions.
**Why it happens:** Gate placed inside a loop instead of as a one-shot step.
**How to avoid:** Assumptions gate runs exactly ONCE per plan-phase invocation. After user confirms/corrects, proceed directly to planner. No re-check.
**Warning signs:** Plan-phase never reaching the planner spawn.

### Pitfall 4: Memory Entries Are Too Vague or Too Verbose
**What goes wrong:** Agents write entries like "completed task successfully" (useless) or dump 500 words of context (wasteful).
**Why it happens:** Insufficient guidance in the memory_instructions prompt.
**How to avoid:** Provide explicit examples in the spawn prompt. Specify "1-3 sentences" and "operational pattern learned" — not status updates, not full context dumps.
**Warning signs:** Memory files full of low-value entries that don't help future agents.

### Pitfall 5: Analyst Output Format Incompatible with Brief
**What goes wrong:** Analyst produces a freeform document that brief.md cannot reliably parse for upstream context injection.
**Why it happens:** Analyst output schema not defined to match brief.md's parsing expectations.
**How to avoid:** Define exact section headings in the analyst agent prompt that match what brief.md's Sub-step 2c will Glob for and parse. Use the same `ANL-analyst-brief-v*.md` naming convention.
**Warning signs:** brief.md logs "No analyst artifact" even when one exists.

### Pitfall 6: Memory Written by Orchestrator Instead of Subagent
**What goes wrong:** Orchestrator (execute-phase.md) tries to write memory on behalf of the subagent, but doesn't have the execution context to write meaningful entries.
**Why it happens:** Desire to centralize memory writes.
**How to avoid:** Memory write instructions go in the subagent's Task() prompt. The subagent writes its own memory. Orchestrator only ensures the directory exists.
**Warning signs:** Generic entries like "task completed" instead of specific operational patterns.

### Pitfall 7: Race Conditions on Memory File
**What goes wrong:** Two parallel subagents (e.g., parallel plan executors) write to the same memories.md simultaneously, causing data loss.
**Why it happens:** Parallel execution in wave-based system.
**How to avoid:** Append-only writes with file-level locking (or sequential write pattern). Alternatively, queue memory writes to orchestrator which serializes them post-wave.
**Warning signs:** Memory entries missing after parallel execution.

## Code Examples

### memory.cjs — Core Memory Module
```javascript
// Source: Pattern derived from tracking.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const { output, error } = require('./core.cjs');

const MEMORY_DIR = '.planning/agent-memory';
const MAX_ENTRIES = 50;
const ENTRY_HEADING_RE = /^### .+$/gm;

/**
 * Ensure agent memory directory exists.
 * @param {string} cwd - project root
 * @param {string} agentType - e.g., 'executor', 'planner'
 * @returns {string} - path to agent's memory directory
 */
function ensureMemoryDir(cwd, agentType) {
  const dir = path.join(cwd, MEMORY_DIR, agentType);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Read all memory entries from memories.md.
 * @param {string} cwd
 * @param {string} agentType
 * @returns {{ entries: string[], path: string, exists: boolean }}
 */
function readMemories(cwd, agentType) {
  const memPath = path.join(cwd, MEMORY_DIR, agentType, 'memories.md');
  if (!fs.existsSync(memPath)) {
    return { entries: [], path: memPath, exists: false };
  }
  const content = fs.readFileSync(memPath, 'utf-8');
  const entries = splitEntries(content);
  return { entries, path: memPath, exists: true };
}

/**
 * Split memories.md content into individual entries.
 * Each entry starts with ### heading.
 */
function splitEntries(content) {
  const parts = content.split(/(?=^### )/gm).filter(p => p.trim());
  return parts;
}

/**
 * Append a new entry, archiving oldest if over cap.
 * @param {string} cwd
 * @param {string} agentType
 * @param {string} entry - full entry including ### heading
 * @returns {{ appended: boolean, archived: number }}
 */
function appendMemory(cwd, agentType, entry) {
  const dir = ensureMemoryDir(cwd, agentType);
  const memPath = path.join(dir, 'memories.md');

  // Read existing
  const existing = fs.existsSync(memPath)
    ? fs.readFileSync(memPath, 'utf-8')
    : '';
  const entries = splitEntries(existing);

  // Archive if at or over cap
  let archived = 0;
  if (entries.length >= MAX_ENTRIES) {
    const toArchive = entries.length - MAX_ENTRIES + 1; // +1 for new entry
    const archiveEntries = entries.splice(0, toArchive);
    archived = archiveEntries.length;

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const archivePath = path.join(dir, `archive-${date}.md`);
    const archiveHeader = `# ${agentType} Memory Archive — ${date}\n\n`;
    const existingArchive = fs.existsSync(archivePath)
      ? fs.readFileSync(archivePath, 'utf-8')
      : archiveHeader;
    fs.writeFileSync(archivePath, existingArchive + archiveEntries.join('\n'));
  }

  // Build new file: header + remaining entries + new entry
  const header = `# ${agentType} Agent Memory\n\n> Loaded at agent spawn. Append-only. Max ${MAX_ENTRIES} entries.\n> Oldest entries archived automatically.\n\n`;
  const newContent = header + entries.join('\n') + '\n' + entry.trim() + '\n';
  fs.writeFileSync(memPath, newContent);

  return { appended: true, archived };
}

module.exports = {
  ensureMemoryDir, readMemories, appendMemory, splitEntries,
  MEMORY_DIR, MAX_ENTRIES
};
```

### Memory Entry Format (for spawn prompts)
```markdown
### 2026-03-19T22:50:33Z | Phase 52 | tags: conventions, testing
This project uses `node:test` with `.test.mjs` extension. Test files
live in tests/phase-NN/ and import from ../../bin/lib/ using createRequire.
```

### Analyst Agent Prompt Structure
```markdown
# pde-analyst

You are PDE's product analyst agent. You conduct structured probing
interviews to surface unstated requirements, hidden assumptions, and
edge cases that the user hasn't considered.

## Your Role

You are an experienced product analyst — not a developer. You think
about users, workflows, edge cases, failure modes, and business logic.
You probe for what's missing, not what's present.

## Interview Approach

Use the MECE framework (Mutually Exclusive, Collectively Exhaustive):
1. User segments — who are ALL the users?
2. User journeys — what are ALL the paths?
3. Error states — what can go wrong at each step?
4. Edge cases — what happens at boundaries?
5. Non-functional requirements — performance, security, accessibility
6. Integration points — what external systems are involved?

## Output Format

Produce a structured product brief: ANL-analyst-brief-v{N}.md
Sections must include:
- ## Unstated Requirements
- ## Assumption Risks
- ## Edge Cases
- ## User Segment Analysis
- ## Priority Assessment
```

### Assumptions Gate Integration Point
```markdown
## In plan-phase.md, new Step 7.5:

## 7.5. Assumptions Gate

Skip if: `--skip-assumptions` OR `--auto` mode

Read phase description from ROADMAP.md and generate assumptions
following the same 5-area analysis as list-phase-assumptions.md:
1. Technical Approach
2. Implementation Order
3. Scope Boundaries
4. Risk Areas
5. Dependencies

Present via AskUserQuestion with structured format.
Store corrections as additional planner context (inline in prompt,
not as a separate file — keeps artifacts simple).

If user confirms: proceed to Step 8 (Spawn Planner)
If user corrects: capture corrections, proceed to Step 8 with
corrections included in planner prompt
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| list-phase-assumptions is standalone | Assumptions integrated as plan-phase gate | Phase 52 (now) | Users no longer need to remember to run assumptions separately |
| No analyst persona | Dedicated pde-analyst agent | Phase 52 (now) | Structured interview surfaces requirements that casual conversation misses |
| Agents start fresh every session | Agents load persistent memory | Phase 52 (now) | Cross-session learning of project-specific patterns |
| Brief relies on PROJECT.md only | Brief accepts analyst upstream context | Phase 52 (now) | Richer briefs when analyst has been run |

## Open Questions

1. **Should /pde:assumptions be a separate command or only a plan-phase gate?**
   - What we know: AGNT-01 says "/pde:assumptions command" — implying standalone. But list-phase-assumptions already exists as standalone.
   - What's unclear: Whether to keep both or merge them.
   - Recommendation: Create `/pde:assumptions` as an alias/rename of `list-phase-assumptions` with structured output, AND integrate as plan-phase gate. Both paths produce the same analysis.

2. **Should analyst interview replace deep questioning in new-project?**
   - What we know: new-project Step 3 already does "Deep Questioning" which overlaps with analyst goals.
   - What's unclear: Whether analyst supplements or replaces the existing questioning.
   - Recommendation: Analyst SUPPLEMENTS, does not replace. Run after initial questioning when user has already shared their vision. Analyst digs deeper into what questioning didn't cover.

3. **Memory write race condition in parallel execution**
   - What we know: execute-phase runs task executors sequentially within a wave, but waves run plans in parallel.
   - What's unclear: Whether two executors in the same wave could write to the same agent-type memories.md simultaneously.
   - Recommendation: Since all executors write to `executor/memories.md`, parallel wave plans COULD conflict. Solution: have orchestrator append memory entries post-wave (collecting from subagent returns) rather than subagents writing directly. Alternatively, accept that parallel writes may interleave but not corrupt (append-only is relatively safe on most filesystems).

4. **Which agent types get memory?**
   - What we know: AGNT-04 says "executor, planner, debugger, verifier" — four types.
   - What's unclear: Whether other agent types (researcher, reconciler, analyst, roadmapper) should also get memory.
   - Recommendation: Start with the four specified. Memory is cheap to extend later.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` |
| Config file | None — tests run directly with `node --test` |
| Quick run command | `node --test tests/phase-52/*.test.mjs` |
| Full suite command | `node --test tests/phase-52/*.test.mjs` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGNT-04 | readMemories returns entries from memories.md | unit | `node --test tests/phase-52/memory.test.mjs` | No — Wave 0 |
| AGNT-05 | appendMemory enforces 50-entry cap with archival | unit | `node --test tests/phase-52/memory.test.mjs` | No — Wave 0 |
| AGNT-05 | Memory entries include timestamp, phase, tags | unit | `node --test tests/phase-52/memory.test.mjs` | No — Wave 0 |
| AGNT-05 | Archive file created when entries exceed cap | unit | `node --test tests/phase-52/memory.test.mjs` | No — Wave 0 |
| AGNT-01 | Assumptions output follows structured format | manual-only | Visual inspection of formatted output | N/A |
| AGNT-02 | pde-analyst agent file exists with required sections | smoke | `test -f agents/pde-analyst.md` | N/A |
| AGNT-03 | brief.md contains ANL context probe in Sub-step 2c | smoke | `grep "ANL_CONTEXT" workflows/brief.md` | N/A |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-52/memory.test.mjs`
- **Per wave merge:** Full suite: `node --test tests/phase-52/*.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-52/memory.test.mjs` — covers AGNT-04, AGNT-05
- [ ] `bin/lib/memory.cjs` — new library module
- [ ] `.planning/agent-memory/` directory structure — created by memory.cjs ensureMemoryDir

## Sources

### Primary (HIGH confidence)
- **Existing codebase analysis** — Direct reading of 15+ workflow/command/agent files in the PDE repository. All architectural patterns, conventions, and integration points verified by reading actual source.
- **workflows/list-phase-assumptions.md** — Existing assumptions workflow (5-area analysis structure)
- **workflows/brief.md** — Upstream context injection pattern (Sub-step 2c: IDT/CMP/OPP probe-and-inject)
- **workflows/discuss-phase.md** — Multi-round AskUserQuestion interview pattern
- **workflows/new-project.md** — Project initialization flow with subagent spawning
- **workflows/new-milestone.md** — Milestone initialization flow
- **workflows/execute-phase.md** — Agent spawn prompts with files_to_read pattern
- **bin/lib/tracking.cjs** — Markdown-based state file CRUD pattern (parseStatusTable, file I/O)
- **bin/pde-tools.cjs** — CLI router pattern for new commands

### Secondary (MEDIUM confidence)
- **Claude Code's own memory system** — `.claude/projects/{path}/memory/MEMORY.md` with per-topic files. Confirms markdown-based memory is the established pattern in the Claude ecosystem.

### Tertiary (LOW confidence)
- None — all findings verified against actual codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero external dependencies, all Node.js built-ins, verified against existing codebase
- Architecture: HIGH — every pattern has a direct analog in existing PDE code (discuss-phase, brief.md, tracking.cjs)
- Pitfalls: HIGH — derived from deep reading of actual workflow integration points and execution flow
- Memory system: HIGH — simple append-only markdown, matches tracking.cjs pattern exactly

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable — PDE internal architecture, not external library)
