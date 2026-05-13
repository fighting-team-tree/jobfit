# 기본 이미지 설정 (Python 3.12 기반)
FROM python:3.12-slim

# 환경 변수 설정
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_SYSTEM_PYTHON=1

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 설치 (필요한 경우)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# uv 설치
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="/usr/local/bin" sh

# 의존성 파일 복사 (캐시 활용을 위해 먼저 복사)
COPY pyproject.toml uv.lock ./

# 의존성 설치
RUN uv sync --no-dev

# Playwright 설치 (JD 스크래핑용)
RUN uv run playwright install chromium
RUN uv run playwright install-deps chromium

# 소스 코드 복사
COPY server /app/server
COPY data /app/data

# 작업 디렉토리 변경
WORKDIR /app/server

# 포트 노출
EXPOSE 8000

# 실행 명령
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
