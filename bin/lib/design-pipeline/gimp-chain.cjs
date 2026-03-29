'use strict';

/**
 * gimp-chain.cjs — GIMP retouch pipeline chain.
 *
 * Connects: GIMP Script-Fu retouch -> saveAsset (type='mockup')
 *
 * Usage:
 *   const { runGIMPRetouchChain, buildRetouchScript } = require('./gimp-chain.cjs');
 *   const result = await runGIMPRetouchChain({ inputPngPath, slug, registryEntry });
 *   // result: { path, metaPath, meta }
 *
 * buildRetouchScript is version-aware:
 *   GIMP 2.x: uses file-png-save, bare drawable, 2-arg gimp-file-load
 *   GIMP 3.x: uses gimp-file-export, (vector drawable), 1-arg gimp-file-load
 *
 * Temp PNG is always cleaned up in finally block (success or failure).
 *
 * @see bin/lib/app-wrappers/gimp-wrapper.cjs buildGimpArgs, parseMajorVersion
 * @see bin/lib/image-pipeline/assets.cjs saveAsset
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Build a version-aware GIMP Script-Fu expression for image retouching.
 * Applies brightness (+5) and contrast (+15) adjustment.
 *
 * @param {object} opts
 * @param {string} opts.inputPath      - Absolute path to input PNG
 * @param {string} opts.outputPath     - Absolute path for output PNG
 * @param {object} opts.registryEntry  - Registry entry with version field
 * @returns {string} Script-Fu expression
 */
function buildRetouchScript({ inputPath, outputPath, registryEntry }) {
  const { parseMajorVersion } = require('../app-wrappers/gimp-wrapper.cjs');
  const major = parseMajorVersion(registryEntry.version) || 2;

  if (major >= 3) {
    // GIMP 3.x: 1-arg gimp-file-load, gimp-file-export with (vector drawable)
    return [
      '(let*',
      `  ((image (gimp-file-load RUN-NONINTERACTIVE "${inputPath}"))`,
      '   (drawable (car (gimp-image-get-active-drawable image))))',
      '  (gimp-brightness-contrast drawable 5 15)',
      `  (gimp-file-export RUN-NONINTERACTIVE image (vector drawable) "${outputPath}")`,
      ')',
    ].join(' ');
  } else {
    // GIMP 2.x: 2-arg gimp-file-load, file-png-save with bare drawable
    return [
      '(let*',
      `  ((image (gimp-file-load RUN-NONINTERACTIVE "${inputPath}" ""))`,
      '   (drawable (car (gimp-image-get-active-drawable image))))',
      '  (gimp-brightness-contrast drawable 5 15)',
      `  (file-png-save RUN-NONINTERACTIVE image drawable "${outputPath}" "")`,
      ')',
    ].join(' ');
  }
}

/**
 * Run the GIMP retouch -> saveAsset pipeline chain.
 *
 * @param {object} opts
 * @param {string} opts.inputPngPath   - Absolute path to the input PNG to retouch
 * @param {string} opts.slug           - Asset slug (used in output filename)
 * @param {object} opts.registryEntry  - Approved registry entry with binaryPath + version
 * @returns {Promise<{ path: string, metaPath: string, meta: object }>}
 */
async function runGIMPRetouchChain({ inputPngPath, slug, registryEntry }) {
  const { spawn } = require('child_process');
  const { buildGimpArgs } = require('../app-wrappers/gimp-wrapper.cjs');
  const { saveAsset } = require('../image-pipeline/assets.cjs');

  const tempOutput = path.join(os.tmpdir(), `${slug}-gimp-${Date.now()}.png`);

  const scriptFu = buildRetouchScript({
    inputPath: inputPngPath,
    outputPath: tempOutput,
    registryEntry,
  });

  const args = buildGimpArgs(scriptFu, registryEntry);

  try {
    // Spawn GIMP in headless batch mode
    await new Promise((resolve, reject) => {
      const proc = spawn(registryEntry.binaryPath, args, {
        timeout: 60000,
      });

      let stderr = '';
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`GIMP retouch failed (exit code ${code}): ${stderr.trim()}`));
        } else {
          resolve();
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`GIMP retouch failed: ${err.message}`));
      });
    });

    // Read the retouched PNG output
    const pngBuffer = fs.readFileSync(tempOutput);

    // Save via image-pipeline saveAsset
    const result = saveAsset({
      type: 'mockup',
      buffer: pngBuffer,
      slug: `${slug}-gimp-retouched`,
      params: {
        source: 'gimp-retouch',
        inputPng: inputPngPath,
      },
    });

    return result;
  } finally {
    // Always clean up temp PNG regardless of success or failure
    try {
      if (fs.existsSync(tempOutput)) {
        fs.unlinkSync(tempOutput);
      }
    } catch (_) {
      // Ignore cleanup errors
    }
  }
}

module.exports = { runGIMPRetouchChain, buildRetouchScript };
