"""
Code Review Service

GitHub 소스 코드를 분석하여 면접용 Code Review Brief를 생성합니다.
"""

from app.services.llm_service import llm_service
from pydantic import BaseModel, Field


class DiscussionPoint(BaseModel):
    file: str = Field(..., description="코드 파일 경로")
    line_hint: str = Field(..., description="토론 대상이 되는 코드 스니펫 또는 라인 힌트")
    topic: str = Field(..., description="토론 주제 (예: 비동기 처리, 에러 핸들링, 최적화 등)")
    question_seed: str = Field(..., description="면접관이 던질 수 있는 꼬리 질문의 초안")


class CodeReviewBrief(BaseModel):
    repo_name: str
    architecture_summary: str = Field(..., description="전체 아키텍처 및 디자인 패턴 요약")
    code_quality_notes: list[str] = Field(..., description="코드 품질에 대한 평가 (강점/약점 포함)")
    discussion_points: list[DiscussionPoint] = Field(
        ..., description="면접에서 활용할 토론 포인트 3~5개"
    )
    strengths_observed: list[str] = Field(..., description="코드에서 관찰된 강점")
    prompt_injection: str = Field(..., description="ElevenLabs 프롬프트에 주입할 요약 텍스트")


class CodeReviewService:
    """GitHub 소스 코드를 분석하여 면접용 요약(Code Review Brief)을 생성합니다."""

    async def generate_code_review_brief(
        self, repo_name: str, source_files: list[dict], profile: dict, jd_text: str
    ) -> dict:
        """
        주요 소스 파일을 LLM으로 분석하여 Code Review Brief JSON을 생성합니다.

        Args:
            repo_name: "owner/repo"
            source_files: [{"path": "...", "content": "..."}, ...]
            profile: 지원자 프로필
            jd_text: 채용 공고

        Returns:
            CodeReviewBrief 형식과 일치하는 dict
        """
        if not source_files:
            return self._empty_brief(repo_name)

        # 소스 파일 텍스트로 결합
        code_text = ""
        for f in source_files:
            code_text += f"\n\n--- [FILE: {f['path']}] ---\n{f['content']}"

        prompt = f"""당신은 시니어 개발자이자 코드 리뷰 전문가입니다.
지원자의 GitHub 리포지토리({repo_name}) 핵심 소스 코드를 분석하여, 기술 면접에서 사용할 '코드 리뷰 브리프'를 생성해주세요.

[분석 목적]
- 지원자의 실제 코드 작성 패턴, 아키텍처 설계 의도, 문제 해결 능력을 평가하기 위함.
- 면접관(AI)이 코드에 기반한 날카로운 꼬리 질문을 던질 수 있도록 '토론 포인트(Discussion Points)'를 3~5개 추출하세요.
- 단순한 문법 질문이 아닌, "왜 이 패턴을 사용했는지", "이 부분의 트레이드오프는 무엇인지", "더 나은 방법은 없는지"에 대한 질문이어야 합니다.

[채용 공고 (JD) 정보 - 참고용]
{jd_text[:1000]}

[소스 코드]
{code_text}

다음 형식의 JSON으로만 응답하세요:
{{
    "repo_name": "{repo_name}",
    "architecture_summary": "전체 아키텍처 및 디자인 패턴 1-2줄 요약",
    "code_quality_notes": ["PEP8 준수", "에러 핸들링 부재" 등 2-3개],
    "discussion_points": [
        {{
            "file": "파일 경로",
            "line_hint": "어떤 코드/함수인지 힌트",
            "topic": "토론 주제",
            "question_seed": "면접관이 던질 구체적인 압박/심층 질문 문장"
        }}
    ],
    "strengths_observed": ["관찰된 강점 1", "강점 2"],
    "prompt_injection": "이 전체 분석 결과를 500자 이내의 평문으로 요약. 면접관 프롬프트에 바로 주입될 텍스트이므로, '지원자의 코드 요약: ~ 특징이 있으며, ~에 대해 중점적으로 질문하세요. 주요 질문 포인트는 1) ~, 2) ~ 입니다' 형태로 작성"
}}
"""

        result = await llm_service.call_llm_json(
            prompt,
            system_msg="You are an expert code reviewer. Always respond with valid JSON only.",
            model=llm_service.parse_model,
            temperature=0.2,
            max_tokens=2500,
        )

        if result.get("error"):
            print(f"[CodeReviewService] LLM generation failed: {result.get('raw')}")
            return self._empty_brief(repo_name)

        # 안전 장치: 필수 키 보장
        return {
            "repo_name": repo_name,
            "architecture_summary": result.get("architecture_summary", "아키텍처 요약 없음"),
            "code_quality_notes": result.get("code_quality_notes", []),
            "discussion_points": result.get("discussion_points", []),
            "strengths_observed": result.get("strengths_observed", []),
            "prompt_injection": result.get(
                "prompt_injection",
                "코드 분석 결과를 불러오지 못했습니다. 일반적인 기술 질문을 진행하세요.",
            ),
        }

    def _empty_brief(self, repo_name: str) -> dict:
        return {
            "repo_name": repo_name,
            "architecture_summary": "소스 파일이 충분하지 않거나 분석에 실패했습니다.",
            "code_quality_notes": [],
            "discussion_points": [],
            "strengths_observed": [],
            "prompt_injection": f"{repo_name} 저장소에 대한 구체적인 코드 분석이 불가능합니다. 포트폴리오 기반의 일반적인 기술 질문으로 진행해주세요.",
        }


# 싱글톤 인스턴스
code_review_service = CodeReviewService()
