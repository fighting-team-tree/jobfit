# 코드 린트 실행

프로젝트의 코드 품질을 검사합니다.

## Frontend (ESLint)
```bash
cd client && npm run lint
```

## Backend (Ruff - 권장)
```bash
# Ruff 설치 (없는 경우)
uv add ruff --dev

# 린트 검사
uv run ruff check server/

# 자동 수정
uv run ruff check server/ --fix
```

## TypeScript 타입 검사
```bash
cd client && npx tsc --noEmit
```

## 코드 스타일 가이드
### Python (Backend)
- Type hints 사용
- async/await 패턴
- Pydantic 모델로 요청/응답 정의

### TypeScript (Frontend)
- 명시적 타입 선언
- Zustand로 전역 상태 관리
- Tailwind CSS 유틸리티 클래스
