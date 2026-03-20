import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

describe('project-context.md (FOUND-01)', () => {
  const contextPath = path.join(root, '.planning/project-context.md');

  it('file exists', () => {
    assert.ok(fs.existsSync(contextPath), 'project-context.md must exist');
  });

  it('file is under 4KB', () => {
    const size = fs.statSync(contextPath).size;
    assert.ok(size <= 4096, `File size ${size} exceeds 4KB cap`);
  });

  it('contains tech stack section', () => {
    const content = fs.readFileSync(contextPath, 'utf-8');
    assert.ok(/## Tech Stack/i.test(content), 'must have ## Tech Stack section');
  });

  it('contains requirements section', () => {
    const content = fs.readFileSync(contextPath, 'utf-8');
    assert.ok(/## (Active )?Requirements?/i.test(content), 'must have requirements section');
  });

  it('contains milestone section', () => {
    const content = fs.readFileSync(contextPath, 'utf-8');
    assert.ok(/## (Current )?Milestone/i.test(content), 'must have milestone section');
  });
});
