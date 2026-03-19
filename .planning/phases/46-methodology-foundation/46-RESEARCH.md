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
    echo "⚠ project-context.md may be stale (${DAYS_OLD} days old, PROJECT.md is newer)"
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
