# LLM-Optimized 커밋 생성

staged 변경사항을 검토하고 WHY/WHAT/IMPACT 컨벤션에 맞는 커밋을 생성합니다.

## 실행 절차

### Step 1: 사전 검증
아래 항목을 **반드시** 확인하고, 문제가 있으면 커밋을 중단하고 사용자에게 알린다:

1. **staged 변경사항 확인**: `git diff --cached`로 staged 변경사항이 있는지 확인. 없으면 unstaged 변경사항(`git diff`)과 untracked 파일(`git status`)을 보여주고, 어떤 파일을 stage할지 사용자에게 질문한다.

2. **보안 검사**: staged diff에서 아래 패턴이 있는지 검사:
   - API 키/시크릿 하드코딩 (`API_KEY=`, `SECRET=`, `ghp_`, `sk-` 등)
   - `.env` 파일이 staged에 포함됨
   - 자격증명 파일 (credentials.json, token.json 등)
   - 발견 시 **즉시 경고**하고 커밋 중단

3. **원자성 검사**: staged diff를 분석하여 여러 독립적 기능/수정이 섞여 있는지 판단. 섞여 있으면 분리 커밋을 제안한다.

4. **대용량 파일 검사**: 새로 추가된 파일 중 1MB 이상인 것이 있으면 경고.

### Step 2: 커밋 메시지 생성
staged diff를 분석하여 아래 형식의 커밋 메시지를 **자동 생성**한다:

```
type(scope): subject (한국어, 명령형, 72자 이내)

WHY: 변경 이유 한 줄
WHAT:
- 구체적 변경사항 (기능/동작 중심, 파일명 X)

IMPACT: 다른 모듈 영향 (해당 시에만)
```

#### 타입 선택 기준
- 새 기능 → `feat` | 버그 수정 → `fix` | 문서 → `docs`
- 리팩토링 → `refactor` | 성능 → `perf` | 포맷팅 → `style`
- 테스트 → `test` | 빌드/설정 → `chore` | CI/CD → `ci`

#### 스코프 선택 기준
변경된 파일의 주요 영역에 맞는 스코프를 선택:
| Scope | 대상 |
|-------|------|
| `dashboard` | DashboardPage + 차트 |
| `profile` | ProfilePage + 프로필 API |
| `interview` | InterviewPage + 면접 API |
| `roadmap` | RoadmapPage + 로드맵 API |
| `problem` | ProblemPage + 문제 API |
| `companies` | CompaniesPage + 회사 API |
| `analysis` | 갭 분석 파이프라인 |
| `resume` | 이력서 파서 |
| `jd` | JD 스크래퍼 |
| `agent` | LangGraph 에이전트 |
| `auth` | 인증 |
| `api` | API 엔드포인트 일반 |
| `deploy` | 배포 설정 |
| `config` | 프로젝트 설정 |

#### WHY 작성 기준
"이 커밋이 없으면 어떤 문제가 있는가?"에 답하는 한 줄.
- 간단한 변경(오타, import 정렬 등)은 body 없이 subject만 작성해도 됨.

### Step 3: 사용자 확인
생성한 커밋 메시지를 사용자에게 보여주고 AskUserQuestion으로 확인 받는다:
- "이대로 커밋" → 커밋 진행
- "메시지 수정" → 수정 사항 반영
- "커밋 취소" → 중단

### Step 4: 커밋 실행
확인받은 메시지로 `git commit`을 실행한다.
- HEREDOC 형식으로 메시지 전달 (멀티라인 지원)
- 커밋 후 `git log --oneline -1`로 결과 확인
- Co-Authored-By 헤더 추가

## 인자 (선택)
- `$ARGUMENTS`: 커밋 메시지 힌트. 제공 시 이를 참고하여 메시지를 생성한다.
  예: `/commit 면접 음성 녹음 기능` → 이를 바탕으로 적절한 type/scope/body 자동 구성
