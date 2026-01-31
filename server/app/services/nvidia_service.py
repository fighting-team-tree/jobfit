"""
NVIDIA NIM Service for Resume Parsing

Uses NVIDIA VLM (Nemotron) to parse resumes into structured JSON.
"""
import httpx
from typing import Optional
from app.core.config import settings


class NvidiaService:
    """NVIDIA NIM API client for document parsing and LLM inference."""
    
    BASE_URL = "https://integrate.api.nvidia.com/v1"
    
    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def parse_resume(self, resume_text: str) -> dict:
        """
        Parse resume text into structured JSON using NVIDIA LLM.
        
        Returns:
            {
                "skills": ["Python", "FastAPI", ...],
                "experience": [{"company": "...", "role": "...", "duration": "..."}],
                "education": [{"school": "...", "degree": "...", "year": "..."}],
                "projects": [{"name": "...", "description": "...", "tech_stack": [...]}]
            }
        """
        prompt = f"""다음 이력서 텍스트를 분석하여 JSON 형식으로 구조화해주세요.

이력서:
{resume_text}

다음 형식의 JSON으로 응답해주세요:
{{
    "skills": ["기술스택 목록"],
    "experience": [{{"company": "회사명", "role": "직무", "duration": "기간", "description": "업무내용"}}],
    "education": [{{"school": "학교명", "degree": "학위", "major": "전공", "year": "졸업년도"}}],
    "projects": [{{"name": "프로젝트명", "description": "설명", "tech_stack": ["사용기술"]}}],
    "certifications": ["자격증 목록"]
}}

JSON만 응답하세요."""

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self.headers,
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": "You are a resume parsing assistant. Always respond with valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 2000
                }
            )
            response.raise_for_status()
            result = response.json()
            
            # Extract JSON from response
            content = result["choices"][0]["message"]["content"]
            
            # Try to parse as JSON
            import json
            try:
                # Clean up potential markdown code blocks
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                return json.loads(content.strip())
            except json.JSONDecodeError:
                return {"raw_text": content, "parse_error": True}
    
    async def analyze_gap(self, profile: dict, jd_text: str) -> dict:
        """
        Analyze the gap between user profile and job description.
        
        Uses structured extraction and weighted scoring for accuracy.
        """
        prompt = f"""당신은 채용 전문가입니다. 사용자의 프로필과 채용공고(JD)를 정밀하게 분석해주세요.

## 분석 단계

### 1단계: JD에서 요구사항 추출
채용공고를 분석하여 다음을 명확히 구분하세요:
- **필수 요건 (Required)**: 반드시 충족해야 하는 조건
- **우대 요건 (Preferred)**: 있으면 좋은 조건

### 2단계: 프로필에서 기술 스택 추출
이력서/프로필에서 **실제로 언급된** 기술만 추출하세요:
- 프로그래밍 언어, 프레임워크, 라이브러리
- 경험한 도구, 플랫폼, 방법론
- 프로젝트에서 사용한 기술

### 3단계: 1:1 매칭
JD의 각 요구사항에 대해 프로필에 해당 역량이 있는지 확인하세요.
**유사어/동의어도 인정** (예: "파이썬" = "Python", "LLM" = "대규모 언어 모델")
**상위 개념은 인정하지 않음** (예: "AI 경험" ≠ "LangChain 경험")

### 4단계: 점수 계산
- 필수 요건 충족률: (충족한 필수 요건 수 / 전체 필수 요건 수) × 70점
- 우대 요건 충족률: (충족한 우대 요건 수 / 전체 우대 요건 수) × 30점
- **총점 = 필수 점수 + 우대 점수**

---

## 입력 데이터

### 사용자 프로필:
{profile}

### 채용공고(JD):
{jd_text}

---

## 출력 형식 (JSON)

다음 형식으로 **정확하게** 응답하세요:

```json
{{
  "jd_analysis": {{
    "required_skills": ["JD에서 추출한 필수 기술/역량 목록"],
    "preferred_skills": ["JD에서 추출한 우대 기술/역량 목록"]
  }},
  "profile_skills": ["프로필에서 추출한 모든 기술 스택"],
  "matching_required": ["필수 요건 중 충족한 항목"],
  "missing_required": ["필수 요건 중 미충족 항목"],
  "matching_preferred": ["우대 요건 중 충족한 항목"],
  "missing_preferred": ["우대 요건 중 미충족 항목"],
  "score_breakdown": {{
    "required_matched": 0,
    "required_total": 0,
    "preferred_matched": 0,
    "preferred_total": 0,
    "required_score": 0,
    "preferred_score": 0
  }},
  "match_score": 0,
  "matching_skills": ["전체 매칭된 스킬 (필수+우대)"],
  "missing_skills": ["전체 미충족 스킬 (필수 우선)"],
  "recommendations": ["부족한 스킬에 대한 구체적인 학습 권장사항"],
  "strengths": ["지원자의 강점"],
  "areas_to_improve": ["개선이 필요한 영역"]
}}
```

JSON만 응답하세요."""

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self.headers,
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": "You are an expert HR analyst. Extract requirements precisely and match skills objectively. Calculate scores using the exact formula provided. Be strict about what counts as a match."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 3000
                }
            )
            response.raise_for_status()
            result = response.json()
            
            content = result["choices"][0]["message"]["content"]
            
            import json
            try:
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                return json.loads(content.strip())
            except json.JSONDecodeError:
                return {"raw_text": content, "parse_error": True}

    
    async def generate_interview_question(
        self, 
        profile: dict, 
        jd_text: str, 
        conversation_history: list,
        persona: str = "professional"
    ) -> str:
        """
        Generate an interview question based on profile, JD, and conversation history.
        """
        persona_prompts = {
            "professional": "당신은 전문적이고 차분한 면접관입니다. 기술적 깊이를 확인하는 질문을 합니다.",
            "friendly": "당신은 친근하고 편안한 분위기의 면접관입니다. 지원자가 편하게 답변할 수 있도록 합니다.",
            "challenging": "당신은 도전적인 면접관입니다. 지원자의 문제 해결 능력을 테스트합니다."
        }
        
        history_text = "\n".join([
            f"{'면접관' if m['role'] == 'interviewer' else '지원자'}: {m['content']}"
            for m in conversation_history[-6:]  # Last 6 exchanges
        ])
        
        prompt = f"""{persona_prompts.get(persona, persona_prompts['professional'])}

지원자 프로필:
{profile}

채용공고:
{jd_text}

대화 기록:
{history_text}

위 정보를 바탕으로 다음 면접 질문 하나를 생성하세요.
- 이전 대화를 고려하여 꼬리물기 질문이나 새로운 주제의 질문을 하세요.
- 질문은 한국어로, 간결하게 작성하세요.
- 질문만 출력하세요."""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self.headers,
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": persona_prompts.get(persona, persona_prompts['professional'])},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 200
                }
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()


# Singleton instance
nvidia_service = NvidiaService()
