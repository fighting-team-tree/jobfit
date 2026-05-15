# Active Context

## Current Status
- **Phase:** Git convention hardening and memory cleanup
- **Goal:** Keep project-local rules, commit workflow, and agent memory aligned with the actual JobFit codebase.

## Recent Actions
- **Git Convention Fix:**
  - Identified the cause of the convention miss: runtime/Lore-style first lines were allowed to replace the project-required `type(scope): subject` header.
  - Added `scripts/validate_commit_msg.py` and `.githooks/commit-msg` to enforce the JobFit commit message format.
  - Set local `git config core.hooksPath .githooks` so future local commits are checked automatically.
  - Updated `.agent`, `.codex`, `.claude`, and root `AGENTS.md` guidance so runtime/Lore trailers can only be appended after project WHY/WHAT.
- **Memory Cleanup:**
  - Refreshed `.agent/memory/api_schema.md` and `.agent/memory/tech_spec.md` against current FastAPI/React code.
  - Added `.agent/memory/memory_audit.md` to distinguish agent memory, OMX runtime state, backend in-memory fallback stores, and frontend localStorage persistence.

## Next Steps
- Do not rewrite already-pushed commit history unless explicitly requested; use the new validator to prevent future misses.
- Prioritize replacing browser-stored GitHub tokens and unbounded backend in-memory stores with safer bounded/server-side storage.
- Run normal validation (`make lint`, `make test`, frontend lint/build) when source behavior changes, not for documentation-only updates unless needed.
