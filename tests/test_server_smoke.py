"""Server startup and safety smoke tests."""
# ruff: noqa: E402, I001

import sys
from pathlib import Path
from typing import Any

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

import main  # noqa: E402
from app.services import jd_scraper_service  # noqa: E402

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
