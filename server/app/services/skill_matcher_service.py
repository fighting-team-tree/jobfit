"""
Skill Matcher Service

Uses embedding similarity to deterministically match skills between profile and JD.
"""
import numpy as np
from dataclasses import dataclass
from typing import Optional

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
    """Service for matching skills using embedding similarity."""
    
    # Thresholds for skill matching
    # Based on empirical analysis: CV <-> Computer Vision ~0.55, CV <-> BERT ~0.46
    REQUIRED_THRESHOLD = 0.53  # Lowered based on NVIDIA E5-v5 short-text behavior
    PREFERRED_THRESHOLD = 0.48  # Lowered further
    
    # Score weights
    REQUIRED_WEIGHT = 70
    PREFERRED_WEIGHT = 30
    
    async def match_skills(
        self,
        profile_skills: list[str],
        required_skills: list[str],
        preferred_skills: list[str],
        required_threshold: Optional[float] = None,
        preferred_threshold: Optional[float] = None
    ) -> MatchResult:
        """
        Match profile skills against JD requirements using embedding similarity.
        
        Args:
            profile_skills: Skills from the user's profile
            required_skills: Required skills from JD
            preferred_skills: Preferred/nice-to-have skills from JD
            required_threshold: Custom threshold for required skills
            preferred_threshold: Custom threshold for preferred skills
            
        Returns:
            MatchResult with detailed matching information
        """
        req_threshold = required_threshold or self.REQUIRED_THRESHOLD
        pref_threshold = preferred_threshold or self.PREFERRED_THRESHOLD
        
        # Get embeddings for all skills
        profile_emb = await embedding_service.get_embeddings(profile_skills) if profile_skills else np.array([])
        required_emb = await embedding_service.get_embeddings(required_skills) if required_skills else np.array([])
        preferred_emb = await embedding_service.get_embeddings(preferred_skills) if preferred_skills else np.array([])
        
        # Match required skills
        matching_required, missing_required = self._match_skill_set(
            profile_skills, profile_emb,
            required_skills, required_emb,
            req_threshold
        )
        
        # Match preferred skills
        matching_preferred, missing_preferred = self._match_skill_set(
            profile_skills, profile_emb,
            preferred_skills, preferred_emb,
            pref_threshold
        )
        
        # Calculate scores
        required_total = len(required_skills)
        preferred_total = len(preferred_skills)
        required_matched = len(matching_required)
        preferred_matched = len(matching_preferred)
        
        required_score = (required_matched / required_total * self.REQUIRED_WEIGHT) if required_total > 0 else self.REQUIRED_WEIGHT
        preferred_score = (preferred_matched / preferred_total * self.PREFERRED_WEIGHT) if preferred_total > 0 else 0
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
            profile_skills=profile_skills
        )
    
    def _match_skill_set(
        self,
        profile_skills: list[str],
        profile_emb: np.ndarray,
        target_skills: list[str],
        target_emb: np.ndarray,
        threshold: float
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
            # Get max similarity for this target skill across all profile skills
            max_sim = similarity[:, j].max()
            
            if max_sim >= threshold:
                matched.append(target_skill)
            else:
                missing.append(target_skill)
        
        return matched, missing
    
    def get_match_details(
        self,
        profile_skills: list[str],
        profile_emb: np.ndarray,
        target_skills: list[str],
        target_emb: np.ndarray
    ) -> list[dict]:
        """
        Get detailed matching information for debugging/display.
        
        Returns list of dicts with:
            - target_skill: The skill being matched
            - best_match: Best matching profile skill
            - similarity: Similarity score
        """
        if len(target_skills) == 0 or len(profile_skills) == 0:
            return []
        
        similarity = embedding_service.cosine_similarity(profile_emb, target_emb)
        
        details = []
        for j, target_skill in enumerate(target_skills):
            best_idx = similarity[:, j].argmax()
            best_sim = similarity[:, j].max()
            
            details.append({
                "target_skill": target_skill,
                "best_match": profile_skills[best_idx],
                "similarity": round(float(best_sim), 3)
            })
        
        return details


# Singleton instance
skill_matcher_service = SkillMatcherService()
