'use strict';

/**
 * generate.cjs — Text-to-3D two-step pipeline.
 *
 * Step 1: text → image via HF Inference API (FLUX.1-schnell)
 * Step 2: image → 3D via convert3D (Gradio Space fallback chain)
 *
 * Provides:
 *   - generate3D()  — accept a text prompt, return an optimized GLB file
 *
 * Requirements: HF_TOKEN environment variable (https://huggingface.co/settings/tokens)
 */

const { convert3D } = require('./convert.cjs');

/**
 * Generate a 3D model from a text description.
 *
 * Uses a two-step pipeline:
 *   1. FLUX.1-schnell (HF Inference API) for text → image
 *   2. convert3D (HF Gradio Space) for image → GLB
 *
 * @param {object} opts
 * @param {string}  opts.prompt          - Text description of the desired 3D model
 * @param {string}  [opts.slug='model']  - Identifier slug for output file naming
 * @param {string}  [opts.assetsDir]     - Override output directory (used in tests)
 * @param {object}  [opts._convertFn]    - Override convert3D for testing (default: require('./convert.cjs').convert3D)
 * @param {object}  [opts._hfClient]     - Override InferenceClient instance for testing
 * @returns {Promise<{ glbPath: string, metaPath: string, meta: object }>}
 * @throws {Error} If HF_TOKEN is not set or pipeline fails
 */
async function generate3D({ prompt, slug = 'model', assetsDir, _convertFn, _hfClient }) {
  // 1. Validate HF_TOKEN before any API call
  if (!process.env.HF_TOKEN) {
    throw new Error(
      'Set HF_TOKEN environment variable: https://huggingface.co/settings/tokens'
    );
  }

  // 2. Step 1: text → image via HF Inference API
  let client;
  if (_hfClient) {
    client = _hfClient;
  } else {
    const { InferenceClient } = require('@huggingface/inference');
    client = new InferenceClient(process.env.HF_TOKEN);
  }

  const blob = await client.textToImage({
    model: 'black-forest-labs/FLUX.1-schnell',
    inputs: prompt,
    parameters: { num_inference_steps: 4 },
  });

  // Convert Blob to Buffer
  const arrayBuf = await blob.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuf);

  // 3. Step 2: image → 3D via convert3D (or injected _convertFn for tests)
  const convertFn = _convertFn || convert3D;
  const result = await convertFn({ imageBuffer, slug, assetsDir });

  // 4. Override meta to reflect text input and include prompt
  result.meta = {
    ...result.meta,
    input_type: 'text',
    prompt,
  };

  return result;
}

module.exports = { generate3D };
