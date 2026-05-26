"""
Skill Matcher Service

Uses embedding similarity to deterministically match skills between profile and JD.
"""

import json
from dataclasses import dataclass

import numpy as np
from app.services.embedding_service import embedding_service


@dataclass
class MatchResult:
    """Result of skill matching."""

    # Required skills
    matching_required: list[str]
    missing_required: list[str]
    required_matched_count: int
    required_total_count: int

    # Preferred skills
    matching_preferred: list[str]
    missing_preferred: list[str]
    preferred_matched_count: int
    preferred_total_count: int

    # Combined
    matching_skills: list[str]
    missing_skills: list[str]

    # Score breakdown
    required_score: float
    preferred_score: float
    total_score: int

    # Profile skills for reference
    profile_skills: list[str]


class SkillMatcherService:
    """Service for matching skills using embedding similarity and rule-based fallback."""

    # Thresholds for skill matching
    REQUIRED_THRESHOLD = 0.53
    PREFERRED_THRESHOLD = 0.48

    # Score weights
    REQUIRED_WEIGHT = 70
    PREFERRED_WEIGHT = 30

    # Technology synonym mappings for cross-lingual (English/Korean) and abbreviation matching
    TECH_SYNONYMS = {
        "langchain": ["랭체인", "langchain"],
        "react": ["리액트", "react", "react.js"],
        "vue": ["뷰", "vue.js", "vuejs", "vue"],
        "python": ["파이썬", "python"],
        "pytorch": ["파이토치", "pytorch"],
        "tensorflow": ["텐서플로우", "tensorflow"],
        "kubernetes": ["쿠버네티스", "k8s", "kubernetes"],
        "docker": ["도커", "docker"],
        "typescript": ["타입스크립트", "typescript", "ts"],
        "javascript": ["자바스크립트", "javascript", "js"],
        "fastapi": ["패스트api", "fastapi"],
        "django": ["장고", "django"],
        "flask": ["플라스크", "flask"],
        "spring": ["스프링", "spring boot", "springboot", "spring"],
        "node": ["노드", "node.js", "nodejs", "node"],
        "nextjs": ["넥스트", "next.js", "nextjs"],
        "aws": ["아마존", "aws", "amazon web services"],
    }

    # Target keywords that indicate academic/research requirements (in JD skills)
    RESEARCH_JD_KEYWORDS = ["연구", "research", "r&d", "논문", "thesis"]

    # Profile keywords that prove academic/research competency (in applicant's profile text)
    RESEARCH_PROFILE_KEYWORDS = [
        "연구",
        "research",
        "r&d",
        "논문",
        "학회",
        "thesis",
        "lab",
        "연구소",
        "석사",
        "박사",
        "patent",
        "특허",
        "학부연구생",
    ]

    async def match_skills(
        self,
        profile_skills: list[str],
        required_skills: list[str],
        preferred_skills: list[str],
        required_threshold: float | None = None,
        preferred_threshold: float | None = None,
        profile_raw: dict | str | None = None,
    ) -> MatchResult:
        """
        Match profile skills against JD requirements using embedding similarity and fallback text rules.

        Args:
            profile_skills: Skills from the user's profile
            required_skills: Required skills from JD
            preferred_skills: Preferred/nice-to-have skills from JD
            required_threshold: Custom threshold for required skills
            preferred_threshold: Custom threshold for preferred skills
            profile_raw: Raw profile dictionary or text for domain context verification
        """
        req_threshold = required_threshold or self.REQUIRED_THRESHOLD
        pref_threshold = preferred_threshold or self.PREFERRED_THRESHOLD

        # Extract plain text context from profile_raw for domain verification
        profile_context = ""
        if profile_raw:
            if isinstance(profile_raw, str):
                profile_context = profile_raw
            elif isinstance(profile_raw, dict):
                profile_context = json.dumps(profile_raw, ensure_ascii=False)

        # Get embeddings for all skills
        profile_emb = (
            await embedding_service.get_embeddings(profile_skills)
            if profile_skills
            else np.array([])
        )
        required_emb = (
            await embedding_service.get_embeddings(required_skills)
            if required_skills
            else np.array([])
        )
        preferred_emb = (
            await embedding_service.get_embeddings(preferred_skills)
            if preferred_skills
            else np.array([])
        )

        # Match required skills
        matching_required, missing_required = self._match_skill_set(
            profile_skills,
            profile_emb,
            required_skills,
            required_emb,
            req_threshold,
            profile_context,
        )

        # Match preferred skills
        matching_preferred, missing_preferred = self._match_skill_set(
            profile_skills,
            profile_emb,
            preferred_skills,
            preferred_emb,
            pref_threshold,
            profile_context,
        )

        # Calculate scores
        required_total = len(required_skills)
        preferred_total = len(preferred_skills)
        required_matched = len(matching_required)
        preferred_matched = len(matching_preferred)

        required_score = (
            (required_matched / required_total * self.REQUIRED_WEIGHT)
            if required_total > 0
            else self.REQUIRED_WEIGHT
        )
        preferred_score = (
            (preferred_matched / preferred_total * self.PREFERRED_WEIGHT)
            if preferred_total > 0
            else 0
        )
        total_score = round(required_score + preferred_score)

        return MatchResult(
            matching_required=matching_required,
            missing_required=missing_required,
            required_matched_count=required_matched,
            required_total_count=required_total,
            matching_preferred=matching_preferred,
            missing_preferred=missing_preferred,
            preferred_matched_count=preferred_matched,
            preferred_total_count=preferred_total,
            matching_skills=matching_required + matching_preferred,
            missing_skills=missing_required + missing_preferred,
            required_score=round(required_score, 1),
            preferred_score=round(preferred_score, 1),
            total_score=total_score,
            profile_skills=profile_skills,
        )

    def _match_skill_set(
        self,
        profile_skills: list[str],
        profile_emb: np.ndarray,
        target_skills: list[str],
        target_emb: np.ndarray,
        threshold: float,
        profile_context: str = "",
    ) -> tuple[list[str], list[str]]:
        """
        Match a set of target skills against profile skills.

        Returns:
            (matched_skills, missing_skills)
        """
        if len(target_skills) == 0:
            return [], []

        if len(profile_skills) == 0:
            return [], target_skills.copy()

        # Compute similarity matrix: (profile x target)
        similarity = embedding_service.cosine_similarity(profile_emb, target_emb)

        matched = []
        missing = []

        for j, target_skill in enumerate(target_skills):
            max_sim = similarity[:, j].max() if len(similarity) > 0 else 0.0

            # 1. Embedding-based match check
            is_matched = max_sim >= threshold

            # 2. Text/Synonym-based match check (fallback if embedding fails)
            if not is_matched:
                is_matched = self._is_text_match(profile_skills, target_skill)

            # 3. Domain validation (e.g., check research context if skill requires research)
            if is_matched:
                if self._verify_research_domain(target_skill, profile_context):
                    matched.append(target_skill)
                else:
                    missing.append(target_skill)
            else:
                missing.append(target_skill)

        return matched, missing

    def _is_text_match(self, profile_skills: list[str], target_skill: str) -> bool:
        """
        Check if target_skill matches any of profile_skills based on synonyms or substrings.
        """
        t_clean = target_skill.lower().replace(" ", "")

        # 1. Check technology synonym dictionary
        for _, synonyms in self.TECH_SYNONYMS.items():
            has_synonym_in_target = any(syn in t_clean for syn in synonyms)
            if has_synonym_in_target:
                for p_skill in profile_skills:
                    p_clean = p_skill.lower().replace(" ", "")
                    if p_clean in synonyms or any(syn in p_clean for syn in synonyms):
                        return True

        # 2. Check simple substring mapping for custom terms
        for p_skill in profile_skills:
            p_clean = p_skill.lower().replace(" ", "")
            if p_clean and (p_clean in t_clean or t_clean in p_clean):
                return True

        return False

    def _verify_research_domain(self, target_skill: str, profile_context: str) -> bool:
        """
        Verify if the profile has research context if target_skill requires research competency.
        """
        t_clean = target_skill.lower().replace(" ", "")
        requires_research = any(kw in t_clean for kw in self.RESEARCH_JD_KEYWORDS)

        if not requires_research:
            return True

        p_context_clean = profile_context.lower()
        has_research_exp = any(kw in p_context_clean for kw in self.RESEARCH_PROFILE_KEYWORDS)

        return has_research_exp

    def get_match_details(
        self,
        profile_skills: list[str],
        profile_emb: np.ndarray,
        target_skills: list[str],
        target_emb: np.ndarray,
    ) -> list[dict]:
        """
        Get detailed matching information for debugging/display.
        """
        if len(target_skills) == 0 or len(profile_skills) == 0:
            return []

        similarity = embedding_service.cosine_similarity(profile_emb, target_emb)

        details = []
        for j, target_skill in enumerate(target_skills):
            best_idx = similarity[:, j].argmax()
            best_sim = similarity[:, j].max()

            details.append(
                {
                    "target_skill": target_skill,
                    "best_match": profile_skills[best_idx],
                    "similarity": round(float(best_sim), 3),
                }
            )

        return details


# Singleton instance
skill_matcher_service = SkillMatcherService()
