#!/usr/bin/env node

/**
 * PDE Tools — CLI utility for PDE workflow operations
 *
 * Replaces repetitive inline bash patterns across ~50 PDE command/workflow/agent files.
 * Centralizes: config parsing, model resolution, phase lookup, git commits, summary verification.
 *
 * Usage: node pde-tools.cjs <command> [args] [--raw]
 *
 * Atomic Commands:
 *   state load                         Load project config + state
 *   state json                         Output STATE.md frontmatter as JSON
 *   state update <field> <value>       Update a STATE.md field
 *   state get [section]                Get STATE.md content or section
 *   state patch --field val ...        Batch update STATE.md fields
 *   resolve-model <agent-type>         Get model for agent based on profile
 *   find-phase <phase>                 Find phase directory by number
 *   commit <message> [--files f1 f2]   Commit planning docs
 *   verify-summary <path>              Verify a SUMMARY.md file
 *   generate-slug <text>               Convert text to URL-safe slug
 *   current-timestamp [format]         Get timestamp (full|date|filename)
 *   list-todos [area]                  Count and enumerate pending todos
 *   verify-path-exists <path>          Check file/directory existence
 *   config-ensure-section              Initialize .planning/config.json
 *   history-digest                     Aggregate all SUMMARY.md data
 *   summary-extract <path> [--fields]  Extract structured data from SUMMARY.md
 *   state-snapshot                     Structured parse of STATE.md
 *   phase-plan-index <phase>           Index plans with waves and status
 *   websearch <query>                  Search web via Brave API (if configured)
 *     [--limit N] [--freshness day|week|month]
 *   context-sync [--editor cursor|gemini|all]  Generate editor context files (AGENTS.md, .mdc, GEMINI.md)
 *   poll-approval <id> [timeout_ms]   Poll for approval response by ID
 *
 * Phase Operations:
 *   phase next-decimal <phase>         Calculate next decimal phase number
 *   phase add <description>            Append new phase to roadmap + create dir
 *   phase insert <after> <description> Insert decimal phase after existing
 *   phase remove <phase> [--force]     Remove phase, renumber all subsequent
 *   phase complete <phase>             Mark phase done, update state + roadmap
 *
 * Roadmap Operations:
 *   roadmap get-phase <phase>          Extract phase section from ROADMAP.md
 *   roadmap analyze                    Full roadmap parse with disk status
 *   roadmap update-plan-progress <N>   Update progress table row from disk (PLAN vs SUMMARY counts)
 *
 * Requirements Operations:
 *   requirements mark-complete <ids>   Mark requirement IDs as complete in REQUIREMENTS.md
 *                                      Accepts: REQ-01,REQ-02 or REQ-01 REQ-02 or [REQ-01, REQ-02]
 *
 * Milestone Operations:
 *   milestone complete <version>       Archive milestone, create MILESTONES.md
 *     [--name <name>]
 *     [--archive-phases]               Move phase dirs to milestones/vX.Y-phases/
 *
 * Design Operations:
 *   design ensure-dirs                 Create .planning/design/ and domain subdirs
 *   design manifest-read               Output design-manifest.json as JSON
 *   design manifest-update <code> <field> <value>  Update artifact field in manifest
 *   design artifact-path <code>        Resolve canonical artifact path from manifest
 *   design tokens-to-css <tokens-file> Convert DTCG JSON to CSS custom properties
 *   design coverage-check              Return which artifact types exist
 *   design lock-acquire <owner>        Acquire root DESIGN-STATE.md write lock
 *   design lock-release                Release root DESIGN-STATE.md write lock
 *   design lock-status                  Check root DESIGN-STATE.md write lock state
 *   design manifest-set-top-level <field> <value>  Set root-level manifest field (e.g. projectName, productType)
 *
 * Sharding:
 *   shard-plan <plan-path>             Shard PLAN.md into per-task files
 *     [--threshold N]                  Min task count to shard (default: 5)
 *
 * File Manifest:
 *   manifest init                      Build files-manifest.csv from plugin root
 *   manifest check                     Check manifest entries against disk hashes
 *
 * Readiness:
 *   readiness check <phase> [plan]     Run readiness checks against a plan
 *   readiness result <phase>           Read last readiness result
 *
 * Task Tracking:
 *   tracking init <phase> <plan>       Initialize workflow-status.md for a plan
 *     [--names 'Task A|Task B']
 *   tracking set-status <phase> <plan> Update task status in workflow-status.md
 *   tracking read <phase> <plan>       Read current workflow status
 *
 * Validation:
 *   validate consistency               Check phase numbering, disk/roadmap sync
 *   validate health [--repair]         Check .planning/ integrity, optionally repair
 *
 * Progress:
 *   progress [json|table|bar]          Render progress in various formats
 *
 * Todos:
 *   todo complete <filename>           Move todo from pending to completed
 *
 * Scaffolding:
 *   scaffold context --phase <N>       Create CONTEXT.md template
 *   scaffold uat --phase <N>           Create UAT.md template
 *   scaffold verification --phase <N>  Create VERIFICATION.md template
 *   scaffold phase-dir --phase <N>     Create phase directory
 *     --name <name>
 *
 * Frontmatter CRUD:
 *   frontmatter get <file> [--field k] Extract frontmatter as JSON
 *   frontmatter set <file> --field k   Update single frontmatter field
 *     --value jsonVal
 *   frontmatter merge <file>           Merge JSON into frontmatter
 *     --data '{json}'
 *   frontmatter validate <file>        Validate required fields
 *     --schema plan|summary|verification
 *
 * Verification Suite:
 *   verify plan-structure <file>       Check PLAN.md structure + tasks
 *   verify phase-completeness <phase>  Check all plans have summaries
 *   verify references <file>           Check @-refs + paths resolve
 *   verify commits <h1> [h2] ...      Batch verify commit hashes
 *   verify artifacts <plan-file>       Check must_haves.artifacts
 *   verify key-links <plan-file>       Check must_haves.key_links
 *
 * Template Fill:
 *   template fill summary --phase N    Create pre-filled SUMMARY.md
 *     [--plan M] [--name "..."]
 *     [--fields '{json}']
 *   template fill plan --phase N       Create pre-filled PLAN.md
 *     [--plan M] [--type execute|tdd]
 *     [--wave N] [--fields '{json}']
 *   template fill verification         Create pre-filled VERIFICATION.md
 *     --phase N [--fields '{json}']
 *
 * State Progression:
 *   state advance-plan                 Increment plan counter
 *   state record-metric --phase N      Record execution metrics
 *     --plan M --duration Xmin
 *     [--tasks N] [--files N]
 *   state update-progress              Recalculate progress bar
 *   state add-decision --summary "..."  Add decision to STATE.md
 *     [--phase N] [--rationale "..."]
 *     [--summary-file path] [--rationale-file path]
 *   state add-blocker --text "..."     Add blocker
 *     [--text-file path]
 *   state resolve-blocker --text "..." Remove blocker
 *   state record-session               Update session continuity
 *     --stopped-at "..."
 *     [--resume-file path]
 *
 * Compound Commands (workflow-specific initialization):
 *   init execute-phase <phase>         All context for execute-phase workflow
 *   init plan-phase <phase>            All context for plan-phase workflow
 *   init new-project                   All context for new-project workflow
 *   init new-milestone                 All context for new-milestone workflow
 *   init quick <description>           All context for quick workflow
 *   init resume                        All context for resume-project workflow
 *   init verify-work <phase>           All context for verify-work workflow
 *   init phase-op <phase>              Generic phase operation context
 *   init todos [area]                  All context for todo workflows
 *   init milestone-op                  All context for milestone operations
 *   init map-codebase                  All context for map-codebase workflow
 *   init progress                      All context for progress workflow
 *
 * Experiment Operations:
 *   experiment init --slug SLUG                           Initialize experiment branch + state file
 *   experiment commit --slug SLUG --metric N --description TEXT  Commit candidate with metric
 *   experiment reset --slug SLUG                          Roll back last experiment commit
 *   experiment promote --slug SLUG                        Cherry-pick best commit onto main
 *   experiment status --slug SLUG                         Show current experiment state
 *   experiment cleanup --slug SLUG                        Delete experiment branch
 *
 * Image Pipeline:
 *   image og|social|screenshot|mockup|rembg|list  Image pipeline operations
 *     og --title T --description D --slug S        Generate OG image (1200x630)
 *     social --title T --description D --slug S    Generate social cards (3 variants)
 *     screenshot <url> [--viewport V] [--slug S]   Capture URL screenshot
 *     mockup <screenshot> [--frame F] [--slug S]   Composite device mockup
 *     rembg <image> [--slug S]                     Remove background (remove.bg)
 *     list [--type og|social|mockup|screenshot|rembg]  List generated assets
 *
 * Suggestions:
 *   suggestions                        Print current idle suggestions to stdout
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { error, output } = require('./lib/core.cjs');
const state = require('./lib/state.cjs');
const phase = require('./lib/phase.cjs');
const roadmap = require('./lib/roadmap.cjs');
const verify = require('./lib/verify.cjs');
const config = require('./lib/config.cjs');
const template = require('./lib/template.cjs');
const milestone = require('./lib/milestone.cjs');
const commands = require('./lib/commands.cjs');
const init = require('./lib/init.cjs');
const frontmatter = require('./lib/frontmatter.cjs');
const validateSkill = require('./lib/validate-skill.cjs');

// ─── Session Helpers ─────────────────────────────────────────────────────────

/**
 * Resolve the current phase directory from STATE.md frontmatter.
 * Used by session-scoped writes in the record-session gate (ISO-06).
 *
 * @param {string} cwd - Project root
 * @returns {string} Absolute path to current phase directory
 */
function _resolvePhaseDir(cwd) {
  try {
    const statePath = path.join(cwd, '.planning', 'STATE.md');
    const stateContent = fs.readFileSync(statePath, 'utf-8');
    const fmPhaseMatch = stateContent.match(/^current_phase:\s*['"]?(\S+?)['"]?\s*$/m);
    const phaseNum = fmPhaseMatch ? fmPhaseMatch[1] : null;
    if (phaseNum) {
      const phasesDir = path.join(cwd, '.planning', 'phases');
      if (fs.existsSync(phasesDir)) {
        const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
        const match = entries.find(e => e.isDirectory() && e.name.startsWith(phaseNum + '-'));
        if (match) {
          return path.join(phasesDir, match.name);
        }
      }
    }
  } catch (_) {}
  return path.join(cwd, '.planning', 'phases');
}

// ─── CLI Router ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Optional cwd override for sandboxed subagents running outside project root.
  let cwd = process.cwd();
  const cwdEqArg = args.find(arg => arg.startsWith('--cwd='));
  const cwdIdx = args.indexOf('--cwd');
  if (cwdEqArg) {
    const value = cwdEqArg.slice('--cwd='.length).trim();
    if (!value) error('Missing value for --cwd');
    args.splice(args.indexOf(cwdEqArg), 1);
    cwd = path.resolve(value);
  } else if (cwdIdx !== -1) {
    const value = args[cwdIdx + 1];
    if (!value || value.startsWith('--')) error('Missing value for --cwd');
    args.splice(cwdIdx, 2);
    cwd = path.resolve(value);
  }

  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    error(`Invalid --cwd: ${cwd}`);
  }

  const rawIndex = args.indexOf('--raw');
  const raw = rawIndex !== -1;
  if (rawIndex !== -1) args.splice(rawIndex, 1);

  const command = args[0];

  if (!command) {
    error('Usage: pde-tools <command> [args] [--raw] [--cwd <path>]\nCommands: state, resolve-model, find-phase, commit, verify-summary, verify, frontmatter, template, generate-slug, current-timestamp, list-todos, verify-path-exists, config-ensure-section, init');
  }

  switch (command) {
    case 'state': {
      const subcommand = args[1];
      if (subcommand === 'json') {
        state.cmdStateJson(cwd, raw);
      } else if (subcommand === 'update') {
        state.cmdStateUpdate(cwd, args[2], args[3]);
      } else if (subcommand === 'get') {
        state.cmdStateGet(cwd, args[2], raw);
      } else if (subcommand === 'patch') {
        const patches = {};
        for (let i = 2; i < args.length; i += 2) {
          const key = args[i].replace(/^--/, '');
          const value = args[i + 1];
          if (key && value !== undefined) {
            patches[key] = value;
          }
        }
        state.cmdStatePatch(cwd, patches, raw);
      } else if (subcommand === 'advance-plan') {
        state.cmdStateAdvancePlan(cwd, raw);
      } else if (subcommand === 'record-metric') {
        const phaseIdx = args.indexOf('--phase');
        const planIdx = args.indexOf('--plan');
        const durationIdx = args.indexOf('--duration');
        const tasksIdx = args.indexOf('--tasks');
        const filesIdx = args.indexOf('--files');
        state.cmdStateRecordMetric(cwd, {
          phase: phaseIdx !== -1 ? args[phaseIdx + 1] : null,
          plan: planIdx !== -1 ? args[planIdx + 1] : null,
          duration: durationIdx !== -1 ? args[durationIdx + 1] : null,
          tasks: tasksIdx !== -1 ? args[tasksIdx + 1] : null,
          files: filesIdx !== -1 ? args[filesIdx + 1] : null,
        }, raw);
      } else if (subcommand === 'update-progress') {
        state.cmdStateUpdateProgress(cwd, raw);
      } else if (subcommand === 'add-decision') {
        const phaseIdx = args.indexOf('--phase');
        const summaryIdx = args.indexOf('--summary');
        const summaryFileIdx = args.indexOf('--summary-file');
        const rationaleIdx = args.indexOf('--rationale');
        const rationaleFileIdx = args.indexOf('--rationale-file');
        state.cmdStateAddDecision(cwd, {
          phase: phaseIdx !== -1 ? args[phaseIdx + 1] : null,
          summary: summaryIdx !== -1 ? args[summaryIdx + 1] : null,
          summary_file: summaryFileIdx !== -1 ? args[summaryFileIdx + 1] : null,
          rationale: rationaleIdx !== -1 ? args[rationaleIdx + 1] : '',
          rationale_file: rationaleFileIdx !== -1 ? args[rationaleFileIdx + 1] : null,
        }, raw);
      } else if (subcommand === 'add-blocker') {
        const textIdx = args.indexOf('--text');
        const textFileIdx = args.indexOf('--text-file');
        state.cmdStateAddBlocker(cwd, {
          text: textIdx !== -1 ? args[textIdx + 1] : null,
          text_file: textFileIdx !== -1 ? args[textFileIdx + 1] : null,
        }, raw);
      } else if (subcommand === 'resolve-blocker') {
        const textIdx = args.indexOf('--text');
        state.cmdStateResolveBlocker(cwd, textIdx !== -1 ? args[textIdx + 1] : null, raw);
      } else if (subcommand === 'record-session') {
        // ISO-06: When running inside a session, write COMPLETE.json to phase
        // directory instead of updating shared STATE.md session fields.
        if (process.env.PDE_SESSION_ID) {
          const { writeCompleteJson } = require('./lib/session-artifacts.cjs');
          const phaseDir = _resolvePhaseDir(cwd);
          writeCompleteJson(cwd, phaseDir, {
            session_id: process.env.PDE_SESSION_ID,
            exit_code: 0,
            duration_ms: Date.now() - (parseInt(process.env.PDE_SESSION_START, 10) || Date.now()),
            completed_at: new Date().toISOString(),
            phase: parseInt(process.env.PDE_PHASE || '0', 10),
            plan: parseInt(process.env.PDE_PLAN || '0', 10),
          });
          output({ sessionScoped: true }, raw, 'Session-scoped: wrote COMPLETE.json');
        } else {
          const stoppedIdx = args.indexOf('--stopped-at');
          const resumeIdx = args.indexOf('--resume-file');
          state.cmdStateRecordSession(cwd, {
            stopped_at: stoppedIdx !== -1 ? args[stoppedIdx + 1] : null,
            resume_file: resumeIdx !== -1 ? args[resumeIdx + 1] : 'None',
          }, raw);
        }
      } else {
        state.cmdStateLoad(cwd, raw);
      }
      break;
    }

    case 'resolve-model': {
      commands.cmdResolveModel(cwd, args[1], raw);
      break;
    }

    case 'find-phase': {
      phase.cmdFindPhase(cwd, args[1], raw);
      break;
    }

    case 'commit': {
      const amend = args.includes('--amend');
      const filesIndex = args.indexOf('--files');
      const coAuthorIndex = args.indexOf('--co-author');
      const coAuthor = coAuthorIndex !== -1 ? args[coAuthorIndex + 1] : null;
      // Collect message: positional args between command name and first flag
      const firstFlagIndex = [filesIndex, coAuthorIndex].filter(i => i !== -1).reduce((min, i) => Math.min(min, i), args.length);
      const messageArgs = args.slice(1, firstFlagIndex).filter(a => !a.startsWith('--'));
      const message = messageArgs.join(' ') || undefined;
      // Collect files: args after --files, stopping at next flag
      const filesClean = [];
      if (filesIndex !== -1) {
        for (let i = filesIndex + 1; i < args.length; i++) {
          if (args[i].startsWith('--')) break;
          filesClean.push(args[i]);
        }
      }
      commands.cmdCommit(cwd, message, filesClean, raw, amend, coAuthor);
      break;
    }

    case 'verify-summary': {
      const summaryPath = args[1];
      const countIndex = args.indexOf('--check-count');
      const checkCount = countIndex !== -1 ? parseInt(args[countIndex + 1], 10) : 2;
      verify.cmdVerifySummary(cwd, summaryPath, checkCount, raw);
      break;
    }

    case 'template': {
      const subcommand = args[1];
      if (subcommand === 'select') {
        template.cmdTemplateSelect(cwd, args[2], raw);
      } else if (subcommand === 'fill') {
        const templateType = args[2];
        const phaseIdx = args.indexOf('--phase');
        const planIdx = args.indexOf('--plan');
        const nameIdx = args.indexOf('--name');
        const typeIdx = args.indexOf('--type');
        const waveIdx = args.indexOf('--wave');
        const fieldsIdx = args.indexOf('--fields');
        template.cmdTemplateFill(cwd, templateType, {
          phase: phaseIdx !== -1 ? args[phaseIdx + 1] : null,
          plan: planIdx !== -1 ? args[planIdx + 1] : null,
          name: nameIdx !== -1 ? args[nameIdx + 1] : null,
          type: typeIdx !== -1 ? args[typeIdx + 1] : 'execute',
          wave: waveIdx !== -1 ? args[waveIdx + 1] : '1',
          fields: fieldsIdx !== -1 ? JSON.parse(args[fieldsIdx + 1]) : {},
        }, raw);
      } else {
        error('Unknown template subcommand. Available: select, fill');
      }
      break;
    }

    case 'frontmatter': {
      const subcommand = args[1];
      const file = args[2];
      if (subcommand === 'get') {
        const fieldIdx = args.indexOf('--field');
        frontmatter.cmdFrontmatterGet(cwd, file, fieldIdx !== -1 ? args[fieldIdx + 1] : null, raw);
      } else if (subcommand === 'set') {
        const fieldIdx = args.indexOf('--field');
        const valueIdx = args.indexOf('--value');
        frontmatter.cmdFrontmatterSet(cwd, file, fieldIdx !== -1 ? args[fieldIdx + 1] : null, valueIdx !== -1 ? args[valueIdx + 1] : undefined, raw);
      } else if (subcommand === 'merge') {
        const dataIdx = args.indexOf('--data');
        frontmatter.cmdFrontmatterMerge(cwd, file, dataIdx !== -1 ? args[dataIdx + 1] : null, raw);
      } else if (subcommand === 'validate') {
        const schemaIdx = args.indexOf('--schema');
        frontmatter.cmdFrontmatterValidate(cwd, file, schemaIdx !== -1 ? args[schemaIdx + 1] : null, raw);
      } else {
        error('Unknown frontmatter subcommand. Available: get, set, merge, validate');
      }
      break;
    }

    case 'verify': {
      const subcommand = args[1];
      if (subcommand === 'plan-structure') {
        verify.cmdVerifyPlanStructure(cwd, args[2], raw);
      } else if (subcommand === 'phase-completeness') {
        verify.cmdVerifyPhaseCompleteness(cwd, args[2], raw);
      } else if (subcommand === 'references') {
        verify.cmdVerifyReferences(cwd, args[2], raw);
      } else if (subcommand === 'commits') {
        verify.cmdVerifyCommits(cwd, args.slice(2), raw);
      } else if (subcommand === 'artifacts') {
        verify.cmdVerifyArtifacts(cwd, args[2], raw);
      } else if (subcommand === 'key-links') {
        verify.cmdVerifyKeyLinks(cwd, args[2], raw);
      } else {
        error('Unknown verify subcommand. Available: plan-structure, phase-completeness, references, commits, artifacts, key-links');
      }
      break;
    }

    case 'generate-slug': {
      commands.cmdGenerateSlug(args[1], raw);
      break;
    }

    case 'current-timestamp': {
      commands.cmdCurrentTimestamp(args[1] || 'full', raw);
      break;
    }

    case 'list-todos': {
      commands.cmdListTodos(cwd, args[1], raw);
      break;
    }

    case 'verify-path-exists': {
      commands.cmdVerifyPathExists(cwd, args[1], raw);
      break;
    }

    case 'config-ensure-section': {
      config.cmdConfigEnsureSection(cwd, raw);
      break;
    }

    case 'config-set': {
      config.cmdConfigSet(cwd, args[1], args[2], raw);
      break;
    }

    case "config-set-model-profile": {
      config.cmdConfigSetModelProfile(cwd, args[1], raw);
      break;
    }

    case 'config-get': {
      config.cmdConfigGet(cwd, args[1], raw);
      break;
    }

    case 'history-digest': {
      commands.cmdHistoryDigest(cwd, raw);
      break;
    }

    case 'phases': {
      const subcommand = args[1];
      if (subcommand === 'list') {
        const typeIndex = args.indexOf('--type');
        const phaseIndex = args.indexOf('--phase');
        const options = {
          type: typeIndex !== -1 ? args[typeIndex + 1] : null,
          phase: phaseIndex !== -1 ? args[phaseIndex + 1] : null,
          includeArchived: args.includes('--include-archived'),
        };
        phase.cmdPhasesList(cwd, options, raw);
      } else {
        error('Unknown phases subcommand. Available: list');
      }
      break;
    }

    case 'roadmap': {
      const subcommand = args[1];
      if (subcommand === 'get-phase') {
        roadmap.cmdRoadmapGetPhase(cwd, args[2], raw);
      } else if (subcommand === 'analyze') {
        roadmap.cmdRoadmapAnalyze(cwd, raw);
      } else if (subcommand === 'update-plan-progress') {
        roadmap.cmdRoadmapUpdatePlanProgress(cwd, args[2], raw);
      } else {
        error('Unknown roadmap subcommand. Available: get-phase, analyze, update-plan-progress');
      }
      break;
    }

    case 'requirements': {
      const subcommand = args[1];
      if (subcommand === 'mark-complete') {
        milestone.cmdRequirementsMarkComplete(cwd, args.slice(2), raw);
      } else {
        error('Unknown requirements subcommand. Available: mark-complete');
      }
      break;
    }

    case 'phase': {
      const subcommand = args[1];
      if (subcommand === 'next-decimal') {
        phase.cmdPhaseNextDecimal(cwd, args[2], raw);
      } else if (subcommand === 'add') {
        phase.cmdPhaseAdd(cwd, args.slice(2).join(' '), raw);
      } else if (subcommand === 'insert') {
        phase.cmdPhaseInsert(cwd, args[2], args.slice(3).join(' '), raw);
      } else if (subcommand === 'remove') {
        const forceFlag = args.includes('--force');
        phase.cmdPhaseRemove(cwd, args[2], { force: forceFlag }, raw);
      } else if (subcommand === 'complete') {
        phase.cmdPhaseComplete(cwd, args[2], raw);
      } else {
        error('Unknown phase subcommand. Available: next-decimal, add, insert, remove, complete');
      }
      break;
    }

    case 'milestone': {
      const subcommand = args[1];
      if (subcommand === 'complete') {
        const nameIndex = args.indexOf('--name');
        const archivePhases = args.includes('--archive-phases');
        // Collect --name value (everything after --name until next flag or end)
        let milestoneName = null;
        if (nameIndex !== -1) {
          const nameArgs = [];
          for (let i = nameIndex + 1; i < args.length; i++) {
            if (args[i].startsWith('--')) break;
            nameArgs.push(args[i]);
          }
          milestoneName = nameArgs.join(' ') || null;
        }
        milestone.cmdMilestoneComplete(cwd, args[2], { name: milestoneName, archivePhases }, raw);
      } else {
        error('Unknown milestone subcommand. Available: complete');
      }
      break;
    }

    case 'design': {
      const subcommand = args[1];
      const design = require('./lib/design.cjs');
      if (subcommand === 'ensure-dirs') {
        design.cmdEnsureDirs(cwd, raw);
      } else if (subcommand === 'manifest-read') {
        design.cmdManifestRead(cwd, raw);
      } else if (subcommand === 'manifest-update') {
        design.cmdManifestUpdate(cwd, args[2], args[3], args[4], raw);
      } else if (subcommand === 'manifest-set-top-level') {
        design.cmdManifestSetTopLevel(cwd, args[2], args[3], raw);
      } else if (subcommand === 'artifact-path') {
        design.cmdArtifactPath(cwd, args[2], raw);
      } else if (subcommand === 'tokens-to-css') {
        design.cmdTokensToCss(cwd, args[2], raw);
      } else if (subcommand === 'coverage-check') {
        design.cmdCoverageCheck(cwd, raw);
      } else if (subcommand === 'lock-acquire') {
        design.cmdLockAcquire(cwd, args[2], raw);
      } else if (subcommand === 'lock-release') {
        design.cmdLockRelease(cwd, raw);
      } else if (subcommand === 'lock-status') {
        design.cmdLockStatus(cwd, raw);
      } else {
        error('Unknown design subcommand. Available: ensure-dirs, manifest-read, manifest-update, manifest-set-top-level, artifact-path, tokens-to-css, coverage-check, lock-acquire, lock-release, lock-status');
      }
      break;
    }

    case 'readiness': {
      const subcommand = args[1];
      const readiness = require('./lib/readiness.cjs');
      if (subcommand === 'check') {
        const phaseArg = args[2];
        const planFile = args[3];
        readiness.cmdReadinessCheck(cwd, phaseArg, planFile, raw);
      } else if (subcommand === 'result') {
        const phaseArg = args[2];
        readiness.cmdReadinessResult(cwd, phaseArg, raw);
      } else {
        error('Unknown readiness subcommand. Available: check, result');
      }
      break;
    }

    case 'validate': {
      const subcommand = args[1];
      if (subcommand === 'consistency') {
        verify.cmdValidateConsistency(cwd, raw);
      } else if (subcommand === 'health') {
        const repairFlag = args.includes('--repair');
        verify.cmdValidateHealth(cwd, { repair: repairFlag }, raw);
      } else {
        error('Unknown validate subcommand. Available: consistency, health');
      }
      break;
    }

    case 'validate-skill': {
      const skillPath = args[1];
      if (!skillPath) error('skill path required: validate-skill <path>');
      validateSkill.cmdValidateSkill(cwd, skillPath, raw);
      break;
    }

    case 'progress': {
      const subcommand = args[1] || 'json';
      commands.cmdProgressRender(cwd, subcommand, raw);
      break;
    }

    case 'stats': {
      const subcommand = args[1] || 'json';
      commands.cmdStats(cwd, subcommand, raw);
      break;
    }

    case 'todo': {
      const subcommand = args[1];
      if (subcommand === 'complete') {
        commands.cmdTodoComplete(cwd, args[2], raw);
      } else {
        error('Unknown todo subcommand. Available: complete');
      }
      break;
    }

    case 'scaffold': {
      const scaffoldType = args[1];
      const phaseIndex = args.indexOf('--phase');
      const nameIndex = args.indexOf('--name');
      const scaffoldOptions = {
        phase: phaseIndex !== -1 ? args[phaseIndex + 1] : null,
        name: nameIndex !== -1 ? args.slice(nameIndex + 1).join(' ') : null,
      };
      commands.cmdScaffold(cwd, scaffoldType, scaffoldOptions, raw);
      break;
    }

    case 'init': {
      const workflow = args[1];
      switch (workflow) {
        case 'execute-phase': {
          const isParallel = args.includes('--parallel');
          init.cmdInitExecutePhase(cwd, args[2], raw, { parallel: isParallel });
          break;
        }
        case 'plan-phase':
          init.cmdInitPlanPhase(cwd, args[2], raw);
          break;
        case 'new-project':
          init.cmdInitNewProject(cwd, raw);
          break;
        case 'new-milestone':
          init.cmdInitNewMilestone(cwd, raw);
          break;
        case 'quick':
          init.cmdInitQuick(cwd, args.slice(2).join(' '), raw);
          break;
        case 'resume':
          init.cmdInitResume(cwd, raw);
          break;
        case 'verify-work':
          init.cmdInitVerifyWork(cwd, args[2], raw);
          break;
        case 'phase-op':
          init.cmdInitPhaseOp(cwd, args[2], raw);
          break;
        case 'todos':
          init.cmdInitTodos(cwd, args[2], raw);
          break;
        case 'milestone-op':
          init.cmdInitMilestoneOp(cwd, raw);
          break;
        case 'map-codebase':
          init.cmdInitMapCodebase(cwd, raw);
          break;
        case 'progress':
          init.cmdInitProgress(cwd, raw);
          break;
        default:
          error(`Unknown init workflow: ${workflow}\nAvailable: execute-phase, plan-phase, new-project, new-milestone, quick, resume, verify-work, phase-op, todos, milestone-op, map-codebase, progress`);
      }
      break;
    }

    case 'cli-anything': {
      const subcommand = args[1];
      if (subcommand === 'ingest') {
        const { cmdIngest } = require('./lib/cli-anything/ingest.cjs');
        await cmdIngest(cwd, args.slice(2));
      } else if (subcommand === 'wrap') {
        const { cmdWrap } = require('./lib/cli-anything/help-parser.cjs');
        await cmdWrap(cwd, args.slice(2));
      } else if (subcommand === 'publish') {
        const { cmdPublish } = require('./lib/cli-anything/registry.cjs');
        await cmdPublish(cwd, args.slice(2));
      } else if (subcommand === 'list') {
        const { cmdList } = require('./lib/cli-anything/registry.cjs');
        await cmdList(cwd, args.slice(2));
      } else {
        console.error(`Unknown cli-anything subcommand: ${subcommand}. Available: ingest, wrap, publish, list`);
        process.exit(1);
      }
      break;
    }

    case 'image': {
      const subcommand = args[1];
      if (subcommand === 'og') {
        const { generateOgImage } = require('./lib/image-pipeline/og.cjs');
        const { ASSETS_DIR } = require('./lib/image-pipeline/assets.cjs');
        const titleIdx = args.indexOf('--title');
        const descIdx = args.indexOf('--description');
        const slugIdx = args.indexOf('--slug');
        const title = titleIdx !== -1 ? args[titleIdx + 1] : 'Untitled';
        const description = descIdx !== -1 ? args[descIdx + 1] : '';
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'og-image';
        const result = await generateOgImage({ title, description, slug, assetsDir: ASSETS_DIR });
        console.log(JSON.stringify(result.meta, null, 2));
      } else if (subcommand === 'social') {
        const { generateSocialCards } = require('./lib/image-pipeline/social.cjs');
        const { ASSETS_DIR } = require('./lib/image-pipeline/assets.cjs');
        const titleIdx = args.indexOf('--title');
        const descIdx = args.indexOf('--description');
        const slugIdx = args.indexOf('--slug');
        const title = titleIdx !== -1 ? args[titleIdx + 1] : 'Untitled';
        const description = descIdx !== -1 ? args[descIdx + 1] : '';
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'social-card';
        const results = await generateSocialCards({ title, description, slug, assetsDir: ASSETS_DIR });
        console.log(JSON.stringify(results.map(r => r.meta), null, 2));
      } else if (subcommand === 'screenshot') {
        const { captureScreenshot } = require('./lib/image-pipeline/screenshot.cjs');
        const { ASSETS_DIR } = require('./lib/image-pipeline/assets.cjs');
        const url = args[2];
        const viewportIdx = args.indexOf('--viewport');
        const slugIdx = args.indexOf('--slug');
        const formatIdx = args.indexOf('--format');
        const timeoutIdx = args.indexOf('--timeout');
        const viewport = viewportIdx !== -1 ? args[viewportIdx + 1] : 'desktop';
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'screenshot';
        const format = formatIdx !== -1 ? args[formatIdx + 1] : 'png';
        const timeout = timeoutIdx !== -1 ? parseInt(args[timeoutIdx + 1], 10) : 30000;
        const result = await captureScreenshot({ url, viewport, slug, format, timeout, assetsDir: ASSETS_DIR });
        console.log(JSON.stringify(result.meta, null, 2));
      } else if (subcommand === 'mockup') {
        const { generateMockup } = require('./lib/image-pipeline/mockup.cjs');
        const { ASSETS_DIR } = require('./lib/image-pipeline/assets.cjs');
        const screenshotPath = args[2];
        const frameIdx = args.indexOf('--frame');
        const slugIdx = args.indexOf('--slug');
        const frame = frameIdx !== -1 ? args[frameIdx + 1] : 'browser';
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'mockup';
        const result = await generateMockup({ screenshotPath, frame, slug, assetsDir: ASSETS_DIR });
        console.log(JSON.stringify(result.meta, null, 2));
      } else if (subcommand === 'rembg') {
        const { removeBackground } = require('./lib/image-pipeline/rembg.cjs');
        const { ASSETS_DIR } = require('./lib/image-pipeline/assets.cjs');
        const inputPath = args[2];
        const slugIdx = args.indexOf('--slug');
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'rembg';
        const result = await removeBackground({ inputPath, slug, assetsDir: ASSETS_DIR });
        if (result) {
          console.log(JSON.stringify(result.meta, null, 2));
        } else {
          console.log(JSON.stringify({ status: 'skipped', reason: 'no API key' }));
        }
      } else if (subcommand === 'list') {
        const { listAssets } = require('./lib/image-pipeline/assets.cjs');
        const typeIdx = args.indexOf('--type');
        const type = typeIdx !== -1 ? args[typeIdx + 1] : undefined;
        const assets = listAssets({ type });
        console.log(JSON.stringify(assets, null, 2));
      } else if (subcommand === 'diff') {
        const { runVisualDiff } = require('./lib/image-pipeline/visual-diff.cjs');
        const { ASSETS_DIR } = require('./lib/image-pipeline/assets.cjs');
        const branchA = args[2];
        const branchB = args[3];
        if (!branchA || !branchB) {
          console.error('Usage: image diff <branch-a> <branch-b>');
          process.exit(1);
        }
        const result = await runVisualDiff({ branchA, branchB, assetsDir: ASSETS_DIR, cwd: process.cwd() });
        console.log(JSON.stringify(result.summary, null, 2));
        console.log(`\nReport: ${result.reportPath}`);
        console.log(`JSON:   ${result.jsonPath}`);
      } else {
        console.error(`Unknown image subcommand: ${subcommand}. Available: og, social, screenshot, mockup, rembg, list, diff`);
        process.exit(1);
      }
      break;
    }

    case 'video': {
      const subcommand = args[1];
      if (subcommand === 'record') {
        const { recordUIInteraction } = require('./lib/video-pipeline/record.cjs');
        const { ASSETS_DIR } = require('./lib/video-pipeline/assets.cjs');
        const url = args[2];
        if (!url) { console.error('Usage: video record <url> [--slug <slug>] [--resolution <WxH|720p|1080p|4k>] [--duration <ms>]'); process.exit(1); }
        const slugIdx = args.indexOf('--slug');
        const resIdx = args.indexOf('--resolution');
        const durIdx = args.indexOf('--duration');
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'recording';
        const resolution = resIdx !== -1 ? args[resIdx + 1] : '1920x1080';
        const durationMs = durIdx !== -1 ? parseInt(args[durIdx + 1], 10) : 5000;
        const result = await recordUIInteraction({ url, slug, resolution, durationMs, assetsDir: ASSETS_DIR });
        console.log(JSON.stringify(result.meta, null, 2));
      } else if (subcommand === 'assemble') {
        const { assembleClips } = require('./lib/video-pipeline/assemble.cjs');
        const { saveVideoAsset, ASSETS_DIR } = require('./lib/video-pipeline/assets.cjs');
        // clips are positional args after 'assemble' until a flag
        const clips = [];
        for (let i = 2; i < args.length; i++) {
          if (args[i].startsWith('--')) break;
          clips.push(args[i]);
        }
        if (clips.length < 2) { console.error('Usage: video assemble <clip1.mp4> <clip2.mp4> [...] [--transition crossfade] [--transition-dur <sec>] [--slug <slug>]'); process.exit(1); }
        const transIdx = args.indexOf('--transition');
        const tdurIdx = args.indexOf('--transition-dur');
        const slugIdx = args.indexOf('--slug');
        const transition = transIdx !== -1 ? args[transIdx + 1] : 'none';
        const transitionDur = tdurIdx !== -1 ? parseFloat(args[tdurIdx + 1]) : 1;
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'assembled';
        const os = require('os');
        const path = require('path');
        const outputPath = path.join(os.tmpdir(), `${slug}-${Date.now()}.mp4`);
        const result = assembleClips({ clips, outputPath, transition, transitionDur });
        const saved = saveVideoAsset({ slug, mp4Path: result, dimensions: { width: 1920, height: 1080 }, source: 'assemble', params: { clips: clips.length, transition }, assetsDir: ASSETS_DIR });
        console.log(JSON.stringify(saved.meta, null, 2));
      } else if (subcommand === 'compose') {
        const { composeVideo } = require('./lib/video-pipeline/compose.cjs');
        const { ASSETS_DIR } = require('./lib/video-pipeline/assets.cjs');
        const titleIdx = args.indexOf('--title');
        const subIdx = args.indexOf('--subtitle');
        const slugIdx = args.indexOf('--slug');
        const resIdx = args.indexOf('--resolution');
        const durIdx = args.indexOf('--duration-frames');
        const title = titleIdx !== -1 ? args[titleIdx + 1] : 'Product Demo';
        const subtitle = subIdx !== -1 ? args[subIdx + 1] : '';
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'branded';
        const resolution = resIdx !== -1 ? args[resIdx + 1] : '1920x1080';
        const durationFrames = durIdx !== -1 ? parseInt(args[durIdx + 1], 10) : 150;
        const result = await composeVideo({ title, subtitle, slug, resolution, durationFrames, assetsDir: ASSETS_DIR });
        console.log(JSON.stringify(result.meta, null, 2));
      } else if (subcommand === 'caption') {
        const { captionVideo } = require('./lib/video-pipeline/caption.cjs');
        const { saveVideoAsset, ASSETS_DIR } = require('./lib/video-pipeline/assets.cjs');
        const inputPath = args[2];
        if (!inputPath) { console.error('Usage: video caption <input.mp4> [--srt <file.srt>] [--captions <json>] [--font-size <n>] [--slug <slug>]'); process.exit(1); }
        const srtIdx = args.indexOf('--srt');
        const capsIdx = args.indexOf('--captions');
        const fsIdx = args.indexOf('--font-size');
        const slugIdx = args.indexOf('--slug');
        const srt = srtIdx !== -1 ? args[srtIdx + 1] : undefined;
        const captions = capsIdx !== -1 ? JSON.parse(args[capsIdx + 1]) : undefined;
        const fontSize = fsIdx !== -1 ? parseInt(args[fsIdx + 1], 10) : 24;
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'captioned';
        if (!srt && !captions) { console.error('Provide --srt <file.srt> or --captions \'[{"start":0,"end":3,"text":"Hello"}]\''); process.exit(1); }
        const os = require('os');
        const path = require('path');
        const outputPath = path.join(os.tmpdir(), `${slug}-${Date.now()}.mp4`);
        captionVideo({ inputPath, outputPath, srt, captions, fontSize });
        const saved = saveVideoAsset({ slug, mp4Path: outputPath, dimensions: { width: 1920, height: 1080 }, source: 'caption', params: { srt: !!srt, captions: !!captions, fontSize }, assetsDir: ASSETS_DIR });
        console.log(JSON.stringify(saved.meta, null, 2));
      } else {
        console.error('Usage: video <record|assemble|compose|caption> [options]');
        process.exit(1);
      }
      break;
    }

    case '3d': {
      const subcommand = args[1];
      if (subcommand === 'generate') {
        const { generate3D } = require('./lib/3d-pipeline/generate.cjs');
        const { THREE_D_DIR } = require('./lib/3d-pipeline/assets.cjs');
        const promptIdx = args.indexOf('--prompt');
        const slugIdx = args.indexOf('--slug');
        const prompt = promptIdx !== -1 ? args[promptIdx + 1] : undefined;
        if (!prompt) { console.error('Usage: 3d generate --prompt <text> [--slug <slug>]'); process.exit(1); }
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'model';
        const result = await generate3D({ prompt, slug, assetsDir: THREE_D_DIR });
        console.log(JSON.stringify(result.meta, null, 2));
      } else if (subcommand === 'convert') {
        const { convert3D } = require('./lib/3d-pipeline/convert.cjs');
        const { THREE_D_DIR } = require('./lib/3d-pipeline/assets.cjs');
        const fs = require('fs');
        const imageIdx = args.indexOf('--image');
        const slugIdx = args.indexOf('--slug');
        const imagePath = imageIdx !== -1 ? args[imageIdx + 1] : undefined;
        if (!imagePath) { console.error('Usage: 3d convert --image <path> [--slug <slug>]'); process.exit(1); }
        const imageBuffer = fs.readFileSync(imagePath);
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'model';
        const result = await convert3D({ imageBuffer, slug, assetsDir: THREE_D_DIR });
        console.log(JSON.stringify(result.meta, null, 2));
      } else if (subcommand === 'optimize') {
        const { optimizeGLB } = require('./lib/3d-pipeline/optimize.cjs');
        const inputIdx = args.indexOf('--input');
        const outputIdx = args.indexOf('--output');
        const texIdx = args.indexOf('--texture-max');
        const inputPath = inputIdx !== -1 ? args[inputIdx + 1] : undefined;
        if (!inputPath) { console.error('Usage: 3d optimize --input <path.glb> [--output <path.glb>] [--texture-max <px>]'); process.exit(1); }
        const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : inputPath.replace('.glb', '-opt.glb');
        const textureMaxSize = texIdx !== -1 ? parseInt(args[texIdx + 1], 10) : 1024;
        const result = optimizeGLB({ inputPath, outputPath, textureMaxSize });
        console.log(JSON.stringify(result, null, 2));
      } else if (subcommand === 'embed') {
        const { generateEmbed } = require('./lib/3d-pipeline/embed.cjs');
        const { THREE_D_DIR } = require('./lib/3d-pipeline/assets.cjs');
        const glbIdx = args.indexOf('--glb');
        const slugIdx = args.indexOf('--slug');
        const orbitIdx = args.indexOf('--camera-orbit');
        const glbPath = glbIdx !== -1 ? args[glbIdx + 1] : undefined;
        if (!glbPath) { console.error('Usage: 3d embed --glb <path.glb> [--slug <slug>] [--camera-orbit <orbit>]'); process.exit(1); }
        const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'model';
        const cameraOrbit = orbitIdx !== -1 ? args[orbitIdx + 1] : undefined;
        const result = generateEmbed({ glbPath, slug, cameraOrbit, assetsDir: THREE_D_DIR });
        console.log(JSON.stringify({ embedPath: result.embedPath, snippet: result.snippet }, null, 2));
      } else if (subcommand === 'list') {
        const { list3DAssets, THREE_D_DIR } = require('./lib/3d-pipeline/assets.cjs');
        const assets = list3DAssets({ assetsDir: THREE_D_DIR });
        console.log(JSON.stringify(assets, null, 2));
      } else {
        console.error('Usage: 3d <generate|convert|optimize|embed|list> [options]');
        process.exit(1);
      }
      break;
    }

    case 'phase-plan-index': {
      phase.cmdPhasePlanIndex(cwd, args[1], raw);
      break;
    }

    case 'state-snapshot': {
      state.cmdStateSnapshot(cwd, raw);
      break;
    }

    case 'summary-extract': {
      const summaryPath = args[1];
      const fieldsIndex = args.indexOf('--fields');
      const fields = fieldsIndex !== -1 ? args[fieldsIndex + 1].split(',') : null;
      commands.cmdSummaryExtract(cwd, summaryPath, fields, raw);
      break;
    }

    case 'websearch': {
      const query = args[1];
      const limitIdx = args.indexOf('--limit');
      const freshnessIdx = args.indexOf('--freshness');
      await commands.cmdWebsearch(query, {
        limit: limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 10,
        freshness: freshnessIdx !== -1 ? args[freshnessIdx + 1] : null,
      }, raw);
      break;
    }

    case 'manifest': {
      const manifest = require('./lib/manifest.cjs');
      const subCmd = args[1]; // 'init' or 'check'
      if (subCmd === 'init') {
        const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
        const count = manifest.manifestInit(pluginRoot);
        console.log(JSON.stringify({ success: true, entries: count }));
      } else if (subCmd === 'check') {
        const manifestPath = path.join(process.cwd(), '.planning', 'config', 'files-manifest.csv');
        try {
          const csv = require('fs').readFileSync(manifestPath, 'utf-8');
          const entries = manifest.parseManifest(csv);
          const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
          const results = [];
          for (const entry of entries) {
            const diskHash = manifest.hashFile(path.resolve(pluginRoot, entry.path));
            const modified = diskHash !== entry.sha256;
            results.push({ path: entry.path, source: entry.source, modified, diskHash });
          }
          const modifiedCount = results.filter(r => r.modified).length;
          console.log(JSON.stringify({ success: true, total: entries.length, modified: modifiedCount, files: results }));
        } catch (err) {
          console.log(JSON.stringify({ success: false, error: 'Manifest not found. Run: node pde-tools.cjs manifest init' }));
        }
      } else {
        console.log(JSON.stringify({ success: false, error: `Unknown manifest subcommand: ${subCmd}. Use: init, check` }));
      }
      break;
    }

    case 'shard-plan': {
      const sharding = require('./lib/sharding.cjs');
      const planPath = path.resolve(cwd, args[1]);
      const thresholdIdx = args.indexOf('--threshold');
      const threshold = thresholdIdx !== -1 ? parseInt(args[thresholdIdx + 1], 10) : 5;
      const result = sharding.shardPlan(planPath, { threshold });
      const out = typeof result === 'string' ? result : JSON.stringify(result);
      if (raw) { process.stdout.write(out); } else { console.log(out); }
      break;
    }

    case 'tracking': {
      const subcommand = args[1];
      const tracking = require('./lib/tracking.cjs');
      if (subcommand === 'init') {
        tracking.cmdTrackingInit(cwd, args.slice(2), raw);
      } else if (subcommand === 'set-status') {
        tracking.cmdTrackingSetStatus(cwd, args.slice(2), raw);
      } else if (subcommand === 'read') {
        tracking.cmdTrackingRead(cwd, args.slice(2), raw);
      } else {
        error('tracking: unknown subcommand. Available: init, set-status, read');
      }
      break;
    }

    case 'session-start': {
      // Generate new PDE session UUID and persist to .planning/config.json monitoring.session_id
      // Called by emit-event.cjs SessionStart hook handler (async: false — must complete before hook exits)
      const { randomUUID } = require('crypto');
      const newSessionId = process.env.PDE_SESSION_ID || randomUUID();
      const configPath = path.join(cwd, '.planning', 'config.json');
      try {
        let cfg = {};
        try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch { /* config may not exist */ }
        if (!cfg.monitoring) cfg.monitoring = {};
        cfg.monitoring.session_id = newSessionId;
        cfg.monitoring.session_start_ts = new Date().toISOString();
        fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
      } catch { /* swallow — session ID persistence failure must not crash anything */ }
      if (raw) { process.stdout.write(JSON.stringify({ session_id: newSessionId })); }
      else { console.log(`Session started: ${newSessionId}`); }
      break;
    }

    case 'event-emit': {
      // External write path: called from emit-event.cjs hook handler and workflow markdown manual emits
      // CRITICAL: lazy require — if event-bus.cjs fails, only event-emit breaks; all other commands unaffected
      const { safeAppendEvent } = require('./lib/event-bus.cjs');
      const eventType = args[1];
      if (!eventType) {
        // Silent fail — missing event type is not a fatal error for PDE workflows
        if (raw) { process.stdout.write(JSON.stringify({ ok: false, error: 'missing event_type' })); }
        break;
      }

      let payload = {};
      if (args[2]) {
        try { payload = JSON.parse(args[2]); } catch { /* malformed JSON payload — emit with empty payload */ }
      }

      // Read session ID from config.json (written by session-start subcommand at SessionStart)
      const configPath = path.join(cwd, '.planning', 'config.json');
      let sessionId = 'unknown';
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (cfg.monitoring && cfg.monitoring.session_id) {
          sessionId = cfg.monitoring.session_id;
        }
      } catch { /* config not found or unreadable — use 'unknown' session ID */ }

      const envelope = {
        schema_version: '1.0',
        ts: new Date().toISOString(),
        event_type: eventType,
        session_id: sessionId,
        ...payload,
        extensions: payload.extensions || {},
      };

      safeAppendEvent(sessionId, envelope);

      if (raw) { process.stdout.write(JSON.stringify({ ok: true, event_type: eventType })); }
      break;
    }

    case 'suggestions': {
      const configPath = path.join(cwd, '.planning', 'config.json');
      let sessionId = 'unknown';
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (cfg.monitoring && cfg.monitoring.session_id) {
          sessionId = cfg.monitoring.session_id;
        }
      } catch { /* config not found — use 'unknown' session ID */ }
      const suggPath = path.join(os.tmpdir(), `pde-suggestions-${sessionId}.md`);
      try {
        const content = fs.readFileSync(suggPath, 'utf-8');
        process.stdout.write(content.trimEnd() + '\n');
      } catch {
        process.stdout.write('Waiting for PDE to start a phase. Suggestions will appear when a phase completes.\n');
      }
      break;
    }

    case 'experiment': {
      const subcommand = args[1];
      const experiment = require('./lib/experiment.cjs');
      const slugIdx = args.indexOf('--slug');
      const slug = slugIdx !== -1 ? args[slugIdx + 1] : undefined;
      if (!slug && subcommand !== 'ensure-dirs' && subcommand !== 'patch-config') {
        error('--slug SLUG required. Available subcommands: init, commit, reset, promote, status, cleanup, ensure-dirs, patch-config, check-boundaries, eval-metric, write-row, generate-report, diff-summary');
      }
      if (subcommand === 'init') {
        experiment.cmdExperimentInit(cwd, slug, raw);
      } else if (subcommand === 'commit') {
        const metricIdx = args.indexOf('--metric');
        const descIdx = args.indexOf('--description');
        const metric = metricIdx !== -1 ? parseFloat(args[metricIdx + 1]) : NaN;
        const description = descIdx !== -1 ? args[descIdx + 1] : '';
        if (isNaN(metric)) {
          error('--metric NUMBER required for experiment commit');
        }
        experiment.cmdExperimentCommit(cwd, slug, metric, description, raw);
      } else if (subcommand === 'reset') {
        experiment.cmdExperimentReset(cwd, slug, raw);
      } else if (subcommand === 'promote') {
        experiment.cmdExperimentPromote(cwd, slug, raw);
      } else if (subcommand === 'status') {
        experiment.cmdExperimentStatus(cwd, slug, raw);
      } else if (subcommand === 'cleanup') {
        experiment.cmdExperimentCleanup(cwd, slug, raw);
      } else if (subcommand === 'ensure-dirs') {
        const schema = require('./lib/experiment-schema.cjs');
        schema.cmdEnsureExperimentDirs(cwd, raw);
      } else if (subcommand === 'patch-config') {
        const schema = require('./lib/experiment-schema.cjs');
        schema.cmdPatchExperimentConfig(cwd, raw);
      } else if (subcommand === 'check-boundaries') {
        const runner = require('./lib/experiment-runner.cjs');
        const schema = require('./lib/experiment-schema.cjs');
        const expPath = path.join(cwd, '.planning', 'experiments', slug, 'experiment.md');
        const parsed = schema.parseExperimentFile(expPath);
        if (!parsed.valid) {
          error(parsed.errors.join('; '));
        }
        const result = runner._checkModifiedFiles(cwd, parsed.mutable_files);
        output(result, raw);
      } else if (subcommand === 'eval-metric') {
        const runner = require('./lib/experiment-runner.cjs');
        const schema = require('./lib/experiment-schema.cjs');
        const expPath = path.join(cwd, '.planning', 'experiments', slug, 'experiment.md');
        const parsed = schema.parseExperimentFile(expPath);
        if (!parsed.valid) {
          error(parsed.errors.join('; '));
        }
        const evalResult = runner._evalMetric(cwd, parsed.verify, 30000);
        if (evalResult.status === 'CRASH') {
          output({ ...evalResult, decision: 'CRASH', metric_delta: 0 }, raw);
        } else {
          // Read bestMetric from EXPERIMENT-BEST.json
          let bestMetric = null;
          try {
            const bestJsonPath = path.join(cwd, '.planning', 'experiments', slug, 'EXPERIMENT-BEST.json');
            const bestState = JSON.parse(fs.readFileSync(bestJsonPath, 'utf-8'));
            bestMetric = bestState.bestMetric !== undefined ? bestState.bestMetric : null;
          } catch { /* no state yet — first iteration */ }
          const decision = runner._compareMetric(evalResult.metric_value, bestMetric, parsed.direction);
          const metricDelta = bestMetric !== null ? evalResult.metric_value - bestMetric : 0;
          output({ ...evalResult, decision, metric_delta: metricDelta }, raw);
        }
      } else if (subcommand === 'write-row') {
        const runner = require('./lib/experiment-runner.cjs');
        const iterIdx = args.indexOf('--iteration');
        const metricValIdx = args.indexOf('--metric_value');
        const metricDeltaIdx = args.indexOf('--metric_delta');
        const statusIdx = args.indexOf('--status');
        const descIdx = args.indexOf('--description');
        const tokensIdx = args.indexOf('--tokens_used');
        const commitIdx = args.indexOf('--commit');
        const rowData = {
          iteration: iterIdx !== -1 ? parseInt(args[iterIdx + 1], 10) : 0,
          metric_value: metricValIdx !== -1 ? parseFloat(args[metricValIdx + 1]) : null,
          metric_delta: metricDeltaIdx !== -1 ? parseFloat(args[metricDeltaIdx + 1]) : null,
          status: statusIdx !== -1 ? args[statusIdx + 1] : null,
          description: descIdx !== -1 ? args[descIdx + 1] : '',
          tokens_used: tokensIdx !== -1 ? parseInt(args[tokensIdx + 1], 10) : null,
          commit: commitIdx !== -1 ? args[commitIdx + 1] : null,
        };
        const row = runner._writeJsonlRow(cwd, slug, rowData);
        output(row, raw);
      } else if (subcommand === 'generate-report') {
        const report = require('./lib/experiment-report.cjs');
        report.generateReport(cwd, slug, raw);
      } else if (subcommand === 'diff-summary') {
        const report = require('./lib/experiment-report.cjs');
        report._cmdDiffSummary(cwd, slug, raw);
      } else if (subcommand === 'reset-to-sha') {
        const runner = require('./lib/experiment-runner.cjs');
        const shaIdx = args.indexOf('--sha');
        const targetSha = shaIdx !== -1 ? args[shaIdx + 1] : null;
        if (!targetSha) error('--sha SHA required for experiment reset-to-sha');
        const result = runner._resetToSha(cwd, slug, targetSha);
        output(result, raw);
      } else {
        error('Unknown experiment subcommand. Available: init, commit, reset, promote, status, cleanup, ensure-dirs, patch-config, check-boundaries, eval-metric, write-row, generate-report, diff-summary, reset-to-sha');
      }
      break;
    }

    case 'context-sync': {
      const contextSync = require('./lib/context-sync.cjs');
      contextSync.cmdContextSync(cwd, args.slice(1), raw);
      break;
    }

    case 'artifact-format': {
      const sub = args[1];
      if (sub === 'detect-framework') {
        const { detectFramework } = require('./lib/artifact-format.cjs');
        const fw = detectFramework(cwd);
        output(fw || '');
      } else {
        error(`Unknown artifact-format subcommand: ${sub}`);
      }
      break;
    }

    case 'poll-approval': {
      // Usage: pde-tools poll-approval <approval_id> [timeout_ms]
      const approvalId = args[1];
      const timeoutMs  = Number(args[2] ?? '600000'); // 10 min default
      if (!approvalId) {
        process.stdout.write(JSON.stringify({ error: 'missing approval_id' }));
        break;
      }

      const configPath = path.join(cwd, '.planning', 'config.json');
      let sessionId = '';
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        sessionId = (cfg.monitoring && cfg.monitoring.session_id) || '';
      } catch { /* config unreadable */ }

      if (!sessionId) {
        process.stdout.write(JSON.stringify({ error: 'no session_id' }));
        break;
      }

      const responseFile = path.join(require('os').tmpdir(), `pde-relay-responses-${sessionId}.ndjson`);
      const deadline = Date.now() + timeoutMs;
      const POLL_INTERVAL = 1000;

      const findResponse = () => {
        try {
          const lines = fs.readFileSync(responseFile, 'utf-8').split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const obj = JSON.parse(line);
              if (obj.type === 'approval_response' && obj.approval_id === approvalId) {
                return obj;
              }
            } catch { /* skip malformed */ }
          }
        } catch { /* file not yet created */ }
        return null;
      };

      const poll = () => {
        const result = findResponse();
        if (result) {
          process.stdout.write(JSON.stringify(result));
          process.exit(0);
          return;
        }
        if (Date.now() >= deadline) {
          process.stdout.write(JSON.stringify({ timed_out: true, approval_id: approvalId }));
          process.exit(0);
          return;
        }
        setTimeout(poll, POLL_INTERVAL);
      };

      poll();
      break;
    }

    case 'dispatch': {
      // node pde-tools.cjs dispatch <phase> <plan> [--max-concurrent N]
      // Lazy-require coordinator to avoid loading dispatcher when not needed
      const { DispatchCoordinator } = require('../packages/dispatcher/lib/coordinator.cjs');
      const { loadConfig } = require('./lib/core.cjs');
      const dispatchPhase = parseInt(args[1], 10);
      const dispatchPlan = parseInt(args[2], 10);
      if (isNaN(dispatchPhase) || isNaN(dispatchPlan)) {
        error('Usage: pde-tools dispatch <phase> <plan> [--max-concurrent N]');
      }
      const config = loadConfig(cwd);
      if (config.dispatch && config.dispatch.enabled === false) {
        error('Dispatch is disabled (dispatch.enabled=false in config.json). Use standard execution instead.');
      }
      const maxConcurrentIdx = args.indexOf('--max-concurrent');
      const configMax = (config.dispatch && config.dispatch.max_local_sessions) || 3;
      const maxConcurrent = maxConcurrentIdx !== -1 ? parseInt(args[maxConcurrentIdx + 1], 10) : configMax;
      const pluginDir = DispatchCoordinator.resolvePluginDir();
      const coord = new DispatchCoordinator(cwd, { maxConcurrent, pluginDir, config });
      coord.dispatch(dispatchPhase, dispatchPlan).then(sid => {
        console.log(JSON.stringify({ ok: true, sessionId: sid }));
      }).catch(err => {
        console.error(JSON.stringify({ ok: false, error: err.message }));
        process.exit(1);
      });
      break;
    }

    case 'list-sessions': {
      const { SessionRegistry } = require('../packages/dispatcher/lib/registry.cjs');
      const { loadConfig } = require('./lib/core.cjs');
      const config = loadConfig(cwd);
      if (config.dispatch && config.dispatch.enabled === false) {
        output([], raw, 'Dispatch is disabled — no sessions to list');
        break;
      }
      const registry = new SessionRegistry(cwd);
      registry.loadFromDisk();
      const sessions = [];
      for (const [id, entry] of registry.getAll()) {
        let liveStatus = entry.status;
        if (entry.status === 'running' && entry.pid > 0) {
          try { process.kill(entry.pid, 0); }
          catch (e) { if (e.code === 'ESRCH') liveStatus = 'orphaned'; }
        }
        const elapsed = entry.startedAt
          ? Math.floor((Date.now() - new Date(entry.startedAt).getTime()) / 1000)
          : null;
        sessions.push({
          id, phase: entry.phase, plan: entry.plan,
          status: liveStatus, backend: entry.backend || 'local',
          pid: entry.pid || null, startedAt: entry.startedAt || null,
          elapsedSeconds: elapsed,
        });
      }
      sessions.sort((a, b) => (a.startedAt || '').localeCompare(b.startedAt || ''));
      output(sessions, raw, sessions.length === 0
        ? 'No active sessions'
        : sessions.map(s => {
            const el = s.elapsedSeconds !== null
              ? `${Math.floor(s.elapsedSeconds / 60)}m ${s.elapsedSeconds % 60}s`
              : '—';
            return `${s.id.padEnd(20)} phase=${s.phase} plan=${s.plan} status=${s.status} backend=${s.backend} elapsed=${el} pid=${s.pid || '—'}`;
          }).join('\n'));
      break;
    }

    case 'stop-session': {
      const sessionId = args[1];
      if (!sessionId) error('Usage: pde-tools stop-session <sessionId>');
      const { SessionRegistry } = require('../packages/dispatcher/lib/registry.cjs');
      const registry = new SessionRegistry(cwd);
      registry.loadFromDisk();
      const entry = registry.get(sessionId);
      if (!entry) error(`Session not found: ${sessionId}`);
      if (entry.status !== 'running') {
        output({ stopped: false, reason: `Session already ${entry.status}` }, raw,
          `Session already ${entry.status}`);
        break;
      }
      if (entry.backend && entry.backend !== 'local') {
        const msg = `Cannot stop remote session via CLI. SSH to ${entry.remoteHost || 'remote host'} and kill manually.`;
        output({ stopped: false, remote: true, instructions: msg }, raw, msg);
        break;
      }
      if (entry.pid > 0) {
        try { process.kill(entry.pid, 'SIGTERM'); } catch (_) {}
      }
      registry.update(sessionId, { status: 'stopped' });
      output({ stopped: true, sessionId, worktreePath: entry.worktreePath }, raw,
        `Session ${sessionId} stopped. Worktree preserved at ${entry.worktreePath}`);
      break;
    }

    default:
      error(`Unknown command: ${command}`);
  }
}

main();
