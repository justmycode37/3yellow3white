import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional


def sanitize_folder_name(folder_name: str) -> str:
    """
    Sanitize folder name to prevent directory traversal and remove invalid filesystem characters.
    """
    sanitized = re.sub(r'[\x00-\x1f\x7f/\\:\*\?"<>\|]', '_', folder_name)
    sanitized = sanitized.strip(". ")
    if not sanitized:
        sanitized = "course"
    return sanitized[:200]


def extract_course_folder_name(dom_title: str, fallback: str = "course") -> str:
    """
    Process subfolder name from DOM title using:
    name = title.split(':', 1)[1].split('|', 1)[0].strip()
    """
    try:
        name = dom_title.split(":", 1)[1].split("|", 1)[0].strip()
        if name:
            return sanitize_folder_name(name)
    except (IndexError, AttributeError):
        pass
    return sanitize_folder_name(fallback)


@dataclass
class Credentials:
    username: str
    password: str

    @classmethod
    def from_file(cls, file_path: str | Path) -> "Credentials":
        """
        Load credentials from a text file where:
        Line 1 contains the username
        Line 2 contains the password
        """
        path = Path(file_path).expanduser().resolve()
        if not path.is_file():
            raise FileNotFoundError(f"Credentials file not found: {path}")

        lines = path.read_text(encoding="utf-8").splitlines()
        if len(lines) < 2:
            raise ValueError(
                f"Credentials file must contain at least 2 lines (line 1: username, line 2: password). Found {len(lines)} line(s)."
            )

        username = lines[0].strip()
        password = lines[1].strip()

        if not username or not password:
            raise ValueError("Username and password in credentials file must not be empty.")

        return cls(username=username, password=password)


@dataclass
class PDFResource:
    title: str
    url: str
    icon_src: str
    activity_id: Optional[str] = None


@dataclass
class DownloadResult:
    resource: PDFResource
    file_path: Optional[Path]
    success: bool
    status_code: Optional[int] = None
    error_message: Optional[str] = None
    file_size: int = 0


@dataclass
class CourseCrawlResult:
    course_url: str
    folder_name: str
    resources: List[PDFResource] = field(default_factory=list)
    downloads: List[DownloadResult] = field(default_factory=list)
    course_description_path: Optional[Path] = None
    success: bool = True
    error_message: Optional[str] = None
