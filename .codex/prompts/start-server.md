# Start Server Prompt

FastAPI 개발 서버를 실행한다.

```bash
cd server && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

주의: `server/main.py` 기준이므로 `main:app`을 사용한다.
