# Project Documentation Rules

## 1. Documentation Update Trigger
사용자가 "문서 업데이트"를 요청하거나 의미 있는 기능 변경이 있을 경우, 다음 문서들을 반드시 검토하고 업데이트해야 한다.

### Target Documents
- **`README.md`**: 프로젝트 개요, 주요 기능, 설치 및 실행 방법, API 요약 (User-facing)
- **`CLAUDE.md`**: 개발 가이드, 명령어, 코드 스타일, 아키텍처 (Hybrid Agent용)
- **`AGENT.md`**: AI 에이전트(Gemini/Codex) 컨텍스트, 구현 상태, 핵심 파일 매핑 (Context-provider)

## 2. Pre-Commit Verification (커밋 전 필수 확인)
`git commit` 명령을 제안하기 전에, 위 문서들이 변경 사항을 **올바르게 반영하고 있는지** 반드시 확인해야 한다.

- [ ] `README.md`에 새로운 기능이나 변경된 설치 방법이 반영되었는가?
- [ ] `CLAUDE.md`에 새로운 명령어 규칙이나 구조 변경이 반영되었는가?
- [ ] `AGENT.md`에 현재 구현 상태(Checklist)와 파일 경로가 최신화되었는가?

> **Rule**: 문서는 코드를 반영하는 "거울"이어야 한다. 코드가 변경되었다면 문서도 즉시 변경되어야 한다.
