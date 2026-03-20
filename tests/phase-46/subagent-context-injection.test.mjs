import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

describe('project-context.md injection (FOUND-02)', () => {
  it('execute-phase.md files_to_read contains project-context.md', () => {
    const content = fs.readFileSync(path.join(root, 'workflows/execute-phase.md'), 'utf-8');
    assert.ok(content.includes('project-context.md'), 'execute-phase.md must reference project-context.md');
  });

  it('plan-phase.md researcher spawn files_to_read contains project-context.md', () => {
    const content = fs.readFileSync(path.join(root, 'workflows/plan-phase.md'), 'utf-8');
    assert.ok(content.includes('project-context.md'), 'plan-phase.md must reference project-context.md');
  });

  it('plan-phase.md planner spawn files_to_read contains project-context.md', () => {
    const content = fs.readFileSync(path.join(root, 'workflows/plan-phase.md'), 'utf-8');
    const count = (content.match(/project-context\.md/g) || []).length;
    assert.ok(count >= 2, `Expected >= 2 references to project-context.md, found ${count}`);
  });
});
