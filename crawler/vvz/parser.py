import html
import re
from typing import Dict, Optional
from urllib.parse import unquote


def html_to_markdown(html_content: str) -> str:
    """
    Convert an HTML content fragment into clean, readable Markdown text:
    - Replaces <br> and <p> tags with newlines
    - Converts <a href="url">text</a> into [text](url)
    - Strips remaining tags and unescapes HTML entities
    - Normalizes excessive blank lines
    """
    if not html_content:
        return ""

    text = html_content

    # Normalize paragraph and break tags
    text = re.sub(r'<br\s*/?>', '\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p\s*>', '\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<p[^>]*>', '', text, flags=re.IGNORECASE)

    # Convert links
    def _replace_link(match):
        href = match.group(1).strip()
        link_text = match.group(2).strip()
        return f"[{link_text}]({href})" if link_text else href

    text = re.sub(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', _replace_link, text, flags=re.DOTALL | re.IGNORECASE)

    # Strip any remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # Unescape HTML entities (e.g. &quot;, &amp;, &nbsp;)
    text = html.unescape(text)

    # Replace non-breaking spaces
    text = text.replace('\xa0', ' ')

    # Normalize whitespace per line and multiple blank lines
    lines = [line.strip() for line in text.splitlines()]
    cleaned_text = '\n'.join(lines)
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)

    return cleaned_text.strip()


def extract_course_link(search_html: str) -> Optional[str]:
    """
    From VVZ search result HTML, extract the course link:
    e.g. <a href="/Vorlesungsverzeichnis/lerneinheit.view?lerneinheitId=193991&semkez=2025W&ansicht=LEHRVERANSTALTUNGEN&lang=en">...</a>
    """
    if not search_html:
        return None

    # Match href with ansicht=LEHRVERANSTALTUNGEN or lerneinheit.view
    match = re.search(
        r'href=["\']([^"\']*lerneinheit\.view\?[^"\']*ansicht=LEHRVERANSTALTUNGEN[^"\']*)["\']',
        search_html,
        re.IGNORECASE,
    )
    if not match:
        match = re.search(
            r'href=["\']([^"\']*lerneinheit\.view\?[^"\']*)["\']',
            search_html,
            re.IGNORECASE,
        )

    if match:
        raw_href = match.group(1)
        return html.unescape(raw_href).strip()

    return None


def extract_catalog_sections(catalog_html: str) -> Dict[str, str]:
    """
    Extract key information sections from VVZ catalogue HTML:
    - Abstract
    - Learning objective
    - Content
    Returns dict mapping section label to converted Markdown content.
    """
    sections = {}
    target_labels = ["Abstract", "Learning objective", "Content"]

    for label in target_labels:
        # Pattern matches <tr><td>Label</td><td>Content</td></tr>
        pattern = rf'<tr>\s*<td>\s*{re.escape(label)}\s*</td>\s*<td>(.*?)</td>\s*</tr>'
        match = re.search(pattern, catalog_html, flags=re.DOTALL | re.IGNORECASE)
        if match:
            raw_content = match.group(1)
            sections[label] = html_to_markdown(raw_content)

    return sections


def format_course_description_markdown(
    heading: str,
    sections: Dict[str, str],
) -> str:
    """
    Format extracted catalog sections into a Markdown document:
    # {heading}

    ## Abstract
    ...

    ## Learning objective
    ...

    ## Content
    ...
    """
    md_lines = []
    if heading:
        md_lines.append(f"# {heading}\n")

    # Preserve order of key sections
    for label in ["Abstract", "Learning objective", "Content"]:
        content = sections.get(label, "")
        if content:
            md_lines.append(f"## {label}\n{content}\n")

    # Add any extra sections if present
    for label, content in sections.items():
        if label not in ["Abstract", "Learning objective", "Content"] and content:
            md_lines.append(f"## {label}\n{content}\n")

    return "\n".join(md_lines).strip() + "\n"
