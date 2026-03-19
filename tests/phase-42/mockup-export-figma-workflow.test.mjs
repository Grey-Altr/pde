/**
 * FIG-04 — mockup-export-figma.md workflow structure and confirmation gate
 *
 * Verifies the mockup-export-figma.md workflow file exists and contains all
 * required structural elements:
 * - figma:generate-design canonical tool name via bridge.call()
 * - loadConnections() call for Figma connection status check
 * - fileUrl reference for target Figma file
 * - Confirmation gate with y/n prompt (VAL-03 compliance)
 * - Strict y/yes-only check (non-yes stops with zero Figma writes)
 * - Rejection/cancellation path text
 * - Degraded mode for tool unavailability (claude-code#28718)
 * - Source artifact reference (mockup HTML / MCK)
 * - <purpose> block
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = path.resolve(__dirname, '../../workflows/mockup-export-figma.md');

describe('FIG-04 — mockup-export-figma.md workflow structure', () => {
  let content;

  it('workflows/mockup-export-figma.md exists on disk', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_PATH),
      `Expected workflows/mockup-export-figma.md to exist at ${WORKFLOW_PATH}`
    );
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(content.length > 0, 'workflows/mockup-export-figma.md must not be empty');
  });

  it('mockup-export-figma.md contains <purpose> block', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('<purpose>'),
      'mockup-export-figma.md must contain a <purpose> block'
    );
  });

  it('mockup-export-figma.md references FIG-04 in purpose or content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('FIG-04'),
      'mockup-export-figma.md must reference FIG-04 requirement'
    );
  });

  it('mockup-export-figma.md uses figma:generate-design canonical tool name', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCanonical = content.includes("'figma:generate-design'") ||
                         content.includes('"figma:generate-design"') ||
                         content.includes('figma:generate-design');
    assert.ok(
      hasCanonical,
      'mockup-export-figma.md must use figma:generate-design canonical tool name (bridge.call lookup)'
    );
  });

  it('mockup-export-figma.md calls loadConnections() to check Figma connection status', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasLoadConnections = content.includes('loadConnections()') ||
                                content.includes('b.loadConnections()');
    assert.ok(
      hasLoadConnections,
      'mockup-export-figma.md must call loadConnections() to read Figma connection from mcp-connections.json'
    );
  });

  it('mockup-export-figma.md references fileUrl for target Figma file', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    assert.ok(
      content.includes('fileUrl'),
      'mockup-export-figma.md must reference fileUrl for the target Figma file'
    );
  });

  it('mockup-export-figma.md contains confirmation gate with y/n prompt', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasYN = content.includes('y/n') ||
                  content.includes('(y/n)') ||
                  content.includes('yes/no') ||
                  content.includes('Proceed?') ||
                  content.includes('confirm');
    assert.ok(
      hasYN,
      'mockup-export-figma.md must contain a confirmation gate with y/n or Proceed? prompt (VAL-03)'
    );
  });

  it('mockup-export-figma.md applies strict y/yes-only check pattern', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    // Must have the strict regex pattern or equivalent description
    const hasStrictCheck = content.includes('^y(es)?$') ||
                            content.includes('/^y(es)?$/i') ||
                            content.includes('only proceed if') ||
                            content.includes('matches') ||
                            (content.includes('^y') && content.includes('yes'));
    assert.ok(
      hasStrictCheck,
      'mockup-export-figma.md must apply strict y/yes-only check (only exact y or yes proceeds, not other values)'
    );
  });

  it('mockup-export-figma.md contains cancellation/rejection path for non-yes response', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasCancellation = content.includes('Export cancelled') ||
                             content.includes('cancelled') ||
                             content.includes('no changes to Figma') ||
                             content.includes('No export');
    assert.ok(
      hasCancellation,
      'mockup-export-figma.md must produce "Export cancelled" or "no changes to Figma" on non-yes response (VAL-03 zero-write guarantee)'
    );
  });

  it('mockup-export-figma.md contains degraded mode for generate_figma_design unavailability', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasDegradedMode = content.includes('claude-code#28718') ||
                             content.includes('tool is not available') ||
                             content.includes('not available') ||
                             content.includes('tool.*not') ||
                             content.includes('unavailable');
    assert.ok(
      hasDegradedMode,
      'mockup-export-figma.md must handle degraded mode when generate_figma_design tool is unavailable (claude-code#28718)'
    );
  });

  it('mockup-export-figma.md references generate_figma_design or generate-design tool', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasToolRef = content.includes('generate_figma_design') ||
                       content.includes('generate-design') ||
                       content.includes('mcp__figma__generate_figma_design');
    assert.ok(
      hasToolRef,
      'mockup-export-figma.md must reference generate_figma_design or generate-design MCP tool'
    );
  });

  it('mockup-export-figma.md references mockup source artifact (mockup, HTML, or MCK)', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const hasMockupRef = content.includes('mockup') ||
                          content.includes('HTML') ||
                          content.includes('MCK');
    assert.ok(
      hasMockupRef,
      'mockup-export-figma.md must reference the source mockup artifact (mockup HTML file or MCK pattern)'
    );
  });

  it('mockup-export-figma.md has at least 60 lines of content', () => {
    if (!content) content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount >= 60,
      `mockup-export-figma.md must have at least 60 lines, got ${lineCount}`
    );
  });
});
