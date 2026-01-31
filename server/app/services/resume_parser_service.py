"""
Resume Parsing Service

Parses PDF/image resumes using NVIDIA VLM and extracts structured information.
"""
import base64
import io
import re
import json
import httpx
from PIL import Image
from typing import Optional

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

from app.core.config import settings


def mask_pii(text: str) -> str:
    """Mask PII (email, phone) in text."""
    # Email masking
    email_regex = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    text = re.sub(email_regex, '[EMAIL_REDACTED]', text)
    
    # Phone number masking
    phone_regex = r'\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}'
    text = re.sub(phone_regex, '[PHONE_REDACTED]', text)
    
    return text


class ResumeParserService:
    """Service for parsing resumes from PDF/image files using NVIDIA VLM."""
    
    API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
    
    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    def _extract_images_from_pdf(self, pdf_bytes: bytes) -> list[str]:
        """Extract pages from PDF as base64 images."""
        if not HAS_PYMUPDF:
            raise ImportError("PyMuPDF is required for PDF parsing. Install with: pip install pymupdf")
        
        base64_images = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x scale for quality
            img_data = pix.tobytes("png")
            base64_images.append(base64.b64encode(img_data).decode('utf-8'))
        
        doc.close()
        return base64_images
    
    def _encode_image(self, image_bytes: bytes) -> str:
        """Encode image bytes to base64, with upscaling if needed."""
        with Image.open(io.BytesIO(image_bytes)) as img:
            # Upscale low-resolution images
            if img.width < 1500:
                scale = 2000 / img.width
                new_size = (int(img.width * scale), int(img.height * scale))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            return base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    async def parse_resume_file(
        self, 
        file_bytes: bytes, 
        file_extension: str,
        apply_pii_mask: bool = True
    ) -> dict:
        """
        Parse a resume file (PDF or image) into structured markdown.
        
        Args:
            file_bytes: Raw file bytes
            file_extension: File extension (.pdf, .png, .jpg, etc.)
            apply_pii_mask: Whether to mask PII (email, phone)
            
        Returns:
            {
                "markdown": "Extracted markdown content",
                "pages": Number of pages processed,
                "success": True/False,
                "error": Error message if any
            }
        """
        try:
            # Extract images based on file type
            if file_extension.lower() == '.pdf':
                base64_images = self._extract_images_from_pdf(file_bytes)
            else:
                # Single image file
                base64_images = [self._encode_image(file_bytes)]
            
            if not base64_images:
                return {
                    "markdown": "",
                    "pages": 0,
                    "success": False,
                    "error": "No content could be extracted from the file"
                }
            
            # Parse each page
            all_contents = []
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                for i, b64 in enumerate(base64_images):
                    payload = {
                        "model": "meta/llama-3.2-90b-vision-instruct",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "이 이력서 이미지에서 모든 정보를 추출하여 구조화된 마크다운(Markdown) 형식으로 출력해줘. 표와 레이아웃을 최대한 유지해줘."
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:image/png;base64,{b64}"}
                                    }
                                ]
                            }
                        ],
                        "max_tokens": 4096,
                        "temperature": 0.1
                    }
                    
                    response = await client.post(
                        self.API_URL, 
                        headers=self.headers, 
                        json=payload
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        page_content = result['choices'][0]['message'].get('content')
                        if page_content:
                            all_contents.append(page_content)
                    else:
                        # Log error but continue with other pages
                        print(f"Error parsing page {i+1}: {response.status_code}")
            
            if not all_contents:
                return {
                    "markdown": "",
                    "pages": len(base64_images),
                    "success": False,
                    "error": "Failed to extract content from all pages"
                }
            
            # Combine all pages
            markdown_content = "\n\n---\n\n".join(all_contents)
            
            # Apply PII masking if requested
            if apply_pii_mask:
                markdown_content = mask_pii(markdown_content)
            
            return {
                "markdown": markdown_content,
                "pages": len(base64_images),
                "success": True,
                "error": None
            }
            
        except Exception as e:
            return {
                "markdown": "",
                "pages": 0,
                "success": False,
                "error": str(e)
            }
    
    async def parse_to_structured_json(self, markdown_content: str) -> dict:
        """
        Convert parsed markdown to structured JSON using LLM.
        
        Returns:
            {
                "name": "이름",
                "skills": ["Python", "FastAPI", ...],
                "experience": [...],
                "education": [...],
                "projects": [...],
                "certifications": [...]
            }
        """
        prompt = f"""다음 이력서 마크다운을 분석하여 JSON 형식으로 구조화해주세요.

이력서:
{markdown_content}

다음 형식의 JSON으로 응답해주세요:
{{
    "name": "이름",
    "contact": {{"email": "[EMAIL_REDACTED]", "phone": "[PHONE_REDACTED]", "github": "...", "blog": "..."}},
    "skills": ["기술스택 목록"],
    "experience": [{{"company": "회사명", "role": "직무", "duration": "기간", "description": "업무내용"}}],
    "education": [{{"school": "학교명", "degree": "학위", "major": "전공", "year": "졸업년도", "gpa": "학점"}}],
    "projects": [{{"name": "프로젝트명", "description": "설명", "tech_stack": ["사용기술"], "role": "역할"}}],
    "certifications": ["자격증 목록"],
    "awards": ["수상 경력"]
}}

JSON만 응답하세요."""

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.API_URL,
                headers=self.headers,
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": "You are a resume parsing assistant. Always respond with valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 3000
                }
            )
            
            if response.status_code != 200:
                return {"parse_error": True, "error": f"API error: {response.status_code}"}
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            try:
                # Clean up potential markdown code blocks
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                return json.loads(content.strip())
            except json.JSONDecodeError:
                return {"raw_text": content, "parse_error": True}


# Singleton instance
resume_parser_service = ResumeParserService()
