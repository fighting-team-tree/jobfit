# JobFit Task List

## Current
- [x] 하이브리드 스킬 매칭을 위한 동의어 사전 및 규칙 구성
- [x] `SkillMatcherService` (skill_matcher_service.py)에 하이브리드 매칭 및 연구 도메인 추가 검증 구현
- [x] `LLMService` (llm_service.py)의 `analyze_gap`에서 프로필 원본 데이터를 `match_skills`로 전달하도록 파라미터 보완
- [x] 테스트 스크립트를 작성하여 한영 크로스 매칭 및 연구/개발 분리 시나리오 유효성 검증
- [x] `make test` 및 `make lint`를 실행하여 통합 검증 수행
- [x] 작업 완료 후 `walkthrough.md` 작성 및 보고
- [x] `.agent/memory/memory_audit.md`로 프로젝트 메모리 표면과 리스크 정리

## Follow-up
- [x] 브라우저 `localStorage`의 GitHub token 저장 제거 또는 서버-side 단기 토큰 흐름으로 대체
- [x] `active_sessions`, `problems_store`, `EmbeddingService._cache`에 TTL/LRU/cleanup 적용
- [x] interview WebSocket audio queue에 bounded size와 overflow 정책 적용
