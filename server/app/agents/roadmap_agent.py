"""
Roadmap Agent

Generates personalized learning roadmaps based on skill gaps.
Uses Claude API to create structured weekly learning plans.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

from anthropic import Anthropic
from app.core.config import settings

# ============ Data Classes ============


@dataclass
class Problem:
    """A practice problem for skill development."""

    id: str
    title: str
    description: str
    difficulty: Literal["easy", "medium", "hard"]
    problem_type: Literal["coding", "quiz", "practical"]
    skill: str
    hints: list[str] = field(default_factory=list)
    solution: str | None = None
    test_cases: list[dict] = field(default_factory=list)


@dataclass
class WeekPlan:
    """A single week's learning plan."""

    week_number: int
    title: str
    focus_skills: list[str]
    learning_objectives: list[str]
    resources: list[str]
    problems: list[Problem] = field(default_factory=list)
    estimated_hours: int = 10


@dataclass
class Roadmap:
    """Complete learning roadmap."""

    id: str
    title: str
    description: str
    total_weeks: int
    weeks: list[WeekPlan]
    missing_skills: list[str]
    target_role: str | None = None
    created_at: datetime = field(default_factory=datetime.now)


# ============ Roadmap Agent ============


class RoadmapAgent:
    """
    Agent for generating personalized learning roadmaps.

    Uses Claude to:
    1. Analyze skill gaps
    2. Create structured weekly learning plans
    3. Generate practice problems for each week
    """

    def __init__(self):
        """Initialize the agent with Claude client."""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required")

        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-sonnet-4-20250514"

    async def generate_roadmap(
        self,
        missing_skills: list[str],
        timeline_weeks: int = 4,
        target_role: str | None = None,
        current_level: str = "intermediate",
    ) -> Roadmap:
        """
        Generate a personalized learning roadmap.

        Args:
            missing_skills: List of skills to learn
            timeline_weeks: Number of weeks for the roadmap
            target_role: Target job role (optional)
            current_level: Current skill level (beginner/intermediate/advanced)

        Returns:
            Roadmap with weekly learning plans
        """
        prompt = f"""Create a detailed {timeline_weeks}-week learning roadmap to acquire these skills:

Skills to learn: {missing_skills}
Target role: {target_role or "General software development"}
Current level: {current_level}

Return a JSON object:
{{
    "title": "Roadmap title",
    "description": "Brief description of what this roadmap covers",
    "weeks": [
        {{
            "week_number": 1,
            "title": "Week 1: [Focus Area]",
            "focus_skills": ["skill1", "skill2"],
            "learning_objectives": ["objective1", "objective2", "objective3"],
            "resources": ["resource1 (with URL if applicable)", "resource2"],
            "estimated_hours": 10
        }}
    ]
}}

Guidelines:
- Distribute skills logically across weeks (build foundations first)
- Each week should have 2-4 learning objectives
- Include specific resources (documentation, tutorials, courses)
- Estimated hours should be realistic (8-15 hours per week)

Return ONLY the JSON."""

        try:
            response = self.client.messages.create(
                model=self.model, max_tokens=3000, messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            roadmap_data = json.loads(content)

            # Convert to Roadmap dataclass
            weeks = []
            for week_data in roadmap_data.get("weeks", []):
                week = WeekPlan(
                    week_number=week_data["week_number"],
                    title=week_data["title"],
                    focus_skills=week_data.get("focus_skills", []),
                    learning_objectives=week_data.get("learning_objectives", []),
                    resources=week_data.get("resources", []),
                    estimated_hours=week_data.get("estimated_hours", 10),
                    problems=[],
                )
                weeks.append(week)

            roadmap = Roadmap(
                id=f"roadmap_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                title=roadmap_data.get("title", "Learning Roadmap"),
                description=roadmap_data.get("description", ""),
                total_weeks=len(weeks),
                weeks=weeks,
                missing_skills=missing_skills,
                target_role=target_role,
            )

            return roadmap

        except Exception as e:
            raise ValueError(f"Roadmap generation failed: {str(e)}") from e

    async def generate_week_problems(self, week: WeekPlan, num_problems: int = 3) -> list[Problem]:
        """
        Generate practice problems for a specific week.

        Args:
            week: The week plan to generate problems for
            num_problems: Number of problems to generate

        Returns:
            List of Problem objects
        """
        prompt = f"""Generate {num_problems} practice problems for this learning week:

Week: {week.title}
Focus Skills: {week.focus_skills}
Learning Objectives: {week.learning_objectives}

Return a JSON array of problems:
[
    {{
        "title": "Problem title",
        "description": "Detailed problem description with context",
        "difficulty": "easy|medium|hard",
        "problem_type": "coding|quiz|practical",
        "skill": "primary skill this tests",
        "hints": ["hint1", "hint2"],
        "test_cases": [
            {{"input": "example input", "expected_output": "expected result"}}
        ]
    }}
]

Guidelines:
- Include a mix of difficulties
- Make problems practical and relevant to real-world scenarios
- For coding problems, include clear test cases
- Hints should guide without giving away the solution

Return ONLY the JSON array."""

        try:
            response = self.client.messages.create(
                model=self.model, max_tokens=2000, messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            problems_data = json.loads(content)

            problems = []
            for i, p_data in enumerate(problems_data):
                problem = Problem(
                    id=f"prob_{week.week_number}_{i + 1}_{datetime.now().strftime('%H%M%S')}",
                    title=p_data.get("title", f"Problem {i + 1}"),
                    description=p_data.get("description", ""),
                    difficulty=p_data.get("difficulty", "medium"),
                    problem_type=p_data.get("problem_type", "coding"),
                    skill=p_data.get(
                        "skill", week.focus_skills[0] if week.focus_skills else "general"
                    ),
                    hints=p_data.get("hints", []),
                    test_cases=p_data.get("test_cases", []),
                )
                problems.append(problem)

            return problems

        except Exception as e:
            raise ValueError(f"Problem generation failed: {str(e)}") from e

    async def generate_problem_solution(self, problem: Problem) -> str:
        """
        Generate a solution for a practice problem.

        Args:
            problem: The problem to solve

        Returns:
            Solution code or explanation
        """
        prompt = f"""Provide a complete solution for this problem:

Title: {problem.title}
Description: {problem.description}
Type: {problem.problem_type}
Skill: {problem.skill}
Difficulty: {problem.difficulty}

Test Cases:
{json.dumps(problem.test_cases, indent=2)}

Provide:
1. Complete working solution (code if applicable)
2. Brief explanation of the approach
3. Time/space complexity if it's a coding problem

Format your response clearly with code blocks where appropriate."""

        try:
            response = self.client.messages.create(
                model=self.model, max_tokens=2000, messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()

        except Exception as e:
            return f"Solution generation failed: {str(e)}"


# Singleton instance
roadmap_agent: RoadmapAgent | None = None


def get_roadmap_agent() -> RoadmapAgent:
    """Get or create the roadmap agent singleton."""
    global roadmap_agent
    if roadmap_agent is None:
        roadmap_agent = RoadmapAgent()
    return roadmap_agent
