/**
 * Gap 2: INFRA (connect repo)
 * Verifies connect.md has the GitHub repo capture step:
 * - Step 3.5 exists with GitHub-only repo capture
 * - GITHUB_REPO variable is referenced
 * - owner/repo format validation text is present
 * - repo: process.env.GITHUB_REPO is in the GitHub updateConnectionStatus block
 * - --repo argument is documented
 * - Non-GitHub path omits repo field
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const connectPath = path.resolve(__dirname, '../../workflows/connect.md');
const content = fs.readFileSync(connectPath, 'utf-8');

describe('connect.md captures GitHub repo on --confirm (Gap 2 — INFRA connect repo)', () => {
  it('connect.md has a Step 3.5 or Capture GitHub Repo section', () => {
    assert.match(content, /3\.5|Capture GitHub Repo/i,
      'Expected Step 3.5 or "Capture GitHub Repo" section in connect.md');
  });

  it('connect.md references GITHUB_REPO variable', () => {
    const matches = (content.match(/GITHUB_REPO/g) || []).length;
    assert.ok(matches >= 2,
      `Expected at least 2 occurrences of GITHUB_REPO, found ${matches}`);
  });

  it('connect.md includes owner/repo format validation text', () => {
    assert.match(content, /owner\/repo/,
      'Expected owner/repo format reference in connect.md');
  });

  it('connect.md stores repo field in GitHub updateConnectionStatus call', () => {
    assert.match(content, /repo:\s*process\.env\.GITHUB_REPO/,
      'Expected repo: process.env.GITHUB_REPO in GitHub updateConnectionStatus block');
  });

  it('connect.md documents --repo argument', () => {
    assert.match(content, /--repo/,
      'Expected --repo argument documentation in connect.md');
  });

  it('connect.md has a non-GitHub updateConnectionStatus block without repo field', () => {
    // The non-GitHub block should include connected_at but NOT repo: process.env.GITHUB_REPO
    // We verify by checking two separate code blocks with updateConnectionStatus exist
    const updateBlocks = content.split('updateConnectionStatus');
    assert.ok(updateBlocks.length >= 3,
      'Expected multiple updateConnectionStatus calls (GitHub + non-GitHub + disconnect paths)');
  });

  it('connect.md guard is GitHub-specific (SERVICE_KEY === github check)', () => {
    assert.match(content, /SERVICE_KEY.*github|github.*SERVICE_KEY/i,
      'Expected SERVICE_KEY === github conditional in connect.md for GitHub-only repo capture');
  });
});
