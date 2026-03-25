import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Replicate sumTranscriptTokens logic for direct unit testing
function sumTranscriptTokens(transcriptPath: string) {
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf-8').trim().split('\n');
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'assistant' && obj.message && obj.message.usage) {
          inputTokens  += Number(obj.message.usage.input_tokens  ?? 0);
          outputTokens += Number(obj.message.usage.output_tokens ?? 0);
        }
      } catch { /* skip malformed line */ }
    }
  } catch { /* transcript unreadable */ }
  return { inputTokens, outputTokens };
}

describe('token event emission — transcript parsing', () => {
  it('sums input_tokens and output_tokens from assistant turns', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    const transcriptPath = path.join(tmpDir, 'transcript.jsonl');
    const lines = [
      JSON.stringify({ type: 'human', message: { content: 'hello' } }),
      JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 100, output_tokens: 50 } } }),
      JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 200, output_tokens: 75 } } }),
      JSON.stringify({ type: 'tool_result', tool_use_id: 'abc' }),
    ];
    fs.writeFileSync(transcriptPath, lines.join('\n'));

    const result = sumTranscriptTokens(transcriptPath);
    expect(result).toEqual({ inputTokens: 300, outputTokens: 125 });

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns zeros when transcript file does not exist', () => {
    const result = sumTranscriptTokens('/nonexistent/path/transcript.jsonl');
    expect(result).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it('skips malformed JSONL lines gracefully', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    const transcriptPath = path.join(tmpDir, 'transcript.jsonl');
    const lines = [
      'not-json',
      JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 50, output_tokens: 25 } } }),
      '{broken json',
    ];
    fs.writeFileSync(transcriptPath, lines.join('\n'));

    const result = sumTranscriptTokens(transcriptPath);
    expect(result).toEqual({ inputTokens: 50, outputTokens: 25 });

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('handles cache_creation and cache_read tokens without double-counting', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    const transcriptPath = path.join(tmpDir, 'transcript.jsonl');
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: {
          usage: {
            input_tokens: 3,
            cache_creation_input_tokens: 1382,
            cache_read_input_tokens: 10797,
            output_tokens: 271,
          },
        },
      }),
    ];
    fs.writeFileSync(transcriptPath, lines.join('\n'));

    const result = sumTranscriptTokens(transcriptPath);
    // Only input_tokens and output_tokens are summed, not cache fields
    expect(result).toEqual({ inputTokens: 3, outputTokens: 271 });

    fs.rmSync(tmpDir, { recursive: true });
  });
});
