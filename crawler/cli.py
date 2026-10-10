import argparse
import logging
import sys
from pathlib import Path

from crawler.models import Credentials
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
    # Remove existing handlers to avoid duplicates
    root_logger.handlers = [handler]


def parse_args(args=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Course Material Crawler - Moodle PDF Downloader",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "url",
        nargs="?",
        default=None,
        help="Moodle course URL (e.g. https://moodle-app2.let.ethz.ch/course/view.php?id=26473)",
    )
    parser.add_argument(
        "--url",
        dest="url_opt",
        default=None,
        help="Alternative flag to specify Moodle course URL",
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
        help="Directory to save downloaded PDF files",
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


def main(args=None) -> int:
    parsed = parse_args(args)
    setup_logging(parsed.verbose)
    logger = logging.getLogger("crawler")

    course_url = parsed.url_opt or parsed.url
    if not course_url:
        logger.error("Error: Course URL is required. Provide it as an argument or via --url.")
        return 1

    try:
        credentials = Credentials.from_file(parsed.credentials)
    except Exception as e:
        logger.error("Failed to load credentials from '%s': %s", parsed.credentials, e)
        return 1

    output_dir = Path(parsed.output_dir)

    crawler = MoodleCrawler(
        course_url=course_url,
        credentials=credentials,
        output_dir=output_dir,
        headless=not parsed.headed,
        timeout=parsed.timeout * 1000,
    )

    try:
        results = crawler.crawl()
    except Exception as e:
        logger.exception("Crawling failed with an error: %s", e)
        return 2

    # Print summary
    successful = [r for r in results if r.success]
    failed = [r for r in results if not r.success]

    print("\n" + "=" * 60)
    print("CRAWL SUMMARY")
    print("=" * 60)
    print(f"Target URL:         {course_url}")
    print(f"Output Directory:   {output_dir.resolve()}")
    print(f"Total PDFs found:   {len(results)}")
    print(f"Successfully saved: {len(successful)}")
    print(f"Failed downloads:   {len(failed)}")

    if successful:
        print("\nDownloaded files:")
        for r in successful:
            size_kb = (r.file_size or 0) / 1024
            name = r.file_path.name if r.file_path else "unknown"
            print(f"  ✓ {name} ({size_kb:.1f} KB)")

    if failed:
        print("\nFailed items:")
        for r in failed:
            print(f"  ✗ {r.resource.title}: {r.error_message}")

    print("=" * 60 + "\n")
    return 0 if not failed else 3


if __name__ == "__main__":
    sys.exit(main())
