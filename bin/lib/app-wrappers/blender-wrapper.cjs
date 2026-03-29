'use strict';

/**
 * blender-wrapper.cjs — Blender CapabilityModel builder (WRAP-01)
 *
 * Builds a validated CapabilityModel from an approved Blender registry entry.
 *
 * Execution pattern: headless (--background + --factory-startup)
 * asyncRequired: true — Blender startup takes 3-8 seconds
 * startupMs: 5000 — declared in wrapper-metadata.json
 *
 * Version-aware: handles 3.x and 4.x version strings.
 * CRITICAL: --python-exit-code 1 is added by the tool handler dynamically.
 *
 * @see .planning/phases/172-core-app-wrappers/172-RESEARCH.md Pattern 4
 */

const { validateCapabilityModel } = require('../cli-anything/model.cjs');

/**
 * Parse the major version number from a Blender version string.
 *
 * Handles formats:
 *   "Blender 4.0.0"
 *   "Blender 2.93 (sub 5)"
 *   "Blender 3.6.0 (hash abc123)"
 *
 * @param {string|null|undefined} versionString
 * @returns {number|null} Major version number, or null if input is null/undefined/unparseable
 */
function parseMajorVersion(versionString) {
  if (versionString == null) return null;
  const match = String(versionString).match(/Blender\s+(\d+)\./);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Build a validated CapabilityModel for Blender.
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
      name: 'blender_render',
      description:
        'Render a frame from a .blend file. Invoked with --background --factory-startup. ' +
        'Handler adds --python-exit-code 1 dynamically. ' +
        'Argument order is critical: .blend file BEFORE --python.',
      inputSchema: {
        type: 'object',
        properties: {
          blendFile: { type: 'string', description: 'Absolute path to the .blend file' },
          outputPath: { type: 'string', description: 'Output path prefix for rendered frames' },
          format: { type: 'string', description: 'Output format (PNG, JPEG, EXR, etc.)', default: 'PNG' },
          frame: { type: 'string', description: 'Frame number to render', default: '1' },
        },
        required: ['blendFile', 'outputPath'],
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          outputPath: { type: 'string' },
          stdout: { type: 'string' },
          stderr: { type: 'string' },
        },
      },
      method: null,
      path: 'blender --background',
      extensions: {
        subcommandPath: ['--background', '--factory-startup'],
        asyncRequired: true,
        startupMs: 5000,
      },
    },
    {
      name: 'blender_python_exec',
      description:
        'Execute a Python script in Blender context. Invoked with --background --factory-startup. ' +
        'Handler adds --python-exit-code 1 dynamically. ' +
        'Provide either pythonScript (file path) or pythonExpr (inline expression).',
      inputSchema: {
        type: 'object',
        properties: {
          blendFile: { type: 'string', description: 'Absolute path to the .blend file (or empty string for new scene)' },
          pythonScript: { type: 'string', description: 'Path to a Python script file to execute' },
          pythonExpr: { type: 'string', description: 'Inline Python expression to evaluate' },
        },
        required: ['blendFile'],
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          stdout: { type: 'string' },
          stderr: { type: 'string' },
          exitCode: { type: 'number' },
        },
      },
      method: null,
      path: 'blender --background --python',
      extensions: {
        subcommandPath: ['--background', '--factory-startup'],
        asyncRequired: true,
        startupMs: 5000,
      },
    },
    {
      name: 'blender_export',
      description:
        'Export a Blender scene to FBX, OBJ, GLB, or other formats using a Python export script. ' +
        'Invoked with --background --factory-startup. ' +
        'Use pythonExpr for a custom bpy.ops export call, or leave empty for a default GLB export.',
      inputSchema: {
        type: 'object',
        properties: {
          blendFile: { type: 'string', description: 'Absolute path to the .blend file' },
          outputPath: { type: 'string', description: 'Absolute path for exported file' },
          format: {
            type: 'string',
            description: 'Export format: FBX, OBJ, GLB, GLTF, STL, etc.',
          },
          pythonExpr: {
            type: 'string',
            description: 'Optional: custom bpy.ops export Python expression',
          },
        },
        required: ['blendFile', 'outputPath', 'format'],
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          outputPath: { type: 'string' },
          stdout: { type: 'string' },
          stderr: { type: 'string' },
        },
      },
      method: null,
      path: 'blender --background',
      extensions: {
        subcommandPath: ['--background', '--factory-startup'],
        asyncRequired: true,
        startupMs: 5000,
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
    slug: 'blender',
    startupMs: 5000,
    executionMode: (registryEntry && registryEntry.executionMode) || 'headless',
    asyncRequired: true,
    versionRequires: '3.x|4.x',
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { buildCapabilityModel, getMetadata, parseMajorVersion };
