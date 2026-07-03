# Active Context

## Current Status
- **Phase:** Runtime safety hardening
- **Goal:** Keep LLM, demo persistence, and GitHub token flows aligned with JobFit's security/PII rules while preserving the current demo UX.

## Feature Implementation Status
### ✅ 완료 (Completed)
- 이력서 파싱 (텍스트, PDF, 이미지 분석)
- JD URL 스크래핑 및 텍스트 정제 (httpx + Playwright 폴백)
- 임베딩 기반 갭 분석 및 결정적 가중치 스코어링 (NV-Embed + Cosine Similarity)
- Claude Agent 기반 주차별 로드맵 생성 및 연습 문제 생성/평가
- ElevenLabs WebSocket 및 Deepgram STT 기반 실시간 AI 음성 면접 연습
- GitHub 프로필 분석 및 매칭
- 프론트엔드 UI/UX (Dashboard, Profile, Companies, Roadmap, Interview, Problem 페이지)
- **GitHub 연동 코드 리뷰 면접 기능**: JD 적합도 기반 AI 저장소 추천, 소스 파일 분석 요약(Brief) 생성 및 음성 면접관 시스템 프롬프트(overrides) 주입 연동 완료.

### 🔄 진행 중 (In Progress)
- (없음 - 전체 핵심 기능 구현 및 연동 완료)

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
  - **Image JD Layout Refinement:** Added `refine_jd_text` to post-process raw text extracted from image JDs (VLM or Upstage Document Parse API) into clean, logically ordered Markdown structured formats.
  - **Windows asyncio Bug Fix:** Configured `WindowsProactorEventLoopPolicy` as the default event loop policy on Windows (`win32` platform) in `main.py` and `jd_scraper_service.py` to prevent `NotImplementedError` when executing Playwright's headless browser subprocesses.
- **Runtime State Cleanup:**
  - Moved browser auth token storage from `localStorage` to `sessionStorage` with one-time legacy cleanup.
  - Reduced `jobfit-profile` persistence to non-PII GitHub URL metadata only; resume/JD/profile/analysis data stays in memory/server sync.
  - Added `ExpiringStore` TTL/LRU behavior for demo profile/company stores, interview sessions, and roadmap/problem fallback stores.
  - Changed embedding cache to hashed keys with TTL/LRU eviction so raw resume/JD text is not retained as cache keys.
  - Bounded WebSocket audio buffering with oldest-chunk drop behavior and reliable stop-sentinel enqueueing.
  - Bounded browser interview history and generated problem caches; persisted interview summaries are stripped.
- **GitHub Code Review Interview:**
  - Added repository-level JD matching and scoring heuristics (`github_service.py`).
  - Implemented source tree traversal scoring and LLM prompt summarization (`code_review_service.py`).
  - Integrated code-review summary context into interviewer prompts and ElevenLabs agent session startup.
  - Created a Code Review Mode toggle and AI recommendations vs. manual selection UI in the frontend (`InterviewPage.tsx`, `store.ts`, `api.ts`).

- **Codex Review Skills:**
  - Added repo-local `.codex/skills` for architecture, security/privacy, AI pipeline, frontend product, and test/QA review.
  - Updated `.codex/README.md` and `AGENTS.md` so future Codex runs can discover the expanded review skill set.

## Next Steps
- Verify the system end-to-end with real user voice sessions and ensure the LLM follows the injected code review details in conversation.
- Address caching of git code briefs if repeat code review interviews on the same repositories become a performance issue.
