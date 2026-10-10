import logging
import os
import re
from pathlib import Path
from typing import List, Optional
from urllib.parse import unquote, urlparse

import requests

from crawler.models import DownloadResult, PDFResource

logger = logging.getLogger(__name__)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal and remove invalid filesystem characters.
    """
    # Remove control characters and path separators
    sanitized = re.sub(r'[\x00-\x1f\x7f/\\:\*\?"<>\|]', '_', filename)
    # Remove leading/trailing dots and spaces
    sanitized = sanitized.strip(". ")
    if not sanitized:
        sanitized = "resource"
    # Limit length to 200 chars
    return sanitized[:200]


def resolve_filename(response: requests.Response, resource: PDFResource) -> str:
    """
    Determine filename for the downloaded PDF.
    Assumes the path of the final URL after all redirections ends with '.pdf'.
    Extracts the unquoted basename from the final URL path.
    """
    url_path = urlparse(response.url).path
    basename = os.path.basename(unquote(url_path))

    if basename:
        filename = basename
    else:
        # Fallback if path basename is empty
        filename = resource.title or "material.pdf"

    filename = sanitize_filename(filename)

    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"

    return filename


def sync_cookies_to_session(context, session: requests.Session) -> None:
    """
    Export all cookies from a Playwright BrowserContext to a requests.Session.
    """
    cookies = context.cookies()
    for cookie in cookies:
        session.cookies.set(
            name=cookie["name"],
            value=cookie["value"],
            domain=cookie.get("domain", ""),
            path=cookie.get("path", "/"),
            secure=cookie.get("secure", False),
        )
    logger.debug("Synchronized %d cookies from Playwright to requests.Session", len(cookies))


def download_resource(
    session: requests.Session,
    resource: PDFResource,
    output_dir: Path,
    chunk_size: int = 65536,
    timeout: int = 60,
) -> DownloadResult:
    """
    Download a single PDF resource, following all consecutive HTTP redirects
    to the final URL ending with '.pdf'.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        logger.info("Fetching resource: %s (%s)", resource.title, resource.url)
        with session.get(resource.url, stream=True, allow_redirects=True, timeout=timeout) as response:
            if response.status_code != 200:
                logger.error(
                    "Failed to download %s: HTTP %d", resource.title, response.status_code
                )
                return DownloadResult(
                    resource=resource,
                    file_path=None,
                    success=False,
                    status_code=response.status_code,
                    error_message=f"HTTP status {response.status_code}",
                )

            filename = resolve_filename(response, resource)
            dest_file = output_dir / filename

            # Handle existing filename collision
            counter = 1
            stem = dest_file.stem
            while dest_file.exists():
                dest_file = output_dir / f"{stem}_{counter}.pdf"
                counter += 1

            total_bytes = 0
            with open(dest_file, "wb") as f:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    if chunk:
                        f.write(chunk)
                        total_bytes += len(chunk)

            logger.info("Saved: %s (%d bytes) from %s", dest_file.name, total_bytes, response.url)
            return DownloadResult(
                resource=resource,
                file_path=dest_file,
                success=True,
                status_code=response.status_code,
                file_size=total_bytes,
            )

    except Exception as e:
        logger.exception("Error downloading resource %s: %s", resource.title, e)
        return DownloadResult(
            resource=resource,
            file_path=None,
            success=False,
            error_message=str(e),
        )


def download_all(
    session: requests.Session,
    resources: List[PDFResource],
    output_dir: Path,
) -> List[DownloadResult]:
    """
    Download all given resources to output_dir.
    """
    results: List[DownloadResult] = []
    total = len(resources)
    logger.info("Starting download of %d resources to %s", total, output_dir)

    for idx, resource in enumerate(resources, start=1):
        logger.info("[%d/%d] Downloading: %s", idx, total, resource.title)
        result = download_resource(session, resource, output_dir)
        results.append(result)

    successful = sum(1 for r in results if r.success)
    logger.info("Download completed: %d/%d files successful.", successful, total)
    return results
