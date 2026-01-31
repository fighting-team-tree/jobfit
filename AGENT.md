# JobFit Agent Guide

This file serves as a context provider for AI coding assistants (Codex, etc).

## Project Overview
- **Name:** JobFit
- **Goal:** AI-powered resume analysis and real-time voice interview practice.
- **Key Tech:** NVIDIA NIM (VLM), ElevenLabs (Voice), FastAPI, React.

## Operation Manual

### 1. Backend (Python/FastAPI)
- **Package Manager:** `uv` (Strictly required).
- **Run Command:** `uv run uvicorn server.main:app --reload --port 8000`
- **Config:** `pyproject.toml` defines dependencies. `server/app/core/config.py` loads env vars.
- **Port:** 8000

### 2. Frontend (React/Vite)
- **Package Manager:** `npm`
- **Run Command:** `cd client && npm run dev`
- **Config:** `vite.config.ts`, `tailwind.config.js`.
- **Port:** 5173 (default)

## Agent Rules (Antigravity)
- **Rules Location:** `.agent/rules/`
- **Context:** `.agent/memory/active_context.md`
- **Skills:** `.agent/skills/` (NVIDIA Parser, ElevenLabs Voice, Git Analyzer)

## Critical Constraints
- **Replit:** No Docker. Bind to 0.0.0.0.
- **Security:** Mask PII before sending to LLM.
