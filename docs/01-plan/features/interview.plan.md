# Plan: AI Interview (interview)

> AI 모의 면접 기능 완성 및 개선

---

## 1. Feature Overview

| Item | Description |
|------|-------------|
| Feature Name | AI Interview |
| Priority | High |
| Level | Dynamic |
| Status | 기존 구현 존재 - 완성/개선 필요 |

### 목표
사용자의 프로필(이력서)과 JD를 기반으로 AI 면접관이 실시간 음성 면접을 진행하고, 면접 종료 후 상세 피드백을 제공하는 기능을 완성한다.

### 배경
- 해커톤 데모의 핵심 시나리오 (시나리오 3: AI 모의 면접)
- ElevenLabs Conversational Agent + Deepgram STT 기반 음성 면접
- 기본 구현은 완료되었으나, 피드백 생성/UI 완성도 개선 필요

---

## 2. Current Implementation (기존 구현 현황)

### Backend (구현 완료)
- `server/app/api/v1/endpoints/interview.py` - REST + WebSocket 엔드포인트
- `server/app/services/elevenlabs_service.py` - TTS 서비스 (ElevenLabs)
- `server/app/services/stt_service.py` - STT 서비스 (Deepgram)
- `server/app/services/llm_service.py` - 면접 질문 생성 (Gemini/OpenAI)
- 라우터 등록 완료 (`/api/v1/interview`)

### Frontend (구현 완료)
- `client/src/pages/InterviewPage.tsx` - 면접 UI
- `client/src/pages/InterviewFeedbackPage.tsx` - 피드백 UI
- `client/src/hooks/useElevenLabsTTS.ts` - TTS 훅
- `client/src/hooks/useElevenLabsConversation.ts` - 대화 훅
- Zustand 스토어 (InterviewState)

### 기존 구현의 한계점
1. **하드코딩된 피드백 점수** - technical_accuracy: 75, communication: 80 등 고정값
2. **LLM 기반 피드백 분석 미구현** - 대화 내용 기반 실제 평가 없음
3. **에러 핸들링 미흡** - API 실패 시 UX 부재
4. **프로필 자동 로드** - 갭 분석 결과 연동 미완성

---

## 3. Requirements (요구사항)

### 필수 요구사항 (Must-Have)
| ID | Requirement | Description |
|----|-------------|-------------|
| R1 | LLM 기반 피드백 생성 | 대화 내용을 분석하여 실제 점수/피드백 생성 |
| R2 | 프로필-JD 자동 연동 | 갭 분석 결과에서 프로필/JD 자동 로드 |
| R3 | 면접 종료 플로우 | 정상 종료 -> 피드백 페이지 자동 이동 |
| R4 | 에러 핸들링 | API/WebSocket 연결 실패 시 사용자 안내 |

### 우대 요구사항 (Nice-to-Have)
| ID | Requirement | Description |
|----|-------------|-------------|
| R5 | 면접 유형 선택 UI | persona 선택 (professional/friendly/challenging) |
| R6 | 답변 시간 제한 | 질문당 답변 시간 타이머 (2분) |
| R7 | 면접 기록 저장 | 이전 면접 세션 히스토리 조회 |
| R8 | 답변 다시 듣기 | 녹음된 답변 재생 기능 |

---

## 4. Technical Approach

### 아키텍처
```
[InterviewPage]
    ├── ElevenLabs Conversational Agent (음성)
    │   ├── Agent Auth → Backend signed URL
    │   ├── Audio Input → Deepgram STT
    │   └── Audio Output → ElevenLabs TTS
    │
    ├── REST API (세션 관리)
    │   ├── POST /interview/start
    │   ├── POST /interview/{id}/respond
    │   └── GET /interview/{id}/feedback
    │
    └── [InterviewFeedbackPage]
        └── LLM 기반 상세 피드백 표시
```

### 핵심 개선 포인트
1. **피드백 생성 파이프라인**: 대화 히스토리 → LLM 분석 → 점수 산출 → 개선 제안
2. **프로필 연동**: Zustand 스토어에서 프로필/JD 데이터 가져오기
3. **UI 완성도**: 면접 진행 상태 표시, 에러 처리

### 기술 스택
- Backend: FastAPI, ElevenLabs SDK, Deepgram SDK, LLM (Gemini/OpenAI)
- Frontend: React, @elevenlabs/react, Zustand, Tailwind CSS

---

## 5. Implementation Priority

| Phase | Task | Priority |
|-------|------|----------|
| 1 | LLM 기반 피드백 생성 로직 구현 (R1) | Critical |
| 2 | 프로필-JD 자동 연동 (R2) | High |
| 3 | 면접 종료/피드백 플로우 개선 (R3) | High |
| 4 | 에러 핸들링 강화 (R4) | Medium |
| 5 | 면접 유형 선택 UI (R5) | Low |

---

## 6. Success Criteria

- [ ] 면접 종료 시 LLM이 실제 대화 내용을 분석하여 피드백 생성
- [ ] 갭 분석 결과에서 면접 페이지로 프로필/JD 자동 전달
- [ ] 면접 시작 → 질문/답변 → 종료 → 피드백 전체 플로우 동작
- [ ] API 에러 시 사용자에게 적절한 안내 메시지 표시

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ElevenLabs API 키 없음 | 음성 면접 불가 | REST API 텍스트 모드 폴백 |
| LLM API 실패 | 피드백 생성 불가 | 기본 피드백 템플릿 사용 |
| WebSocket 연결 불안정 | 면접 중단 | 재연결 로직 + 세션 복구 |

---

*Created: 2026-02-18*
*PDCA Phase: Plan*
