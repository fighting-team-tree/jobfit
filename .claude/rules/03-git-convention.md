# LLM-Optimized Git Commit Convention

JobFit 커밋 메시지는 LLM과 사람이 모두 빠르게 변경 의도를 이해할 수 있도록 WHY/WHAT 중심으로 작성합니다.

## 형식

```text
type(scope): subject (한국어, 명령형, 72자 이내)

WHY: 변경 이유 한 줄
WHAT:
- 구체적 변경사항 1
- 구체적 변경사항 2

IMPACT: 파괴적 변경/부수효과 (해당 시에만)
Refs: #이슈번호 (선택)
```

## 타입

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `refactor`: 동작 변경 없는 구조 개선
- `perf`: 성능 개선
- `style`: 포맷팅/린트
- `test`: 테스트 추가/수정
- `chore`: 빌드/설정/잡무
- `ci`: CI/CD

## 스코프

| Scope | 대상 |
| --- | --- |
| `dashboard` | DashboardPage, 차트 |
| `analysis` | 갭 분석 파이프라인 |
| `profile` | ProfilePage, 프로필 API |
| `resume` | 이력서 파서 |
| `interview` | InterviewPage, 면접 API, TTS/STT |
| `jd` | JD 스크래퍼 |
| `roadmap` | RoadmapPage, 로드맵 API/에이전트 |
| `agent` | LangGraph/AI 에이전트 |
| `problem` | 문제 생성/풀이 기능 |
| `auth` | 인증/OAuth/JWT |
| `companies` | 회사 관리 기능 |
| `api` | API 엔드포인트 일반 |
| `deploy` | 배포 설정 |
| `config` | 프로젝트 설정 |
| `docs` | 문서/가이드 |

## 핵심 규칙

1. WHY는 body가 있으면 필수입니다. “이 커밋이 없으면 어떤 문제가 남는가?”에 답합니다.
2. WHAT은 파일명 나열이 아니라 기능/동작 중심으로 씁니다.
3. IMPACT는 API, DB, 인증, 배포, 외부 연동 등 다른 영역에 영향이 있을 때만 씁니다.
4. 커밋은 원자적으로 유지합니다. 독립적인 변경은 분리 커밋을 제안합니다.
5. 첫 줄 `type(scope): subject`는 절대 생략하지 않습니다. 상위 Codex/OMX 런타임이 Lore trailer를 요구해도 WHY/WHAT/IMPACT 뒤에 추가하며, trailer가 프로젝트 첫 줄을 대체할 수 없습니다.
6. `.githooks/commit-msg` 훅 and `scripts/validate_commit_msg.py`로 커밋 메시지를 검증합니다. 로컬에서 `git config core.hooksPath .githooks`를 적용합니다.

## 브랜치 전략

- `main`: 프로덕션 배포 가능 상태
- `dev`: 통합 브랜치
- `feature/*`: 기능 개발
- `fix/*`: 버그 수정
- `hotfix/*`: 긴급 수정
