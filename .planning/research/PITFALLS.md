# Pitfalls Research

**Domain:** Multi-editor integration for an existing Claude Code plugin (PDE v0.15 — MCP server exposure, context file generation, Stitch design bridge, npx distribution, divergence detection)
**Researched:** 2026-03-23
**Confidence:** HIGH for MCP server security and tool exposure pitfalls (grounded in MCP specification security docs, multiple 2026 exploit post-mortems, and PDE's existing mcp-bridge.cjs patterns); HIGH for context file freshness pitfalls (grounded in official Cursor .mdc docs, Gemini CLI GEMINI.md docs, and Antigravity AGENTS.md docs); MEDIUM for Stitch bridge dual-path pitfalls (grounded in Google Stitch MCP docs and PDE's existing v0.9 Stitch integration, but Antigravity's native Stitch path is newer with less community post-mortem data); MEDIUM for npx distribution pitfalls (grounded in MCP server distribution guides and known npm packaging issues); LOW for divergence detection accuracy (no PDE-specific drift detection data yet, spec-driven development tooling is nascent)

---

## Critical Pitfalls

### Pitfall 1: Exposing Write Tools Through the MCP Server

**What goes wrong:**
The standalone MCP server (`npx pde-mcp-server`) exposes PDE workflows as MCP tools consumable by Cursor, Antigravity, and Gemini CLI. If the server exposes write-capable tools (file creation, design-state mutation, manifest updates), external editors gain a second write path that bypasses PDE's existing validation infrastructure: pde-tools.cjs locking, AC-first verification gates, reconciliation tracking, and the protected-files mechanism. PROJECT.md already explicitly flags this as out of scope: "Write tools in PDE-as-MCP-server -- creates second write path bypassing pde-tools.cjs validation and locking." Ignoring this constraint creates a confused deputy problem where the MCP server acts with PDE's file-system privileges on behalf of an untrusted external editor, with no user consent gate, no locking, and no audit trail.

**Why it happens:**
Developers building MCP servers instinctively mirror the full capability set of the internal system. PDE has 14 design pipeline skills plus planning, execution, and deployment workflows. The temptation is to expose all of them as MCP tools. But PDE's internal execution model assumes it is the sole writer to `.planning/` state -- concurrent writes from an external editor via MCP would corrupt manifest state, clobber designCoverage flags (the exact bug PDE has fixed three times already in v0.11/v0.12/v0.14), and break the reconciliation audit trail.

**How to avoid:**
- The MCP server MUST be read-only. Expose tools that return information (design state, artifact contents, pipeline status, quality scores) but never tools that write files or mutate state.
- If write operations are needed in the future, they must route through a request/approval queue that PDE's existing write infrastructure (pde-tools.cjs) processes, not bypass it.
- Implement an explicit tool allowlist in the MCP server (mirroring APPROVED_SERVERS pattern from mcp-bridge.cjs) that enumerates exactly which tools are exposed. Default is deny-all.
- Every tool description must clearly state "read-only" in its MCP tool metadata to prevent LLM hallucination of write capability.

**Warning signs:**
- Any MCP tool definition containing `fs.writeFileSync`, `fs.mkdirSync`, or `fs.appendFileSync`
- Tool names containing verbs like "create", "update", "delete", "execute", "run"
- External editor successfully modifying files in `.planning/` without PDE session active
- RECONCILIATION.md showing commits not traceable to a PDE plan

**Phase to address:**
Phase 1 (MCP server foundation) -- the read-only contract must be established before any tools are defined. Retrofitting read-only onto a server that shipped with write tools is a rewrite.

---

### Pitfall 2: Context File Staleness (The "Generated Once, Stale Forever" Trap)

**What goes wrong:**
PDE generates `.cursorrules` (or `.cursor/rules/*.mdc`), `GEMINI.md`, and Antigravity agent config files from its internal state. These files describe the project's architecture, design system, component APIs, and coding conventions. The moment PDE's design pipeline advances (new wireframe, updated design tokens, critique findings, handoff interfaces), the generated context files are stale. External editors using stale context files generate code that contradicts PDE's current design state -- wrong color tokens, deprecated component APIs, outdated architectural patterns.

**Why it happens:**
Context file generation is treated as a "generate and forget" operation. PDE's design pipeline produces artifacts incrementally across 14 stages. Each stage mutates design-manifest.json, DESIGN-STATE.md, and various artifact files. Without a change-detection mechanism that triggers context file regeneration, the generated files drift from truth within a single build pipeline run. The problem is compounded by editor-specific caching: Cursor loads rules at session start, Gemini CLI loads GEMINI.md at prompt time, and Antigravity loads AGENTS.md on workspace open.

**How to avoid:**
- Context files must include a generation timestamp and a source hash (SHA-256 of the design-manifest.json + DESIGN-STATE.md that produced them). Stale detection is then: compare current source hash to embedded hash.
- Use Claude Code hooks (PostToolUse or a custom post-skill hook) to trigger regeneration after any design pipeline skill completes. This is the same pattern PDE uses for event bus NDJSON writes.
- Include a staleness warning header in generated files: `# Generated by PDE on [date] from design-manifest SHA [hash]. If this hash differs from current, regenerate with /pde:sync-context`.
- Provide a `/pde:sync-context` command that regenerates all context files on demand as a safety valve.
- Do NOT attempt real-time file watching or background sync -- PDE is session-based, not a daemon.

**Warning signs:**
- Generated context files have timestamps older than the most recent design pipeline artifact
- External editor generating code with color tokens or component names that don't match current DESIGN-STATE.md
- Users manually editing generated context files (sign that auto-generation is not keeping up)
- No hash/timestamp metadata in generated files

**Phase to address:**
Phase 2 (context sync engine) -- the regeneration trigger mechanism must be built alongside the initial generation. Shipping generation without staleness detection guarantees drift complaints from day one.

---

### Pitfall 3: Dual Stitch Integration Path Divergence

**What goes wrong:**
PDE already has a Stitch integration path (v0.9): `--use-stitch` flag on wireframe/mockup, generate-fetch-persist-annotate pipeline, consent gates, quota tracking, annotation injection, and downstream critique/handoff consumption via `source: "stitch"` manifest entries. Antigravity has its own native Stitch integration: MCP connectors that pull design DNA from Stitch projects directly into the IDE. The v0.15 "Stitch design bridge" must reconcile these two paths. If they produce different artifact representations of the same Stitch design, downstream consumers (critique, handoff, code generation) will produce contradictory results depending on which path was used.

**Why it happens:**
PDE's Stitch path caches artifacts locally as `STH-{slug}.html/png` with PDE-specific annotations (`stitch_annotated: true`, `@component:` tags, hex-to-OKLCH conversion). Antigravity's native path produces Flutter/Dart code or raw design tokens without PDE's annotation layer. The two paths have different data models, different naming conventions, and different levels of design-token fidelity. Building a "bridge" without a canonical intermediate representation means each path stores a different version of truth.

**How to avoid:**
- Define a canonical artifact format for Stitch-sourced designs that both paths must produce. This format should be the existing PDE convention: `STH-{slug}.html` with annotation tags, registered in design-manifest.json with `source: "stitch"`.
- The Antigravity bridge path must translate Antigravity's native Stitch output INTO PDE's canonical format before registering it in the manifest. The bridge is a converter, not a parallel storage path.
- Quota tracking must span both paths. PDE already tracks Standard 350/mo and Experimental 50/mo. If Antigravity also consumes quota through its own Stitch MCP calls, the shared quota counter must account for both or users will silently exhaust their limit.
- Test with a single Stitch project accessed via both paths and verify that critique/handoff produces identical findings.

**Warning signs:**
- Two different manifest entries for the same Stitch design (one from PDE path, one from Antigravity path)
- Quota counter showing different totals than actual Stitch API usage
- Critique producing different token-compliance percentages for the same design depending on which path sourced it
- Annotation tags present in PDE-path artifacts but absent from Antigravity-path artifacts

**Phase to address:**
Phase 4 (Stitch design bridge) -- but must be designed in Phase 1 alongside the MCP server architecture, because the bridge's data flow determines what the MCP server exposes about Stitch artifacts.

---

### Pitfall 4: npx Distribution Breaking Zero-Dependency Constraint

**What goes wrong:**
The MCP server distributed as `npx pde-mcp-server` needs its own package.json with dependencies (at minimum, the MCP SDK for stdio/SSE transport). If this package.json is at the plugin root or shares the root node_modules, it violates PDE's zero-npm-deps-at-root constraint. If dependencies are installed globally via npx, version conflicts with user's existing global packages cause ENOENT errors, module resolution failures, or silent wrong-version loading. The 73% failure rate for local MCP installations cited in distribution guides is primarily caused by PATH and version resolution issues.

**Why it happens:**
PDE's constraint is "zero npm deps at plugin root (isolated subdirectories OK)." Developers forget the "isolated subdirectories" escape hatch and either pollute the root or try to avoid dependencies entirely (resulting in a hand-rolled MCP server that doesn't handle edge cases). The npx execution model also has platform-specific gotchas: Windows requires `cmd /c npx` wrapping, NVM users hit PATH resolution failures, and global/local install conflicts cause version mismatches.

**How to avoid:**
- The MCP server MUST live in an isolated subdirectory (e.g., `packages/pde-mcp-server/`) with its own package.json, its own node_modules (gitignored), and its own npm scripts. The plugin root package.json must not reference it.
- The npx entry point must be a self-contained package published to npm independently. It should have a `bin` field in package.json pointing to the server entry script.
- Pin the MCP SDK version explicitly (not `^` or `~`). MCP protocol is still evolving; minor version bumps have broken transport negotiation.
- Include a `--version` flag and a startup self-test that verifies the server can bind to stdio transport before accepting connections.
- Document the Windows `cmd /c npx` workaround in installation instructions.

**Warning signs:**
- package.json at plugin root gaining a `dependencies` field
- `require()` calls in plugin root code resolving to pde-mcp-server's node_modules
- Users reporting `spawn npx ENOENT` or `Cannot find module` errors
- MCP server tests importing from plugin root modules instead of the isolated package

**Phase to address:**
Phase 1 (MCP server foundation) -- the package isolation structure must be established first. Moving a package after it ships with wrong boundaries requires republishing and breaking existing `npx` consumers.

---

### Pitfall 5: Divergence Detection False Positives from Intentional Overrides

**What goes wrong:**
The bidirectional divergence detector compares handoff specs (component APIs, TypeScript interfaces, design tokens) against actual implementation code. It flags differences as "drift." But developers intentionally diverge from specs for valid reasons: performance optimizations, browser compatibility workarounds, framework constraints (Next.js hydration requirements), or deliberate design refinements during implementation. A detector that cannot distinguish intentional divergence from accidental drift produces so many false positives that users disable it entirely.

**Why it happens:**
Spec-driven development tooling is nascent. Most drift detection tools (Terraform drift, IaC compliance) compare machine-generated config against machine-generated state -- both are structured and deterministic. PDE's handoff specs are semi-structured (TypeScript interfaces, prose descriptions, DTCG tokens) and the implementation is full application code with framework-specific patterns. The semantic gap between "what the spec says" and "what the code does" is enormous. Simple string matching or AST comparison generates false positives on every framework adapter, every polyfill, and every performance shortcut.

**How to avoid:**
- Start with high-confidence, low-noise checks only: design token values (OKLCH colors, spacing scale) and component interface signatures (prop names and types). These are machine-comparable.
- Do NOT attempt to detect behavioral divergence (animation timing, interaction patterns) in the initial implementation. This requires runtime analysis that PDE cannot do without a running app.
- Provide a `.pde-divergence-ignore` mechanism (similar to .gitignore) where developers can mark intentional overrides with a reason. The detector must respect these annotations.
- Report divergence as informational (CONCERNS severity, not FAIL) -- matching PDE's existing edge-case convention from v0.7 where edge cases are "always CONCERNS, never FAIL."
- Include confidence scores per finding: token value mismatch = HIGH confidence drift, missing prop = MEDIUM, different implementation pattern = LOW.

**Warning signs:**
- Divergence report producing more than 20 findings on a well-maintained codebase (calibration is wrong)
- Users adding the entire codebase to the ignore file (detector is too noisy)
- Divergence findings that reference framework boilerplate (Next.js `use client`, React.forwardRef wrappers)
- No mechanism to mark findings as "acknowledged" or "intentional"

**Phase to address:**
Phase 5 (divergence detection) -- but the ignore/acknowledge mechanism must be designed alongside the detector, not added after users complain. Ship the escape hatch with the feature.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding editor-specific formats in context sync | Ships faster than abstraction | Every new editor requires touching generator internals | Never -- use template-per-editor pattern from day one |
| Bundling MCP server in plugin root | Avoids npm publish step | Violates zero-deps constraint, blocks independent versioning | Never -- isolated subdirectory is the escape hatch |
| Generating .cursorrules instead of .cursor/rules/*.mdc | Legacy format still works | Cursor deprecated .cursorrules; migration pain later | Only for MVP if timeline critical, with immediate follow-up |
| Skipping quota unification for Stitch bridge | Fewer moving parts in bridge phase | Users exhaust quota without warning; PDE's 80% warning threshold becomes inaccurate | Never -- quota tracking is a safety mechanism |
| Divergence detection via string matching | Conceptually simple | False positive rate makes feature unusable | Only for token value comparison; never for code structure |
| Static context generation without hash tracking | Simpler implementation | No staleness detection; users lose trust in generated files | Never -- hash is trivial to add and critical for trust |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Cursor .mdc rules | Generating a single monolithic rules file | Generate multiple .mdc files with YAML frontmatter glob patterns: `frontend.mdc` for component rules, `tokens.mdc` for design system, `api.mdc` for backend patterns |
| Cursor .mdc rules | Forgetting the `alwaysApply` vs glob-triggered distinction | Base rules (project architecture, coding standards) use `alwaysApply: true`; file-specific rules use `globs: ["src/components/**"]` |
| GEMINI.md | Writing a single flat file | Use `@file.md` import syntax for modular context; Gemini CLI supports hierarchical loading from workspace roots + ancestor directories |
| GEMINI.md | Exceeding context budget | Keep under 1000 lines total across all loaded GEMINI.md files; Gemini CLI concatenates all found files into every prompt |
| Antigravity AGENTS.md | Ignoring GEMINI.md precedence | Antigravity loads both GEMINI.md (higher priority) and AGENTS.md (lower priority); if PDE generates both, GEMINI.md overrides on conflict |
| Antigravity Skills | Treating skills like simple rules files | Antigravity Skills are directory-based packages with SKILL.md frontmatter; if PDE generates agent skills, they need the full directory structure |
| MCP Server tool count | Exposing 50+ tools (one per PDE skill + subcommand) | Keep under 15-20 high-level tools; more tools cause LLM decision paralysis and token waste. Group related operations. |
| MCP Server tool descriptions | Writing descriptions for human developers | MCP tool descriptions are consumed by LLMs, not humans. Be explicit about parameters, return types, and when NOT to use the tool. |
| Stitch bridge quota | Tracking PDE quota and Antigravity quota separately | Both paths consume the same Google Labs monthly quota (350 standard, 50 experimental); must use single shared counter |
| npx distribution | Assuming npx resolves PATH correctly on all platforms | Windows requires `cmd /c npx` wrapper; NVM users need explicit node path; document platform-specific installation |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Context file generation reading all artifacts on every trigger | 2-5s delay after each pipeline skill completes | Cache artifact hashes; only regenerate context files when hash changes | >10 artifacts in design pipeline |
| MCP server loading full design-manifest.json into every tool response | Token explosion in external editor context window | Return summaries by default; full detail only on explicit tool parameter | >20 manifest entries |
| Divergence detector scanning entire codebase on every check | 30s+ scan times on medium codebases | Scope to files referenced in handoff spec; use git diff to limit to changed files | >500 source files |
| GEMINI.md import chain loading deeply nested files | Gemini CLI context window consumed by redundant context | Flatten imports to max 2 levels; deduplicate shared content | >5 import levels |
| Stitch bridge re-fetching designs on every Antigravity sync | Quota exhaustion; unnecessary API calls | Cache Stitch artifacts locally with TTL; serve from cache unless explicitly refreshed | Any sustained usage |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| MCP server accepting connections without origin validation | Any process on localhost can invoke PDE tools | Implement shared-secret handshake or restrict to known stdio parent processes |
| Exposing file paths in MCP tool responses | Path traversal information leakage to external editors | Return paths relative to project root; never expose absolute paths or paths outside `.planning/` |
| Generated context files containing API keys or tokens from .planning/config/ | Secrets committed to git via .cursorrules or GEMINI.md | Context generator must have an explicit exclusion list for config files; never read .planning/config/ contents into generated files |
| MCP server inheriting PDE's full file system access | External editor can read any file through PDE MCP server | Sandbox MCP tool file reads to project root + .planning/ directory only |
| Stitch bridge forwarding auth tokens to Antigravity | OAuth token leakage across tool boundaries | Bridge must never expose Stitch auth state; each editor must authenticate independently |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silently generating context files without telling user | User confused by new files appearing in project root | First generation must prompt user with preview + consent; subsequent regenerations log to event bus |
| Divergence report as a wall of text | User overwhelmed, ignores all findings | Group by severity (HIGH/MEDIUM/LOW), show count summary first, details on demand |
| MCP server requiring manual `claude mcp add` in every editor | Setup friction kills adoption | Provide copy-paste config snippets per editor; detect editor presence and suggest setup |
| Context files conflicting with user's existing .cursorrules | User's custom rules overwritten by PDE generation | Detect existing rules files; merge PDE rules into a separate .mdc file rather than overwriting; never touch user-authored files |
| Stitch bridge showing quota from PDE perspective only | User confused when Antigravity Stitch calls fail unexpectedly | Unified quota display showing total across all paths with per-path breakdown |

## "Looks Done But Isn't" Checklist

- [ ] **MCP Server:** Read-only contract verified -- grep all tool handlers for `fs.write`, `fs.mkdir`, `fs.append`, `fs.unlink`; any hit is a violation
- [ ] **MCP Server:** Tool count under 20 -- count exposed tools; if >20, consolidation needed
- [ ] **MCP Server:** Every tool has `readOnly: true` annotation in its description metadata
- [ ] **Context Sync:** Generation timestamp and source hash embedded in every generated file
- [ ] **Context Sync:** Hook-triggered regeneration fires after at least: brief, system, wireframe, critique, handoff skills
- [ ] **Context Sync:** Cursor .mdc files have correct YAML frontmatter with `alwaysApply` or `globs` fields
- [ ] **Context Sync:** GEMINI.md stays under 1000 lines after all imports resolved
- [ ] **Context Sync:** Existing user rules files preserved (not overwritten) during generation
- [ ] **Stitch Bridge:** Single quota counter shared across PDE direct path and Antigravity bridge path
- [ ] **Stitch Bridge:** Artifacts from both paths produce identical manifest entries (same `source: "stitch"` format)
- [ ] **Stitch Bridge:** Annotation injection happens on Antigravity-path artifacts, not just PDE-path
- [ ] **npx Package:** Lives in isolated subdirectory with own package.json; plugin root has zero new dependencies
- [ ] **npx Package:** `--version` flag works; startup self-test passes on macOS, Linux, Windows
- [ ] **Divergence Detector:** `.pde-divergence-ignore` mechanism implemented and documented
- [ ] **Divergence Detector:** All findings are CONCERNS severity, never FAIL
- [ ] **Divergence Detector:** Confidence scores attached to each finding (HIGH/MEDIUM/LOW)
- [ ] **Cross-cutting:** All 5 features produce events on the NDJSON event bus for dashboard visibility

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Write tools shipped in MCP server | HIGH | Remove write tools, publish new version, notify users of breaking change, audit any files written via old version |
| Stale context files shipped without hash tracking | MEDIUM | Add hash tracking, regenerate all files, document that old files should be deleted and regenerated |
| Dual Stitch paths with incompatible formats | HIGH | Choose canonical format, write converter for non-canonical path, re-register all Stitch artifacts in manifest |
| npx package at plugin root | HIGH | Extract to subdirectory, republish under new package structure, old npx invocations break until cache clears |
| Divergence detector disabled due to noise | LOW | Add ignore mechanism, reset severity to CONCERNS, recalibrate thresholds, re-enable with announcement |
| Context files overwriting user's custom rules | MEDIUM | Restore from git, change generator to use separate PDE-namespaced files, re-generate without overwriting |
| MCP server exposing absolute file paths | MEDIUM | Patch to use relative paths, audit external editor logs for leaked paths, publish fix |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Write tools in MCP server | Phase 1 (MCP server foundation) | Grep all tool handlers for write operations; Nyquist test asserting zero `fs.write*` calls in server code |
| Context file staleness | Phase 2 (context sync engine) | Verify generated files contain SHA-256 hash matching current design-manifest.json |
| Dual Stitch path divergence | Phase 4 (Stitch design bridge) | Run critique on same Stitch design via both paths; findings must match within tolerance |
| npx dependency pollution | Phase 1 (MCP server foundation) | Verify plugin root package.json has zero `dependencies` field; Nyquist test for isolation |
| Divergence detection false positives | Phase 5 (divergence detection) | Run detector on known-good codebase; verify <5 findings (calibration gate) |
| Context file overwriting user rules | Phase 2 (context sync engine) | Create dummy .cursorrules, run generator, verify dummy file preserved |
| MCP tool count explosion | Phase 1 (MCP server foundation) | Count tool registrations; Nyquist test asserting count <= 20 |
| Quota tracking split | Phase 4 (Stitch design bridge) | Verify single quota file updated by both PDE direct and Antigravity bridge paths |
| Absolute path leakage in MCP | Phase 1 (MCP server foundation) | Grep tool response builders for `path.resolve` or absolute path patterns |
| Generated file secrets leakage | Phase 2 (context sync engine) | Nyquist test verifying generator never reads from .planning/config/ |

## Sources

- [MCP Security Best Practices - Model Context Protocol Official](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices) -- authoritative security guidance
- [MCP Server Best Practices - Phil Schmid](https://www.philschmid.de/mcp-best-practices) -- tool description and design patterns
- [Common Challenges in MCP Server Development - DEV Community](https://dev.to/nishantbijani/common-challenges-in-mcp-server-development-and-how-to-solve-them-35ne) -- development pitfalls
- [MCP's Growing Pains - The New Stack](https://thenewstack.io/model-context-protocol-roadmap-2026/) -- MCP protocol evolution and breaking changes
- [MCP Servers and Service Account Problem - Security Boulevard](https://securityboulevard.com/2026/03/mcp-servers-and-the-return-of-the-service-account-problem/) -- confused deputy analysis
- [Securing MCP Defense-First Architecture - Christian Schneider](https://christian-schneider.net/blog/securing-mcp-defense-first-architecture/) -- read/write separation, least privilege
- [Cursor Rules Documentation](https://cursor.com/docs/context/rules) -- .mdc format, YAML frontmatter, glob patterns
- [Cursor .mdc Best Practices - Forum](https://forum.cursor.com/t/my-best-practices-for-mdc-rules-and-troubleshooting/50526) -- practical .mdc patterns
- [Gemini CLI GEMINI.md Documentation](https://geminicli.com/docs/cli/gemini-md/) -- hierarchical context loading, import syntax
- [Antigravity Rules Guide](https://antigravity.codes/blog/user-rules) -- AGENTS.md, GEMINI.md precedence, Skills format
- [Context Management for Antigravity](https://iceberglakehouse.com/posts/2026-03-context-google-antigravity/) -- context budget, modular strategies
- [MCP Server Executables (npx/uvx/Docker)](https://dev.to/leomarsh/mcp-server-executables-explained-npx-uvx-docker-and-beyond-1i1n) -- distribution patterns and platform gotchas
- [MCP Server Distribution Guide - Speakeasy](https://www.speakeasy.com/mcp/distributing-mcp-servers) -- packaging best practices
- [Spec-Driven Development Tools 2026 - Augment Code](https://www.augmentcode.com/tools/best-spec-driven-development-tools) -- drift detection landscape
- [Design-to-Code with Antigravity and Stitch - Google Codelabs](https://codelabs.developers.google.com/design-to-code-with-antigravity-stitch?hl=en) -- Antigravity + Stitch native integration path
- PDE mcp-bridge.cjs (bin/lib/mcp-bridge.cjs) -- existing APPROVED_SERVERS, TOOL_MAP, probe/degrade patterns
- PDE PROJECT.md constraints -- zero-npm-deps, read-only MCP server, file-based state model

---
*Pitfalls research for: PDE v0.15 Multi-Editor Integration*
*Researched: 2026-03-23*
