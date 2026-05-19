"""Server startup and safety smoke tests."""
# ruff: noqa: E402, I001

import sys
from pathlib import Path
from typing import Any

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

import main  # noqa: E402
from app.services import jd_scraper_service  # noqa: E402
from app.api.v1.endpoints import companies, profile  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

app: Any = main.app
JDScraperService = jd_scraper_service.JDScraperService


def test_app_imports():
    assert app.title == "JobFit"


def test_jd_scraper_rejects_private_network_urls():
    scraper = JDScraperService()

    assert scraper._validate_safe_url("http://localhost:8000") is not None
    assert scraper._validate_safe_url("http://127.0.0.1:8000") is not None
    assert scraper._validate_safe_url("http://10.0.0.5/jobs") is not None
    assert scraper._validate_safe_url("ftp://example.com/jobs") is not None


def test_profile_fallback_requires_and_isolates_client_session_header():
    profile.profiles_store.clear()

    with TestClient(app) as client:
        response = client.put("/api/v1/profile/me", json={"profile_data": {"name": "A"}})
        assert response.status_code == 401

        headers_a = {"X-JobFit-Client-Session": "session-a"}
        headers_b = {"X-JobFit-Client-Session": "session-b"}

        response = client.put(
            "/api/v1/profile/me",
            headers=headers_a,
            json={"profile_data": {"name": "A"}},
        )
        assert response.status_code == 200

        assert client.get("/api/v1/profile/me", headers=headers_a).json()["profile_data"] == {
            "name": "A"
        }
        assert client.get("/api/v1/profile/me", headers=headers_b).json()["profile_data"] is None


def test_company_fallback_is_scoped_by_client_session_header():
    companies.companies_store.clear()

    with TestClient(app) as client:
        headers_a = {"X-JobFit-Client-Session": "session-a"}
        headers_b = {"X-JobFit-Client-Session": "session-b"}

        created = client.post(
            "/api/v1/companies/",
            headers=headers_a,
            json={"name": "Acme", "jd_text": "Python backend role"},
        )
        assert created.status_code == 200
        company_id = created.json()["id"]

        assert len(client.get("/api/v1/companies/", headers=headers_a).json()) == 1
        assert client.get("/api/v1/companies/", headers=headers_b).json() == []
        assert client.get(f"/api/v1/companies/{company_id}", headers=headers_b).status_code == 404


def test_roadmap_rejects_zero_weeks_with_422():
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.post(
            "/api/v1/roadmap/generate",
            json={"gap_analysis": {"missing_skills": ["Python"]}, "weeks": 0},
        )

    assert response.status_code == 422
