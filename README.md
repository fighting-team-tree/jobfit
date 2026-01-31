# JobFit 🎯

**AI 기반 이력서 분석 및 채용공고 매칭 시스템**

취업 준비생과 이직자를 위한 AI 기반 역량 분석 및 갭 분석 플랫폼입니다. 이력서를 업로드하고 채용공고 URL을 입력하면, 부족한 역량을 파악하고 맞춤형 학습 로드맵을 제공합니다.

---

## ✨ 주요 기능

### 1. 이력서 분석 (Resume Parsing)
- **PDF/이미지 업로드**: PDF, PNG, JPG 형식 지원
- **NVIDIA VLM 기반 파싱**: Llama-3.2-90B Vision 모델로 구조화된 JSON 추출
- **PII 마스킹**: 이메일, 전화번호 자동 마스킹 처리

### 2. 채용공고 스크래핑 (JD Scraping)
- **URL 자동 파싱**: 채용공고 URL 입력 시 자동 JD 추출
- **2단계 스크래핑**: httpx → Playwright 폴백 (JS 렌더링 지원)
- **지원 사이트**: 원티드, 로켓펀치, 토스, 네이버 등 대부분 채용 사이트

### 3. 갭 분석 (Gap Analysis)
- **필수/우대 요건 분리**: JD에서 필수 및 우대 요건 자동 추출
- **가중치 기반 점수**: 필수 70% + 우대 30% 가중치 적용
- **1:1 스킬 매칭**: 정확한 역량 매칭 및 누락 스킬 식별

### 4. 학습 로드맵 (Roadmap) - 진행 중
- **주차별 학습 계획**: 부족한 스킬에 대한 주차별 학습 계획
- **할일 목록**: 구체적인 학습 태스크 제공

### 5. AI 면접 연습 (Interview) - 진행 중
- **실시간 음성 면접**: ElevenLabs WebSocket 기반 음성 인터페이스
- **맞춤형 질문 생성**: 프로필 + JD 기반 면접 질문 자동 생성

---

## 🏗️ 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | FastAPI, Python 3.12, uv (패키지 관리) |
| **AI/ML** | NVIDIA NIM (Llama-3.1-70B, Llama-3.2-90B Vision) |
| **Web Scraping** | httpx, BeautifulSoup4, Playwright |
| **Voice** | ElevenLabs WebSocket API |
| **Deployment** | Replit (Docker 미사용) |

---

## 🚀 로컬 개발 환경 설정

### 사전 요구사항
- Python 3.12+
- Node.js 18+
- uv (Python 패키지 매니저)

### 1. 환경 변수 설정
```bash
cp .env.example .env
```

`.env` 파일에 다음 키 설정:
```env
NVIDIA_API_KEY=your_nvidia_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### 2. Backend 설정
```bash
# 의존성 설치
uv sync

# Playwright 브라우저 설치 (JD 스크래핑용)
uv run playwright install chromium

# 서버 시작
cd server && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend 설정
```bash
cd client
npm install
npm run dev
```

### 4. 접속
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📁 프로젝트 구조

```
jobfit/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/     # 재사용 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── lib/            # API 클라이언트, 스토어
│   │   └── App.tsx
│   └── package.json
│
├── server/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── api/v1/         # API 라우터
│   │   ├── services/       # 비즈니스 로직
│   │   │   ├── nvidia_service.py       # NVIDIA LLM 연동
│   │   │   ├── resume_parser_service.py # 이력서 파싱
│   │   │   └── jd_scraper_service.py   # JD 스크래핑
│   │   └── core/           # 설정
│   └── main.py
│
├── data/                   # 샘플 데이터
├── .agent/                 # AI Agent 컨텍스트
│   ├── skills/             # Agent 스킬
│   ├── rules/              # Agent 규칙
│   └── workflows/          # 워크플로우
│
├── pyproject.toml          # Python 의존성
└── README.md
```

---

## 🔌 API 엔드포인트

### Analysis API (`/api/v1/analyze`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/resume` | 텍스트 이력서 분석 |
| POST | `/resume/file` | 파일(PDF/이미지) 이력서 분석 |
| POST | `/jd/url` | URL에서 JD 스크래핑 |
| POST | `/gap` | 프로필 vs JD 갭 분석 |
| POST | `/github` | GitHub 프로필 분석 |

### Roadmap API (`/api/v1/roadmap`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/generate` | 학습 로드맵 생성 |
| POST | `/complete/{todo_id}` | 할일 완료 처리 |

### Interview API (`/api/v1/interview`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/question` | 면접 질문 생성 |
| WebSocket | `/ws/voice` | 실시간 음성 인터페이스 |

---

## 🧪 테스트

### Backend API 테스트
```bash
# 이력서 파일 분석
curl -X POST http://localhost:8000/api/v1/analyze/resume/file \
  -F "file=@resume.pdf"

# JD URL 스크래핑
curl -X POST http://localhost:8000/api/v1/analyze/jd/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://careers.upstage.ai/o/ai-agent-engineer?lang=ko"}'

# 갭 분석
curl -X POST http://localhost:8000/api/v1/analyze/gap \
  -H "Content-Type: application/json" \
  -d '{"profile": {...}, "jd_text": "..."}'
```

---

## 📄 라이선스

MIT License

---

## 🙏 기여

Pull Request와 Issue를 환영합니다!