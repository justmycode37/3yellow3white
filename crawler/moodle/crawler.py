import logging
from pathlib import Path
from typing import List, Union
from urllib.parse import parse_qs, urlparse

import requests
from playwright.sync_api import sync_playwright

from crawler.downloader import download_all, sync_cookies_to_session
from crawler.models import (
    CourseCrawlResult,
    Credentials,
    DownloadResult,
    PDFResource,
    extract_course_folder_name,
)
from crawler.moodle.auth import login_eth_moodle
from crawler.moodle.parser import extract_pdf_resources_from_page

logger = logging.getLogger(__name__)


class MoodleCrawler:
    """
    High-level crawler orchestrator for crawling one or multiple ETH Moodle
    course pages using a single persistent browser session.
    """

    def __init__(
        self,
        course_urls: Union[str, List[str]],
        credentials: Credentials,
        output_dir: Union[Path, str] = "./downloads",
        headless: bool = True,
        timeout: int = 30000,
    ):
        if isinstance(course_urls, str):
            self.course_urls = [course_urls]
        else:
            self.course_urls = list(course_urls)

        self.credentials = credentials
        self.output_dir = Path(output_dir).expanduser().resolve()
        self.headless = headless
        self.timeout = timeout

    def crawl(self) -> List[CourseCrawlResult]:
        """
        Run the complete crawler workflow across all course URLs:
        1. Launch Playwright Firefox with Desktop Firefox profile and en-US locale.
        2. Initialize requests.Session for downloads.
        3. For each course URL:
           a. Navigate & authenticate (reusing existing session).
           b. Extract DOM title and compute subfolder name using:
              name = title.split(':', 1)[1].split('|', 1)[0].strip()
           c. Parse PDF activities from .activity-grid elements.
           d. Synchronize session cookies.
           e. Download files into output_dir / folder_name.
        """
        logger.info("Initializing Moodle crawler for %d course URL(s)", len(self.course_urls))
        logger.info("Base destination directory: %s", self.output_dir)

        self.output_dir.mkdir(parents=True, exist_ok=True)
        results: List[CourseCrawlResult] = []

        with sync_playwright() as p:
            logger.info("Launching Firefox browser (headless=%s)...", self.headless)
            firefox_profile = p.devices["Desktop Firefox"]
            browser = p.firefox.launch(headless=self.headless)
            context = browser.new_context(**firefox_profile, locale="en-US")
            page = context.new_page()

            # Initialize reusable requests.Session with Firefox User-Agent
            session = requests.Session()
            session.headers.update({
                "User-Agent": firefox_profile["user_agent"],
            })

            try:
                for idx, course_url in enumerate(self.course_urls, start=1):
                    logger.info("=" * 60)
                    logger.info(
                        "[%d/%d] Processing course URL: %s",
                        idx,
                        len(self.course_urls),
                        course_url,
                    )
                    logger.info("=" * 60)

                    try:
                        # 1. Login / Navigate (subsequent URLs reuse session)
                        login_eth_moodle(
                            page=page,
                            course_url=course_url,
                            credentials=self.credentials,
                            timeout=self.timeout,
                        )

                        # 2. Extract DOM title for subfolder name
                        dom_title = page.title()
                        logger.info("Course page DOM title: %r", dom_title)

                        # Compute fallback name from URL query parameter
                        parsed = urlparse(course_url)
                        course_id_list = parse_qs(parsed.query).get("id", [])
                        fallback_name = f"course_{course_id_list[0]}" if course_id_list else f"course_{idx}"

                        folder_name = extract_course_folder_name(dom_title, fallback=fallback_name)
                        logger.info("Target subfolder name: %r", folder_name)

                        course_output_dir = self.output_dir / folder_name
                        course_output_dir.mkdir(parents=True, exist_ok=True)

                        # 3. Expand collapsed sections if available
                        try:
                            expand_all_btn = page.locator(
                                "button:has-text('Expand all'), a:has-text('Expand all'), [data-action='expand-all']"
                            )
                            if expand_all_btn.count() > 0 and expand_all_btn.first.is_visible():
                                logger.info("Expanding all course sections...")
                                expand_all_btn.first.click()
                                page.wait_for_timeout(1000)
                        except Exception as e:
                            logger.debug("Expand all not present or skipped: %s", e)

                        # 4. Extract PDF resources
                        logger.info("Parsing course page for PDF activities...")
                        resources: List[PDFResource] = extract_pdf_resources_from_page(
                            page=page,
                            base_url=page.url,
                        )
                        logger.info("Found %d PDF resource(s) in %s", len(resources), folder_name)

                        # 5. Synchronize session cookies
                        session.headers.update({
                            "Referer": page.url,
                        })
                        sync_cookies_to_session(context, session)

                        # 6. Download all resources to course subfolder
                        if resources:
                            download_results = download_all(
                                session=session,
                                resources=resources,
                                output_dir=course_output_dir,
                            )
                        else:
                            logger.warning("No PDF resources matching criteria were found for this course.")
                            download_results = []

                        results.append(
                            CourseCrawlResult(
                                course_url=course_url,
                                folder_name=folder_name,
                                resources=resources,
                                downloads=download_results,
                                success=True,
                            )
                        )

                    except Exception as e:
                        logger.exception("Error processing course %s: %s", course_url, e)
                        results.append(
                            CourseCrawlResult(
                                course_url=course_url,
                                folder_name=f"course_{idx}_error",
                                resources=[],
                                downloads=[],
                                success=False,
                                error_message=str(e),
                            )
                        )

                return results

            finally:
                context.close()
                browser.close()
