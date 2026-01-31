import os
import base64
import re
import httpx
from dotenv import load_dotenv
from PIL import Image
import io

# .env 파일 로드
load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

def mask_pii(text: str) -> str:
    """
    개인정보(이메일, 전화번호)를 마스킹 처리합니다.
    """
    # 이메일 마스킹
    email_regex = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    text = re.sub(email_regex, '[EMAIL_REDACTED]', text)
    
    # 전화번호 마스킹 (010-1234-5678, 01012345678 등)
    phone_regex = r'\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}'
    text = re.sub(phone_regex, '[PHONE_REDACTED]', text)
    
    return text

def encode_image(image_path: str) -> str:
    """
    이미지 파일을 Base64 문자열로 인코딩합니다.
    """
    with Image.open(image_path) as img:
        # 가이드에 따라 해상도 조정 (1024x1280 ~ 1648x2048)
        # 여기서는 단순화를 위해 원본을 사용하되, 필요시 resize 로직 추가 가능
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')

async def test_nemotron_parse(image_path: str):
    """
    NVIDIA Nemotron-Parse 1.1 API를 테스트합니다.
    """
    if not NVIDIA_API_KEY:
        print("Error: NVIDIA_API_KEY가 설정되지 않았습니다.")
        return

    base64_image = encode_image(image_path)

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "nvidia/nemotron-parse-1.1",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": "Extract strictly in Markdown format preserving all tables. Focus on 'contact', 'education', 'experience', 'projects', and 'skills'."
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{base64_image}"}
                    }
                ]
            }
        ],
        "temperature": 0.1,
        "top_p": 0.7,
        "max_tokens": 4096
    }

    print(f"Calling NVIDIA NIM API for {image_path}...")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(API_URL, headers=headers, json=payload, timeout=60.0)
        
        if response.status_code == 200:
            result = response.json()
            raw_content = result['choices'][0]['message']['content']
            
            print("--- Raw Content ---")
            print(raw_content)
            
            # PII 마스킹 처리
            masked_content = mask_pii(raw_content)
            
            print("\n--- Masked Content ---")
            print(masked_content)
            
            # 결과 저장
            with open("parsing_result.md", "w", encoding="utf-8") as f:
                f.write(masked_content)
            print("\n결과가 parsing_result.md에 저장되었습니다.")
        else:
            print(f"Error: {response.status_code}")
            print(response.text)

if __name__ == "__main__":
    import asyncio
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python tests/test_nvidia_parse.py <image_path>")
    else:
        asyncio.run(test_nemotron_parse(sys.argv[1]))
