'use strict';

/**
 * mcp-bridge.cjs — Central MCP adapter module
 *
 * Security policy layer, probe/degrade contracts, canonical tool name adapter,
 * and connection metadata persistence for PDE MCP integrations.
 *
 * This is a coordination and policy layer. Claude Code is the MCP runtime.
 * This module does NOT call MCP tools directly — it validates, maps, and
 * returns lookup results for the workflow layer to execute.
 *
 * Phases 40-44 populate TOOL_MAP with canonical → raw tool name mappings.
 */

const fs = require('fs');
const path = require('path');
const { safeReadFile } = require('./core.cjs');

// ─── Approved server registry ─────────────────────────────────────────────────

const APPROVED_SERVERS = {
  github: {
    displayName: 'GitHub',
    transport: 'http',
    url: 'https://api.githubcopilot.com/mcp/',
    installCmd: 'claude mcp add --transport http github https://api.githubcopilot.com/mcp/',
    probeTimeoutMs: 10000,
    probeTool: 'mcp__github__list_issues', // Phase 40
    probeArgs: { owner: 'github', repo: 'github-mcp-server', state: 'OPEN', perPage: 1 },
  },
  linear: {
    displayName: 'Linear',
    transport: 'http',
    url: 'https://mcp.linear.app/mcp',
    installCmd: 'claude mcp add --transport http linear https://mcp.linear.app/mcp',
    probeTimeoutMs: 10000,
    probeTool: 'mcp__linear__list_issues', // Phase 41
    probeArgs: { limit: 1 },
  },
  figma: {
    displayName: 'Figma',
    transport: 'http',
    url: 'https://mcp.figma.com/mcp',
    installCmd: 'claude mcp add --transport http figma https://mcp.figma.com/mcp',
    probeTimeoutMs: 15000,
    probeTool: 'mcp__figma__get_design_context', // Phase 42
    probeArgs: {},
  },
  pencil: {
    displayName: 'Pencil',
    transport: 'stdio',
    url: null,
    installCmd: null, // Auto-configured by VS Code extension — no manual claude mcp add needed
    probeTimeoutMs: 8000, // Short timeout — stdio hang prevention when VS Code not running
    probeTool: 'mcp__pencil__get_variables', // Lightest read-only tool (MEDIUM confidence on raw name)
    probeArgs: {},
  },
  atlassian: {
    displayName: 'Atlassian (Jira)',
    transport: 'sse',
    url: 'https://mcp.atlassian.com/v1/sse',
    installCmd: 'claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse',
    probeTimeoutMs: 10000,
    probeTool: 'mcp__atlassian__getVisibleJiraProjectsList', // Phase 41
    probeArgs: {},
  },
  stitch: {
    displayName: 'Google Stitch',
    transport: 'stdio',
    url: null,
    installCmd: null, // Multi-step: env var + npx — see AUTH_INSTRUCTIONS
    probeTimeoutMs: 15000,
    probeTool: 'mcp__stitch__list_projects', // TOOL_MAP_VERIFY_REQUIRED — lightest read-only tool
    probeArgs: {},
  },
};

// ─── Canonical tool name map ──────────────────────────────────────────────────

/**
 * TOOL_MAP maps PDE canonical tool names to raw MCP tool names.
 * Phases 40-44 populate this map — Phase 39 provides the scaffold only.
 *
 * Current entries:
 *   GitHub — Phase 40 (verified against github/github-mcp-server source 2026-03-18)
 *   Linear — Phase 41 (verified from official mcp.linear.app server)
 *   Atlassian — Phase 41 (verified from Atlassian Rovo MCP supported-tools docs)
 *   Figma — Phase 42 (verified from developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
 *   Pencil — Phase 43 (tool names from docs.pencil.dev/getting-started/ai-integration; raw mcp__pencil__* names MEDIUM confidence)
 *   Phase 44 will complete validation.
 */
const TOOL_MAP = {
  // GitHub — Phase 40 (verified against github/github-mcp-server source 2026-03-18)
  'github:probe':               'mcp__github__list_issues',
  'github:list-issues':         'mcp__github__list_issues',
  'github:get-issue':           'mcp__github__issue_read',
  'github:create-pr':           'mcp__github__create_pull_request',
  'github:update-pr':           'mcp__github__update_pull_request',  // TOOL_MAP_PREREGISTERED
  'github:list-workflow-runs':  'mcp__github__actions_list',
  'github:get-workflow-run':    'mcp__github__actions_get',
  'github:search-issues':       'mcp__github__search_issues',         // TOOL_MAP_PREREGISTERED

  // Linear — Phase 41 (verified from official mcp.linear.app server)
  'linear:probe':           'mcp__linear__list_issues',
  'linear:list-issues':     'mcp__linear__list_issues',
  'linear:get-issue':       'mcp__linear__get_issue',
  'linear:list-cycles':     'mcp__linear__list_cycles',
  'linear:list-teams':      'mcp__linear__list_teams',
  'linear:create-issue':    'mcp__linear__create_issue',
  'linear:list-statuses':   'mcp__linear__list_issue_statuses',

  // Atlassian — Phase 41 (verified from Atlassian Rovo MCP supported-tools docs)
  'jira:probe':                     'mcp__atlassian__getVisibleJiraProjectsList',
  'jira:search-issues':             'mcp__atlassian__searchJiraIssuesUsingJql',
  'jira:get-issue':                 'mcp__atlassian__getJiraIssue',
  'jira:create-issue':              'mcp__atlassian__createJiraIssue',
  'jira:get-project-types':         'mcp__atlassian__getJiraProjectIssueTypesMetadata',
  'jira:get-issue-type-fields':     'mcp__atlassian__getJiraIssueTypeMetaWithFields',
  'jira:list-projects':             'mcp__atlassian__getVisibleJiraProjectsList',

  // Figma — Phase 42 (verified from developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
  'figma:probe':                  'mcp__figma__get_design_context',
  'figma:get-design-context':     'mcp__figma__get_design_context',
  'figma:get-variable-defs':      'mcp__figma__get_variable_defs',
  'figma:get-code-connect-map':   'mcp__figma__get_code_connect_map',
  'figma:get-screenshot':         'mcp__figma__get_screenshot',
  'figma:generate-design':        'mcp__figma__generate_figma_design',
  'figma:get-metadata':           'mcp__figma__get_metadata',

  // Pencil — Phase 43 (tool names from docs.pencil.dev/getting-started/ai-integration; raw mcp__pencil__* names MEDIUM confidence)
  'pencil:probe':             'mcp__pencil__get_variables',
  'pencil:get-variables':     'mcp__pencil__get_variables',
  'pencil:set-variables':     'mcp__pencil__set_variables',
  'pencil:get-screenshot':    'mcp__pencil__get_screenshot',
  'pencil:batch-get':         'mcp__pencil__batch_get',
  'pencil:batch-design':      'mcp__pencil__batch_design',
  'pencil:get-editor-state':  'mcp__pencil__get_editor_state',

  // Stitch — Phase 65 (MEDIUM confidence — community sources; MCP-05 live verification required before finalizing)
  'stitch:probe':                   'mcp__stitch__list_projects',          // TOOL_MAP_VERIFY_REQUIRED
  'stitch:generate-screen':         'mcp__stitch__generate_screen_from_text', // TOOL_MAP_VERIFY_REQUIRED
  'stitch:get-screen':              'mcp__stitch__get_screen',             // TOOL_MAP_VERIFY_REQUIRED
  'stitch:list-screens':            'mcp__stitch__list_screens',           // TOOL_MAP_VERIFY_REQUIRED
  'stitch:fetch-screen-code':       'mcp__stitch__fetch_screen_code',      // TOOL_MAP_VERIFY_REQUIRED
  'stitch:fetch-screen-image':      'mcp__stitch__fetch_screen_image',     // TOOL_MAP_VERIFY_REQUIRED
  'stitch:extract-design-context':  'mcp__stitch__extract_design_context', // TOOL_MAP_VERIFY_REQUIRED
  'stitch:create-project':          'mcp__stitch__create_project',         // TOOL_MAP_VERIFY_REQUIRED
  'stitch:list-projects':           'mcp__stitch__list_projects',          // TOOL_MAP_VERIFY_REQUIRED
  'stitch:get-project':             'mcp__stitch__get_project',            // TOOL_MAP_VERIFY_REQUIRED
};

// ─── Per-server auth instructions ─────────────────────────────────────────────

const AUTH_INSTRUCTIONS = {
  github: [
    '1. Run in terminal: claude mcp add --transport http github https://api.githubcopilot.com/mcp/',
    '2. In Claude Code session: /mcp',
    '3. Select "github" -> "Authenticate" -> follow browser OAuth flow',
    '4. Return here and run /pde:connect github --confirm',
  ],
  linear: [
    '1. Run: claude mcp add --transport http linear https://mcp.linear.app/mcp',
    '2. In Claude Code: /mcp -> select "linear" -> "Authenticate" -> follow browser OAuth flow',
    '3. Run /pde:connect linear --confirm',
  ],
  figma: [
    '1. Run: claude mcp add --transport http figma https://mcp.figma.com/mcp',
    '2. In Claude Code: /mcp -> select "figma" -> "Authenticate" -> browser flow',
    '3. Run /pde:connect figma --confirm',
  ],
  pencil: [
    '1. Install the Pencil extension: code --install-extension highagency.pencildev',
    '   (or search "Pencil" in VS Code Extensions marketplace)',
    '2. Open VS Code and open or create a .pen file to start the Pencil MCP server',
    '3. The Pencil extension auto-configures Claude Code — no claude mcp add command needed',
    '4. Verify Pencil appears in Claude Code MCP list: run /mcp in Claude Code',
    '5. Return here and run /pde:connect pencil --confirm',
  ],
  atlassian: [
    '1. Run: claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse',
    '2. In Claude Code: /mcp -> select "atlassian" -> "Authenticate" -> follow browser OAuth flow',
    '3. Run /pde:connect atlassian --confirm',
  ],
  stitch: [
    '1. Go to stitch.withgoogle.com -> click your profile icon -> Settings -> API Key section',
    '2. Generate and copy your Stitch API key',
    '3. Add export STITCH_API_KEY="your-api-key-here" to your shell profile (~/.zshrc or ~/.bashrc)',
    '4. Verify your API key is valid at stitch.withgoogle.com -> Settings -> API Keys',
    '5. Restart your terminal or run: source ~/.zshrc',
    '6. Register Stitch MCP server: claude mcp add stitch --transport stdio -- npx @_davideast/stitch-mcp proxy',
    '7. Return here and run /pde:connect stitch --confirm',
  ],
};

// ─── Connection metadata path ─────────────────────────────────────────────────

const CONNECTIONS_PATH = path.join(process.cwd(), '.planning', 'mcp-connections.json');

// ─── Security policy enforcement ──────────────────────────────────────────────

/**
 * Throws a POLICY_VIOLATION error if serverKey is not in the approved list.
 *
 * @param {string} serverKey
 * @throws {Error} with code 'POLICY_VIOLATION'
 */
function assertApproved(serverKey) {
  if (!APPROVED_SERVERS[serverKey]) {
    const approvedList = Object.keys(APPROVED_SERVERS).join(', ');
    const err = new Error(
      `"${serverKey}" is not an approved MCP server. ` +
      `PDE only connects to: ${approvedList}. ` +
      `See .planning/phases/39-mcp-infrastructure-foundation/ for the security policy.`
    );
    err.code = 'POLICY_VIOLATION';
    throw err;
  }
}

// ─── Connection metadata persistence ─────────────────────────────────────────

/**
 * Loads connection metadata from .planning/mcp-connections.json.
 * Returns a default schema object if the file is missing or unparseable.
 * Never throws.
 *
 * @returns {{ schema_version: string, connections: Object }}
 */
function loadConnections() {
  const raw = safeReadFile(CONNECTIONS_PATH);
  if (!raw) return { schema_version: '1.0', connections: {} };
  try {
    return JSON.parse(raw);
  } catch {
    return { schema_version: '1.0', connections: {} };
  }
}

/**
 * Writes connection metadata to .planning/mcp-connections.json.
 * Creates the .planning/ directory if needed.
 * IMPORTANT: data must contain NO credential fields (token, secret, key, password).
 *
 * @param {{ schema_version: string, connections: Object }} data
 */
function saveConnections(data) {
  const dir = path.dirname(CONNECTIONS_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONNECTIONS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Connection status queries ────────────────────────────────────────────────

/**
 * Returns the connection status for a single server.
 *
 * @param {string} serverKey
 * @returns {Object} connection entry or default not-configured object
 */
function getStatus(serverKey) {
  assertApproved(serverKey);
  const data = loadConnections();
  const entry = data.connections && data.connections[serverKey];
  if (entry) return entry;
  return {
    status: 'not_configured',
    server_key: serverKey,
    display_name: APPROVED_SERVERS[serverKey].displayName,
  };
}

/**
 * Returns connection statuses for all approved servers.
 *
 * @returns {Object} map of server key → status entry
 */
function getAllStatuses() {
  const result = {};
  for (const serverKey of Object.keys(APPROVED_SERVERS)) {
    result[serverKey] = getStatus(serverKey);
  }
  return result;
}

// ─── Probe ────────────────────────────────────────────────────────────────────

/**
 * Checks whether a server's probe tool is configured.
 *
 * This is a coordination point. Actual MCP tool calls happen at the workflow
 * layer where Claude Code MCP tools are available. This module never calls
 * MCP tools directly.
 *
 * @param {string} serverKey
 * @returns {{ available: boolean, status: string, reason: string }}
 */
function probe(serverKey) {
  assertApproved(serverKey);
  const server = APPROVED_SERVERS[serverKey];
  if (server.probeTool === null) {
    return {
      available: false,
      status: 'not_configured',
      reason: 'probe_not_implemented',
    };
  }
  return {
    available: false,
    status: 'probe_deferred',
    reason: 'Probe tool calls require Claude Code MCP runtime — use within workflow context',
  };
}

// ─── Canonical tool name lookup ───────────────────────────────────────────────

/**
 * Looks up canonicalName in TOOL_MAP and returns the raw tool name + args.
 * Throws if the canonical name has no registered mapping.
 *
 * The actual MCP call is made by the workflow layer via Claude Code.
 *
 * @param {string} canonicalName  e.g. 'github:list-issues'
 * @param {Object} args           Arguments to forward to the tool
 * @returns {{ toolName: string, args: Object }}
 */
function call(canonicalName, args) {
  if (!Object.prototype.hasOwnProperty.call(TOOL_MAP, canonicalName)) {
    const available = Object.keys(TOOL_MAP).join(', ') || 'none (populate in phases 40-44)';
    throw new Error(
      `Tool "${canonicalName}" not found in TOOL_MAP. Available: ${available}`
    );
  }
  return { toolName: TOOL_MAP[canonicalName], args };
}

// ─── Connection status updates ────────────────────────────────────────────────

/**
 * Merges a status update into the connections metadata for a server.
 * IMPORTANT: extraFields must NOT contain credential fields.
 *
 * @param {string} serverKey
 * @param {string} status         e.g. 'connected', 'disconnected', 'not_configured'
 * @param {Object} [extraFields]  Additional metadata fields (no credentials)
 * @returns {Object} the updated connection entry
 */
function updateConnectionStatus(serverKey, status, extraFields) {
  assertApproved(serverKey);
  const server = APPROVED_SERVERS[serverKey];
  const data = loadConnections();
  if (!data.connections) data.connections = {};

  const existing = data.connections[serverKey] || {};
  const updated = {
    ...existing,
    server_key: serverKey,
    display_name: server.displayName,
    transport: server.transport,
    url: server.url,
    status,
    ...(extraFields || {}),
    last_updated: new Date().toISOString(),
  };

  data.connections[serverKey] = updated;
  saveConnections(data);
  return updated;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  APPROVED_SERVERS,
  TOOL_MAP,
  AUTH_INSTRUCTIONS,
  CONNECTIONS_PATH,
  assertApproved,
  loadConnections,
  saveConnections,
  getStatus,
  getAllStatuses,
  probe,
  call,
  updateConnectionStatus,
};
