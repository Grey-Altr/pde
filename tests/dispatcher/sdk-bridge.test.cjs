'use strict';

// vitest globals: describe, it, expect, vi, beforeEach are injected by vitest (globals: true in config)

// Helper: async generator that yields messages
async function* yieldMessages(messages) {
  for (const m of messages) yield m;
}

// Mock the ESM SDK module so dynamic import('@anthropic-ai/claude-agent-sdk')
// returns our mock instead of the real SDK
vi.mock('@anthropic-ai/claude-agent-sdk', () => {
  return {
    query: vi.fn(),
  };
});

describe('sdk-bridge.cjs', () => {
  let sdkBridge;
  let mockSdk;

  beforeEach(async () => {
    // Reset module registry to get fresh sdkBridge with cleared internal cache
    vi.resetModules();
    // Re-import mock SDK to get the mock reference
    mockSdk = await import('@anthropic-ai/claude-agent-sdk');
    // Re-require the bridge after resetting modules
    sdkBridge = require('../../packages/dispatcher/lib/sdk-bridge.cjs');
  });

  it('Test 1: sdk-bridge.cjs can be required from CJS without throwing', () => {
    // If we get here without throwing, the test passes
    expect(sdkBridge).toBeDefined();
  });

  it('Test 2: sdkQuery is exported and is a function', () => {
    expect(typeof sdkBridge.sdkQuery).toBe('function');
  });

  it('Test 3: sdkQuery resolves to result string when SDK returns success result', async () => {
    const messages = [
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'thinking...' }] } },
      { type: 'result', subtype: 'success', result: 'hello' },
    ];
    mockSdk.query.mockReturnValueOnce(yieldMessages(messages));

    const result = await sdkBridge.sdkQuery('test prompt', {});
    expect(result).toBe('hello');
  });

  it('Test 4: sdkQuery throws with "SDK query failed" when SDK returns error subtype', async () => {
    const messages = [
      { type: 'result', subtype: 'error_max_turns', errors: ['exceeded'] },
    ];
    mockSdk.query.mockReturnValueOnce(yieldMessages(messages));

    await expect(sdkBridge.sdkQuery('test prompt', {}))
      .rejects.toThrow('SDK query failed');
  });

  it('Test 5: sdkQuery with multiple messages only extracts the result message', async () => {
    const messages = [
      { type: 'system', subtype: 'init', apiKeySource: 'env' },
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'analyzing...' }] } },
      { type: 'user', message: { role: 'user', content: [{ type: 'tool_result' }] } },
      { type: 'result', subtype: 'success', result: 'final answer only' },
    ];
    mockSdk.query.mockReturnValueOnce(yieldMessages(messages));

    const result = await sdkBridge.sdkQuery('test prompt', {});
    expect(result).toBe('final answer only');
  });
});
