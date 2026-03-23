/**
 * experiment-sonnet-agent.test.mjs — Structural tests for Sonnet agent and dispatch wiring
 *
 * Phase 103, Task 2.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// ─── Sonnet agent structural tests ────────────────────────────────────────────

describe('pde-experiment-runner-sonnet.md agent', () => {
  it('agent file exists', () => {
    const agentPath = path.join(projectRoot, 'agents', 'pde-experiment-runner-sonnet.md');
    assert.ok(fs.existsSync(agentPath), 'agents/pde-experiment-runner-sonnet.md should exist');
  });

  it('frontmatter contains model: sonnet', () => {
    const agentPath = path.join(projectRoot, 'agents', 'pde-experiment-runner-sonnet.md');
    const content = fs.readFileSync(agentPath, 'utf-8');
    assert.ok(content.includes('model: sonnet'), 'Should contain "model: sonnet" in frontmatter');
  });

  it('frontmatter contains name: pde-experiment-runner-sonnet', () => {
    const agentPath = path.join(projectRoot, 'agents', 'pde-experiment-runner-sonnet.md');
    const content = fs.readFileSync(agentPath, 'utf-8');
    assert.ok(content.includes('name: pde-experiment-runner-sonnet'), 'Should contain correct name');
  });

  it('contains same allowed-tools as pde-experiment-runner.md (Read, Edit, Bash)', () => {
    const agentPath = path.join(projectRoot, 'agents', 'pde-experiment-runner-sonnet.md');
    const content = fs.readFileSync(agentPath, 'utf-8');
    assert.ok(content.includes('- Read'), 'Should include Read in allowed-tools');
    assert.ok(content.includes('- Edit'), 'Should include Edit in allowed-tools');
    assert.ok(content.includes('- Bash'), 'Should include Bash in allowed-tools');
  });
});

// ─── pde-tools dispatch tests ─────────────────────────────────────────────────

describe('pde-tools experiment dispatch', () => {
  it('generate-report appears in available subcommands error message', () => {
    const result = spawnSync('node', ['bin/pde-tools.cjs', 'experiment', 'generate-report'], {
      cwd: projectRoot,
      encoding: 'utf-8',
    });
    // Error because no --slug provided, but error message should list generate-report
    const stderr = result.stderr || '';
    assert.ok(
      stderr.includes('generate-report'),
      'Error message should include "generate-report" in subcommand list'
    );
  });

  it('diff-summary appears in available subcommands error message', () => {
    const result = spawnSync('node', ['bin/pde-tools.cjs', 'experiment', 'diff-summary'], {
      cwd: projectRoot,
      encoding: 'utf-8',
    });
    const stderr = result.stderr || '';
    assert.ok(
      stderr.includes('diff-summary'),
      'Error message should include "diff-summary" in subcommand list'
    );
  });

  it('unknown subcommand error message lists generate-report and diff-summary', () => {
    const result = spawnSync('node', ['bin/pde-tools.cjs', 'experiment', 'unknown-cmd', '--slug', 'test'], {
      cwd: projectRoot,
      encoding: 'utf-8',
    });
    const stderr = result.stderr || '';
    assert.ok(stderr.includes('generate-report'), 'Unknown subcommand error should list generate-report');
    assert.ok(stderr.includes('diff-summary'), 'Unknown subcommand error should list diff-summary');
  });
});
