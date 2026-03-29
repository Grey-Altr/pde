'use strict';

/**
 * convert.cjs — Image-to-3D conversion via HF Gradio Spaces.
 *
 * Provides:
 *   - convert3D()   — accept an image buffer, return a GLB file via HF Space fallback chain
 *   - SPACE_CHAIN   — ordered list of HF Spaces to try (SF3D first, then InstantMesh)
 *
 * Requirements: HF_TOKEN environment variable (https://huggingface.co/settings/tokens)
 *
 * CRITICAL: @gradio/client is ESM-only. Must use dynamic import() inside async functions.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const { optimizeGLB, inspectGLB } = require('./optimize.cjs');
const { save3DAsset } = require('./assets.cjs');

/**
 * Ordered fallback chain of HF Spaces for image-to-3D conversion.
 * SF3D is tried first; InstantMesh is the secondary fallback.
 */
const SPACE_CHAIN = [
  'stabilityai/stable-fast-3d',
  'TencentARC/InstantMesh',
];

/**
 * Try multiple Gradio API route names for a given app.
 * Different spaces use different route names (/run, /predict, /generate).
 */
const ROUTE_NAMES = ['/run', '/predict', '/generate'];

/**
 * Convert an image buffer to a 3D GLB file via HF Gradio Spaces.
 *
 * @param {object} opts
 * @param {Buffer}  opts.imageBuffer        - Raw image data (any format sharp can read)
 * @param {string}  [opts.slug='model']     - Identifier slug for output file naming
 * @param {string}  [opts.assetsDir]        - Override output directory (used in tests)
 * @param {object}  [opts._gradioClient]    - Injectable Gradio Client for testing (default: @gradio/client)
 * @param {Function} [opts._sharpFn]        - Injectable sharp function for testing (default: require('sharp'))
 * @param {Function} [opts._optimizeFn]     - Injectable optimizeGLB for testing
 * @param {Function} [opts._inspectFn]      - Injectable inspectGLB for testing
 * @param {Function} [opts._saveFn]         - Injectable save3DAsset for testing
 * @returns {Promise<{ glbPath: string, metaPath: string, meta: object }>}
 * @throws {Error} If HF_TOKEN is not set or all spaces fail
 */
async function convert3D({
  imageBuffer,
  slug = 'model',
  assetsDir,
  _gradioClient,
  _sharpFn,
  _optimizeFn,
  _inspectFn,
  _saveFn,
}) {
  // 1. Validate HF_TOKEN before any API call
  if (!process.env.HF_TOKEN) {
    throw new Error(
      'Set HF_TOKEN environment variable: https://huggingface.co/settings/tokens'
    );
  }

  // 2. Preprocess image: resize to 512x512 PNG for consistent input
  const sharpFn = _sharpFn || require('sharp');
  const processedImageBuffer = await sharpFn(imageBuffer)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toBuffer();

  // 3. Compute input hash from original image
  const inputHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

  // 4. Iterate through space fallback chain
  const failedSpaces = [];
  let glbBuffer = null;
  let successfulSpace = null;

  for (const space of SPACE_CHAIN) {
    try {
      // Dynamic import required — @gradio/client is ESM-only
      // Unless _gradioClient is provided (for testing)
      let ClientClass;
      if (_gradioClient) {
        ClientClass = _gradioClient;
      } else {
        const gradioMod = await import('@gradio/client');
        ClientClass = gradioMod.Client;
      }

      const app = await ClientClass.connect(space, { hf_token: process.env.HF_TOKEN });

      // Create Blob from processed image buffer
      const imageBlob = new Blob([processedImageBuffer], { type: 'image/png' });

      // Try each route name until one works
      let result = null;
      let routeError = null;

      for (const route of ROUTE_NAMES) {
        try {
          result = await app.predict(route, [imageBlob]);
          break; // Success — stop trying routes
        } catch (err) {
          routeError = err;
          // Continue to next route
        }
      }

      if (!result) {
        throw routeError || new Error('All route names failed');
      }

      // 5. Extract GLB data from result.data
      // result.data[0] may be a file URL string or a Blob
      const glbData = Array.isArray(result.data) ? result.data[0] : result.data;

      if (typeof glbData === 'string' && (glbData.startsWith('http') || glbData.startsWith('/'))) {
        // File URL — fetch to get buffer
        const fetchFn = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;
        const res = await fetchFn(glbData, {
          headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` },
        });
        if (!res.ok) throw new Error(`Fetch GLB failed: ${res.status} ${res.statusText}`);
        const arrayBuf = await res.arrayBuffer();
        glbBuffer = Buffer.from(arrayBuf);
      } else if (glbData && typeof glbData === 'object' && typeof glbData.arrayBuffer === 'function') {
        // Blob-like object
        const arrayBuf = await glbData.arrayBuffer();
        glbBuffer = Buffer.from(arrayBuf);
      } else if (glbData && typeof glbData === 'object' && glbData.url) {
        // Gradio file object with .url property
        const fetchFn = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;
        const res = await fetchFn(glbData.url, {
          headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` },
        });
        if (!res.ok) throw new Error(`Fetch GLB failed: ${res.status} ${res.statusText}`);
        const arrayBuf = await res.arrayBuffer();
        glbBuffer = Buffer.from(arrayBuf);
      } else if (Buffer.isBuffer(glbData)) {
        glbBuffer = glbData;
      } else {
        throw new Error(`Unexpected GLB result format: ${typeof glbData}`);
      }

      successfulSpace = space;
      break; // Success — stop trying spaces

    } catch (err) {
      console.warn(`Space ${space} unavailable: ${err.message}, trying next...`);
      failedSpaces.push(space);
    }
  }

  // 6. Handle complete failure
  if (!glbBuffer || !successfulSpace) {
    throw new Error(
      `All image-to-3D spaces failed: ${failedSpaces.join(', ')}. ` +
      'For local Python fallback, install TripoSR: https://github.com/VAST-AI-Research/TripoSR'
    );
  }

  // 7. Write raw GLB to temp file for optimization
  const tmpDir = os.tmpdir();
  const tmpRaw = path.join(tmpDir, `pde-3d-raw-${Date.now()}.glb`);
  const tmpOptimized = path.join(tmpDir, `pde-3d-opt-${Date.now()}.glb`);

  fs.writeFileSync(tmpRaw, glbBuffer);

  // 8. Optimize GLB via gltf-transform (or injected _optimizeFn for tests)
  const optimizeFn = _optimizeFn || optimizeGLB;
  try {
    optimizeFn({ inputPath: tmpRaw, outputPath: tmpOptimized });
    glbBuffer = fs.readFileSync(tmpOptimized);
  } catch (err) {
    // Optimization failed — use raw GLB with a warning
    console.warn(`GLB optimization failed: ${err.message}. Using raw output.`);
    glbBuffer = fs.readFileSync(tmpRaw);
  } finally {
    // Clean up temp files
    if (fs.existsSync(tmpRaw)) fs.unlinkSync(tmpRaw);
    if (fs.existsSync(tmpOptimized)) fs.unlinkSync(tmpOptimized);
  }

  // 9. Inspect for vertex count (or injected _inspectFn for tests)
  const inspectFn = _inspectFn || inspectGLB;
  const tmpFinal = path.join(tmpDir, `pde-3d-final-${Date.now()}.glb`);
  fs.writeFileSync(tmpFinal, glbBuffer);
  let vertexCount = 0;
  try {
    const inspectResult = inspectFn({ glbPath: tmpFinal });
    vertexCount = inspectResult.vertex_count;
  } catch {
    // Non-fatal — vertex count remains 0
  } finally {
    if (fs.existsSync(tmpFinal)) fs.unlinkSync(tmpFinal);
  }

  // 10. Save to assets directory with metadata (or injected _saveFn for tests)
  const saveFn = _saveFn || save3DAsset;
  const meta = {
    source_model: successfulSpace,
    input_type: 'image',
    input_hash: inputHash,
    file_size: glbBuffer.length,
    vertex_count: vertexCount,
    slug,
  };

  const saved = saveFn({ slug, glbBuffer, meta, assetsDir });

  return { glbPath: saved.glbPath, metaPath: saved.metaPath, meta: saved.meta };
}

module.exports = { convert3D, SPACE_CHAIN };
