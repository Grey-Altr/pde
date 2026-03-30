'use strict';
/**
 * charts.cjs — SVG chart generators for PDE presentations
 *
 * Phase 179: CHT-01 through CHT-04
 *
 * All charts:
 * - Return inline SVG strings (no external deps, no JS, no external URLs)
 * - Include role="img", aria-labelledby, xmlns, viewBox, <title> for accessibility
 * - Append a <details> fallback data table as a sibling element
 * - Handle unavailable/empty IR data by returning a placeholder SVG (never throw)
 * - Use hardcoded hex values (CSS variables are unreliable in SVG fill attributes)
 */

// ─── Design tokens (hardcoded hex, NOT CSS variables) ────────────────────────

const C = {
  bg:      '#161b22',
  text:    '#e6edf3',
  muted:   '#8b949e',
  accent:  '#58a6ff',
  success: '#3fb950',
  warning: '#d29922',
  danger:  '#f85149',
  border:  '#30363d',
};

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Escape a string for safe use in SVG attribute context.
 * @param {string} str
 * @returns {string}
 */
function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Map a data value to an SVG y coordinate.
 * SVG y is inverted: higher value = lower y (closer to yTop).
 * @param {number} value
 * @param {number} minVal
 * @param {number} maxVal
 * @param {number} yTop - SVG y for maxVal
 * @param {number} yBottom - SVG y for minVal
 * @returns {number}
 */
function mapY(value, minVal, maxVal, yTop, yBottom) {
  if (maxVal === minVal) return yBottom;
  const ratio = (value - minVal) / (maxVal - minVal);
  return yBottom - ratio * (yBottom - yTop);
}

/**
 * Map an index to an SVG x coordinate within a range.
 * @param {number} index
 * @param {number} count - total number of items
 * @param {number} xLeft
 * @param {number} xRight
 * @returns {number}
 */
function mapX(index, count, xLeft, xRight) {
  if (count <= 1) return (xLeft + xRight) / 2;
  return xLeft + (index / (count - 1)) * (xRight - xLeft);
}

/**
 * Return a 600x100 placeholder SVG with centered message text.
 * Always includes role="img", aria-labelledby, xmlns, viewBox, and <title>.
 * @param {string} message
 * @returns {string} SVG string
 */
function unavailableSvg(message) {
  const msg = escAttr(message || 'data unavailable');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 100" role="img" aria-labelledby="unavail-title-${msg.replace(/\s/g, '-').replace(/[^a-z0-9-]/gi, '')}">
  <title id="unavail-title-${msg.replace(/\s/g, '-').replace(/[^a-z0-9-]/gi, '')}">${msg}</title>
  <rect width="600" height="100" fill="${C.bg}" rx="4"/>
  <text x="300" y="50" text-anchor="middle" dominant-baseline="middle" fill="${C.muted}" font-family="-apple-system, sans-serif" font-size="14">${msg}</text>
</svg>`;
}

// ─── burndownChart (CHT-01) ───────────────────────────────────────────────────

/**
 * Burndown chart: line chart showing remaining requirements over time.
 *
 * @param {object} ir - Presentation IR
 * @returns {string} SVG + fallback table HTML string
 */
function burndownChart(ir) {
  // Guard: requirements unavailable
  if (!ir.requirements || ir.requirements.unavailable) {
    return unavailableSvg('requirements data unavailable');
  }
  // Guard: zero total
  if (!ir.requirements.total || ir.requirements.total === 0) {
    return unavailableSvg('insufficient data');
  }

  const total = ir.requirements.total;
  const completed = ir.requirements.completed || 0;
  const pending = total - completed;

  // Derive synthetic burndown from phase completion progress
  const phasesTotal = (ir.phases && !ir.phases.unavailable && ir.phases.total) || 5;
  const phasesCompleted = (ir.phases && !ir.phases.unavailable && ir.phases.completed) || 0;

  // Build synthetic data points: start at total, end at pending
  // Use phasesTotal+1 points to represent start through current
  const pointCount = Math.max(phasesCompleted + 1, 2);
  const points = [];
  for (let i = 0; i < pointCount; i++) {
    const progress = i / (pointCount - 1);
    const remaining = Math.round(total - progress * completed);
    points.push({ x: i, y: remaining, label: i === 0 ? 'Start' : `Phase ${i}` });
  }

  // SVG dimensions
  const W = 600, H = 300;
  const padLeft = 50, padRight = 20, padTop = 30, padBottom = 50;
  const xLeft = padLeft, xRight = W - padRight;
  const yTop = padTop, yBottom = H - padBottom;

  const minVal = 0;
  const maxVal = total;

  // Axis lines
  const axes = `
  <line x1="${xLeft}" y1="${yTop}" x2="${xLeft}" y2="${yBottom}" stroke="${C.border}" stroke-width="1"/>
  <line x1="${xLeft}" y1="${yBottom}" x2="${xRight}" y2="${yBottom}" stroke="${C.border}" stroke-width="1"/>`;

  // Y axis labels
  const yLabels = [0, Math.round(total / 2), total].map(v => {
    const y = mapY(v, minVal, maxVal, yTop, yBottom);
    return `<text x="${xLeft - 8}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="${C.muted}" font-size="11" font-family="-apple-system, sans-serif">${v}</text>`;
  }).join('\n  ');

  // Polyline points
  const polyPoints = points.map((p, i) => {
    const svgX = mapX(i, points.length, xLeft, xRight);
    const svgY = mapY(p.y, minVal, maxVal, yTop, yBottom);
    return `${svgX.toFixed(1)},${svgY.toFixed(1)}`;
  }).join(' ');

  // X axis labels (first and last only to avoid clutter)
  const xLabels = [0, points.length - 1].map(i => {
    const svgX = mapX(i, points.length, xLeft, xRight);
    return `<text x="${svgX.toFixed(1)}" y="${yBottom + 18}" text-anchor="middle" fill="${C.muted}" font-size="11" font-family="-apple-system, sans-serif">${escAttr(points[i].label)}</text>`;
  }).join('\n  ');

  // Data dots
  const dots = points.map((p, i) => {
    const svgX = mapX(i, points.length, xLeft, xRight);
    const svgY = mapY(p.y, minVal, maxVal, yTop, yBottom);
    return `<circle cx="${svgX.toFixed(1)}" cy="${svgY.toFixed(1)}" r="3" fill="${C.accent}"/>`;
  }).join('\n  ');

  // Chart title
  const chartTitle = `Requirements Burndown (${completed} of ${total} completed)`;

  // Fallback data table rows
  const tableRows = points.map(p =>
    `<tr><td>${escAttr(p.label)}</td><td>${p.y}</td></tr>`
  ).join('\n        ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="burndown-title">
  <title id="burndown-title">${escAttr(chartTitle)}</title>
  <rect width="${W}" height="${H}" fill="${C.bg}" rx="4"/>
  ${axes}
  ${yLabels}
  <polyline points="${polyPoints}" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linejoin="round"/>
  ${dots}
  ${xLabels}
  <text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="${C.muted}" font-size="11" font-family="-apple-system, sans-serif">Phase</text>
  <text x="${xLeft - 35}" y="${(yTop + yBottom) / 2}" text-anchor="middle" dominant-baseline="middle" fill="${C.muted}" font-size="11" font-family="-apple-system, sans-serif" transform="rotate(-90 ${xLeft - 35} ${(yTop + yBottom) / 2})">Remaining</text>
</svg>
<details class="chart-data-table">
  <summary>Data table: Burndown</summary>
  <table>
    <thead><tr><th>Phase</th><th>Remaining Requirements</th></tr></thead>
    <tbody>
        ${tableRows}
    </tbody>
  </table>
</details>`;
}

// ─── velocityChart (CHT-02) ───────────────────────────────────────────────────

/**
 * Velocity chart: bar chart showing completion per phase.
 *
 * @param {object} ir - Presentation IR
 * @returns {string} SVG + fallback table HTML string
 */
function velocityChart(ir) {
  // Guard: phases unavailable
  if (!ir.phases || ir.phases.unavailable) {
    return unavailableSvg('phase data unavailable');
  }

  const W = 600, H = 300;
  const padLeft = 50, padRight = 20, padTop = 30, padBottom = 60;
  const xLeft = padLeft, xRight = W - padRight;
  const yTop = padTop, yBottom = H - padBottom;

  let bars = [];

  // Use phase_list if available, else show summary bar
  if (Array.isArray(ir.phases.phase_list) && ir.phases.phase_list.length > 0) {
    bars = ir.phases.phase_list.map((p, i) => ({
      label: p.name.length > 20 ? `P${i + 1}` : escAttr(p.name),
      fullLabel: escAttr(p.name),
      value: p.completed ? 1 : 0,
      maxValue: 1,
      color: p.completed ? C.success : C.muted,
    }));
  } else {
    // Summary fallback: single bar showing completed/total ratio
    const completed = ir.phases.completed || 0;
    const total = ir.phases.total || 1;
    bars = [{ label: 'Phases', fullLabel: 'Phase Completion', value: completed, maxValue: total, color: C.success }];
  }

  const barCount = bars.length;
  const barSlotWidth = (xRight - xLeft) / barCount;
  const barPad = Math.max(2, barSlotWidth * 0.15);
  const barWidth = barSlotWidth - barPad * 2;
  const maxVal = Math.max(...bars.map(b => b.maxValue), 1);

  const barEls = bars.map((b, i) => {
    const bx = xLeft + i * barSlotWidth + barPad;
    const barH = Math.max(2, ((b.value / maxVal) * (yBottom - yTop)));
    const by = yBottom - barH;
    const labelX = bx + barWidth / 2;
    return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" fill="${b.color}" rx="2"/>
  <text x="${labelX.toFixed(1)}" y="${yBottom + 14}" text-anchor="middle" fill="${C.muted}" font-size="10" font-family="-apple-system, sans-serif">${b.label}</text>`;
  }).join('\n  ');

  // Y axis labels
  const yLabels = [0, maxVal].map(v => {
    const y = mapY(v, 0, maxVal, yTop, yBottom);
    return `<text x="${xLeft - 8}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" fill="${C.muted}" font-size="11" font-family="-apple-system, sans-serif">${v}</text>`;
  }).join('\n  ');

  // Axes
  const axes = `
  <line x1="${xLeft}" y1="${yTop}" x2="${xLeft}" y2="${yBottom}" stroke="${C.border}" stroke-width="1"/>
  <line x1="${xLeft}" y1="${yBottom}" x2="${xRight}" y2="${yBottom}" stroke="${C.border}" stroke-width="1"/>`;

  const chartTitle = `Phase Velocity (${ir.phases.completed || 0} of ${ir.phases.total || 0} phases completed)`;

  // Fallback table
  const tableRows = bars.map(b =>
    `<tr><td>${b.fullLabel}</td><td>${b.value} / ${b.maxValue}</td></tr>`
  ).join('\n        ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="velocity-title">
  <title id="velocity-title">${escAttr(chartTitle)}</title>
  <rect width="${W}" height="${H}" fill="${C.bg}" rx="4"/>
  ${axes}
  ${yLabels}
  ${barEls}
</svg>
<details class="chart-data-table">
  <summary>Data table: Velocity</summary>
  <table>
    <thead><tr><th>Phase</th><th>Completion</th></tr></thead>
    <tbody>
        ${tableRows}
    </tbody>
  </table>
</details>`;
}

// ─── phaseTimelineChart (CHT-03) ──────────────────────────────────────────────

/**
 * Phase timeline chart: horizontal bars showing phase durations.
 *
 * @param {object} ir - Presentation IR
 * @returns {string} SVG + fallback table HTML string
 */
function phaseTimelineChart(ir) {
  // Guard: cost_timing unavailable or zero phases with timing
  if (!ir.cost_timing || ir.cost_timing.unavailable) {
    return unavailableSvg('timing data unavailable');
  }
  if (!ir.cost_timing.phases_with_timing || ir.cost_timing.phases_with_timing === 0) {
    return unavailableSvg('timing data unavailable');
  }

  const totalMin = ir.cost_timing.total_duration_min || 0;
  const avgMin = ir.cost_timing.avg_duration_min || 0;
  const phasesWithTiming = ir.cost_timing.phases_with_timing || 1;

  // Build bar data — if phase_list with timing exists use it, otherwise use summary
  let bars = [];

  if (ir.phases && !ir.phases.unavailable &&
      Array.isArray(ir.phases.phase_list) && ir.phases.phase_list.length > 0 &&
      ir.phases.phase_list.some(p => p.duration_min != null)) {
    bars = ir.phases.phase_list
      .filter(p => p.duration_min != null)
      .map(p => ({ label: p.name.length > 25 ? p.name.slice(0, 22) + '...' : p.name, value: p.duration_min }));
  } else {
    // Summary: one bar per tracked phase at avg duration
    for (let i = 0; i < phasesWithTiming; i++) {
      bars.push({ label: `Phase ${i + 1}`, value: avgMin });
    }
  }

  const barCount = bars.length;
  const W = 600;
  const barH = 28;
  const barPadV = 6;
  const padLeft = 120, padRight = 60, padTop = 40, padBottom = 30;
  const rowH = barH + barPadV;
  const H = Math.max(200, padTop + barCount * rowH + padBottom);

  const xLeft = padLeft, xRight = W - padRight;
  const maxVal = Math.max(...bars.map(b => b.value), 1);

  const barEls = bars.map((b, i) => {
    const y = padTop + i * rowH;
    const bw = Math.max(2, (b.value / maxVal) * (xRight - xLeft));
    return `<rect x="${xLeft}" y="${y}" width="${bw.toFixed(1)}" height="${barH}" fill="${C.accent}" rx="2"/>
  <text x="${xLeft - 6}" y="${(y + barH / 2).toFixed(1)}" text-anchor="end" dominant-baseline="middle" fill="${C.muted}" font-size="11" font-family="-apple-system, sans-serif">${escAttr(b.label)}</text>
  <text x="${(xLeft + bw + 4).toFixed(1)}" y="${(y + barH / 2).toFixed(1)}" dominant-baseline="middle" fill="${C.text}" font-size="11" font-family="-apple-system, sans-serif">${b.value}m</text>`;
  }).join('\n  ');

  // Axis
  const axis = `<line x1="${xLeft}" y1="${padTop - 8}" x2="${xLeft}" y2="${H - padBottom}" stroke="${C.border}" stroke-width="1"/>`;

  const chartTitle = `Phase Timeline (total: ${totalMin}min, avg: ${avgMin}min)`;

  // Fallback table
  const tableRows = bars.map(b =>
    `<tr><td>${escAttr(b.label)}</td><td>${b.value} min</td></tr>`
  ).join('\n        ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="timeline-title">
  <title id="timeline-title">${escAttr(chartTitle)}</title>
  <rect width="${W}" height="${H}" fill="${C.bg}" rx="4"/>
  ${axis}
  ${barEls}
</svg>
<details class="chart-data-table">
  <summary>Data table: Phase Timeline</summary>
  <table>
    <thead><tr><th>Phase</th><th>Duration (min)</th></tr></thead>
    <tbody>
        ${tableRows}
    </tbody>
  </table>
</details>`;
}

// ─── effortBreakdownChart (CHT-04) ────────────────────────────────────────────

/**
 * Effort breakdown chart: horizontal stacked bars per requirement category.
 * Each bar shows completed (accent) vs remaining (muted) requirements.
 *
 * @param {object} ir - Presentation IR
 * @returns {string} SVG + fallback table HTML string
 */
function effortBreakdownChart(ir) {
  // Guard: requirements unavailable
  if (!ir.requirements || ir.requirements.unavailable) {
    return unavailableSvg('requirements data unavailable');
  }

  const categories = ir.requirements.categories;

  // Guard: empty/missing categories
  if (!Array.isArray(categories) || categories.length === 0) {
    return unavailableSvg('insufficient data');
  }

  const W = 600;
  const barH = 28;
  const barPadV = 8;
  const padLeft = 100, padRight = 40, padTop = 40, padBottom = 20;
  const rowH = barH + barPadV;
  const H = Math.max(200, padTop + categories.length * rowH + padBottom);

  const xLeft = padLeft, xRight = W - padRight;
  const maxVal = Math.max(...categories.map(c => c.total || 0), 1);

  const barEls = categories.map((cat, i) => {
    const y = padTop + i * rowH;
    const total = cat.total || 0;
    const done = Math.min(cat.completed || 0, total);
    const remaining = total - done;
    const totalWidth = (total / maxVal) * (xRight - xLeft);
    const doneWidth = total > 0 ? (done / total) * totalWidth : 0;
    const remainWidth = totalWidth - doneWidth;

    const doneRect = doneWidth > 0
      ? `<rect x="${xLeft}" y="${y}" width="${doneWidth.toFixed(1)}" height="${barH}" fill="${C.success}" rx="2"/>`
      : '';
    const remainRect = remainWidth > 0
      ? `<rect x="${(xLeft + doneWidth).toFixed(1)}" y="${y}" width="${remainWidth.toFixed(1)}" height="${barH}" fill="${C.muted}" rx="2"/>`
      : '';

    return `${doneRect}
  ${remainRect}
  <text x="${xLeft - 6}" y="${(y + barH / 2).toFixed(1)}" text-anchor="end" dominant-baseline="middle" fill="${C.muted}" font-size="11" font-family="-apple-system, sans-serif">${escAttr(cat.name || `Cat ${i + 1}`)}</text>
  <text x="${(xLeft + totalWidth + 4).toFixed(1)}" y="${(y + barH / 2).toFixed(1)}" dominant-baseline="middle" fill="${C.text}" font-size="11" font-family="-apple-system, sans-serif">${done}/${total}</text>`;
  }).join('\n  ');

  // Legend
  const legendY = H - 12;
  const legend = `
  <rect x="${xLeft}" y="${legendY - 10}" width="12" height="12" fill="${C.success}" rx="2"/>
  <text x="${xLeft + 16}" y="${legendY}" fill="${C.muted}" font-size="11" font-family="-apple-system, sans-serif">Completed</text>
  <rect x="${xLeft + 90}" y="${legendY - 10}" width="12" height="12" fill="${C.muted}" rx="2"/>
  <text x="${xLeft + 106}" y="${legendY}" fill="${C.muted}" font-size="11" font-family="-apple-system, sans-serif">Remaining</text>`;

  const chartTitle = `Effort Breakdown by Category (${categories.length} categories)`;

  // Fallback table
  const tableRows = categories.map(cat =>
    `<tr><td>${escAttr(cat.name || '')}</td><td>${cat.completed || 0}</td><td>${cat.total || 0}</td></tr>`
  ).join('\n        ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="effort-title">
  <title id="effort-title">${escAttr(chartTitle)}</title>
  <rect width="${W}" height="${H}" fill="${C.bg}" rx="4"/>
  ${barEls}
  ${legend}
</svg>
<details class="chart-data-table">
  <summary>Data table: Effort Breakdown</summary>
  <table>
    <thead><tr><th>Category</th><th>Completed</th><th>Total</th></tr></thead>
    <tbody>
        ${tableRows}
    </tbody>
  </table>
</details>`;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  burndownChart,
  velocityChart,
  phaseTimelineChart,
  effortBreakdownChart,
};
