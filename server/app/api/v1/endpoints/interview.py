from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from app.services.elevenlabs_service import elevenlabs_service
from pydantic import BaseModel

router = APIRouter()

class TTSRequest(BaseModel):
    text: str

@router.post("/tts")
async def get_tts(request: TTSRequest):
    """
    Convert interview question text to speech.
    """
    try:
        audio_content = await elevenlabs_service.text_to_speech(request.text)
        return Response(content=audio_content, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
