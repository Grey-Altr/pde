'use strict';

/**
 * og-default.cjs — Default OG image template for Satori.
 *
 * Returns a plain object tree (React-element-like) consumable by satori().
 * No JSX transpiler required — uses the object-literal form.
 */

/**
 * Default OG image template.
 *
 * @param {object} opts
 * @param {string} opts.title        - Product/page title
 * @param {string} [opts.description] - Short description
 * @param {string} [opts.brandColor]  - Brand accent color (hex). Default: indigo #6366f1
 * @returns {object} Satori element tree
 */
function ogDefault({ title, description, brandColor = '#6366f1' }) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        width: '100%',
        height: '100%',
        padding: '60px',
        background: brandColor,
        fontFamily: 'Inter',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              fontSize: 64,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.1,
            },
            children: title || '',
          },
        },
        description
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: 28,
                  color: 'rgba(255,255,255,0.8)',
                  marginTop: 20,
                },
                children: description,
              },
            }
          : null,
      ].filter(Boolean),
    },
  };
}

module.exports = { ogDefault };
