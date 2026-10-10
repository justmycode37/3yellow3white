#!/usr/bin/env python3
"""Verify the actual published container endpoint and persistence across restarts."""
import json
import re
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

base, revision, mode, job_file = sys.argv[1:]

def request(path, data=None, owner="container-check", key="container-check"):
    headers = {"x-user-id": owner, "Idempotency-Key": key}
    if data is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(data).encode()
    with urlopen(Request(base + path, data=data, headers=headers), timeout=5) as response:
        assert response.status in (200, 202), (path, response.status)
        return response.read()

def get_json(path, **kwargs):
    return json.loads(request(path, **kwargs))

assert get_json("/healthz") == {"ok": True, "revision": revision}
assert get_json("/api/me")["user"]["id"] == "container-check"
for path in ["/", "/plan", "/settings", "/watch/demo"]:
    html = request(path).decode()
    assets = re.findall(r'(?:src|href)="(/static/[^\"]+)"', html)
    assert assets, (path, "missing built assets")
    for asset in assets:
        assert request(asset), asset

if mode in ("create", "interrupt"):
    job = get_json("/api/videos", data={"title": "Container persistence", "topic": "Docker", "documents": []}, key=mode)
    Path(job_file).write_text(job["id"])
    if mode == "interrupt":
        assert job["status"] in ("queued", "generating"), job
        sys.exit(0)
job_id = Path(job_file).read_text()
for attempt in range(60):
    job = get_json("/api/videos/" + job_id)
    if job["status"] == "complete":
        break
    assert job["status"] != "failed", job
    time.sleep(0.25)
assert job["status"] == "complete", job
assert job["scenes"], job
assert any(item["id"] == job_id for item in get_json("/api/videos"))
scene = job["scenes"][0]
audio = request(f"/api/videos/{job_id}/audio/{scene['id']}")
assert audio[:4] == b"RIFF", "Missing stored WAV audio"
assert get_json("/api/videos", owner="another-owner") == [], "Owner isolation failed"
print(f"Published HTTP, identity, assets, and persistent video/audio passed ({mode}).")
