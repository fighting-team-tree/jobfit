"""
Problem Generator

Generates practice problems for skill development using OpenAI-compatible API.
Supports Gemini and OpenAI providers.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

from openai import AsyncOpenAI

from app.core.config import settings


@dataclass
class GeneratedProblem:
    """A generated practice problem."""

    id: str
    title: str
    description: str
    difficulty: Literal["easy", "medium", "hard"]
    problem_type: Literal["coding", "quiz", "practical"]
    skill: str
    language: str | None = None
    starter_code: str | None = None
    hints: list[str] = field(default_factory=list)
    test_cases: list[dict] = field(default_factory=list)
    solution: str | None = None
    explanation: str | None = None


class ProblemGenerator:
    """
    Generates practice problems for skill development using OpenAI-compatible API.

    Supports Gemini (via OpenAI compat) and OpenAI directly.

    Supports:
    - Coding challenges with test cases
    - Multiple choice quizzes
    - Practical exercises
    """

    def __init__(self):
        """Initialize with provider-based API client."""
        provider = settings.LLM_PROVIDER

        if provider == "gemini":
            if not settings.GOOGLE_API_KEY:
                raise ValueError("GOOGLE_API_KEY is required for Gemini provider")
            self.client = AsyncOpenAI(
                api_key=settings.GOOGLE_API_KEY,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
            self.model = settings.LLM_MODEL or "gemini-2.0-flash"
        else:  # openai
            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY is required for OpenAI provider")
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.LLM_MODEL or "gpt-4o-mini"

    async def generate_problems(
        self,
        skill: str,
        difficulty: Literal["easy", "medium", "hard"] = "medium",
        problem_type: Literal["coding", "quiz", "practical"] = "coding",
        language: str = "python",
        count: int = 1,
    ) -> list[GeneratedProblem]:
        """
        Generate practice problems for a specific skill.

        Args:
            skill: The skill to practice
            difficulty: Problem difficulty level
            problem_type: Type of problem to generate
            language: Programming language (for coding problems)
            count: Number of problems to generate

        Returns:
            List of generated problems
        """
        # 스킬 카테고리 분류 및 맞춤형 지시사항 설정
        skill_category = self._classify_skill(skill)

        # AI/ML 카테고리는 practical 타입으로 강제 변경 (프롬프트 작성 문제)
        if skill_category == "ai_ml":
            problem_type = "practical"

        coding_instruction = self._get_skill_instruction(skill, skill_category, language)

        type_instructions = {
            "coding": coding_instruction,
            "quiz": (
                "다음 요소를 포함하는 객관식 퀴즈를 만들어주세요:\n"
                "- 명확한 질문\n"
                "- 4개의 선택지 (A, B, C, D)\n"
                "- 정답\n"
                "- 각 선택지에 대한 설명"
            ),
            "practical": (
                "다음 요소를 포함하는 실습 과제를 만들어주세요:\n"
                "- 실제 시나리오\n"
                "- 단계별 요구사항\n"
                "- 예상 결과물\n"
                "- 평가 기준"
            ),
        }

        # practical 타입 (프롬프트 작성)과 coding 타입에 따라 다른 JSON 형식 사용
        if problem_type == "practical":
            json_format = (
                "[\n"
                "    {\n"
                '        "title": "문제 제목 (한국어)",\n'
                '        "description": "문제 상황 설명 - 어떤 프롬프트를 작성해야 하는지 명확히 설명 (한국어)",\n'
                f'        "difficulty": "{difficulty}",\n'
                f'        "problem_type": "{problem_type}",\n'
                f'        "skill": "{skill}",\n'
                '        "language": "prompt",\n'
                '        "starter_code": "# 아래에 프롬프트를 작성하세요\\n\\n",\n'
                '        "hints": ["프롬프트 작성 힌트1", "힌트2", "힌트3"],\n'
                '        "test_cases": [\n'
                '            {"input": "이 프롬프트로 해결해야 할 문제", "expected_output": "기대하는 AI 응답 형태", "explanation": "평가 기준 (한국어)"}\n'
                "        ],\n"
                '        "solution": "모범 프롬프트 예시 (Python 코드가 아님! 실제 프롬프트 텍스트를 작성)",\n'
                '        "explanation": "이 프롬프트가 효과적인 이유에 대한 상세한 설명 (한국어)"\n'
                "    }\n"
                "]\n\n"
                "⚠️ 필수 요구사항:\n"
                '1. "solution" 필드에는 Python 코드가 아닌 **완성된 모범 프롬프트 텍스트**를 작성하세요\n'
                "2. 프롬프트는 Chain-of-Thought, Few-shot 등 해당 기법을 올바르게 적용해야 합니다\n"
                '3. "explanation"에는 왜 이 프롬프트가 효과적인지 설명하세요\n'
                "4. JSON 배열만 반환해주세요"
            )
        else:
            json_format = (
                "[\n"
                "    {\n"
                '        "title": "문제 제목 (한국어)",\n'
                '        "description": "문제 설명 - 입력/출력 형식과 제약조건 포함 (한국어)",\n'
                f'        "difficulty": "{difficulty}",\n'
                f'        "problem_type": "{problem_type}",\n'
                f'        "skill": "{skill}",\n'
                f'        "language": "{language}",\n'
                '        "starter_code": "def solution():\\n    # 여기에 코드를 작성하세요\\n    pass",\n'
                '        "hints": ["힌트1", "힌트2", "힌트3"],\n'
                '        "test_cases": [\n'
                '            {"input": "입력 예제", "expected_output": "예상 결과", "explanation": "설명 (한국어)"}\n'
                "        ],\n"
                '        "solution": "완전히 작동하는 Python 정답 코드",\n'
                '        "explanation": "알고리즘과 풀이 방법에 대한 상세한 설명 (한국어)"\n'
                "    }\n"
                "]\n\n"
                "필수 요구사항:\n"
                '1. "solution" 필드에는 완전히 작동하는 Python 코드가 포함되어야 합니다\n'
                '2. "explanation" 필드에는 알고리즘에 대한 상세한 한국어 설명이 포함되어야 합니다\n'
                "3. title, description, hints, test_cases의 설명은 모두 한국어로 작성해주세요\n"
                "4. JSON 배열만 반환해주세요"
            )

        prompt = (
            f"다음 스킬을 학습하기 위한 {difficulty} 난이도의 {problem_type} 문제 {count}개를 생성해주세요: {skill}\n\n"
            f"{type_instructions.get(problem_type, type_instructions['coding'])}\n\n"
            "주의: 모든 텍스트는 반드시 한국어로 작성해주세요.\n\n"
            f"다음 형식의 JSON 배열로 반환해주세요:\n{json_format}"
        )

        max_retries = 2
        last_error = None

        for attempt in range(max_retries):
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert coding problem generator. You MUST always include a complete working 'solution' field with actual runnable code and an 'explanation' field in your response. Output valid JSON only.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.3,
                    max_tokens=6000,
                )

                content = response.choices[0].message.content.strip()

                # Extract JSON from markdown code block if present
                content = self._extract_json(content)

                # Try to fix incomplete JSON
                content = self._fix_incomplete_json(content)

                problems_data = json.loads(content)

                # Ensure it's a list
                if isinstance(problems_data, dict):
                    problems_data = [problems_data]

                problems = []
                for i, p_data in enumerate(problems_data):
                    problem = GeneratedProblem(
                        id=f"gen_{skill[:10]}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{i}",
                        title=p_data.get("title", f"{skill} Problem {i + 1}"),
                        description=p_data.get("description", ""),
                        difficulty=p_data.get("difficulty", difficulty),
                        problem_type=p_data.get("problem_type", problem_type),
                        skill=p_data.get("skill", skill),
                        language=p_data.get("language"),
                        starter_code=p_data.get("starter_code"),
                        hints=p_data.get("hints", []),
                        test_cases=p_data.get("test_cases", []),
                        solution=p_data.get("solution"),
                        explanation=p_data.get("explanation"),
                    )

                    # If solution is missing, generate it separately
                    if not problem.solution:
                        solution_data = await self._generate_solution(problem)
                        problem.solution = solution_data.get("solution")
                        problem.explanation = (
                            solution_data.get("explanation") or problem.explanation
                        )

                    problems.append(problem)

                return problems

            except json.JSONDecodeError as e:
                last_error = e
                if attempt < max_retries - 1:
                    continue  # Retry
                raise ValueError(
                    f"Problem generation failed: JSON parsing error after {max_retries} attempts"
                ) from e
            except Exception as e:
                raise ValueError(f"Problem generation failed: {str(e)}") from e

        raise ValueError(f"Problem generation failed: {str(last_error)}")

    def _extract_json(self, content: str) -> str:
        """Extract JSON from markdown code blocks or raw text."""
        content = content.strip()

        # Try to extract from ```json ... ``` block
        if "```json" in content:
            parts = content.split("```json")
            if len(parts) >= 2:
                json_part = parts[1].split("```")[0]
                return json_part.strip()

        # Try to extract from ``` ... ``` block
        if "```" in content:
            parts = content.split("```")
            if len(parts) >= 2:
                return parts[1].strip()

        return content

    def _fix_incomplete_json(self, content: str) -> str:
        """Try to fix incomplete JSON responses from LLM."""
        content = content.strip()

        # If it doesn't start with [, try to find the array
        if not content.startswith("["):
            start_idx = content.find("[")
            if start_idx != -1:
                content = content[start_idx:]

        # Count brackets to check if JSON is complete
        open_brackets = content.count("[") - content.count("]")
        open_braces = content.count("{") - content.count("}")

        # If brackets are balanced, return as is
        if open_brackets == 0 and open_braces == 0:
            return content

        # Try to close incomplete JSON
        if open_braces > 0 or open_brackets > 0:
            # Find the last complete object
            last_complete = content.rfind("}")
            if last_complete != -1:
                # Check if we can close the array here
                test_content = content[: last_complete + 1]
                # Count brackets in truncated content
                remaining_brackets = test_content.count("[") - test_content.count("]")
                test_content += "]" * remaining_brackets
                try:
                    json.loads(test_content)
                    return test_content
                except json.JSONDecodeError:
                    pass

        # Add missing closing brackets/braces
        content += "}" * open_braces
        content += "]" * open_brackets

        return content

    def _classify_skill(self, skill: str) -> str:
        """스킬을 카테고리로 분류합니다."""
        skill_lower = skill.lower()

        # AI/LLM 관련 스킬
        ai_keywords = [
            "chain",
            "thought",
            "cot",
            "prompt",
            "llm",
            "gpt",
            "langchain",
            "rag",
            "retrieval",
            "embedding",
            "fine-tuning",
            "fine tuning",
            "transformer",
            "attention",
            "bert",
            "agent",
            "langgraph",
        ]
        if any(kw in skill_lower for kw in ai_keywords):
            return "ai_ml"

        # 시스템 디자인 관련 스킬
        system_keywords = [
            "system design",
            "architecture",
            "microservice",
            "distributed",
            "scalability",
            "load balancing",
            "caching",
            "database design",
            "api design",
            "rest",
            "graphql",
            "event-driven",
        ]
        if any(kw in skill_lower for kw in system_keywords):
            return "system_design"

        # DevOps/인프라 관련 스킬
        devops_keywords = [
            "docker",
            "kubernetes",
            "k8s",
            "ci/cd",
            "jenkins",
            "terraform",
            "aws",
            "gcp",
            "azure",
            "cloud",
            "devops",
            "infrastructure",
        ]
        if any(kw in skill_lower for kw in devops_keywords):
            return "devops"

        # 데이터/분석 관련 스킬
        data_keywords = [
            "pandas",
            "numpy",
            "data analysis",
            "visualization",
            "sql",
            "etl",
            "data pipeline",
            "spark",
            "hadoop",
            "analytics",
        ]
        if any(kw in skill_lower for kw in data_keywords):
            return "data"

        # 테스팅 관련 스킬
        test_keywords = [
            "test",
            "tdd",
            "bdd",
            "unit test",
            "integration",
            "e2e",
            "pytest",
            "jest",
            "testing",
        ]
        if any(kw in skill_lower for kw in test_keywords):
            return "testing"

        # 기본 코딩 스킬
        return "coding"

    def _get_skill_instruction(self, skill: str, category: str, language: str) -> str:
        """스킬 카테고리에 따른 문제 생성 지시사항을 반환합니다."""

        instructions = {
            "ai_ml": (
                f"'{skill}' 개념을 실습할 수 있는 **프롬프트 작성 문제**를 만들어주세요.\n\n"
                "⚠️ 중요: 이 문제는 코딩 문제가 아닙니다!\n"
                "사용자가 **프롬프트(텍스트)를 작성**하여 제출하는 문제입니다.\n\n"
                "문제 유형:\n"
                "- Chain-of-Thought: 복잡한 추론을 단계별로 유도하는 프롬프트 작성\n"
                "- Prompt Engineering: 특정 결과를 얻기 위한 효과적인 프롬프트 설계\n"
                "- Few-shot Learning: 예시를 포함한 프롬프트 구성\n"
                "- Role Playing: AI에게 역할을 부여하는 프롬프트 작성\n\n"
                "포함 요소:\n"
                f"- {skill} 기법을 적용해야 해결되는 구체적인 시나리오\n"
                "- 프롬프트 작성 가이드라인 (어떤 요소가 포함되어야 하는지)\n"
                "- 좋은 프롬프트의 예시 (힌트로 제공)\n"
                "- 프롬프트 평가 기준 (명확성, 단계적 사고 유도, 구체성 등)\n\n"
                "⚠️ 필드 작성 규칙:\n"
                "- starter_code: 프롬프트 작성을 시작할 수 있는 템플릿\n"
                '  예: "# 아래에 프롬프트를 작성하세요\\n\\n당신은 ..."\n'
                "- solution: Python 코드가 아닌 **모범 프롬프트 예시**를 작성\n"
                "  예: 문제를 해결하는 완성된 프롬프트 텍스트\n"
                "- explanation: 왜 이 프롬프트가 효과적인지 설명 (한국어)"
            ),
            "system_design": (
                f"'{skill}' 개념을 실습할 수 있는 **시스템 설계 문제**를 만들어주세요.\n\n"
                "문제 유형:\n"
                "- 주어진 요구사항을 만족하는 시스템 아키텍처 설계\n"
                "- 특정 시나리오에서 병목 현상 식별 및 해결\n"
                "- 확장성/가용성을 고려한 컴포넌트 설계\n\n"
                "포함 요소:\n"
                "- 실제 서비스에서 발생할 수 있는 시나리오\n"
                "- 트레이드오프를 고려해야 하는 설계 결정\n"
                "- 다이어그램 또는 의사코드 형태의 정답\n"
                "- 설계 결정의 근거 설명"
            ),
            "devops": (
                f"'{skill}' 개념을 실습할 수 있는 **인프라/DevOps 문제**를 만들어주세요.\n\n"
                "문제 유형:\n"
                "- 설정 파일 작성 (Dockerfile, docker-compose, K8s manifest 등)\n"
                "- CI/CD 파이프라인 구성\n"
                "- 인프라 트러블슈팅 시나리오\n\n"
                "포함 요소:\n"
                "- 실제 운영 환경에서 발생할 수 있는 상황\n"
                "- 완전한 설정 파일 또는 스크립트 (스타터 코드)\n"
                "- 모범 사례를 반영한 정답\n"
                "- 각 설정의 의미와 이유 설명"
            ),
            "data": (
                f"'{skill}' 개념을 실습할 수 있는 **데이터 분석 문제**를 만들어주세요.\n\n"
                "문제 유형:\n"
                "- 데이터 전처리 및 변환\n"
                "- 분석 쿼리 작성 (SQL 또는 Pandas)\n"
                "- 데이터 파이프라인 구현\n\n"
                "포함 요소:\n"
                "- 샘플 데이터셋 구조 설명\n"
                "- 단계별 데이터 처리 요구사항\n"
                "- 효율적인 정답 코드\n"
                "- 성능 최적화 팁"
            ),
            "testing": (
                f"'{skill}' 개념을 실습할 수 있는 **테스팅 문제**를 만들어주세요.\n\n"
                "문제 유형:\n"
                "- 주어진 코드에 대한 테스트 케이스 작성\n"
                "- 테스트 커버리지 개선\n"
                "- 모킹/스터빙을 활용한 격리 테스트\n\n"
                "포함 요소:\n"
                "- 테스트 대상 코드 (함수 또는 클래스)\n"
                "- 엣지 케이스를 포함한 테스트 요구사항\n"
                "- 완전한 테스트 코드 정답\n"
                "- 테스트 전략 설명"
            ),
            "coding": (
                f"다음 요소를 포함하는 {language} 코딩 문제를 만들어주세요:\n"
                "- 명확한 문제 설명\n"
                "- 입력/출력 형식\n"
                "- 제약 조건\n"
                "- 예제 테스트 케이스\n"
                "- 스타터 코드 템플릿\n"
                "- 완전히 작동하는 정답 코드\n"
                "- 시간/공간 복잡도 분석"
            ),
        }

        return instructions.get(category, instructions["coding"])

    async def _generate_solution(self, problem: GeneratedProblem) -> dict:
        """문제에 대한 해답 코드를 생성합니다."""
        prompt = (
            "다음 코딩 문제에 대한 완전한 정답 코드를 생성해주세요.\n\n"
            f"문제: {problem.title}\n"
            f"설명: {problem.description}\n"
            f"언어: {problem.language or 'python'}\n"
            f"스타터 코드: {problem.starter_code}\n\n"
            "테스트 케이스:\n"
            f"{json.dumps(problem.test_cases, indent=2)}\n\n"
            "다음 형식의 JSON 객체만 반환해주세요:\n"
            "{\n"
            '    "solution": "def function_name(params):\\n    # 완전히 작동하는 코드\\n    return result",\n'
            '    "explanation": "알고리즘과 풀이 방법에 대한 상세한 설명 (한국어)"\n'
            "}\n\n"
            "필수 사항:\n"
            "1. solution은 모든 테스트 케이스를 통과하는 완전한 코드여야 합니다.\n"
            "2. explanation은 반드시 한국어로 작성해주세요.\n"
            "3. JSON 객체만 반환해주세요."
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 코딩 전문가입니다. 완전히 작동하는 솔루션을 제공하세요. JSON만 출력하세요.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=2000,
            )

            content = response.choices[0].message.content.strip()
            content = self._extract_json(content)

            return json.loads(content)

        except Exception as e:
            return {
                "solution": f"# 해답 생성 실패: {str(e)}",
                "explanation": "해답을 자동으로 생성할 수 없습니다.",
            }

    async def evaluate_solution(self, problem: GeneratedProblem, user_solution: str) -> dict:
        """
        Evaluate a user's solution to a problem.

        Args:
            problem: The original problem
            user_solution: The user's submitted solution

        Returns:
            Evaluation result with feedback
        """
        prompt = (
            "다음 문제에 대한 사용자의 풀이를 평가해주세요:\n\n"
            "## 문제 정보\n"
            f"제목: {problem.title}\n"
            f"설명: {problem.description}\n"
            f"관련 스킬: {problem.skill}\n"
            f"난이도: {problem.difficulty}\n\n"
            "## 사용자 풀이\n"
            f"```\n{user_solution}\n```\n\n"
            "## 테스트 케이스\n"
            f"{json.dumps(problem.test_cases, indent=2, ensure_ascii=False)}\n\n"
            "## 평가 기준\n"
            "1. 코드가 문제 요구사항을 충족하는지\n"
            "2. 테스트 케이스를 통과하는지\n"
            "3. 코드 품질 및 가독성\n"
            "4. 효율성 (시간/공간 복잡도)\n\n"
            "## 응답 형식\n"
            "다음 형식의 JSON 객체만 반환해주세요:\n"
            "{\n"
            '    "passed": true 또는 false,\n'
            '    "score": 0-100 점수,\n'
            '    "tests_passed": 통과한 테스트 수,\n'
            '    "tests_failed": 실패한 테스트 수,\n'
            '    "feedback": "상세한 피드백 (한국어로 작성, 잘한 점과 개선할 점 포함)",\n'
            '    "details": ["각 테스트 케이스별 결과 (한국어)"]\n'
            "}\n\n"
            "⚠️ 중요: feedback과 details는 반드시 한국어로 작성해주세요.\n"
            "JSON만 반환해주세요."
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 코드 평가 전문가입니다. 사용자의 풀이를 정확하게 평가하고 건설적인 피드백을 한국어로 제공합니다. JSON만 출력하세요.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=2000,
            )

            content = response.choices[0].message.content.strip()
            content = self._extract_json(content)

            return json.loads(content)

        except Exception as e:
            return {
                "passed": False,
                "score": 0,
                "feedback": f"평가 실패: {str(e)}",
                "details": ["다시 시도해주세요"],
            }


# Singleton instance
problem_generator: ProblemGenerator | None = None


def get_problem_generator() -> ProblemGenerator:
    """Get or create the problem generator singleton."""
    global problem_generator
    if problem_generator is None:
        problem_generator = ProblemGenerator()
    return problem_generator
