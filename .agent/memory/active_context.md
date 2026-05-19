# Active Context

## Current Status
- **Phase:** Runtime safety hardening
- **Goal:** Keep LLM, demo persistence, and GitHub token flows aligned with JobFit's security/PII rules while preserving the current demo UX.

## Recent Actions
- **Git Convention Fix:**
  - Identified the cause of the convention miss: runtime/Lore-style first lines were allowed to replace the project-required `type(scope): subject` header.
  - Added `scripts/validate_commit_msg.py` and `.githooks/commit-msg` to enforce the JobFit commit message format.
  - Set local `git config core.hooksPath .githooks` so future local commits are checked automatically.
  - Updated `.agent`, `.codex`, `.claude`, and root `AGENTS.md` guidance so runtime/Lore trailers can only be appended after project WHY/WHAT.
- **Memory Cleanup:**
  - Refreshed `.agent/memory/api_schema.md` and `.agent/memory/tech_spec.md` against current FastAPI/React code.
  - Added `.agent/memory/memory_audit.md` to distinguish agent memory, OMX runtime state, backend in-memory fallback stores, and frontend localStorage persistence.
- **Runtime Safety Fixes:**
  - Fixed `LLMService` call-site drift by replacing stale `_call_llm*` calls with the public `call_llm*` helpers.
  - Added shared PII masking helpers and applied masking before resume, gap-analysis, interview-question, interview-feedback, and GitHub skill-inference LLM prompts.
  - Scoped demo fallback profile/company storage by `X-JobFit-Client-Session` and blocked those fallback stores in production.
  - Stopped persisting GitHub PATs in `jobfit_github_config`; only repo/username metadata remains in localStorage.
  - Added validation for roadmap week/count inputs and regression tests for PII masking, fallback isolation, and `weeks=0`.
- **Runtime State Cleanup:**
  - Moved browser auth token storage from `localStorage` to `sessionStorage` with one-time legacy cleanup.
  - Reduced `jobfit-profile` persistence to non-PII GitHub URL metadata only; resume/JD/profile/analysis data stays in memory/server sync.
  - Added `ExpiringStore` TTL/LRU behavior for demo profile/company stores, interview sessions, and roadmap/problem fallback stores.
  - Changed embedding cache to hashed keys with TTL/LRU eviction so raw resume/JD text is not retained as cache keys.
  - Bounded WebSocket audio buffering with oldest-chunk drop behavior and reliable stop-sentinel enqueueing.
  - Added TTL/cap migrations for browser interview history and generated problem caches; persisted interview summaries are stripped.

## Next Steps
- Do not rewrite already-pushed commit history unless explicitly requested; use the new validator to prevent future misses.
- Remaining risk: runtime stores and browser caches are now bounded, but production durability still needs DB/Redis/object storage rather than process memory/localStorage.
- Remaining risk: `jobfit_github_config` keeps non-secret repo metadata in localStorage; consider server-side config if repo metadata becomes sensitive.
- Run normal validation (`make lint`, `make test`, frontend lint/build) when source behavior changes, not for documentation-only updates unless needed.
