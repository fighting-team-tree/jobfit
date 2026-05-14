"""
JD (Job Description) Scraper Service

Scrapes job postings from URLs using httpx + BeautifulSoup with Playwright fallback.
"""

import re
import socket
from ipaddress import ip_address
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup


class JDScraperService:
    """Service for scraping job descriptions from URLs."""

    MAX_REDIRECTS = 5

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
        validation_error = self._validate_safe_url(url)
        if validation_error:
            return self._error_response(url, validation_error)

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

            async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
                response = await self._get_with_safe_redirects(client, url, headers)
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

                async def block_unsafe_requests(route):
                    request_url = route.request.url
                    if self._validate_safe_url(request_url):
                        await route.abort()
                    else:
                        await route.continue_()

                await page.route("**/*", block_unsafe_requests)

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

    async def _get_with_safe_redirects(
        self,
        client: httpx.AsyncClient,
        url: str,
        headers: dict[str, str],
    ) -> httpx.Response:
        """Follow redirects only after validating each target URL."""
        current_url = url
        for _ in range(self.MAX_REDIRECTS + 1):
            validation_error = self._validate_safe_url(current_url)
            if validation_error:
                raise ValueError(validation_error)

            response = await client.get(current_url, headers=headers)
            if not response.is_redirect:
                return response

            location = response.headers.get("location")
            if not location:
                return response
            current_url = urljoin(str(response.url), location)

        raise ValueError("Too many redirects")

    def _validate_safe_url(self, url: str) -> str | None:
        """Reject URLs that could reach local/private network resources."""
        try:
            parsed = urlparse(url)
        except Exception:
            return "Invalid URL"

        if parsed.scheme not in {"http", "https"}:
            return "Only HTTP and HTTPS URLs are allowed"
        if not parsed.hostname:
            return "Invalid URL format"

        host = parsed.hostname.strip().lower()
        if host in {"localhost", "localhost.localdomain"} or host.endswith(".localhost"):
            return "Localhost URLs are not allowed"

        try:
            ip = ip_address(host)
            if self._is_blocked_ip(ip):
                return "Private or local network URLs are not allowed"
        except ValueError:
            try:
                resolved_ips = {
                    ip_address(info[4][0])
                    for info in socket.getaddrinfo(
                        host, parsed.port or 443, type=socket.SOCK_STREAM
                    )
                }
            except socket.gaierror:
                return "Could not resolve URL host"

            if any(self._is_blocked_ip(ip) for ip in resolved_ips):
                return "Private or local network URLs are not allowed"

        return None

    def _is_blocked_ip(self, ip) -> bool:
        return any(
            (
                ip.is_private,
                ip.is_loopback,
                ip.is_link_local,
                ip.is_multicast,
                ip.is_reserved,
                ip.is_unspecified,
            )
        )

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
