# Python Environment & Package Management Rules

## 1. Package Manager: `uv` (Strict)
- All Python package management MUST be done using **`uv`**.
- Do NOT use `pip` or `poetry` directly unless absolutely necessary.
- **Why?** `uv` is significantly faster (written in Rust) and provides reliable dependency resolution.

## 2. Configuration File: `pyproject.toml`
- Dependencies must be defined in `pyproject.toml`.
- Do NOT use `requirements.txt` for defining primary dependencies (uv can generate it if needed for deployment).

## 3. Workflow
- **Add Dependency:** `uv add <package_name>`
- **Remove Dependency:** `uv remove <package_name>`
- **Sync Environment:** `uv sync`
- **Run Scripts:** `uv run python server/main.py`

## 4. Virtual Environment
- `uv` automatically manages the virtual environment in `.venv`.
- Ensure `.venv` is in `.gitignore`.
