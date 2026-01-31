"""
Problem Generator

Generates practice problems for skill development using Claude API.
Standalone module for creating coding challenges, quizzes, and practical exercises.
"""

import json
from typing import List, Optional, Literal
from dataclasses import dataclass, field
from datetime import datetime

from anthropic import Anthropic

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
    language: Optional[str] = None
    starter_code: Optional[str] = None
    hints: List[str] = field(default_factory=list)
    test_cases: List[dict] = field(default_factory=list)
    solution: Optional[str] = None
    explanation: Optional[str] = None


class ProblemGenerator:
    """
    Generates practice problems for skill development.
    
    Supports:
    - Coding challenges with test cases
    - Multiple choice quizzes
    - Practical exercises
    """
    
    def __init__(self):
        """Initialize with Claude client."""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required")
        
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-sonnet-4-20250514"
    
    async def generate_problems(
        self,
        skill: str,
        difficulty: Literal["easy", "medium", "hard"] = "medium",
        problem_type: Literal["coding", "quiz", "practical"] = "coding",
        language: str = "python",
        count: int = 1
    ) -> List[GeneratedProblem]:
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
        type_instructions = {
            "coding": f"""Create a coding problem in {language}.
Include:
- Clear problem statement
- Input/output format
- Constraints
- Example test cases
- Starter code template""",
            "quiz": """Create a multiple choice quiz question.
Include:
- Clear question
- 4 options (A, B, C, D)
- Correct answer
- Explanation for each option""",
            "practical": """Create a practical exercise.
Include:
- Real-world scenario
- Step-by-step requirements
- Expected deliverables
- Evaluation criteria"""
        }
        
        prompt = f"""Generate {count} {difficulty} level {problem_type} problem(s) for learning: {skill}

{type_instructions.get(problem_type, type_instructions["coding"])}

Return a JSON array:
[
    {{
        "title": "Problem title",
        "description": "Detailed problem description",
        "difficulty": "{difficulty}",
        "problem_type": "{problem_type}",
        "skill": "{skill}",
        "language": "{language if problem_type == 'coding' else None}",
        "starter_code": "template code if applicable",
        "hints": ["hint1", "hint2"],
        "test_cases": [
            {{"input": "example", "expected_output": "result", "explanation": "why"}}
        ],
        "solution": "complete solution code or answer",
        "explanation": "detailed explanation of the solution approach"
    }}
]

Make problems practical, engaging, and educational.
Return ONLY the JSON array."""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            
            problems_data = json.loads(content)
            
            problems = []
            for i, p_data in enumerate(problems_data):
                problem = GeneratedProblem(
                    id=f"gen_{skill[:10]}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{i}",
                    title=p_data.get("title", f"{skill} Problem {i+1}"),
                    description=p_data.get("description", ""),
                    difficulty=p_data.get("difficulty", difficulty),
                    problem_type=p_data.get("problem_type", problem_type),
                    skill=p_data.get("skill", skill),
                    language=p_data.get("language"),
                    starter_code=p_data.get("starter_code"),
                    hints=p_data.get("hints", []),
                    test_cases=p_data.get("test_cases", []),
                    solution=p_data.get("solution"),
                    explanation=p_data.get("explanation")
                )
                problems.append(problem)
            
            return problems
            
        except Exception as e:
            raise ValueError(f"Problem generation failed: {str(e)}")
    
    async def evaluate_solution(
        self,
        problem: GeneratedProblem,
        user_solution: str
    ) -> dict:
        """
        Evaluate a user's solution to a problem.
        
        Args:
            problem: The original problem
            user_solution: The user's submitted solution
            
        Returns:
            Evaluation result with feedback
        """
        prompt = f"""Evaluate this solution for the following problem:

PROBLEM:
Title: {problem.title}
Description: {problem.description}
Skill: {problem.skill}
Difficulty: {problem.difficulty}

EXPECTED SOLUTION:
{problem.solution}

USER'S SOLUTION:
{user_solution}

TEST CASES:
{json.dumps(problem.test_cases, indent=2)}

Evaluate and return JSON:
{{
    "is_correct": true/false,
    "score": 0-100,
    "passed_tests": ["list of passed test case descriptions"],
    "failed_tests": ["list of failed test case descriptions"],
    "feedback": "detailed feedback on the solution",
    "suggestions": ["improvement suggestions"],
    "code_quality": {{
        "readability": 1-10,
        "efficiency": 1-10,
        "best_practices": 1-10
    }}
}}

Return ONLY the JSON."""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            
            return json.loads(content)
            
        except Exception as e:
            return {
                "is_correct": False,
                "score": 0,
                "feedback": f"Evaluation failed: {str(e)}",
                "suggestions": ["Please try again"]
            }


# Singleton instance
problem_generator: Optional[ProblemGenerator] = None


def get_problem_generator() -> ProblemGenerator:
    """Get or create the problem generator singleton."""
    global problem_generator
    if problem_generator is None:
        problem_generator = ProblemGenerator()
    return problem_generator
