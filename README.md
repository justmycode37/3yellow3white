# Course Material Crawler (Moodle & VVZ)

A CLI crawler for downloading teaching materials and official course descriptions from ETH Zürich Moodle and the Course Catalogue.

---

## Prerequisites

```bash
pip install playwright requests
playwright install --with-deps firefox
```

---

## Credentials Format

Store your ETH credentials in a plain text file (e.g. `credentials.txt`):

```text
your_username
your_password
```

- **Line 1**: ETH username
- **Line 2**: ETH password for web applications (LDAP)

---

## Usage

### Single Course

```bash
python3 crawler.py "https://moodle-app2.let.ethz.ch/course/view.php?id=26473" -c credentials.txt -o ./downloads
```

### Multiple Courses (Same Session)

You can pass multiple course URLs directly as positional arguments:

```bash
python3 crawler.py \
  "https://moodle-app2.let.ethz.ch/course/view.php?id=26473" \
  "https://moodle-app2.let.ethz.ch/course/view.php?id=12345" \
  -c credentials.txt -o ./downloads
```

Or using repeated `--url` flags:

```bash
python3 crawler.py \
  --url "https://moodle-app2.let.ethz.ch/course/view.php?id=26473" \
  --url "https://moodle-app2.let.ethz.ch/course/view.php?id=12345" \
  -c credentials.txt -o ./downloads
```

Or using a URLs list file (`-f` / `--urls-file`):

```bash
python3 crawler.py -f urls.txt -c credentials.txt -o ./downloads
```

*Example `urls.txt`:*
```text
https://moodle-app2.let.ethz.ch/course/view.php?id=26473
https://moodle-app2.let.ethz.ch/course/view.php?id=12345
```

---

## Output Organization

For each course folder (e.g. `252-0811-00L Applied Security Laboratory HS2025`), the crawler automatically queries the ETH Course Catalogue (VVZ) and generates a Markdown file named `course_description.md` containing:
- **Abstract**
- **Learning objective**
- **Content**

Example directory tree:
```text
downloads/
└── 252-0811-00L Applied Security Laboratory HS2025/
    ├── course_description.md
    ├── 01_Introduction.pdf
    └── 02_LabManual.pdf
```
