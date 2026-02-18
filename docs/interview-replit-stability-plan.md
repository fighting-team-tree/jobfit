# Replit 배포용 면접 기능 안정화 계획서

> AI 면접 기능을 Replit 환경에서 안정적으로 운영하기 위한 이슈 분석 및 수정 계획

---

## 1. 문제 분석

Replit 환경 특성(컨테이너 재시작, 리버스 프록시, 제한된 메모리)에서 현재 면접 기능의 취약점을 분석한 결과입니다.

### Critical

| ID | 이슈 | 현재 상태 | 영향 |
|----|------|-----------|------|
| C1 | WebSocket 연결 끊김 | heartbeat/ping-pong 미구현 | Replit 리버스 프록시가 유휴 연결을 60초 내에 강제 종료. 면접 중 무응답 시 연결 끊김 |
| C2 | 인메모리 세션 소실 | `active_sessions: dict` 사용 | 컨테이너 재시작 시 진행 중인 모든 면접 세션 소실. 피드백 조회 불가 |

### High

| ID | 이슈 | 현재 상태 | 영향 |
|----|------|-----------|------|
| H1 | LLM 호출 timeout 미설정 | `AsyncOpenAI.chat.completions.create` 무제한 대기 | LLM 응답 지연 시 WebSocket 측도 블로킹되어 전체 세션 중단 |
| H2 | 외부 API 재시도 없음 | ElevenLabs/Deepgram/LLM 호출에 retry 로직 없음 | 일시적 네트워크 오류로 면접 종료. 특히 Replit의 공유 네트워크에서 빈번 |

### Medium

| ID | 이슈 | 현재 상태 | 영향 |
|----|------|-----------|------|
| M1 | 오디오 버퍼 무제한 | `asyncio.Queue()` 크기 제한 없음 | 클라이언트가 빠르게 오디오를 전송하면 메모리 사용량 급증. Replit 무료 플랜 메모리 제한(512MB) 초과 가능 |
| M2 | TTS 청크 Base64 비효율 | `base64.b64encode(audio_chunk)` | Base64 인코딩으로 데이터 크기 33% 증가. Replit 대역폭 제한에서 지연 발생 가능 |
| M3 | 세션 정리 없음 | 종료된 세션이 메모리에 영구 잔류 | 장시간 운영 시 메모리 누수 |

---

## 2. 구현 계획

### Phase 1: WebSocket Heartbeat 추가 (Critical - C1)

**목표**: Replit 리버스 프록시의 유휴 연결 종료를 방지

**수정 대상 파일**:
- `server/app/api/v1/endpoints/interview.py`

**구현 내용**:
```python
# interview.py - interview_websocket 함수 내부

HEARTBEAT_INTERVAL = 20  # Replit 프록시 timeout(60초) 미만

async def heartbeat_loop(websocket: WebSocket):
    """주기적으로 ping 전송하여 연결 유지."""
    try:
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            await websocket.send_json({"type": "ping", "timestamp": datetime.now().isoformat()})
    except Exception:
        pass  # 연결 종료 시 자연 중단

# Start Execution 블록에서 heartbeat_loop를 별도 task로 실행
heartbeat_task = asyncio.create_task(heartbeat_loop(websocket))
```

**클라이언트 대응** (`InterviewPage.tsx`):
- `type: "ping"` 메시지 수신 시 `pong` 응답 전송 (선택적)
- WebSocket `onclose` 이벤트에서 자동 재연결 로직 추가

**검증 방법**:
1. 면접 시작 후 30초간 무응답 상태 유지 → 연결 유지 확인
2. Replit 배포 환경에서 2분 이상 면접 세션 유지 테스트

---

### Phase 2: 인메모리 세션 영속화 (Critical - C2)

**목표**: 컨테이너 재시작에도 세션 데이터 보존

**수정 대상 파일**:
- `server/app/api/v1/endpoints/interview.py`
- `server/app/core/config.py` (DATABASE_URL 이미 존재)

**구현 방안 (2단계)**:

#### 2-A: 파일 기반 폴백 (즉시 적용 가능)
```python
import json
from pathlib import Path

SESSION_DIR = Path("/tmp/jobfit_sessions")
SESSION_DIR.mkdir(exist_ok=True)

def save_session(session: InterviewSession):
    """세션을 JSON 파일로 저장."""
    path = SESSION_DIR / f"{session.session_id}.json"
    path.write_text(json.dumps(session.model_dump(), ensure_ascii=False))
    active_sessions[session.session_id] = session

def load_session(session_id: str) -> InterviewSession | None:
    """메모리에 없으면 파일에서 복원."""
    if session_id in active_sessions:
        return active_sessions[session_id]
    path = SESSION_DIR / f"{session_id}.json"
    if path.exists():
        data = json.loads(path.read_text())
        session = InterviewSession(**data)
        active_sessions[session_id] = session
        return session
    return None
```

#### 2-B: DB 저장 (Replit PostgreSQL 사용 가능 시)
- SQLAlchemy + asyncpg로 `interview_sessions` 테이블 생성
- `started_at`, `ended_at`, `conversation_history` (JSONB) 컬럼
- `settings.DATABASE_URL`이 설정되어 있을 때만 DB 사용, 아니면 파일 폴백

**검증 방법**:
1. 면접 세션 시작 → 서버 재시작 → `GET /{session_id}/feedback` 호출하여 세션 복원 확인
2. `POST /end-session` 후 서버 재시작 → 피드백 조회 가능 확인

---

### Phase 3: 오디오 버퍼 크기 제한 (Medium - M1)

**목표**: 메모리 사용량 제한으로 Replit OOM 방지

**수정 대상 파일**:
- `server/app/api/v1/endpoints/interview.py`

**구현 내용**:
```python
MAX_AUDIO_QUEUE_SIZE = 100  # 약 100 * 4KB = 400KB 제한

audio_queue = asyncio.Queue(maxsize=MAX_AUDIO_QUEUE_SIZE)

# receive_loop 내에서:
if "bytes" in message:
    try:
        audio_queue.put_nowait(message["bytes"])
    except asyncio.QueueFull:
        pass  # 오래된 오디오 드롭 (STT 지연보다 메모리 안정 우선)
```

**세션 정리 로직 추가** (M3 해결):
```python
MAX_SESSION_AGE = 3600  # 1시간

def cleanup_old_sessions():
    """만료된 세션 정리."""
    now = datetime.now(tz=timezone.utc)
    expired = [
        sid for sid, s in active_sessions.items()
        if s.ended_at and (now - datetime.fromisoformat(
            s.ended_at.replace("Z", "+00:00")
        )).total_seconds() > MAX_SESSION_AGE
    ]
    for sid in expired:
        del active_sessions[sid]
```

**검증 방법**:
1. 대량 오디오 데이터 전송 시 메모리 사용량 모니터링
2. 1시간 경과 후 종료된 세션이 자동 정리되는지 확인

---

### Phase 4: 외부 API Retry 로직 (High - H2)

**목표**: 일시적 네트워크 오류에 자동 재시도

**수정 대상 파일**:
- `server/app/services/llm_service.py`
- `server/app/services/elevenlabs_service.py`

**구현 내용**:

`llm_service.py`:
```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import APIConnectionError, APITimeoutError, RateLimitError

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((APIConnectionError, APITimeoutError, RateLimitError)),
)
async def _call_llm(self, messages, temperature=0.1, max_tokens=2000):
    response = await self.client.chat.completions.create(
        model=self.model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content
```

`elevenlabs_service.py`:
```python
@retry(stop=stop_after_attempt(2), wait=wait_exponential(min=0.5, max=5))
async def text_to_speech_stream(self, text, voice_id=None, persona="professional"):
    # 기존 구현
    ...
```

**의존성 추가**:
```bash
uv add tenacity
```

**검증 방법**:
1. 네트워크 지연 시뮬레이션 (timeout 강제) 후 자동 재시도 동작 확인
2. 3회 실패 시 적절한 에러 메시지 반환 확인

---

### Phase 5: LLM 호출 Timeout 설정 (High - H1)

**목표**: LLM 무한 대기 방지

**수정 대상 파일**:
- `server/app/services/llm_service.py`

**구현 내용**:
```python
class LLMService:
    def __init__(self):
        provider = settings.LLM_PROVIDER

        # AsyncOpenAI 클라이언트에 timeout 설정
        timeout_config = {"timeout": 30.0}  # 30초

        if provider == "gemini":
            self.client = AsyncOpenAI(
                api_key=settings.GOOGLE_API_KEY,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                **timeout_config,
            )
        else:
            self.client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                **timeout_config,
            )
```

추가로 면접 질문 생성 시 `asyncio.wait_for` 래핑:
```python
async def generate_interview_question(self, ...):
    try:
        return await asyncio.wait_for(
            self._generate_question_internal(...),
            timeout=25.0  # 25초 제한
        )
    except asyncio.TimeoutError:
        return "다음 질문으로 넘어가겠습니다. 이전 경험 중 가장 도전적이었던 프로젝트에 대해 말씀해주세요."
```

**검증 방법**:
1. LLM 응답 지연 시뮬레이션 → 25초 후 폴백 질문 반환 확인
2. WebSocket 세션이 LLM timeout 중에도 heartbeat로 연결 유지되는지 확인

---

## 3. 수정 대상 파일 요약

| 파일 | Phase | 변경 유형 |
|------|-------|-----------|
| `server/app/api/v1/endpoints/interview.py` | 1, 2-A, 3 | WebSocket heartbeat, 세션 파일 저장, 오디오 버퍼 제한, 세션 정리 |
| `server/app/services/llm_service.py` | 4, 5 | retry 데코레이터, timeout 설정 |
| `server/app/services/elevenlabs_service.py` | 4 | retry 데코레이터 |
| `server/app/core/config.py` | - | 이미 DATABASE_URL 필드 존재 (변경 불필요) |
| `client/src/pages/InterviewPage.tsx` | 1 | ping 메시지 처리 (선택적) |
| `pyproject.toml` | 4 | `tenacity` 의존성 추가 |

---

## 4. 구현 우선순위 및 일정

| 순서 | Phase | 이슈 | 난이도 | 비고 |
|------|-------|------|--------|------|
| 1 | Phase 1 | WebSocket heartbeat | 낮음 | 즉시 적용 가능, 효과 큼 |
| 2 | Phase 5 | LLM timeout | 낮음 | AsyncOpenAI 옵션 변경 + asyncio.wait_for |
| 3 | Phase 4 | API retry | 중간 | tenacity 추가, 데코레이터 적용 |
| 4 | Phase 3 | 오디오 버퍼 제한 | 낮음 | Queue maxsize + 세션 정리 |
| 5 | Phase 2 | 세션 영속화 | 중간~높음 | 2-A(파일) 즉시, 2-B(DB) 후속 |

---

## 5. 검증 체크리스트

- [ ] Replit 배포 후 면접 세션 2분 이상 유지 (Phase 1)
- [ ] 서버 재시작 후 피드백 조회 가능 (Phase 2)
- [ ] 장시간 운영 시 메모리 사용량 안정 (Phase 3)
- [ ] 네트워크 불안정 시 자동 복구 (Phase 4)
- [ ] LLM 지연 시 30초 내 폴백 응답 (Phase 5)
- [ ] 전체 면접 플로우 E2E 테스트 통과

---

*Created: 2026-02-19*
*관련 문서: [interview.plan.md](01-plan/features/interview.plan.md)*
