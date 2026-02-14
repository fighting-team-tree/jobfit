"""
Job Matching Agent

LangGraph-based agent for analyzing job descriptions and matching with user profiles.
Uses Claude API for intelligent analysis.
"""

import json
from dataclasses import dataclass
from typing import TypedDict

from anthropic import Anthropic
from app.core.config import settings
from langgraph.graph import END, START, StateGraph

# ============ State Definition ============


class MatchState(TypedDict):
    """State for the matching graph."""

    # Inputs
    profile: dict
    jd_text: str

    # Intermediate results
    jd_analysis: dict | None
    profile_skills: list[str] | None
    matching_skills: list[str] | None
    missing_skills: list[str] | None

    # Final output
    match_score: float | None
    strengths: list[str] | None
    recommendations: list[str] | None
    error: str | None


# ============ Data Classes ============


@dataclass
class MatchResult:
    """Final result of job matching analysis."""

    match_score: float
    matching_skills: list[str]
    missing_skills: list[str]
    strengths: list[str]
    recommendations: list[str]
    jd_analysis: dict
    score_breakdown: dict


# ============ Job Matching Agent ============


class JobMatchingAgent:
    """
    LangGraph-based agent for comprehensive job matching analysis.

    Uses a multi-step graph:
    1. JD Analysis - Parse and extract requirements from job description
    2. Skill Matching - Match user skills with JD requirements
    3. Gap Analysis - Identify missing skills and areas to improve
    4. Scoring - Calculate overall match score with breakdown
    """

    def __init__(self):
        """Initialize the agent with Claude client and build the graph."""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required")

        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-sonnet-4-20250514"
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph state machine for job matching."""
        # Create the graph
        builder = StateGraph(MatchState)

        # Add nodes
        builder.add_node("analyze_jd", self._analyze_jd_node)
        builder.add_node("extract_profile_skills", self._extract_profile_skills_node)
        builder.add_node("match_skills", self._match_skills_node)
        builder.add_node("calculate_score", self._calculate_score_node)

        # Add edges - sequential flow
        builder.add_edge(START, "analyze_jd")
        builder.add_edge("analyze_jd", "extract_profile_skills")
        builder.add_edge("extract_profile_skills", "match_skills")
        builder.add_edge("match_skills", "calculate_score")
        builder.add_edge("calculate_score", END)

        return builder.compile()

    async def analyze(self, profile: dict, jd_text: str) -> MatchResult:
        """
        Analyze a job description against a user profile.

        Args:
            profile: Structured user profile (from resume parsing)
            jd_text: Job description text

        Returns:
            MatchResult with score, matching/missing skills, and recommendations
        """
        # Initialize state
        initial_state: MatchState = {
            "profile": profile,
            "jd_text": jd_text,
            "jd_analysis": None,
            "profile_skills": None,
            "matching_skills": None,
            "missing_skills": None,
            "match_score": None,
            "strengths": None,
            "recommendations": None,
            "error": None,
        }

        # Run the graph
        final_state = await self.graph.ainvoke(initial_state)

        if final_state.get("error"):
            raise ValueError(final_state["error"])

        return MatchResult(
            match_score=final_state.get("match_score", 0),
            matching_skills=final_state.get("matching_skills", []),
            missing_skills=final_state.get("missing_skills", []),
            strengths=final_state.get("strengths", []),
            recommendations=final_state.get("recommendations", []),
            jd_analysis=final_state.get("jd_analysis", {}),
            score_breakdown=final_state.get("score_breakdown", {}),
        )

    async def _analyze_jd_node(self, state: MatchState) -> dict:
        """Node: Analyze job description and extract requirements."""
        jd_text = state["jd_text"]

        prompt = f"""Analyze this job description and extract structured requirements.

Job Description:
{jd_text}

Return a JSON object with:
{{
    "title": "job title",
    "company": "company name if mentioned",
    "required_skills": ["list of required technical skills"],
    "preferred_skills": ["list of preferred/nice-to-have skills"],
    "experience_years": "required years of experience or null",
    "education": "education requirements or null",
    "key_responsibilities": ["main job responsibilities"],
    "keywords": ["important keywords from the JD"]
}}

Return ONLY the JSON, no other text."""

        try:
            response = self.client.messages.create(
                model=self.model, max_tokens=2000, messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text.strip()
            # Clean up JSON if wrapped in code blocks
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            jd_analysis = json.loads(content)
            return {"jd_analysis": jd_analysis}

        except Exception as e:
            return {"error": f"JD analysis failed: {str(e)}"}

    async def _extract_profile_skills_node(self, state: MatchState) -> dict:
        """Node: Extract all skills from user profile."""
        profile = state["profile"]

        # Collect skills from various sources
        skills = set()

        # Direct skills list
        if profile.get("skills"):
            skills.update(profile["skills"])

        # Skills from experience
        for exp in profile.get("experience", []):
            if exp.get("description"):
                # Extract tech keywords from description
                skills.update(self._extract_tech_keywords(exp["description"]))

        # Skills from projects
        for proj in profile.get("projects", []):
            if proj.get("tech_stack"):
                skills.update(proj["tech_stack"])
            if proj.get("description"):
                skills.update(self._extract_tech_keywords(proj["description"]))

        return {"profile_skills": list(skills)}

    def _extract_tech_keywords(self, text: str) -> list[str]:
        """Extract technology keywords from text."""
        # Common tech keywords to look for
        tech_keywords = [
            "python",
            "javascript",
            "typescript",
            "react",
            "vue",
            "angular",
            "node.js",
            "nodejs",
            "express",
            "fastapi",
            "django",
            "flask",
            "java",
            "spring",
            "kotlin",
            "swift",
            "go",
            "golang",
            "rust",
            "c++",
            "c#",
            ".net",
            "ruby",
            "rails",
            "php",
            "laravel",
            "sql",
            "mysql",
            "postgresql",
            "mongodb",
            "redis",
            "elasticsearch",
            "docker",
            "kubernetes",
            "aws",
            "gcp",
            "azure",
            "terraform",
            "git",
            "github",
            "gitlab",
            "ci/cd",
            "jenkins",
            "linux",
            "machine learning",
            "deep learning",
            "tensorflow",
            "pytorch",
            "rest",
            "graphql",
            "grpc",
            "microservices",
            "api",
            "html",
            "css",
            "sass",
            "tailwind",
            "bootstrap",
            "agile",
            "scrum",
            "jira",
            "figma",
            "design patterns",
        ]

        text_lower = text.lower()
        found = []
        for keyword in tech_keywords:
            if keyword in text_lower:
                found.append(keyword)

        return found

    async def _match_skills_node(self, state: MatchState) -> dict:
        """Node: Match profile skills with JD requirements."""
        profile_skills = state.get("profile_skills", [])
        jd_analysis = state.get("jd_analysis", {})

        if not jd_analysis:
            return {"error": "JD analysis not available"}

        required_skills = jd_analysis.get("required_skills", [])
        preferred_skills = jd_analysis.get("preferred_skills", [])

        # Normalize skills for comparison
        profile_skills_lower = [s.lower() for s in profile_skills]

        # Match skills
        matching_required = []
        missing_required = []
        matching_preferred = []
        missing_preferred = []

        for skill in required_skills:
            skill_lower = skill.lower()
            if any(skill_lower in ps or ps in skill_lower for ps in profile_skills_lower):
                matching_required.append(skill)
            else:
                missing_required.append(skill)

        for skill in preferred_skills:
            skill_lower = skill.lower()
            if any(skill_lower in ps or ps in skill_lower for ps in profile_skills_lower):
                matching_preferred.append(skill)
            else:
                missing_preferred.append(skill)

        return {
            "matching_skills": matching_required + matching_preferred,
            "missing_skills": missing_required + missing_preferred,
            "matching_required": matching_required,
            "missing_required": missing_required,
            "matching_preferred": matching_preferred,
            "missing_preferred": missing_preferred,
        }

    async def _calculate_score_node(self, state: MatchState) -> dict:
        """Node: Calculate final match score and generate recommendations."""
        profile = state["profile"]
        jd_analysis = state.get("jd_analysis", {})
        matching_skills = state.get("matching_skills", [])
        missing_skills = state.get("missing_skills", [])
        matching_required = state.get("matching_required", [])
        _ = state.get("missing_required", [])

        # Calculate score components
        required_skills = jd_analysis.get("required_skills", [])
        preferred_skills = jd_analysis.get("preferred_skills", [])

        # Required skills weight: 70%
        if required_skills:
            required_score = len(matching_required) / len(required_skills) * 70
        else:
            required_score = 35  # Neutral if no required skills listed

        # Preferred skills weight: 20%
        if preferred_skills:
            matching_preferred = state.get("matching_preferred", [])
            preferred_score = len(matching_preferred) / len(preferred_skills) * 20
        else:
            preferred_score = 10

        # Experience relevance: 10%
        experience_score = 10  # Base score, could be enhanced with more analysis

        total_score = min(100, required_score + preferred_score + experience_score)

        # Generate strengths and recommendations using Claude
        strengths, recommendations = await self._generate_insights(
            profile, jd_analysis, matching_skills, missing_skills
        )

        return {
            "match_score": round(total_score, 1),
            "strengths": strengths,
            "recommendations": recommendations,
            "score_breakdown": {
                "required_skills": round(required_score, 1),
                "preferred_skills": round(preferred_score, 1),
                "experience": experience_score,
            },
        }

    async def _generate_insights(
        self,
        profile: dict,
        jd_analysis: dict,
        matching_skills: list[str],
        missing_skills: list[str],
    ) -> tuple[list[str], list[str]]:
        """Generate personalized strengths and recommendations using Claude."""

        prompt = f"""Based on this job matching analysis, provide personalized insights.

Profile Summary:
- Skills: {profile.get("skills", [])}
- Experience: {len(profile.get("experience", []))} positions
- Projects: {len(profile.get("projects", []))} projects

JD Requirements:
- Required: {jd_analysis.get("required_skills", [])}
- Preferred: {jd_analysis.get("preferred_skills", [])}

Matching Analysis:
- Matching skills: {matching_skills}
- Missing skills: {missing_skills}

Provide a JSON response:
{{
    "strengths": ["3-5 specific strengths based on matching skills"],
    "recommendations": ["3-5 actionable recommendations for missing skills"]
}}

Return ONLY the JSON."""

        try:
            response = self.client.messages.create(
                model=self.model, max_tokens=1000, messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            result = json.loads(content)
            return result.get("strengths", []), result.get("recommendations", [])

        except Exception:
            # Fallback to generic insights
            strengths = (
                [f"Strong in {s}" for s in matching_skills[:3]]
                if matching_skills
                else ["Profile under analysis"]
            )
            recommendations = (
                [f"Consider learning {s}" for s in missing_skills[:3]]
                if missing_skills
                else ["Keep updating your skills"]
            )
            return strengths, recommendations


# Singleton instance
job_matching_agent: JobMatchingAgent | None = None


def get_job_matching_agent() -> JobMatchingAgent:
    """Get or create the job matching agent singleton."""
    global job_matching_agent
    if job_matching_agent is None:
        job_matching_agent = JobMatchingAgent()
    return job_matching_agent
