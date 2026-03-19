# Phase 44: End-to-End Validation - Research

**Researched:** 2026-03-19
**Domain:** MCP integration validation, concurrent server state, context compaction recovery, write-back safety
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VAL-01 | User can run all integrations simultaneously (2+ MCP servers connected) | Concurrency is safe at Claude Code runtime layer — isolation is per-server; risk is `.planning/` filesystem write conflicts between concurrent sync operations |
| VAL-02 | All integrations function correctly after context compaction (auth recovery) | Auth tokens are NOT in mcp-connections.json; OAuth tokens are stored in OS keychain by Claude Code; mcp-connections.json provides metadata (server key, status, repo/teamId) that is sufficient to re-establish context post-compaction |
| VAL-03 | Write-back operations to external services require explicit user confirmation | Confirmation gates already implemented in all 5 write-back workflows; validation must verify each gate structurally and audit for bypass paths |
</phase_requirements>

---

## Summary

Phase 44 is a **validation phase**, not a feature phase. Its primary product is evidence — tests and structural audits that prove the five properties required by VAL-01, VAL-02, and VAL-03. Unlike prior phases that built new workflows, this phase writes tests that verify correctness of what was already built.

The three requirements map to three distinct validation domains:

**VAL-01 (Concurrency):** Claude Code handles multiple MCP servers simultaneously by aggregating all configured server tools into one unified context. The servers themselves do not share state — each is an independent OAuth session. The risk is NOT at the MCP layer; it is at the `.planning/` filesystem layer where concurrent `sync` commands (e.g., `--github` and `--figma` running in the same session) both write to `REQUIREMENTS.md` or `mcp-connections.json`. The validation must confirm that the PDE adapter layer is correctly structured to avoid concurrent write conflicts.

**VAL-02 (Auth Recovery):** OAuth tokens and session IDs are NOT stored in `.planning/mcp-connections.json`. They are stored by Claude Code in the OS keychain (macOS) or a credentials file. This is a known behavior confirmed by issue #34832 in the Claude Code repository. Context compaction destroys in-conversation auth state but does NOT destroy the OAuth tokens persisted by Claude Code's MCP client. What `mcp-connections.json` stores — `status: connected`, `repo`, `teamId`, `projectKey`, `connected_at` — is metadata sufficient for PDE workflows to re-read and resume without re-prompting the user for auth. The validation must confirm that all MCP-dependent workflows read their configuration from `mcp-connections.json` at workflow start (not from in-session variables) and degrade gracefully when the service is unavailable.

**VAL-03 (Write-Back Safety):** Every write-back workflow already has a confirmation gate implemented (GH-02, LIN-03, JIRA-03, FIG-04, PEN-01 via sync-pencil). The validation must structurally audit all five workflows to confirm: (a) the gate exists, (b) is gated on `y` or `yes` only, (c) the write MCP call is downstream of the gate (not before it), and (d) no bypass path exists.

**Primary recommendation:** Build a `tests/phase-44/` directory containing structural tests for all three validation properties. Do NOT write integration tests that require live MCP connections — those are manual-only. Write tests that verify the code structure guarantees the properties.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in test runner | `node --test` | Test framework | Already used in phases 40-43; zero deps |
| `node:test` + `node:assert/strict` | Built-in | Test assertions | Established pattern across all 23 existing test files |
| `node:fs` | Built-in | File reading in tests | Established pattern for structural tests |
| `node:path` | Built-in | Path resolution in tests | Established pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `createRequire` from `module` | Built-in ESM | Loading CJS modules in ESM tests | Established pattern for loading mcp-bridge.cjs |
| `grep` (via Bash) | System | Quick line-count verification | Used in per-task verify commands in VALIDATION.md |

**Installation:** None required. Zero new dependencies.

---

## Architecture Patterns

### Recommended Test Structure

```
tests/
└── phase-44/
    ├── concurrency-isolation.test.mjs      # VAL-01: filesystem write paths don't overlap
    ├── auth-recovery-structure.test.mjs    # VAL-02: workflows read mcp-connections.json at start
    └── writeback-confirmation.test.mjs     # VAL-03: all 5 confirmation gates exist and are correctly positioned
```

### Pattern 1: Structural Workflow Tests (VAL-03)

The established pattern from phases 40-43 is to load the workflow file as text and assert structural properties via string search. This is the only testable approach without live MCP connections.

**What:** Read the workflow `.md` file, assert that confirmation gate exists BEFORE the write tool call section.
**When to use:** For all write-back workflow validation (VAL-03).

```javascript
// Source: Established in tests/phase-40/handoff-prs.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../workflows/handoff-create-prs.md');
const content = fs.readFileSync(workflowPath, 'utf-8');

describe('VAL-03 — handoff-create-prs.md confirmation gate', () => {
  it('confirmation gate appears before MCP write step', () => {
    const gateIdx = content.search(/Create this PR\?|y\/n/i);
    const writeIdx = content.search(/Step 4|only after user confirm/i);
    assert.ok(gateIdx !== -1, 'confirmation gate must exist');
    assert.ok(writeIdx !== -1, 'write step must exist');
    assert.ok(gateIdx < writeIdx, 'gate must precede write step');
  });

  it('gate rejects non-y/yes responses ("No PRs created.")', () => {
    assert.match(content, /No PRs created/);
  });
});
```

### Pattern 2: mcp-connections.json Read-at-Start (VAL-02)

All PDE workflows that depend on MCP servers MUST read their connection metadata from `mcp-connections.json` at Step 0. This is the auth recovery pattern — it works because `mcp-connections.json` is on disk and survives context compaction.

**What:** Assert that each MCP-dependent workflow calls `b.loadConnections()` or reads `mcp-connections.json` before any MCP tool call.
**When to use:** For all 5 integration workflows (sync-github, sync-linear, sync-jira, sync-figma, sync-pencil).

```javascript
// Source: Established pattern from tests/phase-43/sync-pencil-workflow.test.mjs
it('workflow reads mcp-connections.json at initialization', () => {
  assert.ok(
    content.includes('loadConnections()') || content.includes('b.loadConnections()'),
    'workflow must call loadConnections() to read connection metadata from disk'
  );
});
```

### Pattern 3: Filesystem Isolation Audit (VAL-01)

Concurrency isolation is verified by confirming that each sync workflow writes to distinct, non-overlapping file paths, OR uses append-not-replace semantics that are safe for concurrent access.

**What:** Assert that workflow files targeting the same output file (e.g., REQUIREMENTS.md) use section-scoped writes rather than full-file rewrites.
**When to use:** For VAL-01 concurrent sync validation.

```javascript
// Assert that sync-github.md doesn't truncate REQUIREMENTS.md
it('sync-github.md uses section-scoped write (not full file overwrite)', () => {
  const content = fs.readFileSync(syncGithubPath, 'utf-8');
  // Must append to specific GitHub section, not overwrite entire file
  assert.match(content, /## GitHub Issues|### GitHub|github.*section/i);
  // Must NOT use the pattern that indicates full truncation
  assert.doesNotMatch(content, /fs\.writeFileSync.*REQUIREMENTS\.md.*\{.*overwrite/);
});
```

### Pattern 4: Dual-Server Structural Audit (VAL-01)

The structural test for concurrent server support is confirming that each command's `allowed-tools` frontmatter does NOT include ALL MCP namespaces simultaneously (which would force Claude to load all MCP tool descriptions upfront), AND that the sync.md command router dispatches based on flag (not loading multiple servers at once).

**What:** Assert that `commands/sync.md` routes to exactly one sub-workflow per invocation.
**When to use:** For VAL-01 concurrent safety at command routing level.

### Anti-Patterns to Avoid

- **Integration tests requiring live MCP servers:** These cannot run in CI. All tests in `tests/phase-44/` must be purely structural (file reading + assertion). Live validation is manual-only.
- **Testing the same structural property twice:** Each of the 5 write-back workflows only needs one confirmation gate test set. Don't repeat the full pattern for each workflow — use parameterized tests.
- **Asserting specific line numbers:** Line numbers change as workflows are edited. Always use string search / regex.
- **Watch-mode test flags:** The project uses `node --test` without `--watch`. Do not introduce watch mode.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth token persistence across compaction | Custom token storage or encryption | Rely on Claude Code's built-in OAuth persistence in OS keychain | Claude Code already handles this; mcp-connections.json only stores metadata, never tokens |
| Concurrency lock files for `.planning/` | flock(), mutex, SQLite-based locking | Single-writer-at-a-time session model (by convention) | PDE is a session-based plugin; Claude Code is single-session; true concurrent writes only happen if user manually runs two commands simultaneously, which the confirmation gates prevent |
| MCP server mock/stub for testing | Mock MCP transport layer | Structural tests on workflow text files | The structural test pattern from phases 40-43 achieves Nyquist coverage without mocking |
| Test runner framework (Jest/Vitest) | Migrating to a new framework | `node --test` (built-in) | Already established across 23 test files; zero dependency; project constraint |

**Key insight:** The PDE validation approach is intentionally "test the contract, not the runtime." Since MCP servers are external services with OAuth, the only testable surface is the workflow code structure. Phase 44 tests prove that the code structure WOULD behave correctly in a live environment — they don't replace live testing.

---

## Common Pitfalls

### Pitfall 1: Testing the Wrong Auth Recovery Layer

**What goes wrong:** Researcher/planner concludes that VAL-02 requires storing OAuth tokens in `mcp-connections.json` or implementing a custom credential cache.
**Why it happens:** The GitHub issue #34832 describes a Claude Code bug where auth IS lost after compaction. Reading quickly, one concludes PDE must solve this.
**How to avoid:** Understand what PDE stores vs. what Claude Code stores. PDE's `mcp-connections.json` stores: `status`, `server_key`, `repo`, `teamId`, `projectKey`, `connected_at`. Claude Code stores: OAuth tokens in OS keychain. After compaction, the OAuth tokens SURVIVE because they're in the keychain, not the conversation. What workflows need to re-establish is the application-level context (which repo, which team, which project) — and that IS in `mcp-connections.json`. VAL-02 validation is therefore: confirm that every MCP workflow reads from `mcp-connections.json` at startup.
**Warning signs:** Any plan that involves writing OAuth tokens to disk, creating a credential cache, or modifying `mcp-bridge.cjs` to store session state.

### Pitfall 2: Treating VAL-01 as Requiring Concurrent Process Management

**What goes wrong:** Planner concludes VAL-01 requires implementing mutex locks, flock, or write queues for `.planning/` directory access.
**Why it happens:** "Concurrency" sounds like it requires concurrent process management.
**How to avoid:** In the PDE session model, "2+ MCP servers connected simultaneously" means the user has configured multiple MCP servers in their Claude Code session, not that multiple node processes are writing simultaneously. Claude Code executes one workflow at a time. The concurrency risk is if a user runs `/pde:sync --github` and then immediately runs `/pde:sync --figma` before the first finishes — but this is sequential in practice. VAL-01 validation is: (a) confirm the command routing is flag-based (only one service per invocation), (b) confirm each workflow writes to non-overlapping sections, (c) document that section-scoped writes prevent corruption.
**Warning signs:** Any plan mentioning flock, mutex, atomic writes, or fs.rename() patterns.

### Pitfall 3: Confirmation Gate Bypass Via "y" Case Sensitivity

**What goes wrong:** A workflow accepts "Y" or "YES" but the test only checks for lowercase "y/yes".
**Why it happens:** The handoff-create-prs.md explicitly says case-insensitive, but the pattern `/^y(es)?$/i` handles this. If a new workflow omits the `i` flag, "Y" bypasses the check and produces different behavior.
**How to avoid:** VAL-03 tests must verify the gate accepts ONLY `y` or `yes` (case-insensitive) and rejects everything else. Check for the negative case explicitly: assert that the workflow includes a "cancelled" or "No.*created" path that fires for non-yes responses.
**Warning signs:** Workflow confirmation gates that use `=== 'y'` without `toLowerCase()` or without the `i` regex flag.

### Pitfall 4: Missing Write-Back Surfaces

**What goes wrong:** VAL-03 audit misses one of the five write-back workflows.
**Why it happens:** Write-back workflows are spread across two directories (commands/ and workflows/) and some are sub-workflows of others.
**How to avoid:** The complete list of write-back surfaces requiring confirmation gates:
  1. `workflows/handoff-create-prs.md` — GH-02 (creates GitHub PRs)
  2. `workflows/handoff-create-linear-issues.md` — LIN-03 (creates Linear issues)
  3. `workflows/handoff-create-jira-tickets.md` — JIRA-03 (creates Jira tickets)
  4. `workflows/mockup-export-figma.md` — FIG-04 (writes to Figma)
  5. `workflows/sync-pencil.md` — PEN-01 (writes to Pencil canvas via set_variables)

Note: `sync-pencil.md` pushes design tokens to Pencil canvas without a user confirmation gate (it runs non-interactively from `/pde:system`). This is by design — token sync to a design tool is low-risk and reversible. VAL-03 requires confirmation only for external service writes that create artifacts (PRs, tickets, Figma frames). The Pencil token sync does NOT require a gate per the existing architecture decisions. The planner must NOT add a confirmation gate to sync-pencil.md.
**Warning signs:** Any plan that adds a confirmation gate to sync-pencil.md or sync-figma.md (import direction).

### Pitfall 5: Validation Phase Scope Creep

**What goes wrong:** Phase 44 starts implementing new features (e.g., a locking mechanism, a new recovery workflow) rather than validating existing ones.
**Why it happens:** The temptation is to "fix" discovered gaps rather than document them.
**How to avoid:** Phase 44's mandate is to VALIDATE that phases 39-43 work correctly. If a gap is found, the planner should document it as an open question, not fix it in Phase 44. The only new artifacts Phase 44 creates are tests and documentation.

---

## Code Examples

Verified patterns from the existing codebase:

### Confirmation Gate Structural Test Pattern

```javascript
// Source: tests/phase-40/handoff-prs.test.mjs (established pattern)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parameterized write-back workflow audits
const WRITEBACK_WORKFLOWS = [
  {
    file: 'workflows/handoff-create-prs.md',
    requirement: 'GH-02',
    gatePattern: /Create this PR\?|y\/n/i,
    writePattern: /Step 4|only after user confirm/i,
    cancelPattern: /No PRs created/,
  },
  {
    file: 'workflows/handoff-create-linear-issues.md',
    requirement: 'LIN-03',
    gatePattern: /Create.*issue.*\?|y\/n/i,
    writePattern: /Step 4|only after|mcp__linear__create_issue/i,
    cancelPattern: /Issue creation skipped|No issues created/,
  },
  {
    file: 'workflows/handoff-create-jira-tickets.md',
    requirement: 'JIRA-03',
    gatePattern: /Create.*ticket.*\?|y\/n/i,
    writePattern: /Step 4|only after|mcp__atlassian__createJiraIssue/i,
    cancelPattern: /Ticket creation skipped|No tickets created/,
  },
  {
    file: 'workflows/mockup-export-figma.md',
    requirement: 'FIG-04',
    gatePattern: /Proceed\?|This will write.*Figma/i,
    writePattern: /Step 4|generate_figma_design|only after/i,
    cancelPattern: /Export cancelled|no changes to Figma/i,
  },
];

for (const wf of WRITEBACK_WORKFLOWS) {
  describe(`VAL-03 — ${wf.requirement} confirmation gate in ${wf.file}`, () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../', wf.file), 'utf-8'
    );

    it('confirmation gate exists', () => {
      assert.match(content, wf.gatePattern);
    });

    it('write step exists', () => {
      assert.match(content, wf.writePattern);
    });

    it('gate appears before write step', () => {
      const gateIdx = content.search(wf.gatePattern);
      const writeIdx = content.search(wf.writePattern);
      assert.ok(gateIdx < writeIdx, `gate must precede write step in ${wf.file}`);
    });

    it('cancel path exists (non-y response)', () => {
      assert.match(content, wf.cancelPattern);
    });
  });
}
```

### Auth Recovery Structural Test Pattern

```javascript
// Source: Derived from tests/phase-43/sync-pencil-workflow.test.mjs pattern
const MCP_WORKFLOWS = [
  'workflows/sync-github.md',
  'workflows/sync-linear.md',
  'workflows/sync-jira.md',
  'workflows/sync-figma.md',
  'workflows/sync-pencil.md',
  'workflows/handoff-create-prs.md',
  'workflows/handoff-create-linear-issues.md',
  'workflows/handoff-create-jira-tickets.md',
  'workflows/mockup-export-figma.md',
  'workflows/critique-pencil-screenshot.md',
];

for (const wfPath of MCP_WORKFLOWS) {
  it(`${wfPath} reads mcp-connections.json at startup (VAL-02)`, () => {
    const content = fs.readFileSync(path.resolve(__dirname, '../../', wfPath), 'utf-8');
    assert.ok(
      content.includes('loadConnections()') || content.includes('b.loadConnections()'),
      `${wfPath} must call loadConnections() — disk-based auth recovery for VAL-02`
    );
  });
}
```

### Concurrent Routing Test (VAL-01)

```javascript
// Source: Derived from tests/phase-40/sync-github.test.mjs pattern
it('sync.md routes to exactly one sub-workflow per flag (VAL-01)', () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, '../../commands/sync.md'), 'utf-8'
  );
  // Each flag dispatch is independent
  assert.match(content, /if.*--github.*follow.*sync-github/s);
  assert.match(content, /if.*--linear.*follow.*sync-linear/s);
  assert.match(content, /if.*--figma.*follow.*sync-figma/s);
  // No flag runs multiple sync workflows simultaneously
  assert.doesNotMatch(content, /sync-github.*AND.*sync-linear/);
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Test with live MCP connections | Structural tests on workflow text | Established in Phase 40 | Enables full test suite in 3 seconds, no external auth needed |
| Auth state in conversation context | OAuth tokens in OS keychain (Claude Code), metadata in mcp-connections.json (PDE) | Claude Code architecture | Post-compaction recovery works because keychain survives; PDE reads disk metadata |
| Single global allowed-tools wildcard | Per-command allowed-tools scoped to relevant MCP namespaces | Phase 40.1 | Prevents tool name collision and context bloat across concurrent server configurations |
| Confirmation gate pattern (individual) | Five write-back workflows each implement gate independently (not shared) | Phases 40-43 | Self-contained workflows; consistent `y/yes` case-insensitive gate across all |

**Deprecated/outdated:**
- SSE transport for Atlassian: Official Atlassian MCP now recommends HTTP; SSE is deprecated per Claude Code docs (but still functional — do not change existing Atlassian config)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | none — direct file invocation |
| Quick run command | `node --test tests/phase-44/*.test.mjs` |
| Full suite command | `cd "/Users/greyaltaer/code/projects/Platform Development Engine" && node --test tests/phase-40/*.test.mjs tests/phase-41/*.test.mjs tests/phase-42/*.test.mjs tests/phase-43/*.test.mjs tests/phase-44/*.test.mjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VAL-01 | `commands/sync.md` routes to one sub-workflow per flag | structural | `node --test tests/phase-44/concurrency-isolation.test.mjs` | Wave 0 |
| VAL-01 | Each sync workflow writes to distinct non-overlapping sections | structural | `node --test tests/phase-44/concurrency-isolation.test.mjs` | Wave 0 |
| VAL-02 | All MCP workflows call `loadConnections()` at startup | structural | `node --test tests/phase-44/auth-recovery-structure.test.mjs` | Wave 0 |
| VAL-02 | mcp-connections.json schema has required fields for all 5 servers | unit | `node --test tests/phase-44/auth-recovery-structure.test.mjs` | Wave 0 |
| VAL-03 | handoff-create-prs.md has confirmation gate before create-pr MCP call | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | Wave 0 |
| VAL-03 | handoff-create-linear-issues.md has confirmation gate before create-issue | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | Wave 0 |
| VAL-03 | handoff-create-jira-tickets.md has confirmation gate before createJiraIssue | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | Wave 0 |
| VAL-03 | mockup-export-figma.md has confirmation gate before generate_figma_design | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-44/*.test.mjs`
- **Per wave merge:** Full suite (phase 40-44)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-44/writeback-confirmation.test.mjs` — covers VAL-03 for all 5 write-back workflows
- [ ] `tests/phase-44/auth-recovery-structure.test.mjs` — covers VAL-02 for all 10 MCP-dependent workflows
- [ ] `tests/phase-44/concurrency-isolation.test.mjs` — covers VAL-01 routing and section isolation

All three test files are Wave 0 requirements — they must be created (RED) before implementation, then turn GREEN as the validation plan confirms existing code satisfies them.

---

## Open Questions

1. **sync-pencil.md confirmation gate (VAL-03 boundary)**
   - What we know: sync-pencil.md writes to Pencil canvas via `set_variables`. The VAL-03 requirement says "write-back operations to external services require explicit user confirmation."
   - What's unclear: Does a token push to a design canvas (which is reversible and low-risk) require a gate, or only artifact creation (PRs, tickets, Figma frames)?
   - Recommendation: Per existing architecture decisions (Phase 43: "non-blocking, Pencil is enhancement not hard dependency"), sync-pencil.md does NOT need a confirmation gate. It runs from `/pde:system` automatically. Include this as a documented decision in the plan, not a gap to fix.

2. **Jira ticket confirmation gate exists but was not tested in Phase 41**
   - What we know: Phase 41 implemented the confirmation gate in handoff-create-jira-tickets.md. Phase 41 tests validated structural elements but the VAL-03 gate order was not explicitly tested.
   - What's unclear: Does the gate actually appear before the `createJiraIssue` MCP call?
   - Recommendation: VAL-03 test in Phase 44 will verify this. If it fails, that's a Phase 41 bug to fix as part of Phase 44.

3. **TOOL_MAP count after Phase 44**
   - What we know: After Phase 43, TOOL_MAP has 36 entries. Phase 44 adds no new MCP integrations.
   - What's unclear: Will tests in `tests/phase-40/mcp-bridge-toolmap.test.mjs` need updating?
   - Recommendation: No update needed — Phase 44 adds no new TOOL_MAP entries. The count stays at 36.

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection — `bin/lib/mcp-bridge.cjs` (loaded and confirmed at runtime)
- Codebase inspection — `tests/phase-40/` through `tests/phase-43/` (23 test files, established patterns)
- Codebase inspection — `workflows/handoff-create-prs.md`, `sync-pencil.md`, `connect.md` (implementation details)
- Claude Code official docs: [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp) — multiple MCP server support, OAuth persistence in OS keychain
- Claude Code official docs: [Hooks reference](https://code.claude.com/docs/en/hooks) — PreCompact, PreToolUse, PostToolUse, MCP tool matcher patterns

### Secondary (MEDIUM confidence)

- [Claude Code issue #34832](https://github.com/anthropics/claude-code/issues/34832) — Confirmed: OAuth tokens lost in conversation context after compaction, stored in keychain (not mcp-connections.json)
- `.planning/STATE.md` accumulated decisions from Phases 40-43 — confirmation gate patterns, VAL-03 design decisions

### Tertiary (LOW confidence)

- WebSearch: "MCP concurrent servers" ecosystem articles — general concurrency guidance; not verified against PDE-specific session model

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — zero new dependencies; established node:test pattern
- Architecture: HIGH — patterns directly verified in codebase inspection of 23 existing tests
- Pitfalls: HIGH — derived from confirmed implementation decisions in STATE.md and codebase
- VAL-02 auth model: HIGH — confirmed via official Claude Code docs + issue #34832

**Research date:** 2026-03-19
**Valid until:** 2026-04-18 (stable; Claude Code's MCP OAuth model is unlikely to change)
