"""
Interview API Endpoints

Handles real-time mock interview via WebSocket with ElevenLabs TTS.
"""

import asyncio
import json
import base64
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.services.nvidia_service import nvidia_service
from app.services.elevenlabs_service import elevenlabs_service
from app.core.config import settings

router = APIRouter()


# ============ Request/Response Models ============


class InterviewSession(BaseModel):
    """Interview session state."""

    session_id: str
    profile: dict
    jd_text: str
    persona: str = "professional"  # professional, friendly, challenging
    conversation_history: List[dict] = []
    question_count: int = 0
    max_questions: int = 5
    started_at: Optional[str] = None
    ended_at: Optional[str] = None


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
    conversation: List[dict]
    feedback_summary: str
    scores: dict


class InterviewAnswerRequest(BaseModel):
    answer: str


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
        first_question = await nvidia_service.generate_interview_question(
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
        raise HTTPException(
            status_code=500, detail=f"Failed to start interview: {str(e)}"
        )


@router.post("/{session_id}/respond")
async def respond_to_question(
    session_id: str,
    request: Optional[InterviewAnswerRequest] = None,
    answer: Optional[str] = None,
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
        next_question = await nvidia_service.generate_interview_question(
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
        raise HTTPException(
            status_code=500, detail=f"Failed to generate question: {str(e)}"
        )


@router.get("/{session_id}/feedback", response_model=InterviewFeedbackResponse)
async def get_interview_feedback(session_id: str):
    """
    Get feedback summary for a completed interview session.
    """
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = active_sessions[session_id]

    if not session.started_at:
        session.started_at = datetime.now().isoformat()
    if not session.ended_at:
        session.ended_at = datetime.now().isoformat()

    # Calculate duration
    start = datetime.fromisoformat(session.started_at)
    end = datetime.fromisoformat(session.ended_at)
    duration = int((end - start).total_seconds())

    feedback_summary = f"""
면접 세션이 완료되었습니다.

총 {session.question_count}개의 질문에 답변하셨습니다.
소요 시간: {duration // 60}분 {duration % 60}초
면접관 스타일: {session.persona}

전반적으로 면접에 성실히 임해주셨습니다.
기술적 질문에 대한 답변의 구체성을 높이시면 더 좋은 인상을 남길 수 있습니다.
    """.strip()

    return InterviewFeedbackResponse(
        session_id=session_id,
        total_questions=session.question_count,
        duration_seconds=duration,
        conversation=session.conversation_history,
        feedback_summary=feedback_summary,
        scores={
            "technical_accuracy": 75,
            "communication": 80,
            "problem_solving": 70,
            "overall": 75,
        },
    )


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
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


# ============ Agent Auth Endpoint ============


@router.post("/agent-auth")
async def get_agent_auth():
    """Get signed URL for ElevenLabs Agent authentication."""
    agent_id = settings.ELEVENLABS_AGENT_ID

    if not agent_id or agent_id == "your_agent_id":
        return {
            "signed_url": None,
            "agent_id": None,
            "error": "Agent ID not configured in .env",
        }

    try:
        signed_url = await elevenlabs_service.get_signed_url(agent_id)
        return {"signed_url": signed_url, "agent_id": agent_id}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to sign URL: {str(e)}"
        )


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
            await websocket.send_json(
                {"type": "interrupted", "content": "Listening..."}
            )
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
            next_question = await nvidia_service.generate_interview_question(
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
