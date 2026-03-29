'use strict';

/**
 * blender-chain.cjs — Blender GLB pipeline chain.
 *
 * Connects: Blender export (via Python script) -> optimizeGLB -> generateEmbed
 *
 * Usage:
 *   const { runBlenderGLBChain } = require('./blender-chain.cjs');
 *   const result = await runBlenderGLBChain({ blendFile, slug, registryEntry, projectRoot });
 *   // result: { glbPath, embedPath, snippet }
 *
 * Temp GLB is always cleaned up in finally block (success or failure).
 *
 * @see bin/lib/3d-pipeline/optimize.cjs optimizeGLB
 * @see bin/lib/3d-pipeline/embed.cjs generateEmbed
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Run the Blender GLB export -> optimize -> embed pipeline chain.
 *
 * @param {object} opts
 * @param {string} opts.blendFile      - Absolute path to the .blend source file
 * @param {string} opts.slug           - Asset slug (used in filenames)
 * @param {object} opts.registryEntry  - Approved registry entry with binaryPath
 * @param {string} opts.projectRoot    - Project root directory (for locating export script)
 * @returns {Promise<{ glbPath: string, embedPath: string, snippet: string }>}
 */
async function runBlenderGLBChain({ blendFile, slug, registryEntry, projectRoot }) {
  const { spawn } = require('child_process');
  const { optimizeGLB } = require('../3d-pipeline/optimize.cjs');
  const { generateEmbed } = require('../3d-pipeline/embed.cjs');

  const exportScript = path.join(projectRoot, 'bin/lib/design-pipeline/blender-glb-export.py');
  const tempGlb = path.join(os.tmpdir(), `${slug}-raw-${Date.now()}.glb`);

  const assetsDir = path.join(projectRoot, '.planning/design/3d');
  fs.mkdirSync(assetsDir, { recursive: true });

  const optimizedPath = path.join(assetsDir, `${slug}-${Date.now()}.glb`);

  try {
    // Spawn Blender in headless mode with the GLB export Python script
    await new Promise((resolve, reject) => {
      const args = [
        '--background',
        '--factory-startup',
        blendFile,
        '--python-exit-code', '1',
        '--python', exportScript,
        '--', tempGlb,
      ];

      const proc = spawn(registryEntry.binaryPath, args, {
        timeout: 120000,
      });

      let stderr = '';
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Blender export failed (exit code ${code}): ${stderr.trim()}`));
        } else {
          resolve();
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Blender export failed: ${err.message}`));
      });
    });

    // Optimize the exported GLB
    optimizeGLB({ inputPath: tempGlb, outputPath: optimizedPath });

    // Generate the model-viewer embed
    const embedResult = generateEmbed({ glbPath: optimizedPath, slug });

    return {
      glbPath: optimizedPath,
      embedPath: embedResult.embedPath,
      snippet: embedResult.snippet,
    };
  } finally {
    // Always clean up temp GLB regardless of success or failure
    try {
      if (fs.existsSync(tempGlb)) {
        fs.unlinkSync(tempGlb);
      }
    } catch (_) {
      // Ignore cleanup errors
    }
  }
}

module.exports = { runBlenderGLBChain };
