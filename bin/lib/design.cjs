/**
 * Design — Design pipeline infrastructure library
 *
 * Provides: directory init, write-lock, DTCG-to-CSS token conversion,
 * manifest CRUD, and self-test entry point.
 *
 * Used by: bin/pde-tools.cjs (design subcommand router)
 * Phases: 13-20 all depend on this foundation
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('./core.cjs');

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'ux/mockups', 'visual', 'review', 'handoff', 'hardware', 'physical', 'launch'];
const WRITE_LOCK_TTL_MS = 60000;

// ─── stripCommentKeys ─────────────────────────────────────────────────────────

/**
 * Recursively remove all _comment keys from an object (mutates in place).
 */
function stripCommentKeys(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key === '_comment') {
      delete obj[key];
    } else if (obj[key] && typeof obj[key] === 'object') {
      stripCommentKeys(obj[key]);
    }
  }
}

// ─── ensureDesignDirs ─────────────────────────────────────────────────────────

/**
 * Create .planning/design/ and all domain subdirectories.
 * Idempotent — does not overwrite existing DESIGN-STATE.md or manifest.
 * Initializes root DESIGN-STATE.md from templates/design-state-root.md.
 * Initializes design-manifest.json from templates/design-manifest.json
 * with _comment keys stripped and example artifacts cleared.
 */
function ensureDesignDirs(cwd) {
  const designRoot = path.join(cwd, '.planning', 'design');
  fs.mkdirSync(designRoot, { recursive: true });
  for (const domain of DOMAIN_DIRS) {
    fs.mkdirSync(path.join(designRoot, domain), { recursive: true });
  }

  // Initialize DESIGN-STATE.md if it doesn't exist
  const stateFilePath = path.join(designRoot, 'DESIGN-STATE.md');
  if (!fs.existsSync(stateFilePath)) {
    const templatePath = path.join(cwd, 'templates', 'design-state-root.md');
    let templateContent = fs.readFileSync(templatePath, 'utf-8');
    const today = new Date().toISOString().split('T')[0];
    templateContent = templateContent.replace(/\{date\}/g, today);
    fs.writeFileSync(stateFilePath, templateContent, 'utf-8');
  }

  // Initialize design-manifest.json if it doesn't exist
  const manifestFilePath = path.join(designRoot, 'design-manifest.json');
  if (!fs.existsSync(manifestFilePath)) {
    const templatePath = path.join(cwd, 'templates', 'design-manifest.json');
    const raw = fs.readFileSync(templatePath, 'utf-8');
    const parsed = JSON.parse(raw);
    stripCommentKeys(parsed);
    parsed.artifacts = {};
    parsed.tokenDependencyMap = {};
    const now = new Date().toISOString();
    parsed.generatedAt = now;
    parsed.updatedAt = now;
    fs.writeFileSync(manifestFilePath, JSON.stringify(parsed, null, 2), 'utf-8');
  }

  return designRoot;
}

// ─── acquireWriteLock ─────────────────────────────────────────────────────────

/**
 * Acquire the write lock on root DESIGN-STATE.md.
 * Returns true if lock was acquired, false if another owner holds an active lock.
 * Clears stale locks (expired TTL) automatically.
 */
function acquireWriteLock(cwd, owner) {
  const stateFilePath = path.join(cwd, '.planning', 'design', 'DESIGN-STATE.md');
  let content = fs.readFileSync(stateFilePath, 'utf-8');

  // Find the ### Write Lock table section
  // Table structure: header line | separator line | optional data rows | optional comment rows
  // We need to find data rows (non-header, non-separator, non-comment rows in the table)
  const writeLockSectionPattern = /(### Write Lock\n\| Locked By \| Since \| Expires \|\n\|[-| ]+\|\n)([\s\S]*?)(?=\n##|\n### (?!Write Lock)|$)/;
  const match = content.match(writeLockSectionPattern);

  if (!match) {
    // If we can't find the section, treat it as no lock and insert one
    // This should not happen with properly initialized DESIGN-STATE.md
  }

  let tableBody = match ? match[2] : '';

  // Find existing data row (non-comment, non-empty lines)
  const dataRowPattern = /^\| (?!<!--)([^|]+) \| ([^|]+) \| ([^|]+) \|$/m;
  const dataRowMatch = tableBody.match(dataRowPattern);

  if (dataRowMatch) {
    const expires = dataRowMatch[3].trim();
    const expiresDate = new Date(expires);
    if (expiresDate > new Date()) {
      // Lock is still active
      return false;
    }
    // Lock is stale — remove it
    tableBody = tableBody.replace(/^\| (?!<!--)[^\n]+\n?/m, '');
  }

  // Insert new lock row
  const now = new Date();
  const since = now.toISOString();
  const expiresAt = new Date(now.getTime() + WRITE_LOCK_TTL_MS).toISOString();
  const newRow = `| ${owner} | ${since} | ${expiresAt} |\n`;

  if (match) {
    content = content.replace(writeLockSectionPattern, (_, header, body) => {
      return header + newRow + body;
    });
  }

  fs.writeFileSync(stateFilePath, content, 'utf-8');
  return true;
}

// ─── releaseWriteLock ─────────────────────────────────────────────────────────

/**
 * Release the write lock on root DESIGN-STATE.md.
 * Idempotent — always succeeds even if no lock exists.
 */
function releaseWriteLock(cwd) {
  const stateFilePath = path.join(cwd, '.planning', 'design', 'DESIGN-STATE.md');
  let content = fs.readFileSync(stateFilePath, 'utf-8');

  // Remove any data row in the Write Lock table
  // Data rows are non-comment, non-header rows that start with |
  const writeLockSectionPattern = /(### Write Lock\n\| Locked By \| Since \| Expires \|\n\|[-| ]+\|\n)([\s\S]*?)(?=\n##|\n### (?!Write Lock)|$)/;
  const match = content.match(writeLockSectionPattern);

  if (match) {
    let tableBody = match[2];
    // Remove all data rows (non-comment rows starting with |)
    tableBody = tableBody.replace(/^\| (?!<!--)[^\n]*\n?/gm, '');
    content = content.replace(writeLockSectionPattern, (_, header) => {
      return header + tableBody;
    });
    fs.writeFileSync(stateFilePath, content, 'utf-8');
  }
}

// ─── dtcgToCssLines ───────────────────────────────────────────────────────────

/**
 * Convert a DTCG JSON token tree to an array of CSS custom property lines.
 * Skips keys starting with '$'. Recurses into nested groups with hyphenated prefix.
 */
function dtcgToCssLines(tokens, prefix) {
  prefix = prefix || '';
  const lines = [];
  for (const key of Object.keys(tokens)) {
    if (key.startsWith('$')) continue;
    const node = tokens[key];
    if (node && typeof node === 'object' && '$value' in node) {
      lines.push('  --' + prefix + key + ': ' + node.$value + ';');
    } else if (node && typeof node === 'object') {
      const nested = dtcgToCssLines(node, prefix + key + '-');
      for (const line of nested) {
        lines.push(line);
      }
    }
  }
  return lines;
}

// ─── generateCssVars ─────────────────────────────────────────────────────────

/**
 * Wrap DTCG token tree as a complete :root { } CSS block.
 */
function generateCssVars(tokens) {
  return ':root {\n' + dtcgToCssLines(tokens).join('\n') + '\n}\n';
}

// ─── readManifest ─────────────────────────────────────────────────────────────

/**
 * Read and parse design-manifest.json. Returns null if file doesn't exist.
 */
function readManifest(cwd) {
  const manifestPath = path.join(cwd, '.planning', 'design', 'design-manifest.json');
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── writeManifest ────────────────────────────────────────────────────────────

/**
 * Write manifest to disk, updating updatedAt timestamp.
 */
function writeManifest(cwd, manifest) {
  manifest.updatedAt = new Date().toISOString();
  const manifestPath = path.join(cwd, '.planning', 'design', 'design-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

// ─── updateManifestArtifact ───────────────────────────────────────────────────

/**
 * Read manifest, upsert artifact fields for the given code, and write back.
 * Throws if manifest doesn't exist (ensureDesignDirs must be called first).
 */
function updateManifestArtifact(cwd, code, fields) {
  const manifest = readManifest(cwd);
  if (!manifest) {
    throw new Error('design-manifest.json not found — run design ensure-dirs first');
  }
  manifest.artifacts[code] = Object.assign(manifest.artifacts[code] || {}, fields);
  writeManifest(cwd, manifest);
  return manifest;
}

// ─── cmd* wrappers ────────────────────────────────────────────────────────────

function cmdEnsureDirs(cwd, raw) {
  const designRoot = ensureDesignDirs(cwd);
  output({ created: true, root: designRoot }, raw);
}

function cmdManifestRead(cwd, raw) {
  const manifest = readManifest(cwd);
  output(manifest, raw);
}

function cmdManifestUpdate(cwd, code, field, value, raw) {
  if (!code || !field) {
    error('code and field required for manifest-update');
  }
  const manifest = updateManifestArtifact(cwd, code, { [field]: value });
  output(manifest, raw);
}

function cmdManifestSetTopLevel(cwd, field, value, raw) {
  if (!field) {
    error('field required for manifest-set-top-level');
  }
  const manifest = readManifest(cwd);
  if (!manifest) {
    error('design-manifest.json not found — run design ensure-dirs first');
  }
  manifest[field] = value;
  writeManifest(cwd, manifest);
  output(manifest, raw);
}

function cmdArtifactPath(cwd, code, raw) {
  const manifest = readManifest(cwd);
  if (!manifest) {
    error('design-manifest.json not found — run design ensure-dirs first');
  }
  const artifact = manifest.artifacts[code];
  if (!artifact || !artifact.path) {
    error(`Artifact "${code}" not found in manifest`);
  }
  output({ code, path: artifact.path }, raw, artifact.path);
}

function cmdTokensToCss(cwd, tokensFile, raw) {
  if (!tokensFile) {
    error('tokens-file argument required');
  }
  const tokensPath = path.isAbsolute(tokensFile) ? tokensFile : path.join(cwd, tokensFile);
  let tokens;
  try {
    tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
  } catch {
    error(`Cannot read tokens file: ${tokensFile}`);
  }
  const css = generateCssVars(tokens);
  output({ css }, raw, css);
}

function cmdCoverageCheck(cwd, raw) {
  const manifest = readManifest(cwd);
  if (!manifest) {
    error('design-manifest.json not found — run design ensure-dirs first');
  }
  output(manifest.designCoverage, raw);
}

function cmdLockAcquire(cwd, owner, raw) {
  if (!owner) {
    error('owner argument required for lock-acquire');
  }
  const acquired = acquireWriteLock(cwd, owner);
  output({ acquired }, raw);
}

function cmdLockRelease(cwd, raw) {
  releaseWriteLock(cwd);
  output({ released: true }, raw);
}

function cmdLockStatus(cwd, raw) {
  const stateFilePath = path.join(cwd, '.planning', 'design', 'DESIGN-STATE.md');
  if (!fs.existsSync(stateFilePath)) {
    output({ locked: false, owner: null, since: null, expires: null, stale: false }, raw);
    return;
  }
  const content = fs.readFileSync(stateFilePath, 'utf-8');
  const writeLockSectionPattern = /(### Write Lock\n\| Locked By \| Since \| Expires \|\n\|[-| ]+\|\n)([\s\S]*?)(?=\n##|\n### (?!Write Lock)|$)/;
  const match = content.match(writeLockSectionPattern);
  const tableBody = match ? match[2] : '';
  const dataRowPattern = /^\| (?!<!--)([^|]+) \| ([^|]+) \| ([^|]+) \|$/m;
  const dataRowMatch = tableBody.match(dataRowPattern);
  if (!dataRowMatch) {
    output({ locked: false, owner: null, since: null, expires: null, stale: false }, raw);
    return;
  }
  const owner = dataRowMatch[1].trim();
  const since = dataRowMatch[2].trim();
  const expires = dataRowMatch[3].trim();
  const stale = new Date(expires) <= new Date();
  output({ locked: !stale, owner, since, expires, stale }, raw);
}

// ─── Self-Test ────────────────────────────────────────────────────────────────

function runSelfTest() {
  const assert = require('assert');
  const os = require('os');

  let passed = 0;
  let failed = 0;

  function check(label, fn) {
    try {
      fn();
      console.log('  PASS: ' + label);
      passed++;
    } catch (err) {
      console.error('  FAIL: ' + label);
      console.error('        ' + err.message);
      failed++;
    }
  }

  // Create a temp directory with templates/ subdirectory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-design-test-'));
  fs.mkdirSync(path.join(tmpDir, 'templates'));

  // Copy templates into tmpDir so ensureDesignDirs can find them
  const projectRoot = path.join(__dirname, '..', '..');
  fs.copyFileSync(
    path.join(projectRoot, 'templates', 'design-state-root.md'),
    path.join(tmpDir, 'templates', 'design-state-root.md')
  );
  fs.copyFileSync(
    path.join(projectRoot, 'templates', 'design-manifest.json'),
    path.join(tmpDir, 'templates', 'design-manifest.json')
  );

  console.log('\ndesign.cjs self-test');
  console.log('====================');

  // ─── Test group 1: ensureDesignDirs ───────────────────────────────────────

  console.log('\n[1] ensureDesignDirs');

  check('creates .planning/design/ root directory', () => {
    ensureDesignDirs(tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'design')));
  });

  check('creates all 10 domain subdirectories (including ux/mockups, physical, launch)', () => {
    for (const domain of DOMAIN_DIRS) {
      assert.ok(
        fs.existsSync(path.join(tmpDir, '.planning', 'design', domain)),
        `Missing domain dir: ${domain}`
      );
    }
  });

  check('initializes DESIGN-STATE.md from template', () => {
    const stateFile = path.join(tmpDir, '.planning', 'design', 'DESIGN-STATE.md');
    assert.ok(fs.existsSync(stateFile));
    const content = fs.readFileSync(stateFile, 'utf-8');
    assert.ok(content.includes('Write Lock'), 'DESIGN-STATE.md missing Write Lock section');
    // {date} placeholder should be replaced
    assert.ok(!content.includes('{date}'), 'DESIGN-STATE.md still contains {date} placeholder');
  });

  check('initializes design-manifest.json with _comment keys stripped and artifacts: {}', () => {
    const manifestFile = path.join(tmpDir, '.planning', 'design', 'design-manifest.json');
    assert.ok(fs.existsSync(manifestFile));
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
    assert.deepStrictEqual(manifest.artifacts, {});
    assert.deepStrictEqual(manifest.tokenDependencyMap, {});
    // No _comment keys anywhere
    const json = JSON.stringify(manifest);
    assert.ok(!json.includes('_comment'), 'manifest still contains _comment keys');
  });

  check('is idempotent — calling twice does not overwrite existing DESIGN-STATE.md', () => {
    const stateFile = path.join(tmpDir, '.planning', 'design', 'DESIGN-STATE.md');
    const originalContent = fs.readFileSync(stateFile, 'utf-8');
    // Modify the file to detect if it gets overwritten
    const marker = '<!-- idempotency-marker -->';
    fs.writeFileSync(stateFile, originalContent + '\n' + marker, 'utf-8');
    ensureDesignDirs(tmpDir); // second call
    const afterContent = fs.readFileSync(stateFile, 'utf-8');
    assert.ok(afterContent.includes(marker), 'ensureDesignDirs overwrote existing DESIGN-STATE.md');
  });

  // ─── Test group 2: Write Lock ─────────────────────────────────────────────

  console.log('\n[2] acquireWriteLock / releaseWriteLock');

  check('acquireWriteLock returns true when no lock exists', () => {
    // Restore clean DESIGN-STATE.md first (remove marker from idempotency test)
    ensureDesignDirs(tmpDir); // won't overwrite; lock table will still work
    const result = acquireWriteLock(tmpDir, 'test-owner');
    assert.strictEqual(result, true);
  });

  check('acquireWriteLock returns false when lock already held by another owner', () => {
    // Lock is already held by test-owner from previous test
    const result = acquireWriteLock(tmpDir, 'other-owner');
    assert.strictEqual(result, false);
  });

  check('releaseWriteLock clears lock row', () => {
    releaseWriteLock(tmpDir);
    // After release, another owner can acquire
    const result = acquireWriteLock(tmpDir, 'new-owner');
    assert.strictEqual(result, true);
    // Clean up
    releaseWriteLock(tmpDir);
  });

  check('acquireWriteLock clears stale (expired) lock and acquires', () => {
    // Manually write a stale lock row (expired 10 minutes ago)
    const stateFile = path.join(tmpDir, '.planning', 'design', 'DESIGN-STATE.md');
    let content = fs.readFileSync(stateFile, 'utf-8');
    const expiredSince = new Date(Date.now() - 120000).toISOString();
    const expiredAt = new Date(Date.now() - 60000).toISOString();
    const staleRow = `| stale-owner | ${expiredSince} | ${expiredAt} |\n`;
    content = content.replace(
      /(### Write Lock\n\| Locked By \| Since \| Expires \|\n\|[-| ]+\|\n)/,
      '$1' + staleRow
    );
    fs.writeFileSync(stateFile, content, 'utf-8');

    const result = acquireWriteLock(tmpDir, 'fresh-owner');
    assert.strictEqual(result, true, 'Should acquire lock when stale lock exists');
    releaseWriteLock(tmpDir);
  });

  check('cmdLockStatus returns locked: false when no lock held', () => {
    // After the releaseWriteLock from previous test, no lock row exists
    // Mock process.exit and process.stdout.write to capture output without exiting
    const origWrite = process.stdout.write;
    const origExit = process.exit;
    let captured = '';
    process.stdout.write = (msg) => { captured += msg; return true; };
    process.exit = () => {};
    cmdLockStatus(tmpDir, false);
    process.stdout.write = origWrite;
    process.exit = origExit;
    const result = JSON.parse(captured);
    assert.strictEqual(result.locked, false);
    assert.strictEqual(result.owner, null);
  });

  // ─── Test group 3: dtcgToCssLines ────────────────────────────────────────

  console.log('\n[3] dtcgToCssLines / generateCssVars');

  check('dtcgToCssLines converts flat DTCG token to CSS custom property', () => {
    const result = dtcgToCssLines({ color: { primary: { $value: '#007bff', $type: 'color' } } });
    assert.deepStrictEqual(result, ['  --color-primary: #007bff;']);
  });

  check('dtcgToCssLines skips $ keys (e.g. $description)', () => {
    const result = dtcgToCssLines({ $description: 'test', color: { $value: 'red' } });
    assert.deepStrictEqual(result, ['  --color: red;']);
  });

  check('dtcgToCssLines handles nested groups with hyphenated prefix', () => {
    const result = dtcgToCssLines({ spacing: { sm: { $value: '8px' }, lg: { $value: '24px' } } });
    assert.ok(result.includes('  --spacing-sm: 8px;'), 'Missing --spacing-sm');
    assert.ok(result.includes('  --spacing-lg: 24px;'), 'Missing --spacing-lg');
  });

  check('generateCssVars wraps output in :root { } block', () => {
    const tokens = { color: { brand: { $value: 'blue' } } };
    const css = generateCssVars(tokens);
    assert.ok(css.startsWith(':root {\n'), 'Missing :root { opening');
    assert.ok(css.endsWith('}\n'), 'Missing closing }');
    assert.ok(css.includes('--color-brand: blue;'), 'Missing token line');
  });

  check('generateCssVars does not produce @media or [data-theme] dark mode blocks', () => {
    const css = generateCssVars({ color: { bg: { $value: '#fff', $type: 'color' } } });
    assert.ok(!css.includes('@media'), 'generateCssVars must not produce @media blocks');
    assert.ok(!css.includes('[data-theme]'), 'generateCssVars must not produce [data-theme] selector');
  });

  // ─── Test group 4: Manifest operations ───────────────────────────────────

  console.log('\n[4] readManifest / writeManifest / updateManifestArtifact');

  check('readManifest returns null when no manifest file exists', () => {
    const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-design-test-fresh-'));
    // No .planning/design/ directory — ensure readManifest returns null
    const result = readManifest(freshDir);
    assert.strictEqual(result, null);
    // Cleanup
    fs.rmSync(freshDir, { recursive: true, force: true });
  });

  check('updateManifestArtifact creates artifact entry with code BRF', () => {
    const manifest = updateManifestArtifact(tmpDir, 'BRF', { name: 'Brief' });
    assert.ok(manifest.artifacts['BRF'], 'BRF artifact not created');
    assert.strictEqual(manifest.artifacts['BRF'].name, 'Brief');
  });

  check('cmdManifestSetTopLevel sets root-level manifest field', () => {
    const origWrite = process.stdout.write;
    const origExit = process.exit;
    process.stdout.write = () => true;
    process.exit = () => {};
    cmdManifestSetTopLevel(tmpDir, 'projectName', 'Test Project', false);
    process.stdout.write = origWrite;
    process.exit = origExit;
    const manifest = readManifest(tmpDir);
    assert.strictEqual(manifest.projectName, 'Test Project');
  });

  check('writeManifest sets updatedAt to current ISO timestamp', () => {
    const before = new Date();
    const manifest = readManifest(tmpDir);
    writeManifest(tmpDir, manifest);
    const after = new Date();
    const written = readManifest(tmpDir);
    const updatedAt = new Date(written.updatedAt);
    assert.ok(updatedAt >= before, 'updatedAt is before write time');
    assert.ok(updatedAt <= after, 'updatedAt is after write time');
  });

  // ─── Test group 5: stripCommentKeys ──────────────────────────────────────

  console.log('\n[5] stripCommentKeys');

  check('stripCommentKeys removes _comment keys recursively', () => {
    const obj = {
      _comment: 'top level',
      key: {
        _comment: 'nested',
        val: 1,
      },
      arr: [{ _comment: 'in array', x: 2 }],
    };
    stripCommentKeys(obj);
    assert.ok(!('_comment' in obj), 'Top-level _comment not removed');
    assert.ok(!('_comment' in obj.key), 'Nested _comment not removed');
    assert.strictEqual(obj.key.val, 1, 'Non-comment key removed accidentally');
  });

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log(`\n====================`);
  console.log(`design.cjs self-test: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

  // Cleanup temp dir
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('design.cjs self-test: all ' + passed + ' tests passed');
    process.exit(0);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

if (require.main === module && process.argv[2] === '--self-test') {
  runSelfTest();
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  ensureDesignDirs,
  acquireWriteLock,
  releaseWriteLock,
  dtcgToCssLines,
  generateCssVars,
  readManifest,
  writeManifest,
  updateManifestArtifact,
  stripCommentKeys,
  cmdEnsureDirs,
  cmdManifestRead,
  cmdManifestUpdate,
  cmdManifestSetTopLevel,
  cmdArtifactPath,
  cmdTokensToCss,
  cmdCoverageCheck,
  cmdLockAcquire,
  cmdLockRelease,
  cmdLockStatus,
};
