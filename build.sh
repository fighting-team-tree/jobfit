#!/bin/bash

# JobFit Replit 빌드 스크립트 (배포 빌드 단계에서 실행)

set -e

echo "📦 Frontend 빌드 중..."
cd client
npm install
npm run build
cd ..

echo "📦 Backend 의존성 설치 중..."
cd server
uv sync
cd ..

echo "🌐 Playwright 브라우저 설치 중..."
cd server
uv run playwright install chromium
cd ..

echo "✅ 빌드 완료"
