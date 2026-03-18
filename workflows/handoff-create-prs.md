<purpose>
Create GitHub PRs from handoff artifacts. Reads the most recent HND-handoff-spec-v{N}.md from .planning/design/implementation/, constructs PR creation payloads, presents a confirmation list to the user, and only proceeds after explicit user approval. Implements GH-02. Satisfies VAL-03 (write-back confirmation gate).
</purpose>

<process>

## /pde:handoff --create-prs — GitHub PR Creation Pipeline

---

### Step 0 — Initialize and check GitHub availability

Load repo info from mcp-connections.json and verify GitHub is connected:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const gh = conn.connections && conn.connections.github;
const repo = gh && gh.repo || '';
const status = gh && gh.status || 'not_configured';
const lookup = b.call('github:create-pr', {});
process.stdout.write(JSON.stringify({ repo, status, toolName: lookup.toolName }) + '\n');
EOF
```

Parse the JSON output. The `repo` field contains `<owner>/<repo>`. The `toolName` field confirms the MCP tool name to use (`mcp__github__create_pull_request`).

If `repo` is empty or `status` is not `connected`, display:

```
GitHub is not connected or no repo configured.
Run /pde:connect github to set up.
PR creation skipped.
```

Stop here. Do NOT proceed with any further steps.

---

### Step 1 — Find handoff artifacts

Use the Glob tool to search for handoff spec files matching:

```
.planning/design/implementation/HND-handoff-spec-v*.md
```

If no files are found matching this pattern, display:

```
No handoff specs found. Run /pde:handoff first to generate a handoff spec.
```

Stop here.

If one or more files are found, select the latest version by finding the file with the highest `v{N}` number in its name. Parse the version number from each filename (e.g., `HND-handoff-spec-v3.md` → version 3) and select the maximum.

Use the Read tool to read the selected handoff spec file.

From the handoff spec, extract:
- **Title:** Look for the first `# ` heading in the file. If no `# ` heading exists, derive the title from the filename (convert `HND-handoff-spec-v{N}.md` to `Handoff Spec v{N}`).
- **Summary:** Look for a `## Summary` section. If found, use the first paragraph under it (up to 500 characters). If no `## Summary` section exists, use the first non-heading paragraph in the document (up to 500 characters).

---

### Step 2 — Gather PR details

Display a prompt to the user to collect the branch information:

```
Which branch contains this work? (the branch must already be pushed to GitHub)
Branch name:
```

Wait for the user to provide the branch name. Store it as `HEAD_BRANCH`.

Then display:

```
Target branch [main]:
```

Wait for the user response. If the user provides a non-empty value, use it as the target branch. If the user presses Enter with no value (empty response), default to `main`. Store as `BASE_BRANCH`.

Split the `repo` value (from Step 0) on `/` to get:
- `owner` = first segment
- `repoName` = second segment

Construct the PR payload:
- `owner`: `owner`
- `repo`: `repoName`
- `title`: the title extracted from the handoff spec
- `head`: `HEAD_BRANCH`
- `base`: `BASE_BRANCH`
- `body`: the summary extracted from the handoff spec (up to 500 chars)
- `draft`: false
- `maintainer_can_modify`: true

---

### Step 3 — Display confirmation gate (CRITICAL — no write without user approval)

Display the complete PR details for user review before any GitHub write:

```
GitHub PRs to create:

  1. [<title>] <HEAD_BRANCH> -> <BASE_BRANCH> in <owner>/<repoName>
     Body: <first 100 chars of body>...

Create this PR? (y/n)
```

If the body is shorter than 100 characters, display it in full without the ellipsis.

Wait for the user's response.

**CRITICAL:** If the user responds with anything OTHER than `y` or `yes` (case-insensitive), display:

```
No PRs created.
```

Stop here immediately. Do NOT call any MCP tool. Do NOT create any PR.

Only proceed to Step 4 if the user explicitly responds with `y` or `yes` (case-insensitive).

---

### Step 4 — Create PR via MCP (only after user confirms)

Using the tool name returned by `bridge.call('github:create-pr')` — which is `mcp__github__create_pull_request` — call the tool with the constructed payload:

- `owner`: the owner parsed from repo
- `repo`: the repoName parsed from repo
- `title`: the title from the handoff spec
- `head`: `HEAD_BRANCH`
- `base`: `BASE_BRANCH`
- `body`: the summary from the handoff spec
- `draft`: false
- `maintainer_can_modify`: true

The actual MCP call happens in Claude Code's execution context using the tool `mcp__github__create_pull_request`.

**If the call succeeds,** display:

```
PR created successfully!
  Title: <title>
  URL: <PR URL from response>
  Branch: <HEAD_BRANCH> -> <BASE_BRANCH>
```

**If the call fails,** display the error message and suggest common fixes:

```
PR creation failed: <error message>

Common causes:
  - Branch '<HEAD_BRANCH>' not pushed to GitHub (run: git push -u origin <HEAD_BRANCH>)
  - Branch '<HEAD_BRANCH>' does not exist
  - A PR already exists for this branch
```

</process>

<anti_patterns>
- NEVER create a PR without the user explicitly confirming with `y` or `yes`. Any other response (including `Y`, `Yes`, `YES` — wait, those ARE case-insensitive matches — but `n`, `no`, empty, or anything else) results in "No PRs created." and immediate stop.
- NEVER call the raw MCP tool name `mcp__github__create_pull_request` without looking it up via `bridge.call('github:create-pr')`. Always use the bridge lookup.
- NEVER hardcode owner/repo values — always read from mcp-connections.json via `loadConnections()`.
- NEVER call any MCP tool before Step 3 confirmation is obtained. Steps 0-2 are read-only.
- NEVER proceed if GitHub status is not `connected` — always check Step 0 guard.
</anti_patterns>
