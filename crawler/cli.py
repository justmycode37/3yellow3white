import argparse
import logging
import sys
from pathlib import Path
from typing import List

from crawler.models import CourseCrawlResult, Credentials
from crawler.moodle.crawler import MoodleCrawler


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%H:%M:%S"
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers = [handler]


def parse_args(args=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Course Material Crawler - Moodle PDF Downloader",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "urls",
        nargs="*",
        default=[],
        help="One or more Moodle course URLs (e.g. https://moodle-app2.let.ethz.ch/course/view.php?id=26473)",
    )
    parser.add_argument(
        "--url",
        dest="url_opts",
        action="append",
        default=[],
        help="Specify Moodle course URL (can be used multiple times)",
    )
    parser.add_argument(
        "-f",
        "--urls-file",
        help="Path to a text file containing course URLs (one URL per line)",
    )
    parser.add_argument(
        "-c",
        "--credentials",
        required=True,
        help="Path to credentials text file (line 1: username, line 2: password)",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        default="./downloads",
        help="Base directory to save downloaded PDF files (subfolders created per course)",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Run browser in headed mode (default is headless)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Navigation and network timeout in seconds",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable verbose debug logging",
    )

    return parser.parse_args(args)


def resolve_course_urls(parsed: argparse.Namespace) -> List[str]:
    """
    Collect and deduplicate course URLs from positional arguments, --url flags, and --urls-file.
    """
    urls: List[str] = list(parsed.urls)
    if parsed.url_opts:
        urls.extend(parsed.url_opts)

    if parsed.urls_file:
        file_path = Path(parsed.urls_file).expanduser().resolve()
        if not file_path.is_file():
            raise FileNotFoundError(f"URLs file not found: {file_path}")
        for line in file_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                urls.append(line)

    # Deduplicate while preserving order
    seen = set()
    unique_urls = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            unique_urls.append(u)

    return unique_urls


def main(args=None) -> int:
    parsed = parse_args(args)
    setup_logging(parsed.verbose)
    logger = logging.getLogger("crawler")

    try:
        course_urls = resolve_course_urls(parsed)
    except Exception as e:
        logger.error("Failed to load URLs: %s", e)
        return 1

    if not course_urls:
        logger.error(
            "Error: At least one course URL is required. Provide via arguments, --url, or -f/--urls-file."
        )
        return 1

    try:
        credentials = Credentials.from_file(parsed.credentials)
    except Exception as e:
        logger.error("Failed to load credentials from '%s': %s", parsed.credentials, e)
        return 1

    output_dir = Path(parsed.output_dir)

    crawler = MoodleCrawler(
        course_urls=course_urls,
        credentials=credentials,
        output_dir=output_dir,
        headless=not parsed.headed,
        timeout=parsed.timeout * 1000,
    )

    try:
        course_results = crawler.crawl()
    except Exception as e:
        logger.exception("Crawling failed with an unexpected error: %s", e)
        return 2

    # Print summary
    total_courses = len(course_results)
    successful_courses = sum(1 for c in course_results if c.success)
    total_pdfs = sum(len(c.resources) for c in course_results)
    total_downloaded = sum(sum(1 for d in c.downloads if d.success) for c in course_results)
    total_failed = sum(sum(1 for d in c.downloads if not d.success) for c in course_results)
    total_bytes = sum(sum(d.file_size for d in c.downloads if d.success) for c in course_results)

    print("\n" + "=" * 65)
    print("CRAWL SUMMARY")
    print("=" * 65)
    print(f"Courses Requested:   {len(course_urls)}")
    print(f"Courses Processed:   {successful_courses}/{total_courses}")
    print(f"Total PDFs Found:    {total_pdfs}")
    print(f"Total Downloaded:    {total_downloaded}")
    print(f"Total Failed:        {total_failed}")
    print(f"Total Download Size: {total_bytes / (1024 * 1024):.2f} MB")
    print(f"Base Directory:      {output_dir.resolve()}")
    print("-" * 65)

    has_errors = False
    for c in course_results:
        status_icon = "✓" if c.success else "✗"
        print(f"\n{status_icon} Course: {c.folder_name}")
        print(f"  URL:      {c.course_url}")
        print(f"  Folder:   {output_dir.resolve() / c.folder_name}")

        if c.success:
            successful_dl = [d for d in c.downloads if d.success]
            failed_dl = [d for d in c.downloads if not d.success]
            print(f"  Files:    {len(successful_dl)}/{len(c.resources)} saved")
            for d in successful_dl:
                size_kb = (d.file_size or 0) / 1024
                fname = d.file_path.name if d.file_path else "unknown"
                print(f"    • {fname} ({size_kb:.1f} KB)")
            for d in failed_dl:
                has_errors = True
                print(f"    ✗ {d.resource.title}: {d.error_message}")
        else:
            has_errors = True
            print(f"  Error:    {c.error_message}")

    print("=" * 65 + "\n")
    return 0 if not has_errors else 3


if __name__ == "__main__":
    sys.exit(main())
