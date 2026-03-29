'use strict';

/**
 * detect.cjs — Spec type auto-detection
 *
 * Identifies whether a source is OpenAPI, JSON Schema, GraphQL, or MCP
 * by examining the source URL/path and parsed content.
 */

/**
 * Detect the spec type from source identifier and optional parsed content.
 * @param {string} source - File path, URL, or mcp:// URI
 * @param {unknown} parsedContent - Parsed JSON object if available, else null
 * @returns {'openapi'|'jsonschema'|'graphql'|'mcp'|'http-probe'|'unknown'} Detected type
 */
function detectSpecType(source, parsedContent) {
  // URL scheme detection first
  if (source.startsWith('mcp://')) return 'mcp';

  // Extension detection
  if (source.endsWith('.graphql') || source.endsWith('.gql')) return 'graphql';

  // Content sniffing on parsed JSON
  if (parsedContent) {
    if (parsedContent.openapi) return 'openapi';
    if (parsedContent.swagger) return 'openapi';
    if (parsedContent.$schema || parsedContent.type || parsedContent.properties) {
      return 'jsonschema';
    }
  }

  // HTTP URL without content yet: needs probing
  if (source.startsWith('http://') || source.startsWith('https://')) return 'http-probe';

  return 'unknown';
}

module.exports = { detectSpecType };
