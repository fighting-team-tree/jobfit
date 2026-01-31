#!/bin/bash

# JobFit Replit 시작 스크립트

set -e

echo "🚀 JobFit 배포 시작..."

# 1. Frontend 빌드
echo "📦 Frontend 빌드 중..."
cd client
npm install
npm run build
cd ..

# 2. Backend 의존성 설치
echo "📦 Backend 의존성 설치 중..."
cd server
uv sync

# 3. Backend 서버 시작 (프론트엔드 정적 파일 서빙 포함)
echo "🌐 서버 시작 중... (port 8000)"
uv run uvicorn main:app --host 0.0.0.0 --port 8000
