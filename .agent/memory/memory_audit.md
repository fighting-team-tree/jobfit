# Memory Audit

Last reviewed: 2026-05-20

## 1. Memory Surfaces

| Surface | Path / Symbol | Purpose | Persistence | Risk |
| --- | --- | --- | --- | --- |
| Agent memory | `.agent/memory/*.md` | Long-lived project context for AI tools | Git-tracked docs | Drift if not updated with code |
| OMX runtime state | `.omx/state/*.json`, `.omx/logs/*.jsonl` | Session/HUD/subagent runtime metadata | Local runtime files | Not product truth; can be stale |
| Codebase map cache | `.omx/cache/codebase-map.json` | OMX repository summary cache | Local runtime cache | Can lag behind source changes |
| Profile fallback | `profiles_store` | Demo profile state scoped by `X-JobFit-Client-Session` | TTL/LRU process memory | Restart loss; blocked in production |
| Companies fallback | `companies_store` | Demo company/JD state scoped by `X-JobFit-Client-Session` | TTL/LRU process memory | Restart loss; blocked in production |
| Interview sessions | `active_sessions` | REST/WS interview conversation state | TTL/LRU process memory | Restart loss |
| Roadmap/problem fallback | `roadmaps_store`, `problems_store` | Generated roadmap/problem lookup | TTL/LRU process memory | Restart loss |
| Embedding cache | `EmbeddingService._cache` | Avoid duplicate embedding API calls using hashed text keys | TTL/LRU process memory | Restart loss; embeddings still derived from user text |
| Frontend profile | `jobfit-profile` | GitHub URL metadata only after v2 migration | Browser localStorage | Legacy browsers need one app load to migrate |
| Frontend auth | `jobfit-auth`, `jobfit_access_token` | User/auth token persistence | Browser sessionStorage for token | Token still exposed to XSS during active session |
| Demo session | `jobfit_client_session` | Opaque client-side key for non-production fallback stores | Browser localStorage | Not auth; only reduces accidental demo data mixing |
| GitHub config | `jobfit_github_config` | GitHub repo/username metadata | Browser localStorage | Token no longer persisted; metadata can still go stale |
| Interview history | `jobfit-interview-history` | Recent feedback summaries | Browser localStorage | Capped at 50; may contain interview content |
| Problem cache | `jobfit-problems` | Generated weekly problems | Browser localStorage | Growth and stale data |

## 2. Cleanup Decisions

- Treat `.agent/memory` as the project memory source of truth for AI agents.
- Treat `.omx` files as runtime state only; do not use them as durable product documentation.
- Keep `active_context.md`, `tech_spec.md`, and `api_schema.md` synchronized after meaningful source/API/config changes.
- Runtime/Lore commit trailers do not override JobFit commit header convention.

## 3. Priority Risks

1. **Medium:** WebSocket `audio_queue` is currently unbounded.
2. **Medium:** process-memory stores are now bounded but still restart-volatile; use DB/Redis/object storage for production durability.
3. **Medium:** `jobfit-interview-history` and `jobfit-problems` still use browser localStorage and may retain interview/problem content.
4. **Low/Medium:** `jobfit_github_config` no longer stores PATs but repo metadata can become stale.

## 4. Recommended Follow-ups

- Consider a server-side short-lived GitHub token/session flow if push automation becomes production scope.
- Replace `asyncio.Queue()` with bounded queues in interview WebSocket audio handling.
- Consider DB-backed interview session persistence for Replit restarts.
- Add TTL/migration for browser interview history and problem cache if those become production features.
