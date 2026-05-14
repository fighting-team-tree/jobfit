# Python Environment & Package Management Rules

## 필수 규칙

- Python 패키지 관리는 반드시 `uv`를 사용합니다.
- `pip`, `poetry`를 직접 사용하지 않습니다.
- 의존성은 `pyproject.toml`과 `uv.lock`으로 관리합니다.

## 명령어

```bash
uv sync
uv add <package>
uv remove <package>
uv run python <script.py>
uv run pytest
uv run ruff check server/ tests/
uv run ruff format server/ tests/
```

## 서버 실행

```bash
cd server && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

주의: 이 프로젝트의 FastAPI 엔트리포인트는 `server/main.py`이므로 `app.main:app`이 아니라 `main:app`을 사용합니다.
