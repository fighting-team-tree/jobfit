"""
Fixture Service

Loads pre-extracted profile JSON from data/fixtures/ for TEST_MODE.
Provides mock gap analysis (keyword matching) to avoid LLM/embedding API calls.
"""

import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
FIXTURES_DIR = PROJECT_ROOT / "data" / "fixtures"


def get_fixture_profiles() -> list[dict]:
    """Load all fixture profiles from data/fixtures/*.json."""
    profiles = []
    if not FIXTURES_DIR.exists():
        return profiles

    for f in sorted(FIXTURES_DIR.glob("*_profile.json")):
        with open(f, encoding="utf-8") as fh:
            profiles.append(json.load(fh))
    return profiles


def get_fixture_profile(name: str) -> dict | None:
    """Find a fixture profile by partial name match."""
    for profile in get_fixture_profiles():
        if name in profile.get("name", ""):
            return profile
    return None


def get_fixture_jds() -> list[dict]:
    """Load all fixture JDs from data/fixtures/*_jd.json."""
    jds = []
    if not FIXTURES_DIR.exists():
        return jds

    for f in sorted(FIXTURES_DIR.glob("*_jd.json")):
        with open(f, encoding="utf-8") as fh:
            jds.append(json.load(fh))
    return jds


def get_fixture_jd(title: str) -> dict | None:
    """Find a fixture JD by partial title match."""
    for jd in get_fixture_jds():
        if title.lower() in jd.get("title", "").lower():
            return jd
    return None


def analyze_gap_fixture(profile: dict, jd_text: str) -> dict:
    """
    TEST_MODE 전용: LLM/임베딩 없이 키워드 매칭으로 갭 분석.
    프로필 skills와 JD 텍스트를 대소문자 무시 비교.
    """
    profile_skills = [s.strip() for s in profile.get("skills", []) if s.strip()]
    jd_lower = jd_text.lower()

    # JD에서 자격요건/우대사항 섹션 분리
    required_skills = _extract_section_skills(jd_text, "자격요건")
    preferred_skills = _extract_section_skills(jd_text, "우대사항")

    # 프로필 스킬 vs JD 키워드 매칭
    matching_required = [s for s in required_skills if _skill_in_text(s, profile_skills)]
    missing_required = [s for s in required_skills if not _skill_in_text(s, profile_skills)]
    matching_preferred = [s for s in preferred_skills if _skill_in_text(s, profile_skills)]
    missing_preferred = [s for s in preferred_skills if not _skill_in_text(s, profile_skills)]

    # 점수 계산 (필수 70% + 우대 30%)
    req_total = len(required_skills) or 1
    pref_total = len(preferred_skills) or 1
    required_score = len(matching_required) / req_total * 70
    preferred_score = len(matching_preferred) / pref_total * 30
    total_score = round(required_score + preferred_score)

    return {
        "match_score": total_score,
        "matching_skills": matching_required + matching_preferred,
        "missing_skills": missing_required + missing_preferred,
        "recommendations": [
            f"부족한 역량 학습 권장: {', '.join(missing_required[:3])}"
        ] if missing_required else ["모든 필수 역량을 충족합니다."],
        "strengths": [
            f"핵심 역량 보유: {', '.join(matching_required[:5])}"
        ] if matching_required else [],
        "areas_to_improve": missing_required[:5],
        "jd_analysis": {
            "required_skills": required_skills,
            "preferred_skills": preferred_skills,
        },
        "profile_skills": profile_skills,
        "matching_required": matching_required,
        "missing_required": missing_required,
        "matching_preferred": matching_preferred,
        "missing_preferred": missing_preferred,
        "score_breakdown": {
            "required_matched": len(matching_required),
            "required_total": len(required_skills),
            "preferred_matched": len(matching_preferred),
            "preferred_total": len(preferred_skills),
            "required_score": round(required_score, 1),
            "preferred_score": round(preferred_score, 1),
        },
    }


def _extract_section_skills(jd_text: str, section_name: str) -> list[str]:
    """JD 텍스트에서 섹션별 '- 항목' 리스트 추출."""
    lines = jd_text.split("\n")
    in_section = False
    skills = []
    for line in lines:
        stripped = line.strip()
        if section_name in stripped:
            in_section = True
            continue
        if in_section:
            # 다른 섹션 시작 시 종료
            if stripped and not stripped.startswith("-") and not stripped.startswith("·"):
                break
            if stripped.startswith("-") or stripped.startswith("·"):
                skill = stripped.lstrip("-·").strip()
                skills.append(skill)
    return skills


def _skill_in_text(jd_skill: str, profile_skills: list[str]) -> bool:
    """프로필 스킬 중 JD 스킬 항목에 포함되는 것이 있는지 확인."""
    jd_lower = jd_skill.lower()
    for ps in profile_skills:
        if ps.lower() in jd_lower or jd_lower in ps.lower():
            return True
    return False
