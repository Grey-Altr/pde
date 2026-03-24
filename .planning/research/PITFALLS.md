# Pitfalls Research

**Domain:** Bidirectional multi-editor context sync — adding write-back to an existing unidirectional generation system (PDE v0.16, building on v0.15 read-only MCP + context generation)
**Researched:** 2026-03-24
**Confidence:** HIGH for infinite loop prevention (multiple verified integration post-mortems, official patterns); HIGH for MCP write-back safety (official MCP security docs, CVE post-mortems); MEDIUM for Cursor .mdc write-back (community-documented, format actively evolving); MEDIUM for Antigravity API stability (community-maintained SKILL.md spec, no official stability guarantee); LOW for DTCG round-trip fidelity (limited post-mortem data, spec v1 only stable as of Oct 2025)

---

## Critical Pitfalls

### Pitfall 1: Infinite Sync Loop — Editor Change Triggers PDE Regeneration Which Triggers Editor Change

**What goes wrong:**
The full cycle is: user edits `.cursor/rules/pde-context.mdc` → file watcher fires → PDE reads change, updates `.planning/` state → hook fires → PDE regenerates `.cursor/rules/pde-context.mdc` → file watcher fires again → repeat forever. In practice, the infinite loop manifests as a CPU-pegged Claude Code session that never completes the hook, or as dozens of identical commits filling git history in seconds. The same loop exists for the Antigravity path: Antigravity modifies `DESIGN.md` → PDE detects change → PDE updates DTCG tokens → PDE regenerates `DESIGN.md` → Antigravity detects change → cycle continues.

**Why it happens:**
Developers add write-back capability to a previously one-way generation system without implementing loop-break mechanics. The file watcher fires on ANY write to a watched path, including writes by the system itself. Without origin tracking on each write event, the system cannot distinguish "user edited this file" from "PDE regenerated this file" and treats both as triggers for re-sync. This is the most common failure mode when upgrading from unidirectional to bidirectional sync — every production integration platform documents it as their top reported issue.

**How to avoid:**
Use one of three well-established loop-break patterns (in order of reliability):

1. **Write marker injection**: Before PDE writes a sync artifact, embed a machine-readable origin marker in the file content — e.g., a comment or frontmatter field like `pde-sync-origin: true` with a write timestamp. The file watcher's change handler reads this marker first and exits early if it sees a PDE-originated write. This is the most robust pattern; it survives process restarts and works across session boundaries.

2. **Session-scoped write lock flag**: Maintain an in-memory `Set<string>` of file paths PDE is currently writing to. Before the file watcher triggers PDE logic, check if the path is in the write lock set. Add the path before writing, remove it after `fs.writeFileSync` completes. This is simpler but does not survive crashes — if PDE exits mid-write, the lock is orphaned (mitigated by clearing the set on session start).

3. **Content hash comparison before trigger**: Before acting on a file change event, compute the SHA-256 of the new file contents and compare against the last-known hash stored in `.planning/sync-state.json`. Only trigger PDE sync logic if the hash differs from the last hash PDE itself wrote. This prevents acting on no-op writes and is the pattern used by PDE's v0.14 visual regression circuit breaker.

**Warning signs:**
- CPU stays at 100% after editing a sync artifact
- `git log` shows repeated identical commits with "auto-sync" messages seconds apart
- Claude Code session never returns to the prompt after a `.cursor/rules/` edit
- `.planning/sync-state.json` shows the same hash written more than twice consecutively

**Phase to address:**
Phase 1 (sync loop architecture) — the write marker or hash-comparison mechanism MUST be in place before any file watcher triggers are wired to PDE write operations. Adding loop protection after the watcher is live means testing in a live-fire environment where loops can fill disk or exhaust API quotas within seconds.

---

### Pitfall 2: MCP Write-Back Bypassing pde-tools.cjs Validation and Locking

**What goes wrong:**
v0.15 established the read-only MCP server contract, explicitly rejecting write tools because they "create a second write path bypassing pde-tools.cjs validation and locking." v0.16 adds write-back capability. The pitfall is implementing write-back via MCP tool calls that write directly to `.planning/` files, circumventing: AC-first verification gates, the reconciliation audit trail, protected-files mechanism, designCoverage clobber prevention, and the manifest locking that prevented the flag-clobber bugs fixed in v0.11/v0.12/v0.14. External editors (Cursor, Antigravity) gain the ability to corrupt PDE state without any of the safeguards PDE has built over 15 milestones.

**Why it happens:**
Write-back feels naturally implemented as a new MCP tool: `pde_write_cursor_rule(content)` or `pde_update_planning_state(field, value)`. It is the minimal-code approach. But it creates a confused deputy: the MCP server has PDE's filesystem privileges and will write whatever the calling editor instructs, with no per-tool user consent gate, no locking, and no audit trail. The v0.15 decision to make the server read-only was correct. The v0.16 risk is abandoning that constraint under pressure to "just make it work."

**How to avoid:**
Write-back must NOT flow through MCP tool calls into `.planning/` directly. Instead:

- **For editor context files** (`.cursor/rules/*.mdc`, `AGENTS.md`, `GEMINI.md`, `DESIGN.md`): These are NOT in `.planning/`. Write-back from these files into PDE state is legitimate. However, PDE must validate the incoming content before any `.planning/` mutation: parse the file, extract structured data (changed rules, updated tokens), validate against PDE's schema, then route through `pde-tools.cjs` write functions with the same locking used by all other PDE writes.

- **For manifest or state files** (`.planning/design-manifest.json`, `.planning/DESIGN-STATE.md`): These must never be written by an external editor directly. If Antigravity needs to update a token value, it modifies `DESIGN.md` (its own file), and PDE's sync engine picks up the change and translates it back through the normal design pipeline skill pathway.

- **Confirmation gates**: Any sync operation that mutates `.planning/` state must go through PDE's existing human approval flow (matching the pattern used by deploy.md's 4 mandatory gates). Show the user what will change in `.planning/` state, require explicit confirmation before writing.

- **Keep the MCP server read-only**: Write-back capability does not require MCP write tools. It is implemented as PDE hooks watching editor file changes, not as editor-invoked MCP tool calls.

**Warning signs:**
- Any MCP tool definition using `fs.writeFileSync` or invoking `pde-tools.cjs` functions
- External editor modifying files under `.planning/` without an active PDE session
- `RECONCILIATION.md` showing git commits with no traceable PDE plan
- `design-manifest.json` with `updatedAt` timestamps not matching any PDE skill execution log

**Phase to address:**
Phase 1 (sync architecture) — the write routing contract must be defined before any write-back code is written. Which paths are editor-owned (editable by external tools), which are PDE-owned (read-only to external tools), and what the translation layer between them looks like. This boundary is the architectural decision that determines whether v0.16 is safe or breaks PDE's integrity guarantees.

---

### Pitfall 3: State Conflicts — Two Editors Modify the Same Token Simultaneously

**What goes wrong:**
Design token values live in multiple places simultaneously: PDE's DTCG token files (`.planning/design/SYS-tokens.json`), the generated `DESIGN.md` (Antigravity's view), and `.cursor/rules/pde-context.mdc` (Cursor's view). If a user edits a color token in Antigravity's DESIGN.md while a PDE design pipeline skill is mid-execution and regenerating the same token, both writes race to the same value. The later write wins, silently overwriting the other. In a less obvious scenario, Cursor AI generates code using a color value from a stale `.mdc` file, then Antigravity updates the same token from a live Stitch extraction — now PDE's DTCG tokens, the generated code, and the editor context files all show different values for the same token. No error occurs; the system silently produces inconsistent state.

**Why it happens:**
Last-write-wins (LWW) is the default behavior of any file-based system without explicit conflict handling. LWW requires synchronized clocks to be correct (files on the same machine have consistent mtime, but concurrent modifications within the same second can be arbitrarily ordered by the filesystem). Without explicit versioning — a monotonic sequence number or vector clock per token — there is no way to know which modification is semantically "correct," only which one happened to be written last.

**How to avoid:**
For PDE's use case, full CRDT or OT implementation is overkill (and adds dependencies). Use a simpler, correct strategy:

- **Single source of truth assignment**: DTCG token files in `.planning/design/` are the canonical source. `DESIGN.md` and `.cursor/rules/pde-context.mdc` are derived outputs, never canonical inputs. Any editor modification to a derived file is treated as a request to update the canonical source, not as a direct mutation.

- **Version field in sync state**: `.planning/sync-state.json` tracks a monotonic `syncVersion` integer, incremented on each PDE-originated write. When PDE reads back a change from an editor file, it checks whether the file's embedded `pde-sync-version` field matches the current `syncVersion`. If the version is stale (file was generated by an older sync cycle and user edited it), PDE shows the conflict to the user rather than silently overwriting.

- **Field-level ownership**: Token values: PDE owns (Antigravity can suggest changes, PDE applies after confirmation). Editor rules/globs: Editor owns (PDE reads back but does not override with regenerated defaults). This eliminates the ambiguous case where both systems think they own the same field.

- **Conflict presentation**: When a true conflict is detected (both PDE and editor modified the same token since last sync), present a 3-way diff (original → PDE change, original → editor change) and require explicit user resolution. Do not silently pick one side.

**Warning signs:**
- Token values in `.planning/design/SYS-tokens.json` and `DESIGN.md` don't match after a sync cycle
- `DESIGN-STATE.md` showing a color hex that differs from `.cursor/rules/pde-context.mdc` embedded token value
- Users reporting "the color keeps changing back" — sign that two systems are fighting over ownership

**Phase to address:**
Phase 2 (write-back routing and conflict model) — define ownership and the version field before implementing any bidirectional token sync. Retrofitting conflict detection after users hit data loss is the highest recovery cost scenario in this milestone.

---

### Pitfall 4: File Watching Not Persistent Across Claude Code Sessions

**What goes wrong:**
Claude Code is session-based, not a persistent daemon. File watchers registered via `fs.watch()` or chokidar exist only for the duration of the active session. When the user closes Claude Code, all watchers are torn down. When they reopen it, file changes that happened between sessions are invisible to the sync engine — no change events fired, no sync triggered, no user notification that their editor has drifted from PDE state during the gap. If the user extensively modified `.cursor/rules/` files during a work session without Claude Code open, those changes are invisible until the next explicit `/pde:editor-sync` invocation.

Additionally, Claude Code snapshots hooks at session start (as confirmed by official docs: "config edits don't hot-apply: Claude snapshots hooks at session start"). This means hooks added mid-session that are intended to trigger file watchers don't activate until the next session restart.

**Why it happens:**
Developers building bidirectional sync assume a persistent process model (typical in server-side sync systems). Claude Code's plugin model is fundamentally different — it is an interactive session. Any state that needs to persist between sessions must be written to disk explicitly, not held in process memory or watch subscriptions.

**How to avoid:**
- **Session-start reconciliation**: Implement a PostSessionStart (or equivalent hook) that runs a full diff between current editor file state and PDE's last-known sync state. This reconciliation step catches all out-of-session changes by comparing file hashes against `.planning/sync-state.json` at every session start. Cost: a one-time O(n) hash scan on session open, acceptable given `.planning/` file count.

- **No dependency on persistent watchers for correctness**: File watchers provide a convenience UX (changes sync during the session). Session-start reconciliation provides the correctness guarantee (no changes are ever silently lost). Build the system so correctness does not require the watcher to be running.

- **Explicit sync command as fallback**: `/pde:editor-sync` must work as a complete reconciliation command, not just a "trigger watcher" command. Users can invoke it anytime to force a full sync, regardless of session state.

- **Change detection at skill execution time**: Any PDE skill that reads editor context (brief, plan, execute) should check whether the context files have changed since the last sync before running. This opportunistically catches out-of-session changes even if the session-start hook somehow missed them.

**Warning signs:**
- Out-of-session edits to `.cursor/rules/` never appearing in `.planning/` state
- Users reporting "I changed the rules but PDE doesn't know about it"
- `.planning/sync-state.json` showing timestamps from previous sessions only
- File watchers registered in session hooks failing silently when hooks aren't snapshotted yet

**Phase to address:**
Phase 2 (write-back routing) — session-start reconciliation must be implemented alongside file watchers. Shipping watchers without reconciliation means correctness depends on the user never closing Claude Code between edits.

---

### Pitfall 5: Cursor .mdc Write-Back Loses Frontmatter on Round-Trip

**What goes wrong:**
PDE generates `.cursor/rules/pde-context.mdc` with YAML frontmatter (`description`, `globs`, `alwaysApply`). When the user edits this file in Cursor, Cursor may modify the frontmatter (changing glob patterns, toggling alwaysApply). When PDE reads the modified file back and attempts to parse the frontmatter, several failure modes occur:
- Cursor's UI adds or normalizes frontmatter fields that PDE's parser doesn't expect
- Inline comments on the `globs:` line (`globs: "**/*.ts" # only TypeScript`) cause YAML parse failures — a confirmed Cursor bug where "everything after the colon is parsed as-is"
- Multi-line glob arrays vs. single-line glob strings parse differently depending on Cursor version
- The `---` delimiter placement varies between Cursor versions and community-authored rules

If PDE fails to parse the frontmatter, it either throws and aborts sync, or silently drops the user's glob changes and regenerates the file with PDE defaults.

**Why it happens:**
The `.mdc` format is described as "YAML frontmatter + Markdown body" but it is not strictly YAML — Cursor has a custom parser with edge cases not in the YAML spec. The Cursor community forum documents multiple parsing ambiguities that are unresolved as of early 2026. PDE generates syntactically valid `.mdc` but cannot guarantee that user edits (or Cursor's own UI modifications) preserve PDE's expected parse targets.

**How to avoid:**
- Parse incoming `.mdc` frontmatter with error tolerance: if YAML.parse fails, fall back to regex extraction of known fields (`description: (.+)`, `globs: (.+)`, `alwaysApply: (true|false)`). Log parse failures but do not abort sync.
- Separate PDE-owned sections from user-editable sections within the `.mdc` body using comment markers: `<!-- PDE:BEGIN -->` and `<!-- PDE:END -->`. PDE only regenerates content within these markers; everything outside is treated as user-authored and preserved verbatim.
- Write a round-trip test: generate a `.mdc` file, simulate common user edits (add a glob, toggle alwaysApply, add a comment), read it back, verify PDE extracts the correct values. Run this as a Nyquist assertion in the sync engine phase.
- Never overwrite the entire `.mdc` file on sync. Perform surgical replacement of the PDE-owned section only.

**Warning signs:**
- YAML parse errors in sync logs referencing `.cursor/rules/` files
- User glob patterns being silently reset to PDE defaults after sync
- Frontmatter fields added by Cursor UI not appearing in PDE's parsed representation
- `.mdc` files with `globs:` lines containing comments causing sync crashes

**Phase to address:**
Phase 3 (Cursor bidirectional sync) — round-trip fidelity tests must be written before write-back is shipped. The `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` section model is the architectural decision that prevents this class of failure.

---

### Pitfall 6: Antigravity DESIGN.md Format Is Community-Documented, Not Officially Stable

**What goes wrong:**
PDE v0.15 generates `DESIGN.md` in Antigravity's expected format (colors, typography, layout from DTCG tokens). v0.16 reads `DESIGN.md` back and attempts to extract design decisions made by Antigravity. However, the DESIGN.md format is community-documented — there is no official Antigravity spec for its structure. Different Antigravity versions (v1.20.x and the upcoming Stitch-native update) produce DESIGN.md in slightly different formats. Additionally, the `TOON` token format (`.context/design-tokens.toon`) used by Antigravity's Stitch integration is separate from DESIGN.md and has its own conversion requirements. If PDE's DESIGN.md parser is written against one community-observed format version and Antigravity releases an update that changes the structure, silent parse failures produce incorrect token write-backs.

**Why it happens:**
Absence of an official DESIGN.md specification means PDE must reverse-engineer the format from community examples and its own generated output. Community-maintained specs drift. The TOON format adds a second parsing surface — converting TOON-encoded tokens to DTCG and back is a lossy operation because TOON carries AI-readable descriptions that have no DTCG equivalent, and DTCG carries metadata (type, $extension) that TOON does not represent.

**How to avoid:**
- Make DESIGN.md parsing defensive and versioned. Embed a `<!-- pde-format-version: 1.0 -->` comment in PDE-generated DESIGN.md files. When reading back, check for this marker and apply the correct parser. If the marker is absent (Antigravity-generated file), apply a lenient parser with explicit fallbacks for unknown sections.
- Parse DESIGN.md with section-level granularity, not whole-file regex. Extract known sections (`## Colors`, `## Typography`, `## Spacing`) individually. Unknown sections are preserved verbatim, not parsed.
- For TOON format: build a bidirectional TOON ↔ DTCG converter but test the round-trip explicitly. `OKLCH(0.6 0.2 240)` → TOON description → DTCG `$value` must preserve the original color value to within floating-point precision. Any lossy step must be logged as a warning, not silently accepted.
- Pin against Antigravity's DESIGN.md format as observed in their Stitch codelab (the most authoritative available reference) and add a format-version detection assertion to the Nyquist test suite. If Antigravity changes the format, the test fails loudly rather than silently producing wrong token write-backs.

**Warning signs:**
- DTCG token values after a write-back cycle differing from the values before the cycle (loss of precision)
- `## Colors` section missing from a Antigravity-generated DESIGN.md that PDE tries to parse
- TOON-encoded tokens showing different OKLCH values than the originating DTCG file after round-trip
- Unknown section headers in DESIGN.md causing PDE's parser to throw or skip the entire file

**Phase to address:**
Phase 4 (Antigravity bidirectional sync) — the format version detection and section-level parser must be designed upfront. Do not implement DESIGN.md write-back as a simple regex scan of the full file.

---

### Pitfall 7: DTCG → Tailwind v4 → .mdc → DTCG Round-Trip Loses Token Precision

**What goes wrong:**
The v0.16 write-back path includes a token translation chain: PDE's DTCG tokens (`.planning/design/SYS-tokens.json`) are converted to Tailwind v4 CSS custom properties (in `.cursor/rules/pde-tokens.mdc`). If a user or Cursor AI modifies the CSS variable values in the `.mdc` file, PDE reads them back and attempts to convert them back to DTCG format. Each conversion step loses information:

- DTCG `$type: "color"` + OKLCH color space metadata is stripped when written as `--color-primary: oklch(0.6 0.2 240)`
- DTCG token `$description`, `$extensions`, and group hierarchy are lost in the CSS variable form
- Tailwind v4's `@theme` block uses `@property` CSS rules for internal properties — if Cursor AI generates an `@property` rule, PDE may misparse the value
- Dimension tokens with explicit units (`{ $value: 16, $type: "dimension" }`) round-trip through CSS as `1rem` or `16px`, and converting back requires knowing the original unit and base font size

After a round-trip, the DTCG file has different `$extension` data, different type metadata, and potentially different unit representations for the same semantic values.

**Why it happens:**
Token format conversion was designed as a one-way pipeline in v0.15 (DTCG → Tailwind, DTCG → DESIGN.md). Write-back requires the reverse direction, which was never designed. The DTCG spec (stable as of October 2025) defines rich metadata that has no equivalent in CSS custom properties. Any round-trip through CSS drops that metadata permanently unless it is preserved out-of-band.

**How to avoid:**
- Treat CSS variable form in `.mdc` files as a **display format**, not a canonical format. Write-back from `.mdc` files should only propagate changed VALUES, not attempt to reconstruct full DTCG token structures from CSS. The DTCG file remains canonical; PDE applies the changed value to the existing DTCG token structure.
- Implement value-only write-back: parse `--color-primary: oklch(0.6 0.2 240)` → find the matching token in DTCG by variable name mapping → update only `$value` → preserve all other DTCG metadata unchanged.
- Maintain an explicit name mapping table: `{ "color-primary": "color.brand.primary" }` that maps CSS variable names to DTCG token paths. Without this table, there is no reliable way to reverse-engineer which DTCG token a CSS variable came from.
- Test the round-trip explicitly: generate DTCG → CSS variables → modify one value → write back → verify DTCG shows updated value and all other fields are intact. This must be a Nyquist test, not a manual check.

**Warning signs:**
- DTCG `$description` fields becoming empty after a sync cycle that touched token values
- DTCG `$extensions` fields disappearing after write-back
- Dimension token values changing units (rem vs px) unexpectedly after round-trip
- Token group hierarchy flattening after write-back (nested groups becoming flat namespaced keys)

**Phase to address:**
Phase 3 (Cursor bidirectional sync) — the name mapping table and value-only write-back strategy must be defined before any token write-back code is written. Retrofitting precision preservation after users lose token metadata is HIGH recovery cost.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping write origin marker, using only hash comparison | Simpler code | Hash comparison misses in-flight writes during the comparison window; race condition that becomes visible under load | Never — use both hash AND marker for defense in depth |
| Implementing write-back as direct MCP tool calls to `.planning/` | Fastest path to feature demo | Bypasses all PDE validation, locking, and audit trail; same clobber bugs from v0.11/v0.12/v0.14 resurface | Never |
| Single DESIGN.md parser without version detection | Fewer branches | Silent parse failures when Antigravity updates its output format; wrong tokens written back | Never — version detection is 5 lines of code |
| Overwriting entire `.mdc` file instead of surgical section replacement | Simpler regeneration logic | Destroys user's glob customizations; high friction, users stop customizing | Never — use section markers |
| Last-write-wins for token conflicts without user prompt | No conflict UI to build | Silent data loss; users lose work without knowing | Only acceptable if both sides modified non-overlapping tokens |
| Session watchers only, no session-start reconciliation | Less startup overhead | Out-of-session edits silently ignored until user manually runs sync | Never — reconciliation is the correctness guarantee |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Cursor .mdc write-back | Parsing entire file as YAML | Section-based parsing with `<!-- PDE:BEGIN -->` markers; YAML parse only the frontmatter block |
| Cursor .mdc write-back | Assuming `globs:` is always a string | Handle both string and YAML array forms; Cursor 0.44+ may use array, older versions use string |
| Antigravity DESIGN.md | Treating entire file as structured data | Only parse `## Colors`, `## Typography`, `## Spacing` sections; other sections may be freeform user text |
| Antigravity DESIGN.md | Assuming TOON format = DTCG | TOON is a lossy AI-readable encoding; explicit conversion table required, not a 1:1 mapping |
| File watcher on `.planning/` | Watching the entire `.planning/` tree | Watch only specific files that editors can meaningfully modify (`.cursor/rules/*.mdc`, `AGENTS.md`, `GEMINI.md`, `DESIGN.md`); never watch `.planning/` internals or loops are inevitable |
| File watcher debounce | Using a fixed 500ms debounce | Editors write files in bursts; use `awaitWriteFinish` (chokidar) or poll until file size stabilizes, not just a timer |
| Sync state persistence | Storing sync state in process memory | Any crash or session end loses the state; always persist to `.planning/sync-state.json` |
| Conflict presentation | Showing raw JSON diff to user | Show semantic diff: "Token `color.brand.primary` changed from `oklch(0.6 0.2 240)` → `oklch(0.5 0.25 235)` in Antigravity; keep PDE value or accept editor change?" |
| MCP write-back routing | Adding write tools to pde-mcp-server | Write-back must go through hook-based file watching, never MCP tool calls; pde-mcp-server stays read-only |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Hash-scanning all `.planning/` on every file change event | 1-5s delay on every editor save | Only hash-scan the specific file that changed; maintain a file→hash map in sync-state.json | `.planning/` exceeds ~200 files |
| Re-generating all editor context files on any `.planning/` change | 2-10s regeneration delay interrupting editor workflow | Only regenerate the specific editor file whose source tokens changed; use fine-grained change detection | Any sustained editing session |
| File watcher watching `.cursor/rules/*.mdc` AND PDE writing `.cursor/rules/*.mdc` without write lock | Infinite regeneration loop consuming all CPU | Write lock + origin marker on every PDE write; watcher checks marker before triggering | Immediately on first write-back |
| Session-start reconciliation reading all monitored files | 3-8s startup overhead on large projects | Cache file hashes in `.planning/sync-state.json`; only re-hash files whose mtime changed since last session | Projects with >100 editor context files |
| Chokidar watching `.planning/` on Windows with polling fallback | 400MB+ memory, lost events during startup | Never use polling mode; if fsevents unavailable, degrade gracefully to manual `/pde:editor-sync` rather than polling | Windows environments without native fsevents |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Allowing write-back to write arbitrary content from editor files into `.planning/` without validation | Editor file injection: a malicious `.mdc` rule could inject arbitrary text into PDE's planning state | Parse structured data only (token values, rule metadata); never write raw editor file content to `.planning/` |
| Embedding absolute paths in sync-state.json | Path leakage if `.planning/` is committed to git; breaks portability | Store paths relative to project root only |
| Accepting write-back from any file change without verifying it came from a known editor location | Rogue process writes a file to `.cursor/rules/` and triggers PDE state mutation | Validate that changed files are in the explicitly monitored set before acting on changes |
| Using `fs.watch()` (Node built-in) instead of chokidar on macOS | `fs.watch` on macOS delivers events after a delay and misses rapid changes; PDE acts on stale data | Use chokidar with `usePolling: false`; fall back gracefully, never silently miss events |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent write-back with no user notification | User's editor changes disappear into PDE state without acknowledgment; no way to verify sync worked | Log every write-back to the NDJSON event bus; show in tmux dashboard Pane 7 as a sync event |
| Blocking sync — user waits for PDE to finish before editor responds | Editing becomes sluggish; users disable sync | Non-blocking: file watcher triggers async background sync; PDE processes in the background, notifies when complete |
| Showing "sync conflict" on every session start due to benign clock skew | Users see false alarms and start ignoring conflicts | Hash-based comparison (not timestamp-based); only show conflict if VALUES differ, not if timestamps differ |
| No way to undo a write-back that produced wrong state | User cannot recover from a bad sync without manual git revert | Auto-snapshot `.planning/` state to `.planning/sync-snapshots/` before each write-back batch; `/pde:sync-rollback` command |
| Requiring active Claude Code session for sync to work | Users feel constrained: must keep Claude Code open for editors to stay in sync | Session-start reconciliation means Claude Code session is optional for continuous sync; correctness guaranteed on next open |

---

## "Looks Done But Isn't" Checklist

- [ ] **Loop prevention**: Generate a `.mdc` file, immediately check that the file watcher does NOT trigger a re-generation (write marker in place and respected)
- [ ] **MCP server**: Confirm pde-mcp-server still has zero write tools after v0.16 changes — grep all tool handlers for `fs.write`, `fs.mkdir`, `fs.append`, `fs.unlink`
- [ ] **Conflict detection**: Manually edit a token in DESIGN.md while PDE has a different value — verify conflict UI appears rather than silent overwrite
- [ ] **Session boundary**: Edit `.cursor/rules/pde-context.mdc` with Claude Code closed, reopen Claude Code — verify session-start reconciliation detects and applies the change
- [ ] **Round-trip fidelity**: Run DTCG → Tailwind .mdc → modify a value → write back → verify DTCG `$description`, `$extensions`, and group hierarchy are all intact
- [ ] **DESIGN.md format detection**: Use an Antigravity-generated DESIGN.md (not PDE-generated) as write-back source — verify parse succeeds with degraded-mode fallbacks
- [ ] **Section preservation**: Add a custom section to a PDE-generated `.mdc` file → trigger regeneration → verify custom section is preserved
- [ ] **Frontmatter round-trip**: Add a comment to the `globs:` line in a `.mdc` file → trigger write-back parsing → verify parse succeeds (no YAML crash)
- [ ] **Sync state persistence**: Force-quit Claude Code mid-sync → reopen → verify sync-state.json is consistent (no partial writes, no orphaned lock flags)
- [ ] **Event bus visibility**: Trigger a write-back cycle → verify sync events appear in the NDJSON event bus and tmux dashboard Pane 7
- [ ] **Confirmation gates**: Trigger a write-back that would mutate `.planning/` state → verify user confirmation prompt appears before any file is written
- [ ] **Rollback**: Execute a write-back → invoke `/pde:sync-rollback` → verify `.planning/` state is restored to pre-sync snapshot

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Infinite sync loop discovered in production | HIGH | Kill Claude Code session immediately; clear write lock flags from sync-state.json; add origin marker to all generated files; add loop-break test before re-enabling watcher |
| Write-back bypassed pde-tools.cjs, corrupt manifest | HIGH | `git revert` to last known-good manifest commit; audit all writes since corruption; add validation gate and re-test |
| Token precision loss after round-trip (DTCG metadata destroyed) | HIGH | Restore DTCG files from git; implement value-only write-back; add round-trip Nyquist test; regenerate editor context files |
| DESIGN.md format changed by Antigravity update | MEDIUM | Update format version detection; add lenient parser fallback for new format; log parse failures visibly |
| Session-start reconciliation applying stale out-of-session edits after user reverted them | MEDIUM | Add version check to reconciliation: only apply changes newer than last sync timestamp; provide `/pde:sync-rollback` |
| User's `.mdc` glob customizations overwritten by PDE regeneration | MEDIUM | Restore from git; implement `<!-- PDE:BEGIN -->` / `<!-- PDE:END -->` section markers; never regenerate entire file |
| Conflict UI ignored by user, state diverged | LOW | Add explicit "last synced" timestamp to DESIGN-STATE.md; surface divergence in `pde:check-readiness` as CONCERNS |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Infinite sync loop | Phase 1 (sync loop architecture + write origin marker) | Write marker test: PDE writes file → watcher fires → confirm no re-generation triggered |
| MCP write-back bypass | Phase 1 (sync architecture / write routing contract) | Grep pde-mcp-server tools for write operations; zero hits required |
| State conflicts / last-write-wins | Phase 2 (write-back routing + conflict model) | Concurrent modification test: PDE and simulated editor modify same token; verify conflict UI, not silent overwrite |
| Session boundary gap | Phase 2 (session-start reconciliation) | Close Claude Code, edit `.mdc` file, reopen: verify change detected within 1s of session start |
| .mdc frontmatter round-trip loss | Phase 3 (Cursor bidirectional sync) | Round-trip test: generate → user-edit simulation → read back → verify all values correct |
| Antigravity DESIGN.md format instability | Phase 4 (Antigravity bidirectional sync) | Format version detection test + lenient parser test with unknown section headers |
| DTCG round-trip precision loss | Phase 3 (Cursor bidirectional sync) | Token round-trip Nyquist test: DTCG → CSS var → modify value → write back → verify only `$value` changed |
| File watcher performance on large .planning/ | Phase 2 (write-back routing) | Watch only monitored editor file paths; never watch .planning/ internals |
| chokidar on Windows | Phase 1 (sync loop architecture) | Degrade gracefully to manual sync if polling would be used; test on Windows CI |
| TOON format conversion loss | Phase 4 (Antigravity bidirectional sync) | TOON round-trip test: DTCG → TOON → back to DTCG → verify OKLCH values match to 4 decimal places |

---

## Sources

- [How To Stop Infinite Loops In Bidirectional Syncs — Valence](https://docs.valence.app/en/latest/guides/stop-infinite-loops.html) — origin tracking, fingerprinting, record-based markers, context-based markers
- [The Infinite Loop Trap — Ambientia](https://www.ambientia.fi/en/news/the-infinite-loop-trap-how-to-prevent-your-integration-from-talking-to-itself) — integration user identification pattern for loop prevention
- [Bidirectional Sync Without Infinite Loops — ServiceNow DevPro Tips](https://snprotips.com/blog/2026/bi-directional-journal-entry-sync-without-infinite-loops-for-comments-or-work-notes) — context-based markers and session locking
- [Building a Resilient Bi-Directional Sync System — Medium](https://medium.com/@chiragpethad/building-a-resilient-bi-directional-sync-system-with-kafka-and-cqrs-2b0623b42b8f) — CQRS and event sourcing for conflict prevention
- [EscapeRoute CVE-2025-53109/53110 — Cymulate](https://cymulate.com/blog/cve-2025-53109-53110-escaperoute-anthropic/) — filesystem MCP server path validation bypass; write capability risks
- [MCP Security Survival Guide — Towards Data Science](https://towardsdatascience.com/the-mcp-security-survival-guide-best-practices-pitfalls-and-real-world-lessons/) — MCP write tool safety patterns
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — session-based hook lifecycle, snapshot-at-start behavior
- [Claude Code Hooks Daemon — Edmonds Commerce](https://edmondscommerce.co.uk/articles/claude-code-hooks-daemon/) — persistent hook execution patterns beyond session boundaries
- [Chokidar Race Condition Issue #1112](https://github.com/paulmillr/chokidar/issues/1112) — directory watch race conditions
- [Chokidar Windows Performance Issue #228](https://github.com/paulmillr/chokidar/issues/228) — 400MB memory, lost events on large directories
- [Cursor Rules MDC Best Practices — Cursor Forum](https://forum.cursor.com/t/my-best-practices-for-mdc-rules-and-troubleshooting/50526) — frontmatter parsing ambiguity, inline comment bug
- [Cursor Rules MDC Clarification — Cursor Forum](https://forum.cursor.com/t/cursor-rules-mdc-clarification/104879) — rule type inference from frontmatter fields
- [Design-to-Code with Antigravity and Stitch MCP — Google Codelabs](https://codelabs.developers.google.com/design-to-code-with-antigravity-stitch) — DESIGN.md generation, TOON format, Antigravity native Stitch path
- [Design Tokens Specification v1 Stable — W3C Community Group](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/) — DTCG first stable version Oct 2025, structured color values with color space
- [Tailwind CSS 4 @theme Design Tokens — Mavik Labs](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026) — OKLCH, @property rules, CSS variable architecture
- [CRDT vs OT for Conflict Resolution — Tiny Cloud](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/) — why simpler patterns (LWW with ownership) are appropriate at PDE scale
- [Optimistic Locking — ByteByteGo](https://blog.bytebytego.com/p/optimistic-locking) — version number vs timestamp comparison; version number preferred
- PDE PROJECT.md v0.16 goal — "Cursor → PDE: .cursor/rules/*.mdc changes propagate back to .planning/ state"; "Out of scope: Real-time collaborative editing — conflicts with file-based state model"
- PDE v0.15 PITFALLS.md — Pitfall 1 (MCP write tools), Pitfall 2 (context staleness), Pitfall 5 (divergence detection) provide foundational constraints this document extends

---
*Pitfalls research for: PDE v0.16 Bidirectional Multi-Editor Context Sync*
*Researched: 2026-03-24*
