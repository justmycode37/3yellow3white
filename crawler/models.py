import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


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
