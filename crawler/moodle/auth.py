import logging
import time
from urllib.parse import urlparse
from crawler.models import Credentials

logger = logging.getLogger(__name__)


def _is_on_course_page(page, course_url: str) -> bool:
    """Check if the browser has successfully arrived at the course page."""
    parsed_course = urlparse(course_url)
    current_parsed = urlparse(page.url)

    if parsed_course.path in current_parsed.path and "login.php" not in current_parsed.path:
        return True

    return False


def login_eth_moodle(
    page,
    course_url: str,
    credentials: Credentials,
    timeout: int = 30000,
) -> None:
    """
    Automate the ETH Zürich Moodle login sequence as specified in spec.md,
    strictly enforcing element matching without fallbacks.

    1. Page: https://moodle-app2.let.ethz.ch/auth/shibboleth/login.php
       - Select option labeled "ETH Zürich"
       - Click button labeled "Select"
    2. Page: https://access.ethz.ch/idpauthapp/
       - Input username into box id="com.siemens.dxa.applications.web.authn.challenging.username"
       - Input password into box id="com.siemens.dxa.applications.web.authn.challenging.response"
       - Click button "#dataForm button.button"
    3. Page: https://access.ethz.ch/switch-aai/SingleSignOnService
       - Click button labeled "Permit" (exact match, if present)
    4. Redirection to the course page of the requested URL
    """
    logger.info("Navigating to course URL: %s", course_url)
    page.goto(course_url, wait_until="domcontentloaded", timeout=timeout)

    # Check if already authenticated
    if _is_on_course_page(page, course_url):
        logger.info("Already authenticated and on course page: %s", page.url)
        return

    deadline = time.time() + (timeout / 1000)

    # ----------------------------------------------------
    # Step 1: University Selection Page
    # ----------------------------------------------------
    username_field = page.locator("input[id='com.siemens.dxa.applications.web.authn.challenging.username']")

    # If not already on credentials page, perform Step 1
    if username_field.count() == 0 or not username_field.is_visible():
        logger.info("Performing Step 1: University Selection...")
        # Select option labeled "ETH Zürich"
        page.select_option("select", label="ETH Zürich")

        # Click button labeled "Select" (exact)
        select_btn = page.get_by_role("button", name="Select", exact=True)
        select_btn.wait_for(state="visible", timeout=timeout)
        select_btn.click()

        # Wait strictly for Step 2 credentials form
        username_field.wait_for(state="visible", timeout=timeout)

    # ----------------------------------------------------
    # Step 2: User Credentials Input Page
    # ----------------------------------------------------
    logger.info("Performing Step 2: Credentials Input...")
    username_field.wait_for(state="visible", timeout=timeout)
    username_field.fill(credentials.username)

    password_field = page.locator("input[id='com.siemens.dxa.applications.web.authn.challenging.response']")
    password_field.wait_for(state="visible", timeout=timeout)
    password_field.fill(credentials.password)

    next_btn = page.locator("#dataForm button.button")
    next_btn.wait_for(state="visible", timeout=timeout)
    next_btn.click()

    # ----------------------------------------------------
    # Step 3 & 4: Consent Page and Redirection to Course Page
    # ----------------------------------------------------
    logger.info("Performing Step 3 & 4: Waiting for Consent / Course Page...")
    permit_btn = page.get_by_role("button", name="Permit", exact=True)
    course_reached = False

    while time.time() < deadline:
        # Check if consent page is shown
        if permit_btn.count() > 0 and permit_btn.is_visible():
            logger.info("Consent page reached. Clicking 'Permit'...")
            permit_btn.click()
            break

        # Check if already reached course page
        if _is_on_course_page(page, course_url):
            course_reached = True
            break

        page.wait_for_timeout(400)

    # If Permit was clicked, wait for final landing on course page
    if not course_reached:
        while time.time() < deadline:
            if _is_on_course_page(page, course_url):
                course_reached = True
                break
            page.wait_for_timeout(400)

    if not course_reached:
        raise TimeoutError(
            f"Timed out after {timeout}ms waiting for course page. Current URL: {page.url}"
        )

    # Allow page to settle
    page.wait_for_load_state("domcontentloaded", timeout=timeout)
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass

    logger.info("Successfully arrived on course page: %s", page.url)
