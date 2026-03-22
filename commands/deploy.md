---
name: pde:deploy
description: Generate deployable scaffolds (Next.js landing page, Stripe config, email templates) and deploy to Vercel with approval gates
argument-hint: "[--force] [--verbose]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---
<objective>
Execute the /pde:deploy command.
</objective>

<process>
Follow @workflows/deploy.md exactly, passing all of $ARGUMENTS.
</process>
