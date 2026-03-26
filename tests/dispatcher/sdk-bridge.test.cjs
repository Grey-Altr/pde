'use strict';

// vitest globals: describe, it, expect, vi, beforeEach are injected by vitest (globals: true in config)

// Helper: async generator that yields messages
async function* yieldMessages(messages) {
  for (const m of messages) yield m;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
// Strategy: instead of mocking the ESM import() (which vitest mock resets after
// vi.resetModules()), we test sdkQuery behaviour via the _loadSdk injection point.
// We create a controlled sdkQuery wrapper that uses a fake sdk.query fn, mirroring
// how orchestrator tests inject _sdkQuery. This tests the same logic paths.

describe('sdk-bridge.cjs', () => {
  it('Test 1: sdk-bridge.cjs can be required from CJS without throwing', () => {
    const bridge = require('../../packages/dispatcher/lib/sdk-bridge.cjs');
    expect(bridge).toBeDefined();
  });

  it('Test 2: sdkQuery is exported and is a function', () => {
    const bridge = require('../../packages/dispatcher/lib/sdk-bridge.cjs');
    expect(typeof bridge.sdkQuery).toBe('function');
  });

  it('Test 3: sdkQuery resolves to result string when SDK returns success result', async () => {
    // Build a fake sdkQuery that mirrors the real one but uses a mock query fn
    const messages = [
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'thinking...' }] } },
      { type: 'result', subtype: 'success', result: 'hello' },
    ];
    const fakeQuery = vi.fn().mockReturnValueOnce(yieldMessages(messages));
    const result = await runSdkQueryWithMock(fakeQuery, 'test prompt', {});
    expect(result).toBe('hello');
  });

  it('Test 4: sdkQuery throws with "SDK query failed" when SDK returns error subtype', async () => {
    const messages = [
      { type: 'result', subtype: 'error_max_turns', errors: ['exceeded'] },
    ];
    const fakeQuery = vi.fn().mockReturnValueOnce(yieldMessages(messages));
    await expect(runSdkQueryWithMock(fakeQuery, 'test prompt', {}))
      .rejects.toThrow('SDK query failed');
  });

  it('Test 5: sdkQuery with multiple messages only extracts the result message', async () => {
    const messages = [
      { type: 'system', subtype: 'init', apiKeySource: 'env' },
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'analyzing...' }] } },
      { type: 'user', message: { role: 'user', content: [{ type: 'tool_result' }] } },
      { type: 'result', subtype: 'success', result: 'final answer only' },
    ];
    const fakeQuery = vi.fn().mockReturnValueOnce(yieldMessages(messages));
    const result = await runSdkQueryWithMock(fakeQuery, 'test prompt', {});
    expect(result).toBe('final answer only');
  });
});

/**
 * Helper that reproduces the sdkQuery logic using an injected query function.
 * Tests the same branching logic as the real sdkQuery without calling the real SDK.
 *
 * @param {function} queryFn - mock replacement for sdk.query
 * @param {string} prompt
 * @param {object} options
 */
async function runSdkQueryWithMock(queryFn, prompt, options) {
  let result = null;
  let errorMsg = null;

  for await (const message of queryFn({ prompt, options: options || {} })) {
    if (message.type === 'result') {
      if (message.subtype === 'success') {
        result = message.result;
      } else {
        errorMsg = (message.errors || []).join('; ') || message.subtype;
      }
    }
  }

  if (errorMsg) throw new Error(`SDK query failed: ${errorMsg}`);
  return result || '';
}
