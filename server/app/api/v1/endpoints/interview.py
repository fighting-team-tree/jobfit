"""
Interview API Endpoints

Handles real-time mock interview via WebSocket with ElevenLabs TTS.
"""

import asyncio
import base64
import json
from datetime import datetime, timezone

from app.core.config import settings
from app.services.elevenlabs_service import elevenlabs_service
from app.services.llm_service import llm_service
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

router = APIRouter()


# ============ Request/Response Models ============


class InterviewSession(BaseModel):
    """Interview session state."""

    session_id: str
    profile: dict
    jd_text: str
    persona: str = "professional"  # professional, friendly, challenging
    conversation_history: list[dict] = []
    question_count: int = 0
    max_questions: int = 5
    started_at: str | None = None
    ended_at: str | None = None


class StartInterviewRequest(BaseModel):
    """Request to start a new interview session."""

    profile: dict
    jd_text: str
    persona: str = "professional"
    max_questions: int = 5


class InterviewFeedbackResponse(BaseModel):
    """Interview feedback after session ends."""

    session_id: str
    total_questions: int
    duration_seconds: int
    conversation: list[dict]
    feedback_summary: str
    scores: dict
    strengths: list[str] = []
    improvements: list[str] = []
    sample_answers: list[dict] = []


class InterviewAnswerRequest(BaseModel):
    answer: str


class EndSessionRequest(BaseModel):
    """Request to end an Agent-mode interview session."""

    conversation: list[dict]
    profile: dict = {}
    jd_text: str = ""
    persona: str = "professional"


# ============ In-memory session storage ============
# In production, use Redis or database
active_sessions: dict[str, InterviewSession] = {}


# ============ REST Endpoints ============


@router.get("/")
def read_root():
    """Health check for interview module."""
    return {"module": "interview", "status": "healthy"}


@router.post("/start")
async def start_interview(request: StartInterviewRequest):
    """
    Initialize a new interview session.

    Returns session_id and first question.
    """
    import uuid

    session_id = str(uuid.uuid4())[:8]

    session = InterviewSession(
        session_id=session_id,
        profile=request.profile,
        jd_text=request.jd_text,
        persona=request.persona,
        max_questions=request.max_questions,
        started_at=datetime.now().isoformat(),
    )

    # Generate first question with fallback
    try:
        first_question = await llm_service.generate_interview_question(
            profile=request.profile,
            jd_text=request.jd_text,
            conversation_history=[],
            persona=request.persona,
        )
    except Exception as e:
        print(f"[Interview] NVIDIA generation failed: {e}. Using fallback question.")
        first_question = "자기소개와 함께 이번 지원하신 동기에 대해 말씀해 주시겠습니까?"

    try:
        session.conversation_history.append(
            {
                "role": "interviewer",
                "content": first_question,
                "timestamp": datetime.now().isoformat(),
            }
        )
        session.question_count = 1

        active_sessions[session_id] = session

        return {
            "session_id": session_id,
            "question": first_question,
            "question_number": 1,
            "total_questions": request.max_questions,
            "persona": request.persona,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {str(e)}") from e


@router.post("/{session_id}/respond")
async def respond_to_question(
    session_id: str,
    request: InterviewAnswerRequest | None = None,
    answer: str | None = None,
):
    """
    Submit an answer and get the next question.

    - **session_id**: Active session ID
    - **answer**: User's answer to the current question
    """
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    final_answer = request.answer if request else answer
    if not final_answer:
        raise HTTPException(status_code=422, detail="Answer is required")

    session = active_sessions[session_id]

    # Record user's answer
    session.conversation_history.append(
        {
            "role": "candidate",
            "content": final_answer,
            "timestamp": datetime.now().isoformat(),
        }
    )

    # Check if we've reached max questions
    if session.question_count >= session.max_questions:
        session.ended_at = datetime.now().isoformat()
        return {
            "session_id": session_id,
            "status": "completed",
            "message": "면접이 종료되었습니다. 피드백을 확인해주세요.",
            "total_questions": session.question_count,
        }

    # Generate next question
    try:
        next_question = await llm_service.generate_interview_question(
            profile=session.profile,
            jd_text=session.jd_text,
            conversation_history=session.conversation_history,
            persona=session.persona,
        )

        session.conversation_history.append(
            {
                "role": "interviewer",
                "content": next_question,
                "timestamp": datetime.now().isoformat(),
            }
        )
        session.question_count += 1

        return {
            "session_id": session_id,
            "question": next_question,
            "question_number": session.question_count,
            "total_questions": session.max_questions,
            "status": "in_progress",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate question: {str(e)}") from e


@router.get("/{session_id}/feedback", response_model=InterviewFeedbackResponse)
async def get_interview_feedback(session_id: str):
    """
    Get feedback summary for a completed interview session.
    Uses LLM to analyze conversation and generate detailed feedback.
    """
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = active_sessions[session_id]

    now_utc = datetime.now(tz=timezone.utc).isoformat()
    if not session.started_at:
        session.started_at = now_utc
    if not session.ended_at:
        session.ended_at = now_utc

    # Calculate duration (timezone 통일: 'Z' → '+00:00' 변환 후 파싱)
    start = datetime.fromisoformat(session.started_at.replace("Z", "+00:00"))
    end = datetime.fromisoformat(session.ended_at.replace("Z", "+00:00"))
    duration = int((end - start).total_seconds())

    # TEST_MODE: LLM 호출 없이 고정 피드백 반환
    if settings.TEST_MODE:
        llm_feedback = {
            "scores": {
                "technical_accuracy": 82,
                "communication": 78,
                "problem_solving": 75,
                "job_fit": 80,
                "overall": 79,
            },
            "feedback_summary": "전반적으로 기술적 역량이 잘 드러나는 면접이었습니다. FastAPI와 비동기 처리에 대한 실무 경험이 구체적으로 전달되었으며, 문제 해결 과정을 논리적으로 설명하는 능력이 돋보였습니다. 다만 일부 답변에서 좀 더 구체적인 수치나 성과 지표를 함께 언급하면 설득력이 높아질 것입니다.",
            "strengths": [
                "FastAPI, WebSocket 등 기술 스택에 대한 실무 경험이 구체적으로 드러남",
                "메모리 누수 해결 사례 등 실제 문제 해결 과정을 잘 설명함",
                "데이터 기반 의사결정 접근 방식이 논리적이고 팀워크 역량을 보여줌",
            ],
            "improvements": [
                "답변에 구체적인 수치(성능 개선율, 처리량 등)를 포함하면 더 효과적",
                "프로젝트의 비즈니스 임팩트나 사용자 수 등 맥락 정보 추가 필요",
                "마지막 질문(역질문)에서 팀 문화 외에 기술적 도전 과제에 대해서도 질문하면 좋음",
            ],
            "sample_answers": [
                {
                    "question": "FastAPI를 사용한 프로젝트에서 가장 어려웠던 기술적 문제가 있었나요?",
                    "suggestion": "WebSocket 기반 실시간 처리 시 동시 접속 500명 환경에서 메모리 누수가 발생했습니다. asyncio 이벤트 루프 프로파일링으로 원인을 파악하고, connection pool 크기 조정과 weak reference 패턴을 적용하여 메모리 사용량을 40% 줄였습니다.",
                },
                {
                    "question": "팀에서 기술적 의견 충돌이 있었을 때 어떻게 해결하셨나요?",
                    "suggestion": "REST vs GraphQL 선택에서 의견이 갈렸을 때, 두 방식으로 프로토타입을 만들고 응답 시간과 개발 생산성을 비교 측정했습니다. 결과적으로 우리 서비스 특성에 맞는 REST를 선택했고, 이 과정을 통해 팀의 의사결정 프로세스도 개선되었습니다.",
                },
            ],
        }
    else:
        # LLM 기반 피드백 생성 (폴백 포함)
        try:
            llm_feedback = await llm_service.generate_interview_feedback(
                conversation_history=session.conversation_history,
                profile=session.profile,
                jd_text=session.jd_text,
                persona=session.persona,
            )
        except Exception as e:
            print(f"[Interview] LLM feedback generation failed: {e}")
            llm_feedback = llm_service._default_interview_feedback()

    return InterviewFeedbackResponse(
        session_id=session_id,
        total_questions=session.question_count,
        duration_seconds=duration,
        conversation=session.conversation_history,
        feedback_summary=llm_feedback.get("feedback_summary", ""),
        scores=llm_feedback.get("scores", {}),
        strengths=llm_feedback.get("strengths", []),
        improvements=llm_feedback.get("improvements", []),
        sample_answers=llm_feedback.get("sample_answers", []),
    )


@router.post("/end-session")
async def end_session(request: EndSessionRequest):
    """
    End an Agent-mode interview session.
    Creates a server-side session from client conversation data
    so feedback can be retrieved via GET /{session_id}/feedback.
    """
    import uuid

    session_id = str(uuid.uuid4())[:8]

    question_count = len([m for m in request.conversation if m.get("role") == "interviewer"])
    first_ts = request.conversation[0].get("timestamp") if request.conversation else None

    session = InterviewSession(
        session_id=session_id,
        profile=request.profile,
        jd_text=request.jd_text,
        persona=request.persona,
        conversation_history=request.conversation,
        question_count=question_count,
        started_at=first_ts or datetime.now(tz=timezone.utc).isoformat(),
        ended_at=datetime.now(tz=timezone.utc).isoformat(),
    )

    active_sessions[session_id] = session
    return {"session_id": session_id}


# ============ TTS Test Endpoint ============


@router.post("/test-tts")
async def test_tts_endpoint(text: str = "마이크 테스트 하나 둘 셋"):
    """Test TTS generation. Returns audio/mpeg bytes."""
    from fastapi.responses import Response

    try:
        audio_chunks = []
        async for chunk in elevenlabs_service.text_to_speech_stream(text):
            audio_chunks.append(chunk)

        if not audio_chunks:
            raise HTTPException(status_code=500, detail="No audio generated")

        audio_bytes = b"".join(audio_chunks)

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Length": str(len(audio_bytes)),
                "Content-Disposition": "inline; filename=tts_output.mp3",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}") from e


# ============ Agent Auth Endpoint ============


@router.post("/agent-auth")
async def get_agent_auth():
    """Get signed URL for ElevenLabs Agent authentication."""
    agent_id = settings.ELEVENLABS_AGENT_ID

    if not agent_id or agent_id.startswith("your_"):
        return {
            "signed_url": None,
            "agent_id": None,
            "error": "Agent ID not configured in .env",
        }

    try:
        signed_url = await elevenlabs_service.get_signed_url(agent_id)
        return {"signed_url": signed_url, "agent_id": agent_id}
    except Exception as e:
        # Signed URL 실패 시 agent_id만 반환 (public agent는 직접 연결 가능)
        print(f"[Interview] Signed URL failed: {e}. Falling back to agentId only.")
        return {"signed_url": None, "agent_id": agent_id}


# ============ WebSocket Endpoint (Full-Duplex) ============


@router.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    """
    Real-time Full-Duplex Interview WebSocket.

    - Client sends: Binary Audio (PCM 16kHz) or JSON control messages
    - Server sends: JSON Control Actions + Audio (Base64)
    """
    await websocket.accept()

    if session_id not in active_sessions:
        await websocket.close(code=4000, reason="Session not found")
        return

    session = active_sessions[session_id]

    from app.services.stt_service import stt_service

    audio_queue = asyncio.Queue()
    current_transcript: list[str] = []
    is_ai_speaking = False
    interrupt_event = asyncio.Event()

    # --- Callbacks for STT Service ---

    async def on_speech_started():
        """Barge-in: User started speaking, interrupt AI."""
        nonlocal is_ai_speaking
        if is_ai_speaking:
            interrupt_event.set()
            await websocket.send_json({"type": "interrupted", "content": "Listening..."})
            is_ai_speaking = False

    async def on_transcript(text: str, is_final: bool):
        """Received transcript from STT."""
        await websocket.send_json(
            {
                "type": "transcript",
                "role": "user",
                "content": text,
                "is_final": is_final,
            }
        )
        if is_final:
            current_transcript.append(text)

    async def on_utterance_end():
        """User finished speaking. Process response."""
        full_text = " ".join(current_transcript).strip()
        current_transcript.clear()

        if not full_text:
            return

        # 1. Update Session History
        session.conversation_history.append(
            {
                "role": "candidate",
                "content": full_text,
                "timestamp": datetime.now().isoformat(),
            }
        )

        # 2. Check End Condition
        if session.question_count >= session.max_questions:
            session.ended_at = datetime.now().isoformat()
            await websocket.send_json(
                {
                    "type": "status",
                    "content": "면접이 종료되었습니다. 수고하셨습니다!",
                    "status": "completed",
                }
            )
            return

        # 3. Generate AI Response
        await websocket.send_json({"type": "status", "content": "생각 중..."})

        try:
            next_question = await llm_service.generate_interview_question(
                profile=session.profile,
                jd_text=session.jd_text,
                conversation_history=session.conversation_history,
                persona=session.persona,
            )

            session.conversation_history.append(
                {
                    "role": "interviewer",
                    "content": next_question,
                    "timestamp": datetime.now().isoformat(),
                }
            )
            session.question_count += 1

            await websocket.send_json(
                {
                    "type": "question",
                    "content": next_question,
                    "question_number": session.question_count,
                }
            )

            # 4. Stream TTS
            await stream_tts_response(next_question)

        except Exception as e:
            print(f"Error generating response: {e}")
            await websocket.send_json(
                {"type": "error", "content": "질문 생성 중 오류가 발생했습니다."}
            )

    async def stream_tts_response(text: str):
        """Stream TTS audio to client, respecting interruption."""
        nonlocal is_ai_speaking
        is_ai_speaking = True
        interrupt_event.clear()

        try:
            async for audio_chunk in elevenlabs_service.text_to_speech_stream(
                text, persona=session.persona
            ):
                if interrupt_event.is_set():
                    break

                await websocket.send_json(
                    {
                        "type": "audio",
                        "audio_base64": base64.b64encode(audio_chunk).decode(),
                    }
                )
        except Exception as e:
            print(f"TTS Streaming error: {e}")
        finally:
            is_ai_speaking = False

    # --- Generator & Loops ---

    async def audio_feed_generator():
        """Yields audio chunks from queue for STT service."""
        while True:
            chunk = await audio_queue.get()
            if chunk is None:
                break
            yield chunk

    async def receive_loop():
        """Receive WebSocket messages (Audio/JSON)."""
        try:
            while True:
                message = await websocket.receive()

                if "bytes" in message:
                    await audio_queue.put(message["bytes"])

                elif "text" in message:
                    try:
                        data = json.loads(message["text"])
                        if data.get("type") == "cancel":
                            await on_speech_started()
                    except (json.JSONDecodeError, ValueError):
                        pass

        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"WS Receiver Error: {e}")
        finally:
            await audio_queue.put(None)

    # --- Start Execution ---

    stt_task = None
    try:
        await websocket.send_json(
            {"type": "status", "content": "면접을 시작합니다. 목소리가 들리면 대답해주세요."}
        )

        # Send pending question if exists
        if (
            session.conversation_history
            and session.conversation_history[-1]["role"] == "interviewer"
        ):
            last_q = session.conversation_history[-1]["content"]
            await websocket.send_json(
                {
                    "type": "question",
                    "content": last_q,
                    "question_number": session.question_count,
                }
            )
            asyncio.create_task(stream_tts_response(last_q))

        # Run STT and Receive Loop concurrently
        stt_task = asyncio.create_task(
            stt_service.transcribe_stream(
                audio_feed_generator(),
                on_transcript=on_transcript,
                on_speech_started=on_speech_started,
                on_utterance_end=on_utterance_end,
                language="ko",
            )
        )

        await receive_loop()

    except WebSocketDisconnect:
        print(f"Session {session_id}: Client disconnected")
    except Exception as e:
        print(f"WS Session Error: {e}")
    finally:
        if stt_task:
            stt_task.cancel()
        print(f"Session {session_id} disconnected")
