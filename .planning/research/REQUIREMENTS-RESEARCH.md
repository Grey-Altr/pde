# Requirements Research: PDE v0.16 Multi-Editor Context Sync

**Researched:** 2026-03-24
**Domain:** Bidirectional editor context sync — atomic requirements specification
**Confidence:** HIGH (codebase verified, existing patterns confirmed), MEDIUM (Antigravity format details), LOW (TOON/DTCG round-trip precision)

---

## Purpose

This document answers: "What exact requirements does each feature area need to be properly specified?" It identifies atomic, testable requirements with acceptance criteria and inter-requirement dependencies. The output is consumed directly by the requirements author to produce `REQUIREMENTS.md` for v0.16.

---

## Codebase Inventory (Ground Truth)

Before specifying requirements, these are the exact artifacts the requirements must target:

### Existing Generated Files (PDE → Editor, v0.15)

| File | Generator Function | PDE-GENERATED Marker | v0.16 Reverse Path? |
|------|--------------------|----------------------|---------------------|
| `AGENTS.md` | `emitAgentsMd()` | Yes | No (pure PDE output) |
| `.cursor/rules/pde-project.mdc` | `emitCursorRules()` | Yes (in body, after frontmatter) | Yes (constraints, summary) |
| `.cursor/rules/pde-design-tokens.mdc` | `emitCursorRules()` | Yes | Yes (glob, alwaysApply) |
| `.cursor/rules/pde-components.mdc` | `emitCursorRules()` | Yes | Yes (glob, alwaysApply) |
| `.cursor/rules/pde-architecture.mdc` | `emitCursorRules()` | Yes | Yes (techStack, glob) |
| `.cursor/rules/pde-pipeline.mdc` | `emitCursorRules()` | Yes | No (pipeline status is read-only) |
| `.cursorrules` | `emitCursorrules()` | Yes | No (legacy, pure PDE output) |
| `GEMINI.md` | `emitGeminiMd()` | Yes | No (pure PDE output) |
| `.agent/skills/pde-design/SKILL.md` | `emitAntigravitySkill()` | Yes | Yes (user instructions blocks) |
| `DESIGN.md` | `emitDesignMd()` | Yes | Yes (color palette section) |

### Existing PDE-GENERATED Marker Format (from `makeHeader()`)

```
<!-- PDE-GENERATED | hash:<64-char-sha256> | generated:<ISO-8601> -->
```

Located: top of body content in `.mdc` files (after YAML frontmatter `---` block), at file top in AGENTS.md, GEMINI.md, SKILL.md, DESIGN.md.

### Existing .mdc Frontmatter Format (from `writeMdcRule()`)

```yaml
---
description: <string>
globs: <string | omitted>
alwaysApply: <true|false>
---
```

No `generated:` or `hash:` in frontmatter — the PDE-GENERATED marker is in the markdown body, not the YAML frontmatter. This is the correct parse target for the reverse parser.

### Existing IR Fields (from `buildContextIR()`)

| IR Field | Source | Writable By |
|----------|--------|-------------|
| `projectName` | `PROJECT.md` `#` heading | PDE only |
| `productType` | `design-manifest.json` | PDE only |
| `techStack` | `PROJECT.md` `## Tech Stack` | Cursor write-back |
| `projectSummary` | `PROJECT.md` first 2 paragraphs | PDE only (structured extraction) |
| `constraints` | `PROJECT.md` `## Constraints` | Cursor write-back |
| `designTokens` | `design-manifest.json` `tokens` | PDE only (manifest-driven) |
| `componentCatalog` | `.planning/design/handoff/` files | PDE only (file-system-driven) |
| `pipelineStatus` | `DESIGN-STATE.md` | PDE only |
| `sourceHash` | computed | PDE only |
| `generatedAt` | `new Date()` | PDE only |

### Existing Hook Infrastructure

- Hook type: `PostToolUse`, matcher `Write|Edit`, async
- Entry point: `hooks/context-sync-hook.cjs` → `handleHookPayload()`
- Idempotency: tmpdir marker file `pde-context-sync-<sessionId>.last-hash` (per-session)
- Session hooks: `SessionStart` (cleanup only), `SessionEnd` (archive)
- **Critical constraint**: hooks must produce ZERO stdout, always exit 0
- **Critical gap**: hooks fire only on `.planning/` writes, not on external editor file writes

### Existing MCP Server (`packages/pde-mcp-server/src/index.ts`)

- 10 read-only tools registered via `server.registerTool()`
- Transport: `StdioServerTransport` (stdio only)
- `--planning-dir` CLI override supported
- No `--enable-writes` flag exists yet
- No write tools, no file-watching

### State File Gap

`.planning/.context-sync-state.json` does not exist. The `SOURCE_FILES` array in `context-sync.cjs` is:
```javascript
['PROJECT.md', 'STATE.md', 'design/DESIGN-STATE.md', 'design/design-manifest.json']
```
This must explicitly exclude `.context-sync-state.json` when it is created.

---

## SYN — Sync Foundation Requirements

These requirements establish the state tracking and loop-prevention infrastructure that every other v0.16 feature depends on.

### SYN-01: Context Sync State File — Schema and Writer

**User story:** As the sync engine, I need a persistent state file that records the last IR snapshot and emission timestamp so that reverse parsers can perform 3-way merges against a stable base.

**Acceptance criteria:**
- `emitAll()` writes `.planning/.context-sync-state.json` at the end of every successful emission
- State file schema: `{ "schemaVersion": "1.0", "lastEmittedAt": "<ISO-8601>", "lastSourceHash": "<64-char-hex>", "lastIR": { <IR fields> } }`
- State file is written atomically (write to temp file then rename) to prevent torn reads
- State file is excluded from the `SOURCE_FILES` array in `computeSourceHash()` — its presence never invalidates the hash
- State file is git-ignored (added to `.gitignore`)
- If the state file does not exist, `emitAll()` creates it; if it is malformed, `emitAll()` overwrites it with a fresh snapshot

**Constraints from codebase:**
- Must not add any npm dependencies to plugin root (zero-dep constraint)
- Must use `fs.writeFileSync()` with atomic rename pattern (write to `.context-sync-state.json.tmp`, then `fs.renameSync`)
- Must not break existing `computeSourceHash()` behavior — no signature changes

**Dependencies:** None (this is the foundation)

**Test shape:** Unit test — call `emitAll(cwd)`, assert `.planning/.context-sync-state.json` exists with correct schema fields and `lastSourceHash` matches `computeSourceHash(planningDir)`.

---

### SYN-02: Loop-Break via Content Hash Comparison

**User story:** As the sync engine, I need to detect whether a file change was made by PDE or by an external editor so that I never enter an infinite sync loop when PDE regenerates editor files.

**Acceptance criteria:**
- The PDE-GENERATED marker already contains `hash:<sourceHash>` — this is the write-origin fingerprint
- When an editor file change is detected, the sync engine reads the `hash:` field from the PDE-GENERATED comment and compares it against the current `computeSourceHash(planningDir)` result
- If the hashes match: the file was written by PDE's last `emitAll()` — skip reverse sync (no-op return)
- If the hashes differ: external edit detected — proceed to reverse parse
- If no PDE-GENERATED marker present: user-authored file — skip unconditionally
- The comparison is performed before any file I/O or merge operations

**Constraints from codebase:**
- The `hash:` extraction must use the same regex pattern used by the hook's idempotency check
- Pattern: `/<!-- PDE-GENERATED \| hash:([a-f0-9]{64}) \| generated:([^>]+) -->/`
- Must not rely on mtime alone (timestamps can be unreliable within the same second on macOS APFS)

**Dependencies:** SYN-01 (state file provides the comparison baseline), existing `computeSourceHash()`

**Test shape:** Unit test — write a `.mdc` file with a known hash in PDE-GENERATED marker, modify a planning file, call the loop-break check, assert it returns "skip" when hash unchanged and "proceed" when hash changed.

---

### SYN-03: IR Snapshot as 3-Way Merge Base

**User story:** As the merge engine, I need the `lastIR` from the state file as the base for 3-way merge so that I can distinguish "both changed" (conflict) from "only one side changed" (auto-resolvable).

**Acceptance criteria:**
- `lastIR` in the state file contains the same field structure as `buildContextIR()` returns
- The snapshot stores only the IR fields that reverse parsers can contribute (not `sourceHash`, `generatedAt`, `productType`, `projectName`)
- Specifically stored: `techStack`, `constraints`, `componentCatalog` (for Cursor write-back) and `designTokens` (for Antigravity write-back)
- The snapshot value for each field is the exact string written to editor files (post-processing, not pre-processing)
- Snapshot is updated every time `emitAll()` runs, never on intermediate operations

**Dependencies:** SYN-01

**Test shape:** Unit test — call `emitAll()` twice with different PROJECT.md content between calls, assert `lastIR` reflects the second call's values.

---

### SYN-04: Session-Start Reconciliation Sweep

**User story:** As a developer who edited `.cursor/rules/` files while Claude Code was closed, I need PDE to detect and process my out-of-session edits on next session open so my changes are not silently lost.

**Acceptance criteria:**
- On `SessionStart` hook fire, the sync engine scans all monitored editor files for mtime newer than `lastEmittedAt` in `.context-sync-state.json`
- Monitored files: `.cursor/rules/pde-project.mdc`, `.cursor/rules/pde-design-tokens.mdc`, `.cursor/rules/pde-components.mdc`, `.cursor/rules/pde-architecture.mdc`, `.agent/skills/pde-design/SKILL.md`, `DESIGN.md`
- For each file with mtime newer than `lastEmittedAt`: apply the loop-break hash check (SYN-02); if hash differs, queue for reverse parse
- Scan result is logged to `.planning/logs/sync-reconciliation.log` (NDJSON, append-only)
- If no state file exists (first session): skip reconciliation, treat all editor files as PDE-generated (no reverse sync needed)
- The sweep completes in under 500ms on a typical project (O(n) file stat, no deep reads unless hash differs)

**Constraints from codebase:**
- `SessionStart` hook fires once per session; current hook uses `async: false` for cleanup
- New reconciliation hook must also use `async: false` to ensure it runs before any user interaction
- Must produce ZERO stdout (Claude Code hook contract)
- Must always exit 0

**Dependencies:** SYN-01, SYN-02

**Test shape:** Integration test — write state file with old `lastEmittedAt`, modify a `.mdc` file, simulate `SessionStart` hook, assert reconciliation log shows the file was detected.

---

### SYN-05: `--ingest` CLI Flag for Manual Reconciliation

**User story:** As a developer, I need a `pde context-sync --ingest` command that performs full reconciliation of all editor files back into `.planning/` state so I have an explicit control path that works regardless of session state.

**Acceptance criteria:**
- `pde context-sync --ingest` runs a full scan of all monitored editor files (same list as SYN-04)
- For each file: apply hash check, parse if changed, merge, write-back to `.planning/`
- Output a summary: `[files checked] [files with changes] [conflicts detected] [files updated]`
- If no changes detected: output `Context files are current — no changes to ingest`
- If conflicts detected: output conflict details and exit 1
- The command is idempotent: running it twice in a row with no intervening changes produces the same result

**Dependencies:** SYN-01, SYN-02, CUR-01 (Cursor parser), AGR-01 (Antigravity parser), merge engine

**Test shape:** Integration test — modify a `.mdc` file, run `--ingest`, assert `.planning/` state reflects the change.

---

## CUR — Cursor Bidirectional Sync Requirements

### CUR-01: `.mdc` Reverse Parser — Frontmatter Extraction

**User story:** As the sync engine, I need to parse the YAML frontmatter from `.cursor/rules/pde-*.mdc` files so I can extract the `globs` and `alwaysApply` fields that users commonly customize.

**Acceptance criteria:**
- Parser reads all `pde-*.mdc` files in `.cursor/rules/`
- Files without a PDE-GENERATED marker in the body are skipped (user-authored rules, not PDE output)
- Frontmatter is extracted using regex fallback (not YAML.parse) to handle Cursor's non-standard parsing behavior:
  - Pattern for description: `/^description:\s*(.+)$/m`
  - Pattern for globs: `/^globs:\s*(.+)$/m` (strips inline comments after `#`)
  - Pattern for alwaysApply: `/^alwaysApply:\s*(true|false)$/m`
- Inline comments on `globs:` lines are stripped before extraction (`globs: "**/*.ts" # comment` → `**/*.ts`)
- Parse failures (malformed frontmatter) are logged to `.planning/logs/sync-parse-errors.log` but never throw — return `null` for failed files
- Returns a partial IR: `{ _source: 'cursor-mdc', _files: [...], globs: { [filename]: string }, alwaysApply: { [filename]: boolean } }`

**Constraints from codebase:**
- Zero npm dependencies — no `gray-matter`, no `js-yaml`
- Regex must be robust to Windows line endings (CRLF) in Cursor-modified files
- The 5 existing `.mdc` filenames are fixed: `pde-project.mdc`, `pde-design-tokens.mdc`, `pde-components.mdc`, `pde-architecture.mdc`, `pde-pipeline.mdc`

**Dependencies:** SYN-02 (hash check must pass before parser is invoked)

**Test shape:** Unit test — provide `.mdc` content with various frontmatter edge cases (inline comments, missing globs, alwaysApply variations), assert correct field extraction.

---

### CUR-02: `.mdc` Reverse Parser — PDE-Owned Section Extraction

**User story:** As the sync engine, I need to extract the content of PDE-owned sections from `.mdc` body text so I can detect when users have modified PDE-generated content such as conventions or tech stack.

**Acceptance criteria:**
- Sections are delimited by `<!-- PDE:BEGIN -->` and `<!-- PDE:END -->` markers (new markers, added by the enhanced `.mdc` generator in CUR-06)
- Content between `<!-- PDE:BEGIN -->` and `<!-- PDE:END -->` is the parseable region
- Content outside these markers is treated as user-authored and captured in `userAdditions` — never written back to `.planning/`
- For `pde-project.mdc`: extract the `## Conventions` section content and map to `constraints` IR field
- For `pde-architecture.mdc`: extract the `## Tech Stack` section and map to `techStack` IR field
- If `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` markers are absent (pre-v0.16 files): fall back to extracting content after the PDE-GENERATED comment line and before the first user-added `##` heading not present in PDE's template

**Dependencies:** CUR-01, CUR-06 (section markers are added by enhanced generator)

**Test shape:** Unit test — provide `.mdc` with known PDE sections and user additions, assert PDE sections extracted correctly and `userAdditions` preserved.

---

### CUR-03: Live mtime Change Detection (Hook-Triggered)

**User story:** As a developer editing `.cursor/rules/` files in Cursor during an active PDE session, I need my changes to be automatically detected without requiring manual invocation of `--ingest` so the sync is seamless.

**Acceptance criteria:**
- When `context-sync-hook.cjs` fires for any `.planning/` write, it performs an mtime scan of all monitored Cursor files (`.cursor/rules/pde-*.mdc`)
- For each `.mdc` file: compare `fs.statSync(path).mtimeMs` against `lastEmittedAt` from the state file plus a 500ms grace period
- If mtime > lastEmittedAt + 500ms AND hash check (SYN-02) shows external edit: queue the file for reverse parsing
- The mtime check adds no more than 10ms overhead to the existing hook execution (5 `fs.statSync` calls)
- Detection is debounced: if the same file is detected as changed within 200ms of a previous detection, skip (handles rapid sequential editor saves)
- Hook zero-stdout contract is preserved — detections are logged to the state file's `pendingIngest` array, not stdout

**Constraints from codebase:**
- Must not use `fs.watch()` inside the hook process (hangs the hook process)
- Must not add any long-running process inside the hook
- Deduplication state (debounce) is stored in the state file `pendingIngest` array, not in process memory

**Dependencies:** SYN-01, SYN-02, CUR-01

**Test shape:** Unit test with time injection — mock `Date.now()` to simulate mtime after lastEmittedAt, assert hook queues the file in `pendingIngest`.

---

### CUR-04: Conflict Detection for `.mdc` Changes

**User story:** As a developer, I need to know when both I and PDE have modified the same section of a `.mdc` file since the last sync so I can make an informed resolution choice rather than having my edits silently overwritten.

**Acceptance criteria:**
- A conflict exists when, for a given IR field: `current_IR[field] != lastIR[field]` AND `editor_IR[field] != lastIR[field]` AND `current_IR[field] != editor_IR[field]`
- Non-conflicting cases handled automatically:
  - Editor changed, PDE unchanged: apply editor change (write-back to `.planning/`)
  - PDE changed, editor unchanged: push forward (re-emit, no write-back)
  - Neither changed: no-op
- Conflicts are written to `.planning/.sync-conflicts.log` in NDJSON format: `{ "timestamp": "<ISO>", "field": "<IR field>", "planningValue": "...", "editorValue": "...", "file": "<mdc filename>" }`
- Conflicts are never written to stdout (hook zero-stdout contract)
- Conflict log entries include both values (planning-side and editor-side) to enable informed resolution

**Dependencies:** SYN-03 (3-way merge base), CUR-01, CUR-02

**Test shape:** Unit test — construct `lastIR`, `current_IR`, and `editor_IR` with specific conflict cases, assert conflict log entry written with correct fields.

---

### CUR-05: Conflict Resolution — Planning-Wins Default with User Override

**User story:** As a developer, I need conflicts to default to PDE winning (since `.planning/` is the authoritative source of truth) but I need the ability to configure editor-wins or prompt policies so I can choose when to accept editor changes.

**Acceptance criteria:**
- Default conflict policy is `planning-wins`: on conflict, `.planning/` value is preserved, editor change is discarded (logged but not applied)
- Policy is configurable in `.planning/config.json` under `contextSync.conflictPolicy`: `"planning-wins"` | `"editor-wins"` | `"prompt"`
- `"editor-wins"` policy: editor value is written back to `.planning/`, overwriting current `.planning/` value
- `"prompt"` policy: conflict is logged to `.sync-conflicts.log` with `"status": "unresolved"`, no auto-resolution, `emitAll()` is NOT called until user resolves (prevents emitting stale state)
- Policy can be per-field: `contextSync.fieldPolicies: { "constraints": "planning-wins", "techStack": "editor-wins" }`
- Configuration is read at the start of each ingest operation, not cached

**Dependencies:** CUR-04

**Test shape:** Unit test — set each policy in config, trigger a conflict, assert the correct resolution is applied and logged.

---

### CUR-06: Enhanced `.mdc` Generation — Section Markers and Richer Globs

**User story:** As a developer using Cursor AI, I need richer `.mdc` rules with more precise glob targeting and `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` section markers so that Cursor AI activates the right rules for the right files and my user additions survive PDE regeneration.

**Acceptance criteria:**
- `emitCursorRules()` adds `<!-- PDE:BEGIN -->` immediately before PDE-generated content and `<!-- PDE:END -->` immediately after the last PDE-generated line in each `.mdc` body
- Existing user content below `<!-- PDE:END -->` (from previous generations) is preserved verbatim during regeneration (surgical replacement of the PDE-owned block only)
- `pde-design-tokens.mdc` glob updated from `*.css,*.scss,*.tsx,*.jsx` to `**/*.{css,scss,tsx,jsx,ts}` (covers TypeScript source files)
- `pde-components.mdc` glob updated from `src/components/**` to `**/*.{tsx,jsx,stories.tsx,test.tsx}` (covers test and Storybook files)
- `pde-architecture.mdc` glob updated from `src/**` to `**/*.{ts,tsx,js,cjs,mjs}` (covers all source, not just `src/`)
- `pde-project.mdc` adds inline examples: one concrete example of correct usage per major constraint listed
- Round-trip test: generate `.mdc`, add user content below `<!-- PDE:END -->`, re-generate, assert user content preserved

**Dependencies:** None (enhancement to existing `emitCursorRules()`)

**Test shape:** Unit test — call `emitCursorRules()` twice with user content added between calls, assert user content intact in second output.

---

## AGR — Antigravity Bidirectional Sync Requirements

### AGR-01: SKILL.md Reverse Parser — Section-Aware Extraction

**User story:** As the sync engine, I need to parse `.agent/skills/pde-design/SKILL.md` to extract sections that Antigravity agents have modified so I can propagate those changes back to PDE's planning state.

**Acceptance criteria:**
- Parser reads `.agent/skills/pde-design/SKILL.md`
- If PDE-GENERATED marker is absent: skip (user-authored skill file, not PDE output)
- Parser extracts these PDE-owned sections (between `## ` headings):
  - `## Design Tokens Available` → maps to `designTokens` partial IR field
  - `## Component Catalog` → maps to `componentCatalog` partial IR field
  - `## Constraints` → maps to `constraints` partial IR field
- Content after the last PDE-owned section heading (or in sections not in the PDE template) is treated as user/agent additions: captured in `agentAdditions`, preserved verbatim in re-generated SKILL.md, never written back to `.planning/`
- Parser is tolerant of additional `## ` sections inserted by Antigravity agents between known sections
- Returns partial IR: `{ _source: 'antigravity-skill', designTokens, componentCatalog, constraints, agentAdditions: [...] }`

**Dependencies:** SYN-02 (hash check)

**Test shape:** Unit test — SKILL.md with PDE sections plus agent-added sections, assert PDE sections extracted and `agentAdditions` captured.

---

### AGR-02: DESIGN.md Reverse Parser — Color Palette Section

**User story:** As the sync engine, I need to parse `DESIGN.md`'s color palette section to extract hex values that Antigravity agents have modified so I can write them back to `design-manifest.json`.

**Acceptance criteria:**
- Parser reads `DESIGN.md` at project root
- If PDE-GENERATED marker absent: skip
- Extracts color entries from `## 2. Color Palette & Roles` section using the PDE template format:
  - Pattern: `/^- \*\*(\w+)\*\* \(#([0-9a-fA-F]{6})\) -- (.+)$/m`
  - Extracts: token name (e.g. `Primary`), hex value (e.g. `#3b82f6`), role description
- The hex-to-OKLCH reverse conversion is NOT performed by this parser — the parser stores hex values; the write-back layer handles DTCG conversion (see AGR-03)
- Unknown sections (e.g. `## 6. Motion Tokens` added by Antigravity) are preserved as `agentAdditions` and written back verbatim during re-generation
- Parses only what PDE originally emitted — no attempt to parse Antigravity-specific format variations
- Format version detection: if `<!-- pde-format-version: 1.0 -->` present, use v1.0 parser; if absent, use lenient fallback mode that extracts only color entries it can confidently parse

**Dependencies:** SYN-02

**Test shape:** Unit test — DESIGN.md with known color entries, assert hex values extracted per-token; test with unknown sections present, assert they appear in `agentAdditions`.

---

### AGR-03: DESIGN.md Write-Back — Value-Only DTCG Update

**User story:** As the sync engine, I need to write hex color values parsed from DESIGN.md back into `design-manifest.json` tokens without destroying the DTCG metadata (`$type`, `$description`, `$extensions`) so that token precision is preserved across sync cycles.

**Acceptance criteria:**
- Write-back is value-only: only the `$value` field of each DTCG color token entry is updated
- The `$type`, `$description`, `$extensions`, and group hierarchy of each token entry are preserved unchanged
- The hex-to-OKLCH conversion uses the same `oklchToHex()` pipeline in `context-sync.cjs` in reverse: hex → linear RGB → OKLAB → OKLCH, with precision to 4 decimal places
- If the reverse conversion produces an OKLCH value that differs from the stored value by more than 0.001 in any channel: log a precision warning to `.planning/logs/sync-precision.log` but proceed (do not abort)
- Write-back is applied only for tokens that exist in both the DESIGN.md parse result and `design-manifest.json` — new tokens introduced in DESIGN.md are not auto-created in the manifest
- After write-back, `computeSourceHash()` is recomputed and `emitAll()` is called to re-normalize all editor files

**Constraints from codebase:**
- `design-manifest.json` schema must remain valid (schemaVersion 1.0.0)
- Write-back routes through `fs.writeFileSync()` with JSON.stringify(2 spaces) for consistency
- Must not corrupt `designCoverage`, `artifacts`, or `tokenDependencyMap` fields

**Dependencies:** AGR-02, SYN-01

**Test shape:** Unit test — manifest with OKLCH color tokens, parser extracts hex, write-back updates `$value`, assert `$type` and `$description` unchanged; assert written OKLCH value close to expected.

---

### AGR-04: Shared Token State — `design-manifest.json` as Canonical Source

**User story:** As a developer, I need a clearly enforced contract that `design-manifest.json` is the single source of truth for design tokens so that DESIGN.md changes write back to the manifest and never the reverse, preventing forked token state.

**Acceptance criteria:**
- Documentation: `DESIGN.md` header includes `<!-- SOURCE: design-manifest.json | DERIVE-ONLY -->` comment (in addition to PDE-GENERATED marker) making the derivation relationship explicit
- The `emitDesignMd()` function never reads `DESIGN.md` as input — it only reads `design-manifest.json`
- The reverse parser (AGR-02) never modifies `design-manifest.json` directly — it returns a partial IR that the merge engine applies
- No code path exists where DESIGN.md edits overwrite manifest tokens without going through the merge engine and the value-only write-back gate (AGR-03)
- The `DESIGN.md` in git history is never committed with user modifications while the manifest still has the old values (the test: after any DESIGN.md write-back, the manifest hash is updated before git commit)

**Dependencies:** AGR-02, AGR-03

**Test shape:** Structural test — grep codebase for any code path that writes to `design-manifest.json` without going through the merge engine. Assert only authorized write paths exist.

---

### AGR-05: Agent-Written SKILL.md Additions Preserved Across Regeneration

**User story:** As an Antigravity agent developer, I need additions that agents write to SKILL.md to survive PDE re-generation so agents don't lose their learned context every time PDE syncs.

**Acceptance criteria:**
- When `emitAntigravitySkill()` runs and an existing SKILL.md is found:
  - If PDE-GENERATED marker present: parse `agentAdditions` from the current file (AGR-01)
  - Re-generate the PDE-owned sections with fresh content
  - Append `agentAdditions` below the regenerated content, separated by `<!-- AGENT-ADDITIONS: DO NOT EDIT THIS LINE -->` marker
  - Total file output = PDE header + PDE sections + agent additions marker + agent additions
- If SKILL.md does not exist or has no PDE-GENERATED marker: generate normally without agent additions block
- The agent additions block is never parsed for write-back to `.planning/` — it is append-only from PDE's perspective
- Nyquist test: generate SKILL.md, write agent addition block, re-generate, assert agent block intact

**Dependencies:** AGR-01

**Test shape:** Unit test — call `emitAntigravitySkill()` twice with agent additions added to SKILL.md between calls, assert additions preserved in second output.

---

### AGR-06: Enhanced SKILL.md Generation — Richer Instructions and Workflow Stubs

**User story:** As an Antigravity agent using PDE context, I need richer instructions in SKILL.md including workflow stubs that reference the design pipeline stages so I can produce more accurate, context-aware outputs.

**Acceptance criteria:**
- `emitAntigravitySkill()` adds a `## Workflows` section that lists available PDE pipeline stages as workflow invocation hints (e.g., "Brief → System → Wireframe → Critique")
- If `DESIGN-STATE.md` indicates a design stage has been completed, the workflow stub for that stage shows `[completed]` status
- `## Constraints` section includes the full constraints text from `PROJECT.md` (currently truncated to "Use hex color values from DESIGN.md..." hardcoded strings)
- `## Instructions` section updated to include the specific DTCG token file path: `SYS-tokens.json` (already partially correct, but path must be exact)
- Format marker `<!-- pde-skill-version: 1.0 -->` added below the PDE-GENERATED header for version detection

**Dependencies:** None (enhancement to existing `emitAntigravitySkill()`)

**Test shape:** Unit test — call enhanced `emitAntigravitySkill()` with a DESIGN-STATE.md showing completed stages, assert workflow section present and stage statuses correct.

---

### AGR-07: Enhanced DESIGN.md Generation — Format Version Marker

**User story:** As the reverse parser, I need a format version marker in PDE-generated DESIGN.md files so I can apply the correct parser and detect format changes caused by PDE updates.

**Acceptance criteria:**
- `emitDesignMd()` adds `<!-- pde-format-version: 1.0 -->` as the second line (immediately after PDE-GENERATED header)
- Reverse parser (AGR-02) reads this marker and selects the v1.0 parse strategy
- If the marker indicates an unknown version (e.g., `2.0` from a future PDE version): log a warning and fall back to lenient parsing mode
- The format version is incremented as a BREAKING CHANGE only (minor improvements do not change the format version)

**Dependencies:** AGR-02

**Test shape:** Unit test — assert format version marker present in `emitDesignMd()` output, assert AGR-02 parser reads it correctly.

---

## INF — Infrastructure Requirements

### INF-01: MCP Write Tools — `--enable-writes` Flag

**User story:** As an Antigravity agent or automation tool, I need to be able to write structured updates to PDE state via MCP so I have a typed, validated API rather than having to know PDE's internal file formats.

**Acceptance criteria:**
- `pde-mcp-server` accepts `--enable-writes` CLI flag: `node packages/pde-mcp-server/dist/index.js --enable-writes`
- When flag is absent (default): server starts in read-only mode (unchanged from v0.15)
- When flag is present: 4 write tools are registered in addition to the existing 10 read tools
- Write tool registration must not affect read tool behavior
- Server logs `pde-mcp-server: write mode enabled — 4 write tools registered` to stderr when flag is active

**Dependencies:** None (additive to existing server)

**Test shape:** Integration test — start server with and without flag, assert tool count differs by 4.

---

### INF-02: MCP Write Tool — `update-constraints`

**User story:** As an Antigravity agent, I need to update the project constraints in PDE's planning state so that my design decisions can be recorded as authoritative constraints.

**Acceptance criteria:**
- Tool name: `pde_update_constraints`
- Input schema: `{ "constraints": { "type": "string", "minLength": 1, "maxLength": 4000 } }`
- Effect: overwrites the `## Constraints` section in `PROJECT.md` with the provided string
- Validation: rejects empty strings, strings over 4000 chars, strings containing `<!-- PDE-GENERATED` (prevents marker injection)
- Post-write: calls `emitAll(cwd)` to re-emit all editor files with updated constraints
- Post-write: logs write event to `.planning/logs/mcp-writes.ndjson`: `{ "tool": "pde_update_constraints", "timestamp": "<ISO>", "preview": "<first 100 chars>" }`
- Annotations: `readOnlyHint: false, destructiveHint: false, idempotentHint: true`
- Returns: `{ "success": true, "updatedAt": "<ISO>", "preview": "<first 100 chars>" }`

**Dependencies:** INF-01

**Test shape:** Integration test — call tool, assert PROJECT.md updated, `emitAll()` was called (assert `.mdc` files contain new constraints).

---

### INF-03: MCP Write Tool — `update-tech-stack`

**User story:** As an Antigravity agent, I need to update the tech stack section in PDE's planning state so design decisions about technology choices are recorded.

**Acceptance criteria:**
- Tool name: `pde_update_tech_stack`
- Input schema: `{ "techStack": { "type": "string", "minLength": 1, "maxLength": 4000 } }`
- Effect: overwrites the `## Tech Stack` section in `PROJECT.md`
- Validation: same rules as INF-02
- Post-write: calls `emitAll(cwd)`, logs to `mcp-writes.ndjson`
- Annotations: `readOnlyHint: false, destructiveHint: false, idempotentHint: true`
- Returns: `{ "success": true, "updatedAt": "<ISO>" }`

**Dependencies:** INF-01

**Test shape:** Integration test — call tool, assert `pde-architecture.mdc` tech stack section updated.

---

### INF-04: MCP Write Tool — `append-context-note`

**User story:** As an Antigravity agent or external tool, I need to append context notes to PDE's memory so design decisions and research findings are persisted for future planning sessions.

**Acceptance criteria:**
- Tool name: `pde_append_context_note`
- Input schema: `{ "note": { "type": "string", "minLength": 1, "maxLength": 2000 }, "category": { "type": "string", "enum": ["design", "technical", "product", "research", "decision"] } }`
- Effect: appends to `.planning/context-notes/<category>-notes.md` (creates file if absent)
- Appended format: `\n## [timestamp] (via MCP)\n\n[note]\n`
- Validation: `category` must be in the enum allowlist — prevents path traversal via category
- Post-write: calls `emitAll(cwd)` (context notes are picked up by the IR builder in future calls, so emitting after note append ensures editor files stay current)
- Annotations: `readOnlyHint: false, destructiveHint: false, idempotentHint: false` (append is not idempotent — repeated calls add duplicate entries)
- Returns: `{ "success": true, "file": ".planning/context-notes/<category>-notes.md", "appendedAt": "<ISO>" }`

**Dependencies:** INF-01

**Test shape:** Integration test — call tool, assert file created/appended with correct format; call with invalid category, assert rejected.

---

### INF-05: MCP Write Tool — `flag-divergence`

**User story:** As an Antigravity agent reviewing code, I need to flag divergence between code and design specs via MCP so PDE's divergence tracking stays current with agent-discovered issues.

**Acceptance criteria:**
- Tool name: `pde_flag_divergence`
- Input schema: `{ "component": { "type": "string", "pattern": "^[a-zA-Z0-9_-]+$" }, "reason": { "type": "string", "minLength": 1, "maxLength": 500 }, "severity": { "type": "string", "enum": ["warning", "critical"] } }`
- Effect: writes entry to `.planning/divergence-flags.json` (create if absent, append to existing `flags` array)
- Schema: `{ "flags": [{ "component": "...", "reason": "...", "severity": "...", "flaggedAt": "<ISO>", "source": "mcp" }] }`
- `component` pattern `^[a-zA-Z0-9_-]+$` prevents path injection
- Post-write: does NOT call `emitAll()` — divergence flags are not part of the editor context files
- Annotations: `readOnlyHint: false, destructiveHint: false, idempotentHint: false`
- Returns: `{ "success": true, "flaggedAt": "<ISO>" }`

**Dependencies:** INF-01

**Test shape:** Unit test — call tool with valid and invalid component names, assert schema written correctly and component name validation enforced.

---

### INF-06: Sync Audit Trail — SYNC-LOG.md

**User story:** As a developer, I need an append-only audit log of all sync operations (ingest events, conflicts, write-backs) so I can trace what changed and when, and identify if a bad sync corrupted my planning state.

**Acceptance criteria:**
- SYNC-LOG.md is maintained at `.planning/logs/SYNC-LOG.md`
- Every ingest operation appends an entry: timestamp, files scanned, files changed, conflicts detected, write-backs applied
- Entry format:
  ```markdown
  ## Sync [ISO timestamp]

  **Trigger:** [hook|manual|session-start|mcp-write]
  **Files scanned:** [n]
  **Changes detected:** [list of filenames]
  **Write-backs applied:** [list of field:value summaries]
  **Conflicts:** [list of field:planning-value vs editor-value] OR "None"
  ```
- Entries are appended (never overwritten) — SYNC-LOG.md grows over time
- SYNC-LOG.md is git-committed on each update (not git-ignored)
- SYNC-LOG.md is trimmed to the last 100 entries when it exceeds 500 entries (oldest entries removed)

**Dependencies:** SYN-01, CUR-04

**Test shape:** Integration test — run ingest with changes, assert SYNC-LOG.md entry appended with correct format.

---

### INF-07: Sync Rollback — Pre-Write Snapshots

**User story:** As a developer who got a bad sync result, I need to roll back to the state before the last ingest so I can recover from a sync that corrupted my planning state.

**Acceptance criteria:**
- Before any write-back to `.planning/` files, the sync engine writes a snapshot of the current values to `.planning/sync-snapshots/snapshot-<ISO timestamp>.json`
- Snapshot schema: `{ "snapshotAt": "<ISO>", "trigger": "<hook|manual|mcp-write>", "values": { "<file-path>": "<content>" } }` for all files that will be modified
- `/pde:sync-rollback` command: lists last 10 snapshots, prompts user to select one, restores the selected snapshot's files
- Rollback command outputs: `Restored [n] files from snapshot [timestamp]`
- Snapshots older than 30 days are automatically deleted on each ingest run
- Snapshot files are git-ignored

**Dependencies:** SYN-01

**Test shape:** Integration test — run ingest that writes to PROJECT.md, assert snapshot created; run rollback, assert PROJECT.md restored.

---

### INF-08: Conflict UX Commands — `/pde:sync-status` and `/pde:sync-rollback`

**User story:** As a developer, I need slash commands to check sync status and trigger rollback so I have in-editor visibility into sync state without needing to read raw JSON files.

**Acceptance criteria for `/pde:sync-status`:**
- Outputs: last sync timestamp, number of files monitored, any unresolved conflicts from `.sync-conflicts.log`, any pending ingest items from state file
- Format: readable markdown summary, not raw JSON
- If no state file: "Context sync not yet initialized — run /pde:editor-sync to initialize"

**Acceptance criteria for `/pde:sync-rollback`:**
- Lists available snapshots from `.planning/sync-snapshots/` with timestamps and affected files
- Prompts user to confirm before restoring
- After restore: runs `emitAll()` to re-normalize editor files from restored state
- If no snapshots: "No rollback snapshots available"

**Dependencies:** INF-06, INF-07, SYN-01

**Test shape:** Manual-only (slash command workflow). Structural test verifies the command files exist and reference correct script paths.

---

## Requirements Missed in Initial Research

The following requirements were identified during codebase investigation that were not surfaced in the initial feature/architecture research:

### MISS-01: `.cursorrules` Legacy File — No Reverse Sync

**Finding:** `emitCursorrules()` generates `.cursorrules` at project root for backwards compatibility. This file has a PDE-GENERATED marker but should NOT be included in any reverse sync path. The file is pure PDE output — Cursor only reads it, never writes to it.

**Requirement:** The reverse sync engine must explicitly skip `.cursorrules` (no PDE-GENERATED marker check needed — it is simply not in the monitored files list). Any accidental detection must fail gracefully.

---

### MISS-02: GEMINI.md Hierarchy — No Reverse Sync

**Finding:** `emitGeminiMd()` generates 5 files: `GEMINI.md`, `.planning/GEMINI.md`, `.planning/design/GEMINI.md`, `.planning/pde-pipeline-summary.md`, `.planning/design/pde-design-summary.md`. None of these should be in the monitored files list for reverse sync — Gemini CLI is consume-only.

**Requirement:** The monitored files list must be explicitly enumerated; it must not include any GEMINI.md files or `pde-*-summary.md` files.

---

### MISS-03: Hook idempotency uses tmpdir marker — State File Is Different

**Finding:** The existing hook uses a tmpdir marker file (`os.tmpdir()/pde-context-sync-<sessionId>.last-hash`) for idempotency, NOT the state file. The state file (SYN-01) is a new addition. These two mechanisms serve different purposes:
- Tmpdir marker: prevents re-emission when nothing in `.planning/` has changed (outbound idempotency)
- State file: records the last IR snapshot for 3-way merge (inbound merge base)

**Requirement:** The state file must NOT replace the tmpdir marker. Both must exist and serve their separate roles. Requirements must not conflate these two mechanisms.

---

### MISS-04: Regex Hash Extraction from PDE-GENERATED Comment

**Finding:** The exact comment format from `makeHeader()` is:
```
<!-- PDE-GENERATED | hash:<64-char-sha256> | generated:<ISO-8601> -->
```
The reverse parsers must use the exact regex pattern that matches this format. The `|` characters and spacing are significant. Any parser that uses a different regex will fail silently on valid files.

**Requirement:** All reverse parsers must use this exact extraction pattern:
```javascript
const HEADER_RE = /<!-- PDE-GENERATED \| hash:([a-f0-9]{64}) \| generated:([^>|]+) -->/;
```

---

### MISS-05: `.mdc` File Location — PDE-GENERATED Marker After YAML Frontmatter

**Finding:** In `.mdc` files, the PDE-GENERATED marker is NOT the first line — it comes after the YAML frontmatter block:
```
---
description: ...
alwaysApply: ...
---

<!-- PDE-GENERATED | hash:... | generated:... -->

# Title
...
```

**Requirement:** The `.mdc` reverse parser must skip the frontmatter block (lines between `---` delimiters) when searching for the PDE-GENERATED marker. A naive "check first line" approach will fail.

---

### MISS-06: `emitAntigravitySkill()` — PDE-GENERATED Before YAML Frontmatter

**Finding:** In SKILL.md, PDE currently places the PDE-GENERATED marker BEFORE the YAML frontmatter:
```
<!-- PDE-GENERATED | hash:... | generated:... -->
---
name: pde-design
description: ...
---
```

This is the opposite order from `.mdc` files. The Antigravity parser must handle this reversed ordering. This is a codebase-specific detail not mentioned in the research documents.

**Requirement:** The `antigravity-skill-parser.cjs` must search for the PDE-GENERATED marker before the `---` YAML frontmatter block (lines 1-2 of the file). The `.mdc` parser's YAML-skip logic must not be applied to SKILL.md.

---

### MISS-07: `ag-inbound-delta.json` Must Be Git-Ignored

**Finding:** The architecture proposes `.planning/.ag-inbound-delta.json` as a file-based queue. This file has transient content (written by MCP server, consumed by hook, then cleared). If committed, it creates phantom git diffs and confuses the hash computation.

**Requirement:** `.planning/.ag-inbound-delta.json` must be added to `.gitignore`. The state file write that creates it must never call `computeSourceHash()` before clearing it.

---

### MISS-08: MCP Server `emitAll()` Must Know the Project Root

**Finding:** `emitAll(cwd)` requires the project root path (parent of `.planning/`). The MCP server currently only has `planningDir` (path to `.planning/`). Write tools that call `emitAll()` must derive `projectRoot = path.dirname(planningDir)`.

**Requirement:** MCP write tools must derive `projectRoot` from `planningDir` using `path.dirname(planningDir)` before calling `emitAll(projectRoot)`.

---

## Dependency Graph

```
SYN-01 (state file schema)
├─> SYN-02 (hash comparison)
│   ├─> CUR-01 (mdc frontmatter parser)
│   │   ├─> CUR-02 (mdc section extraction)
│   │   │   └─> CUR-04 (conflict detection)
│   │   │       └─> CUR-05 (conflict resolution)
│   │   └─> CUR-03 (live mtime detection)
│   ├─> AGR-01 (SKILL.md parser)
│   │   ├─> AGR-05 (agent additions preserved)
│   │   └─> CUR-04 (shared conflict detection)
│   └─> AGR-02 (DESIGN.md parser)
│       ├─> AGR-03 (value-only write-back)
│       │   └─> AGR-04 (token state contract)
│       └─> AGR-07 (format version marker)
└─> SYN-03 (IR snapshot as merge base)
    └─> CUR-04, AGR conflict detection

SYN-04 (session reconciliation)
└─> SYN-01, SYN-02, CUR-01, AGR-01

SYN-05 (--ingest CLI flag)
└─> all parsers, merge engine

CUR-06 (enhanced .mdc generation)
└─> CUR-02 (depends on PDE:BEGIN/END markers existing)

AGR-06 (enhanced SKILL.md generation)
└─> AGR-05 (agent additions must be preserved)

INF-01 (--enable-writes flag)
└─> INF-02, INF-03, INF-04, INF-05

INF-06 (SYNC-LOG.md)
└─> SYN-01, SYN-05, CUR-04

INF-07 (rollback snapshots)
└─> SYN-01

INF-08 (slash commands)
└─> INF-06, INF-07
```

---

## Acceptance Criteria Patterns

All requirements in v0.16 should follow these observable, testable acceptance criteria patterns:

### For file generation (emitters)
- "File exists at `<path>` after function call" (existence)
- "File contains `<exact string>` at position `<first-line|n>`" (content)
- "File contains `<!-- PDE-GENERATED | hash:... -->`" (marker present)
- "Calling emitter twice with unchanged input produces identical output" (idempotency)

### For parsers
- "Parser returns `null` for files without PDE-GENERATED marker" (skip behavior)
- "Parser extracts `<field>` = `<expected value>` from `<fixture>`" (extraction fidelity)
- "Parser does not throw on malformed input" (error tolerance)

### For conflict detection
- "When `current_IR.X != lastIR.X` and `editor_IR.X != lastIR.X`: conflict logged to `.sync-conflicts.log`" (conflict detected)
- "When only `editor_IR.X != lastIR.X`: write-back applied to `.planning/`" (auto-resolve)

### For hooks
- "Hook produces no stdout" (zero-stdout contract)
- "Hook exits 0 on all code paths including errors" (exit contract)
- "Hook completes in under 200ms" (performance)

### For MCP tools
- "Tool registered only when `--enable-writes` flag present" (flag gate)
- "Tool call with invalid input returns error, does not modify filesystem" (validation)
- "Tool call with valid input modifies file and calls `emitAll()`" (post-write emit)

---

## Phase-to-Requirements Mapping

Based on the SUMMARY.md phase ordering (A through G):

| Phase | Requirements |
|-------|-------------|
| Phase A: Sync Foundation | SYN-01, SYN-02, SYN-03, MISS-03, MISS-04, MISS-07 |
| Phase B: Reverse Parsers | CUR-01, CUR-02, AGR-01, AGR-02, MISS-05, MISS-06 |
| Phase C: Merge Engine + Conflict Resolution | SYN-03, CUR-04, CUR-05, AGR-04 |
| Phase D: Hook Integration — Cursor | SYN-04, SYN-05, CUR-03, MISS-01, MISS-02 |
| Phase E: Antigravity Write-Back | AGR-03, AGR-04, AGR-05, AGR-07, MISS-08 |
| Phase F: MCP Write Tools | INF-01, INF-02, INF-03, INF-04, INF-05 |
| Phase G: Conflict UX and Audit Trail | INF-06, INF-07, INF-08, CUR-06, AGR-06 |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| SYN requirements | HIGH | All based on verified `computeSourceHash()` and `makeHeader()` code |
| CUR-01 to CUR-05 | HIGH | `.mdc` format confirmed from live files; hook pattern verified from source |
| CUR-06 | MEDIUM | Enhancement to existing code; glob patterns not tested |
| AGR-01, AGR-05 | HIGH | SKILL.md format verified from live `.agent/skills/pde-design/SKILL.md` |
| AGR-02, AGR-03, AGR-07 | MEDIUM | DESIGN.md format confirmed from live DESIGN.md; OKLCH reverse conversion untested |
| AGR-04 | HIGH | Design decision; no code ambiguity |
| AGR-06 | MEDIUM | Enhancement requiring DESIGN-STATE.md parsing |
| INF-01 to INF-05 | HIGH | Pattern well-established from existing tool registrations |
| INF-06 to INF-08 | HIGH | Pattern well-established from existing NDJSON event bus |
| MISS-01 to MISS-08 | HIGH | Directly observed from codebase |

---

*Requirements research for: PDE v0.16 Multi-Editor Context Sync*
*Researched: 2026-03-24*
*Ready for: REQUIREMENTS.md authoring*
