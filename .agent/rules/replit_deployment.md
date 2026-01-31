# Replit Deployment Rules

## 1. No Dockerfiles
- Deployment target is **Replit Reserved VM**.
- Dockerfiles are **NOT allowed**.
- All system dependencies must be managed via `replit.nix`.

## 2. Network Binding
- All servers (FastAPI, Vite, etc.) must bind to `0.0.0.0` (Host).
- **DO NOT** bind to `127.0.0.1` or `localhost` as they will not be accessible externally.
- Port configuration should be flexible or strictly defined in `.replit`.

## 3. Package Management
- System packages: Use `replit.nix`.
- Python packages: Use `requirements.txt` or `pyproject.toml` (poetry/uv).
- Node packages: Use `package.json` (npm/yarn/pnpm/bun).

## 4. File Storage
- No ephemeral file storage for persistent data.
- Use `replitdb` or `sqlite` for session data.
- Logs should be streamed to stdout/stderr.
