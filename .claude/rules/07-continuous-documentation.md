# Continuous Documentation & Memory Update Rules

## 1. Trigger (언제 수행하는가?)
- **작업 완료 직후**: 의미 있는 작업 단위(기능 구현, 환경 설정, 버그 수정 등)가 완료되면 **즉시** 문서를 업데이트해야 한다.
- 사용자의 별도 요청이 없더라도 에이전트가 자율적으로 판단하여 수행한다.

## 2. Required Actions (필수 수행 항목)

### A. Update Active Context (`.agent/memory/active_context.md`)
- **Current Status**: 현재 프로젝트가 어떤 상태인지(예: 초기 설정 완료, 기능 개발 중) 최신화한다.
- **Recent Actions**: 방금 완료한 구체적인 작업 내용을 로그로 남긴다.
- **Next Steps**: 완료된 작업을 바탕으로 다음에 무엇을 해야 하는지 구체적으로 명시한다.

### B. Update Technical Specifications (`.agent/memory/tech_spec.md`)
- 아키텍처 변경, 새로운 라이브러리 추가(`.toml`, `.json`), API 엔드포인트 변경 등이 발생하면 즉시 스펙 문서에 반영한다.
- **Code is Truth**: 코드는 수정되었는데 문서는 그대로인 상황(Documentation Drift)을 절대 만들지 않는다.

### C. Update API and Memory Audit
- API 경로, 요청/응답, WebSocket 경로가 바뀌면 `.agent/memory/api_schema.md`를 갱신한다.
- 인메모리 저장소, cache, localStorage/sessionStorage, runtime state 처리 방식이 바뀌면 `.agent/memory/memory_audit.md`를 갱신한다.

### D. Update Task List (`task.md`)
- 완료된 작업 항목을 `[x]`로 체크한다.
- 작업 도중 발견된 새로운 할 일이나 하위 작업이 있다면 목록에 추가한다.

### E. Major Project Documents Update (`AGENTS.md`, `CLAUDE.md`, `README.md`)
- 의미 있는 기능 변경이나 설정 변경이 완료되면 다음 문서들을 반드시 검토하고 업데이트해야 한다.
  - **`README.md`**: 프로젝트 개요, 주요 기능, 설치 및 실행 방법, API 요약 (User-facing)
  - **`CLAUDE.md`**: 개발 가이드, 명령어, 코드 스타일, 아키텍처 (Hybrid Agent용)
  - **`AGENTS.md`**: Codex 컨텍스트, 구현 지침, 핵심 파일 매핑 (Codex entrypoint)
- **Pre-Commit Verification**: `git commit` 명령을 제안하기 전에, 위 문서들이 변경 사항을 **올바르게 반영하고 있는지** 반드시 확인해야 한다.

## 3. Purpose (목적)
- 에이전트(Antigravity) 및 협업 에이전트들이 언제든지 이 메모리 파일들을 읽고("context loading"), 현재 상황을 완벽하게 파악하여 불필요한 문맥 파악 시간을 줄이고 정확한 답변을 제공하기 위함이다.
