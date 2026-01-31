# JobFit Development Guide

## Commands

### Backend (Server)
- **Start Server:** `uv run uvicorn server.main:app --reload --port 8000`
- **Install Deps:** `uv sync`
- **Add Dep:** `uv add <package>`
- **Lint/Format:** `uv run ruff check .` (if installed) or standard python tools.

### Frontend (Client)
- **Start Dev Server:** `cd client && npm run dev`
- **Build:** `cd client && npm run build`
- **Install Deps:** `cd client && npm install`

## Architecture
- **Backend:** FastAPI (Python 3.12) managed by `uv`.
- **Frontend:** React + Vite + Tailwind CSS.
- **Agent:** Check `.agent/` folder for rules, memory, and skills.

## Structure
- `server/`: Backend code.
- `client/`: Frontend code.
- `.agent/`: AI Agent context.
