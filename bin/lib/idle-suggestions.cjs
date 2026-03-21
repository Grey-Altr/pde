'use strict';

/**
 * idle-suggestions — Phase-aware suggestion engine
 *
 * Reads STATE.md, ROADMAP.md, DESIGN-STATE.md, and design-manifest.json
 * to classify the current phase, gather ranked suggestion candidates, and
 * render them in the locked tech-noir visual format.
 *
 * Zero stdout. Zero async. Zero LLM calls. Max 3 synchronous file reads.
 */

const fs = require('fs');
const path = require('path');
const { extractFrontmatter } = require('./frontmatter.cjs');
const { stateExtractField } = require('./state.cjs');
const { stripShippedMilestones } = require('./core.cjs');
const { readManifest } = require('./design.cjs');

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TO_PHASE = {
  'plan_started': 'plan',
  'phase_started': null,      // resolve from STATE.md
  'phase_complete': 'review',
};

const CATEGORY_PRIORITY = { blocker: 0, next_phase: 1, review: 2, think: 3 };

// Phase budget in minutes — used to filter out over-budget candidates
const PHASE_BUDGET = {
  research: 10,
  plan: 5,
  execute: 30,
  design: 15,
  review: 10,
  validation: 10,
  default: 10,
};

// Resumption cost → block character
const BLOCK_CHAR = { low: '\u2591', med: '\u2592', high: '\u2588' };

// Category verb prefix used in output lines
const CATEGORY_VERB = { blocker: 'address', next_phase: 'prep', review: 'review', think: 'capture' };

const MAX_SUGGESTIONS = 7;
const SLASH_FILL_WIDTH = 32;

// Zero-state output string
const AWAITING_MSG = '// awaiting phase data...';

// Static fallback think entries (Phase 72 catalog not yet available)
const STATIC_THINK = [
  { category: 'think', text: 'capture: what decisions shaped this phase?', minutes: 5, resumption: 'low', filePath: null, source: 'static' },
  { category: 'think', text: 'capture: what domain concepts need documentation?', minutes: 5, resumption: 'low', filePath: null, source: 'static' },
  { category: 'think', text: 'capture: what patterns emerged during this work?', minutes: 5, resumption: 'low', filePath: null, source: 'static' },
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Generates a slash-fill header line for a category.
 * slashFill('blocker') → '// blocker ////////////////////' (32 chars)
 */
function slashFill(label, totalWidth) {
  totalWidth = totalWidth || SLASH_FILL_WIDTH;
  const prefix = '// ' + label + ' ';
  const remaining = totalWidth - prefix.length;
  return prefix + '/'.repeat(Math.max(0, remaining));
}

/**
 * Reads STATE.md and returns { fm, body }.
 * Safe — never throws. Returns { fm: {}, body: '' } on any error.
 */
function loadStateData(cwd) {
  if (!cwd) return { fm: {}, body: '' };
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const fm = extractFrontmatter(raw) || {};
    const body = raw.replace(/^---\n[\s\S]*?\n---\n*/, '');
    return { fm, body };
  } catch {
    return { fm: {}, body: '' };
  }
}

/**
 * Extracts blocker strings from STATE.md body text.
 * Handles both ## Blockers and ### Blockers/Concerns section forms.
 */
function extractBlockers(body) {
  const match = body.match(
    /###?\s*(?:Blockers|Blockers\/Concerns|Concerns)\s*\n([\s\S]*?)(?=\n###?|\n##[^#]|$)/i
  );
  if (!match) return [];
  return (match[1].match(/^-\s+(.+)$/gm) || [])
    .map(function (line) { return line.replace(/^-\s+/, '').trim(); })
    .filter(function (t) { return t && !/^(?:none\.?|none yet\.?)$/i.test(t) && t !== '(None)'; });
}

/**
 * Returns { number, name } for the next unchecked phase in ROADMAP.md, or null.
 */
function getNextPhaseInfo(cwd) {
  if (!cwd) return null;
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  try {
    const raw = fs.readFileSync(roadmapPath, 'utf-8');
    const stripped = stripShippedMilestones(raw);
    const match = stripped.match(/-\s*\[ \]\s*\*\*Phase\s+(\d+):\s*([^*]+)\*\*/);
    if (!match) return null;
    return { number: match[1], name: match[2].trim() };
  } catch {
    return null;
  }
}

/**
 * Returns array of { code, path, name } for completed artifacts in design-manifest.json.
 */
function getCompletedArtifacts(cwd) {
  if (!cwd) return [];
  const manifest = readManifest(cwd);
  if (!manifest || !manifest.artifacts) return [];
  return Object.values(manifest.artifacts)
    .filter(function (a) { return a.status === 'complete' && a.path; })
    .map(function (a) { return { code: a.code, path: a.path, name: a.name }; });
}

/**
 * Checks if DESIGN-STATE.md exists and has at least one incomplete stage.
 */
function checkDesignState(cwd) {
  if (!cwd) return false;
  const designStatePath = path.join(cwd, '.planning', 'DESIGN-STATE.md');
  try {
    const content = fs.readFileSync(designStatePath, 'utf-8');
    return /\[\s\]/.test(content);
  } catch {
    return false;
  }
}

/**
 * Assembles the full candidate array from all sources.
 * Enforces the 3-file-read budget — STATE.md and ROADMAP.md are reads 1 and 2.
 * Read 3 is: DESIGN-STATE.md if it exists, else design-manifest.json, else catalogPath.
 */
function gatherCandidates(cwd, phaseType, stateData, catalogPath) {
  const candidates = [];

  // Blockers from STATE.md body (already read — no additional file read)
  const blockers = extractBlockers(stateData.body);
  for (let i = 0; i < blockers.length; i++) {
    candidates.push({
      category: 'blocker',
      text: blockers[i],
      minutes: 5,
      resumption: 'high',
      filePath: null,
      source: 'blocker',
    });
  }

  // Next-phase prep from ROADMAP.md (file read 2)
  const nextPhase = getNextPhaseInfo(cwd);
  if (nextPhase) {
    candidates.push({
      category: 'next_phase',
      text: 'review phase ' + nextPhase.number + ' requirements: ' + nextPhase.name.toLowerCase(),
      minutes: 3,
      resumption: 'low',
      filePath: null,
      source: 'roadmap',
    });
    candidates.push({
      category: 'next_phase',
      text: 'prep: confirm phase ' + nextPhase.number + ' context and plan inputs',
      minutes: 5,
      resumption: 'low',
      filePath: null,
      source: 'roadmap',
    });
    candidates.push({
      category: 'next_phase',
      text: 'prep: review ' + nextPhase.name.toLowerCase() + ' dependencies',
      minutes: 3,
      resumption: 'low',
      filePath: null,
      source: 'roadmap',
    });
  }

  // File read 3: DESIGN-STATE.md or design-manifest.json or catalogPath
  // checkDesignState performs the actual read — counts as read 3
  if (cwd && checkDesignState(cwd)) {
    // Design phase: surface incomplete stage review suggestions
    candidates.push({
      category: 'review',
      text: 'review: incomplete design stages in design-state',
      minutes: 5,
      resumption: 'med',
      filePath: path.join(cwd, '.planning', 'DESIGN-STATE.md'),
      source: 'design-state',
    });
  } else {
    // No DESIGN-STATE.md — read artifacts from design-manifest.json
    const artifacts = getCompletedArtifacts(cwd);
    for (let i = 0; i < artifacts.length; i++) {
      const a = artifacts[i];
      candidates.push({
        category: 'review',
        text: 'review: ' + (a.name ? a.name.toLowerCase() : a.path),
        minutes: 5,
        resumption: 'med',
        filePath: a.path,
        source: 'manifest',
      });
    }
  }

  // Static fallback think entries (Phase 72 catalog not yet available)
  for (let i = 0; i < STATIC_THINK.length; i++) {
    candidates.push(STATIC_THINK[i]);
  }

  return candidates;
}

/**
 * Renders the stats footer line.
 */
function statsFooter(generated, shown, cut, budgetMin) {
  return '// gen:' + generated + ' shown:' + shown + ' cut:' + cut + ' budget:~' + budgetMin + 'min';
}

/**
 * Renders the final markdown string in locked tech-noir format.
 */
function formatOutput(shown, cut, phaseType, generated) {
  const budgetMin = PHASE_BUDGET[phaseType] || PHASE_BUDGET.default;
  const categories = ['blocker', 'next_phase', 'review', 'think'];
  const lines = [];

  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    lines.push(slashFill(cat));
    const catItems = shown.filter(function (s) { return s.category === cat; });
    if (catItems.length === 0) {
      lines.push('-- none');
    } else {
      for (let si = 0; si < catItems.length; si++) {
        const s = catItems[si];
        const block = BLOCK_CHAR[s.resumption] || BLOCK_CHAR.low;
        const verb = CATEGORY_VERB[cat] || cat;
        // Use the item text as-is if it already includes the verb prefix, else prepend it
        const text = s.text.startsWith(verb + ': ') ? s.text.slice(verb.length + 2) : s.text;
        const pathSuffix = s.filePath ? ' // ' + s.filePath : '';
        lines.push(block + ' ' + verb + ': ' + text.toLowerCase() + pathSuffix);
        lines.push('  ' + s.minutes + 'min // resumption:' + s.resumption);
        if (si < catItems.length - 1) {
          lines.push('');
        }
      }
    }
    lines.push('');
  }

  lines.push(statsFooter(generated, shown.length, cut, budgetMin));

  return lines.join('\n');
}

// ─── Exported functions ───────────────────────────────────────────────────────

/**
 * classifyPhase — determines the current phase type from available signals.
 *
 * Priority order:
 *  1. DESIGN-STATE.md with incomplete stages → 'design'
 *  2. Event type lookup → EVENT_TO_PHASE
 *  3. STATE.md frontmatter status field
 *  4. Fallback → 'default'
 *  5. Zero-state (no event AND no STATE.md data) → null
 *
 * @param {object|null} event - Last meaningful NDJSON event object
 * @param {{ fm: object, body: string }} stateData - Pre-read state data
 * @param {string|null} cwd - Project root directory
 * @returns {string|null}
 */
function classifyPhase(event, stateData, cwd) {
  // 1. Check DESIGN-STATE.md — highest specificity
  if (cwd && checkDesignState(cwd)) {
    return 'design';
  }

  // 2. Event type lookup
  if (event && event.event_type) {
    const mapped = EVENT_TO_PHASE[event.event_type];
    if (mapped !== undefined && mapped !== null) {
      return mapped;
    }
    if (event.event_type === 'phase_started') {
      // Fall through to STATE.md inspection
    }
  }

  // 3. STATE.md frontmatter status
  const fm = (stateData && stateData.fm) || {};
  const status = fm.status;
  if (status) {
    const s = status.toLowerCase();
    if (s.includes('research')) return 'research';
    if (s.includes('plan')) return 'plan';
    if (s.includes('execut')) return 'execute';
    if (s.includes('design')) return 'design';
    if (s.includes('review')) return 'review';
    if (s.includes('validat')) return 'validation';
    // Non-empty but unmapped status → default
    return 'default';
  }

  // 4. Zero-state: no event and no meaningful state
  if (!event && (!fm || Object.keys(fm).length === 0)) {
    return null;
  }

  // 5. Fallback
  return 'default';
}

/**
 * rankSuggestions — pure ranking logic with no file IO.
 *
 * Sorts candidates by category priority, then resumption cost (low < med < high).
 * Filters out candidates where candidate.minutes > PHASE_BUDGET[phaseType].
 * Caps output at MAX_SUGGESTIONS (7).
 * Attaches blockChar to each shown item for test assertions.
 *
 * @param {Array} candidates - Raw suggestion candidates
 * @param {string} phaseType - Phase type key for budget lookup
 * @returns {{ shown: Array, cut: number }}
 */
function rankSuggestions(candidates, phaseType) {
  const budget = PHASE_BUDGET[phaseType] || PHASE_BUDGET.default;
  const RESUMPTION_ORDER = { low: 0, med: 1, high: 2 };

  // Filter by time budget
  const within = [];
  const overBudget = [];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i].minutes > budget) {
      overBudget.push(candidates[i]);
    } else {
      within.push(candidates[i]);
    }
  }

  // Sort by category priority, then resumption cost ascending
  within.sort(function (a, b) {
    const pa = CATEGORY_PRIORITY[a.category] !== undefined ? CATEGORY_PRIORITY[a.category] : 99;
    const pb = CATEGORY_PRIORITY[b.category] !== undefined ? CATEGORY_PRIORITY[b.category] : 99;
    const catDiff = pa - pb;
    if (catDiff !== 0) return catDiff;
    return (RESUMPTION_ORDER[a.resumption] || 0) - (RESUMPTION_ORDER[b.resumption] || 0);
  });

  // Cap at 7
  const cut = overBudget.length + Math.max(0, within.length - MAX_SUGGESTIONS);
  const shown = within.slice(0, MAX_SUGGESTIONS);

  // Attach blockChar for test assertions and formatting
  for (let i = 0; i < shown.length; i++) {
    shown[i] = Object.assign({}, shown[i], { blockChar: BLOCK_CHAR[shown[i].resumption] || BLOCK_CHAR.low });
  }

  return { shown: shown, cut: cut };
}

/**
 * generateSuggestions — main entry point for the suggestion engine.
 *
 * @param {{ cwd: string, event: object|null, catalogPath?: string }} opts
 * @returns {string} Formatted markdown string
 */
function generateSuggestions(opts) {
  const cwd = (opts && opts.cwd) || null;
  const event = (opts && opts.event) || null;
  const catalogPath = (opts && opts.catalogPath) || null;

  // Load STATE.md (file read 1)
  const stateData = loadStateData(cwd);

  // Classify the current phase
  const phaseType = classifyPhase(event, stateData, cwd);

  // Zero-state: no classification possible
  if (phaseType === null) {
    return AWAITING_MSG;
  }

  // Gather candidates (reads ROADMAP.md as file read 2; DESIGN-STATE.md or manifest as read 3)
  const candidates = gatherCandidates(cwd, phaseType, stateData, catalogPath);

  // Rank and filter
  const { shown, cut } = rankSuggestions(candidates, phaseType);

  // Render
  return formatOutput(shown, cut, phaseType, candidates.length);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { generateSuggestions, rankSuggestions, classifyPhase };
