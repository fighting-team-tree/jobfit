# JobFit Task List

## Current
- [x] Git 커밋 메시지 첫 줄을 `type(scope): subject`로 강제하는 검증 훅 추가
- [x] `.agent`, `.codex`, `.claude`, `AGENTS.md`의 Git 컨벤션 우선순위 문구 정리
- [x] `.agent/memory/active_context.md`, `tech_spec.md`, `api_schema.md`를 현재 코드 기준으로 갱신
- [x] `.agent/memory/memory_audit.md`로 프로젝트 메모리 표면과 리스크 정리

## Follow-up
- [ ] 브라우저 `localStorage`의 GitHub token 저장 제거 또는 서버-side 단기 토큰 흐름으로 대체
- [ ] `active_sessions`, `problems_store`, `EmbeddingService._cache`에 TTL/LRU/cleanup 적용
- [ ] interview WebSocket audio queue에 bounded size와 overflow 정책 적용
