# Phase 44: End-to-End Validation - Research

**Researched:** 2026-03-19 (deep pass: 2026-03-19)
**Domain:** MCP integration validation, concurrent server state, context compaction recovery, write-back safety
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VAL-01 | User can run all integrations simultaneously (2+ MCP servers connected) | Concurrency is safe at Claude Code runtime layer — isolation is per-server; risk is `.planning/` filesystem write conflicts between concurrent sync operations |
| VAL-02 | All integrations function correctly after context compaction (auth recovery) | Auth tokens are NOT in mcp-connections.json; OAuth tokens are stored in OS keychain by Claude Code; mcp-connections.json provides metadata (server key, status, repo/teamId) that is sufficient to re-establish context post-compaction |
| VAL-03 | Write-back operations to external services require explicit user confirmation | Confirmation gates already implemented in all 4 write-back workflows (NOT 5 — sync-pencil.md is excluded by design); validation must verify each gate structurally and audit for bypass paths |
</phase_requirements>

---

## Summary

Phase 44 is a **validation phase**, not a feature phase. Its primary product is evidence — tests and structural audits that prove the three properties required by VAL-01, VAL-02, and VAL-03. Unlike prior phases that built new workflows, this phase writes tests that verify correctness of what was already built.

The three requirements map to three distinct validation domains:

**VAL-01 (Concurrency):** Claude Code handles multiple MCP servers simultaneously by aggregating all configured server tools into one unified context. The servers themselves do not share state — each is an independent OAuth session. The risk is NOT at the MCP layer; it is at the `.planning/` filesystem layer where concurrent `sync` commands (e.g., `--github` and `--linear` running in the same session) both write to `REQUIREMENTS.md`. Codebase inspection confirms the isolation mechanism is **named sections**: GitHub sync writes to `### GitHub Issues`, Linear sync writes to `### Linear Issues`, Jira sync writes to `### Jira Issues`. These are distinct, non-overlapping sections — no full-file overwrite occurs. sync-figma.md writes to `assets/tokens.json` (not REQUIREMENTS.md at all). sync-pencil.md writes to the Pencil canvas (external, not `.planning/`). The routing in `commands/sync.md` dispatches to exactly one sub-workflow per flag (`follow @workflows/sync-github.md` pattern) — there is no multi-flag combined execution path.

**VAL-02 (Auth Recovery):** OAuth tokens and session IDs are NOT stored in `.planning/mcp-connections.json`. They are stored by Claude Code in the OS keychain (macOS) or a credentials file. This is a known behavior confirmed by issue #34832 in the Claude Code repository. Context compaction destroys in-conversation auth state but does NOT destroy the OAuth tokens persisted by Claude Code's MCP client. What `mcp-connections.json` stores — `status`, `server_key`, `display_name`, `transport`, `url`, `last_updated`, plus service-specific `extraFields` (e.g., `repo` for GitHub, `teamId` for Linear, `projectKey`/`siteUrl` for Jira, `fileUrl` for Figma) — is metadata sufficient for PDE workflows to re-read and resume without re-prompting the user for auth. Codebase inspection confirms ALL 9 MCP-dependent workflows call `b.loadConnections()` at Step 0 (verified: handoff-create-prs.md:20, handoff-create-linear-issues.md:20, handoff-create-jira-tickets.md:20, mockup-export-figma.md:20, sync-github.md:19, sync-linear.md:19, sync-jira.md:19, sync-figma.md:19, sync-pencil.md:17, critique-pencil-screenshot.md:23).

**VAL-03 (Write-Back Safety):** There are **4 write-back workflows** requiring confirmation gates (not 5 — the initial research erroneously counted sync-pencil.md). The confirmed list: handoff-create-prs.md (GH-02), handoff-create-linear-issues.md (LIN-03), handoff-create-jira-tickets.md (JIRA-03), mockup-export-figma.md (FIG-04). Codebase inspection confirms all four gates use identical "CRITICAL" language and the same `y` or `yes` (case-insensitive) acceptance pattern. The Jira workflow differs: it has a 5-step structure (vs 4-step for GitHub/Linear) with the gate at Step 4 (not Step 3), and the write at Step 5 (not Step 4). Tests must account for this difference.

**Primary recommendation:** Build a `tests/phase-44/` directory containing three structural test files. Tests must use the exact concrete patterns found via codebase inspection rather than the generic patterns in the initial research.

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

**Installation:** None required. Zero new dependencies.

---

## Architecture Patterns

### Recommended Test Structure

```
tests/
└── phase-44/
    ├── concurrency-isolation.test.mjs      # VAL-01: section isolation + routing
    ├── auth-recovery-structure.test.mjs    # VAL-02: loadConnections at startup
    └── writeback-confirmation.test.mjs     # VAL-03: gate ordering for 4 workflows
```

### Pattern 1: Structural Workflow Tests (VAL-03)

The established pattern from phases 40-43 is to load the workflow file as text and assert structural properties via string search. All four write-back workflows have confirmed structure (verified via codebase inspection).

**What:** Read the workflow `.md` file, assert confirmation gate exists BEFORE the write tool call section. Gate patterns and step numbers differ per workflow.
**When to use:** For all write-back workflow validation (VAL-03).

**CRITICAL: Jira has 5 steps (gate at Step 4, write at Step 5) — not 4 like the others.**

```javascript
// Source: tests/phase-40/handoff-prs.test.mjs (established pattern, verified 2026-03-19)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parameterized write-back workflow audits
// Source: Codebase inspection confirmed exact text patterns (2026-03-19)
const WRITEBACK_WORKFLOWS = [
  {
    file: 'workflows/handoff-create-prs.md',
    requirement: 'GH-02',
    gatePattern: /Create this PR\?.*\(y\/n\)/is,
    gateSection: /Step 3.*confirmation gate/i,
    writeSection: /Step 4.*only after user confirm/i,
    cancelPattern: /No PRs created/,
    writeMcpPattern: /mcp__github__create_pull_request|bridge\.call\(['"]github:create-pr['"]\)/,
  },
  {
    file: 'workflows/handoff-create-linear-issues.md',
    requirement: 'LIN-03',
    gatePattern: /Create this issue in Linear\?.*\(y\/n\)/is,
    gateSection: /Step 3.*confirmation gate/i,
    writeSection: /Step 4.*only after user confirm/i,
    cancelPattern: /No issues created/,
    writeMcpPattern: /mcp__linear__create_issue|bridge\.call\(['"]linear:create-issue['"]\)/,
  },
  {
    file: 'workflows/handoff-create-jira-tickets.md',
    requirement: 'JIRA-03',
    // Jira gate is at Step 4 (not Step 3) — 5-step workflow
    gatePattern: /Create this ticket in Jira\?.*\(y\/n\)/is,
    gateSection: /Step 4.*confirmation gate/i,
    writeSection: /Step 5.*only after user confirm/i,
    cancelPattern: /No tickets created/,
    writeMcpPattern: /mcp__atlassian__createJiraIssue|bridge\.call\(['"]jira:create-issue['"]\)/,
  },
  {
    file: 'workflows/mockup-export-figma.md',
    requirement: 'FIG-04',
    gatePattern: /This will write to your Figma file\. Proceed\?.*\(y\/n\)/is,
    gateSection: /Step 3|confirmation gate/i,
    writeSection: /Step 4|only after user confirm/i,
    cancelPattern: /Export cancelled.*no changes to Figma/i,
    writeMcpPattern: /generate_figma_design|bridge\.call\(['"]figma:generate-design['"]\)/,
  },
];

for (const wf of WRITEBACK_WORKFLOWS) {
  describe(`VAL-03 — ${wf.requirement} confirmation gate in ${wf.file}`, () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../', wf.file), 'utf-8'
    );

    it('confirmation gate text exists', () => {
      assert.match(content, wf.gatePattern);
    });

    it('gate section appears in document', () => {
      assert.match(content, wf.gateSection);
    });

    it('write section appears in document', () => {
      assert.match(content, wf.writeSection);
    });

    it('gate appears before write step', () => {
      const gateIdx = content.search(wf.gateSection);
      const writeIdx = content.search(wf.writeSection);
      assert.ok(gateIdx < writeIdx, `gate must precede write step in ${wf.file}`);
    });

    it('cancel path exists (non-y response)', () => {
      assert.match(content, wf.cancelPattern);
    });

    it('case-insensitive y/yes acceptance is documented', () => {
      assert.match(content, /case-insensitive/i,
        `${wf.file} must document case-insensitive y/yes acceptance`);
    });

    it('MCP write call exists after gate in document order', () => {
      const writeIdx = content.search(wf.writeSection);
      const writeContent = content.slice(writeIdx);
      assert.match(writeContent, wf.writeMcpPattern,
        `MCP write call must appear after confirmation gate in ${wf.file}`);
    });
  });
}
```

### Pattern 2: mcp-connections.json Read-at-Start (VAL-02)

All 9 MCP-dependent workflows in the codebase call `b.loadConnections()` at Step 0. This is verified by codebase inspection. The test confirms this pattern holds after any future edits.

**What:** Assert that each MCP-dependent workflow calls `b.loadConnections()` before any MCP tool call.
**When to use:** For all MCP workflows (VAL-02).

```javascript
// Source: Verified by codebase inspection (2026-03-19)
// All 9 files confirmed to contain b.loadConnections() in Step 0
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
    const hasLoadConnections =
      content.includes('loadConnections()') ||
      content.includes('b.loadConnections()');
    assert.ok(hasLoadConnections,
      `${wfPath} must call loadConnections() — disk-based auth recovery for VAL-02`);
  });
}

// Also verify mcp-connections.json schema has required fields for each service
it('mcp-bridge.cjs updateConnectionStatus writes required fields per server', () => {
  const bridgePath = path.resolve(__dirname, '../../bin/lib/mcp-bridge.cjs');
  const content = fs.readFileSync(bridgePath, 'utf-8');
  // Base fields written by updateConnectionStatus
  assert.match(content, /server_key/, 'schema must include server_key');
  assert.match(content, /display_name/, 'schema must include display_name');
  assert.match(content, /transport/, 'schema must include transport');
  assert.match(content, /status/, 'schema must include status');
  assert.match(content, /last_updated/, 'schema must include last_updated');
  // Service-specific extraFields documented in connect workflows
  assert.match(content, /extraFields/, 'updateConnectionStatus must accept extraFields');
});
```

### Pattern 3: Filesystem Section Isolation Audit (VAL-01)

The concurrency isolation mechanism is named sections in REQUIREMENTS.md. Codebase inspection confirms distinct section headers across all sync workflows. The test validates this naming is preserved.

**What:** Assert that each sync workflow targets a distinct named section in REQUIREMENTS.md (or a different file entirely).
**When to use:** For VAL-01 concurrent write isolation.

```javascript
// Source: Verified by codebase inspection (2026-03-19)
// GitHub → ### GitHub Issues
// Linear → ### Linear Issues
// Jira   → ### Jira Issues
// Figma  → assets/tokens.json (not REQUIREMENTS.md)
// Pencil → Pencil canvas via MCP (not .planning/)

const ISOLATION_ASSERTIONS = [
  { file: 'workflows/sync-github.md', section: '### GitHub Issues' },
  { file: 'workflows/sync-linear.md', section: '### Linear Issues' },
  { file: 'workflows/sync-jira.md',   section: '### Jira Issues' },
];

for (const { file, section } of ISOLATION_ASSERTIONS) {
  it(`${file} scopes writes to "${section}" section (VAL-01 isolation)`, () => {
    const content = fs.readFileSync(path.resolve(__dirname, '../../', file), 'utf-8');
    assert.ok(content.includes(section),
      `${file} must target "${section}" section — prevents cross-service write conflicts`);
  });
}

it('sync-figma.md writes to assets/tokens.json, not REQUIREMENTS.md (VAL-01)', () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, '../../workflows/sync-figma.md'), 'utf-8'
  );
  assert.match(content, /assets\/tokens\.json/,
    'sync-figma.md must target assets/tokens.json, not REQUIREMENTS.md');
  // Confirm REQUIREMENTS.md is not mentioned as a write target
  assert.doesNotMatch(content, /writeFileSync.*REQUIREMENTS|write.*REQUIREMENTS\.md/,
    'sync-figma.md must not write to REQUIREMENTS.md');
});

it('sync-pencil.md writes to Pencil canvas (external), not .planning/ filesystem (VAL-01)', () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, '../../workflows/sync-pencil.md'), 'utf-8'
  );
  assert.match(content, /pencil:set-variables/,
    'sync-pencil.md must write to Pencil canvas via set_variables');
  assert.doesNotMatch(content, /writeFileSync.*\.planning/,
    'sync-pencil.md must not write to .planning/ filesystem');
});
```

### Pattern 4: Command Routing Isolation (VAL-01)

sync.md routes to exactly one sub-workflow per flag. The routing syntax is `follow @workflows/sync-X.md exactly` — this is the established Claude Code instruction pattern.

**What:** Assert that sync.md dispatches to one workflow per flag and the routing is flag-gated (not multi-flag combined).
**When to use:** For VAL-01 command routing validation.

```javascript
// Source: commands/sync.md verified by codebase inspection (2026-03-19)
// Routing uses "follow @workflows/sync-X.md exactly" pattern
it('sync.md routes --github to sync-github.md (VAL-01)', () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, '../../commands/sync.md'), 'utf-8'
  );
  assert.match(content, /--github.*follow.*sync-github\.md/s,
    'sync.md must route --github to sync-github.md');
});

it('sync.md routes each flag to a distinct workflow (VAL-01)', () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, '../../commands/sync.md'), 'utf-8'
  );
  // Each flag routes to its own workflow
  assert.match(content, /--linear.*follow.*sync-linear\.md/s);
  assert.match(content, /--jira.*follow.*sync-jira\.md/s);
  assert.match(content, /--figma.*follow.*sync-figma\.md/s);
  assert.match(content, /--export-figma.*follow.*mockup-export-figma\.md/s);
  // Pencil is dispatched from system.md, not sync.md
  assert.doesNotMatch(content, /--pencil/,
    'sync.md must not have a --pencil flag (Pencil dispatched from system.md)');
});
```

### Anti-Patterns to Avoid

- **Integration tests requiring live MCP servers:** These cannot run in CI. All tests in `tests/phase-44/` must be purely structural (file reading + assertion). Live validation is manual-only.
- **Asserting Step 4 for Jira write gate:** Jira has 5 steps — the confirmation gate is Step 4, the write is Step 5. Using "Step 4 = write" (the GitHub/Linear pattern) will produce incorrect assertions for Jira.
- **Counting 5 write-back workflows:** sync-pencil.md does NOT have a confirmation gate (by design, documented in STATE.md). The correct count is 4.
- **Asserting specific line numbers:** Line numbers change as workflows are edited. Always use string search / regex.
- **Watch-mode test flags:** The project uses `node --test` without `--watch`. Do not introduce watch mode.
- **Using bridge.call pattern for write MCP check in Jira test:** Jira workflow says `b.call('jira:create-issue')` — use that, not `bridge.call()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth token persistence across compaction | Custom token storage or encryption | Rely on Claude Code's built-in OAuth persistence in OS keychain | Claude Code already handles this; mcp-connections.json only stores metadata, never tokens |
| Concurrency lock files for `.planning/` | flock(), mutex, SQLite-based locking | Named section isolation (already implemented) | Each sync workflow writes to a distinct `### X Issues` section; no lock needed |
| MCP server mock/stub for testing | Mock MCP transport layer | Structural tests on workflow text files | The structural test pattern from phases 40-43 achieves Nyquist coverage without mocking |
| Test runner framework (Jest/Vitest) | Migrating to a new framework | `node --test` (built-in) | Already established across 23 test files; zero dependency; project constraint |
| Separate per-service test files (5 files for 5 services) | One test file per service | Three test files by validation domain (concurrency, auth, write-back) | Matches VAL-01/VAL-02/VAL-03 domain split; reduces duplication; matches Phase 43 precedent |

**Key insight:** The PDE validation approach is intentionally "test the contract, not the runtime." Since MCP servers are external services with OAuth, the only testable surface is the workflow code structure. Phase 44 tests prove that the code structure WOULD behave correctly in a live environment — they don't replace live testing.

---

## Common Pitfalls

### Pitfall 1: Testing the Wrong Auth Recovery Layer

**What goes wrong:** Researcher/planner concludes that VAL-02 requires storing OAuth tokens in `mcp-connections.json` or implementing a custom credential cache.
**Why it happens:** The GitHub issue #34832 describes a Claude Code bug where auth IS lost after compaction. Reading quickly, one concludes PDE must solve this.
**How to avoid:** Understand what PDE stores vs. what Claude Code stores. `mcp-connections.json` stores: `status`, `server_key`, `display_name`, `transport`, `url`, `last_updated`, plus service-specific extraFields (`repo` for GitHub, `teamId` for Linear, `projectKey`/`siteUrl` for Jira, `fileUrl` for Figma). Claude Code stores: OAuth tokens in OS keychain. After compaction, the OAuth tokens SURVIVE because they're in the keychain, not the conversation. What workflows need to re-establish is the application-level context (which repo, which team, which project) — and that IS in `mcp-connections.json`. VAL-02 validation is: confirm that every MCP workflow reads from `mcp-connections.json` at startup.
**Warning signs:** Any plan that involves writing OAuth tokens to disk, creating a credential cache, or modifying `mcp-bridge.cjs` to store session state.

### Pitfall 2: Treating VAL-01 as Requiring Concurrent Process Management

**What goes wrong:** Planner concludes VAL-01 requires implementing mutex locks, flock, or write queues for `.planning/` directory access.
**Why it happens:** "Concurrency" sounds like it requires concurrent process management.
**How to avoid:** In the PDE session model, "2+ MCP servers connected simultaneously" means the user has configured multiple MCP servers in their Claude Code session, not that multiple node processes are writing simultaneously. Claude Code executes one workflow at a time. The concurrency isolation is already implemented via named sections — VAL-01 validation confirms this mechanism exists, not that it needs to be built.
**Warning signs:** Any plan mentioning flock, mutex, atomic writes, or fs.rename() patterns.

### Pitfall 3: Confirmation Gate Bypass Via "y" Case Sensitivity

**What goes wrong:** A workflow accepts "Y" or "YES" but the test only checks for lowercase "y/yes".
**Why it happens:** Initial implementation might omit case-insensitive handling.
**How to avoid:** VAL-03 tests must verify the word "case-insensitive" appears in every write-back workflow. All four existing workflows use this explicit documentation. The test pattern: `assert.match(content, /case-insensitive/i)`.
**Warning signs:** Workflow confirmation gates that use `=== 'y'` without `toLowerCase()` or without the `i` regex flag.

### Pitfall 4: Miscounting Write-Back Workflows

**What goes wrong:** VAL-03 audit includes sync-pencil.md (5th item), which does NOT have a confirmation gate.
**Why it happens:** The initial research (44-RESEARCH.md first pass) listed sync-pencil.md as one of five write-back workflows. This was incorrect.
**How to avoid:** The complete list is exactly 4 write-back surfaces with confirmation gates:
  1. `workflows/handoff-create-prs.md` — GH-02 (creates GitHub PRs)
  2. `workflows/handoff-create-linear-issues.md` — LIN-03 (creates Linear issues)
  3. `workflows/handoff-create-jira-tickets.md` — JIRA-03 (creates Jira tickets)
  4. `workflows/mockup-export-figma.md` — FIG-04 (writes to Figma)

sync-pencil.md pushes design tokens to Pencil canvas non-interactively from `/pde:system` — by design, no confirmation gate (reversible, low-risk, enhancement not hard dependency — see STATE.md Phase 43 decisions).
**Warning signs:** Any test plan that lists 5 write-back workflows for VAL-03.

### Pitfall 5: Jira Step Number Mismatch in Tests

**What goes wrong:** Test for Jira workflow uses `Step 3` for gate and `Step 4` for write — matching the GitHub/Linear pattern — but Jira has a 5-step workflow (Step 4 = gate, Step 5 = write).
**Why it happens:** Three of the four write-back workflows have 4 steps; Jira has 5 because it includes Step 2 (pre-flight issue type check via `mcp__atlassian__getJiraProjectIssueTypesMetadata`) before the confirmation gate.
**How to avoid:** Use `Step 4.*confirmation gate` for Jira gate detection and `Step 5.*only after user confirm` for write detection. Verify by reading the actual regex against the file.
**Warning signs:** Any test that asserts `Step 3.*confirmation gate` on `handoff-create-jira-tickets.md`.

### Pitfall 6: Validation Phase Scope Creep

**What goes wrong:** Phase 44 starts implementing new features (e.g., a locking mechanism, a new recovery workflow) rather than validating existing ones.
**Why it happens:** The temptation is to "fix" discovered gaps rather than document them.
**How to avoid:** Phase 44's mandate is to VALIDATE that phases 39-43 work correctly. If a gap is found, document it as an open question, not fix it in Phase 44. The only new artifacts Phase 44 creates are tests and documentation.

### Pitfall 7: Cross-Integration Interference Scenarios (Missing from Initial Research)

**What goes wrong:** Tests miss the scenario where sync-linear.md writes to BOTH REQUIREMENTS.md AND ROADMAP.md (LIN-02 cycle annotation), which means a concurrent `/pde:sync --github` + `/pde:sync --linear` session has TWO files in flight.
**Why it happens:** sync-github.md only writes to REQUIREMENTS.md. sync-linear.md writes to REQUIREMENTS.md AND ROADMAP.md (LIN-02). This creates a two-file write surface not present for GitHub or Jira.
**How to avoid:** VAL-01 test must verify the ROADMAP.md write in sync-linear.md is also section-scoped. Codebase inspection confirms it uses an HTML comment pattern `<!-- Linear Active Cycle: ... -->` inserted after the active phase heading — this is additive, not a full-file rewrite, so it is safe for concurrent sessions. Test must confirm this pattern.
**Warning signs:** Any analysis that treats all sync workflows as writing only to REQUIREMENTS.md.

---

## Code Examples

Verified patterns from the existing codebase (all confirmed by codebase inspection 2026-03-19):

### Concrete Confirmation Gate Strings (from actual workflow files)

```
handoff-create-prs.md:     "Create this PR? (y/n)"
handoff-create-linear-issues.md: "Create this issue in Linear? (y/n)"
handoff-create-jira-tickets.md:  "Create this ticket in Jira? (y/n)"
mockup-export-figma.md:    "This will write to your Figma file. Proceed? (y/n)"
```

Cancel responses (exact text in workflow files):
```
handoff-create-prs.md:     "No PRs created."
handoff-create-linear-issues.md: "No issues created."
handoff-create-jira-tickets.md:  "No tickets created."
mockup-export-figma.md:    "Export cancelled — no changes to Figma."
```

### Confirmation Gate Structural Test Pattern (Full, Corrected)

```javascript
// Source: Derived from tests/phase-40/handoff-prs.test.mjs with Jira step correction
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WRITEBACK_WORKFLOWS = [
  {
    file: 'workflows/handoff-create-prs.md',
    requirement: 'GH-02',
    gateText: 'Create this PR?',
    cancelText: 'No PRs created',
    gateSection: /Step 3.*confirmation gate/is,
    writeSection: /Step 4.*only after user confirm/is,
  },
  {
    file: 'workflows/handoff-create-linear-issues.md',
    requirement: 'LIN-03',
    gateText: 'Create this issue in Linear?',
    cancelText: 'No issues created',
    gateSection: /Step 3.*confirmation gate/is,
    writeSection: /Step 4.*only after user confirm/is,
  },
  {
    file: 'workflows/handoff-create-jira-tickets.md',
    requirement: 'JIRA-03',
    gateText: 'Create this ticket in Jira?',
    cancelText: 'No tickets created',
    // JIRA IS 5 STEPS: gate at Step 4, write at Step 5
    gateSection: /Step 4.*confirmation gate/is,
    writeSection: /Step 5.*only after user confirm/is,
  },
  {
    file: 'workflows/mockup-export-figma.md',
    requirement: 'FIG-04',
    gateText: 'This will write to your Figma file. Proceed?',
    cancelText: 'Export cancelled',
    gateSection: /Step 3|confirmation gate/is,
    writeSection: /Step 4|only after user confirm/is,
  },
];

for (const wf of WRITEBACK_WORKFLOWS) {
  describe(`VAL-03 — ${wf.requirement}: ${path.basename(wf.file)}`, () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../', wf.file), 'utf-8'
    );

    it('confirmation gate text present', () => {
      assert.ok(content.includes(wf.gateText),
        `Expected "${wf.gateText}" in ${wf.file}`);
    });

    it('(y/n) prompt present', () => {
      assert.match(content, /\(y\/n\)/);
    });

    it('cancel path present', () => {
      assert.ok(content.includes(wf.cancelText),
        `Expected "${wf.cancelText}" in ${wf.file}`);
    });

    it('case-insensitive acceptance documented', () => {
      assert.match(content, /case-insensitive/i);
    });

    it('gate section precedes write section', () => {
      const gateIdx = content.search(wf.gateSection);
      const writeIdx = content.search(wf.writeSection);
      assert.ok(gateIdx !== -1, `gate section not found in ${wf.file}`);
      assert.ok(writeIdx !== -1, `write section not found in ${wf.file}`);
      assert.ok(gateIdx < writeIdx,
        `gate must appear before write step in ${wf.file}`);
    });
  });
}
```

### Auth Recovery Structural Test Pattern

```javascript
// Source: All 10 MCP workflows verified to contain b.loadConnections() (2026-03-19)
// critique-pencil-screenshot.md uses conn line at :23
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
// Source: commands/sync.md verified — uses "follow @workflows/X.md exactly" routing syntax
it('sync.md routes each flag to a distinct workflow (VAL-01)', () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, '../../commands/sync.md'), 'utf-8'
  );
  assert.match(content, /--github.*follow.*@workflows\/sync-github\.md/s);
  assert.match(content, /--linear.*follow.*@workflows\/sync-linear\.md/s);
  assert.match(content, /--jira.*follow.*@workflows\/sync-jira\.md/s);
  assert.match(content, /--figma.*follow.*@workflows\/sync-figma\.md/s);
  // No combined multi-flag execution path
  assert.doesNotMatch(content, /sync-github.*AND.*sync-linear/,
    'sync.md must not combine multiple sync workflows');
});

// VAL-01: Pencil is dispatched from system.md, NOT sync.md
it('sync.md does not include Pencil dispatch (VAL-01 — Pencil in system.md)', () => {
  const syncContent = fs.readFileSync(
    path.resolve(__dirname, '../../commands/sync.md'), 'utf-8'
  );
  assert.doesNotMatch(syncContent, /--pencil/);

  // Confirm system.md is where Pencil lives
  const systemContent = fs.readFileSync(
    path.resolve(__dirname, '../../commands/system.md'), 'utf-8'
  );
  assert.match(systemContent, /mcp__pencil__\*/,
    'system.md must include mcp__pencil__* in allowed-tools');
});
```

### ROADMAP.md Write Isolation Test (VAL-01 — Linear LIN-02)

```javascript
// sync-linear.md also writes to ROADMAP.md (LIN-02 cycle annotation)
// This is a section-additive pattern (HTML comment insert), not a full rewrite
it('sync-linear.md ROADMAP.md writes use HTML comment pattern (section-additive)', () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, '../../workflows/sync-linear.md'), 'utf-8'
  );
  // LIN-02 cycle annotation inserts HTML comments after phase heading
  assert.match(content, /<!-- Linear.*Cycle/i,
    'sync-linear.md must use HTML comment pattern for ROADMAP.md cycle annotation');
  assert.match(content, /ROADMAP\.md/,
    'sync-linear.md must reference ROADMAP.md for LIN-02 cycle annotation');
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Test with live MCP connections | Structural tests on workflow text | Established in Phase 40 | Enables full test suite in ~3 seconds, no external auth needed |
| Auth state in conversation context | OAuth tokens in OS keychain (Claude Code), metadata in mcp-connections.json (PDE) | Claude Code architecture | Post-compaction recovery works because keychain survives; PDE reads disk metadata |
| Single global allowed-tools wildcard | Per-command allowed-tools scoped to relevant MCP namespaces | Phase 40.1 | Prevents tool name collision; sync.md has github/linear/atlassian/figma but NOT pencil (pencil is system.md) |
| Confirmation gate pattern (individual) | Four write-back workflows each implement gate independently (not shared) | Phases 40-43 | Self-contained workflows; consistent `y/yes` case-insensitive gate with identical "CRITICAL" language |
| Single-file writes for all sync data | Named section writes (`### GitHub Issues`, `### Linear Issues`, `### Jira Issues`) | Phase 40-41 | Enables concurrent sync without cross-service data collision |

**Deprecated/outdated:**
- SSE transport for Atlassian: Official Atlassian MCP now recommends HTTP; SSE is deprecated per Claude Code docs (but still functional — do not change existing Atlassian config)
- Initial research count of "5 write-back workflows": Correct count is 4. sync-pencil.md was incorrectly included.

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
| VAL-01 | sync-linear.md ROADMAP.md write is section-additive (HTML comment), not full-rewrite | structural | `node --test tests/phase-44/concurrency-isolation.test.mjs` | Wave 0 |
| VAL-01 | Pencil dispatches from system.md (not sync.md) — no sync.md --pencil flag | structural | `node --test tests/phase-44/concurrency-isolation.test.mjs` | Wave 0 |
| VAL-02 | All 10 MCP workflows call `loadConnections()` at startup | structural | `node --test tests/phase-44/auth-recovery-structure.test.mjs` | Wave 0 |
| VAL-02 | mcp-bridge.cjs updateConnectionStatus writes required base fields + extraFields | structural | `node --test tests/phase-44/auth-recovery-structure.test.mjs` | Wave 0 |
| VAL-03 | handoff-create-prs.md: gate at Step 3, write at Step 4, cancel="No PRs created." | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | Wave 0 |
| VAL-03 | handoff-create-linear-issues.md: gate at Step 3, write at Step 4, cancel="No issues created." | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | Wave 0 |
| VAL-03 | handoff-create-jira-tickets.md: gate at Step 4, write at Step 5, cancel="No tickets created." | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | Wave 0 |
| VAL-03 | mockup-export-figma.md: gate before write, cancel="Export cancelled" | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | Wave 0 |
| VAL-03 | All 4 write-back workflows document case-insensitive y/yes acceptance | structural | `node --test tests/phase-44/writeback-confirmation.test.mjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-44/*.test.mjs`
- **Per wave merge:** Full suite (phase 40-44)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-44/writeback-confirmation.test.mjs` — covers VAL-03 for all 4 write-back workflows (4, not 5)
- [ ] `tests/phase-44/auth-recovery-structure.test.mjs` — covers VAL-02 for all 10 MCP-dependent workflows
- [ ] `tests/phase-44/concurrency-isolation.test.mjs` — covers VAL-01 routing, section isolation, ROADMAP.md write pattern, Pencil dispatch location

All three test files are Wave 0 requirements — they must be created (RED) before implementation, then turn GREEN as the validation confirms existing code satisfies them. Given codebase inspection confirmed all structural properties hold, tests should turn GREEN immediately (this is an audit phase, not a gap-filling phase).

---

## Open Questions

1. **critique-pencil-screenshot.md write surface (not audited in initial research)**
   - What we know: critique-pencil-screenshot.md calls `loadConnections()` (confirmed at line 23). It reads a Pencil screenshot and uses it as critique input. It does NOT write to external services.
   - What's unclear: Does the workflow write any output files to `.planning/`? If yes, does it conflict with any other workflow?
   - Recommendation: Codebase inspection shows it captures a screenshot and passes it to critique. No `.planning/` write conflicts expected. Include it in VAL-02 auth recovery test (confirm loadConnections call), but no VAL-01 or VAL-03 tests needed.

2. **Jira ticket confirmation gate exists but was not tested in Phase 41**
   - What we know: Phase 41 implemented the confirmation gate in handoff-create-jira-tickets.md. Phase 41 tests validated structural elements but the VAL-03 gate order was not explicitly tested. Codebase inspection confirms gate is at Step 4, write is at Step 5, cancel is "No tickets created." — all correct.
   - What's unclear: None — codebase inspection resolved this.
   - Recommendation: VAL-03 test in Phase 44 will pass immediately for Jira (no bugs to fix).

3. **TOOL_MAP count after Phase 44**
   - What we know: After Phase 43, TOOL_MAP has 36 entries. Phase 44 adds no new MCP integrations.
   - Recommendation: No update needed. Count stays at 36. No test changes required for mcp-bridge-toolmap.test.mjs.

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection — `bin/lib/mcp-bridge.cjs` — `loadConnections()`, `updateConnectionStatus()`, `APPROVED_SERVERS`, `TOOL_MAP` (direct read 2026-03-19)
- Codebase inspection — `workflows/handoff-create-prs.md`, `handoff-create-linear-issues.md`, `handoff-create-jira-tickets.md`, `mockup-export-figma.md` — exact gate text, step numbers, cancel text (direct read 2026-03-19)
- Codebase inspection — `workflows/sync-github.md`, `sync-linear.md`, `sync-jira.md`, `sync-figma.md`, `sync-pencil.md`, `critique-pencil-screenshot.md` — `loadConnections()` at Step 0 confirmed in all 10 workflows (direct read 2026-03-19)
- Codebase inspection — `commands/sync.md` — routing syntax `follow @workflows/X.md exactly`, allowed-tools, no `--pencil` flag (direct read 2026-03-19)
- Codebase inspection — `commands/system.md` — `mcp__pencil__*` in allowed-tools, Pencil dispatch location (direct read 2026-03-19)
- Codebase inspection — `tests/phase-40/handoff-prs.test.mjs` — canonical structural test pattern (direct read 2026-03-19)
- Codebase inspection — `tests/phase-43/sync-pencil-workflow.test.mjs` — structural test pattern with multi-field content assertions (direct read 2026-03-19)
- Claude Code official docs: Connect Claude Code to tools via MCP — multiple MCP server support, OAuth persistence in OS keychain

### Secondary (MEDIUM confidence)

- [Claude Code issue #34832](https://github.com/anthropics/claude-code/issues/34832) — Confirmed: OAuth tokens lost in conversation context after compaction, stored in keychain (not mcp-connections.json)
- `.planning/STATE.md` accumulated decisions from Phases 40-43 — confirmation gate patterns, VAL-03 design decisions, Pencil non-blocking dispatch decision

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — zero new dependencies; established node:test pattern
- Architecture: HIGH — patterns directly verified in codebase inspection of 23 existing tests and all 10 MCP workflow files
- Pitfalls: HIGH — derived from confirmed implementation decisions in STATE.md and codebase inspection (including Jira step correction and write-back count correction)
- VAL-02 auth model: HIGH — confirmed via official Claude Code docs + issue #34832 + codebase verification of all 10 workflows
- Test patterns: HIGH — exact gate text, step numbers, cancel text all verified by direct file read

**Research date:** 2026-03-19 (deep pass)
**Valid until:** 2026-04-18 (stable; Claude Code's MCP OAuth model and PDE workflow structure unlikely to change)
