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
        started_at=datetime.now().isoformat()
    )
    
    # Generate first question
    try:
        first_question = await nvidia_service.generate_interview_question(
            profile=request.profile,
            jd_text=request.jd_text,
            conversation_history=[],
            persona=request.persona
        )
        
        session.conversation_history.append({
            "role": "interviewer",
            "content": first_question,
            "timestamp": datetime.now().isoformat()
        })
        session.question_count = 1
        
        active_sessions[session_id] = session
        
        return {
            "session_id": session_id,
            "question": first_question,
            "question_number": 1,
            "total_questions": request.max_questions,
            "persona": request.persona
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {str(e)}")


@router.post("/{session_id}/respond")
async def respond_to_question(session_id: str, answer: str):
    """
    Submit an answer and get the next question.
    
    - **session_id**: Active session ID
    - **answer**: User's answer to the current question
    """
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    
    # Record user's answer
    session.conversation_history.append({
        "role": "candidate",
        "content": answer,
        "timestamp": datetime.now().isoformat()
    })
    
    # Check if we've reached max questions
    if session.question_count >= session.max_questions:
        session.ended_at = datetime.now().isoformat()
        return {
            "session_id": session_id,
            "status": "completed",
            "message": "면접이 종료되었습니다. 피드백을 확인해주세요.",
            "total_questions": session.question_count
        }
    
    # Generate next question
    try:
        next_question = await nvidia_service.generate_interview_question(
            profile=session.profile,
            jd_text=session.jd_text,
            conversation_history=session.conversation_history,
            persona=session.persona
        )
        
        session.conversation_history.append({
            "role": "interviewer",
            "content": next_question,
            "timestamp": datetime.now().isoformat()
        })
        session.question_count += 1
        
        return {
            "session_id": session_id,
            "question": next_question,
            "question_number": session.question_count,
            "total_questions": session.max_questions,
            "status": "in_progress"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate question: {str(e)}")


@router.get("/{session_id}/feedback", response_model=InterviewFeedbackResponse)
async def get_interview_feedback(session_id: str):
    """
    Get feedback summary for a completed interview session.
    """
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    
    if not session.ended_at:
        session.ended_at = datetime.now().isoformat()
    
    # Calculate duration
    start = datetime.fromisoformat(session.started_at)
    end = datetime.fromisoformat(session.ended_at)
    duration = int((end - start).total_seconds())
    
    # Generate feedback (in production, use AI for detailed analysis)
    feedback_summary = f"""
면접 세션이 완료되었습니다.

📊 요약:
- 총 {session.question_count}개의 질문에 답변하셨습니다.
- 소요 시간: {duration // 60}분 {duration % 60}초
- 면접관 스타일: {session.persona}

💡 피드백:
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
            "overall": 75
        }
    )


# ============ WebSocket Endpoint ============

@router.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    """
    Real-time interview WebSocket connection.
    
    Message format (client -> server):
    {
        "type": "answer",
        "content": "사용자 답변 텍스트"
    }
    
    Message format (server -> client):
    {
        "type": "question" | "audio" | "status" | "error",
        "content": "질문/상태 텍스트",
        "audio_base64": "base64 encoded audio (for audio type)"
    }
    """
    await websocket.accept()
    
    if session_id not in active_sessions:
        await websocket.send_json({
            "type": "error",
            "content": "Session not found. Please start a new interview."
        })
        await websocket.close()
        return
    
    session = active_sessions[session_id]
    
    try:
        # Send initial status
        await websocket.send_json({
            "type": "status",
            "content": "면접이 시작되었습니다. 질문을 보내드립니다."
        })
        
        # Send first question with audio
        if session.conversation_history:
            last_question = session.conversation_history[-1]["content"]
            
            # Send text first
            await websocket.send_json({
                "type": "question",
                "content": last_question,
                "question_number": session.question_count
            })
            
            # Stream audio
            try:
                async for audio_chunk in elevenlabs_service.text_to_speech_stream(
                    last_question,
                    persona=session.persona
                ):
                    await websocket.send_json({
                        "type": "audio",
                        "audio_base64": base64.b64encode(audio_chunk).decode()
                    })
            except Exception as e:
                print(f"Audio streaming error: {e}")
        
        # Listen for answers
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "answer":
                answer = data.get("content", "")
                
                # Record answer
                session.conversation_history.append({
                    "role": "candidate",
                    "content": answer,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Check if interview should end
                if session.question_count >= session.max_questions:
                    session.ended_at = datetime.now().isoformat()
                    await websocket.send_json({
                        "type": "status",
                        "content": "면접이 종료되었습니다. 수고하셨습니다!"
                    })
                    break
                
                # Generate next question
                await websocket.send_json({
                    "type": "status",
                    "content": "답변을 분석하고 있습니다..."
                })
                
                next_question = await nvidia_service.generate_interview_question(
                    profile=session.profile,
                    jd_text=session.jd_text,
                    conversation_history=session.conversation_history,
                    persona=session.persona
                )
                
                session.conversation_history.append({
                    "role": "interviewer",
                    "content": next_question,
                    "timestamp": datetime.now().isoformat()
                })
                session.question_count += 1
                
                # Send question
                await websocket.send_json({
                    "type": "question",
                    "content": next_question,
                    "question_number": session.question_count
                })
                
                # Stream audio
                try:
                    async for audio_chunk in elevenlabs_service.text_to_speech_stream(
                        next_question,
                        persona=session.persona
                    ):
                        await websocket.send_json({
                            "type": "audio",
                            "audio_base64": base64.b64encode(audio_chunk).decode()
                        })
                except Exception as e:
                    print(f"Audio streaming error: {e}")
            
            elif data.get("type") == "end":
                session.ended_at = datetime.now().isoformat()
                await websocket.send_json({
                    "type": "status",
                    "content": "면접이 종료되었습니다."
                })
                break
    
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "content": f"Error: {str(e)}"
        })
    finally:
        await websocket.close()
