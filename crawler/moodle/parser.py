import html
import re
from urllib.parse import urljoin, urlparse
from typing import Optional, List
from crawler.models import PDFResource


def is_pdf_icon(img_src: str) -> bool:
    """
    Check if an image URL's path ends with '/pdf'.
    Handles query parameters like '/pdf?filtericon=1'.
    """
    if not img_src:
        return False
    parsed = urlparse(img_src)
    path = parsed.path.rstrip("/")
    return path.endswith("/pdf")


def extract_url_from_onclick(onclick_text: str) -> Optional[str]:
    """
    Extract the target URL from window.open(...) call in an onclick attribute.
    e.g. window.open('https://.../view.php?id=123&amp;redirect=1', '', '...')
    """
    if not onclick_text:
        return None
    match = re.search(r"window\.open\(\s*['\"]([^'\"]+)['\"]", onclick_text)
    if match:
        raw_url = match.group(1)
        return html.unescape(raw_url).strip()
    return None


def clean_instance_title(raw_text: str) -> str:
    """
    Clean up title from instancename, removing screen-reader 'Datei' or 'File'
    accesshide texts and normalizing whitespace.
    """
    if not raw_text:
        return ""
    # Remove text in accesshide spans if present as HTML tags
    cleaned = re.sub(r'<span[^>]*class=["\'][^"\']*accesshide[^"\']*["\'][^>]*>.*?</span>', '', raw_text, flags=re.DOTALL | re.IGNORECASE)
    # Strip any remaining HTML tags
    cleaned = re.sub(r'<[^>]+>', '', cleaned)
    # Decode entities and normalize whitespace
    cleaned = html.unescape(cleaned)
    # Strip common trailing Moodle file type annotations like " Datei" or " File"
    cleaned = re.sub(r'\s+(Datei|File|Document)\s*$', '', cleaned, flags=re.IGNORECASE)
    return " ".join(cleaned.split())


def extract_pdf_resources_from_page(page, base_url: str = "") -> List[PDFResource]:
    """
    Extract all PDF resources from a Playwright Page instance following spec.md.
    Looks for .activity-grid elements containing an icon image with path ending with '/pdf',
    and retrieves the URL in window.open().
    """
    resources: List[PDFResource] = []
    grids = page.locator(".activity-grid").all()

    for grid in grids:
        # Check for icon image
        img_locator = grid.locator("img")
        if img_locator.count() == 0:
            continue

        # Look for image with path ending with /pdf
        pdf_img = None
        img_src = ""
        activity_id = None

        for idx in range(img_locator.count()):
            current_img = img_locator.nth(idx)
            src = current_img.get_attribute("src") or ""
            if is_pdf_icon(src):
                pdf_img = current_img
                img_src = src
                activity_id = current_img.get_attribute("data-id")
                break

        if not pdf_img:
            continue

        # Find the anchor link
        link_locator = grid.locator("a")
        if link_locator.count() == 0:
            continue

        link = link_locator.first
        onclick_attr = link.get_attribute("onclick") or ""
        href_attr = link.get_attribute("href") or ""

        target_url = extract_url_from_onclick(onclick_attr)
        if not target_url:
            # Fallback to href if onclick is not present
            if href_attr:
                target_url = html.unescape(href_attr).strip()
                if "mod/resource/view.php" in target_url and "redirect=" not in target_url:
                    delimiter = "&" if "?" in target_url else "?"
                    target_url = f"{target_url}{delimiter}redirect=1"

        if not target_url:
            continue

        if base_url:
            target_url = urljoin(base_url, target_url)

        # Extract title
        title = ""
        title_span = grid.locator(".instancename")
        if title_span.count() > 0:
            # Use inner_html to remove accesshide spans cleanly
            raw_html = title_span.first.inner_html()
            title = clean_instance_title(raw_html)
        if not title:
            title = (link.text_content() or "").strip()
            title = clean_instance_title(title)
        if not title:
            title = f"resource_{activity_id or len(resources) + 1}"

        resources.append(
            PDFResource(
                title=title,
                url=target_url,
                icon_src=img_src,
                activity_id=activity_id,
            )
        )

    return resources
