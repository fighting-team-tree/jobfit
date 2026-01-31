# 프로젝트 초기 설정

JobFit 프로젝트를 처음 설정할 때 필요한 단계입니다.

## 1. 환경 변수 설정
```bash
cp .env.example .env
```

`.env` 파일에 다음 API 키 설정:
```env
NVIDIA_API_KEY=your_nvidia_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

## 2. Backend 설정
```bash
# 의존성 설치
uv sync

# Playwright 브라우저 설치 (JD 스크래핑용)
uv run playwright install chromium
```

## 3. Frontend 설정
```bash
cd client
npm install
```

## 4. 서버 시작
```bash
# 터미널 1: Backend
cd server && uv run uvicorn main:app --reload --port 8000

# 터미널 2: Frontend
cd client && npm run dev
```

## 5. 접속
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
