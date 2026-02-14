"""
JD (Job Description) Scraper Service

Scrapes job postings from URLs using httpx + BeautifulSoup with Playwright fallback.
"""

import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup


class JDScraperService:
    """Service for scraping job descriptions from URLs."""

    # Common selectors for job description content
    JD_SELECTORS = [
        # Common class/id patterns
        "article",
        ".job-description",
        ".job-content",
        ".job-detail",
        "#job-description",
        "#job-content",
        ".position-detail",
        ".recruit-detail",
        ".career-detail",
        '[class*="job"]',
        '[class*="position"]',
        '[class*="recruit"]',
        # Korean sites
        ".jv_detail",
        ".job_detail",
        ".recruit_view",
    ]

    # Elements to remove (noise)
    NOISE_SELECTORS = [
        "script",
        "style",
        "nav",
        "header",
        "footer",
        "aside",
        ".sidebar",
        ".advertisement",
        ".ad",
        ".social-share",
        ".related-jobs",
        "iframe",
    ]

    async def scrape_jd_from_url(self, url: str) -> dict:
        """
        Scrape job description from URL.

        Strategy:
        1. Try httpx + BeautifulSoup first (fast)
        2. Fallback to Playwright if content is insufficient

        Returns:
            {
                "url": str,
                "title": str,
                "raw_text": str,
                "success": bool,
                "error": Optional[str],
                "method": "httpx" | "playwright"
            }
        """
        # Validate URL
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return self._error_response(url, "Invalid URL format")
        except Exception:
            return self._error_response(url, "Invalid URL")

        # 1. Try httpx first
        result = await self._scrape_with_httpx(url)

        # 2. Fallback to Playwright if content is too short
        if not result["success"] or len(result["raw_text"].strip()) < 200:
            playwright_result = await self._scrape_with_playwright(url)
            if playwright_result["success"] and len(playwright_result["raw_text"]) > len(
                result["raw_text"]
            ):
                return playwright_result

        return result

    async def _scrape_with_httpx(self, url: str) -> dict:
        """Fast scraping with httpx + BeautifulSoup."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            }

            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()

                html = response.text
                soup = BeautifulSoup(html, "lxml")

                # Extract title
                title = self._extract_title(soup)

                # Remove noise elements
                for selector in self.NOISE_SELECTORS:
                    for el in soup.select(selector):
                        el.decompose()

                # Try to find job description content
                raw_text = self._extract_jd_content(soup)

                if raw_text and len(raw_text.strip()) > 100:
                    return {
                        "url": url,
                        "title": title,
                        "raw_text": self._clean_text(raw_text),
                        "success": True,
                        "error": None,
                        "method": "httpx",
                    }
                else:
                    return {
                        "url": url,
                        "title": title,
                        "raw_text": raw_text or "",
                        "success": False,
                        "error": "Content too short, needs JS rendering",
                        "method": "httpx",
                    }

        except httpx.HTTPStatusError as e:
            return self._error_response(url, f"HTTP {e.response.status_code}")
        except Exception as e:
            return self._error_response(url, str(e))

    async def _scrape_with_playwright(self, url: str) -> dict:
        """Fallback scraping with Playwright for JS-rendered sites."""
        try:
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    locale="ko-KR",
                )
                page = await context.new_page()

                # Navigate and wait for content
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(2000)  # Extra wait for dynamic content

                # Get page content
                html = await page.content()
                title = await page.title()

                await browser.close()

                # Parse with BeautifulSoup
                soup = BeautifulSoup(html, "lxml")

                # Remove noise
                for selector in self.NOISE_SELECTORS:
                    for el in soup.select(selector):
                        el.decompose()

                raw_text = self._extract_jd_content(soup)

                return {
                    "url": url,
                    "title": title or "",
                    "raw_text": self._clean_text(raw_text) if raw_text else "",
                    "success": bool(raw_text and len(raw_text) > 100),
                    "error": None if raw_text else "Could not extract content",
                    "method": "playwright",
                }

        except Exception as e:
            return self._error_response(url, f"Playwright error: {str(e)}", method="playwright")

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page/job title."""
        # Try og:title first
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return og_title["content"]

        # Try <title> tag
        if soup.title and soup.title.string:
            return soup.title.string.strip()

        # Try h1
        h1 = soup.find("h1")
        if h1:
            return h1.get_text(strip=True)

        return ""

    def _extract_jd_content(self, soup: BeautifulSoup) -> str:
        """Extract job description content from soup."""
        # Try specific JD selectors first
        for selector in self.JD_SELECTORS:
            elements = soup.select(selector)
            for el in elements:
                text = el.get_text(separator="\n", strip=True)
                if len(text) > 200:
                    return text

        # Fallback: get main or body content
        main = soup.find("main") or soup.find("body")
        if main:
            return main.get_text(separator="\n", strip=True)

        return ""

    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        # Remove excessive whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]+", " ", text)

        # Remove common noise patterns
        noise_patterns = [
            r"쿠키.*?동의",
            r"개인정보.*?처리방침",
            r"Copyright.*?\d{4}",
        ]
        for pattern in noise_patterns:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)

        return text.strip()

    def _error_response(self, url: str, error: str, method: str = "httpx") -> dict:
        """Create error response."""
        return {
            "url": url,
            "title": "",
            "raw_text": "",
            "success": False,
            "error": error,
            "method": method,
        }


# Singleton instance
jd_scraper_service = JDScraperService()
