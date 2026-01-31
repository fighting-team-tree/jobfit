"""
ElevenLabs Voice Service for Real-time Interview

Handles WebSocket streaming with ElevenLabs Conversational AI for low-latency TTS.
"""
import asyncio
from typing import AsyncGenerator, Optional
from elevenlabs import ElevenLabs
from app.core.config import settings


class ElevenLabsService:
    """ElevenLabs TTS service for interview audio streaming."""
    
    # Korean voice IDs (change as needed)
    VOICE_IDS = {
        "professional": "21m00Tcm4TlvDq8ikWAM",  # Rachel - calm, professional
        "friendly": "AZnzlk1XvdvUeBnXmlld",       # Domi - warm, friendly
        "challenging": "VR6AewLTigWG4xSOukaG"    # Arnold - assertive
    }
    
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.client = ElevenLabs(api_key=self.api_key) if self.api_key else None
    
    async def text_to_speech_stream(
        self, 
        text: str, 
        voice_id: Optional[str] = None,
        persona: str = "professional"
    ) -> AsyncGenerator[bytes, None]:
        """
        Convert text to speech using ElevenLabs streaming API.
        
        Yields audio chunks as they are generated for low-latency playback.
        """
        if not self.client:
            raise ValueError("ElevenLabs API key not configured")
        
        selected_voice = voice_id or self.VOICE_IDS.get(persona, self.VOICE_IDS["professional"])
        
        try:
            # Use streaming for low latency
            audio_stream = self.client.text_to_speech.convert(
                text=text,
                voice_id=selected_voice,
                model_id="eleven_turbo_v2_5",  # Fastest model
                output_format="mp3_44100_128",
            )
            
            for chunk in audio_stream:
                if chunk:
                    yield chunk
                    
        except Exception as e:
            print(f"ElevenLabs TTS error: {e}")
            raise
    
    async def get_audio_bytes(
        self, 
        text: str, 
        persona: str = "professional"
    ) -> bytes:
        """
        Get complete audio bytes for a text (non-streaming).
        Useful for short responses where streaming overhead isn't worth it.
        """
        chunks = []
        async for chunk in self.text_to_speech_stream(text, persona=persona):
            chunks.append(chunk)
        return b"".join(chunks)
    
    def get_available_voices(self) -> list:
        """Get list of available voices from ElevenLabs."""
        if not self.client:
            return []
        
        try:
            voices = self.client.voices.get_all()
            return [
                {"id": v.voice_id, "name": v.name, "category": v.category}
                for v in voices.voices
            ]
        except Exception as e:
            print(f"Error fetching voices: {e}")
            return []
            
    async def get_signed_url(self, agent_id: str) -> str:
        """Get a signed URL for connecting to a Conversational Agent securely."""
        import httpx
        
        if not self.api_key:
             raise ValueError("ElevenLabs API key not configured")

        url = f"https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id={agent_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url, 
                headers={"xi-api-key": self.api_key}
            )
            response.raise_for_status()
            return response.json()["signed_url"]


# Singleton instance
elevenlabs_service = ElevenLabsService()
