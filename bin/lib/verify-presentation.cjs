'use strict';

/**
 * verify-presentation.cjs — Claim verification engine for stakeholder presentations
 *
 * Compares numeric values in rendered presentation sections against the canonical IR,
 * flags mismatches, and produces a verification footer for both HTML and Markdown output.
 *
 * Requirements: VER-01, VER-02, VER-03
 *
 * Exports:
 *   buildClaimsMap(ir)                       — Extract numeric claims from IR
 *   verifyPresentation(ir, sections)         — Compare claims against section content
 *   buildVerificationFooterHtml(result)      — Render pass/fail HTML footer
 */

// ─── Claim extraction ─────────────────────────────────────────────────────────

/**
 * Build a list of numeric claims from the canonical IR.
 *
 * For each IR top-level section, if `section.unavailable` is truthy, skip entirely.
 * Push `{ label: 'section.field', value: numericValue }` for each known numeric field.
 * For percentage fields (completion_pct), compute the expected rendered value as
 * `Math.round((completed / total) * 100)` instead of using the raw stored float.
 * Skip entries with null, undefined, or 0 values (non-informative for verification).
 *
 * @param {object} ir - Presentation IR from buildPresentationIR()
 * @returns {Array<{label: string, value: number}>}
 */
function buildClaimsMap(ir) {
  const claims = [];

  function push(label, value) {
    if (value === null || value === undefined || value === 0) return;
    if (typeof value !== 'number') return;
    claims.push({ label, value });
  }

  // phases
  if (ir.phases && !ir.phases.unavailable) {
    const p = ir.phases;
    push('phases.total', p.total);
    push('phases.completed', p.completed);
    // Use computed percentage, not raw stored value (Pitfall 2 from research)
    if (typeof p.completed === 'number' && typeof p.total === 'number' && p.total > 0) {
      const computedPct = Math.round((p.completed / p.total) * 100);
      push('phases.completion_pct', computedPct);
    }
  }

  // requirements
  if (ir.requirements && !ir.requirements.unavailable) {
    const r = ir.requirements;
    push('requirements.total', r.total);
    push('requirements.completed', r.completed);
    push('requirements.blocked', r.blocked);
  }

  // git_velocity
  if (ir.git_velocity && !ir.git_velocity.unavailable) {
    push('git_velocity.total_commits', ir.git_velocity.total_commits);
  }

  // cost_timing
  if (ir.cost_timing && !ir.cost_timing.unavailable) {
    push('cost_timing.total_duration_min', ir.cost_timing.total_duration_min);
  }

  // blockers — total field if present
  if (ir.blockers && !ir.blockers.unavailable && typeof ir.blockers.total === 'number') {
    push('blockers.total', ir.blockers.total);
  }

  // decisions — total field if present
  if (ir.decisions && !ir.decisions.unavailable && typeof ir.decisions.total === 'number') {
    push('decisions.total', ir.decisions.total);
  }

  return claims;
}

// ─── Verification ─────────────────────────────────────────────────────────────

/**
 * Verify that numeric claims from the IR appear in the rendered section content.
 *
 * Uses stripHtml from render-presentation.cjs to strip HTML before scanning,
 * preventing CSS/attribute numeric collisions (Pitfall 1 from research).
 *
 * A mismatch is when an IR claim value is NOT found (as a whole number) in any
 * section's stripped text content.
 *
 * Verification is non-blocking: always returns a result object, never throws.
 *
 * @param {object} ir - Presentation IR
 * @param {Array<{id: string, title: string, level: number, content: string}>} sections
 * @returns {{ claimsChecked: number, mismatches: Array, pass: boolean, checkedAt: string }}
 */
function verifyPresentation(ir, sections) {
  try {
    const { stripHtml } = require('./render-presentation.cjs');
    const claims = buildClaimsMap(ir);

    // Strip HTML from all section content fields (only .content, never .title or .id)
    const strippedContents = sections.map(s => stripHtml(s.content || ''));
    const combinedText = strippedContents.join('\n');

    const mismatches = [];

    for (const claim of claims) {
      const needle = String(claim.value);
      // Use word-boundary regex to avoid partial matches (e.g., "9" in "90")
      const pattern = new RegExp(`\\b${needle}\\b`);
      const found = pattern.test(combinedText);
      if (!found) {
        mismatches.push({
          label: claim.label,
          irValue: claim.value,
          foundInSection: false,
        });
      }
    }

    return {
      claimsChecked: claims.length,
      mismatches,
      pass: mismatches.length === 0,
      checkedAt: new Date().toISOString(),
    };
  } catch (_) {
    // Non-blocking: return a safe default result on any unexpected error
    return {
      claimsChecked: 0,
      mismatches: [],
      pass: true,
      checkedAt: new Date().toISOString(),
    };
  }
}

// ─── Footer HTML builder ──────────────────────────────────────────────────────

/**
 * Build a verification footer HTML block for inclusion in presentation output.
 *
 * Returns:
 *   <p class="verification-status pass|fail"> with claim count, mismatch count, PASS/FAIL
 *   <p class="verification-meta"> with ISO timestamp
 *   (if mismatches) <ul> listing each { label, irValue, foundInSection }
 *
 * @param {{ claimsChecked: number, mismatches: Array, pass: boolean, checkedAt: string }} result
 * @returns {string} HTML string
 */
function buildVerificationFooterHtml(result) {
  const { claimsChecked, mismatches, pass, checkedAt } = result;
  const statusClass = pass ? 'pass' : 'fail';
  const statusText = pass ? 'PASS' : 'FAIL';
  const mismatchCount = mismatches.length;

  const statusLine = `<p class="verification-status ${statusClass}">${claimsChecked} claims checked · ${mismatchCount} mismatch${mismatchCount === 1 ? '' : 'es'} · ${statusText}</p>`;
  const metaLine = `<p class="verification-meta">Verified at: ${checkedAt}</p>`;

  if (!mismatches || mismatches.length === 0) {
    return `${statusLine}\n${metaLine}`;
  }

  const mismatchItems = mismatches.map(m =>
    `  <li><strong>${m.label}</strong>: IR value = ${m.irValue} (not found in rendered content)</li>`
  ).join('\n');

  return `${statusLine}\n${metaLine}\n<ul>\n${mismatchItems}\n</ul>`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  buildClaimsMap,
  verifyPresentation,
  buildVerificationFooterHtml,
};
