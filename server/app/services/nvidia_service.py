import os
import base64
import httpx
from typing import Dict, Any
from app.core.config import settings

class NvidiaService:
    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY
        self.base_url = "https://ai.api.nvidia.com/v1/vlm/microsoft/phi-3-vision-128k-instruct" # Example NIM model

    async def parse_resume(self, file_content: bytes) -> Dict[str, Any]:
        """
        Parses resume bytes using NVIDIA NIM VLM.
        """
        if not self.api_key:
            raise ValueError("NVIDIA_API_KEY is not set")

        base64_image = base64.b64encode(file_content).decode("utf-8")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }

        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all information from this resume and format it as valid JSON including name, contact, skills, experience, and education."},
                        {"type": "image_url", "image_url": {"url": f"data:image/pdf;base64,{base64_image}"}} # Note: Many VLMs support images, PDF might need conversion
                    ]
                }
            ],
            "max_tokens": 1024,
            "temperature": 0.2
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            
            # Assuming the model returns JSON in the content
            content = result['choices'][0]['message']['content']
            
            # [NeMo Curator Integration] 
            # Scrub PII from the raw text extracted by VLM before any further processing or storage.
            # This ensures that even if the VLM extracted personal details, we don't persist them in our structured data.
            from app.services.privacy_service import privacy_service
            content = privacy_service.scrub(content)

            # Simple cleaning if it returns markdown
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            
            import json
            return json.loads(content)

nvidia_service = NvidiaService()
