# Design: AI Interview (interview)

> Plan 문서 기반 상세 설계. 기존 구현을 개선하여 LLM 피드백, 프로필 연동, 에러 핸들링을 완성한다.

---

## 1. Design Overview

| Item | Value |
|------|-------|
| Plan Reference | `docs/01-plan/features/interview.plan.md` |
| Approach | 기존 코드 개선 (신규 작성 아님) |
| Primary Changes | Backend 피드백 로직 + Frontend 플로우 |

---

## 2. Architecture

### 2.1 전체 시스템 흐름

```
[DashboardPage]                     [InterviewPage]                    [InterviewFeedbackPage]
     │                                    │                                    │
     │  "모의 면접 시작" 클릭              │                                    │
     │  (profile + jd_text 전달)          │                                    │
     ├──────────────────────────────────>│                                    │
     │                                    │  1. agent-auth (signed URL)       │
     │                                    ├──> POST /interview/agent-auth     │
     │                                    │                                    │
     │                                    │  2. ElevenLabs Agent 연결          │
     │                                    │  (실시간 음성 면접 진행)             │
     │                                    │                                    │
     │                                    │  3. 면접 종료                       │
     │                                    │  POST /interview/end-session      │
     │                                    ├──────────────────────────────────>│
     │                                    │   navigate(/interview/feedback/id) │
     │                                    │                                    │
     │                                    │                    GET /feedback   │
     │                                    │                    (LLM 분석 포함) │
```

### 2.2 컴포넌트 다이어그램

```
Backend (FastAPI)
├── endpoints/interview.py
│   ├── POST /start              (기존 유지)
│   ├── POST /{id}/respond       (기존 유지)
│   ├── GET  /{id}/feedback      (★ R1: LLM 피드백으로 교체)
│   ├── POST /agent-auth         (기존 유지)
│   └── WS   /ws/{id}            (기존 유지)
│
├── services/llm_service.py
│   └── generate_interview_feedback()  (★ 신규 메서드)
│
├── services/elevenlabs_service.py     (변경 없음)
└── services/stt_service.py            (변경 없음)

Frontend (React)
├── pages/InterviewPage.tsx            (★ R2: 프로필 연동 + R3: 종료 플로우 + R4: 에러 핸들링)
├── pages/InterviewFeedbackPage.tsx    (★ R1: 개선된 피드백 표시)
├── hooks/useElevenLabsTTS.ts          (변경 없음)
├── hooks/useElevenLabsConversation.ts (변경 없음)
├── lib/api.ts                         (★ 타입 확장)
└── lib/store.ts                       (★ 면접 대화 기록 보존)
```

---

## 3. Detailed Design per Requirement

### 3.1 R1: LLM 기반 피드백 생성

**현재 문제**: `interview.py:233-245` - 하드코딩된 점수 및 템플릿 피드백

**해결 방법**: `llm_service.py`에 `generate_interview_feedback()` 메서드 추가

#### 3.1.1 Backend: `llm_service.py` 신규 메서드

```python
async def generate_interview_feedback(
    self,
    conversation_history: list[dict],
    profile: dict,
    jd_text: str,
    persona: str = "professional"
) -> dict:
    """
    면접 대화 내용을 분석하여 상세 피드백 생성.

    Returns:
        {
            "scores": {
                "technical_accuracy": int (0-100),
                "communication": int (0-100),
                "problem_solving": int (0-100),
                "job_fit": int (0-100),
                "overall": int (0-100)
            },
            "feedback_summary": str,
            "strengths": [str],
            "improvements": [str],
            "sample_answers": [{"question": str, "suggestion": str}]
        }
    """
```

**프롬프트 설계**:
```
당신은 채용 면접 평가 전문가입니다.

## 면접 정보
- 면접관 스타일: {persona}
- 지원 포지션: {jd_text 요약}

## 대화 기록
{conversation_history 전체}

## 지원자 프로필
{profile 요약}

## 평가 기준
1. technical_accuracy (0-100): 기술적 정확성 - 답변의 기술적 깊이와 정확성
2. communication (0-100): 커뮤니케이션 - 답변 구조, 논리적 전개, 명확성
3. problem_solving (0-100): 문제 해결력 - 상황 대처, 구체적 사례 제시
4. job_fit (0-100): 직무 적합성 - JD 요구사항과의 부합도
5. overall (0-100): 종합 (위 항목의 가중 평균이 아닌 종합적 판단)

## 응답 형식 (JSON)
{
    "scores": {...},
    "feedback_summary": "2-3문장 종합 평가",
    "strengths": ["강점 1", "강점 2"],
    "improvements": ["개선점 1", "개선점 2"],
    "sample_answers": [
        {"question": "질문 내용", "suggestion": "더 좋은 답변 예시"}
    ]
}
```

- Temperature: `0.3` (일관성 있는 평가)
- Max tokens: `1500`

#### 3.1.2 Backend: `interview.py` feedback 엔드포인트 수정

```python
@router.get("/{session_id}/feedback")
async def get_interview_feedback(session_id: str):
    # ... 기존 세션 검증 코드 유지 ...

    # ★ 변경: LLM 기반 피드백 생성
    try:
        llm_feedback = await llm_service.generate_interview_feedback(
            conversation_history=session.conversation_history,
            profile=session.profile,
            jd_text=session.jd_text,
            persona=session.persona,
        )
    except Exception:
        # 폴백: 기존 하드코딩 피드백
        llm_feedback = {
            "scores": {"technical_accuracy": 75, ...},
            "feedback_summary": "...",
            "strengths": [],
            "improvements": [],
            "sample_answers": [],
        }

    return InterviewFeedbackResponse(
        session_id=session_id,
        total_questions=session.question_count,
        duration_seconds=duration,
        conversation=session.conversation_history,
        feedback_summary=llm_feedback["feedback_summary"],
        scores=llm_feedback["scores"],
        strengths=llm_feedback.get("strengths", []),
        improvements=llm_feedback.get("improvements", []),
        sample_answers=llm_feedback.get("sample_answers", []),
    )
```

#### 3.1.3 Response Model 확장

```python
class InterviewFeedbackResponse(BaseModel):
    session_id: str
    total_questions: int
    duration_seconds: int
    conversation: list[dict]
    feedback_summary: str
    scores: dict
    strengths: list[str] = []          # ★ 신규
    improvements: list[str] = []       # ★ 신규
    sample_answers: list[dict] = []    # ★ 신규
```

#### 3.1.4 Frontend: `InterviewFeedback` 타입 확장 (`api.ts`)

```typescript
export interface InterviewFeedback {
    session_id: string;
    total_questions: number;
    duration_seconds: number;
    conversation: Array<{ role: string; content: string; timestamp: string }>;
    feedback_summary: string;
    scores: Record<string, number>;
    strengths: string[];         // ★ 신규
    improvements: string[];      // ★ 신규
    sample_answers: Array<{ question: string; suggestion: string }>;  // ★ 신규
}
```

#### 3.1.5 Frontend: `InterviewFeedbackPage.tsx` UI 확장

기존 scores 그리드 아래에 추가 섹션:

```
[요약] ─ 기존 유지

[점수] ─ 기존 scores 그리드 유지 (job_fit 항목 추가)

[강점] ─ ★ 신규
  - 강점 1
  - 강점 2

[개선점] ─ ★ 신규
  - 개선점 1
  - 개선점 2

[답변 개선 제안] ─ ★ 신규
  Q: 질문 내용
  A: 더 좋은 답변 예시

[대화 기록] ─ 기존 유지
```

---

### 3.2 R2: 프로필-JD 자동 연동

**현재 문제**: InterviewPage가 Zustand 스토어에서 프로필만 로드. JD 텍스트와 갭 분석 결과를 활용하지 않음.

**해결 방법**: DashboardPage에서 면접 시작 시 갭 분석 결과(profile + jdText)를 InterviewStore에 저장

#### 3.2.1 Store 확장 (`store.ts`)

```typescript
interface InterviewState {
    // ... 기존 필드 유지 ...
    jdText: string;                    // ★ 신규: JD 텍스트
    profileData: ProfileStructured | null;  // ★ 신규: 프로필 데이터

    setInterviewContext: (profile: ProfileStructured, jdText: string) => void;  // ★ 신규
}
```

#### 3.2.2 DashboardPage 연동

갭 분석 완료 후 "모의 면접 시작" 버튼에서:
```typescript
const handleStartInterview = () => {
    // InterviewStore에 컨텍스트 저장
    setInterviewContext(profile, jdText);
    navigate('/interview');
};
```

#### 3.2.3 InterviewPage 수정

```typescript
// 기존: profile만 사용
const { profile: resumeAnalysis } = useProfileStore();

// 변경: InterviewStore에서 컨텍스트도 사용
const { profileData, jdText } = useInterviewStore();
const { profile: resumeAnalysis } = useProfileStore();
const effectiveProfile = profileData || resumeAnalysis;
```

---

### 3.3 R3: 면접 종료 플로우

**현재 문제**: 면접 종료 후 아무 동작 없음. `handleEndInterview()`에 navigate 없음.

**해결 방법**:

#### 3.3.1 종료 시 REST 세션 생성 + 피드백 페이지 이동

ElevenLabs Agent 모드에서는 REST 세션이 별도로 생성되지 않으므로, 종료 시점에 대화 기록을 서버에 전송하여 세션 생성 + 피드백 페이지로 이동해야 함.

**새 엔드포인트**: `POST /interview/end-session`

```python
class EndSessionRequest(BaseModel):
    conversation: list[dict]  # ElevenLabs Agent에서 수집한 대화
    profile: dict
    jd_text: str
    persona: str = "professional"

@router.post("/end-session")
async def end_session(request: EndSessionRequest):
    """Agent 모드 면접 종료 시 세션 생성 + 피드백 생성."""
    session_id = str(uuid.uuid4())[:8]

    session = InterviewSession(
        session_id=session_id,
        profile=request.profile,
        jd_text=request.jd_text,
        persona=request.persona,
        conversation_history=request.conversation,
        question_count=len([m for m in request.conversation if m["role"] == "interviewer"]),
        started_at=request.conversation[0]["timestamp"] if request.conversation else datetime.now().isoformat(),
        ended_at=datetime.now().isoformat(),
    )

    active_sessions[session_id] = session
    return {"session_id": session_id}
```

#### 3.3.2 Frontend: 종료 핸들러 수정

```typescript
const handleEndInterview = async () => {
    await conversation.endSession();

    // 대화 기록을 서버에 전송하여 세션 생성
    try {
        const response = await fetch(`${API_BASE}/interview/end-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation: chatHistory.map(m => ({
                    role: m.role === 'interviewer' ? 'interviewer' : 'candidate',
                    content: m.content,
                    timestamp: new Date(m.timestamp).toISOString(),
                })),
                profile: effectiveProfile,
                jd_text: jdText || '',
                persona: persona,
            }),
        });
        const data = await response.json();
        navigate(`/interview/feedback/${data.session_id}`);
    } catch {
        // 에러 시에도 세션 종료 처리
        endSession();
    }
};
```

---

### 3.4 R4: 에러 핸들링

**현재 문제**: Agent 연결 실패, TTS 에러 시 사용자 안내 부재

#### 3.4.1 에러 상태 분류

| 에러 유형 | 원인 | 사용자 메시지 | 복구 방법 |
|-----------|------|--------------|-----------|
| Agent ID 미설정 | .env 미설정 | "면접 서비스 설정이 필요합니다" | 설정 안내 |
| Agent 연결 실패 | 네트워크/API 키 | "연결에 실패했습니다. 다시 시도해주세요" | 재시도 버튼 |
| 면접 중 연결 끊김 | WebSocket 중단 | "연결이 끊겼습니다" | 대화 기록 보존 + 재연결 or 종료 |
| 피드백 생성 실패 | LLM API 에러 | 폴백 피드백 사용 (사용자 알림 없음) | 자동 폴백 |

#### 3.4.2 InterviewPage 에러 UI

```typescript
// 에러 상태 추가
const [error, setError] = useState<string | null>(null);

// 에러 UI 컴포넌트
{error && (
    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
        <p className="text-red-400">{error}</p>
        <button onClick={handleRetry}>다시 시도</button>
    </div>
)}
```

#### 3.4.3 연결 끊김 시 대화 기록 보존

```typescript
// store.ts: endSession에서 conversation 초기화하지 않음
// 대신 별도의 clearConversation 액션 추가
endSession: () => set((state) => ({
    sessionId: null,
    isActive: false,
    // conversation 유지! (피드백 전송용)
})),
clearConversation: () => set({ conversation: [] }),
```

---

## 4. File Change Summary

### 수정 파일 (6개)

| File | Changes | Requirement |
|------|---------|-------------|
| `server/app/services/llm_service.py` | `generate_interview_feedback()` 메서드 추가 | R1 |
| `server/app/api/v1/endpoints/interview.py` | feedback 엔드포인트 LLM 연동 + `end-session` 엔드포인트 추가 + Response 모델 확장 | R1, R3 |
| `client/src/lib/api.ts` | `InterviewFeedback` 타입 확장 + `endSession` API 추가 | R1, R3 |
| `client/src/lib/store.ts` | InterviewState에 jdText, profileData 추가 + endSession 시 conversation 보존 | R2, R3, R4 |
| `client/src/pages/InterviewPage.tsx` | 프로필/JD 연동 + 종료 플로우 (navigate) + 에러 핸들링 | R2, R3, R4 |
| `client/src/pages/InterviewFeedbackPage.tsx` | 강점/개선점/답변제안 섹션 추가 | R1 |

### 신규 파일: 없음

---

## 5. Implementation Order

```
Phase 1: Backend 피드백 파이프라인 (R1)
  1. llm_service.py: generate_interview_feedback() 추가
  2. interview.py: InterviewFeedbackResponse 모델 확장
  3. interview.py: feedback 엔드포인트 LLM 연동 (폴백 포함)

Phase 2: 종료 플로우 (R3)
  4. interview.py: POST /end-session 엔드포인트 추가
  5. store.ts: endSession 시 conversation 보존 + clearConversation 추가
  6. api.ts: endSession API + InterviewFeedback 타입 확장
  7. InterviewPage.tsx: handleEndInterview에 서버 전송 + navigate 추가

Phase 3: 프로필 연동 (R2)
  8. store.ts: jdText, profileData, setInterviewContext 추가
  9. InterviewPage.tsx: InterviewStore에서 컨텍스트 사용

Phase 4: 에러 핸들링 (R4)
  10. InterviewPage.tsx: 에러 상태 UI + 재시도 로직

Phase 5: 피드백 UI (R1 마무리)
  11. InterviewFeedbackPage.tsx: 강점/개선점/답변제안 UI 추가
```

---

## 6. Testing Strategy

| Test | Method | Criteria |
|------|--------|----------|
| 피드백 생성 | curl + mock 대화 | LLM이 5개 항목 점수 + 피드백 반환 |
| 종료 플로우 | E2E | 면접 종료 → 피드백 페이지 자동 이동 |
| 프로필 연동 | 수동 | DashboardPage → Interview 시 프로필/JD 전달 확인 |
| 에러 핸들링 | API 키 제거 후 테스트 | 에러 메시지 표시 + 폴백 동작 |
| 피드백 폴백 | LLM 응답 실패 시뮬레이션 | 기본 피드백 반환 |

```bash
# R1 테스트: 피드백 엔드포인트
curl -X POST http://localhost:8000/api/v1/interview/start \
  -H "Content-Type: application/json" \
  -d '{"profile": {"skills": ["Python"]}, "jd_text": "Python 개발자", "max_questions": 2}'
# -> session_id 받기

curl -X POST http://localhost:8000/api/v1/interview/{session_id}/respond \
  -H "Content-Type: application/json" \
  -d '{"answer": "Python 3년 경험이 있습니다."}'

curl http://localhost:8000/api/v1/interview/{session_id}/feedback
# -> scores에 LLM 생성 값 확인
```

---

*Created: 2026-02-18*
*PDCA Phase: Design*
*Plan Reference: docs/01-plan/features/interview.plan.md*
