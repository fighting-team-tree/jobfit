# Backend 서버 시작

FastAPI 백엔드 개발 서버를 시작합니다.

## 실행 명령어
```bash
cd server && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 확인 사항
- 서버가 http://localhost:8000 에서 실행됩니다
- API 문서: http://localhost:8000/docs
- `.env` 파일에 필요한 API 키가 설정되어 있는지 확인하세요:
  - `NVIDIA_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `ELEVENLABS_API_KEY`
