'use strict';

/**
 * optimize.cjs — GLB optimization and inspection using gltf-transform CLI.
 *
 * Provides:
 *   - optimizeGLB()  — apply draco compression + texture resize
 *   - inspectGLB()   — return vertex count and file size for a GLB file
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Resolve the gltf-transform binary path.
 * Tries the local node_modules/.bin first, then falls back to npx.
 *
 * @returns {string} Binary path or 'npx' runner prefix
 */
function resolveGltfTransformBin() {
  const localBin = path.join(process.cwd(), 'node_modules/.bin/gltf-transform');
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  // Fallback: use npx
  return null;
}

/**
 * Build the args for gltf-transform invocation.
 * Returns { cmd, baseArgs } where cmd is the executable and baseArgs are prefixed args.
 */
function buildCmd(subArgs) {
  const localBin = path.join(process.cwd(), 'node_modules/.bin/gltf-transform');
  if (fs.existsSync(localBin)) {
    return { cmd: localBin, args: subArgs };
  }
  return { cmd: 'npx', args: ['--yes', '@gltf-transform/cli', ...subArgs] };
}

/**
 * Optimize a GLB file using draco compression and texture resize.
 *
 * @param {object} opts
 * @param {string} opts.inputPath       - Absolute path to source GLB
 * @param {string} opts.outputPath      - Absolute path for optimized GLB output
 * @param {number} [opts.textureMaxSize=1024] - Max texture dimension in pixels
 * @returns {{ outputPath: string, sizeMB: string }}
 */
function optimizeGLB({ inputPath, outputPath, textureMaxSize = 1024 }) {
  // Step 1: Draco compression
  const dracoCmd = buildCmd(['draco', inputPath, outputPath, '--method', 'edgebreaker']);
  const dracoResult = spawnSync(dracoCmd.cmd, dracoCmd.args, {
    encoding: 'utf8',
    cwd: process.cwd(),
  });

  if (dracoResult.status !== 0) {
    const stderr = (dracoResult.stderr || '').trim();
    throw new Error(`gltf-transform draco failed: ${stderr || dracoResult.error || 'unknown error'}`);
  }

  // Step 2: Texture resize
  const resizeCmd = buildCmd([
    'resize', outputPath, outputPath,
    '--width', String(textureMaxSize),
    '--height', String(textureMaxSize),
  ]);
  const resizeResult = spawnSync(resizeCmd.cmd, resizeCmd.args, {
    encoding: 'utf8',
    cwd: process.cwd(),
  });

  if (resizeResult.status !== 0) {
    const stderr = (resizeResult.stderr || '').trim();
    throw new Error(`gltf-transform resize failed: ${stderr || resizeResult.error || 'unknown error'}`);
  }

  const sizeMB = (fs.statSync(outputPath).size / 1e6).toFixed(2);
  return { outputPath, sizeMB };
}

/**
 * Inspect a GLB file for vertex count and file size.
 *
 * @param {object} opts
 * @param {string} opts.glbPath - Absolute path to the GLB file
 * @returns {{ vertex_count: number, file_size: number }}
 */
function inspectGLB({ glbPath }) {
  const inspectCmd = buildCmd(['inspect', glbPath, '--format', 'json']);
  const result = spawnSync(inspectCmd.cmd, inspectCmd.args, {
    encoding: 'utf8',
    cwd: process.cwd(),
  });

  const fileSize = fs.existsSync(glbPath) ? fs.statSync(glbPath).size : 0;

  if (result.status !== 0 || !result.stdout) {
    return { vertex_count: 0, file_size: fileSize };
  }

  try {
    const data = JSON.parse(result.stdout);
    // gltf-transform inspect JSON has data about meshes
    let vertexCount = 0;
    if (data.meshes && Array.isArray(data.meshes.properties)) {
      for (const mesh of data.meshes.properties) {
        if (typeof mesh.vertices === 'number') {
          vertexCount += mesh.vertices;
        }
      }
    }
    return { vertex_count: vertexCount, file_size: fileSize };
  } catch {
    return { vertex_count: 0, file_size: fileSize };
  }
}

module.exports = { optimizeGLB, inspectGLB };
