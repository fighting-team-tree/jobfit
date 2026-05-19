---
name: jobfit-development
description: JobFit의 FastAPI 백엔드, React/Vite 프론트엔드, 테스트/린트/빌드 검증, 문서 업데이트 작업에 사용합니다.
---

# JobFit Development Skill

JobFit의 일반 개발, 수정, 검증 작업에 사용하는 Codex 스킬입니다.

## 적용 범위

- FastAPI 백엔드 수정
- React/Vite 프론트엔드 수정
- 테스트/린트/빌드 검증
- 환경 변수와 문서 업데이트

## 기본 루틴

1. 변경 범위를 파악합니다.
2. 관련 규칙을 확인합니다.
   - Python: `.codex/rules/02-python-uv.md`
   - 보안/PII: `.codex/rules/04-security-pii.md`
   - Git: `.codex/rules/03-git-convention.md`
3. 작은 diff로 수정합니다.
4. 변경 영역에 맞는 검증을 실행합니다.

## 검증 명령

### Backend/Python

```bash
make lint
make test
```

또는 세부 실행:

```bash
uv run ruff format --check server/ tests/
uv run ruff check server/ tests/
uv run pytest
```

### Frontend

```bash
npm --prefix client run lint
npm --prefix client run build
```

### 전체 변경

```bash
make lint
make test
npm --prefix client run lint
npm --prefix client run build
git diff --check
```

## 완료 보고

최종 응답에는 다음을 간단히 포함합니다.

- 변경 파일/영역
- 실행한 검증 명령과 결과
- 남은 리스크 또는 미검증 항목
