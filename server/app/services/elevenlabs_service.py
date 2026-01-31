import httpx
from app.core.config import settings

class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.voice_id = "21m00Tcm4TlvDq8ikWAM" # Default voice ID (Rachel)
        self.base_url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"

    async def text_to_speech(self, text: str) -> bytes:
        """
        Converts text to speech bytes using ElevenLabs.
        """
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY is not set")

        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }

        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()
            return response.content

elevenlabs_service = ElevenLabsService()
