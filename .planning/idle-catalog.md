# Idle Suggestion Catalog

Human-editable. Each `##` section maps to a phase type.
Entries are `- category: text` followed by an indented `Nmin // resumption:cost` label.
The engine reads entries for the current phase type and falls back to `## default`.

Note: all catalog entries emit as `think`-category candidates regardless of the verb prefix
used here. The `review`-category is reserved for dynamically-generated artifact paths.

## research

- capture: what domain assumptions have you not yet written down?
  5min // resumption:low

- capture: what competitor behaviors would change your approach?
  5min // resumption:low

- capture: what edge cases does this research phase not cover?
  5min // resumption:low

## plan

- think: what acceptance criteria are ambiguous in the current plan?
  5min // resumption:low

- capture: what requirements are implied but not stated?
  5min // resumption:low

- think: which tasks have hidden dependencies the planner might miss?
  5min // resumption:low

- capture: what technical constraints should the planner know about?
  5min // resumption:low

## execute

- capture: what edge cases did you discover during execution?
  5min // resumption:low

- think: what would break if the current approach scales to 10x data?
  5min // resumption:low

- capture: what integration points need manual verification?
  5min // resumption:low

- think: are there error handling gaps in the current implementation?
  5min // resumption:low

## design

- think: what user interaction feels awkward or unclear?
  5min // resumption:low

- capture: what accessibility requirements are not yet addressed?
  5min // resumption:low

- think: which design decisions will be hardest to change later?
  5min // resumption:med

- capture: what brand or visual consistency issues have you noticed?
  5min // resumption:low

## validation

- capture: what test scenarios are missing from the current suite?
  5min // resumption:low

- think: what production conditions differ from the test environment?
  5min // resumption:low

- capture: what regression risks exist from recent changes?
  5min // resumption:low

## default

- capture: what would you tell a new team member about this project?
  5min // resumption:low

- think: what parts of the codebase are most fragile right now?
  5min // resumption:low

- capture: what business rules are not yet captured in code or docs?
  5min // resumption:low
