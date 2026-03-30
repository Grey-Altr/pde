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
const charts = require('./charts.cjs');

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
    'executive-summary':    'Executive Summary',
    'case-study':           'Case Study / Portfolio Piece',
    'investor-update':      'Investor Update',
    'sprint-review':        'Sprint Review',
    'client-deliverable':   'Client Deliverable Report',
    'stakeholder-status':   'Stakeholder Status Update',
    'pm-view':              'Product Manager View',
    'project-manager-view': 'Project Manager View',
    'agile-report':         'Agile Project Report',
    'design-report':        'Design Persona Report',
    'research-report':      'Research Persona Report',
    'post-mortem':          'Technical Post-Mortem',
    'adr-summary':          'ADR Summary',
    'launch-announcement':  'Launch Announcement',
    'portfolio-overview':   'Portfolio Overview',
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

// ─── Phase 181 Cluster A section builder helpers ─────────────────────────────

function buildMilestoneVelocity(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const completed = ir.phases.completed || 0;
  const total = ir.phases.total || 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const milestone = escHtml(ir.phases.milestone_name || ir.phases.milestone || '');
  const velSentinel = sentinelHtml(ir.git_velocity, 'Git velocity');
  const commitsHtml = velSentinel || (() => {
    const v = ir.git_velocity;
    return `<p><strong>Commits:</strong> ${v.total_commits || 0} total · ${v.commits_per_phase || 0} avg/phase</p>`;
  })();

  return `<p><strong>Milestone:</strong> ${milestone || 'In progress'} — ${pct}% complete (${completed}/${total} phases)</p>
${commitsHtml}`.trim();
}

function buildShipped(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const shipped = Array.isArray(ir.phases.phase_list)
    ? ir.phases.phase_list.filter(p => p.completed)
    : [];

  if (shipped.length === 0) return '<p>No phases completed yet.</p>';

  const rows = shipped.map(p =>
    `<tr><td>${escHtml(p.name)}</td><td>&#x2713;</td></tr>`
  ).join('\n');

  return `<p>${shipped.length} phase(s) shipped.</p>
<table>
  <thead><tr><th>Phase</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildWhatsNext(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const upcoming = Array.isArray(ir.phases.phase_list)
    ? ir.phases.phase_list.filter(p => !p.completed)
    : [];

  const currentName = escHtml(ir.phases.current_phase_name || ir.phases.current_phase || '');

  if (upcoming.length === 0 && !currentName) {
    return '<p>All phases complete.</p>';
  }

  const items = upcoming.slice(0, 5).map(p =>
    `<li>${escHtml(p.name)}</li>`
  ).join('\n');

  return `${currentName ? `<p><strong>Current focus:</strong> ${currentName}</p>` : ''}
${items ? `<ul>${items}</ul>` : ''}`.trim();
}

function buildVerificationEvidence(ir) {
  const sentinel = sentinelHtml(ir.verification, 'Verification');
  if (sentinel) return sentinel;

  const v = ir.verification;
  const verified = v.phases_verified || 0;
  const total = v.total_phases || 0;
  const pct = v.pct || (total > 0 ? Math.round((verified / total) * 100) : 0);

  return `<p><strong>Verification coverage:</strong> ${verified}/${total} phases verified (${pct}%)</p>`;
}

function buildRAGStatus(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const pct = ir.phases.total > 0
    ? Math.round((ir.phases.completed / ir.phases.total) * 100)
    : 0;

  let rag, ragClass;
  if (pct >= 75) { rag = 'GREEN'; ragClass = 'pde-success'; }
  else if (pct >= 40) { rag = 'AMBER'; ragClass = 'pde-warning'; }
  else { rag = 'RED'; ragClass = 'pde-danger'; }

  return `<p><strong>Status:</strong> <span class="${escHtml(ragClass)}">${rag}</span> — ${pct}% complete (${ir.phases.completed}/${ir.phases.total} phases)</p>`;
}

function buildCurrentFocus(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const currentName = escHtml(ir.phases.current_phase_name || ir.phases.current_phase || '');
  const milestone = escHtml(ir.phases.milestone_name || ir.phases.milestone || '');

  return `${milestone ? `<p><strong>Milestone:</strong> ${milestone}</p>` : ''}
${currentName ? `<p><strong>Current phase:</strong> ${currentName}</p>` : '<p>No active phase.</p>'}`.trim();
}

function buildRiskRegister(ir) {
  const riskSentinel = sentinelHtml(ir.risks, 'Risks');
  if (riskSentinel) return riskSentinel;

  const items = Array.isArray(ir.risks && ir.risks.items) ? ir.risks.items : [];

  if (items.length === 0) {
    return '<p>No risks identified.</p>';
  }

  const rows = items.map(r =>
    `<tr><td>${escHtml(r.text || String(r))}</td><td>${escHtml(r.source || '')}</td></tr>`
  ).join('\n');

  return `<table>
  <thead><tr><th>Risk</th><th>Source</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildRoadmapHealth(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const total = ir.phases.total || 0;
  const completed = ir.phases.completed || 0;
  const inProgress = total - completed > 0 ? total - completed : 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const milestone = escHtml(ir.phases.milestone_name || ir.phases.milestone || '');

  let rag, ragClass;
  if (pct >= 75) { rag = 'GREEN'; ragClass = 'pde-success'; }
  else if (pct >= 40) { rag = 'AMBER'; ragClass = 'pde-warning'; }
  else { rag = 'RED'; ragClass = 'pde-danger'; }

  return `${milestone ? `<p><strong>Milestone:</strong> ${milestone}</p>` : ''}
<p><strong>Health:</strong> <span class="${escHtml(ragClass)}">${rag}</span> — ${pct}% complete</p>
<p>${completed} of ${total} phases done · ${inProgress} remaining</p>`.trim();
}

function buildCategoryBreakdown(ir) {
  const sentinel = sentinelHtml(ir.requirements, 'Requirements');
  if (sentinel) return sentinel;

  const categories = Array.isArray(ir.requirements.categories) ? ir.requirements.categories : [];

  if (categories.length === 0) {
    return '<p>No category data available.</p>';
  }

  const rows = categories.map(cat => {
    const total = cat.total || 0;
    const completed = cat.completed || 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return `<tr><td>${escHtml(cat.name)}</td><td>${total}</td><td>${completed}</td><td>${pct}%</td></tr>`;
  }).join('\n');

  return `<table>
  <thead><tr><th>Category</th><th>Total</th><th>Completed</th><th>Coverage %</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildPhaseTracking(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const phaseList = Array.isArray(ir.phases.phase_list) ? ir.phases.phase_list : [];

  if (phaseList.length === 0) {
    const completed = ir.phases.completed || 0;
    const total = ir.phases.total || 0;
    return `<p>${completed} of ${total} phases complete (no phase list available).</p>`;
  }

  const rows = phaseList.map(p => {
    const status = p.completed ? 'completed' : (p.in_progress ? 'in-progress' : 'planned');
    return `<tr><td>${escHtml(p.name)}</td><td>${escHtml(status)}</td></tr>`;
  }).join('\n');

  return `<table>
  <thead><tr><th>Phase</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildCostDuration(ir) {
  const sentinel = sentinelHtml(ir.cost_timing, 'Cost timing data');
  if (sentinel) return sentinel;

  const t = ir.cost_timing;
  const totalMin = t.total_duration_min || 0;
  const durationDisplay = totalMin > 120
    ? `${(totalMin / 60).toFixed(1)} hours`
    : `${totalMin} min`;
  const phasesWith = t.phases_with_timing || 0;
  const avgMin = t.avg_duration_min || 0;
  const sessionCount = t.session_count;

  return `<p><strong>Total duration:</strong> ${durationDisplay} across ${phasesWith} phases</p>
${avgMin ? `<p><strong>Avg phase duration:</strong> ${avgMin} min</p>` : ''}
${sessionCount ? `<p><strong>Sessions:</strong> ${sessionCount}</p>` : ''}`.trim();
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
    { id: 'burndown',      title: 'Burndown',            level: 2, content: charts.burndownChart(ir) },
    { id: 'velocity',      title: 'Velocity',            level: 2, content: charts.velocityChart(ir) },
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
    { id: 'timeline-chart', title: 'Phase Timeline',   level: 2, content: charts.phaseTimelineChart(ir) },
    { id: 'effort',     title: 'Effort Breakdown',     level: 2, content: charts.effortBreakdownChart(ir) },
    { id: 'lessons',    title: 'Lessons Learned',      level: 2, content: buildLessons(ir) },
    { id: 'technical',  title: 'Technical Decisions',  level: 2, content: buildTechnical(ir) },
    { id: 'artifacts',  title: 'Design Evidence',      level: 2, content: buildArtifacts(ir) },
  ];
}

// ─── Phase 181 Cluster A persona builders ────────────────────────────────────

/**
 * Build investor update sections (CLU-02).
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildInvestorUpdate(ir) {
  return [
    { id: 'vision',    title: 'Product Vision',       level: 1, content: buildOverview(ir) },
    { id: 'velocity',  title: 'Milestone Velocity',   level: 2, content: buildMilestoneVelocity(ir) },
    { id: 'delivery',  title: 'Delivery Proof',       level: 2, content: buildRequirements(ir) },
    { id: 'moat',      title: 'Technical Moat',       level: 2, content: buildTechnical(ir) },
    { id: 'activity',  title: 'Development Activity', level: 2, content: buildTimeline(ir) },
    { id: 'v-chart',   title: 'Velocity Chart',       level: 2, content: charts.velocityChart(ir) },
  ];
}

/**
 * Build sprint review sections (CLU-03).
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildSprintReview(ir) {
  return [
    { id: 'shipped',    title: 'What Shipped',          level: 1, content: buildShipped(ir) },
    { id: 'artifacts',  title: 'Demo Artifacts',        level: 2, content: buildArtifacts(ir) },
    { id: 'acceptance', title: 'Acceptance Criteria',   level: 2, content: buildRequirements(ir) },
    { id: 'next',       title: "What's Next",           level: 2, content: buildWhatsNext(ir) },
    { id: 'burndown',   title: 'Burndown',              level: 2, content: charts.burndownChart(ir) },
  ];
}

/**
 * Build client deliverable report sections (CLU-04).
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildClientDeliverable(ir) {
  return [
    { id: 'scope',        title: 'Project Scope',           level: 1, content: buildOverview(ir) },
    { id: 'features',     title: 'Features Delivered',      level: 2, content: buildProgress(ir) },
    { id: 'acceptance',   title: 'Acceptance Criteria Met', level: 2, content: buildRequirements(ir) },
    { id: 'verification', title: 'Verification Evidence',   level: 2, content: buildVerificationEvidence(ir) },
    { id: 'artifacts',    title: 'Design Artifacts',        level: 2, content: buildArtifacts(ir) },
  ];
}

/**
 * Build stakeholder status update sections (CLU-05).
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildStakeholderStatus(ir) {
  return [
    { id: 'rag',       title: 'RAG Status',         level: 1, content: buildRAGStatus(ir) },
    { id: 'focus',     title: 'Current Focus',      level: 2, content: buildCurrentFocus(ir) },
    { id: 'blockers',  title: 'Active Blockers',    level: 2, content: buildBlockers(ir) },
    { id: 'risks',     title: 'Risk Register',      level: 2, content: buildRiskRegister(ir) },
    { id: 'decisions', title: 'Decisions Log',      level: 2, content: buildDecisions(ir) },
    { id: 'next',      title: 'Next Actions',       level: 2, content: buildWhatsNext(ir) },
  ];
}

/**
 * Build product manager view sections (CLU-06).
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildProductManager(ir) {
  return [
    { id: 'coverage',     title: 'Requirement Coverage',     level: 1, content: buildRequirements(ir) },
    { id: 'roadmap',      title: 'Roadmap Health',           level: 2, content: buildRoadmapHealth(ir) },
    { id: 'categories',   title: 'Feature Category Breakdown', level: 2, content: buildCategoryBreakdown(ir) },
    { id: 'scope',        title: 'Scope Trade-offs',         level: 2, content: buildBlockers(ir) },
    { id: 'decisions',    title: 'Product Decisions',        level: 2, content: buildDecisions(ir) },
    { id: 'effort-chart', title: 'Effort Distribution',      level: 2, content: charts.effortBreakdownChart(ir) },
  ];
}

/**
 * Build project manager view sections (CLU-07).
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildProjectManager(ir) {
  return [
    { id: 'timeline',        title: 'Timeline Status',      level: 1, content: buildProgress(ir) },
    { id: 'tracking',        title: 'Phase Tracking',       level: 2, content: buildPhaseTracking(ir) },
    { id: 'resources',       title: 'Resource Activity',    level: 2, content: buildTimeline(ir) },
    { id: 'risk-register',   title: 'Risk Register',        level: 2, content: buildRiskRegister(ir) },
    { id: 'cost',            title: 'Cost & Duration',      level: 2, content: buildCostDuration(ir) },
    { id: 'timeline-chart',  title: 'Phase Timeline Chart', level: 2, content: charts.phaseTimelineChart(ir) },
  ];
}

// ─── Phase 182 Cluster B section helpers ─────────────────────────────────────

/**
 * Build retrospective narrative for agile-report (CLR-02).
 * Lists completed phases as "what went well", blockers as "what could improve",
 * decisions as "action items taken".
 */
function buildRetroNarrative(ir) {
  const phasesSentinel = sentinelHtml(ir.phases, 'Phase progress');
  const blockersSentinel = sentinelHtml(ir.blockers, 'Blockers');
  const decisionsSentinel = sentinelHtml(ir.decisions, 'Decisions');

  const wentWellHtml = phasesSentinel || (() => {
    const phaseList = Array.isArray(ir.phases.phase_list) ? ir.phases.phase_list : [];
    const completed = phaseList.filter(p => p.completed);
    if (completed.length === 0) {
      return '<p>No completed phases recorded.</p>';
    }
    const list = completed.map(p => `<li>${escHtml(p.name)}</li>`).join('\n');
    return `<h3>What Went Well (Completed)</h3><ul>${list}</ul>`;
  })();

  const improveHtml = blockersSentinel || (() => {
    const items = Array.isArray(ir.blockers && ir.blockers.items) ? ir.blockers.items : [];
    if (items.length === 0) return '<p>No blockers identified this sprint.</p>';
    const list = items.map(b => `<li>${escHtml(b.text || b)} <em>${escHtml(b.source || '')}</em></li>`).join('\n');
    return `<h3>What Could Improve (Blockers)</h3><ul>${list}</ul>`;
  })();

  const actionItemsHtml = decisionsSentinel || (() => {
    const items = Array.isArray(ir.decisions && ir.decisions.items) ? ir.decisions.items : [];
    if (items.length === 0) return '<p>No decisions recorded as action items.</p>';
    const list = items.slice(0, 10).map(d => `<li>${escHtml(d.text || d)} <em>${escHtml(d.source || '')}</em></li>`).join('\n');
    return `<h3>Action Items Taken (Decisions)</h3><ul>${list}</ul>`;
  })();

  return `${wentWellHtml}\n${improveHtml}\n${actionItemsHtml}`.trim();
}

/**
 * Build design-focused decisions for design-report (CLR-03).
 * Filters ir.decisions items for design-related keywords.
 * Falls back to all decisions if no design-specific ones found.
 */
function buildDesignDecisions(ir) {
  const sentinel = sentinelHtml(ir.decisions, 'Decisions');
  if (sentinel) return sentinel;

  const items = Array.isArray(ir.decisions && ir.decisions.items) ? ir.decisions.items : [];
  if (items.length === 0) return '<p>No decisions recorded.</p>';

  const designKeywords = ['design', 'token', 'color', 'typography', 'wireframe', 'mockup',
    'layout', 'css', 'theme', 'visual', 'ux', 'ui'];

  const designItems = items.filter(d => {
    const text = (d.text || d || '').toLowerCase();
    return designKeywords.some(kw => text.includes(kw));
  });

  const displayItems = designItems.length > 0 ? designItems : items;
  const list = displayItems.slice(0, 15).map(d =>
    `<li>${escHtml(d.text || d)} <em class="source">[${escHtml(d.source || '')}]</em></li>`
  ).join('\n');

  const label = designItems.length > 0
    ? `<p><strong>Design-specific decisions (${designItems.length}):</strong></p>`
    : '<p><em>No design-specific decisions found — showing all decisions.</em></p>';

  return `${label}<ul>${list}</ul>`;
}

/**
 * Build token evolution section for design-report (CLR-03).
 * If ir.design_artifacts has token-related entries, lists them.
 * Otherwise shows sentinel "no token data available".
 */
function buildTokenEvolution(ir) {
  const sentinel = sentinelHtml(ir.design_artifacts, 'Design artifacts');
  if (sentinel) return sentinel;

  const da = ir.design_artifacts;
  if (!da || !da.available) {
    return '<p class="unavailable"><strong>Design tokens unavailable:</strong> No design system manifest found. Token evolution tracking requires design-manifest.json.</p>';
  }

  const artifacts = Array.isArray(da.artifacts) ? da.artifacts : [];
  const tokenArtifacts = artifacts.filter(a => {
    const name = (a.name || a.path || '').toLowerCase();
    return name.includes('token') || name.includes('theme') || name.includes('color');
  });

  if (tokenArtifacts.length === 0) {
    return '<p>No token-specific artifacts found in design system.</p>';
  }

  const list = tokenArtifacts.map(a => `<li>${escHtml(a.name || a.path || 'Token artifact')}</li>`).join('\n');
  return `<ul>${list}</ul>`;
}

/**
 * Build research findings section for research-report (CLR-04).
 * Reads ir.research (sentinel-check first).
 */
function buildResearchFindings(ir) {
  const sentinel = sentinelHtml(ir.research, 'Research');
  if (sentinel) return sentinel;

  const research = ir.research;

  // Handle array of findings strings
  if (Array.isArray(research.findings)) {
    if (research.findings.length === 0) return '<p>No research findings recorded.</p>';
    const list = research.findings.map(f => `<li>${escHtml(String(f))}</li>`).join('\n');
    return `<ul>${list}</ul>`;
  }

  // Handle array of finding objects
  if (Array.isArray(research)) {
    if (research.length === 0) return '<p>No research findings recorded.</p>';
    const list = research.map(item => {
      const title = escHtml(item.title || item.finding || String(item));
      const summary = item.summary ? `<br><em>${escHtml(item.summary)}</em>` : '';
      const source = item.source ? ` <small>[${escHtml(item.source)}]</small>` : '';
      return `<li>${title}${summary}${source}</li>`;
    }).join('\n');
    return `<ul>${list}</ul>`;
  }

  return '<p>No structured research findings available.</p>';
}

/**
 * Build research recommendations for research-report (CLR-04).
 * Reads ir.research items looking for recommendation-like fields.
 * Falls back to a descriptive message.
 */
function buildResearchRecommendations(ir) {
  const sentinel = sentinelHtml(ir.research, 'Research');
  if (sentinel) return sentinel;

  const research = ir.research;

  // Check for array of finding objects with recommendation fields
  if (Array.isArray(research)) {
    const withRecs = research.filter(item => item.recommendation || item.recommendations);
    if (withRecs.length > 0) {
      const list = withRecs.map(item => {
        const rec = item.recommendation || (Array.isArray(item.recommendations) ? item.recommendations.join('; ') : item.recommendations);
        return `<li>${escHtml(String(rec))}</li>`;
      }).join('\n');
      return `<ul>${list}</ul>`;
    }
  }

  // Check for top-level recommendations field
  if (research.recommendations) {
    if (Array.isArray(research.recommendations)) {
      const list = research.recommendations.map(r => `<li>${escHtml(String(r))}</li>`).join('\n');
      return `<ul>${list}</ul>`;
    }
    return `<p>${escHtml(String(research.recommendations))}</p>`;
  }

  return '<p>No specific recommendations extracted from research data. Review findings manually for actionable insights.</p>';
}

/**
 * Build competitive landscape section for research-report (CLR-04).
 * Reads ir.research for competitive/landscape items.
 */
function buildCompetitiveLandscape(ir) {
  const sentinel = sentinelHtml(ir.research, 'Research');
  if (sentinel) return sentinel;

  const research = ir.research;

  // Check for competitive field
  if (research.competitive || research.landscape) {
    const data = research.competitive || research.landscape;
    if (Array.isArray(data)) {
      const list = data.map(item => `<li>${escHtml(String(item.name || item))}</li>`).join('\n');
      return `<ul>${list}</ul>`;
    }
    return `<p>${escHtml(String(data))}</p>`;
  }

  // Look through research items for competitive keywords
  if (Array.isArray(research)) {
    const competitiveItems = research.filter(item => {
      const text = ((item.title || item.finding || '') + ' ' + (item.summary || '')).toLowerCase();
      return text.includes('competi') || text.includes('landscape') || text.includes('alternative') || text.includes('comparison');
    });
    if (competitiveItems.length > 0) {
      const list = competitiveItems.map(item =>
        `<li>${escHtml(item.title || item.finding || String(item))}</li>`
      ).join('\n');
      return `<ul>${list}</ul>`;
    }
  }

  return '<p class="unavailable"><strong>Competitive landscape unavailable:</strong> No competitive analysis data found in research IR.</p>';
}

// ─── Phase 182 Cluster B persona builders ────────────────────────────────────

/**
 * Build agile project report sections (CLR-02).
 * Target audience: Scrum masters, agile coaches, retrospective participants.
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildAgileReport(ir) {
  return [
    { id: 'overview',       title: 'Project Overview',    level: 1, content: buildOverview(ir) },
    { id: 'retrospective',  title: 'Retrospective Narrative', level: 2, content: buildRetroNarrative(ir) },
    { id: 'burndown',       title: 'Burndown Chart',      level: 2, content: charts.burndownChart(ir) },
    { id: 'velocity',       title: 'Velocity Chart',      level: 2, content: charts.velocityChart(ir) },
    { id: 'metrics',        title: 'Sprint Metrics',      level: 2, content: buildProgress(ir) },
  ];
}

/**
 * Build design persona report sections (CLR-03).
 * Target audience: Design leads, UX reviewers, brand stakeholders.
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildDesignReport(ir) {
  return [
    { id: 'overview',          title: 'Design Overview',          level: 1, content: buildOverview(ir) },
    { id: 'design-decisions',  title: 'Design Decisions',         level: 2, content: buildDesignDecisions(ir) },
    { id: 'artifacts',         title: 'Design Artifacts',         level: 2, content: buildArtifacts(ir) },
    { id: 'tokens',            title: 'Design Token Evolution',   level: 2, content: buildTokenEvolution(ir) },
    { id: 'direction',         title: 'Visual Direction Rationale', level: 2, content: buildTechnical(ir) },
  ];
}

/**
 * Build research persona report sections (CLR-04).
 * Target audience: Technical leads, architecture reviewers, research consumers.
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildResearchReport(ir) {
  return [
    { id: 'overview',        title: 'Research Overview',      level: 1, content: buildOverview(ir) },
    { id: 'findings',        title: 'Research Findings',      level: 2, content: buildResearchFindings(ir) },
    { id: 'recommendations', title: 'Recommendations',        level: 2, content: buildResearchRecommendations(ir) },
    { id: 'tech-eval',       title: 'Technology Evaluations', level: 2, content: buildTechnical(ir) },
    { id: 'landscape',       title: 'Competitive Landscape',  level: 2, content: buildCompetitiveLandscape(ir) },
  ];
}

// ─── Phase 182 Plan 02: Cluster B helpers (CLR-05, CLR-06) ───────────────────

/**
 * Build "what broke" section for post-mortem (CLR-05).
 * Reads ir.blockers and ir.risks. Lists all blockers as incidents/issues encountered.
 */
function buildWhatBroke(ir) {
  const blockerSentinel = sentinelHtml(ir.blockers, 'Blockers');
  const riskSentinel = sentinelHtml(ir.risks, 'Risks');

  const blockerItems = (!blockerSentinel && Array.isArray(ir.blockers && ir.blockers.items))
    ? ir.blockers.items
    : [];
  const riskItems = (!riskSentinel && Array.isArray(ir.risks && ir.risks.items))
    ? ir.risks.items
    : [];

  if (blockerSentinel && riskSentinel) {
    return `<p>No significant issues recorded during this milestone.</p>`;
  }

  if (blockerItems.length === 0 && riskItems.length === 0) {
    return '<p>No significant issues recorded during this milestone.</p>';
  }

  const blockerHtml = blockerItems.length > 0
    ? `<h3>Issues / Incidents Encountered</h3><ul>${blockerItems.map(b =>
        `<li>${escHtml(b.text || b)} <em class="source">[${escHtml(b.source || '')}]</em></li>`
      ).join('\n')}</ul>`
    : '';

  const riskHtml = riskItems.length > 0
    ? `<h3>Risks Identified</h3><ul>${riskItems.map(r =>
        `<li>${escHtml(r.text || r)} <em class="source">[${escHtml(r.source || '')}]</em></li>`
      ).join('\n')}</ul>`
    : '';

  return `${blockerSentinel || blockerHtml}
${riskSentinel || riskHtml}`.trim();
}

/**
 * Build root cause analysis section for post-mortem (CLR-05).
 * Reads ir.blockers for cause data and ir.decisions for responsive decisions.
 * Presents as cause-effect pairs where data exists.
 */
function buildRootCause(ir) {
  const blockerSentinel = sentinelHtml(ir.blockers, 'Blockers');
  const decisionsSentinel = sentinelHtml(ir.decisions, 'Decisions');

  if (blockerSentinel && decisionsSentinel) {
    return '<p>Root cause data not captured in structured format.</p>';
  }

  const blockerItems = (!blockerSentinel && Array.isArray(ir.blockers && ir.blockers.items))
    ? ir.blockers.items
    : [];

  const decisionItems = (!decisionsSentinel && Array.isArray(ir.decisions && ir.decisions.items))
    ? ir.decisions.items
    : [];

  if (blockerItems.length === 0 && decisionItems.length === 0) {
    return '<p>Root cause data not captured in structured format.</p>';
  }

  const causeHtml = blockerItems.length > 0
    ? `<h3>Causes (Blockers Encountered)</h3><ul>${blockerItems.map(b =>
        `<li><strong>Cause:</strong> ${escHtml(b.text || b)} <em class="source">[${escHtml(b.source || '')}]</em></li>`
      ).join('\n')}</ul>`
    : '';

  const effectHtml = decisionItems.length > 0
    ? `<h3>Responses (Decisions Made)</h3><ul>${decisionItems.slice(0, 10).map(d =>
        `<li><strong>Response:</strong> ${escHtml(d.text || d)} <em class="source">[${escHtml(d.source || '')}]</em></li>`
      ).join('\n')}</ul>`
    : '';

  return `${causeHtml}
${effectHtml}`.trim();
}

/**
 * Build ADR-style decisions section for adr-summary (CLR-06).
 * Reads ir.decisions. Formats each decision as an ADR entry:
 * Status, Context, Decision, Consequences.
 */
function buildAdrDecisions(ir) {
  const sentinel = sentinelHtml(ir.decisions, 'Decisions');
  if (sentinel) return sentinel;

  const items = Array.isArray(ir.decisions && ir.decisions.items)
    ? ir.decisions.items
    : (Array.isArray(ir.decisions) ? ir.decisions : []);

  if (items.length === 0) {
    return '<p>No architecture decisions recorded.</p>';
  }

  const entries = items.slice(0, 20).map((d, i) => {
    const text = d.text || String(d);
    const source = d.source || '';
    return `<div class="adr-entry">
  <p><strong>ADR-${String(i + 1).padStart(3, '0')}</strong> &mdash; <em>Status: Accepted</em></p>
  <p><strong>Context:</strong> ${escHtml(source ? `[${source}]` : 'Documented during milestone execution')}</p>
  <p><strong>Decision:</strong> ${escHtml(text)}</p>
  <p><strong>Consequences:</strong> Recorded as accepted architectural direction. Review if requirements change significantly.</p>
</div>`;
  }).join('\n');

  return entries;
}

// ─── Phase 182 Plan 02: Cluster B persona builders (CLR-05, CLR-06) ──────────

/**
 * Build technical post-mortem sections (CLR-05).
 * Target audience: Engineering leads, SRE teams, incident reviewers.
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildPostMortem(ir) {
  return [
    { id: 'overview',     title: 'Post-Mortem Overview',   level: 1, content: buildOverview(ir) },
    { id: 'what-broke',   title: 'What Broke',             level: 2, content: buildWhatBroke(ir) },
    { id: 'root-cause',   title: 'Root Cause Analysis',    level: 2, content: buildRootCause(ir) },
    { id: 'prevention',   title: 'Prevention Measures',    level: 2, content: buildDecisions(ir) },
    { id: 'timeline',     title: 'Incident Timeline',      level: 2, content: buildTimeline(ir) },
    { id: 'phase-chart',  title: 'Phase Timeline Chart',   level: 2, content: charts.phaseTimelineChart(ir) },
  ];
}

/**
 * Build architecture decision record summary sections (CLR-06).
 * Target audience: Architects, new team members, audit reviewers.
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildAdrSummary(ir) {
  return [
    { id: 'overview',      title: 'ADR Overview',               level: 1, content: buildOverview(ir) },
    { id: 'decisions',     title: 'Architecture Decisions',      level: 2, content: buildAdrDecisions(ir) },
    { id: 'technical',     title: 'Technical Context',           level: 2, content: buildTechnical(ir) },
    { id: 'requirements',  title: 'Requirements Traceability',   level: 2, content: buildRequirements(ir) },
    { id: 'effort',        title: 'Effort Distribution',         level: 2, content: charts.effortBreakdownChart(ir) },
  ];
}

// ─── Phase 182 Plan 03: Cluster B helpers (CLR-07, CLR-08) ───────────────────

/**
 * Build launch headline for launch-announcement (CLR-07).
 * Reads ir.project name, goal, and phases milestone_name.
 * Format: "[Project] [milestone] is here — [goal]"
 */
function buildLaunchHeadline(ir) {
  const sentinel = sentinelHtml(ir.project, 'Project');
  if (sentinel) return sentinel;

  const name = escHtml(ir.project.name || 'Project');
  const goal = escHtml(ir.project.goal || '');
  const phaseSentinel = sentinelHtml(ir.phases, 'Phase progress');
  const milestone = (!phaseSentinel && ir.phases && (ir.phases.milestone_name || ir.phases.milestone))
    ? escHtml(ir.phases.milestone_name || ir.phases.milestone)
    : '';

  const headline = milestone
    ? `${name} — ${milestone} is here`
    : `${name} Launch`;

  return `<p class="lead">${headline}${goal ? ` — ${goal}` : ''}</p>`;
}

/**
 * Build "what's new" section for launch-announcement (CLR-07).
 * Reads ir.phases.phase_list filtering for completed phases.
 * Lists each completed phase as a feature bullet.
 */
function buildWhatsNew(ir) {
  const sentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (sentinel) return sentinel;

  const phaseList = Array.isArray(ir.phases.phase_list) ? ir.phases.phase_list : [];
  const completed = phaseList.filter(p => p.completed);

  if (completed.length === 0) {
    return '<p>Launch details coming soon.</p>';
  }

  const list = completed.map(p => `<li>${escHtml(p.name)}</li>`).join('\n');
  return `<p><strong>${completed.length} milestone(s) delivered:</strong></p><ul>${list}</ul>`;
}

/**
 * Build audience statement for launch-announcement (CLR-07).
 * Reads ir.project.target_users and ir.project.core_value.
 */
function buildAudience(ir) {
  const sentinel = sentinelHtml(ir.project, 'Project');
  if (sentinel) return sentinel;

  const targetUsers = escHtml(ir.project.target_users || '');
  const coreValue = escHtml(ir.project.core_value || '');

  if (!targetUsers && !coreValue) {
    return '<p>Built for teams who need to move fast without compromising quality.</p>';
  }

  return `${targetUsers ? `<p><strong>Built for:</strong> ${targetUsers}</p>` : ''}
${coreValue ? `<p><strong>Core value:</strong> ${coreValue}</p>` : ''}`.trim();
}

/**
 * Build getting started section for launch-announcement (CLR-07).
 * Reads ir.project.name for generic onboarding guidance.
 */
function buildGettingStarted(ir) {
  const sentinel = sentinelHtml(ir.project, 'Project');
  if (sentinel) return sentinel;

  const name = escHtml(ir.project.name || 'this project');

  return `<p>To get started with ${name}:</p>
<ol>
  <li>Clone or access the project repository.</li>
  <li>Follow the setup instructions in the project README.</li>
  <li>Review the documentation to understand the platform capabilities.</li>
  <li>Run the provided CLI commands to explore available features.</li>
</ol>`;
}

/**
 * Build cross-project patterns section for portfolio-overview (CLR-08).
 * Reads ir.phases (total, completed), ir.requirements (total, completed), ir.git_velocity.
 * Summarizes as quantitative patterns.
 */
function buildPatterns(ir) {
  const parts = [];

  const phasesSentinel = sentinelHtml(ir.phases, 'Phase progress');
  if (!phasesSentinel) {
    const total = ir.phases.total || 0;
    const completed = ir.phases.completed || 0;
    parts.push(`<p><strong>Phases delivered:</strong> ${completed} of ${total} phases complete (${total > 0 ? Math.round((completed / total) * 100) : 0}%)</p>`);
  } else {
    parts.push(phasesSentinel);
  }

  const reqSentinel = sentinelHtml(ir.requirements, 'Requirements');
  if (!reqSentinel) {
    const total = ir.requirements.total || 0;
    const completed = ir.requirements.completed || 0;
    parts.push(`<p><strong>Requirements met:</strong> ${completed} of ${total} (${total > 0 ? Math.round((completed / total) * 100) : 0}%)</p>`);
  }

  const velSentinel = sentinelHtml(ir.git_velocity, 'Git velocity');
  if (!velSentinel) {
    const totalCommits = ir.git_velocity.total_commits || 0;
    const avgPerPhase = ir.git_velocity.commits_per_phase || 0;
    parts.push(`<p><strong>Commits:</strong> ${totalCommits} total · ${avgPerPhase} avg/phase</p>`);
  }

  return parts.length > 0 ? parts.join('\n') : '<p>No pattern data available.</p>';
}

/**
 * Build skills demonstrated section for portfolio-overview (CLR-08).
 * Reads ir.requirements.categories (if available) and ir.decisions for technology choices.
 */
function buildSkillsDemonstrated(ir) {
  const parts = [];

  const reqSentinel = sentinelHtml(ir.requirements, 'Requirements');
  if (!reqSentinel && Array.isArray(ir.requirements.categories) && ir.requirements.categories.length > 0) {
    const catList = ir.requirements.categories.map(cat =>
      `<li><strong>${escHtml(cat.name)}</strong> — ${cat.completed || 0}/${cat.total || 0} requirements met</li>`
    ).join('\n');
    parts.push(`<h3>Requirement Categories</h3><ul>${catList}</ul>`);
  }

  const decSentinel = sentinelHtml(ir.decisions, 'Decisions');
  if (!decSentinel && Array.isArray(ir.decisions && ir.decisions.items) && ir.decisions.items.length > 0) {
    const decList = ir.decisions.items.slice(0, 8).map(d =>
      `<li>${escHtml(d.text || String(d))} <em class="source">[${escHtml(d.source || '')}]</em></li>`
    ).join('\n');
    parts.push(`<h3>Technology Decisions</h3><ul>${decList}</ul>`);
  }

  if (parts.length === 0) {
    return '<p>Skill data derived from project requirements and decisions — see above sections for full coverage.</p>';
  }

  return parts.join('\n');
}

// ─── Phase 182 Plan 03: Cluster B persona builders (CLR-07, CLR-08) ──────────

/**
 * Build launch announcement sections (CLR-07).
 * Target audience: Users, community, marketing, press.
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildLaunchAnnouncement(ir) {
  return [
    { id: 'headline',     title: 'Launch Announcement',  level: 1, content: buildLaunchHeadline(ir) },
    { id: 'whats-new',    title: "What's New",           level: 2, content: buildWhatsNew(ir) },
    { id: 'who-its-for',  title: "Who It's For",         level: 2, content: buildAudience(ir) },
    { id: 'how-to-start', title: 'Getting Started',      level: 2, content: buildGettingStarted(ir) },
    { id: 'metrics',      title: 'By the Numbers',       level: 2, content: buildProgress(ir) },
  ];
}

/**
 * Build portfolio overview sections (CLR-08).
 * Target audience: Hiring managers, portfolio reviewers, self-assessment.
 *
 * @param {object} ir - IR from buildPresentationIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildPortfolioOverview(ir) {
  return [
    { id: 'overview',  title: 'Portfolio Overview',      level: 1, content: buildOverview(ir) },
    { id: 'patterns',  title: 'Cross-Project Patterns',  level: 2, content: buildPatterns(ir) },
    { id: 'skills',    title: 'Skills Demonstrated',     level: 2, content: buildSkillsDemonstrated(ir) },
    { id: 'outcomes',  title: 'Cumulative Outcomes',     level: 2, content: buildRequirements(ir) },
    { id: 'velocity',  title: 'Development Velocity',    level: 2, content: charts.velocityChart(ir) },
    { id: 'effort',    title: 'Effort Distribution',     level: 2, content: charts.effortBreakdownChart(ir) },
  ];
}

// ─── Cross-project portfolio render helpers ───────────────────────────────────

/**
 * Build the portfolio header section.
 * Shows project count, available count, and extraction timestamp.
 *
 * @param {object} portfolioIR
 * @returns {string} HTML content
 */
function buildPortfolioHeader(portfolioIR) {
  const total = portfolioIR.project_count || 0;
  const available = portfolioIR.available_count || 0;
  const extractedAt = escHtml(portfolioIR.extracted_at || new Date().toISOString());

  if (available === 0) {
    return `<p class="pf-meta">No projects could be extracted from the provided paths (0 available out of ${total} provided).</p>
<p class="pf-meta">Extracted: ${extractedAt}</p>`;
  }

  return `<p class="pf-meta"><strong>${available}</strong> of <strong>${total}</strong> project(s) available for synthesis.</p>
<p class="pf-meta">Extracted: ${extractedAt}</p>`;
}

/**
 * Build project list section.
 * Available projects show metadata; unavailable show warning with reason.
 *
 * @param {object} portfolioIR
 * @returns {string} HTML content
 */
function buildProjectList(portfolioIR) {
  const projects = portfolioIR.projects || [];
  if (projects.length === 0) {
    return '<p>No projects provided.</p>';
  }

  const items = projects.map(function(project) {
    if (project.unavailable) {
      const projectPath = escHtml(project.path || 'unknown');
      const reason = escHtml(project.reason || 'data unavailable');
      return `<div class="pf-project pf-project--unavailable">
  <h3 class="pf-project-name"><span class="badge badge--warning">Unavailable</span> ${projectPath}</h3>
  <p class="pf-unavailable-reason">Data unavailable: ${reason}</p>
</div>`;
    }

    const ir = project.ir || {};
    const projectName = escHtml((ir.project && ir.project.name) || project.path || 'Unknown Project');
    const phases = ir.phases || {};
    const reqs = ir.requirements || {};
    const milestones = project.milestoneHistory;

    let milestoneInfo = '';
    if (milestones && milestones.available && milestones.count > 0) {
      milestoneInfo = `<li>${milestones.count} milestone(s) shipped</li>`;
    }

    return `<div class="pf-project">
  <h3 class="pf-project-name">${projectName}</h3>
  <ul class="pf-project-stats">
    <li>Phases: ${phases.completed || 0} / ${phases.total || 0} completed (${phases.completion_pct || 0}%)</li>
    <li>Requirements: ${reqs.completed || 0} / ${reqs.total || 0} completed (${reqs.completion_pct || 0}%)</li>
    ${milestoneInfo}
  </ul>
</div>`;
  });

  return items.join('\n');
}

/**
 * Aggregate cross-project patterns from available projects.
 * Shows recurring tech stack items and common decision themes.
 *
 * @param {object} portfolioIR
 * @returns {string} HTML content
 */
function buildCrossPatterns(portfolioIR) {
  const availableProjects = (portfolioIR.projects || []).filter(function(p) { return !p.unavailable; });

  if (availableProjects.length === 0) {
    return '<p>No available projects to analyze for patterns.</p>';
  }

  // Collect all decisions across projects
  const allDecisions = [];
  availableProjects.forEach(function(project) {
    const decisions = (project.ir && project.ir.decisions) || [];
    decisions.forEach(function(d) {
      const text = typeof d === 'string' ? d : (d.summary || '');
      if (text) allDecisions.push(escHtml(text));
    });
  });

  // Collect research topics
  var allTopics = [];
  availableProjects.forEach(function(project) {
    var research = (project.ir && project.ir.research) || {};
    var topics = Array.isArray(research.topics) ? research.topics : [];
    topics.forEach(function(t) {
      if (t) allTopics.push(escHtml(String(t)));
    });
  });

  let html = `<p>Cross-project analysis across ${availableProjects.length} project(s):</p>`;

  if (allDecisions.length > 0) {
    const decisionsHtml = allDecisions.slice(0, 8).map(function(d) {
      return `<li>${d}</li>`;
    }).join('\n');
    html += `<h4>Key Architectural Decisions</h4><ul>${decisionsHtml}</ul>`;
  }

  if (allTopics.length > 0) {
    var topicsHtml = allTopics.slice(0, 6).map(function(t) {
      return '<li>' + t + '</li>';
    }).join('\n');
    html += '<h4>Research Topics</h4><ul>' + topicsHtml + '</ul>';
  }

  if (allDecisions.length === 0 && allTopics.length === 0) {
    html += '<p>No cross-project patterns extracted.</p>';
  }

  return html;
}

/**
 * Build cumulative outcomes section.
 * Sums phases and requirements across available projects.
 *
 * @param {object} portfolioIR
 * @returns {string} HTML content
 */
function buildCumulativeOutcomes(portfolioIR) {
  const availableProjects = (portfolioIR.projects || []).filter(function(p) { return !p.unavailable; });

  if (availableProjects.length === 0) {
    return '<p>No available projects to compute outcomes.</p>';
  }

  let totalPhases = 0;
  let completedPhases = 0;
  let totalReqs = 0;
  let completedReqs = 0;

  availableProjects.forEach(function(project) {
    const phases = (project.ir && project.ir.phases) || {};
    const reqs = (project.ir && project.ir.requirements) || {};
    totalPhases += phases.total || 0;
    completedPhases += phases.completed || 0;
    totalReqs += reqs.total || 0;
    completedReqs += reqs.completed || 0;
  });

  const phasesPct = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
  const reqsPct = totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0;

  return `<table class="pf-outcomes-table">
  <thead><tr><th>Metric</th><th>Completed</th><th>Total</th><th>Progress</th></tr></thead>
  <tbody>
    <tr><td>Phases</td><td>${completedPhases}</td><td>${totalPhases}</td><td>${phasesPct}%</td></tr>
    <tr><td>Requirements</td><td>${completedReqs}</td><td>${totalReqs}</td><td>${reqsPct}%</td></tr>
  </tbody>
</table>
<p class="pf-meta">Across ${availableProjects.length} project(s).</p>`;
}

/**
 * Build milestone timeline section.
 * Collects milestones from all available projects, sorted by shipped date.
 *
 * @param {object} portfolioIR
 * @returns {string} HTML content
 */
function buildMilestoneTimeline(portfolioIR) {
  const availableProjects = (portfolioIR.projects || []).filter(function(p) { return !p.unavailable; });

  if (availableProjects.length === 0) {
    return '<p>No available projects for milestone timeline.</p>';
  }

  const allMilestones = [];
  availableProjects.forEach(function(project) {
    const history = project.milestoneHistory;
    if (!history || history.unavailable) return;
    (history.milestones || []).forEach(function(m) {
      allMilestones.push({
        version: escHtml(m.version || ''),
        name: escHtml(m.name || ''),
        shipped: escHtml(m.shipped || ''),
        phases_completed: m.phases_completed,
        projectPath: escHtml(project.path || ''),
        projectName: escHtml((project.ir && project.ir.project && project.ir.project.name) || project.path || ''),
      });
    });
  });

  if (allMilestones.length === 0) {
    return '<p>No milestone history available across projects.</p>';
  }

  // Sort by shipped date (lexicographic ISO date comparison)
  allMilestones.sort(function(a, b) {
    return a.shipped.localeCompare(b.shipped);
  });

  const rows = allMilestones.map(function(m) {
    const phases = m.phases_completed !== null ? m.phases_completed + ' phases' : '—';
    return `<tr>
      <td>${m.shipped}</td>
      <td>${m.version}</td>
      <td>${m.name}</td>
      <td>${phases}</td>
      <td>${m.projectName}</td>
    </tr>`;
  }).join('\n');

  return `<table class="pf-timeline-table">
  <thead><tr><th>Shipped</th><th>Version</th><th>Name</th><th>Phases</th><th>Project</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

// ─── buildCrossProjectPortfolio ───────────────────────────────────────────────

/**
 * Build sections array for a cross-project portfolio.
 * Takes portfolioIR (from buildPortfolioIR) — NOT single-project IR.
 *
 * Returns 5 sections: header, projects, patterns, outcomes, timeline.
 *
 * PORT-05: every helper checks project.unavailable before accessing project.ir.
 *
 * @param {object} portfolioIR - Output of buildPortfolioIR()
 * @returns {Array<{id: string, title: string, level: number, content: string}>}
 */
function buildCrossProjectPortfolio(portfolioIR) {
  return [
    { id: 'header',   title: 'Portfolio Overview',        level: 1, content: buildPortfolioHeader(portfolioIR) },
    { id: 'projects', title: 'Projects',                  level: 2, content: buildProjectList(portfolioIR) },
    { id: 'patterns', title: 'Cross-Project Patterns',    level: 2, content: buildCrossPatterns(portfolioIR) },
    { id: 'outcomes', title: 'Cumulative Outcomes',       level: 2, content: buildCumulativeOutcomes(portfolioIR) },
    { id: 'timeline', title: 'Milestone Timeline',        level: 2, content: buildMilestoneTimeline(portfolioIR) },
  ];
}

// ─── cmdPortfolioRender ───────────────────────────────────────────────────────

/**
 * CLI handler for `pde-tools portfolio render`.
 * Reads portfolioIR JSON file, renders HTML+MD using buildCrossProjectPortfolio.
 * Bypasses the persona dispatch in render() — uses renderHTML/renderMarkdown directly
 * to avoid mixing single-project and multi-project IR shapes.
 *
 * @param {string} cwd - Invoking project's working directory
 * @param {string} portfolioIRPath - Path to portfolioIR JSON file
 * @param {string} htmlPath - Output HTML path
 * @param {string} mdPath - Output Markdown path
 */
function cmdPortfolioRender(cwd, portfolioIRPath, htmlPath, mdPath) {
  const { output, error } = require('./core.cjs');

  if (!portfolioIRPath) {
    error('Missing portfolio-ir-path argument. Usage: portfolio render <ir-path> <html-path> <md-path>');
  }
  if (!htmlPath) {
    error('Missing html-path argument. Usage: portfolio render <ir-path> <html-path> <md-path>');
  }
  if (!mdPath) {
    error('Missing md-path argument. Usage: portfolio render <ir-path> <html-path> <md-path>');
  }

  let portfolioIR;
  try {
    portfolioIR = JSON.parse(fs.readFileSync(portfolioIRPath, 'utf-8'));
  } catch (e) {
    error('Failed to parse portfolioIR file at ' + portfolioIRPath + ': ' + e.message);
  }

  const sections = buildCrossProjectPortfolio(portfolioIR);

  // Build a minimal IR-like object for renderHTML/renderMarkdown title fields
  // The portfolio-synthesis persona is not registered in render() switch —
  // we call renderHTML/renderMarkdown directly with the sections array
  const syntheticMeta = {
    project: { name: 'Cross-Project Portfolio', unavailable: false },
    extracted_at: portfolioIR.extracted_at || new Date().toISOString(),
    source_hash: '',
  };

  const html = renderHTML(syntheticMeta, 'portfolio-synthesis', sections);
  const md = renderMarkdown(syntheticMeta, 'portfolio-synthesis', sections);

  // Ensure parent directories exist
  const htmlDir = path.dirname(htmlPath);
  const mdDir = path.dirname(mdPath);
  if (htmlDir && !fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });
  if (mdDir && mdDir !== htmlDir && !fs.existsSync(mdDir)) fs.mkdirSync(mdDir, { recursive: true });

  fs.writeFileSync(htmlPath, html, 'utf-8');
  fs.writeFileSync(mdPath, md, 'utf-8');

  const htmlBytes = Buffer.byteLength(html, 'utf-8');
  output({ htmlPath, mdPath, htmlBytes });
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

  /* Chart data tables */
  .chart-data-table { margin-top: 0.5rem; font-size: 0.85rem; }
  .chart-data-table summary { cursor: pointer; color: var(--pde-text-muted); }
  .chart-data-table table { margin-top: 0.25rem; }
  svg { display: block; }

  /* Verification footer (Phase 180) */
  .verification-status { padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.9rem; border: 1px solid; }
  .verification-status.pass { background: rgba(63, 185, 80, 0.1); border-color: rgba(63, 185, 80, 0.3); color: #3fb950; }
  .verification-status.fail { background: rgba(248, 81, 73, 0.1); border-color: rgba(248, 81, 73, 0.3); color: #f85149; }
  .verification-meta { color: #8b949e; font-size: 0.8rem; }
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
    case 'investor-update':
      sections = buildInvestorUpdate(ir);
      break;
    case 'sprint-review':
      sections = buildSprintReview(ir);
      break;
    case 'client-deliverable':
      sections = buildClientDeliverable(ir);
      break;
    case 'stakeholder-status':
      sections = buildStakeholderStatus(ir);
      break;
    case 'pm-view':
      sections = buildProductManager(ir);
      break;
    case 'project-manager-view':
      sections = buildProjectManager(ir);
      break;
    case 'agile-report':
      sections = buildAgileReport(ir);
      break;
    case 'design-report':
      sections = buildDesignReport(ir);
      break;
    case 'research-report':
      sections = buildResearchReport(ir);
      break;
    case 'post-mortem':
      sections = buildPostMortem(ir);
      break;
    case 'adr-summary':
      sections = buildAdrSummary(ir);
      break;
    case 'launch-announcement':
      sections = buildLaunchAnnouncement(ir);
      break;
    case 'portfolio-overview':
      sections = buildPortfolioOverview(ir);
      break;
    default:
      throw new Error(`Unknown persona: ${persona}. Available: executive-summary, case-study, investor-update, sprint-review, client-deliverable, stakeholder-status, pm-view, project-manager-view, agile-report, design-report, research-report, post-mortem, adr-summary, launch-announcement, portfolio-overview`);
  }

  // Claim verification (VER-01/02/03): compare rendered content against canonical IR
  // Verification is non-blocking — mismatches produce stderr warnings but never abort rendering
  const { verifyPresentation, buildVerificationFooterHtml } = require('./verify-presentation.cjs');
  const verificationResult = verifyPresentation(ir, sections);
  sections.push({
    id: 'verification',
    title: 'Verification',
    level: 2,
    content: buildVerificationFooterHtml(verificationResult),
  });
  if (!verificationResult.pass) {
    process.stderr.write(`[render-presentation] WARNING: ${verificationResult.mismatches.length} claim mismatch(es) detected in "${persona}" presentation.\n`);
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
  stripHtml,
  embedImage,
  buildTOC,
  personaDisplayName,
  buildExecutiveSummary,
  buildCaseStudy,
  buildInvestorUpdate,
  buildSprintReview,
  buildClientDeliverable,
  buildStakeholderStatus,
  buildProductManager,
  buildProjectManager,
  buildAgileReport,
  buildDesignReport,
  buildResearchReport,
  buildPostMortem,
  buildAdrSummary,
  buildLaunchAnnouncement,
  buildPortfolioOverview,
  buildCrossProjectPortfolio,
  renderHTML,
  renderMarkdown,
  render,
  cmdPresentationRender,
  cmdPortfolioRender,
};
