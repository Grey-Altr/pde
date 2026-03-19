import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const DOC_PATH = join(REPO_ROOT, 'references', 'workflow-methodology.md');

test('workflow-methodology.md exists at references/workflow-methodology.md', () => {
  assert.ok(existsSync(DOC_PATH), `File not found: ${DOC_PATH}`);
});

test('workflow-methodology.md contains all required section headers', () => {
  const content = readFileSync(DOC_PATH, 'utf8');
  const requiredHeaders = [
    '## Overview',
    '## Context Constitution',
    '## Task-File Sharding',
    '## Acceptance-Criteria-First Planning',
    '## Post-Execution Reconciliation',
    '## Safe Framework Updates',
    '## Readiness Gating',
    '## Terminology Mapping',
  ];
  for (const header of requiredHeaders) {
    assert.ok(content.includes(header), `Missing required section header: "${header}"`);
  }
});

test('BMAD and PAUL terms do not appear before the Terminology Mapping section', () => {
  const content = readFileSync(DOC_PATH, 'utf8');
  const mappingIndex = content.indexOf('## Terminology Mapping');
  assert.ok(mappingIndex !== -1, '## Terminology Mapping section not found');

  const preMapping = content.slice(0, mappingIndex);
  const bmadMatches = [...preMapping.matchAll(/\bBMAD\b/g)];
  const paulMatches = [...preMapping.matchAll(/\bPAUL\b/g)];

  assert.equal(
    bmadMatches.length,
    0,
    `Found ${bmadMatches.length} occurrence(s) of "BMAD" before the Terminology Mapping section`
  );
  assert.equal(
    paulMatches.length,
    0,
    `Found ${paulMatches.length} occurrence(s) of "PAUL" before the Terminology Mapping section`
  );
});

test('Terminology Mapping table has at least 6 data rows', () => {
  const content = readFileSync(DOC_PATH, 'utf8');
  const mappingIndex = content.indexOf('## Terminology Mapping');
  assert.ok(mappingIndex !== -1, '## Terminology Mapping section not found');

  const postMapping = content.slice(mappingIndex);
  // Count pipe-delimited rows that are not header or separator rows
  const lines = postMapping.split('\n');
  let dataRowCount = 0;
  let headerSeen = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    if (trimmed.includes('---')) continue; // separator row
    if (!headerSeen) {
      // First pipe row is the header
      headerSeen = true;
      continue;
    }
    dataRowCount++;
  }

  assert.ok(
    dataRowCount >= 6,
    `Expected at least 6 data rows in Terminology Mapping table, found ${dataRowCount}`
  );
});

test('workflow-methodology.md is at least 100 lines long', () => {
  const content = readFileSync(DOC_PATH, 'utf8');
  const lineCount = content.split('\n').length;
  assert.ok(lineCount >= 100, `File has ${lineCount} lines, expected at least 100`);
});
