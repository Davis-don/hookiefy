# performance_tests/management/commands/perf_overall_upload.py

import random
import uuid
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

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

from performance_tests.utils import (
    cleanup_user,
    list_sample_images,
    save_result,
    stopwatch,
)


class Command(BaseCommand):
    help = (
        "Perf test: build a user + subscription + 1 business + 5 posts + "
        "5 products + 1 story, measuring each step. Deletes everything "
        "at the end (Cloudinary + DB)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--posts", type=int, default=5)
        parser.add_argument("--products", type=int, default=5)

    def handle(self, *args, **opts):
        n_posts = max(1, opts["posts"])
        n_products = max(1, opts["products"])

        # ── Preflight ────────────────────────────────────
        default_plan = Plan.objects.filter(is_default=True).first()
        if default_plan is None:
            self.stderr.write(self.style.ERROR(
                "No default plan found. Run seed setup first."
            ))
            return

        images = list_sample_images()
        if not images:
            self.stderr.write(self.style.ERROR(
                "No images found in performance_tests/images/."
            ))
            return

        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("OVERALL UPLOAD PERF TEST"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(f"  Plan:      {default_plan.plan_name}")
        self.stdout.write(f"  Posts:     {n_posts}")
        self.stdout.write(f"  Products:  {n_products}")
        self.stdout.write(f"  Images:    {len(images)} available")

        uid = uuid.uuid4().hex[:10]
        email = f"perf_upload_{uid}@perf.local"

        timings = {}

        # ── 1. Image upload (one, reused for all items) ──
        self.stdout.write("\n── Pre-uploading an image to Cloudinary…")
        with stopwatch("image upload") as t:
            local = random.choice(images)
            with open(local, "rb") as f:
                upload = SimpleUploadedFile(
                    name=local.name,
                    content=f.read(),
                    content_type="image/jpeg",
                )
                image = upload_image_to_cloudinary(upload, folder="perf_tests")
        timings["image_upload_ms"] = round(t.elapsed * 1000, 1)
        cloudinary_public_ids = [image["public_id"]]

        # ── 2. User + subscription ───────────────────────
        self.stdout.write("\n── Creating user + subscription…")
        with stopwatch("create user + subscription") as t:
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
                subscribe(user, default_plan, note="Perf test subscription.")
        timings["user_and_subscription_ms"] = round(t.elapsed * 1000, 1)

        try:
            # ── 3. Business ──────────────────────────────
            self.stdout.write("\n── Creating business…")
            with stopwatch("create business") as t:
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

            # ── 4. Posts ─────────────────────────────────
            self.stdout.write(f"\n── Creating {n_posts} post(s)…")
            with stopwatch(f"{n_posts} posts") as t:
                with transaction.atomic():
                    for i in range(n_posts):
                        Posts.objects.create(
                            business=business,
                            title=f"Perf post {i + 1}",
                            body=f"Body for perf post {i + 1}.",
                            image_url=image["url"],
                            image_public_id=image["public_id"],
                        )
            timings["posts_ms"] = round(t.elapsed * 1000, 1)
            timings["per_post_ms"] = round(timings["posts_ms"] / n_posts, 1)

            # ── 5. Products ──────────────────────────────
            self.stdout.write(f"\n── Creating {n_products} product(s)…")
            with stopwatch(f"{n_products} products") as t:
                with transaction.atomic():
                    for i in range(n_products):
                        product = Products.objects.create(
                            business=business,
                            name=f"Perf product {i + 1}",
                            description=f"A perf test product #{i + 1}.",
                            price=Decimal(random.randint(100, 5000)),
                        )
                        ProductImage.objects.create(
                            product=product,
                            image_url=image["url"],
                            image_public_id=image["public_id"],
                            is_primary=True,
                            sort_order=0,
                        )
                        for prop in (
                            ("Material", "Cotton"),
                            ("Colour", "Black"),
                        ):
                            ProductProperty.objects.create(
                                product=product,
                                name=prop[0],
                                value=prop[1],
                            )
            timings["products_ms"] = round(t.elapsed * 1000, 1)
            timings["per_product_ms"] = round(
                timings["products_ms"] / n_products, 1
            )

            # ── 6. Story ─────────────────────────────────
            self.stdout.write("\n── Creating story…")
            with stopwatch("create story") as t:
                with transaction.atomic():
                    Story.objects.create(
                        user=user,
                        title=f"Perf story {uid}",
                        content="A short story for the perf test.",
                        category="journey",
                    )
            timings["story_ms"] = round(t.elapsed * 1000, 1)

        finally:
            # ── 7. Teardown: Cloudinary then DB ──────────
            self.stdout.write("\n── Cleaning up…")

            for pid in cloudinary_public_ids:
                try:
                    delete_image_from_cloudinary(pid)
                except Exception as e:
                    self.stderr.write(self.style.WARNING(
                        f"  Could not delete Cloudinary {pid}: {e}"
                    ))

            with stopwatch("delete user + cascades") as t:
                cleanup_user(user)
            timings["cleanup_ms"] = round(t.elapsed * 1000, 1)

        # ── Summary ──────────────────────────────────────
        total_upload = (
            timings["image_upload_ms"] +
            timings["user_and_subscription_ms"] +
            timings["business_ms"] +
            timings["posts_ms"] +
            timings["products_ms"] +
            timings["story_ms"]
        )

        summary = {
            "email": email,
            "plan": default_plan.plan_name,
            "posts": n_posts,
            "products": n_products,
            "timings": timings,
            "total_upload_ms": round(total_upload, 1),
        }

        path = save_result("perf_overall_upload", summary)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("OVERALL UPLOAD — SUMMARY"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        for k, v in timings.items():
            self.stdout.write(f"  {k:28s} {v:>8.1f} ms")
        self.stdout.write(f"  {'TOTAL (upload side)':28s} {total_upload:>8.1f} ms")
        self.stdout.write("")
        self.stdout.write(f"  Result saved: {path}")