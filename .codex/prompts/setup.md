# Setup Prompt

JobFit 개발 환경을 준비한다.

```bash
uv sync
npm --prefix client install
uv run playwright install chromium
cp .env.example .env
```

`.env` 값은 사용자가 직접 채워야 하며, secret 원문을 출력하거나 커밋하지 않는다.
