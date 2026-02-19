"""
Multi-Provider LLM Service

Provider-agnostic LLM service using OpenAI SDK.
Supports Gemini (via OpenAI-compatible API) and OpenAI.
Replaces nvidia_service.py for all LLM calls.
"""

import json
import re

from openai import AsyncOpenAI

from app.core.config import settings


class LLMService:
    """Provider-agnostic LLM service using OpenAI SDK."""

    def __init__(self):
        provider = settings.LLM_PROVIDER

        if provider == "gemini":
            self.client = AsyncOpenAI(
                api_key=settings.GOOGLE_API_KEY,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
            self.model = settings.LLM_MODEL or "gemini-2.5-flash"
        else:  # openai
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.LLM_MODEL or "gpt-4o-mini"

    async def _call_llm(
        self,
        messages: list[dict],
        temperature: float = 0.1,
        max_tokens: int = 2000,
    ) -> str:
        """공용 LLM 호출 헬퍼."""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        content = response.choices[0].message.content
        return content or ""

    async def _call_llm_json(
        self,
        prompt: str,
        system_msg: str = "You are a helpful assistant. Output valid JSON only.",
        temperature: float = 0.1,
        max_tokens: int = 2000,
    ) -> dict:
        """JSON 응답 파싱 포함 헬퍼."""
        content = await self._call_llm(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return self._parse_json(content)

    @staticmethod
    def _parse_json(content: str) -> dict:
        """LLM 응답에서 JSON 추출. Gemini/OpenAI 모두 대응."""
        if not content:
            return {"error": True, "raw": ""}

        # 1) ```json ... ``` 코드 블록에서 추출
        json_block_match = re.search(r"```(?:json)?\s*\n?(.*?)```", content, re.DOTALL)
        if json_block_match:
            try:
                return json.loads(json_block_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # 2) 전체 텍스트를 바로 JSON 파싱 시도
        try:
            return json.loads(content.strip())
        except json.JSONDecodeError:
            pass

        # 3) 텍스트 내 첫 번째 { ... } 블록 추출
        brace_match = re.search(r"\{.*\}", content, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError:
                pass

        return {"error": True, "raw": content}

    # ===== nvidia_service.py 1:1 대체 메서드들 =====

    async def parse_resume(self, resume_text: str) -> dict:
        """Parse resume text into structured JSON."""
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

        result = await self._call_llm_json(
            prompt,
            system_msg="You are a resume parsing assistant. Always respond with valid JSON only.",
        )
        if result.get("error"):
            return {"raw_text": result.get("raw", ""), "parse_error": True}
        return result

    async def analyze_gap(self, profile: dict, jd_text: str) -> dict:
        """
        Analyze the gap between user profile and job description.

        Uses 2-phase hybrid approach:
        1. LLM extracts JD requirements and profile skills
        2. Embedding service matches skills deterministically
        """
        extraction = await self._extract_skills(profile, jd_text)

        if extraction.get("error"):
            return {"error": "Failed to extract skills", "raw": extraction}

        # 키 누락 방어: Gemini가 다른 키명을 사용할 수 있음
        profile_skills = extraction.get("profile_skills", [])
        required_skills = extraction.get("required_skills", [])
        preferred_skills = extraction.get("preferred_skills", [])

        # 프로필 스킬이 비어있으면 원본 profile에서 보충
        if not profile_skills:
            profile_skills = profile.get("skills", [])

        from app.services.skill_matcher_service import skill_matcher_service

        match_result = await skill_matcher_service.match_skills(
            profile_skills=profile_skills,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
        )

        feedback = await self._generate_feedback(match_result, profile, jd_text)

        return {
            "match_score": match_result.total_score,
            "matching_skills": match_result.matching_skills,
            "missing_skills": match_result.missing_skills,
            "recommendations": feedback.get("recommendations", []),
            "strengths": feedback.get("strengths", []),
            "areas_to_improve": feedback.get("areas_to_improve", []),
            "jd_analysis": {
                "required_skills": extraction["required_skills"],
                "preferred_skills": extraction["preferred_skills"],
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
                "preferred_score": match_result.preferred_score,
            },
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

        return await self._call_llm_json(prompt, temperature=0.0)

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

        return await self._call_llm_json(prompt, temperature=0.3)

    async def generate_interview_question(
        self, profile: dict, jd_text: str, conversation_history: list, persona: str = "professional"
    ) -> str:
        """Generate an interview question with follow-up and adaptive difficulty."""
        persona_prompts = {
            "professional": "당신은 전문적이고 차분한 면접관입니다. 기술적 깊이를 확인하는 질문을 합니다.",
            "friendly": "당신은 친근하고 편안한 분위기의 면접관입니다. 지원자가 편하게 답변할 수 있도록 합니다.",
            "challenging": "당신은 도전적인 면접관입니다. 지원자의 문제 해결 능력을 테스트합니다.",
        }

        history_text = "\n".join(
            [
                f"{'면접관' if m['role'] == 'interviewer' else '지원자'}: {m['content']}"
                for m in conversation_history[-6:]
            ]
        )

        prompt = f"""{persona_prompts.get(persona, persona_prompts["professional"])}

지원자 프로필:
{profile}

채용공고:
{jd_text}

대화 기록:
{history_text}

위 정보를 바탕으로 다음 면접 질문 하나를 생성하세요.

## 꼬리 질문 규칙
- 이전 답변이 모호하거나 추상적이면 반드시 구체화를 요청하는 꼬리 질문을 하세요.
  예: "조금 더 구체적으로 설명해주실 수 있나요?", "그 과정에서 본인의 역할은 구체적으로 무엇이었나요?"
- 이전 답변이 충실하면 같은 주제를 더 깊이 파거나 새로운 주제로 전환하세요.
- STAR 기법(Situation-Task-Action-Result) 요소가 빠진 답변에는 빠진 요소를 유도하는 질문을 하세요.

## 적응형 난이도
- 이전 답변 품질을 평가하고 난이도를 조절하세요:
  - 답변이 구체적이고 기술적 깊이가 있으면 → 더 어려운 심화 질문
  - 답변이 짧거나 일반적이면 → 기초적이고 열린 질문으로 유도
- 질문은 한국어로, 간결하게 작성하세요.
- 질문만 출력하세요."""

        content = await self._call_llm(
            messages=[
                {
                    "role": "system",
                    "content": persona_prompts.get(persona, persona_prompts["professional"]),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=200,
        )
        return content.strip()

    async def generate_interview_feedback(
        self,
        conversation_history: list[dict],
        profile: dict,
        jd_text: str,
        persona: str = "professional",
    ) -> dict:
        """면접 대화 내용을 분석하여 상세 피드백 생성."""
        history_text = "\n".join(
            f"{'면접관' if m.get('role') == 'interviewer' else '지원자'}: {m.get('content', '')}"
            for m in conversation_history
        )

        # 프로필 요약 (너무 길면 truncate)
        profile_summary = json.dumps(profile, ensure_ascii=False, default=str)
        if len(profile_summary) > 1000:
            profile_summary = profile_summary[:1000] + "..."

        prompt = f"""당신은 채용 면접 평가 전문가입니다. 다음 면접 대화를 분석하여 평가해주세요.

## 면접 정보
- 면접관 스타일: {persona}
- 지원 포지션 (채용공고): {jd_text[:500] if len(jd_text) > 500 else jd_text}

## 지원자 프로필
{profile_summary}

## 대화 기록
{history_text}

## 평가 기준
1. technical_accuracy (0-100): 기술적 정확성 - 답변의 기술적 깊이와 정확성
2. communication (0-100): 커뮤니케이션 - 답변 구조, 논리적 전개, 명확성
3. problem_solving (0-100): 문제 해결력 - 상황 대처, 구체적 사례 제시
4. job_fit (0-100): 직무 적합성 - JD 요구사항과의 부합도
5. overall (0-100): 종합 평가

## STAR 분석
행동 기반 답변(경험 사례)에 대해 STAR 기법 요소 분석을 수행하세요:
- S(Situation): 상황 설명이 있는가
- T(Task): 본인의 과업/역할이 명시되었는가
- A(Action): 구체적 행동이 서술되었는가
- R(Result): 결과/성과가 언급되었는가

## 응답 형식 (JSON)
{{
    "scores": {{
        "technical_accuracy": 0,
        "communication": 0,
        "problem_solving": 0,
        "job_fit": 0,
        "overall": 0
    }},
    "feedback_summary": "2-3문장 종합 평가",
    "strengths": ["강점 1", "강점 2"],
    "improvements": ["개선점 1", "개선점 2"],
    "sample_answers": [
        {{"question": "질문 내용", "suggestion": "더 좋은 답변 예시"}}
    ],
    "star_analysis": [
        {{
            "question": "해당 질문",
            "answer_summary": "답변 요약",
            "situation": true,
            "task": true,
            "action": true,
            "result": false,
            "feedback": "Result 요소가 빠져 있습니다. 구체적인 성과 수치를 추가하면 좋겠습니다."
        }}
    ]
}}
JSON만 응답하세요."""

        result = await self._call_llm_json(
            prompt,
            system_msg="You are an expert interview evaluator. Always respond with valid JSON only.",
            temperature=0.3,
            max_tokens=2500,
        )

        if result.get("error"):
            return self._default_interview_feedback()

        # scores 검증: 모든 키가 있는지 확인
        required_score_keys = ["technical_accuracy", "communication", "problem_solving", "job_fit", "overall"]
        scores = result.get("scores", {})
        for key in required_score_keys:
            if key not in scores:
                scores[key] = 70

        result["scores"] = scores
        return result

    @staticmethod
    def _default_interview_feedback() -> dict:
        """LLM 실패 시 기본 피드백."""
        return {
            "scores": {
                "technical_accuracy": 70,
                "communication": 70,
                "problem_solving": 70,
                "job_fit": 70,
                "overall": 70,
            },
            "feedback_summary": "면접 피드백을 생성하지 못했습니다. 다시 시도해주세요.",
            "strengths": [],
            "improvements": [],
            "sample_answers": [],
            "star_analysis": [],
        }

    async def infer_skills_from_github(
        self,
        languages: dict,
        dependencies: dict,
        readme_excerpt: str = None,
        topics: list = None,
    ) -> dict:
        """Analyze GitHub repository data and infer technical skills."""
        prompt = f"""GitHub 리포지토리 데이터를 분석하여 개발자의 기술 역량을 추론해주세요.

언어 통계 (비율 %):
{languages}

의존성 패키지:
- Python: {dependencies.get("python", [])}
- JavaScript: {dependencies.get("javascript", [])}

토픽 태그: {topics or []}

README 발췌:
{readme_excerpt[:500] if readme_excerpt else "없음"}

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

        result = await self._call_llm_json(
            prompt,
            system_msg="You are a technical recruiter AI that analyzes GitHub repositories to identify developer skills.",
            temperature=0.3,
            max_tokens=1000,
        )
        if result.get("error"):
            return {"raw_text": result.get("raw", ""), "parse_error": True}
        return result


# Singleton instance
llm_service = LLMService()
