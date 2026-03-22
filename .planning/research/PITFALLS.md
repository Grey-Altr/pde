# Pitfalls Research

**Domain:** Adding "business:" orthogonal product type dimension to existing multi-type design pipeline (PDE v0.12)
**Researched:** 2026-03-22
**Confidence:** HIGH for pipeline integration and regression risks (grounded in direct v0.11 experience type implementation and codebase inspection); HIGH for LLM financial/legal content risks (cross-referenced multiple 2025 legal and AI risk sources); MEDIUM for deployment scaffolding pitfalls (Stripe/Vercel/Resend patterns from official docs and community reports); MEDIUM for user-track branching pitfalls (inferred from feature-branching literature and v0.11 experience type pattern)

---

## Critical Pitfalls

### Pitfall 1: Orthogonal Dimension Means Every Existing Workflow Has Two New Branch Sites, Not One

**What goes wrong:**
The experience type (v0.11) was purely additive — it added conditional blocks to existing workflows with a single `IF experience` gate per workflow. The `business:` dimension is orthogonal: it combines with all existing product types (business:software, business:hardware, business:hybrid, business:experience) and with all three user tracks (solo founder, startup team, product leader). This creates a 4×3 = 12 output configuration space. Every workflow that previously had one branch point now has two nested branch points. Developers who treat `business:` as a fourth product type (parallel to software/hardware/hybrid) will build a wrong model and produce software/hardware/hybrid regressions on every business: project.

**Why it happens:**
The natural pattern from v0.11 is `ELSE IF business`. But `business:` is a modifier layer, not a peer. If a developer writes `IF software ... ELSE IF hardware ... ELSE IF hybrid ... ELSE IF experience ... ELSE IF business` they've collapsed the orthogonal dimension into a sequential one. A business:software project will fail to trigger the software branch and instead trigger the business branch, losing all software-specific logic.

**How to avoid:**
- Represent the dimension as a composite flag pair: `product_type` (software/hardware/hybrid/experience) + `business_mode` (boolean or null). Never merge them into a single enum value.
- At every pipeline branch site, the required evaluation order is: (1) evaluate `product_type` for type-specific logic, (2) evaluate `business_mode` for business overlays. Business overlays append to, never replace, type-specific sections.
- Store `business_mode: true` and `user_track: "solo_founder|startup_team|product_leader"` as separate fields in `design-manifest.json`, not encoded in `productType`.
- Audit all 14 workflow files before writing new code. Use `grep -rn "product_type\|productType" workflows/` to find every branch site. Count exact number of sites so you know when you've updated all of them.
- Write Nyquist regression assertion: a business:software project produces software-type artifacts (component APIs, TypeScript interfaces) PLUS business-type artifacts (business thesis, pricing config). Not one or the other.

**Warning signs:**
- A business:software project produces a production bible (BIB) artifact — that is an experience-type artifact that should never appear here.
- A plain software project re-run after the milestone loses its component API section in handoff.
- `design-manifest.json` has a `productType` field value of `"business"` — this is the wrong model. Business mode is a boolean flag, not a type.
- `grep -rn "business" workflows/` returns hits that replace rather than augment software/hardware/hybrid sections.

**Phase to address:**
Phase 1 (detection architecture). The data model decision — composite flag pair vs. merged enum — must be made before a single workflow file is touched. Retrofitting from merged enum to composite flags after 10 workflows are written is a full rewrite.

---

### Pitfall 2: LLM-Generated Financial Projections Are Legally and Operationally Dangerous Without Hard Guardrails

**What goes wrong:**
The launch kit includes financial projections (runway estimates, TAM sizing, unit economics, pricing tier recommendations). LLMs generate plausible-looking financial artifacts with confidence. In a 2025 benchmark study, hallucination rates across LLMs exceeded 15% in financial contexts — and the problem is not random errors but systematically confident wrong numbers. A solo founder who takes the LLM's "18-month runway at $15k/month burn" and presents it to investors or uses it for hiring decisions has been actively harmed by PDE. Liability attaches to the platform that produced the artifact, not just the model. Legal analysis from 2025 confirms that disclaimers rarely eliminate liability when a user reasonably relies on AI-generated financial content.

**Why it happens:**
LLMs are trained on startup playbook content, VC pitch decks, and business school material. They pattern-match convincingly to realistic numbers without any grounding in the user's actual cost structure, market, or geography. The model does not know the user's COGS, headcount, or sales cycle. It fills those gaps with "typical" values from training data, which may be years stale and market-specific to US SaaS 2021-2023 conditions.

**How to avoid:**
- Financial projections must be framed as templates with explicit input slots, not filled-in numbers. Output structure: `[YOUR_MONTHLY_BURN]`, `[YOUR_ARR_GOAL]`, `[YOUR_CUSTOMER_ACQ_COST]`. The model populates structure and formula, never values.
- Every financial artifact section must carry a mandatory inline disclaimer (not just in a footer): `REQUIRES HUMAN INPUT: Values above are structural placeholders. Do not present to investors or use for financial planning without replacing all bracketed fields with verified actuals.`
- TAM/SAM/SOM sizing must cite the user's stated market (from brief), never invent market sizes from training data. If no market data is in the brief, the output must be: `[TAM: Source and size required — PDE cannot estimate this for your market]`.
- Add a `financial_projections_reviewed` boolean field to `design-manifest.json`, defaulting to `false`. Include this in the readiness gate check — a launch kit with `financial_projections_reviewed: false` produces a CONCERNS-level readiness flag, not a PASS.
- Reference the existing `experience-disclaimer.md` pattern from v0.11. Create a parallel `business-financial-disclaimer.md` reference block loaded into all financial artifact sections via `@references/` injection.

**Warning signs:**
- Financial projection output contains actual dollar amounts (e.g., "$180,000 annual runway") rather than structural placeholders.
- TAM section states a specific market size (e.g., "$4.2B addressable market") without citing a user-provided source.
- The investor outreach sequence contains specific investor names or firm names — these are hallucinated.
- The launch kit passes readiness gate with no financial review flag present.

**Phase to address:**
Phase 2 (business brief extensions). Financial content guardrails must be defined in the brief workflow before the launch kit phase authors any financial templates. If Phase 2 does not establish the placeholder-only pattern, every subsequent phase that touches financial content will need retrofitting.

---

### Pitfall 3: Deployment Scaffolding With Real Infrastructure Code Creates Irreversible Side Effects Without Approval Gates

**What goes wrong:**
PDE will generate and potentially deploy: Next.js landing page code, Stripe pricing configuration, and Resend email templates. Unlike design artifacts (which are markdown/JSON files in `.planning/`), these are executable artifacts with real-world effects. A Stripe pricing config written with live keys instead of test keys results in real charges. A Resend template deployed to a production domain sends real emails. A Next.js deployment to Vercel creates a public URL immediately. The requirement states "mandatory human review before any deployment stage" but that gate is only effective if it is structurally enforced — not just mentioned in workflow prose.

**Why it happens:**
PDE's existing write-back confirmation gates (established in v0.5, VAL-03) apply to external tool writes via MCP. Deployment scaffolding is different: PDE generates local code files, and the human is expected to run deployment commands. The gap is that PDE cannot distinguish between "here is scaffolding code for you to review" and "here is code ready to deploy." Without an explicit artifact-state model for deployment artifacts, a user who is in flow may run the deployment command immediately without triggering the intended review step.

**How to avoid:**
- Every deployment artifact (Next.js files, Stripe config, Resend templates) must be written to a staging directory (`.planning/deploy-staging/`) not to project root or src/. The workflow must explicitly instruct: "Do not move files from `.planning/deploy-staging/` to your project directory until you have reviewed them."
- Create a `deploy-manifest.json` in `.planning/deploy-staging/` with `review_required: true`, `stripe_mode: "test"` (default), and a checklist of required human steps before deployment. PDE never sets `stripe_mode: "live"` — that requires explicit human modification.
- Stripe config generation must default to test mode keys with placeholder values (`pk_test_REPLACE_WITH_YOUR_KEY`, `sk_test_REPLACE_WITH_YOUR_KEY`). Comment in the config file: `# DO NOT REPLACE WITH LIVE KEYS UNTIL YOU HAVE TESTED IN TEST MODE`.
- The deployment phase workflow must present a blocking approval prompt (using existing `[HUMAN APPROVAL REQUIRED]` pattern from v0.5) that lists all files in `.planning/deploy-staging/` and requires explicit acknowledgment before proceeding.
- Leverage the existing readiness gate pattern: a `deploy_staging_reviewed` flag in design-manifest must be `true` before any deployment instruction is given.
- Vercel deployment commands in workflow prose must be in a clearly marked `## Deploy (Human Action Required)` section with no automation — these are instructions for the human, not commands PDE executes.

**Warning signs:**
- Workflow prose says "run `vercel deploy`" without first presenting a review checklist.
- Stripe config files appear in project root or `src/` rather than `.planning/deploy-staging/`.
- Stripe config file contains environment variable references (`process.env.STRIPE_SECRET_KEY`) without a corresponding note that the key must be in test mode during initial setup.
- Deploy workflow does not check for `deploy_staging_reviewed` flag before proceeding.

**Phase to address:**
Phase 5 or 6 (deployment scaffolding). The deploy-staging directory pattern and manifest structure must be established in the earliest deployment phase. The pattern is non-negotiable: no deployment artifact ever leaves `.planning/deploy-staging/` without an explicit human action.

---

### Pitfall 4: Three User Tracks Create Artifact Divergence That Breaks Downstream Phases Expecting a Single Input Format

**What goes wrong:**
The three user tracks (solo founder, startup team, product leader) produce artifacts with different depth, vocabulary, and format. A solo founder business brief is terse with minimal sections; a product leader brief has stakeholder alignment matrices and executive summary sections. Every downstream phase (competitive landscape, opportunity scoring, flows, wireframes, handoff) must read from the brief. If track branching is applied inconsistently — present in brief.md but absent in competitive.md — a product leader brief will feed into a solo-founder-depth competitive analysis, producing an artifact that is incoherent for its intended audience.

**Why it happens:**
Track branching is easy to implement in brief.md (the generation point) and easy to forget in competitive.md, opportunity.md, flows.md (the consumption points). The v0.11 experience type had the same surface area problem (14 workflow files), but experience artifacts were additive sections. User-track branching changes the depth and vocabulary of existing sections — a subtler and harder-to-detect inconsistency.

**How to avoid:**
- Store `user_track` in `design-manifest.json` alongside `product_type` and `business_mode`. Every downstream workflow that reads the manifest must read all three fields.
- Define track expectations explicitly before implementing: solo founder = 1-2 page artifacts, startup team = 3-5 page artifacts with team roles sections, product leader = 5-8 page artifacts with organizational framing. These are structural constraints, not style preferences.
- In each workflow, track branching must affect vocabulary AND depth: not just word choice but section count. A solo founder competitive analysis has 3 competitors, 2 paragraphs each. A product leader competitive analysis has 8 competitors with scoring matrices. These are not the same artifact with different words.
- Write Nyquist assertions for artifact length ranges per track: a solo founder brief must be under X lines, a product leader brief must be over Y lines. Catch mismatches at test time, not demo time.
- Add `user_track` to the DESIGN-STATE.md Quick Reference row alongside Product Type. If it's not visible in DESIGN-STATE, downstream phases will miss it.

**Warning signs:**
- A product leader brief run through competitive.md produces a 2-paragraph per competitor output identical to solo founder depth.
- A solo founder brief produces a competitive analysis with stakeholder impact matrices — sections that are irrelevant and confusing for a solo operator.
- `user_track` is present in `design-manifest.json` but absent from the DESIGN-STATE.md Quick Reference section.
- Running `grep -rn "user_track" workflows/` returns fewer hits than `grep -rn "business_mode" workflows/` — consumption is incomplete.

**Phase to address:**
Phase 1 (business brief extensions and detection). `user_track` must be read from brief and stored in manifest before any downstream phase author writes their workflow. Otherwise, each downstream phase author will invent their own interpretation of "solo founder depth" inconsistently.

---

### Pitfall 5: Investor Outreach and Legal Considerations Sections Expose PDE to Impersonation and Advice-of-Counsel Risk

**What goes wrong:**
The launch kit includes an "investor outreach sequence" and "legal considerations." LLMs will generate named investor firms ("Andreessen Horowitz typically invests at $2M minimum"), specific legal structures ("Delaware C-Corp is required for institutional investors"), and regulatory requirements that may be jurisdiction-specific or simply wrong. A user who relies on named investor targeting based on LLM-generated outreach has been misinformed. A user who relies on legal structure recommendations without consulting a lawyer has taken on legal risk, potentially choosing a structure incompatible with their tax situation, jurisdiction, or co-founder agreement.

**Why it happens:**
LLMs are trained on startup playbook content that discusses specific investors and legal structures confidently. The model cannot know the user's jurisdiction, tax situation, or investor relationships. It fills in "standard" advice that may be correct for a US SaaS startup in 2021 and completely wrong for a UK-based hardware company in 2026.

**How to avoid:**
- Investor outreach section must be a template with structural guidance (email length, cadence, personalization approach) but never specific firm names or partner names. If the model generates firm names, the workflow prompt must explicitly prohibit it: "Do not name specific investor firms or partners. Provide structural guidance only."
- Legal considerations section must carry a mandatory section header: `## Legal Considerations (Structural Guidance Only — Not Legal Advice)` with a required first paragraph: `The following reflects general patterns observed in startup formation. It is not legal advice. Consult a qualified attorney in your jurisdiction before making entity structure, equity, or intellectual property decisions.`
- Create `business-legal-disclaimer.md` in references/, parallel to `experience-disclaimer.md`, loaded via `@references/` injection. This is a single-source-of-truth disclaimer that cannot be accidentally omitted.
- The prompt for investor outreach must include: "Do not suggest specific investors, firms, check sizes, or thesis statements. You do not have current information about investor portfolio or appetite. Provide structural guidance on outreach format and sequencing only."
- Add a `legal_sections_reviewed` flag to deploy-manifest.json alongside `financial_projections_reviewed`. Both must be `true` before the launch kit is marked complete.

**Warning signs:**
- Investor outreach section contains firm names like "Y Combinator", "a16z", or specific partner names.
- Legal considerations section recommends a specific entity structure ("You should form a Delaware C-Corp") without the mandatory jurisdiction disclaimer.
- `business-legal-disclaimer.md` does not exist in references/ — the disclaimer is embedded only in workflow prose and will drift.
- Legal section heading does not include "(Structural Guidance Only — Not Legal Advice)".

**Phase to address:**
Phase 3 or 4 (launch kit authoring). Before writing any launch kit workflow, establish the reference disclaimer files. The pattern is identical to v0.11 `experience-disclaimer.md` — do not reinvent it.

---

### Pitfall 6: Business Overlays Applied to Existing Pipeline Stages Cause designCoverage Flag Clobber

**What goes wrong:**
v0.11 shipped with a hard-won fix for the 16-field `designCoverage` read-merge-write pattern after discovering that 10 workflows were clobbering flags set by earlier phases. The `business:` dimension adds new coverage fields (`hasBusinessThesis`, `hasPricingConfig`, `hasLaunchKit`, `hasDeployStaging`) that downstream phases must preserve. If any workflow reads `designCoverage`, writes its own fields, and uses a partial write pattern, it will zero out adjacent fields set by business-mode phases. This regression is invisible until a full pipeline run is attempted.

**Why it happens:**
The pass-through-all pattern (read all 16 fields, set only your own, write all 16 back) was established after the v0.11 regression — it is not the natural coding pattern. A developer writing a new workflow from scratch will naturally write only the fields they know about. If the `designCoverage` template in templates/ is not updated to include the new business fields before Phase 1 development begins, every Phase 1 workflow will be written against an incomplete template.

**How to avoid:**
- Before any v0.12 workflow is authored, update `design-manifest.json` template's `designCoverage` object to include all new business-mode fields with `false` defaults. This is the sentinel — if the template has 16 fields, the update is incomplete for v0.12.
- Document the exact count of `designCoverage` fields after adding business fields. Write it in the workflow template header comment: `# designCoverage has N fields — read all N, set only yours, write all N back.`
- Add Nyquist regression assertions: after a full pipeline run on a business:software project, all 16 original fields retain their pre-business values AND all new business fields are set. Specifically test that `hasHandoff: true` (set by handoff.md) is not clobbered by a business-phase workflow that runs after handoff in the pipeline.
- The business pipeline phases that adapt existing stages (brief → business thesis, competitive → market landscape) must not modify existing stage coverage flags. They augment the artifact but use their own coverage flags.

**Warning signs:**
- After a full business:software pipeline run, `hasHandoff` in `design-manifest.json` is `false` when it should be `true`.
- `design-manifest.json` template in templates/ has exactly 16 coverage fields after milestone begins — it was not updated to include business fields.
- A workflow file's designCoverage write block does not include all N coverage fields — it writes a subset.
- Running a software project through the updated pipeline produces a manifest with `hasBusinessThesis: false` even though the business brief phase ran.

**Phase to address:**
Phase 1 (manifest schema update). The designCoverage schema must be extended before any workflow is authored. Identical to the v0.11 discipline of "branch stubs before content."

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Encode business mode in productType enum ("business:software") | Simpler detection, single field to read | Every existing branch site breaks because they compare against "software" not "business:software"; N regressions at once | Never — composite flag is mandatory |
| Hardcode user track defaults ("solo founder") for non-business projects | Simplifies conditional logic | Non-business projects silently acquire track vocabulary in their artifacts; regression surfaces only in full pipeline run | Never — `user_track` must be null for non-business projects |
| Write financial projections with realistic numbers "as examples" | Output feels more complete and useful | Users treat examples as recommendations; legal risk if user relies on hallucinated numbers | Never — structural placeholders only |
| Put deploy-staging files directly in project src/ for convenience | One fewer directory for user to manage | Real code next to design artifacts with no review gate; high risk of accidental deployment | Never — staging isolation is the safety mechanism |
| Reuse experience-disclaimer.md for all business disclaimers | Fewer reference files to maintain | Disclaimer text is wrong for financial/legal context; mixing event safety and financial advice disclaimers is confusing | Never — create separate business-financial-disclaimer.md and business-legal-disclaimer.md |
| Skip user_track in workflows that "don't seem relevant" | Faster implementation | Track consistency breaks; product leader runs through a solo-founder-depth wireframe phase | Never — all 14 workflows must read user_track when business_mode is true |

---

## Integration Gotchas

Common mistakes when connecting to external services in the business product type context.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe | Generating config with live key placeholders or references to `STRIPE_SECRET_KEY` without test-mode-first instruction | Config must default to test mode with `pk_test_REPLACE_WITH_YOUR_KEY` and include a comment block requiring test-mode validation before any live key substitution |
| Vercel | Treating deployment as a PDE-automated step | All Vercel deployment commands go in a `## Deploy (Human Action Required)` section with no automation; PDE generates the `vercel.json` config, not the deployment |
| Resend | Generating templates that assume production domain domain verification is complete | Templates must include setup checklist: domain verification, DKIM configuration, test send to verified address before production use |
| Stripe Webhooks | Generating webhook handler code without signature verification | Every webhook handler scaffold must include `stripe.webhooks.constructEvent()` signature verification — raw `req.body` processing is a security vulnerability |
| Vercel Environment Variables | Writing environment variable names in code without a `.env.example` file | Every deployment scaffold must include `.env.example` with all required variables and safe placeholder values |

---

## Performance Traps

Patterns that work at small scale but fail as the business feature set grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Embedding user_track branching in workflow prose as if/else narrative | Works for 3 tracks, readable | Adding a 4th track requires editing every workflow; no structural enforcement | Immediately on any track addition |
| Storing business artifacts in .planning/design/ alongside design artifacts | No structural separation, easy to find | Business artifacts (pitch decks, investor sequences) mixed with wireframes and tokens; no clear handoff boundary | When a user exports or shares design artifacts and accidentally includes business-sensitive content |
| Generating investor outreach as a single monolithic document | Simple to produce | Cannot update cadence or individual emails independently; user must edit entire document for minor changes | When user needs to track outreach state — the document doesn't support it |
| Financial projections in prose format | Easier to generate than structured format | Cannot feed into spreadsheet tools; user must manually extract numbers | First time user opens the projection in a spreadsheet |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Stripe secret key referenced in frontend Next.js code | Live key exposed in browser, enables unauthorized charges against user's Stripe account | All Stripe secret key references must be in server-side files only (API routes, server components); PDE scaffold must include a comment flagging any secret key reference in a client-side file |
| Investor outreach sequence stored in .planning/ without gitignore entry | Sensitive business strategy committed to public repo | business-specific `.planning/business/` subdirectory with a `.gitignore` entry generated in Phase 1 |
| Financial projections with actual numbers committed to public repo | Competitive intelligence and fundraising strategy exposed | business-legal-disclaimer.md must note that `.planning/business/` should not be committed to public repositories |
| Resend API key in generated code | Email sending capability exposed | Same server-side only rule as Stripe; PDE scaffold must never put API keys in client components |
| Deploy staging files committed before review | Incomplete or insecure code deployed | `.planning/deploy-staging/` must have a `.gitignore` entry by default; only user explicitly removes it when ready |

---

## UX Pitfalls

Common user experience mistakes specific to the business product type dimension.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Presenting all three user tracks as a menu choice at pipeline start | User doesn't know which track to choose; paralysis or wrong choice | Auto-detect track from brief signals: solo operator + no team mentions = solo founder; team size mentioned = startup team; existing product + revenue mentioned = product leader. Confirm with one-line prompt, not a menu |
| Generating a complete launch kit in one phase without intermediate review gates | User overwhelmed by volume; no natural checkpoint to course-correct | Phase the launch kit: business thesis first, then pricing config, then outreach sequence. Each phase ends with a review checkpoint before proceeding |
| Using the same vocabulary ("your team", "your stakeholders") across all user tracks | Solo founders feel the tool isn't for them | Solo founder track uses "you" exclusively. Startup team track uses "your team". Product leader track uses "your organization" and "your stakeholders" |
| Outputting pitch deck content as a slide-by-slide prose list | Users cannot use it directly; must manually create slides | Output as slide titles with bullet points in a format that maps directly to presentation tools; include explicit slide count recommendation per investor type |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces in the business product type implementation.

- [ ] **Business mode detection:** Often missing `user_track` storage in manifest — verify manifest has `business_mode`, `user_track`, and all new coverage fields after Phase 1
- [ ] **Financial projections:** Often appears complete when it contains filled-in numbers — verify all financial artifact sections use structural placeholders, not values
- [ ] **Deploy staging isolation:** Often looks correct when staging files are in the right directory — verify `.planning/deploy-staging/` has a `.gitignore` entry and `deploy-manifest.json` has `review_required: true`
- [ ] **Legal disclaimer injection:** Often missing from investor outreach section even when present in financial projections — verify `business-legal-disclaimer.md` is loaded via `@references/` in every applicable section, not copy-pasted
- [ ] **Regression test coverage:** Often looks complete when all new workflows pass — verify existing software/hardware/hybrid projects produce byte-identical manifests to pre-v0.12 baseline
- [ ] **User track consistency:** Often complete in brief.md but missing in competitive.md or opportunity.md — verify `grep -rn "user_track" workflows/` returns a hit in every workflow that has business_mode branching
- [ ] **Stripe webhook security:** Generated webhook handler often missing signature verification — verify `stripe.webhooks.constructEvent()` is present in every generated handler scaffold
- [ ] **designCoverage field count:** Often set with only new business fields — verify that each workflow's designCoverage write block contains all original 16 fields plus all new business fields
- [ ] **Non-business project regression:** Often not tested after business features ship — run a full software pipeline run after v0.12 milestone and verify DESIGN-STATE.md contains no business-mode fields for a non-business project

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Orthogonal dimension encoded as enum (wrong model) | HIGH | Audit all 14 workflows for `productType === "business"` patterns; replace with composite flag reads; update manifest schema; re-run all regression tests |
| Financial artifact contains hallucinated numbers | LOW (pre-ship) / HIGH (post-ship) | Add placeholder enforcement to workflow prompt; add Nyquist assertion for absence of dollar amounts in financial sections; if post-ship, add immediate errata notice to all generated launch kits |
| Live Stripe keys in generated scaffolding | HIGH | Immediate: add `.gitignore` entry for deploy-staging; audit all generated configs for live key references; rotate any exposed keys; add test-mode enforcement to workflow prompt |
| designCoverage clobber discovered in full pipeline run | MEDIUM | Identify which workflow is the clobber source via manifest field-by-field diff before/after each phase; apply read-merge-write fix to offending workflow; add Nyquist assertion for full pipeline field preservation |
| User track branching inconsistent across workflows | MEDIUM | Run pipeline for all three tracks, diff artifact depths; identify workflows with missing track branching; retrofit; add Nyquist assertions for artifact length ranges per track |
| Investor firm names in outreach sequence | LOW | Add explicit prohibition to workflow prompt; search existing generated artifacts for known firm names and redact; add Nyquist assertion for absence of known firm names |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Orthogonal dimension model (composite flag vs enum) | Phase 1 (detection + manifest schema) | Nyquist: business:software project produces software artifacts AND business artifacts, not one or the other |
| Financial projection hallucination | Phase 2 (business brief) + financial template authoring phase | Nyquist: no dollar amounts in financial artifact sections; all values are structural placeholders |
| Deployment artifact review gate bypass | Earliest deployment scaffolding phase | Nyquist: deploy-staging/ contains deploy-manifest.json with review_required: true; no Stripe config outside deploy-staging/ |
| User track branching inconsistency | Phase 1 (track detection) + verified in each downstream phase | Nyquist: grep count of user_track hits matches expected workflow count; artifact line count varies by track |
| Investor firm name hallucination | Launch kit authoring phase | Nyquist: investor section contains no known firm names from a fixed blocklist |
| Legal disclaimer omission | Phase 2 (reference file creation) | Nyquist: business-legal-disclaimer.md and business-financial-disclaimer.md exist in references/ before any launch kit workflow is authored |
| designCoverage clobber | Phase 1 (manifest template update) | Nyquist: full pipeline run on business:software project preserves all 16 original coverage fields |
| Stripe live key in scaffold | Deployment scaffolding phase | Nyquist: no file in deploy-staging/ contains "sk_live_" or "rk_live_" string literals |
| Regression on existing product types | Final validation phase | Nyquist: existing software/hardware/hybrid test fixtures produce identical manifests before and after v0.12 |

---

## Sources

- Codebase inspection: v0.11 experience type implementation patterns (branch site audit, designCoverage clobber post-mortem, regulatory disclaimer reference file architecture) — HIGH confidence
- [LLM Hallucinations: What Are the Implications for Financial Institutions? | BizTech Magazine](https://biztechmagazine.com/article/2025/08/llm-hallucinations-what-are-implications-financial-institutions) — MEDIUM confidence
- [AI Hallucination Liability: Legal Exposure For Startups In 2025](https://techandmedialaw.com/ai-hallucination-liability/) — MEDIUM confidence
- [AI Contracts: Waivers and Limitations of Liability | DR&A Law Firm](https://danielrosslawfirm.com/2025/07/28/ai-and-contracts-why-you-need-waiver-and-limitation-of-liability-provisions-for-ai-tools/) — MEDIUM confidence
- [Common Mistakes Developers Make When Using Stripe Payment Processing | Moldstud](https://moldstud.com/articles/p-common-mistakes-developers-make-when-using-stripe-payment-processing-avoid-these-pitfalls) — MEDIUM confidence
- [Avoiding test mode tangles with Stripe Sandboxes | Stripe Dev Blog](https://stripe.dev/blog/avoiding-test-mode-tangles-with-stripe-sandboxes) — HIGH confidence (official source)
- [API keys | Stripe Documentation](https://docs.stripe.com/keys) — HIGH confidence (official source)
- [AI Agents on Vercel | Vercel Knowledge Base](https://vercel.com/kb/guide/ai-agents) — MEDIUM confidence
- [Resend Review 2025 | Toksta](https://www.toksta.com/products/resend) — LOW confidence (community review)
- [Hidden Dangers of AI Hallucinations in Financial Services | Baytech Consulting](https://www.baytechconsulting.com/blog/hidden-dangers-of-ai-hallucinations-in-financial-services) — MEDIUM confidence
- v0.11 KEY DECISIONS table: experience sub-types, designCoverage 16-field schema, cross-phase wiring fix, regulatory disclaimer reference block pattern — HIGH confidence (direct project history)

---
*Pitfalls research for: PDE v0.12 Business Product Type orthogonal dimension*
*Researched: 2026-03-22*
