# Course Material Crawler (Moodle)

A CLI crawler for downloading teaching materials PDF lecture slides from ETH's Moodle course pages.

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

```bash
python3 crawler.py "https://moodle-app2.let.ethz.ch/course/view.php?id=26473" -c credentials.txt -o ./downloads
```
