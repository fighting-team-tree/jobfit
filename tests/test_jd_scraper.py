"""Tests for high-performance JD scraping including iframe parsing, noise removal, and Image JD handling."""
# ruff: noqa: E402, I001

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from app.services.jd_scraper_service import JDScraperService


def test_noise_selectors_contain_new_patterns():
    """Verify that extended noise selectors for maps, login, sidebars are registered."""
    scraper = JDScraperService()
    expected_selectors = [
        "#gimm_login_layer",
        "#tabMap",
        ".map_area",
        ".tab_map",
        ".recruit-aside",
        "#detail_aside",
        ".qna-wrapper",
        ".review-wrapper",
        ".co-review",
        ".company-info-area",
        ".company-info",
        ".share-btn-group",
        "#login_popup",
        ".login-popup-wrapper",
        "#gnb",
        "#header",
        "#footer",
        ".qna_area",
        ".comment_area",
        ".reply_area",
    ]
    for sel in expected_selectors:
        assert sel in scraper.NOISE_SELECTORS


def test_clean_text_removes_whitespace_and_noise():
    """Verify text cleaning logic strips HTML noise patterns and spaces."""
    scraper = JDScraperService()
    dirty_text = """
    
    
    원티드 채용공고 본문
    개인정보처리방침 및 쿠키 설정 동의
    Copyright 2026 JobFit. All rights reserved.
    
    
    """
    cleaned = scraper._clean_text(dirty_text)
    assert "개인정보" not in cleaned
    assert "Copyright" not in cleaned
    assert "원티드 채용공고 본문" in cleaned


@pytest.mark.asyncio
async def test_scrape_with_playwright_handles_image_jd():
    """Verify that a page with short text and images triggers screenshot and VLM parsing."""
    scraper = JDScraperService()

    # Mock Playwright structures
    mock_page = AsyncMock()
    mock_browser = AsyncMock()
    mock_context = AsyncMock()

    mock_browser.new_context = AsyncMock(return_value=mock_context)
    mock_context.new_page = AsyncMock(return_value=mock_page)

    # inner_html returns page with very little text and img tag
    mock_el = AsyncMock()
    mock_el.inner_html.return_value = "<div><img src='job_ad.png'/> 짧은 텍스트</div>"
    mock_el.screenshot.return_value = b"mock_screenshot_bytes"

    # Mock page.query_selector to return this element when looping over JD_SELECTORS
    async def mock_query_selector(sel):
        if "article" in sel or "job" in sel:
            return mock_el
        return None

    mock_page.query_selector = mock_query_selector
    mock_page.title.return_value = "Mock Job Title"
    mock_page.content = AsyncMock(return_value="<html><body>Mock Page Content</body></html>")

    # Mock playwright async_playwright context manager
    mock_playwright = MagicMock()
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)

    # Mock llm_service.parse_jd_image & refine_jd_text
    mock_vlm_text = "이것은 VLM이 파싱한 채용공고 텍스트입니다."
    mock_refined_text = "이것은 정제된 채용공고 텍스트입니다."

    with (
        patch(
            "playwright.async_api.async_playwright",
            return_value=MagicMock(__aenter__=AsyncMock(return_value=mock_playwright)),
        ),
        patch(
            "app.services.llm_service.LLMService.parse_jd_image", new_callable=AsyncMock
        ) as mock_parse_jd_image,
        patch(
            "app.services.llm_service.LLMService.refine_jd_text", new_callable=AsyncMock
        ) as mock_refine_jd_text,
    ):
        mock_parse_jd_image.return_value = mock_vlm_text
        mock_refine_jd_text.return_value = mock_refined_text

        result = await scraper._scrape_with_playwright("https://example.com/image-job")

        print("DEBUG RESULT (image_jd):", result)
        assert result["success"] is True
        assert result["raw_text"] == mock_refined_text
        assert result["title"] == "Mock Job Title"
        mock_parse_jd_image.assert_called_once_with(b"mock_screenshot_bytes")
        mock_refine_jd_text.assert_called_once_with(mock_vlm_text)


@pytest.mark.asyncio
async def test_scrape_with_playwright_handles_jobkorea_iframe():
    """Verify that JobKorea iframe is correctly selected and processed."""
    scraper = JDScraperService()

    mock_page = AsyncMock()
    mock_browser = AsyncMock()
    mock_context = AsyncMock()
    mock_frame = AsyncMock()
    mock_iframe_element = AsyncMock()

    mock_browser.new_context = AsyncMock(return_value=mock_context)
    mock_context.new_page = AsyncMock(return_value=mock_page)

    # Set up JobKorea specific query selector behavior
    async def mock_query_selector(sel):
        if "gib_frame" in sel or "모집" in sel or "GI_Read" in sel:
            return mock_iframe_element
        return None

    mock_page.query_selector = mock_query_selector
    mock_page.content = AsyncMock(return_value="<html><body>기본 페이지</body></html>")

    # Mock frames list
    mock_frame.url = "https://www.jobkorea.co.kr/Recruit/GI_Read_Frame/48839089"
    mock_frame.content.return_value = (
        "<html><body>이것은 잡코리아 iframe 내부의 텍스트 본문입니다. 파이썬 백엔드 개발자 모집. "
        * 5
        + "</body></html>"
    )
    mock_page.frames = [mock_frame]
    mock_page.frame = MagicMock(return_value=mock_frame)
    mock_page.title.return_value = "에이아이티스토리 채용공고"

    mock_playwright = MagicMock()
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)

    with patch(
        "playwright.async_api.async_playwright",
        return_value=MagicMock(__aenter__=AsyncMock(return_value=mock_playwright)),
    ):
        result = await scraper._scrape_with_playwright(
            "https://www.jobkorea.co.kr/Recruit/GI_Read/48839089"
        )

        print("DEBUG RESULT (iframe):", result)
        assert result["success"] is True
        assert "iframe" in result["raw_text"] or "잡코리아" in result["raw_text"]
        assert "파이썬" in result["raw_text"]
