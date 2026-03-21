# Context Notes

Place markdown files here to inject domain knowledge into PDE's planning cycles.

## How it works

Any `.md` file in this directory will be read by `/pde:plan` and `/pde:brief` and appear
in the planner's context under a **Context Notes** section. Use this to capture:

- Business rules PDE cannot infer from code
- Edge cases you've discovered that aren't in the codebase yet
- User stories and acceptance criteria drafts
- Domain constraints and regulatory requirements

## Naming convention

Files are sorted alphabetically and read in order. Use date-prefixed filenames
to control order:

    2026-03-21-payment-edge-cases.md
    2026-03-21-user-auth-constraints.md

## Format

Plain markdown. No special frontmatter required. Write naturally.
PDE reads the full file content and includes it verbatim in planning context.
