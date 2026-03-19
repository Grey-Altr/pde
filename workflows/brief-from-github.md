<purpose>
Fetch a GitHub issue by URL or number, extract its title, body, and labels, and use them to pre-populate the /pde:brief pipeline. The GitHub issue data provides context for the brief generation — it does not replace the full pipeline. Pre-filled sections are marked with [from GitHub #<number>] suffix. Implements GH-04.
</purpose>

<process>

## /pde:brief --from-github — GitHub Issue Pre-population Pipeline

---

### Step 0 — Parse --from-github argument

Extract the value passed to `--from-github` from $ARGUMENTS.

The argument can be in one of three formats:
- **Full URL:** `https://github.com/<owner>/<repo>/issues/<number>` — parse owner, repo, issue_number from URL path segments
- **Bare number:** `42` — use owner/repo from mcp-connections.json
- **Short reference:** `owner/repo#number` — parse owner, repo, issue_number from this format

**Parsing rules:**
- If the value starts with `https://github.com/`, split the path by `/` and extract:
  - segment[1] = owner, segment[2] = repo, segment[4] = issue_number
- If the value matches `<word>/<word>#<digits>`, split on `/` to get owner, then split remaining on `#` to get repo and issue_number
- If the value is purely numeric (only digits), treat it as a bare issue number

Validate that issue_number is a positive integer. Convert any string representation to integer using `parseInt(issueNumber, 10)`.

**CRITICAL:** The GitHub MCP tool `issue_read` requires `issue_number` to be an integer, NOT a string. Always coerce to integer before use.

If the argument is missing, empty, or cannot be parsed into a valid issue_number, display:

```
Usage: /pde:brief --from-github <issue-url-or-number>

Examples:
  /pde:brief --from-github https://github.com/acme/project/issues/42
  /pde:brief --from-github 42
  /pde:brief --from-github acme/project#42
```

Stop here.

---

### Step 1 — Load repo info and check GitHub availability

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const gh = conn.connections && conn.connections.github;
const repo = gh && gh.repo || '';
const status = gh && gh.status || 'not_configured';
let toolName = '';
try {
  const lookup = b.call('github:get-issue', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ repo, status, toolName }) + '\n');
EOF
```

Parse the JSON output. The `repo` field contains `<owner>/<repo>` from the connected GitHub configuration. The `toolName` field confirms the MCP tool name to use (`mcp__github__issue_read`).

**If owner/repo is not available** (neither from URL parsing in Step 0 nor from mcp-connections.json), display:

```
GitHub is not connected or no repo configured.
Run /pde:connect github to set up.
Running /pde:brief without GitHub context.
```

Then delegate to the standard brief workflow (@workflows/brief.md) without pre-population. Stop the from-github workflow here.

If the parsed argument was a bare number and `repo` from mcp-connections.json is empty, the above degraded mode applies.

If repo was parsed from the URL or short reference in Step 0, use that owner/repo even if mcp-connections.json has no github entry.

Split the repo string on `/` to get `owner` and `repoName` for the MCP call.

---

### Step 2 — Fetch issue via MCP

Using the tool name returned by `bridge.call('github:get-issue')` — which is `mcp__github__issue_read` — call the tool with:
- `method`: `"get"`
- `owner`: the owner parsed in Step 0 or Step 1
- `repo`: the repo parsed in Step 0 or Step 1
- `issue_number`: the integer issue number (MUST be integer, not string)

The actual MCP call happens in Claude Code's execution context using the tool `mcp__github__issue_read`.

**If the call fails** (issue not found, permissions error, server unavailable, any error), display:

```
Could not fetch GitHub issue #<number>. Error: <error message>
Running /pde:brief without GitHub context.
```

Then delegate to the standard brief workflow (@workflows/brief.md) without pre-population. Stop the from-github workflow here.

---

### Step 3 — Extract and format issue data for brief pre-population

From the `mcp__github__issue_read` response, extract:

- `title` — the issue title
- `body` — the issue body text
- `labels` — array of label objects; extract `labels[].name` for each label
- `assignees` — array of assignee objects; extract `assignees[].login` for each assignee

**Format the pre-populated context:**

- **Problem Statement seed:** Use `<title> [from GitHub #<number>]`
- **Context seed:** Format `body` as a blockquote — prefix each line with `> ` — followed by `[from GitHub #<number>]` on a new line after the blockquote block
- **Constraints seed:** Each label on its own line as `- <label.name>`, followed by `[from GitHub #<number>]`
- **Assignees note:** `Assignees: <login1>, <login2>` (or omit if assignees array is empty)

Display a summary to the user:

```
GitHub Issue #<number> loaded:
  Title: <title>
  Labels: <label1>, <label2> (or "none")
  Body: <first 80 chars of body>...

Pre-populating brief with issue context.
```

If the body is shorter than 80 chars, display it in full (no ellipsis).

---

### Step 4 — Delegate to main brief pipeline with pre-populated context

Pass the pre-populated context to the standard brief workflow. Instruct the executor:

"Now run the standard /pde:brief workflow (@workflows/brief.md), using the following pre-populated context from GitHub issue #<number> as starting input for the relevant sections:

- **Problem Statement:** Begin the ## Problem Statement section with: `<title> [from GitHub #<number>]` — then expand and synthesize from PROJECT.md context as the full brief pipeline normally does.
- **Context (incorporated into brief sections):** The issue body provides background context. Format it as a blockquote under a ## GitHub Context subsection within the brief, appended below ## Problem Statement:
  ```
  > <body line 1>
  > <body line 2>
  > ...
  [from GitHub #<number>]
  ```
- **Constraints seeds:** Add these label-based constraints to the ## Constraints table (they will be merged with PROJECT.md-derived constraints):
  - <label1> [from GitHub #<number>]
  - <label2> [from GitHub #<number>]
  (If no labels, skip this seed.)
- **Assignees note:** If assignees are present, add a metadata note at the top of the brief: `Assignees: <login1>, <login2>`

All [from GitHub #<number>] markers MUST be preserved in the output brief — they trace which content originated from the GitHub issue."

Pass through any other flags present in $ARGUMENTS (such as `--quick`, `--dry-run`, `--verbose`, `--no-mcp`, `--force`) to the @workflows/brief.md pipeline. The from-github pre-population is additive — it does not change the brief pipeline's structure, only seeds specific sections.

</process>

<anti_patterns>
- NEVER call the raw MCP tool name `mcp__github__issue_read` directly in workflow instructions without looking it up via `bridge.call('github:get-issue')`. Always use the bridge lookup to resolve the tool name.
- NEVER pass `issue_number` as a string to `mcp__github__issue_read`. The tool requires an integer. Always use `parseInt(issueNumber, 10)`.
- NEVER halt if GitHub is unavailable — degrade gracefully to the standard brief workflow.
- NEVER modify @workflows/brief.md — this workflow delegates to it; it does not replace it.
- ALWAYS include `[from GitHub #<number>]` markers on every pre-populated section so users can trace issue-sourced content.
</anti_patterns>
</process>
