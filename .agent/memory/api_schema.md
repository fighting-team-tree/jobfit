# API Schema Snapshot

## Overview
- Base URL: `/api/v1`
- FastAPI router prefix: `settings.API_V1_STR`
- Frontend dev default: `http://localhost:8000/api/v1`

## Auth API (`/auth`)
- `GET /auth/me`: 현재 인증 상태 확인
- `GET /auth/login/google`: Google OAuth 로그인 시작
- `GET /auth/callback/google`: Google OAuth callback 처리 및 JWT 발급

## Analysis API (`/analyze`)
- `GET /analyze/`: 분석 모듈 health check
- `GET /analyze/fixtures`: 테스트 fixture 목록
- `GET /analyze/fixtures/jd`: JD fixture 목록
- `GET /analyze/fixtures/jd/detail`: JD fixture 상세
- `GET /analyze/fixtures/{name}`: 이력서 fixture 상세
- `POST /analyze/resume`: 텍스트 이력서 분석
- `POST /analyze/resume/file`: PDF/이미지 이력서 업로드 분석
- `POST /analyze/github`: GitHub 저장소 분석
- `POST /analyze/gap`: 프로필과 JD 기반 갭 분석
- `POST /analyze/gap/unified`: 통합 갭 분석
- `POST /analyze/jd/url`: JD URL 스크래핑 및 분석

## Profile API (`/profile`)
- `GET /profile/me`: 현재 사용자 프로필 조회
- `PUT /profile/me`: 프로필/이력서/JD/GitHub/갭 분석 결과 저장
- 인증 사용자는 DB를 사용하고, 미인증 demo 모드는 `profiles_store` 인메모리 fallback을 사용한다.

## Companies API (`/companies`)
- `GET /companies/`: 회사 목록 조회
- `POST /companies/`: 회사/JD 생성
- `GET /companies/{company_id}`: 회사 상세 조회
- `PUT /companies/{company_id}`: 회사/JD 수정
- `DELETE /companies/{company_id}`: 회사 삭제
- `POST /companies/{company_id}/analyze`: 회사 JD와 프로필 매칭 분석
- `POST /companies/{company_id}/scrape-jd`: 회사 JD URL 스크래핑
- 인증 사용자는 DB를 사용하고, 미인증 demo 모드는 `companies_store` 인메모리 fallback을 사용한다.

## Interview API (`/interview`)
- `GET /interview/`: 면접 모듈 health check
- `POST /interview/start`: REST 기반 면접 세션 생성 및 첫 질문 반환
- `POST /interview/{session_id}/respond`: 답변 제출 및 다음 질문 생성
- `GET /interview/{session_id}/feedback`: 세션 대화 기반 피드백 반환
- `POST /interview/end-session`: ElevenLabs Agent 모드 대화 기록을 서버 세션으로 저장
- `POST /interview/test-tts`: TTS smoke test
- `POST /interview/agent-auth`: ElevenLabs Agent signed URL 또는 agent_id 반환
- `WS /interview/ws/{session_id}`: full-duplex 음성 면접 WebSocket
- 현재 세션 저장은 `active_sessions` 인메모리 dict이며, TTL/영속화가 필요하다.

## Roadmap API (`/roadmap`)
- `GET /roadmap/`: 로드맵 모듈 health check
- `POST /roadmap/generate`: 기본 로드맵 생성
- `POST /roadmap/generate/agent`: agent 기반 로드맵 생성
- `POST /roadmap/problems/generate`: 주차별 문제 생성
- `GET /roadmap/problems/{problem_id}` / `GET /roadmap/problem/{problem_id}`: 문제 조회
- `POST /roadmap/problems/{problem_id}/evaluate` / `POST /roadmap/evaluate`: 풀이 평가
- `POST /roadmap/todo/complete`: todo 완료 처리
- 문제 fallback 저장은 `problems_store` 인메모리 dict이다.

## Git API (`/git`)
- `POST /git/validate-token`: GitHub token 검증
- `POST /git/repos`: 저장소 목록 조회
- `POST /git/push/solution`: 풀이 결과 push
- `POST /git/push/problem`: 문제 템플릿 push
