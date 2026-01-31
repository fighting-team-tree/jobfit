---
description: Check deployment readiness before pushing to Replit or Production.
---

# Deployment Readiness Check

Perform these checks to ensure the application is ready for deployment.

## 1. System Dependencies
- [ ] Check `replit.nix` for required packages:
  ```bash
  cat replit.nix | grep -E "uv|ffmpeg|portaudio"
  ```

## 2. Environment Variables
- [ ] Verify Secrets in Replit (cannot check via code, verify manually):
  - `OPENAI_API_KEY`
  - `NVIDIA_API_KEY`
  - `ELEVENLABS_API_KEY`

## 3. Build & Test
- [ ] Run Backend Smoke Test (if server running):
  ```bash
  uv run curl http://localhost:8000/docs
  ```
- [ ] Build Frontend:
  ```bash
  cd client && npm run build
  ```
