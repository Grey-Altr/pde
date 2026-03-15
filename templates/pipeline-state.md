---
pipeline_version: "1.0"
project_name: "{name}"
mode: "standard"
started_at: "{ISO 8601}"
updated_at: "{ISO 8601}"
current_stage: "ideation|design|implementation|complete"
entry_point: "ideation|design|implementation"
stages_completed: []
stages_skipped: []
---

# Pipeline State

## Progress
| Stage | Status | Started | Completed | Handoff |
|-------|--------|---------|-----------|---------|
| Ideation | pending | -- | -- | -- |
| Design | pending | -- | -- | -- |
| Implementation | pending | -- | -- | -- |

## Current Stage
- **Stage:** {current_stage}
- **Entry:** {Normal (from prior handoff) | Bootstrapped (from intake) | Direct (first stage)}
- **Skills completed:** []
- **Skills remaining:** []

## Handoff History
| Transition | Date | Origin | Validated |
|------------|------|--------|-----------|

## Configuration
- **From:** {from_stage}
- **To:** {to_stage}
- **Dry run:** false
- **Mode:** {mode} (standard | brute-force | heuristic)
- **Verbose:** false
