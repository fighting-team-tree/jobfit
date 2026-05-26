# JobFit Development Guide (Claude)

Claude AI 어시스턴트를 위한 개발 가이드입니다.

---

## 빠른 시작 명령어

### Backend (FastAPI)
```bash
# 서버 시작 (반드시 server 디렉토리에서!)
cd server && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 의존성 설치
uv sync

# 패키지 추가
uv add <package>

# Playwright 브라우저 설치
uv run playwright install chromium
```

### Frontend (React/Vite)
```bash
# 개발 서버 시작
cd client && npm run dev

# 빌드
cd client && npm run build

# 의존성 설치
cd client && npm install
```

---

## 프로젝트 구조

```
jobfit/
├── server/                 # FastAPI 백엔드
│   ├── main.py             # 엔트리포인트 (여기서 uvicorn 실행)
│   └── app/
│       ├── api/v1/endpoints/
│       │   └── analysis.py # /analyze 관련 엔드포인트
│       └── services/
│           ├── nvidia_service.py        # LLM 연동
│           ├── resume_parser_service.py # 이력서 파싱
│           └── jd_scraper_service.py    # JD 스크래핑
│
├── client/                 # React 프론트엔드
│   └── src/
│       ├── pages/          # 페이지 컴포넌트
│       └── lib/
│           ├── api.ts      # API 클라이언트
│           └── store.ts    # Zustand 스토어
│
├── .agent/                 # AI Agent 공통 기준/메모리
│   └── skills/             # Agent 스킬 정의
│
├── .codex/                 # Codex CLI/앱 전용 규칙/스킬/프롬프트
│   ├── rules/              # 프로젝트 규칙
│   ├── skills/             # Codex 스킬
│   └── prompts/            # 반복 작업 프롬프트
│
└── .claude/                # Claude Code 설정
    ├── commands/           # 슬래시 명령어
    └── rules/              # 프로젝트 규칙
```

---

## 핵심 API 엔드포인트

| Method | Endpoint | 용도 |
|--------|----------|------|
| POST | `/api/v1/auth/google` / `/refresh` | OAuth 로그인 및 토큰 갱신 |
| POST | `/api/v1/analyze/resume/file` | 이력서 파일 파싱 및 분석 |
| POST | `/api/v1/analyze/jd/url` | JD 스크래핑 및 텍스트 정제 |
| POST | `/api/v1/analyze/gap` | 임베딩 기반 갭 분석 및 매칭 |
| GET/PUT | `/api/v1/profile/me` | 프로필 정보 관리 및 DB/데모 폴백 저장 |
| GET/POST| `/api/v1/companies/` | 관심 기업/채용 공고 등록 및 조회 |
| POST | `/api/v1/roadmap/generate` / `/agent` | AI 로드맵 생성 (기본/에이전트) |
| POST | `/api/v1/roadmap/problems/generate` | 주차별 연습 문제 생성 (coding/quiz) |
| POST | `/api/v1/roadmap/evaluate` | 문제 솔루션 채점 및 피드백 |
| GET/POST| `/api/v1/interview/sessions` | 면접 세션 생성 및 조회 |
| WS | `/api/v1/interview/stream` | 실시간 음성 면접 스트림 (ElevenLabs/Deepgram) |

---

## 중요 규칙

### 1. 패키지 관리
- Python: **반드시 `uv` 사용** (pip 금지)
- Node: `npm` 사용

### 2. 서버 실행
⚠️ uvicorn 실행 시 `main:app` 사용 (not `app.main:app`)
```bash
cd server && uv run uvicorn main:app --reload
```

### 3. API 포트
- Backend: 8000
- Frontend: 5173

### 4. 환경 변수
```env
NVIDIA_API_KEY=...
ELEVENLABS_API_KEY=...
```

---

## 갭 분석 아키텍처 (Hybrid Approach)

`nvidia_service.py` (`analyze_gap`):
1. **Extraction (LLM)**: Temperature 0 적용, 스킬 리스트 JSON 추출
2. **Matching (Embedding)**: `skill_matcher_service.py` 사용 (NV-Embed + Cosine Similarity)
3. **Scoring**: 필수(70%) + 우대(30%) 가중치 계산 (결정적 산출)

---

## 현재 구현 상태

프로젝트의 기능별 세부 구현 현황 및 개발 진행 상태는 수시로 갱신되는 아래 메인 메모리 문서를 참조하십시오:
👉 [active_context.md (기능 구현 상태)](file:///c:/Users/fkjy1/dev/Hackathon/jobfit/.agent/memory/active_context.md)

---

## 코드 스타일

### Python (Backend)
- Type hints 사용
- async/await 패턴
- Pydantic 모델로 요청/응답 정의

### TypeScript (Frontend)
- 명시적 타입 선언
- Zustand로 전역 상태 관리
- Tailwind CSS 유틸리티 클래스

---

## 테스트 명령어

```bash
# 이력서 파일 분석 테스트
curl -X POST http://localhost:8000/api/v1/analyze/resume/file \
  -F "file=@data/김테크_이력서.pdf"

# JD 스크래핑 테스트
curl -X POST http://localhost:8000/api/v1/analyze/jd/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/job"}'
```

---

## Claude Code 슬래시 명령어

`.claude/commands/` 디렉토리에 정의된 명령어입니다:

### 서버 관리
| 명령어 | 설명 |
|--------|------|
| `/setup` | 프로젝트 초기 설정 (환경변수, 의존성) |
| `/start-server` | Backend 서버 시작 (port 8000) |
| `/start-client` | Frontend 개발 서버 시작 (port 5173) |

### API 테스트
| 명령어 | 설명 |
|--------|------|
| `/test-resume` | 이력서 분석 API 테스트 |
| `/test-jd` | JD 스크래핑 테스트 |
| `/gap-analysis` | 갭 분석 실행 |
| `/company-analyze` | 회사별 매칭 분석 (Claude Agent) |

### 학습 & GitHub
| 명령어 | 설명 |
|--------|------|
| `/roadmap` | 학습 로드맵 생성 |
| `/git-push` | GitHub 솔루션 푸시 |

### 개발 도구
| 명령어 | 설명 |
|--------|------|
| `/commit` | LLM-Optimized 커밋 생성 (보안/원자성 검사 + WHY/WHAT/IMPACT) |
| `/lint` | 코드 린트 검사 (ESLint, Ruff) |

---

## Claude Code 규칙 (Rules)

`.claude/rules/` 디렉토리에 정의된 규칙입니다:

| 파일 | 내용 |
|------|------|
| `00-multi-tool-sync.md` | AI 툴 동기화 규칙 |
| `01-korean.md` | 한국어 우선 커뮤니케이션 |
| `02-python-uv.md` | Python uv 패키지 관리 필수 |
| `03-git-convention.md` | LLM-Optimized WHY/WHAT/IMPACT 커밋 컨벤션 |
| `04-security.md` | PII 마스킹, API 키 보안 |
| `05-project-structure.md` | 디렉토리 구조 및 핵심 파일 |

---

## Claude Agent 아키텍처

`server/app/agents/` 디렉토리의 LangGraph 기반 에이전트:

### JobMatchingAgent
```
JD 분석 → 스킬 추출 → 스킬 매칭 → 점수 계산
```
- 모델: `claude-sonnet-4-20250514`
- 점수: 필수(70%) + 우대(20%) + 경험(10%)

### RoadmapAgent
```
부족 스킬 → 주차별 계획 → 문제 생성 → 솔루션
```

### ProblemGenerator
```
주차 계획 → 연습 문제 (coding/quiz/practical)
```
