'use strict';

let _sdkModule = null;

/**
 * Lazy-load the ESM SDK. Cached after first call.
 * CRITICAL: Must use dynamic import() — the SDK is ESM-only.
 * Node 20 does not support require() of ESM modules.
 *
 * @returns {Promise<object>} the SDK module
 */
async function _loadSdk() {
  if (!_sdkModule) {
    _sdkModule = await import('@anthropic-ai/claude-agent-sdk');
  }
  return _sdkModule;
}

/**
 * Run a single SDK query and return the final result string.
 * Iterates the async iterable from sdk.query(), extracts SDKResultMessage.result.
 *
 * @param {string} prompt
 * @param {object} [options] - SDK Options (allowedTools, permissionMode, cwd, maxTurns, etc.)
 * @returns {Promise<string>} final result text
 */
async function sdkQuery(prompt, options) {
  const sdk = await _loadSdk();
  let result = null;
  let errorMsg = null;

  for await (const message of sdk.query({ prompt, options: options || {} })) {
    if (message.type === 'result') {
      if (message.subtype === 'success') {
        result = message.result;
      } else {
        // error_max_turns, error_during_execution, etc.
        errorMsg = (message.errors || []).join('; ') || message.subtype;
      }
    }
  }

  if (errorMsg) throw new Error(`SDK query failed: ${errorMsg}`);
  return result || '';
}

module.exports = { sdkQuery };
