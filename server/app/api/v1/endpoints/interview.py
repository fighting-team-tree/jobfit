from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.elevenlabs_service import elevenlabs_service
import asyncio
import json

router = APIRouter()

@router.websocket("/session")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket accepted")
    
    try:
        # Initial greeting
        initial_text = "안녕하세요! AI 면접관 Sarah입니다. 준비되셨다면 말씀해 주세요."
        # audio_bytes = await elevenlabs_service.text_to_speech(initial_text)
        # await websocket.send_bytes(audio_bytes) 
        # For now send text so client can display it, handling audio separately or client-side triggers
        
        await websocket.send_json({"type": "caption", "text": initial_text})
        
        while True:
            data = await websocket.receive_text()
            # Expecting JSON with event type or simple text for now
            # In real implementation: Receive Audio Blob -> STT -> LLM -> TTS -> Send Audio
            
            message = json.loads(data)
            
            if message.get("type") == "audio_end":
                # Simulated response logic
                user_text = "네, 알겠습니다." # Placeholder for STT result
                
                response_text = "답변 감사합니다. 다음 질문 드리겠습니다. 본인의 강점에 대해 설명해 주시겠습니까?"
                
                # 1. Send Caption
                await websocket.send_json({"type": "caption", "text": response_text})
                
                # 2. Generate Audio (ElevenLabs)
                try:
                    audio_bytes = await elevenlabs_service.text_to_speech(response_text)
                    # Send audio as binary
                    await websocket.send_bytes(audio_bytes)
                except Exception as e:
                    print(f"TTS Error: {e}")
                    await websocket.send_json({"type": "error", "message": "TTS Failed"})

    except WebSocketDisconnect:
        print("Client disconnected")
