/**
 * tests/phase-172/skill-gen-integration.test.mjs
 * Wave 0 test scaffold for SKILL.md path fix in app-wrappers generate.cjs (WRAP-04)
 *
 * Tests will be implemented in Phase 172 Plan 01 Task 2.
 * These scaffolds establish the path replacement contract.
 */

import { describe, it } from 'vitest';

describe('writeAppWrapperSkillMd', () => {
  it.todo('generateAppWrapper writes SKILL.md with .planning/app-wrappers/{slug}/server/server.cjs path');
  it.todo('SKILL.md does NOT contain .planning/cli-anything/{slug}/server/server.cjs path');
  it.todo('path replacement is applied exactly once per SKILL.md');
  it.todo('SKILL.md is written under {outputDir}/server/SKILL.md');
  it.todo('SKILL.md content retains all other skill-gen.cjs output sections');
});
