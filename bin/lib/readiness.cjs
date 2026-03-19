'use strict';

/**
 * readiness.cjs — Pre-execution readiness gate validation
 *
 * Implements structural (A1-A11) and consistency (B1-B3) checks on PLAN.md files.
 * Classifies results as PASS/CONCERNS/FAIL and writes READINESS.md to phase directory.
 *
 * Supports VRFY-03: /pde:check-readiness command.
 */

const fs = require('fs');
const path = require('path');
const { extractFrontmatter } = require('./frontmatter.cjs');
const { extractTaskBlocks, extractField, extractPlanAcBlock } = require('./sharding.cjs');
const { safeReadFile, findPhaseInternal, output, error } = require('./core.cjs');

// ─── runStructuralChecks ─────────────────────────────────────────────────────

/**
 * Run structural and consistency checks on a single PLAN.md content string.
 *
 * @param {string|null} planContent - full PLAN.md content string
 * @param {string|null} requirementsContent - full REQUIREMENTS.md content string
 * @param {string} planFileName - plan filename for error messages
 * @returns {{ checks: CheckResult[] }}
 *   where CheckResult = {id, description, passed, severity, details?}
 */
function runStructuralChecks(planContent, requirementsContent, planFileName) {
  const checks = [];

  // ─── Category A: Presence checks ─────────────────────────────────────────

  // A1: planContent is truthy (not empty/null)
  const a1Passed = !!planContent;
  checks.push({
    id: 'A1',
    description: 'Plan content is not empty or null',
    passed: a1Passed,
    severity: 'fail',
    details: a1Passed ? '' : `${planFileName}: plan content is empty or missing`,
  });

  // If A1 failed, remaining checks cannot run reliably — mark as skipped (passed)
  if (!a1Passed) {
    const skippedIds = ['A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'];
    for (const id of skippedIds) {
      checks.push({
        id,
        description: '(skipped — plan content unavailable)',
        passed: true,
        severity: id <= 'A6' ? 'fail' : 'concerns',
        details: 'Skipped: A1 failed',
      });
    }
    // B checks also cannot run
    if (requirementsContent) {
      checks.push({ id: 'B1', description: '(skipped)', passed: true, severity: 'fail', details: 'Skipped: A1 failed' });
      checks.push({ id: 'B2', description: '(skipped)', passed: true, severity: 'concerns', details: 'Skipped: A1 failed' });
      checks.push({ id: 'B3', description: '(skipped)', passed: true, severity: 'concerns', details: 'Skipped: A1 failed' });
    }
    return { checks };
  }

  // A2: extractFrontmatter(planContent).phase exists
  const fm = extractFrontmatter(planContent);
  const a2Passed = !!fm.phase;
  checks.push({
    id: 'A2',
    description: 'Frontmatter has "phase" field',
    passed: a2Passed,
    severity: 'fail',
    details: a2Passed ? '' : `${planFileName}: missing frontmatter field "phase"`,
  });

  // A3: extractFrontmatter(planContent).requirements is array with length > 0
  const reqs = fm.requirements;
  const a3Passed = Array.isArray(reqs) && reqs.length > 0;
  checks.push({
    id: 'A3',
    description: 'Frontmatter "requirements" array is non-empty',
    passed: a3Passed,
    severity: 'concerns',
    details: a3Passed ? '' : `${planFileName}: requirements array is empty or missing`,
  });

  // A4: planContent contains <objective>
  const a4Passed = planContent.includes('<objective>') || /<objective[\s>]/i.test(planContent);
  checks.push({
    id: 'A4',
    description: 'Plan contains <objective> block',
    passed: a4Passed,
    severity: 'fail',
    details: a4Passed ? '' : `${planFileName}: no <objective> block found`,
  });

  // A5: extractPlanAcBlock(planContent) returns non-empty string
  const planAcBlock = extractPlanAcBlock(planContent);
  const a5Passed = planAcBlock.trim().length > 0;
  checks.push({
    id: 'A5',
    description: 'Plan has a plan-level <acceptance_criteria> block before <tasks>',
    passed: a5Passed,
    severity: 'concerns',
    details: a5Passed ? '' : `${planFileName}: no plan-level <acceptance_criteria> block found before <tasks>`,
  });

  // A6: extractTaskBlocks(planContent).length > 0
  const taskBlocks = extractTaskBlocks(planContent);
  const a6Passed = taskBlocks.length > 0;
  checks.push({
    id: 'A6',
    description: 'Plan has at least one <task> inside <tasks> block',
    passed: a6Passed,
    severity: 'fail',
    details: a6Passed ? '' : `${planFileName}: no <task> elements found`,
  });

  // A7: For each task block, extractField(inner, 'name') AND extractField(inner, 'action')
  //     AND extractField(inner, 'acceptance_criteria') must be non-empty
  const a7FailingTasks = [];
  for (let i = 0; i < taskBlocks.length; i++) {
    const inner = taskBlocks[i].inner;
    const taskName = extractField(inner, 'name') || `Task ${i + 1}`;
    const hasName = !!extractField(inner, 'name');
    const hasAction = !!extractField(inner, 'action');
    const hasAc = !!extractField(inner, 'acceptance_criteria');
    if (!hasName || !hasAction || !hasAc) {
      const missing = [];
      if (!hasName) missing.push('name');
      if (!hasAction) missing.push('action');
      if (!hasAc) missing.push('acceptance_criteria');
      a7FailingTasks.push(`${taskName} (missing: ${missing.join(', ')})`);
    }
  }
  const a7Passed = a7FailingTasks.length === 0;
  checks.push({
    id: 'A7',
    description: 'Every task has <name>, <action>, and <acceptance_criteria>',
    passed: a7Passed,
    severity: 'fail',
    details: a7Passed ? '' : `${planFileName}: tasks missing required elements: ${a7FailingTasks.join('; ')}`,
  });

  // A8: For each task block, extractField(inner, 'ac_refs') must be non-empty
  const a8FailingTasks = [];
  for (let i = 0; i < taskBlocks.length; i++) {
    const inner = taskBlocks[i].inner;
    const taskName = extractField(inner, 'name') || `Task ${i + 1}`;
    if (!extractField(inner, 'ac_refs')) {
      a8FailingTasks.push(taskName);
    }
  }
  const a8Passed = a8FailingTasks.length === 0;
  checks.push({
    id: 'A8',
    description: 'Every task has <ac_refs>',
    passed: a8Passed,
    severity: 'concerns',
    details: a8Passed ? '' : `${planFileName}: tasks missing <ac_refs>: ${a8FailingTasks.join(', ')}`,
  });

  // A9: extractFrontmatter(planContent).must_haves?.truths is array with length > 0
  const mustHaves = fm.must_haves;
  const truths = mustHaves && mustHaves.truths;
  const a9Passed = Array.isArray(truths) && truths.length > 0;
  checks.push({
    id: 'A9',
    description: 'Frontmatter must_haves.truths is non-empty',
    passed: a9Passed,
    severity: 'concerns',
    details: a9Passed ? '' : `${planFileName}: must_haves.truths is missing or empty`,
  });

  // ─── Category B: Consistency checks (only if requirementsContent provided) ─

  if (requirementsContent) {
    // B1: Each ID in fm.requirements must be found in the active section of REQUIREMENTS.md
    // "Active" = has `- [ ]` or `- [x]` prefix (before ## Future Requirements section)
    const reqIds = Array.isArray(fm.requirements) ? fm.requirements : [];
    const unmappedIds = [];

    // Find the "## Future Requirements" section boundary
    const futureIdx = requirementsContent.search(/^##\s+Future Requirements/im);
    const activeSection = futureIdx > -1
      ? requirementsContent.slice(0, futureIdx)
      : requirementsContent;

    for (const reqId of reqIds) {
      // Check active section only (checkbox prefix pattern)
      const activePattern = new RegExp(`- \\[[ x]\\].*\\*\\*${reqId}\\*\\*`, 'i');
      if (!activePattern.test(activeSection)) {
        unmappedIds.push(reqId);
      }
    }

    const b1Passed = unmappedIds.length === 0;
    checks.push({
      id: 'B1',
      description: 'All frontmatter requirement IDs exist in active REQUIREMENTS.md section',
      passed: b1Passed,
      severity: 'fail',
      details: b1Passed ? '' : `${planFileName}: requirement IDs not found in active section: ${unmappedIds.join(', ')}`,
    });

    // B2: Extract AC-N IDs from planAcBlock. Each plan AC-N must be referenced by at least one task.
    const planAcIds = new Set();
    const acPattern = /\*\*AC-(\d+)\*\*:/g;
    let acMatch;
    while ((acMatch = acPattern.exec(planAcBlock)) !== null) {
      planAcIds.add(`AC-${acMatch[1]}`);
    }

    // Extract all ac_refs from task blocks
    const taskAcRefs = new Set();
    for (const block of taskBlocks) {
      const acRefsStr = extractField(block.inner, 'ac_refs');
      if (acRefsStr) {
        const refs = acRefsStr.split(',').map(r => r.trim()).filter(Boolean);
        for (const ref of refs) {
          taskAcRefs.add(ref);
        }
      }
    }

    const orphanedAcIds = [...planAcIds].filter(id => !taskAcRefs.has(id));
    const b2Passed = orphanedAcIds.length === 0;
    checks.push({
      id: 'B2',
      description: 'All plan-level AC-N IDs are referenced by at least one task',
      passed: b2Passed,
      severity: 'concerns',
      details: b2Passed ? '' : `${planFileName}: plan-level ACs not referenced by any task: ${orphanedAcIds.join(', ')}`,
    });

    // B3: Each ac_refs AC-N must exist in planAcBlock AC-N set
    const ghostAcRefs = [...taskAcRefs].filter(ref => ref.startsWith('AC-') && !planAcIds.has(ref));
    const b3Passed = ghostAcRefs.length === 0;
    checks.push({
      id: 'B3',
      description: 'All task ac_refs reference AC-N IDs defined in plan-level block',
      passed: b3Passed,
      severity: 'concerns',
      details: b3Passed ? '' : `${planFileName}: task ac_refs reference undefined plan-level ACs: ${ghostAcRefs.join(', ')}`,
    });
  }

  return { checks };
}

// ─── classifyResult ───────────────────────────────────────────────────────────

/**
 * Classify aggregated check results with severity-first precedence.
 *
 * @param {Array<{severity: string, passed: boolean}>} checks
 * @returns {'fail'|'concerns'|'pass'}
 */
function classifyResult(checks) {
  // Any check with severity='fail' AND passed=false → 'fail'
  if (checks.some(c => c.severity === 'fail' && c.passed === false)) {
    return 'fail';
  }
  // Any check with severity='concerns' AND passed=false → 'concerns'
  if (checks.some(c => c.severity === 'concerns' && c.passed === false)) {
    return 'concerns';
  }
  return 'pass';
}

// ─── writeReadinessMd ─────────────────────────────────────────────────────────

/**
 * Write READINESS.md to the phase directory.
 *
 * @param {string} phaseDir - absolute path to phase directory
 * @param {string} phaseNumber - phase number (e.g., "50")
 * @param {string} phaseName - phase name (e.g., "readiness-gate")
 * @param {Array} allChecks - aggregated CheckResult array
 * @param {string} result - 'pass'|'concerns'|'fail'
 * @returns {string} path to written file
 */
function writeReadinessMd(phaseDir, phaseNumber, phaseName, allChecks, result) {
  const generated = new Date().toISOString();
  const checksRun = allChecks.length;
  const checksFailed = allChecks.filter(c => !c.passed).length;

  const structuralChecks = allChecks.filter(c => c.id && c.id.startsWith('A'));
  const consistencyChecks = allChecks.filter(c => c.id && c.id.startsWith('B'));

  function checkRow(check) {
    let status;
    if (check.passed) {
      status = 'PASS';
    } else if (check.severity === 'concerns') {
      status = 'CONCERNS';
    } else {
      status = 'FAIL';
    }
    const details = (check.details || '').replace(/\|/g, '\\|');
    return `| ${check.id} | ${check.description} | ${status} | ${details} |`;
  }

  const structuralTable = [
    '| Check | Description | Status | Details |',
    '|-------|-------------|--------|---------|',
    ...structuralChecks.map(checkRow),
  ].join('\n');

  const consistencyTable = consistencyChecks.length > 0
    ? [
        '| Check | Description | Status | Details |',
        '|-------|-------------|--------|---------|',
        ...consistencyChecks.map(checkRow),
      ].join('\n')
    : '_No consistency checks run (REQUIREMENTS.md not available)._';

  let handoffMessage;
  if (result === 'pass') {
    handoffMessage = 'All checks passed. Phase is ready to execute.';
  } else if (result === 'concerns') {
    handoffMessage = `${checksFailed} non-blocking issue(s) found. Review before executing.`;
  } else {
    handoffMessage = `${checksFailed} blocking issue(s) found. Fix before executing.`;
  }

  const content = `---
phase: ${phaseNumber}
generated: "${generated}"
result: ${result}
checks_run: ${checksRun}
checks_failed: ${checksFailed}
---

# Phase ${phaseNumber}: Readiness Report

**Generated:** ${generated}
**Result:** ${result.toUpperCase()}
**Checks run:** ${checksRun}
**Checks failed:** ${checksFailed}

## Structural Checks

${structuralTable}

## Consistency Checks

${consistencyTable}

## Executor Handoff

${handoffMessage}
`;

  const outputFile = path.join(phaseDir, `${phaseNumber}-READINESS.md`);
  fs.writeFileSync(outputFile, content, 'utf-8');
  return outputFile;
}

// ─── cmdReadinessCheck ────────────────────────────────────────────────────────

/**
 * CLI command: check readiness for a phase.
 *
 * @param {string} cwd
 * @param {string} phaseArg - phase number or slug
 * @param {string|null} planFile - optional specific plan file to check
 * @param {boolean} raw
 */
function cmdReadinessCheck(cwd, phaseArg, planFile, raw) {
  if (!phaseArg) { error('phase argument required'); }

  const phaseInfo = findPhaseInternal(cwd, phaseArg);
  if (!phaseInfo || !phaseInfo.found) {
    output({ error: 'Phase not found', phase: phaseArg }, raw);
    return;
  }

  const phaseDir = path.join(cwd, phaseInfo.directory);
  const phaseNumber = phaseInfo.phase_number;
  const phaseName = phaseInfo.phase_name || '';

  // A10: PROJECT.md exists
  const projectMdPath = path.join(cwd, '.planning', 'PROJECT.md');
  const a10Passed = fs.existsSync(projectMdPath);

  // A11: REQUIREMENTS.md exists
  const requirementsMdPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');
  const a11Passed = fs.existsSync(requirementsMdPath);

  const filesystemChecks = [
    {
      id: 'A10',
      description: '.planning/PROJECT.md exists',
      passed: a10Passed,
      severity: 'fail',
      details: a10Passed ? '' : '.planning/PROJECT.md not found',
    },
    {
      id: 'A11',
      description: '.planning/REQUIREMENTS.md exists',
      passed: a11Passed,
      severity: 'fail',
      details: a11Passed ? '' : '.planning/REQUIREMENTS.md not found',
    },
  ];

  // Read REQUIREMENTS.md for B-checks
  const requirementsContent = a11Passed ? safeReadFile(requirementsMdPath) : null;

  // Determine which plan files to check
  let planFiles = [];
  if (planFile) {
    const planFilePath = path.isAbsolute(planFile) ? planFile : path.join(phaseDir, planFile);
    if (!fs.existsSync(planFilePath)) {
      output({ error: 'Plan file not found', path: planFile }, raw);
      return;
    }
    planFiles = [planFilePath];
  } else {
    // Glob all *-PLAN.md in phase dir
    try {
      const dirEntries = fs.readdirSync(phaseDir);
      planFiles = dirEntries
        .filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md')
        .map(f => path.join(phaseDir, f))
        .sort();
    } catch (err) {
      output({ error: `Cannot read phase directory: ${err.message}` }, raw);
      return;
    }
  }

  if (planFiles.length === 0) {
    output({ error: 'No PLAN.md files found in phase directory', phase: phaseArg }, raw);
    return;
  }

  // Run structural/consistency checks on each plan
  let allContentChecks = [];
  for (const pf of planFiles) {
    const content = safeReadFile(pf);
    const fileName = path.basename(pf);
    const { checks } = runStructuralChecks(content, requirementsContent, fileName);
    allContentChecks = allContentChecks.concat(checks);
  }

  // Aggregate all checks
  const allChecks = [...filesystemChecks, ...allContentChecks];

  const result = classifyResult(allChecks);
  const outputFile = writeReadinessMd(phaseDir, phaseNumber, phaseName, allChecks, result);

  const checksRun = allChecks.length;
  const checksFailed = allChecks.filter(c => !c.passed).length;

  output({
    result,
    file: outputFile,
    checks_run: checksRun,
    checks_failed: checksFailed,
    plan_count: planFiles.length,
  }, raw);
}

// ─── cmdReadinessResult ───────────────────────────────────────────────────────

/**
 * CLI command: read an existing READINESS.md result.
 *
 * @param {string} cwd
 * @param {string} phaseArg
 * @param {boolean} raw
 */
function cmdReadinessResult(cwd, phaseArg, raw) {
  if (!phaseArg) { error('phase argument required'); }

  const phaseInfo = findPhaseInternal(cwd, phaseArg);
  if (!phaseInfo || !phaseInfo.found) {
    output({ result: 'none', file: null, error: 'Phase not found' }, raw);
    return;
  }

  const phaseDir = path.join(cwd, phaseInfo.directory);

  // Look for *-READINESS.md
  let readinessFile = null;
  try {
    const entries = fs.readdirSync(phaseDir);
    const found = entries.find(f => f.endsWith('-READINESS.md'));
    if (found) readinessFile = path.join(phaseDir, found);
  } catch {
    output({ result: 'none', file: null }, raw);
    return;
  }

  if (!readinessFile) {
    output({ result: 'none', file: null }, raw);
    return;
  }

  const content = safeReadFile(readinessFile);
  if (!content) {
    output({ result: 'none', file: null }, raw);
    return;
  }

  const frontmatterData = extractFrontmatter(content);

  output({
    result: frontmatterData.result || 'unknown',
    file: readinessFile,
    generated: frontmatterData.generated || null,
  }, raw);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  runStructuralChecks,
  classifyResult,
  writeReadinessMd,
  cmdReadinessCheck,
  cmdReadinessResult,
};
