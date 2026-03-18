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
    transport: 'stdio',
    url: null,
    installCmd: 'claude mcp add --transport stdio --env LINEAR_API_KEY=<your-key> linear -- npx -y @linear/mcp-server',
    probeTimeoutMs: 10000,
    probeTool: null, // Phase 41 fills
    probeArgs: {},
  },
  figma: {
    displayName: 'Figma',
    transport: 'http',
    url: 'https://mcp.figma.com/mcp',
    installCmd: 'claude mcp add --transport http figma https://mcp.figma.com/mcp',
    probeTimeoutMs: 15000,
    probeTool: null, // Phase 42 fills
    probeArgs: {},
  },
  pencil: {
    displayName: 'Pencil',
    transport: 'stdio',
    url: null,
    installCmd: null, // Phase 43 fills
    probeTimeoutMs: 10000,
    probeTool: null, // Phase 43 fills
    probeArgs: {},
  },
  atlassian: {
    displayName: 'Atlassian (Jira)',
    transport: 'stdio',
    url: null,
    installCmd: 'claude mcp add --transport stdio --env ATLASSIAN_EMAIL=<email> --env ATLASSIAN_TOKEN=<token> jira -- npx -y @atlassian/jira-mcp',
    probeTimeoutMs: 10000,
    probeTool: null, // Phase 41 fills
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
 *   Phases 41-44 will add linear, figma, pencil, atlassian entries.
 */
const TOOL_MAP = {
  // GitHub — Phase 40 (verified against github/github-mcp-server source 2026-03-18)
  'github:probe':               'mcp__github__list_issues',
  'github:list-issues':         'mcp__github__list_issues',
  'github:get-issue':           'mcp__github__issue_read',
  'github:create-pr':           'mcp__github__create_pull_request',
  'github:update-pr':           'mcp__github__update_pull_request',
  'github:list-workflow-runs':  'mcp__github__actions_list',
  'github:get-workflow-run':    'mcp__github__actions_get',
  'github:search-issues':       'mcp__github__search_issues',
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
    '1. Get your Linear API key: linear.app/settings/api',
    '2. Run: claude mcp add --transport stdio --env LINEAR_API_KEY=<your-key> linear -- npx -y @linear/mcp-server',
    '3. Run /pde:connect linear --confirm',
  ],
  figma: [
    '1. Run: claude mcp add --transport http figma https://mcp.figma.com/mcp',
    '2. In Claude Code: /mcp -> select "figma" -> "Authenticate" -> browser flow',
    '3. Run /pde:connect figma --confirm',
  ],
  pencil: [
    '1. Pencil MCP setup instructions will be available in Phase 43',
    '2. Pencil requires VS Code or Cursor with the Pencil extension installed',
  ],
  atlassian: [
    '1. Get your Atlassian API token: id.atlassian.com/manage-profile/security',
    '2. Run: claude mcp add --transport stdio --env ATLASSIAN_EMAIL=<email> --env ATLASSIAN_TOKEN=<token> jira -- npx -y @atlassian/jira-mcp',
    '3. Run /pde:connect atlassian --confirm',
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
