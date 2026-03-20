# Pitfalls Research

**Domain:** Making Google Stitch the primary visual design engine of an existing self-contained AI design pipeline (PDE v0.9)
**Researched:** 2026-03-20
**Confidence:** HIGH for architectural failure modes (grounded in PDE codebase inspection and Stitch documentation); MEDIUM for Stitch-specific behavior (API and output format documentation is sparse; the MCP server is recent and community-documented)

---

## The Fundamental Tension

PDE's design pipeline was built self-contained by deliberate choice. Every skill — wireframe, mockup, critique, handoff — reads and writes local files in `.planning/design/`. The Bash tool, Read tool, and Write tool are the only dependencies. A user can run `/pde:build` on a plane with no internet and get a complete design output.

Making Stitch the primary rendering engine breaks this guarantee for four touchpoints simultaneously. The pipeline goes from "always works" to "works when Stitch works." Every architectural decision in v0.9 must be measured against this trade.

---

## Critical Pitfalls

### Pitfall 1: Stitch is a Google Labs Tool — Its API Stability Is Not Guaranteed

**What goes wrong:**
Google Labs tools ship early and change without notice. The Stitch MCP server is a recent addition (launched alongside the MCP spec and API keys in early 2026). Forum posts from January 2026 show users unable to generate API keys at all — the feature was on the roadmap but not deployed. The `--use-stitch` flag in four PDE commands becomes non-functional silently if the Stitch API changes its tool names, removes an endpoint, or stops accepting the auth format PDE configured. PDE has no test coverage for external API shape changes and no automated alert when Stitch tools stop responding as expected.

**Why it happens:**
The mcp-bridge.cjs TOOL_MAP pattern insulates PDE from raw MCP tool name changes — but only if tool names are known and stable at implementation time. The two competing Stitch MCP implementations (davideast's `@_davideast/stitch-mcp` and Kargatharaakash's `stitch-mcp`) expose different tool names for the same capabilities. Workflows that hard-code one tool name will break silently if the user configured the other server. More critically: the official Stitch SDK (`@google/stitch-sdk`) is npm-based and requires Node.js package management — a direct conflict with PDE's zero-npm-at-plugin-root constraint.

**How to avoid:**
- Register Stitch as the 6th approved server in APPROVED_SERVERS with the official MCP server URL only (not community variants), with a clear `probeTool` that validates the server is the expected version
- Add Stitch TOOL_MAP entries only for verified official tool names from `stitch.withgoogle.com/docs/mcp/setup` — not from community implementations
- Never call the Stitch SDK directly from PDE code (npm constraint); call only via MCP tool invocations through mcp-bridge.cjs
- The `--use-stitch` flag must check probe status before the first generation call, not assume connectivity
- Document the Google Labs instability risk explicitly in `/pde:connect stitch` output

**Warning signs:**
- Any workflow calling `mcp__stitch__*` tool names that are not in the official Stitch MCP documentation
- TOOL_MAP entries derived from community GitHub repos rather than official docs
- No probe registered for Stitch in APPROVED_SERVERS
- A test that passes with Stitch connected but does not verify tool names are still valid

**Phase to address:** MCP bridge registration phase (first phase) — TOOL_MAP entries must be verified against the official `stitch.withgoogle.com/docs/mcp/setup` page at implementation time, not derived from community implementations. Probe verification is mandatory.

---

### Pitfall 2: Generation Quota Exhaustion Silently Blocks the Ideation Diverge Phase

**What goes wrong:**
Stitch Standard Mode offers 350 generations per month. Experimental Mode offers 50. The `/pde:ideate --diverge` phase generates a minimum of 5 distinct directions. If visual divergence uses Stitch for each direction, that is 5 Experimental-mode generations per single ideation run. A user who runs ideation twice a day hits the 50-generation Experimental limit in 5 days. Standard mode provides more headroom (350 / 5 = 70 runs per month) but degrades output quality for design generation.

The failure mode is not a clear error — Stitch returns a 429-equivalent response or a generation failure that PDE's current workflows have no handling for. The ideation diverge either fails mid-run (partial artifacts in `.planning/design/strategy/`) or fails silently (Stitch call is swallowed, the direction is generated without visual content, and the coverage flag is set anyway).

**Why it happens:**
PDE workflows follow a probe/degrade contract for MCP availability — if the service is unreachable, they skip the MCP step. But quota exhaustion is a different failure: the service is reachable, the probe succeeds, but individual generation calls fail. The existing probe/degrade contract does not distinguish "service unavailable" from "service temporarily unable to generate." A quota-exhausted Stitch behaves like a healthy server until the generate call is made, at which point the failure occurs deep in the workflow with no graceful path back to the Claude-generated fallback.

**How to avoid:**
- Track generation counts in `.planning/config.json` under a `stitch_quota` key (monthly reset date + count used + mode)
- Check the estimated remaining quota before starting a batch diverge sequence
- Warn the user when fewer than 10 Standard generations or 5 Experimental generations remain before beginning a multi-generation operation
- On generation failure mid-sequence, fall back to Claude-generated HTML for remaining variants without failing the entire diverge run
- Treat quota exhaustion as a degrade condition, not an error condition — the workflow continues with reduced Stitch output

**Warning signs:**
- No quota tracking in the Stitch integration
- `--diverge` generates all 5+ variants before checking any generation result
- A mid-run Stitch failure produces an incomplete artifact set with no user notification
- The coverage flag `hasIdeation` is set even when Stitch variants were not generated

**Phase to address:** Ideation diverge integration phase — quota tracking and mid-run fallback must be built into the first implementation of Stitch-powered diverge. Adding it later requires touching the artifact registration logic retroactively.

---

### Pitfall 3: Stitch Output Does Not Respect PDE's DTCG/OKLCH Design Tokens

**What goes wrong:**
PDE's design system skill generates `assets/tokens.css` with DTCG-format tokens in OKLCH color space. The wireframe workflow explicitly consumes this file: "Wireframes consume design tokens from assets/tokens.css when available." Stitch generates its own HTML/CSS with class names and color values chosen by its generative model — no knowledge of PDE's tokens. The Stitch output uses hardcoded hex colors, arbitrary class names, and generic Tailwind-style utilities. The result is two divergent design languages in the same pipeline: the design system tokens and the Stitch aesthetic.

The critique stage then evaluates Stitch HTML against PDE's quality rubric, which includes OKLCH color usage and design token consistency. Stitch output will systematically fail this check. The critique report fills with token-consistency findings that have nothing to do with the design quality of the screens — they are structural mismatch artifacts. The critique signal is polluted.

**Why it happens:**
Stitch has no design system import capability at the generation step. The `extract_design_context` tool extracts colors and fonts from existing Stitch screens to maintain consistency across a Stitch project — but this is Stitch-internal consistency, not PDE token consistency. There is no Stitch API parameter to inject a CSS token file into generation. Stitch's Gemini model generates visual design from aesthetic training, not from a provided token specification.

**How to avoid:**
- Never evaluate Stitch output with the standard DTCG token consistency criterion in critique — add a Stitch-aware critique mode that substitutes "visual consistency with Stitch design DNA" for "token alignment with assets/tokens.css"
- When extracting patterns from Stitch output for handoff, perform a token-mapping step: scan Stitch HTML for color values and suggest the nearest DTCG token equivalent in the handoff spec
- Document clearly: Stitch is the diverge/explore tool; the design system token layer is the converge/implement layer. These are different phases of the design process, not competing sources of truth
- The `--use-stitch` flag should suppress the token-consistency criterion in the critique pass that evaluates Stitch artifacts
- For mockup (which applies tokens to wireframes), maintain Claude-generated HTML as the token-aware implementation path; use Stitch as visual reference only

**Warning signs:**
- The critique workflow runs token-consistency checks on Stitch-sourced HTML without a Stitch-mode flag
- The handoff spec lists Stitch color hex values as component colors without mapping them to DTCG tokens
- The design-manifest.json stores Stitch HTML paths as the authoritative wireframe/mockup artifacts without a `source: "stitch"` annotation

**Phase to address:** Critique integration phase AND handoff integration phase — both must define Stitch-aware evaluation modes before the first Stitch artifact enters these stages.

---

### Pitfall 4: Stitch HTML Arrives as a Download URL, Not a Local File Path

**What goes wrong:**
PDE's critique and handoff workflows discover artifacts by reading local file paths from `design-manifest.json`. A wireframe artifact at `.planning/design/ux/WFR-login-v1.html` is read directly with the Read tool. Stitch returns HTML from `fetch_screen_code` / `get_screen_code` as a download URL (e.g., `https://storage.googleapis.com/...`). This URL is time-limited (Google Cloud signed URLs typically expire in 1-15 minutes). If the Stitch HTML is registered in the design manifest as a URL and critique or handoff runs later in the session, the URL may be expired when the workflow tries to read it.

Downstream consumers that call `Read(url)` instead of `Read(localPath)` will fail at artifact read time. Workflows that pass the URL to Claude for analysis instead of reading the content will produce analysis of the URL string, not the design content. Neither failure mode is loud — both produce subtly wrong outputs that look like they completed normally.

**Why it happens:**
The MCP tools return download URLs rather than file content directly, requiring an additional fetch step. PDE's current MCP integration pattern (Figma, Pencil) follows the probe/degrade model for connection status, but does not handle the "artifact available at a transient URL" pattern. Stitch is the first integration where the primary artifact is a remote URL that must be materialized locally before the downstream workflow can use it.

**How to avoid:**
- After every Stitch generation call, immediately fetch the download URL and write the content to a local file at the canonical PDE artifact path (e.g., `.planning/design/ux/WFR-login-v1.html` for wireframes, `.planning/design/visual/MCK-login-v1.html` for mockups)
- Register the local file path in design-manifest.json, not the Stitch URL
- Treat the Stitch URL as a transient resource — fetch, persist locally, discard the URL
- The Stitch MCP integration workflow must complete the full generate-fetch-persist cycle before returning to the calling skill
- Add a `source: "stitch"` metadata field to manifest entries so downstream workflows can apply Stitch-aware evaluation modes

**Warning signs:**
- design-manifest.json contains `https://storage.googleapis.com/` URLs as artifact paths
- The Stitch integration workflow returns without verifying the local file was written successfully
- A critique or handoff run that starts more than 5 minutes after wireframe generation fails to read the Stitch artifact

**Phase to address:** Wireframe integration phase (the first Stitch touchpoint) — the generate-fetch-persist pattern must be established in the first implementation and reused by all subsequent Stitch touchpoints. If mockup or ideate implement their own URL handling, divergent patterns accumulate.

---

### Pitfall 5: Stitch HTML Has No PDE Annotation Conventions — Handoff Reads Silence

**What goes wrong:**
PDE's handoff workflow reads HTML wireframe files and extracts annotations from HTML comments following PDE's convention: `<!-- @component: ComponentName -->`, `<!-- @state: loading -->`, `<!-- @a11y: aria-label="..." -->`. These annotations are the basis for generating TypeScript interfaces and component API specs in the handoff spec. Claude writes these annotations when generating wireframes. Stitch generates clean production-quality HTML with semantic class names but zero PDE annotation comments. The handoff workflow reads a Stitch HTML file and finds no annotations — it either halts on `HND-01` (insufficient annotations) or generates a handoff spec with empty component specifications.

This is the "looks done but isn't" failure: the handoff skill completes, writes a file, sets the coverage flag, and the output is a shell of a handoff spec with no component API definitions.

**Why it happens:**
Stitch is designed to produce deployment-ready HTML, not annotated design artifacts. Its output optimizes for visual fidelity and code correctness, not for machine-readable design intent signals. The annotation layer is PDE-specific and there is no mechanism to inject it into Stitch's generation prompt — Stitch generation is a visual-first operation, not a text-annotation operation.

**How to avoid:**
- After fetching and persisting Stitch HTML, run a mandatory annotation-injection step where Claude reads the Stitch HTML, identifies components, states, and accessibility implications, and injects PDE-format annotation comments into the local copy
- This step runs between "generate Stitch artifact" and "register artifact in manifest" — the manifest entry points to the annotated local copy, never the raw Stitch download
- Document this explicitly: "Stitch output is a visual starting point; annotations are added by PDE before downstream consumption"
- Add a `stitch_annotated: true` field to manifest entries that have passed through annotation injection, so handoff can verify the step completed
- If annotation injection fails or is skipped, handoff must warn the user and offer to run in `--force` mode (generate spec from visual analysis without annotations)

**Warning signs:**
- Handoff workflow receives a Stitch HTML path and reads it without checking for `<!-- @component:` annotations
- The `stitch_annotated` field is missing from design-manifest.json entries for Stitch artifacts
- The HND coverage flag is set on a handoff spec that contains empty component API sections
- No annotation injection step exists in the Stitch wireframe integration workflow

**Phase to address:** Handoff integration phase — annotation injection is a required step that must be designed as part of the Stitch-to-handoff data pipeline, not an optional enhancement.

---

### Pitfall 6: Service Outage Breaks the Entire Design Phase for Sessions That Depend on Stitch

**What goes wrong:**
Before v0.9, a PDE user with no internet access could run `/pde:wireframe` and get a complete output. After v0.9, a user who passes `--use-stitch` to their wireframe command gets a hard failure if Stitch is unreachable, the API key is revoked, or the Google Labs service has an outage. The failure cascades: wireframe fails → critique has no artifact to evaluate → iterate has no critique to act on → handoff has no wireframe to spec → the entire design track is blocked.

The existing probe/degrade pattern in mcp-bridge.cjs handles "service not configured" gracefully. It does not handle "service was working when probed, then failed mid-generation" — which is the common failure mode for cloud AI services under load. The probe runs at the start of the workflow, but the generation call happens several steps later. Between probe and generation, the service can degrade.

**Why it happens:**
PDE's current five MCP integrations (GitHub, Linear, Jira, Figma, Pencil) are enhancement integrations — they add context or sync artifacts, but the core design output is always Claude-generated. If Figma is unavailable, the wireframe is still generated without Figma context. Stitch is the first integration where the MCP tool IS the primary output. The probe/degrade contract was designed for optional enhancement, not primary generation. Applying it to a primary-output integration requires a different contract: "generate via Stitch if available, generate via Claude if not" rather than "enhance via MCP if available, skip enhancement if not."

**How to avoid:**
- Implement a two-path generation contract for all Stitch touchpoints: Stitch path (if `--use-stitch` and Stitch available) and Claude path (always available)
- The Claude path must produce equivalent artifacts in the same file locations with the same manifest registration — it is not a degraded path, it is an equivalent path
- On Stitch generation failure mid-run (after probe succeeded), automatically fall through to the Claude path without user intervention, with a prominent notice: "Stitch generation failed — completed using Claude. Stitch artifacts replaced with Claude equivalents."
- The `--use-stitch` flag means "prefer Stitch" not "require Stitch" — this framing must be in the flag documentation and in workflow comments
- Never mark a touchpoint as requiring Stitch in the coverage schema — the coverage flag should be set on artifact existence, not on generation source

**Warning signs:**
- Any workflow that halts on Stitch failure rather than falling through to Claude generation
- The `--use-stitch` flag documentation that says "requires Stitch connection" without a fallback clause
- Stitch probe run at workflow start but no mid-generation failure handling
- Coverage flags that distinguish "stitch-generated" from "claude-generated" in ways that block downstream skills

**Phase to address:** Every Stitch touchpoint phase — the two-path contract (Stitch or Claude) must be in the first implementation of each touchpoint. Retrofitting fallback logic into a Stitch-only implementation requires touching every step that calls a Stitch tool.

---

### Pitfall 7: Image Input to Stitch (Wireframe-as-Input) Is Unreliable in Experimental Mode

**What goes wrong:**
One planned touchpoint feeds PDE wireframe HTML screenshots into Stitch as image inputs for higher-fidelity generation. This is the "wireframe to mockup via Stitch" path where existing lofi wireframes become hifi mockups. Stitch's Experimental Mode supports image inputs, but documented behavior shows inconsistency: uploaded wireframes sometimes trigger a text-prompt request instead of rendering the wireframe. The Experimental Mode limit (50 generations per month, shared across ALL image-input uses) makes failed attempts costly — each failed attempt consumes a generation even if no useful output is produced.

Additionally, Stitch cannot capture navigation state, interaction behavior, or multi-screen flows from a screenshot. A PDE wireframe may use CSS classes and state comments to show loading/error states. The screenshot Stitch receives is a single static frame with no state information.

**Why it happens:**
Image-to-UI interpretation requires the model to infer design intent from pixel data. This is more ambiguous than text prompting, and the Gemini 2.5 Pro model that powers Experimental mode makes different interpretation choices across runs. The 50-generation monthly cap for Experimental mode was not designed for automated pipeline use — it is sized for manual iterative design work by a single user.

**How to avoid:**
- For the wireframe-to-mockup path, use text description of the wireframe as the Stitch generation input rather than a screenshot — Claude can generate a structured description of the wireframe's layout, components, and intent that Stitch can interpret reliably
- If image input is used, implement retry logic with a budget of exactly one retry per screen (preserving quota), falling back to Claude-generated mockup on second failure
- Use Standard Mode (Gemini 2.5 Flash, 350/month) for the automated pipeline — reserve Experimental Mode for manual user exploration
- Capture Stitch generation failures explicitly and report them in the skill output with the mode and attempt count consumed

**Warning signs:**
- The wireframe-to-mockup Stitch path uses Experimental Mode by default
- No retry budget or failure mode is defined for image-input generation
- Quota tracking does not distinguish Standard from Experimental mode consumption
- A failed Stitch image-input attempt silently consumes a quota unit and produces no artifact

**Phase to address:** Mockup integration phase — the text-description input strategy and mode selection must be decided before the first implementation. Switching from image-input to text-description after implementation requires changing the generation prompt strategy entirely.

---

### Pitfall 8: Authentication Setup Adds Mandatory User-Facing Friction Before First Use

**What goes wrong:**
All five existing PDE MCP integrations use standard OAuth flows (GitHub, Linear, Jira, Figma) or auto-configure from VS Code (Pencil). Stitch adds a new authentication pattern: a `STITCH_API_KEY` environment variable that must be set manually before the MCP server can be configured. The user must navigate to `stitch.withgoogle.com`, generate an API key in Settings, copy it, set it as an environment variable, then run `claude mcp add` to configure the server. This is three steps more than any existing PDE integration. If the user skips any step, `/pde:connect stitch` fails at probe time with a cryptic MCP authentication error rather than a clear "API key not set" message.

Additionally, the API key is stored in the shell environment — it is not persisted between sessions unless the user adds it to their shell profile. A user who successfully connects Stitch in one session will find it disconnected in the next session if they did not update their `.zshrc` or `.bash_profile`.

**Why it happens:**
Stitch API key authentication is new (launched early 2026) and the setup flow was designed for manual interactive use, not for programmatic onboarding by a CLI tool. The existing PDE `/pde:connect` flow sends the user through an OAuth browser redirect that handles session persistence automatically. The API key approach requires the user to manage persistence themselves.

**How to avoid:**
- The `/pde:connect stitch` workflow must check for `STITCH_API_KEY` before attempting to add the MCP server, and print a specific multi-step setup guide if the variable is absent
- After a successful connection, explicitly recommend that the user add `export STITCH_API_KEY=...` to their shell profile, with the exact command to run
- The `--use-stitch` flag on wireframe and mockup must check connection status at startup and emit a clear "Stitch not connected" error (not a generic MCP error) if the server is absent from the Claude Code MCP list
- Document this as the highest-friction integration in PDE's Getting Started guide — "Stitch requires a manual API key setup; other integrations use browser OAuth"

**Warning signs:**
- `/pde:connect stitch` does not check for `STITCH_API_KEY` before calling `claude mcp add`
- The authentication error message from the MCP server reaches the user without PDE wrapping it in a human-readable explanation
- No shell profile setup recommendation in the `/pde:connect stitch` success output
- Stitch connection works in one session but fails in the next because the environment variable was not persisted

**Phase to address:** MCP bridge registration phase — the authentication guidance must be built into `/pde:connect stitch` from the first implementation, before any user testing.

---

### Pitfall 9: The `extract_design_context` Tool Creates Stitch-Internal Consistency, Not PDE Consistency

**What goes wrong:**
The `extract_design_context` MCP tool (exposed by the Kargatharaakash server) extracts "Design DNA" (fonts, colors, layouts) from existing Stitch screens to maintain consistency when generating additional screens. This is Stitch's internal consistency mechanism — it ensures new screens look like existing Stitch screens. It does NOT align with PDE's design system tokens.

If PDE uses `extract_design_context` to seed new screen generation, the design DNA is sourced from Stitch's AI-generated aesthetic (arbitrary hex colors, Google-selected typefaces) and propagates through the session. Each successive Stitch generation reinforces the Stitch aesthetic, pulling further from PDE's OKLCH token system. By the end of the ideation diverge, all five directions share a Stitch visual language rather than five genuinely distinct directions informed by the project's design system.

**Why it happens:**
The "Designer Flow" recommended in the Stitch MCP documentation (extract context → generate with context) is designed for design-system consistency within Stitch projects. Applied to a PDE pipeline where PDE has its own design system, this flow substitutes Stitch's generative aesthetic for PDE's intentional design language.

**How to avoid:**
- For ideation diverge (where visual distinctiveness is the goal), do NOT use `extract_design_context` — each variant should be generated from the text prompt alone to maximize visual divergence
- For mockup (where consistency with the design system is the goal), do NOT use `extract_design_context` — use the PDE design system description as the style input instead
- Reserve `extract_design_context` only for the case where a user explicitly wants to extend an existing Stitch project's visual language
- Document this explicitly: "extract_design_context creates consistency within a Stitch session; it does not enforce PDE design tokens"

**Warning signs:**
- The ideation diverge Stitch integration calls `extract_design_context` before generating each variant
- The mockup Stitch integration uses `extract_design_context` from a previous Stitch session to establish "consistency"
- All five ideation variants share the same color palette (artifact of shared design DNA)

**Phase to address:** Ideation diverge integration phase AND mockup integration phase — the decision not to use `extract_design_context` must be explicit in the workflow design, not left to implementation discretion.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing Stitch download URLs in design-manifest.json instead of fetching and persisting locally | Faster integration, no fetch step | URLs expire in minutes; critique/handoff that runs later fails silently | Never — persist locally immediately after generation |
| Using community MCP server tool names instead of official Stitch docs | Faster to implement (more community examples) | Tool names differ between implementations; break silently when users install the other server | Never — verify against `stitch.withgoogle.com/docs/mcp/setup` only |
| Skipping the annotation-injection step for Stitch HTML | One fewer step per generation | Handoff reads Stitch HTML and finds no annotations; outputs empty component specs | Never — annotation injection is required for handoff to produce meaningful output |
| Using `extract_design_context` for consistency across all Stitch calls | Visually consistent Stitch output | Overrides PDE design tokens; homogenizes ideation diverge variants | Only when explicitly extending an existing Stitch project (never in PDE's automated flows) |
| Setting coverage flags on Stitch-sourced artifacts without verifying annotation injection completed | Coverage appears complete | Downstream skills (critique, handoff) get incomplete artifacts without warning | Never — coverage flag should gate on artifact completeness, not generation completion |
| Running `--use-stitch` diverge with all 5 variants before checking first generation result | Simpler sequential code | Consumes all quota on first generation failure; no partial results | Never — check after first generation; fall back early |

---

## Integration Gotchas

### Wireframe Touchpoint (`/pde:wireframe --use-stitch`)

| Common Mistake | Correct Approach |
|----------------|------------------|
| Calling Stitch generate and registering the download URL as the artifact | Fetch URL content immediately, write to `.planning/design/ux/WFR-{screen}-v{N}.html`, register local path |
| Probing at workflow start and assuming Stitch will succeed at generation time | Add generation-failure handling that falls through to Claude generation without user intervention |
| Generating all screens before checking any result | Generate screen 1, verify result, then continue — allows early fallback if quota is exhausted |
| Passing raw Stitch HTML to critique | Run annotation-injection step before registering artifact; annotated copy is the registered artifact |

### Ideation Diverge Touchpoint (`/pde:ideate --diverge` with Stitch)

| Common Mistake | Correct Approach |
|----------------|------------------|
| Using Experimental Mode for automated diverge | Use Standard Mode (350/month) for automated generation; reserve Experimental for manual iterations |
| Using `extract_design_context` to seed each variant | Generate each variant independently from text prompt — divergence requires no shared design DNA |
| Generating all 5+ variants before checking quota | Check remaining quota before starting; warn if fewer than 5 generations remain |
| Setting `hasIdeation` coverage flag when Stitch variants partially failed | Only set flag when all requested variants were generated (via Stitch or Claude fallback) |

### Critique Touchpoint (`/pde:critique` with Stitch artifacts)

| Common Mistake | Correct Approach |
|----------------|------------------|
| Running token-consistency criterion on Stitch HTML | Check `source: "stitch"` in manifest; substitute "visual consistency with design DNA" criterion |
| Failing critique because Stitch HTML uses hex colors not OKLCH tokens | Stitch-mode critique evaluates design quality, not token format — suppress token-format checks |
| Reading Stitch artifact via stored URL (expired) | Always read from local file path; URLs must be materialized before manifest registration |
| Critique report filled with token-mismatch findings from Stitch output | Stitch-mode critique must filter these; they are structural artifacts, not design problems |

### Handoff Touchpoint (`/pde:handoff` with Stitch artifacts)

| Common Mistake | Correct Approach |
|----------------|------------------|
| Reading Stitch HTML expecting PDE annotation comments | Verify `stitch_annotated: true` in manifest; run annotation injection if missing |
| Generating TypeScript interfaces from unannotated Stitch HTML | Require annotation injection before handoff; offer `--force` mode that generates specs from visual analysis |
| Mapping Stitch hex colors directly to component props | Token-mapping step: find nearest DTCG token for each Stitch color value; document the mapping |
| Handoff spec references Stitch download URL for design reference | All artifact paths in handoff spec must be local file paths |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential Stitch generation for 5 ideation variants | Ideation diverge takes 5x the single-screen generation time (each Stitch call is a round trip to Google's API) | Batch generation if the API supports it; otherwise accept the latency and report progress per variant | Immediately — 5 sequential 5-10s API calls is 25-50s minimum for diverge |
| Fetching Stitch HTML at critique time instead of generation time | Critique workflow stalls on URL fetch; fails if URL is expired | Materialize all Stitch URLs to local files at generation time; never store URLs in manifest | Any critique run more than ~15 minutes after generation |
| Annotation injection on every Stitch HTML file at handoff time | Handoff runs Claude analysis on all Stitch files serially; each is a full LLM call | Run annotation injection immediately after generation (while context is fresh); store result; handoff reads pre-annotated file | When Stitch artifacts accumulate across sessions |
| Stitch probe run on every `--use-stitch` command invocation | Each probe is a live network call adding latency to command startup | Cache probe result in `.planning/mcp-connections.json` with a 60-second TTL (same as existing integrations) | Immediately — uncached probes add 1-3s to every command start |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing `STITCH_API_KEY` value in `.planning/config.json` | API key readable by any process with access to the project directory; may be committed to git | Never store key value in project files — reference env var name only; document that the env var must be set in shell profile or secrets manager |
| Committing Stitch-generated HTML that contains embedded user data | If Stitch HTML includes injected prompt content (user-described product details), that content is in a committed file | Review Stitch artifacts for sensitive content before commit; add `.planning/design/` artifacts to `.gitignore` by default |
| Using a single shared API key across multiple users/projects | Key exhausts shared quota; one project's heavy use blocks all projects | Each user/project should have its own API key; document this in multi-user setup guide |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent fallback from Stitch to Claude with no notification | User assumes they got Stitch output; compares to a previous run and sees different visual quality | Always notify when fallback occurred: "Stitch unavailable — generated with Claude instead. Run with --use-stitch to retry." |
| Quota warning only after exhaustion | User discovers they have 0 generations remaining mid-workflow, all previous work is lost | Warn when fewer than 10% of quota remains (35 Standard / 5 Experimental) at workflow start |
| `--use-stitch` flag appearing on 4 separate commands without unified quota display | User does not know total quota remaining when running multiple commands | `/pde:monitor` or `/pde:connect stitch --status` should show current quota remaining across all modes |
| Stitch variants in ideation look visually similar despite `--diverge` | User cannot distinguish 5 directions; ideation is not providing divergence value | Log each variant's Stitch prompt separately; if all prompts are too similar, warn that divergence may be insufficient |

---

## "Looks Done But Isn't" Checklist

- [ ] **Stitch HTML persisted locally:** After generation, verify `.planning/design/ux/WFR-{screen}-v1.html` exists and contains HTML content — the manifest must not have a `https://` URL as the artifact path
- [ ] **Annotation injection completed:** After Stitch wireframe generation, verify the local HTML file contains at least one `<!-- @component:` annotation — if not, annotation injection did not run
- [ ] **`stitch_annotated: true` in manifest:** design-manifest.json entries for Stitch artifacts must carry this field — handoff checks it before proceeding
- [ ] **Critique suppresses token-consistency checks on Stitch artifacts:** Run critique on a Stitch-sourced wireframe and verify the report does not cite OKLCH or DTCG token violations as findings
- [ ] **Quota tracking active:** After a Stitch generation, verify `.planning/config.json` has updated `stitch_quota.used` — if the count did not increment, quota tracking is not wired
- [ ] **Fallback produces equivalent artifact:** Disconnect Stitch (unset `STITCH_API_KEY`) and run `/pde:wireframe --use-stitch` — the workflow must complete with a Claude-generated HTML file at the same path, with a fallback notice in the output
- [ ] **Probe cached in mcp-connections.json:** After the first `--use-stitch` command, verify `mcp-connections.json` has a Stitch entry with `lastChecked` timestamp — if not, the probe is running live on every invocation
- [ ] **Handoff with Stitch artifacts produces non-empty component specs:** Run `/pde:handoff` after a Stitch wireframe + annotation injection — the output TypeScript file must contain at least one interface definition, not just a shell
- [ ] **Shell profile setup recommended after connect:** Run `/pde:connect stitch` and verify the success output includes the exact command to add `STITCH_API_KEY` to the user's shell profile

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stitch URL stored in manifest (expired) | MEDIUM | Re-run the Stitch generation for affected screens; implement generate-fetch-persist pattern; update manifest entries |
| Annotation injection missing from Stitch artifacts | LOW | Run annotation injection as a standalone step against existing Stitch HTML files; update `stitch_annotated` flag in manifest |
| Quota exhausted mid-ideation | LOW | Fall back to Claude for remaining variants; continue from last successful Stitch variant; notify user |
| Community MCP server tool names used (not official) | HIGH | Audit all TOOL_MAP Stitch entries against official docs; update to official names; test each touchpoint |
| `extract_design_context` used for diverge (all variants look similar) | MEDIUM | Regenerate variants without context seeding; delete Stitch-internal project if context was applied |
| STITCH_API_KEY not persisted across sessions | LOW | Add env var to shell profile; reconnect with `/pde:connect stitch`; re-run failed command |
| Token-consistency failures polluting critique reports | MEDIUM | Add `source` field to existing Stitch manifest entries; update critique to read source field; re-run critique with Stitch-aware mode |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Google Labs API instability / community tool names (Pitfall 1) | MCP bridge registration | Verify all Stitch TOOL_MAP entries against official `stitch.withgoogle.com/docs/mcp/setup`; probe returns healthy |
| Quota exhaustion blocking ideation diverge (Pitfall 2) | Ideation diverge integration | Simulate quota exhaustion; verify workflow falls back to Claude for remaining variants without failing |
| Stitch HTML ignores DTCG/OKLCH tokens (Pitfall 3) | Critique integration AND handoff integration | Run critique on Stitch artifact; verify token-consistency criterion is suppressed; verify handoff maps colors to DTCG tokens |
| Stitch download URL expiration (Pitfall 4) | Wireframe integration (first Stitch touchpoint) | Wait 20 minutes after generation; verify critique can still read wireframe artifact from local path |
| Missing PDE annotations in Stitch HTML (Pitfall 5) | Handoff integration | Verify Stitch HTML has `<!-- @component:` annotations before handoff; verify handoff spec contains non-empty TypeScript interfaces |
| Service outage cascades to full design track failure (Pitfall 6) | Every Stitch touchpoint phase | Disconnect Stitch; run `--use-stitch` on wireframe; verify Claude fallback completes with equivalent artifact |
| Unreliable image-to-UI in Experimental mode (Pitfall 7) | Mockup integration | Use text-description strategy; verify Standard mode is default for automated pipeline; verify retry budget is 1 |
| Authentication friction and session persistence (Pitfall 8) | MCP bridge registration | Unset `STITCH_API_KEY`; verify `/pde:connect stitch` prints specific setup guide; verify success output includes shell profile command |
| `extract_design_context` overriding PDE design system (Pitfall 9) | Ideation diverge integration AND mockup integration | Verify diverge workflow does not call `extract_design_context`; verify 5 variants have distinct color palettes |

---

## Sources

- PDE PROJECT.md v0.9 milestone requirements (Stitch integration targets) — HIGH confidence
- PDE codebase direct inspection: bin/lib/mcp-bridge.cjs (APPROVED_SERVERS, TOOL_MAP, probe/degrade contracts), workflows/wireframe.md (artifact paths, tokens.css consumption), workflows/critique.md (artifact discovery pattern), workflows/handoff.md (annotation reading pattern), workflows/ideate.md (diverge phase structure) — HIGH confidence
- Google Stitch official blog: [Design UI using AI with Stitch from Google Labs](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/) — HIGH confidence
- Google Developers Blog Stitch introduction: [From idea to app: Introducing Stitch, a new way to design UIs](https://developers.googleblog.com/stitch-a-new-way-to-design-uis/) — HIGH confidence
- Stitch SDK GitHub (google-labs-code): [google-labs-code/stitch-sdk](https://github.com/google-labs-code/stitch-sdk) — authentication, output formats (HTML download URL), API key setup — HIGH confidence
- davideast stitch-mcp GitHub: [davideast/stitch-mcp](https://github.com/davideast/stitch-mcp) — tool names `build_site`, `get_screen_code`, `get_screen_image` — MEDIUM confidence (community implementation)
- Kargatharaakash stitch-mcp GitHub: [Kargatharaakash/stitch-mcp](https://github.com/Kargatharaakash/stitch-mcp) — tool names `extract_design_context`, `fetch_screen_code`, `generate_screen_from_text` — MEDIUM confidence (community implementation, tool names differ from davideast)
- Google AI Developers Forum — API key unavailability: [I cannot generate an API key on the Stitch website](https://discuss.ai.google.dev/t/i-cannot-generate-an-api-key-on-the-stitch-website/114453) — HIGH confidence (official Google response confirming API was not yet available in Jan 2026)
- Google AI Developers Forum — API availability confirmed: [Stitch by Google on X — API Keys launched](https://x.com/stitchbygoogle/status/2016567646180041166) — HIGH confidence (official account)
- Index.dev Stitch review 2026: [Google Stitch Review 2026](https://www.index.dev/blog/google-stitch-ai-review-for-ui-designers) — output quality, design token limitations, no component naming — MEDIUM confidence
- NxCode Stitch complete guide: [Google Stitch Complete Guide 2026](https://www.nxcode.io/resources/news/google-stitch-complete-guide-vibe-design-2026) — 350/50 generation limits, Standard vs Experimental modes — MEDIUM confidence
- WinBuzzer: [Google Revamps Stitch AI with Voice, Canvas, Dev Tools](https://winbuzzer.com/2026/03/20/google-redesigns-stitch-ai-voice-canvas-developer-integrations-xcxwbn/) — March 2026 feature update — MEDIUM confidence
- Fallback pattern: [AWS Builders Library — Avoiding fallback in distributed systems](https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/) — primary-path reliability vs fallback complexity trade-off — HIGH confidence
- MCP market Stitch listing: [mcpmarket.com/server/stitch](https://mcpmarket.com/server/stitch) — server capabilities overview — LOW confidence (aggregator, not official)

---

*Pitfalls research for: Making Google Stitch the primary visual design engine of PDE (v0.9 Google Stitch Integration milestone)*
*Researched: 2026-03-20*
