'use strict';

/**
 * social-default.cjs — Default social card template for Satori.
 *
 * Accepts width/height for platform-specific sizing.
 * Returns a plain object tree (React-element-like) consumable by satori().
 */

/**
 * Default social card template.
 *
 * @param {object} opts
 * @param {string} opts.title         - Product/page title
 * @param {string} [opts.description] - Short description
 * @param {number} [opts.width]       - Canvas width (platform-specific)
 * @param {number} [opts.height]      - Canvas height (platform-specific)
 * @param {string} [opts.brandColor]  - Brand accent color (hex). Default: indigo #6366f1
 * @returns {object} Satori element tree
 */
function socialDefault({ title, description, width, height, brandColor = '#6366f1' }) {
  // Scale font size slightly based on canvas height
  const titleSize = height && height < 630 ? 56 : 60;
  const descSize = height && height < 630 ? 24 : 26;

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        width: '100%',
        height: '100%',
        padding: '52px',
        background: brandColor,
        fontFamily: 'Inter',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              fontSize: titleSize,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.15,
            },
            children: title || '',
          },
        },
        description
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: descSize,
                  color: 'rgba(255,255,255,0.8)',
                  marginTop: 16,
                },
                children: description,
              },
            }
          : null,
      ].filter(Boolean),
    },
  };
}

module.exports = { socialDefault };
