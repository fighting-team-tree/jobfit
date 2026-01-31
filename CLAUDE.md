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
└── .agent/                 # AI Agent 설정
    └── skills/             # Agent 스킬 정의
```

---

## 핵심 API 엔드포인트

| Method | Endpoint | 용도 |
|--------|----------|------|
| POST | `/api/v1/analyze/resume` | 텍스트 이력서 분석 |
| POST | `/api/v1/analyze/resume/file` | 파일 이력서 분석 |
| POST | `/api/v1/analyze/jd/url` | URL에서 JD 스크래핑 |
| POST | `/api/v1/analyze/gap` | 갭 분석 |

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

### ✅ 완료
- 이력서 파싱 (텍스트, PDF, 이미지)
- JD URL 스크래핑 (httpx + Playwright 폴백)
- 갭 분석 (가중치 기반 점수)
- 기본 UI (Dashboard, Profile 페이지)

### 🔄 진행 중
- 학습 로드맵 생성
- AI 면접 연습 (음성)
- GitHub 프로필 분석

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
