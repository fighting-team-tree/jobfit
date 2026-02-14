import base64
import io
import os
import re

import fitz  # PyMuPDF
import httpx
from dotenv import load_dotenv
from PIL import Image

# .env 파일 로드
load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"


def mask_pii(text: str) -> str:
    """
    개인정보(이메일, 전화번호)를 마스킹 처리합니다.
    """
    # 이메일 마스킹
    email_regex = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    text = re.sub(email_regex, "[EMAIL_REDACTED]", text)

    # 전화번호 마스킹 (010-1234-5678, 01012345678 등)
    phone_regex = r"\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}"
    text = re.sub(phone_regex, "[PHONE_REDACTED]", text)

    return text


def encode_images(file_path: str) -> list[str]:
    """
    이미지 또는 PDF 파일을 Base64 문자열 리스트로 인코딩합니다.
    PDF의 경우 모든 페이지를 이미지로 변환합니다.
    """
    ext = os.path.splitext(file_path)[1].lower()
    base64_images = []

    if ext == ".pdf":
        # PDF 파일 처리 (모든 페이지 추출)
        doc = fitz.open(file_path)
        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 고해상도 (2x)
            img_data = pix.tobytes("png")
            base64_images.append(base64.b64encode(img_data).decode("utf-8"))
        doc.close()
    else:
        # 이미지 파일 처리 (해상도가 낮으면 업스케일링)
        with Image.open(file_path) as img:
            if img.width < 1500:
                scale = 2000 / img.width
                new_size = (int(img.width * scale), int(img.height * scale))
                img = img.resize(new_size, Image.Resampling.LANCZOS)

            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            base64_images.append(base64.b64encode(buffered.getvalue()).decode("utf-8"))

    return base64_images


async def test_nvidia_vision_parse(image_path: str):
    """
    NVIDIA NIM API를 사용하여 이력서를 파싱합니다.
    (Nemotron-Parse 1.1 모델 사용)
    """
    if not NVIDIA_API_KEY:
        print("Error: NVIDIA_API_KEY가 설정되지 않았습니다.")
        return

    base64_list = encode_images(image_path)

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    all_raw_contents = []

    print(f"Calling NVIDIA NIM API (Llama 3.2 90B) for {image_path} ({len(base64_list)} pages)...")

    async with httpx.AsyncClient() as client:
        for i, b64 in enumerate(base64_list):
            print(f"  - Parsing page {i + 1}/{len(base64_list)}...")

            payload = {
                "model": "meta/llama-3.2-90b-vision-instruct",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Extract all text from this resume image into structured Markdown. If the image is blurry, do your best to read the main sections. IMPORTANT: Do not repeat any text or phrases. Output the content clearly and concisely.",
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{b64}"},
                            },
                        ],
                    }
                ],
                "max_tokens": 4096,
                "temperature": 0.1,
            }

            response = await client.post(API_URL, headers=headers, json=payload, timeout=120.0)

            if response.status_code == 200:
                result = response.json()
                page_content = result["choices"][0]["message"].get("content")
                if page_content:
                    all_raw_contents.append(page_content)
                else:
                    print(f"Debug: No content in response: {result}")
            else:
                print(f"Error on page {i + 1}: {response.status_code}")
                print(response.text)

    if all_raw_contents:
        raw_content = "\n\n---\n\n".join(all_raw_contents)
        print("\n--- Raw Content (Snippet) ---")
        raw_content_str = str(raw_content)
        print(raw_content_str[:500] + "..." if len(raw_content_str) > 500 else raw_content_str)

        # PII 마스킹 처리
        masked_content = mask_pii(raw_content_str)

        # 결과 저장
        with open("parsing_result.md", "w", encoding="utf-8") as f:
            f.write(masked_content)

        print("\n결과가 parsing_result.md에 저장되었습니다.")
    else:
        print("Error: 모델로부터 내용을 추출하지 못했습니다.")


if __name__ == "__main__":
    import asyncio
    import sys

    if len(sys.argv) < 2:
        print("Usage: python tests/test_nvidia_parse.py <image_path>")
    else:
        asyncio.run(test_nvidia_vision_parse(sys.argv[1]))
