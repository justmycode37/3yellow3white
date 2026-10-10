"""Detect jarring motion in a rendered scene: stretches of time where most of the
picture changes very fast (a whole plane snapping, flipping or resetting)."""
from __future__ import annotations

import os
import subprocess

# Mean absolute change of a 160x90 grey frame, per second, above which motion is
# flagged for review. On our renders, slow transforms and label moves stay below ~30/s,
# while whole-grid rotations/shears squeezed into ~1-2 s reach 50-90/s.
JOLT_PER_SECOND = 40.0

SPEED_SCRIPT = r"""
import sys, subprocess, numpy as np
from studio.media import ffmpeg
film = sys.argv[1]
w, h = 160, 90
probe = subprocess.run([ffmpeg(), '-i', film], capture_output=True, text=True).stderr
fps = 15.0
for tok in probe.split(','):
    if ' fps' in tok:
        fps = float(tok.strip().split()[0]); break
raw = subprocess.run([ffmpeg(), '-v', 'error', '-i', film, '-vf', f'scale={w}:{h},format=gray',
                      '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
speed = np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2)) * fps
print(fps)
print(" ".join(f"{s:.1f}" for s in speed))
"""


def find_jolts(plugin_root, film, python_exe, limit=JOLT_PER_SECOND):
    """Return [(start_s, end_s, peak_speed)] of intervals with jarringly fast change."""
    env = dict(os.environ, PYTHONPATH=str(plugin_root))
    result = subprocess.run([str(python_exe), "-c", SPEED_SCRIPT, str(film)], env=env,
                            cwd=plugin_root, capture_output=True, text=True)
    if result.returncode or not result.stdout.strip():
        return []
    lines = result.stdout.strip().split("\n")
    fps, speeds = float(lines[0]), [float(x) for x in lines[1].split()] if len(lines) > 1 else []
    jolts, start, peak = [], None, 0.0
    for i, s in enumerate(speeds + [0.0]):
        if s > limit:
            start = i if start is None else start
            peak = max(peak, s)
        elif start is not None:
            jolts.append((round(start / fps, 2), round((i + 1) / fps, 2), round(peak)))
            start, peak = None, 0.0
    return jolts


def describe(jolts):
    if not jolts:
        return "Automatic motion check: no jarringly fast changes detected."
    spans = "; ".join(f"{a:.1f}-{b:.1f} s (speed {p})" for a, b, p in jolts)
    return ("Automatic motion check: the picture changes very fast at " + spans +
            f" (flag limit {JOLT_PER_SECOND:.0f}). Treat each as jarring unless it is clearly a "
            "calm, smooth motion: give it more time (whole-plane motions >= 3 s), use a smooth "
            "rate function, or avoid the motion (e.g. no abrupt resets or flips of the plane).")
