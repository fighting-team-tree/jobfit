"""
Unified Matching Agent

LangGraph-based agent with 4-node pipeline:
1. analyze_jd - Parse and extract requirements
2. extract_skills - Extract skills from profile
3. match_skills - Embedding-based skill matching
4. generate_feedback - Personalized feedback generation
"""

import json
from dataclasses import dataclass
from typing import TypedDict

from anthropic import Anthropic
from app.core.config import settings
from app.services.skill_matcher_service import skill_matcher_service
from langgraph.graph import END, START, StateGraph

# ============ State Definition ============


class UnifiedMatchState(TypedDict):
    """State for the unified matching graph."""

    # Inputs
    profile: dict
    jd_text: str

    # Intermediate - JD Analysis
    jd_analysis: dict | None
    required_skills: list[str] | None
    preferred_skills: list[str] | None

    # Intermediate - Profile Skills
    profile_skills: list[str] | None

    # Intermediate - Matching Results
    matched_required: list[str] | None
    matched_preferred: list[str] | None
    missing_required: list[str] | None
    missing_preferred: list[str] | None

    # Final Output
    match_score: float | None
    feedback: str | None
    recommendations: list[str] | None
    strengths: list[str] | None
    score_breakdown: dict | None
    error: str | None


# ============ Result Data Class ============


@dataclass
class UnifiedMatchResult:
    """Final result of unified matching analysis."""

    match_score: float
    matching_skills: list[str]
    missing_skills: list[str]
    matching_required: list[str]
    missing_required: list[str]
    matching_preferred: list[str]
    missing_preferred: list[str]
    strengths: list[str]
    recommendations: list[str]
    feedback: str
    jd_analysis: dict
    profile_skills: list[str]
    score_breakdown: dict


# ============ Unified Matching Agent ============


class UnifiedMatchingAgent:
    """
    LangGraph-based agent for comprehensive job matching.

    4-Node Pipeline:
    1. analyze_jd - Parse JD and extract requirements with temperature=0
    2. extract_skills - Extract all skills from profile
    3. match_skills - Use embedding service for deterministic matching
    4. generate_feedback - Generate personalized feedback and recommendations
    """

    def __init__(self):
        """Initialize the agent with Claude client and build the graph."""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required")

        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-sonnet-4-20250514"
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph state machine."""
        builder = StateGraph(UnifiedMatchState)

        # Add nodes
        builder.add_node("analyze_jd", self._analyze_jd_node)
        builder.add_node("extract_skills", self._extract_skills_node)
        builder.add_node("match_skills", self._match_skills_node)
        builder.add_node("generate_feedback", self._generate_feedback_node)

        # Sequential flow
        builder.add_edge(START, "analyze_jd")
        builder.add_edge("analyze_jd", "extract_skills")
        builder.add_edge("extract_skills", "match_skills")
        builder.add_edge("match_skills", "generate_feedback")
        builder.add_edge("generate_feedback", END)

        return builder.compile()

    async def analyze(self, profile: dict, jd_text: str) -> UnifiedMatchResult:
        """
        Analyze a job description against a user profile.

        Args:
            profile: Structured user profile
            jd_text: Job description text

        Returns:
            UnifiedMatchResult with comprehensive matching analysis
        """
        # Initialize state
        initial_state: UnifiedMatchState = {
            "profile": profile,
            "jd_text": jd_text,
            "jd_analysis": None,
            "required_skills": None,
            "preferred_skills": None,
            "profile_skills": None,
            "matched_required": None,
            "matched_preferred": None,
            "missing_required": None,
            "missing_preferred": None,
            "match_score": None,
            "feedback": None,
            "recommendations": None,
            "strengths": None,
            "score_breakdown": None,
            "error": None,
        }

        # Run the graph
        final_state = await self.graph.ainvoke(initial_state)

        if final_state.get("error"):
            raise ValueError(final_state["error"])

        return UnifiedMatchResult(
            match_score=final_state.get("match_score", 0),
            matching_skills=final_state.get("matched_required", [])
            + final_state.get("matched_preferred", []),
            missing_skills=final_state.get("missing_required", [])
            + final_state.get("missing_preferred", []),
            matching_required=final_state.get("matched_required", []),
            missing_required=final_state.get("missing_required", []),
            matching_preferred=final_state.get("matched_preferred", []),
            missing_preferred=final_state.get("missing_preferred", []),
            strengths=final_state.get("strengths", []),
            recommendations=final_state.get("recommendations", []),
            feedback=final_state.get("feedback", ""),
            jd_analysis=final_state.get("jd_analysis", {}),
            profile_skills=final_state.get("profile_skills", []),
            score_breakdown=final_state.get("score_breakdown", {}),
        )

    async def _analyze_jd_node(self, state: UnifiedMatchState) -> dict:
        """
        Node 1: Analyze JD and extract requirements.
        Uses temperature=0 for deterministic output.
        """
        jd_text = state["jd_text"]

        prompt = f"""Analyze this job description and extract structured requirements.

Job Description:
{jd_text}

Return a JSON object with:
{{
    "title": "job title",
    "company": "company name if mentioned",
    "required_skills": ["list of required technical skills - be specific"],
    "preferred_skills": ["list of preferred/nice-to-have skills"],
    "experience_years": "required years of experience or null",
    "education": "education requirements or null",
    "key_responsibilities": ["main job responsibilities"]
}}

Important:
- Extract actual skill names (e.g., "Python", "React", "Docker")
- Separate required (must-have) from preferred (nice-to-have) skills
- Be thorough but avoid duplicates

Return ONLY the JSON, no other text."""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0,  # Deterministic
                messages=[{"role": "user", "content": prompt}],
            )

            content = response.content[0].text.strip()
            # Clean up JSON if wrapped in code blocks
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            jd_analysis = json.loads(content)

            return {
                "jd_analysis": jd_analysis,
                "required_skills": jd_analysis.get("required_skills", []),
                "preferred_skills": jd_analysis.get("preferred_skills", []),
            }

        except Exception as e:
            return {"error": f"JD analysis failed: {str(e)}"}

    async def _extract_skills_node(self, state: UnifiedMatchState) -> dict:
        """
        Node 2: Extract all skills from user profile.
        Combines explicit skills with inferred skills from experience/projects.
        """
        profile = state["profile"]

        # Collect skills from various sources
        skills = set()

        # Direct skills list
        if profile.get("skills"):
            skills.update(profile["skills"])

        # Skills from experience
        for exp in profile.get("experience", []):
            if exp.get("description"):
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
            "langchain",
            "langgraph",
            "llm",
            "openai",
            "anthropic",
            "agile",
            "scrum",
            "jira",
            "figma",
        ]

        text_lower = text.lower()
        found = []
        for keyword in tech_keywords:
            if keyword in text_lower:
                found.append(keyword)

        return found

    async def _match_skills_node(self, state: UnifiedMatchState) -> dict:
        """
        Node 3: Match skills using embedding-based similarity.
        Uses skill_matcher_service for deterministic matching.
        """
        profile_skills = state.get("profile_skills", [])
        required_skills = state.get("required_skills", [])
        preferred_skills = state.get("preferred_skills", [])

        if state.get("error"):
            return {}

        try:
            # Use embedding-based skill matcher
            match_result = await skill_matcher_service.match_skills(
                profile_skills=profile_skills,
                required_skills=required_skills,
                preferred_skills=preferred_skills,
            )

            return {
                "matched_required": match_result.matching_required,
                "matched_preferred": match_result.matching_preferred,
                "missing_required": match_result.missing_required,
                "missing_preferred": match_result.missing_preferred,
                "match_score": match_result.total_score,
                "score_breakdown": {
                    "required_matched": match_result.required_matched_count,
                    "required_total": match_result.required_total_count,
                    "preferred_matched": match_result.preferred_matched_count,
                    "preferred_total": match_result.preferred_total_count,
                    "required_score": match_result.required_score,
                    "preferred_score": match_result.preferred_score,
                },
            }

        except Exception:
            # Fallback to simple string matching
            return self._fallback_match(profile_skills, required_skills, preferred_skills)

    def _fallback_match(
        self, profile_skills: list[str], required_skills: list[str], preferred_skills: list[str]
    ) -> dict:
        """Fallback matching using simple string comparison."""
        profile_lower = [s.lower() for s in profile_skills]

        matched_req = []
        missing_req = []
        for skill in required_skills:
            if any(skill.lower() in ps or ps in skill.lower() for ps in profile_lower):
                matched_req.append(skill)
            else:
                missing_req.append(skill)

        matched_pref = []
        missing_pref = []
        for skill in preferred_skills:
            if any(skill.lower() in ps or ps in skill.lower() for ps in profile_lower):
                matched_pref.append(skill)
            else:
                missing_pref.append(skill)

        req_score = (len(matched_req) / len(required_skills) * 70) if required_skills else 35
        pref_score = (len(matched_pref) / len(preferred_skills) * 30) if preferred_skills else 0

        return {
            "matched_required": matched_req,
            "matched_preferred": matched_pref,
            "missing_required": missing_req,
            "missing_preferred": missing_pref,
            "match_score": round(req_score + pref_score),
            "score_breakdown": {
                "required_matched": len(matched_req),
                "required_total": len(required_skills),
                "preferred_matched": len(matched_pref),
                "preferred_total": len(preferred_skills),
                "required_score": round(req_score, 1),
                "preferred_score": round(pref_score, 1),
            },
        }

    async def _generate_feedback_node(self, state: UnifiedMatchState) -> dict:
        """
        Node 4: Generate personalized feedback and recommendations.
        """
        _ = state["profile"]
        jd_analysis = state.get("jd_analysis", {})
        matched_required = state.get("matched_required", [])
        matched_preferred = state.get("matched_preferred", [])
        missing_required = state.get("missing_required", [])
        missing_preferred = state.get("missing_preferred", [])
        match_score = state.get("match_score", 0)

        if state.get("error"):
            return {}

        prompt = f"""Based on this job matching analysis, provide personalized feedback.

Match Score: {match_score}%

Profile Skills: {state.get("profile_skills", [])}

JD Analysis:
- Position: {jd_analysis.get("title", "Unknown")}
- Required Skills: {jd_analysis.get("required_skills", [])}
- Preferred Skills: {jd_analysis.get("preferred_skills", [])}

Matching Results:
- Matched Required: {matched_required}
- Missing Required: {missing_required}
- Matched Preferred: {matched_preferred}
- Missing Preferred: {missing_preferred}

Provide a JSON response:
{{
    "feedback": "2-3 sentence personalized feedback about the candidate's fit",
    "strengths": ["3-5 specific strengths based on matched skills"],
    "recommendations": ["3-5 actionable recommendations prioritized by importance"]
}}

Guidelines:
- Be specific and actionable
- Prioritize missing required skills over preferred
- Suggest realistic learning paths

Return ONLY the JSON."""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                temperature=0.3,  # Slight creativity for personalization
                messages=[{"role": "user", "content": prompt}],
            )

            content = response.content[0].text.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            result = json.loads(content)

            return {
                "feedback": result.get("feedback", ""),
                "strengths": result.get("strengths", []),
                "recommendations": result.get("recommendations", []),
            }

        except Exception:
            # Fallback
            strengths = [f"Strong in {s}" for s in matched_required[:3]] if matched_required else []
            recommendations = (
                [f"Learn {s}" for s in missing_required[:3]] if missing_required else []
            )

            return {
                "feedback": f"Your profile matches {match_score}% of the requirements.",
                "strengths": strengths,
                "recommendations": recommendations,
            }


# Singleton instance
unified_matching_agent: UnifiedMatchingAgent | None = None


def get_unified_matching_agent() -> UnifiedMatchingAgent:
    """Get or create the unified matching agent singleton."""
    global unified_matching_agent
    if unified_matching_agent is None:
        unified_matching_agent = UnifiedMatchingAgent()
    return unified_matching_agent
