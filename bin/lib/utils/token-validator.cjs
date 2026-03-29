'use strict';

/**
 * token-validator.cjs -- DTCG design token validation with OKLCH gamut and APCA contrast checks.
 *
 * Provides:
 *   - validateTokens()      -- Recursively validate DTCG token tree for schema completeness
 *   - checkOklchGamut()     -- Check if an OKLCH color value is within P3/sRGB gamut
 *   - checkApcaContrast()   -- Check APCA contrast ratio between text and background colors
 *   - runTokenValidation()  -- Orchestrate all checks, return structured JSON report + markdown
 *
 * Follows the DTCG 2025.10 spec: $value and $type are required fields on leaf tokens.
 * Naming convention: tokens must follow {group}.{token} pattern (no root-level tokens).
 *
 * APCA ordering: first arg is always text (foreground), second is background.
 * See: https://www.npmjs.com/package/apca-w3 — calcAPCA is directional (not commutative).
 *
 * Requirements: UTL-02, UTL-03
 */

const { calcAPCA } = require('apca-w3');
const Color = require('colorjs.io').default;

// APCA contrast thresholds (per CONTEXT.md decisions)
const BODY_TEXT_LC_THRESHOLD = 60;  // |Lc| >= 60 for body text
const LARGE_TEXT_LC_THRESHOLD = 45; // |Lc| >= 45 for large text

// ---------------------------------------------------------------------------
// validateTokens(tokens, prefix, violations)
// ---------------------------------------------------------------------------
/**
 * Recursively walk a DTCG token tree and collect schema + naming violations.
 *
 * Follows the dtcgToCssLines pattern from bin/lib/design.cjs:
 *   - Skip keys starting with '$' (spec metadata keys)
 *   - Leaf nodes have $value present
 *   - Non-leaf nodes are nested groups → recurse with dot-separated prefix
 *
 * @param {object} tokens     - DTCG token tree (or subtree)
 * @param {string} [prefix]   - Accumulated group prefix (e.g. 'color.' for nested groups)
 * @param {Array}  [violations] - Accumulated violations array
 * @returns {Array<{token: string, issue: string}>} All violations found
 */
function validateTokens(tokens, prefix, violations) {
  prefix = prefix || '';
  violations = violations || [];

  for (const key of Object.keys(tokens)) {
    if (key.startsWith('$')) continue; // skip spec metadata keys ($description, $version, etc.)

    const node = tokens[key];

    if (node && typeof node === 'object' && '$value' in node) {
      // Leaf token — validate
      const tokenPath = prefix + key;

      // Check 1: $type must be present
      if (!node.$type) {
        violations.push({ token: tokenPath, issue: 'missing $type' });
      }

      // Check 2: naming convention — must be {group}.{token} (path must include a dot)
      if (!tokenPath.includes('.')) {
        violations.push({ token: tokenPath, issue: 'naming: must be {group}.{token}' });
      }
    } else if (node && typeof node === 'object') {
      // Non-leaf group — recurse with dot-separated prefix
      validateTokens(node, prefix + key + '.', violations);
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// checkOklchGamut(colorValue)
// ---------------------------------------------------------------------------
/**
 * Check if a color value is within P3 and sRGB gamut using colorjs.io.
 *
 * Accepts CSS color strings including oklch(L C H) format.
 * Uses try/catch to handle unparseable values gracefully.
 *
 * @param {string} colorValue - CSS color string (e.g. 'oklch(0.7 0.2 120)', '#ff0000')
 * @returns {{ inP3: boolean, inSrgb: boolean } | { error: 'parse-error' }}
 */
function checkOklchGamut(colorValue) {
  try {
    const c = new Color(colorValue);
    return {
      inP3: c.inGamut('p3'),
      inSrgb: c.inGamut('srgb'),
    };
  } catch (_) {
    return { error: 'parse-error' };
  }
}

// ---------------------------------------------------------------------------
// checkApcaContrast(textColor, bgColor)
// ---------------------------------------------------------------------------
/**
 * Check APCA contrast between a text color and background color.
 *
 * IMPORTANT: First argument MUST be the text (foreground) color.
 * calcAPCA is directional — swapping args returns opposite polarity.
 *
 * Thresholds:
 *   |Lc| >= 60 for body text (normal size/weight)
 *   |Lc| >= 45 for large text (>18pt or bold >14pt)
 *
 * @param {string} textColor - Foreground (text) color as hex string (e.g. '#333333')
 * @param {string} bgColor   - Background color as hex string (e.g. '#ffffff')
 * @returns {{ Lc: number, bodyPass: boolean, largePass: boolean }}
 */
function checkApcaContrast(textColor, bgColor) {
  const Lc = calcAPCA(textColor, bgColor);
  const absLc = Math.abs(Lc);
  return {
    Lc,
    bodyPass: absLc >= BODY_TEXT_LC_THRESHOLD,
    largePass: absLc >= LARGE_TEXT_LC_THRESHOLD,
  };
}

// ---------------------------------------------------------------------------
// runTokenValidation(tokens)
// ---------------------------------------------------------------------------
/**
 * Orchestrate all validation checks on a DTCG token tree.
 *
 * Steps:
 *   1. Run validateTokens() for schema + naming violations
 *   2. Walk color tokens ($type === 'color') and check OKLCH gamut
 *   3. Find text/bg pairs by group name heuristic and check APCA contrast
 *   4. Build violations array with { token, issue, details }
 *   5. Build markdown summary table
 *   6. Return { violations, summary, stats }
 *
 * @param {object} tokens - DTCG token tree
 * @returns {{ violations: Array, summary: string, stats: { total, passed, failed } }}
 */
function runTokenValidation(tokens) {
  const violations = [];

  // Step 1: Schema + naming validation
  const schemaViolations = validateTokens(tokens);
  for (const v of schemaViolations) {
    violations.push({ token: v.token, issue: v.issue, details: null });
  }

  // Step 2: OKLCH gamut checks for color tokens
  const colorTokens = collectColorTokens(tokens, '');
  for (const { path, value } of colorTokens) {
    if (typeof value === 'string' && value.includes('oklch')) {
      const gamut = checkOklchGamut(value);
      if (gamut.error) {
        violations.push({
          token: path,
          issue: 'gamut: parse-error',
          details: `Could not parse color value: ${value}`,
        });
      } else if (!gamut.inP3) {
        violations.push({
          token: path,
          issue: 'gamut: outside P3',
          details: `Color ${value} is outside P3 gamut (inSrgb: ${gamut.inSrgb})`,
        });
      }
    }
  }

  // Step 3: APCA contrast checks for text/bg pairs
  // Heuristic: tokens with 'text' or 'fg' in group name are text colors
  //            tokens with 'bg' or 'surface' in group name are background colors
  const textTokens = colorTokens.filter(t => /text|fg/i.test(t.path));
  const bgTokens = colorTokens.filter(t => /bg|surface|background/i.test(t.path));

  for (const textToken of textTokens) {
    for (const bgToken of bgTokens) {
      try {
        const { Lc, bodyPass, largePass } = checkApcaContrast(textToken.value, bgToken.value);
        if (!bodyPass) {
          violations.push({
            token: `${textToken.path} on ${bgToken.path}`,
            issue: `contrast: below body text threshold (${BODY_TEXT_LC_THRESHOLD} Lc)`,
            details: `Lc=${Lc.toFixed(1)} — bodyPass: ${bodyPass}, largePass: ${largePass}`,
          });
        }
      } catch (_) {
        // Skip pairs where color parsing fails (e.g. non-hex OKLCH values)
      }
    }
  }

  // Step 4: Build stats
  const totalTokens = colorTokens.length;
  const failedTokens = new Set(violations.map(v => v.token)).size;
  const stats = {
    total: totalTokens,
    passed: Math.max(0, totalTokens - failedTokens),
    failed: failedTokens,
  };

  // Step 5: Build markdown summary table
  let summary;
  if (violations.length === 0) {
    summary = `## Token Validation Summary\n\n**All tokens valid.** No violations found.\n`;
  } else {
    summary = `## Token Validation Summary\n\n`;
    summary += `| Token | Issue | Details |\n`;
    summary += `|-------|-------|--------|\n`;
    for (const v of violations) {
      const details = v.details ? v.details.replace(/\|/g, '\\|') : '—';
      summary += `| \`${v.token}\` | ${v.issue} | ${details} |\n`;
    }
    summary += `\n**${violations.length} violation(s) found.**\n`;
  }

  return { violations, summary, stats };
}

// ---------------------------------------------------------------------------
// collectColorTokens (internal helper)
// ---------------------------------------------------------------------------
/**
 * Collect all tokens with $type === 'color' or string $value, returning { path, value } pairs.
 *
 * @param {object} tokens
 * @param {string} prefix
 * @returns {Array<{path: string, value: string}>}
 */
function collectColorTokens(tokens, prefix) {
  const result = [];
  for (const key of Object.keys(tokens)) {
    if (key.startsWith('$')) continue;
    const node = tokens[key];
    if (node && typeof node === 'object' && '$value' in node) {
      if (node.$type === 'color' || typeof node.$value === 'string') {
        result.push({ path: prefix + key, value: node.$value });
      }
    } else if (node && typeof node === 'object') {
      result.push(...collectColorTokens(node, prefix + key + '.'));
    }
  }
  return result;
}

module.exports = { validateTokens, checkOklchGamut, checkApcaContrast, runTokenValidation };
