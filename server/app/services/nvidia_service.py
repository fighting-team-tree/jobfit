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
        
        Returns:
            {
                "match_score": 75,
                "matching_skills": ["Python", "FastAPI"],
                "missing_skills": ["Kubernetes", "AWS"],
                "recommendations": ["Kubernetes 학습 권장", ...]
            }
        """
        prompt = f"""사용자 프로필과 채용공고(JD)를 비교하여 갭 분석을 수행해주세요.

사용자 프로필:
{profile}

채용공고(JD):
{jd_text}

다음 형식의 JSON으로 응답해주세요:
{{
    "match_score": 0-100 사이의 매칭 점수,
    "matching_skills": ["일치하는 스킬 목록"],
    "missing_skills": ["부족한 스킬 목록"],
    "recommendations": ["구체적인 학습 권장사항 (공식문서 링크 포함)"],
    "strengths": ["지원자의 강점"],
    "areas_to_improve": ["개선이 필요한 영역"]
}}

JSON만 응답하세요."""

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self.headers,
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": "You are a career coach AI. Analyze profiles and job descriptions to provide actionable insights."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000
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


    async def infer_skills_from_github(
        self,
        languages: dict,
        dependencies: dict,
        readme_excerpt: str = None,
        topics: list = None
    ) -> dict:
        """
        Analyze GitHub repository data and infer technical skills.
        
        Returns:
            {
                "primary_language": "Python",
                "frameworks": ["FastAPI", "React"],
                "skill_level": "intermediate",
                "skills_identified": ["Backend Development", "API Design"],
                "code_patterns": ["REST API", "Async Programming"]
            }
        """
        prompt = f"""GitHub 리포지토리 데이터를 분석하여 개발자의 기술 역량을 추론해주세요.

언어 통계 (비율 %):
{languages}

의존성 패키지:
- Python: {dependencies.get('python', [])}
- JavaScript: {dependencies.get('javascript', [])}

토픽 태그: {topics or []}

README 발췌:
{readme_excerpt[:500] if readme_excerpt else '없음'}

다음 형식의 JSON으로 응답해주세요:
{{
    "primary_language": "주 사용 언어",
    "frameworks": ["사용 프레임워크/라이브러리 목록"],
    "skill_level": "beginner/intermediate/advanced 중 하나",
    "skills_identified": ["추론된 기술 역량 목록"],
    "code_patterns": ["코드 패턴/아키텍처 스타일"],
    "summary": "1-2줄 요약"
}}

JSON만 응답하세요."""

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self.headers,
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": "You are a technical recruiter AI that analyzes GitHub repositories to identify developer skills."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000
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


# Singleton instance
nvidia_service = NvidiaService()
