# perfomance_tests/services.py

import os
import random
import time
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction

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
        return upload_image_to_cloudinary(upload, folder="perf_tests")


# ============================================================
# TEST 1 — IMAGE UPLOAD + DELETE
# ============================================================
#
# 1. Pick ONE image from perfomance_tests/images/
# 2. Upload it to Cloudinary — measure time (seconds)
# 3. Delete it — measure time (seconds)
# 4. Return both, plus a "seconds per image" summary
#
# Peak memory: ~10 MB.

def run_image_cycle_test():
    images = _require_images()
    image_path = random.choice(images)

    file_bytes = image_path.stat().st_size
    file_kb = round(file_bytes / 1024, 1)

    public_id = None
    upload_seconds = 0.0
    delete_seconds = 0.0
    upload_ok = False
    delete_ok = False
    error = None

    try:
        # ── Upload ────────────────────────────────────
        with stopwatch() as t:
            uploaded = _upload_one(image_path)
        upload_seconds = round(t.elapsed, 3)
        upload_ok = True
        public_id = uploaded["public_id"]
        image_url = uploaded["url"]

        # ── Delete ────────────────────────────────────
        with stopwatch() as t:
            delete_image_from_cloudinary(public_id)
        delete_seconds = round(t.elapsed, 3)
        delete_ok = True

    except Exception as e:
        error = str(e)
        image_url = None

    return {
        "image": image_path.name,
        "image_size_kb": file_kb,
        "upload_seconds": upload_seconds,
        "delete_seconds": delete_seconds,
        "upload_ok": upload_ok,
        "delete_ok": delete_ok,
        "image_url": image_url if upload_ok else None,
        "public_id": public_id,
        "error": error,
    }


# ============================================================
# TEST 2 — FULL CYCLE (create + measure + delete)
# ============================================================
#
# 1. Upload one image to Cloudinary
# 2. Create user + subscription
# 3. Create business
# 4. Create 1 post
# 5. Create 1 product (with image + 1 property)
# 6. Create 1 story
# 7. Delete user → cascades everything below
# 8. Delete Cloudinary image
#
# Each step measured in seconds. Peak memory: ~25 MB.

def run_full_cycle_test():
    plan = _require_plan()
    images = _require_images()
    image_path = random.choice(images)

    uid = uuid.uuid4().hex[:10]
    email = f"perf_full_{uid}@perf.local"

    public_id = None
    user = None
    timings = {}
    error = None

    try:
        # ── 1. Image upload ───────────────────────────
        with stopwatch() as t:
            uploaded = _upload_one(image_path)
        timings["image_upload_seconds"] = round(t.elapsed, 3)
        public_id = uploaded["public_id"]

        # ── 2. User + subscription ────────────────────
        with stopwatch() as t:
            with transaction.atomic():
                user = Accounts.objects.create_user(
                    email=email,
                    password="PerfTest123!",
                    first_name="Perf",
                    last_name="Cycle",
                    is_active=True,
                    role="user",
                    auth_provider="local",
                )
                subscribe(user, plan, note="Perf test subscription.")
        timings["user_and_subscription_seconds"] = round(t.elapsed, 3)

        # ── 3. Business ───────────────────────────────
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
        timings["business_seconds"] = round(t.elapsed, 3)

        # ── 4. Post ───────────────────────────────────
        with stopwatch() as t:
            with transaction.atomic():
                Posts.objects.create(
                    business=business,
                    title="Perf cycle post",
                    body="Body for perf cycle post.",
                    image_url=uploaded["url"],
                    image_public_id=uploaded["public_id"],
                )
        timings["post_seconds"] = round(t.elapsed, 3)

        # ── 5. Product (+ image + property) ───────────
        with stopwatch() as t:
            with transaction.atomic():
                product = Products.objects.create(
                    business=business,
                    name="Perf cycle product",
                    description="A perf test product.",
                    price=Decimal(random.randint(200, 5000)),
                )
                ProductImage.objects.create(
                    product=product,
                    image_url=uploaded["url"],
                    image_public_id=uploaded["public_id"],
                    is_primary=True,
                    sort_order=0,
                )
                ProductProperty.objects.create(
                    product=product,
                    name="Material",
                    value="Cotton",
                )
        timings["product_seconds"] = round(t.elapsed, 3)

        # ── 6. Story ──────────────────────────────────
        with stopwatch() as t:
            with transaction.atomic():
                Story.objects.create(
                    user=user,
                    title="Perf cycle story",
                    content="A perf cycle story.",
                    category="journey",
                )
        timings["story_seconds"] = round(t.elapsed, 3)

    except Exception as e:
        error = str(e)

    finally:
        # ── 7. Delete user (cascades DB) ──────────────
        try:
            with stopwatch() as t:
                cleanup_user(user)
            timings["cleanup_db_seconds"] = round(t.elapsed, 3)
        except Exception as e:
            timings["cleanup_db_error"] = str(e)

        # ── 8. Delete Cloudinary image ────────────────
        if public_id:
            try:
                with stopwatch() as t:
                    delete_image_from_cloudinary(public_id)
                timings["cleanup_cloudinary_seconds"] = round(t.elapsed, 3)
            except Exception as e:
                timings["cleanup_cloudinary_error"] = str(e)

    # ── Summary ───────────────────────────────────────
    total_create = sum(
        v for k, v in timings.items()
        if k.endswith("_seconds")
        and not k.startswith("cleanup_")
    )
    total_cleanup = sum(
        v for k, v in timings.items()
        if k.startswith("cleanup_")
        and k.endswith("_seconds")
    )

    return {
        "email": email,
        "plan": plan.plan_name,
        "timings": timings,
        "total_create_seconds": round(total_create, 3),
        "total_cleanup_seconds": round(total_cleanup, 3),
        "error": error,
    }


# ============================================================
# COMBINED
# ============================================================

def run_all_tests() -> dict:
    """
    Run the two lightweight perf tests back-to-back.

    No internal HTTP. No full-stack fixture spam.
    Peak memory: ~35 MB — safe on any worker tier.
    """
    out = {
        "image_cycle": None,
        "full_cycle": None,
    }
    wall_start = time.perf_counter()
    tests_failed = 0

    # ── Image upload + delete ──────────────────────────
    try:
        out["image_cycle"] = run_image_cycle_test()
    except Exception as e:
        tests_failed += 1
        out["image_cycle"] = {"error": str(e)}

    # ── Full cycle (create → measure → delete) ────────
    try:
        out["full_cycle"] = run_full_cycle_test()
    except Exception as e:
        tests_failed += 1
        out["full_cycle"] = {"error": str(e)}

    wall_end = time.perf_counter()

    out["summary"] = {
        "total_seconds": round(wall_end - wall_start, 3),
        "tests_run": 2,
        "tests_failed": tests_failed,
    }

    return out