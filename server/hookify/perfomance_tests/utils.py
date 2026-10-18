# perfomance_tests/utils.py

import json
import time
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from django.utils import timezone


IMAGES_DIR = Path(__file__).resolve().parent / "images"
RESULTS_DIR = Path(__file__).resolve().parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)


# ============================================================
# TIMING
# ============================================================

@contextmanager
def stopwatch(label: str = ""):
    start = time.perf_counter()
    handle = type("Timer", (), {})()
    handle.elapsed = 0.0
    try:
        yield handle
    finally:
        handle.elapsed = time.perf_counter() - start
        if label:
            print(f"  ⏱  {label}: {handle.elapsed * 1000:.1f} ms")


# ============================================================
# IMAGE PICKING
# ============================================================

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def list_sample_images() -> list[Path]:
    if not IMAGES_DIR.exists():
        return []
    return sorted(
        p for p in IMAGES_DIR.iterdir()
        if p.suffix.lower() in ALLOWED_IMAGE_EXT
    )


# ============================================================
# RESULT SAVING
# ============================================================

def save_result(test_name: str, payload: dict) -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_id = uuid.uuid4().hex[:6]
    out = RESULTS_DIR / f"{test_name}_{stamp}_{run_id}.json"
    payload = {
        "test": test_name,
        "run_at": timezone.now().isoformat(),
        **payload,
    }
    out.write_text(json.dumps(payload, indent=2, default=str))
    return out


# ============================================================
# CLEANUP
# ============================================================

def cleanup_user(user):
    if user is None:
        return
    try:
        user.delete()
    except Exception as e:
        print(f"  ⚠️  cleanup_user failed: {e}")