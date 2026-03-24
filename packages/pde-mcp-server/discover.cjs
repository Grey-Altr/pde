'use strict';

/**
 * discover.cjs — .planning/ directory discovery for pde-mcp-server
 *
 * Walks up from a starting directory to find the nearest .planning/ directory.
 * Used by the MCP server to locate the PDE project root regardless of where
 * the server process is launched from.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Walk up from startDir looking for a .planning/ directory.
 *
 * @param {string} startDir - Directory to begin the search from
 * @returns {string | null} Absolute path to .planning/ directory, or null if not found
 */
function discoverPlanningDir(startDir) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, '.planning');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}

module.exports = { discoverPlanningDir };
