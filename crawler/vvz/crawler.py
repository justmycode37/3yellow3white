import logging
import re
from pathlib import Path
from typing import Dict, Optional, Tuple
from urllib.parse import urljoin, urlparse

import requests

from crawler.vvz.parser import (
    extract_catalog_sections,
    extract_course_link,
    format_course_description_markdown,
)

logger = logging.getLogger(__name__)

VVZ_BASE_URL = "https://www.vvz.ethz.ch"
VVZ_SEARCH_ENDPOINT = "https://www.vvz.ethz.ch/Vorlesungsverzeichnis/sucheLehrangebot.view"


def parse_course_folder_name(folder_name: str) -> Optional[Tuple[str, str, str]]:
    """
    Parse course title / folder name of the form:
    f"{course_number} {course title} {semesterID}"
    e.g. "252-0811-00L Applied Security Laboratory HS2025"

    Returns (course_number, course_title, semester_id) or None if parsing fails.
    """
    if not folder_name:
        return None

    cleaned = folder_name.strip()

    # Regex matching ETH course number (e.g. 252-0811-00L), title, and semesterID (e.g. HS2025 or FS2024)
    match = re.match(
        r"^\s*([0-9]{3}-[0-9]{4}-[0-9]{2}[A-Za-z0-9]?)\s+(.*?)\s+\(?([HFhf][Ss]\d{4})\)?\s*$",
        cleaned,
    )
    if match:
        course_num = match.group(1).strip()
        course_title = match.group(2).strip()
        semester_id = match.group(3).strip().upper()
        return course_num, course_title, semester_id

    # Fallback splitting by whitespace tokens
    tokens = cleaned.split()
    if len(tokens) >= 3:
        candidate_num = tokens[0]
        candidate_sem = tokens[-1].strip("()").upper()
        # Check if last token resembles a semester ID (e.g. HS2025, FS2024)
        if re.match(r"^[HF][S]\d{4}$", candidate_sem) or re.match(r"^\d{4}[WS]$", candidate_sem):
            candidate_title = " ".join(tokens[1:-1])
            return candidate_num, candidate_title, candidate_sem

    logger.warning("Could not parse course folder name into (number, title, semester): %r", folder_name)
    return None


def transform_semester_id(semester_id: str) -> str:
    """
    Transform semesterID to VVZ semkez parameter:
    transform = lambda sid: sid[-4:] + ('W' if sid[0] == 'H' else 'S')
    e.g. 'HS2025' -> '2025W', 'FS2024' -> '2024S'
    """
    sid = semester_id.strip().upper()
    # If already in 2025W format, return directly
    if re.match(r"^\d{4}[WS]$", sid):
        return sid

    # Apply spec transformation
    semkez = sid[-4:] + ("W" if sid[0] == "H" else "S")
    return semkez


def search_course_unit_url(
    course_number: str,
    semester_id: str,
    session: requests.Session,
    timeout: int = 30,
) -> Optional[str]:
    """
    Search for course in VVZ:
    https://www.vvz.ethz.ch/Vorlesungsverzeichnis/sucheLehrangebot.view?lang=en&semkez={transform(semesterID)}&lerneinheitscode={course_number}
    Returns relative or absolute url_path for the course unit.
    """
    semkez = transform_semester_id(semester_id)
    search_url = (
        f"{VVZ_SEARCH_ENDPOINT}?lang=en&semkez={semkez}&lerneinheitscode={course_number}"
    )
    logger.info("Searching VVZ course: %s", search_url)

    response = session.get(search_url, timeout=timeout)
    if response.status_code != 200:
        logger.error("VVZ search returned HTTP %d for %s", response.status_code, search_url)
        return None

    course_link = extract_course_link(response.text)
    if not course_link:
        logger.warning(
            "No course unit link found in VVZ search results for %s (semkez=%s)",
            course_number,
            semkez,
        )
        return None

    return course_link


def query_course_description(
    course_unit_url: str,
    session: requests.Session,
    timeout: int = 30,
) -> Dict[str, str]:
    """
    Change the value of query 'ansicht' from 'LEHRVERANSTALTUNGEN' to 'KATALOGDATEN'
    in the course unit URL, fetch the catalog page, and extract sections:
    Abstract, Learning objective, Content.
    """
    # Swap ansicht parameter to KATALOGDATEN
    if "ansicht=LEHRVERANSTALTUNGEN" in course_unit_url:
        catalog_url_path = course_unit_url.replace(
            "ansicht=LEHRVERANSTALTUNGEN", "ansicht=KATALOGDATEN"
        )
    elif "ansicht=" in course_unit_url:
        catalog_url_path = re.sub(r"ansicht=[^&]+", "ansicht=KATALOGDATEN", course_unit_url)
    else:
        delimiter = "&" if "?" in course_unit_url else "?"
        catalog_url_path = f"{course_unit_url}{delimiter}ansicht=KATALOGDATEN"

    catalog_url = urljoin(VVZ_BASE_URL, catalog_url_path)
    logger.info("Fetching VVZ catalogue data: %s", catalog_url)

    response = session.get(catalog_url, timeout=timeout)
    if response.status_code != 200:
        logger.error("Failed to fetch VVZ catalogue page: HTTP %d", response.status_code)
        return {}

    sections = extract_catalog_sections(response.text)
    logger.info("Extracted %d section(s) from VVZ catalogue", len(sections))
    return sections


def save_course_description(
    folder_path: Path,
    folder_name: str,
    session: Optional[requests.Session] = None,
    timeout: int = 30,
) -> Optional[Path]:
    """
    End-to-end workflow to fetch and export course description:
    1. Parse course folder name into (number, title, semester).
    2. Search VVZ catalogue.
    3. Query course description catalogue page.
    4. Save formatted Markdown to folder_path / 'course_description.md'.
    """
    parsed_info = parse_course_folder_name(folder_name)
    if not parsed_info:
        logger.warning("Skipping VVZ description: folder name %r not in expected format", folder_name)
        return None

    course_num, course_title, semester_id = parsed_info
    logger.info(
        "Querying VVZ description for %s (%s, %s)",
        course_num,
        course_title,
        semester_id,
    )

    req_session = session or requests.Session()

    try:
        # Step 1: Search course
        course_link = search_course_unit_url(
            course_number=course_num,
            semester_id=semester_id,
            session=req_session,
            timeout=timeout,
        )
        if not course_link:
            return None

        # Step 2: Query course description
        sections = query_course_description(
            course_unit_url=course_link,
            session=req_session,
            timeout=timeout,
        )
        if not sections:
            logger.warning("No catalogue sections found for %s", course_num)
            return None

        # Step 3: Format and write to course_description.md
        heading = f"{course_num} {course_title} ({semester_id})"
        md_content = format_course_description_markdown(heading, sections)

        folder_path.mkdir(parents=True, exist_ok=True)
        dest_file = folder_path / "course_description.md"
        dest_file.write_text(md_content, encoding="utf-8")

        logger.info("Saved course description to: %s", dest_file)
        return dest_file

    except Exception as e:
        logger.exception("Error fetching VVZ course description for %s: %s", folder_name, e)
        return None
