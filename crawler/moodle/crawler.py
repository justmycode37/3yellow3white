import logging
from pathlib import Path
from typing import List, Optional

import requests
from playwright.sync_api import sync_playwright

from crawler.downloader import download_all, sync_cookies_to_session
from crawler.models import Credentials, DownloadResult, PDFResource
from crawler.moodle.auth import login_eth_moodle
from crawler.moodle.parser import extract_pdf_resources_from_page

logger = logging.getLogger(__name__)


class MoodleCrawler:
    """
    High-level crawler orchestrator for ETH Moodle course pages.
    """

    def __init__(
        self,
        course_url: str,
        credentials: Credentials,
        output_dir: Path | str = "./downloads",
        headless: bool = True,
        timeout: int = 30000,
    ):
        self.course_url = course_url
        self.credentials = credentials
        self.output_dir = Path(output_dir).expanduser().resolve()
        self.headless = headless
        self.timeout = timeout

    def crawl(self) -> List[DownloadResult]:
        """
        Run the complete crawler workflow:
        1. Launch Playwright headless browser.
        2. Perform automated ETH login sequence.
        3. Parse course page DOM for PDF activities.
        4. Transfer session cookies to requests.Session.
        5. Download all PDF files to the output directory.
        """
        logger.info("Initializing Moodle crawler for URL: %s", self.course_url)
        logger.info("Destination directory: %s", self.output_dir)

        self.output_dir.mkdir(parents=True, exist_ok=True)

        with sync_playwright() as p:
            logger.info("Launching Firefox browser (headless=%s)...", self.headless)
            firefox_profile = p.devices["Desktop Firefox"]
            browser = p.firefox.launch(headless=self.headless)
            context = browser.new_context(**firefox_profile, locale="en-US")
            page = context.new_page()

            try:
                # 1. Login sequence
                logger.info("Starting authentication flow...")
                login_eth_moodle(
                    page=page,
                    course_url=self.course_url,
                    credentials=self.credentials,
                    timeout=self.timeout,
                )

                # 2. Expand collapsed sections if available
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

                # 3. Extract PDF resources
                logger.info("Parsing course page for PDF activities...")
                resources: List[PDFResource] = extract_pdf_resources_from_page(
                    page=page,
                    base_url=page.url,
                )
                logger.info("Found %d PDF resource(s) on course page.", len(resources))

                if not resources:
                    logger.warning("No PDF resources matching the specification criteria were found.")
                    return []

                # 4. Synchronize session cookies to requests.Session
                session = requests.Session()
                session.headers.update({
                    "User-Agent": firefox_profile["user_agent"],
                    "Referer": page.url,
                })
                sync_cookies_to_session(context, session)

                # 5. Download resources
                results = download_all(
                    session=session,
                    resources=resources,
                    output_dir=self.output_dir,
                )
                return results

            finally:
                context.close()
                browser.close()
