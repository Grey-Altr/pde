# Pitfalls Research

**Domain:** Adding automated validation, dependency verification, and quality gates to an existing AI-assisted development pipeline (PDE v0.7)
**Researched:** 2026-03-19
**Confidence:** HIGH (grounded in PDE codebase history across 6 milestones, PDE RETROSPECTIVE.md lessons, first-principles analysis of AI pipeline validation failure modes, and verified patterns from current research)

---

## Critical Pitfalls

### Pitfall 1: Validation That Claims Too Much — Treating "File Exists" as "Claim Verified"

**What goes wrong:**
The research validation agent extracts claims from research files (e.g., "mcp-bridge.cjs has 36 TOOL_MAP entries") and verifies them by checking whether a file named `mcp-bridge.cjs` exists. The file exists. The claim is marked VERIFIED. But the actual TOOL_MAP count is 34 because two entries were removed in a patch. The validator reported confidence it did not earn.

This failure is insidious because it produces a green status that downstream phases trust. Plans built on "verified research" then execute against a codebase state the research never actually confirmed.

**Why it happens:**
Claim verification is easier to implement at the file-existence level than at the content-inspection level. A validator that opens files, parses content, and checks specific values requires more engineering. Cutting to "file exists + keyword present" feels like 80% of the value for 20% of the effort. In practice, it is 5% of the value for 20% of the effort — because the claims that cause planning failures are always the specific-count, specific-interface, specific-behavior claims, not the "does this file exist" claims.

**How to avoid:**
Define claim tiers upfront before implementing the validator. Tier 1: structural claims (file exists, directory exists, command is registered) — verify with Glob/file check. Tier 2: content claims (function X has N parameters, TOOL_MAP has N entries, APPROVED_SERVERS contains Y) — verify with Grep/Read. Tier 3: behavioral claims (command X produces output Y) — mark as UNVERIFIABLE by static analysis, flag for manual verification. Never upgrade a Tier 1 check to satisfy a Tier 2 claim.

**Warning signs:**
- Validator code uses only `Glob` or `ls` without any `Grep` or `Read` calls
- Research claims with specific numbers (counts, versions, parameter names) all show as VERIFIED with zero content inspection
- Validation runs complete in under 2 seconds (not enough time to read files)
- The validator's confidence score is uniformly HIGH across claims of wildly different specificity

**Phase to address:** Research Validation Agent design phase — the claim tier taxonomy must be defined before the validator is implemented. An acceptance criterion should require at least one Tier 2 (content-inspection) verification to be demonstrated before the phase is marked done.

---

### Pitfall 2: Validation That Claims Too Little — Blocking Plans on Unverifiable Assertions

**What goes wrong:**
The research validation agent is calibrated conservatively: any claim it cannot definitively verify in the codebase is flagged as UNVERIFIED and blocks plan execution. Research file says "PDE supports graceful degradation for missing MCP connections." The validator cannot find a function named `graceful_degradation` — it flags the claim as unverified. The readiness gate sees an UNVERIFIED claim and blocks the execute phase. The claim was correct — it was describing a behavioral pattern visible across five workflow files, not a single function. Development stops. The developer must manually override the gate to proceed.

This failure mode destroys trust faster than a missing validation entirely. Developers learn that the validation system produces false alarms and start bypassing it. Once bypassed, the gate offers no protection.

**Why it happens:**
Conservative validation feels like good engineering. The reasoning goes: "Better to block on an unverifiable claim than to let a wrong plan execute." This logic is sound for security-critical systems, but wrong for an AI development pipeline where most research claims are directionally correct even if not byte-perfectly verifiable. A system that blocks 30% of valid plans trains developers to ignore it.

**How to avoid:**
Design the validator with an explicit UNVERIFIABLE status that is not a blocker. Claims marked UNVERIFIABLE are surfaced as advisory notes — the readiness gate shows them as CONCERNS (not FAIL) and proceeds. Only claims marked CONTRADICTED (where the validator found evidence that directly opposes the claim) should produce a FAIL status. The three-status model (VERIFIED / UNVERIFIABLE / CONTRADICTED) is far more useful than binary (VERIFIED / UNVERIFIED). PDE's existing readiness gate already uses PASS/CONCERNS/FAIL — map to that model, not a stricter one.

**Warning signs:**
- Validator uses a binary VERIFIED/UNVERIFIED output with no UNVERIFIABLE middle state
- The readiness gate treats UNVERIFIABLE the same as CONTRADICTED
- Developers are manually overriding the readiness gate more than once per milestone
- Research files that were accurate in prior milestones start being flagged as invalid

**Phase to address:** Research Validation Agent design phase — the three-status model (VERIFIED/UNVERIFIABLE/CONTRADICTED) must be defined in the agent's return format specification, not added as a patch after implementation.

---

### Pitfall 3: Dependency Verification That Checks Static Declarations, Not Runtime Paths

**What goes wrong:**
The cross-phase dependency checker reads `CONTEXT.md` files looking for declared dependencies (e.g., "Phase 3 depends on Phase 2 completing"). It finds the declaration, checks that Phase 2 is marked complete in the roadmap, and reports the dependency as satisfied. But the actual runtime dependency is that Phase 2's `pde-tools.cjs` enhancement must export a new `readiness()` function that Phase 3's workflow calls. Phase 2 was completed but the `readiness()` function was scoped out and not implemented. The dependency checker sees COMPLETE status — it does not read Phase 2's actual deliverables against Phase 3's actual consumption.

Plans execute with a missing function. The failure surfaces three phases later with an obscure runtime error.

**Why it happens:**
Phase completion status is easy to check (it's a field in CONTEXT.md or STATE.md). Interface-level dependencies require reading what each phase produces and what each phase consumes — a cross-reference problem that requires understanding the codebase's actual data flow. Teams default to the easy check and call it dependency verification.

**How to avoid:**
Define dependency checks at two levels and implement both. Level 1 (structural): Is the upstream phase marked complete? Does the expected output file exist? Level 2 (interface): Does the upstream phase's output contain the specific function/field/export that the downstream phase requires? Level 2 checks require the dependency specification to include interface contracts, not just "depends on Phase N." For PDE, this means plan templates should include an `interface_required` field listing specific exports or file shapes each plan needs from its upstreams.

**Warning signs:**
- Dependency check reports only pass/fail with no interface-level detail
- The check passes for a phase whose upstream deliverable file exists but is a stub
- No plan template includes an explicit interface contract section
- Runtime failures in execute phases are caused by missing function signatures that dependency checking should have caught

**Phase to address:** Cross-phase dependency verification design phase — the interface contract schema must be defined before the checker is built. Without contracts to check against, the checker can only verify status fields, which is insufficient.

---

### Pitfall 4: Edge Case Analysis That Generates Noise Instead of Signal

**What goes wrong:**
The plan edge case analysis agent reads a plan and generates a list of edge cases to consider. It produces 23 items: "What if the file is empty?", "What if the user cancels mid-execution?", "What if the network is unavailable?", "What if there are special characters in the filename?", etc. These are generically valid edge cases for any software system. The developer reviews the list, finds 18 of 23 are inapplicable to this specific plan (it reads a manifest file that PDE writes — it will never be empty; it runs offline — network unavailability is irrelevant), and dismisses the entire list including the 5 that were genuinely important.

Alert fatigue from low-signal noise causes real issues to be missed at the same rate as no analysis at all.

**Why it happens:**
Edge case generation via LLM is easy to make comprehensive (broad, generic coverage) and hard to make precise (high-relevance, context-specific coverage). Generic edge cases feel thorough. Without a filtering mechanism tied to the plan's actual domain and constraints, the output is a long list of generically true statements rather than a curated list of plan-specific risks.

**How to avoid:**
Edge case analysis must be scoped to the plan's domain before generation. The agent should first extract: (1) what external systems does this plan touch, (2) what state does this plan read and write, (3) what are the defined error cases in the codebase for similar operations. Only then generate edge cases. Additionally, implement a relevance filter: any edge case that is not connected to one of the plan's explicit file targets, function calls, or state transitions should be excluded. Target 5-8 high-relevance edge cases, not 20+ generic ones. Quality over quantity is the design principle.

**Warning signs:**
- Edge case lists contain more than 10 items per plan
- Items on the list are not referenced to specific parts of the plan (no file path, no function name, no state field)
- The same edge cases appear verbatim across multiple unrelated plans
- Developer inspection rate of edge case lists drops below 50% after the first two uses

**Phase to address:** Plan edge case analysis design phase — the relevance filtering criteria must be part of the agent's process steps, not an afterthought. The acceptance criterion should require that each generated edge case references a specific element of the analyzed plan.

---

### Pitfall 5: Integration Verification That Can't Keep Up With Codebase Evolution

**What goes wrong:**
The integration point verifier is built to check that all exports in `mcp-bridge.cjs` are consumed by at least one workflow file. It passes on Day 1. By Day 30, six new workflow files have been added and two have been modified. The integration verifier has a hardcoded list of workflow files to check against (the 12 that existed when it was built). The two new orphan exports from last week's features do not appear in its scan because the new workflow files are not in its scope list. It reports clean. Nobody notices until a user's workflow silently calls a function that was removed.

Static verification tools that cannot self-update their scope become actively misleading over time.

**Why it happens:**
The first pass of integration verification is written against the known codebase at time of implementation. Scope enumeration (which files to check) is hardcoded because it is the easiest approach. As the codebase grows, the hardcoded scope silently drifts from reality. Nobody remembers to update the verifier's scope list because it keeps reporting green.

**How to avoid:**
Integration verification must use dynamic scope discovery, not hardcoded file lists. For PDE, this means the verifier discovers workflow files by globbing `workflows/**/*.md`, discovers command stubs by globbing `commands/**/*.md`, and discovers exports by reading actual module export statements — not by checking a list written at implementation time. The glob pattern is the scope definition. Any file added to the codebase is automatically included in subsequent verification runs. Additionally, the verifier should report its scope (N files checked) as part of its output — a sudden drop in scope count is an early warning of misconfiguration.

**Warning signs:**
- Verifier code contains hardcoded file path arrays instead of glob patterns
- The verifier's scope count never changes between runs despite codebase growth
- New workflow files were added without updating any verification configuration
- Integration check output does not report how many files were inspected

**Phase to address:** Integration point verification design phase — dynamic scope discovery via glob patterns must be a non-negotiable requirement. Any implementation using hardcoded paths should be rejected in code review.

---

### Pitfall 6: Tech Debt Closure That Accidentally Breaks Working Features

**What goes wrong:**
Tech debt item PLUG-01 says "end-to-end `claude plugin install` from GitHub not tested." The fix involves updating the plugin manifest, bumping dependency versions, and adding an install-test script. During the update, the engineer also "cleans up" the manifest format — removing fields that appear redundant. Three of the removed fields were being silently consumed by PDE's design pipeline coverage checks. The coverage checks fail. The pipeline is broken. The tech debt closure introduced a regression in a working feature because the impact of the "cleanup" was not verified before shipping.

Tech debt items are often in structural files (manifests, configuration, core utilities) that have more consumers than their authors realize.

**Why it happens:**
Tech debt closure has a psychological permission dynamic: "this was broken before, so I can change things freely." Developers treat tech debt items as invitations for broader cleanup, not surgical fixes. The broader the change, the higher the regression risk. Additionally, structural files like manifests and configuration objects are rarely covered by test assertions — the working features that depend on them are tested, but the specific fields they read are not.

**How to avoid:**
Treat each tech debt item as a surgical fix with a defined blast radius. Before touching any file, run grep to discover all consumers of that file. For configuration/manifest files, read every field and verify each field has a known consumer before removing it. The rule: "Only remove what you can prove has no consumer." For PLUG-01 specifically, the fix is adding an install test — nothing else in the manifest should change unless the install test proves it must. Scope the fix to the minimum change that closes the debt item.

**Warning signs:**
- Tech debt fix commits include changes to files not mentioned in the debt item description
- A tech debt closure is followed within 24 hours by a regression fix commit
- The "cleanup" description in a commit message covering a debt item
- No grep-based consumer audit was performed before modifying a shared configuration file

**Phase to address:** Tech debt closure phase (last planned phase) — each debt item should have a written blast-radius assessment before implementation begins. The assessment lists every file that reads or imports the file being changed.

---

### Pitfall 7: Research Validation Agent Develops Stale Codebase View

**What goes wrong:**
The research validation agent is spawned to verify claims and reads the codebase at spawn time. During a multi-phase milestone, it is invoked again in Phase 4 to re-validate updated research. But Phase 2 and Phase 3 have added new files and modified existing ones. The agent's Glob patterns cache their results during a session. The re-validation still sees the Phase 0 codebase state. It correctly verifies claims about new files added in Phase 2 if the session was started after Phase 2 completed — but if the session spans multiple phases (common in PDE's execution model), the cached file system state may lag.

More dangerously: a claim that was CONTRADICTED in Phase 0 (because a feature did not exist yet) may become valid in Phase 3, but if re-validation is not explicitly triggered, the CONTRADICTED status persists.

**Why it happens:**
Codebase verification assumes a point-in-time snapshot. Multi-phase development is a time-extended process. The gap between "when research was written" and "when the plan executes" is real, and the research validation agent must be designed with explicit re-validation points, not assumed to remain valid indefinitely.

**How to avoid:**
Research validation results must carry a `validated_at_phase` timestamp. Any plan that proceeds on research validated more than N phases earlier (suggest: 2) should re-trigger validation for claims that directly inform that plan's approach. The research validation agent's codebase snapshot is only valid for the phase in which it ran. Implement this as a staleness check: if `validated_at_phase` + 2 < current_phase, mark the research as STALE and require re-validation before the readiness gate will PASS.

**Warning signs:**
- Research validation results have no timestamp or phase reference
- The same validation output is cited across plans in different phases without re-running
- A plan executes against a claim about a file's content that was modified two phases earlier
- The readiness gate accepts validation results from a different milestone's research phase

**Phase to address:** Research validation agent design — the `validated_at_phase` field must be part of the agent's output schema from the start. Adding it retroactively requires updating all downstream consumers of validation output.

---

### Pitfall 8: Dependency Verification Causes Pipeline Slowdown That Gets Disabled

**What goes wrong:**
The cross-phase dependency checker is correct but slow. It reads every plan file in the milestone, extracts interface contracts, and performs cross-reference checks. On a milestone with 20 plans across 8 phases, this takes 45 seconds. Developers in yolo mode start skipping it. By the third milestone, the check is commented out of the readiness gate because "it always passes anyway and takes too long." The verification that was correct and useful is now disabled — and it was disabled precisely because it was too slow, not because it was wrong.

Slow gates get disabled. Disabled gates provide no protection.

**Why it happens:**
Correctness is optimized before performance. The check is implemented to be thorough (reads all plans) rather than fast (reads only the current phase's dependency surface). As milestones grow, the all-plans approach scales linearly. At 20 plans it is annoying; at 50 plans it is intolerable. By the time the performance problem is obvious, the check has already been disabled.

**How to avoid:**
Design dependency checks to be incremental from the first implementation. The check should scope to: (1) plans in the current phase being verified, (2) plans in the direct upstream phase. It does not need to re-verify all prior phases every time — those were verified when they ran. PDE's existing readiness gate model (`/pde:check-readiness`) already runs just before execute — scope the dependency check to that moment's relevant surface, not the full milestone history.

**Warning signs:**
- Dependency check runtime grows with milestone phase count (not constant or near-constant)
- Developers are skipping `/pde:check-readiness` in more than 20% of phases
- The check reads files from phases that were completed more than 3 phases earlier
- A comment like "# TODO: make this faster" exists in the dependency checker within a week of implementation

**Phase to address:** Cross-phase dependency verification design phase — performance requirements must be an acceptance criterion alongside correctness requirements. Maximum check runtime: 10 seconds regardless of milestone size.

---

### Pitfall 9: Integration Verifier Reports Orphan Exports That Are Intentionally Pre-Registered

**What goes wrong:**
PDE's `mcp-bridge.cjs` TOOL_MAP contains two entries that have no current consumers: `github:update-pr` and `github:search-issues`. These are intentionally pre-registered for future use (noted in PROJECT.md). The integration verifier correctly identifies them as "exported but unconsumed" and flags them as integration gaps. The developer sees two FAIL items in the verification report and spends 30 minutes investigating whether they are real problems before realizing they are known intentional pre-registrations. Next time, the developer ignores all integration verifier output to avoid the false alarm.

Pre-registered / intentional orphans are not bugs — treating them as bugs trains developers to ignore the verifier.

**Why it happens:**
Integration verification tools have no concept of "intentional orphan." A function that is exported but not currently consumed either (a) is dead code that should be removed, or (b) is a pre-registration for known future use. Without a way to express (b), the verifier cannot distinguish the two cases and flags everything in category (a).

**How to avoid:**
Implement an allowlist mechanism for intentional orphans. In PDE's case, a `# TOOL_MAP_PREREGISTERED` comment above a TOOL_MAP entry signals that the entry is intentional and should not be flagged. The integration verifier reads these annotations and excludes them from its orphan report. Any pre-registered entry that has been in the allowlist for more than one milestone without gaining a consumer triggers a review prompt — not a failure, but a "this has been orphaned for two milestones, confirm it is still intentional."

**Warning signs:**
- Integration verifier reports orphans that are listed in PROJECT.md or RETROSPECTIVE.md as known intentional pre-registrations
- The same orphan entries appear in every integration report without ever being resolved
- Developers are running `grep` to determine which entries were pre-registered versus accidentally orphaned
- False positive rate in integration reports exceeds 15%

**Phase to address:** Integration point verification design phase — the allowlist annotation format must be defined before the verifier is built. Retrofitting annotations after the verifier is built requires updating all pre-existing intentional orphans.

---

### Pitfall 10: Validation Agents That Modify State While Verifying It

**What goes wrong:**
The research validation agent is designed to be read-only — it reads research files and codebase files to verify claims. During implementation, a convenience shortcut is added: if the agent detects that a research file is outdated, it "helpfully" updates the file with corrected information. This seems beneficial — the research files stay accurate. But: the updated research files are now being modified by a subagent that was spawned by the readiness gate. The readiness gate's purpose is verification, not modification. If the validation agent modifies files, it has side effects on the state that the main workflow did not plan for. Subsequent agents read the modified files and behave differently. The source of the behavior change is invisible because the modification happened silently during what was labeled a "read-only" verification pass.

Verification agents with write side effects undermine the integrity of the verification process itself.

**Why it happens:**
The desire to "fix things while you're looking at them" is a natural engineering impulse. When a validation agent finds a stale claim, writing the correction in the same pass feels efficient. The hidden cost is that the line between verification and modification disappears. Verification loses its role as an independent check. Future debugging becomes harder because the "before" state is gone.

**How to avoid:**
Research validation agents must be strictly read-only. They may produce a report containing corrections, but they must never write corrections to files directly. If corrections are needed, the report should include a `corrections_needed` section that a human or a separate update pass can apply explicitly. This preserves the separation between "observe" and "change" that makes verification meaningful. In PDE's architecture, this aligns with the existing three-agent fleet pattern (auditor reads → improver proposes → validator accepts) — the validation agent is the auditor, and its role is read-only by design.

**Warning signs:**
- Validation agent code contains any `Write` or `Edit` tool calls
- Research files are being modified during a readiness gate run
- The git diff after a `/pde:check-readiness` run includes changes to `.planning/research/` files
- A validation report says "automatically corrected" rather than "correction needed"

**Phase to address:** Research validation agent implementation — enforce read-only as an architectural constraint, not a convention. The agent's `allowed_tools` should not include Write or Edit. This cannot be patched in after write behavior is established.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Verify claims at file-existence level only (Tier 1) | Faster to implement | Fails for content-level claims (counts, interfaces, signatures); validation confidence is overstated | Only for structural claims explicitly labeled as such |
| Hardcode file scope in integration verifier | Avoids glob implementation | Silently misses new files; reports green while orphans accumulate | Never — use glob patterns from day one |
| Binary VERIFIED/UNVERIFIED output (no UNVERIFIABLE state) | Simpler output schema | Blocks plans on unverifiable-but-correct claims; trains developers to bypass | Never — three-state model (VERIFIED/UNVERIFIABLE/CONTRADICTED) is the minimum viable design |
| Allow validation agents to self-correct files they find stale | Efficient — fix and verify in one pass | Destroys the independence of verification; introduces silent state mutations during read-only passes | Never — validation is always read-only; corrections require a separate explicit pass |
| Skip incremental scoping in dependency checker | Simpler first implementation | Scales poorly; gets disabled when slow; no protection after disabling | Acceptable only for a single-phase milestone prototype that will be refactored before shipping |
| Use CONTRADICTED status for pre-registered intentional orphans | No allowlist implementation needed | Trains developers to ignore all verifier output; false positives destroy trust | Never — allowlist annotations are required from the first implementation |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Research validation + readiness gate | Plugging validation output directly into FAIL status for all non-VERIFIED claims | Map VERIFIED→PASS, UNVERIFIABLE→CONCERNS, CONTRADICTED→FAIL; let the existing readiness gate handle severity |
| Dependency verification + story-file sharding | Checking dependencies only against monolithic PLAN.md; missing task-NNN.md shards | Dependency checker must glob both `*-PLAN.md` and `task-NNN.md` files; sharding is transparent to the checker |
| Integration verifier + TOOL_MAP pre-registrations | Flagging all unconsumed TOOL_MAP entries as orphan bugs | Read `# TOOL_MAP_PREREGISTERED` annotations before generating orphan report |
| Edge case analysis + AC-first planning | Generating edge cases before acceptance criteria are finalized | Edge case analysis runs after AC-N identifiers are assigned; references specific AC items |
| Tech debt closure + protected-files mechanism | Modifying core files without checking protected-files.json | Read protected-files.json before touching any file in references/, bin/, or core config |
| Validation agents + session-based execution model | Assuming validation results persist across Claude Code sessions | Each session spawns fresh agents with no memory of prior validation results; persist results to `.planning/research/` explicitly |
| Dependency checker + mcp-bridge.cjs TOOL_MAP | Checking workflow files for raw MCP tool names that TOOL_MAP is designed to abstract | Dependency checker must understand the TOOL_MAP indirection; check for canonical names (e.g., `github:create-pr`), not raw MCP tool names |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| All-phases dependency scan on every readiness check | Readiness gate takes 30+ seconds on mature milestones; developers skip it | Scope to current phase + 1 upstream phase; prior phases were already verified at their execution time | Any milestone with more than 5 phases |
| Edge case agent reading full PLAN.md + all referenced files per plan | Edge case analysis consumes 40%+ of context budget before generating output | Summarize plan to key elements (file targets, state transitions, external calls) before passing to edge case agent | Plans with more than 8 task steps or 3 external integrations |
| Research validation re-reading unchanged files | Validation takes longer than the work it validates | Cache file modification timestamps; skip unchanged files on re-validation runs | Any research re-validation run more than 1 phase after the initial run |
| Integration verifier scanning all 650+ files in the codebase | Verifier exceeds 60-second timeout; killed mid-scan; reports partial results | Scope to integration surface files only: mcp-bridge.cjs, TOOL_MAP entries, workflow files that call bridge.call() | Immediately — the full codebase is never the right scope |

---

## "Looks Done But Isn't" Checklist

- [ ] **Research validator claim tiers:** Validator distinguishes Tier 1 (structural), Tier 2 (content), and Tier 3 (behavioral) claims with different verification strategies — verify by reviewing claim processing logic for grep/read calls on Tier 2 claims
- [ ] **Three-state output model:** Validator returns VERIFIED, UNVERIFIABLE, or CONTRADICTED (never binary VERIFIED/UNVERIFIED) — verify by checking the output schema in the agent's return format section
- [ ] **Dependency checker interface contracts:** Plans include an `interface_required` field and dependency checker reads it — verify by checking a sample plan file for the field and the checker's parsing logic
- [ ] **Dynamic scope discovery:** Integration verifier uses glob patterns not hardcoded file lists — verify by adding a dummy workflow file and confirming it appears in the next verification scope count
- [ ] **Intentional orphan allowlist:** TOOL_MAP pre-registered entries are annotated and excluded from orphan reports — verify that `github:update-pr` and `github:search-issues` do not appear as orphan findings
- [ ] **Validation agents are read-only:** Research validation agent's `allowed_tools` list does not include Write or Edit — verify by reviewing the agent definition's allowed_tools before shipping
- [ ] **Staleness tracking:** Validation results include `validated_at_phase` and the readiness gate checks for staleness before accepting them — verify by simulating a 3-phase gap between validation and use
- [ ] **Tech debt blast radius documented:** Each of the 7 known debt items has a written consumer audit before its fix is implemented — verify by requiring a consumer-audit artifact as part of the debt closure task's acceptance criteria

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Validation over-claims (Tier 1 checks masquerading as Tier 2) | MEDIUM | Audit all claims in validation report against their verification method; re-implement Tier 2 checks as content-inspection; re-run full validation |
| Validation over-blocks (binary UNVERIFIED = FAIL) | LOW | Add UNVERIFIABLE state to output schema; update readiness gate mapping to treat UNVERIFIABLE as CONCERNS; re-run blocked plans |
| Dependency checker too slow, already disabled | HIGH | Rewrite with incremental scoping; re-enable as CONCERNS-level advisory before re-enabling as blocking gate; recover trust before recovering enforcement |
| Integration verifier missing new files (hardcoded scope) | MEDIUM | Replace hardcoded arrays with glob patterns; identify any orphans that were missed in the gap period; fix uncovered orphans |
| Validation agent wrote to research files silently | MEDIUM | Review git diff for unexpected modifications to `.planning/research/`; revert unintended mutations; restrict agent's allowed_tools to read-only; re-run validation |
| Tech debt closure broke a working feature | MEDIUM | Revert the closure commit; perform consumer audit; re-implement with surgical scope; run full validation suite before re-shipping |
| Edge case analysis noise causing review abandonment | LOW | Reduce edge case list to 5-8 items; add relevance filter requiring plan-element reference; re-demo to the team to rebuild confidence |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Validation claims too much (Pitfall 1) | Research Validation Agent design | Acceptance criterion: at least one Tier 2 content-inspection verification demonstrated |
| Validation claims too little — blocks on unverifiable (Pitfall 2) | Research Validation Agent design | Output schema includes UNVERIFIABLE state; readiness gate maps it to CONCERNS not FAIL |
| Dependency checks static declarations not runtime paths (Pitfall 3) | Cross-phase dependency verification design | Plan template includes `interface_required` field; checker reads and cross-references it |
| Edge case analysis generates noise (Pitfall 4) | Plan edge case analysis design | Each generated edge case references a specific plan element (file path, function, state field) |
| Integration verifier can't keep up with codebase (Pitfall 5) | Integration point verification design | Verifier uses glob patterns; scope count increases when a new workflow file is added |
| Tech debt closure breaks working features (Pitfall 6) | Tech debt closure phase | Consumer audit artifact required per debt item before implementation begins |
| Research validation develops stale codebase view (Pitfall 7) | Research Validation Agent design | Output includes `validated_at_phase`; readiness gate enforces staleness threshold |
| Dependency verification causes slowdown that gets disabled (Pitfall 8) | Cross-phase dependency verification design | Acceptance criterion: maximum 10-second runtime regardless of milestone size |
| Integration verifier flags intentional pre-registrations (Pitfall 9) | Integration point verification design | `github:update-pr` and `github:search-issues` do not appear in orphan report |
| Validation agents modify state while verifying (Pitfall 10) | Research validation agent implementation | Agent's `allowed_tools` excludes Write and Edit; no file modifications in validation git diff |

---

## Sources

- PDE RETROSPECTIVE.md (v0.1 through v0.6 lessons) — HIGH confidence (direct project history)
- PDE PROJECT.md v0.7 milestone definition and known tech debt items — HIGH confidence (primary source)
- "Agentic Engineering, Part 7: Dual Quality Gates" (sagarmandal.com, 2026-03-15) — HIGH confidence: independent validation/testing separation, mocked vs. real-world failure gap
- IBM: "Alert Fatigue Reduction with AI Agents" — MEDIUM confidence: noise-vs-signal ratio patterns in automated alert systems
- Anthropic: "Demystifying evals for AI agents" — HIGH confidence: signal-to-noise ratio in agent evaluation, ambiguity-as-noise principle
- "How we prevent AI agent's drift and code slop generation" (dev.to/singhdevhub) — MEDIUM confidence: stale context failure mode in codebase-aware agents
- "CI/CD for Context in Agentic Coding" (tessl.io) — MEDIUM confidence: specification staleness as a primary failure mode
- vFunction: "How to Reduce Technical Debt" — MEDIUM confidence: blast radius analysis for tech debt closure
- Edana.ch: "Refactoring Technical Debt and Eliminating Anti-Patterns" — MEDIUM confidence: surgical refactoring principles
- PDE codebase direct inspection: mcp-bridge.cjs TOOL_MAP, protected-files.json, pde-tools.cjs readiness gate, agents/ directory — HIGH confidence

---

*Pitfalls research for: Adding automated validation, dependency verification, and quality gates to PDE (v0.7 Pipeline Reliability & Validation milestone)*
*Researched: 2026-03-19*
