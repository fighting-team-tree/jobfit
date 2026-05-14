## Current Status
- **Phase:** Tooling Alignment - Codex project guidance
- **Goal:** Keep Codex, Claude, and shared Agent instructions aligned for JobFit development.

## Recent Actions
- **Codex Structure:**
  - Created root `AGENTS.md` as the Codex entrypoint for repository-wide instructions.
  - Expanded `.codex/` with rules, skills, and prompts based on `.agent/` and `.claude/`.
  - Added Codex Git convention coverage via `.codex/rules/03-git-convention.md` and `.codex/skills/git-convention/SKILL.md`.
- **Documentation Sync:**
  - Removed redundant `AGENT.md`; Codex guidance now lives in root `AGENTS.md` and `.codex/`.
  - Updated `CLAUDE.md` project tree to mention `.codex/`.

## Next Steps
- Keep `.agent/`, `.claude/`, and `.codex/` synchronized when tool-facing rules change.
- Use `.codex/skills/git-convention` for future Codex-side commit message generation.
- Run normal code validation (`make lint`, `make test`, frontend lint/build) when source code changes accompany documentation/tooling changes.
