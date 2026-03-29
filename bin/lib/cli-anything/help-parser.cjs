'use strict';

/**
 * help-parser.cjs — CLI --help output parser
 *
 * Extracts subcommands, flags, and capabilities from any CLI's --help output.
 * Used by the CLI wrapping pipeline to generate MCP server tools.
 */

const { spawnSync } = require('child_process');

/**
 * Spawn a CLI binary with --help and return its output.
 * Returns stdout if non-empty, else stderr. Ignores exit code (many CLIs
 * return non-zero for --help).
 *
 * @param {string} binary - Path or name of the binary
 * @param {string[]} cmdPath - Subcommand path to prepend before --help
 * @returns {string} Help text output
 */
function spawnHelpText(binary, cmdPath = []) {
  const result = spawnSync(binary, [...cmdPath, '--help'], {
    encoding: 'utf8',
    timeout: 5000,
  });
  return (result.stdout || result.stderr || '').trim();
}

/**
 * Parse subcommands from --help output.
 * Extracts {name, description} pairs from two-column format lines.
 *
 * @param {string} helpText - CLI --help output
 * @returns {{ name: string, description: string }[]}
 */
function parseSubcommands(helpText) {
  if (!helpText) return [];

  const results = [];
  const lines = helpText.split('\n');

  for (const line of lines) {
    // Skip ALL_CAPS section headers (e.g., "COMMANDS:", "CORE COMMANDS", "OPTIONS:")
    if (/^[A-Z][A-Z\s]+:?\s*$/.test(line.trim())) continue;

    // Skip lines starting with - or -- (flags)
    if (/^\s*-/.test(line)) continue;

    // Match two-column format: 0-4 leading spaces, word, 2+ spaces, description
    const match = line.match(/^ {0,4}(\w[-\w]*)  {2,}(.+)/);
    if (!match) continue;

    const name = match[1].trim();
    const description = match[2].trim();

    // Skip if first token contains special chars: :, (, )
    if (/[:()]/.test(name)) continue;

    results.push({ name, description });
  }

  return results;
}

/**
 * Parse flags from --help output.
 * Extracts {flag, short, long, arg, description} for each flag.
 *
 * @param {string} helpText - CLI --help output
 * @returns {{ flag: string, short: string|null, long: string|null, arg: string|null, description: string }[]}
 */
function parseFlags(helpText) {
  if (!helpText) return [];

  const results = [];
  const lines = helpText.split('\n');

  for (const line of lines) {
    // Match flag lines: optional short flag, optional long flag, optional arg, description
    const match = line.match(
      /^\s+(-\w)?(?:,\s*)?(-{1,2}[\w-]+)(?:\s+<([^>]+)>)?\s{2,}(.+)?/
    );
    if (!match) continue;

    const short = match[1] || null;
    const long = match[2] || null;
    const arg = match[3] || null;
    const description = (match[4] || '').trim();

    // The primary flag name (long if available, else short)
    const flag = long || short;
    if (!flag) continue;

    // Only include actual flags (starting with -)
    if (!flag.startsWith('-')) continue;

    results.push({ flag, short, long, arg, description });
  }

  return results;
}

/**
 * Recursively discover all capabilities of a binary by traversing its
 * subcommand tree via --help output.
 *
 * @param {string} binary - Path or name of the binary
 * @param {string[]} prefix - Current subcommand path (for recursion)
 * @param {number} depth - Current recursion depth (max 3)
 * @returns {object[]} Array of CapabilitySchema-shaped objects
 */
function discoverCapabilities(binary, prefix = [], depth = 0) {
  if (depth > 3) return [];

  const helpText = spawnHelpText(binary, prefix);
  const subcommands = parseSubcommands(helpText);
  const flags = parseFlags(helpText);

  // Build flag properties for inputSchema
  const flagProperties = {};
  for (const f of flags) {
    const key = (f.long || f.short || '').replace(/^-+/, '').replace(/-/g, '_');
    if (!key) continue;
    flagProperties[key] = {
      type: f.arg ? 'string' : 'boolean',
      description: f.description || `Flag ${f.flag}`,
    };
  }

  // Fallback: if no subcommands at root depth, create a single capability for the binary
  if (subcommands.length === 0 && depth === 0) {
    const name = binary.split('/').pop() || binary;
    const description = helpText.slice(0, 1000);
    return [
      {
        name,
        description,
        inputSchema: {
          type: 'object',
          properties: {
            useJson: { type: 'boolean', description: 'Append --json flag' },
            ...flagProperties,
          },
        },
        outputSchema: null,
        method: null,
        path: name,
        extensions: { subcommandPath: [] },
      },
    ];
  }

  const capabilities = [];

  for (const sub of subcommands) {
    const subPath = prefix.concat(sub.name);
    const capName = subPath.join('_');

    // Build subcommand capability
    const cap = {
      name: capName,
      description: sub.description,
      inputSchema: {
        type: 'object',
        properties: {
          useJson: { type: 'boolean', description: 'Append --json flag' },
          ...flagProperties,
        },
      },
      outputSchema: null,
      method: null,
      path: subPath.join(' '),
      extensions: { subcommandPath: subPath },
    };

    capabilities.push(cap);

    // Recurse to discover sub-subcommands
    const childCaps = discoverCapabilities(binary, subPath, depth + 1);
    // Only add child caps if they have their own subcommands (avoid duplicates)
    if (childCaps.length > 0) {
      capabilities.push(...childCaps);
    }
  }

  return capabilities;
}

module.exports = { parseSubcommands, parseFlags, spawnHelpText, discoverCapabilities };
