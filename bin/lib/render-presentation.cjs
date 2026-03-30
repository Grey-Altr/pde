'use strict';

/**
 * render-presentation.cjs — Dual-format rendering engine for stakeholder presentations
 *
 * Consumes the IR from presentation.cjs buildPresentationIR() and produces
 * self-contained HTML (embedded CSS, no external URLs, no JavaScript) plus
 * a Markdown companion for each persona.
 *
 * Exports:
 *   escHtml(str)                        — HTML entity escaping
 *   embedImage(absolutePath)            — base64 data URI or null
 *   buildTOC(sections)                  — <nav class="toc"> HTML
 *   personaDisplayName(slug)            — slug → display name
 *   buildExecutiveSummary(ir)           — CLU-01: 7 sections
 *   buildCaseStudy(ir)                  — CLR-01: 6 sections
 *   renderHTML(ir, persona, sections)   — full self-contained HTML document
 *   renderMarkdown(ir, persona, sections) — ATX-headed Markdown companion
 *   render(ir, persona, htmlPath, mdPath) — orchestrator, writes both files
 *   cmdPresentationRender(cwd, persona, htmlPath, mdPath, irFilePath)
 */

const fs = require('fs');
const path = require('path');

// ─── 1. escHtml ───────────────────────────────────────────────────────────────

/**
 * Escape HTML entities for safe embedding in HTML body / attribute context.
 * Returns empty string for falsy input.
 */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── 2. stripHtml ─────────────────────────────────────────────────────────────

/**
 * Remove HTML tags from a string for Markdown output.
 * Also converts <br> / <br/> to newlines and normalises whitespace.
 */
function stripHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ─── 3. embedImage ────────────────────────────────────────────────────────────

/**
 * Read an image file and return a data URI string, or null if the file
 * does not exist.
 *
 * @param {string} absolutePath - Absolute path to image file
 * @returns {string|null}
 */
function embedImage(absolutePath) {
  if (!absolutePath || !fs.existsSync(absolutePath)) return null;
  const ext = path.extname(absolutePath).toLowerCase().replace('.', '');
  const mimeMap = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  const mime = mimeMap[ext] || 'image/png';
  const data = fs.readFileSync(absolutePath).toString('base64');
  return `data:${mime};base64,${data}`;
}

// ─── 4. buildTOC ─────────────────────────────────────────────────────────────

/**
 * Generate a <nav class="toc"> HTML block from a sections array.
 * Includes all sections with level <= 2.
 *
 * @param {Array<{id: string, title: string, level: number}>} sections
 * @returns {string} HTML nav block
 */
function buildTOC(sections) {
  const entries = sections.filter(s => s.level <= 2);
  const links = entries.map(s =>
    `    <li><a href="#${s.id}">${escHtml(s.title)}</a></li>`
  ).join('\n');
  return `<nav class="toc">
  <h2>Contents</h2>
  <ul>
${links}
  </ul>
</nav>`;
}

// ─── 5. personaDisplayName ───────────────────────────────────────────────────

/**
 * Map persona slug to human-readable display name.
 *
 * @param {string} slug - e.g. 'executive-summary'
 * @returns {string}
 */
function personaDisplayName(slug) {
  const names = {
    'executive-summary': 'Executive Summary',
    'case-study': 'Case Study / Portfolio Piece',
  };
  return names[slug] || slug;
}

// ─── Section builder helpers ─────────────────────────────────────────────────

/**
 * Sentinel check helper. Returns a "data unavailable" HTML paragraph
 * if the IR field carries unavailable: true.
 *
 * @param {object|undefined} irField
 * @param {string} label - Human-readable label for the notice
 * @returns {string|null} HTML string or null if field is available
 */
function sentinelHtml(irField, label) {
  if (irField && irField.unavailable) {
    const reason = escHtml(irField.reason || 'data not available');
    return `<p class="unavailable"><strong>${escHtml(label)} unavailable:</strong> ${reason}</p>`;
  }
  return null;
}

// ─── Executive summary section builders ──────────────────────────────────────

function buildOverview(ir) {
  const sentinel = sentinelHtml(ir.project, 'Project identity');
  if (sentinel) return sentinel;

  const name = escHtml(ir.project.name || 'Unknown Project');
  const coreValue = escHtml(ir.project.core_value || '');
  // Use first 300 chars of summary to stay under size budget
  const summary = escHtml((ir.project.summary || ir.project.goal || '').slice(0, 300));
  const productType = escHtml(ir.project.product_type || '');
  const targetUsers = escHtml(ir.project.target_users || '');

  return `<p class="lead"><strong>${name}</strong></p>
${coreValue ? `<p>${coreValue}</p>` : ''}
${summary ? `<p>${summary}</p>` : ''}
${productType ? `<p><strong>Product type:</strong> ${productType}</p>` : ''}
${targetUsers ? `<p><strong>Target users:</strong> ${targetUsers}</p>` : ''}`.trim();
}

function buildProgress(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const pct = typeof ir.phases.completion_pct === 'number' ? ir.phases.completion_pct : 0;
  const completed = ir.phases.completed || 0;
  const total = ir.phases.total || 0;

  const phaseRows = Array.isArray(ir.phases.phase_list)
    ? ir.phases.phase_list.slice(0, 10).map(p =>
        `<tr><td>${escHtml(p.name)}</td><td>${p.completed ? '✓' : '—'}</td></tr>`
      ).join('\n')
    : '';

  return `<p><strong>Completion:</strong> ${pct}% (${completed} of ${total} phases done)</p>
${phaseRows ? `<table>
  <thead><tr><th>Phase</th><th>Status</th></tr></thead>
  <tbody>${phaseRows}</tbody>
</table>` : ''}`.trim();
}

function buildRequirements(ir) {
  const sentinel = sentinelHtml(ir.requirements, 'Requirements');
  if (sentinel) return sentinel;

  const total = ir.requirements.total || 0;
  const completed = ir.requirements.completed || 0;
  const blocked = ir.requirements.blocked || 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const catRows = Array.isArray(ir.requirements.categories)
    ? ir.requirements.categories.map(c =>
        `<tr><td>${escHtml(c.name)}</td><td>${c.completed || 0}/${c.total || 0}</td></tr>`
      ).join('\n')
    : '';

  return `<p>${completed} of ${total} requirements complete (${pct}%) · ${blocked} blocked</p>
${catRows ? `<table>
  <thead><tr><th>Category</th><th>Completed/Total</th></tr></thead>
  <tbody>${catRows}</tbody>
</table>` : ''}`.trim();
}

function buildBlockers(ir) {
  const blockerSentinel = sentinelHtml(ir.blockers, 'Blockers');
  const riskSentinel = sentinelHtml(ir.risks, 'Risks');

  const blockerItems = (!blockerSentinel && Array.isArray(ir.blockers && ir.blockers.items))
    ? ir.blockers.items
    : [];
  const riskItems = (!riskSentinel && Array.isArray(ir.risks && ir.risks.items))
    ? ir.risks.items
    : [];

  if (blockerSentinel && riskSentinel) {
    return blockerSentinel + '\n' + riskSentinel;
  }

  const blockerList = blockerItems.length > 0
    ? `<h3>Blockers</h3><ul>${blockerItems.map(b => `<li>${escHtml(b.text || b)} <em>${escHtml(b.source || '')}</em></li>`).join('')}</ul>`
    : '<p>No active blockers.</p>';

  const riskList = riskItems.length > 0
    ? `<h3>Risks</h3><ul>${riskItems.map(r => `<li>${escHtml(r.text || r)} <em>${escHtml(r.source || '')}</em></li>`).join('')}</ul>`
    : '<p>No risks identified.</p>';

  return `${blockerSentinel || blockerList}
${riskSentinel || riskList}`.trim();
}

function buildDecisions(ir) {
  const sentinel = sentinelHtml(ir.decisions, 'Decisions');
  if (sentinel) return sentinel;

  const items = Array.isArray(ir.decisions && ir.decisions.items) ? ir.decisions.items : [];

  if (items.length === 0) {
    return '<p>No decisions recorded.</p>';
  }

  const list = items.slice(0, 20).map(d =>
    `<li>${escHtml(d.text || d)} <em class="source">[${escHtml(d.source || '')}]</em></li>`
  ).join('\n');

  return `<ul>${list}</ul>`;
}

function buildTimeline(ir) {
  const velSentinel = sentinelHtml(ir.git_velocity, 'Git velocity');
  const timeSentinel = sentinelHtml(ir.cost_timing, 'Cost/timing');

  const velHtml = velSentinel || (() => {
    const v = ir.git_velocity;
    return `<p><strong>Commits:</strong> ${v.total_commits || 0} total · ${v.commits_per_phase || 0} avg/phase</p>
${v.recent_activity ? `<p><strong>Most recent activity:</strong> ${escHtml(v.recent_activity)}</p>` : ''}`.trim();
  })();

  const timeHtml = timeSentinel || (() => {
    const t = ir.cost_timing;
    return `<p><strong>Total duration:</strong> ${t.total_duration_min || 0} min across ${t.phases_with_timing || 0} phases</p>
${t.avg_duration_min ? `<p><strong>Avg phase duration:</strong> ${t.avg_duration_min} min</p>` : ''}`.trim();
  })();

  return `${velHtml}\n${timeHtml}`.trim();
}

function buildArtifacts(ir) {
  const sentinel = sentinelHtml(ir.design_artifacts, 'Design artifacts');
  if (sentinel) return sentinel;

  const da = ir.design_artifacts;

  if (!da.available || !da.artifact_count) {
    return '<p class="unavailable">No design artifacts available for this project.</p>';
  }

  const items = Array.isArray(da.artifacts) ? da.artifacts : [];
  const embeds = items.map(a => {
    const dataUri = a.path ? embedImage(a.path) : null;
    if (dataUri) {
      return `<figure>
  <img src="${dataUri}" alt="${escHtml(a.name || a.path)}" style="max-width:100%;">
  <figcaption>${escHtml(a.name || a.path)}</figcaption>
</figure>`;
    }
    return `<p>${escHtml(a.name || a.path || 'Artifact')} (file not found)</p>`;
  }).join('\n');

  return embeds || '<p>Artifact records exist but no images found on disk.</p>';
}

// ─── Case study section builders ─────────────────────────────────────────────

function buildProblem(ir) {
  const sentinel = sentinelHtml(ir.project, 'Project identity');
  if (sentinel) return sentinel;

  const goal = escHtml((ir.project.goal || ir.project.summary || '').slice(0, 500));
  const name = escHtml(ir.project.name || 'Unknown Project');

  return `<p>${name} was built to solve a core challenge: providing a complete, AI-assisted platform for the full product development lifecycle.</p>
${goal ? `<p>${goal}</p>` : ''}`.trim();
}

function buildApproach(ir) {
  const decisionsSentinel = sentinelHtml(ir.decisions, 'Decisions');
  const phasesSentinel = sentinelHtml(ir.phases, 'Phase progress');

  const methodologyHtml = decisionsSentinel || (() => {
    const items = Array.isArray(ir.decisions && ir.decisions.items) ? ir.decisions.items : [];
    if (items.length === 0) return '<p>No methodology decisions recorded.</p>';
    const list = items.slice(0, 5).map(d =>
      `<li>${escHtml(d.text || d)}</li>`
    ).join('\n');
    return `<h3>Methodology Decisions</h3><ul>${list}</ul>`;
  })();

  const phaseHtml = phasesSentinel || (() => {
    const total = ir.phases.total || 0;
    return `<p>The project is structured across ${total} phases, each building incrementally on the previous.</p>`;
  })();

  return `${phaseHtml}\n${methodologyHtml}`.trim();
}

function buildOutcome(ir) {
  const phasesSentinel = sentinelHtml(ir.phases, 'Phase progress');
  const reqSentinel = sentinelHtml(ir.requirements, 'Requirements');
  const verSentinel = sentinelHtml(ir.verification, 'Verification');

  const phasesHtml = phasesSentinel || (() => {
    const pct = typeof ir.phases.completion_pct === 'number' ? ir.phases.completion_pct : 0;
    const completed = ir.phases.completed || 0;
    const total = ir.phases.total || 0;
    return `<p><strong>Phase completion:</strong> ${pct}% (${completed}/${total} phases)</p>`;
  })();

  const reqHtml = reqSentinel || (() => {
    const total = ir.requirements.total || 0;
    const completed = ir.requirements.completed || 0;
    return `<p><strong>Requirements coverage:</strong> ${completed}/${total} requirements satisfied</p>`;
  })();

  const verHtml = verSentinel || (() => {
    const verified = ir.verification.phases_verified || 0;
    const total = ir.verification.total_phases || 0;
    const pct = ir.verification.pct || 0;
    return `<p><strong>Verification:</strong> ${verified}/${total} phases verified (${pct}%)</p>`;
  })();

  return `${phasesHtml}\n${reqHtml}\n${verHtml}`.trim();
}

function buildLessons(ir) {
  const decisionsSentinel = sentinelHtml(ir.decisions, 'Decisions');
  const blockersSentinel = sentinelHtml(ir.blockers, 'Blockers');

  const decisionsHtml = decisionsSentinel || (() => {
    const items = Array.isArray(ir.decisions && ir.decisions.items) ? ir.decisions.items : [];
    if (items.length === 0) return '<p>No decisions recorded.</p>';
    const list = items.slice(0, 10).map(d =>
      `<li>${escHtml(d.text || d)}</li>`
    ).join('\n');
    return `<h3>Insights from Key Decisions</h3><ul>${list}</ul>`;
  })();

  const blockersHtml = blockersSentinel || (() => {
    const items = Array.isArray(ir.blockers && ir.blockers.items) ? ir.blockers.items : [];
    if (items.length === 0) return '';
    const list = items.map(b =>
      `<li>${escHtml(b.text || b)}</li>`
    ).join('\n');
    return `<h3>Challenges Encountered</h3><ul>${list}</ul>`;
  })();

  return `${decisionsHtml}\n${blockersHtml}`.trim();
}

function buildTechnical(ir) {
  const sentinel = sentinelHtml(ir.decisions, 'Technical decisions');
  if (sentinel) return sentinel;

  const items = Array.isArray(ir.decisions && ir.decisions.items) ? ir.decisions.items : [];

  if (items.length === 0) {
    return '<p>No technical decisions recorded.</p>';
  }

  const list = items.map(d =>
    `<li>
  <strong>${escHtml((d.text || String(d)).slice(0, 100))}</strong>
  ${d.source ? `<em class="source">[${escHtml(d.source)}]</em>` : ''}
</li>`
  ).join('\n');

  return `<ul>${list}</ul>`;
}

// ─── 6. buildExecutiveSummary ─────────────────────────────────────────────────

/**
 * Build executive summary sections (CLU-01).
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildExecutiveSummary(ir) {
  return [
    { id: 'overview',      title: 'Project Overview',   level: 1, content: buildOverview(ir) },
    { id: 'progress',      title: 'Progress',            level: 2, content: buildProgress(ir) },
    { id: 'requirements',  title: 'Requirements',        level: 2, content: buildRequirements(ir) },
    { id: 'blockers',      title: 'Blockers & Risks',    level: 2, content: buildBlockers(ir) },
    { id: 'decisions',     title: 'Key Decisions',       level: 2, content: buildDecisions(ir) },
    { id: 'timeline',      title: 'Timeline & Velocity', level: 2, content: buildTimeline(ir) },
    { id: 'artifacts',     title: 'Design Artifacts',    level: 2, content: buildArtifacts(ir) },
  ];
}

// ─── 7. buildCaseStudy ───────────────────────────────────────────────────────

/**
 * Build case study sections (CLR-01).
 * Uses problem-approach-outcome-lessons structure (ROADMAP locked D-03).
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildCaseStudy(ir) {
  return [
    { id: 'problem',    title: 'The Problem',          level: 1, content: buildProblem(ir) },
    { id: 'approach',   title: 'Our Approach',         level: 2, content: buildApproach(ir) },
    { id: 'outcome',    title: 'Outcome',              level: 2, content: buildOutcome(ir) },
    { id: 'lessons',    title: 'Lessons Learned',      level: 2, content: buildLessons(ir) },
    { id: 'technical',  title: 'Technical Decisions',  level: 2, content: buildTechnical(ir) },
    { id: 'artifacts',  title: 'Design Evidence',      level: 2, content: buildArtifacts(ir) },
  ];
}

// ─── CSS: PDE design tokens ───────────────────────────────────────────────────

const PDE_CSS = `
  /* PDE Design Tokens */
  :root {
    --pde-bg:         #0d1117;
    --pde-surface:    #161b22;
    --pde-border:     #30363d;
    --pde-text:       #e6edf3;
    --pde-text-muted: #8b949e;
    --pde-accent:     #58a6ff;
    --pde-success:    #3fb950;
    --pde-warning:    #d29922;
    --pde-danger:     #f85149;
    --pde-font:       -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    --pde-mono:       ui-monospace, "Cascadia Mono", monospace;
    --pde-radius:     6px;
    --pde-space-sm:   0.5rem;
    --pde-space-md:   1rem;
    --pde-space-lg:   2rem;
  }

  /* Layout & Reset */
  *, *::before, *::after { box-sizing: border-box; }
  html { font-size: 16px; }
  body {
    margin: 0;
    padding: 0;
    background: var(--pde-bg);
    color: var(--pde-text);
    font-family: var(--pde-font);
    line-height: 1.6;
  }
  main {
    max-width: 860px;
    margin: 0 auto;
    padding: var(--pde-space-lg) var(--pde-space-md);
  }

  /* Header / Footer */
  .doc-header {
    background: var(--pde-surface);
    border-bottom: 1px solid var(--pde-border);
    padding: var(--pde-space-lg) var(--pde-space-md);
    text-align: center;
  }
  .doc-title {
    margin: 0 0 var(--pde-space-sm);
    color: var(--pde-accent);
    font-size: 2rem;
  }
  .doc-meta {
    margin: 0;
    color: var(--pde-text-muted);
    font-size: 0.9rem;
  }
  .doc-footer {
    background: var(--pde-surface);
    border-top: 1px solid var(--pde-border);
    padding: var(--pde-space-md);
    text-align: center;
    color: var(--pde-text-muted);
    font-size: 0.8rem;
  }

  /* TOC Nav */
  nav.toc {
    background: var(--pde-surface);
    border: 1px solid var(--pde-border);
    border-radius: var(--pde-radius);
    padding: var(--pde-space-md) var(--pde-space-lg);
    margin-bottom: var(--pde-space-lg);
    max-width: 860px;
    margin-left: auto;
    margin-right: auto;
    margin-top: var(--pde-space-md);
  }
  nav.toc h2 {
    margin: 0 0 var(--pde-space-sm);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--pde-text-muted);
  }
  nav.toc ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: var(--pde-space-sm) var(--pde-space-md);
  }
  nav.toc a {
    color: var(--pde-accent);
    text-decoration: none;
    font-size: 0.9rem;
  }
  nav.toc a:hover { text-decoration: underline; }

  /* Sections */
  section {
    margin-bottom: var(--pde-space-lg);
    padding-bottom: var(--pde-space-md);
    border-bottom: 1px solid var(--pde-border);
  }
  section:last-child { border-bottom: none; }
  h1 { color: var(--pde-accent); margin: 0 0 var(--pde-space-md); font-size: 1.75rem; }
  h2 { color: var(--pde-text); margin: var(--pde-space-lg) 0 var(--pde-space-md); font-size: 1.3rem; }
  h3 { color: var(--pde-text-muted); margin: var(--pde-space-md) 0 var(--pde-space-sm); font-size: 1rem; }
  p { margin: 0 0 var(--pde-space-md); }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: var(--pde-space-md);
    font-size: 0.9rem;
  }
  th, td {
    padding: var(--pde-space-sm) var(--pde-space-md);
    border: 1px solid var(--pde-border);
    text-align: left;
  }
  th { background: var(--pde-surface); color: var(--pde-text-muted); font-weight: 600; }
  tr:hover { background: var(--pde-surface); }

  /* Lists */
  ul, ol { margin: 0 0 var(--pde-space-md); padding-left: var(--pde-space-lg); }
  li { margin-bottom: var(--pde-space-sm); }

  /* Special classes */
  .unavailable {
    color: var(--pde-warning);
    background: rgba(210,153,34,0.1);
    border: 1px solid rgba(210,153,34,0.3);
    border-radius: var(--pde-radius);
    padding: var(--pde-space-sm) var(--pde-space-md);
    font-size: 0.9rem;
  }
  .lead { font-size: 1.1rem; font-weight: 600; }
  .source { color: var(--pde-text-muted); font-size: 0.8rem; margin-left: 0.3em; }

  /* Images */
  img {
    max-width: 100%;
    border-radius: var(--pde-radius);
    border: 1px solid var(--pde-border);
  }
  figure { margin: 0 0 var(--pde-space-md); }
  figcaption { font-size: 0.8rem; color: var(--pde-text-muted); margin-top: var(--pde-space-sm); }
`;

// ─── 8. renderHTML ────────────────────────────────────────────────────────────

/**
 * Render a fully self-contained HTML document.
 * No external URLs. No JavaScript. All CSS inline.
 *
 * Per D-01 (ROADMAP locked): self-contained HTML, embedded CSS, no external URLs, no JS.
 *
 * @param {object} ir
 * @param {string} persona
 * @param {Array} sections
 * @returns {string} Full HTML document string
 */
function renderHTML(ir, persona, sections) {
  const displayName = personaDisplayName(persona);
  const projectName = (ir.project && !ir.project.unavailable) ? (ir.project.name || 'Project') : 'Project';
  const toc = buildTOC(sections);

  const body = sections.map(s =>
    `<section id="${s.id}">
<h${s.level}>${escHtml(s.title)}</h${s.level}>
${s.content}
</section>`
  ).join('\n\n');

  const extractedAt = escHtml(ir.extracted_at || new Date().toISOString());
  const sourceHash = escHtml((ir.source_hash || '').slice(0, 8));
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(projectName)} — ${escHtml(displayName)}</title>
  <style>${PDE_CSS}
  </style>
</head>
<body>
  <header class="doc-header">
    <h1 class="doc-title">${escHtml(projectName)}</h1>
    <p class="doc-meta">${escHtml(displayName)} · Generated ${escHtml(generatedDate)}</p>
  </header>
  ${toc}
  <main>
${body}
  </main>
  <footer class="doc-footer">
    <p>Generated by Platform Development Engine (PDE) · IR extracted at ${extractedAt} · Source hash: ${sourceHash}</p>
  </footer>
</body>
</html>`;
}

// ─── 9. renderMarkdown ────────────────────────────────────────────────────────

/**
 * Render a Markdown companion document.
 * ATX headings, blockquote metadata, stripped HTML content.
 *
 * @param {object} ir
 * @param {string} persona
 * @param {Array} sections
 * @returns {string} Markdown string
 */
function renderMarkdown(ir, persona, sections) {
  const displayName = personaDisplayName(persona);
  const projectName = (ir.project && !ir.project.unavailable) ? (ir.project.name || 'Project') : 'Project';
  const isoDate = ir.extracted_at || new Date().toISOString();
  const sourceHash = (ir.source_hash || '').slice(0, 8);

  const lines = [
    `# ${projectName} — ${displayName}`,
    '',
    `> Generated ${isoDate} · IR source hash: ${sourceHash}`,
    '',
  ];

  for (const s of sections) {
    const hashes = '#'.repeat(s.level);
    lines.push(`${hashes} ${s.title}`);
    lines.push('');
    lines.push(stripHtml(s.content));
    lines.push('');
  }

  return lines.join('\n');
}

// ─── 10. render ──────────────────────────────────────────────────────────────

/**
 * Orchestrator: dispatch to persona builder, render both formats, write files.
 * Re-running overwrites previous output (RND-07).
 *
 * Per D-02 (ROADMAP locked): Files written to .planning/presentations/ with [persona]-[date] naming.
 *
 * @param {object} ir
 * @param {string} persona - 'executive-summary' | 'case-study'
 * @param {string} htmlPath - Absolute path for HTML output
 * @param {string} mdPath - Absolute path for Markdown output
 * @returns {{ htmlPath: string, mdPath: string, htmlBytes: number }}
 */
function render(ir, persona, htmlPath, mdPath) {
  let sections;
  switch (persona) {
    case 'executive-summary':
      sections = buildExecutiveSummary(ir);
      break;
    case 'case-study':
      sections = buildCaseStudy(ir);
      break;
    default:
      throw new Error(`Unknown persona: ${persona}. Available: executive-summary, case-study`);
  }

  const html = renderHTML(ir, persona, sections);
  const md = renderMarkdown(ir, persona, sections);

  // Size guard (RND-01): warn if approaching 500KB limit
  const htmlBytes = Buffer.byteLength(html, 'utf-8');
  if (htmlBytes > 500 * 1024) {
    process.stderr.write(`[render-presentation] WARNING: HTML output for persona "${persona}" exceeds 500KB (${htmlBytes} bytes). Consider reducing verbose content.\n`);
  }

  // Ensure parent directories exist
  const htmlDir = path.dirname(htmlPath);
  const mdDir = path.dirname(mdPath);
  if (htmlDir && !fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });
  if (mdDir && mdDir !== htmlDir && !fs.existsSync(mdDir)) fs.mkdirSync(mdDir, { recursive: true });

  // Write files (naturally overwrites if exists — RND-07)
  fs.writeFileSync(htmlPath, html, 'utf-8');
  fs.writeFileSync(mdPath, md, 'utf-8');

  return { htmlPath, mdPath, htmlBytes };
}

// ─── 11. cmdPresentationRender ───────────────────────────────────────────────

/**
 * CLI handler for `pde-tools presentation render`.
 *
 * Usage: pde-tools presentation render <persona> <html-path> <md-path> [ir-file-path]
 *
 * If ir-file-path is provided and the file exists, parse it as JSON.
 * Otherwise, run buildPresentationIR(cwd) to get fresh IR.
 *
 * @param {string} cwd - Project root directory
 * @param {string} persona - Persona slug
 * @param {string} htmlPath - Output HTML path
 * @param {string} mdPath - Output Markdown path
 * @param {string} [irFilePath] - Optional path to pre-built IR JSON file
 */
function cmdPresentationRender(cwd, persona, htmlPath, mdPath, irFilePath) {
  const { output, error } = require('./core.cjs');

  if (!persona) {
    error('Missing persona argument. Usage: presentation render <persona> <html-path> <md-path> [ir-file-path]');
  }
  if (!htmlPath) {
    error('Missing html-path argument. Usage: presentation render <persona> <html-path> <md-path> [ir-file-path]');
  }
  if (!mdPath) {
    error('Missing md-path argument. Usage: presentation render <persona> <html-path> <md-path> [ir-file-path]');
  }

  let ir;

  if (irFilePath && fs.existsSync(irFilePath)) {
    try {
      ir = JSON.parse(fs.readFileSync(irFilePath, 'utf-8'));
    } catch (e) {
      error(`Failed to parse IR file at ${irFilePath}: ${e.message}`);
    }
  } else {
    const presentation = require('./presentation.cjs');
    ir = presentation.buildPresentationIR(cwd);
  }

  const result = render(ir, persona, htmlPath, mdPath);
  output(result);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  escHtml,
  embedImage,
  buildTOC,
  personaDisplayName,
  buildExecutiveSummary,
  buildCaseStudy,
  renderHTML,
  renderMarkdown,
  render,
  cmdPresentationRender,
};
