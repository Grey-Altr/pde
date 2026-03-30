'use strict';

/**
 * sync.test.cjs — Real-git integration tests for state sync module
 *
 * Phase 192: Git-Based State Sync
 * Satisfies: SYN-01, SYN-02, SYN-03, SYN-07
 *
 * Tests use real git operations (bare repos, clone, push, fetch, merge).
 * No vi.mock for git — all git operations run against real temp repos.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  pushPlanningState,
  fetchPlanningState,
  mergePlanningFromCloud,
} = require('../../packages/dispatcher/lib/sync.cjs');

// ─── Fixture Helpers ──────────────────────────────────────────────────────────

/**
 * Create a bare git remote (simulates cloud git host).
 * Returns absolute path to bare repo directory.
 */
function makeBareRemote() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-sync-bare-'));
  execFileSync('git', ['init', '--bare', dir], { stdio: 'pipe' });
  return dir;
}

/**
 * Clone a bare remote and configure git identity.
 * Returns absolute path to clone directory.
 */
function makeClone(bareRemote, suffix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-sync-' + suffix + '-'));
  execFileSync('git', ['clone', bareRemote, dir], { stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'test@pde.test'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', 'PDE Test'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir, stdio: 'pipe' });
  return dir;
}

/**
 * Create initial commit with .planning/ files on both clones' main branch.
 * This establishes a shared history for conflict testing.
 */
function initSharedHistory(clone, stateContent, roadmapContent, requirementsContent) {
  fs.mkdirSync(path.join(clone, '.planning'), { recursive: true });
  fs.writeFileSync(path.join(clone, '.planning', 'STATE.md'), stateContent || 'status: initial\n');
  fs.writeFileSync(path.join(clone, '.planning', 'ROADMAP.md'), roadmapContent || '# Roadmap\n');
  fs.writeFileSync(path.join(clone, '.planning', 'REQUIREMENTS.md'), requirementsContent || '# Requirements\n');
  execFileSync('git', ['add', '.'], { cwd: clone, stdio: 'pipe' });
  execFileSync('git', ['commit', '--no-verify', '-m', 'init planning'], { cwd: clone, stdio: 'pipe' });
  execFileSync('git', ['push', 'origin', 'main'], { cwd: clone, stdio: 'pipe' });
}

function cleanup(...dirs) {
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (_) {}
  }
}

// ─── SYN-01: pushPlanningState ────────────────────────────────────────────────

describe('pushPlanningState', () => {
  it('SYN-01: pushes .planning/ content to bare remote — cloning bare confirms STATE.md exists', async () => {
    const bare = makeBareRemote();
    const cloud = makeClone(bare, 'cloud');
    let verify = null;

    try {
      initSharedHistory(cloud, 'status: cloud-session\n', undefined, undefined);

      // Cloud clone creates session branch and adds .planning/ content
      const branch = 'pde/session/syn01-push-test';
      execFileSync('git', ['checkout', '-b', branch], { cwd: cloud, stdio: 'pipe' });
      fs.writeFileSync(path.join(cloud, '.planning', 'STATE.md'), 'status: pushed-by-cloud\n');
      execFileSync('git', ['add', '.'], { cwd: cloud, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'cloud session work'], { cwd: cloud, stdio: 'pipe' });

      // Push using pushPlanningState
      const result = await pushPlanningState(cloud, branch);
      expect(result.ok).toBe(true);

      // Verify: clone bare remote and check .planning/STATE.md content
      verify = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-sync-verify-'));
      execFileSync('git', ['clone', '--branch', branch, bare, verify], { stdio: 'pipe' });
      const content = fs.readFileSync(path.join(verify, '.planning', 'STATE.md'), 'utf8');
      expect(content).toContain('pushed-by-cloud');
    } finally {
      cleanup(bare, cloud, verify);
    }
  });

  it('SYN-01 (error): returns { ok: false } when remote is unreachable', async () => {
    const fakeRemote = path.join(os.tmpdir(), 'pde-sync-nonexistent-' + Date.now());
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-sync-norepo-'));

    try {
      // Create a local repo with no valid remote
      execFileSync('git', ['init', '-b', 'main', tmpDir], { stdio: 'pipe' });
      execFileSync('git', ['config', 'user.email', 'test@pde.test'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['config', 'user.name', 'PDE Test'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['remote', 'add', 'origin', fakeRemote], { cwd: tmpDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tmpDir, 'README.md'), 'init\n');
      execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'init'], { cwd: tmpDir, stdio: 'pipe' });

      const result = await pushPlanningState(tmpDir, 'pde/session/bad-branch');
      expect(result.ok).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    } finally {
      cleanup(tmpDir);
    }
  });
});

// ─── SYN-03: Direction-aware merge ───────────────────────────────────────────

describe('mergePlanningFromCloud — direction-aware conflict resolution', () => {
  it('SYN-03 (--theirs): STATE.md conflict resolves with cloud content (--theirs wins)', async () => {
    const bare = makeBareRemote();
    const cloud = makeClone(bare, 'cloud');
    const local = makeClone(bare, 'local');

    try {
      // 1. Establish shared history on cloud clone, push to bare
      initSharedHistory(cloud, 'status: initial\n', '# Roadmap\n', '# Requirements\n');

      // 2. Local clone pulls shared history
      execFileSync('git', ['pull', 'origin', 'main'], { cwd: local, stdio: 'pipe' });

      const branch = 'pde/session/syn03-theirs';

      // 3. Cloud: checkout session branch, update STATE.md to cloud version, push
      execFileSync('git', ['checkout', '-b', branch], { cwd: cloud, stdio: 'pipe' });
      fs.writeFileSync(path.join(cloud, '.planning', 'STATE.md'), 'status: cloud-updated\n');
      execFileSync('git', ['add', '.'], { cwd: cloud, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'cloud updates STATE.md'], { cwd: cloud, stdio: 'pipe' });
      execFileSync('git', ['push', 'origin', branch], { cwd: cloud, stdio: 'pipe' });

      // 4. Local: modify STATE.md differently on main (creates divergence)
      fs.writeFileSync(path.join(local, '.planning', 'STATE.md'), 'status: local-version\n');
      execFileSync('git', ['add', '.'], { cwd: local, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'local updates STATE.md'], { cwd: local, stdio: 'pipe' });

      // 5. Local: fetch + merge from cloud
      const fetchResult = await fetchPlanningState(local, branch);
      expect(fetchResult.ok).toBe(true);

      const mergeResult = await mergePlanningFromCloud(local, branch);
      expect(mergeResult.ok).toBe(true);

      // 6. STATE.md should contain cloud content (--theirs wins for STATE.md)
      const stateContent = fs.readFileSync(path.join(local, '.planning', 'STATE.md'), 'utf8');
      expect(stateContent).toContain('cloud-updated');
      expect(stateContent).not.toContain('local-version');
    } finally {
      cleanup(bare, cloud, local);
    }
  });

  it('SYN-03 (--ours): ROADMAP.md conflict resolves with local content (--ours wins)', async () => {
    const bare = makeBareRemote();
    const cloud = makeClone(bare, 'cloud');
    const local = makeClone(bare, 'local');

    try {
      // 1. Shared history
      initSharedHistory(cloud, 'status: initial\n', '# Roadmap\n', '# Requirements\n');
      execFileSync('git', ['pull', 'origin', 'main'], { cwd: local, stdio: 'pipe' });

      const branch = 'pde/session/syn03-ours';

      // 2. Cloud: checkout session branch, update ROADMAP.md, push
      execFileSync('git', ['checkout', '-b', branch], { cwd: cloud, stdio: 'pipe' });
      fs.writeFileSync(path.join(cloud, '.planning', 'ROADMAP.md'), '# Cloud Roadmap\n');
      execFileSync('git', ['add', '.'], { cwd: cloud, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'cloud updates ROADMAP.md'], { cwd: cloud, stdio: 'pipe' });
      execFileSync('git', ['push', 'origin', branch], { cwd: cloud, stdio: 'pipe' });

      // 3. Local: update ROADMAP.md differently
      fs.writeFileSync(path.join(local, '.planning', 'ROADMAP.md'), '# Local Roadmap\n');
      execFileSync('git', ['add', '.'], { cwd: local, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'local updates ROADMAP.md'], { cwd: local, stdio: 'pipe' });

      // 4. Fetch + merge
      const fetchResult = await fetchPlanningState(local, branch);
      expect(fetchResult.ok).toBe(true);

      const mergeResult = await mergePlanningFromCloud(local, branch);
      expect(mergeResult.ok).toBe(true);

      // 5. ROADMAP.md should contain local content (--ours wins)
      const roadmapContent = fs.readFileSync(path.join(local, '.planning', 'ROADMAP.md'), 'utf8');
      expect(roadmapContent).toContain('Local Roadmap');
      expect(roadmapContent).not.toContain('Cloud Roadmap');
    } finally {
      cleanup(bare, cloud, local);
    }
  });

  it('source conflict: aborts merge and returns { ok: false, needsHuman: true }', async () => {
    const bare = makeBareRemote();
    const cloud = makeClone(bare, 'cloud');
    const local = makeClone(bare, 'local');

    try {
      // 1. Shared history with a source file
      fs.mkdirSync(path.join(cloud, 'src'), { recursive: true });
      fs.writeFileSync(path.join(cloud, 'src', 'app.js'), 'const x = 1;\n');
      fs.mkdirSync(path.join(cloud, '.planning'), { recursive: true });
      fs.writeFileSync(path.join(cloud, '.planning', 'STATE.md'), 'status: initial\n');
      execFileSync('git', ['add', '.'], { cwd: cloud, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'init with source'], { cwd: cloud, stdio: 'pipe' });
      execFileSync('git', ['push', 'origin', 'main'], { cwd: cloud, stdio: 'pipe' });

      // 2. Local pulls shared history
      execFileSync('git', ['pull', 'origin', 'main'], { cwd: local, stdio: 'pipe' });

      const branch = 'pde/session/syn03-source-conflict';

      // 3. Cloud: modify src/app.js on session branch, push
      execFileSync('git', ['checkout', '-b', branch], { cwd: cloud, stdio: 'pipe' });
      fs.writeFileSync(path.join(cloud, 'src', 'app.js'), 'const x = 999; // cloud version\n');
      execFileSync('git', ['add', '.'], { cwd: cloud, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'cloud src change'], { cwd: cloud, stdio: 'pipe' });
      execFileSync('git', ['push', 'origin', branch], { cwd: cloud, stdio: 'pipe' });

      // 4. Local: modify src/app.js differently
      fs.writeFileSync(path.join(local, 'src', 'app.js'), 'const x = 42; // local version\n');
      execFileSync('git', ['add', '.'], { cwd: local, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'local src change'], { cwd: local, stdio: 'pipe' });

      // 5. Fetch + attempt merge
      await fetchPlanningState(local, branch);
      const mergeResult = await mergePlanningFromCloud(local, branch);

      expect(mergeResult.ok).toBe(false);
      expect(mergeResult.needsHuman).toBe(true);
      expect(mergeResult.conflicts).toContain('src/app.js');

      // Merge must be cleanly aborted — no MERGE_HEAD
      const gitDir = path.join(local, '.git');
      expect(fs.existsSync(path.join(gitDir, 'MERGE_HEAD'))).toBe(false);
    } finally {
      cleanup(bare, cloud, local);
    }
  });
});

// ─── SYN-02: Full round-trip ──────────────────────────────────────────────────

describe('fetchPlanningState + mergePlanningFromCloud — full round-trip', () => {
  it('SYN-02: push from cloud, fetch+merge locally, cloud STATE.md appears in local repo', async () => {
    const bare = makeBareRemote();
    const cloud = makeClone(bare, 'cloud');
    const local = makeClone(bare, 'local');

    try {
      // 1. Bootstrap shared history
      initSharedHistory(cloud, 'status: initial\n', '# Roadmap\n', '# Requirements\n');
      execFileSync('git', ['pull', 'origin', 'main'], { cwd: local, stdio: 'pipe' });

      const branch = 'pde/session/syn02-roundtrip';

      // 2. Cloud creates session branch and pushes updated STATE.md
      execFileSync('git', ['checkout', '-b', branch], { cwd: cloud, stdio: 'pipe' });
      fs.writeFileSync(path.join(cloud, '.planning', 'STATE.md'), 'status: completed-by-cloud\ncurrent_plan: 2\n');
      execFileSync('git', ['add', '.'], { cwd: cloud, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'cloud executor done'], { cwd: cloud, stdio: 'pipe' });

      const pushResult = await pushPlanningState(cloud, branch);
      expect(pushResult.ok).toBe(true);

      // 3. Local fetches and merges (no local conflict — clean fast-forward or auto-merge)
      const fetchResult = await fetchPlanningState(local, branch);
      expect(fetchResult.ok).toBe(true);

      const mergeResult = await mergePlanningFromCloud(local, branch);
      expect(mergeResult.ok).toBe(true);

      // 4. Local repo should now have cloud STATE.md content
      const stateContent = fs.readFileSync(path.join(local, '.planning', 'STATE.md'), 'utf8');
      expect(stateContent).toContain('completed-by-cloud');
      expect(stateContent).toContain('current_plan: 2');
    } finally {
      cleanup(bare, cloud, local);
    }
  });
});

// ─── SYN-07: Package location ─────────────────────────────────────────────────

describe('SYN-07: simple-git package location', () => {
  it('simple-git is in packages/dispatcher/package.json dependencies', () => {
    const pkgPath = path.join(__dirname, '../../packages/dispatcher/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.dependencies && pkg.dependencies['simple-git']).toBeTruthy();
  });

  it('simple-git is NOT in root package.json', () => {
    const rootPkgPath = path.join(__dirname, '../../package.json');
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    const inDeps = rootPkg.dependencies && rootPkg.dependencies['simple-git'];
    const inDevDeps = rootPkg.devDependencies && rootPkg.devDependencies['simple-git'];
    expect(inDeps).toBeFalsy();
    expect(inDevDeps).toBeFalsy();
  });
});
