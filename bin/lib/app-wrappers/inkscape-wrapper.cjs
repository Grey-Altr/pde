'use strict';

/**
 * inkscape-wrapper.cjs — Inkscape CapabilityModel builder (WRAP-03)
 *
 * Builds a validated CapabilityModel from an approved Inkscape registry entry.
 *
 * Execution pattern: pure CLI (no headless flags needed since Inkscape 1.0)
 * asyncRequired: true — Inkscape can be slow on large SVGs
 * startupMs: 1000
 *
 * CRITICAL: --without-gui and --batch-process are DEPRECATED since Inkscape 1.0
 * Do NOT include them. GUI is suppressed automatically when export flags are present.
 *
 * CRITICAL: --export-overwrite MUST be passed by the tool handler dynamically
 * to prevent Inkscape creating numbered copies (e.g., out_001.png).
 * This is documented in the capability description.
 *
 * @see .planning/phases/172-core-app-wrappers/172-RESEARCH.md Pattern 6
 * @see https://wiki.inkscape.org/wiki/Using_the_Command_Line
 */

const { validateCapabilityModel } = require('../cli-anything/model.cjs');

/**
 * Parse the major version number from an Inkscape version string.
 *
 * Handles formats:
 *   "Inkscape 1.3.2 (091e20e, 2023-11-25)"
 *   "Inkscape 1.2.1 (9c6d41e, 2022-07-14)"
 *   "Inkscape 0.92.5 (2060ec1f0d, 2020-04-08)"
 *
 * @param {string|null|undefined} versionString
 * @returns {number|null} Major version number, or null if input is null/undefined/unparseable
 */
function parseMajorVersion(versionString) {
  if (versionString == null) return null;
  const match = String(versionString).match(/Inkscape\s+(\d+)\./);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Build a validated CapabilityModel for Inkscape.
 *
 * @param {object} registryEntry - Approved registry entry from checkApproved()
 * @param {string} registryEntry.binaryPath
 * @param {string} registryEntry.version
 * @param {string} [registryEntry.executionMode]
 * @returns {object} Validated CapabilityModel
 */
function buildCapabilityModel(registryEntry) {
  const source = registryEntry.binaryPath;
  const version = registryEntry.version || 'unknown';

  const capabilities = [
    {
      name: 'inkscape_export',
      description:
        'Convert an SVG file to PNG, PDF, EPS, PS, EMF, WMF, or another SVG. ' +
        'Always passes --export-overwrite to prevent Inkscape creating numbered copies. ' +
        'No headless flags needed — GUI is suppressed automatically when export flags are present (Inkscape 1.0+). ' +
        'Use --export-type to specify output format (not --export-png, which is deprecated).',
      inputSchema: {
        type: 'object',
        properties: {
          inputSvg: { type: 'string', description: 'Absolute path to the input SVG file' },
          outputFile: { type: 'string', description: 'Absolute path for the exported output file' },
          exportType: {
            type: 'string',
            description: 'Output format: svg, png, pdf, ps, eps, emf, wmf',
            default: 'png',
          },
          dpi: {
            type: 'string',
            description: 'Resolution in DPI for raster export (e.g., "96", "300")',
            default: '96',
          },
          width: {
            type: 'string',
            description: 'Optional: override export width in pixels',
          },
          height: {
            type: 'string',
            description: 'Optional: override export height in pixels',
          },
        },
        required: ['inputSvg', 'outputFile'],
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          outputFile: { type: 'string' },
          stdout: { type: 'string' },
          stderr: { type: 'string' },
          exitCode: { type: 'number' },
        },
      },
      method: null,
      path: 'inkscape',
      extensions: {
        // All args are dynamic — handler builds: inkscape <inputSvg> --export-type=<type>
        // --export-filename=<outputFile> --export-dpi=<dpi> [--export-width=<w>]
        // [--export-height=<h>] --export-overwrite
        subcommandPath: [],
        asyncRequired: true,
        alwaysPassFlags: ['--export-overwrite'],
      },
    },
  ];

  const model = {
    meta: {
      source,
      type: 'cli',
      version,
      auth: {},
      generatedAt: new Date().toISOString(),
    },
    capabilities,
  };

  return validateCapabilityModel(model);
}

/**
 * Get wrapper metadata for wrapper-metadata.json.
 *
 * @param {object} registryEntry - Approved registry entry
 * @returns {object} Wrapper metadata
 */
function getMetadata(registryEntry) {
  return {
    slug: 'inkscape',
    startupMs: 1000,
    executionMode: (registryEntry && registryEntry.executionMode) || 'headless',
    asyncRequired: true, // Inkscape can be slow on large SVGs
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { buildCapabilityModel, getMetadata, parseMajorVersion };
