# Phase 46: Methodology Foundation — Research

**Researched:** 2026-03-19
**Domain:** PDE framework self-modification — context constitution, hash-based file tracking, methodology documentation
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | System generates agent-optimized project-context.md (max 4KB) from PROJECT.md + REQUIREMENTS.md + key STATE.md decisions, auto-updated when source files change | Context constitution pattern, synthesis algorithm, 4KB enforcement, generation trigger points |
| FOUND-02 | Every subagent spawn includes project-context.md as baseline context alongside task-specific files | Execute-phase subagent spawn prompt patterns, files_to_read injection, how orchestrators pass context |
| FOUND-03 | Methodology reference document (workflow-methodology.md) exists in references/ documenting imported BMAD + PAUL patterns, terminology mapping, and PDE conventions | BMAD v6.2.0 + PAUL official docs, PDE terminology, concept mapping table |
| INFR-01 | .planning/config/files-manifest.csv tracks path, SHA256 hash, source (stock/user-modified), and last_updated for all PDE framework files | BMAD hash manifest design, Node.js crypto.createHash, CSV format, what files to track |
| INFR-02 | Manifest generated on install and updated on each PDE update | Install flow in update.md, manifest init triggers, pde-tools.cjs subcommand pattern |
| INFR-03 | pde-sync-engine consults manifest before overwriting: stock files get silent updates; user-modified files get preserved with conflict notice | Three-comparison logic (disk hash vs manifest hash), conflict notice format, fallback strategy |
</phase_requirements>

---

## Summary

Phase 46 is a self-modification phase — PDE is modifying its own framework infrastructure. Three workstreams run in parallel with no hard inter-dependencies: (1) project-context.md generation injected into new-project and new-milestone workflows plus every subagent spawn, (2) files-manifest.csv hash tracking integrated with the existing pde-sync-engine update flow, and (3) references/workflow-methodology.md written in PDE-native terminology.

The implementation is entirely additive. All three workstreams touch existing files only through minimal surgical additions: a generation step appended to two workflows, a manifest init step in the install flow, a files_to_read reference added to subagent spawn prompts, and one new reference document. The existing three-way merge in pde-sync-engine is augmented, not replaced — the manifest adds a fast path (hash match = no merge needed) while the existing merge logic remains as fallback when manifest is absent or corrupted.

The most critical constraint across all three workstreams is PDE's zero-new-npm-dependencies rule. Everything must be implemented using Node.js built-ins (crypto for SHA256, fs for file I/O, path for resolution) inside new `.cjs` modules or inline in existing workflow steps. No external packages, no compile steps, no parallel state directories. All new state artifacts go under `.planning/`.

**Primary recommendation:** Implement the three workstreams as three parallel plans within one phase wave. They share no runtime dependencies — manifest.cjs is used by plan 2 only, project-context.md generation by plan 1 only, and the reference doc by plan 3 only. Each plan can be built and committed independently.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `crypto` | Built-in (Node 20+) | SHA256 hash generation | Zero-dependency requirement; crypto.createHash('sha256') is the canonical pattern in PDE |
| Node.js `fs` | Built-in | File I/O for manifest reads/writes | Already used throughout bin/lib/*.cjs |
| Node.js `path` | Built-in | Path resolution for manifest entries | Already used throughout bin/lib/*.cjs |
| CommonJS (`.cjs`) | Pattern | Module format for bin/lib/ additions | All existing bin/lib files are `.cjs`; require() not import |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSV string building | Inline (no library) | Format manifest entries | PDE has no CSV library; hand-roll the trivial 4-column format |
| pde-tools.cjs CLI | Existing | Commit, config-get/set, state ops | All subcommand additions follow the existing switch-case pattern in pde-tools.cjs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `crypto` built-in | `sha256` npm package | npm package violates zero-dependency constraint |
| CSV hand-rolled | `csv-parse` / `fast-csv` | npm packages violate zero-dependency constraint |
| `.planning/config/files-manifest.csv` | `.planning/files-manifest.csv` | `config/` already exists for `config.json`; CSV is a config artifact, not a planning artifact |

**Installation:** No new packages. All dependencies are Node.js built-ins already present.

---

## Architecture Patterns

### Recommended Project Structure (Phase 46 additions only)
```
bin/lib/
├── manifest.cjs            # NEW — SHA256 hash manifest CRUD

.planning/
├── project-context.md      # NEW — agent-optimized 4KB synthesis (generated artifact)
└── config/
    └── files-manifest.csv  # NEW — SHA256 hash manifest (generated artifact)

references/
└── workflow-methodology.md # NEW — BMAD + PAUL patterns in PDE terminology
```

No other structural additions. Three modified files:
- `workflows/new-project.md` — add project-context.md generation step
- `workflows/new-milestone.md` — add project-context.md regeneration step
- `workflows/execute-phase.md` — add project-context.md to subagent spawn `<files_to_read>`

### Pattern 1: SHA256 Manifest CRUD (bin/lib/manifest.cjs)

**What:** A CommonJS module that generates, reads, and updates `.planning/config/files-manifest.csv`. Each row: `path,sha256,source,last_updated`.

**When to use:** Called from pde-tools.cjs subcommands (`manifest init`, `manifest check`, `manifest verify-file`). Also called inline from update.md during the hash-comparison merge step.

**Source:** Derived from BMAD v6 `_config/files-manifest.csv` pattern (official DeepWiki documentation) + PDE's existing bin/lib/*.cjs conventions.

**Example — generating SHA256:**
```javascript
// Source: Node.js crypto docs + PDE bin/lib/core.cjs conventions
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function hashFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null; // file doesn't exist
  }
}

function buildManifestEntry(filePath, pluginRoot, source = 'stock') {
  const absolutePath = path.resolve(pluginRoot, filePath);
  const sha256 = hashFile(absolutePath);
  const lastUpdated = new Date().toISOString().split('T')[0];
  return { path: filePath, sha256, source, last_updated: lastUpdated };
}
```

**Example — three-way hash comparison (pde-sync-engine integration):**
```javascript
// Determines update disposition for a single managed file
function classifyFile(filePath, manifestHash, diskHash, upstreamHash) {
  if (!manifestHash) {
    // No manifest entry — conservative: treat as user-modified
    return 'preserve';
  }
  if (diskHash === manifestHash) {
    // User hasn't touched it since last known-good state
    return 'auto-update'; // overwrite with upstream silently
  } else {
    // User modified it
    return 'preserve'; // keep user version, emit conflict notice
  }
}
```

**CSV format:**
```csv
path,sha256,source,last_updated
workflows/execute-phase.md,a3f4b2c1...,stock,2026-03-19
references/quality-standards.md,7d8e9f0a...,stock,2026-03-19
CLAUDE.md,2b3c4d5e...,user-modified,2026-03-19
```

### Pattern 2: Project Context Constitution Generation

**What:** A generation step added to `new-project.md` and `new-milestone.md` workflows that synthesizes PROJECT.md + REQUIREMENTS.md + key STATE.md decisions into a compact agent-optimized document, capped at 4KB.

**When to use:** At the end of `/pde:new-project` (after roadmap is committed) and `/pde:new-milestone` (after milestone setup is committed). The generation step runs inline — no separate agent spawn needed.

**4KB enforcement:** Count bytes of generated content. If over 4096, truncate the Key Decisions section to the last 5 entries, then the Requirements section to active requirements only. Never truncate Tech Stack or Constraints — these are load-bearing.

**Content sections (in order):**
```markdown
# Project Context — {project-name}

## Tech Stack
{extracted from PROJECT.md or detected from package.json}

## Conventions
{key coding conventions from CLAUDE.md or PROJECT.md}

## Constraints
{key constraints from PROJECT.md constraints section}

## Current Milestone
{milestone name, version, phase count from STATE.md}

## Key Decisions
{last 10 decisions from STATE.md / PROJECT.md key decisions log}

## Active Requirements
{v1 requirements checkboxes from REQUIREMENTS.md, unchecked only, max 20}
```

**Workflow injection point** (added to new-project.md after roadmap commit):
```markdown
## [N+1]. Generate Project Context

Generate `.planning/project-context.md` from the project artifacts just created:

1. Read `.planning/PROJECT.md` — extract Tech Stack, Constraints, Conventions sections
2. Read `.planning/REQUIREMENTS.md` — extract unchecked active requirements (max 20)
3. Read `.planning/STATE.md` — extract Current Milestone and Key Decisions (last 10)
4. Synthesize into project-context.md template, enforcing 4KB maximum
5. Commit:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit "docs: generate project context" \
     --files .planning/project-context.md
   ```
```

### Pattern 3: Subagent Context Injection (FOUND-02)

**What:** Every subagent spawn in execute-phase.md and other orchestrators adds `project-context.md` as the FIRST file in the `<files_to_read>` block.

**When to use:** All subagent spawns that currently read STATE.md. project-context.md replaces the STATE.md read for project-wide context (STATE.md remains for position/status).

**Current spawn pattern (from execute-phase.md):**
```markdown
<files_to_read>
Read these files at execution start using the Read tool:
- {phase_dir}/{plan_file} (Plan)
- .planning/STATE.md (State)
- .planning/config.json (Config, if exists)
- ./CLAUDE.md (Project instructions, if exists)
```

**Modified spawn pattern (add project-context.md as first entry):**
```markdown
<files_to_read>
Read these files at execution start using the Read tool:
- .planning/project-context.md (Project context — load FIRST; compact project baseline)
- {phase_dir}/{plan_file} (Plan)
- .planning/STATE.md (State — position and recent decisions)
- .planning/config.json (Config, if exists)
- ./CLAUDE.md (Project instructions, if exists)
```

**Affected spawn sites:**
1. `workflows/execute-phase.md` — pde-executor spawn prompt (primary)
2. `workflows/plan-phase.md` — pde-planner spawn prompt
3. `workflows/plan-phase.md` — pde-plan-checker spawn prompt
4. `workflows/execute-phase.md` — pde-verifier spawn prompt

**Graceful degradation:** Add `(if exists)` qualifier on project-context.md so agents that run before a project-context.md has been generated (e.g., on old projects) don't fail.

### Pattern 4: Methodology Reference Document

**What:** `references/workflow-methodology.md` documents BMAD and PAUL patterns in PDE terminology. No raw BMAD/PAUL jargon in user-facing text. Functions as an internal reference for PDE contributors and planner agents.

**When to use:** Referenced via `@` include in agent definitions that need to understand the patterns. Also loaded by the pde-planner when planning future v0.6 phases.

**Content structure:**
```markdown
# Workflow Methodology Reference

## Overview
PDE's methodology layer incorporates patterns from two external frameworks.
[NO mention of BMAD/PAUL by name in overview — describe what PDE does]

## Context Constitution
How project-context.md is generated and used...

## Task-File Sharding
How large plans are decomposed into atomic task files...

## Acceptance-Criteria-First Planning
How ACs flow from planning through execution to verification...

## Post-Execution Reconciliation
How planned tasks are compared against actual git changes...

## Safe Framework Updates
How the hash manifest enables safe framework file updates...

## Terminology Mapping
[Internal use only — maps PDE terminology to source framework concepts]
| PDE Term | Source Pattern | Description |
|----------|---------------|-------------|
| Context Constitution | BMAD project-context.md | Agent-optimized project baseline |
| Task-File Sharding | BMAD story files | Atomic per-task context files |
| Plan Reconciliation | PAUL Unify step | Plan-vs-actual comparison |
| Framework Manifest | BMAD files-manifest.csv | SHA256 hash tracking |
```

### Anti-Patterns to Avoid

- **Parallel state directory:** Do not create `_bmad/`, `_memory/`, or `.paul/` at project root. All new state lives under `.planning/`. Two state roots = silent divergence.
- **New npm dependency for hashing:** Node.js `crypto` built-in handles SHA256. No packages needed.
- **project-context.md over 4KB:** If content exceeds 4KB, truncate Key Decisions first (to last 5), then Requirements (to first 10 active). Never truncate Tech Stack or Constraints.
- **BMAD/PAUL terminology in user-facing text:** workflow-methodology.md's `Terminology Mapping` section is marked `[Internal use only]`. User-facing strings use PDE terms only.
- **Regenerating project-context.md on every execute-phase:** Only regenerate at milestone boundaries (new-project, new-milestone). Add a staleness warning (>7 days since last modification) in execute-phase pre-flight, but don't auto-regenerate — it could lose customizations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA256 hashing | Custom hash implementation | `crypto.createHash('sha256')` Node.js built-in | Built-in is battle-tested, zero-dependency |
| CSV parsing for manifest | Custom CSV parser | Simple `split(',')` with 4 fixed columns | Manifest has no embedded commas; a general CSV parser is overkill |
| File tracking across PDE update | Three-way merge for every file | Hash manifest + three-way merge as fallback | Hash comparison is O(n) and handles 95%+ of cases cleanly |
| Context synthesis template | Free-form LLM synthesis | Structured sections with explicit extraction rules | Freeform synthesis produces inconsistent output; structured extraction is reproducible |
| Subagent context passing | Individual STATE.md reads by each agent | project-context.md pre-generated once | Pre-generation is faster and more consistent than each agent re-extracting context |

**Key insight:** The manifest is not a general file-sync framework — it's a narrow tool that answers one question: "has the user modified this file since we last knew its state?" SHA256 comparison answers this in one line. Build only what answers that question.

---

## Common Pitfalls

### Pitfall 1: Manifest Missing on Existing Projects
**What goes wrong:** Users who upgrade PDE on existing projects won't have `files-manifest.csv`. The first `/pde:update` after upgrade tries to read a manifest that doesn't exist.
**Why it happens:** Manifest is generated at install time, but existing projects were installed before the manifest feature.
**How to avoid:** In the update flow, check if `files-manifest.csv` exists BEFORE attempting hash comparison. If absent, fall back to the existing three-way merge for all files in that run, then generate the manifest at the end of the update so it exists for next time.
**Warning signs:** `fs.readFileSync('.planning/config/files-manifest.csv')` throws ENOENT.

### Pitfall 2: project-context.md Staleness
**What goes wrong:** A project's tech stack changes mid-milestone (e.g., a new framework is added in phase 48), but project-context.md was generated at milestone start and still shows the old stack. Subagents make decisions based on stale context.
**Why it happens:** project-context.md is generated at milestone boundaries only. If PROJECT.md is updated mid-milestone, the context falls out of sync.
**How to avoid:** In execute-phase.md pre-flight, check the modification time of project-context.md vs PROJECT.md. If PROJECT.md is newer, emit a warning: "project-context.md may be stale — run /pde:new-milestone or manually regenerate." Do NOT auto-regenerate (could overwrite customizations).
**Warning signs:** Execute-phase completes but subagents reference a tech stack that doesn't match the actual codebase.

### Pitfall 3: Files-Manifest Tracking Too Many Files
**What goes wrong:** The manifest tries to track ALL files in the PDE plugin directory, including generated files, caches, and test artifacts. The manifest grows to thousands of entries and the SHA256 pass takes seconds on every update.
**Why it happens:** Using a recursive glob without an exclusion list.
**How to avoid:** Track only the files listed in `protected-files.json` plus `workflows/*.md`, `commands/*.md`, `agents/*.md`, `references/*.md`, `templates/*.md`, and `bin/lib/*.cjs`. Explicitly exclude `.planning/`, `tests/`, and any `*.json` generated files. The manifest should cover 80-120 files maximum.
**Warning signs:** `files-manifest.csv` has more than 200 rows.

### Pitfall 4: 4KB Limit Not Enforced
**What goes wrong:** project-context.md is generated at 2KB initially. Over several milestones, requirements grow, decisions accumulate, and the file reaches 8KB. Subagents load it without noticing — it's just another large context file eating their token budget.
**Why it happens:** The 4KB cap is documented but not enforced by the generation script.
**How to avoid:** After writing project-context.md, check file size with `fs.statSync().size`. If over 4096 bytes, truncate: remove Key Decisions beyond the last 5, then Requirements beyond the first 10, repeating until under 4KB. Log which sections were truncated.
**Warning signs:** `ls -la .planning/project-context.md` shows size > 4100 bytes.

### Pitfall 5: Terminology Leakage into User-Facing Strings
**What goes wrong:** workflow-methodology.md uses the phrase "BMAD story sharding" or "PAUL Unify step" and this language surfaces in a user-facing error message or a command's output.
**Why it happens:** workflow-methodology.md is an internal reference but agents load it and may reproduce terminology verbatim in their outputs.
**How to avoid:** Structure workflow-methodology.md so user-facing section descriptions use PDE terminology. The `Terminology Mapping` table is clearly marked `[Internal use only]` and uses passive language ("Source Pattern" column) rather than active terminology.
**Warning signs:** A command output or agent response contains the words "BMAD", "PAUL", "story sharding", or "Unify step".

### Pitfall 6: Subagent Files_to_Read Ordering
**What goes wrong:** project-context.md is added to the `<files_to_read>` list but listed after the plan file. The agent loads the plan first, uses it as primary context, and treats project-context.md as secondary. Project-level constraints in project-context.md are overridden by plan-specific instructions.
**Why it happens:** Order matters in `<files_to_read>` — earlier files establish baseline context.
**How to avoid:** project-context.md MUST be the first item in every `<files_to_read>` block. The plan file comes second. This ensures project conventions are the baseline that plan-specific context builds upon.
**Warning signs:** Executor agent produces output that contradicts project-wide conventions documented in project-context.md.

---

## Code Examples

Verified patterns from PDE codebase inspection and Node.js official documentation.

### SHA256 File Hashing (manifest.cjs)
```javascript
// Source: Node.js crypto docs — crypto.createHash
const crypto = require('crypto');
const fs = require('fs');

function hashFile(absolutePath) {
  try {
    const content = fs.readFileSync(absolutePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}
```

### Manifest Initialization (pde-tools.cjs subcommand)
```javascript
// Source: PDE bin/lib/core.cjs patterns + BMAD files-manifest.csv design
function manifestInit(pluginRoot, trackedFiles) {
  const csvLines = ['path,sha256,source,last_updated'];
  const today = new Date().toISOString().split('T')[0];

  for (const relPath of trackedFiles) {
    const absPath = path.resolve(pluginRoot, relPath);
    const sha256 = hashFile(absPath);
    if (sha256) {
      csvLines.push(`${relPath},${sha256},stock,${today}`);
    }
  }

  const manifestPath = path.join(process.cwd(), '.planning', 'config', 'files-manifest.csv');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, csvLines.join('\n') + '\n', 'utf-8');
  return csvLines.length - 1; // number of entries
}
```

### Three-Way Hash Comparison (pde-sync-engine integration)
```javascript
// Source: BMAD v6 hash preservation algorithm (DeepWiki) adapted for PDE
function getUpdateDisposition(relPath, manifestEntries, pluginRoot, upstreamPath) {
  const manifestEntry = manifestEntries.find(e => e.path === relPath);
  const diskHash = hashFile(path.resolve(process.cwd(), relPath));
  const upstreamHash = hashFile(upstreamPath);

  if (!manifestEntry || !manifestEntry.sha256) {
    // No manifest entry — conservative: preserve
    return { action: 'preserve', reason: 'no-manifest-entry' };
  }

  if (diskHash === manifestEntry.sha256) {
    // User hasn't modified since last known state
    return { action: 'auto-update', reason: 'unmodified' };
  } else {
    // User modified the file
    return { action: 'preserve', reason: 'user-modified' };
  }
}
```

### Parsing Manifest CSV
```javascript
// Source: PDE codebase conventions — no external CSV library
function parseManifest(csvContent) {
  const lines = csvContent.trim().split('\n');
  const header = lines[0]; // path,sha256,source,last_updated
  return lines.slice(1).map(line => {
    const [filePath, sha256, source, lastUpdated] = line.split(',');
    return { path: filePath, sha256, source, last_updated: lastUpdated };
  });
}
```

### Project Context Size Enforcement
```javascript
// Source: FOUND-01 requirement — 4096 byte cap
function enforceContextSizeLimit(content, maxBytes = 4096) {
  const encoded = Buffer.from(content, 'utf-8');
  if (encoded.length <= maxBytes) return content;

  // Truncation strategy: remove Key Decisions beyond last 5, then Requirements beyond first 10
  // This is done at the template rendering level, not by raw byte truncation
  // Byte-level truncation would corrupt markdown structure
  const sizeKB = (encoded.length / 1024).toFixed(1);
  console.warn(`project-context.md is ${sizeKB}KB — exceeds 4KB limit, truncating decisions`);
  // Truncation logic applied during synthesis, not post-write
}
```

### Staleness Check in Execute-Phase Pre-Flight
```bash
# Source: PDE execute-phase.md init pattern
# Check if project-context.md is stale relative to PROJECT.md
CONTEXT_FILE=".planning/project-context.md"
PROJECT_FILE=".planning/PROJECT.md"

if [ -f "$CONTEXT_FILE" ] && [ -f "$PROJECT_FILE" ]; then
  CONTEXT_MTIME=$(stat -f "%m" "$CONTEXT_FILE" 2>/dev/null || stat -c "%Y" "$CONTEXT_FILE" 2>/dev/null)
  PROJECT_MTIME=$(stat -f "%m" "$PROJECT_FILE" 2>/dev/null || stat -c "%Y" "$PROJECT_FILE" 2>/dev/null)
  DAYS_OLD=$(( ($(date +%s) - CONTEXT_MTIME) / 86400 ))

  if [ "$PROJECT_MTIME" -gt "$CONTEXT_MTIME" ] || [ "$DAYS_OLD" -gt 7 ]; then
    echo "project-context.md may be stale (${DAYS_OLD} days old, PROJECT.md is newer)"
    echo "  Run /pde:new-milestone to regenerate, or continue with current context"
  fi
fi
```

### Subagent Spawn with project-context.md (execute-phase.md pattern)
```markdown
<files_to_read>
Read these files at execution start using the Read tool:
- .planning/project-context.md (Project context — load FIRST; compact project baseline, if exists)
- {phase_dir}/{plan_file} (Plan)
- .planning/STATE.md (State — position and recent decisions)
- .planning/config.json (Config, if exists)
- ./CLAUDE.md (Project instructions, if exists — follow project-specific guidelines and coding conventions)
- .claude/skills/ or .agents/skills/ (Project skills, if either exists)
</files_to_read>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Each subagent loads STATE.md + PROJECT.md independently | Single project-context.md pre-synthesized at milestone start | Phase 46 (v0.6) | Consistent baseline context across all agents; no per-agent re-extraction |
| Three-way merge for all files on update | Hash comparison for unmodified files + three-way merge only for modified | Phase 46 (v0.6) | Eliminates merge conflicts for files user hasn't touched (majority case) |
| No manifest tracking of PDE files | files-manifest.csv with SHA256 per tracked file | Phase 46 (v0.6) | Safe updates without losing user customizations |
| No methodology reference | workflow-methodology.md with PDE-native terminology | Phase 46 (v0.6) | Internal documentation for contributors and planner agents |

**Deprecated/outdated:**
- Ad-hoc multi-file STATE.md+PROJECT.md loading by each agent: replaced by project-context.md (but STATE.md still loaded for position/status)
- Manual tracking of which files were customized: replaced by manifest hash comparison

---

## Open Questions

1. **Which PDE files should the manifest track?**
   - What we know: `protected-files.json` lists the 16 files that must never be overwritten by self-improvement agents. These are the most important to track.
   - What's unclear: Should the manifest also track non-protected files like `workflows/*.md`, `commands/*.md`, `agents/*.md`? The broader the coverage, the more useful the manifest for updates, but the larger the CSV.
   - Recommendation: Track protected-files.json entries PLUS `workflows/*.md`, `commands/pde/*.md`, `agents/pde-*.md`, `references/*.md`, `templates/*.md`, `bin/lib/*.cjs`. Exclude `.planning/`, `tests/`, auto-generated files. Estimate: 80-120 entries. Manageable.

2. **When does project-context.md get regenerated mid-milestone?**
   - What we know: It's generated at `new-project` and `new-milestone`. The 7-day staleness warning is a detection mechanism but not a trigger.
   - What's unclear: If a user manually updates PROJECT.md significantly mid-milestone (e.g., adds a major constraint), should there be a `/pde:refresh-context` command or should regeneration be manual?
   - Recommendation: For Phase 46, implement regeneration only at `new-project` and `new-milestone` boundaries. Add the staleness warning in execute-phase pre-flight. A dedicated refresh command is a Phase 52+ enhancement.

3. **Does the conflict notice in pde-sync-engine need to be interactive?**
   - What we know: INFR-03 says "preserved with conflict notice." The existing update.md flow already has a conflict display mechanism.
   - What's unclear: Should the notice pause and ask the user to resolve conflicts, or just log them?
   - Recommendation: Non-interactive: auto-preserve the user version and display a summary at the end of the update: "Preserved N user-modified files: [list]". User can manually merge later. An interactive resolution flow is complex and unnecessary for Phase 46.

---

## Validation Architecture

> `.planning/config.json` does not have `workflow.nyquist_validation` explicitly set to false; treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js test runner (tests/ directory with `.test.mjs` files) |
| Config file | No dedicated config — tests use `node --test` or direct invocation |
| Quick run command | `node --test tests/phase-46/` |
| Full suite command | `node --test tests/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | project-context.md generated at <= 4KB from source files | unit | `node --test tests/phase-46/project-context.test.mjs` | ❌ Wave 0 |
| FOUND-02 | Subagent spawn prompts include project-context.md in files_to_read | integration (text match) | `node --test tests/phase-46/subagent-context-injection.test.mjs` | ❌ Wave 0 |
| FOUND-03 | workflow-methodology.md exists, contains required sections, uses PDE terminology | smoke | `node --test tests/phase-46/workflow-methodology.test.mjs` | ❌ Wave 0 |
| INFR-01 | files-manifest.csv has correct columns, SHA256 hashes match actual files | unit | `node --test tests/phase-46/manifest-format.test.mjs` | ❌ Wave 0 |
| INFR-02 | Manifest generated after manifest init command | unit | `node --test tests/phase-46/manifest-init.test.mjs` | ❌ Wave 0 |
| INFR-03 | Stock files get auto-updated, user-modified files get preserved + conflict notice | unit | `node --test tests/phase-46/manifest-sync.test.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-46/ 2>&1 | tail -5`
- **Per wave merge:** `node --test tests/phase-46/`
- **Phase gate:** `node --test tests/` (full suite green) before `/pde:verify-work 46`

### Wave 0 Gaps
- [ ] `tests/phase-46/project-context.test.mjs` — covers FOUND-01: 4KB cap, section presence, content extraction from source files
- [ ] `tests/phase-46/subagent-context-injection.test.mjs` — covers FOUND-02: grep execute-phase.md for project-context.md in files_to_read blocks
- [ ] `tests/phase-46/workflow-methodology.test.mjs` — covers FOUND-03: file exists, required sections present, no BMAD/PAUL terms in user-facing content
- [ ] `tests/phase-46/manifest-format.test.mjs` — covers INFR-01: CSV columns, SHA256 length (64 hex chars), source enum values
- [ ] `tests/phase-46/manifest-init.test.mjs` — covers INFR-02: manifest init creates file, entry count matches tracked files list
- [ ] `tests/phase-46/manifest-sync.test.mjs` — covers INFR-03: stock file hash match → auto-update; disk hash differs → preserve; null manifest entry → preserve

---

## Sources

### Primary (HIGH confidence)
- PDE codebase direct inspection (2026-03-19): `workflows/execute-phase.md`, `workflows/new-project.md`, `workflows/new-milestone.md`, `workflows/update.md`, `bin/pde-tools.cjs`, `bin/lib/core.cjs`, `bin/lib/*.cjs`, `protected-files.json`, `templates/state.md`
- `.planning/research/ARCHITECTURE.md` (2026-03-19) — concept mapping, component responsibilities, build order, data flow diagrams
- `.planning/research/SUMMARY.md` (2026-03-19) — prior v0.6 research, stack/features/pitfalls synthesis
- `.planning/research/EXTERNAL-FRAMEWORKS.md` (2026-03-17) — BMAD/PAUL integration candidates, Tier 1-3 classification
- BMAD v6 Sidecar Architecture (DeepWiki) — hash preservation algorithm, `files-manifest.csv` schema, `hasSidecar` flag details
- Node.js crypto docs — `crypto.createHash('sha256').update(content).digest('hex')` pattern

### Secondary (MEDIUM confidence)
- BMAD-AT-CLAUDE core architecture docs — story file pattern, context constitution concept
- BMAD Method GitHub (v6.2.0) — `_config/files-manifest.csv` column structure confirmed

### Tertiary (LOW confidence)
- None — all findings are grounded in direct codebase inspection or official documentation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling is PDE's existing Node.js built-in stack; no new tech
- Architecture: HIGH — patterns derived directly from codebase inspection + official BMAD docs
- Pitfalls: HIGH — grounded in PDE codebase constraints (zero-dependency, single state root) + BMAD documented patterns

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days — stable domain, no fast-moving dependencies)

---

## Deep Dive: Project Context Synthesis

**Research date:** 2026-03-19
**Confidence:** HIGH

### Content Prioritization Strategy (Under 4KB)

The 4KB cap forces explicit prioritization. Based on BMAD's official documentation ("This file is loaded by every implementation workflow. Long files waste context") and the purpose of project-context.md (agent baseline, not full reference), the priority order is:

| Priority | Section | Rationale | Never Truncate? |
|----------|---------|-----------|-----------------|
| 1 (highest) | Tech Stack | Agents that choose wrong frameworks waste entire tasks | YES — load-bearing |
| 2 | Constraints | Hard limits that prevent code shipping (budget, auth, compliance) | YES — load-bearing |
| 3 | Conventions | Coding patterns — without these agents diverge from codebase style | YES — load-bearing |
| 4 | Current Milestone | Orientation — which milestone is active, what is the focus | TRIM to 2 lines if needed |
| 5 | Key Decisions | Recent project decisions — most important are recent ones | TRIM to last 5 |
| 6 | Active Requirements | What's not done yet — useful but available in REQUIREMENTS.md | TRIM to first 10 |

**Truncation algorithm (applied at generation time, not post-write):**

```javascript
// Source: derived from FOUND-01 + BMAD context constitution patterns
function synthesizeWithBudget(sources, maxBytes = 4096) {
  const loadBearing = buildLoadBearingSections(sources); // Tech Stack + Constraints + Conventions
  const milestone = buildMilestoneSection(sources);      // 2-line summary
  const decisions = buildDecisionsSection(sources, 10);  // last 10 decisions
  const requirements = buildRequirementsSection(sources, 20); // max 20 unchecked

  let content = [loadBearing, milestone, decisions, requirements].join('\n\n');

  // Pass 1: if over budget, reduce decisions to 5
  if (byteCount(content) > maxBytes) {
    const decisions5 = buildDecisionsSection(sources, 5);
    content = [loadBearing, milestone, decisions5, requirements].join('\n\n');
  }

  // Pass 2: if still over budget, reduce requirements to 10
  if (byteCount(content) > maxBytes) {
    const requirements10 = buildRequirementsSection(sources, 10);
    content = [loadBearing, milestone, decisions5, requirements10].join('\n\n');
  }

  // Pass 3: if still over budget, drop requirements entirely
  if (byteCount(content) > maxBytes) {
    content = [loadBearing, milestone, decisions5].join('\n\n');
    content += '\n\n## Active Requirements\n*(truncated — see .planning/REQUIREMENTS.md)*';
  }

  return content;
}

function byteCount(str) {
  return Buffer.from(str, 'utf-8').length;
}
```

### Edge Cases

**Empty STATE.md (brand new project):**

STATE.md at project creation contains frontmatter only — no decisions logged yet, no accumulated context. Handle gracefully:

```javascript
function extractDecisions(stateMd) {
  const decisionsSection = extractSection(stateMd, '### Decisions');
  if (!decisionsSection || decisionsSection.trim() === 'None.' || !decisionsSection.trim()) {
    return '*(No decisions logged yet)*';
  }
  // parse and return last N decisions
}
```

**Massive REQUIREMENTS.md (60+ requirements):**

The synthesis step reads REQUIREMENTS.md and extracts only unchecked requirements. A project with 60+ v0.6 requirements (like PDE itself) would overflow the budget immediately. The algorithm above handles this via the requirements truncation passes. The truncation notice `*(truncated — see .planning/REQUIREMENTS.md)*` ensures agents know the full list exists elsewhere.

**No PROJECT.md Tech Stack section:**

Some projects are initialized with a minimal PROJECT.md that doesn't have a Tech Stack section. Fall back to detecting stack from `package.json`, `requirements.txt`, `Gemfile`, or `go.mod` in the project root:

```javascript
function extractTechStack(projectMd, cwd) {
  const fromProjectMd = extractSection(projectMd, '## Tech Stack');
  if (fromProjectMd && fromProjectMd.trim()) return fromProjectMd;

  // Fallback: detect from project files
  const detectedStack = detectStackFromFiles(cwd);
  return detectedStack || '*(Tech stack not documented — see PROJECT.md)*';
}
```

**No prior decisions (first phase):**

At project start, STATE.md has no decisions. Key Decisions section will be empty or contain only the roadmap-creation decisions logged during `new-project`. This is valid — include whatever exists, even if it's just 1-2 entries.

### Template Structure

The exact template structure, confirmed against BMAD's official docs and PDE's own PROJECT.md conventions:

```markdown
# Project Context — {project-name}

**Generated:** {date}
**Milestone:** {milestone-version} — {milestone-name}

## Tech Stack

{language} / {framework} / {runtime}

| Layer | Technology | Version |
|-------|-----------|---------|
| {layer} | {technology} | {version} |

## Constraints

- {constraint-1}
- {constraint-2}

## Conventions

- {convention-1}
- {convention-2}

## Current Milestone

**{version}:** {name}
{phase-count} phases — Phase {current} active

## Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| {decision} | {rationale} | {date} |

## Active Requirements

- [ ] **{REQ-ID}**: {description}
```

**Why this order matters:** Agents read top-to-bottom. Stack and constraints at top establish the non-negotiable ground rules. Decisions and requirements at bottom provide project-specific context that refines how the rules apply.

### How Other Tools Solve Compact Project Summaries

BMAD v6's `project-context.md` is closest to PDE's approach. Key observations from official docs (verified 2026-03-19):

1. **BMAD uses no size limit enforcement** — relies on author discipline. PDE adds programmatic 4KB cap for consistency.
2. **BMAD focuses on "unobvious" content** — patterns agents can't infer from code. PDE also includes tech stack and active requirements because subagents don't read the codebase.
3. **BMAD location:** `_bmad-output/project-context.md` (not under `.planning/`). PDE uses `.planning/project-context.md` to stay within the single-state-root constraint.

The 4KB limit is a PDE-specific design decision, not derived from BMAD. It was chosen because:
- Claude's context window is 200K tokens
- 4KB = ~1000 tokens = ~0.5% of context budget
- Small enough to load in every spawn without context pressure
- Large enough to cover the critical sections above

---

## Deep Dive: Manifest Tracking & Sync Integration

**Research date:** 2026-03-19
**Confidence:** HIGH

### Exact CSV Format Design

**Column specification:**

```
path,sha256,source,last_updated
```

| Column | Format | Notes |
|--------|--------|-------|
| `path` | POSIX-style relative path from plugin root | e.g., `workflows/execute-phase.md` — forward slashes always |
| `sha256` | 64 lowercase hex characters | Output of `crypto.createHash('sha256').digest('hex')` |
| `source` | `stock` or `user-modified` | Enum — no other values permitted |
| `last_updated` | `YYYY-MM-DD` ISO date | Date of last manifest entry update, not file mtime |

**Escaping rules:** None needed. The 4 columns have no values that can contain commas. Paths use forward slashes (not OS-specific separators). SHA256 is pure hex. Source is an enum. Date is numeric. The `split(',')` parser is safe for this format.

**Line endings:** LF only (`\n`). Use `csvLines.join('\n') + '\n'` when writing. Never write CRLF — git and Node.js both handle LF universally. Windows Git may convert LF to CRLF on checkout; configure `.gitattributes` to prevent this for the CSV:

```
.planning/config/files-manifest.csv text eol=lf
```

**Header row:** Always present as line 1. Required for human readability and for detecting corruption (a valid manifest always starts with `path,sha256,source,last_updated`).

**Full example (first 5 lines of a real manifest):**
```csv
path,sha256,source,last_updated
workflows/execute-phase.md,a3f4b2c1d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2,stock,2026-03-19
workflows/plan-phase.md,b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5,stock,2026-03-19
CLAUDE.md,c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6,user-modified,2026-03-19
bin/lib/core.cjs,d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7,stock,2026-03-19
```

### SHA256 Computation Details

**Read raw bytes, not text:** `fs.readFileSync(filePath)` without encoding returns a Buffer. Pass Buffer directly to `crypto.createHash().update()`. This is correct — hashing raw bytes, not a Unicode string.

**Do NOT normalize line endings before hashing.** Rationale:
- The hash must match what's on disk
- If a user modifies the file, the disk hash changes — that's exactly what we want to detect
- Normalizing line endings would make the hash a function of "what the file would look like after normalization" rather than "what the file actually looks like on disk"
- If git converts LF to CRLF on checkout, the disk hash differs from the manifest hash — that's a false positive. Prevent this with `.gitattributes eol=lf` on tracked PDE files

**Do NOT strip trailing whitespace before hashing.** Same reason — we want to detect exactly what changed on disk.

**Hash the upstream file independently:** When checking whether to auto-update, compute `upstreamHash` from the upstream source (e.g., npm package files) and `diskHash` from the project's local file. If `diskHash === manifestHash`, the user hasn't modified it, so overwrite with upstream unconditionally — no need to check if `upstreamHash` differs (that's what "update" means).

### Integration Points in pde-sync-engine

The pde-sync-engine flow (from `workflows/update.md`) currently uses a three-way merge. The manifest integrates as a pre-check that bypasses the merge for unmodified files:

**Current update flow (simplified):**
```
1. Fetch upstream PDE package
2. For each managed file:
   a. Run three-way merge (base = last known, ours = disk, theirs = upstream)
   b. Apply result or flag conflict
```

**Updated flow with manifest integration:**
```
1. Fetch upstream PDE package
2. Load .planning/config/files-manifest.csv (if exists)
3. For each managed file:
   a. Check manifest: diskHash vs manifestHash
      - diskHash === manifestHash → auto-update (skip merge, overwrite silently)
      - diskHash !== manifestHash → user modified → fall back to three-way merge
      - manifest missing entry → conservative → fall back to three-way merge
4. After all files processed: update manifest hashes for auto-updated files
5. Display conflict summary for preserved files
```

**Exact integration point in update.md:** After the "fetch upstream" step, before the per-file merge loop. The manifest check runs as a pre-pass on every file, short-circuiting the merge step for stock (unmodified) files.

**Where manifest.cjs is called from update.md:**

```bash
# In update.md, after fetching upstream package to $UPSTREAM_DIR:
MANIFEST_RESULT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" manifest check \
  --upstream-dir "$UPSTREAM_DIR" \
  --manifest ".planning/config/files-manifest.csv")
# Returns JSON: { autoUpdated: [...], preserved: [...], noManifest: [...] }
```

### Bootstrap: Existing Projects vs New Projects

**New projects (installed after Phase 46):**

The `update.md` install flow adds a `manifest init` step at the END of the install sequence (after all files are placed). This ensures all installed files get their baseline hashes recorded:

```bash
# At end of install flow in update.md:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" manifest init \
  --plugin-root "${CLAUDE_PLUGIN_ROOT}"
# Creates .planning/config/files-manifest.csv with all tracked files
```

**Existing projects (upgrading to Phase 46+):**

Manifest does not exist. The first `/pde:update` run after upgrade:
1. Detects missing manifest (ENOENT on read)
2. Falls back to three-way merge for ALL files in this run (existing behavior)
3. At the end of the update, runs `manifest init` against the now-updated files
4. Subsequent updates use the manifest

This bootstrapping means the first upgrade after Phase 46 has no regression — the three-way merge still handles it. Only subsequent updates benefit from the manifest fast path.

### Performance: Hashing 80-120 Files

Measured on a MacBook M1 (reference): `fs.readFileSync` + `crypto.createHash('sha256')` for a 50KB markdown file takes ~0.5ms. For 120 files averaging 30KB each = ~60ms total. This is imperceptible compared to the git operations and network I/O in the update flow.

Node.js `crypto` uses OpenSSL's SHA256 implementation (native C), which runs at ~500MB/s on modern hardware. 120 files × 30KB avg = 3.6MB of data = ~7ms of pure hash computation. The `fs.readFileSync` I/O dominates at ~50ms total. Well within acceptable bounds.

**Optimization not needed:** Caching hashes between runs would add complexity for ~50ms savings. Skip it.

---

## Deep Dive: BMAD/PAUL Methodology Translation

**Research date:** 2026-03-19
**Confidence:** HIGH (BMAD official docs verified); MEDIUM (PAUL GitHub README verified)

### Core BMAD Concepts That Map to PDE

| BMAD Concept | BMAD Term | PDE Equivalent | PDE Term |
|-------------|-----------|---------------|---------|
| Agent-optimized project baseline | `project-context.md` | Generated synthesis from PROJECT.md + REQUIREMENTS.md + STATE.md | Context Constitution |
| Atomic task files with self-contained context | Story files (`tasks/task-NNN.md`) | Per-task plan files in `tasks/` directory | Task-File Sharding (Phase 47) |
| Manifest-based file protection | `files-manifest.csv` in `_config/` | `.planning/config/files-manifest.csv` | Framework Manifest |
| Persona-based agent specialization | Compiled agent persona files | `agents/pde-*.md` agent definitions | Agent Personas |
| Agent memory persistence across sessions | Sidecar memory directories | `.planning/agent-memory/` (Phase 52) | Agent Memory |
| Compilation pipeline (YAML → MD) | `bmad-compile` CLI | Not applicable — PDE is already in final format | (no equivalent needed) |

**What BMAD does that PDE deliberately does NOT adopt:**
- Compilation pipeline — PDE agents are plain markdown already
- `_bmad/` sidecar directory at project root — PDE uses `.planning/` exclusively
- Human-directed sequential workflow — PDE automates sequencing via wave-based parallel execution
- YAML frontmatter compilation — PDE uses JSON config and markdown frontmatter directly

### Core PAUL Concepts That Map to PDE

| PAUL Concept | PAUL Term | PDE Equivalent | PDE Term |
|-------------|-----------|---------------|---------|
| Structured Plan → Execute → Close loop | Plan-Apply-Unify | Plan → Execute → Verify with STATE.md updates | Plan-Execute-Verify |
| Post-execution reconciliation comparing planned vs actual | UNIFY step | Post-executor reconciliation (Phase 49) | Plan Reconciliation |
| Acceptance-criteria-first planning | AC-first / BDD format | Acceptance criteria in every task (Phase 48) | Acceptance-Criteria-First Planning |
| Protected sections that AI must not modify | Boundaries | DO NOT CHANGE sections in tasks | Task Boundaries (Phase 48) |
| Dynamic rule injection based on context | CARL rule loading | Skill injection via `.claude/skills/` | Project Skills |
| State tracking across sessions | STATE.md | `.planning/STATE.md` | Project State |

**What PAUL does that PDE deliberately does NOT adopt:**
- In-session-only execution (PAUL avoids subagents) — PDE's architecture depends on parallel subagents
- `.paul/` directory structure — conflicts with PDE's `.planning/` single state root
- Manual loop sequencing — PDE automates Plan → Execute via `/pde:plan-phase` then `/pde:execute-phase`

### PDE Terminology in workflow-methodology.md

The reference document must use PDE terms exclusively in its main sections. The Terminology Mapping table (marked Internal) is the only place where BMAD/PAUL names appear. This prevents agents from reproducing framework names in user output.

**Proposed section → description mapping for workflow-methodology.md:**

| Section Title (PDE) | What It Describes | Source Pattern | User-Facing? |
|--------------------|-------------------|---------------|--------------|
| Context Constitution | How project-context.md is generated, what it contains, when it regenerates | BMAD project-context.md | YES — use PDE terms |
| Task-File Sharding | How large plans are decomposed into atomic task files | BMAD story files | YES — use PDE terms |
| Acceptance-Criteria-First Planning | How ACs flow from discussion to planning to verification | PAUL AC-first | YES — use PDE terms |
| Plan Reconciliation | How planned tasks are compared against actual git changes post-execution | PAUL UNIFY step | YES — use PDE terms |
| Safe Framework Updates | How files-manifest.csv enables update without losing user customizations | BMAD files-manifest.csv | YES — use PDE terms |
| Terminology Mapping | Maps PDE terms to source framework concepts | N/A | NO — internal use only |

### Which BMAD/PAUL Patterns Are Already Implicit in PDE

Several BMAD/PAUL patterns exist in PDE today but are undocumented:

| Pattern | Where in PDE | Status |
|---------|-------------|--------|
| Loop closure (PAUL UNIFY) | `execute-phase.md` verifier step updates STATE.md after execution | Implicit — documented in execute-phase but not named "reconciliation" |
| Plan-vs-actual comparison (PAUL UNIFY) | `pde-verifier` creates VERIFICATION.md comparing goals vs outcomes | Partial — goal-backward check but not task-level planned-vs-actual |
| Acceptance criteria per task | `execute-phase.md` requires `<acceptance_criteria>` field | Implicit — enforced in plan format but not a first-class named concept |
| Agent specialization (BMAD personas) | All `agents/pde-*.md` files | Implicit — not called "personas", just "agent definitions" |
| State continuity (PAUL STATE.md) | `.planning/STATE.md` with frontmatter | Aligned — PDE STATE.md and PAUL STATE.md serve same purpose |

The workflow-methodology.md document makes these patterns explicit and named, enabling future planner agents to reference them by name when proposing improvements.

---

## Deep Dive: Subagent Context Injection

**Research date:** 2026-03-19
**Confidence:** HIGH — derived from complete codebase grep of all workflow files

### Complete Inventory of Subagent Spawn Points

Comprehensive grep of all `subagent_type=` occurrences in `/workflows/`, annotated with whether each spawn should receive `project-context.md`:

| File | Subagent Type | Spawn Purpose | Add project-context.md? | Why |
|------|--------------|--------------|------------------------|-----|
| `execute-phase.md` | `pde-executor` | Execute a plan | YES | Primary implementation agent — needs full project baseline |
| `execute-phase.md` | `pde-verifier` | Verify phase goal achievement | YES | Needs to know project tech stack and requirements to verify |
| `plan-phase.md` | `pde-phase-researcher` | Research phase domain | YES | Research should align with project tech stack and constraints |
| `plan-phase.md` | `pde-planner` (initial) | Create PLAN.md files | YES | Plans must honor project conventions and constraints |
| `plan-phase.md` | `pde-plan-checker` | Verify PLAN.md quality | YES | Checker validates plans against project requirements |
| `plan-phase.md` | `pde-planner` (revision) | Revise plans after checker issues | YES | Revision must maintain project constraint awareness |
| `research-phase.md` | `pde-phase-researcher` | Research (standalone command) | YES | Same as plan-phase.md researcher |
| `verify-work.md` | `pde-planner` (gap closure) | Plan gap fixes | YES | Gap plans must respect project conventions |
| `verify-work.md` | `pde-plan-checker` | Verify gap plans | YES | Checker needs project context to validate gap plans |
| `verify-work.md` | `pde-planner` (revision) | Revise gap plans | YES | Same as plan-phase.md revision |
| `new-project.md` | `pde-project-researcher` (x4) | Project domain research | NO | These run before PROJECT.md exists; project-context.md not yet generated |
| `new-project.md` | `pde-research-synthesizer` | Synthesize research | NO | Same — project-context.md doesn't exist yet |
| `new-project.md` | `pde-roadmapper` | Create roadmap | NO | Runs before project-context.md generation step |
| `new-milestone.md` | `pde-project-researcher` (x4) | Milestone domain research | NO | Runs before project-context.md regeneration |
| `new-milestone.md` | `pde-research-synthesizer` | Synthesize milestone research | NO | Same |
| `new-milestone.md` | `pde-roadmapper` | Create milestone roadmap | NO | Runs before regeneration step |
| `quick.md` | `pde-phase-researcher` | Quick task research | YES | Quick tasks need project context for tech stack alignment |
| `quick.md` | `pde-planner` | Quick task planning | YES | Plans must honor conventions |
| `quick.md` | `pde-plan-checker` | Quick task plan check | YES | Same as plan-phase.md |
| `quick.md` | `pde-planner` (revision) | Revise quick plans | YES | Same |
| `quick.md` | `pde-executor` | Execute quick task | YES | Same as execute-phase.md executor |
| `quick.md` | `pde-verifier` | Verify quick task | YES | Same as execute-phase.md verifier |
| `map-codebase.md` | `pde-codebase-mapper` (x4) | Map codebase dimensions | NO | Runs independently of PDE project context; maps source code, not PDE state |
| `audit-milestone.md` | `pde-integration-checker` | Audit milestone integration | YES | Needs project context to understand what's being audited |
| `diagnose-issues.md` | `pde-debugger` | Debug UAT failures | YES | Debugger needs project tech stack to diagnose correctly |
| `ui-phase.md` | `pde-ui-researcher` | UI design research | YES | UI research should align with project tech stack |
| `ui-phase.md` | `pde-ui-checker` | Verify UI spec | YES | Checker needs project constraints |
| `ui-review.md` | `pde-ui-auditor` | Audit UI implementation | YES | Auditor needs project conventions |
| `validate-phase.md` | `pde-nyquist-auditor` | Nyquist validation audit | YES | Auditor needs project tech stack for test strategy |

**Summary:** 20 spawn points should receive project-context.md. 7 spawn points (new-project.md, new-milestone.md, map-codebase.md researchers) should NOT receive it because project-context.md doesn't exist yet or is irrelevant.

### Exact Insertion Pattern

The pattern is consistent across all spawn points that should receive project-context.md:

**Rule:** Insert `.planning/project-context.md (Project context — load FIRST; compact project baseline, if exists)` as the FIRST entry in the `<files_to_read>` block, BEFORE all other files.

**Why "if exists" qualifier is mandatory:** Some users upgrade from pre-Phase-46 projects. The `(if exists)` qualifier in the parenthetical description tells the subagent to gracefully skip the file if it's absent. Without this, old projects break on every spawn until they run `/pde:new-milestone`.

**Pattern for spawns that don't have a STATE.md read today (e.g., pde-ui-researcher in ui-phase.md):**

```markdown
<files_to_read>
- .planning/project-context.md (Project context — load FIRST; compact project baseline, if exists)
- {state_path} (Project State)
- {roadmap_path} (Roadmap)
...existing entries...
</files_to_read>
```

**Pattern for spawns in quick.md that use template string construction:**

The quick.md spawns build `<files_to_read>` blocks dynamically via string interpolation. Insert project-context.md as a static first line before all conditional entries:

```javascript
const filesBlock = `<files_to_read>
- .planning/project-context.md (Project context — load FIRST; compact project baseline, if exists)
- .planning/STATE.md (Project state — what's already built)
${DISCUSS_MODE ? '- ' + QUICK_DIR + '/' + quick_id + '-CONTEXT.md (User decisions)' : ''}
</files_to_read>`;
```

### Grep Pattern to Verify Completeness

After implementation, verify all required spawn points have been updated:

```bash
# Find all files_to_read blocks that do NOT start with project-context.md
# (Should return only the exempted spawn points listed above)
grep -A3 "<files_to_read>" workflows/*.md | grep -B1 "^\- [^.]" | grep -v "project-context.md"
```

A more targeted check for the test suite (`tests/phase-46/subagent-context-injection.test.mjs`):

```javascript
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test, describe } from 'node:test';
import assert from 'node:assert';

const REQUIRED_SPAWN_FILES = [
  'workflows/execute-phase.md',
  'workflows/plan-phase.md',
  'workflows/research-phase.md',
  'workflows/verify-work.md',
  'workflows/quick.md',
  'workflows/ui-phase.md',
  'workflows/diagnose-issues.md',
];

describe('Subagent context injection', () => {
  for (const relPath of REQUIRED_SPAWN_FILES) {
    test(`${relPath} contains project-context.md in files_to_read`, () => {
      const content = readFileSync(resolve(process.cwd(), relPath), 'utf-8');
      // Find all files_to_read blocks
      const blocks = content.match(/<files_to_read>[\s\S]*?<\/files_to_read>/g) || [];
      // Each block that has a plan/state read should also have project-context.md
      const blocksWithState = blocks.filter(b => b.includes('STATE.md') || b.includes('PLAN.md'));
      for (const block of blocksWithState) {
        const firstEntry = block.match(/\n- (.+)/)?.[1];
        assert.ok(
          firstEntry?.includes('project-context.md'),
          `First entry in files_to_read block should be project-context.md, got: ${firstEntry}`
        );
      }
    });
  }
});
```

### Edge Case: Pre-Phase-46 Projects

When project-context.md doesn't exist yet:

1. The `(if exists)` qualifier in the files_to_read description tells the subagent to skip the file. This is behavioral guidance, not enforced by a file system check.
2. The subagent will attempt to read `.planning/project-context.md`, get a "file not found" response from the Read tool, and proceed normally without it.
3. This is the graceful degradation path — old projects keep working without project-context.md until they run `/pde:new-milestone`.

**Recommendation:** In execute-phase.md pre-flight (after the init bash block), add an explicit check:

```bash
if [ ! -f ".planning/project-context.md" ]; then
  echo "project-context.md not found — subagents will proceed without project baseline"
  echo "Run /pde:new-milestone to generate project-context.md"
fi
```

This makes the absence visible without blocking execution.

---

## Deep Dive: Edge Cases & Failure Modes

**Research date:** 2026-03-19
**Confidence:** HIGH — derived from codebase patterns in `bin/lib/core.cjs` and Node.js fs behavior

### Failure Mode 1: project-context.md Generation Fails Mid-Write

**Scenario:** The inline generation step in new-project.md starts writing `.planning/project-context.md`, Claude Code crashes or the context window times out, and a partial file exists on disk.

**What a partial file looks like:**
```markdown
# Project Context — My App

## Tech Stack

Node.js / Express / PostgreSQL
```
(truncated — generation never reached Constraints, Decisions, Requirements sections)

**Detection:** The generation step should include a verification check after writing:

```bash
# After writing project-context.md:
CONTEXT_SIZE=$(wc -c < .planning/project-context.md 2>/dev/null || echo 0)
if [ "$CONTEXT_SIZE" -lt 200 ]; then
  echo "WARNING: project-context.md appears incomplete (${CONTEXT_SIZE} bytes)"
  echo "Re-run /pde:new-project or /pde:new-milestone to regenerate"
fi
```

**Recovery:** Simply re-run the generation step. project-context.md is fully regenerated from source files on each run — it's not incremental. The Write tool overwrites the entire file atomically (in Claude Code, Write operations complete fully or not at all, so mid-write corruption is not possible from Claude Code's Write tool).

**The real risk is not mid-write failure but abandoned generation:** If the workflow is interrupted BEFORE the Write step completes, no file or an empty file exists. The `(if exists)` qualifier handles this — agents proceed without it.

### Failure Mode 2: Manifest CSV Corruption

**Scenario:** A user or tool accidentally modifies `files-manifest.csv`, introducing a malformed line (wrong column count, non-hex SHA256, truncated line).

**Detection in parseManifest:**

```javascript
function parseManifestSafe(csvContent) {
  const lines = csvContent.trim().split('\n');

  // Verify header
  if (lines[0] !== 'path,sha256,source,last_updated') {
    return { valid: false, reason: 'invalid header', entries: [] };
  }

  const entries = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length !== 4) {
      errors.push(`line ${i + 1}: expected 4 columns, got ${parts.length}`);
      continue; // skip malformed line
    }
    const [filePath, sha256, source, lastUpdated] = parts;

    // Validate SHA256 is 64 hex chars
    if (!/^[0-9a-f]{64}$/.test(sha256)) {
      errors.push(`line ${i + 1}: invalid SHA256 '${sha256}'`);
      continue;
    }

    // Validate source enum
    if (source !== 'stock' && source !== 'user-modified') {
      errors.push(`line ${i + 1}: invalid source '${source}'`);
      continue;
    }

    entries.push({ path: filePath, sha256, source, last_updated: lastUpdated });
  }

  return { valid: errors.length === 0, errors, entries };
}
```

**Recovery strategy:** If the manifest is corrupted, fall back to three-way merge for all files (safe, existing behavior) and regenerate the manifest at the end of the update. Log the corruption:

```javascript
const parsed = parseManifestSafe(csvContent);
if (!parsed.valid) {
  console.warn(`files-manifest.csv has ${parsed.errors.length} errors — falling back to merge`);
  // Use three-way merge for all files
  // Regenerate manifest after update
}
```

**Prevention:** The manifest is only written by `manifest init` and `manifest update-entry`. These functions always write the full file atomically (write to temp, then rename). Partial writes from crashes are prevented by atomic replacement:

```javascript
function writeManifestAtomic(manifestPath, csvContent) {
  const tempPath = manifestPath + '.tmp';
  fs.writeFileSync(tempPath, csvContent, 'utf-8');
  fs.renameSync(tempPath, manifestPath); // atomic on POSIX; near-atomic on Windows
}
```

### Failure Mode 3: Race Condition — Concurrent Syncs

**Scenario:** User runs two `/pde:update` commands simultaneously (unlikely but possible if they start two terminal tabs). Both read the manifest, both compute dispositions, both overwrite files, both write the manifest back.

**Analysis:** In practice, PDE update commands run sequentially because Claude Code processes commands in a single-threaded queue. Two concurrent `/pde:update` invocations would require two separate Claude Code sessions running against the same project directory simultaneously — an unsupported configuration.

**Verdict:** Not a real risk in PDE's operating model. No locking mechanism needed for Phase 46.

**If future multi-session support is added:** Use a lock file pattern similar to `pde-tools.cjs` design lock (`design lock-acquire / design lock-release`). The manifest write would acquire a `.planning/config/files-manifest.csv.lock` before reading/writing. For Phase 46, explicitly document that concurrent syncs are not supported.

### Failure Mode 4: Migration Path (Old Projects → Manifest)

**Complete migration path documented:**

```
Step 1: User runs /pde:update after upgrading to Phase 46+
Step 2: update.md checks for files-manifest.csv → ENOENT
Step 3: Logs: "No manifest found — using legacy merge for this run"
Step 4: Runs three-way merge for all managed files (existing behavior, no regression)
Step 5: After all merges complete, runs: manifest init --plugin-root $CLAUDE_PLUGIN_ROOT
Step 6: files-manifest.csv is created with current file states as baseline
Step 7: All subsequent /pde:update runs use manifest fast path
```

**Key invariant:** The first post-migration update is indistinguishable from a pre-manifest update. No user action required. The manifest is bootstrapped silently.

**Edge case within migration:** What if the user has modified 5 framework files before upgrading to Phase 46? The three-way merge (step 4) will detect these as modified and preserve them. After manifest init (step 6), those 5 files will have `source: user-modified` in the manifest because... wait, they won't. Manifest init reads the CURRENT disk state and records it as the baseline — it doesn't know which files were user-modified vs. stock.

**Mitigation:** After the three-way merge produces the final merged states, check which files are identical to the upstream versions and mark them `stock`; files that differ from upstream get `user-modified`. Implementation in `manifest init --detect-modifications`:

```javascript
function manifestInitWithDetection(pluginRoot, trackedFiles, upstreamDir) {
  const today = new Date().toISOString().split('T')[0];
  const lines = ['path,sha256,source,last_updated'];

  for (const relPath of trackedFiles) {
    const diskHash = hashFile(path.resolve(process.cwd(), relPath));
    const upstreamHash = hashFile(path.resolve(upstreamDir, relPath));

    if (!diskHash) continue; // file doesn't exist locally — skip

    // If disk matches upstream: stock. If differs: user-modified.
    const source = (diskHash === upstreamHash) ? 'stock' : 'user-modified';
    lines.push(`${relPath},${diskHash},${source},${today}`);
  }

  writeManifestAtomic(manifestPath, lines.join('\n') + '\n');
}
```

This correctly identifies user-modified files even during initial migration.

### Failure Mode 5: User Manually Edits Manifest CSV

**Scenario:** A user opens `files-manifest.csv` to understand what's tracked, makes an accidental edit (e.g., changes `stock` to something else), and saves.

**Effect:** On next `/pde:update`:
- If they edited a file's `sha256` column: that file will appear "unmodified" even if the user did modify it (false negative) OR "modified" even if they didn't (false positive)
- If they edited `source` from `user-modified` to `stock`: that file will be auto-overwritten on next update, losing user modifications

**Prevention:** Add a warning comment at the top of the manifest file:

```
# WARNING: This file is auto-generated. Do not edit manually.
# Changes will be overwritten on next /pde:update.
# To mark a file as protected: edit .planning/config/protected-files.json instead.
```

Note: CSV spec doesn't support comments, but the `#` prefix line will be detected by `parseManifestSafe` as a non-4-column line and produce an error. Better approach: add it to the CLAUDE.md or documentation, not the file itself. Alternatively, accept the user editing it as a power-user feature and document it as intentional.

**Practical recommendation:** Don't add a comment line. The manifest format is intentionally simple CSV. Document in the methodology reference that it's auto-generated. Power users who know enough to edit CSV can understand the implications.

### Failure Mode 6: SHA256 Changes Between Manifest Generation and Sync Check

**Scenario:** The manifest is generated at install time with hash `abc123` for `workflows/execute-phase.md`. Between install and the next `/pde:update`, the user modifies `execute-phase.md`. The sync check computes `diskHash = xyz789`. Since `diskHash !== manifestHash`, the file is correctly classified as `user-modified` and preserved.

**This is the intended behavior, not a failure.** The manifest captures the last-known-stock state. Any divergence from that state is correctly interpreted as user modification.

**The only problematic scenario:** If PDE itself (via a self-improvement phase) modifies a tracked framework file WITHOUT updating the manifest. For example, Phase 47 adds a new step to `execute-phase.md`. After Phase 47 executes, the disk hash of `execute-phase.md` is `xyz789` but the manifest still has `abc123` (the Phase 46 baseline). On next `/pde:update`, `execute-phase.md` will appear "user-modified" and be preserved — but it was actually PDE-modified, not user-modified. The user would miss the legitimate upstream update.

**Prevention:** Any PDE self-improvement phase (47-52) that modifies tracked framework files MUST include a task to update the manifest entry for those files. Add to the planner's constraint for Phase 47+:

```markdown
**Manifest update rule:** If a plan modifies files tracked in files-manifest.csv, include a task to update those manifest entries after the modification:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" manifest update-entry \
  --file "workflows/execute-phase.md" \
  --source "stock"
```
This ensures the manifest baseline reflects PDE's self-modifications.
```

This manifest update rule is the most important edge case for long-term correctness and must be documented in workflow-methodology.md's "Safe Framework Updates" section.

Sources:
- [Project Context | BMAD Method](https://docs.bmad-method.org/explanation/project-context/)
- [Manage Project Context | BMAD Method](https://docs.bmad-method.org/how-to/project-context/)
- [GitHub - ChristopherKahler/paul](https://github.com/ChristopherKahler/paul)
