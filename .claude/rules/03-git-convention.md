# LLM-Optimized Git 커밋 컨벤션

## 커밋 메시지 형식
```
type(scope): subject (한국어, 명령형, 72자 이내)

WHY: 변경 이유 한 줄
WHAT:
- 구체적 변경사항 1
- 구체적 변경사항 2

IMPACT: 파괴적 변경/부수효과 (해당 시에만)
Refs: #이슈번호
```

## 타입
- **feat**: 새로운 기능 | **fix**: 버그 수정 | **docs**: 문서 수정
- **refactor**: 리팩토링 | **perf**: 성능 개선 | **style**: 포맷팅
- **test**: 테스트 | **chore**: 빌드/설정 | **ci**: CI/CD

## 스코프
| Scope | 대상 | Scope | 대상 |
|-------|------|-------|------|
| `dashboard` | DashboardPage + 차트 | `analysis` | 갭 분석 파이프라인 |
| `profile` | ProfilePage + 프로필 API | `resume` | 이력서 파서 |
| `interview` | InterviewPage + 면접 API | `jd` | JD 스크래퍼 |
| `roadmap` | RoadmapPage + 로드맵 API | `agent` | LangGraph 에이전트 |
| `problem` | ProblemPage + 문제 API | `auth` | 인증 |
| `companies` | CompaniesPage + 회사 API | `api` | API 엔드포인트 일반 |
| `deploy` | 배포 설정 | `config` | 프로젝트 설정 |

## 핵심 규칙
1. **WHY 필수**: body 작성 시 WHY 항상 포함 ("이 커밋이 없으면 어떤 문제?")
2. **WHAT은 기능 중심**: 파일명 나열이 아닌 동작/기능 변경 기술
3. **IMPACT는 선택**: 다른 모듈에 영향 줄 때만 작성
4. **원자적 커밋**: 하나의 기능/수정당 하나의 커밋

## 브랜치 전략
- `main`: 프로덕션 | `dev`: 통합 브랜치
- `feature/*`: 기능 개발 | `fix/*`: 버그 수정 | `hotfix/*`: 긴급 수정
