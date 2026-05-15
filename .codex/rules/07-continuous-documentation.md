# Continuous Documentation & Memory Rules

의미 있는 기능 구현, 버그 수정, 설정 변경, API 변경 후 문서 drift를 방지합니다.

## 확인 대상

- `README.md`: 사용자/개발자용 설치, 실행, 기능 설명
- `AGENTS.md`: Codex 루트 지침과 프로젝트 컨텍스트
- `CLAUDE.md`: Claude Code 전용 가이드
- `AGENTS.md`: Codex 루트 지침
- `.agent/memory/active_context.md`: 최근 작업과 다음 단계
- `.agent/memory/tech_spec.md`: 아키텍처, 의존성, API 변경
- `.agent/memory/api_schema.md`: API 경로/요청/응답 변경
- `.agent/memory/memory_audit.md`: 저장소/런타임/브라우저 메모리 표면과 리스크 변경

## 원칙

- 코드는 truth이고 문서는 거울입니다.
- 변경이 문서화된 기능/명령/API에 영향을 주면 같은 작업 단위에서 갱신합니다.
- 문서만 업데이트하는 경우에도 검증 가능한 명령/경로는 실제 repo 기준으로 확인합니다.
