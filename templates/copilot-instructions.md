# Instructions for PDE

- Use the platform-development-engine skill when the user asks for PDE or uses a `pde-*` command.
- Treat `/pde-...` or `pde-...` as command invocations and load the matching file from `.github/skills/pde-*`.
- When a command says to spawn a subagent, prefer a matching custom agent from `.github/agents`.
- Do not apply PDE workflows unless the user explicitly asks for them.
- After completing any `pde-*` command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting via `ask_user`; repeat this feedback loop until the user explicitly indicates they are done.
