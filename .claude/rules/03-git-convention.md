# Git 커밋 컨벤션

## 1. 커밋 메시지 구조
```
type: Subject

[Optional Body - Why and What]
```

## 2. 타입 종류
- **feat**: 새로운 기능
- **fix**: 버그 수정
- **docs**: 문서 수정
- **style**: 코드 포맷팅 (세미콜론, 공백 등)
- **refactor**: 리팩토링 (기능 변경 없음)
- **perf**: 성능 개선
- **test**: 테스트 추가/수정
- **chore**: 빌드, 패키지 매니저 설정

## 3. 규칙
- **Subject**: 명령형 사용 ("Add feature" O, "Added feature" X), 마침표 없음
- **Body**: 필요 시 변경 이유 상세 설명
- **단위**: 원자적 커밋 (하나의 기능/수정당 하나의 커밋)

## 4. 브랜치 전략
- `main`: 프로덕션 코드
- `dev`: 통합 브랜치
- `feature/*`: 기능 개발 (예: `feature/resume-parser`)
- `fix/*`: 버그 수정
- `hotfix/*`: 긴급 수정 (main 직접)
