/**
 * tests/phase-177/present-cmd.test.mjs
 * Integration tests for /pde:present command structure and workflow lint compliance.
 *
 * Tests:
 *   - commands/present.md exists with correct YAML frontmatter
 *   - commands/present.md delegates to @workflows/present.md
 *   - workflows/present.md has all 5 required XML sections
 *   - workflows/present.md has PRS skill code and tooling domain
 *   - workflows/present.md contains all 15 persona slugs
 *   - workflows/present.md handles @file: redirect
 *   - workflows/present.md uses pde-tools for IR acquisition
 *   - workflows/present.md has three dispatch branches (list/generate/error)
 *   - skill-registry.md has PRS row with tooling domain
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const cwd = process.cwd();
const commandFile = join(cwd, 'commands', 'present.md');
const workflowFile = join(cwd, 'workflows', 'present.md');
const registryFile = join(cwd, 'skill-registry.md');

function readFile(filePath) {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf-8');
}

// ─── commands/present.md ──────────────────────────────────────────────────────

describe('commands/present.md', () => {
  it('file exists', () => {
    expect(existsSync(commandFile)).toBe(true);
  });

  it('contains YAML frontmatter with name: pde:present', () => {
    const content = readFile(commandFile);
    expect(content).not.toBeNull();
    expect(content).toContain('name: pde:present');
  });

  it('delegates to @workflows/present.md', () => {
    const content = readFile(commandFile);
    expect(content).not.toBeNull();
    expect(content).toContain('@workflows/present.md');
  });
});

// ─── workflows/present.md — required XML sections ────────────────────────────

describe('workflows/present.md — required XML sections', () => {
  it('file exists', () => {
    expect(existsSync(workflowFile)).toBe(true);
  });

  it('contains <purpose> section', () => {
    const content = readFile(workflowFile);
    expect(content).not.toBeNull();
    expect(content).toContain('<purpose>');
  });

  it('contains <skill_code>PRS</skill_code>', () => {
    const content = readFile(workflowFile);
    expect(content).not.toBeNull();
    expect(content).toContain('<skill_code>PRS</skill_code>');
  });

  it('contains <skill_domain>tooling</skill_domain>', () => {
    const content = readFile(workflowFile);
    expect(content).not.toBeNull();
    expect(content).toContain('<skill_domain>tooling</skill_domain>');
  });

  it('contains <context_routing> section', () => {
    const content = readFile(workflowFile);
    expect(content).not.toBeNull();
    expect(content).toContain('<context_routing>');
  });

  it('contains <process> section', () => {
    const content = readFile(workflowFile);
    expect(content).not.toBeNull();
    expect(content).toContain('<process>');
  });
});

// ─── workflows/present.md — persona registry ─────────────────────────────────

describe('workflows/present.md — persona registry (15 slugs)', () => {
  const requiredSlugs = [
    'executive-summary',
    'investor-update',
    'sprint-review',
    'client-deliverable',
    'stakeholder-status',
    'product-manager',
    'project-manager',
    'case-study',
    'agile-report',
    'design-persona',
    'research-persona',
    'post-mortem',
    'adr-summary',
    'launch-announcement',
    'portfolio-overview',
  ];

  for (const slug of requiredSlugs) {
    it(`contains persona slug: ${slug}`, () => {
      const content = readFile(workflowFile);
      expect(content).not.toBeNull();
      expect(content).toContain(slug);
    });
  }
});

// ─── workflows/present.md — IR acquisition and dispatch ──────────────────────

describe('workflows/present.md — IR acquisition and dispatch', () => {
  it('contains @file: redirect handling pattern', () => {
    const content = readFile(workflowFile);
    expect(content).not.toBeNull();
    expect(content).toContain('@file:');
  });

  it('references pde-tools for IR acquisition', () => {
    const content = readFile(workflowFile);
    expect(content).not.toBeNull();
    // Must reference pde-tools (not read .planning/ files directly)
    expect(content).toMatch(/pde-tools/);
  });

  it('contains LIST MODE dispatch branch', () => {
    const content = readFile(workflowFile);
    expect(content).not.toBeNull();
    expect(content).toMatch(/LIST\s+MODE|LIST MODE/i);
  });

  it('contains GENERATE MODE dispatch branch', () => {
    const content = readFile(workflowFile);
    expect(content).not.toBeNull();
    expect(content).toMatch(/GENERATE\s+MODE|GENERATE MODE/i);
  });

  it('contains ERROR MODE dispatch branch', () => {
    const content = readFile(workflowFile);
    expect(content).not.toBeNull();
    expect(content).toMatch(/ERROR\s+MODE|ERROR MODE/i);
  });
});

// ─── skill-registry.md — PRS row ─────────────────────────────────────────────

describe('skill-registry.md', () => {
  it('contains PRS row', () => {
    const content = readFile(registryFile);
    expect(content).not.toBeNull();
    expect(content).toContain('| PRS |');
  });

  it('PRS row links to workflows/present.md', () => {
    const content = readFile(registryFile);
    expect(content).not.toBeNull();
    // Find the PRS row and check it contains workflows/present.md
    const lines = content.split('\n');
    const prsLine = lines.find((l) => l.includes('| PRS |'));
    expect(prsLine).toBeDefined();
    expect(prsLine).toContain('workflows/present.md');
  });

  it('PRS row has tooling domain', () => {
    const content = readFile(registryFile);
    expect(content).not.toBeNull();
    const lines = content.split('\n');
    const prsLine = lines.find((l) => l.includes('| PRS |'));
    expect(prsLine).toBeDefined();
    expect(prsLine).toContain('tooling');
  });
});
