'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  mergeSession,
  recalculateFromArtifacts,
} = require('../../packages/dispatcher/index.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a fresh isolated git repo with one commit.
 */
function makeTempRepo() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-merge-test-'));
  execFileSync('git', ['init', '-b', 'main', tmpDir], { stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'test@pde.test'], { cwd: tmpDir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', 'PDE Test'], { cwd: tmpDir, stdio: 'pipe' });
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: tmpDir, stdio: 'pipe' });
  // Initial commit so we have a HEAD
  fs.writeFileSync(path.join(tmpDir, 'README.md'), 'init\n');
  execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
  execFileSync('git', ['commit', '--no-verify', '-m', 'init'], { cwd: tmpDir, stdio: 'pipe' });
  return tmpDir;
}

/**
 * Creates a session branch from current HEAD and returns the branch name.
 * Commits a file on that branch.
 */
function makeSessionBranch(repo, sessionId, filename, content) {
  const branch = 'pde/session/' + sessionId;
  execFileSync('git', ['checkout', '-b', branch], { cwd: repo, stdio: 'pipe' });
  fs.writeFileSync(path.join(repo, filename), content);
  execFileSync('git', ['add', '.'], { cwd: repo, stdio: 'pipe' });
  execFileSync('git', ['commit', '--no-verify', '-m', 'session work'], { cwd: repo, stdio: 'pipe' });
  // Return to main
  execFileSync('git', ['checkout', 'main'], { cwd: repo, stdio: 'pipe' });
  return branch;
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

// ─── mergeSession ─────────────────────────────────────────────────────────────

describe('mergeSession', () => {
  it('returns { ok: true, conflicts: [] } on clean merge', () => {
    const repo = makeTempRepo();
    try {
      const sessionId = 'p143-merge001';
      makeSessionBranch(repo, sessionId, 'feature.txt', 'new feature\n');

      const result = mergeSession(repo, sessionId);
      expect(result).toMatchObject({ ok: true, conflicts: [] });

      // File should be in main now
      expect(fs.existsSync(path.join(repo, 'feature.txt'))).toBe(true);
    } finally {
      cleanup(repo);
    }
  });

  it('auto-resolves .planning/ conflicts with --ours and returns { ok: true }', () => {
    const repo = makeTempRepo();
    try {
      // Create .planning/STATE.md on main
      fs.mkdirSync(path.join(repo, '.planning'), { recursive: true });
      const statePath = path.join(repo, '.planning', 'STATE.md');
      fs.writeFileSync(statePath, 'status: main-version\n');
      execFileSync('git', ['add', '.'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'add STATE.md'], { cwd: repo, stdio: 'pipe' });

      // Create session branch with conflicting STATE.md
      const sessionId = 'p143-merge002';
      const branch = 'pde/session/' + sessionId;
      execFileSync('git', ['checkout', '-b', branch], { cwd: repo, stdio: 'pipe' });
      fs.writeFileSync(statePath, 'status: session-version\n');
      execFileSync('git', ['add', '.'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'session state'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['checkout', 'main'], { cwd: repo, stdio: 'pipe' });

      // Make a conflicting change on main too
      fs.writeFileSync(statePath, 'status: main-updated\n');
      execFileSync('git', ['add', '.'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'main state update'], { cwd: repo, stdio: 'pipe' });

      const result = mergeSession(repo, sessionId);
      expect(result.ok).toBe(true);
      expect(result.autoResolved).toContain('.planning/STATE.md');

      // Main version should be kept (ours strategy)
      const content = fs.readFileSync(statePath, 'utf8');
      expect(content).toContain('main-updated');
    } finally {
      cleanup(repo);
    }
  });

  it('aborts and returns { ok: false, needsHuman: true } on source code conflicts', () => {
    const repo = makeTempRepo();
    try {
      // Create a source file on main
      fs.writeFileSync(path.join(repo, 'src.js'), 'const x = 1;\n');
      execFileSync('git', ['add', '.'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'add src'], { cwd: repo, stdio: 'pipe' });

      // Session branch modifies same file
      const sessionId = 'p143-merge003';
      const branch = 'pde/session/' + sessionId;
      execFileSync('git', ['checkout', '-b', branch], { cwd: repo, stdio: 'pipe' });
      fs.writeFileSync(path.join(repo, 'src.js'), 'const x = 999; // session\n');
      execFileSync('git', ['add', '.'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'session src'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['checkout', 'main'], { cwd: repo, stdio: 'pipe' });

      // Main modifies same file differently
      fs.writeFileSync(path.join(repo, 'src.js'), 'const x = 42; // main\n');
      execFileSync('git', ['add', '.'], { cwd: repo, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'main src update'], { cwd: repo, stdio: 'pipe' });

      const result = mergeSession(repo, sessionId);
      expect(result.ok).toBe(false);
      expect(result.needsHuman).toBe(true);
      expect(result.conflicts).toContain('src.js');

      // Merge must be cleanly aborted — no MERGE_HEAD
      const gitDir = path.join(repo, '.git');
      expect(fs.existsSync(path.join(gitDir, 'MERGE_HEAD'))).toBe(false);
    } finally {
      cleanup(repo);
    }
  });
});

// ─── recalculateFromArtifacts ─────────────────────────────────────────────────

describe('recalculateFromArtifacts', () => {
  it('returns { phasesCompleted: 0, requirementsCompleted: [], updated: true } with no artifacts', () => {
    const repo = makeTempRepo();
    try {
      // Create minimal STATE.md
      const planningDir = path.join(repo, '.planning');
      fs.mkdirSync(planningDir, { recursive: true });
      fs.writeFileSync(path.join(planningDir, 'STATE.md'), [
        '---',
        'progress:',
        '  total_phases: 7',
        '  completed_phases: 0',
        '---',
        '',
        '# State',
        'Progress: [░░░░░░░░░░] 0%',
      ].join('\n'));
      fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# Roadmap\n');
      fs.writeFileSync(path.join(planningDir, 'REQUIREMENTS.md'), '# Requirements\n');
      fs.mkdirSync(path.join(planningDir, 'phases'), { recursive: true });

      const result = recalculateFromArtifacts(repo);
      expect(result).toMatchObject({
        phasesCompleted: 0,
        requirementsCompleted: [],
        updated: true,
      });
    } finally {
      cleanup(repo);
    }
  });

  it('counts phases with COMPLETE.json where exit_code === 0', () => {
    const repo = makeTempRepo();
    try {
      const planningDir = path.join(repo, '.planning');
      fs.mkdirSync(planningDir, { recursive: true });
      fs.writeFileSync(path.join(planningDir, 'STATE.md'), [
        '---',
        'progress:',
        '  total_phases: 7',
        '  completed_phases: 0',
        '---',
        '',
        '# State',
        'Progress: [░░░░░░░░░░] 0%',
      ].join('\n'));
      fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), [
        '# Roadmap',
        '',
        '- [ ] **Phase 143: Session Isolation**',
        '- [ ] **Phase 144: Local CLI Dispatch**',
      ].join('\n'));
      fs.writeFileSync(path.join(planningDir, 'REQUIREMENTS.md'), '# Requirements\n');

      // Create COMPLETE.json for phase 143 (success)
      const phasesDir = path.join(planningDir, 'phases');
      const phase143Dir = path.join(phasesDir, '143-session-isolation');
      fs.mkdirSync(phase143Dir, { recursive: true });
      fs.writeFileSync(path.join(phase143Dir, 'COMPLETE.json'), JSON.stringify({
        session_id: 'p143-test',
        exit_code: 0,
        phase: 143,
        plan: 1,
        completed_at: '2026-03-26T20:00:00.000Z',
        duration_ms: 1000,
      }));

      // Create COMPLETE.json for phase 144 (failure — should not count)
      const phase144Dir = path.join(phasesDir, '144-local-dispatch');
      fs.mkdirSync(phase144Dir, { recursive: true });
      fs.writeFileSync(path.join(phase144Dir, 'COMPLETE.json'), JSON.stringify({
        session_id: 'p144-test',
        exit_code: 1,
        phase: 144,
      }));

      const result = recalculateFromArtifacts(repo);
      expect(result.phasesCompleted).toBe(1);
      expect(result.updated).toBe(true);
    } finally {
      cleanup(repo);
    }
  });

  it('updates STATE.md completed_phases count', () => {
    const repo = makeTempRepo();
    try {
      const planningDir = path.join(repo, '.planning');
      fs.mkdirSync(planningDir, { recursive: true });
      const statePath = path.join(planningDir, 'STATE.md');
      fs.writeFileSync(statePath, [
        '---',
        'progress:',
        '  total_phases: 7',
        '  completed_phases: 0',
        '---',
        '',
        '# State',
        'Progress: [░░░░░░░░░░] 0%',
      ].join('\n'));
      fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# Roadmap\n');
      fs.writeFileSync(path.join(planningDir, 'REQUIREMENTS.md'), '# Requirements\n');

      const phasesDir = path.join(planningDir, 'phases');
      const phase143Dir = path.join(phasesDir, '143-test');
      fs.mkdirSync(phase143Dir, { recursive: true });
      fs.writeFileSync(path.join(phase143Dir, 'COMPLETE.json'), JSON.stringify({
        exit_code: 0, phase: 143,
      }));

      recalculateFromArtifacts(repo);

      const updatedState = fs.readFileSync(statePath, 'utf8');
      expect(updatedState).toContain('completed_phases: 1');
    } finally {
      cleanup(repo);
    }
  });

  it('marks completed phase checkboxes in ROADMAP.md', () => {
    const repo = makeTempRepo();
    try {
      const planningDir = path.join(repo, '.planning');
      fs.mkdirSync(planningDir, { recursive: true });
      fs.writeFileSync(path.join(planningDir, 'STATE.md'), [
        '---',
        'progress:',
        '  total_phases: 7',
        '  completed_phases: 0',
        '---',
        '',
        '# State',
      ].join('\n'));
      const roadmapPath = path.join(planningDir, 'ROADMAP.md');
      fs.writeFileSync(roadmapPath, [
        '# Roadmap',
        '',
        '- [ ] **Phase 143: Session Isolation**',
        '- [ ] **Phase 144: Local CLI Dispatch**',
      ].join('\n'));
      fs.writeFileSync(path.join(planningDir, 'REQUIREMENTS.md'), '# Requirements\n');

      const phasesDir = path.join(planningDir, 'phases');
      const phase143Dir = path.join(phasesDir, '143-session-isolation');
      fs.mkdirSync(phase143Dir, { recursive: true });
      fs.writeFileSync(path.join(phase143Dir, 'COMPLETE.json'), JSON.stringify({
        exit_code: 0, phase: 143,
      }));

      recalculateFromArtifacts(repo);

      const roadmap = fs.readFileSync(roadmapPath, 'utf8');
      expect(roadmap).toContain('- [x] **Phase 143:');
      expect(roadmap).toContain('- [ ] **Phase 144:');
    } finally {
      cleanup(repo);
    }
  });

  it('marks requirements complete from COMPLETED-REQS.md files', () => {
    const repo = makeTempRepo();
    try {
      const planningDir = path.join(repo, '.planning');
      fs.mkdirSync(planningDir, { recursive: true });
      fs.writeFileSync(path.join(planningDir, 'STATE.md'), [
        '---',
        'progress:',
        '  total_phases: 7',
        '  completed_phases: 0',
        '---',
        '',
        '# State',
      ].join('\n'));
      fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# Roadmap\n');
      const reqsPath = path.join(planningDir, 'REQUIREMENTS.md');
      fs.writeFileSync(reqsPath, [
        '# Requirements',
        '',
        '- [ ] **ISO-01**: Create worktree',
        '- [ ] **ISO-02**: Merge worktree',
        '- [ ] **ISO-03**: Remove worktree',
      ].join('\n'));

      const phasesDir = path.join(planningDir, 'phases');
      const phase143Dir = path.join(phasesDir, '143-test');
      fs.mkdirSync(phase143Dir, { recursive: true });
      fs.writeFileSync(path.join(phase143Dir, 'COMPLETE.json'), JSON.stringify({
        exit_code: 0, phase: 143,
      }));
      fs.writeFileSync(path.join(phase143Dir, 'COMPLETED-REQS.md'), [
        '---',
        'session_id: p143-test',
        'phase: 143',
        'requirements:',
        '  - ISO-01',
        '  - ISO-03',
        '---',
        '',
        '# Completed Requirements',
      ].join('\n'));

      const result = recalculateFromArtifacts(repo);
      expect(result.requirementsCompleted).toContain('ISO-01');
      expect(result.requirementsCompleted).toContain('ISO-03');
      expect(result.requirementsCompleted).not.toContain('ISO-02');

      const reqs = fs.readFileSync(reqsPath, 'utf8');
      expect(reqs).toContain('- [x] **ISO-01**');
      expect(reqs).toContain('- [x] **ISO-03**');
      expect(reqs).toContain('- [ ] **ISO-02**');
    } finally {
      cleanup(repo);
    }
  });
});
