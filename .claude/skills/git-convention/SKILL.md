# Git Convention Skill - LLM-Optimized Commit Messages

JobFit 프로젝트의 LLM 친화적 커밋 메시지 컨벤션 상세 가이드.
`git log`를 읽고 코드베이스 히스토리를 빠르게 이해할 수 있는 구조화된 형식.

---

## 1. 커밋 메시지 형식

### 전체 구조
```
type(scope): subject

WHY: 변경 이유 한 줄
WHAT:
- 구체적 변경사항 1
- 구체적 변경사항 2

IMPACT: 파괴적 변경/부수효과
Refs: #이슈번호
```

### Subject 라인 규칙
- **형식**: `type(scope): 한국어 명령형 설명`
- **길이**: 72자 이내 (터미널 호환)
- **마침표 없음**
- **명령형 사용**: "추가", "수정", "개선" (O) / "추가함", "수정했음" (X)

### WHY (필수 - body 작성 시)
- "이 커밋이 없으면 어떤 문제가 있는가?"에 답하는 **한 줄**
- LLM이 변경 동기를 즉시 파악할 수 있게 작성
- 예시: `WHY: 대용량 PDF 업로드 시 타임아웃 발생`

### WHAT (필수 - body 작성 시)
- **파일명이 아닌** 기능/동작 변경 중심으로 기술
- 불릿 리스트 형식 (`-` 사용)
- 예시:
  ```
  WHAT:
  - 청크 기반 스트리밍 파싱으로 전환
  - 진행률 콜백 추가
  ```
- 나쁜 예시:
  ```
  WHAT:
  - resume_parser_service.py 수정
  - api.ts 업데이트
  ```

### IMPACT (선택 - 해당 시에만)
- 다른 모듈에 영향을 주는 변경사항만 작성
- 파괴적 변경(breaking change), API 변경, DB 스키마 변경 등
- 예시: `IMPACT: /api/v1/analyze/resume 응답 스키마 변경 - 프론트엔드 업데이트 필요`

### Refs (선택)
- 관련 이슈 번호: `Refs: #123`
- 여러 이슈: `Refs: #123, #456`

---

## 2. 타입 상세 가이드

### feat - 새로운 기능
사용자가 인지할 수 있는 새로운 기능 추가.
```
# 좋은 예
feat(interview): 실시간 음성 녹음 기능 추가
feat(dashboard): 스킬 매칭 레이더 차트 추가

# 나쁜 예
feat(interview): 파일 변경  (너무 모호)
feat: 업데이트  (스코프 없음, 의미 없음)
```

### fix - 버그 수정
기존 기능의 잘못된 동작을 바로잡는 변경.
```
# 좋은 예
fix(resume): PDF 파싱 시 한글 인코딩 깨짐 수정
fix(api): 라우팅 충돌로 인한 404 에러 수정

# 나쁜 예
fix: 버그 수정  (어떤 버그인지 알 수 없음)
fix(resume): 수정  (무엇을 수정했는지 없음)
```

### refactor - 리팩토링
기능 변경 없이 코드 구조 개선.
```
# 좋은 예
refactor(agent): MatchingAgent 싱글톤 패턴으로 전환
refactor(analysis): 스킬 매칭 로직을 별도 서비스로 분리

# 나쁜 예
refactor: 코드 정리  (무엇을 어떻게?)
```

### perf - 성능 개선
측정 가능한 성능 향상.
```
# 좋은 예
perf(analysis): 임베딩 캐시로 중복 API 호출 제거
perf(jd): 스크래핑 결과 인메모리 캐시 추가

# 나쁜 예
perf: 속도 개선  (무엇의 속도?)
```

### docs - 문서 수정
```
docs(config): CLAUDE.md 커밋 컨벤션 설명 업데이트
docs(api): API 엔드포인트 문서 추가
```

### style - 포맷팅
코드 동작에 영향 없는 포맷팅 변경.
```
style(dashboard): ESLint 경고 수정
style(api): import 정렬
```

### test - 테스트
```
test(resume): PDF 파싱 유닛 테스트 추가
test(analysis): 갭 분석 통합 테스트 보강
```

### chore - 빌드/설정
```
chore(config): ESLint strict 모드 설정
chore(deploy): Replit 빌드 스크립트 추가
```

### ci - CI/CD
```
ci(deploy): GitHub Actions 워크플로우 추가
ci(config): 린트 검사 pre-commit 훅 설정
```

---

## 3. 스코프 매핑 테이블

| Scope | 디렉토리/파일 | 예시 커밋 |
|-------|-------------|---------|
| `dashboard` | `client/src/pages/DashboardPage.tsx`, 차트 컴포넌트 | `feat(dashboard): 레이더 차트 추가` |
| `profile` | `client/src/pages/ProfilePage.tsx`, 프로필 API | `fix(profile): 저장 debounce 수정` |
| `interview` | `client/src/pages/InterviewPage.tsx`, interview API, TTS/STT 훅 | `feat(interview): 음성 녹음 추가` |
| `roadmap` | `client/src/pages/RoadmapPage.tsx`, roadmap API/에이전트 | `feat(roadmap): 주차별 계획 생성` |
| `problem` | `client/src/pages/ProblemPage.tsx`, problem API/에이전트 | `feat(problem): Monaco Editor 연동` |
| `companies` | `client/src/pages/CompaniesPage.tsx`, companies API | `feat(companies): 회사 목록 CRUD` |
| `analysis` | `server/app/services/nvidia_service.py`, `skill_matcher_service.py` | `feat(analysis): 임베딩 매칭 개선` |
| `resume` | `server/app/services/resume_parser_service.py` | `fix(resume): PDF 파싱 에러 처리` |
| `jd` | `server/app/services/jd_scraper_service.py` | `feat(jd): Playwright 폴백 추가` |
| `agent` | `server/app/agents/` | `feat(agent): UnifiedMatchingAgent 구현` |
| `auth` | `client/src/components/auth/`, 인증 관련 | `feat(auth): Replit 인증 연동` |
| `api` | `server/app/api/v1/endpoints/` 일반 | `fix(api): 라우팅 수정` |
| `deploy` | 배포 설정 파일 (Dockerfile, replit.nix 등) | `feat(deploy): Replit 배포 설정` |
| `config` | 프로젝트 설정 (eslint, tsconfig, pyproject 등) | `chore(config): ESLint 설정 추가` |

### 스코프 선택 기준
- **단일 영역**: 해당 스코프 사용 → `feat(dashboard): ...`
- **여러 영역**: 가장 핵심 스코프 사용 → `feat(analysis): ...`
- **프로젝트 전반**: 스코프 생략 가능 → `chore: 의존성 업데이트`

---

## 4. 좋은 예시 (실제 프로젝트 맥락)

### 예시 1: 기능 추가
```
feat(interview): ElevenLabs 기반 실시간 음성 면접 추가

WHY: 텍스트 기반 면접만으로는 실제 면접 경험을 시뮬레이션할 수 없음
WHAT:
- ElevenLabs Conversational AI WebSocket 연동
- useElevenLabsConversation 훅 구현
- 면접 시작/종료/재시작 UI 플로우 구현
- 음성 녹음 및 STT 변환 파이프라인 추가

IMPACT: InterviewPage 전체 리디자인, elevenlabs_service.py 신규 추가
```

### 예시 2: 버그 수정
```
fix(resume): 대용량 PDF 업로드 시 타임아웃 수정

WHY: 5MB 이상 PDF 파일에서 30초 타임아웃 발생
WHAT:
- 청크 기반 스트리밍 파싱으로 전환
- 타임아웃 300초로 상향 조정
- 진행률 콜백 추가
```

### 예시 3: 리팩토링
```
refactor(analysis): 갭 분석을 하이브리드 매칭으로 전환

WHY: LLM 단독 매칭의 비결정적 결과로 점수 일관성 부족
WHAT:
- Phase 1: LLM으로 스킬 추출 (temperature=0)
- Phase 2: NV-Embed 임베딩으로 코사인 유사도 매칭
- 필수(70%)+우대(30%) 가중치 기반 결정적 점수 산출

IMPACT: /api/v1/analyze/gap 응답 스키마 변경
```

### 예시 4: 성능 개선
```
perf(jd): JD 스크래핑 속도 3배 개선

WHY: httpx 단독 사용 시 JS 렌더링 필요 사이트에서 실패
WHAT:
- httpx 우선 시도 후 실패 시 Playwright 폴백 전략 적용
- 성공 결과 인메모리 캐시 추가 (TTL 1시간)
```

### 예시 5: 설정 변경
```
chore(deploy): Replit 배포 환경 설정

WHY: 해커톤 데모를 위한 원클릭 배포 필요
WHAT:
- replit.nix에 Python/Node 런타임 설정
- .replit 빌드 및 실행 명령 정의
- SPA 라우팅용 정적 파일 서빙 설정
```

---

## 5. 나쁜 예시

### 나쁜 예시 1: 모호한 메시지
```
# BAD
fix: 수정

# GOOD
fix(resume): PDF 파싱 시 한글 인코딩 깨짐 수정
```

### 나쁜 예시 2: 스코프 누락
```
# BAD
feat: 차트 추가

# GOOD
feat(dashboard): 스킬 매칭 레이더 차트 추가
```

### 나쁜 예시 3: 파일명 나열
```
# BAD
WHAT:
- nvidia_service.py 수정
- api.ts 변경
- store.ts 업데이트

# GOOD
WHAT:
- 갭 분석에 임베딩 매칭 단계 추가
- 프론트엔드 API 클라이언트에 새 엔드포인트 연동
- 분석 결과 캐시 스토어 추가
```

### 나쁜 예시 4: 여러 기능을 한 커밋에
```
# BAD
feat: 면접 페이지 추가 및 로드맵 수정 및 버그 수정

# GOOD (3개 커밋으로 분리)
feat(interview): 면접 페이지 기본 레이아웃 구현
fix(roadmap): 주차 계산 오프바이원 에러 수정
fix(dashboard): 차트 데이터 로딩 스피너 누락 수정
```

### 나쁜 예시 5: WHY 없는 body
```
# BAD
refactor(agent): 에이전트 리팩토링

- 코드 정리
- 구조 변경

# GOOD
refactor(agent): MatchingAgent 싱글톤 패턴으로 전환

WHY: 매 요청마다 에이전트 인스턴스 생성으로 메모리 누수 발생
WHAT:
- 전역 싱글톤 인스턴스로 전환
- get_agent() 팩토리 함수 추가
```

---

## 6. LLM 파싱 가이드

### Subject 라인 정규식
```regex
^(feat|fix|docs|style|refactor|perf|test|chore|ci)(\([\w-]+\))?: .+$
```

### 구조화된 body 파싱
```regex
WHY: (.+)
WHAT:\n((?:- .+\n?)+)
(?:IMPACT: (.+)\n)?
(?:Refs: (.+))?
```

### Python 파싱 예시
```python
import re

def parse_commit(message: str) -> dict:
    lines = message.strip().split('\n')
    subject = lines[0]

    # Subject 파싱
    m = re.match(r'^(\w+)(?:\(([^)]+)\))?: (.+)$', subject)
    result = {
        'type': m.group(1) if m else None,
        'scope': m.group(2) if m else None,
        'subject': m.group(3) if m else subject,
        'why': None,
        'what': [],
        'impact': None,
        'refs': None,
    }

    body = '\n'.join(lines[1:])

    # WHY
    why_match = re.search(r'WHY: (.+)', body)
    if why_match:
        result['why'] = why_match.group(1)

    # WHAT
    what_match = re.findall(r'- (.+)', body.split('IMPACT:')[0] if 'IMPACT:' in body else body)
    result['what'] = what_match

    # IMPACT
    impact_match = re.search(r'IMPACT: (.+)', body)
    if impact_match:
        result['impact'] = impact_match.group(1)

    # Refs
    refs_match = re.search(r'Refs: (.+)', body)
    if refs_match:
        result['refs'] = refs_match.group(1)

    return result
```

---

## 7. 특수 케이스

### Subject만 작성 (축약형)
간단한 변경은 body 없이 subject만 작성 가능. 기존 `type: subject` 형식도 허용.
```
fix(dashboard): 차트 색상 상수 오타 수정
chore(config): .gitignore에 .env.local 추가
style(api): import 정렬
```

### Merge 커밋
```
merge: feature/interview을 dev에 병합

WHY: 음성 면접 기능 개발 완료
WHAT:
- ElevenLabs TTS/STT 연동
- InterviewPage UI 구현
- 면접 API 엔드포인트 추가
```

### Revert 커밋
```
revert: feat(interview) 음성 녹음 기능 롤백

WHY: ElevenLabs API 할당량 초과로 프로덕션 장애
WHAT:
- useAudioRecorder 훅 비활성화
- 텍스트 기반 면접으로 폴백
Refs: #45
```

### 다중 스코프
하나의 커밋이 여러 영역에 걸칠 때는 **가장 핵심 스코프**를 선택.
```
# interview가 핵심이고 api는 부수적일 때
feat(interview): WebSocket 기반 실시간 면접 구현

WHY: ...
WHAT:
- InterviewPage에 WebSocket 클라이언트 추가
- /api/v1/interview/ws 엔드포인트 추가  ← api 범위이지만 interview가 핵심
```

---

## 8. 브랜치 전략

| 브랜치 | 용도 | 네이밍 예시 |
|--------|------|-----------|
| `main` | 프로덕션 릴리즈 | - |
| `dev` | 통합/테스트 | - |
| `feature/*` | 기능 개발 | `feature/interview-voice` |
| `fix/*` | 버그 수정 | `fix/resume-encoding` |
| `hotfix/*` | 긴급 수정 (main 직접) | `hotfix/api-timeout` |
| `merge/*` | 브랜치 병합 작업 | `merge/meet-into-dev` |

### 브랜치 → 커밋 스코프 매핑
- `feature/interview-voice` → 커밋은 `feat(interview): ...`
- `fix/resume-encoding` → 커밋은 `fix(resume): ...`
