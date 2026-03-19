<purpose>
Guide the user through connecting PDE to an approved MCP server. Validates the server against the security allowlist, displays server-specific auth instructions, records connection status in .planning/mcp-connections.json on --confirm, and handles --disconnect. Does NOT make direct MCP tool calls — all MCP connection management happens through Claude Code's /mcp interface.
</purpose>

<required_reading>
@${CLAUDE_PLUGIN_ROOT}/references/mcp-integration.md
</required_reading>

<process>

## 0. Initialize

Parse $ARGUMENTS to extract:
- `SERVICE_KEY`: first positional argument (required). If missing, display help and stop:
  ```
  Usage: /pde:connect <service>

  Approved services: github, linear, figma, pencil, atlassian

  Run /pde:connect <service> to see auth instructions for that service.
  ```
- `--confirm` flag: boolean, default false. When present, record the connection as active in mcp-connections.json.
- `--disconnect` flag: boolean, default false. When present, mark the connection as disconnected.
- `--repo <owner/repo>` (optional, GitHub only): The GitHub repo to associate with this connection. If not provided and SERVICE_KEY is `github`, the workflow will ask for it during Step 3.5.

Convert SERVICE_KEY to lowercase and trim whitespace.

## 1. Validate Server

Run assertApproved() from mcp-bridge.cjs to check the server is in the approved list:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
try {
  b.assertApproved(process.env.SERVICE_KEY);
  process.stdout.write('APPROVED\n');
} catch (err) {
  process.stderr.write(err.message + '\n');
  process.exit(1);
}
EOF
```

(Set `SERVICE_KEY` environment variable to the parsed service key before running.)

If the command exits non-zero, the error output contains the policy violation message. Display that message verbatim to the user. The message will include:
- The rejected key
- The phrase "is not an approved MCP server"
- The list of approved servers (github, linear, figma, pencil, atlassian)

Do NOT proceed after a policy violation. Stop here.

## 2. Handle --disconnect

If `--disconnect` flag is present:

Run updateConnectionStatus() to mark the server as disconnected:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = b.updateConnectionStatus(process.env.SERVICE_KEY, 'disconnected', {
  disconnected_at: new Date().toISOString()
});
process.stdout.write(JSON.stringify(result) + '\n');
EOF
```

Display:
```
Disconnected from <displayName>. Connection metadata updated in .planning/mcp-connections.json.
```

Then suggest:
```
Run 'claude mcp remove <SERVICE_KEY>' to also remove the MCP server registration from Claude Code.
```

Stop here. Do not proceed to auth instructions.

## 3. Display Auth Instructions

If `--confirm` flag is NOT present:

Run AUTH_INSTRUCTIONS lookup from mcp-bridge.cjs:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const instructions = b.AUTH_INSTRUCTIONS[process.env.SERVICE_KEY];
process.stdout.write(JSON.stringify(instructions) + '\n');
EOF
```

Parse the JSON array of instruction strings.

Display header:
```
Connecting to <displayName>
```

Followed by a blank line.

Display each instruction string on its own line, in order.

After all instructions, display:
```
After completing the steps above, run: /pde:connect <SERVICE_KEY> --confirm
```

Stop here. Do not proceed to Step 4 without --confirm.

## 3.5. Capture GitHub Repo (GitHub only, --confirm present)

If `--confirm` flag IS present AND `SERVICE_KEY` equals `github`:

Before recording the connection, check if the user provided a repo in $ARGUMENTS (e.g., `--repo owner/repo-name`).

If `--repo` is provided in arguments, use that value directly as GITHUB_REPO.

If `--repo` is NOT provided, ask the user:

```
Which GitHub repo should PDE sync with? (format: owner/repo)
```

Wait for the user's response. Store the answer as GITHUB_REPO.

Validate GITHUB_REPO format: it must contain exactly one `/` separating a non-empty owner and non-empty repo name. If invalid, display:

```
Invalid repo format. Expected: owner/repo (e.g., acme/my-project)
```

And ask again.

Then proceed to Step 4, passing the repo value as an extraField.

## 3.6. Capture Linear Team (Linear only, --confirm present)

If `--confirm` flag IS present AND `SERVICE_KEY` equals `linear`:

Before recording the connection, the workflow needs the user's Linear team ID. Linear requires teamId for issue listing and creation.

Call the MCP tool `mcp__linear__list_teams` (looked up via bridge.call('linear:list-teams')) to fetch available teams. This call happens in Claude Code's execution context as a normal tool use.

If the MCP call succeeds and returns one or more teams:
- Display the team list:
  ```
  Available Linear teams:

    1. <team.name> (ID: <team.id>)
    2. <team.name> (ID: <team.id>)
    ...

  Select a team (enter number):
  ```
- Wait for user selection. Store the selected team's `id` as LINEAR_TEAM_ID and `name` as LINEAR_TEAM_NAME.

If the MCP call fails or returns no teams:
- Ask manually:
  ```
  Could not fetch teams automatically.
  What is your Linear team ID? (Found at linear.app/settings -> API -> Team ID, or visible in issue URLs as the prefix before the number)
  ```
- Wait for user input. Store as LINEAR_TEAM_ID. Set LINEAR_TEAM_NAME to empty string.

Then proceed to Step 4, passing teamId and teamName as extraFields.

## 3.7. Capture Jira Project (Atlassian only, --confirm present)

If `--confirm` flag IS present AND `SERVICE_KEY` equals `atlassian`:

Before recording the connection, the workflow needs the user's Jira project key and site URL.

Display:
```
PDE connects to Atlassian Cloud (*.atlassian.net). Jira Data Center is not supported in v0.5.

What is your Jira site URL? (e.g., https://myorg.atlassian.net)
```

Wait for user input. Store as JIRA_SITE_URL. Validate it contains `atlassian.net` — if not, display:
```
Warning: URL does not appear to be an Atlassian Cloud site. Jira Data Center is not supported in v0.5. Continue anyway? (y/n)
```
If user says no, stop.

Then call the MCP tool `mcp__atlassian__getVisibleJiraProjectsList` (looked up via bridge.call('jira:list-projects')) to fetch accessible projects. This call happens in Claude Code's execution context.

If the MCP call succeeds and returns one or more projects:
- Display the project list:
  ```
  Available Jira projects:

    1. <project.name> (<project.key>)
    2. <project.name> (<project.key>)
    ...

  Select a project (enter number):
  ```
- Wait for user selection. Store the selected project's `key` as JIRA_PROJECT_KEY and `name` as JIRA_PROJECT_NAME.

If the MCP call fails or returns no projects:
- Ask manually:
  ```
  Could not fetch projects automatically.
  What is your Jira project key? (e.g., PROJ, ENG, TEAM)
  ```
- Wait for user input. Store as JIRA_PROJECT_KEY. Set JIRA_PROJECT_NAME to empty string.

Then proceed to Step 4, passing JIRA_PROJECT_KEY as projectKey, JIRA_PROJECT_NAME as projectName, and JIRA_SITE_URL as siteUrl as extraFields.

## 4. Confirm Connection (--confirm present)

Run updateConnectionStatus() to record the connection as active.

**For GitHub connections** (`SERVICE_KEY` equals `github`), include the `repo` field captured in Step 3.5:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = b.updateConnectionStatus(process.env.SERVICE_KEY, 'connected', {
  connected_at: new Date().toISOString(),
  repo: process.env.GITHUB_REPO
});
process.stdout.write(JSON.stringify(result) + '\n');
EOF
```

**For Linear connections** (`SERVICE_KEY` equals `linear`), include the `teamId` and `teamName` fields captured in Step 3.6:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = b.updateConnectionStatus(process.env.SERVICE_KEY, 'connected', {
  connected_at: new Date().toISOString(),
  teamId: process.env.LINEAR_TEAM_ID,
  teamName: process.env.LINEAR_TEAM_NAME || ''
});
process.stdout.write(JSON.stringify(result) + '\n');
EOF
```

**For Atlassian connections** (`SERVICE_KEY` equals `atlassian`), include the `projectKey`, `projectName`, and `siteUrl` fields captured in Step 3.7:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = b.updateConnectionStatus(process.env.SERVICE_KEY, 'connected', {
  connected_at: new Date().toISOString(),
  projectKey: process.env.JIRA_PROJECT_KEY,
  projectName: process.env.JIRA_PROJECT_NAME || '',
  siteUrl: process.env.JIRA_SITE_URL
});
process.stdout.write(JSON.stringify(result) + '\n');
EOF
```

**For all other services** (`SERVICE_KEY` is not `github`, `linear`, or `atlassian`), omit service-specific fields:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = b.updateConnectionStatus(process.env.SERVICE_KEY, 'connected', {
  connected_at: new Date().toISOString()
});
process.stdout.write(JSON.stringify(result) + '\n');
EOF
```

Display:
```
Connected to <displayName>. Status saved to .planning/mcp-connections.json.
```

Then display:
```
Run /pde:mcp-status to see all connection states.
```

## 5. Error Handling

If any node command fails unexpectedly (non-policy errors such as missing module, parse errors):
- Display the error output to the user verbatim.
- Suggest: `Check that ${CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs exists and loads cleanly.`
- Never exit without a user-facing message.

**Important:** This workflow does NOT call any MCP tools directly. It guides the user through auth setup steps (which happen outside PDE via `claude mcp add` in a terminal and `/mcp` inside Claude Code), then records the connection metadata. The actual MCP server connection is managed by Claude Code's runtime, not by PDE.

</process>
