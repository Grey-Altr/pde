/**
 * Gap 5: GH-03 (brief --from-github)
 * Verifies brief-from-github workflow structure:
 * - bridge.call('github:get-issue') canonical lookup
 * - URL parsing for https://github.com/<owner>/<repo>/issues/<number>
 * - bare number parsing
 * - owner/repo#number format parsing
 * - [from GitHub #<number>] pre-population markers
 * - parseInt / integer coercion for issue_number
 * - degraded-mode fallback to standard brief workflow
 * - node --input-type=module with createRequire pattern
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(__dirname, '../../workflows/brief-from-github.md');
const content = fs.readFileSync(workflowPath, 'utf-8');

describe('brief-from-github.md workflow structure (Gap 5 — GH-03)', () => {
  it('brief-from-github.md uses bridge.call with github:get-issue canonical name', () => {
    assert.match(content, /bridge\.call\(['"]github:get-issue['"]/,
      'Expected bridge.call(\'github:get-issue\') in brief-from-github.md');
  });

  it('brief-from-github.md parses full GitHub issue URL format', () => {
    assert.match(content, /github\.com.*owner.*repo.*issues|https:\/\/github\.com/i,
      'Expected full GitHub URL parsing (https://github.com/<owner>/<repo>/issues/<number>)');
  });

  it('brief-from-github.md handles bare issue number format', () => {
    assert.match(content, /bare number|purely numeric|only digits|\bbare\b/i,
      'Expected bare issue number handling in brief-from-github.md');
  });

  it('brief-from-github.md handles owner/repo#number short reference format', () => {
    assert.match(content, /owner\/repo#|short reference|#\d/i,
      'Expected owner/repo#number format parsing in brief-from-github.md');
  });

  it('brief-from-github.md includes [from GitHub #<number>] pre-population markers', () => {
    assert.match(content, /\[from GitHub #/,
      'Expected [from GitHub #<number>] markers in brief-from-github.md');
  });

  it('brief-from-github.md coerces issue_number to integer via parseInt', () => {
    assert.match(content, /parseInt/,
      'Expected parseInt for issue_number integer coercion in brief-from-github.md');
  });

  it('brief-from-github.md has degraded-mode fallback to standard brief workflow', () => {
    assert.match(content, /brief\.md|standard brief|without.*GitHub context/i,
      'Expected degraded-mode fallback to standard brief workflow in brief-from-github.md');
  });

  it('brief-from-github.md uses node --input-type=module with createRequire pattern', () => {
    assert.match(content, /node --input-type=module/,
      'Expected node --input-type=module in brief-from-github.md bash blocks');
    assert.match(content, /createRequire/,
      'Expected createRequire in brief-from-github.md bash blocks');
  });

  it('commands/brief.md has --from-github in argument-hint', () => {
    const cmdPath = path.resolve(__dirname, '../../commands/brief.md');
    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    assert.match(cmdContent, /from-github/,
      'Expected --from-github in commands/brief.md argument-hint');
  });

  it('commands/brief.md has mcp__github__* in allowed-tools', () => {
    const cmdPath = path.resolve(__dirname, '../../commands/brief.md');
    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    assert.match(cmdContent, /mcp__github__\*/,
      'Expected mcp__github__* in commands/brief.md allowed-tools');
  });

  it('commands/brief.md routes --from-github to brief-from-github.md workflow', () => {
    const cmdPath = path.resolve(__dirname, '../../commands/brief.md');
    const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
    assert.match(cmdContent, /brief-from-github\.md/,
      'Expected commands/brief.md to route --from-github to brief-from-github.md');
  });

  it('brief-from-github.md purpose mentions GitHub issue pre-population', () => {
    assert.match(content, /pre.popul|GitHub issue/i,
      'Expected GitHub issue pre-population in brief-from-github.md purpose');
  });
});
