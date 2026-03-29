'use strict';

/**
 * mcp.cjs — MCP (Model Context Protocol) parser
 *
 * Introspects an MCP server via StdioClientTransport + Client.listTools()
 * and maps the tools list to flat capability arrays matching CapabilitySchema.
 *
 * Exports: parse, parseMCPToolsList
 */

const path = require('path');

/**
 * Absolute path to MCP SDK CJS distribution.
 * The SDK is installed in packages/pde-mcp-server — NOT in root node_modules.
 */
const SDK_BASE = path.join(
  __dirname,
  '../../../../packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs'
);

/**
 * Map an array of MCP tool objects to capabilities.
 * This is a pure function — usable in unit tests without spawning a process.
 *
 * @param {Array} tools - Array of MCP tool objects from client.listTools().tools
 * @param {string} transport - Transport type label (default: 'stdio')
 * @returns {Array} Capability objects matching CapabilitySchema shape
 */
function parseMCPToolsList(tools, transport) {
  const transportName = transport || 'stdio';
  return (tools || []).map(function(tool) {
    return {
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema || { type: 'object', properties: {} },
      outputSchema: null,
      method: null,
      path: null,
      extensions: {
        transport: transportName,
      },
    };
  });
}

/**
 * Parse an MCP server source into capabilities.
 *
 * Source format: 'mcp://command arg1 arg2 ...'
 * The mcp:// prefix is stripped, then the remainder is split on whitespace
 * to get command + args for StdioClientTransport.
 *
 * CRITICAL: transport.close() is ALWAYS called in the finally block
 * to kill the spawned child process (prevents hanging processes).
 *
 * @param {string} source - mcp:// prefixed command string
 * @param {*} _content - Unused (MCP parser always connects live)
 * @returns {Promise<Array>} Capability objects
 */
async function parse(source, _content) {
  if (!source.startsWith('mcp://')) {
    throw new Error('MCP parser: source must start with mcp://, got: ' + source);
  }

  const commandStr = source.slice('mcp://'.length).trim();
  const parts = commandStr.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  // Lazy-require MCP SDK from the known absolute path
  const Client = require(path.join(SDK_BASE, 'client/index.js')).Client;
  const StdioClientTransport = require(path.join(SDK_BASE, 'client/stdio.js')).StdioClientTransport;

  const client = new Client({ name: 'pde-ingest', version: '0.1.0' });
  const transport = new StdioClientTransport({ command: command, args: args });

  try {
    await client.connect(transport);
    const result = await client.listTools();
    return parseMCPToolsList(result.tools || [], 'stdio');
  } finally {
    await transport.close().catch(function() {});
  }
}

module.exports = {
  parse: parse,
  parseMCPToolsList: parseMCPToolsList,
};
