'use strict';

/**
 * test-context-sync.cjs — Structural tests for context-sync module
 *
 * Covers requirements: CTX-01, CTX-02, CTX-03, CTX-04, CTX-08
 * Tests run in isolated temp directories — no side effects on real project.
 *
 * Run: node --test tests/phase-118/test-context-sync.cjs
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  buildContextIR,
  emitAll,
  emitAgentsMd,
  emitCursorRules,
  emitCursorrules,
  emitGeminiMd,
  computeSourceHash,
} = require('../../bin/lib/context-sync.cjs');

// ─── Test fixture helpers ──────────────────────────────────────────────────

function createMockPlanning(tmpDir) {
  const planningDir = path.join(tmpDir, '.planning');
  const designDir = path.join(planningDir, 'design');
  const handoffDir = path.join(designDir, 'handoff');

  fs.mkdirSync(handoffDir, { recursive: true });

  fs.writeFileSync(
    path.join(planningDir, 'PROJECT.md'),
    [
      '# Test Project',
      '',
      'A test project for context sync verification.',
      '',
      '## Tech Stack',
      'Node.js, TypeScript',
      '',
      '## Constraints',
      'Zero npm deps at plugin root.',
    ].join('\n'),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(planningDir, 'STATE.md'),
    [
      '---',
      'milestone: v0.15',
      '---',
      '# Project State',
      'Phase: 118',
    ].join('\n'),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(designDir, 'DESIGN-STATE.md'),
    [
      '# Design State',
      'Stage: handoff',
      'Completion: 80%',
      'Status: active',
    ].join('\n'),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(designDir, 'design-manifest.json'),
    JSON.stringify({
      projectName: 'Test',
      productType: 'software',
      artifacts: [],
      designCoverage: {},
    }),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(handoffDir, 'HND-button.md'),
    [
      '# Button Component',
      '',
      'A reusable button component with primary and secondary variants.',
    ].join('\n'),
    'utf-8'
  );

  return planningDir;
}

// ─── Test suite ────────────────────────────────────────────────────────────

let tmpDir;
let planningDir;
let result;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  planningDir = createMockPlanning(tmpDir);
  result = emitAll(tmpDir);
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── CTX-01: AGENTS.md generation ──────────────────────────────────────────

describe('CTX-01: AGENTS.md generation', () => {
  it('produces AGENTS.md at project root', () => {
    const agentsPath = path.join(tmpDir, 'AGENTS.md');
    assert.ok(fs.existsSync(agentsPath), 'AGENTS.md must exist');
  });

  it('AGENTS.md contains PDE-GENERATED marker', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    assert.ok(content.includes('<!-- PDE-GENERATED'), 'Must have PDE-GENERATED marker');
  });

  it('AGENTS.md contains project heading', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    assert.ok(content.includes('# Test Project'), 'Must contain project name heading');
  });

  it('AGENTS.md contains Design System section', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    assert.ok(content.includes('## Design System'), 'Must have Design System section');
  });

  it('AGENTS.md contains Component Catalog section', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    assert.ok(content.includes('## Component Catalog'), 'Must have Component Catalog section');
  });

  it('skips AGENTS.md when user-authored file exists without PDE-GENERATED marker', () => {
    // Create a second temp dir for this isolated test
    const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-skip-'));
    const planDir2 = createMockPlanning(tmpDir2);

    // Write a user-authored AGENTS.md (no PDE-GENERATED marker)
    fs.writeFileSync(path.join(tmpDir2, 'AGENTS.md'), '# My Custom Rules\n\nDo not touch.\n', 'utf-8');

    const ir = buildContextIR(planDir2);
    const emitResult = emitAgentsMd(ir, tmpDir2);

    assert.equal(emitResult.skipped, true, 'Should skip user-authored AGENTS.md');
    assert.ok(emitResult.reason.includes('User-authored'), 'Reason must mention user-authored');

    // Verify original content preserved
    const content = fs.readFileSync(path.join(tmpDir2, 'AGENTS.md'), 'utf-8');
    assert.ok(content.includes('My Custom Rules'), 'Original content must be preserved');

    fs.rmSync(tmpDir2, { recursive: true, force: true });
  });

  it('overwrites AGENTS.md when it has PDE-GENERATED marker', () => {
    const tmpDir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-overwrite-'));
    const planDir3 = createMockPlanning(tmpDir3);

    // Write an old PDE-generated AGENTS.md
    fs.writeFileSync(
      path.join(tmpDir3, 'AGENTS.md'),
      '<!-- PDE-GENERATED | hash:oldhash | generated:2026-01-01T00:00:00Z -->\n# Old Content\n',
      'utf-8'
    );

    const ir = buildContextIR(planDir3);
    const emitResult = emitAgentsMd(ir, tmpDir3);

    assert.equal(emitResult.written, true, 'Should overwrite PDE-generated AGENTS.md');

    const content = fs.readFileSync(path.join(tmpDir3, 'AGENTS.md'), 'utf-8');
    assert.ok(!content.includes('Old Content'), 'Old content must be replaced');
    assert.ok(content.includes('Test Project'), 'New content must be present');

    fs.rmSync(tmpDir3, { recursive: true, force: true });
  });
});

// ─── CTX-02: Cursor .mdc generation ────────────────────────────────────────

describe('CTX-02: Cursor .mdc generation', () => {
  it('produces exactly 5 .mdc files in .cursor/rules/', () => {
    const rulesDir = path.join(tmpDir, '.cursor', 'rules');
    assert.ok(fs.existsSync(rulesDir), '.cursor/rules/ must exist');
    const mdcFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.mdc'));
    assert.equal(mdcFiles.length, 5, `Expected 5 .mdc files, got ${mdcFiles.length}`);
  });

  it('pde-project.mdc has alwaysApply: true', () => {
    const content = fs.readFileSync(
      path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc'),
      'utf-8'
    );
    assert.ok(content.includes('alwaysApply: true'), 'pde-project.mdc must have alwaysApply: true');
  });

  it('pde-design-tokens.mdc has globs field with css/scss/tsx/jsx', () => {
    const content = fs.readFileSync(
      path.join(tmpDir, '.cursor', 'rules', 'pde-design-tokens.mdc'),
      'utf-8'
    );
    assert.ok(content.includes('globs:'), 'Must have globs field');
    assert.ok(content.includes('.css'), 'globs must include .css');
    assert.ok(content.includes('.tsx'), 'globs must include .tsx');
  });

  it('pde-components.mdc has globs field with src/components/**', () => {
    const content = fs.readFileSync(
      path.join(tmpDir, '.cursor', 'rules', 'pde-components.mdc'),
      'utf-8'
    );
    assert.ok(content.includes('globs:'), 'Must have globs field');
    assert.ok(content.includes('src/components/**'), 'globs must include src/components/**');
  });

  it('every .mdc file has valid YAML frontmatter (starts with ---, ends with ---)', () => {
    const rulesDir = path.join(tmpDir, '.cursor', 'rules');
    const mdcFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.mdc'));
    for (const f of mdcFiles) {
      const content = fs.readFileSync(path.join(rulesDir, f), 'utf-8');
      const lines = content.split('\n');
      assert.equal(lines[0], '---', `${f} must start with ---`);
      // Find closing ---
      const closingIdx = lines.indexOf('---', 1);
      assert.ok(closingIdx > 0, `${f} must have closing --- for frontmatter`);
    }
  });

  it('every .mdc file has description field', () => {
    const rulesDir = path.join(tmpDir, '.cursor', 'rules');
    const mdcFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.mdc'));
    for (const f of mdcFiles) {
      const content = fs.readFileSync(path.join(rulesDir, f), 'utf-8');
      assert.ok(content.includes('description:'), `${f} must have description field`);
    }
  });

  it('all expected .mdc filenames are present', () => {
    const rulesDir = path.join(tmpDir, '.cursor', 'rules');
    const mdcFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.mdc')).sort();
    const expected = [
      'pde-architecture.mdc',
      'pde-components.mdc',
      'pde-design-tokens.mdc',
      'pde-pipeline.mdc',
      'pde-project.mdc',
    ];
    assert.deepEqual(mdcFiles, expected, 'Must have exactly the 5 expected .mdc files');
  });
});

// ─── CTX-03: Legacy .cursorrules generation ────────────────────────────────

describe('CTX-03: Legacy .cursorrules generation', () => {
  it('produces .cursorrules at project root', () => {
    const filePath = path.join(tmpDir, '.cursorrules');
    assert.ok(fs.existsSync(filePath), '.cursorrules must exist at project root');
  });

  it('.cursorrules contains PDE-GENERATED marker', () => {
    const content = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');
    assert.ok(content.includes('<!-- PDE-GENERATED'), 'Must have PDE-GENERATED marker');
  });

  it('.cursorrules contains project context', () => {
    const content = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');
    assert.ok(content.includes('Test Project'), 'Must contain project name');
    assert.ok(content.includes('## Project Context'), 'Must have Project Context section');
  });
});

// ─── CTX-04: Hierarchical GEMINI.md generation ─────────────────────────────

describe('CTX-04: Hierarchical GEMINI.md generation', () => {
  it('produces GEMINI.md at project root', () => {
    assert.ok(
      fs.existsSync(path.join(tmpDir, 'GEMINI.md')),
      'GEMINI.md must exist at project root'
    );
  });

  it('produces GEMINI.md at .planning/ directory', () => {
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'GEMINI.md')),
      '.planning/GEMINI.md must exist'
    );
  });

  it('produces GEMINI.md at .planning/design/ directory', () => {
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'design', 'GEMINI.md')),
      '.planning/design/GEMINI.md must exist'
    );
  });

  it('root GEMINI.md contains @file.md import lines', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf-8');
    const importLines = content.split('\n').filter(l => l.startsWith('@'));
    assert.ok(importLines.length > 0, 'Root GEMINI.md must have @file.md import lines');
  });

  it('@file imports reference only .md files (not .json)', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf-8');
    const importLines = content.split('\n').filter(l => l.startsWith('@'));
    for (const line of importLines) {
      assert.ok(line.endsWith('.md'), `Import must reference .md file, got: ${line}`);
      assert.ok(!line.includes('.json'), `Import must not reference .json: ${line}`);
    }
  });
});

// ─── CTX-08: SHA-256 hash freshness ────────────────────────────────────────

describe('CTX-08: SHA-256 hash freshness', () => {
  it('every generated file contains PDE-GENERATED comment with hash', () => {
    const filesToCheck = [
      path.join(tmpDir, 'AGENTS.md'),
      path.join(tmpDir, '.cursorrules'),
      path.join(tmpDir, 'GEMINI.md'),
      path.join(tmpDir, '.planning', 'GEMINI.md'),
      path.join(tmpDir, '.planning', 'design', 'GEMINI.md'),
    ];
    for (const f of filesToCheck) {
      const content = fs.readFileSync(f, 'utf-8');
      assert.ok(
        content.includes('<!-- PDE-GENERATED | hash:'),
        `${path.relative(tmpDir, f)} must contain PDE-GENERATED hash comment`
      );
    }
  });

  it('hash is a 64-character hex string', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    const match = content.match(/hash:([a-f0-9]+)/);
    assert.ok(match, 'Must contain hash value');
    assert.equal(match[1].length, 64, `Hash must be 64 chars, got ${match[1].length}`);
  });

  it('hash changes when PROJECT.md content changes', () => {
    const tmpDir4 = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-hash-'));
    const planDir4 = createMockPlanning(tmpDir4);

    // Get initial hash
    const hash1 = computeSourceHash(planDir4);

    // Modify PROJECT.md
    fs.writeFileSync(
      path.join(planDir4, 'PROJECT.md'),
      '# Changed Project\n\nDifferent content now.\n\n## Tech Stack\nPython, Django\n',
      'utf-8'
    );

    // Get new hash
    const hash2 = computeSourceHash(planDir4);

    assert.notEqual(hash1, hash2, 'Hash must change when source content changes');
    assert.equal(hash1.length, 64, 'Original hash must be 64 chars');
    assert.equal(hash2.length, 64, 'New hash must be 64 chars');

    fs.rmSync(tmpDir4, { recursive: true, force: true });
  });

  it('hash is identical across all files in same generation run', () => {
    // Extract hash from each generated file
    const files = [
      path.join(tmpDir, 'AGENTS.md'),
      path.join(tmpDir, '.cursorrules'),
      path.join(tmpDir, 'GEMINI.md'),
      path.join(tmpDir, '.planning', 'GEMINI.md'),
      path.join(tmpDir, '.planning', 'design', 'GEMINI.md'),
    ];
    const hashes = files.map(f => {
      const content = fs.readFileSync(f, 'utf-8');
      const match = content.match(/hash:([a-f0-9]{64})/);
      assert.ok(match, `${path.relative(tmpDir, f)} must have hash`);
      return match[1];
    });
    const uniqueHashes = [...new Set(hashes)];
    assert.equal(uniqueHashes.length, 1, `All files must have same hash, got ${uniqueHashes.length} unique`);
  });

  it('generated timestamp is valid ISO 8601', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    const match = content.match(/generated:([^\s>]+)/);
    assert.ok(match, 'Must contain generated timestamp');
    const parsed = new Date(match[1]);
    assert.ok(!isNaN(parsed.getTime()), `Timestamp must be valid ISO 8601: ${match[1]}`);
  });
});

// ─── emitAll return value validation ───────────────────────────────────────

describe('emitAll return value', () => {
  it('returns sourceHash as 64-char hex string', () => {
    assert.match(result.sourceHash, /^[a-f0-9]{64}$/, 'sourceHash must be 64-char hex');
  });

  it('returns generatedAt as valid ISO 8601', () => {
    const parsed = new Date(result.generatedAt);
    assert.ok(!isNaN(parsed.getTime()), 'generatedAt must be valid ISO 8601');
  });

  it('returns agentsMd with written: true', () => {
    assert.equal(result.agentsMd.written, true);
  });

  it('returns cursorRules with 5 files', () => {
    assert.equal(result.cursorRules.files.length, 5);
  });
});
