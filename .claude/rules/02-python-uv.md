# Python 환경 & 패키지 관리 규칙

## 1. 패키지 관리자: `uv` (필수)
- 모든 Python 패키지 관리는 반드시 **`uv`** 사용
- `pip`, `poetry` 직접 사용 금지
- **이유**: Rust 기반으로 빠르고 안정적인 의존성 해결

## 2. 설정 파일: `pyproject.toml`
- 의존성은 `pyproject.toml`에 정의
- `requirements.txt`는 배포용으로만 생성

## 3. 주요 명령어
```bash
# 의존성 추가
uv add <package_name>

# 의존성 제거
uv remove <package_name>

# 환경 동기화
uv sync

# 스크립트 실행
uv run python server/main.py

# 서버 시작
cd server && uv run uvicorn main:app --reload --port 8000
```

## 4. 가상환경
- `uv`가 `.venv`에서 자동 관리
- `.venv`는 `.gitignore`에 포함
