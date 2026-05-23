#!/bin/bash

# JobFit Replit 시작 스크립트 (서버만 시작)

set -e

echo "🌐 서버 시작 중... (port 8000)"
cd server
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --loop asyncio
