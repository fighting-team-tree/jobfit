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
        
        Uses 2-phase hybrid approach:
        1. LLM extracts JD requirements and profile skills
        2. Embedding service matches skills deterministically
        """
        # Step 1: Extract skills from JD and Profile using LLM (deterministic extraction)
        extraction = await self._extract_skills(profile, jd_text)
        
        if extraction.get("error"):
            return {"error": "Failed to extract skills", "raw": extraction}

        # Step 2: Match skills using embeddings (deterministic matching)
        from app.services.skill_matcher_service import skill_matcher_service
        
        match_result = await skill_matcher_service.match_skills(
            profile_skills=extraction["profile_skills"],
            required_skills=extraction["required_skills"],
            preferred_skills=extraction["preferred_skills"]
        )
        
        # Step 3: Generate qualitative feedback using LLM
        feedback = await self._generate_feedback(match_result, profile, jd_text)
        
        # Combine results
        return {
            "match_score": match_result.total_score,
            "matching_skills": match_result.matching_skills,
            "missing_skills": match_result.missing_skills,
            "recommendations": feedback.get("recommendations", []),
            "strengths": feedback.get("strengths", []),
            "areas_to_improve": feedback.get("areas_to_improve", []),
            # Detailed breakdown
            "jd_analysis": {
                "required_skills": extraction["required_skills"],
                "preferred_skills": extraction["preferred_skills"]
            },
            "profile_skills": match_result.profile_skills,
            "matching_required": match_result.matching_required,
            "missing_required": match_result.missing_required,
            "matching_preferred": match_result.matching_preferred,
            "missing_preferred": match_result.missing_preferred,
            "score_breakdown": {
                "required_matched": match_result.required_matched_count,
                "required_total": match_result.required_total_count,
                "preferred_matched": match_result.preferred_matched_count,
                "preferred_total": match_result.preferred_total_count,
                "required_score": match_result.required_score,
                "preferred_score": match_result.preferred_score
            }
        }

    async def _extract_skills(self, profile: dict, jd_text: str) -> dict:
        """Extract structured skills from Profile and JD."""
        prompt = f"""당신은 데이터 추출 전문가입니다.
다음 텍스트에서 기술 스택(Skills)을 추출하여 JSON으로 반환하세요.

### 1. JD (채용공고)
- **필수 요건 (Required)**: 반드시 충족해야 하는 기술/역량
- **우대 요건 (Preferred)**: 있으면 가산점이 되는 기술/역량

### 2. 프로필 (중요)
- `skills` 리스트뿐만 아니라, **`experience`, `projects`의 설명(description)에 포함된 기술**도 빠짐없이 추출하세요.
- 예: "Llama-3 70B 파인튜닝" -> "Llama-3", "Fine-tuning" 추출
- 예: "VLM 활용 로봇 제어" -> "VLM", "Robot Control" 추출

---

### 입력 데이터
**프로필:**
{profile}

**채용공고(JD):**
{jd_text}

---

### 출력 형식 (JSON)
```json
{{
    "required_skills": ["필수 기술 목록"],
    "preferred_skills": ["우대 기술 목록"],
    "profile_skills": ["프로필에서 추출한 모든 기술 (상세 스택 포함)"]
}}
```
JSON만 응답하세요."""
        
        return await self._call_llm(prompt, temperature=0.0)

    async def _generate_feedback(self, match_result, profile: dict, jd_text: str) -> dict:
        """Generate qualitative feedback based on match results."""
        prompt = f"""갭 분석 결과를 바탕으로 피드백을 생성해주세요.

### 분석 결과
- **매칭 점수**: {match_result.total_score}점
- **부족한 필수 역량**: {match_result.missing_required}
- **부족한 우대 역량**: {match_result.missing_preferred}
- **보유 역량**: {match_result.matching_skills}

### 요청 사항
1. **recommendations**: 부족한 역량을 보완하기 위한 구체적인 학습 조언 (공식 문서 링크 등 포함 가능)
2. **strengths**: 지원자의 강점 (매칭된 핵심 역량 중심)
3. **areas_to_improve**: 개선이 필요한 영역 요약

### 출력 형식 (JSON)
```json
{{
    "recommendations": ["..."],
    "strengths": ["..."],
    "areas_to_improve": ["..."]
}}
```
JSON만 응답하세요."""

        return await self._call_llm(prompt, temperature=0.3)

    async def _call_llm(self, prompt: str, temperature: float = 0.1) -> dict:
        """Helper to call NVIDIA LLM."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self.headers,
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant. Output valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": temperature,
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
                return {"error": True, "raw": content}

    
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
