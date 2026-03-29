'use strict';

/**
 * app-wrappers/index.cjs — Slug-to-wrapper-module registry
 *
 * Maps slug strings to wrapper module paths.
 * Lazy-loads wrapper modules on demand via require().
 * Extensible: add new wrappers by adding entries to WRAPPER_PATHS.
 */

// Lazy-loaded wrapper registry — each value is a require path relative to this file
const WRAPPER_PATHS = {
  blender: './blender-wrapper.cjs',
  gimp: './gimp-wrapper.cjs',
  inkscape: './inkscape-wrapper.cjs',
};

/**
 * Get a wrapper module by slug.
 *
 * @param {string} slug - Wrapper slug (e.g., 'blender', 'gimp', 'inkscape')
 * @returns {object|null} Wrapper module or null if not found
 */
function getWrapper(slug) {
  const wrapperPath = WRAPPER_PATHS[slug];
  if (!wrapperPath) return null;
  return require(wrapperPath);
}

/**
 * List all registered wrapper slugs.
 *
 * @returns {string[]} Array of slug strings
 */
function listSlugs() {
  return Object.keys(WRAPPER_PATHS);
}

module.exports = { getWrapper, listSlugs, WRAPPER_PATHS };
