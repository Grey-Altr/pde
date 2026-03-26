'use strict';

/**
 * merge.cjs - Session merge-back with selective conflict resolution and post-merge recalculation
 *
 * Phase 143: Session Isolation
 * Satisfies: ISO-02, ISO-09
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const OURS_ON_CONFLICT = [
  '.planning/STATE.md',
  '.planning/REQUIREMENTS.md',
  '.planning/ROADMAP.md',
];

function mergeSession(projectRoot, sessionId) {
  const branch = 'pde/session/' + sessionId;

  try {
    execFileSync('git', ['merge', branch, '--no-edit'], {
      cwd: projectRoot,
      stdio: 'pipe',
    });
    return { ok: true, conflicts: [] };
  } catch (_mergeErr) {
    const conflictOutput = execFileSync(
      'git', ['diff', '--name-only', '--diff-filter=U'],
      { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }
    );
    const conflicts = conflictOutput.trim().split('\n').filter(Boolean);

    const planningConflicts = conflicts.filter(f => f.startsWith('.planning/'));
    const sourceConflicts = conflicts.filter(f => !f.startsWith('.planning/'));

    if (sourceConflicts.length > 0) {
      execFileSync('git', ['merge', '--abort'], { cwd: projectRoot, stdio: 'pipe' });
      return { ok: false, conflicts: sourceConflicts, needsHuman: true };
    }

    for (const file of planningConflicts) {
      if (file.startsWith('.planning/agent-memory/')) {
        _resolveAgentMemoryConflict(projectRoot, file);
      } else {
        execFileSync('git', ['checkout', '--ours', '--', file], {
          cwd: projectRoot,
          stdio: 'pipe',
        });
      }
      execFileSync('git', ['add', '--', file], {
        cwd: projectRoot,
        stdio: 'pipe',
      });
    }

    execFileSync('git', ['commit', '--no-edit'], {
      cwd: projectRoot,
      stdio: 'pipe',
    });

    return { ok: true, conflicts: planningConflicts, autoResolved: planningConflicts };
  }
}

function _resolveAgentMemoryConflict(projectRoot, file) {
  const absPath = path.join(projectRoot, file);
  const oursOutput = execFileSync(
    'git', ['show', ':2:' + file],
    { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }
  );
  const theirsOutput = execFileSync(
    'git', ['show', ':3:' + file],
    { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }
  );
  const merged = oursOutput.trimEnd() + '\n\n' + theirsOutput.trimEnd() + '\n';
  fs.writeFileSync(absPath, merged);
}

function recalculateFromArtifacts(projectRoot) {
  const phasesDir = path.join(projectRoot, '.planning', 'phases');

  let phaseDirs = [];
  try {
    phaseDirs = fs.readdirSync(phasesDir).filter(name => /^\d{3,}-/.test(name));
  } catch (_) {}

  let phasesCompleted = 0;
  const completedPhaseNumbers = new Set();

  for (const phaseDir of phaseDirs) {
    const completePath = path.join(phasesDir, phaseDir, 'COMPLETE.json');
    if (!fs.existsSync(completePath)) continue;
    try {
      const artifact = JSON.parse(fs.readFileSync(completePath, 'utf8'));
      if (artifact.exit_code === 0) {
        phasesCompleted++;
        completedPhaseNumbers.add(artifact.phase);
      }
    } catch (_) {}
  }

  const requirementsCompleted = new Set();

  for (const phaseDir of phaseDirs) {
    const reqsPath = path.join(phasesDir, phaseDir, 'COMPLETED-REQS.md');
    if (!fs.existsSync(reqsPath)) continue;
    try {
      const content = fs.readFileSync(reqsPath, 'utf8');
      const reqIds = _parseCompletedReqIds(content);
      for (const id of reqIds) requirementsCompleted.add(id);
    } catch (_) {}
  }

  const reqIds = Array.from(requirementsCompleted);

  _updateStateMd(projectRoot, phasesCompleted);
  _updateRoadmapMd(projectRoot, completedPhaseNumbers);
  if (reqIds.length > 0) {
    _updateRequirementsMd(projectRoot, reqIds);
  }

  return {
    phasesCompleted,
    requirementsCompleted: reqIds,
    updated: true,
  };
}

function _parseCompletedReqIds(content) {
  const ids = [];
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return ids;

  const fm = frontmatterMatch[1];
  const reqsMatch = fm.match(/^requirements:\s*\n((?:\s+- .+\n?)*)/m);
  if (!reqsMatch) return ids;

  const listBlock = reqsMatch[1];
  const itemPattern = /^\s+-\s+(.+)$/gm;
  let match;
  while ((match = itemPattern.exec(listBlock)) !== null) {
    ids.push(match[1].trim());
  }
  return ids;
}

function _updateStateMd(projectRoot, phasesCompleted) {
  const statePath = path.join(projectRoot, '.planning', 'STATE.md');
  let content;
  try {
    content = fs.readFileSync(statePath, 'utf8');
  } catch (_) {
    return;
  }
  content = content.replace(
    /^(\s+completed_phases:\s*)\d+/m,
    '$1' + phasesCompleted
  );
  fs.writeFileSync(statePath, content, 'utf8');
}

function _updateRoadmapMd(projectRoot, completedPhaseNumbers) {
  const roadmapPath = path.join(projectRoot, '.planning', 'ROADMAP.md');
  let content;
  try {
    content = fs.readFileSync(roadmapPath, 'utf8');
  } catch (_) {
    return;
  }
  for (const phaseNum of completedPhaseNumbers) {
    const pattern = new RegExp('(- )\\[ \\]( \\*\\*Phase ' + phaseNum + ':)', 'g');
    content = content.replace(pattern, '$1[x]$2');
  }
  fs.writeFileSync(roadmapPath, content, 'utf8');
}

function _updateRequirementsMd(projectRoot, reqIds) {
  const reqsPath = path.join(projectRoot, '.planning', 'REQUIREMENTS.md');
  let content;
  try {
    content = fs.readFileSync(reqsPath, 'utf8');
  } catch (_) {
    return;
  }
  for (const id of reqIds) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('(- )\\[ \\]( \\*\\*' + escaped + '\\*\\*)', 'g');
    content = content.replace(pattern, '$1[x]$2');
  }
  fs.writeFileSync(reqsPath, content, 'utf8');
}

module.exports = {
  mergeSession,
  recalculateFromArtifacts,
  _parseCompletedReqIds,
  OURS_ON_CONFLICT,
};
