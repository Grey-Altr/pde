---
phase: 100-git-state-machine
generated: "2026-03-23T00:00:00Z"
finding_count: 5
high_count: 2
has_bdd_candidates: true
---

# Phase 100: Edge Cases

**Generated:** 2026-03-23
**Findings:** 5 (cap: 8)
**HIGH severity:** 2
**BDD candidates:** yes

## Findings

### 1. [HIGH] cmdExperimentPromote checkout to main may fail if working tree is dirty

**Plan element:** `cmdExperimentPromote` in `bin/lib/experiment.cjs`
**Category:** error_path

After experiment iterations, the working tree may have uncommitted modifications.
`git checkout main` will fail with a "dirty working tree" error if there are unstaged
changes. The action describes cherry-picking bestCommit but does not specify
that the working tree must be clean, or that staged/unstaged changes should be
stashed or rejected with a clear message before the checkout.

**BDD Acceptance Criteria Candidate:**
```
Given an experiment/slug branch with uncommitted modifications
When cmdExperimentPromote is called
Then it outputs promoted: false with reason: dirty_working_tree before attempting checkout
```

### 2. [HIGH] cmdExperimentReset branch check uses rev-parse but experiment may be on detached HEAD

**Plan element:** `cmdExperimentReset` in `bin/lib/experiment.cjs`
**Category:** error_path

The reset function checks current branch via `git rev-parse --abbrev-ref HEAD`. In a
detached HEAD state (possible if another git operation was run), this returns "HEAD"
rather than a branch name. The task action does not specify handling for detached HEAD,
which could produce a misleading `wrong_branch` rejection or, worse, incorrectly
pass the check if the logic has a bug.

**BDD Acceptance Criteria Candidate:**
```
Given a repository in detached HEAD state on an experiment commit
When cmdExperimentReset is called with the correct slug
Then it outputs reset: false with reason: wrong_branch (not an unhandled error)
```

### 3. [MEDIUM] cmdExperimentInit does not handle slug collision (branch already exists)

**Plan element:** `cmdExperimentInit` in `bin/lib/experiment.cjs`
**Category:** error_path

`git checkout -b experiment/{slug}` fails if a branch with that name already exists
(e.g., resuming an interrupted experiment). The action does not specify error handling
for pre-existing branch — execGit will return exitCode != 0 and the generic `error()`
call will produce a raw git error message rather than a helpful "experiment already
initialized, use 'status' to inspect" message.

### 4. [MEDIUM] EXPERIMENT-BEST.json parsed without JSON error handling in cmdExperimentCommit

**Plan element:** `cmdExperimentCommit` in `bin/lib/experiment.cjs`
**Category:** error_path

`cmdExperimentCommit` reads the existing EXPERIMENT-BEST.json to get current state.
If the file is malformed (e.g., partial write from a previous crash), `JSON.parse`
will throw synchronously, causing an unhandled exception rather than a structured
error output. The action does not mention try/catch wrapping for this read.

### 5. [LOW] checkBoundaries line-by-line YAML parser may mishandle multi-level indentation

**Plan element:** `checkBoundaries` in `bin/lib/experiment.cjs`
**Category:** boundary_condition

The action specifies a "simple line-by-line parser" for the YAML frontmatter in
`references/experiment-boundaries.md`. If the YAML list items are indented at a
different level (e.g., 4 spaces vs 2 spaces), or if a list item spans multiple lines,
the parser may silently skip protected files. The acceptance criteria does not include
a test that specifically validates protection of a deeply-nested YAML entry.
