"""
Resume Parsing Service

Parses PDF/image resumes using VLM (via OpenAI SDK) and extracts structured information.
Supports Gemini and OpenAI providers.
"""

import base64
import io
import json
import re

from openai import AsyncOpenAI
from PIL import Image

try:
    import fitz  # PyMuPDF

    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

from app.core.config import settings


def mask_pii(text: str) -> str:
    """Mask PII (email, phone) in text."""
    # Email masking
    email_regex = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    text = re.sub(email_regex, "[EMAIL_REDACTED]", text)

    # Phone number masking
    phone_regex = r"\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}"
    text = re.sub(phone_regex, "[PHONE_REDACTED]", text)

    return text


class ResumeParserService:
    """Service for parsing resumes from PDF/image files using VLM (OpenAI SDK)."""

    def __init__(self):
        provider = settings.LLM_PROVIDER

        if provider == "gemini":
            self.client = AsyncOpenAI(
                api_key=settings.GOOGLE_API_KEY,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
            self.vision_model = settings.LLM_MODEL or "gemini-2.5-flash"
            self.text_model = settings.LLM_MODEL or "gemini-2.5-flash"
        else:  # openai
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.vision_model = settings.LLM_MODEL or "gpt-4o-mini"
            self.text_model = settings.LLM_MODEL or "gpt-4o-mini"

    def _extract_images_from_pdf(self, pdf_bytes: bytes) -> list[str]:
        """Extract pages from PDF as base64 images."""
        if not HAS_PYMUPDF:
            raise ImportError(
                "PyMuPDF is required for PDF parsing. Install with: pip install pymupdf"
            )

        base64_images = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x scale for quality
            img_data = pix.tobytes("png")
            base64_images.append(base64.b64encode(img_data).decode("utf-8"))

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
            return base64.b64encode(buffered.getvalue()).decode("utf-8")

    async def parse_resume_file(
        self, file_bytes: bytes, file_extension: str, apply_pii_mask: bool = True
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
            if file_extension.lower() == ".pdf":
                base64_images = self._extract_images_from_pdf(file_bytes)
            else:
                # Single image file
                base64_images = [self._encode_image(file_bytes)]

            if not base64_images:
                return {
                    "markdown": "",
                    "pages": 0,
                    "success": False,
                    "error": "No content could be extracted from the file",
                }

            # Parse each page
            all_contents = []

            for i, b64 in enumerate(base64_images):
                try:
                    response = await self.client.chat.completions.create(
                        model=self.vision_model,
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "이 이력서 이미지에서 모든 정보를 추출하여 구조화된 마크다운(Markdown) 형식으로 출력해줘. 표와 레이아웃을 최대한 유지해줘.",
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:image/png;base64,{b64}"},
                                    },
                                ],
                            }
                        ],
                        max_tokens=4096,
                        temperature=0.1,
                    )
                    page_content = response.choices[0].message.content
                    if page_content:
                        all_contents.append(page_content)
                except Exception as e:
                    print(f"Error parsing page {i + 1}: {e}")

            if not all_contents:
                return {
                    "markdown": "",
                    "pages": len(base64_images),
                    "success": False,
                    "error": "Failed to extract content from all pages",
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
                "error": None,
            }

        except Exception as e:
            return {"markdown": "", "pages": 0, "success": False, "error": str(e)}

    def _extract_json_from_text(self, text: str) -> dict | None:
        """LLM 응답 텍스트에서 JSON을 추출. Gemini/OpenAI 모두 대응."""
        if not text:
            return None

        # 1) ```json ... ``` 코드 블록에서 추출
        json_block_match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
        if json_block_match:
            try:
                return json.loads(json_block_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # 2) 전체 텍스트를 바로 JSON 파싱 시도
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            pass

        # 3) 텍스트 내 첫 번째 { ... } 블록 추출 (Gemini가 앞뒤 설명을 붙이는 경우)
        brace_match = re.search(r"\{.*\}", text, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError:
                pass

        return None

    async def parse_to_structured_json(
        self, markdown_content: str, max_retries: int = 2
    ) -> dict:
        """
        Convert parsed markdown to structured JSON using LLM.
        Gemini 모델 호환을 위해 JSON 추출 로직 강화 및 재시도 지원.

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

반드시 JSON만 응답하세요. 코드 블록이나 설명 없이 순수 JSON만 출력하세요."""

        last_error = None
        for attempt in range(max_retries):
            try:
                response = await self.client.chat.completions.create(
                    model=self.text_model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a resume parsing assistant. Always respond with valid JSON only. No markdown code blocks, no explanations.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.0,
                    max_tokens=3000,
                )

                content = response.choices[0].message.content
                if not content:
                    last_error = "LLM returned empty response"
                    continue

                parsed = self._extract_json_from_text(content)
                if parsed and not parsed.get("parse_error"):
                    return parsed

                last_error = f"JSON extraction failed from response: {content[:200]}"
            except Exception as e:
                last_error = str(e)

        return {"parse_error": True, "error": last_error or "Unknown error"}


# Singleton instance
resume_parser_service = ResumeParserService()
