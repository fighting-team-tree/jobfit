---
name: replit-best-practices
description: Replit 환경에서 프로젝트를 성공적으로 실행하고 패키지를 관리하기 위한 베스트 프랙티스. Replit 관련 에러 발생 시 참고할 것.
---

# Replit Best Practices

이 스킬은 JobFit 프로젝트가 현재 Replit 환경에서 동작하고 있음을 고려하여, 에러 해결 및 최적화를 위해 활용해야 합니다.

## 1. Network Binding (네트워크 바인딩)
- **Host**: 모든 서버(FastAPI, Vite 등)는 반드시 `0.0.0.0` (Host)에 바인딩되어야 합니다.
- **Why**: `127.0.0.1`이나 `localhost`에 바인딩하면 외부(인터넷)에서 접근이 불가능하여 Web Preview가 동작하지 않습니다.

## 2. Package Management (패키지 관리)
- **System Packages**: `replit.nix` 파일에서 관리해야 합니다. 새로운 시스템 도구(예: ffmpeg)가 필요하다면 `replit.nix`에 추가하세요.
- **Python**: `uv`를 통해 관리 중입니다. 새로운 의존성은 `pyproject.toml`에 반영하고 `uv sync`를 실행하세요.

## 3. Storage & State (저장소 상태)
- Replit의 임시 파일 시스템(ephemeral storage)은 영구적이지 않을 수 있으므로, 실제 서비스 시 데이터베이스(PostgreSQL)를 적극 활용해야 합니다.
- 서버가 재시작되어도 유지되어야 할 파일은 명시적인 데이터베이스나 외부 스토리지에 업로드해야 합니다.

## 4. Docker (미래 대비)
- 현재 실행 환경은 Replit 기반이지만, 미래를 위해 코드베이스에 `Dockerfile`과 `docker-compose.yml` 뼈대를 작성할 수 있습니다. 
- 단, 현재의 Replit 실행은 여전히 `run` 커맨드(보통 `replit.nix` 및 `.replit` 설정) 기반으로 이루어짐을 명심하세요.
