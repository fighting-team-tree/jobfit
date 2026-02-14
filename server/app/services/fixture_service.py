"""
Fixture Service

Loads pre-extracted profile JSON from data/fixtures/ for TEST_MODE.
"""

import json
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
