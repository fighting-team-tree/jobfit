# JobFit Agent Guide

AI 코딩 어시스턴트(Gemini, Codex 등)를 위한 프로젝트 컨텍스트 파일입니다.

---

## Project Overview

| 항목 | 내용 |
|------|------|
| **Name** | JobFit |
| **Goal** | AI 기반 이력서 분석, 채용공고 매칭, 갭 분석, 면접 연습 |
| **Stage** | MVP 개발 중 (Hackathon Project) |

---

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.12)
- **Package Manager**: `uv` (필수!)
- **AI/ML**: NVIDIA NIM (Llama-3.1-70B, Llama-3.2-90B Vision)
- **Web Scraping**: httpx, BeautifulSoup4, Playwright

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State**: Zustand

---

## Operation Manual

### Backend 실행
```bash
cd server
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> ⚠️ **주의**: `app.main:app`이 아닌 `main:app` 사용

### Frontend 실행
```bash
cd client
npm run dev
```

### Playwright 브라우저 설치 (JD 스크래핑용)
```bash
uv run playwright install chromium
```

---

## 핵심 서비스 파일

| 파일 | 역할 |
|------|------|
| `server/app/services/nvidia_service.py` | NVIDIA LLM 연동, 갭 분석 |
| `server/app/services/resume_parser_service.py` | 이력서 파싱 (VLM) |
| `server/app/services/jd_scraper_service.py` | JD URL 스크래핑 |
| `server/app/api/v1/endpoints/analysis.py` | 분석 API 엔드포인트 |

---

## Agent 관련 파일

| 경로 | 용도 |
|------|------|
| `.agent/rules/` | Agent 규칙 및 지침 |
| `.agent/skills/` | Agent 스킬 (NVIDIA Parser, ElevenLabs Voice 등) |
| `.agent/workflows/` | 워크플로우 정의 |
| `.agent/memory/` | 컨텍스트 메모리 |

---

## API 엔드포인트 요약

### 분석 API (`/api/v1/analyze`)
- `POST /resume` - 텍스트 이력서 분석
- `POST /resume/file` - 파일 이력서 분석 (PDF/PNG/JPG)
- `POST /jd/url` - URL에서 JD 스크래핑
- `POST /gap` - 갭 분석 (프로필 vs JD)
- `POST /github` - GitHub 프로필 분석

### 로드맵 API (`/api/v1/roadmap`)
- `POST /generate` - 학습 로드맵 생성
- `POST /complete/{todo_id}` - 할일 완료

### 면접 API (`/api/v1/interview`)
- `POST /question` - 면접 질문 생성
- `WebSocket /ws/voice` - 실시간 음성

---

## Critical Constraints

1. **Replit 배포**: Docker 미사용, `0.0.0.0` 바인딩 필수
2. **보안**: LLM 전송 전 PII 마스킹 (이메일, 전화번호)
3. **패키지 관리**: Python은 반드시 `uv` 사용 (pip 금지)

---

## 갭 분석 점수 계산 공식

```
필수 점수 = (충족한 필수 요건 / 전체 필수 요건) × 70점
우대 점수 = (충족한 우대 요건 / 전체 우대 요건) × 30점
총점 = 필수 점수 + 우대 점수
```

---

## 현재 구현 상태

- [x] 이력서 파싱 (텍스트/파일)
- [x] JD URL 스크래핑 (httpx + Playwright)
- [x] 갭 분석 (가중치 기반)
- [ ] 학습 로드맵 생성 (진행 중)
- [ ] AI 면접 연습 (진행 중)
- [ ] GitHub 프로필 분석 (기본 구현)
