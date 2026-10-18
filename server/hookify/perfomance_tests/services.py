# perfomance_tests/services.py

import json
import os
import random
import time
import uuid
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.test import Client

from account.controllers.cloudinary_utils import (
    upload_image_to_cloudinary,
    delete_image_from_cloudinary,
)
from account.models import Accounts
from businesses.models import Businesses
from plans.models import Plan
from posts.models import Posts
from products.models import Products, ProductImage, ProductProperty
from stories.models import Story
from subscription.services import subscribe

from perfomance_tests.utils import (
    cleanup_user,
    list_sample_images,
    stopwatch,
)


# ============================================================
# TEST CLIENT HOST RESOLVER
# ============================================================

def _perf_test_host() -> str:
    explicit = os.environ.get("PERF_TEST_HOST")
    if explicit:
        return explicit
    for host in getattr(settings, "ALLOWED_HOSTS", []):
        h = (host or "").strip()
        if h and h != "*":
            return h
    return "localhost"


# ============================================================
# BYTE-RATE FORMATTING (download)
# ============================================================

def _format_byte_rate(bps: float) -> dict:
    raw = max(0.0, float(bps or 0))
    KB = 1024.0
    MB = 1024.0 ** 2
    GB = 1024.0 ** 3

    def _fmt(v: float) -> str:
        if v >= 100:
            return f"{v:.0f}"
        if v >= 10:
            return f"{v:.1f}"
        return f"{v:.2f}"

    if raw >= GB:
        return {"value": _fmt(raw / GB), "unit": "GB/s", "raw": round(raw, 2)}
    if raw >= MB:
        return {"value": _fmt(raw / MB), "unit": "MB/s", "raw": round(raw, 2)}
    if raw >= KB:
        return {"value": _fmt(raw / KB), "unit": "KB/s", "raw": round(raw, 2)}
    return {"value": _fmt(raw), "unit": "B/s", "raw": round(raw, 2)}


# ============================================================
# SECONDS-PER-IMAGE FORMATTING (upload)
# ============================================================

def _format_seconds_per_image(avg_ms: float) -> dict:
    """
    Turn average upload time (in ms) into a display object
    showing seconds-per-image.

      850 ms    → {"value": "850",  "unit": "ms/img", "raw": 0.85}
      2340 ms   → {"value": "2.34", "unit": "s/img",  "raw": 2.34}
      12153 ms  → {"value": "12.15","unit": "s/img",  "raw": 12.153}
    """
    raw_ms = max(0.0, float(avg_ms or 0))
    seconds = raw_ms / 1000.0

    if seconds < 1.0:
        return {
            "value": f"{int(raw_ms)}",
            "unit": "ms/img",
            "raw": round(seconds, 3),
        }
    if seconds < 60:
        return {
            "value": f"{seconds:.2f}",
            "unit": "s/img",
            "raw": round(seconds, 3),
        }
    return {
        "value": f"{seconds:.1f}",
        "unit": "s/img",
        "raw": round(seconds, 3),
    }


def _per_second(count: int, elapsed_ms: float) -> float:
    if not elapsed_ms or elapsed_ms <= 0:
        return 0.0
    return round(count / (elapsed_ms / 1000.0), 2)


def _add_throughput(result: dict, counters: dict) -> dict:
    timings = result.get("timings", {})
    throughput = {}
    for metric, (count, key) in counters.items():
        ms = timings.get(key, 0.0)
        throughput[f"{metric}_per_second"] = _per_second(count, ms)
    result["throughput"] = throughput
    return result


# ============================================================
# CLOUDINARY REGISTRY (guaranteed per-test cleanup)
# ============================================================

class _CloudinaryRegistry:
    def __init__(self):
        self._ids: list[str] = []

    def add(self, public_id: str):
        if public_id and public_id not in self._ids:
            self._ids.append(public_id)

    def cleanup(self) -> dict:
        deleted = 0
        failed = 0
        for pid in list(self._ids):
            try:
                delete_image_from_cloudinary(pid)
                deleted += 1
            except Exception as e:
                print(f"  ⚠️  Could not delete Cloudinary asset {pid}: {e}")
                failed += 1
        self._ids.clear()
        return {"deleted": deleted, "failed": failed}


# ============================================================
# IMAGE MANIFEST (dedupe uploads across runs)
# ============================================================

MANIFEST_PATH = Path(__file__).resolve().parent / "results" / "image_manifest.json"


class _ImageManifest:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._data: dict[str, dict] = {}
        if path.exists():
            try:
                self._data = json.loads(path.read_text())
            except Exception:
                self._data = {}

    def save(self):
        try:
            self.path.write_text(json.dumps(self._data, indent=2))
        except Exception:
            pass

    def get_or_upload(self, image_path: Path, folder: str) -> dict | None:
        key = str(image_path)
        if key in self._data:
            return self._data[key]

        try:
            ext = image_path.suffix.lower()
            content_type = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
            }.get(ext, "application/octet-stream")

            with open(image_path, "rb") as f:
                upload = SimpleUploadedFile(
                    name=image_path.name,
                    content=f.read(),
                    content_type=content_type,
                )
                result = upload_image_to_cloudinary(upload, folder=folder)

            entry = {
                "url": result["url"],
                "public_id": result["public_id"],
            }
            self._data[key] = entry
            return entry
        except Exception as e:
            print(f"  ⚠️  Could not upload {image_path.name}: {e}")
            return None


_MANIFEST = _ImageManifest(MANIFEST_PATH)


# ============================================================
# HELPERS
# ============================================================

def _require_plan():
    plan = Plan.objects.filter(is_default=True).first()
    if plan is None:
        raise RuntimeError(
            "No default plan configured. Create one before running perf tests."
        )
    return plan


def _require_images():
    images = list_sample_images()
    if not images:
        raise RuntimeError(
            "No images in perfomance_tests/images/. Add at least 1."
        )
    return images


def _upload_one(image_path):
    entry = _MANIFEST.get_or_upload(image_path, folder="perf_tests")
    if entry is None:
        raise RuntimeError(f"Image upload failed for {image_path.name}")
    return entry


# ============================================================
# TEST 1 — IMAGE UPLOAD
# ============================================================

def run_image_upload_test(runs=1):
    runs = max(1, runs)
    images = _require_images()

    registry = _CloudinaryRegistry()
    results = []

    try:
        for run in range(1, runs + 1):
            local = random.choice(images)

            with stopwatch() as up_t:
                uploaded = _upload_one(local)

            registry.add(uploaded["public_id"])

            url_ok = uploaded.get("url", "").startswith("https://")

            results.append({
                "run": run,
                "file": local.name,
                "bytes": local.stat().st_size,
                "upload_ms": round(up_t.elapsed * 1000, 1),
                "url_ok": url_ok,
                "public_id": uploaded["public_id"],
            })

    finally:
        with stopwatch() as t:
            cleanup = registry.cleanup()
        cleanup_ms = round(t.elapsed * 1000, 1)

    upload_times = [r["upload_ms"] for r in results]
    delete_ms_avg = (
        round(cleanup_ms / len(results), 1) if results else 0
    )

    return {
        "runs": runs,
        "avg_upload_ms": round(
            sum(upload_times) / len(upload_times), 1
        ) if upload_times else 0,
        "min_upload_ms": min(upload_times) if upload_times else 0,
        "max_upload_ms": max(upload_times) if upload_times else 0,
        "avg_delete_ms": delete_ms_avg,
        "min_delete_ms": delete_ms_avg,
        "max_delete_ms": delete_ms_avg,
        "all_deleted": cleanup["failed"] == 0,
        "all_url_ok": all(r["url_ok"] for r in results),
        "details": results,
        "cleanup": cleanup,
    }


# ============================================================
# TEST 2 — OVERALL UPLOAD
# ============================================================

def run_overall_upload_test(posts=5, products=5):
    n_posts = max(1, posts)
    n_products = max(1, products)

    plan = _require_plan()
    images = _require_images()

    uid = uuid.uuid4().hex[:10]
    email = f"perf_upload_{uid}@perf.local"

    registry = _CloudinaryRegistry()
    timings = {}
    user = None

    try:
        local = random.choice(images)
        with stopwatch() as t:
            image = _upload_one(local)
        registry.add(image["public_id"])
        timings["image_upload_ms"] = round(t.elapsed * 1000, 1)

        with stopwatch() as t:
            with transaction.atomic():
                user = Accounts.objects.create_user(
                    email=email,
                    password="PerfTest123!",
                    first_name="Perf",
                    last_name="Upload",
                    is_active=True,
                    role="user",
                    auth_provider="local",
                )
                subscribe(user, plan, note="Perf test subscription.")
        timings["user_and_subscription_ms"] = round(t.elapsed * 1000, 1)

        with stopwatch() as t:
            with transaction.atomic():
                business = Businesses.objects.create(
                    owner=user,
                    business_name=f"Perf Biz {uid}",
                    business_category="goods",
                    business_type="Fashion & Apparel",
                    description="Perf test business.",
                    county="Nairobi",
                    city_town="Nairobi CBD",
                    region="Kasuku",
                    status="active",
                )
        timings["business_ms"] = round(t.elapsed * 1000, 1)

        with stopwatch() as t:
            with transaction.atomic():
                for i in range(n_posts):
                    Posts.objects.create(
                        business=business,
                        title=f"Perf post {i + 1}",
                        body=f"Body {i + 1}.",
                        image_url=image["url"],
                        image_public_id=image["public_id"],
                    )
        timings["posts_ms"] = round(t.elapsed * 1000, 1)
        timings["per_post_ms"] = round(timings["posts_ms"] / n_posts, 1)

        with stopwatch() as t:
            with transaction.atomic():
                for i in range(n_products):
                    pr = Products.objects.create(
                        business=business,
                        name=f"Perf product {i + 1}",
                        description=f"Perf product #{i + 1}.",
                        price=Decimal(random.randint(100, 5000)),
                    )
                    ProductImage.objects.create(
                        product=pr,
                        image_url=image["url"],
                        image_public_id=image["public_id"],
                        is_primary=True,
                    )
                    ProductProperty.objects.create(
                        product=pr, name="Material", value="Cotton",
                    )
        timings["products_ms"] = round(t.elapsed * 1000, 1)
        timings["per_product_ms"] = round(timings["products_ms"] / n_products, 1)

        with stopwatch() as t:
            with transaction.atomic():
                Story.objects.create(
                    user=user,
                    title=f"Perf story {uid}",
                    content="A perf test story.",
                    category="journey",
                )
        timings["story_ms"] = round(t.elapsed * 1000, 1)

    finally:
        with stopwatch() as t:
            cloud_cleanup = registry.cleanup()
        timings["cleanup_cloudinary_ms"] = round(t.elapsed * 1000, 1)

        with stopwatch() as t:
            if user is not None:
                cleanup_user(user)
        timings["cleanup_db_ms"] = round(t.elapsed * 1000, 1)
        timings["cleanup_ms"] = round(
            timings["cleanup_cloudinary_ms"] + timings["cleanup_db_ms"], 1
        )

    total_upload = (
        timings.get("image_upload_ms", 0)
        + timings.get("user_and_subscription_ms", 0)
        + timings.get("business_ms", 0)
        + timings.get("posts_ms", 0)
        + timings.get("products_ms", 0)
        + timings.get("story_ms", 0)
    )

    return {
        "email": email,
        "plan": plan.plan_name,
        "posts": n_posts,
        "products": n_products,
        "timings": timings,
        "total_upload_ms": round(total_upload, 1),
        "cleanup": cloud_cleanup,
    }


# ============================================================
# TEST 3 — OVERALL DOWNLOAD
# ============================================================

def run_overall_download_test():
    plan = _require_plan()
    images = _require_images()

    uid = uuid.uuid4().hex[:10]
    email = f"perf_download_{uid}@perf.local"

    registry = _CloudinaryRegistry()
    image = None
    user = None
    endpoint_timings = {}

    try:
        local = random.choice(images)
        image = _upload_one(local)
        registry.add(image["public_id"])

        with transaction.atomic():
            user = Accounts.objects.create_user(
                email=email,
                password="PerfTest123!",
                first_name="Perf",
                last_name="Download",
                is_active=True,
                role="user",
                auth_provider="local",
            )
            subscribe(user, plan, note="Perf test subscription.")

            business = Businesses.objects.create(
                owner=user,
                business_name=f"Perf Biz {uid}",
                business_category="goods",
                business_type="Fashion & Apparel",
                description="Perf test business.",
                county="Nairobi",
                city_town="Nairobi CBD",
                region="Kasuku",
                status="active",
            )

            post_ids = []
            for i in range(5):
                p = Posts.objects.create(
                    business=business,
                    title=f"Download perf post {i + 1}",
                    body=f"Body {i + 1}.",
                    image_url=image["url"],
                    image_public_id=image["public_id"],
                )
                post_ids.append(p.id)

            product_ids = []
            for i in range(5):
                pr = Products.objects.create(
                    business=business,
                    name=f"Download perf product {i + 1}",
                    description=f"Description {i + 1}.",
                    price=Decimal(random.randint(100, 5000)),
                )
                ProductImage.objects.create(
                    product=pr,
                    image_url=image["url"],
                    image_public_id=image["public_id"],
                    is_primary=True,
                )
                product_ids.append(pr.id)

            Story.objects.create(
                user=user,
                title=f"Download perf story {uid}",
                content="A short story.",
                category="journey",
            )

        host = _perf_test_host()
        client = Client(SERVER_NAME=host)

        login_resp = client.post(
            "/account/login/",
            data={"email": email, "password": "PerfTest123!"},
            content_type="application/json",
        )
        if login_resp.status_code != 200:
            raise RuntimeError(
                f"Login failed: {login_resp.status_code} "
                f"{login_resp.content[:200]}"
            )
        token = login_resp.json()["tokens"]["access"]
        auth = {"HTTP_AUTHORIZATION": f"Bearer {token}"}

        tests = [
            ("feed_businesses_mine",
             "/feed/businesses/mine/?kind=all&limit=10", auth),
            ("post_detail", f"/posts/{post_ids[0]}/", {}),
            ("product_detail", f"/products/{product_ids[0]}/", {}),
            ("business_details",
             f"/businesses/{business.id}/details/", auth),
            ("my_businesses", "/businesses/mine/", auth),
            ("current_subscription", "/subscription/current/", auth),
            ("all_stories", "/stories/", auth),
        ]

        for label, url, headers in tests:
            try:
                client.get(url, SERVER_NAME=host, **headers)
            except Exception:
                pass

            samples = []
            bytes_samples = []
            status_code = None
            for _ in range(3):
                with stopwatch() as t:
                    try:
                        resp = client.get(
                            url, SERVER_NAME=host, **headers,
                        )
                        status_code = resp.status_code
                        bytes_samples.append(len(resp.content))
                    except Exception as e:
                        status_code = f"ERR: {e}"
                        bytes_samples.append(0)
                samples.append(t.elapsed * 1000)

            avg_ms = round(sum(samples) / len(samples), 1)
            avg_bytes = (
                round(sum(bytes_samples) / len(bytes_samples), 1)
                if bytes_samples else 0.0
            )

            endpoint_timings[label] = {
                "url": url,
                "status": status_code,
                "avg_ms": avg_ms,
                "avg_bytes": avg_bytes,
                "samples_ms": [round(s, 1) for s in samples],
                "samples_bytes": bytes_samples,
            }

        return {
            "email": email,
            "business_id": business.id,
            "post_ids": post_ids,
            "product_ids": product_ids,
            "timings": endpoint_timings,
        }

    finally:
        with stopwatch() as t:
            cloud_cleanup = registry.cleanup()
        if user is not None:
            cleanup_user(user)


# ============================================================
# ORPHAN SWEEP (final safety net)
# ============================================================

def _sweep_orphans() -> dict:
    swept_users = 0
    try:
        orphans = Accounts.objects.filter(
            email__startswith="perf_",
            email__endswith="@perf.local",
        )
        for u in orphans:
            try:
                cloud_ids = []
                try:
                    for p in Posts.objects.filter(business__owner=u):
                        if p.image_public_id:
                            cloud_ids.append(p.image_public_id)
                    for pr in Products.objects.filter(business__owner=u):
                        for img in pr.images.all():
                            if img.image_public_id:
                                cloud_ids.append(img.image_public_id)
                except Exception:
                    pass

                cleanup_user(u)
                swept_users += 1

                for pid in cloud_ids:
                    try:
                        delete_image_from_cloudinary(pid)
                    except Exception:
                        pass
            except Exception as e:
                print(f"  ⚠️  Could not sweep {u.email}: {e}")
    except Exception:
        pass

    return {"swept_users": swept_users}


# ============================================================
# COMBINED — RUN ALL THREE SEQUENTIALLY
# ============================================================

def run_all_tests(
    *,
    image_runs: int = 5,
    posts: int = 5,
    products: int = 5,
) -> dict:
    out = {
        "image_upload": None,
        "overall_upload": None,
        "overall_download": None,
    }

    wall_start = time.perf_counter()
    tests_failed = 0

    # ── 1. IMAGE UPLOAD — seconds per image ──────────
    try:
        r = run_image_upload_test(runs=image_runs)
        r = _add_throughput(r, {
            "uploads": (r["runs"], "avg_upload_ms"),
            "deletes": (r["runs"], "avg_delete_ms"),
        })

        avg_upload_ms = r.get("avg_upload_ms", 0) or 0
        r["throughput"]["seconds_per_image"] = round(
            avg_upload_ms / 1000.0, 3
        )
        r["throughput"]["upload_display"] = _format_seconds_per_image(
            avg_upload_ms
        )

        out["image_upload"] = r
    except Exception as e:
        tests_failed += 1
        out["image_upload"] = {"error": str(e)}

    # ── 2. OVERALL UPLOAD ────────────────────────────
    try:
        r = run_overall_upload_test(posts=posts, products=products)
        r = _add_throughput(r, {
            "posts":         (r["posts"],    "posts_ms"),
            "products":      (r["products"], "products_ms"),
            "businesses":    (1, "business_ms"),
            "stories":       (1, "story_ms"),
            "users":         (1, "user_and_subscription_ms"),
            "image_uploads": (1, "image_upload_ms"),
        })
        out["overall_upload"] = r
    except Exception as e:
        tests_failed += 1
        out["overall_upload"] = {"error": str(e)}

    # ── 3. OVERALL DOWNLOAD ──────────────────────────
    try:
        r = run_overall_download_test()

        endpoint_throughput = {
            f"{label}_per_second": _per_second(3, t["avg_ms"])
            for label, t in r["timings"].items()
        }

        per_endpoint_bps = {}
        for label, t in r["timings"].items():
            avg_ms = t.get("avg_ms", 0) or 0
            avg_bytes = t.get("avg_bytes", 0) or 0
            bps = (avg_bytes / (avg_ms / 1000)) if avg_ms > 0 else 0
            per_endpoint_bps[f"{label}_bytes_per_second"] = round(bps, 2)

        total_avg = sum(t["avg_ms"] for t in r["timings"].values())
        total_bytes_avg = sum(
            t.get("avg_bytes", 0) for t in r["timings"].values()
        )
        overall_bps = (
            (total_bytes_avg / (total_avg / 1000))
            if total_avg > 0 else 0
        )

        r["throughput"] = {
            **endpoint_throughput,
            **per_endpoint_bps,
            "total_bytes_per_second": round(overall_bps, 2),
            "total_display": _format_byte_rate(overall_bps),
            "endpoints_total_per_second": _per_second(
                len(r["timings"]), total_avg
            ),
        }
        out["overall_download"] = r
    except Exception as e:
        tests_failed += 1
        out["overall_download"] = {"error": str(e)}

    # ── 4. FINAL ORPHAN SWEEP ────────────────────────
    try:
        sweep = _sweep_orphans()
    except Exception as e:
        sweep = {"error": str(e)}

    wall_end = time.perf_counter()

    out["summary"] = {
        "total_ms": round((wall_end - wall_start) * 1000, 1),
        "tests_run": 3,
        "tests_failed": tests_failed,
        "swept_orphans": sweep,
    }

    return out