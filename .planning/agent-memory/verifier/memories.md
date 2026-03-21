# verifier Agent Memory

> Loaded at agent spawn. Append-only. Max 50 entries.
> Oldest entries archived automatically.

### 2026-03-20T20:10:00Z | Phase 62 | tags: workflow-instrumentation, ndjson, validation-script, fire-and-forget

Phase 62 used an 8-check Nyquist validation suite (validate-instrumentation.sh) as the ground-truth verification contract — running it live (`bash validate-instrumentation.sh`) is faster and more reliable than manually grepping each check. For workflow-markdown phases (execute-phase.md, execute-plan.md), event-emit calls must use the `2>/dev/null || true` single-line pattern on one line for EVNT04-H static analysis to pass. The `PHASE_NUMBER`/`PLAN_NUMBER` uppercase variable convention in execute-plan.md is intentional agent-instruction notation, not a naming mismatch with the lowercase JSON keys from init.
