'use strict';

/**
 * gimp-wrapper.cjs — GIMP CapabilityModel builder with version-conditional Script-Fu
 *
 * Implements WRAP-02 (GIMP version-aware wrapper) and WRAP-06 (version-aware capability models).
 *
 * CRITICAL version differences:
 *   GIMP 2.x: --batch '(gimp-quit 0)' for exit, 2-arg gimp-file-load, file-png-save, bare drawable
 *   GIMP 3.x: --quit flag for exit, 1-arg gimp-file-load, gimp-file-export, (vector drawable)
 *   GIMP 3.x exit codes: 0=success, 64=usage, 69=service unavailable, 70=execution, 130=cancellation
 *   --quit flag was introduced in GIMP 2.99.12 (GIMP 3.x only)
 *
 * See 172-RESEARCH.md Pattern 5 for full verification.
 */

const path = require('path');

/**
 * Parse the major version number from a GIMP version string.
 * Handles formats:
 *   "GIMP 2.10.38"
 *   "GNU Image Manipulation Program version 3.0.2"
 *
 * @param {string|null|undefined} versionString
 * @returns {number|null} Major version number, or null if not parseable
 */
function parseMajorVersion(versionString) {
  if (!versionString) return null;
  // Match "GIMP X.Y.Z" or "... version X.Y.Z"
  const match = versionString.match(/(?:GIMP|version)\s+(\d+)\./i);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Build the version-appropriate Script-Fu template strings.
 *
 * @param {object} registryEntry - Registry entry with version field
 * @returns {object} Template strings for version-appropriate Script-Fu patterns
 */
function getScriptFuTemplates(registryEntry) {
  const major = parseMajorVersion(registryEntry.version) || 2;
  if (major >= 3) {
    return {
      fileLoad: '(gimp-file-load RUN-NONINTERACTIVE "{inputPath}")',
      fileExport: '(gimp-file-export RUN-NONINTERACTIVE image (vector drawable) "{outputPath}")',
      getDrawable: '(car (gimp-image-get-active-drawable image))',
      drawableWrap: '(vector drawable)',
      quit: '--quit flag (do NOT use gimp-quit)',
    };
  } else {
    return {
      fileLoad: '(gimp-file-load RUN-NONINTERACTIVE "{inputPath}" "")',
      fileExport: '(file-png-save RUN-NONINTERACTIVE image drawable "{outputPath}" "")',
      getDrawable: '(car (gimp-image-get-active-drawable image))',
      drawableWrap: 'drawable',
      quit: "--batch '(gimp-quit 0)' as second batch command",
    };
  }
}

/**
 * Build the GIMP CLI argument array for a Script-Fu batch expression.
 * Version-conditional: GIMP 3.x uses --quit, GIMP 2.x uses --batch '(gimp-quit 0)'.
 *
 * @param {string} scriptFuExpr - Script-Fu expression to execute
 * @param {object} registryEntry - Registry entry with version field
 * @returns {string[]} CLI argument array
 */
function buildGimpArgs(scriptFuExpr, registryEntry) {
  const major = parseMajorVersion(registryEntry.version) || 2;
  const baseArgs = ['--no-interface', '-d', '-f', '--batch', scriptFuExpr];
  if (major >= 3) {
    // GIMP 3.x: --quit was introduced in 2.99.12, exits after batch processing
    return [...baseArgs, '--quit'];
  } else {
    // GIMP 2.x: must supply a second --batch with (gimp-quit 0) to exit cleanly
    return [...baseArgs, '--batch', '(gimp-quit 0)'];
  }
}

/**
 * Build a validated CapabilityModel for GIMP.
 * Produces two capabilities: gimp_batch and gimp_file_convert.
 * The model reflects the installed GIMP version's API surface.
 *
 * @param {object} registryEntry - Approved registry entry for GIMP
 * @returns {object} Validated CapabilityModel
 */
function buildCapabilityModel(registryEntry) {
  const { validateCapabilityModel } = require('../cli-anything/model.cjs');
  const major = parseMajorVersion(registryEntry.version) || 2;
  const templates = getScriptFuTemplates(registryEntry);

  const versionNote = major >= 3
    ? `GIMP 3.x patterns: file-load is 1-arg, export uses gimp-file-export, drawables use (vector drawable), exit uses --quit flag.`
    : `GIMP 2.x patterns: file-load is 2-arg, export uses file-png-save, exit uses --batch '(gimp-quit 0)'.`;

  const capabilities = [
    {
      name: 'gimp_batch',
      description: `Execute a Script-Fu batch expression via GIMP headless mode. ${versionNote} Template: fileLoad=${templates.fileLoad} fileExport=${templates.fileExport} quit=${templates.quit}`,
      path: `${path.basename(registryEntry.binaryPath)} --no-interface`,
      inputSchema: {
        type: 'object',
        properties: {
          scriptFu: {
            type: 'string',
            description: 'Script-Fu expression to execute in GIMP batch mode',
          },
          quit: {
            type: 'string',
            description: 'Override quit behavior (advanced — normally handled automatically by version)',
          },
        },
        required: ['scriptFu'],
      },
      outputSchema: null,
      method: null,
      extensions: {
        subcommandPath: ['--no-interface', '-d', '-f'],
      },
    },
    {
      name: 'gimp_file_convert',
      description: `Convert an image file using Script-Fu template. ${versionNote} File-load template: ${templates.fileLoad}. File-export template: ${templates.fileExport}.`,
      path: `${path.basename(registryEntry.binaryPath)} --no-interface`,
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: {
            type: 'string',
            description: 'Absolute path to the input image file',
          },
          outputPath: {
            type: 'string',
            description: 'Absolute path for the output image file',
          },
          format: {
            type: 'string',
            description: 'Output format: "png", "jpg", "tiff" (optional)',
          },
        },
        required: ['inputPath', 'outputPath'],
      },
      outputSchema: null,
      method: null,
      extensions: {
        subcommandPath: ['--no-interface', '-d', '-f'],
      },
    },
  ];

  const model = {
    meta: {
      source: registryEntry.binaryPath,
      type: 'cli',
      version: registryEntry.version || 'unknown',
      auth: {},
      generatedAt: new Date().toISOString(),
    },
    capabilities,
  };

  return validateCapabilityModel(model);
}

/**
 * Get metadata for the GIMP wrapper.
 * startupMs is 10000 — GIMP startup takes 5-30 seconds.
 * asyncRequired is true — GIMP must not block the event loop during startup.
 *
 * @param {object} registryEntry - Approved registry entry for GIMP
 * @returns {object} Wrapper metadata
 */
function getMetadata(registryEntry) {
  return {
    slug: 'gimp',
    startupMs: 10000,
    executionMode: registryEntry.executionMode || 'headless',
    asyncRequired: true,
    gimpMajorVersion: parseMajorVersion(registryEntry.version) || 2,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildCapabilityModel,
  getMetadata,
  parseMajorVersion,
  buildGimpArgs,
  getScriptFuTemplates,
};
