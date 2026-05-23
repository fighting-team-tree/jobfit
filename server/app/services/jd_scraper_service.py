"""
JD (Job Description) Scraper Service

Scrapes job postings from URLs using httpx + BeautifulSoup with Playwright fallback.
"""

import asyncio
import re
import socket
import sys
from ipaddress import ip_address
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


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
        # 추가 노이즈 셀렉터 (한국 채용 플랫폼 대응)
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

        # JobKorea, Saramin, Wanted 등 동적/이미지 렌더링 중심 사이트는 강제로 Playwright 사용
        force_playwright_domains = ["jobkorea.co.kr", "saramin.co.kr", "wanted.co.kr"]
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()

        if any(d in domain for d in force_playwright_domains):
            return await self._scrape_with_playwright(url)

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
            from app.services.llm_service import llm_service
            import asyncio
            import sys
            
            def run_in_new_loop():
                if sys.platform == "win32":
                    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
                
                async def _inner_scrape():
                    from playwright.async_api import async_playwright
                    from bs4 import BeautifulSoup
                    async with async_playwright() as p:
                        browser = await p.chromium.launch(headless=True)
                        # 넉넉한 viewport 크기 설정
                        context = await browser.new_context(
                            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            locale="ko-KR",
                            viewport={"width": 1280, "height": 3000},
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
                        try:
                            await page.goto(url, wait_until="load", timeout=20000)
                        except Exception as goto_err:
                            print(f"Page goto warning (retrying with domcontentloaded): {goto_err}")
                            # 혹시 load에서도 실패하면 domcontentloaded로 재시도
                            await page.goto(url, wait_until="domcontentloaded", timeout=15000)

                        # 잡코리아 iframe 혹은 일반 본문 셀렉터가 뜰 때까지만 확실하게 대기
                        try:
                            await page.wait_for_selector(
                                "#gib_frame, article, .job-description, .job-content", timeout=10000
                            )
                        except Exception as wait_err:
                            print(f"Selector wait warning: {wait_err}")

                        # 동적 로드 대기를 위한 아주 짧은 여유 시간
                        await page.wait_for_timeout(1000)

                        title = await page.title()
                        raw_text = ""
                        success = False
                        screenshot_bytes = None
                        is_image_jd = False

                        # 1. 상세 공고 iframe 처리 (ID 외에 title, src 등으로 범용 감지)
                        iframe_element = await page.query_selector(
                            "iframe#gib_frame, iframe[title*='모집 요강'], iframe[src*='GI_Read_Comt_Ifrm'], iframe[src*='GI_Read_Frame']"
                        )
                        if iframe_element:
                            name_attr = await iframe_element.get_attribute("name")
                            src_attr = await iframe_element.get_attribute("src")

                            frame = None
                            if name_attr:
                                frame = page.frame(name=name_attr)
                            if not frame and src_attr:
                                frame = next(
                                    (f for f in page.frames if src_attr in f.url or f.url in src_attr), None
                                )
                            if frame:
                                await frame.wait_for_load_state("networkidle")
                                # iframe 내부 콘텐츠 확인
                                iframe_html = await frame.content()
                                iframe_soup = BeautifulSoup(iframe_html, "lxml")

                                # 불필요한 노이즈 제거 후 텍스트와 이미지 체크
                                for selector in self.NOISE_SELECTORS:
                                    if selector != "iframe":  # iframe 내부의 noise 제거
                                        for el in iframe_soup.select(selector):
                                            el.decompose()

                                iframe_text = iframe_soup.get_text(separator="\n", strip=True)
                                iframe_images = iframe_soup.find_all("img")

                                # 텍스트가 매우 짧고 이미지가 많은 경우 이미지 JD로 판단
                                if len(iframe_text.strip()) < 300 and len(iframe_images) > 0:
                                    is_image_jd = True
                                    # iframe 자체를 스크린샷 캡처
                                    screenshot_bytes = await iframe_element.screenshot(type="png")
                                else:
                                    raw_text = iframe_text
                                    success = len(raw_text.strip()) > 100

                        # 2. 잡코리아가 아니거나 iframe이 없는 경우 일반 처리
                        if not iframe_element or (is_image_jd and screenshot_bytes is None):
                            # 일반 JD 선택자에서 내용 찾기
                            jd_element = None
                            for selector in self.JD_SELECTORS:
                                el = await page.query_selector(selector)
                                if el:
                                    # 텍스트와 이미지 확인
                                    el_html = await el.inner_html()
                                    el_soup = BeautifulSoup(el_html, "lxml")

                                    # 노이즈 제거
                                    for noise in self.NOISE_SELECTORS:
                                        if noise != "iframe":
                                            for nel in el_soup.select(noise):
                                                nel.decompose()

                                    el_text = el_soup.get_text(separator="\n", strip=True)
                                    el_images = el_soup.find_all("img")

                                    if len(el_text.strip()) < 300 and len(el_images) > 0:
                                        is_image_jd = True
                                        screenshot_bytes = await el.screenshot(type="png")
                                        jd_element = el
                                        break
                                    elif len(el_text.strip()) > 200:
                                        jd_element = el
                                        raw_text = el_text
                                        success = True
                                        break

                            # JD 선택자로도 못 찾은 경우 전체 페이지 fallback
                            if not jd_element:
                                html = await page.content()
                                soup = BeautifulSoup(html, "lxml")
                                for selector in self.NOISE_SELECTORS:
                                    for el in soup.select(selector):
                                        el.decompose()
                                raw_text = self._extract_jd_content(soup)
                                success = len(raw_text.strip()) > 100

                        await browser.close()
                        return title, raw_text, success, screenshot_bytes, is_image_jd
                        
                return asyncio.run(_inner_scrape())

            # 새 스레드에서 Playwright 전용 루프를 돌려 에러 원천 차단
            title, raw_text, success, screenshot_bytes, is_image_jd = await asyncio.to_thread(run_in_new_loop)

            # 3. 이미지 JD인 경우 VLM을 이용해 텍스트 추출 및 정제 (Uvicorn 기본 루프에서 처리)
            if is_image_jd and screenshot_bytes:
                vlm_text = await llm_service.parse_jd_image(screenshot_bytes)
                if vlm_text:
                    refined_text = await llm_service.refine_jd_text(vlm_text)
                    raw_text = refined_text
                    success = True

            return {
                "url": url,
                "title": title or "",
                "raw_text": self._clean_text(raw_text) if raw_text else "",
                "success": success,
                "error": None if success else "Could not extract content",
                "method": "playwright",
            }

        except Exception as e:
            import traceback

            traceback.print_exc()
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
