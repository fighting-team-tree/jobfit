# Memory Audit

Last reviewed: 2026-05-14

## 1. Memory Surfaces

| Surface | Path / Symbol | Purpose | Persistence | Risk |
| --- | --- | --- | --- | --- |
| Agent memory | `.agent/memory/*.md` | Long-lived project context for AI tools | Git-tracked docs | Drift if not updated with code |
| OMX runtime state | `.omx/state/*.json`, `.omx/logs/*.jsonl` | Session/HUD/subagent runtime metadata | Local runtime files | Not product truth; can be stale |
| Codebase map cache | `.omx/cache/codebase-map.json` | OMX repository summary cache | Local runtime cache | Can lag behind source changes |
| Profile fallback | `profiles_store` | Demo profile state for unauthenticated users | Process memory | Shared anonymous user; restart loss |
| Companies fallback | `companies_store` | Demo company/JD state | Process memory | Restart loss; no TTL |
| Interview sessions | `active_sessions` | REST/WS interview conversation state | Process memory | Restart loss; no cleanup/TTL |
| Roadmap/problem fallback | `roadmaps_store`, `problems_store` | Generated roadmap/problem lookup | Process memory | Unbounded growth |
| Embedding cache | `EmbeddingService._cache` | Avoid duplicate embedding API calls | Process memory | Unbounded growth; no TTL/LRU |
| Frontend profile | `jobfit-profile` | Zustand-persisted profile/JD/analysis data | Browser localStorage | PII exposure on shared/browser-compromised devices |
| Frontend auth | `jobfit-auth`, `jobfit_access_token` | User/auth token persistence | Browser localStorage | Token theft if XSS/local compromise |
| GitHub config | `jobfit_github_config` | GitHub token/repo config | Browser localStorage | High severity token exposure |
| Interview history | `jobfit-interview-history` | Recent feedback summaries | Browser localStorage | Capped at 50; may contain interview content |
| Problem cache | `jobfit-problems` | Generated weekly problems | Browser localStorage | Growth and stale data |

## 2. Cleanup Decisions

- Treat `.agent/memory` as the project memory source of truth for AI agents.
- Treat `.omx` files as runtime state only; do not use them as durable product documentation.
- Keep `active_context.md`, `tech_spec.md`, and `api_schema.md` synchronized after meaningful source/API/config changes.
- Runtime/Lore commit trailers do not override JobFit commit header convention.

## 3. Priority Risks

1. **High:** `jobfit_github_config` stores a GitHub token in `localStorage`.
2. **High:** `active_sessions` has no TTL or persistent restore path.
3. **Medium:** WebSocket `audio_queue` is currently unbounded.
4. **Medium:** `EmbeddingService._cache` and `problems_store` can grow without limit.
5. **Medium:** `.agent/memory` had drift against actual API and stack versions; now refreshed.

## 4. Recommended Follow-ups

- Move GitHub token handling to a server-side short-lived flow or store only non-secret repo metadata client-side.
- Add cleanup/TTL for `active_sessions`, `roadmaps_store`, and `problems_store`.
- Replace `asyncio.Queue()` with bounded queues in interview WebSocket audio handling.
- Add LRU/TTL to embedding cache.
- Consider DB-backed interview session persistence for Replit restarts.
