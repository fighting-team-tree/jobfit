.PHONY: dev lint format test serve client

# Install all dev dependencies
dev:
	uv sync --all-groups

# Lint check (no auto-fix)
lint:
	uv run ruff format --check server/ tests/
	uv run ruff check server/ tests/

# Auto-format + auto-fix
format:
	uv run ruff format server/ tests/
	uv run ruff check --fix server/ tests/

# Run tests with coverage
test:
	uv run pytest

# Start backend server
serve:
	cd server && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Start frontend dev server
client:
	cd client && npm run dev
